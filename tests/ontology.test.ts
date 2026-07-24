import { expect, test } from 'bun:test'
import { EDGE_TYPES, NOTE_PARENT_NODE_TYPES, ONTOLOGY_RELATIONSHIPS, TABLE_TENNIS_DRILLS, TABLE_TENNIS_SKILLS, TABLE_TENNIS_TOPICS, isAllowedRelationship } from '../packages/shared/src'

test('ontology defines every edge type', () => {
  expect(Object.keys(ONTOLOGY_RELATIONSHIPS).sort()).toEqual([...EDGE_TYPES].sort())
  for (const edgeType of EDGE_TYPES) expect(ONTOLOGY_RELATIONSHIPS[edgeType].length).toBeGreaterThan(0)
})

test('ontology uses table-tennis domain semantics', () => {
  expect(isAllowedRelationship('video', 'skill', 'explains')).toBe(true)
  expect(isAllowedRelationship('video', 'topic', 'belongs_to')).toBe(true)
  expect(isAllowedRelationship('picture', 'topic', 'belongs_to')).toBe(true)
  expect(isAllowedRelationship('picture', 'skill', 'demonstrates')).toBe(true)
  expect(isAllowedRelationship('drill', 'picture', 'drill_for')).toBe(true)
  expect(isAllowedRelationship('drill', 'skill', 'practices')).toBe(true)
  expect(isAllowedRelationship('practice_session', 'skill', 'practices')).toBe(true)
  expect(isAllowedRelationship('practice_session', 'video', 'contains')).toBe(true)
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
  expect(TABLE_TENNIS_TOPICS).toEqual([
    'Fundamentals', 'Serve', 'Receive', 'Spin', 'Forehand', 'Backhand', 'Footwork',
    'Defense', 'Tactics', 'Doubles', 'Training & Drills', 'Match Analysis',
    'Physical Training', 'Mental Game', 'Equipment', 'Rules & Officiating',
    'Para Table Tennis', 'Coaching'
  ])
  expect(TABLE_TENNIS_SKILLS).toHaveLength(176)
  expect(TABLE_TENNIS_DRILLS).toHaveLength(12)
  expect(TABLE_TENNIS_DRILLS.every((drill) => TABLE_TENNIS_SKILLS.some((skill) => skill.name === drill.skill))).toBe(true)
  expect(TABLE_TENNIS_DRILLS.every((drill) => drill.description.length > 0 && drill.imageUrl.startsWith('/drills/') && drill.steps.length > 0)).toBe(true)
  expect(TABLE_TENNIS_DRILLS.flatMap((drill) => drill.steps).every((step) => ['topspin','backspin','sidespin','no_spin','variable'].includes(step.spin))).toBe(true)
  expect(TABLE_TENNIS_SKILLS.find((skill) => skill.name === 'Reverse Pendulum Serve')?.topic).toBe('Serve')
})
