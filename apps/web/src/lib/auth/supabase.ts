import { createClient } from '@supabase/supabase-js'
import { parseAuthHandoffUrl } from './authHandoff'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const initialAuthUrl = new URL(window.location.href)

export type AuthHandoffPlatform = 'android' | 'ios'

export function getAuthHandoff(): { url: string; platform: AuthHandoffPlatform } | null {
  const platform = /android/i.test(navigator.userAgent)
    ? 'android'
    : /iphone|ipad|ipod/i.test(navigator.userAgent)
      ? 'ios'
      : null
  if (!platform) return null
  if (window.matchMedia('(display-mode: standalone)').matches) return null
  if (Boolean((navigator as Navigator & { standalone?: boolean }).standalone)) return null

  const auth = new URLSearchParams(initialAuthUrl.hash.slice(1))
  if (!auth.get('access_token') || !auth.get('refresh_token')) return null

  return {
    url: `${initialAuthUrl.origin}${initialAuthUrl.pathname}${initialAuthUrl.search}${initialAuthUrl.hash}`,
    platform,
  }
}

export async function signInFromHandoffUrl(handoffUrl: string): Promise<void> {
  if (!supabase) throw new Error('Sign-in is not configured.')
  const { accessToken, refreshToken } = parseAuthHandoffUrl(handoffUrl, location.origin)

  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  if (error) throw new Error('This sign-in link is invalid or expired.')
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
