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

function localId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useScans() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null)

  const fetchScans = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
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
      setError(err instanceof Error ? err.message : 'Failed to fetch scans')
    } finally {
      setLoading(false)
    }
  }, [])

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
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchScans])

  const addScan = useCallback(async (value: string, type: string): Promise<Scan | null> => {
    const deviceInfo = getDeviceInfo()
    const fallback: Scan = {
      id: localId(),
      value,
      type,
      timestamp: new Date().toISOString(),
      device_info: deviceInfo,
    }

    if (!isSupabaseConfigured || !supabase) {
      setScans((prev) => {
        const updated = [fallback, ...prev]
        try {
          localStorage.setItem('omnidevx_scans', JSON.stringify(updated.slice(0, 500)))
        } catch {
          // storage quota
        }
        return updated
      })
      return fallback
    }

    try {
      const { data, error: insertError } = await supabase
        .from('scans')
        .insert({ value, type, device_info: deviceInfo })
        .select()
        .single()

      if (insertError) throw insertError

      setScans((prev) => {
        if (prev.some((s) => s.id === data.id)) return prev
        return [data, ...prev]
      })

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scan')
      setScans((prev) => [fallback, ...prev])
      return fallback
    }
  }, [])

  const deleteScan = useCallback(async (id: string) => {
    setScans((prev) => prev.filter((s) => s.id !== id))

    if (!isSupabaseConfigured || !supabase) return

    try {
      const { error: deleteError } = await supabase.from('scans').delete().eq('id', id)
      if (deleteError) throw deleteError
    } catch {
      fetchScans()
    }
  }, [fetchScans])

  const clearAll = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setScans([])
      localStorage.removeItem('omnidevx_scans')
      return
    }

    const ids = scans.map((s) => s.id)
    setScans([])

    try {
      await supabase.from('scans').delete().in('id', ids)
    } catch {
      fetchScans()
    }
  }, [scans, fetchScans])

  return { scans, addScan, deleteScan, clearAll, loading, error, refetch: fetchScans }
}
