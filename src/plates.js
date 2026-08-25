export function warmupWeights(twKg) {
  return [0.4, 0.6, 0.8].map((pct) => Math.floor(twKg * pct))
}

export function calcPlates(targetKg, profile) {
  const flooredTarget = Math.floor(targetKg)
  const perSideTarget = (flooredTarget - profile.barbellKg) / 2
  if (perSideTarget < 0) {
    return { achievable: false, perSide: null, plates: [], leftoverPerSide: null }
  }
  let remaining = Math.round(perSideTarget * 1000) / 1000
  const used = []
  const sorted = [...profile.plates].sort((a, b) => b.kg - a.kg)
  for (const p of sorted) {
    if (remaining <= 0) break
    if (!(p.count > 0) && p.count !== Infinity) continue
    const n = Math.min(Math.floor(remaining / p.kg + 1e-9), p.count)
    if (n > 0) {
      used.push({ kg: p.kg, count: n })
      remaining -= n * p.kg
      remaining = Math.round(remaining * 1000) / 1000
    }
  }
  return {
    achievable: remaining < 0.001,
    perSide: perSideTarget,
    plates: used,
    leftoverPerSide: remaining > 0 ? remaining : 0
  }
}

export function fmtPlateCount(c) {
  return c === Infinity ? '∞' : String(c)
}
