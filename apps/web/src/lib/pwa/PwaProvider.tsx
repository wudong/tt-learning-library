import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

type ServiceWorkerState = 'checking' | 'ready' | 'development' | 'unsupported' | 'error'

interface PwaContextValue {
  canInstall: boolean
  isInstalled: boolean
  isIos: boolean
  isOnline: boolean
  serviceWorkerState: ServiceWorkerState
  updateAvailable: boolean
  hasUnsavedChanges: boolean
  install: () => Promise<void>
  applyUpdate: () => Promise<void>
  setUnsavedSource: (source: symbol, isDirty: boolean) => void
}

const PwaContext = createContext<PwaContextValue | null>(null)

function detectInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as NavigatorWithStandalone).standalone)
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setInstalled] = useState(detectInstalled)
  const [isOnline, setOnline] = useState(navigator.onLine)
  const [serviceWorkerState, setServiceWorkerState] = useState<ServiceWorkerState>(
    import.meta.env.DEV ? 'development' : 'serviceWorker' in navigator ? 'checking' : 'unsupported',
  )
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateServiceWorker, setUpdateServiceWorker] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const unsavedSourcesRef = useRef(new Set<symbol>())
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const lastUpdateCheckRef = useRef(0)
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)

    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    let updateInterval: number | undefined
    const checkForUpdate = () => {
      const registration = registrationRef.current
      if (!registration || !navigator.onLine) return
      lastUpdateCheckRef.current = Date.now()
      void registration.update().catch(() => setServiceWorkerState('error'))
    }
    const checkAfterResume = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastUpdateCheckRef.current < 5 * 60 * 1000) return
      checkForUpdate()
    }

    if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
      const update = registerSW({
        immediate: true,
        onRegisteredSW: (_serviceWorkerUrl, registration) => {
          registrationRef.current = registration ?? null
          lastUpdateCheckRef.current = Date.now()
          setServiceWorkerState('ready')
        },
        onOfflineReady: () => setServiceWorkerState('ready'),
        onNeedRefresh: () => setUpdateAvailable(true),
        onRegisterError: () => setServiceWorkerState('error'),
      })
      setUpdateServiceWorker(() => update)
      updateInterval = window.setInterval(checkForUpdate, 60 * 60 * 1000)
      document.addEventListener('visibilitychange', checkAfterResume)
      window.addEventListener('focus', checkAfterResume)
      window.addEventListener('online', checkForUpdate)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', checkAfterResume)
      window.removeEventListener('focus', checkAfterResume)
      window.removeEventListener('online', checkForUpdate)
      if (updateInterval !== undefined) window.clearInterval(updateInterval)
    }
  }, [])

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  async function applyUpdate() {
    if (!updateServiceWorker) return
    await updateServiceWorker(true)
  }

  const setUnsavedSource = useCallback((source: symbol, isDirty: boolean) => {
    if (isDirty) unsavedSourcesRef.current.add(source)
    else unsavedSourcesRef.current.delete(source)
    setHasUnsavedChanges(unsavedSourcesRef.current.size > 0)
  }, [])

  return (
    <PwaContext.Provider value={{
      canInstall: Boolean(installPrompt),
      isInstalled,
      isIos,
      isOnline,
      serviceWorkerState,
      updateAvailable,
      hasUnsavedChanges,
      install,
      applyUpdate,
      setUnsavedSource,
    }}>
      {children}
    </PwaContext.Provider>
  )
}

export function usePwa() {
  const value = useContext(PwaContext)
  if (!value) throw new Error('usePwa must be used inside PwaProvider')
  return value
}

export function usePwaUpdateGuard(isDirty: boolean) {
  const { setUnsavedSource } = usePwa()
  const sourceRef = useRef(Symbol('unsaved-form'))
  useLayoutEffect(() => {
    const source = sourceRef.current
    setUnsavedSource(source, isDirty)
    return () => setUnsavedSource(source, false)
  }, [isDirty, setUnsavedSource])
}
