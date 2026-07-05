import { expect, test } from 'bun:test'
import { createMigratedTestDb } from '../../packages/db/src'
import { InboxCaptureService } from '../../apps/api/src/services/inboxCaptureService'
import { VideoAggregateService } from '../../apps/api/src/services/videoAggregateService'

test('manual capture converts to graph-backed video idempotently', async () => {
  const { db } = await createMigratedTestDb()
  await db.insertInto('users').values({ id: 'user_test', email: null, display_name: 'Test', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null }).execute()
  const inbox = await new InboxCaptureService(db).capture('user_test', { sourceUrl: 'https://youtu.be/abc123', sharedTitle: 'Serve tutorial' })
  const first = await new VideoAggregateService(db).convertInboxItemToVideo('user_test', inbox.id, { title: 'Serve tutorial', topicIds: [], skillIds: [], tagIds: [], progress: 'saved', learningState: 'revisit' })
  const second = await new VideoAggregateService(db).convertInboxItemToVideo('user_test', inbox.id, { topicIds: [], skillIds: [], tagIds: [], progress: 'saved', learningState: 'none' })
  expect(first.video.node_id).toBe(second.video.node_id)
  expect(second.alreadyConverted).toBe(true)
  await db.destroy()
})
