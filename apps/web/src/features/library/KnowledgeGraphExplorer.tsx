import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { GraphNodeDto, LibraryConnectionGroupDto, NodeType } from '@ttll/shared'
import {
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Dumbbell,
  Image as ImageIcon,
  Layers3,
  ListTree,
  Network,
  StickyNote,
  Target,
  Video,
} from 'lucide-react'
import { useLibraryConnections } from '../../lib/api/hooks'
import { useSubmitFeedback } from '../../lib/api/feedback'
import './KnowledgeGraphExplorer.css'

const EXPLORABLE_TYPES = new Set<NodeType>(['topic', 'skill', 'video', 'drill'])

export function KnowledgeGraphExplorer({ nodeId, navigate }: { nodeId: string; navigate: (to: string) => void }) {
  const connections = useLibraryConnections(nodeId)
  const feedback = useSubmitFeedback()
  const [view, setView] = useState<'map'|'list'>('map')
  const [visibleTypes, setVisibleTypes] = useState<NodeType[]>([])
  const data = connections.data

  useEffect(() => setVisibleTypes([]), [nodeId])

  const availableTypes = useMemo(() => {
    if (!data) return []
    const types = new Set<NodeType>()
    for (const group of data.groups) for (const item of group.items) types.add(item.node.nodeType)
    return [...types].sort((left, right) => nodeTypeLabel(left).localeCompare(nodeTypeLabel(right)))
  }, [data])

  const groups = useMemo(() => {
    if (!data || visibleTypes.length === 0) return data?.groups ?? []
    const selected = new Set(visibleTypes)
    return data.groups
      .map((group) => ({ ...group, items: group.items.filter((item) => selected.has(item.node.nodeType)) }))
      .filter((group) => group.items.length > 0)
  }, [data, visibleTypes])

  const filteredCount = groups.reduce((total, group) => total + group.items.length, 0)

  function toggleType(nodeType: NodeType) {
    setVisibleTypes((current) => current.includes(nodeType)
      ? current.filter((value) => value !== nodeType)
      : [...current, nodeType])
  }

  async function rate(useful: boolean) {
    if (!data) return
    await feedback.submit({
      message_type: 'general',
      message: useful ? 'Knowledge graph explorer was useful.' : 'Knowledge graph explorer was not yet useful.',
      page_path: `/library/connections/${nodeId}`,
      page_title: `Connections for ${data.center.title}`,
      metadata: {
        experiment: 'knowledge-graph-explorer-v2',
        response: useful ? 'useful' : 'not_yet',
        centerNodeType: data.center.nodeType,
        totalConnections: data.totalConnections,
        shownConnections: data.shownConnections,
      },
    })
  }

  return (
    <section className="graph-explorer-page">
      {connections.isLoading && <div className="library-skeleton">Finding direct and nearby connections…</div>}
      {connections.isError && <div className="notice">These connections could not be loaded.</div>}

      {data && <>
        <header className="graph-explorer-hero">
          <div className="graph-explorer-copy">
            <span className="eyebrow detail-title-only">Knowledge graph</span>
            <h1 className="detail-title-only">Explore connections</h1>
            <p>Follow direct and nearby links across Topics, Skills, Drills, videos, notes, and training. Tap a connected learning item to explore from there.</p>
          </div>
          <div className="graph-view-switch" role="group" aria-label="Connection view">
            <button className={view === 'map' ? 'active' : ''} aria-pressed={view === 'map'} onClick={() => setView('map')}><Network size={17} /> Map</button>
            <button className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}><ListTree size={17} /> List</button>
          </div>
        </header>

        {availableTypes.length > 1 && <div className="graph-type-filters" aria-label="Filter connections by item type">
          <button className={visibleTypes.length === 0 ? 'active' : ''} aria-pressed={visibleTypes.length === 0} onClick={() => setVisibleTypes([])}>All</button>
          {availableTypes.map((nodeType) => <button
            key={nodeType}
            className={visibleTypes.includes(nodeType) ? 'active' : ''}
            aria-pressed={visibleTypes.includes(nodeType)}
            onClick={() => toggleType(nodeType)}
          >{nodeIcon(nodeType, 15)} {nodeTypeLabel(nodeType)}</button>)}
        </div>}

        <div className={`connection-explorer ${view}`}>
          <CenterNode node={data.center} href={data.centerHref} navigate={navigate} />

          {groups.length > 0 ? <div className="connection-groups" aria-label={`Connections for ${data.center.title}`}>
            {groups.map((group) => <ConnectionGroup key={group.key} group={group} view={view} navigate={navigate} />)}
          </div> : <div className="graph-empty card">
            <Network size={28} />
            <h2>No matching connections</h2>
            <p>Choose another item type or show all connections.</p>
          </div>}
        </div>

        <p className="connection-count" aria-live="polite">
          {visibleTypes.length ? `Showing ${filteredCount} filtered connection${filteredCount === 1 ? '' : 's'}. ` : `Showing ${data.shownConnections} of ${data.totalConnections} connections. `}
          {data.truncated && `This view is capped at ${data.maxNodes} paths to keep it readable.`}
        </p>

        <aside className="graph-feedback card" aria-labelledby="graph-feedback-title">
          {feedback.submitSuccess ? <p className="graph-feedback-thanks" role="status">Thanks — this helps us improve discovery.</p> : <>
            <div>
              <h2 id="graph-feedback-title">Did this reveal something useful?</h2>
              <p>The graph now combines curated ontology links with your videos, notes, drills, and training history.</p>
            </div>
            <div className="graph-feedback-actions">
              <button className="button secondary" disabled={feedback.isSubmitting} onClick={() => rate(true)}>Yes</button>
              <button className="button secondary" disabled={feedback.isSubmitting} onClick={() => rate(false)}>Not yet</button>
            </div>
            {feedback.submitError && <p className="form-error" role="alert">{feedback.submitError}</p>}
          </>}
        </aside>
      </>}
    </section>
  )
}

