import type { EdgeType } from './edgeTypes'

export const TABLE_TENNIS_TOPIC_DESCRIPTIONS = {
  Fundamentals: 'Core racket, body, timing, contact, placement, and recovery principles that support every table-tennis stroke and make technique repeatable under pressure.',
  Serve: 'Service technique, spin production, placement, depth, disguise, and legal execution for creating a predictable or weak third-ball opportunity.',
  Receive: 'Reading the serve and choosing a controlled or attacking return based on spin, length, placement, opponent position, and the next-ball plan.',
  Spin: 'How spin is generated, recognised, varied, reversed, and neutralised through racket angle, contact quality, acceleration, timing, and ball trajectory.',
  Forehand: 'Forehand strokes from controlled drives and blocks to loops, counters, flicks, smashes, chops, and lobs, with balanced recovery after contact.',
  Backhand: 'Backhand strokes for close-table control, topspin attack, blocking, punching, pushing, chopping, and emergency defence with efficient preparation.',
  Footwork: 'Movement patterns that place the body behind the ball, preserve balance through contact, and recover efficiently for the next stroke.',
  Defense: 'Defensive techniques and transitions for absorbing pressure, changing spin or height, extending rallies, and creating a chance to counterattack.',
  Tactics: 'Point construction through serve-and-receive plans, placement, pace, spin, table position, opponent analysis, and transitions between passive and active play.',
  Doubles: 'Service order, receiving roles, movement rotation, partner communication, and tactical sequencing for effective two-player table tennis.',
  'Training & Drills': 'How to design purposeful sessions, progress from regular to random practice, use multiball, control training load, and simulate match decisions.',
  'Match Analysis': 'Methods for observing patterns, reviewing video, identifying recurring errors, and converting match evidence into practical training priorities.',
  'Physical Training': 'Warm-up, mobility, strength, speed, conditioning, recovery, hydration, and injury-prevention habits that support safe table-tennis performance.',
  'Mental Game': 'Routines for focus, confidence, emotional control, pressure management, recovery after mistakes, and useful adjustment between games.',
  Equipment: 'Choosing, assembling, caring for, and adapting to blades, rubbers, balls, tables, and flooring so equipment supports the intended playing style.',
  'Rules & Officiating': 'Scoring, service, doubles, let, timeout, expedite, racket, and umpiring rules needed to compete and officiate confidently.',
  'Para Table Tennis': 'Inclusive movement, grip, service, receive, classification awareness, and practice adaptations for wheelchair and standing para table tennis.',
  Coaching: 'Observation, feedback, session design, progression, error diagnosis, safe practice, competition support, and adaptation to player age and ability.',
} as const

export type TableTennisTopicName = keyof typeof TABLE_TENNIS_TOPIC_DESCRIPTIONS

export function tableTennisTopicDescription(topic: string): string {
  return TABLE_TENNIS_TOPIC_DESCRIPTIONS[topic as TableTennisTopicName]
    ?? `A structured learning area for developing ${topic.toLowerCase()} knowledge, decisions, and repeatable table-tennis performance.`
}

