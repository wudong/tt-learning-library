# Table Tennis Learning Ontology

> Ontology revision: 1.0
> Reviewed: 2026-07-23
> Scope: curated MVP player-learning ontology

## Purpose

The ontology gives every owner the same protected vocabulary for organizing
private learning material. It is designed for tutorial discovery and practice,
not as a complete encyclopedia of people, events, manufacturers, or governing
bodies.

Users do not edit this ontology. They attach private Videos, Notes, Drills,
Mistakes, learning state, and Learning Paths to it.

The executable source is:

```text
packages/shared/src/constants/ontology.ts
```

## Modeling Rules

- **Topic**: a durable subject area used to browse and filter learning material.
- **Skill**: a learnable capability, technique, decision, or applied knowledge
  outcome.
- **Video**: may belong to multiple Topics and explain or demonstrate multiple
  Skills.
- **Picture**: is a stored visual learning resource that may belong to Topics,
  explain or demonstrate Skills, and support Drills.
- **Note**: may attach directly to a Topic, Skill, Video, Drill, or Mistake.
- Synonyms are normalized to one canonical Skill name; aliases are a future
  search concern, not duplicate ontology entries.
- Handedness, grip, playing style, ability, and equipment differences are
  modeled explicitly only when they materially change the learning action.

## Coverage Matrix

| Domain | Covered learning outcomes |
|---|---|
| Fundamentals | Ready position, grips, racket angle, timing, contact, placement, consistency, recovery |
| Serve | Spin families, major service actions, depth, placement, disguise, variation, legality |
| Receive | Spin reading, push, flick, attack, drop, placement, and common spin responses |
| Spin | Production, reading, reversal, counteraction, and variation |
| Forehand | Drive, counterhit, topspin, counter-topspin, push, flick, block, smash, lob, chop |
| Backhand | Drive, counterhit, loop, counter-topspin, push, flick, block, punch, chop, lob |
| Footwork | Split, one-step, side/shuffle, crossover, pivot, in/out, transitions, recovery, Falkenberg |
| Defense | Chop, block, lob, fishing, counterattack, twiddling, and disruptive-rubber play |
| Tactics | Serve/receive/rally patterns, placement, pace, spin, table position, opponent styles |
| Doubles | Service, receive, rotation, communication, sequencing, handedness combinations |
| Training & Drills | Regularity, multiball, serve/receive, footwork, random and match simulation, load planning |
| Physical Training | Warm-up, mobility, strength, speed, conditioning, injury prevention, recovery, nutrition |
| Mental Game | Routines, goals, focus, breathing, self-talk, imagery, pressure, mistakes, adjustments |
| Match Analysis | Scouting, serve/receive and rally patterns, errors, self-video, post-match review |
| Equipment | Blade/rubber choice, sponge, special rubbers, assembly, care, playing conditions |
| Rules & Officiating | Scoring, service, doubles order, lets, expedite, intervals, equipment, umpiring |
| Para Table Tennis | Wheelchair/standing movement, adaptive grip, service/receive, classification, inclusion |
| Coaching | Observation, planning, progression, correction, feeding, competition, safety, adaptation |

## Evidence Basis

Coverage is aligned with:

- the ITTF Laws and Regulations for rules, equipment, service, competition, and
  para context;
- ITTF Education coaching material covering service, receive, rally tactics,
  footwork, physical preparation, psychology, injury prevention, coaching, and
  training;
- table-tennis performance-analysis literature classifying strokes as service,
  push, topspin, counter-topspin, block, flick, drive, smash, and lob, plus
  split, one-step, side/shuffle, crossover, and pivot movement.

## Boundaries

Included:

- knowledge useful to players, practice partners, parents, and coaches;
- conventional, pimpled-rubber, anti-spin, defensive, doubles, and para play;
- practical rules, equipment, preparation, and analysis knowledge.

Excluded as ontology entries:

- individual players, coaches, clubs, brands, products, tournaments, rankings,
  and historical events;
- medical diagnosis or rehabilitation prescriptions;
- jurisdiction-specific safeguarding and competition administration detail;
- arbitrary user-created Topics or Skills.

Those exclusions can still appear in private Notes or source metadata where
appropriate.

## Governance

Ontology changes require:

1. a concrete missing learning outcome or ambiguity;
2. canonical naming and primary Topic selection;
3. duplicate and synonym review;
4. coverage tests;
5. idempotent provisioning validation;
6. documentation revision.

The ontology can grow through reviewed releases without allowing direct user
mutation.
