import React, { useState, useRef, useEffect } from 'react'
import { Send, X, Hash } from 'lucide-react'

interface ManualEntryProps {
  onSubmit: (value: string, type: string) => void
  onClose?: () => void
}

const SCAN_TYPES = [
  { value: 'QR_CODE',  label: 'QR Code' },
  { value: 'EAN_13',   label: 'EAN-13 Barcode' },
  { value: 'EAN_8',    label: 'EAN-8 Barcode' },
  { value: 'CODE_128', label: 'Code 128' },
  { value: 'CODE_39',  label: 'Code 39' },
  { value: 'UPC_A',    label: 'UPC-A' },
  { value: 'UPC_E',    label: 'UPC-E' },
  { value: 'OTHER',    label: 'Other' },
]

export default function ManualEntry({ onSubmit, onClose }: ManualEntryProps) {
  const [value, setValue] = useState('')
  const [type, setType] = useState('QR_CODE')
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return

    onSubmit(trimmed, type)
    setSubmitted(true)
    setValue('')

    setTimeout(() => {
      setSubmitted(false)
      inputRef.current?.focus()
    }, 1000)
  }

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 backdrop-blur-sm animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600/20 flex items-center justify-center">
            <Hash className="w-4 h-4 text-brand-400" />
          </div>
          <h3 className="text-slate-200 font-semibold text-sm">Manual Entry</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 transition-colors"
            aria-label="Close manual entry"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Code Value</label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter barcode or QR code value..."
            className="input-field"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Code Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input-field appearance-none cursor-pointer"
          >
            {SCAN_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!value.trim() || submitted}
          className={`btn-primary w-full transition-all ${
            submitted ? 'bg-emerald-600 hover:bg-emerald-600 shadow-emerald-600/25' : ''
          }`}
        >
          {submitted ? (
            <>
              <span className="text-lg leading-none">✓</span>
              Saved!
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Add Scan
            </>
          )}
        </button>
      </form>
    </div>
  )
}
