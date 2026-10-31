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
  store = await import('../src/store.js')
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

describe('set schemes', () => {
  it('new exercises default to fixed sets: 3 warm-ups + 3 work sets', () => {
    const ex = store.addExercise('Squat')
    expect(ex.setScheme).toEqual({ type: 'fixedSets', warmupCount: 3, workSets: 3 })
    expect(ex.tier).toBeUndefined()
  })

  it('defaults fixed reps to 0 warm-ups and 15 total reps', () => {
    const ex = store.addExercise('Curl', 'Dumbbell', 'fixedReps')
    expect(ex.setScheme).toEqual({ type: 'fixedReps', warmupCount: 0, totalReps: 15 })
  })

  it('stores and normalizes an explicit scheme', () => {
    const ex = store.addExercise('Bench', 'Barbell', { type: 'fixedReps', warmupCount: 2, totalReps: 32 })
    expect(ex.setScheme).toEqual({ type: 'fixedReps', warmupCount: 2, totalReps: 32 })
    store.updateExercise(ex.id, { setScheme: { type: 'fixedSets', warmupCount: 1, workSets: 4 } })
    expect(store.getExercise(ex.id).setScheme).toEqual({ type: 'fixedSets', warmupCount: 1, workSets: 4 })
  })

  it('clamps invalid scheme values', () => {
    const ex = store.addExercise('X')
    store.updateExercise(ex.id, { setScheme: { type: 'fixedReps', warmupCount: -2, totalReps: 0 } })
    expect(store.getExercise(ex.id).setScheme).toEqual({ type: 'fixedReps', warmupCount: 0, totalReps: 15 })
  })

  it('migrates legacy tiers from saved data: main → 3+3 sets, accessory → 15 reps', async () => {
    storage.set(
      'workout-app-data',
      JSON.stringify({
        exercises: [
          { id: 'm', name: 'Squat', category: 'Barbell', tier: 'main' },
          { id: 'a', name: 'Curl', category: 'Dumbbell', tier: 'accessory' }
        ],
        plans: [],
        profiles: [],
        records: []
      })
    )
    vi.resetModules()
    const fresh = await import('../src/store.js')

    expect(fresh.getExercise('m').setScheme).toEqual({ type: 'fixedSets', warmupCount: 3, workSets: 3 })
    expect(fresh.getExercise('a').setScheme).toEqual({ type: 'fixedReps', warmupCount: 0, totalReps: 15 })
    expect(fresh.getExercise('m').tier).toBeUndefined()
  })

  it('migrates legacy records from saved data into sessions', async () => {
    storage.set(
      'workout-app-data',
      JSON.stringify({
        exercises: [{ id: 'e1', name: 'Squat', category: 'Barbell', tier: 'main' }],
        plans: [],
        profiles: [],
        records: [
          {
            id: 'r1',
            exerciseId: 'e1',
            date: '2026-01-05T12:00:00.000Z',
            note: 'felt good',
            sets: [{ type: 'working', weightKg: 100, reps: 5 }]
          }
        ]
      })
    )
    vi.resetModules()
    const fresh = await import('../src/store.js')

    const sessions = fresh.getSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].performedOn).toBe('2026-01-05')
    const rec = fresh.getRecordsForExercise('e1')[0]
    expect(rec.sets[0].weightKg).toBe(100)
    expect(rec.note).toBe('felt good')
    expect(rec.date).toBe('2026-01-05')
  })

  it('imports legacy backups that still use records', () => {
    const legacy = {
      exercises: [{ id: 'e1', name: 'Squat', category: 'Barbell' }],
      plans: [],
      profiles: [],
      records: [{ id: 'r1', exerciseId: 'e1', date: '2026-02-01', sets: [{ type: 'working', weightKg: 90, reps: 5 }] }]
    }
    const { summary } = store.previewBackup(JSON.stringify(legacy))
    expect(summary.sessions).toBe(1)
    store.importBackup(legacy)
    expect(store.getRecordsForExercise('e1')[0].sets[0].weightKg).toBe(90)
  })

  it('describes schemes for badges', () => {
    expect(store.fmtSetScheme({ type: 'fixedSets', warmupCount: 3, workSets: 3 })).toBe('3 work sets + 3 WU')
    expect(store.fmtSetScheme({ type: 'fixedSets', warmupCount: 0, workSets: 5 })).toBe('5 work sets')
    expect(store.fmtSetScheme({ type: 'fixedReps', warmupCount: 0, totalReps: 15 })).toBe('15 total reps')
  })
})

