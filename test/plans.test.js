// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

const storage = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
})

const store = await import('../src/store.js')
await import('../src/components/plans.js')
import { STRONGLIFTS_5X5 } from '../src/templates/index.js'

beforeEach(() => {
  store.clearAllData()
  document.body.innerHTML = ''
  history.replaceState(null, '', '/')
})

function createPlanExercise(...names) {
  const plan = store.addPlan('Test Plan')
  store.updatePlan(plan.id, { exerciseIds: names.map((n) => store.addExercise(n).id) })
  return plan
}

function showPlanEdit(planId) {
  const el = document.createElement('plan-edit')
  el.setAttribute('plan-id', planId)
  document.body.append(el)
  return el
}

function planById(plan) {
  return store.getPlan(plan.id)
}

function order(plan) {
  return planById(plan).exerciseIds.map((id) => store.getExercise(id).name)
}

function entryId(plan, exerciseName) {
  const entry = planById(plan).entries.find((e) => store.getExercise(e.exerciseId)?.name === exerciseName)
  return entry?.id
}

function clickMove(el, dir, id) {
  const btn = el.querySelector(`[data-move-${dir}="${id}"]`)
  btn.click()
  return btn
}

describe('plan exercise reordering', () => {
  it('moves one position per click, not to the end of the list', () => {
    const plan = createPlanExercise('First', 'Second', 'Third', 'Fourth')
    const el = showPlanEdit(plan.id)

    // Click "down" on the first exercise: should only swap with the second.
    clickMove(el, 'down', entryId(plan, 'First'))
    expect(order(plan)).toEqual(['Second', 'First', 'Third', 'Fourth'])
  })

  it('keeps moving one position per click even after several re-renders', () => {
    // Regression: bind() used to attach the click handler to the element itself,
    // which survives innerHTML replacement, so every store update stacked another
    // click listener and one click moved the exercise several steps.
    // Key detail: the EXPECTED result must differ from what listener-stacking
    // would produce (the guard at the end of the list would hide it).
    const plan = createPlanExercise('First', 'Second', 'Third', 'Fourth')
    const el = showPlanEdit(plan.id)
    const first = entryId(plan, 'First')

    clickMove(el, 'down', first) // [Second, First, Third, Fourth] — plain one-step swap
    store.updatePlan(plan.id, { name: 'Renamed' }) // forces a repaint (stacks a 2nd listener in the buggy version)
    clickMove(el, 'down', first) // buggy: 2 listeners → two swaps → [Second, Third, Fourth, First]; correct: one swap

    expect(order(plan)).toEqual(['Second', 'Third', 'First', 'Fourth'])
  })

  it('moves up only one position per click and disables at the edges', () => {
    const plan = createPlanExercise('First', 'Second', 'Third')
    const el = showPlanEdit(plan.id)
    const second = entryId(plan, 'Second')

    clickMove(el, 'up', second)
    expect(order(plan)).toEqual(['Second', 'First', 'Third'])

    const topBtn = el.querySelector(`[data-move-up="${second}"]`)
    expect(topBtn.disabled).toBe(true)
  })

  it('removing and adding exercises still works alongside reordering', () => {
    const plan = createPlanExercise('Alpha', 'Beta')
    const el = showPlanEdit(plan.id)

    el.querySelector(`[data-remove="${entryId(plan, 'Alpha')}"]`).click()
    expect(order(plan)).toEqual(['Beta'])

    const extra = store.addExercise('Gamma')
    el.querySelector(`[data-add="${extra.id}"]`).click()
    expect(order(plan)).toEqual(['Beta', 'Gamma'])
  })

  it('edits the set scheme of a plan slot without touching the exercise default', () => {
    const plan = createPlanExercise('Squat')
    const el = showPlanEdit(plan.id)
    const id = entryId(plan, 'Squat')

    el.querySelector(`[data-scheme="${id}"]`).click()
    const editor = el.querySelector('[data-editor]')
    expect(editor).toBeTruthy()

    const typeSelect = editor.querySelector('[data-editor-type]')
    typeSelect.value = 'fixedReps'
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }))
    editor.querySelector('[data-editor-warmups]').value = '2'
    editor.querySelector('[data-editor-value]').value = '30'
    editor.querySelector('[data-editor-save]').click()

    expect(planById(plan).getEntry(id).setScheme.toJSON()).toEqual({
      type: 'fixedReps',
      warmupCount: 2,
      totalReps: 30
    })
    // The catalog default is untouched.
    const ex = store.getExercise(planById(plan).entries[0].exerciseId)
    expect(ex.setScheme.toJSON()).toEqual({ type: 'fixedSets', warmupCount: 3, workSets: 3 })
  })
})

describe('plan details and templates UI', () => {
  it('creates a workout with a description from the add view', async () => {
    await import('../src/components/plan-add.js')
    const el = document.createElement('plan-add')
    document.body.append(el)

    const form = el.querySelector('form')
    form.querySelector('[name="name"]').value = 'Upper body'
    form.querySelector('[name="description"]').value = 'Push day'
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const plan = store.getPlans()[0]
    expect(plan.name).toBe('Upper body')
    expect(plan.description).toBe('Push day')
    expect(location.hash).toBe(`#/plan/${plan.id}`)
  })

  it('saves the description from the plan edit view', async () => {
    const plan = store.addPlan('Edit me')
    const el = showPlanEdit(plan.id)

    el.querySelector('[data-plan-description]').value = 'Details from the edit page'
    el.querySelector('[data-save-name]').click()
    await Promise.resolve()

    expect(store.getPlan(plan.id).description).toBe('Details from the edit page')
  })

  it('shows description excerpts and template badges in the plans list', async () => {
    store.addPlan('Custom plan', { description: 'My own details' })
    store.installTemplate(STRONGLIFTS_5X5)
    document.body.append(document.createElement('plan-list'))

    expect(document.querySelector('.plan-desc').textContent).toBe('My own details')
    const badges = [...document.querySelectorAll('.badge')].map((b) => b.textContent.trim())
    expect(badges).toContain('Template')
  })

  it('renders description URLs as safe links', async () => {
    store.addPlan('Linked plan', { description: 'Read https://example.com/program.' })
    document.body.append(document.createElement('plan-list'))

    const link = document.querySelector('.plan-desc a')
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('https://example.com/program')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('installs a template from the templates page', async () => {
    await import('../src/components/templates.js')
    document.body.append(document.createElement('template-list'))

    const button = document.querySelector('[data-install="stronglifts-5x5"]')
    expect(button.disabled).toBe(false)

    const descriptionLink = document.querySelector('[data-template="stronglifts-5x5"] .muted a')
    expect(descriptionLink).toBeTruthy()
    expect(descriptionLink.getAttribute('href')).toContain('stronglifts.com')

    button.click()
    await Promise.resolve()

    const plans = store.getPlans()
    expect(plans).toHaveLength(2)
    expect(plans.every((p) => p.source === 'template')).toBe(true)
    expect(plans.map((p) => p.templateKey)).toEqual(['stronglifts-a', 'stronglifts-b'])

    const strongliftsExercises = store
      .getExercises()
      .filter((e) => e.source === 'template')
      .map((e) => e.name)
    expect(strongliftsExercises).toEqual([
      'Squat',
      'Bench press',
      'Barbell row',
      'Overhead press',
      'Deadlift'
    ])

    const status = document.querySelector('[data-status]').textContent
    expect(status).toContain('Installed 2 plans, 5 exercises')
    expect(document.querySelector('[data-install="stronglifts-5x5"]').disabled).toBe(true)
  })
})
