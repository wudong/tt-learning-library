import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
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
