import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Download,
  Dumbbell,
  Home,
  Inbox,
  Library,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Target,
} from 'lucide-react'
import {
  AppButton,
  AppDrawer,
  AppShellPage,
} from '@wudong/tt-players-design-system'
import { usePwa } from '../lib/pwa/PwaProvider'
import { FeedbackSheet } from './FeedbackSheet'
import { BuildIdentity } from './BuildIdentity'
import {
  MobilePageActionsProvider,
  PageTitleProvider,
  type MobilePageAction,
  type PageTitleState,
} from './MobilePageActions'

const primaryItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/training', label: 'Training', icon: Dumbbell },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/settings', label: 'More', icon: MoreHorizontal },
] as const

type PageMeta = {
  title: string
  eyebrow: string
  back?: string
  backLabel?: string
  backScope?: string
}

const pageMeta = (path: string): PageMeta => {
  if (path === '/') return { title: 'Home', eyebrow: 'Your learning today' }
  if (path === '/inbox') return { title: 'Inbox', eyebrow: 'Captured for later' }
  if (path === '/library') return { title: 'Library', eyebrow: 'Skills, videos and practice' }
  if (path.startsWith('/library/connections/')) return { title: 'Connections', eyebrow: 'Knowledge graph', back: '/library', backLabel: 'Back in Library', backScope: '/library' }
  if (/^\/library\/topics\/[^/]+\/pictures$/.test(path)) return { title: 'Pictures', eyebrow: 'Topic management', back: path.replace(/\/pictures$/, ''), backLabel: 'Back in Library', backScope: '/library' }
  if (path.startsWith('/library/topics/')) return { title: 'Topic', eyebrow: 'Learning area', back: '/library', backLabel: 'Back in Library', backScope: '/library' }
  if (path.startsWith('/library/skills/')) return { title: 'Skill', eyebrow: 'Learning detail', back: '/library', backLabel: 'Back in Library', backScope: '/library' }
  if (path.startsWith('/library/drills/')) return { title: 'Drill', eyebrow: 'Practice detail', back: '/library', backLabel: 'Back in Library', backScope: '/library' }
  if (path === '/training') return { title: 'Training', eyebrow: 'Plan, practice, reflect' }
  if (path === '/training/new') return { title: 'Plan training', eyebrow: 'Build a focused session', back: '/training', backLabel: 'Back to Training' }
  if (path.startsWith('/training/')) return { title: 'Training session', eyebrow: 'One skill at a time', back: '/training', backLabel: 'Back to Training' }
  if (path === '/search') return { title: 'Search', eyebrow: 'Find what you learned' }
  if (path === '/settings') return { title: 'More', eyebrow: 'App and privacy' }
  if (path === '/videos/new') return { title: 'Add video', eyebrow: 'Save now, organize later', back: '/', backLabel: 'Back to Home' }
  if (path.startsWith('/quick-save/')) return { title: 'Quick save', eyebrow: 'Capture received', back: '/inbox', backLabel: 'Back to Inbox' }
  if (path.startsWith('/inbox/')) return { title: 'Organize', eyebrow: 'Turn capture into learning', back: '/inbox', backLabel: 'Back to Inbox' }
  if (path.startsWith('/videos/')) return { title: 'Video', eyebrow: 'Learning detail', back: '/library', backLabel: 'Back in Library', backScope: '/library' }
  return { title: 'TT Learn', eyebrow: 'Table tennis learning' }
}

