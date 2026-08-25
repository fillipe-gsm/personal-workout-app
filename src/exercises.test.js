// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

const storage = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
})

let exercisesScreen
let store

beforeEach(async () => {
  storage.clear()
  vi.resetModules()
  store = await import('./store.js')
  ;({ exercisesScreen } = await import('./screens/exercises.js'))
  document.body.innerHTML = ''
})

function listNames() {
  return [...document.querySelectorAll('.list-item > span:first-child')].map((n) => n.textContent)
}

function submitNewExercise(name) {
  const screen = document.querySelector('.screen')
  const input = screen.querySelector('form input')
  input.value = name
  screen.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

describe('exercises screen', () => {
  it('shows a new exercise in the list immediately after adding', () => {
    document.body.append(exercisesScreen())
    expect(listNames()).toEqual([])

    submitNewExercise('Squat')

    expect(listNames()).toEqual(['Squat'])
    expect(document.querySelector('form input').value).toBe('')
  })

  it('adds multiple exercises and reflects them all without navigation', () => {
    document.body.append(exercisesScreen())
    submitNewExercise('Bench Press')
    submitNewExercise('Deadlift')

    expect(listNames()).toEqual(['Bench Press', 'Deadlift'])
    expect(store.getData().exercises).toHaveLength(2)
  })

  it('removes an exercise from the list immediately after deleting', () => {
    vi.stubGlobal('confirm', () => true)
    document.body.append(exercisesScreen())
    submitNewExercise('Squat')

    document.querySelector('.btn-danger').click()

    expect(listNames()).toEqual([])
    expect(store.getData().exercises).toHaveLength(0)
  })

  it('does not add an exercise with an empty name', () => {
    document.body.append(exercisesScreen())
    submitNewExercise('   ')

    expect(store.getData().exercises).toHaveLength(0)
    expect(listNames()).toEqual([])
  })
})
