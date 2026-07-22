import type { EdgeType } from './edgeTypes'
import type { NodeType } from './nodeTypes'

export const TABLE_TENNIS_TOPICS = [
  'Serve', 'Receive', 'Spin', 'Forehand', 'Backhand', 'Footwork', 'Tactics',
  'Match Analysis', 'Physical Training', 'Mental Game', 'Equipment'
] as const

export const NOTE_PARENT_NODE_TYPES = ['video', 'skill', 'topic', 'drill', 'mistake'] as const satisfies readonly NodeType[]

type Pair = readonly [NodeType, NodeType]
const pairs = (...values: Pair[]) => values
const sameTypePairs = (...types: NodeType[]) => types.map((type) => [type, type] as const)

export const ONTOLOGY_RELATIONSHIPS = {
  belongs_to: pairs(['skill', 'topic'], ['topic', 'topic']),
  contains: pairs(
    ['learning_path', 'video'], ['learning_path', 'skill'], ['learning_path', 'drill'], ['learning_path', 'note'],
    ['collection', 'video'], ['collection', 'skill'], ['collection', 'drill'], ['collection', 'note']
  ),
  explains: pairs(['video', 'skill'], ['note', 'skill']),
  demonstrates: pairs(['video', 'skill']),
  practices: pairs(['drill', 'skill']),
  drill_for: pairs(['drill', 'skill'], ['drill', 'video']),
  related_to: pairs(...sameTypePairs('video', 'skill', 'topic', 'drill')),
  requires: pairs(['skill', 'skill']),
  prerequisite_of: pairs(['skill', 'skill']),
  common_mistake_for: pairs(['mistake', 'skill']),
  enables: pairs(['skill', 'skill']),
  mentions: pairs(['note', 'video'], ['note', 'skill'], ['note', 'topic'], ['note', 'drill'], ['note', 'mistake']),
  contrasts_with: pairs(['skill', 'skill'], ['video', 'video']),
  saved_from: pairs(['video', 'source']),
  created_by: pairs(['video', 'creator']),
  tagged_with: pairs(['video', 'tag'], ['skill', 'tag'], ['note', 'tag'], ['drill', 'tag'], ['mistake', 'tag'], ['learning_path', 'tag']),
  copied_from: pairs(['video', 'video'], ['skill', 'skill'], ['drill', 'drill']),
  forked_from: pairs(['video', 'video'], ['skill', 'skill'], ['drill', 'drill'])
} as const satisfies Record<EdgeType, readonly Pair[]>

export function isAllowedRelationship(source: NodeType, target: NodeType, edgeType: EdgeType): boolean {
  return (ONTOLOGY_RELATIONSHIPS[edgeType] as readonly Pair[]).some(([allowedSource, allowedTarget]) => allowedSource === source && allowedTarget === target)
}