function CenterNode({ node, href, navigate }: { node: GraphNodeDto; href: string | null; navigate: (to: string) => void }) {
  const content = <>
    <span className="connection-node-icon">{nodeIcon(node.nodeType, 22)}</span>
    <span><small>{nodeTypeLabel(node.nodeType)}</small><strong>{node.title}</strong>{node.summary && <em>{node.summary}</em>}</span>
    {href && <ChevronRight size={18} aria-hidden="true" />}
  </>
  return href
    ? <button className="connection-center" onClick={() => navigate(href)} aria-label={`Open details for ${node.title}`}>{content}</button>
    : <div className="connection-center">{content}</div>
}

function ConnectionGroup({ group, view, navigate }: { group: LibraryConnectionGroupDto; view: 'map'|'list'; navigate: (to: string) => void }) {
  return <section className="connection-group" aria-labelledby={`connection-${group.key.replaceAll(':', '-')}`}>
    <header>
      <span className="connection-line" aria-hidden="true" />
      <div><h2 id={`connection-${group.key.replaceAll(':', '-')}`}>{group.label}</h2><span>{group.items.length}{group.total > group.items.length ? ` of ${group.total}` : ''}</span></div>
    </header>
    <ul className="connection-items">
      {group.items.map((item) => {
        const exploreHref = EXPLORABLE_TYPES.has(item.node.nodeType) ? `/library/connections/${item.node.id}` : item.href
        return <li key={`${item.edge.id}:${item.node.id}`}>
          {exploreHref ? <button className="connection-node" onClick={() => navigate(exploreHref)} aria-label={`${EXPLORABLE_TYPES.has(item.node.nodeType) ? 'Explore from' : 'Open'} ${item.node.title}`}>
            <span className="connection-node-icon">{nodeIcon(item.node.nodeType, view === 'map' ? 19 : 17)}</span>
            <span><small>{nodeTypeLabel(item.node.nodeType)}</small><strong>{item.node.title}</strong>{item.node.summary && <em>{item.node.summary}</em>}</span>
            <ChevronRight size={17} aria-hidden="true" />
          </button> : <div className="connection-node supporting" title="This supporting item does not have its own detail page yet">
            <span className="connection-node-icon">{nodeIcon(item.node.nodeType, view === 'map' ? 19 : 17)}</span>
            <span><small>{nodeTypeLabel(item.node.nodeType)}</small><strong>{item.node.title}</strong>{item.node.summary && <em>{item.node.summary}</em>}</span>
          </div>}
        </li>
      })}
    </ul>
  </section>
}

function nodeTypeLabel(nodeType: NodeType) {
  if (nodeType === 'practice_session') return 'Practice session'
  if (nodeType === 'learning_path') return 'Learning path'
  return nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replaceAll('_', ' ')
}

function nodeIcon(nodeType: NodeType, size: number): ReactNode {
  if (nodeType === 'topic') return <Layers3 size={size} aria-hidden="true" />
  if (nodeType === 'skill') return <Target size={size} aria-hidden="true" />
  if (nodeType === 'video') return <Video size={size} aria-hidden="true" />
  if (nodeType === 'drill') return <Dumbbell size={size} aria-hidden="true" />
  if (nodeType === 'note') return <StickyNote size={size} aria-hidden="true" />
  if (nodeType === 'picture') return <ImageIcon size={size} aria-hidden="true" />
  if (nodeType === 'practice_session') return <CalendarDays size={size} aria-hidden="true" />
  return <CircleHelp size={size} aria-hidden="true" />
}
