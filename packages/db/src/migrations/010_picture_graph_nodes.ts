import { sql, type Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260724_010'
export const name = 'promote_pictures_to_graph_nodes'

export async function up(db: Kysely<Database>) {
  await sql`ALTER TABLE knowledge_attachments RENAME TO pictures`.execute(db)
  await sql`ALTER TABLE pictures ADD COLUMN node_id text`.execute(db)
  await sql`
    INSERT INTO graph_nodes (id, user_id, node_type, title, summary, visibility, created_at, updated_at, deleted_at)
    SELECT 'node_picture_' || id, user_id, 'picture', file_name, null, 'private', created_at, updated_at, deleted_at
    FROM pictures
  `.execute(db)
  await sql`UPDATE pictures SET node_id = 'node_picture_' || id`.execute(db)
  await sql`ALTER TABLE pictures ALTER COLUMN node_id SET NOT NULL`.execute(db)
  await sql`ALTER TABLE pictures ADD CONSTRAINT pictures_node_id_unique UNIQUE (node_id)`.execute(db)
  await sql`ALTER TABLE pictures ADD CONSTRAINT pictures_node_id_fk FOREIGN KEY (node_id) REFERENCES graph_nodes(id)`.execute(db)
  await sql`
    INSERT INTO graph_edges (id, user_id, source_node_id, target_node_id, edge_type, label, weight, position, metadata_json, created_at, updated_at, deleted_at)
    SELECT
      'edge_picture_' || p.id, p.user_id,
      CASE WHEN parent.node_type = 'drill' THEN parent.id ELSE p.node_id END,
      CASE WHEN parent.node_type = 'drill' THEN p.node_id ELSE parent.id END,
      CASE
        WHEN parent.node_type = 'topic' THEN 'belongs_to'
        WHEN parent.node_type = 'skill' THEN 'demonstrates'
        WHEN parent.node_type = 'drill' THEN 'drill_for'
        ELSE 'related_to'
      END,
      null, null, null, null, p.created_at, p.updated_at, p.deleted_at
    FROM pictures p
    JOIN graph_nodes parent ON parent.id = p.parent_node_id AND parent.user_id = p.user_id
  `.execute(db)
}

export async function down(db: Kysely<Database>) {
  await sql`DELETE FROM graph_edges WHERE id LIKE 'edge_picture_%'`.execute(db)
  await sql`ALTER TABLE pictures DROP CONSTRAINT pictures_node_id_fk`.execute(db)
  await sql`ALTER TABLE pictures DROP CONSTRAINT pictures_node_id_unique`.execute(db)
  await sql`DELETE FROM graph_nodes WHERE node_type = 'picture' AND id LIKE 'node_picture_%'`.execute(db)
  await sql`ALTER TABLE pictures DROP COLUMN node_id`.execute(db)
  await sql`ALTER TABLE pictures RENAME TO knowledge_attachments`.execute(db)
}
