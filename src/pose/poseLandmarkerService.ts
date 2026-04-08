import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import { LandmarkSmoother } from './landmarkSmoothing'
import type { PoseFrame, PoseLandmarks } from './types'

const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task'
const MODEL_ASSET_PATH_LITE =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'

export class PoseLandmarkerService {
  private landmarker: PoseLandmarker | null = null
  private smoother = new LandmarkSmoother()

  async init(): Promise<void> {
    if (this.landmarker) {
      return
    }

    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
    try {
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_PATH,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    } catch {
      // Some browsers/devices may not support GPU delegate.
      this.landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_PATH_LITE,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    }
  }

  detect(video: HTMLVideoElement, timestampMs: number): PoseFrame {
    if (!this.landmarker) {
      return { landmarks: null, timestampMs }
    }

    const result = this.landmarker.detectForVideo(video, timestampMs)
    const raw = result.landmarks[0] ? this.normalize(result.landmarks[0]) : null
    // const landmarks = this.smoother.smooth(raw)
    const landmarks = raw

    return {
      landmarks,
      timestampMs,
    }
  }

  stop(): void {
    this.smoother.reset()
  }

  dispose(): void {
    this.landmarker?.close()
    this.landmarker = null
    this.smoother.reset()
  }

  private normalize(landmarks: NormalizedLandmark[]): PoseLandmarks {
    return landmarks.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z,
      visibility: point.visibility ?? 0,
      presence: point.visibility ?? 0,
    }))
  }
}
