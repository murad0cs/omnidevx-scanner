import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Scan } from '../types'

function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform || (navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Unknown'),
    language: navigator.language,
  }
}

function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useScans() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null)

  // Fetch all scans from Supabase, sorted newest first
  const fetchScans = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Offline mode: load from localStorage
      try {
        const stored = localStorage.getItem('omnidevx_scans')
        const parsed: Scan[] = stored ? JSON.parse(stored) : []
        setScans(parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
      } catch {
        setScans([])
      }
      setLoading(false)
      return
    }

    try {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('scans')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500)

      if (fetchError) throw fetchError

      setScans(data ?? [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch scans'
      console.error('[useScans] fetchScans error:', message)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    fetchScans()

    if (!isSupabaseConfigured || !supabase) return

    const channel = supabase
      .channel('scans-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scans' },
        (payload) => {
          const newScan = payload.new as Scan
          setScans((prev) => {
            // Avoid duplicates
            if (prev.some((s) => s.id === newScan.id)) return prev
            return [newScan, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'scans' },
        (payload) => {
          setScans((prev) => prev.filter((s) => s.id !== (payload.old as Scan).id))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useScans] Real-time subscription active')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchScans])

  // Add a new scan to Supabase (or localStorage in offline mode)
  const addScan = useCallback(async (value: string, type: string): Promise<Scan | null> => {
    const deviceInfo = getDeviceInfo()
    const newScan: Scan = {
      id: generateLocalId(),
      value,
      type,
      timestamp: new Date().toISOString(),
      device_info: deviceInfo,
    }

    if (!isSupabaseConfigured || !supabase) {
      // Offline mode: persist to localStorage
      setScans((prev) => {
        const updated = [newScan, ...prev]
        try {
          localStorage.setItem('omnidevx_scans', JSON.stringify(updated.slice(0, 500)))
        } catch {
          // Storage quota exceeded — ignore
        }
        return updated
      })
      return newScan
    }

    try {
      const { data, error: insertError } = await supabase
        .from('scans')
        .insert({
          value,
          type,
          device_info: deviceInfo,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Real-time will add it to the list, but we optimistically add it
      // to ensure instant feedback even if real-time is slow
      setScans((prev) => {
        if (prev.some((s) => s.id === data.id)) return prev
        return [data, ...prev]
      })

      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save scan'
      console.error('[useScans] addScan error:', message)
      setError(message)

      // Fallback: still add locally so UX doesn't break
      setScans((prev) => [newScan, ...prev])
      return newScan
    }
  }, [])

  // Delete a scan
  const deleteScan = useCallback(async (id: string) => {
    // Optimistic removal
    setScans((prev) => prev.filter((s) => s.id !== id))

    if (!isSupabaseConfigured || !supabase) {
      // Sync localStorage
      setScans((prev) => {
        try {
          localStorage.setItem('omnidevx_scans', JSON.stringify(prev))
        } catch {
          // ignore
        }
        return prev
      })
      return
    }

    try {
      const { error: deleteError } = await supabase.from('scans').delete().eq('id', id)
      if (deleteError) throw deleteError
    } catch (err) {
      console.error('[useScans] deleteScan error:', err)
      // Re-fetch to restore state on failure
      fetchScans()
    }
  }, [fetchScans])

  return {
    scans,
    addScan,
    deleteScan,
    loading,
    error,
    refetch: fetchScans,
  }
}
