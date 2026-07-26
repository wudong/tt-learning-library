import {
  TrainingProfileRepository,
  TrainingRepository,
  type Database,
  type Row,
} from '@ttll/db'
import type {
  CompleteTrainingSessionRequest,
  CreateTrainingSessionRequest,
  ReplaceRemainingBlocksRequest,
  TrainingProfileDto,
  TrainingSessionDetailDto,
} from '@ttll/shared'
import type { Kysely } from 'kysely'
import { TrainingService } from './trainingService'

type Conn = Kysely<Database>
type ProfileRow = Row<'training_profiles'>

const elapsedSeconds = (startedAt: string | null, nowMs = Date.now()) =>
  startedAt ? Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 1000)) : 0

function assertDateRange(from: string, to: string, maxDays: number) {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error('VALIDATION_ERROR: Invalid date range')
  if ((end - start) / 86_400_000 > maxDays) throw new Error(`VALIDATION_ERROR: Date range cannot exceed ${maxDays + 1} days`)
}

export class ProfiledTrainingService {
  constructor(private readonly db: Conn) {}

  async listProfiles(userId: string) {
    const repository = new TrainingProfileRepository(this.db)
    await repository.getOrCreateSelf(userId)
    const profiles = await repository.list(userId)
    return profiles
      .sort((a, b) => Number(b.profile_type === 'self') - Number(a.profile_type === 'self') || a.display_name.localeCompare(b.display_name))
      .map((profile) => this.presentProfile(profile))
  }

  async createProfile(userId: string, input: { displayName: string }) {
    const repository = new TrainingProfileRepository(this.db)
    await repository.getOrCreateSelf(userId)
    const displayName = input.displayName.trim()
    const profiles = await repository.list(userId)
    if (profiles.length >= 100) throw new Error('VALIDATION_ERROR: Training profile limit reached')
    if (profiles.some((profile) => profile.display_name.localeCompare(displayName, undefined, { sensitivity: 'accent' }) === 0)) {
      throw new Error('CONFLICT: A training profile with this name already exists')
    }
    return this.presentProfile(await repository.createPlayer(userId, displayName))
  }

  async updateProfile(userId: string, profileId: string, input: { displayName: string }) {
    const repository = new TrainingProfileRepository(this.db)
    const current = await repository.get(userId, profileId)
    if (!current) throw new Error('NOT_FOUND: Training profile not found')
    const displayName = input.displayName.trim()
    const profiles = await repository.list(userId)
    if (profiles.some((profile) => profile.id !== profileId && profile.display_name.localeCompare(displayName, undefined, { sensitivity: 'accent' }) === 0)) {
      throw new Error('CONFLICT: A training profile with this name already exists')
    }
    return this.presentProfile(await repository.rename(userId, profileId, displayName))
  }

  async deleteProfile(userId: string, profileId: string) {
    const repository = new TrainingProfileRepository(this.db)
    const profile = await repository.get(userId, profileId)
    if (!profile) throw new Error('NOT_FOUND: Training profile not found')
    if (profile.profile_type === 'self') throw new Error('CONFLICT: Your personal training profile cannot be removed')
    if (await repository.hasSessions(userId, profileId)) {
      throw new Error('CONFLICT: Remove this player’s training sessions before deleting the profile')
    }
    await repository.softDelete(userId, profileId)
    return { deleted: true as const }
  }

  async createSession(userId: string, input: CreateTrainingSessionRequest) {
    const profiles = new TrainingProfileRepository(this.db)
    const profile = await profiles.resolve(userId, input.profileId)
    const baseInput: CreateTrainingSessionRequest = { ...input }
    delete baseInput.profileId
    const service = new TrainingService(this.db)
    const created = await service.createSession(userId, baseInput)
    try {
      await profiles.setSessionProfile(userId, created.session.id, profile.id)
    } catch (error) {
      await service.deleteSession(userId, created.session.id).catch(() => undefined)
      throw error
    }
    return this.attachProfile(created, profile)
  }

  async getSession(userId: string, sessionId: string) {
    const detail = await new TrainingService(this.db).getSession(userId, sessionId)
    const profile = await new TrainingProfileRepository(this.db).getForSession(userId, sessionId)
    return this.attachProfile(detail, profile)
  }

  async listSessions(userId: string, from: string, to: string, profileId?: string) {
    assertDateRange(from, to, 61)
    const profiles = new TrainingProfileRepository(this.db)
    const profile = await profiles.resolve(userId, profileId)
    const rows = await profiles.listSessionRows(userId, from, to, profile)
    const visible = new Set(rows.map((row) => row.id))
    const sessions = await new TrainingService(this.db).listSessions(userId, from, to)
    return sessions
      .filter((session) => visible.has(session.id))
      .map((session) => ({
        ...session,
        profileId: profile.id,
        profile: this.presentProfile(profile),
      }))
  }

  async updateSession(userId: string, sessionId: string, patch: { scheduledDate?: string; timeZone?: string; title?: string }) {
    const detail = await new TrainingService(this.db).updateSession(userId, sessionId, patch)
    return this.attachProfileForSession(userId, sessionId, detail)
  }

  async copySession(userId: string, sessionId: string, input: { profileId?: string; scheduledDate: string; timeZone: string; title?: string }) {
    const profiles = new TrainingProfileRepository(this.db)
    const profile = input.profileId
      ? await profiles.resolve(userId, input.profileId)
      : await profiles.getForSession(userId, sessionId)
    const baseInput = { ...input }
    delete baseInput.profileId
    const service = new TrainingService(this.db)
    const copied = await service.copySession(userId, sessionId, baseInput)
    try {
      await profiles.setSessionProfile(userId, copied.session.id, profile.id)
    } catch (error) {
      await service.deleteSession(userId, copied.session.id).catch(() => undefined)
      throw error
    }
    return this.attachProfile(copied, profile)
  }

