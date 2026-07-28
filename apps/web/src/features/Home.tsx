import { ChevronRight, Dumbbell, Layers3, Target } from 'lucide-react'
import { useMemo } from 'react'
import { useInbox, useLibraryOverview, useVideos } from '../lib/api/hooks'

export function Home({ navigate }: { navigate: (to:string)=>void }) {
  const inbox = useInbox()
  const videos = useVideos()
  const overview = useLibraryOverview()

  const pinnedNodes = useMemo(() => {
    const topics = overview.data?.topics.filter((topic) => topic.isPinned).map((topic) => ({ id: topic.nodeId, title: topic.name, type: 'Topic' as const, href: `/library/topics/${topic.nodeId}`, icon: Layers3, detail: topic.description ?? 'Topic' })) ?? []
    const skills = overview.data?.skills.filter((skill) => skill.isPinned).map((skill) => ({ id: skill.nodeId, title: skill.name, type: 'Skill' as const, href: `/library/skills/${skill.nodeId}`, icon: Target, detail: skill.description ?? skill.status.replaceAll('_', ' ') })) ?? []
    const drills = overview.data?.drills.filter((drill) => drill.isPinned).map((drill) => ({ id: drill.nodeId, title: drill.title, type: 'Drill' as const, href: `/library/drills/${drill.nodeId}`, icon: Dumbbell, detail: drill.description ?? drill.status.replaceAll('_', ' ') })) ?? []
    return [...topics, ...skills, ...drills]
  }, [overview.data])

  return <section>
    <h1>Keep your table tennis learning moving</h1>
    <p className="muted">Save tutorials quickly, organize them by skill, then turn ideas into notes and drills.</p>
    <div className="card">
      <h2>Quick Add</h2>
      <p className="muted">Paste a video URL, or install the PWA and share supported links directly into your Inbox.</p>
      <div className="quick-actions"><button className="button" onClick={()=>navigate('/videos/new')}>Add Video</button><button className="button secondary" onClick={()=>navigate('/inbox')}>Open Inbox</button></div>
    </div>
    <h2 className="section-title">Continue Learning</h2>
    <div className="card"><strong>{videos.data?.[0]?.title ?? 'Start with a saved tutorial'}</strong><p className="muted">{videos.data?.length ? 'Recently saved video ready to revisit.' : 'No videos yet. Save a table tennis tutorial to begin.'}</p></div>
    <h2 className="section-title">Pinned</h2>
    <div className="card">
      {overview.isLoading ? <p className="muted">Loading pinned items…</p> : pinnedNodes.length ? <div className="detail-link-list">{pinnedNodes.map((item) => <button key={`${item.type}:${item.id}`} onClick={() => navigate(item.href)}><span className="connection-node-icon"><item.icon size={18} /></span><span><strong>{item.title}</strong><small>{item.type} · {item.detail}</small></span><ChevronRight size={18} aria-hidden="true" /></button>)}</div> : <p className="muted">Pin a topic, skill, or drill to show it here.</p>}
    </div>
    <h2 className="section-title">Inbox</h2>
    <div className="card row"><span>{inbox.data?.length ?? 0} captures waiting</span><button className="button secondary" onClick={()=>navigate('/inbox')}>Review</button></div>
  </section>
}
