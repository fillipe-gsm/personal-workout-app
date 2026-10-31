/**
 * Domain model layer (the "M" in the app's lightweight MVC split).
 * Each class maps to a table in db_modeling/db_scheme.dbml:
 *
 *   Exercise               → exercise
 *   WorkoutProgram         → workout_program
 *   WorkoutPlan            → workout_plan
 *   ExerciseInWorkoutPlan  → exercise_in_workout_plan (plan slot + its scheme)
 *   WorkoutSession         → workout_session
 *   WorkoutSessionExercise → workout_session_exercise (scheme/weight snapshot)
 *   WorkoutSet             → workout_set
 *   WeightProfile          → weight_profile
 *   WeightPlate            → weight_plate
 *   SetScheme              → the exercise_set_scheme enum + numeric columns
 *
 * All models are plain JS: no DOM, no storage. Persistence lives in store.js.
 */

export { uid } from './id.js'
export * from './enums.js'
export { SetScheme, DEFAULT_WARMUP_COUNT, DEFAULT_WORK_SETS, DEFAULT_TOTAL_REPS } from './set-scheme.js'
export { Exercise } from './exercise.js'
export { WeightPlate } from './weight-plate.js'
export { WeightProfile } from './weight-profile.js'
export { ExerciseInWorkoutPlan } from './exercise-in-workout-plan.js'
export { WorkoutPlan } from './workout-plan.js'
export { WorkoutProgram } from './workout-program.js'
export { WorkoutSet } from './workout-set.js'
export { WorkoutSessionExercise } from './workout-session-exercise.js'
export { WorkoutSession } from './workout-session.js'