describe('plan details and templates', () => {
  const template = {
    key: 'test-tpl',
    name: 'Test Template',
    version: 3,
    description: 'Template description',
    exercises: [
      { name: 'Squat', category: 'Barbell', setScheme: { type: 'fixedSets', warmupCount: 3, workSets: 5 } },
      { name: 'Deadlift', category: 'Barbell', setScheme: { type: 'fixedSets', warmupCount: 4, workSets: 1 } }
    ],
    plans: [
      {
        key: 'test-a',
        name: 'Test A',
        description: 'A day',
        slots: [
          { exercise: 'Squat', setScheme: { type: 'fixedSets', warmupCount: 3, workSets: 5 } },
          { exercise: 'Deadlift', setScheme: { type: 'fixedSets', warmupCount: 4, workSets: 1 } }
        ]
      },
      {
        key: 'test-b',
        name: 'Test B',
        slots: [{ exercise: 'Squat', setScheme: { type: 'fixedReps', warmupCount: 1, totalReps: 20 } }]
      }
    ]
  }

  it('adds plans with a description (user provenance by default)', () => {
    const plan = store.addPlan('Upper', { description: 'Push day' })
    expect(plan.description).toBe('Push day')
    expect(plan.source).toBe('user')
    expect(plan.templateKey).toBeNull()

    store.updatePlan(plan.id, { description: 'Pull day' })
    expect(store.getPlan(plan.id).description).toBe('Pull day')
  })

  it('installs template exercises and workouts with provenance and slot schemes', () => {
    const summary = store.installTemplate(template)

    expect(summary.createdProgram).toBe('Test Template')
    expect(summary.programName).toBe('Test Template')
    expect(summary.createdExercises).toEqual(['Squat', 'Deadlift'])
    expect(summary.createdPlans).toEqual(['Test A', 'Test B'])

    const programs = store.getPrograms()
    expect(programs).toHaveLength(1)
    const program = programs[0]
    expect(program.name).toBe('Test Template')
    expect(program.source).toBe('template')
    expect(program.templateKey).toBe('test-tpl')
    expect(program.templateVersion).toBe(3)
    expect(program.description).toBe('Template description')

    const plans = store.getPlansForProgram(program.id)
    expect(plans.map((p) => p.name)).toEqual(['Test A', 'Test B'])
    expect(plans.map((p) => p.position)).toEqual([0, 1])
    expect(plans[0].source).toBe('template')
    expect(plans[0].isFromTemplate).toBe(true)
    expect(plans[0].templateKey).toBe('test-a')
    expect(plans[0].description).toBe('A day')
    expect(plans[1].description).toBe('Template description') // falls back to template description

    expect(plans[0].entries.map((e) => store.getExercise(e.exerciseId).name)).toEqual(['Squat', 'Deadlift'])
    expect(plans[0].entries[1].setScheme.toJSON()).toEqual({
      type: 'fixedSets',
      warmupCount: 4,
      workSets: 1
    })
    expect(plans[1].entries[0].setScheme.toJSON()).toEqual({
      type: 'fixedReps',
      warmupCount: 1,
      totalReps: 20
    })
    expect(store.getExercises().every((e) => e.source === 'template')).toBe(true)
  })

  it('is idempotent: reinstalling reuses the program and skips existing workouts', () => {
    store.installTemplate(template)
    const again = store.installTemplate(template)

    expect(again.createdProgram).toBeNull()
    expect(again.createdPlans).toEqual([])
    expect(again.createdExercises).toEqual([])
    expect(again.skippedPlans).toEqual(['Test A', 'Test B'])
    expect(store.getPrograms()).toHaveLength(1)
    expect(store.getPlans()).toHaveLength(2)
    expect(store.getExercises()).toHaveLength(2)
  })

  it('reuses existing exercises by name and never overwrites user settings', () => {
    const userSquat = store.addExercise('squat', 'Machine', {
      type: 'fixedReps',
      warmupCount: 0,
      totalReps: 20
    })

    const summary = store.installTemplate(template)

    expect(summary.reusedExercises).toContain('squat')
    expect(summary.createdExercises).toEqual(['Deadlift'])
    expect(store.getExercises()).toHaveLength(2)

    const squat = store.getExercise(userSquat.id)
    expect(squat.category).toBe('Machine')
    expect(squat.source).toBe('user')
    expect(squat.setScheme.toJSON()).toEqual({ type: 'fixedReps', warmupCount: 0, totalReps: 20 })

    // The plan slot still carries the template prescription.
    const plan = store.getPlans().find((p) => p.templateKey === 'test-a')
    expect(plan.entries[0].exerciseId).toBe(userSquat.id)
    expect(plan.entries[0].setScheme.workSets).toBe(5)
  })

  it('scopes workout names to their program', () => {
    const standalone = store.addPlan('Test A')
    store.installTemplate(template)
    const program = store.getPrograms()[0]

    // Different scopes may share a name.
    expect(standalone.name).toBe('Test A')
    expect(store.getPlansForProgram(program.id).map((p) => p.name)).toEqual(['Test A', 'Test B'])

    // Within the same program, duplicates are disambiguated.
    const duplicate = store.addPlan('Test A', { programId: program.id })
    expect(duplicate.name).toBe('Test A (2)')
  })

  it('reports how much of a template is installed', () => {
    expect(store.templateInstallState(template)).toEqual({ installed: 0, total: 2, complete: false })
    store.installTemplate(template)
    expect(store.templateInstallState(template)).toEqual({ installed: 2, total: 2, complete: true })
  })
})

