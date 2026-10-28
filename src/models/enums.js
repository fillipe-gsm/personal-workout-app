// Domain enums. Values match the JSON stored in localStorage (camelCase)
// and map 1:1 onto the DBML enums in db_modeling/db_scheme.dbml, whose SQL
// names are snake_case (barbell, fixed_sets, warmup, ...).

export const ExerciseCategory = Object.freeze({
  BARBELL: 'Barbell',
  BODYWEIGHT: 'Bodyweight',
  DUMBBELL: 'Dumbbell',
  MACHINE: 'Machine'
})

export const EXERCISE_CATEGORIES = Object.values(ExerciseCategory)

const CATEGORY_ALIASES = { Dumbbel: 'Dumbbell' }

export function normalizeCategory(category) {
  const value = CATEGORY_ALIASES[category] || category
  return EXERCISE_CATEGORIES.includes(value) ? value : ExerciseCategory.BARBELL
}

export const ExerciseSetScheme = Object.freeze({
  FIXED_SETS: 'fixedSets',
  FIXED_REPS: 'fixedReps'
})

export const SET_SCHEME_TYPES = Object.values(ExerciseSetScheme)

export const SET_SCHEME_LABELS = Object.freeze({
  fixedSets: 'Fixed sets',
  fixedReps: 'Fixed reps'
})

export const SetType = Object.freeze({
  WARMUP: 'warmup',
  WORKING: 'working',
  EXTRA: 'extra'
})

export const SET_TYPES = Object.values(SetType)

/** Provenance of a row: created by the user or installed from a template. */
export const EntitySource = Object.freeze({
  USER: 'user',
  TEMPLATE: 'template'
})

export const ENTITY_SOURCES = Object.values(EntitySource)

export function normalizeEntitySource(source) {
  return ENTITY_SOURCES.includes(source) ? source : EntitySource.USER
}
