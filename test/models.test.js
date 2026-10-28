import { describe, it, expect } from 'vitest'
import {
  SetScheme,
  Exercise,
  WorkoutPlan,
  ExerciseInWorkoutPlan,
  WorkoutSession,
  WorkoutSet,
  WeightProfile
} from '../src/models/index.js'

describe('SetScheme', () => {
  it('defaults to 3 warm-ups + 3 work sets', () => {
    expect(SetScheme.default().toJSON()).toEqual({ type: 'fixedSets', warmupCount: 3, workSets: 3 })
  })

  it('defaults fixed reps to 0 warm-ups + 15 total reps', () => {
    expect(SetScheme.default('fixedReps').toJSON()).toEqual({
      type: 'fixedReps',
      warmupCount: 0,
      totalReps: 15
    })
  })

  it('clamps invalid values', () => {
    expect(SetScheme.fromJSON({ type: 'fixedReps', warmupCount: -3, totalReps: 0 }).toJSON()).toEqual({
      type: 'fixedReps',
      warmupCount: 0,
      totalReps: 15
    })
    expect(SetScheme.fromJSON({ type: 'fixedSets', warmupCount: 2.7, workSets: -1 }).toJSON()).toEqual({
      type: 'fixedSets',
      warmupCount: 2,
      workSets: 3
    })
  })

  it('migrates legacy tiers: main → 3+3 sets, accessory → 15 reps', () => {
    expect(SetScheme.fromJSON(null, 'main').toJSON()).toEqual({
      type: 'fixedSets',
      warmupCount: 3,
      workSets: 3
    })
    expect(SetScheme.fromJSON(null, 'accessory').toJSON()).toEqual({
      type: 'fixedReps',
      warmupCount: 0,
      totalReps: 15
    })
  })

  it('describes itself for badges and copies with a new value', () => {
    expect(SetScheme.fromJSON({ type: 'fixedSets', warmupCount: 3, workSets: 3 }).describe()).toBe(
      '3 work sets + 3 WU'
    )
    expect(SetScheme.fromJSON({ type: 'fixedReps', warmupCount: 0, totalReps: 15 }).describe()).toBe(
      '15 total reps'
    )
    expect(SetScheme.default().withValue(5).toJSON()).toEqual({
      type: 'fixedSets',
      warmupCount: 3,
      workSets: 5
    })
  })
})

describe('Exercise', () => {
  it('migrates legacy tier and normalizes the category typo', () => {
    const ex = Exercise.fromJSON({ id: 'x', name: 'Curl', category: 'Dumbbel', tier: 'accessory' })
    expect(ex.category).toBe('Dumbbell')
    expect(ex.setScheme.toJSON()).toEqual({ type: 'fixedReps', warmupCount: 0, totalReps: 15 })
  })

  it('round-trips through JSON', () => {
    const ex = new Exercise({ name: 'Squat', category: 'Barbell' })
    const restored = Exercise.fromJSON(JSON.parse(JSON.stringify(ex)))
    expect(restored.toJSON()).toEqual(ex.toJSON())
  })
})

describe('WorkoutPlan', () => {
  const exercises = new Map([
    ['a', SetScheme.fromJSON({ type: 'fixedSets', warmupCount: 3, workSets: 5 })],
    ['b', SetScheme.fromJSON({ type: 'fixedReps', warmupCount: 0, totalReps: 20 })]
  ])

  it('migrates legacy exerciseIds into plan slots using exercise defaults', () => {
    const plan = WorkoutPlan.fromJSON(
      { id: 'p', name: 'Stronglifts', exerciseIds: ['a', 'b'] },
      (id) => exercises.get(id)
    )
    expect(plan.entries).toHaveLength(2)
    expect(plan.exerciseIds).toEqual(['a', 'b'])
    expect(plan.entries[0].setScheme.workSets).toBe(5)
    expect(plan.entries[1].setScheme.totalReps).toBe(20)
  })

  it('adds, moves and removes slots keeping positions contiguous', () => {
    const plan = new WorkoutPlan({ id: 'p', name: 'P' })
    const first = plan.addEntry('a')
    const second = plan.addEntry('b')
    const third = plan.addEntry('a')

    expect(plan.entries.map((e) => e.position)).toEqual([0, 1, 2])
    expect(plan.moveEntry(third.id, -2)).toBe(true)
    expect(plan.exerciseIds).toEqual(['a', 'a', 'b'])
    expect(plan.entries.map((e) => e.position)).toEqual([0, 1, 2])

    plan.removeEntry(second.id)
    expect(plan.entries.map((e) => e.position)).toEqual([0, 1])
    expect(plan.moveEntry(third.id, -1)).toBe(false)
  })

  it('serializes slots instead of exerciseIds', () => {
    const plan = new WorkoutPlan({ id: 'p', name: 'P', entries: [new ExerciseInWorkoutPlan({ planId: 'p', exerciseId: 'a' })] })
    const json = plan.toJSON()
    expect(json.entries).toHaveLength(1)
    expect(json.exerciseIds).toBeUndefined()
  })
})

describe('WorkoutSession', () => {
  it('groups exercises and exposes the session date on them', () => {
    const session = new WorkoutSession({ id: 's', performedOn: '2026-01-02', planId: 'p', planName: 'Legs' })
    const entry = session.addExercise('a', {
      setScheme: SetScheme.default(),
      trainingWeightKg: 100,
      sets: [new WorkoutSet({ type: 'working', weightKg: 100, reps: 5 })]
    })

    expect(entry.session).toBe(session)
    expect(entry.date).toBe('2026-01-02')
    expect(entry.planName).toBe('Legs')
    expect(entry.position).toBe(0)
    expect(entry.sets[0].reps).toBe(5)
  })

  it('round-trips sessions, exercises and sets through JSON', () => {
    const session = new WorkoutSession({ id: 's', performedOn: '2026-01-02' })
    session.addExercise('a', {
      setScheme: SetScheme.default('fixedReps'),
      sets: [
        { type: 'warmup', weightKg: 20, reps: 5 },
        { type: 'working', weightKg: 40, reps: 8 }
      ]
    })
    const restored = WorkoutSession.fromJSON(JSON.parse(JSON.stringify(session)))
    expect(restored.toJSON()).toEqual(session.toJSON())
    expect(restored.exercises[0].sets.map((s) => s.index)).toEqual([0, 1])
    expect(restored.exercises[0].date).toBe('2026-01-02')
  })
})

describe('WeightProfile', () => {
  it('keeps unlimited plates as Infinity across a JSON round-trip', () => {
    const profile = new WeightProfile({ name: 'Gym', barbellKg: 20, plates: [{ kg: 10, count: Infinity }] })
    const file = JSON.parse(JSON.stringify(profile))
    expect(file.plates[0].count).toBeNull()
    expect(WeightProfile.fromJSON(file).plates[0].count).toBe(Infinity)
  })
})
