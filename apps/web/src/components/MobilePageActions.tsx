import { createContext, useContext, useEffect, type ReactNode } from 'react'

export type MobilePageAction = {
  id: string
  label: string
  icon: ReactNode
  onPress: () => void
  tone?: 'default' | 'accent'
  text?: string
}

type RegisterMobilePageActions = (actions: MobilePageAction[]) => () => void

const MobilePageActionsContext = createContext<RegisterMobilePageActions | null>(null)

export function MobilePageActionsProvider({
  register,
  children,
}: {
  register: RegisterMobilePageActions
  children: ReactNode
}) {
  return (
    <MobilePageActionsContext.Provider value={register}>
      {children}
    </MobilePageActionsContext.Provider>
  )
}

export function useMobilePageActions(actions: MobilePageAction[]) {
  const register = useContext(MobilePageActionsContext)

  useEffect(() => {
    if (!register) return
    return register(actions)
  }, [actions, register])
}
