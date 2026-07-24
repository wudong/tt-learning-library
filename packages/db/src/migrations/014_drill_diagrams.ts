import { sql, type Kysely } from 'kysely'
import type { Database } from '../schema/database'

export const id = '20260724_014'
export const name = 'drill_diagrams'

export async function up(db: Kysely<Database>) {
  await db.schema.alterTable('drills').addColumn('diagram_url', 'text').execute()
  await sql`
    update drills set diagram_url = case title
      when 'Forehand Crosscourt Consistency' then '/drills/forehand-crosscourt-consistency-v2.png'
      when 'Backhand Crosscourt Consistency' then '/drills/backhand-crosscourt-consistency.png'
      when 'Two-Point Forehand Footwork' then '/drills/two-point-forehand-footwork.png'
      when 'Forehand–Backhand Alternation' then '/drills/forehand-backhand-alternation.png'
      when 'Falkenberg Pattern' then '/drills/falkenberg-pattern.png'
      when 'Short Serve Target Practice' then '/drills/short-serve-target-practice.png'
      when 'Serve Variation Ladder' then '/drills/serve-variation-ladder.png'
      when 'Short Push Control' then '/drills/short-push-control.png'
      when 'Backhand Flick Receive' then '/drills/backhand-flick-receive.png'
      when 'Serve and Third-Ball Attack' then '/drills/serve-and-third-ball-attack.png'
      when 'Block-to-Counter Transition' then '/drills/block-to-counter-transition.png'
      when 'Open Against Backspin Multiball' then '/drills/open-against-backspin-multiball.png'
      else diagram_url
    end
    where is_system = 1
  `.execute(db)
}

export async function down(db: Kysely<Database>) {
  await db.schema.alterTable('drills').dropColumn('diagram_url').execute()
}
