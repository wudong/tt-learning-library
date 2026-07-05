import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Download,
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
  X,
} from 'lucide-react'
import { usePwa } from '../lib/pwa/PwaProvider'
import { FeedbackSheet } from './FeedbackSheet'

const primaryItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/settings', label: 'More', icon: MoreHorizontal },
] as const

const pageMeta = (path: string) => {
  if (path === '/') return { title: 'Home', eyebrow: 'Your learning today' }
  if (path === '/inbox') return { title: 'Inbox', eyebrow: 'Captured for later' }
  if (path === '/library') return { title: 'Library', eyebrow: 'Skills, videos and practice' }
  if (path === '/search') return { title: 'Search', eyebrow: 'Find what you learned' }
  if (path === '/settings') return { title: 'More', eyebrow: 'App and privacy' }
  if (path === '/videos/new') return { title: 'Add video', eyebrow: 'Save now, organize later', back: '/' }
  if (path.startsWith('/quick-save/')) return { title: 'Quick save', eyebrow: 'Capture received', back: '/inbox' }
  if (path.startsWith('/inbox/')) return { title: 'Organize', eyebrow: 'Turn capture into learning', back: '/inbox' }
  if (path.startsWith('/videos/')) return { title: 'Video', eyebrow: 'Learning detail', back: '/library' }
  return { title: 'TT Learn', eyebrow: 'Table tennis learning' }
}

export function Layout({
  path,
  navigate,
  children,
}: {
  path: string
  navigate: (to: string) => void
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const { canInstall, isInstalled, install } = usePwa()
  const meta = pageMeta(path)

  useEffect(() => {
    setMenuOpen(false)
  }, [path])

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.body.classList.add('menu-open')
    window.addEventListener('keydown', close)
    return () => {
      document.body.classList.remove('menu-open')
      window.removeEventListener('keydown', close)
    }
  }, [menuOpen])

  const go = (href: string) => {
    navigate(href)
    setMenuOpen(false)
  }

  const navigation = (
    <>
      <div className="side-nav-label">Learning</div>
      <nav className="side-nav" aria-label="Primary navigation">
        {primaryItems.map(({ href, label, icon: Icon }) => (
          <button
            key={href}
            className={`side-nav-item ${path === href ? 'active' : ''}`}
            aria-current={path === href ? 'page' : undefined}
            onClick={() => go(href)}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="side-nav-label">App</div>
      <nav className="side-nav" aria-label="App navigation">
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
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <button className="brand-lockup" onClick={() => go('/')} aria-label="TT Learn home">
          <span className="brand-mark"><Target size={22} /></span>
          <span><strong>TT Learn</strong><small>Build your game</small></span>
        </button>
        <button className="sidebar-add" onClick={() => go('/videos/new')}>
          <Plus size={19} aria-hidden="true" /> Add video
        </button>
        {navigation}
        <div className="sidebar-note">
          <BookOpen size={18} aria-hidden="true" />
          <span>Private by default<br /><small>Your practice library stays yours.</small></span>
        </div>
      </aside>

      <div className="app-stage">
        <header className="mobile-toolbar">
          <button
            className="toolbar-icon"
            onClick={() => meta.back ? go(meta.back) : setMenuOpen(true)}
            aria-label={meta.back ? 'Go back' : 'Open menu'}
          >
            {meta.back ? <ArrowLeft size={22} /> : <Menu size={22} />}
          </button>
          <div className="toolbar-title">
            <span>{meta.eyebrow}</span>
            <strong>{meta.title}</strong>
          </div>
          <button className="toolbar-icon toolbar-add" onClick={() => go('/videos/new')} aria-label="Add video">
            <Plus size={22} />
          </button>
        </header>

        <main className="main-content" id="main-content">{children}</main>

        <nav className="bottom-nav" aria-label="Primary navigation">
          {primaryItems.map(({ href, label, icon: Icon }) => (
            <button
              key={href}
              className={`bottom-nav-item ${path === href ? 'active' : ''}`}
              aria-current={path === href ? 'page' : undefined}
              onClick={() => go(href)}
            >
              <Icon size={21} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {menuOpen && (
        <div className="drawer-layer">
          <button className="drawer-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <aside className="mobile-drawer" role="dialog" aria-modal="true" aria-label="App menu">
            <div className="drawer-head">
              <div className="brand-lockup">
                <span className="brand-mark"><Target size={22} /></span>
                <span><strong>TT Learn</strong><small>Build your game</small></span>
              </div>
              <button className="toolbar-icon" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X size={22} />
              </button>
            </div>
            <button className="sidebar-add" onClick={() => go('/videos/new')}>
              <Plus size={19} aria-hidden="true" /> Add video
            </button>
            {navigation}
            <div className="drawer-status">
              <span className={`status-dot ${isInstalled ? 'ready' : ''}`} />
              {isInstalled ? 'Installed app' : canInstall ? 'Ready to install' : 'Running in browser'}
            </div>
          </aside>
        </div>
      )}

      {feedbackOpen && <FeedbackSheet onClose={() => setFeedbackOpen(false)} />}
    </div>
  )
}
