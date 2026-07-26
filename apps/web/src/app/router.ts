import { useEffect, useState } from 'react'

const ROUTE_HISTORY_KEY = 'ttLearnRoute'

type RouteHistoryState = {
  [ROUTE_HISTORY_KEY]?: {
    from?: unknown
  }
}

function currentRoute() {
  return location.pathname + location.search
}

export function previousRouteWithin(state: unknown, scope: string): string | null {
  if (!state || typeof state !== 'object') return null
  const candidate = (state as RouteHistoryState)[ROUTE_HISTORY_KEY]?.from
  if (typeof candidate !== 'string') return null
  const pathname = candidate.split('?')[0]
  return pathname === scope || pathname.startsWith(`${scope}/`) ? candidate : null
}

export function useRoute() {
  const [path, setPath] = useState(currentRoute)

  useEffect(() => {
    const onPopState = () => setPath(currentRoute())
    addEventListener('popstate', onPopState)
    return () => removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (to: string) => {
    const existingState = history.state && typeof history.state === 'object' ? history.state : {}
    history.pushState({
      ...existingState,
      [ROUTE_HISTORY_KEY]: { from: currentRoute() },
    }, '', to)
    dispatchEvent(new PopStateEvent('popstate'))
  }

  const navigateBack = (fallback: string, scope: string) => {
    if (previousRouteWithin(history.state, scope)) {
      history.back()
      return
    }
    navigate(fallback)
  }

  return { path, navigate, navigateBack }
}
