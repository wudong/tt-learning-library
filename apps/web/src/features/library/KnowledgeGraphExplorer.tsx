import { useState, type ReactNode } from 'react'
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

export function KnowledgeGraphExplorer({ nodeId, navigate }: { nodeId: string; navigate: (to: string) => void }) {
  const connections = useLibraryConnections(nodeId)
  const feedback = useSubmitFeedback()
  const [view, setView] = useState<'map'|'list'>('map')
  const data = connections.data

  async function rate(useful: boolean) {
    if (!data) return
    await feedback.submit({
      message_type: 'general',
      message: useful ? 'Knowledge graph explorer was useful.' : 'Knowledge graph explorer was not yet useful.',
      page_path: `/library/connections/${nodeId}`,
      page_title: `Connections for ${data.center.title}`,
      metadata: {
        experiment: 'knowledge-graph-explorer-v1',
        response: useful ? 'useful' : 'not_yet',
        centerNodeType: data.center.nodeType,
        totalConnections: data.totalConnections,
        shownConnections: data.shownConnections,
      },
    })
  }

  return (
    <section className="graph-explorer-page">
      {connections.isLoading && <div className="library-skeleton">Finding connections…</div>}
      {connections.isError && <div className="notice">These connections could not be loaded.</div>}

      {data && <>
        <header className="graph-explorer-hero">
          <div className="graph-explorer-copy">
            <span className="eyebrow detail-title-only">Knowledge graph</span>
            <h1 className="detail-title-only">Explore connections</h1>
            <p>See how this {nodeTypeLabel(data.center.nodeType).toLowerCase()} connects to your learning and practice.</p>
          </div>
          <div className="graph-view-switch" role="group" aria-label="Connection view">
            <button className={view === 'map' ? 'active' : ''} aria-pressed={view === 'map'} onClick={() => setView('map')}><Network size={17} /> Map</button>
            <button className={view === 'list' ? 'active' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}><ListTree size={17} /> List</button>
          </div>
        </header>

        <div className={`connection-explorer ${view}`}>
          <CenterNode node={data.center} href={data.centerHref} navigate={navigate} />

          {data.groups.length > 0 ? <div className="connection-groups" aria-label={`Connections for ${data.center.title}`}>
            {data.groups.map((group) => <ConnectionGroup key={group.key} group={group} view={view} navigate={navigate} />)}
          </div> : <div className="graph-empty card">
            <Network size={28} />
            <h2>No connections yet</h2>
            <p>This item is in your graph, but nothing else is linked to it yet.</p>
          </div>}
        </div>

        <p className="connection-count" aria-live="polite">
          Showing {data.shownConnections} of {data.totalConnections} connection{data.totalConnections === 1 ? '' : 's'}.
          {data.truncated && ` This mobile view is capped at ${data.maxNodes} items.`}
        </p>

        <aside className="graph-feedback card" aria-labelledby="graph-feedback-title">
          {feedback.submitSuccess ? <p className="graph-feedback-thanks" role="status">Thanks — this helps us decide what to improve next.</p> : <>
            <div>
              <h2 id="graph-feedback-title">Did this reveal something useful?</h2>
              <p>We are testing whether a simple connection view improves discovery before adding more graph interaction.</p>
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
    ? <button className="connection-center" onClick={() => navigate(href)} aria-label={`Open ${node.title}`}>{content}</button>
    : <div className="connection-center">{content}</div>
}

function ConnectionGroup({ group, view, navigate }: { group: LibraryConnectionGroupDto; view: 'map'|'list'; navigate: (to: string) => void }) {
  return <section className="connection-group" aria-labelledby={`connection-${group.key}`}>
    <header>
      <span className="connection-line" aria-hidden="true" />
      <div><h2 id={`connection-${group.key}`}>{group.label}</h2><span>{group.total} item{group.total === 1 ? '' : 's'}</span></div>
    </header>
    <ul className="connection-items">
      {group.items.map((item) => <li key={item.edge.id}>
        {item.href ? <button className="connection-node" onClick={() => navigate(item.href!)}>
          <span className="connection-node-icon">{nodeIcon(item.node.nodeType, view === 'map' ? 19 : 17)}</span>
          <span><small>{nodeTypeLabel(item.node.nodeType)}</small><strong>{item.node.title}</strong>{item.node.summary && <em>{item.node.summary}</em>}</span>
          <ChevronRight size={17} aria-hidden="true" />
        </button> : <div className="connection-node supporting" title="This supporting item does not have its own detail page yet">
          <span className="connection-node-icon">{nodeIcon(item.node.nodeType, view === 'map' ? 19 : 17)}</span>
          <span><small>{nodeTypeLabel(item.node.nodeType)}</small><strong>{item.node.title}</strong>{item.node.summary && <em>{item.node.summary}</em>}</span>
        </div>}
      </li>)}
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
