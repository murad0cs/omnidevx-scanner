import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import type { ToastMessage } from '../types'

interface ToastProps {
  toast: ToastMessage
  onDismiss: (id: string) => void
  duration?: number
}

function SingleToast({ toast, onDismiss, duration = 3500 }: ToastProps) {
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = () => {
    setExiting(true)
    setTimeout(() => onDismiss(toast.id), 300)
  }

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id, duration])

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
    error:   <XCircle     className="w-5 h-5 text-red-400     flex-shrink-0" />,
    info:    <Info        className="w-5 h-5 text-brand-400   flex-shrink-0" />,
  }

  const borders = {
    success: 'border-emerald-500/30',
    error:   'border-red-500/30',
    info:    'border-brand-500/30',
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl
        bg-slate-800/95 border ${borders[toast.type]}
        shadow-xl shadow-black/40 backdrop-blur-md
        max-w-sm w-full pointer-events-auto
        ${exiting ? 'toast-exit' : 'toast-enter'}
      `}
    >
      {icons[toast.type]}
      <p className="flex-1 text-slate-100 text-sm font-medium leading-snug">
        {toast.message}
      </p>
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 items-end pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <SingleToast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}

// Hook for managing toasts
export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev, { id, message, type }])
    return id
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const success = (message: string) => addToast(message, 'success')
  const error   = (message: string) => addToast(message, 'error')
  const info    = (message: string) => addToast(message, 'info')

  return { toasts, dismissToast, success, error, info }
}
