import { describe, expect, test } from 'vitest'
import { bicepsCurlDetector } from '../bicepsCurlDetector'
import { squatDetector } from '../squatDetector'
import type { PoseLandmarks } from '../../pose/types'

function createEmptyLandmarks(): PoseLandmarks {
  return Array.from({ length: 33 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    visibility: 1,
    presence: 1,
  }))
}

describe('exercise detectors', () => {
  test('counts one biceps curl rep after down-up-down', () => {
    const down = createEmptyLandmarks()
    down[11] = { x: 0.4, y: 0.3, z: 0, visibility: 1, presence: 1 }
    down[13] = { x: 0.4, y: 0.45, z: 0, visibility: 1, presence: 1 }
    down[15] = { x: 0.4, y: 0.6, z: 0, visibility: 1, presence: 1 }
    down[12] = { x: 0.6, y: 0.3, z: 0, visibility: 1, presence: 1 }
    down[14] = { x: 0.6, y: 0.45, z: 0, visibility: 1, presence: 1 }
    down[16] = { x: 0.6, y: 0.6, z: 0, visibility: 1, presence: 1 }

    const up = createEmptyLandmarks()
    up[11] = { x: 0.4, y: 0.3, z: 0, visibility: 1, presence: 1 }
    up[13] = { x: 0.4, y: 0.45, z: 0, visibility: 1, presence: 1 }
    up[15] = { x: 0.52, y: 0.36, z: 0, visibility: 1, presence: 1 }
    up[12] = { x: 0.6, y: 0.3, z: 0, visibility: 1, presence: 1 }
    up[14] = { x: 0.6, y: 0.45, z: 0, visibility: 1, presence: 1 }
    up[16] = { x: 0.72, y: 0.36, z: 0, visibility: 1, presence: 1 }

    let state = bicepsCurlDetector.createState()
    state = bicepsCurlDetector.update(down, state).nextState
    state = bicepsCurlDetector.update(up, state).nextState
    const result = bicepsCurlDetector.update(down, state)

    expect(result.repDelta).toBe(1)
  })

  test('counts one squat rep after standing-squat-standing', () => {
    const standing = createEmptyLandmarks()
    standing[23] = { x: 0.45, y: 0.4, z: 0, visibility: 1, presence: 1 }
    standing[25] = { x: 0.45, y: 0.6, z: 0, visibility: 1, presence: 1 }
    standing[27] = { x: 0.45, y: 0.8, z: 0, visibility: 1, presence: 1 }
    standing[24] = { x: 0.55, y: 0.4, z: 0, visibility: 1, presence: 1 }
    standing[26] = { x: 0.55, y: 0.6, z: 0, visibility: 1, presence: 1 }
    standing[28] = { x: 0.55, y: 0.8, z: 0, visibility: 1, presence: 1 }

    const squat = createEmptyLandmarks()
    squat[23] = { x: 0.45, y: 0.4, z: 0, visibility: 1, presence: 1 }
    squat[25] = { x: 0.45, y: 0.6, z: 0, visibility: 1, presence: 1 }
    squat[27] = { x: 0.62, y: 0.5, z: 0, visibility: 1, presence: 1 }
    squat[24] = { x: 0.55, y: 0.4, z: 0, visibility: 1, presence: 1 }
    squat[26] = { x: 0.55, y: 0.6, z: 0, visibility: 1, presence: 1 }
    squat[28] = { x: 0.38, y: 0.5, z: 0, visibility: 1, presence: 1 }

    let state = squatDetector.createState()
    state = squatDetector.update(standing, state).nextState
    state = squatDetector.update(squat, state).nextState
    const result = squatDetector.update(standing, state)

    expect(result.repDelta).toBe(1)
  })
})
