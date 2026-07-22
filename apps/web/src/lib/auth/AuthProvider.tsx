import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { getAccessToken, supabase } from './supabase'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isConfigured: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function syncServerSession(): Promise<string | null> {
  const token = await getAccessToken()
  if (!token) return null
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    credentials: 'include',
    headers: { authorization: `Bearer ${token}` },
  })
  if (!response.ok) return null
  const body = await response.json() as { data?: { redirectTo?: string | null } }
  return body.data?.redirectTo ?? null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let active = true
    const refreshSession = async () => {
      const { data } = await client.auth.getSession()
      if (!active) return
      setUser(data.session?.user ?? null)
      if (data.session) {
        const redirectTo = await syncServerSession()
        if (redirectTo) window.location.replace(redirectTo)
      }
      if (active) setLoading(false)
    }
    const refreshAfterReturn = () => {
      if (document.visibilityState === 'visible') void refreshSession()
    }
    void refreshSession()
    document.addEventListener('visibilitychange', refreshAfterReturn)
    window.addEventListener('focus', refreshAfterReturn)
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setLoading(false)
      if (session) {
        window.setTimeout(() => {
          void syncServerSession().then((redirectTo) => {
            if (redirectTo) window.location.replace(redirectTo)
          })
        }, 0)
      }
    })
    return () => {
      active = false
      document.removeEventListener('visibilitychange', refreshAfterReturn)
      window.removeEventListener('focus', refreshAfterReturn)
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isConfigured: Boolean(supabase),
    signOut: async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      await supabase?.auth.signOut()
      queryClient.clear()
      setUser(null)
    },
  }), [isLoading, queryClient, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
