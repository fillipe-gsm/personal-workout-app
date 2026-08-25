import { describe, it, expect, beforeEach, vi } from 'vitest'

const storage = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
})

let store

beforeEach(async () => {
  storage.clear()
  vi.resetModules()
  store = await import('./store.js')
})

describe('uid', () => {
  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => store.uid()))
    expect(ids.size).toBe(1000)
  })
})

describe('exercises', () => {
  it('adds an exercise with trimmed name and generated id', () => {
    const ex = store.addExercise('  Squat  ')
    expect(ex.name).toBe('Squat')
    expect(ex.id).toBeTruthy()
    expect(store.getExercise(ex.id).name).toBe('Squat')
  })

  it('removing an exercise also removes it from plans', () => {
    const ex = store.addExercise('Bench')
    const plan = store.addPlan('Push day')
    store.updatePlan(plan.id, { exerciseIds: [ex.id] })
    store.deleteExercise(ex.id)
    expect(store.getExercise(ex.id)).toBeUndefined()
    expect(store.getPlan(plan.id).exerciseIds).toEqual([])
  })

  it('persists to localStorage', () => {
    store.addExercise('Deadlift')
    const raw = JSON.parse(storage.get('workout-app-data'))
    expect(raw.exercises).toHaveLength(1)
  })
})

describe('plans', () => {
  it('creates a plan with empty exercise list', () => {
    const plan = store.addPlan('Legs')
    expect(plan.exerciseIds).toEqual([])
    expect(store.getPlan(plan.id).name).toBe('Legs')
  })

  it('updates and deletes plans', () => {
    const plan = store.addPlan('Old name')
    store.updatePlan(plan.id, { name: 'New name' })
    expect(store.getPlan(plan.id).name).toBe('New name')
    store.deletePlan(plan.id)
    expect(store.getPlan(plan.id)).toBeUndefined()
  })

  it('update on missing id is a no-op', () => {
    expect(() => store.updatePlan('nope', { name: 'x' })).not.toThrow()
  })
})

describe('profiles', () => {
  it('creates profile with barbell weight and empty plates', () => {
    const p = store.addProfile('Home gym', 20)
    expect(p.barbellKg).toBe(20)
    expect(p.plates).toEqual([])
  })

  it('updates plates including Infinity counts', () => {
    const p = store.addProfile('Gym', 20)
    store.updateProfile(p.id, { plates: [{ kg: 10, count: Infinity }] })
    expect(store.getProfile(p.id).plates[0].count).toBe(Infinity)
    store.deleteProfile(p.id)
    expect(store.getProfile(p.id)).toBeUndefined()
  })
})

describe('records', () => {
  it('stores and retrieves records newest first', async () => {
    const ex = store.addExercise('Squat')
    store.addRecord({ exerciseId: ex.id, sets: [{ type: 'working', weightKg: 80, reps: 5 }] })
    await new Promise((r) => setTimeout(r, 5))
    store.addRecord({ exerciseId: ex.id, sets: [{ type: 'working', weightKg: 82.5, reps: 5 }] })
    const recs = store.getRecordsForExercise(ex.id)
    expect(recs).toHaveLength(2)
    expect(recs[0].sets[0].weightKg).toBe(82.5)
  })

  it('filters records by exercise', () => {
    const ex1 = store.addExercise('A')
    const ex2 = store.addExercise('B')
    store.addRecord({ exerciseId: ex1.id, sets: [] })
    store.addRecord({ exerciseId: ex2.id, sets: [] })
    expect(store.getRecordsForExercise(ex1.id)).toHaveLength(1)
  })
})
