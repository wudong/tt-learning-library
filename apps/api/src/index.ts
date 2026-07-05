import { serve } from '@hono/node-server'
import { createApp } from './app'
const { app } = await createApp()
const port = Number(process.env.PORT ?? 3003)
serve({ fetch: app.fetch, port })
console.log(`API listening on http://localhost:${port}`)
