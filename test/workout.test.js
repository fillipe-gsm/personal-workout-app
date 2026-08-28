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
await import('../src/components/workout-session.js')

beforeEach(() => {
  store.clearAllData()
  document.body.innerHTML = ''
  location.hash = ''
  history.replaceState(null, '', location.href)
})

function createPlanWithExercise(exerciseName = 'Squat') {
  const ex = store.addExercise(exerciseName)
  const plan = store.addPlan('Test Plan')
  store.updatePlan(plan.id, { exerciseIds: [ex.id] })
  return { ex, plan }
}

describe('workout training weight input', () => {
  it('has step=1 so any integer weight is valid', () => {
    const { plan } = createPlanWithExercise()
    const session = document.createElement('workout-session')
    session.setAttribute('plan-id', plan.id)
    document.body.append(session)

    const twInput = document.querySelector('exercise-set-block .tw')
    expect(twInput.step).toBe('1')

    for (const val of ['77', '73', '81', '100', '1']) {
      twInput.value = val
      expect(twInput.validity.valid, `value ${val} should be valid with step=1`).toBe(true)
    }
  })

  it('accepts any integer TW like 77 that would have failed with step 2.5', async () => {
    const { plan } = createPlanWithExercise()
    const session = document.createElement('workout-session')
    session.setAttribute('plan-id', plan.id)
    document.body.append(session)

    const block = document.querySelector('exercise-set-block')
    const form = block.querySelector('form')
    const twInput = block.querySelector('.tw')

    twInput.value = '77'
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(block.sets).toHaveLength(6)
    expect(block.sets.map((s) => s.weightKg)).toEqual([
      Math.floor(77 * 0.4),
      Math.floor(77 * 0.6),
      Math.floor(77 * 0.8),
      77, 77, 77
    ])

    const rows = block.querySelectorAll('.set-row')
    expect(rows).toHaveLength(6)
  })

  it('accepts 73 and generates correct warm-ups', async () => {
    const { plan } = createPlanWithExercise()
    const session = document.createElement('workout-session')
    session.setAttribute('plan-id', plan.id)
    document.body.append(session)

    const block = document.querySelector('exercise-set-block')
    block.querySelector('.tw').value = '73'
    block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(block.sets.slice(0, 3).map((s) => s.weightKg)).toEqual([
      Math.floor(73 * 0.4),
      Math.floor(73 * 0.6),
      Math.floor(73 * 0.8)
    ])
  })

  it('updates history via replaceState when starting and reverts on back (popstate)', async () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState')
    const { plan } = createPlanWithExercise()
    const session = document.createElement('workout-session')
    session.setAttribute('plan-id', plan.id)
    document.body.append(session)

    const block = document.querySelector('exercise-set-block')
    block.querySelector('.tw').value = '80'
    block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(block.sets).toHaveLength(6)
    expect(replaceSpy).toHaveBeenCalled()
    expect(session._stack).toHaveLength(1)

    window.dispatchEvent(new PopStateEvent('popstate', { state: { workoutExercise: block.exercise.id } }))
    await Promise.resolve()

    expect(block.sets).toHaveLength(0)
    expect(block.querySelector('form')).not.toBeNull()
    expect(block.querySelector('.tw')).not.toBeNull()
  })

  it('starting multiple exercises does not add extra history entries', async () => {
    const pushSpy = vi.spyOn(window.history, 'pushState')
    const replaceSpy = vi.spyOn(window.history, 'replaceState')
    const exs = Array.from({ length: 5 }, (_, i) => store.addExercise(`Ex${i}`))
    const plan = store.addPlan('Many')
    store.updatePlan(plan.id, { exerciseIds: exs.map((e) => e.id) })
    const session = document.createElement('workout-session')
    session.setAttribute('plan-id', plan.id)
    document.body.append(session)

    for (const block of document.querySelectorAll('exercise-set-block')) {
      block.querySelector('.tw').value = '50'
      block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    }

    expect(replaceSpy).toHaveBeenCalled()
    expect(pushSpy).not.toHaveBeenCalledWith(expect.objectContaining({ workoutPlanId: plan.id }), expect.anything(), expect.anything())
  })

  it('restores started exercise when navigating back from plates', async () => {
    const { plan, ex } = createPlanWithExercise()
    const session = document.createElement('workout-session')
    session.setAttribute('plan-id', plan.id)
    document.body.append(session)

    const block = document.querySelector('exercise-set-block')
    block.querySelector('.tw').value = '77'
    block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(block.sets).toHaveLength(6)
    expect(history.state?.started[0].exerciseId).toBe(ex.id)
    expect(history.state?.started[0].sets).toHaveLength(6)

    document.body.innerHTML = ''
    await Promise.resolve()

    const session2 = document.createElement('workout-session')
    session2.setAttribute('plan-id', plan.id)
    document.body.append(session2)
    await Promise.resolve()

    const block2 = document.querySelector('exercise-set-block')
    expect(block2.sets).toHaveLength(6)
    expect(block2.sets.map((s) => s.weightKg)).toEqual([
      Math.floor(77 * 0.4),
      Math.floor(77 * 0.6),
      Math.floor(77 * 0.8),
      77, 77, 77
    ])
    expect(block2.querySelectorAll('.set-row')).toHaveLength(6)
  })

  it('persists reps when going to plates and back', async () => {
    const { plan } = createPlanWithExercise()
    const session = document.createElement('workout-session')
    session.setAttribute('plan-id', plan.id)
    document.body.append(session)

    const block = document.querySelector('exercise-set-block')
    block.querySelector('.tw').value = '80'
    block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    const firstInput = block.querySelector('.reps')
    firstInput.value = '8'
    firstInput.dispatchEvent(new Event('input', { bubbles: true }))
    await Promise.resolve()

    expect(history.state?.started[0].sets[0].reps).toBe(8)

    document.body.innerHTML = ''
    await Promise.resolve()

    const session2 = document.createElement('workout-session')
    session2.setAttribute('plan-id', plan.id)
    document.body.append(session2)
    await Promise.resolve()

    const block2 = document.querySelector('exercise-set-block')
    expect(block2.querySelector('.reps').value).toBe('8')
    expect(block2.sets[0].reps).toBe(8)
  })

  it('Conclude workout clears state and navigates to root', async () => {
    const { plan } = createPlanWithExercise()
    const session = document.createElement('workout-session')
    session.setAttribute('plan-id', plan.id)
    document.body.append(session)

    const block = document.querySelector('exercise-set-block')
    block.querySelector('.tw').value = '80'
    block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(history.state?.started).toBeDefined()
    const conclude = document.querySelector('[data-conclude]')
    expect(conclude).not.toBeNull()
    conclude.click()
    await Promise.resolve()

    expect(history.state?.started).toBeUndefined()
    expect(location.hash).toBe('#/')
  })

  describe('exercise classes', () => {
    it('Barbell shows warm-ups and Plates, Bodyweight shows only working sets', async () => {
      const barbell = store.addExercise('Squat', 'Barbell')
      const bw = store.addExercise('Push-up', 'Bodyweight')
      const plan = store.addPlan('Mixed')
      store.updatePlan(plan.id, { exerciseIds: [barbell.id, bw.id] })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)

      const [barbellBlock, bwBlock] = [...document.querySelectorAll('exercise-set-block')]

      barbellBlock.querySelector('.tw').value = '80'
      barbellBlock.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()

      bwBlock.querySelector('.tw').value = '20'
      bwBlock.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()

      expect(barbellBlock.sets).toHaveLength(6)
      expect(bwBlock.sets).toHaveLength(3)
      expect(barbellBlock.querySelector('.set-label.warmup')).not.toBeNull()
      expect(bwBlock.querySelector('.set-label.warmup')).toBeNull()
      expect(barbellBlock.querySelector('a[href^="#/plates"]')).not.toBeNull()
      expect(bwBlock.querySelector('a[href^="#/plates"]')).toBeNull()
    })

    it('Dumbbell and Machine have no warm-ups or Plates', async () => {
      const dumb = store.addExercise('Curl', 'Dumbbell')
      const mach = store.addExercise('Leg Press', 'Machine')
      const plan = store.addPlan('Mixed2')
      store.updatePlan(plan.id, { exerciseIds: [dumb.id, mach.id] })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)

      for (const block of document.querySelectorAll('exercise-set-block')) {
        block.querySelector('.tw').value = '30'
        block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        await Promise.resolve()
        expect(block.sets).toHaveLength(3)
        expect(block.querySelector('.set-label.warmup')).toBeNull()
        expect(block.querySelector('a[href^="#/plates"]')).toBeNull()
      }
    })
  })
})
