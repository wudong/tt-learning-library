import { ImagePlus } from 'lucide-react'
import { PictureAttachments } from '../../components/PictureAttachments'
import { useLibraryNodeResources } from '../../lib/api/hooks'

export function PictureManagerPage({ nodeId }: { nodeId: string }) {
  const topic = useLibraryNodeResources(nodeId)

  return <section className="picture-management-page">
    {topic.isLoading && <div className="library-skeleton">Loading picture management…</div>}
    {topic.isError && <div className="notice">This Topic could not be loaded.</div>}
    {topic.data && <>
      <header className="picture-management-heading">
        <span className="picture-management-icon"><ImagePlus size={22} aria-hidden="true" /></span>
        <div><span className="eyebrow">Topic pictures</span><h1>{topic.data.node.title}</h1><p>Add, paste, review, or remove pictures without turning the normal Topic view into an editing screen.</p></div>
      </header>
      <article className="card picture-management-surface">
        <PictureAttachments parentNodeId={nodeId} />
      </article>
    </>}
  </section>
}
