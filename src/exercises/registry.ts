import { bicepsCurlDetector } from './bicepsCurlDetector'
import { squatDetector } from './squatDetector'
import type { ExerciseDetector } from './types'

export const exerciseRegistry: ExerciseDetector[] = [bicepsCurlDetector, squatDetector]

export function getExerciseById(id: string): ExerciseDetector {
  return exerciseRegistry.find((exercise) => exercise.id === id) ?? exerciseRegistry[0]
}
