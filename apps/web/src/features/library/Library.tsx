import { useMemo, useState } from 'react'
import { Dumbbell, Eye, EyeOff, Layers3, Search, SlidersHorizontal, Target } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog } from '../../components/Dialog'
import { useMobilePageActions, type MobilePageAction } from '../../components/MobilePageActions'
import { useLibraryOverview, useSetTopicVisibility } from '../../lib/api/hooks'
import { LibraryCatalogCard } from './LibraryCatalogCard'

type TopicFilter = 'all' | 'saved'

type SavedNodeItem = {
  id: string
  nodeId: string
  title: string
  kind: 'topic' | 'skill' | 'drill'
  href: string
  icon: typeof Layers3
  context: string
  imageSrc?: string | null
  imageAlt?: string
}

export function Library({ navigate }: { navigate: (to: string) => void }) {
  const overview = useLibraryOverview()
  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<TopicFilter>('all')
  const [managingTopics, setManagingTopics] = useState(false)

  const mobileActions = useMemo<MobilePageAction[]>(() => ([
    {
      id: 'manage-topics',
      label: 'Choose visible Topics',
      icon: <SlidersHorizontal size={20} aria-hidden="true" />,
      onPress: () => setManagingTopics(true),
    },
  ]), [])
  useMobilePageActions(mobileActions)

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleTopics = overview.data?.topics.filter((topic) => !topic.isHidden) ?? []
  const allSavedItems = useMemo<SavedNodeItem[]>(() => {
    if (!overview.data) return []
    const topicItems = overview.data.topics.filter((topic) => topic.isPinned).map((topic) => ({
      id: topic.id,
      nodeId: topic.nodeId,
      title: topic.name,
      kind: 'topic' as const,
      href: `/library/topics/${topic.nodeId}`,
      icon: Layers3,
      context: topic.description || 'Saved topic',
    }))
    const skillItems = overview.data.skills.filter((skill) => skill.isPinned).map((skill) => ({
      id: skill.id,
      nodeId: skill.nodeId,
      title: skill.name,
      kind: 'skill' as const,
      href: `/library/skills/${skill.nodeId}`,
      icon: Target,
      context: skill.description || skill.status.replaceAll('_', ' '),
    }))
    const drillItems = overview.data.drills.filter((drill) => drill.isPinned).map((drill) => ({
      id: drill.id,
      nodeId: drill.nodeId,
      title: drill.title,
      kind: 'drill' as const,
      href: `/library/drills/${drill.nodeId}`,
      icon: Dumbbell,
      context: drill.description || drill.status.replaceAll('_', ' '),
      imageSrc: drill.diagramUrl,
      imageAlt: drill.diagramUrl ? `${drill.title} diagram` : '',
    }))
    return [...topicItems, ...skillItems, ...drillItems]
  }, [overview.data])
  const savedItems = allSavedItems.filter((item) => !normalizedQuery || item.title.toLocaleLowerCase().includes(normalizedQuery))
  const topics = visibleTopics
    .filter((topic) => !normalizedQuery || topic.name.toLocaleLowerCase().includes(normalizedQuery))
  const showingSaved = topicFilter === 'saved'

  return <section className="library-page">
    <header className="library-intro library-desktop-intro">
      <div>
        <h1>Your learning library</h1>
        <p className="muted">Save topics, skills, and drills, then open each one from its direct connections.</p>
      </div>
      <div className="row"><button className="button secondary" onClick={() => setManagingTopics(true)}><SlidersHorizontal size={18} /> Choose visible Topics</button></div>
    </header>

    <div className="library-view-switch" role="group" aria-label="Library list filter">
      <button className={topicFilter === 'all' ? 'active' : ''} aria-pressed={topicFilter === 'all'} onClick={() => setTopicFilter('all')}>Topics <small>{visibleTopics.length}</small></button>
      <button className={topicFilter === 'saved' ? 'active' : ''} aria-pressed={topicFilter === 'saved'} onClick={() => setTopicFilter('saved')}>Saved <small>{allSavedItems.length}</small></button>
    </div>

    <label className="library-search">
      <span className="sr-only">Search library</span>
      <Search size={18} aria-hidden="true" />
      <input id="library-search-input" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={showingSaved ? 'Search saved items' : 'Search topics'} />
      {query && <button onClick={() => setQuery('')} aria-label="Clear search"><span aria-hidden="true">×</span></button>}
    </label>

    {overview.isLoading && <div className="library-skeleton" role="status">Loading your learning library…</div>}
    {overview.isError && <div className="notice">We could not load your library. Check your connection and try again.</div>}

    {overview.data && showingSaved
      ? <SavedSection items={savedItems} navigate={navigate} />
      : overview.data && <TopicSection topics={topics} counts={overview.data.topicVideoCounts} onOpen={(topic) => navigate(`/library/topics/${topic.nodeId}`)} />}

    {managingTopics && overview.data && <ManageTopics topics={overview.data.topics} onClose={() => setManagingTopics(false)} />}
  </section>
}

