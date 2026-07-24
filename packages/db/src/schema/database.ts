import type { Generated, Insertable, Selectable, Updateable } from 'kysely'

export interface UsersTable { id: string; email: string | null; display_name: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface GraphNodesTable { id: string; user_id: string; node_type: string; title: string; summary: string | null; visibility: string; created_at: string; updated_at: string; deleted_at: string | null }
export interface GraphEdgesTable { id: string; user_id: string; source_node_id: string; target_node_id: string; edge_type: string; label: string | null; weight: number | null; position: number | null; metadata_json: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface VideosTable { id: string; node_id: string; user_id: string; source_url: string; canonical_url: string | null; source_platform: string; external_id: string | null; title: string | null; description: string | null; thumbnail_url: string | null; creator_name: string | null; duration_seconds: number | null; progress: string; learning_state: string; importance: number | null; raw_metadata_json: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface TopicsTable { id: string; node_id: string; user_id: string; name: string; description: string | null; parent_topic_id: string | null; sort_order: number; is_system: number; is_hidden: number; is_pinned: number; created_at: string; updated_at: string; deleted_at: string | null }
export interface SkillsTable { id: string; node_id: string; user_id: string; topic_id: string | null; name: string; description: string | null; difficulty: string | null; status: string; is_system: number; is_pinned: number; created_at: string; updated_at: string; deleted_at: string | null }
export interface NotesTable { id: string; node_id: string; user_id: string; parent_node_id: string; body: string; timestamp_seconds: number | null; note_type: string; created_at: string; updated_at: string; deleted_at: string | null }
export interface DrillsTable { id: string; node_id: string; user_id: string; title: string; description: string | null; diagram_url: string | null; instructions: string | null; difficulty: string | null; duration_minutes: number | null; repetition_target: number | null; status: string; is_system: number; is_pinned: number; created_at: string; updated_at: string; deleted_at: string | null }
export interface DrillStepsTable { id: string; drill_id: string; user_id: string; position: number; actor: string; stroke: string; spin: string; from_zone: string; target_zone: string; instruction: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface MistakesTable { id: string; node_id: string; user_id: string; title: string; description: string | null; correction: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface TagsTable { id: string; node_id: string; user_id: string; name: string; color: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface LearningPathsTable { id: string; node_id: string; user_id: string; title: string; description: string | null; status: string; created_at: string; updated_at: string; deleted_at: string | null }
export interface LearningPathItemsTable { id: string; path_id: string; user_id: string; item_node_id: string; position: number; completed_at: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface CollectionsTable { id: string; node_id: string; user_id: string; title: string; description: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface CollectionItemsTable { id: string; collection_id: string; user_id: string; item_node_id: string; position: number; created_at: string; updated_at: string; deleted_at: string | null }
export interface InboxItemsTable { id: string; user_id: string; source_url: string | null; canonical_url: string | null; shared_title: string | null; shared_text: string | null; source_platform: string; thumbnail_url: string | null; creator_name: string | null; raw_payload_json: string | null; status: string; converted_node_id: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface ShareLinksTable { id: string; user_id: string; target_node_id: string; token_hash: string; token_prefix: string; visibility: string; expires_at: string | null; revoked_at: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface FeedbackTable { id: string; name: string | null; email: string | null; message_type: string; message: string; page_path: string | null; page_title: string | null; created_at: string; github_issue_number: number | null; issue_synced_at: string | null }
export interface PracticeSessionsTable { id: string; node_id: string; user_id: string; scheduled_date: string; time_zone: string; title: string; status: string; entry_mode: string; overall_rating: number | null; reflection: string | null; started_at: string | null; completed_at: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface PracticeSessionBlocksTable { id: string; session_id: string; user_id: string; skill_id: string; drill_id: string | null; video_id: string | null; position: number; original_position: number | null; planned_duration_seconds: number | null; original_planned_duration_seconds: number | null; actual_duration_seconds: number; timer_started_at: string | null; status: string; focus_note: string | null; started_at: string | null; completed_at: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface PracticeSkillCheckinsTable { id: string; session_id: string; user_id: string; skill_id: string; confidence_rating: number | null; note: string | null; created_at: string; updated_at: string; deleted_at: string | null }
export interface PicturesTable { id: string; node_id: string; user_id: string; parent_node_id: string; file_name: string; media_type: string; byte_size: number; width: number | null; height: number | null; content: Uint8Array; created_at: string; updated_at: string; deleted_at: string | null }
export interface MigrationsTable { id: string; name: string; applied_at: string }

export interface Database {
  users: UsersTable
  graph_nodes: GraphNodesTable
  graph_edges: GraphEdgesTable
  videos: VideosTable
  topics: TopicsTable
  skills: SkillsTable
  notes: NotesTable
  drills: DrillsTable
  drill_steps: DrillStepsTable
  mistakes: MistakesTable
  tags: TagsTable
  learning_paths: LearningPathsTable
  learning_path_items: LearningPathItemsTable
  collections: CollectionsTable
  collection_items: CollectionItemsTable
  inbox_items: InboxItemsTable
  share_links: ShareLinksTable
  feedback: FeedbackTable
  practice_sessions: PracticeSessionsTable
  practice_session_blocks: PracticeSessionBlocksTable
  practice_skill_checkins: PracticeSkillCheckinsTable
  pictures: PicturesTable
  schema_migrations: MigrationsTable
}
export type Row<T extends keyof Database> = Selectable<Database[T]>
export type NewRow<T extends keyof Database> = Insertable<Database[T]>
export type UpdateRow<T extends keyof Database> = Updateable<Database[T]>