describe('programs', () => {
  it('creates programs, groups workouts and keeps standalone ones', () => {
    const program = store.addProgram('My Program', { description: 'A split' })
    const day1 = store.addPlan('Day 1', { programId: program.id })
    const day2 = store.addPlan('Day 2', { programId: program.id })
    const loose = store.addPlan('One-off')

    expect(store.getPrograms()).toHaveLength(1)
    expect(store.getProgram(program.id).description).toBe('A split')
    expect(store.getPlansForProgram(program.id).map((p) => p.name)).toEqual(['Day 1', 'Day 2'])
    expect([day1.position, day2.position]).toEqual([0, 1])
    expect(loose.programId).toBeNull()
    expect(store.getStandalonePlans().map((p) => p.name)).toEqual(['One-off'])

    store.updateProgram(program.id, { name: 'Renamed' })
    expect(store.getProgram(program.id).name).toBe('Renamed')
  })

  it('deleting a program detaches its workouts instead of deleting them', () => {
    const program = store.addProgram('Temp')
    store.addPlan('Day 1', { programId: program.id })
    store.addPlan('Day 2', { programId: program.id })
    store.addPlan('Loose')

    store.deleteProgram(program.id)

    expect(store.getProgram(program.id)).toBeUndefined()
    expect(store.getStandalonePlans().map((p) => p.name).sort()).toEqual(['Day 1', 'Day 2', 'Loose'])
    expect(store.getPlans()).toHaveLength(3)
  })

  it('moves a workout between programs and standalone', () => {
    const a = store.addProgram('A')
    const b = store.addProgram('B')
    const plan = store.addPlan('Day 1', { programId: a.id })

    store.updatePlan(plan.id, { programId: b.id })
    expect(store.getPlansForProgram(b.id).map((p) => p.name)).toEqual(['Day 1'])
    expect(store.getPlansForProgram(a.id)).toHaveLength(0)

    store.updatePlan(plan.id, { programId: null })
    expect(store.getStandalonePlans().map((p) => p.name)).toEqual(['Day 1'])
  })

  it('stores the program snapshot on sessions created from a program workout', () => {
    const program = store.addProgram('Snapshot Program')
    const plan = store.addPlan('Day 1', { programId: program.id })
    const ex = store.addExercise('Squat')
    const date = '2026-03-01T12:00:00.000Z'

    store.addRecord({
      exerciseId: ex.id,
      date,
      planId: plan.id,
      planName: plan.name,
      programId: program.id,
      programName: program.name,
      sets: [{ type: 'working', weightKg: 100, reps: 5 }]
    })

    const session = store.getSessions()[0]
    expect(session.programId).toBe(program.id)
    expect(session.programName).toBe('Snapshot Program')
    expect(session.planName).toBe('Day 1')
  })

  it('migrates legacy plans with template keys into their template program', async () => {
    storage.set(
      'workout-app-data',
      JSON.stringify({
        exercises: [{ id: 'e1', name: 'Squat', category: 'Barbell' }],
        plans: [
          { id: 'p1', name: 'Stronglifts A', templateKey: 'stronglifts-a', templateVersion: 1 },
          { id: 'p2', name: 'Stronglifts B', templateKey: 'stronglifts-b', templateVersion: 1 },
          { id: 'p3', name: 'My own workout' }
        ],
        profiles: [],
        sessions: []
      })
    )
    vi.resetModules()
    const fresh = await import('../src/store.js')

    const programs = fresh.getPrograms()
    expect(programs).toHaveLength(1)
    expect(programs[0].templateKey).toBe('stronglifts-5x5')
    expect(programs[0].name).toBe('Stronglifts 5×5')
    expect(fresh.getPlansForProgram(programs[0].id).map((p) => p.name)).toEqual([
      'Stronglifts A',
      'Stronglifts B'
    ])
    expect(fresh.getStandalonePlans().map((p) => p.name)).toEqual(['My own workout'])
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

  it('keeps infinite plate counts across a save/reload round-trip', async () => {
    const p = store.addProfile('Gym', 20)
    store.updateProfile(p.id, { plates: [{ kg: 10, count: Infinity }, { kg: 5, count: 2 }] })

    vi.resetModules()
    const fresh = await import('../src/store.js')
    const loaded = fresh.getProfile(p.id)

    expect(loaded.plates[0]).toMatchObject({ kg: 10, count: Infinity })
    expect(loaded.plates[1]).toMatchObject({ kg: 5, count: 2 })
  })
})

describe('records', () => {
  it('stores and retrieves records newest first', async () => {
    const ex = store.addExercise('Squat')
    store.addRecord({
      exerciseId: ex.id,
      date: '2026-01-01T12:00:00.000Z',
      sets: [{ type: 'working', weightKg: 80, reps: 5 }]
    })
    store.addRecord({
      exerciseId: ex.id,
      date: '2026-01-02T12:00:00.000Z',
      sets: [{ type: 'working', weightKg: 82.5, reps: 5 }]
    })
    const recs = store.getRecordsForExercise(ex.id)
    expect(recs).toHaveLength(2)
    expect(recs[0].sets[0].weightKg).toBe(82.5)
  })

  it('groups same-day exercises into one workout session', () => {
    const squat = store.addExercise('Squat')
    const bench = store.addExercise('Bench')
    const date = '2026-01-15T12:00:00.000Z'
    store.addRecord({ exerciseId: squat.id, date, sets: [{ type: 'working', weightKg: 100, reps: 5 }] })
    store.addRecord({ exerciseId: bench.id, date, sets: [{ type: 'working', weightKg: 80, reps: 5 }] })

    const sessions = store.getSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].performedOn).toBe('2026-01-15')
    expect(sessions[0].exercises.map((e) => e.exerciseId)).toEqual([squat.id, bench.id])
  })

  it('filters records by exercise', () => {
    const ex1 = store.addExercise('A')
    const ex2 = store.addExercise('B')
    store.addRecord({ exerciseId: ex1.id, sets: [] })
    store.addRecord({ exerciseId: ex2.id, sets: [] })
    expect(store.getRecordsForExercise(ex1.id)).toHaveLength(1)
  })

  it('finds record on same calendar day', () => {
    const ex = store.addExercise('Squat')
    const date = new Date('2024-01-15T12:00:00.000Z').toISOString()
    store.addRecord({ exerciseId: ex.id, sets: [{ type: 'working', weightKg: 80, reps: 5 }], date })
    expect(store.findRecordForExerciseOnDate(ex.id, date)).toBeDefined()
    expect(store.findRecordForExerciseOnDate(ex.id, new Date('2024-01-15T18:00:00.000Z').toISOString())).toBeDefined()
    expect(store.findRecordForExerciseOnDate(ex.id, new Date('2024-01-16T12:00:00.000Z').toISOString())).toBeUndefined()
  })

  it('updates existing record instead of stacking', () => {
    const ex = store.addExercise('Squat')
    const date = new Date('2024-01-15T12:00:00.000Z').toISOString()
    const rec = store.addRecord({ exerciseId: ex.id, sets: [{ type: 'working', weightKg: 80, reps: 5 }], date })
    store.updateRecord(rec.id, { sets: [{ type: 'working', weightKg: 90, reps: 6 }], date })
    const recs = store.getRecordsForExercise(ex.id)
    expect(recs).toHaveLength(1)
    expect(recs[0].id).toBe(rec.id)
    expect(recs[0].sets[0].weightKg).toBe(90)
  })
})

