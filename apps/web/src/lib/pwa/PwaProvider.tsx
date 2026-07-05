import { createContext, useContext, useEffect, useState } from 'react'
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
  install: () => Promise<void>
  applyUpdate: () => Promise<void>
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

    if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
      const update = registerSW({
        immediate: true,
        onRegisteredSW: () => setServiceWorkerState('ready'),
        onOfflineReady: () => setServiceWorkerState('ready'),
        onNeedRefresh: () => setUpdateAvailable(true),
        onRegisterError: () => setServiceWorkerState('error'),
      })
      setUpdateServiceWorker(() => update)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
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

  return (
    <PwaContext.Provider value={{
      canInstall: Boolean(installPrompt),
      isInstalled,
      isIos,
      isOnline,
      serviceWorkerState,
      updateAvailable,
      install,
      applyUpdate,
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
