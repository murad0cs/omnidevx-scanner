import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[OmniScan] Supabase environment variables not set. ' +
    'Copy .env.example to .env and fill in your Supabase credentials. ' +
    'The app will run in offline/demo mode.'
  )
}

// Create a no-op stub when credentials are missing (offline/demo mode)
export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null

export type Database = {
  public: {
    Tables: {
      scans: {
        Row: {
          id: string
          value: string
          type: string
          timestamp: string
          device_info: {
            userAgent: string
            platform: string
            language: string
          }
        }
        Insert: Omit<Database['public']['Tables']['scans']['Row'], 'id' | 'timestamp'> & {
          id?: string
          timestamp?: string
        }
        Update: Partial<Database['public']['Tables']['scans']['Insert']>
      }
    }
  }
}
