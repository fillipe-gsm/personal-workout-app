import {
  BENCH_PRESS,
  INCLINE_BENCH_PRESS,
  INCLINE_DUMBBELL_BENCH_PRESS,
  BARBELL_ROW,
  BARBELL_CURL,
  BARBELL_LUNGE,
  SQUAT,
  FRONT_SQUAT,
  DEADLIFT,
  OVERHEAD_PRESS,
  SKULLCRUSHER,
  DUMBBELL_FLY,
  ONE_ARM_DUMBBELL_ROW,
  DUMBBELL_LATERAL_RAISE,
  INCLINE_DUMBBELL_CURL,
  CABLE_TRICEPS_EXTENSION,
  SEATED_CABLE_ROW,
  LAT_PULLDOWN,
  LEG_PRESS,
  LEG_EXTENSION,
  LEG_CURL,
  STANDING_CALF_RAISE,
  SEATED_CALF_RAISE,
  CALF_PRESS,
  slot
} from './exercises.js'

/**
 * PHUL — Power Hypertrophy Upper Lower (4 days).
 * https://www.muscleandstrength.com/workouts/phul-workout
 *
 * Rep ranges from the source are not modelled by the app; per the template
 * convention we take the lower bound of each set range (the user can add sets).
 */
export const PHUL = {
  key: 'phul',
  name: 'PHUL',
  version: 1,
  description:
    'Power Hypertrophy Upper Lower: two power days and two hypertrophy days. See more at https://www.muscleandstrength.com/workouts/phul-workout.',
  exercises: [
    BENCH_PRESS,
    INCLINE_DUMBBELL_BENCH_PRESS,
    BARBELL_ROW,
    LAT_PULLDOWN,
    OVERHEAD_PRESS,
    BARBELL_CURL,
    SKULLCRUSHER,
    SQUAT,
    DEADLIFT,
    LEG_PRESS,
    LEG_CURL,
    STANDING_CALF_RAISE,
    INCLINE_BENCH_PRESS,
    DUMBBELL_FLY,
    SEATED_CABLE_ROW,
    ONE_ARM_DUMBBELL_ROW,
    DUMBBELL_LATERAL_RAISE,
    INCLINE_DUMBBELL_CURL,
    CABLE_TRICEPS_EXTENSION,
    FRONT_SQUAT,
    BARBELL_LUNGE,
    LEG_EXTENSION,
    SEATED_CALF_RAISE,
    CALF_PRESS
  ],
  plans: [
    {
      key: 'phul-upper-power',
      name: 'PHUL Upper Power',
      description: 'Upper body power day — heavy compounds, lower end of the set ranges.',
      slots: [
        slot(BENCH_PRESS, 3),
        slot(INCLINE_DUMBBELL_BENCH_PRESS, 3),
        slot(BARBELL_ROW, 3),
        slot(LAT_PULLDOWN, 3),
        slot(OVERHEAD_PRESS, 2),
        slot(BARBELL_CURL, 2),
        slot(SKULLCRUSHER, 2)
      ]
    },
    {
      key: 'phul-lower-power',
      name: 'PHUL Lower Power',
      description: 'Lower body power day — squat and deadlift focus.',
      slots: [
        slot(SQUAT, 3),
        slot(DEADLIFT, 3),
        slot(LEG_PRESS, 3),
        slot(LEG_CURL, 3),
        slot(STANDING_CALF_RAISE, 4)
      ]
    },
    {
      key: 'phul-upper-hypertrophy',
      name: 'PHUL Upper Hypertrophy',
      description: 'Upper body hypertrophy day — higher reps, lower end of the set ranges.',
      slots: [
        slot(INCLINE_BENCH_PRESS, 3),
        slot(DUMBBELL_FLY, 3),
        slot(SEATED_CABLE_ROW, 3),
        slot(ONE_ARM_DUMBBELL_ROW, 3),
        slot(DUMBBELL_LATERAL_RAISE, 3),
        slot(INCLINE_DUMBBELL_CURL, 3),
        slot(CABLE_TRICEPS_EXTENSION, 3)
      ]
    },
    {
      key: 'phul-lower-hypertrophy',
      name: 'PHUL Lower Hypertrophy',
      description: 'Lower body hypertrophy day — quads, hamstrings and calves.',
      slots: [
        slot(FRONT_SQUAT, 3),
        slot(BARBELL_LUNGE, 3),
        slot(LEG_EXTENSION, 3),
        slot(LEG_CURL, 3),
        slot(SEATED_CALF_RAISE, 3),
        slot(CALF_PRESS, 3)
      ]
    }
  ]
}
