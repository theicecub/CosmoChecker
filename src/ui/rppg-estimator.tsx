import { useEffect, useRef, useState } from 'react'
import { Camera, CircleStop } from 'lucide-react'
import { estimatePulse, type PulseEstimate } from '../sim/pulse-estimate'

const samplingDurationMs = 12_000
const sampleIntervalMs = 100
const sampleRateHz = 1000 / sampleIntervalMs

export function RppgEstimator({ onEstimate }: { onEstimate: (bpm: number) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream>()
  const timerRef = useRef<number>()
  const samplesRef = useRef<number[]>([])
  const startedAtRef = useRef(0)
  const [status, setStatus] = useState<'idle' | 'requesting' | 'sampling' | 'complete' | 'unavailable'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [estimate, setResult] = useState<PulseEstimate>({ confidence: 0 })
  const [message, setMessage] = useState('Camera use is optional. No video is recorded, saved, or sent.')

  function stopCamera() {
    window.clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = undefined
    if (videoRef.current) videoRef.current.srcObject = null
  }

  function finishEstimate() {
    window.clearInterval(timerRef.current)
    const result = estimatePulse(samplesRef.current, sampleRateHz)
    stopCamera()
    setResult(result)
    setStatus('complete')
    if (result.bpm !== undefined) {
      onEstimate(result.bpm)
      setMessage('Experimental estimate added to the resting heart rate field. Verify it with an approved mission device.')
    } else {
      setMessage('The camera signal was not strong enough for an estimate. Enter a reading manually with an approved device.')
    }
  }

  async function startEstimate() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      setMessage('Camera access is unavailable in this browser. Enter the reading manually with an approved device.')
      return
    }
    setStatus('requesting')
    setResult({ confidence: 0 })
    setElapsed(0)
    setMessage('Waiting for camera permission. You can cancel at any time.')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      streamRef.current = stream
      if (!videoRef.current) {
        stopCamera()
        setStatus('unavailable')
        setMessage('The camera preview could not start. Enter the reading manually.')
        return
      }
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      samplesRef.current = []
      startedAtRef.current = performance.now()
      setStatus('sampling')
      setMessage('Hold still and face the camera in steady light. Processing stays in this browser.')
      timerRef.current = window.setInterval(() => {
        const video = videoRef.current
        const canvas = canvasRef.current
        const context = canvas?.getContext('2d', { willReadFrequently: true })
        if (video && canvas && context && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          const pixels = context.getImageData(16, 16, 32, 32).data
          let greenTotal = 0
          for (let index = 1; index < pixels.length; index += 4) greenTotal += pixels[index]
          samplesRef.current.push(greenTotal / (pixels.length / 4))
        }
        const elapsedMs = performance.now() - startedAtRef.current
        setElapsed(Math.min(samplingDurationMs, elapsedMs))
        if (elapsedMs >= samplingDurationMs) finishEstimate()
      }, sampleIntervalMs)
    } catch {
      stopCamera()
      setStatus('unavailable')
      setMessage('Camera permission was not granted or the camera is unavailable. Enter the reading manually with an approved device.')
    }
  }

  useEffect(() => () => {
    window.clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  return (
    <div className="rppg-estimator">
      <div className="rppg-copy">
        <strong>Optional webcam pulse estimate</strong>
        <p>Experimental rPPG only—not a clinical measurement. Camera frames stay in memory for this estimate and are never uploaded or stored.</p>
      </div>
      <video ref={videoRef} className={`rppg-video${status === 'sampling' ? ' is-active' : ''}`} muted playsInline aria-label="Local camera preview for optional pulse estimate" />
      <canvas ref={canvasRef} width={64} height={64} className="sr-only" aria-hidden="true" />
      <div className="rppg-meta" aria-live="polite">
        <span>Signal confidence <strong>{estimate.confidence}%</strong></span>
        {estimate.bpm !== undefined && <span>Estimate <strong>{estimate.bpm} bpm</strong></span>}
        {status === 'sampling' && <span>Sampling <strong>{Math.floor(elapsed / 1000)} / 12 sec</strong></span>}
      </div>
      <p className="rppg-message" role={status === 'unavailable' ? 'status' : undefined}>{message}</p>
      {status === 'sampling' ? (
        <button type="button" className="secondary-button" onClick={() => { stopCamera(); setStatus('idle'); setMessage('Camera use is optional. No video is recorded, saved, or sent.') }}><CircleStop aria-hidden="true" /> Cancel estimate</button>
      ) : (
        <button type="button" className="secondary-button" onClick={startEstimate} disabled={status === 'requesting'}>
          <Camera aria-hidden="true" /> {status === 'requesting' ? 'Requesting camera…' : status === 'complete' || status === 'unavailable' ? 'Try camera estimate again' : 'Estimate with camera'}
        </button>
      )}
      <small className="rppg-fallback">Manual entry remains available. Use an approved mission device if the signal confidence is low.</small>
    </div>
  )
}
