import type { PoseLandmarks } from './types'

export class LandmarkSmoother {
  private previous: PoseLandmarks | null = null
  private readonly alpha: number

  constructor(alpha = 0.9) {
    this.alpha = alpha
  }

  reset(): void {
    this.previous = null
  }

  smooth(current: PoseLandmarks | null): PoseLandmarks | null {
    if (!current) {
      return null
    }

    if (!this.previous) {
      this.previous = current
      return current
    }

    const result: PoseLandmarks = current.map((point, index) => {
      const prev = this.previous?.[index]
      if (!prev) {
        return point
      }

      return {
        x: lerp(prev.x, point.x, this.alpha),
        y: lerp(prev.y, point.y, this.alpha),
        z: lerp(prev.z, point.z, this.alpha),
        visibility: lerp(prev.visibility, point.visibility, this.alpha),
        presence: lerp(prev.presence, point.presence, this.alpha),
      }
    })

    this.previous = result
    return result
  }
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha
}
