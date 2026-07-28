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

export type PageTitleState = {
  title: string
  eyebrow?: string
  icon?: ReactNode
}

type RegisterPageTitle = (title: PageTitleState | null) => void

const MobilePageActionsContext = createContext<RegisterMobilePageActions | null>(null)
const PageTitleContext = createContext<RegisterPageTitle | null>(null)

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

export function PageTitleProvider({
  register,
  children,
}: {
  register: RegisterPageTitle
  children: ReactNode
}) {
  return (
    <PageTitleContext.Provider value={register}>
      {children}
    </PageTitleContext.Provider>
  )
}

export function useMobilePageActions(actions: MobilePageAction[]) {
  const register = useContext(MobilePageActionsContext)

  useEffect(() => {
    if (!register) return
    return register(actions)
  }, [actions, register])
}

export function usePageTitle(title: string | null, options?: { eyebrow?: string; icon?: ReactNode }) {
  const register = useContext(PageTitleContext)

  useEffect(() => {
    if (!register) return
    register(title ? { title, eyebrow: options?.eyebrow, icon: options?.icon } : null)
    return () => register(null)
  }, [register, title, options?.eyebrow, options?.icon])
}
