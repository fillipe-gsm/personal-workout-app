const KEY = 'workout-app-data'

const DEFAULT_DATA = {
  exercises: [],
  plans: [],
  profiles: [],
  records: []
}

export function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const EXERCISE_CLASSES = ['Barbell', 'Bodyweight', 'Dumbbell', 'Machine']
const CATEGORY_ALIASES = { Dumbbel: 'Dumbbell' }

function normalizeCategory(c) {
  return CATEGORY_ALIASES[c] || c
}

export const EXERCISE_TIERS = ['main', 'accessory']

function normalizeTier(t) {
  return t === 'accessory' ? 'accessory' : 'main'
}

function normalize(d) {
  for (const profile of d.profiles) {
    profile.plates = (profile.plates || []).map(({ kg, count }) => ({
      kg,
      count: Number.isFinite(count) ? count : Infinity
    }))
  }
  for (const ex of d.exercises) {
    ex.category = normalizeCategory(ex.category)
    if (!ex.category || !EXERCISE_CLASSES.includes(ex.category)) ex.category = 'Barbell'
    ex.tier = normalizeTier(ex.tier)
  }
  return d
}

export function isBarbell(exercise) {
  return !exercise?.category || exercise.category === 'Barbell'
}

export function isMain(exercise) {
  return normalizeTier(exercise?.tier) === 'main'
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULT_DATA)
    return normalize({ ...structuredClone(DEFAULT_DATA), ...JSON.parse(raw) })
  } catch {
    return structuredClone(DEFAULT_DATA)
  }
}

let data = load()
const listeners = new Set()

export function getData() {
  return data
}

export function save() {
  localStorage.setItem(KEY, JSON.stringify(data))
  listeners.forEach((fn) => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function clearAllData() {
  data = structuredClone(DEFAULT_DATA)
  save()
}

export function addExercise(name, category = 'Barbell', tier = 'main') {
  category = normalizeCategory(category)
  if (!EXERCISE_CLASSES.includes(category)) category = 'Barbell'
  tier = normalizeTier(tier)
  const ex = { id: uid(), name: name.trim(), category, tier }
  data.exercises.push(ex)
  save()
  return ex
}

export function updateExercise(id, patch) {
  const ex = data.exercises.find((e) => e.id === id)
  if (ex) {
    if (patch.category) patch.category = normalizeCategory(patch.category)
    if (patch.category && !EXERCISE_CLASSES.includes(patch.category)) patch.category = 'Barbell'
    if (patch.tier) patch.tier = normalizeTier(patch.tier)
    Object.assign(ex, patch)
    save()
  }
  return ex
}

export function deleteExercise(id) {
  data.exercises = data.exercises.filter((e) => e.id !== id)
  for (const plan of data.plans) {
    plan.exerciseIds = plan.exerciseIds.filter((x) => x !== id)
  }
  save()
}

export function getExercise(id) {
  return data.exercises.find((e) => e.id === id)
}

export function addPlan(name) {
  const plan = { id: uid(), name: name.trim(), exerciseIds: [] }
  data.plans.push(plan)
  save()
  return plan
}

export function updatePlan(id, patch) {
  const plan = data.plans.find((p) => p.id === id)
  if (plan) Object.assign(plan, patch)
  save()
  return plan
}

export function deletePlan(id) {
  data.plans = data.plans.filter((p) => p.id !== id)
  save()
}

export function getPlan(id) {
  return data.plans.find((p) => p.id === id)
}

export function addProfile(name, barbellKg) {
  const profile = { id: uid(), name: name.trim(), barbellKg, plates: [] }
  data.profiles.push(profile)
  save()
  return profile
}

export function updateProfile(id, patch) {
  const profile = data.profiles.find((p) => p.id === id)
  if (profile) Object.assign(profile, patch)
  save()
  return profile
}

export function deleteProfile(id) {
  data.profiles = data.profiles.filter((p) => p.id !== id)
  save()
}

export function getProfile(id) {
  return data.profiles.find((p) => p.id === id)
}

export function addRecord(record) {
  const rec = { id: uid(), date: new Date().toISOString(), ...record }
  data.records.push(rec)
  save()
  return rec
}

export function findRecordForExerciseOnDate(exerciseId, dateIso) {
  const targetDay = new Date(dateIso).toISOString().split('T')[0]
  return data.records.find(
    (r) => r.exerciseId === exerciseId && new Date(r.date).toISOString().split('T')[0] === targetDay
  )
}

export function updateRecord(id, patch) {
  const rec = data.records.find((r) => r.id === id)
  if (rec) {
    Object.assign(rec, patch)
    save()
  }
  return rec
}

export function getRecordsForExercise(exerciseId) {
  return data.records
    .filter((r) => r.exerciseId === exerciseId)
    .sort((a, b) => b.date.localeCompare(a.date))
}
