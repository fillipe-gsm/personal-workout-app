import { uid } from './id.js'
import { normalizeEntitySource } from './enums.js'
import { ExerciseInWorkoutPlan } from './exercise-in-workout-plan.js'
import { SetScheme } from './set-scheme.js'

/**
 * A workout program (`workout_plan` table) holding ordered exercise slots.
 * Legacy JSON stored only `exerciseIds`; fromJSON migrates those into slots
 * using each exercise's default scheme.
 *
 * Plans can be created by the user or installed from a cookie-cutter template
 * (`source: 'template'` + `templateKey`/`templateVersion` provenance).
 */
export class WorkoutPlan {
  constructor({
    id = uid(),
    name = '',
    description = '',
    source,
    templateKey = null,
    programId = null,
    position = 0,
    entries = [],
    createdAt,
    updatedAt,
    deletedAt = null
  } = {}) {
    this.id = id
    this.name = String(name).trim()
    this.description = description == null ? '' : String(description)
    this.source = normalizeEntitySource(source)
    this.templateKey = templateKey ?? null
    this.programId = programId ?? null
    this.position = Number.isFinite(position) ? position : 0
    this.entries = entries
      .map((e) => (e instanceof ExerciseInWorkoutPlan ? e : ExerciseInWorkoutPlan.fromJSON(e, this.id)))
      .sort((a, b) => a.position - b.position)
    this.createdAt = createdAt ?? new Date().toISOString()
    this.updatedAt = updatedAt ?? this.createdAt
    this.deletedAt = deletedAt
  }

  /**
   * @param {object} raw stored plan
   * @param {(exerciseId: string) => SetScheme|undefined} resolveDefaultScheme
   *   used to migrate legacy `exerciseIds` into plan slots
   */
  static fromJSON(raw, resolveDefaultScheme = () => undefined) {
    const entries = Array.isArray(raw.entries)
      ? raw.entries.map((e) => ExerciseInWorkoutPlan.fromJSON(e, raw.id)).sort((a, b) => a.position - b.position)
      : (raw.exerciseIds || []).map((exerciseId, position) =>
          new ExerciseInWorkoutPlan({
            planId: raw.id,
            exerciseId,
            position,
            setScheme: resolveDefaultScheme(exerciseId)
          })
        )
    return new WorkoutPlan({ ...raw, entries })
  }

  /** Compatibility view: ordered exercise ids (legacy API shape). */
  get exerciseIds() {
    return this.entries.map((e) => e.exerciseId)
  }

  getEntry(entryId) {
    return this.entries.find((e) => e.id === entryId)
  }

  findEntryForExercise(exerciseId) {
    return this.entries.find((e) => e.exerciseId === exerciseId)
  }

  addEntry(exerciseId, setScheme) {
    const entry = new ExerciseInWorkoutPlan({
      planId: this.id,
      exerciseId,
      position: this.entries.length,
      setScheme: setScheme ?? SetScheme.default()
    })
    this.entries.push(entry)
    return entry
  }

  removeEntry(entryId) {
    this.entries = this.entries.filter((e) => e.id !== entryId)
    this._resequence()
  }

  moveEntry(entryId, delta) {
    const index = this.entries.findIndex((e) => e.id === entryId)
    const target = index + delta
    if (index < 0 || target < 0 || target >= this.entries.length) return false
    const [entry] = this.entries.splice(index, 1)
    this.entries.splice(target, 0, entry)
    this._resequence()
    return true
  }

  _resequence() {
    this.entries.forEach((entry, i) => {
      entry.position = i
    })
  }

  get isFromTemplate() {
    return this.source === 'template'
  }

  get isStandalone() {
    return this.programId == null
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      source: this.source,
      templateKey: this.templateKey,
      programId: this.programId,
      position: this.position,
      entries: this.entries.map((e) => e.toJSON()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt
    }
  }
}
