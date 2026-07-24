import { ChevronRight, NotebookPen, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function LibraryCatalogCard({
  icon: Icon,
  imageSrc,
  imageAlt = '',
  title,
  context,
  metadata = [],
  tags = [],
  onOpen,
  onNote,
  secondaryActions,
}: {
  icon: LucideIcon
  imageSrc?: string | null
  imageAlt?: string
  title: string
  context?: string | null
  metadata?: string[]
  tags?: string[]
  onOpen: () => void
  onNote?: () => void
  secondaryActions?: ReactNode
}) {
  const visibleTags = tags.slice(0, 2)
  const remainingTags = Math.max(0, tags.length - visibleTags.length)

  return (
    <article className="library-catalog-card">
      <button className="library-catalog-open" onClick={onOpen} aria-label={`Open ${title}`}>
        {imageSrc
          ? <img className="library-catalog-image" src={imageSrc} alt={imageAlt} />
          : <span className="library-catalog-symbol"><Icon size={19} aria-hidden="true" /></span>}
        <span className="library-catalog-copy">
          <strong className="library-catalog-title">{title}</strong>
          {context && <span className="library-catalog-context">{context}</span>}
          {metadata.length > 0 && (
            <span className="library-catalog-meta">
              {metadata.filter(Boolean).map((item) => <small key={item}>{item}</small>)}
            </span>
          )}
          {visibleTags.length > 0 && (
            <span className="library-catalog-tags" aria-label={`${tags.length} related tags`}>
              {visibleTags.map((tag) => <small key={tag}>{tag}</small>)}
              {remainingTags > 0 && <small className="library-catalog-overflow">+{remainingTags}</small>}
            </span>
          )}
        </span>
        <ChevronRight className="library-catalog-chevron" size={19} aria-hidden="true" />
      </button>

      {(onNote || secondaryActions) && (
        <div className="library-catalog-actions" aria-label={`Actions for ${title}`}>
          {onNote && (
            <button className="catalog-icon-action" onClick={onNote} aria-label={`Add note to ${title}`}>
              <NotebookPen size={17} aria-hidden="true" />
            </button>
          )}
          {secondaryActions}
        </div>
      )}
    </article>
  )
}