const SKILL_DESCRIPTION_OVERRIDES: Record<string, string> = {
  'Ready Position': 'Build a balanced, alert base with the racket in front, weight on the balls of the feet, and enough freedom to move in any direction. Check whether the stance supports a quick first step and an early contact point.',
  'Racket Angle Control': 'Control the racket face relative to incoming spin and ball height so the outgoing trajectory stays predictable. Practise small angle changes while keeping the swing direction and contact point consistent.',
  'Ball Timing': 'Recognise the rising, peak, and falling phases of the bounce and choose the contact time that suits the intended stroke. Earlier timing takes time away; later timing can add control but increases recovery demands.',
  'Contact Point Control': 'Meet the ball at a repeatable distance from the body and in front of the appropriate hip or shoulder. A stable contact point improves direction, spin, balance, and recovery.',
  'Reading Incoming Spin': 'Use the opponent’s racket path, contact sound, ball logo, flight, and bounce to estimate spin before contact. Confirm the read through the first bounce and adjust racket angle rather than guessing late.',
  'Backhand Chop': 'Defend with a stable base, relaxed preparation, and a brushing downward-forward contact that sends a low, deep ball with controlled backspin. Vary depth and spin while recovering for the next attack or chop.',
  'Forehand Loop Against Backspin': 'Open safely against backspin by lowering the body, accelerating upward and forward, and brushing the back of the ball. Prioritise net clearance, depth, and recovery before increasing speed.',
  'Backhand Loop Against Backspin': 'Open from the backhand side with compact preparation, leg support, and upward-forward acceleration. Keep the contact in front and recover the racket quickly for the next ball.',
  'Short Serve': 'Keep the second bounce near the opponent’s end line by controlling first-bounce placement, contact quality, and forward speed. Use the same action to vary spin and placement without revealing the intention early.',
  'Serve Variation and Disguise': 'Use a repeatable preparation while changing contact point, racket acceleration, spin, speed, depth, and placement. The goal is not novelty but creating uncertainty that supports a planned third ball.',
  'Reading Serve Spin': 'Read the server’s racket direction, contact point, follow-through, bounce, and ball flight before selecting a receive. Use a simple decision rule for short, half-long, and long serves.',
  'Short Push Receive': 'Keep the receive low and short by moving close to the bounce, using a soft hand, and contacting under the ball without excessive forward force. Recover immediately for a possible flick or long push.',
  'Backhand Flick Receive': 'Attack a short serve with an early contact, compact wrist and forearm acceleration, and a stable body position over the table. Adjust racket angle for the server’s spin and recover quickly from the reach.',
  'Third-Ball Attack': 'Connect the serve to a prepared attack by anticipating likely returns, moving early, and choosing a high-percentage opening ball. Judge success by the quality of the pattern, not only whether the third ball wins the point.',
  'Forehand–Backhand Transition': 'Switch efficiently between forehand and backhand without standing up or over-rotating. Keep the racket in front, use small recovery movements, and preserve a stable contact zone on both sides.',
  'Falkenberg Footwork': 'Coordinate backhand, pivot forehand, and wide forehand movements while recovering through the middle. Maintain stroke quality as distance and physical demand increase.',
  'Chop Defense': 'Control repeated topspin attacks with low, deep chops, varied backspin, and disciplined recovery. Use height, depth, and spin variation to interrupt the attacker’s rhythm and create a counterattack opportunity.',
  'Counterattack From Defense': 'Recognise a weaker attack, recover forward, and change from absorbing pressure to a controlled counterattack. The transition should be prepared by balance and ball quality rather than rushed by frustration.',
  'Opening Against Backspin': 'Choose a safe first topspin against a push or chop by reading depth and spin, moving into position, and creating enough upward acceleration. Recover for the next ball instead of treating the opening as a finish.',
  'Switching From Passive to Active Play': 'Identify the ball that allows a change from containment to initiative. Use placement, body position, and a controlled first attack so the transition improves the rally rather than creating an unforced error.',
  'Focus and Refocusing': 'Use a short attention routine before each point and a reset cue after distractions or mistakes. Direct attention to controllable information such as serve plan, ball quality, and recovery position.',
  'Recovering After Mistakes': 'Acknowledge the error briefly, extract one useful cue, and return attention to the next point. Avoid technical over-analysis during the match unless the same pattern clearly repeats.',
  'Video Self-Analysis': 'Review selected rallies with a specific question, tag repeatable patterns, and separate outcome from process. Convert observations into one or two measurable training priorities rather than collecting vague criticism.',
  'Technical Observation and Feedback': 'Observe ball outcome, contact, body organisation, and recovery before choosing feedback. Give one actionable cue, check understanding, and allow enough repetitions to evaluate whether it helps.',
  'Session Planning': 'Build a session around a clear player need, progressive practice conditions, realistic time blocks, and a closing check. Connect each drill to the match behaviour it is meant to improve.',
}

