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

export const SET_SCHEME_TYPES = ['fixedSets', 'fixedReps']

export const DEFAULT_WARMUP_COUNT = 3
export const DEFAULT_WORK_SETS = 3
export const DEFAULT_TOTAL_REPS = 15

function intOr(value, min, fallback) {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n >= min ? n : fallback
}

// Accepts a stored/received setScheme and returns a normalized one. Legacy
// exercises only had a `tier`: main → fixed sets (3 warm-ups + 3 work sets),
// accessory → fixed reps (no warm-ups, 15 total reps).
export function normalizeSetScheme(input, legacyTier) {
  const raw = input && typeof input === 'object' ? input : null
  let type = raw?.type
  if (type !== 'fixedSets' && type !== 'fixedReps') {
    type = SET_SCHEME_TYPES.includes(legacyTier)
      ? legacyTier
      : legacyTier === 'accessory'
        ? 'fixedReps'
        : 'fixedSets'
  }
  const warmupFallback = type === 'fixedSets' ? DEFAULT_WARMUP_COUNT : 0
  const warmupCount = intOr(raw?.warmupCount, 0, warmupFallback)
  if (type === 'fixedReps') {
    return { type, warmupCount, totalReps: intOr(raw?.totalReps, 1, DEFAULT_TOTAL_REPS) }
  }
  return { type, warmupCount, workSets: intOr(raw?.workSets, 1, DEFAULT_WORK_SETS) }
}

export function defaultSetScheme(type = 'fixedSets') {
  return normalizeSetScheme({ type })
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
    ex.setScheme = normalizeSetScheme(ex.setScheme, ex.tier)
    delete ex.tier
  }
  return d
}

export function isBarbell(exercise) {
  return !exercise?.category || exercise.category === 'Barbell'
}

export function isBodyweight(exercise) {
  return exercise?.category === 'Bodyweight'
}

export function isFixedSets(exercise) {
  return normalizeSetScheme(exercise?.setScheme).type === 'fixedSets'
}

export function isFixedReps(exercise) {
  return normalizeSetScheme(exercise?.setScheme).type === 'fixedReps'
}

// Human-readable setScheme summary for badges/labels.
export function fmtSetScheme(scheme) {
  const s = normalizeSetScheme(scheme)
  const warmups = s.warmupCount > 0 ? ` + ${s.warmupCount} WU` : ''
  return s.type === 'fixedReps'
    ? `${s.totalReps} total reps${warmups}`
    : `${s.workSets} work sets${warmups}`
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

export function addExercise(name, category = 'Barbell', setScheme = null) {
  category = normalizeCategory(category)
  if (!EXERCISE_CLASSES.includes(category)) category = 'Barbell'
  // Also accepts legacy 'main'/'accessory' tier strings for convenience.
  const legacyTier = typeof setScheme === 'string' ? setScheme : undefined
  const ex = { id: uid(), name: name.trim(), category, setScheme: normalizeSetScheme(setScheme, legacyTier) }
  data.exercises.push(ex)
  save()
  return ex
}

export function updateExercise(id, patch) {
  const ex = data.exercises.find((e) => e.id === id)
  if (ex) {
    if (patch.category) patch.category = normalizeCategory(patch.category)
    if (patch.category && !EXERCISE_CLASSES.includes(patch.category)) patch.category = 'Barbell'
    if ('tier' in patch) {
      if (!patch.setScheme) patch.setScheme = normalizeSetScheme(null, patch.tier)
      delete patch.tier
    }
    if (patch.setScheme) patch.setScheme = normalizeSetScheme(patch.setScheme)
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

export const BACKUP_VERSION = 1

function backupSummary(payload) {
  return {
    exportedAt: payload.exportedAt ?? null,
    exercises: payload.data.exercises.length,
    plans: payload.data.plans.length,
    profiles: payload.data.profiles.length,
    records: payload.data.records.length
  }
}

function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Not a workout backup file.')
  }
  // Accept the canonical { version, exportedAt, data } envelope, or a bare
  // data object ({ exercises, plans, profiles, records }) for leniency.
  // A bare object with none of the collection keys is not a backup.
  const isEnvelope = payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
  const hasBareKey = ['exercises', 'plans', 'profiles', 'records'].some((k) => k in payload)
  if (!isEnvelope && !hasBareKey) throw new Error('Not a workout backup file.')
  const envelope = isEnvelope ? payload : null
  const raw = isEnvelope ? payload.data : payload
  const d = { ...structuredClone(DEFAULT_DATA), ...raw }
  for (const key of ['exercises', 'plans', 'profiles', 'records']) {
    if (!Array.isArray(d[key])) throw new Error('Backup is missing valid data.')
    if (!d[key].every((item) => item && typeof item === 'object')) {
      throw new Error('Backup contains invalid entries.')
    }
  }
  return {
    version: envelope?.version ?? null,
    exportedAt: typeof (envelope?.exportedAt ?? payload.exportedAt) === 'string'
      ? (envelope?.exportedAt ?? payload.exportedAt)
      : null,
    data: normalize(d)
  }
}

export function exportData() {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: structuredClone(data)
  }
}

export function previewBackup(fileText) {
  let parsed
  try {
    parsed = JSON.parse(fileText)
  } catch {
    throw new Error('Could not read that file as JSON.')
  }
  const payload = validateBackupPayload(parsed)
  return { payload, summary: backupSummary(payload) }
}

export function importBackup(payload) {
  // Accepts either the validated payload from previewBackup() (already a
  // valid envelope) or raw parsed JSON; validation runs in both cases.
  const valid = validateBackupPayload(payload)
  data = valid.data
  save()
  return backupSummary(valid)
}
