import { SQUAT, BENCH_PRESS, BARBELL_ROW, OVERHEAD_PRESS, DEADLIFT, slot } from './exercises.js'

/**
 * Stronglifts 5x5 — https://stronglifts.com/stronglifts-5x5/
 * Two alternating full-body workouts. Deadlift has fewer warm-up/work sets.
 */
export const STRONGLIFTS_5X5 = {
  key: 'stronglifts-5x5',
  name: 'Stronglifts 5×5',
  version: 1,
  description:
    "Popular barbell based beginner's workout. See more at https://stronglifts.com/stronglifts-5x5/.",
  exercises: [SQUAT, BENCH_PRESS, BARBELL_ROW, OVERHEAD_PRESS, DEADLIFT],
  plans: [
    {
      key: 'stronglifts-a',
      name: 'Stronglifts A',
      description: 'Workout A — Squat, Bench press, Barbell row.',
      slots: [slot(SQUAT, 5), slot(BENCH_PRESS, 5), slot(BARBELL_ROW, 5)]
    },
    {
      key: 'stronglifts-b',
      name: 'Stronglifts B',
      description: 'Workout B — Squat, Overhead press, Deadlift.',
      slots: [slot(SQUAT, 5), slot(OVERHEAD_PRESS, 5), slot(DEADLIFT)]
    }
  ]
}
