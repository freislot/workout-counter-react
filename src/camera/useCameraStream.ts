import { useCallback, useRef, useState } from 'react'

export function useCameraStream() {
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraReady(false)
  }, [])

  const startCamera = useCallback(async (videoEl: HTMLVideoElement | null): Promise<void> => {
    if (!videoEl) {
      return
    }

    stopCamera()
    setCameraError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      videoEl.srcObject = stream
      await videoEl.play()
      setIsCameraReady(true)
    } catch (error) {
      setIsCameraReady(false)
      setCameraError(error instanceof Error ? error.message : 'Не удалось открыть камеру')
    }
  }, [stopCamera])

  return {
    startCamera,
    stopCamera,
    cameraError,
    isCameraReady,
  }
}
