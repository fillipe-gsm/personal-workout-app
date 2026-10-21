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
await import('../src/components/profiles.js')

beforeEach(() => {
  store.clearAllData()
  document.body.innerHTML = ''
})

async function showProfiles() {
  const el = document.createElement('profile-list')
  document.body.append(el)
  await Promise.resolve()
  return el
}

function submit(form) {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

describe('weight profiles allow arbitrary plate weights', () => {
  it('does not constrain barbell or plate weight to 0.5 steps', async () => {
    store.addProfile('Gym', 20)
    await showProfiles()
    expect(document.querySelector('.barbell').getAttribute('step')).toBe('any')
    expect(document.querySelector('.new-plate').getAttribute('step')).toBe('any')
  })

  it('accepts a fractional barbell weight like 1.25', async () => {
    const el = await showProfiles()
    const form = el.querySelector('form')
    form.querySelector('input[type="text"]').value = 'Home'
    form.querySelector('.barbell').value = '1.25'
    submit(form)
    await Promise.resolve()

    expect(store.getData().profiles).toHaveLength(1)
    expect(store.getData().profiles[0].barbellKg).toBe(1.25)
  })

  it('accepts fractional plates like 1.25 and 0.25', async () => {
    store.addProfile('Gym', 20)
    await showProfiles()

    for (const kg of ['1.25', '0.25']) {
      const form = document.querySelector('weight-profile form')
      form.querySelector('.new-plate').value = kg
      submit(form)
      await Promise.resolve()
    }

    expect(store.getData().profiles[0].plates.map((p) => p.kg)).toEqual([1.25, 0.25])
  })

  it('calculator can use a 1.25 kg plate', async () => {
    const profile = store.addProfile('Gym', 0)
    store.updateProfile(profile.id, { plates: [{ kg: 1.25, count: Infinity }] })
    const { calcPlates } = await import('../src/plates.js')
    const result = calcPlates(5, store.getProfile(profile.id))
    expect(result.achievable).toBe(true)
    expect(result.plates).toEqual([{ kg: 1.25, count: 2 }])
  })
})
