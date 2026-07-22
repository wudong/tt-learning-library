import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const initialAuthUrl = new URL(window.location.href)

export function getAndroidPwaHandoffUrl(): string | null {
  if (!/android/i.test(navigator.userAgent)) return null
  if (window.matchMedia('(display-mode: standalone)').matches) return null

  const auth = new URLSearchParams(initialAuthUrl.hash.slice(1))
  if (!auth.get('access_token') || !auth.get('refresh_token')) return null

  return `${initialAuthUrl.origin}${initialAuthUrl.pathname}${initialAuthUrl.search}${initialAuthUrl.hash}`
}

export const supabase = url && publishableKey
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
