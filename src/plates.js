// Warm-up weights are evenly spaced percentages of the training weight between
// 0% and 100%, excluding both ends: 1 warm-up → 50%; 2 → 33%, 66%; 3 → 25%, 50%, 75%.
export function warmupWeights(twKg, count = 3) {
  const n = intOrCount(count)
  return Array.from({ length: n }, (_, i) => Math.floor((twKg * (i + 1)) / (n + 1)))
}

function intOrCount(value) {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function isBetter(candidate, existing) {
  if (!existing) return true
  const len = Math.min(candidate.length, existing.length)
  for (let i = 0; i < len; i++) {
    if (candidate[i] !== existing[i]) return candidate[i] > existing[i]
  }
  return candidate.length < existing.length
}

export function calcPlates(targetKg, profile) {
  const perSideTarget = (targetKg - profile.barbellKg) / 2
  if (perSideTarget < 0) {
    return { achievable: false, perSide: null, plates: [], leftoverPerSide: null }
  }
  if (perSideTarget === 0) {
    return { achievable: true, perSide: 0, plates: [], leftoverPerSide: 0 }
  }

  const factor = 100
  const targetScaled = Math.round(perSideTarget * factor)
  const sorted = [...profile.plates]
    .filter((p) => p.count === Infinity || p.count > 0)
    .filter((p) => p.kg > 0)
    .sort((a, b) => b.kg - a.kg)
    .map((p) => ({
      kg: p.kg,
      scaled: Math.round(p.kg * factor),
      count: p.count
    }))
    .filter((p) => p.scaled > 0)

  if (sorted.length === 0 || targetScaled <= 0) {
    return {
      achievable: targetScaled === 0,
      perSide: perSideTarget,
      plates: [],
      leftoverPerSide: perSideTarget
    }
  }

  const dp = new Array(targetScaled + 1).fill(null)
  dp[0] = []

  for (let idx = 0; idx < sorted.length; idx++) {
    const plate = sorted[idx]
    const perSideAvail =
      plate.count === Infinity ? Infinity : Math.floor(plate.count / 2)
    const maxCount =
      perSideAvail === Infinity
        ? Math.floor(targetScaled / plate.scaled)
        : Math.min(perSideAvail, Math.floor(targetScaled / plate.scaled))
    for (let c = 0; c < maxCount; c++) {
      for (let s = targetScaled - plate.scaled; s >= 0; s--) {
        if (dp[s] === null) continue
        const next = s + plate.scaled
        const candidate = [...dp[s], plate.kg].sort((a, b) => b - a)
        if (dp[next] === null || isBetter(candidate, dp[next])) {
          dp[next] = candidate
        }
      }
    }
  }

  let best = targetScaled
  while (best >= 0 && dp[best] === null) best--
  if (best < 0) best = 0

  const bestCombo = dp[best] || []
  const counts = new Map()
  for (const kg of bestCombo) {
    counts.set(kg, (counts.get(kg) || 0) + 1)
  }
  const plates = [...counts.entries()]
    .map(([kg, count]) => ({ kg, count }))
    .sort((a, b) => b.kg - a.kg)

  const achievable = best === targetScaled
  const leftoverPerSide = (targetScaled - best) / factor

  return {
    achievable,
    perSide: perSideTarget,
    plates,
    leftoverPerSide: leftoverPerSide > 0 ? Math.round(leftoverPerSide * 1000) / 1000 : 0
  }
}

export function fmtPlateCount(c) {
  return c === Infinity ? '∞' : String(c)
}
