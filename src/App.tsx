import { useState } from 'react'
import { useWorkoutSession } from './app/useWorkoutSession'
import { exerciseRegistry } from './exercises/registry'
import './App.css'

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
        <span className={`camera-state ${isCameraReady ? 'ready' : 'off'}`}>
          Camera: {isCameraReady ? 'ready' : 'off'}
        </span>
        {cameraError && <span className="camera-error">Ошибка камеры: {cameraError}</span>}
      </section>

      <section className="stage">
        <canvas ref={canvasRef} className="stage-canvas" />
      </section>
    </main>
  )
}

export default App
