import { existsSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(import.meta.dir, '..', 'dist')
const manifestPath = join(dist, 'manifest.webmanifest')
const serviceWorkerPath = join(dist, 'sw.js')
const indexPath = join(dist, 'index.html')

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`PWA check failed: ${message}`)
}

check(existsSync(manifestPath), 'manifest.webmanifest was not generated')
check(existsSync(serviceWorkerPath), 'service worker was not generated')
check(existsSync(join(dist, 'offline.html')), 'offline fallback was not copied')

const manifest = await Bun.file(manifestPath).json()
const serviceWorker = await Bun.file(serviceWorkerPath).text()
const index = await Bun.file(indexPath).text()
const appBundle = (await Promise.all(
  Array.from(new Bun.Glob('assets/index-*.js').scanSync({ cwd: dist })).map((path) => Bun.file(join(dist, path)).text()),
)).join('\n')

check(manifest.id === '/', 'manifest id must be stable')
check(manifest.start_url === '/', 'manifest start_url must be same-origin root')
check(manifest.scope === '/', 'manifest scope must include every app route')
check(manifest.launch_handler?.client_mode === 'navigate-existing', 'manifest must reuse the installed app window when supported')
check(manifest.display === 'standalone', 'manifest must use standalone display mode')
check(manifest.name && manifest.short_name, 'manifest requires full and short names')
check(manifest.theme_color && manifest.background_color, 'manifest requires theme colors')

const icons = Array.isArray(manifest.icons) ? manifest.icons : []
for (const [size, purpose] of [['192x192', 'any'], ['512x512', 'any'], ['512x512', 'maskable']]) {
  const icon = icons.find((candidate: { sizes?: string; purpose?: string }) =>
    candidate.sizes === size && candidate.purpose?.includes(purpose),
  )
  check(icon, `manifest requires a ${size} ${purpose} icon`)
  check(existsSync(join(dist, icon.src.replace(/^\//, ''))), `icon file is missing: ${icon.src}`)
}

check(manifest.share_target?.action === '/share-target', 'share target action must be same-origin')
check(manifest.share_target?.method === 'POST', 'share target must use POST')
check(manifest.share_target?.params?.url === 'url', 'share target must accept a URL')

check(serviceWorker.includes('createHandlerBoundToURL("/index.html")'), 'app shell navigation fallback is missing')
check(serviceWorker.includes('pathname.startsWith("/api/")'), 'private API NetworkOnly route is missing')
check(serviceWorker.includes('"/share-target"===e.pathname'), 'share-target route is missing')
check(serviceWorker.includes('NetworkOnly,"POST"'), 'share-target POST must be NetworkOnly')

check(index.includes('apple-mobile-web-app-capable'), 'iOS standalone metadata is missing')
check(index.includes('apple-touch-icon'), 'Apple touch icon is missing')
check(index.includes('viewport-fit=cover'), 'safe-area viewport support is missing')
check(appBundle.includes('New version ready'), 'global update prompt is missing from the production bundle')
check(appBundle.includes('Update TT Learn to get the latest improvements.'), 'update prompt copy is missing from the production bundle')
check(appBundle.includes('Open installed app'), 'Android auth-to-PWA handoff is missing from the production bundle')
check(appBundle.includes('Copy sign-in link'), 'iOS auth-to-PWA handoff is missing from the production bundle')
check(appBundle.includes('visibilitychange'), 'foreground update checks are missing from the production bundle')

console.log('PWA checks passed: manifest, icons, install metadata, service worker, caching, share target, update prompt')
