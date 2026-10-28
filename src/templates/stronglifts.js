/**
 * Catalog of cookie-cutter workout templates.
 *
 * Shape:
 *   {
 *     key, name, version, description,
 *     exercises: [{ name, category, setScheme }],       // catalog defaults
 *     plans: [{ key, name, description,
 *               slots: [{ exercise, setScheme }] }]      // per-plan prescription
 *   }
 *
 * Exercises are matched by name (case-insensitive) on install: existing ones
 * are reused and never overwritten. Plan slots carry their own scheme, so the
 * same exercise can have different prescriptions in different plans.
 */

const sets = (warmupCount, workSets) => ({ type: 'fixedSets', warmupCount, workSets })

export const STRONGLIFTS_5X5 = {
  key: 'stronglifts-5x5',
  name: 'Stronglifts 5×5',
  version: 1,
  description:
    "Popular barbell based beginner's workout. See more at https://stronglifts.com/stronglifts-5x5/.",
  exercises: [
    { name: 'Squat', category: 'Barbell', setScheme: sets(3, 5) },
    { name: 'Bench press', category: 'Barbell', setScheme: sets(3, 5) },
    { name: 'Barbell row', category: 'Barbell', setScheme: sets(3, 5) },
    { name: 'Overhead press', category: 'Barbell', setScheme: sets(3, 5) },
    { name: 'Deadlift', category: 'Barbell', setScheme: sets(4, 1) }
  ],
  plans: [
    {
      key: 'stronglifts-a',
      name: 'Stronglifts A',
      description: 'Workout A — Squat, Bench press, Barbell row.',
      slots: [
        { exercise: 'Squat', setScheme: sets(3, 5) },
        { exercise: 'Bench press', setScheme: sets(3, 5) },
        { exercise: 'Barbell row', setScheme: sets(3, 5) }
      ]
    },
    {
      key: 'stronglifts-b',
      name: 'Stronglifts B',
      description: 'Workout B — Squat, Overhead press, Deadlift.',
      slots: [
        { exercise: 'Squat', setScheme: sets(3, 5) },
        { exercise: 'Overhead press', setScheme: sets(3, 5) },
        { exercise: 'Deadlift', setScheme: sets(4, 1) }
      ]
    }
  ]
}

export const TEMPLATES = [STRONGLIFTS_5X5]
