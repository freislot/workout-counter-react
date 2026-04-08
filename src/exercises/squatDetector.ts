import { POSE_INDEX, calculateAngle, getPoint } from '../pose/poseMath'
import type { ExerciseDetector } from './types'

type SquatPhase = 'standing' | 'squat'
interface SquatState {
  phase: SquatPhase
}

const VISIBILITY = 0.5
const SQUAT_THRESHOLD = 95
const STANDING_THRESHOLD = 155

export const squatDetector: ExerciseDetector<SquatState> = {
  id: 'squat',
  name: 'Приседания',
  description: 'Счет повторений приседаний по углу колена.',
  createState: () => ({ phase: 'standing' }),
  update: (landmarks, state) => {
    const leftHip = getPoint(landmarks, POSE_INDEX.leftHip, VISIBILITY)
    const leftKnee = getPoint(landmarks, POSE_INDEX.leftKnee, VISIBILITY)
    const leftAnkle = getPoint(landmarks, POSE_INDEX.leftAnkle, VISIBILITY)
    const rightHip = getPoint(landmarks, POSE_INDEX.rightHip, VISIBILITY)
    const rightKnee = getPoint(landmarks, POSE_INDEX.rightKnee, VISIBILITY)
    const rightAnkle = getPoint(landmarks, POSE_INDEX.rightAnkle, VISIBILITY)

    if (!leftHip || !leftKnee || !leftAnkle || !rightHip || !rightKnee || !rightAnkle) {
      return {
        nextState: state,
        repDelta: 0,
        phase: state.phase,
        metrics: {} as Record<string, number>,
        confidence: 0,
      }
    }

    const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle)
    const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle)
    const avgAngle = (leftAngle + rightAngle) / 2

    let repDelta = 0
    let nextPhase = state.phase

    if (state.phase === 'standing' && avgAngle <= SQUAT_THRESHOLD) {
      nextPhase = 'squat'
    } else if (state.phase === 'squat' && avgAngle >= STANDING_THRESHOLD) {
      nextPhase = 'standing'
      repDelta = 1
    }

    return {
      nextState: { phase: nextPhase },
      repDelta,
      phase: nextPhase,
      metrics: {
        leftKneeAngle: leftAngle,
        rightKneeAngle: rightAngle,
        avgKneeAngle: avgAngle,
      },
      confidence: 1,
    }
  },
}