describe('backup export/import', () => {
  function seed() {
    const ex = store.addExercise('Squat', 'Barbell', 'main')
    const plan = store.addPlan('Legs')
    store.updatePlan(plan.id, { exerciseIds: [ex.id] })
    const profile = store.addProfile('Gym', 20)
    store.updateProfile(profile.id, { plates: [{ kg: 25, count: Infinity }, { kg: 20, count: 2 }] })
    store.addRecord({ exerciseId: ex.id, sets: [{ type: 'working', weightKg: 100, reps: 5 }] })
  }

  // Simulates saving to a file and reading it back on another phone.
  function saveAndLoadFile() {
    return JSON.parse(JSON.stringify(store.exportData()))
  }

  it('round-trips all data through a JSON file', () => {
    seed()
    const file = saveAndLoadFile()
    const before = JSON.stringify(store.getData())
    store.clearAllData()
    expect(store.getData().exercises).toHaveLength(0)

    const { payload, summary } = store.previewBackup(JSON.stringify(file))
    expect(summary).toMatchObject({ exercises: 1, programs: 0, plans: 1, profiles: 1, sessions: 1 })
    expect(summary.exportedAt).toBeTruthy()
    const result = store.importBackup(payload)
    expect(result).toEqual(summary)
    expect(JSON.stringify(store.getData())).toBe(before)
  })

  it('restores unlimited plate counts across JSON serialization', () => {
    seed()
    const file = saveAndLoadFile()
    // JSON turns Infinity into null; import must map it back.
    expect(file.data.profiles[0].plates[0].count).toBeNull()
    store.clearAllData()
    store.importBackup(store.previewBackup(JSON.stringify(file)).payload)
    expect(store.getData().profiles[0].plates[0].count).toBe(Infinity)
  })

  it('rejects corrupt or invalid files without touching data', () => {
    seed()
    const before = JSON.stringify(store.getData())
    for (const bad of ['not json', '{}', '{"data":{"exercises":"nope"}}', '[1,2,3]', 'null']) {
      expect(() => store.previewBackup(bad)).toThrow()
    }
    // A well-formed but empty envelope previews with zero counts; data is
    // only replaced on explicit import, so previewing leaves data untouched.
    const empty = store.previewBackup('{"data":{}}')
    expect(empty.summary).toMatchObject({ exercises: 0, programs: 0, plans: 0, profiles: 0, sessions: 0 })
    expect(JSON.stringify(store.getData())).toBe(before)
  })

  it('accepts a bare data object and normalizes legacy values', () => {
    const bare = {
      exercises: [{ id: 'x', name: 'Curl', category: 'Dumbbel' }],
      plans: [],
      profiles: [],
      records: []
    }
    const { summary } = store.previewBackup(JSON.stringify(bare))
    expect(summary.exercises).toBe(1)
    store.importBackup(bare)
    expect(store.getExercise('x').category).toBe('Dumbbell')
  })

  it('import replaces existing data on the phone', () => {
    seed()
    const file = saveAndLoadFile()
    store.addExercise('Extra')
    expect(store.getData().exercises).toHaveLength(2)
    store.importBackup(store.previewBackup(JSON.stringify(file)).payload)
    expect(store.getData().exercises).toHaveLength(1)
    expect(store.getExercise('Extra')).toBeUndefined()
  })
})
