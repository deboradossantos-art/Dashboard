import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas')
}

const getAuthStorage = (): Storage | undefined => {
  if (typeof window === 'undefined') return undefined

  const testKey = '__supabase_storage_test__'

  try {
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return window.localStorage
  } catch {
    try {
      window.sessionStorage.setItem(testKey, '1')
      window.sessionStorage.removeItem(testKey)
      return window.sessionStorage
    } catch {
      return undefined
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: getAuthStorage(),
  },
})

export type DashboardOverride = {
  id: string
  user_id: string
  periodo: string | null
  kpi_cards: object | null
  financial_revenue: string | null
  financial_goal: string | null
  financial_ytd: string | null
  financial_ytd_value: string | null
  cancelamentos: string | null
  inadimplencia: string | null
  roi_atual: string | null
  updated_at: string
}
