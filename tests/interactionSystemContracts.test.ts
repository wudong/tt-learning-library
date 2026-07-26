import { describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

async function sourceFiles(directory: string): Promise<string[]> {
  const absolute = new URL(`../${directory}`, import.meta.url)
  const entries = await readdir(absolute, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const relative = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(relative)
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [relative] : []
  }))
  return files.flat()
}

describe('interaction design-system contracts', () => {
  test('web product code contains no browser-native alert, confirm, or global prompt calls', async () => {
    const files = await sourceFiles('apps/web/src')
    const violations: string[] = []
    for (const file of files) {
      const content = await source(file)
      if (/\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test(content)) violations.push(file)
    }
    expect(violations).toEqual([])
  })

  test('shared dialogs manage modal semantics, escape, focus, and restoration', async () => {
    const dialog = await source('apps/web/src/components/Dialog.tsx')
    expect(dialog).toContain('role="dialog"')
    expect(dialog).toContain('aria-modal="true"')
    expect(dialog).toContain("event.key === 'Escape'")
    expect(dialog).toContain("event.key !== 'Tab'")
    expect(dialog).toContain('previousFocus?.focus()')
    expect(dialog).toContain("document.body.style.overflow = 'hidden'")
  })

  test('Inbox archive is durable, hidden from active results, and undoable', async () => {
    const [list, hooks, routes, service, repository] = await Promise.all([
      source('apps/web/src/features/inbox/InboxList.tsx'),
      source('apps/web/src/lib/api/hooks.ts'),
      source('apps/api/src/routes/inbox.ts'),
      source('apps/api/src/services/inboxCaptureService.ts'),
      source('packages/db/src/repositories/inboxRepository.ts'),
    ])
    expect(list).toContain("toast.success('Capture archived'")
    expect(list).toContain("action: { label: 'Undo'")
    expect(hooks).toContain("data.status === 'archived'")
    expect(routes).toContain("z.enum(['new','saved','archived'])")
    expect(service).toContain("['new','saved','archived']")
    expect(repository).toContain("status: 'archived'")
  })

  test('Training uses progressive disclosure and safe plan editing', async () => {
    const [planner, session, css] = await Promise.all([
      source('apps/web/src/features/training/TrainingPlanner.tsx'),
      source('apps/web/src/features/training/TrainingSessionPage.tsx'),
      source('apps/web/src/mobile-review.css'),
    ])
    expect(planner).toContain("type Stage = 'entry'|'compose'|'review'")
    expect(planner).toContain("type Picker = 'topic'|'skill'|null")
    expect(planner).toContain('Only one skill editor stays open at a time.')
    expect(session).toContain('<ConfirmDialog')
    expect(session).toContain('Remove this training session?')
    expect(css).toContain('body.menu-open')
  })

  test('Topic viewing is separated from picture management', async () => {
    const [detail, manager, app, layout] = await Promise.all([
      source('apps/web/src/features/library/LibraryNodeDetail.tsx'),
      source('apps/web/src/features/library/PictureManagerPage.tsx'),
      source('apps/web/src/app/App.tsx'),
      source('apps/web/src/components/Layout.tsx'),
    ])
    expect(detail).toContain('/pictures`)')
    expect(manager).toContain('<PictureAttachments parentNodeId={nodeId} />')
    expect(app).toContain('/pictures$')
    expect(layout).toContain("backLabel: 'Back in Library'")
  })

  test('Topic selection is reusable and Topic management actions are contextual', async () => {
    const [picker, organize, planner, library] = await Promise.all([
      source('apps/web/src/components/TopicPickerDialog.tsx'),
      source('apps/web/src/features/inbox/OrganizeInbox.tsx'),
      source('apps/web/src/features/training/TrainingPlanner.tsx'),
      source('apps/web/src/features/library/Library.tsx'),
    ])

    expect(picker).toContain('Search Topics')
    expect(picker).toContain('multiple = true')
    expect(organize).toContain('<TopicPickerDialog')
    expect(planner).toContain('<TopicPickerDialog')
    expect(library).toContain('<TopicPickerDialog')
    expect(library).toContain('Choose visible Topics')
    expect(library).toContain('Show {topic.name}')
    expect(library).toContain('Hide {topic.name}')
    expect(library).not.toContain('Show or hide Topics')
    expect(library).not.toContain('<SlidersHorizontal size={16} /> Manage')
  })
})
