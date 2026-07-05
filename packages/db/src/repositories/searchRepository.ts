import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'

export class SearchRepository {
  constructor(private readonly db: Kysely<Database>) {}
  async search(userId: string, q: string, options: { type?: string; limit: number; offset: number }) {
    const pattern = `%${q}%`
    const results: Array<{ id: string; nodeId: string; type: string; title: string; summary: string | null; href: string; context: string | null }> = []
    if (!options.type || options.type === 'video') {
      const rows = await this.db.selectFrom('videos as v').innerJoin('graph_nodes as n','n.id','v.node_id').select(['v.id','v.node_id','v.title','v.source_platform','n.summary']).where('v.user_id','=',userId).where('v.deleted_at','is',null).where((eb)=>eb.or([eb('v.title','like',pattern), eb('v.source_url','like',pattern)])).limit(options.limit).execute()
      results.push(...rows.map((r)=>({ id: r.id, nodeId: r.node_id, type:'video', title: r.title ?? 'Untitled video', summary: r.summary, href: `/videos/${r.id}`, context: r.source_platform })))
    }
    if (!options.type || options.type === 'skill') {
      const rows = await this.db.selectFrom('skills as s').select(['s.id','s.node_id','s.name','s.status','s.description']).where('s.user_id','=',userId).where('s.deleted_at','is',null).where((eb)=>eb.or([eb('s.name','like',pattern), eb('s.description','like',pattern)])).limit(options.limit).execute()
      results.push(...rows.map((r)=>({ id: r.id, nodeId: r.node_id, type:'skill', title: r.name, summary: r.description, href: `/skills/${r.id}`, context: r.status })))
    }
    if (!options.type || options.type === 'topic') {
      const rows = await this.db.selectFrom('topics as t').select(['t.id','t.node_id','t.name','t.description']).where('t.user_id','=',userId).where('t.deleted_at','is',null).where((eb)=>eb.or([eb('t.name','like',pattern), eb('t.description','like',pattern)])).limit(options.limit).execute()
      results.push(...rows.map((r)=>({ id: r.id, nodeId: r.node_id, type:'topic', title: r.name, summary: r.description, href: `/topics/${r.id}`, context: null })))
    }
    if (!options.type || options.type === 'note') {
      const rows = await this.db.selectFrom('notes as n').select(['n.id','n.node_id','n.body','n.note_type']).where('n.user_id','=',userId).where('n.deleted_at','is',null).where('n.body','like',pattern).limit(options.limit).execute()
      results.push(...rows.map((r)=>({ id: r.id, nodeId: r.node_id, type:'note', title: r.body.slice(0, 80), summary: r.body, href: `/notes/${r.id}`, context: r.note_type })))
    }
    return results.slice(options.offset, options.offset + options.limit)
  }
}
