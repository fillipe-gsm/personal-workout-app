import { describe, it, expect, beforeEach, vi } from 'vitest'

const storage = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
})

const store = await import('../src/store.js')
const { TEMPLATES } = await import('../src/templates/index.js')

beforeEach(() => {
  store.clearAllData()
  storage.clear()
})

const allExerciseNames = () => TEMPLATES.flatMap((t) => t.exercises.map((e) => e.name))
const planNames = (template) => template.plans.map((p) => p.name)
const slotNames = (plan) => plan.slots.map((s) => s.exercise)

describe('template catalog', () => {
  it('has unique template and plan keys', () => {
    const templateKeys = TEMPLATES.map((t) => t.key)
    expect(new Set(templateKeys).size).toBe(templateKeys.length)

    const planKeys = TEMPLATES.flatMap((t) => t.plans.map((p) => p.key))
    expect(new Set(planKeys).size).toBe(planKeys.length)
  })

  it('only references exercises declared by the template', () => {
    for (const template of TEMPLATES) {
      const declared = new Set(template.exercises.map((e) => e.name))
      for (const plan of template.plans) {
        for (const name of slotNames(plan)) {
          expect(declared.has(name), `${template.key} → ${plan.name} uses undeclared "${name}"`).toBe(true)
        }
      }
    }
  })

  it('uses the same canonical name for the same exercise across templates', () => {
    const names = allExerciseNames()
    const lowerCased = names.map((n) => n.toLowerCase())
    // If two templates spelled the same exercise differently, the lowercase set
    // would be smaller than the exact set.
    expect(new Set(names).size).toBe(new Set(lowerCased).size)
  })

  it('uses sentence-case exercise names', () => {
    for (const name of new Set(allExerciseNames())) {
      expect(name, `"${name}" should be sentence case`).toMatch(/^[A-Z][a-z0-9]*(?:[- ][a-z0-9]+)*$/)
    }
  })

  it('does not use common non-canonical variants', () => {
    const names = allExerciseNames()
    for (const variant of [
      'Squats',
      'Barbell squat',
      'Bench Press',
      'Barbell Bench Press',
      'Overhead Press',
      'Bent over row',
      'Lat Pull Down',
      'Lat pulldowns',
      'Bicep curl',
      'Dumbbell Curl',
      'Leg curls',
      'Calf raises',
      'Incline dumbbell press'
    ]) {
      expect(names).not.toContain(variant)
    }
  })

  it('resolves the first alternative in Reddit PPL', () => {
    const reddit = TEMPLATES.find((t) => t.key === 'reddit-ppl')
    const pull = reddit.plans.find((p) => p.key === 'reddit-ppl-pull')
    // "Deadlifts / Barbell rows" → deadlift only; the barbell row day is the alternative.
    expect(slotNames(pull)).toContain('Deadlift')
    expect(slotNames(pull)).not.toContain('Barbell row')
    // "Lat pulldown / Pull-up / Chin-up" → lat pulldown.
    expect(slotNames(pull)).toContain('Lat pulldown')
  })

  it('takes the lower bound of PHUL set ranges', () => {
    const phul = TEMPLATES.find((t) => t.key === 'phul')
    const upperPower = phul.plans.find((p) => p.key === 'phul-upper-power')
    const setsFor = (name) => upperPower.slots.find((s) => s.exercise === name).setScheme.workSets
    expect(setsFor('Bench press')).toBe(3) // 3-4
    expect(setsFor('Overhead press')).toBe(2) // 2-3
  })

  it('includes the r/Fitness Basic Beginner routine', () => {
    const basic = TEMPLATES.find((t) => t.key === 'rfitness-basic-beginner')
    expect(basic).toBeTruthy()
    expect(basic.plans.map((p) => p.name)).toEqual(['Basic Beginner A', 'Basic Beginner B'])

    const planA = basic.plans[0]
    expect(slotNames(planA)).toEqual(['Barbell row', 'Bench press', 'Squat'])
    expect(planA.slots.every((s) => s.setScheme.workSets === 3)).toBe(true)

    const planB = basic.plans[1]
    expect(slotNames(planB)).toEqual(['Chin-up', 'Overhead press', 'Deadlift'])
    expect(basic.exercises.find((e) => e.name === 'Chin-up').category).toBe('Bodyweight')
  })

  it('installs every template without duplicating exercises', () => {
    for (const template of TEMPLATES) store.installTemplate(template)

    const expectedExercises = new Set(allExerciseNames().map((n) => n.toLowerCase()))
    expect(store.getExercises()).toHaveLength(expectedExercises.size)

    const installed = store.getExercises().map((e) => e.name.toLowerCase())
    expect(new Set(installed).size).toBe(installed.length)

    const expectedPlans = TEMPLATES.reduce((sum, t) => sum + t.plans.length, 0)
    expect(store.getPlans()).toHaveLength(expectedPlans)
    expect(store.getPrograms()).toHaveLength(TEMPLATES.length)

    for (const plan of store.getPlans()) {
      expect(plan.source).toBe('template')
      expect(plan.entries.length).toBeGreaterThan(0)
      for (const entry of plan.entries) {
        expect(store.getExercise(entry.exerciseId), `plan ${plan.name} has a dangling slot`).toBeTruthy()
      }
    }

    for (const template of TEMPLATES) {
      const program = store.getPrograms().find((p) => p.templateKey === template.key)
      expect(program, `missing program for ${template.key}`).toBeTruthy()
      expect(program.source).toBe('template')
      expect(program.templateVersion).toBe(template.version)
      expect(store.getPlansForProgram(program.id).map((p) => p.name)).toEqual(planNames(template))
      expect(store.templateInstallState(template).complete).toBe(true)
    }
  })

  it('reuses exercises installed by an earlier template', () => {
    store.installTemplate(TEMPLATES[0])
    const squat = store.getExercises().find((e) => e.name === 'Squat')

    const phul = TEMPLATES.find((t) => t.key === 'phul')
    const summary = store.installTemplate(phul)
    expect(summary.reusedExercises).toContain('Squat')
    expect(store.getExercises().filter((e) => e.name === 'Squat')).toHaveLength(1)
    expect(store.getExercises().find((e) => e.name === 'Squat')).toBe(squat)
  })
})
