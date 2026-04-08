import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCameraStream } from '../camera/useCameraStream'
import { getExerciseById } from '../exercises/registry'
import type { ExerciseRuntimeState, ExerciseState } from '../exercises/types'
import { PoseLandmarkerService } from '../pose/poseLandmarkerService'
import { drawFrame } from '../render/canvasRenderer'

const DEFAULT_RUNTIME: ExerciseRuntimeState = {
  reps: 0,
  phase: '-',
  confidence: 0,
  metrics: {},
  isBodyDetected: false,
}

const RU_UNITS = [
  'ноль',
  'один',
  'два',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять',
  'десять',
  'одиннадцать',
  'двенадцать',
  'тринадцать',
  'четырнадцать',
  'пятнадцать',
  'шестнадцать',
  'семнадцать',
  'восемнадцать',
  'девятнадцать',
]

const RU_TENS = [
  '',
  '',
  'двадцать',
  'тридцать',
  'сорок',
  'пятьдесят',
  'шестьдесят',
  'семьдесят',
  'восемьдесят',
  'девяносто',
]

const RU_HUNDREDS = [
  '',
  'сто',
  'двести',
  'триста',
  'четыреста',
  'пятьсот',
  'шестьсот',
  'семьсот',
  'восемьсот',
  'девятьсот',
]

function numberToRussianWords(value: number): string {
  const safeValue = Math.max(0, Math.trunc(value))
  if (safeValue < 20) {
    return RU_UNITS[safeValue]
  }

  if (safeValue < 100) {
    const tens = Math.floor(safeValue / 10)
    const units = safeValue % 10
    return units > 0 ? `${RU_TENS[tens]} ${RU_UNITS[units]}` : RU_TENS[tens]
  }

  if (safeValue < 1000) {
    const hundreds = Math.floor(safeValue / 100)
    const rest = safeValue % 100
    return rest > 0 ? `${RU_HUNDREDS[hundreds]} ${numberToRussianWords(rest)}` : RU_HUNDREDS[hundreds]
  }

  return String(safeValue)
}

function speakRussianCount(value: number): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }

  const utterance = new SpeechSynthesisUtterance(numberToRussianWords(value))
  utterance.lang = 'ru-RU'
  utterance.rate = 1
  utterance.pitch = 1

  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

export function useWorkoutSession(selectedExerciseId: string) {
  const memoryVideoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const poseServiceRef = useRef(new PoseLandmarkerService())
  const detectorStateRef = useRef<ExerciseState>({})
  const runtimeRef = useRef<ExerciseRuntimeState>(DEFAULT_RUNTIME)

  const [isModelReady, setIsModelReady] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const { startCamera, stopCamera, cameraError, isCameraReady } = useCameraStream()

  const detector = useMemo(() => getExerciseById(selectedExerciseId), [selectedExerciseId])

  useEffect(() => {
    memoryVideoRef.current = document.createElement('video')
    memoryVideoRef.current.playsInline = true
    memoryVideoRef.current.muted = true
    return () => {
      memoryVideoRef.current = null
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const poseService = poseServiceRef.current

    const initModel = async () => {
      await poseService.init()
      if (isMounted) {
        setIsModelReady(true)
      }
    }

    void initModel()

    return () => {
      isMounted = false
      poseService.dispose()
    }
  }, [])

  useEffect(() => {
    if (!isRunning) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const renderFrame = () => {
      const video = memoryVideoRef.current
      const canvas = canvasRef.current

      if (!video || !canvas || !isRunning) {
        return
      }

      const frame = poseServiceRef.current.detect(video, performance.now())
      const result = detector.update(frame.landmarks, detectorStateRef.current)
      detectorStateRef.current = result.nextState

      const nextRuntime: ExerciseRuntimeState = {
        reps: runtimeRef.current.reps + result.repDelta,
        phase: result.phase,
        confidence: result.confidence,
        metrics: result.metrics,
        isBodyDetected: Boolean(frame.landmarks) && result.confidence > 0,
      }
      runtimeRef.current = nextRuntime

      if (result.repDelta > 0) {
        speakRussianCount(nextRuntime.reps)
      }

      drawFrame(canvas, video, frame.landmarks, nextRuntime)
      rafRef.current = requestAnimationFrame(renderFrame)
    }

    rafRef.current = requestAnimationFrame(renderFrame)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [detector, isRunning])

  const start = useCallback(async () => {
    await startCamera(memoryVideoRef.current)
    detectorStateRef.current = detector.createState()
    runtimeRef.current = DEFAULT_RUNTIME
    poseServiceRef.current.stop()
    setIsRunning(true)
  }, [detector, startCamera])

  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    detectorStateRef.current = detector.createState()
    runtimeRef.current = DEFAULT_RUNTIME
  }, [detector])

  const shutdown = useCallback(() => {
    setIsRunning(false)
    stopCamera()
  }, [stopCamera])

  useEffect(() => shutdown, [shutdown])

  return {
    canvasRef,
    isRunning,
    isModelReady,
    isCameraReady,
    cameraError,
    start,
    pause,
    reset,
    shutdown,
  }
}
