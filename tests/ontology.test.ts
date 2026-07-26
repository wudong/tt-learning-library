import { expect, test } from 'bun:test'
import {
  ADDITIONAL_TABLE_TENNIS_DRILLS,
  EDGE_TYPES,
  NOTE_PARENT_NODE_TYPES,
  ONTOLOGY_RELATIONSHIPS,
  TABLE_TENNIS_DRILLS,
  TABLE_TENNIS_DRILL_RELATED_SKILLS,
  TABLE_TENNIS_SKILLS,
  TABLE_TENNIS_SKILL_LINKS,
  TABLE_TENNIS_TOPICS,
  TABLE_TENNIS_TOPIC_DESCRIPTIONS,
  TABLE_TENNIS_TOPIC_LINKS,
  enrichedTableTennisSkillDescription,
  isAllowedRelationship,
} from '../packages/shared/src'

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
  expect(ADDITIONAL_TABLE_TENNIS_DRILLS).toHaveLength(4)
  expect(TABLE_TENNIS_DRILLS.every((drill) => TABLE_TENNIS_SKILLS.some((skill) => skill.name === drill.skill))).toBe(true)
  expect(ADDITIONAL_TABLE_TENNIS_DRILLS.every((drill) => TABLE_TENNIS_SKILLS.some((skill) => skill.name === drill.skill))).toBe(true)
  expect(TABLE_TENNIS_DRILLS.every((drill) => drill.description.length > 0 && drill.imageUrl.startsWith('/drills/') && drill.steps.length > 0)).toBe(true)
  expect([...TABLE_TENNIS_DRILLS, ...ADDITIONAL_TABLE_TENNIS_DRILLS].flatMap((drill) => drill.steps).every((step) => ['topspin','backspin','sidespin','no_spin','variable'].includes(step.spin))).toBe(true)
  expect(TABLE_TENNIS_SKILLS.find((skill) => skill.name === 'Reverse Pendulum Serve')?.topic).toBe('Serve')
})

test('every Topic and Skill has meaningful reviewed copy', () => {
  expect(Object.keys(TABLE_TENNIS_TOPIC_DESCRIPTIONS).sort()).toEqual([...TABLE_TENNIS_TOPICS].sort())
  for (const description of Object.values(TABLE_TENNIS_TOPIC_DESCRIPTIONS)) {
    expect(description.length).toBeGreaterThan(80)
    expect(description.split(/\s+/).length).toBeGreaterThan(12)
  }
  for (const skill of TABLE_TENNIS_SKILLS) {
    const description = enrichedTableTennisSkillDescription(skill)
    expect(description.length).toBeGreaterThan(120)
    expect(description).not.toBe(`Build reliable ${skill.name.toLowerCase()} technique for ${skill.topic.toLowerCase()} situations in training and matches.`)
  }
  expect(enrichedTableTennisSkillDescription({ name: 'Backhand Chop', topic: 'Backhand' })).toContain('controlled backspin')
})

test('curated ontology links refer to real nodes and allowed relationship pairs', () => {
  const topics = new Set<string>(TABLE_TENNIS_TOPICS)
  const skills = new Set(TABLE_TENNIS_SKILLS.map((skill) => skill.name))

  for (const link of TABLE_TENNIS_TOPIC_LINKS) {
    expect(topics.has(link.source)).toBe(true)
    expect(topics.has(link.target)).toBe(true)
    expect(isAllowedRelationship('topic', 'topic', link.edgeType)).toBe(true)
  }
  for (const link of TABLE_TENNIS_SKILL_LINKS) {
    expect(skills.has(link.source)).toBe(true)
    expect(skills.has(link.target)).toBe(true)
    expect(isAllowedRelationship('skill', 'skill', link.edgeType)).toBe(true)
  }
  for (const [drillTitle, relatedSkills] of Object.entries(TABLE_TENNIS_DRILL_RELATED_SKILLS)) {
    expect([...TABLE_TENNIS_DRILLS, ...ADDITIONAL_TABLE_TENNIS_DRILLS].some((drill) => drill.title === drillTitle)).toBe(true)
    expect(relatedSkills.length).toBeGreaterThanOrEqual(3)
    for (const skill of relatedSkills) expect(skills.has(skill)).toBe(true)
  }
})
