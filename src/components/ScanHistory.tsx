import { useState, useMemo } from 'react'
import {
  Search,
  Download,
  Trash2,
  Clock,
  Smartphone,
  QrCode,
  AlertCircle,
  BarChart2,
  ExternalLink,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import type { Scan } from '../types'

interface ScanHistoryProps {
  scans: Scan[]
  loading: boolean
  error: string | null
  onDelete?: (id: string) => void
  onClearAll?: () => void
}

function getTypeBadgeClass(type: string): string {
  const t = type.toUpperCase()
  if (t === 'QR_CODE') return 'type-badge type-badge-qr'
  if (t.startsWith('EAN') || t.startsWith('UPC')) return 'type-badge type-badge-ean'
  if (t.includes('128') || t.includes('39') || t.includes('93')) return 'type-badge type-badge-code128'
  return 'type-badge type-badge-other'
}

function formatType(type: string): string {
  return type.replace(/_/g, ' ')
}

function isURL(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function exportToCSV(scans: Scan[]) {
  const headers = ['ID', 'Value', 'Type', 'Timestamp', 'Platform', 'Language']
  const rows = scans.map((s) => [
    s.id,
    `"${s.value.replace(/"/g, '""')}"`,
    s.type,
    s.timestamp,
    s.device_info?.platform ?? '',
    s.device_info?.language ?? '',
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scans-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function SkeletonCard() {
  return (
    <div className="scan-card animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-700 rounded w-3/4" />
          <div className="h-3 bg-slate-700/60 rounded w-1/2" />
          <div className="h-3 bg-slate-700/40 rounded w-1/3" />
        </div>
        <div className="h-5 w-16 bg-slate-700 rounded-full" />
      </div>
    </div>
  )
}

function ScanCard({ scan, onDelete }: { scan: Scan; onDelete?: (id: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scan.value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard not available
    }
  }

  const ts = new Date(scan.timestamp)
  const valueIsURL = isURL(scan.value)

  return (
    <div className="scan-card animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {scan.type === 'QR_CODE' ? (
            <QrCode className="w-5 h-5 text-violet-400" />
          ) : (
            <BarChart2 className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 text-left group"
              title="Click to copy"
            >
              <p className="text-slate-100 font-mono text-sm break-all leading-relaxed group-hover:text-brand-300 transition-colors">
                {scan.value}
              </p>
              {copied && (
                <span className="text-xs text-emerald-400 animate-fade-in">Copied!</span>
              )}
            </button>

            {valueIsURL && (
              <a
                href={scan.value}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 mt-0.5 text-slate-500 hover:text-brand-400 transition-colors"
                title="Open URL"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={getTypeBadgeClass(scan.type)}>
              {formatType(scan.type)}
            </span>

            <span className="flex items-center gap-1 text-slate-500 text-xs">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(ts, { addSuffix: true })}
            </span>

            {scan.device_info?.platform && (
              <span className="flex items-center gap-1 text-slate-500 text-xs">
                <Smartphone className="w-3 h-3" />
                {scan.device_info.platform}
              </span>
            )}
          </div>

          <p className="text-slate-600 text-xs mt-1">
            {format(ts, 'MMM d, yyyy · HH:mm:ss')}
          </p>
        </div>

        {onDelete && (
          <div className="flex-shrink-0">
            {showDelete ? (
              <div className="flex gap-1">
                <button
                  onClick={() => { onDelete(scan.id); setShowDelete(false) }}
                  className="text-red-400 hover:text-red-300 transition-colors p-1 rounded-lg hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDelete(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1 text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDelete(true)}
                className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
                style={{ opacity: 1 }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ScanHistory({ scans, loading, error, onDelete, onClearAll }: ScanHistoryProps) {
  const [query, setQuery] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const filtered = useMemo(() => {
    if (!query.trim()) return scans
    const q = query.toLowerCase()
    return scans.filter(
      (s) =>
        s.value.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        formatType(s.type).toLowerCase().includes(q)
    )
  }, [scans, query])

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    onClearAll?.()
    setConfirmClear(false)
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by value or type..."
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={() => exportToCSV(filtered)}
          disabled={filtered.length === 0}
          className="btn-secondary px-3 flex-shrink-0"
          title="Export to CSV"
        >
          <Download className="w-4 h-4" />
        </button>
        {onClearAll && scans.length > 0 && (
          <button
            onClick={handleClearAll}
            className={`btn-secondary px-3 flex-shrink-0 transition-colors ${
              confirmClear ? 'text-red-400 border-red-500/40 bg-red-500/10 hover:bg-red-500/20' : ''
            }`}
            title={confirmClear ? 'Tap again to confirm' : 'Clear all'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {!loading && scans.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            {filtered.length === scans.length
              ? `${scans.length} scan${scans.length !== 1 ? 's' : ''}`
              : `${filtered.length} of ${scans.length} scans`}
          </span>
          {query && filtered.length === 0 && (
            <span className="text-slate-600">No results for "{query}"</span>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-medium text-sm">Failed to load scans</p>
            <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && !error && scans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-800/80 flex items-center justify-center">
            <QrCode className="w-10 h-10 text-slate-600" />
          </div>
          <div>
            <p className="text-slate-300 font-semibold text-lg">No scans yet</p>
            <p className="text-slate-500 text-sm mt-1 max-w-xs">
              Switch to the Scanner tab and scan your first QR code or barcode.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && scans.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <Search className="w-10 h-10 text-slate-600" />
          <div>
            <p className="text-slate-400 font-medium">No results</p>
            <p className="text-slate-500 text-sm mt-1">
              No scans match "<span className="text-slate-400">{query}</span>"
            </p>
          </div>
          <button onClick={() => setQuery('')} className="btn-secondary text-sm">
            Clear search
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((scan) => (
            <ScanCard key={scan.id} scan={scan} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
