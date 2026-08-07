import { describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

async function sourceFiles(directory: string): Promise<string[]> {
  const absolute = new URL(`../${directory}/`, import.meta.url)
  const entries = await readdir(absolute, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const relative = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await sourceFiles(relative))
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(relative)
  }
  return files
}

describe('interaction design-system contracts', () => {
  test('web product code contains no browser-native alert, confirm, or global prompt calls', async () => {
    const files = await sourceFiles('apps/web/src')
    const forbidden = /(?:\b(?:window|globalThis)\.(?:alert|confirm|prompt)|(?<![\w.])(?:alert|confirm|prompt))\s*\(/
    const violations: string[] = []
    for (const path of files) {
      let content = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
      if (path === 'apps/web/src/lib/pwa/PwaProvider.tsx') {
        // Exact standards-based PWA install API type declaration. The runtime
        // call is installPrompt.prompt(), which is a property method and does
        // not match the global-dialog contract.
        content = content.replace('prompt(): Promise<void>', '')
      }
      if (forbidden.test(content)) violations.push(path)
    }
    expect(violations).toEqual([])
  })

  test('shared dialogs delegate modal semantics, focus, escape, and restoration to the TT design system', async () => {
    const dialog = await source('apps/web/src/components/Dialog.tsx')
    expect(dialog).toContain("from '@wudong/tt-players-design-system'")
    expect(dialog).toContain('BottomSheet')
    expect(dialog).toContain('AppButton')
    expect(dialog).toContain('ConfirmDialog')
    expect(dialog).not.toContain('createPortal')
    expect(dialog).not.toContain('focusableSelector')
    expect(dialog).not.toContain("event.key === 'Escape'")
  })

  test('Inbox archive is durable, hidden from active results, and undoable', async () => {
    const repository = await source('packages/db/src/repositories/inboxRepository.ts')
    const inbox = await source('apps/web/src/features/inbox/InboxList.tsx')
    const organize = await source('apps/web/src/features/inbox/OrganizeInbox.tsx')

    expect(repository).toContain("where('status','!=','archived')")
    expect(inbox).toContain("status: 'archived'")
    expect(inbox).toContain("label: 'Undo'")
    expect(organize).toContain('topicIds: selectedTopicIds')
    expect(organize).toContain('skillIds: selectedSkillIds')
    expect(organize).not.toContain('Organize Capture')
    expect(inbox).not.toContain('Messy captures land here first')
  })

  test('Training uses one player drawer, calendar/insights disclosure, and safe plan editing', async () => {
    const hub = await source('apps/web/src/features/training/TrainingHub.tsx')
    const profiles = await source('apps/web/src/features/training/TrainingProfileSwitcher.tsx')
    const planner = await source('apps/web/src/features/training/TrainingPlanner.tsx')
    const session = await source('apps/web/src/features/training/TrainingSessionPage.tsx')

    expect(hub).toContain('training-calendar-section')
    expect(hub).toContain("view === 'calendar'")
    expect(hub).toContain("view === 'insights'")
    expect(hub).toContain("label: view === 'insights' ? 'Back to calendar' : 'Show insights'")
    expect(hub).not.toContain('Compact view')
    expect(hub).toContain('selected-day-card')
    expect(profiles).toContain('Training players')
    expect(profiles).toContain("id: 'training-profile'")
    expect(planner).toContain('Start from a recent plan')
    expect(planner).toContain('selectedTopicId')
    expect(planner).toContain('<TopicPickerDialog')
    expect(planner).toContain("activeBlockKey === block.key")
    expect(planner).toContain('Recently used')
    expect(planner).not.toContain('Build the next practice')
    expect(session).toContain('Edit plan')
    expect(session).toContain('Completed and current blocks stay fixed')
    expect(session).toContain('ConfirmDialog')
  })

  test('Topic viewing is separated from picture management', async () => {
    const detail = await source('apps/web/src/features/library/LibraryNodeDetail.tsx')
    const manager = await source('apps/web/src/features/library/PictureManagerPage.tsx')
    const app = await source('apps/web/src/app/App.tsx')
    const layout = await source('apps/web/src/components/Layout.tsx')

    expect(detail).toContain('PictureGallery pictures={pictures.data}')
    expect(detail).toContain('pictures.data.length > 0')
    expect(detail).toContain("type === 'skill' && <section className=\"detail-section relationship-section\"")
    expect(detail).toContain('skill-notes-title')
    expect(detail).toContain('/library/topics/${nodeId}/pictures')
    expect(manager).toContain('<PictureAttachments parentNodeId={nodeId} />')
    expect(app).toContain('/pictures$')
    expect(layout).toContain("backLabel: 'Back in Library'")
  })

  test('Topic selection is reusable and Library visibility management remains contextual', async () => {
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
    expect(library).toContain('<Dialog')
    expect(library).toContain('Choose visible Topics')
    expect(library).toContain('Show {topic.name}')
    expect(library).toContain('Hide {topic.name}')
    expect(library).not.toContain('Show or hide Topics')
    expect(library).not.toContain('<SlidersHorizontal size={16} /> Manage')
  })

  test('Facebook capture keeps assignment parity and contains responsive media and URLs', async () => {
    const [organize, embed, css] = await Promise.all([
      source('apps/web/src/features/inbox/OrganizeInbox.tsx'),
      source('apps/web/src/components/FacebookEmbed.tsx'),
      source('apps/web/src/components/FacebookEmbed.css'),
    ])

    expect(organize).toContain("data?.sourcePlatform === 'facebook'")
    expect(organize).toContain('topicIds: selectedTopicIds')
    expect(organize).toContain('skillIds: selectedSkillIds')
    expect(organize).toContain('capture-source-url')
    expect(embed).toContain('Wide video')
    expect(embed).toContain('Tall video')
    expect(embed).toContain('allowFullScreen')
    expect(css).toContain('.facebook-video-embed.portrait')
    expect(css).toContain('.facebook-video-embed.landscape')
  })
})
