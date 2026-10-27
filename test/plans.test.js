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

function clickMove(el, dir, id) {
  const btn = el.querySelector(`[data-move-${dir}="${id}"]`)
  btn.click()
  return btn
}

describe('plan exercise reordering', () => {
  it('moves one position per click, not to the end of the list', () => {
    const plan = createPlanExercise('First', 'Second', 'Third', 'Fourth')
    const ids = planById(plan).exerciseIds
    const el = showPlanEdit(plan.id)

    // Click "down" on the first exercise: should only swap with the second.
    clickMove(el, 'down', ids[0])
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
    const ids = planById(plan).exerciseIds
    const first = ids[0]

    clickMove(el, 'down', first) // [Second, First, Third, Fourth] — plain one-step swap
    store.updatePlan(plan.id, { name: 'Renamed' }) // forces a repaint (stacks a 2nd listener in the buggy version)
    clickMove(el, 'down', first) // buggy: 2 listeners → two swaps → [Second, Third, Fourth, First]; correct: one swap

    expect(order(plan)).toEqual(['Second', 'Third', 'First', 'Fourth'])
  })

  it('moves up only one position per click and disables at the edges', () => {
    const plan = createPlanExercise('First', 'Second', 'Third')
    const el = showPlanEdit(plan.id)
    const ids = planById(plan).exerciseIds
    const second = ids[1]

    clickMove(el, 'up', second)
    expect(order(plan)).toEqual(['Second', 'First', 'Third'])

    const topBtn = el.querySelector(`[data-move-up="${second}"]`)
    expect(topBtn.disabled).toBe(true)
  })

  it('removing and adding exercises still works alongside reordering', () => {
    const plan = createPlanExercise('Alpha', 'Beta')
    const el = showPlanEdit(plan.id)
    const ids = planById(plan).exerciseIds

    el.querySelector(`[data-remove="${ids[0]}"]`).click()
    expect(order(plan)).toEqual(['Beta'])

    const extra = store.addExercise('Gamma')
    el.querySelector(`[data-add="${extra.id}"]`).click()
    expect(order(plan)).toEqual(['Beta', 'Gamma'])
  })
})
