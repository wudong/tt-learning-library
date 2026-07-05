import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { SearchQuerySchema } from '@ttll/shared'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { SearchRepository } from '@ttll/db'
import { getPrincipal } from '../auth/principal'
export function searchRoutes(db: Kysely<Database>) { const app = new Hono(); app.get('/', zValidator('query', SearchQuerySchema), async (c) => { const q = c.req.valid('query'); const data = await new SearchRepository(db).search(getPrincipal(c).userId, q.q, q); return c.json({ data, page: { limit: q.limit, offset: q.offset, total: data.length } }) }); return app }
