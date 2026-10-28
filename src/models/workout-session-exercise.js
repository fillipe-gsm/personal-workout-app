import { uid } from './id.js'
import { SetScheme } from './set-scheme.js'
import { WorkoutSet } from './workout-set.js'

/**
 * One exercise performed inside a session (`workout_session_exercise` table).
 * It snapshots the scheme and training weight that were actually used, so
 * editing a plan or an exercise later never rewrites history.
 */
export class WorkoutSessionExercise {
  constructor({
    id = uid(),
    sessionId,
    exerciseId,
    planEntryId = null,
    position = 0,
    setScheme,
    trainingWeightKg = null,
    note = null,
    sets = [],
    createdAt,
    updatedAt
  } = {}) {
    this.id = id
    this.sessionId = sessionId
    this.exerciseId = exerciseId
    this.planEntryId = planEntryId
    this.position = Number.isFinite(position) ? position : 0
    this.setScheme = SetScheme.fromJSON(setScheme)
    this.trainingWeightKg = trainingWeightKg == null ? null : Number(trainingWeightKg)
    this.note = note ?? null
    this.sets = sets
      .map((s, i) => (s instanceof WorkoutSet ? s : WorkoutSet.fromJSON(s, i)))
      .sort((a, b) => a.index - b.index)
    this.createdAt = createdAt ?? new Date().toISOString()
    this.updatedAt = updatedAt ?? this.createdAt
    // Back-reference for display (date/plan name); never serialized.
    Object.defineProperty(this, 'session', { value: null, writable: true, enumerable: false })
  }

  static fromJSON(raw, sessionId) {
    return new WorkoutSessionExercise({ ...raw, sessionId: raw.sessionId ?? sessionId })
  }

  attachSession(session) {
    this.session = session
    this.sessionId = session?.id ?? this.sessionId
    return this
  }

  /** ISO day (YYYY-MM-DD) of the session, used by the history views. */
  get date() {
    return this.session?.performedOn ?? null
  }

  get planName() {
    return this.session?.planName ?? null
  }

  /** Heaviest non-warm-up set weight, used to label a history record. */
  get trainingWeightKgValue() {
    return this.sets.find((s) => s.type !== 'warmup')?.weightKg ?? this.trainingWeightKg
  }

  replaceSets(sets) {
    this.sets = sets
      .map((s, i) => (s instanceof WorkoutSet ? s : WorkoutSet.fromJSON(s, i)))
      .sort((a, b) => a.index - b.index)
    this.updatedAt = new Date().toISOString()
  }

  toJSON() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      exerciseId: this.exerciseId,
      planEntryId: this.planEntryId,
      position: this.position,
      setScheme: this.setScheme.toJSON(),
      trainingWeightKg: this.trainingWeightKg,
      note: this.note,
      sets: this.sets.map((s) => s.toJSON()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}
