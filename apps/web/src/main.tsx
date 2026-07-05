import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { App } from './app/App'
import { PwaProvider } from './lib/pwa/PwaProvider'
import './styles.css'
const client = new QueryClient()
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <PwaProvider>
        <App />
        <Toaster position="top-center" />
      </PwaProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
