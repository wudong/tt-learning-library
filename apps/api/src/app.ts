import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { timeout } from 'hono/timeout'
import { createDb, migrateToLatest, migrationStatus } from '@ttll/db'
import { errorMiddleware } from './middleware/errors'
import { requestIdMiddleware } from './middleware/requestId'
import { principalMiddleware } from './auth/principal'
import { inboxRoutes } from './routes/inbox'
import { videoRoutes } from './routes/videos'
import { libraryRoutes } from './routes/library'
import { searchRoutes } from './routes/search'
import { publicShareRoutes, shareRoutes } from './routes/share'
import { shareTargetRoutes } from './routes/shareTarget'
import { feedbackRoutes } from './routes/feedback'
import { authRoutes, publicAuthRoutes } from './routes/auth'
import { trainingRoutes } from './routes/training'
import { attachmentRoutes } from './routes/attachments'

export async function createApp() {
  const { db } = await createDb()
  if (process.env.AUTO_MIGRATE !== 'false') await migrateToLatest(db)
  const app = new Hono()
  app.use('*', errorMiddleware)
  app.use('*', requestIdMiddleware)
  app.use('*', secureHeaders())
  app.use('*', timeout(10000))
  app.use('/api/*', cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5174', credentials: true }))
  app.get('/api/health', (c) => c.json({ data: { ok: true, service: 'tt-learning-library-api' } }))
  app.get('/api/ready', async (c) => {
    try {
      const migrations = await migrationStatus(db)
      const pendingMigrations = migrations.filter((migration) => !migration.applied).map((migration) => migration.id)
      const ready = pendingMigrations.length === 0
      return c.json({ data: { ready, database: true, pendingMigrations } }, ready ? 200 : 503)
    } catch {
      return c.json({ data: { ready: false, database: false, pendingMigrations: [] } }, 503)
    }
  })
  app.route('/api/public/share', publicShareRoutes(db))
  app.route('/api/auth', publicAuthRoutes())
  app.use('/api/*', principalMiddleware(db))
  app.route('/api/auth', authRoutes(db))
  app.route('/api/inbox', inboxRoutes(db))
  app.route('/api/videos', videoRoutes(db))
  app.route('/api/library', libraryRoutes(db))
  app.route('/api/search', searchRoutes(db))
  app.route('/api/share-links', shareRoutes(db))
  app.route('/api/training', trainingRoutes(db))
  app.route('/api/pictures', attachmentRoutes(db))
  app.route('/share-target', shareTargetRoutes(db))
  app.route('/api/feedback', feedbackRoutes())
  return { app, db }
}
