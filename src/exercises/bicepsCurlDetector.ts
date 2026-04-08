import { POSE_INDEX, calculateAngle, getPoint } from '../pose/poseMath'
import type { ExerciseDetector } from './types'

type CurlPhase = 'down' | 'up'
interface CurlState {
  phase: CurlPhase
}

const VISIBILITY = 0.5
const UP_THRESHOLD = 55
const DOWN_THRESHOLD = 145

export const bicepsCurlDetector: ExerciseDetector<CurlState> = {
  id: 'biceps-curl',
  name: 'Подъем на бицепс',
  description: 'Счет повторений сгибаний рук в локтях.',
  createState: () => ({ phase: 'down' }),
  update: (landmarks, state) => {
    const leftShoulder = getPoint(landmarks, POSE_INDEX.leftShoulder, VISIBILITY)
    const leftElbow = getPoint(landmarks, POSE_INDEX.leftElbow, VISIBILITY)
    const leftWrist = getPoint(landmarks, POSE_INDEX.leftWrist, VISIBILITY)
    const rightShoulder = getPoint(landmarks, POSE_INDEX.rightShoulder, VISIBILITY)
    const rightElbow = getPoint(landmarks, POSE_INDEX.rightElbow, VISIBILITY)
    const rightWrist = getPoint(landmarks, POSE_INDEX.rightWrist, VISIBILITY)

    if (
      !leftShoulder ||
      !leftElbow ||
      !leftWrist ||
      !rightShoulder ||
      !rightElbow ||
      !rightWrist
    ) {
      return {
        nextState: state,
        repDelta: 0,
        phase: state.phase,
        metrics: {} as Record<string, number>,
        confidence: 0,
      }
    }

    const leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist)
    const rightAngle = calculateAngle(rightShoulder, rightElbow, rightWrist)
    const avgAngle = (leftAngle + rightAngle) / 2

    let repDelta = 0
    let nextPhase = state.phase

    if (state.phase === 'down' && avgAngle <= UP_THRESHOLD) {
      nextPhase = 'up'
    } else if (state.phase === 'up' && avgAngle >= DOWN_THRESHOLD) {
      nextPhase = 'down'
      repDelta = 1
    }

    return {
      nextState: { phase: nextPhase },
      repDelta,
      phase: nextPhase,
      metrics: {
        leftElbowAngle: leftAngle,
        rightElbowAngle: rightAngle,
        avgElbowAngle: avgAngle,
      },
      confidence: 1,
    }
  },
}
