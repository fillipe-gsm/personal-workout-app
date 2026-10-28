import {
  BENCH_PRESS,
  OVERHEAD_PRESS,
  INCLINE_DUMBBELL_BENCH_PRESS,
  TRICEPS_PUSHDOWN,
  OVERHEAD_TRICEPS_EXTENSION,
  DUMBBELL_LATERAL_RAISE,
  DEADLIFT,
  LAT_PULLDOWN,
  SEATED_CABLE_ROW,
  FACE_PULL,
  HAMMER_CURL,
  DUMBBELL_CURL,
  SQUAT,
  ROMANIAN_DEADLIFT,
  LEG_PRESS,
  SEATED_LEG_CURL,
  STANDING_CALF_RAISE,
  slot
} from './exercises.js'

/**
 * Reddit PPL (Metallicadpa) — 6-day Push/Pull/Legs.
 * https://www.reddit.com/r/Fitness/comments/37ylk5/a_linear_progression_based_ppl_program_for/
 *
 * Simplifications used for the app:
 *  - where the program lists alternatives (e.g. "Lat pulldown / Pull-up / Chin-up"),
 *    the first option is used; swap it in the plan if you prefer another.
 *  - main lifts alternate between sessions (bench/overhead press, deadlift/barbell row);
 *    this template includes the first option for each, and the plan descriptions say so.
 *  - AMRAP sets are not modelled; set counts include the AMRAP set.
 *  - rep ranges are not modelled.
 */
export const REDDIT_PPL = {
  key: 'reddit-ppl',
  name: 'Reddit PPL',
  version: 1,
  description:
    '6-day beginner Push/Pull/Legs with linear progression on main lifts. See more at https://www.reddit.com/r/Fitness/comments/37ylk5/a_linear_progression_based_ppl_program_for/.',
  exercises: [
    BENCH_PRESS,
    OVERHEAD_PRESS,
    INCLINE_DUMBBELL_BENCH_PRESS,
    TRICEPS_PUSHDOWN,
    OVERHEAD_TRICEPS_EXTENSION,
    DUMBBELL_LATERAL_RAISE,
    DEADLIFT,
    LAT_PULLDOWN,
    SEATED_CABLE_ROW,
    FACE_PULL,
    HAMMER_CURL,
    DUMBBELL_CURL,
    SQUAT,
    ROMANIAN_DEADLIFT,
    LEG_PRESS,
    SEATED_LEG_CURL,
    STANDING_CALF_RAISE
  ],
  plans: [
    {
      key: 'reddit-ppl-push',
      name: 'Reddit PPL Push',
      description:
        'Bench press as the main lift (alternates with the overhead press day). AMRAP sets are not modelled — use the last set for extra reps.',
      slots: [
        slot(BENCH_PRESS, 5),
        slot(OVERHEAD_PRESS, 3),
        slot(INCLINE_DUMBBELL_BENCH_PRESS, 3),
        slot(TRICEPS_PUSHDOWN, 3),
        slot(OVERHEAD_TRICEPS_EXTENSION, 3),
        slot(DUMBBELL_LATERAL_RAISE, 6)
      ]
    },
    {
      key: 'reddit-ppl-pull',
      name: 'Reddit PPL Pull',
      description:
        'Deadlift as the main lift (alternates with the barbell row day). First options chosen for Lat pulldown / Seated cable row.',
      slots: [
        slot(DEADLIFT),
        slot(LAT_PULLDOWN, 3),
        slot(SEATED_CABLE_ROW, 3),
        slot(FACE_PULL, 5),
        slot(HAMMER_CURL, 4),
        slot(DUMBBELL_CURL, 4)
      ]
    },
    {
      key: 'reddit-ppl-legs',
      name: 'Reddit PPL Legs',
      description: 'Squat-focused leg day, repeated twice a week in the program.',
      slots: [
        slot(SQUAT, 3),
        slot(ROMANIAN_DEADLIFT, 3),
        slot(LEG_PRESS, 3),
        slot(SEATED_LEG_CURL, 3),
        slot(STANDING_CALF_RAISE, 5)
      ]
    }
  ]
}