const TOPIC_SKILL_TEMPLATES: Record<string, (name: string) => string> = {
  Fundamentals: (name) => `${name} is a transferable foundation for consistent strokes. Practise it with simple feeds, check balance and contact quality, then retain the same cue as speed, placement, and uncertainty increase.`,
  Serve: (name) => `${name} develops a service option that combines legal contact, purposeful spin, controlled first bounce, and planned placement. Measure consistency and the quality of the expected third-ball opportunity.`,
  Receive: (name) => `${name} is a receive decision for a particular serve length or spin. Read the ball early, move into a balanced contact position, control height and placement, and recover for the server’s next attack.`,
  Spin: (name) => `${name} improves understanding and control of rotation. Link racket direction, acceleration, contact quality, flight, bounce, and the opponent’s likely response rather than treating spin as an isolated trick.`,
  Forehand: (name) => `${name} develops a reliable forehand option with appropriate preparation, body support, contact in front, racket acceleration, and balanced recovery. Progress from predictable placement to match-like decisions.`,
  Backhand: (name) => `${name} develops an efficient backhand option with compact preparation, stable contact in front of the body, suitable racket angle, and quick recovery. Build control first, then add pace, spin, and uncertainty.`,
  Footwork: (name) => `${name} places the body in a balanced hitting position and supports recovery for the next ball. Practise the movement without the ball, then preserve timing and stroke quality as feeds become less predictable.`,
  Defense: (name) => `${name} provides a defensive response that controls the attacker’s pace or spin while maintaining enough balance to recover. Use variation and placement to create a weaker ball or a chance to counterattack.`,
  Tactics: (name) => `${name} is a repeatable point-building decision rather than a single stroke. Define the trigger, intended placement or spin, expected reply, and next-ball option, then test the pattern in conditioned games.`,
  Doubles: (name) => `${name} supports coordinated doubles play through clear roles, efficient movement, and communication. Practise the sequence with a partner and evaluate whether both players remain balanced for the next ball.`,
  'Training & Drills': (name) => `${name} helps turn a performance need into purposeful practice. Define the behaviour being trained, progression, feedback method, success measure, and point at which the exercise should become more variable.`,
  'Match Analysis': (name) => `${name} turns match evidence into a focused conclusion. Observe repeated patterns, separate execution from decision quality, and convert the finding into a specific training task or tactical adjustment.`,
  'Physical Training': (name) => `${name} supports safe table-tennis movement and repeatable performance. Match the exercise to the player’s age and training history, use progressive load, and prioritise technique, recovery, and pain-free movement.`,
  'Mental Game': (name) => `${name} is a practical mental routine for competition and training. Use a short cue, rehearse it under manageable pressure, and evaluate whether it improves attention, decision-making, and recovery between points.`,
  Equipment: (name) => `${name} helps match equipment characteristics to technique, comfort, control, and playing style. Compare options through consistent tests and avoid changing several variables at the same time.`,
  'Rules & Officiating': (name) => `${name} develops accurate rule knowledge and confident application. Learn the rule, recognise common match situations, and practise explaining or applying the decision clearly and consistently.`,
  'Para Table Tennis': (name) => `${name} supports effective and inclusive play through appropriate technical or movement adaptation. Start from the player’s functional strengths, comfort, safety, and tactical goals rather than a one-size-fits-all model.`,
  Coaching: (name) => `${name} supports player-centred coaching through clear observation, purposeful communication, suitable progression, and safe practice. Evaluate the effect on player understanding and performance, not only whether instructions were delivered.`,
}

