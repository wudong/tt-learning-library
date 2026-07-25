import { describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('../', import.meta.url)
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
  test('web product code contains no browser-native alert, confirm, or prompt calls', async () => {
    const files = await sourceFiles('apps/web/src')
    const forbidden = /\b(?:window\.|globalThis\.)?(?:alert|confirm|prompt)\s*\(/
    const violations: string[] = []
    for (const path of files) {
      const content = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
      if (forbidden.test(content)) violations.push(path)
    }
    expect(violations).toEqual([])
  })

  test('shared dialogs manage modal semantics, escape, focus, and restoration', async () => {
    const dialog = await source('apps/web/src/components/Dialog.tsx')
    expect(dialog).toContain('createPortal')
    expect(dialog).toContain('aria-modal="true"')
    expect(dialog).toContain("event.key === 'Escape'")
    expect(dialog).toContain('focusableSelector')
    expect(dialog).toContain('previousFocus?.focus()')
    expect(dialog).toContain('ConfirmDialog')
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

  test('Training uses progressive disclosure and safe plan editing', async () => {
    const hub = await source('apps/web/src/features/training/TrainingHub.tsx')
    const planner = await source('apps/web/src/features/training/TrainingPlanner.tsx')
    const session = await source('apps/web/src/features/training/TrainingSessionPage.tsx')

    expect(hub.indexOf('training-tabs')).toBeLessThan(hub.indexOf('calendar-toolbar'))
    expect(hub).toContain('selected-day-card')
    expect(hub).not.toContain('Practice with intent')
    expect(planner).toContain('Start from a recent plan')
    expect(planner).toContain('selectedTopicId')
    expect(planner).toContain("activeBlockKey === block.key")
    expect(planner).toContain('Recently used')
    expect(planner).not.toContain('Build the next practice')
    expect(session).toContain('Edit plan')
    expect(session).toContain('Completed and current blocks stay fixed')
    expect(session).toContain('ConfirmDialog')
  })
})