function ManageTopics({ topics, onClose }: { topics: Array<{ id: string; name: string; isHidden: boolean }>; onClose: () => void }) {
  const update = useSetTopicVisibility()
  async function toggle(topic: typeof topics[number]) {
    try {
      await update.mutateAsync({ id: topic.id, hidden: !topic.isHidden })
      toast.success(topic.isHidden ? `${topic.name} added to Library` : `${topic.name} hidden`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update Topic')
    }
  }

  return <Dialog
    title="Choose visible Topics"
    eyebrow="Library preferences"
    variant="sheet"
    onClose={onClose}
    footer={<><span className="muted">{topics.filter((topic) => !topic.isHidden).length} of {topics.length} Topics shown</span><button className="button" onClick={onClose}>Done</button></>}
  >
    <p className="muted">Hidden Topics and all attached learning material remain safely stored.</p>
    <div className="topic-manager">{topics.map((topic) => <div className="topic-toggle" key={topic.id}><span>{topic.name}<small>{topic.isHidden ? 'Hidden from Library' : 'Shown in Library'}</small></span><button className="button secondary topic-visibility-action" disabled={update.isPending} onClick={() => void toggle(topic)}>{topic.isHidden ? <><Eye size={16} /> Show {topic.name}</> : <><EyeOff size={16} /> Hide {topic.name}</>}</button></div>)}</div>
  </Dialog>
}

function TopicSection({ topics, counts, onOpen }: { topics: Array<{ id: string; nodeId: string; name: string; description: string | null; isPinned: boolean }>; counts: Record<string, number>; onOpen: (topic: { nodeId: string; name: string }) => void }) {
  if (!topics.length) return <div className="empty">No topics match this search.</div>
  return <div className="library-catalog-list">{topics.map((topic) => (
    <LibraryCatalogCard
      key={topic.id}
      icon={Layers3}
      title={topic.name}
      context={topic.description || 'Topic in your learning library'}
      metadata={[`${counts[topic.id] ?? 0} videos`]}
      tags={topic.isPinned ? ['Saved'] : []}
      openLabel="Open topic"
      showOpenLabel={false}
      onOpen={() => onOpen(topic)}
    />
  ))}</div>
}

function SavedSection({ items, navigate }: { items: SavedNodeItem[]; navigate: (to: string) => void }) {
  if (!items.length) return <div className="empty">No saved items yet.</div>
  return <div className="library-catalog-list">{items.map((item) => (
    <LibraryCatalogCard
      key={`${item.kind}:${item.id}`}
      icon={item.icon}
      imageSrc={item.imageSrc}
      imageAlt={item.imageAlt}
      title={item.title}
      context={item.context}
      tags={[item.kind.charAt(0).toUpperCase() + item.kind.slice(1), 'Saved']}
      openLabel={`Open ${item.kind}`}
      showOpenLabel={false}
      onOpen={() => navigate(item.href)}
    />
  ))}</div>
}
