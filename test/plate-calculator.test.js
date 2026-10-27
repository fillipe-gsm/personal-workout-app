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
await import('../src/components/plate-calculator.js')

beforeEach(() => {
  store.clearAllData()
  storage.clear()
  document.body.innerHTML = ''
  history.replaceState(null, '', '/')
})

function createProfile() {
  const profile = store.addProfile('Test Gym', 20)
  store.updateProfile(profile.id, {
    plates: [
      { kg: 10, count: Infinity },
      { kg: 2, count: Infinity },
      { kg: 0.5, count: Infinity }
    ]
  })
  return profile
}

function showCalculator(target) {
  const el = document.createElement('plate-calculator')
  if (target != null) el.setAttribute('weight', String(target))
  document.body.append(el)
  return el
}

describe('plate calculator warn message', () => {
  it('reports the actual liftable total when the target is not exactly reachable', () => {
    createProfile() // 20 kg bar, 10/2/0.5 plates
    showCalculator(67.5) // best below: 10×2 + 2 + 0.5×3 = 23.5/side → 67 total

    const warn = document.querySelector('.warn')
    expect(warn).toBeTruthy()
    expect(warn.textContent).toContain('Not exactly reachable')
    expect(warn.textContent).toContain('0.25 kg/side missing')
    expect(warn.textContent).toContain('totaling 67 kg')
  })

  it('shows no warn message when the target is exactly reachable', () => {
    createProfile()
    showCalculator(67)

    expect(document.querySelector('.warn')).toBeNull()
    expect(document.querySelector('.result').textContent).toContain('Per side to load')
  })

  it('rounds the reported total to two decimals to hide float noise', () => {
    createProfile()
    showCalculator(100.13) // per side 40.065 is not buildable from 10/2/0.5 → best below is 40/side → 100 total

    const warn = document.querySelector('.warn')
    expect(warn).toBeTruthy()
    expect(warn.textContent).toContain('totaling 100 kg')
    expect(warn.textContent).not.toMatch(/9[0-9]*\.[0-9]{4,}/)
  })
})
