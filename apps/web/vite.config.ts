import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execFileSync } from 'node:child_process'

function resolveCommit(): string {
  const environmentCommit = process.env.RENDER_GIT_COMMIT
    ?? process.env.COMMIT_SHA
    ?? process.env.VERCEL_GIT_COMMIT_SHA
    ?? process.env.CF_PAGES_COMMIT_SHA
  if (environmentCommit) return environmentCommit
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  define: {
    __BUILD_COMMIT__: JSON.stringify(resolveCommit()),
    __BUILD_TIMESTAMP__: JSON.stringify(process.env.BUILD_TIMESTAMP ?? new Date().toISOString()),
  },
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    manifest: {
      id: '/',
      name: 'Table Tennis Learning Library',
      short_name: 'TT Learn',
      description: 'Turn table tennis tutorials into a practical learning and practice library.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      background_color: '#f7f8f3',
      theme_color: '#f7f8f3',
      categories: ['education', 'sports', 'productivity'],
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      share_target: { action: '/share-target', method: 'POST', enctype: 'application/x-www-form-urlencoded', params: { title: 'title', text: 'text', url: 'url' } }
    },
    workbox: { navigateFallback: '/index.html', runtimeCaching: [
      { urlPattern: ({url}) => url.pathname.startsWith('/api/'), handler: 'NetworkOnly' },
      { urlPattern: ({url}) => url.pathname === '/share-target', handler: 'NetworkOnly', method: 'POST' },
      { urlPattern: ({request}) => request.mode === 'navigate', handler: 'NetworkFirst', options: { cacheName: 'navigation' } }
    ] }
  })],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3003',
      '/share-target': 'http://localhost:3003',
    },
  },
})
