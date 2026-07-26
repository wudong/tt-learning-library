import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

describe('mobile UI contracts', () => {
  test('the shared toolbar owns contextual navigation and labelled page actions', async () => {
    const [layout, actions] = await Promise.all([
      source('apps/web/src/components/Layout.tsx'),
      source('apps/web/src/components/MobilePageActions.tsx'),
    ])

    expect(layout).toContain("backLabel: 'Back in Library'")
    expect(layout).toContain("backScope: '/library'")
    expect(layout).toContain('navigateBack(meta.back!, meta.backScope)')
    expect(layout).toContain('toolbar-leading')
    expect(layout).toContain('toolbar-trailing')
    expect(layout).toContain('toolbar-actions')
    expect(layout).toContain('toolbar-page-action-text')
    expect(layout).toContain('MobilePageActionsProvider')
    expect(actions).toContain('text?: string')
  })

  test('Library has one visible-topic control, an always-visible search field, and clean topic rows', async () => {
    const library = await source('apps/web/src/features/library/Library.tsx')
    const catalog = await source('apps/web/src/features/library/LibraryCatalogCard.tsx')

    expect((library.match(/<LibraryCatalogCard/g) ?? []).length).toBeGreaterThanOrEqual(3)
    expect(catalog).toContain('const visibleTags = tags.slice(0, 2)')
    expect(catalog).toContain('library-catalog-overflow')
    expect(catalog).toContain('aria-label={`${openLabel}: ${title}`)')
    expect(catalog).toContain('library-catalog-chevron')
    expect(library).toContain('showOpenLabel={false}')
    expect(library).not.toContain('Show or hide Topics')
    expect(library).not.toContain('Open a learning area or choose which Topics appear in your Library.')
    expect(library).not.toContain("id: 'library-search'")
    expect(library).toContain('className="library-search"')
  })

  test('detail routes do not render duplicate actions or nested back rows', async () => {
    const paths = [
      'apps/web/src/features/library/LibraryNodeDetail.tsx',
      'apps/web/src/features/library/DrillDetail.tsx',
      'apps/web/src/features/library/KnowledgeGraphExplorer.tsx',
      'apps/web/src/features/videos/VideoDetail.tsx',
    ]
    const files = await Promise.all(paths.map(source))

    for (const file of files) {
      expect(file).not.toContain('className="back-link"')
      expect(file).not.toContain('Open Skill')
    }

    expect((files[0].match(/Manage pictures/g) ?? []).length).toBe(1)
    expect((files[0].match(/Add note/g) ?? []).length).toBe(1)
    expect(files[0]).toContain('detail-section relationship-section')
    expect(files[1]).toContain('detail-section relationship-section')
    expect(files[3]).toContain('detail-section relationship-section')
    for (const file of files) expect(file).toContain('detail-title-only')
  })

  test('Training uses one player drawer and a full showable calendar without compact mode', async () => {
    const [hub, profiles] = await Promise.all([
      source('apps/web/src/features/training/TrainingHub.tsx'),
      source('apps/web/src/features/training/TrainingProfileSwitcher.tsx'),
    ])

    expect(hub).toContain('Hide calendar')
    expect(hub).toContain('Show calendar')
    expect(hub).toContain('ttll.trainingCalendarVisible')
    expect(hub).not.toContain('Compact view')
    expect(hub).not.toContain('training-calendar compact')
    expect(hub).not.toContain('role="tablist"')
    expect(profiles).toContain('Switch or manage players')
    expect(profiles).toContain('Training players')
    expect(profiles).toContain("id: 'training-profile'")
    expect(profiles).not.toContain('<select')
  })

  test('knowledge graph supports filters, nearby paths, and progressive exploration', async () => {
    const [explorer, service] = await Promise.all([
      source('apps/web/src/features/library/KnowledgeGraphExplorer.tsx'),
      source('apps/api/src/services/libraryAggregateService.ts'),
    ])
    expect(explorer).toContain('graph-type-filters')
    expect(explorer).toContain('/library/connections/${item.node.id}')
    expect(explorer).toContain('direct and nearby links')
    expect(service).toContain('SECOND_HOP_ROOT_LIMIT')
    expect(service).toContain('Through ${discovery.via.title}')
    expect(service).toContain('CONNECTION_LIMIT = 36')
  })

  test('installed app stays portrait while explicit fullscreen video remains available', async () => {
    const [pwa, youtube, facebook] = await Promise.all([
      source('apps/web/vite.config.ts'),
      source('apps/web/src/components/YouTubeEmbed.tsx'),
      source('apps/web/src/components/FacebookEmbed.tsx'),
    ])
    expect(pwa).toContain("orientation: 'portrait-primary'")
    expect(youtube).toContain('allowFullScreen')
    expect(facebook).toContain('allowFullScreen')
    expect(youtube).toContain('fullscreen; gyroscope')
    expect(facebook).toContain('fullscreen; picture-in-picture')
  })

  test('responsive rules explicitly repair narrow detail layouts and touch targets', async () => {
    const [auditCss, finalCss, main] = await Promise.all([
      source('apps/web/src/mobile-audit.css'),
      source('apps/web/src/feedback-round.css'),
      source('apps/web/src/main.tsx'),
    ])

    expect(auditCss).toContain('@media (max-width: 384px)')
    expect(auditCss).toContain('@media (max-width: 320px)')
    expect(auditCss).toContain('width: 44px')
    expect(auditCss).toContain('min-height: 44px')
    expect(auditCss).toContain('env(safe-area-inset-bottom)')
    expect(finalCss).toContain('.library-detail-hero,')
    expect(finalCss).toContain('.picture-management-heading')
    expect(finalCss).toContain('display: block !important')
    expect(finalCss).toContain('grid-column: 1 / -1 !important')
    expect(main.trimEnd()).toContain("import './feedback-round.css'")
  })
})
