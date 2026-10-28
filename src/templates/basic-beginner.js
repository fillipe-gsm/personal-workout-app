import { BARBELL_ROW, BENCH_PRESS, SQUAT, CHIN_UP, OVERHEAD_PRESS, DEADLIFT, slot } from './exercises.js'

/**
 * r/Fitness Basic Beginner Routine (a.k.a. Phrak's GSLP-like beginner routine).
 * https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/
 *
 * Three full-body days a week alternating A/B. Every lift is 3x5+, last set AMRAP;
 * AMRAP is not modelled, so 3 working sets are encoded.
 */
export const BASIC_BEGINNER = {
  key: 'rfitness-basic-beginner',
  name: 'r/Fitness Basic Beginner',
  version: 1,
  description:
    "r/Fitness full-body, barbell based beginner's routine. See more at https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/.",
  exercises: [BARBELL_ROW, BENCH_PRESS, SQUAT, CHIN_UP, OVERHEAD_PRESS, DEADLIFT],
  plans: [
    {
      key: 'basic-beginner-a',
      name: 'Basic Beginner A',
      description: 'Barbell row, bench press and squat — 3×5+ each (last set AMRAP, not modelled).',
      slots: [slot(BARBELL_ROW, 3), slot(BENCH_PRESS, 3), slot(SQUAT, 3)]
    },
    {
      key: 'basic-beginner-b',
      name: 'Basic Beginner B',
      description:
        'Chin-up, overhead press and deadlift — 3×5+ each. First option chosen for "chin-ups or equivalent".',
      slots: [slot(CHIN_UP, 3), slot(OVERHEAD_PRESS, 3), slot(DEADLIFT, 3)]
    }
  ]
}
