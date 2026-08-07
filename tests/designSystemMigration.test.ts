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
    else files.push(relative)
  }
  return files
}

describe('shared TT design-system migration', () => {
  test('web app consumes the published package and stylesheet', async () => {
    const [pkg, main, vite, npmrc] = await Promise.all([
      source('apps/web/package.json'),
      source('apps/web/src/main.tsx'),
      source('apps/web/vite.config.ts'),
      source('.npmrc'),
    ])

    expect(pkg).toContain('"@wudong/tt-players-design-system": "0.1.1"')
    expect(pkg).toContain('"@tailwindcss/vite"')
    expect(main).toContain("import '@wudong/tt-players-design-system/styles.css'")
    expect(main).toContain("import './tt-design-system.css'")
    expect(vite).toContain("from '@tailwindcss/vite'")
    expect(vite).toContain('tailwindcss()')
    expect(npmrc).toContain('@wudong:registry=https://npm.pkg.github.com')
    expect(npmrc).toContain('_authToken=${NODE_AUTH_TOKEN}')
  })

  test('local compatibility CSS aliases shared tokens instead of defining a second brand palette', async () => {
    const bridge = await source('apps/web/src/tt-design-system.css')
    expect(bridge).toContain('--accent-strong: var(--accent)')
    expect(bridge).toContain('--surface: var(--surface-strong)')
    expect(bridge).toContain('--line: var(--border-hairline)')
    expect(bridge).toContain('--shadow: var(--tt-shadow-raised)')
    expect(bridge).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(bridge).not.toMatch(/oklch\(/i)
  })

  test('shared overlays replace the local portal/focus implementation', async () => {
    const dialog = await source('apps/web/src/components/Dialog.tsx')
    expect(dialog).toContain("from '@wudong/tt-players-design-system'")
    expect(dialog).toContain('BottomSheet')
    expect(dialog).toContain('AppButton')
    expect(dialog).not.toContain('createPortal')
    expect(dialog).not.toContain('focusableSelector')
    expect(dialog).not.toContain("event.key === 'Escape'")
  })

  test('web source does not introduce a local generic shadcn component directory', async () => {
    const files = await sourceFiles('apps/web/src')
    const localUi = files.filter((path) => path.includes('/components/ui/'))
    expect(localUi).toEqual([])
  })
})
