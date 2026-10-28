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
await import('../src/components/exercise-list.js')

beforeEach(() => {
  store.clearAllData()
  document.body.innerHTML = ''
})

function listNames() {
  return [...document.querySelectorAll('.ex-name')].map((n) => n.textContent.trim())
}

async function submitNewExercise(name) {
  const form = document.querySelector('exercise-list form')
  form.querySelector('input').value = name
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await Promise.resolve()
}

describe('exercises screen', () => {
  it('shows a new exercise in the list immediately after adding', async () => {
    document.body.append(document.createElement('exercise-list'))
    await Promise.resolve()
    expect(listNames()).toEqual([])

    await submitNewExercise('Squat')

    expect(listNames()).toEqual(['Squat'])
    expect(document.querySelector('form input').value).toBe('')
  })

  it('adds multiple exercises and reflects them all without navigation', async () => {
    document.body.append(document.createElement('exercise-list'))
    await submitNewExercise('Bench Press')
    await submitNewExercise('Deadlift')

    expect(listNames()).toEqual(['Bench Press', 'Deadlift'])
    expect(store.getData().exercises).toHaveLength(2)
  })

  it('removes an exercise from the list immediately after deleting', async () => {
    vi.stubGlobal('confirm', () => true)
    document.body.append(document.createElement('exercise-list'))
    await submitNewExercise('Squat')

    document.querySelector('.btn-danger').click()
    await Promise.resolve()

    expect(listNames()).toEqual([])
    expect(store.getData().exercises).toHaveLength(0)
  })

  it('does not add an exercise with an empty name', async () => {
    document.body.append(document.createElement('exercise-list'))
    await submitNewExercise('   ')

    expect(store.getData().exercises).toHaveLength(0)
    expect(listNames()).toEqual([])
  })

  it('creates Barbell exercise by default and allows changing category via Edit', async () => {
    document.body.append(document.createElement('exercise-list'))
    await submitNewExercise('Squat')
    expect(store.getData().exercises[0].category).toBe('Barbell')
    expect(document.querySelector('.badge').textContent).toBe('Barbell')
    expect(document.querySelector('[data-category]')).toBeNull()

    document.querySelector('[data-edit]').click()
    await Promise.resolve()

    const sel = document.querySelector('[data-edit-category]')
    expect(sel).not.toBeNull()
    sel.value = 'Bodyweight'
    document.querySelector('[data-save]').click()
    await Promise.resolve()

    expect(store.getData().exercises[0].category).toBe('Bodyweight')
  })

  it('allows renaming an exercise via Edit and Save', async () => {
    document.body.append(document.createElement('exercise-list'))
    await submitNewExercise('Squat')
    document.querySelector('[data-edit]').click()
    await Promise.resolve()

    const nameInput = document.querySelector('[data-edit-name]')
    nameInput.value = 'Back Squat'
    document.querySelector('[data-save]').click()
    await Promise.resolve()

    expect(store.getData().exercises[0].name).toBe('Back Squat')
    expect(listNames()).toEqual(['Back Squat'])
  })

  it('cancels edit without saving changes', async () => {
    document.body.append(document.createElement('exercise-list'))
    await submitNewExercise('Squat')
    document.querySelector('[data-edit]').click()
    await Promise.resolve()

    document.querySelector('[data-edit-name]').value = 'Changed'
    document.querySelector('[data-cancel]').click()
    await Promise.resolve()

    expect(store.getData().exercises[0].name).toBe('Squat')
    expect(listNames()).toEqual(['Squat'])
  })

  it('adds exercise with selected category via form', async () => {
    document.body.append(document.createElement('exercise-list'))
    const form = document.querySelector('exercise-list form')
    form.querySelector('input').value = 'Push-up'
    form.querySelector('select').value = 'Bodyweight'
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(store.getData().exercises[0].category).toBe('Bodyweight')
    expect(document.querySelector('.badge').textContent).toBe('Bodyweight')
  })

  it('creates fixed-sets exercises by default (3 warm-ups + 3 work sets)', async () => {
    document.body.append(document.createElement('exercise-list'))
    await submitNewExercise('Squat')

    expect(store.getData().exercises[0].setScheme).toEqual({ type: 'fixedSets', warmupCount: 3, workSets: 3 })
    expect(document.querySelectorAll('.badge')[1].textContent).toBe('3 work sets + 3 WU')
    expect(document.querySelector('[data-new-scheme-value-label]').textContent).toBe('Work sets')
    expect(document.querySelector('.field-label').textContent).toBe('Warm-up sets')
  })

  it('adds a fixed-reps exercise via the form and updates the value field', async () => {
    document.body.append(document.createElement('exercise-list'))
    const form = document.querySelector('exercise-list form')
    const typeSelect = form.querySelector('[data-new-scheme-type]')
    const valueInput = form.querySelector('[data-new-scheme-value]')

    form.querySelector('input[type="text"]').value = 'Curl'
    typeSelect.value = 'fixedReps'
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }))
    expect(valueInput.placeholder).toBe('Total reps')
    expect(valueInput.value).toBe('15')
    expect(form.querySelector('[data-new-scheme-value-label]').textContent).toBe('Total reps')

    form.querySelector('[data-new-warmups]').value = '1'
    valueInput.value = '30'
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(store.getData().exercises[0].setScheme).toEqual({ type: 'fixedReps', warmupCount: 1, totalReps: 30 })
  })

  it('edits the set scheme via Edit and Save', async () => {
    document.body.append(document.createElement('exercise-list'))
    await submitNewExercise('Squat')
    document.querySelector('[data-edit]').click()
    await Promise.resolve()

    const typeSel = document.querySelector('[data-edit-scheme-type]')
    typeSel.value = 'fixedReps'
    typeSel.dispatchEvent(new Event('change', { bubbles: true }))
    document.querySelector('[data-edit-warmups]').value = '2'
    document.querySelector('[data-edit-scheme-value]').value = '30'
    document.querySelector('[data-save]').click()
    await Promise.resolve()

    expect(store.getData().exercises[0].setScheme).toEqual({ type: 'fixedReps', warmupCount: 2, totalReps: 30 })
    expect(document.querySelectorAll('.badge')[1].textContent).toBe('30 total reps + 2 WU')
  })

  it('handles Dumbbel typo as Dumbbell', async () => {
    const ex = store.addExercise('Curl', 'Dumbbel')
    expect(ex.category).toBe('Dumbbell')
  })
})
