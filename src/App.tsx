import { useState, useRef, useCallback } from 'react'
import { ScanLine, History, Wifi, WifiOff, Scan } from 'lucide-react'
import Scanner from './components/Scanner'
import ScanHistory from './components/ScanHistory'
import { ToastContainer, useToasts } from './components/Toast'
import { useScans } from './hooks/useScans'
import { isSupabaseConfigured } from './lib/supabase'
import type { TabId } from './types'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('scanner')
  const { scans, addScan, deleteScan, loading, error } = useScans()
  const { toasts, dismissToast, success, error: toastError } = useToasts()

  // Duplicate scan prevention: track last scan value + time
  const lastScanRef = useRef<{ value: string; time: number }>({ value: '', time: 0 })

  const handleScan = useCallback(
    async (value: string, type: string) => {
      const now = Date.now()
      const last = lastScanRef.current

      // Skip if exact same value scanned within 2 seconds
      if (value === last.value && now - last.time < 2000) {
        return
      }

      lastScanRef.current = { value, time: now }

      try {
        await addScan(value, type)
        success(`Scanned: ${truncate(value, 40)}`)
      } catch {
        toastError('Failed to save scan. Please try again.')
      }
    },
    [addScan, success, toastError]
  )

  const unseenCount = scans.length

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-slate-800/60">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Scan className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-slate-100 font-bold text-base leading-none">OmniScan</h1>
              <p className="text-slate-500 text-xs leading-none mt-0.5">by OmniDevX</p>
            </div>
          </div>

          {/* Connection status indicator */}
          <div className="flex items-center gap-1.5">
            {isSupabaseConfigured ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-medium">Live Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400 text-xs font-medium">Offline</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Offline banner */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center">
          <p className="text-amber-400 text-xs">
            Running in offline mode. Configure Supabase in <code className="font-mono bg-amber-500/10 px-1 rounded">.env</code> for cloud sync.
          </p>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-8">
        {/* Tab bar */}
        <div className="flex gap-1.5 bg-slate-900/80 border border-slate-800/60 rounded-2xl p-1.5 mb-5 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`tab-btn flex items-center justify-center gap-2 ${
              activeTab === 'scanner' ? 'tab-btn-active' : 'tab-btn-inactive'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            Scanner
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`tab-btn flex items-center justify-center gap-2 ${
              activeTab === 'history' ? 'tab-btn-active' : 'tab-btn-inactive'
            }`}
          >
            <History className="w-4 h-4" />
            History
            {unseenCount > 0 && (
              <span
                className={`
                  inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5
                  text-xs font-bold rounded-full leading-none
                  ${activeTab === 'history'
                    ? 'bg-white/20 text-white'
                    : 'bg-brand-600 text-white'
                  }
                `}
              >
                {unseenCount > 99 ? '99+' : unseenCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab panels */}
        {activeTab === 'scanner' && (
          <Scanner onScan={handleScan} />
        )}

        {activeTab === 'history' && (
          <ScanHistory
            scans={scans}
            loading={loading}
            error={error}
            onDelete={deleteScan}
          />
        )}
      </main>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '…'
}
