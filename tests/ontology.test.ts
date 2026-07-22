import { expect, test } from 'bun:test'
import { EDGE_TYPES, NOTE_PARENT_NODE_TYPES, ONTOLOGY_RELATIONSHIPS, TABLE_TENNIS_TOPICS, isAllowedRelationship } from '@ttll/shared'

test('ontology defines every edge type', () => {
  expect(Object.keys(ONTOLOGY_RELATIONSHIPS).sort()).toEqual([...EDGE_TYPES].sort())
  for (const edgeType of EDGE_TYPES) expect(ONTOLOGY_RELATIONSHIPS[edgeType].length).toBeGreaterThan(0)
})

test('ontology uses table-tennis domain semantics', () => {
  expect(isAllowedRelationship('video', 'skill', 'explains')).toBe(true)
  expect(isAllowedRelationship('drill', 'skill', 'practices')).toBe(true)
  expect(isAllowedRelationship('video', 'skill', 'practices')).toBe(false)
  expect(isAllowedRelationship('collection', 'note', 'contains')).toBe(true)
  expect(isAllowedRelationship('note', 'creator', 'mentions')).toBe(false)
  expect(isAllowedRelationship('note', 'mistake', 'mentions')).toBe(true)
  expect(isAllowedRelationship('video', 'tag', 'tagged_with')).toBe(true)
  expect(isAllowedRelationship('tag', 'tag', 'tagged_with')).toBe(false)
  expect(isAllowedRelationship('topic', 'tag', 'tagged_with')).toBe(false)
  expect(NOTE_PARENT_NODE_TYPES).toEqual(['video', 'skill', 'topic', 'drill', 'mistake'])
})

test('starter taxonomy matches the reviewed product taxonomy', () => {
  expect(TABLE_TENNIS_TOPICS).toEqual(['Serve', 'Receive', 'Spin', 'Forehand', 'Backhand', 'Footwork', 'Tactics', 'Match Analysis', 'Physical Training', 'Mental Game', 'Equipment'])
})
