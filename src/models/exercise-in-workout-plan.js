import { uid } from './id.js'
import { SetScheme } from './set-scheme.js'

/**
 * One exercise slot inside a plan (`exercise_in_workout_plan` table).
 * This is where the *effective* scheme for a program lives, so the same
 * exercise can be 5x5 in one plan and 3x5 in another.
 */
export class ExerciseInWorkoutPlan {
  constructor({ id = uid(), planId, exerciseId, position = 0, setScheme } = {}) {
    this.id = id
    this.planId = planId
    this.exerciseId = exerciseId
    this.position = Number.isFinite(position) ? position : 0
    this.setScheme = SetScheme.fromJSON(setScheme)
  }

  static fromJSON(raw, planId) {
    return new ExerciseInWorkoutPlan({ ...raw, planId: raw.planId ?? planId })
  }

  toJSON() {
    return {
      id: this.id,
      planId: this.planId,
      exerciseId: this.exerciseId,
      position: this.position,
      setScheme: this.setScheme.toJSON()
    }
  }
}