export function enrichedTableTennisSkillDescription(skill: { name: string; topic: string }): string {
  return SKILL_DESCRIPTION_OVERRIDES[skill.name]
    ?? (TOPIC_SKILL_TEMPLATES[skill.topic] ?? TOPIC_SKILL_TEMPLATES.Fundamentals)(skill.name)
}

export type OntologyLinkDefinition = {
  source: string
  target: string
  edgeType: Extract<EdgeType, 'related_to'|'requires'|'prerequisite_of'|'enables'|'contrasts_with'>
}

export const TABLE_TENNIS_TOPIC_LINKS: OntologyLinkDefinition[] = [
  { source: 'Fundamentals', target: 'Footwork', edgeType: 'related_to' },
  { source: 'Fundamentals', target: 'Spin', edgeType: 'related_to' },
  { source: 'Serve', target: 'Receive', edgeType: 'related_to' },
  { source: 'Serve', target: 'Spin', edgeType: 'related_to' },
  { source: 'Receive', target: 'Spin', edgeType: 'related_to' },
  { source: 'Forehand', target: 'Backhand', edgeType: 'related_to' },
  { source: 'Forehand', target: 'Footwork', edgeType: 'related_to' },
  { source: 'Backhand', target: 'Footwork', edgeType: 'related_to' },
  { source: 'Defense', target: 'Tactics', edgeType: 'related_to' },
  { source: 'Tactics', target: 'Match Analysis', edgeType: 'related_to' },
  { source: 'Doubles', target: 'Tactics', edgeType: 'related_to' },
  { source: 'Training & Drills', target: 'Coaching', edgeType: 'related_to' },
  { source: 'Training & Drills', target: 'Match Analysis', edgeType: 'related_to' },
  { source: 'Physical Training', target: 'Mental Game', edgeType: 'related_to' },
  { source: 'Equipment', target: 'Rules & Officiating', edgeType: 'related_to' },
  { source: 'Para Table Tennis', target: 'Coaching', edgeType: 'related_to' },
]

