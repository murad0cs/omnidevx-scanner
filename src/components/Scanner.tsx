import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library'
import {
  Camera,
  CameraOff,
  Keyboard,
  RefreshCw,
  Zap,
  AlertCircle,
} from 'lucide-react'
import ManualEntry from './ManualEntry'

interface ScannerProps {
  onScan: (value: string, type: string) => void
}

type ScannerState =
  | 'idle'
  | 'requesting'
  | 'scanning'
  | 'error'
  | 'permission-denied'
  | 'no-camera'

const HINTS = new Map<DecodeHintType, unknown>()
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
  BarcodeFormat.AZTEC,
])
HINTS.set(DecodeHintType.TRY_HARDER, true)

export default function Scanner({ onScan }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)

  const [state, setState] = useState<ScannerState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showManual, setShowManual] = useState(false)
  const lastScannedRef = useRef<{ value: string; time: number }>({ value: '', time: 0 })
  const [scanFlash, setScanFlash] = useState(false)
  const [scannedType, setScannedType] = useState('')
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined)

  const stopCamera = useCallback(() => {
    try {
      controlsRef.current?.stop()
      controlsRef.current = null
    } catch {
      // ignore
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    readerRef.current = null
  }, [])

  const startScanner = useCallback(async (deviceId?: string) => {
    stopCamera()
    setState('requesting')
    setErrorMessage('')

    try {
      // List available cameras
      let availableCameras: MediaDeviceInfo[] = []
      try {
        availableCameras = await BrowserMultiFormatReader.listVideoInputDevices()
        setCameras(availableCameras)
      } catch {
        // listVideoInputDevices can fail before permission is granted — continue anyway
      }

      if (availableCameras.length === 0 && !deviceId) {
        // Try to just request user media directly
      }

      // Determine camera constraints — prefer back camera on mobile
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      }

      // Request camera stream
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (err) {
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setState('permission-denied')
            setErrorMessage('Camera access was denied. Please allow camera access in your browser settings and try again.')
            return
          }
          if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setState('no-camera')
            setErrorMessage('No camera found on this device.')
            return
          }
          if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            setState('error')
            setErrorMessage('Camera is in use by another application. Please close other apps using the camera.')
            return
          }
        }
        throw err
      }

      streamRef.current = stream

      if (!videoRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      // Re-list cameras now that permission is granted
      try {
        const camsAfterPermission = await BrowserMultiFormatReader.listVideoInputDevices()
        setCameras(camsAfterPermission)
      } catch {
        // ignore
      }

      // Attach stream to video element
      videoRef.current.srcObject = stream

      // iOS Safari requires these attributes
      videoRef.current.setAttribute('autoplay', '')
      videoRef.current.setAttribute('muted', '')
      videoRef.current.setAttribute('playsinline', '')

      await videoRef.current.play().catch(() => {
        // Some browsers require user gesture — handled by the UI
      })

      setState('scanning')

      // Initialize ZXing reader with hints
      const reader = new BrowserMultiFormatReader(HINTS, {
        delayBetweenScanAttempts: 100,
        delayBetweenScanSuccess: 1500,
      })
      readerRef.current = reader

      // Start decoding from the existing video stream
      const controls = await reader.decodeFromStream(stream, videoRef.current, (result, err) => {
        if (result) {
          const value = result.getText()
          const format = result.getBarcodeFormat()
          const typeName = getBarcodeTypeName(format)

          // Debounce: skip same value scanned within 3 seconds (ref-based, no stale closure)
          const now = Date.now()
          const last = lastScannedRef.current
          if (value === last.value && now - last.time < 3000) return
          lastScannedRef.current = { value, time: now }

          setScannedType(typeName)
          setScanFlash(true)
          setTimeout(() => setScanFlash(false), 500)

          onScan(value, typeName)
        } else if (err && !(err instanceof NotFoundException)) {
          // Only log non-"not found" errors — NotFoundException is normal (frame with no barcode)
          console.debug('[Scanner] decode error:', err)
        }
      })

      controlsRef.current = controls
    } catch (err) {
      console.error('[Scanner] startScanner error:', err)
      setState('error')
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while starting the camera.'
      )
    }
  }, [stopCamera, onScan])

  // Start scanner on mount
  useEffect(() => {
    startScanner(selectedCamera)
    return () => {
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restart when camera selection changes
  const handleCameraChange = (deviceId: string) => {
    setSelectedCamera(deviceId)
    startScanner(deviceId)
  }

  const handleRetry = () => {
    startScanner(selectedCamera)
  }

  const handleManualSubmit = (value: string, type: string) => {
    onScan(value, type)
    setShowManual(false)
  }

  const isScanning = state === 'scanning'
  const isError = state === 'error' || state === 'permission-denied' || state === 'no-camera'
  const isLoading = state === 'requesting' || state === 'idle'

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Scanner viewport */}
      <div className="scanner-viewport shadow-2xl shadow-black/50">
        {/* Video element */}
        <video
          ref={videoRef}
          className="scanner-video"
          autoPlay
          muted
          playsInline
          style={{ display: isScanning || isLoading ? 'block' : 'none' }}
        />

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-3">
            <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Starting camera...</p>
          </div>
        )}

        {/* Error states */}
        {isError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
              {state === 'permission-denied' ? (
                <CameraOff className="w-8 h-8 text-red-400" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-400" />
              )}
            </div>
            <div>
              <p className="text-slate-200 font-semibold mb-1">
                {state === 'permission-denied' ? 'Camera Access Denied' : 'Camera Error'}
              </p>
              <p className="text-slate-400 text-sm leading-relaxed">{errorMessage}</p>
            </div>
            {state !== 'no-camera' && (
              <button
                onClick={handleRetry}
                className="btn-secondary text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Scanning overlay */}
        {isScanning && (
          <>
            {/* Dark vignette on sides */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.4) 100%)',
              }}
            />

            {/* Corner frame brackets */}
            <div className="scan-frame">
              <div className="scan-corner scan-corner-tl" />
              <div className="scan-corner scan-corner-tr" />
              <div className="scan-corner scan-corner-bl" />
              <div className="scan-corner scan-corner-br" />
            </div>

            {/* Animated laser line */}
            <div className="laser-line" />

            {/* Scan success flash */}
            {scanFlash && <div className="scan-success-flash" />}

            {/* Scan hint text */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex flex-col items-center gap-2">
              {scannedType && (
                <span
                  className="type-badge type-badge-qr animate-fade-in"
                  style={{ animationDuration: '0.2s' }}
                >
                  {scannedType}
                </span>
              )}
              <p className="text-white/70 text-xs text-center drop-shadow-lg">
                Point camera at a QR code or barcode
              </p>
            </div>

            {/* Live indicator */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white text-xs font-medium">LIVE</span>
            </div>
          </>
        )}
      </div>

      {/* Camera selector (shown when multiple cameras exist) */}
      {cameras.length > 1 && isScanning && (
        <div className="flex items-center gap-3">
          <Camera className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedCamera ?? ''}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {isError ? (
          <button
            onClick={() => setShowManual(true)}
            className="btn-primary flex-1"
          >
            <Keyboard className="w-4 h-4" />
            Enter Code Manually
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowManual((v) => !v)}
              className="btn-secondary flex-1"
            >
              <Keyboard className="w-4 h-4" />
              {showManual ? 'Hide Manual Entry' : 'Enter Manually'}
            </button>
            {isScanning && (
              <button
                onClick={handleRetry}
                className="btn-secondary px-3"
                title="Restart camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Supported formats info */}
      {isScanning && (
        <div className="flex items-start gap-2 bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <Zap className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <p className="text-slate-400 text-xs leading-relaxed">
            Supports QR Code, EAN-13, EAN-8, Code 128, Code 39, UPC, Data Matrix, PDF 417, and more.
          </p>
        </div>
      )}

      {/* Manual Entry Form */}
      {showManual && (
        <ManualEntry
          onSubmit={handleManualSubmit}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  )
}

function getBarcodeTypeName(format: number): string {
  const map: Record<number, string> = {
    0:  'AZTEC',
    1:  'CODABAR',
    2:  'CODE_39',
    3:  'CODE_93',
    4:  'CODE_128',
    5:  'DATA_MATRIX',
    6:  'EAN_8',
    7:  'EAN_13',
    8:  'ITF',
    9:  'MAXICODE',
    10: 'PDF_417',
    11: 'QR_CODE',
    12: 'RSS_14',
    13: 'RSS_EXPANDED',
    14: 'UPC_A',
    15: 'UPC_E',
    16: 'UPC_EAN_EXTENSION',
  }
  return map[format] ?? 'UNKNOWN'
}
