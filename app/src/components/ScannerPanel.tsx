import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'

type Props = {
  open: boolean
  onClose: () => void
  onDetected: (value: string) => void
}

const SUPPORTS_CAMERA = typeof navigator !== 'undefined' && !!navigator.mediaDevices

export function ScannerPanel({ open, onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const lastValueRef = useRef<string>('')
  const lastEmitRef = useRef<number>(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setError(null)
      controlsRef.current?.stop()
      controlsRef.current = null
      return
    }

    if (!SUPPORTS_CAMERA) {
      setError('Camera access is not supported in this browser.')
      return
    }

    const videoElement = videoRef.current
    if (!videoElement) {
      setError('Camera is still starting…')
      return
    }

    setError(null)
    const reader = new BrowserMultiFormatReader()
    let isCancelled = false

    reader
      .decodeFromVideoDevice(undefined, videoElement, (result, err, controls) => {
        if (isCancelled) return
        if (controls) {
          controlsRef.current = controls
        }
        if (result) {
          const text = result.getText().trim()
          const normalized = text.replace(/[^\dX]/gi, '')
          const now = Date.now()
          const isDuplicate = normalized && normalized === lastValueRef.current && now - lastEmitRef.current < 1500
          if (normalized && !isDuplicate) {
            lastValueRef.current = normalized
            lastEmitRef.current = now
            onDetected(normalized)
          }
        } else if (err && !(err instanceof NotFoundException)) {
          setError(err.message ?? 'Unable to read barcode.')
        }
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Unable to access camera.')
      })

    return () => {
      isCancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
      lastValueRef.current = ''
    }
  }, [open, onDetected])

  if (!open) {
    return null
  }

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true">
      <div className="scanner-card">
        <header className="scanner-header">
          <div>
            <p className="eyebrow">Camera Scanner</p>
            <h2>Point at an ISBN barcode</h2>
            <p>Keep the barcode inside the frame until it glows green.</p>
          </div>
          <button className="ghost" onClick={onClose} type="button">
            Close
          </button>
        </header>

        {SUPPORTS_CAMERA ? (
          <div className="scanner-frame">
            <video ref={videoRef} className="scanner-video" autoPlay playsInline muted />
            <div className="scanner-target" />
          </div>
        ) : (
          <p className="scanner-error">Camera access is not available on this device.</p>
        )}

        <footer className="scanner-footer">
          {error ? (
            <p className="scanner-error">{error}</p>
          ) : (
            <ul>
              <li>Most books include a barcode near the back cover.</li>
              <li>Use indoor lighting to avoid glare.</li>
              <li>You can still add books manually below.</li>
            </ul>
          )}
        </footer>
      </div>
    </div>
  )
}

export default ScannerPanel