export function Layout({
  path,
  navigate,
  navigateBack,
  children,
}: {
  path: string
  navigate: (to: string) => void
  navigateBack: (fallback: string, scope: string) => void
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [pageActions, setPageActions] = useState<MobilePageAction[]>([])
  const [pageTitle, setPageTitle] = useState<PageTitleState | null>(null)
  const { canInstall, isInstalled, install } = usePwa()
  const meta = pageMeta(path)
  const isActive = (href: string) => href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`)

  const registerPageActions = useCallback((actions: MobilePageAction[]) => {
    setPageActions(actions)
    return () => setPageActions((current) => current === actions ? [] : current)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [path])

  const go = (href: string) => {
    navigate(href)
    setMenuOpen(false)
  }

  const defaultToolbarAction = () => {
    if (meta.back) return null
    if (path === '/training') {
      return <button className="toolbar-icon toolbar-add" onClick={() => go('/training/new')} aria-label="Plan training"><Plus size={22} /></button>
    }
    if (path === '/settings') {
      return <button className="toolbar-icon" onClick={() => setFeedbackOpen(true)} aria-label="Send feedback"><MessageSquare size={22} /></button>
    }
    if (path === '/library') return <span className="toolbar-spacer" aria-hidden="true" />
    return <button className="toolbar-icon toolbar-add" onClick={() => go('/videos/new')} aria-label="Add video"><Plus size={22} /></button>
  }

  const navigation = (
    <>
      <div className="side-nav-label">Learning</div>
      <nav className="side-nav" aria-label="Primary navigation">
        {primaryItems.map(({ href, label, icon: Icon }) => (
          <button
            key={href}
            className={`side-nav-item ${isActive(href) ? 'active' : ''}`}
            aria-current={isActive(href) ? 'page' : undefined}
            onClick={() => go(href)}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="side-nav-label">App</div>
      <nav className="side-nav" aria-label="App navigation">
        <button className="side-nav-item" onClick={() => go('/search')}>
          <Search size={20} aria-hidden="true" />
          <span>Search</span>
        </button>
        <button className="side-nav-item" onClick={() => { setMenuOpen(false); setFeedbackOpen(true) }}>
          <MessageSquare size={20} aria-hidden="true" />
          <span>Feedback</span>
        </button>
        <button className="side-nav-item" onClick={() => go('/settings')}>
          <Settings size={20} aria-hidden="true" />
          <span>Settings</span>
        </button>
        {canInstall && !isInstalled && (
          <button className="side-nav-item install-nav-item" onClick={install}>
            <Download size={20} aria-hidden="true" />
            <span>Install app</span>
          </button>
        )}
      </nav>
    </>
  )

  return (
    <MobilePageActionsProvider register={registerPageActions}>
      <PageTitleProvider register={setPageTitle}>
        <AppShellPage className="app-shell" id="tt-learn-app">
          <aside className="desktop-sidebar">
            <button className="brand-lockup" onClick={() => go('/')} aria-label="TT Learn home">
              <span className="brand-mark"><Target size={22} /></span>
              <span><strong>TT Learn</strong><small>Build your game</small></span>
            </button>
            <AppButton full size="l" rounded="m" className="sidebar-add" onClick={() => go('/videos/new')}>
              <Plus size={19} aria-hidden="true" /> Add video
            </AppButton>
            {navigation}
            <div className="sidebar-note">
              <BookOpen size={18} aria-hidden="true" />
              <span>Private by default<br /><small>Your practice library stays yours.</small></span>
            </div>
            <BuildIdentity compact />
          </aside>

          <div className="app-stage">
            <header className="mobile-toolbar">
              <div className="toolbar-leading">
                {meta.back
                  ? <button
                      className="toolbar-icon"
                      onClick={() => meta.backScope ? navigateBack(meta.back!, meta.backScope) : go(meta.back!)}
                      aria-label={meta.backLabel ?? 'Go back'}
                    ><ArrowLeft size={22} /></button>
                  : <button className="toolbar-icon" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={22} /></button>}
              </div>
              <div className="toolbar-title">
                {pageTitle
                  ? <>
                      <span className="toolbar-title-kicker">{pageTitle.icon && <span className="toolbar-title-icon" aria-hidden="true">{pageTitle.icon}</span>}<span>{pageTitle.eyebrow ?? meta.eyebrow}</span></span>
                      <strong>{pageTitle.title}</strong>
                    </>
                  : <><span>{meta.eyebrow}</span><strong>{meta.title}</strong></>}
              </div>
              <div className="toolbar-trailing">
                {pageActions.length > 0
                  ? <div className="toolbar-actions">
                      {pageActions.map((action) => (
                        <button
                          key={action.id}
                          className={`toolbar-icon toolbar-page-action ${action.tone === 'accent' ? 'toolbar-add' : ''} ${action.text ? 'has-text' : ''}`}
                          onClick={action.onPress}
                          aria-label={action.label}
                        >
                          {action.icon}
                          {action.text && <span className="toolbar-page-action-text">{action.text}</span>}
                        </button>
                      ))}
                    </div>
                  : defaultToolbarAction() ?? <span className="toolbar-spacer" aria-hidden="true" />}
              </div>
            </header>

            <main className="main-content" id="main-content">{children}</main>

            <nav className="bottom-nav" aria-label="Primary navigation">
              {primaryItems.map(({ href, label, icon: Icon }) => (
                <button
                  key={href}
                  className={`bottom-nav-item ${isActive(href) ? 'active' : ''}`}
                  aria-current={isActive(href) ? 'page' : undefined}
                  onClick={() => go(href)}
                >
                  <Icon size={21} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          <AppDrawer
            id="tt-learn-navigation"
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            title="TT Learn"
            subtitle="Build your game"
            width="min(86vw, 340px)"
            className="ttll-nav-drawer"
            closeLabel="Close menu"
          >
            <AppButton full size="l" rounded="m" className="sidebar-add" onClick={() => go('/videos/new')}>
              <Plus size={19} aria-hidden="true" /> Add video
            </AppButton>
            {navigation}
            <div className="drawer-status">
              <span className={`status-dot ${isInstalled ? 'ready' : ''}`} />
              {isInstalled ? 'Installed app' : canInstall ? 'Ready to install' : 'Running in browser'}
            </div>
            <BuildIdentity compact />
          </AppDrawer>

          {feedbackOpen && <FeedbackSheet onClose={() => setFeedbackOpen(false)} />}
        </AppShellPage>
      </PageTitleProvider>
    </MobilePageActionsProvider>
  )
}
