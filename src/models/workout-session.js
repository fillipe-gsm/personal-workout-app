import { uid } from './id.js'
import { WorkoutSessionExercise } from './workout-session-exercise.js'

/**
 * A workout performed on a given day (`workout_session` table). It groups the
 * exercises trained together, which is what the app's "Conclude workout" flow
 * conceptually represents. `planName` is a snapshot: deleting or renaming a
 * plan must not rewrite history.
 */
export class WorkoutSession {
  constructor({
    id = uid(),
    performedOn,
    planId = null,
    planName = null,
    programId = null,
    programName = null,
    note = null,
    exercises = [],
    createdAt,
    updatedAt,
    deletedAt = null
  } = {}) {
    this.id = id
    this.performedOn = performedOn ?? new Date().toISOString().slice(0, 10)
    this.planId = planId
    this.planName = planName
    this.programId = programId
    this.programName = programName
    this.note = note ?? null
    this.exercises = exercises
      .map((e, i) =>
        e instanceof WorkoutSessionExercise
          ? e
          : WorkoutSessionExercise.fromJSON({ position: i, ...e }, this.id)
      )
      .sort((a, b) => a.position - b.position)
    this.exercises.forEach((e) => e.attachSession(this))
    this.createdAt = createdAt ?? new Date().toISOString()
    this.updatedAt = updatedAt ?? this.createdAt
    this.deletedAt = deletedAt
  }

  static fromJSON(raw) {
    return new WorkoutSession(raw)
  }

  addExercise(exerciseId, { planEntryId = null, setScheme, trainingWeightKg = null, note = null, sets = [] } = {}) {
    const entry = new WorkoutSessionExercise({
      sessionId: this.id,
      exerciseId,
      planEntryId,
      position: this.exercises.length,
      setScheme,
      trainingWeightKg,
      note,
      sets
    }).attachSession(this)
    this.exercises.push(entry)
    return entry
  }

  findExercise(exerciseId) {
    return this.exercises.find((e) => e.exerciseId === exerciseId)
  }

  findExerciseById(id) {
    return this.exercises.find((e) => e.id === id)
  }

  toJSON() {
    return {
      id: this.id,
      performedOn: this.performedOn,
      planId: this.planId,
      planName: this.planName,
      programId: this.programId,
      programName: this.programName,
      note: this.note,
      exercises: this.exercises.map((e) => e.toJSON()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt
    }
  }
}
