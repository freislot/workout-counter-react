import type { PoseLandmarks } from '../pose/types'

export interface DetectorResult<TState extends ExerciseState = ExerciseState> {
  nextState: TState
  repDelta: number
  phase: string
  metrics: Record<string, number>
  confidence: number
}

export type ExerciseState = object

export interface ExerciseDetector<TState extends object = ExerciseState> {
  id: string
  name: string
  description: string
  voiceAliases?: string[]
  createState(): TState
  update(landmarks: PoseLandmarks | null, state: TState): DetectorResult<TState>
}

export interface ExerciseRuntimeState {
  reps: number
  phase: string
  confidence: number
  metrics: Record<string, number>
  isBodyDetected: boolean
}