export const TABLE_TENNIS_SKILL_LINKS: OntologyLinkDefinition[] = [
  { source: 'Ready Position', target: 'Split Step', edgeType: 'enables' },
  { source: 'Ready Position', target: 'Recovery After Stroke', edgeType: 'enables' },
  { source: 'Racket Angle Control', target: 'Forehand Block', edgeType: 'prerequisite_of' },
  { source: 'Racket Angle Control', target: 'Backhand Block', edgeType: 'prerequisite_of' },
  { source: 'Racket Angle Control', target: 'Backhand Chop', edgeType: 'prerequisite_of' },
  { source: 'Ball Timing', target: 'Forehand Drive', edgeType: 'prerequisite_of' },
  { source: 'Ball Timing', target: 'Backhand Drive', edgeType: 'prerequisite_of' },
  { source: 'Contact Point Control', target: 'Rally Consistency', edgeType: 'enables' },
  { source: 'Reading Incoming Spin', target: 'Counteracting Spin', edgeType: 'enables' },
  { source: 'Generating Backspin', target: 'Backspin Serve', edgeType: 'enables' },
  { source: 'Generating Backspin', target: 'Backhand Chop', edgeType: 'enables' },
  { source: 'Generating Topspin', target: 'Forehand Topspin', edgeType: 'enables' },
  { source: 'Generating Topspin', target: 'Backhand Loop', edgeType: 'enables' },
  { source: 'Reading Serve Spin', target: 'Short Push Receive', edgeType: 'prerequisite_of' },
  { source: 'Reading Serve Spin', target: 'Backhand Flick Receive', edgeType: 'prerequisite_of' },
  { source: 'Short Serve', target: 'Third-Ball Attack', edgeType: 'enables' },
  { source: 'Serve Placement', target: 'Third-Ball Attack', edgeType: 'enables' },
  { source: 'Serve Variation and Disguise', target: 'Serve-and-Attack Pattern', edgeType: 'enables' },
  { source: 'Short Push Receive', target: 'Opening Against Backspin', edgeType: 'related_to' },
  { source: 'Backhand Flick Receive', target: 'Receive With Topspin', edgeType: 'related_to' },
  { source: 'Forehand Drive', target: 'Forehand Topspin', edgeType: 'prerequisite_of' },
  { source: 'Backhand Drive', target: 'Backhand Loop', edgeType: 'prerequisite_of' },
  { source: 'Forehand Loop Against Backspin', target: 'Opening Against Backspin', edgeType: 'related_to' },
  { source: 'Backhand Loop Against Backspin', target: 'Opening Against Backspin', edgeType: 'related_to' },
  { source: 'Forehand Counter-Topspin', target: 'Forehand Loop Against Topspin', edgeType: 'requires' },
  { source: 'Backhand Counter-Topspin', target: 'Backhand Loop Against Topspin', edgeType: 'requires' },
  { source: 'Backhand Chop', target: 'Chop Defense', edgeType: 'related_to' },
  { source: 'Backhand Chop', target: 'Generating Backspin', edgeType: 'requires' },
  { source: 'Backhand Chop', target: 'Reading Incoming Spin', edgeType: 'requires' },
  { source: 'Backhand Chop', target: 'Backhand Loop', edgeType: 'contrasts_with' },
  { source: 'Forehand Chop', target: 'Chop Defense', edgeType: 'related_to' },
  { source: 'Block Defense', target: 'Counterattack From Defense', edgeType: 'enables' },
  { source: 'Chop Defense', target: 'Counterattack From Defense', edgeType: 'enables' },
  { source: 'Side-Step Footwork', target: 'Forehand–Backhand Transition', edgeType: 'enables' },
  { source: 'Pivot Footwork', target: 'Falkenberg Footwork', edgeType: 'prerequisite_of' },
  { source: 'Wide-Ball Recovery', target: 'Falkenberg Footwork', edgeType: 'requires' },
  { source: 'Third-Ball Attack', target: 'Serve-and-Attack Pattern', edgeType: 'related_to' },
  { source: 'Opening Against Backspin', target: 'Switching From Passive to Active Play', edgeType: 'enables' },
  { source: 'Changing Placement', target: 'Playing the Elbow', edgeType: 'enables' },
  { source: 'Controlling Table Position', target: 'Switching From Passive to Active Play', edgeType: 'enables' },
  { source: 'Regularity Training', target: 'Random Practice', edgeType: 'prerequisite_of' },
  { source: 'Random Practice', target: 'Match-Simulation Practice', edgeType: 'prerequisite_of' },
  { source: 'Video Self-Analysis', target: 'Post-Match Review', edgeType: 'enables' },
  { source: 'Rally Pattern Analysis', target: 'Between-Game Adjustment', edgeType: 'enables' },
  { source: 'Focus and Refocusing', target: 'Handling Match Pressure', edgeType: 'enables' },
  { source: 'Recovering After Mistakes', target: 'Focus and Refocusing', edgeType: 'related_to' },
  { source: 'Technical Observation and Feedback', target: 'Error Diagnosis and Correction', edgeType: 'enables' },
  { source: 'Session Planning', target: 'Skill Progression Design', edgeType: 'enables' },
  { source: 'Safe and Ethical Coaching', target: 'Adapting Coaching to Age and Ability', edgeType: 'related_to' },
]

