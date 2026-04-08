export interface PosePoint {
  x: number
  y: number
  z: number
  visibility: number
  presence: number
}

export type PoseLandmarks = PosePoint[]

export interface PoseFrame {
  landmarks: PoseLandmarks | null
  timestampMs: number
}
