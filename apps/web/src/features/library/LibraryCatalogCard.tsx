import { ChevronRight, type LucideIcon } from 'lucide-react'
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
  openLabel = 'Open details',
  showOpenLabel = true,
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
  openLabel?: string
  showOpenLabel?: boolean
  secondaryActions?: ReactNode
}) {
  const visibleTags = tags.slice(0, 2)
  const remainingTags = Math.max(0, tags.length - visibleTags.length)

  return (
    <article className="library-catalog-card">
      <button className="library-catalog-open" onClick={onOpen} aria-label={`${openLabel}: ${title}`}>
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
          {showOpenLabel && <span className="library-catalog-open-label">{openLabel}</span>}
        </span>
        <span className="library-catalog-chevron" aria-hidden="true"><ChevronRight size={19} /></span>
      </button>

      {secondaryActions && <div className="library-catalog-actions" aria-label={`Manage ${title}`}>{secondaryActions}</div>}
    </article>
  )
}
