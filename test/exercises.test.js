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
  return [...document.querySelectorAll('.list-item > span:first-child')].map((n) => n.textContent)
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
})
