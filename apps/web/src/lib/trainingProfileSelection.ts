import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'ttll.activeTrainingProfile'
const CHANGE_EVENT = 'ttll-training-profile-change'

function readActiveTrainingProfileId() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(STORAGE_KEY) ?? ''
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function setActiveTrainingProfileId(profileId: string) {
  if (profileId) window.localStorage.setItem(STORAGE_KEY, profileId)
  else window.localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function useActiveTrainingProfileId() {
  return useSyncExternalStore(subscribe, readActiveTrainingProfileId, () => '')
}