export const TABLE_TENNIS_DRILL_RELATED_SKILLS: Record<string, readonly string[]> = {
  'Forehand Crosscourt Consistency': ['Forehand Drive', 'Rally Consistency', 'Placement Control', 'Recovery After Stroke'],
  'Backhand Crosscourt Consistency': ['Backhand Drive', 'Rally Consistency', 'Placement Control', 'Recovery After Stroke'],
  'Two-Point Forehand Footwork': ['Side-Step Footwork', 'Forehand Drive', 'Wide-Ball Recovery', 'Recovery After Stroke'],
  'Forehand–Backhand Alternation': ['Forehand–Backhand Transition', 'Forehand Drive', 'Backhand Drive', 'Recovery After Stroke'],
  'Falkenberg Pattern': ['Falkenberg Footwork', 'Pivot Footwork', 'Wide-Ball Recovery', 'Forehand–Backhand Transition'],
  'Short Serve Target Practice': ['Short Serve', 'Serve Placement', 'Placement Control', 'Serve Variation and Disguise'],
  'Serve Variation Ladder': ['Serve Variation and Disguise', 'Generating Backspin', 'Generating Sidespin', 'Serve Placement'],
  'Short Push Control': ['Short Push Receive', 'Placement Control', 'Reading Serve Spin', 'Generating Backspin'],
  'Backhand Flick Receive': ['Backhand Flick Receive', 'Reading Serve Spin', 'Receive Placement', 'Receive With Topspin'],
  'Serve and Third-Ball Attack': ['Third-Ball Attack', 'Backspin Serve', 'Serve Placement', 'Opening Against Backspin'],
  'Block-to-Counter Transition': ['Counterattack From Defense', 'Backhand Block', 'Forehand Counterhit', 'Switching From Passive to Active Play'],
  'Open Against Backspin Multiball': ['Opening Against Backspin', 'Forehand Loop Against Backspin', 'Recovery After Stroke', 'Multiball Training'],
  'Backhand Chop Depth Control': ['Backhand Chop', 'Chop Defense', 'Generating Backspin', 'Placement Control'],
  'Forehand Loop Opening Progression': ['Forehand Loop Against Backspin', 'Opening Against Backspin', 'Ball Timing', 'Recovery After Stroke'],
  'Receive Decision Ladder': ['Reading Serve Spin', 'Short Push Receive', 'Backhand Flick Receive', 'Aggressive Long-Serve Receive'],
  'Ready Position Recovery Shadow': ['Ready Position', 'Split Step', 'Recovery After Stroke', 'Side-Step Footwork'],
}

export const TABLE_TENNIS_DRILL_INSTRUCTIONS: Record<string, string> = {
  'Forehand Crosscourt Consistency': 'Start cooperatively at a pace that preserves balance. Count consecutive quality balls, reset after an error, then add one placement change every fifth ball.',
  'Backhand Crosscourt Consistency': 'Keep the racket in front and contact the ball at a repeatable height. Build a consistency score before increasing pace or changing direction.',
  'Two-Point Forehand Footwork': 'Move with small side steps, arrive before swinging, and recover through the middle after each forehand. Reduce speed if the upper body reaches away from the legs.',
  'Forehand–Backhand Alternation': 'Keep both strokes compact and use recovery rather than a large backswing to switch sides. Count only repetitions where balance and placement remain controlled.',
  'Falkenberg Pattern': 'Begin slowly enough to complete the full recovery route. Increase pace only when the backhand, pivot forehand, and wide forehand retain stable contact quality.',
  'Short Serve Target Practice': 'Mark three short targets. Complete a set number to each target, record second-bounce success, then repeat with a different spin using the same preparation.',
  'Serve Variation Ladder': 'Use one recognisable service action. Change only one variable at a time—spin, placement, or depth—before combining variations under a scoring target.',
  'Short Push Control': 'Contact close to the bounce with a relaxed hand. Score a point when both players keep the ball short and low; restart when a ball drifts half-long.',
  'Backhand Flick Receive': 'Begin with predictable short backspin serves. Contact early over the table, recover immediately, then add sidespin and no-spin variation.',
  'Serve and Third-Ball Attack': 'Choose the serve and expected return before starting. Score the pattern for serve quality, movement, opening-ball safety, and recovery—not only winners.',
  'Block-to-Counter Transition': 'Agree which ball allows the counterattack. Block with control until that trigger, move into position, then counter with a safe target and recover.',
  'Open Against Backspin Multiball': 'Feed consistent backspin first. The player opens with net clearance and depth, recovers fully, then progresses to mixed placement and spin.',
}

