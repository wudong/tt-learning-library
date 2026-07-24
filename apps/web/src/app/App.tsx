import { Layout } from '../components/Layout'
import { useRoute } from './router'
import { Home } from '../features/Home'
import { AddVideo } from '../features/videos/AddVideo'
import { InboxList } from '../features/inbox/InboxList'
import { OrganizeInbox } from '../features/inbox/OrganizeInbox'
import { Library } from '../features/library/Library'
import { VideoDetail } from '../features/videos/VideoDetail'
import { SearchPage } from '../features/search/SearchPage'
import { Settings } from '../features/Settings'
import { Login } from '../features/Login'
import { PublicShare } from '../features/PublicShare'
import { useAuth } from '../lib/auth/AuthProvider'
import { TrainingHub } from '../features/training/TrainingHub'
import { TrainingPlanner } from '../features/training/TrainingPlanner'
import { TrainingSessionPage } from '../features/training/TrainingSessionPage'
import { LibraryNodeDetail } from '../features/library/LibraryNodeDetail'

function NotFound({ navigate }: { navigate: (to: string) => void }) {
  return <section className="card"><h1>Page not found</h1><p className="muted">The page you requested does not exist.</p><button className="button" onClick={() => navigate('/')}>Go home</button></section>
}

export function App() {
  const { path, navigate } = useRoute()
  const auth = useAuth()
  const base = path.split('?')[0]
  const publicShareMatch = base.match(/^\/s\/([^/]+)$/)

  if (publicShareMatch) return <PublicShare token={decodeURIComponent(publicShareMatch[1])} />
  if (auth.isLoading) return <main className="login-page"><div className="login-card">Checking your session…</div></main>
  if (auth.isConfigured && !auth.user) return <Login />

  let page: React.ReactNode
  if (base === '/') page = <Home navigate={navigate} />
  else if (base === '/videos/new') page = <AddVideo navigate={navigate} />
  else if (base === '/inbox') page = <InboxList navigate={navigate} />
  else if (base.startsWith('/quick-save/')) page = <OrganizeInbox quick id={base.split('/')[2]} navigate={navigate} />
  else if (base.startsWith('/inbox/')) page = <OrganizeInbox id={base.split('/')[2]} navigate={navigate} />
  else if (base === '/library') page = <Library navigate={navigate} />
  else if (/^\/library\/topics\/[^/]+$/.test(base)) page = <LibraryNodeDetail type="topic" nodeId={base.split('/')[3]} navigate={navigate} />
  else if (/^\/library\/skills\/[^/]+$/.test(base)) page = <LibraryNodeDetail type="skill" nodeId={base.split('/')[3]} navigate={navigate} />
  else if (base === '/training') page = <TrainingHub navigate={navigate} />
  else if (base === '/training/new') page = <TrainingPlanner navigate={navigate} />
  else if (/^\/training\/[^/]+\/run$/.test(base)) page = <TrainingSessionPage id={base.split('/')[2]} run navigate={navigate} />
  else if (/^\/training\/[^/]+$/.test(base)) page = <TrainingSessionPage id={base.split('/')[2]} run={false} navigate={navigate} />
  else if (base.startsWith('/videos/')) page = <VideoDetail id={base.split('/')[2]} />
  else if (base === '/search') page = <SearchPage navigate={navigate} />
  else if (base === '/settings') page = <Settings />
  else page = <NotFound navigate={navigate} />

  return <Layout path={base} navigate={navigate}>{page}</Layout>
}
