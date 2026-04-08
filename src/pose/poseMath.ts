import type { PoseLandmarks, PosePoint } from './types'

export const POSE_INDEX = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const

export function getPoint(
  landmarks: PoseLandmarks | null,
  index: number,
  minVisibility: number,
): PosePoint | null {
  if (!landmarks || !landmarks[index]) {
    return null
  }

  const point = landmarks[index]
  if (point.visibility < minVisibility || point.presence < minVisibility) {
    return null
  }
  return point
}

export function calculateAngle(a: PosePoint, b: PosePoint, c: PosePoint): number {
  const abX = a.x - b.x
  const abY = a.y - b.y
  const cbX = c.x - b.x
  const cbY = c.y - b.y
  const dot = abX * cbX + abY * cbY
  const magAB = Math.sqrt(abX ** 2 + abY ** 2)
  const magCB = Math.sqrt(cbX ** 2 + cbY ** 2)

  if (magAB === 0 || magCB === 0) {
    return 180
  }

  const cosine = Math.max(-1, Math.min(1, dot / (magAB * magCB)))
  return (Math.acos(cosine) * 180) / Math.PI
}
