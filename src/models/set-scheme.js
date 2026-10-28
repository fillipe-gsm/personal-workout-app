import { ExerciseSetScheme, SET_SCHEME_TYPES } from './enums.js'

export const DEFAULT_WARMUP_COUNT = 3
export const DEFAULT_WORK_SETS = 3
export const DEFAULT_TOTAL_REPS = 15

function intOr(value, min, fallback) {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n >= min ? n : fallback
}

/**
 * How an exercise (or a plan slot / logged session) prescribes its sets.
 * Corresponds to the `exercise_set_scheme` enum plus its numeric columns in
 * db_modeling/db_scheme.dbml.
 *
 *  fixedSets: { type, warmupCount, workSets }
 *  fixedReps: { type, warmupCount, totalReps }
 */
export class SetScheme {
  constructor({ type, warmupCount, workSets, totalReps } = {}) {
    this.type = SET_SCHEME_TYPES.includes(type) ? type : ExerciseSetScheme.FIXED_SETS
    this.warmupCount = intOr(warmupCount, 0, this.type === ExerciseSetScheme.FIXED_SETS ? DEFAULT_WARMUP_COUNT : 0)
    if (this.type === ExerciseSetScheme.FIXED_REPS) {
      this.totalReps = intOr(totalReps, 1, DEFAULT_TOTAL_REPS)
    } else {
      this.workSets = intOr(workSets, 1, DEFAULT_WORK_SETS)
    }
  }

  /**
   * Accepts a stored scheme object, or a legacy `tier` string
   * ('main' | 'accessory' | 'fixedSets' | 'fixedReps') for migration:
   * main → 3 warm-ups + 3 work sets; accessory → 0 warm-ups + 15 total reps.
   */
  static fromJSON(raw, legacyTier) {
    if (raw instanceof SetScheme) return new SetScheme(raw.toJSON())
    const source = raw && typeof raw === 'object' ? raw : {}
    let type = source.type
    if (!SET_SCHEME_TYPES.includes(type)) {
      type = SET_SCHEME_TYPES.includes(legacyTier)
        ? legacyTier
        : legacyTier === 'accessory'
          ? ExerciseSetScheme.FIXED_REPS
          : ExerciseSetScheme.FIXED_SETS
    }
    return new SetScheme({ ...source, type })
  }

  static default(type = ExerciseSetScheme.FIXED_SETS) {
    return new SetScheme({ type })
  }

  get isFixedSets() {
    return this.type === ExerciseSetScheme.FIXED_SETS
  }

  get isFixedReps() {
    return this.type === ExerciseSetScheme.FIXED_REPS
  }

  /** Number that the scheme storage column represents (workSets or totalReps). */
  get value() {
    return this.isFixedReps ? this.totalReps : this.workSets
  }

  withValue(value) {
    return this.isFixedReps
      ? new SetScheme({ type: this.type, warmupCount: this.warmupCount, totalReps: value })
      : new SetScheme({ type: this.type, warmupCount: this.warmupCount, workSets: value })
  }

  copy() {
    return SetScheme.fromJSON(this)
  }

  /** Short human-readable summary used in badges. */
  describe() {
    const warmups = this.warmupCount > 0 ? ` + ${this.warmupCount} WU` : ''
    return this.isFixedReps ? `${this.totalReps} total reps${warmups}` : `${this.workSets} work sets${warmups}`
  }

  toJSON() {
    return this.isFixedReps
      ? { type: this.type, warmupCount: this.warmupCount, totalReps: this.totalReps }
      : { type: this.type, warmupCount: this.warmupCount, workSets: this.workSets }
  }
}
