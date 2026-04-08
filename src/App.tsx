import { useEffect, useMemo, useRef, useState } from 'react'
import { useWorkoutSession } from './app/useWorkoutSession'
import { exerciseRegistry } from './exercises/registry'
import './App.css'

type SpeechRecognitionConstructor = new () => SpeechRecognition

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult
  length: number
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
  length: number
}

interface SpeechRecognitionAlternative {
  transcript: string
}

interface SpeechRecognitionErrorEvent {
  error: string
}

type VoiceStatus = 'unsupported' | 'starting' | 'listening' | 'blocked' | 'error'

const START_COMMANDS = ['старт', 'начинаем упражнение', 'начать упражнение']
const PAUSE_COMMANDS = ['пауза', 'поставь на паузу', 'остановись']
const RESET_COMMANDS = ['сброс', 'сбросить', 'обнулить', 'сбрось']
const SHUTDOWN_COMMANDS = ['стоп', 'стоп камера', 'выключи камеру']

function normalizeSpeechText(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim()
}

function matchesCommand(transcript: string, phrase: string): boolean {
  return transcript === phrase || transcript.includes(` ${phrase} `) || transcript.startsWith(`${phrase} `) || transcript.endsWith(` ${phrase}`)
}

function getInitialVoiceStatus(): VoiceStatus {
  if (typeof window === 'undefined') {
    return 'unsupported'
  }

  const recognitionApi = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return recognitionApi.SpeechRecognition ?? recognitionApi.webkitSpeechRecognition
    ? 'starting'
    : 'unsupported'
}

function App() {
  const [exerciseId, setExerciseId] = useState(exerciseRegistry[0].id)
  const {
    canvasRef,
    isRunning,
    isModelReady,
    isCameraReady,
    cameraError,
    start,
    pause,
    reset,
    shutdown,
  } = useWorkoutSession(exerciseId)
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>(() => getInitialVoiceStatus())

  const commandExerciseLookup = useMemo(() => {
    const pairs: Array<[string, string]> = []

    for (const exercise of exerciseRegistry) {
      const normalizedName = normalizeSpeechText(exercise.name)
      pairs.push([normalizedName, exercise.id])

      for (const alias of exercise.voiceAliases ?? []) {
        pairs.push([normalizeSpeechText(alias), exercise.id])
      }
    }

    return pairs
  }, [])

  const isRunningRef = useRef(isRunning)
  const isCameraReadyRef = useRef(isCameraReady)
  const isModelReadyRef = useRef(isModelReady)
  const startRef = useRef(start)
  const pauseRef = useRef(pause)
  const resetRef = useRef(reset)
  const shutdownRef = useRef(shutdown)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const shouldRestartRef = useRef(false)

  useEffect(() => {
    isRunningRef.current = isRunning
    isCameraReadyRef.current = isCameraReady
    isModelReadyRef.current = isModelReady
    startRef.current = start
    pauseRef.current = pause
    resetRef.current = reset
    shutdownRef.current = shutdown
  }, [isCameraReady, isModelReady, isRunning, pause, reset, shutdown, start])

  useEffect(() => {
    const recognitionApi = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    const SpeechRecognitionCtor =
      recognitionApi.SpeechRecognition ?? recognitionApi.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'ru-RU'
    recognition.continuous = true
    recognition.interimResults = false

    shouldRestartRef.current = true
    recognitionRef.current = recognition

    recognition.onstart = () => {
      setVoiceStatus('listening')
    }

    recognition.onresult = (event) => {
      const firstResult = event.results[event.resultIndex]
      if (!firstResult?.isFinal || firstResult.length === 0) {
        return
      }

      const transcript = normalizeSpeechText(firstResult[0].transcript)
      if (!transcript) {
        return
      }

      const isStartCommand = START_COMMANDS.some((command) =>
        matchesCommand(transcript, command),
      )

      if (isStartCommand && !isRunningRef.current && isModelReadyRef.current) {
        void startRef.current()
        return
      }

      const isPauseCommand = PAUSE_COMMANDS.some((command) =>
        matchesCommand(transcript, command),
      )
      if (isPauseCommand && isRunningRef.current) {
        pauseRef.current()
        return
      }

      const isResetCommand = RESET_COMMANDS.some((command) =>
        matchesCommand(transcript, command),
      )
      if (isResetCommand) {
        resetRef.current()
        return
      }

      const isShutdownCommand = SHUTDOWN_COMMANDS.some((command) =>
        matchesCommand(transcript, command),
      )
      if (isShutdownCommand && (isRunningRef.current || isCameraReadyRef.current)) {
        shutdownRef.current()
        return
      }

      if (isRunningRef.current) {
        return
      }

      for (const [phrase, nextExerciseId] of commandExerciseLookup) {
        if (matchesCommand(transcript, phrase)) {
          setExerciseId(nextExerciseId)
          return
        }
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceStatus('blocked')
        shouldRestartRef.current = false
        return
      }

      setVoiceStatus('error')
    }

    recognition.onend = () => {
      if (!shouldRestartRef.current) {
        return
      }

      try {
        recognition.start()
        setVoiceStatus('listening')
      } catch {
        // Ignore repeated starts during rapid onend chains.
      }
    }

    try {
      recognition.start()
    } catch {
      queueMicrotask(() => setVoiceStatus('error'))
    }

    return () => {
      shouldRestartRef.current = false
      recognition.onstart = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.stop()
      recognitionRef.current = null
    }
  }, [commandExerciseLookup])

  const voiceStatusLabel: Record<VoiceStatus, string> = {
    unsupported: 'Голос: не поддерживается',
    starting: 'Голос: запуск',
    listening: 'Голос: слушаю',
    blocked: 'Голос: доступ к микрофону запрещен',
    error: 'Голос: ошибка распознавания',
  }

  return (
    <main className="app">
      <section className="header">
        <h1>Счетчик повторений</h1>
      </section>

      <section className="controls">
        <label htmlFor="exercise-select">Упражнение</label>
        <select
          id="exercise-select"
          value={exerciseId}
          onChange={(event) => setExerciseId(event.target.value)}
          disabled={isRunning}
        >
          {exerciseRegistry.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
        <button onClick={() => void start()} disabled={!isModelReady || isRunning}>
          Старт
        </button>
        <button onClick={pause} disabled={!isRunning}>
          Пауза
        </button>
        <button onClick={reset}>Сброс</button>
        <button onClick={shutdown}>Стоп камера</button>
      </section>

      <section className="status-bar">
        <span className={`model-state ${isModelReady ? 'ready' : 'loading'}`}>
          Модель: {isModelReady ? 'загружена' : 'загружается'}
        </span>
        <span className={`camera-state ${isCameraReady ? 'ready' : 'off'}`}>
          Camera: {isCameraReady ? 'ready' : 'off'}
        </span>
        <span className={`voice-state ${voiceStatus}`}>{voiceStatusLabel[voiceStatus]}</span>
        {cameraError && <span className="camera-error">Ошибка камеры: {cameraError}</span>}
      </section>

      <section className="stage">
        <canvas ref={canvasRef} className="stage-canvas" />
      </section>
    </main>
  )
}

export default App
