export type IdPrefix = 'user'|'node'|'edge'|'video'|'topic'|'skill'|'note'|'drill'|'drillstep'|'mistake'|'tag'|'path'|'collection'|'inbox'|'share'|'pathitem'|'collectionitem'|'migration'|'session'|'block'|'checkin'|'attachment'
export function createId(prefix: IdPrefix): string {
  const stamp = Date.now().toString(36).padStart(9, '0')
  const random = crypto.getRandomValues(new Uint8Array(12))
  const tail = Array.from(random, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${prefix}_${stamp}${tail}`
}
