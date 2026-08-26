// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

await import('../src/components/header.js')

beforeEach(() => {
  document.body.innerHTML = ''
  location.hash = ''
  vi.restoreAllMocks()
})

describe('app-header back button', () => {
  it('renders button and title when back attribute is present', () => {
    const el = document.createElement('app-header')
    el.setAttribute('title', 'History: Squat')
    el.setAttribute('back', '#/')
    document.body.append(el)

    expect(el.querySelector('button.btn-back')).not.toBeNull()
    expect(el.querySelector('h1').textContent).toBe('History: Squat')
    expect(el.classList.contains('header')).toBe(true)
  })

  it('renders only title when no back attribute', () => {
    const el = document.createElement('app-header')
    el.setAttribute('title', 'Workout Tracker')
    document.body.append(el)

    expect(el.querySelector('button')).toBeNull()
    expect(el.querySelector('h1').textContent).toBe('Workout Tracker')
  })

  it('calls history.back() when there is previous history', async () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(5)
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {})

    const el = document.createElement('app-header')
    el.setAttribute('title', 'History')
    el.setAttribute('back', '#/')
    document.body.append(el)

    el.querySelector('button').click()

    expect(backSpy).toHaveBeenCalledOnce()
    expect(location.hash).toBe('')
  })

  it('falls back to the back attribute when there is no previous history', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1)

    const el = document.createElement('app-header')
    el.setAttribute('title', 'History')
    el.setAttribute('back', '#/')
    document.body.append(el)

    el.querySelector('button').click()

    expect(location.hash).toBe('#/')
  })

  it('falls back to custom destination when no history', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1)

    const el = document.createElement('app-header')
    el.setAttribute('title', 'Edit')
    el.setAttribute('back', '#/plans')
    document.body.append(el)

    el.querySelector('button').click()

    expect(location.hash).toBe('#/plans')
  })
})
