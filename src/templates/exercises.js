/**
 * Shared exercise catalog for cookie-cutter templates.
 *
 * Why this exists: templates used to repeat exercise names, categories and
 * schemes, which made them drift apart (Squat / Squats / Barbell Squat...).
 * Every template now imports these canonical entries, so names stay identical
 * and installing several templates reuses the same exercises.
 *
 * Naming convention: sentence case — only the first letter capitalised
 * (proper nouns/acronyms aside), e.g. "Barbell bench press", "One-arm dumbbell row".
 *
 * Warm-up convention (not all source programs specify them):
 *  - 3 warm-ups for heavy barbell compounds (4 for deadlift)
 *  - 1 warm-up for secondary compounds / machine compounds
 *  - 0 warm-ups for isolation work
 * These are only defaults; per-plan slots override set counts below.
 */

const exercise = (name, category, warmupCount = 0, workSets = 3) => ({
  name,
  category,
  setScheme: { type: 'fixedSets', warmupCount, workSets }
})

/** A plan slot: exercise referenced by canonical name + its prescription. */
export function slot(exerciseSpec, workSets, warmupCount) {
  const base = exerciseSpec.setScheme
  return {
    exercise: exerciseSpec.name,
    setScheme: {
      type: 'fixedSets',
      warmupCount: warmupCount ?? base.warmupCount,
      workSets: workSets ?? base.workSets
    }
  }
}

// --- Barbell ---------------------------------------------------------------

export const SQUAT = exercise('Squat', 'Barbell', 3, 3)
export const FRONT_SQUAT = exercise('Front squat', 'Barbell', 3, 3)
export const BENCH_PRESS = exercise('Bench press', 'Barbell', 3, 3)
export const INCLINE_BENCH_PRESS = exercise('Incline bench press', 'Barbell', 1, 3)
export const OVERHEAD_PRESS = exercise('Overhead press', 'Barbell', 3, 3)
export const DEADLIFT = exercise('Deadlift', 'Barbell', 4, 1)
export const ROMANIAN_DEADLIFT = exercise('Romanian deadlift', 'Barbell', 1, 3)
export const BARBELL_ROW = exercise('Barbell row', 'Barbell', 3, 3)
export const BARBELL_LUNGE = exercise('Barbell lunge', 'Barbell', 1, 3)
export const BARBELL_CURL = exercise('Barbell curl', 'Barbell', 0, 3)

// --- Dumbbell --------------------------------------------------------------

export const INCLINE_DUMBBELL_BENCH_PRESS = exercise('Incline dumbbell bench press', 'Dumbbell', 1, 3)
export const DUMBBELL_FLY = exercise('Dumbbell fly', 'Dumbbell', 0, 3)
export const ONE_ARM_DUMBBELL_ROW = exercise('One-arm dumbbell row', 'Dumbbell', 1, 3)
export const DUMBBELL_LATERAL_RAISE = exercise('Dumbbell lateral raise', 'Dumbbell', 0, 3)
export const DUMBBELL_CURL = exercise('Dumbbell curl', 'Dumbbell', 0, 3)
export const HAMMER_CURL = exercise('Hammer curl', 'Dumbbell', 0, 3)
export const INCLINE_DUMBBELL_CURL = exercise('Incline dumbbell curl', 'Dumbbell', 0, 3)
export const SKULLCRUSHER = exercise('Skullcrusher', 'Dumbbell', 0, 3)
export const OVERHEAD_TRICEPS_EXTENSION = exercise('Overhead triceps extension', 'Dumbbell', 0, 3)

// --- Machine / cable -------------------------------------------------------

export const LAT_PULLDOWN = exercise('Lat pulldown', 'Machine', 1, 3)
export const SEATED_CABLE_ROW = exercise('Seated cable row', 'Machine', 1, 3)
export const FACE_PULL = exercise('Face pull', 'Machine', 0, 3)
export const TRICEPS_PUSHDOWN = exercise('Triceps pushdown', 'Machine', 0, 3)
export const CABLE_TRICEPS_EXTENSION = exercise('Cable triceps extension', 'Machine', 0, 3)
export const LEG_PRESS = exercise('Leg press', 'Machine', 1, 3)
export const LEG_EXTENSION = exercise('Leg extension', 'Machine', 0, 3)
export const LEG_CURL = exercise('Leg curl', 'Machine', 0, 3)
export const SEATED_LEG_CURL = exercise('Seated leg curl', 'Machine', 0, 3)
export const STANDING_CALF_RAISE = exercise('Standing calf raise', 'Machine', 0, 3)
export const SEATED_CALF_RAISE = exercise('Seated calf raise', 'Machine', 0, 3)
export const CALF_PRESS = exercise('Calf press', 'Machine', 0, 3)

// --- Bodyweight ------------------------------------------------------------

export const CHIN_UP = exercise('Chin-up', 'Bodyweight', 0, 3)
