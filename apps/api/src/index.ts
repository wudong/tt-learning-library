import { serve } from '@hono/node-server'
import { createApp } from './app'
const { app } = await createApp()
const host = process.env.HOST ?? '0.0.0.0'
const port = Number(process.env.PORT ?? 3003)
serve({ fetch: app.fetch, hostname: host, port })
console.log(`API listening on http://${host}:${port}`)
