import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCameraStream } from '../camera/useCameraStream'
import { getExerciseById } from '../exercises/registry'
import type { ExerciseRuntimeState, ExerciseState } from '../exercises/types'
import { PoseLandmarkerService } from '../pose/poseLandmarkerService'
import { drawFrame, drawRestCountdown } from '../render/canvasRenderer'

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

function speakRussianText(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return
  }

  const synth = window.speechSynthesis
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ru-RU'
  utterance.rate = 1
  utterance.pitch = 1

  // Some browsers drop utterances fired in media/recognition callbacks.
  setTimeout(() => {
    synth.cancel()
    synth.resume()
    synth.speak(utterance)
  }, 10)
}

function clearCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) {
    return
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const dpr = window.devicePixelRatio || 1
  const cssWidth = canvas.clientWidth
  const cssHeight = canvas.clientHeight
  const nextWidth = Math.round(cssWidth * dpr)
  const nextHeight = Math.round(cssHeight * dpr)

  if (nextWidth > 0 && nextHeight > 0 && (canvas.width !== nextWidth || canvas.height !== nextHeight)) {
    canvas.width = nextWidth
    canvas.height = nextHeight
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

export function useWorkoutSession(selectedExerciseId: string, restDurationMs: number) {
  const memoryVideoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const restRafRef = useRef<number | null>(null)
  const restCountdownVersionRef = useRef(0)
  const poseServiceRef = useRef(new PoseLandmarkerService())
  const detectorStateRef = useRef<ExerciseState>({})
  const runtimeRef = useRef<ExerciseRuntimeState>(DEFAULT_RUNTIME)
  const restDurationMsRef = useRef(restDurationMs)

  const [isModelReady, setIsModelReady] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const { startCamera, stopCamera, cameraError, isCameraReady } = useCameraStream()

  const detector = useMemo(() => getExerciseById(selectedExerciseId), [selectedExerciseId])

  useEffect(() => {
    restDurationMsRef.current = restDurationMs
  }, [restDurationMs])

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

    if (restRafRef.current) {
      cancelAnimationFrame(restRafRef.current)
      restRafRef.current = null
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
    if (restRafRef.current) {
      cancelAnimationFrame(restRafRef.current)
      restRafRef.current = null
    }
    restCountdownVersionRef.current += 1
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

  const stopSession = useCallback(
    (withRestCountdown: boolean, restDurationOverrideMs?: number) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (restRafRef.current) {
      cancelAnimationFrame(restRafRef.current)
      restRafRef.current = null
    }
    restCountdownVersionRef.current += 1
    setIsRunning(false)
    stopCamera()
    clearCanvas(canvasRef.current)

    if (!withRestCountdown) {
      return
    }

    const countdownDurationMs = restDurationOverrideMs ?? restDurationMsRef.current
    const durationMinutes = Math.max(1, Math.round(countdownDurationMs / 60000))
    speakRussianText(`Отдыхаем ${numberToRussianWords(durationMinutes)} минут`)
    const countdownVersion = restCountdownVersionRef.current
    const restStartedAt = performance.now()
    let isFinishAnnounced = false
    const restTick = (now: number) => {
      if (countdownVersion !== restCountdownVersionRef.current) {
        return
      }

      const elapsed = now - restStartedAt
      const remaining = Math.max(0, countdownDurationMs - elapsed)
      const canvas = canvasRef.current
      if (canvas) {
        drawRestCountdown(canvas, remaining, countdownDurationMs)
      }

      if (remaining > 0) {
        restRafRef.current = requestAnimationFrame(restTick)
      } else {
        if (!isFinishAnnounced) {
          speakRussianText('Ебашим')
          isFinishAnnounced = true
        }
        restRafRef.current = null
      }
    }
    restRafRef.current = requestAnimationFrame(restTick)
    },
    [stopCamera],
  )

  const shutdown = useCallback((restDurationOverrideMs?: number) => {
    stopSession(true, restDurationOverrideMs)
  }, [stopSession])

  useEffect(() => {
    return () => stopSession(false)
  }, [stopSession])

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
