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
  it('allows any value (step=any), integers and decimals alike', () => {
    const { plan } = createPlanWithExercise()
    const session = document.createElement('workout-session')
    session.setAttribute('plan-id', plan.id)
    document.body.append(session)

    const twInput = document.querySelector('exercise-set-block .tw')
    expect(twInput.step).toBe('any')

    for (const val of ['77', '73', '81', '100', '1', '42.5', '47.25', '0.5']) {
      twInput.value = val
      expect(twInput.validity.valid, `value ${val} should be valid with step=any`).toBe(true)
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
      Math.floor((77 * 1) / 4),
      Math.floor((77 * 2) / 4),
      Math.floor((77 * 3) / 4),
      77, 77, 77
    ])

    const rows = block.querySelectorAll('.set-row')
    expect(rows).toHaveLength(6)
  })

  it('accepts decimal TW like 42.5 and rounds down to the last integer', async () => {
    const { plan } = createPlanWithExercise()
    const session = document.createElement('workout-session')
    session.setAttribute('plan-id', plan.id)
    document.body.append(session)

    const block = document.querySelector('exercise-set-block')
    const form = block.querySelector('form')
    const twInput = block.querySelector('.tw')

    twInput.value = '42.5'
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(block.sets).toHaveLength(6)
    expect(block.sets.slice(3).map((s) => s.weightKg)).toEqual([42.5, 42.5, 42.5])
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
      Math.floor((73 * 1) / 4),
      Math.floor((73 * 2) / 4),
      Math.floor((73 * 3) / 4)
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
      Math.floor((77 * 1) / 4),
      Math.floor((77 * 2) / 4),
      Math.floor((77 * 3) / 4),
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

  it('saving same exercise same day updates existing record with confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { plan, ex } = createPlanWithExercise()
    const session = document.createElement('workout-session')
    session.setAttribute('plan-id', plan.id)
    document.body.append(session)

    const dateInput = document.querySelector('[data-workout-date]')
    dateInput.value = '2024-01-15'
    dateInput.dispatchEvent(new Event('change', { bubbles: true }))

    let block = document.querySelector('exercise-set-block')
    block.querySelector('.tw').value = '80'
    block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    block.querySelector('.reps').value = '5'
    block.querySelector('.reps').dispatchEvent(new Event('input', { bubbles: true }))
    await Promise.resolve()
    block.querySelector('[data-save]').click()
    await Promise.resolve()

    expect(store.getRecordsForExercise(ex.id)).toHaveLength(1)
    expect(store.getRecordsForExercise(ex.id)[0].sets[0].reps).toBe(5)

    document.body.innerHTML = ''
    history.replaceState(null, '', location.href)
    const session2 = document.createElement('workout-session')
    session2.setAttribute('plan-id', plan.id)
    document.body.append(session2)
    await Promise.resolve()
    const dateInput2 = document.querySelector('[data-workout-date]')
    dateInput2.value = '2024-01-15'
    const block2 = document.querySelector('exercise-set-block')
    block2.querySelector('.tw').value = '90'
    block2.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    block2.querySelector('.reps').value = '6'
    block2.querySelector('.reps').dispatchEvent(new Event('input', { bubbles: true }))
    await Promise.resolve()
    block2.querySelector('[data-save]').click()
    await Promise.resolve()

    expect(confirmSpy).toHaveBeenCalledWith('There is a record for this exercise in this day already. Update it?')
    expect(store.getRecordsForExercise(ex.id)).toHaveLength(1)
    const updated = store.getRecordsForExercise(ex.id)[0]
    expect(updated.sets.find((s) => s.type === 'working').weightKg).toBe(90)
    expect(updated.sets[0].reps).toBe(6)

    confirmSpy.mockReturnValue(false)
    block2.querySelector('.reps').value = '10'
    block2.querySelector('.reps').dispatchEvent(new Event('input', { bubbles: true }))
    await Promise.resolve()
    block2.querySelector('[data-save]').click()
    await Promise.resolve()
    expect(store.getRecordsForExercise(ex.id)).toHaveLength(1)
    expect(store.getRecordsForExercise(ex.id)[0].sets[0].reps).toBe(6)
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

  it('persists note via history and saves it with record', async () => {
    const { plan, ex } = createPlanWithExercise()
    const session = document.createElement('workout-session')
    session.setAttribute('plan-id', plan.id)
    document.body.append(session)

    const block = document.querySelector('exercise-set-block')
    block.querySelector('.tw').value = '80'
    block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    block.querySelector('[data-note]').value = 'This was hard'
    block.querySelector('[data-note]').dispatchEvent(new Event('input', { bubbles: true }))
    await Promise.resolve()
    block.querySelector('.reps').value = '5'
    block.querySelector('.reps').dispatchEvent(new Event('input', { bubbles: true }))
    await Promise.resolve()

    expect(history.state?.started[0].note).toBe('This was hard')

    document.body.innerHTML = ''
    await Promise.resolve()
    const session2 = document.createElement('workout-session')
    session2.setAttribute('plan-id', plan.id)
    document.body.append(session2)
    await Promise.resolve()

    const block2 = document.querySelector('exercise-set-block')
    expect(block2.querySelector('[data-note]').value).toBe('This was hard')

    block2.querySelector('[data-save]').click()
    await Promise.resolve()

    const rec = store.getRecordsForExercise(ex.id)[0]
    expect(rec.note).toBe('This was hard')
  })

  describe('exercise classes and set schemes', () => {
    it('main always has warm-ups (regardless of category), accessory has none', async () => {
      const mainBarbell = store.addExercise('Squat', 'Barbell', 'main')
      const mainBW = store.addExercise('Push-up', 'Bodyweight', 'main')
      const plan = store.addPlan('Mixed')
      store.updatePlan(plan.id, { exerciseIds: [mainBarbell.id, mainBW.id] })
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
      expect(bwBlock.sets).toHaveLength(6)
      expect(barbellBlock.querySelector('.set-label.warmup')).not.toBeNull()
      expect(bwBlock.querySelector('.set-label.warmup')).not.toBeNull()
    })

    it('Plates still only for Barbell, regardless of tier', async () => {
      const barbellMain = store.addExercise('Squat', 'Barbell', 'main')
      const accBarbell = store.addExercise('Acc Barbell', 'Barbell', 'accessory')
      const accBW = store.addExercise('Push-up', 'Bodyweight', 'accessory')
      const plan = store.addPlan('PlatesCheck')
      store.updatePlan(plan.id, { exerciseIds: [barbellMain.id, accBarbell.id, accBW.id] })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)

      const [b1, b2, b3] = [...document.querySelectorAll('exercise-set-block')]
      b1.querySelector('.tw').value = '80'
      b1.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
      b2.querySelector('.tw').value = '40'
      b2.querySelector('.total').value = '30'
      b2.querySelector('.perSet').value = '10'
      b2.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
      b3.querySelector('.tw').value = '20'
      b3.querySelector('.total').value = '30'
      b3.querySelector('.perSet').value = '10'
      b3.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()

      expect(b1.querySelector('a[href^="#/plates"]')).not.toBeNull()
      expect(b2.querySelector('a[href^="#/plates"]')).not.toBeNull()
      expect(b3.querySelector('a[href^="#/plates"]')).toBeNull()
    })

    it('paged navigation shows one exercise at a time with dots and prev/next', async () => {
      const exs = [store.addExercise('A'), store.addExercise('B'), store.addExercise('C')]
      const plan = store.addPlan('Paged')
      store.updatePlan(plan.id, { exerciseIds: exs.map((e) => e.id) })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)
      await Promise.resolve()

      const blocks = [...document.querySelectorAll('exercise-set-block')]
      expect(blocks).toHaveLength(3)
      expect(blocks[0].hidden).toBe(false)
      expect(blocks[1].hidden).toBe(true)
      expect(blocks[2].hidden).toBe(true)
      expect(document.querySelector('[data-counter]').textContent).toBe('Exercise 1 of 3')
      expect(document.querySelectorAll('[data-dot]')).toHaveLength(3)
      expect(document.querySelector('[data-prev]').disabled).toBe(true)
      expect(document.querySelector('[data-next]').disabled).toBe(false)
      expect(document.querySelector('[data-collapse]')).toBeNull()

      document.querySelector('[data-next]').click()
      await Promise.resolve()
      expect(blocks[0].hidden).toBe(true)
      expect(blocks[1].hidden).toBe(false)
      expect(document.querySelector('[data-counter]').textContent).toBe('Exercise 2 of 3')
      expect(history.state?.index).toBe(1)

      document.querySelectorAll('[data-dot]')[2].click()
      await Promise.resolve()
      expect(blocks[2].hidden).toBe(false)
      expect(document.querySelector('[data-next]').disabled).toBe(true)

      document.querySelector('[data-prev]').click()
      await Promise.resolve()
      expect(blocks[1].hidden).toBe(false)

      // index persists across plates/history navigation
      document.body.innerHTML = ''
      await Promise.resolve()
      const session2 = document.createElement('workout-session')
      session2.setAttribute('plan-id', plan.id)
      document.body.append(session2)
      await Promise.resolve()
      const blocks2 = [...document.querySelectorAll('exercise-set-block')]
      expect(blocks2[1].hidden).toBe(false)
      expect(document.querySelector('[data-counter]').textContent).toBe('Exercise 2 of 3')
    })

    it('swipe left/right navigates and ignores swipes from inputs', async () => {
      const exs = [store.addExercise('A'), store.addExercise('B')]
      const plan = store.addPlan('Swipe')
      store.updatePlan(plan.id, { exerciseIds: exs.map((e) => e.id) })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)
      await Promise.resolve()
      const stage = document.querySelector('.workout-stage')

      const touch = (type, target, x) => {
        const ev = new Event(type, { bubbles: true })
        ev.changedTouches = [{ clientX: x, clientY: 10 }]
        Object.defineProperty(ev, 'target', { value: target })
        stage.dispatchEvent(ev)
      }
      const card = document.querySelector('.workout-stage .card')
      touch('touchstart', card, 200)
      touch('touchend', card, 100)
      await Promise.resolve()
      expect(session.index).toBe(1)

      touch('touchstart', card, 100)
      touch('touchend', card, 200)
      await Promise.resolve()
      expect(session.index).toBe(0)

      // swipe starting in an input is ignored
      const input = document.querySelector('exercise-set-block .tw')
      touch('touchstart', input, 200)
      touch('touchend', input, 100)
      await Promise.resolve()
      expect(session.index).toBe(0)
    })

    it('accessory generates sets from total/perSet', async () => {
      const acc = store.addExercise('Curl', 'Dumbbell', 'accessory')
      const plan = store.addPlan('AccPlan')
      store.updatePlan(plan.id, { exerciseIds: [acc.id] })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)

      const block = document.querySelector('exercise-set-block')
      block.querySelector('.tw').value = '20'
      expect(block.querySelector('.total').value).toBe('15')
      block.querySelector('.total').value = '45'
      block.querySelector('.perSet').value = '5'
      block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
      expect(block.sets).toHaveLength(9)
      expect(block.sets.every((s) => s.type === 'working')).toBe(true)
      expect(block.sets.every((s) => s.weightKg === 20)).toBe(true)
      expect(block.sets.every((s) => s.reps === null)).toBe(true)
      expect(block.suggestedReps).toBe(5)
      expect(block.querySelector('.reps').placeholder).toBe('5')

      document.body.innerHTML = ''
      history.replaceState(null, '', location.href)
      const acc2 = store.addExercise('Curl2', 'Dumbbell', 'accessory')
      const plan2 = store.addPlan('AccPlan2')
      store.updatePlan(plan2.id, { exerciseIds: [acc2.id] })
      const session2 = document.createElement('workout-session')
      session2.setAttribute('plan-id', plan2.id)
      document.body.append(session2)
      const block2 = document.querySelector('exercise-set-block')
      block2.querySelector('.tw').value = '20'
      block2.querySelector('.total').value = '45'
      block2.querySelector('.perSet').value = '15'
      block2.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
      expect(block2.sets).toHaveLength(3)
      expect(block2.sets.every((s) => s.reps === null)).toBe(true)
      expect(block2.suggestedReps).toBe(15)
      expect(block2.querySelector('.reps').placeholder).toBe('15')
    })

    it('bodyweight main accepts 0 extra weight with warm-ups at 0', async () => {
      const bw = store.addExercise('Pull-up', 'Bodyweight', 'main')
      const plan = store.addPlan('BWPlan')
      store.updatePlan(plan.id, { exerciseIds: [bw.id] })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)

      const block = document.querySelector('exercise-set-block')
      expect(block.querySelector('.tw').placeholder).toBe('Extra weight (kg)')
      block.querySelector('.tw').value = '0'
      block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()

      expect(block.sets).toHaveLength(6)
      expect(block.sets.every((s) => s.weightKg === 0)).toBe(true)
    })

    it('bodyweight accessory accepts 0 extra weight', async () => {
      const bw = store.addExercise('Dip', 'Bodyweight', 'accessory')
      const plan = store.addPlan('BWAccPlan')
      store.updatePlan(plan.id, { exerciseIds: [bw.id] })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)

      const block = document.querySelector('exercise-set-block')
      block.querySelector('.tw').value = '0'
      block.querySelector('.total').value = '30'
      block.querySelector('.perSet').value = '10'
      block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()

      expect(block.sets).toHaveLength(3)
      expect(block.sets.every((s) => s.weightKg === 0)).toBe(true)
    })

    it('bodyweight empty weight defaults to 0', async () => {
      const bw = store.addExercise('Pull-up', 'Bodyweight', 'main')
      const plan = store.addPlan('BWEmptyPlan')
      store.updatePlan(plan.id, { exerciseIds: [bw.id] })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)

      const block = document.querySelector('exercise-set-block')
      block.querySelector('.tw').value = ''
      block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()

      expect(block.sets).toHaveLength(6)
      expect(block.sets.every((s) => s.weightKg === 0)).toBe(true)
    })

    it('non-bodyweight still rejects 0 and empty weight', async () => {
      const bb = store.addExercise('Squat', 'Barbell', 'main')
      const plan = store.addPlan('RejectPlan')
      store.updatePlan(plan.id, { exerciseIds: [bb.id] })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)

      const block = document.querySelector('exercise-set-block')
      block.querySelector('.tw').value = '0'
      block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
      expect(block.sets).toHaveLength(0)

      block.querySelector('.tw').value = ''
      block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
      expect(block.sets).toHaveLength(0)
    })

    it('fixed sets: uses the scheme warm-up count and prefills the work set count', async () => {
      const ex = store.addExercise('Squat', 'Barbell', { type: 'fixedSets', warmupCount: 1, workSets: 5 })
      const plan = store.addPlan('SetsPlan')
      store.updatePlan(plan.id, { exerciseIds: [ex.id] })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)

      const block = document.querySelector('exercise-set-block')
      expect(block.querySelector('.worksets-field .field-label').textContent).toBe('Work sets')
      expect(block.querySelector('.worksets').value).toBe('5')

      block.querySelector('.tw').value = '100'
      block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()

      expect(block.sets.map((s) => s.type)).toEqual([
        'warmup', 'working', 'working', 'working', 'working', 'working'
      ])
      expect(block.sets[0].weightKg).toBe(50) // one warm-up at 50%
      expect(block.sets.slice(1).every((s) => s.weightKg === 100)).toBe(true)
    })

    it('fixed sets: the work set count can be overridden per workout', async () => {
      const ex = store.addExercise('Squat', 'Barbell', { type: 'fixedSets', warmupCount: 0, workSets: 5 })
      const plan = store.addPlan('SetsOverride')
      store.updatePlan(plan.id, { exerciseIds: [ex.id] })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)

      const block = document.querySelector('exercise-set-block')
      block.querySelector('.tw').value = '100'
      block.querySelector('.worksets').value = '2'
      block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()

      // no warm-ups configured, and the override wins over the stored 5
      expect(block.sets).toHaveLength(2)
      expect(block.sets.every((s) => s.type === 'working' && s.weightKg === 100)).toBe(true)
    })

    it('fixed reps: prefills total reps from the scheme and honors warm-ups', async () => {
      const ex = store.addExercise('Curl', 'Dumbbell', { type: 'fixedReps', warmupCount: 2, totalReps: 40 })
      const plan = store.addPlan('RepsPlan')
      store.updatePlan(plan.id, { exerciseIds: [ex.id] })
      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)

      const block = document.querySelector('exercise-set-block')
      expect(block.querySelector('.total').value).toBe('40')
      expect([...block.querySelectorAll('.tw-grid .field-label')].map((l) => l.textContent)).toEqual([
        'Total reps',
        'Reps / set'
      ])

      block.querySelector('.tw').value = '30'
      block.querySelector('.perSet').value = '10'
      block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()

      // 2 warm-ups (33% / 66% of 30) + 4 work sets for 40 total reps
      expect(block.sets.map((s) => s.type)).toEqual([
        'warmup', 'warmup', 'working', 'working', 'working', 'working'
      ])
      expect(block.sets.slice(0, 2).map((s) => s.weightKg)).toEqual([10, 20])
      expect(block.suggestedReps).toBe(10)
    })

    it('uses the plan slot scheme over the exercise default and snapshots it on save', async () => {
      const ex = store.addExercise('Squat', 'Barbell') // default: 3 warm-ups + 3 work sets
      const plan = store.addPlan('PlanScheme')
      const entry = store.addExerciseToPlan(plan.id, ex.id, {
        type: 'fixedSets',
        warmupCount: 1,
        workSets: 4
      })

      const session = document.createElement('workout-session')
      session.setAttribute('plan-id', plan.id)
      document.body.append(session)

      const block = document.querySelector('exercise-set-block')
      expect(block.querySelector('.worksets').value).toBe('4')

      block.querySelector('.tw').value = '100'
      block.querySelector('.worksets').value = '2' // per-workout override
      block.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()

      expect(block.sets).toHaveLength(3) // 1 warm-up + 2 work sets
      expect(block.sets[0]).toMatchObject({ type: 'warmup', weightKg: 50 })
      expect(history.state.started[0].performedScheme).toEqual({
        type: 'fixedSets',
        warmupCount: 1,
        workSets: 2
      })

      block.querySelector('.reps').value = '5'
      block.querySelector('.reps').dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
      block.querySelector('[data-save]').click()
      await Promise.resolve()

      const rec = store.getRecordsForExercise(ex.id)[0]
      expect(rec.planEntryId).toBe(entry.id)
      expect(rec.session.planName).toBe('PlanScheme')
      expect(rec.trainingWeightKg).toBe(100)
      // snapshot of what was actually executed, not the plan default
      expect(rec.setScheme.toJSON()).toEqual({ type: 'fixedSets', warmupCount: 1, workSets: 2 })
    })
  })

  describe('history weight filter', () => {
    async function showHistory(exerciseId) {
      await import('../src/components/exercise-history.js')
      const el = document.createElement('exercise-history')
      el.setAttribute('exercise-id', exerciseId)
      document.body.append(el)
      await Promise.resolve()
      return el
    }

    function addRec(exerciseId, date, tw) {
      store.addRecord({
        exerciseId,
        date,
        sets: [{ type: 'working', weightKg: tw, reps: 5 }]
      })
    }

    function setFilter(value) {
      const input = document.querySelector('[data-filter-weight]')
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }

    it('shows last 10 by default and finds older weights via filter', async () => {
      const ex = store.addExercise('Squat', 'Barbell', 'main')
      for (let d = 19; d <= 28; d++) addRec(ex.id, `2026-09-${d}T12:00:00.000Z`, 100)
      addRec(ex.id, '2026-07-15T12:00:00.000Z', 80)
      addRec(ex.id, '2026-07-01T12:00:00.000Z', 90)
      await showHistory(ex.id)

      expect(document.querySelectorAll('[data-records] .card')).toHaveLength(10)
      expect(document.querySelector('[data-count]').textContent).toBe('Showing last 10 of 12')

      setFilter('80')
      expect(document.querySelectorAll('[data-records] .card')).toHaveLength(1)
      expect(document.querySelector('[data-count]').textContent).toBe('1 record with 80 kg')

      document.querySelector('[data-clear-filter]').click()
      expect(document.querySelectorAll('[data-records] .card')).toHaveLength(10)
      expect(document.querySelector('[data-filter-weight]').value).toBe('')
    })

    it('shows a no-match message for unknown weights', async () => {
      const ex = store.addExercise('Squat', 'Barbell', 'main')
      addRec(ex.id, '2026-09-28T12:00:00.000Z', 100)
      await showHistory(ex.id)

      setFilter('999')
      expect(document.querySelectorAll('[data-records] .card')).toHaveLength(0)
      expect(document.querySelector('[data-records] .empty').textContent).toBe('No records with 999 kg.')
    })

    it('bodyweight history labels extra weight', async () => {
      const ex = store.addExercise('Pull-up', 'Bodyweight', 'main')
      addRec(ex.id, '2026-09-28T12:00:00.000Z', 0)
      await showHistory(ex.id)

      expect(document.querySelector('[data-filter-weight]').placeholder).toContain('extra')
      expect(document.querySelector('[data-records] .card-title .muted').textContent).toBe('Extra 0 kg')

      setFilter('0')
      expect(document.querySelectorAll('[data-records] .card')).toHaveLength(1)
    })
  })

  describe('backup view', () => {
    async function showBackup() {
      await import('../src/components/backup.js')
      const el = document.createElement('backup-view')
      document.body.append(el)
      await Promise.resolve()
      return el
    }

    function chooseFile(jsonText) {
      const input = document.querySelector('[data-file]')
      const file = new File([jsonText], 'workout-backup-test.json', { type: 'application/json' })
      Object.defineProperty(input, 'files', { value: [file], configurable: true })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }

    it('renders export and import controls without a share button in jsdom', async () => {
      store.addExercise('Squat')
      await showBackup()
      expect(document.querySelector('[data-export]').textContent).toBe('Download backup')
      expect(document.querySelector('[data-file]')).toBeTruthy()
      expect(document.querySelector('[data-share]')).toBeNull()
    })

    it('downloads a backup file on export', async () => {
      store.addExercise('Squat')
      await showBackup()
      const urls = []
      URL.createObjectURL = (blob) => {
        urls.push(blob)
        return 'blob:fake'
      }
      URL.revokeObjectURL = () => {}
      document.querySelector('[data-export]').click()
      expect(urls).toHaveLength(1)
      const exported = JSON.parse(await urls[0].text())
      expect(exported.version).toBe(3)
      expect(exported.data.exercises).toHaveLength(1)
      expect(document.querySelector('[data-status]').textContent).toContain('Saved workout-backup-')
    })

    it('imports a backup file with confirm, replacing phone data', async () => {
      const ex = store.addExercise('Squat')
      store.addRecord({ exerciseId: ex.id, sets: [{ type: 'working', weightKg: 100, reps: 5 }] })
      const fileText = JSON.stringify(store.exportData())

      store.clearAllData()
      store.addExercise('Local only')
      await showBackup()

      chooseFile(fileText)
      await new Promise((r) => setTimeout(r, 50))
      expect(document.querySelector('.backup-preview').textContent).toContain('1 exercise')
      expect(document.querySelector('.backup-preview').textContent).toContain('1 session')

      document.querySelector('[data-confirm]').click()
      expect(store.getData().exercises).toHaveLength(1)
      expect(store.getExercise(ex.id).name).toBe('Squat')
      expect(store.getRecordsForExercise(ex.id)).toHaveLength(1)
      expect(document.querySelector('[data-status]').textContent).toContain('Import complete')
    })

    it('shows an error for invalid files and keeps data', async () => {
      store.addExercise('Squat')
      await showBackup()

      chooseFile('this is not json')
      await new Promise((r) => setTimeout(r, 50))
      expect(document.querySelector('.backup-preview')).toBeNull()
      expect(document.querySelector('[data-status]').textContent).toContain('JSON')
      expect(store.getData().exercises).toHaveLength(1)
    })

    it('cancel discards the pending import', async () => {
      store.addExercise('Squat')
      const fileText = JSON.stringify(store.exportData())
      await showBackup()

      chooseFile(fileText)
      await new Promise((r) => setTimeout(r, 50))
      expect(document.querySelector('.backup-preview')).toBeTruthy()
      document.querySelector('[data-cancel]').click()
      expect(document.querySelector('.backup-preview')).toBeNull()
      expect(document.querySelector('[data-status]')).toBeNull()
    })
  })
})