export const ADDITIONAL_TABLE_TENNIS_DRILLS = [
  {
    title: 'Backhand Chop Depth Control',
    skill: 'Backhand Chop',
    imageUrl: null,
    description: 'Alternate deep backhand chops to two targets while preserving low trajectory, controlled backspin, and recovery distance.',
    instructions: 'Begin with predictable topspin feeds to the backhand. Alternate deep middle and deep backhand targets, score ball height and depth, then add occasional forehand feeds.',
    durationMinutes: 10,
    steps: [
      { actor: 'partner', stroke: 'topspin', spin: 'topspin', fromZone: 'far_middle', targetZone: 'near_backhand' },
      { actor: 'player', stroke: 'backhand_chop', spin: 'backspin', fromZone: 'near_backhand', targetZone: 'far_backhand' },
      { actor: 'partner', stroke: 'topspin', spin: 'topspin', fromZone: 'far_middle', targetZone: 'near_backhand' },
      { actor: 'player', stroke: 'backhand_chop', spin: 'backspin', fromZone: 'near_backhand', targetZone: 'far_middle' },
    ],
  },
  {
    title: 'Forehand Loop Opening Progression',
    skill: 'Forehand Loop Against Backspin',
    imageUrl: null,
    description: 'Progress from a controlled forehand opening against fixed backspin to varied depth and a live follow-up block.',
    instructions: 'Start with fixed long backspin. Require safe net clearance and recovery, then vary placement and add one controlled block after the opening.',
    durationMinutes: 12,
    steps: [
      { actor: 'partner', stroke: 'push', spin: 'backspin', fromZone: 'far_backhand', targetZone: 'near_forehand' },
      { actor: 'player', stroke: 'forehand_loop', spin: 'topspin', fromZone: 'near_forehand', targetZone: 'far_backhand' },
      { actor: 'partner', stroke: 'block', spin: 'no_spin', fromZone: 'far_backhand', targetZone: 'near_middle' },
      { actor: 'player', stroke: 'forehand_drive', spin: 'topspin', fromZone: 'near_middle', targetZone: 'far_forehand' },
    ],
  },
  {
    title: 'Receive Decision Ladder',
    skill: 'Reading Serve Spin',
    imageUrl: null,
    description: 'Choose between short push, flick, or attacking long receive after reading serve length and spin under increasing uncertainty.',
    instructions: 'Use three stages: fixed short backspin, mixed short spin, then mixed short and long serves. Award points for the correct decision and controlled placement.',
    durationMinutes: 12,
    steps: [
      { actor: 'partner', stroke: 'serve', spin: 'variable', fromZone: 'far_backhand', targetZone: 'near_short_middle' },
      { actor: 'player', stroke: 'receive', spin: 'variable', fromZone: 'near_short_middle', targetZone: 'far_variable' },
    ],
  },
  {
    title: 'Ready Position Recovery Shadow',
    skill: 'Ready Position',
    imageUrl: null,
    description: 'Shadow a short movement-and-recovery sequence while returning to a balanced ready position after every imagined stroke.',
    instructions: 'Use slow, precise repetitions first. Call forehand, backhand, or short ball; move, shadow the stroke, recover, and freeze briefly to check balance.',
    durationMinutes: 6,
    steps: [
      { actor: 'player', stroke: 'ready_position', spin: 'no_spin', fromZone: 'near_middle', targetZone: 'near_middle' },
      { actor: 'player', stroke: 'shadow_stroke', spin: 'no_spin', fromZone: 'near_middle', targetZone: 'near_forehand' },
      { actor: 'player', stroke: 'recovery', spin: 'no_spin', fromZone: 'near_forehand', targetZone: 'near_middle' },
    ],
  },
] as const
