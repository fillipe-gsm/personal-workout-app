import { describe, it, expect } from 'vitest'
import { calcPlates, warmupWeights } from './plates.js'

const stdProfile = {
  barbellKg: 20,
  plates: [
    { kg: 25, count: 2 },
    { kg: 20, count: 2 },
    { kg: 10, count: 2 },
    { kg: 5, count: Infinity },
    { kg: 2.5, count: Infinity },
    { kg: 1.25, count: Infinity }
  ]
}

function loadedWeight(result, profile) {
  return result.plates.reduce((sum, p) => sum + p.kg * p.count, 0) * 2 + profile.barbellKg
}

describe('warmupWeights', () => {
  it('generates 40/60/80% floored to integer', () => {
    expect(warmupWeights(80)).toEqual([32, 48, 64])
  })

  it('floors fractional warm-up weights down', () => {
    expect(warmupWeights(57)).toEqual([22, 34, 45])
  })

  it('handles small training weights', () => {
    expect(warmupWeights(10)).toEqual([4, 6, 8])
  })
})

describe('calcPlates', () => {
  it('computes an exact load with standard plates', () => {
    const r = calcPlates(100, stdProfile)
    expect(r.achievable).toBe(true)
    expect(r.perSide).toBe(40)
    expect(r.plates).toEqual([
      { kg: 25, count: 1 },
      { kg: 10, count: 1 },
      { kg: 5, count: 1 }
    ])
  })

  it('takes several infinite plates when needed and continues to smaller ones', () => {
    const profile = {
      barbellKg: 20,
      plates: [
        { kg: 10, count: Infinity },
        { kg: 2, count: Infinity },
        { kg: 0.5, count: Infinity }
      ]
    }
    const r = calcPlates(67.5, profile)
    expect(r.perSide).toBe(23.5)
    expect(r.achievable).toBe(true)
    expect(r.plates).toEqual([
      { kg: 10, count: 2 },
      { kg: 2, count: 1 },
      { kg: 0.5, count: 3 }
    ])
  })

  it('floors the target weight to integer before calculating (11.5 -> 11)', () => {
    const profile = { barbellKg: 0, plates: [{ kg: 5, count: Infinity }] }
    const r = calcPlates(11.5, profile)
    expect(r.perSide).toBe(5.5)
    expect(r.plates).toEqual([{ kg: 5, count: 1 }])
    expect(loadedWeight(r, profile)).toBe(10)
    expect(r.leftoverPerSide).toBeCloseTo(0.5)
  })

  it('respects limited plate quantities and degrades gracefully', () => {
    const profile = { barbellKg: 20, plates: [{ kg: 10, count: 1 }] }
    const r = calcPlates(60, profile)
    expect(r.achievable).toBe(false)
    expect(r.plates).toEqual([{ kg: 10, count: 1 }])
    expect(r.leftoverPerSide).toBe(10)
  })

  it('reports nothing needed when target equals the bar', () => {
    const r = calcPlates(20, stdProfile)
    expect(r.perSide).toBe(0)
    expect(r.plates).toEqual([])
    expect(r.achievable).toBe(true)
  })

  it('rejects targets below the bar weight', () => {
    const r = calcPlates(15, stdProfile)
    expect(r.achievable).toBe(false)
    expect(r.perSide).toBeNull()
    expect(r.plates).toEqual([])
  })

  it('skips plates with zero or negative count', () => {
    const profile = { barbellKg: 20, plates: [{ kg: 10, count: 0 }, { kg: 5, count: Infinity }] }
    const r = calcPlates(30, profile)
    expect(r.plates).toEqual([{ kg: 5, count: 1 }])
    expect(r.achievable).toBe(true)
  })

  it('never loads above the floored target', () => {
    const targets = [21, 33, 47.9, 62.5, 87.3]
    for (const t of targets) {
      const r = calcPlates(t, stdProfile)
      if (r.perSide !== null && r.achievable) {
        expect(loadedWeight(r, stdProfile)).toBeLessThanOrEqual(Math.floor(t))
      }
    }
  })
})
