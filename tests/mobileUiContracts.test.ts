import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

describe('mobile UI contracts', () => {
  test('the shared toolbar owns contextual back navigation and page actions', async () => {
    const layout = await source('apps/web/src/components/Layout.tsx')

    expect(layout).toContain("backLabel: 'Back to Library'")
    expect(layout).toContain('toolbar-leading')
    expect(layout).toContain('toolbar-trailing')
    expect(layout).toContain('toolbar-actions')
    expect(layout).toContain('MobilePageActionsProvider')
  })

  test('library catalog sections share one compact card pattern with explicit actions', async () => {
    const library = await source('apps/web/src/features/library/Library.tsx')
    const catalog = await source('apps/web/src/features/library/LibraryCatalogCard.tsx')

    expect((library.match(/<LibraryCatalogCard/g) ?? []).length).toBeGreaterThanOrEqual(3)
    expect(catalog).toContain('const visibleTags = tags.slice(0, 2)')
    expect(catalog).toContain('library-catalog-overflow')
    expect(catalog).toContain('aria-label={`${openLabel}: ${title}`}')
    expect(catalog).toContain('library-catalog-open-label')
    expect(library).toContain('openLabel="Open topic"')
    expect(library).toContain('catalog-manage-action')
  })

  test('detail routes do not render duplicate back rows or nested relationship cards', async () => {
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

    expect(files[0]).toContain('detail-section relationship-section')
    expect(files[1]).toContain('detail-section relationship-section')
    expect(files[3]).toContain('detail-section relationship-section')
  })

  test('responsive rules explicitly cover reported narrow widths and touch targets', async () => {
    const css = await source('apps/web/src/mobile-audit.css')

    expect(css).toContain('@media (max-width: 384px)')
    expect(css).toContain('@media (max-width: 320px)')
    expect(css).toContain('width: 44px')
    expect(css).toContain('min-height: 44px')
    expect(css).toContain('env(safe-area-inset-bottom)')
    expect(css).toContain('overflow-wrap: anywhere')
  })
})
