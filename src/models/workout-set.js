import { uid } from './id.js'
import { SET_TYPES, SetType } from './enums.js'

/**
 * One executed set (`workout_set` table). Warm-ups are just sets with
 * `type: 'warmup'`; there is no separate list.
 */
export class WorkoutSet {
  constructor({ id = uid(), index = 0, type = SetType.WORKING, weightKg = 0, reps = null, rpe = null, note = null } = {}) {
    this.id = id
    this.index = Number.isFinite(index) ? index : 0
    this.type = SET_TYPES.includes(type) ? type : SetType.WORKING
    this.weightKg = Number(weightKg)
    this.reps = reps == null ? null : Math.floor(Number(reps))
    this.rpe = rpe == null ? null : Number(rpe)
    this.note = note ?? null
  }

  static fromJSON(raw, index = 0) {
    return new WorkoutSet({ ...raw, index: raw.index ?? index })
  }

  get isWarmup() {
    return this.type === SetType.WARMUP
  }

  toJSON() {
    return {
      id: this.id,
      index: this.index,
      type: this.type,
      weightKg: this.weightKg,
      reps: this.reps,
      rpe: this.rpe,
      note: this.note
    }
  }
}
