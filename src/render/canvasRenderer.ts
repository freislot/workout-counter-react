import type { ExerciseRuntimeState } from '../exercises/types'
import type { PoseLandmarks } from '../pose/types'

const CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
]

export function drawFrame(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: PoseLandmarks | null,
  runtime: ExerciseRuntimeState,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
    return
  }

  resizeCanvas(canvas)
  const layout = computeCoverLayout(
    video.videoWidth,
    video.videoHeight,
    canvas.width,
    canvas.height,
  )

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(video, layout.dx, layout.dy, layout.dw, layout.dh)

  if (landmarks) {
    drawSkeleton(ctx, landmarks, layout.dx, layout.dy, layout.dw, layout.dh)
  }
  drawHud(ctx, runtime)
}

export function drawRestCountdown(
  canvas: HTMLCanvasElement,
  remainingMs: number,
  totalMs: number,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  resizeCanvas(canvas)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const safeRemainingMs = Math.max(0, remainingMs)
  const progress = Math.max(0, Math.min(1, 1 - safeRemainingMs / Math.max(1, totalMs)))
  const minutes = Math.floor(safeRemainingMs / 60000)
  const seconds = Math.floor((safeRemainingMs % 60000) / 1000)
  const timeLabel = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const ringRadius = Math.min(canvas.width, canvas.height) * 0.2
  const ringWidth = Math.max(8, Math.round(ringRadius * 0.12))

  ctx.save()
  ctx.lineCap = 'round'

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.lineWidth = ringWidth
  ctx.beginPath()
  ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = '#60a5fa'
  ctx.beginPath()
  ctx.arc(centerX, centerY, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `600 ${Math.round(ringRadius * 0.45)}px system-ui`
  ctx.fillText(timeLabel, centerX, centerY)

  ctx.font = `500 ${Math.round(ringRadius * 0.16)}px system-ui`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.fillText('Отдых между подходами', centerX, centerY + ringRadius * 1.45)
  ctx.restore()
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1
  const cssWidth = canvas.clientWidth
  const cssHeight = canvas.clientHeight
  const nextWidth = Math.round(cssWidth * dpr)
  const nextHeight = Math.round(cssHeight * dpr)

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth
    canvas.height = nextHeight
  }
}

function computeCoverLayout(
  sourceW: number,
  sourceH: number,
  targetW: number,
  targetH: number,
): { dx: number; dy: number; dw: number; dh: number } {
  const scale = Math.max(targetW / sourceW, targetH / sourceH)
  const dw = sourceW * scale
  const dh = sourceH * scale
  const dx = (targetW - dw) / 2
  const dy = (targetH - dh) / 2
  return { dx, dy, dw, dh }
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmarks,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  ctx.save()
  ctx.lineWidth = 3
  ctx.strokeStyle = '#00e0ff'
  ctx.fillStyle = '#ffdf00'

  for (const [a, b] of CONNECTIONS) {
    const pa = landmarks[a]
    const pb = landmarks[b]
    if (!pa || !pb) {
      continue
    }
    if (pa.visibility < 0.4 || pb.visibility < 0.4) {
      continue
    }

    ctx.beginPath()
    ctx.moveTo(dx + pa.x * dw, dy + pa.y * dh)
    ctx.lineTo(dx + pb.x * dw, dy + pb.y * dh)
    ctx.stroke()
  }

  for (const point of landmarks) {
    if (point.visibility < 0.4) {
      continue
    }
    ctx.beginPath()
    ctx.arc(dx + point.x * dw, dy + point.y * dh, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawHud(ctx: CanvasRenderingContext2D, runtime: ExerciseRuntimeState): void {
  const metricEntries = Object.entries(runtime.metrics)
  const hudHeight = 112 + metricEntries.length * 22

  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(16, 16, 340, hudHeight)

  ctx.fillStyle = '#ffffff'
  ctx.font = '600 22px system-ui'
  ctx.fillText(`Повторы: ${runtime.reps}`, 28, 50)
  ctx.font = '500 16px system-ui'
  ctx.fillText(`Фаза: ${runtime.phase}`, 28, 76)
  const status = runtime.isBodyDetected
    ? `Confidence: ${(runtime.confidence * 100).toFixed(0)}%`
    : 'Поза не найдена'
  ctx.fillText(status, 28, 102)

  let y = 126
  for (const [name, value] of metricEntries) {
    ctx.fillText(`${name}: ${value.toFixed(1)}`, 28, y)
    y += 22
  }
  ctx.restore()
}
