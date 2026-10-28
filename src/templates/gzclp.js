import {
  SQUAT,
  BENCH_PRESS,
  OVERHEAD_PRESS,
  DEADLIFT,
  BARBELL_ROW,
  LAT_PULLDOWN,
  slot
} from './exercises.js'

/**
 * GZCLP — linear progression variant of the GZCL method (4 days, A1/B1/A2/B2).
 * https://liftvault.com/programs/powerlifting/gzclp-program-spreadsheets/
 *
 * T1/T2/T3 refer to the GZCL tiers. Their rep schemes change over the weeks
 * (e.g. T1 5x3, then 6x2, then 10x1); the app does not model that progression,
 * so only the number of sets is encoded here — pick the reps when you train.
 */
export const GZCLP = {
  key: 'gzclp',
  name: 'GZCLP',
  version: 1,
  description:
    'Linear progression variant of the GZCL method: one heavy T1 lift, one T2 compound and one T3 accessory per day. See more at https://liftvault.com/programs/powerlifting/gzclp-program-spreadsheets/.',
  exercises: [SQUAT, BENCH_PRESS, OVERHEAD_PRESS, DEADLIFT, BARBELL_ROW, LAT_PULLDOWN],
  plans: [
    {
      key: 'gzclp-a1',
      name: 'GZCLP A1',
      description: 'T1 Squat 5×3, T2 Bench press 3×10, T3 Lat pulldown 3×15+. Reps are not modelled.',
      slots: [slot(SQUAT, 5), slot(BENCH_PRESS, 3, 1), slot(LAT_PULLDOWN, 3, 0)]
    },
    {
      key: 'gzclp-b1',
      name: 'GZCLP B1',
      description: 'T1 Overhead press 5×3, T2 Deadlift 3×10, T3 Barbell row 3×15+. Reps are not modelled.',
      slots: [slot(OVERHEAD_PRESS, 5), slot(DEADLIFT, 3, 1), slot(BARBELL_ROW, 3, 0)]
    },
    {
      key: 'gzclp-a2',
      name: 'GZCLP A2',
      description: 'T1 Bench press 5×3, T2 Squat 3×10, T3 Lat pulldown 3×15+. Reps are not modelled.',
      slots: [slot(BENCH_PRESS, 5), slot(SQUAT, 3, 1), slot(LAT_PULLDOWN, 3, 0)]
    },
    {
      key: 'gzclp-b2',
      name: 'GZCLP B2',
      description: 'T1 Deadlift 5×3, T2 Overhead press 3×10, T3 Barbell row 3×15+. Reps are not modelled.',
      slots: [slot(DEADLIFT, 5), slot(OVERHEAD_PRESS, 3, 1), slot(BARBELL_ROW, 3, 0)]
    }
  ]
}