  async replaceRemainingBlocks(userId: string, sessionId: string, input: ReplaceRemainingBlocksRequest) {
    const detail = await new TrainingService(this.db).replaceRemainingBlocks(userId, sessionId, input)
    return this.attachProfileForSession(userId, sessionId, detail)
  }

  async startSession(userId: string, sessionId: string) {
    const detail = await new TrainingService(this.db).startSession(userId, sessionId)
    return this.attachProfileForSession(userId, sessionId, detail)
  }

  async transitionBlock(
    userId: string,
    sessionId: string,
    blockId: string,
    action: 'start'|'pause'|'resume'|'complete'|'skip'|'add_time',
    additionalSeconds?: number,
  ) {
    const detail = await new TrainingService(this.db).transitionBlock(userId, sessionId, blockId, action, additionalSeconds)
    return this.attachProfileForSession(userId, sessionId, detail)
  }

  async completeSession(userId: string, sessionId: string, input: CompleteTrainingSessionRequest) {
    const detail = await new TrainingService(this.db).completeSession(userId, sessionId, input)
    return this.attachProfileForSession(userId, sessionId, detail)
  }

  async deleteSession(userId: string, sessionId: string) {
    return new TrainingService(this.db).deleteSession(userId, sessionId)
  }

  async getPracticeOptions(userId: string, skillId: string) {
    return new TrainingService(this.db).getPracticeOptions(userId, skillId)
  }

  async getInsights(userId: string, from: string, to: string, profileId?: string) {
    assertDateRange(from, to, 365)
    const profiles = new TrainingProfileRepository(this.db)
    const profile = await profiles.resolve(userId, profileId)
    const sessions = (await profiles.listSessionRows(userId, from, to, profile)).filter((session) => session.status !== 'cancelled')
    const repository = new TrainingRepository(this.db)
    const blocks = await repository.listBlocksForSessions(userId, sessions.map((session) => session.id))
    const checkins = await repository.listCheckinsForSessions(userId, sessions.map((session) => session.id))
    const references = await repository.getReferences(userId, blocks)
    const skills = new Map(references.skills.map((skill) => [skill.id, skill]))
    const sessionById = new Map(sessions.map((session) => [session.id, session]))
    const actualFor = (block: Row<'practice_session_blocks'>) => block.actual_duration_seconds + (block.status === 'active' ? elapsedSeconds(block.timer_started_at) : 0)
    const actualDurationSeconds = blocks.reduce((total, block) => total + actualFor(block), 0)
    const plannedDurationSeconds = blocks.reduce((total, block) => total + (block.planned_duration_seconds ?? 0), 0)
    const activeDates = new Set(blocks.filter((block) => actualFor(block) > 0).map((block) => sessionById.get(block.session_id)?.scheduled_date).filter(Boolean))
    const skillRows = new Map<string, { actual: number; planned: number; ratings: Array<{ rating: number; at: string }> }>()

    for (const block of blocks) {
      const row = skillRows.get(block.skill_id) ?? { actual: 0, planned: 0, ratings: [] }
      row.actual += actualFor(block)
      row.planned += block.planned_duration_seconds ?? 0
      skillRows.set(block.skill_id, row)
    }

    for (const checkin of checkins) {
      if (checkin.confidence_rating === null) continue
      const row = skillRows.get(checkin.skill_id) ?? { actual: 0, planned: 0, ratings: [] }
      const session = sessionById.get(checkin.session_id)
      row.ratings.push({ rating: checkin.confidence_rating, at: session?.completed_at ?? checkin.created_at })
      skillRows.set(checkin.skill_id, row)
    }

    return {
      profile: this.presentProfile(profile),
      from,
      to,
      trainingDays: activeDates.size,
      actualDurationSeconds,
      plannedDurationSeconds,
      completedPlannedSessions: sessions.filter((session) => session.entry_mode === 'planned' && session.status === 'completed').length,
      plannedSessions: sessions.filter((session) => session.entry_mode === 'planned').length,
      skills: [...skillRows.entries()].map(([skillId, row]) => {
        row.ratings.sort((a, b) => a.at.localeCompare(b.at))
        return {
          skillId,
          skillName: skills.get(skillId)?.name ?? 'Unknown skill',
          actualDurationSeconds: row.actual,
          plannedDurationSeconds: row.planned,
          latestConfidenceRating: row.ratings.at(-1)?.rating ?? null,
          previousConfidenceRating: row.ratings.at(-2)?.rating ?? null,
        }
      }).sort((a, b) => b.actualDurationSeconds - a.actualDurationSeconds || a.skillName.localeCompare(b.skillName)),
    }
  }

  private async attachProfileForSession(userId: string, sessionId: string, detail: TrainingSessionDetailDto) {
    const profile = await new TrainingProfileRepository(this.db).getForSession(userId, sessionId)
    return this.attachProfile(detail, profile)
  }

  private attachProfile(detail: TrainingSessionDetailDto, profile: ProfileRow): TrainingSessionDetailDto {
    return {
      ...detail,
      session: {
        ...detail.session,
        profileId: profile.id,
        profile: this.presentProfile(profile),
      },
    }
  }

  private presentProfile(profile: ProfileRow): TrainingProfileDto {
    return {
      id: profile.id,
      displayName: profile.display_name,
      isSelf: profile.profile_type === 'self',
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    }
  }
}
