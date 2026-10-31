import {
  uid,
  EXERCISE_CATEGORIES,
  normalizeCategory,
  SET_SCHEME_TYPES,
  SET_SCHEME_LABELS,
  SetScheme,
  DEFAULT_WARMUP_COUNT,
  DEFAULT_WORK_SETS,
  DEFAULT_TOTAL_REPS,
  Exercise,
  ExerciseInWorkoutPlan,
  WorkoutPlan,
  WorkoutProgram,
  WeightProfile,
  WeightPlate,
  WorkoutSession,
  WorkoutSet,
  EntitySource
} from './models/index.js'
import { TEMPLATES } from './templates/index.js'

const KEY = 'workout-app-data'

// Compatibility exports (views/tests used these names before the model layer).
export const EXERCISE_CLASSES = EXERCISE_CATEGORIES
export {
  SET_SCHEME_TYPES,
  SET_SCHEME_LABELS,
  SetScheme,
  Exercise,
  ExerciseInWorkoutPlan,
  WorkoutPlan,
  WorkoutProgram,
  WeightProfile,
  WeightPlate,
  WorkoutSession,
  WorkoutSet,
  DEFAULT_WARMUP_COUNT,
  DEFAULT_WORK_SETS,
  DEFAULT_TOTAL_REPS,
  EntitySource,
  uid
}

export function isBarbell(exercise) {
  return !exercise?.category || exercise.category === 'Barbell'
}

export function isBodyweight(exercise) {
  return exercise?.category === 'Bodyweight'
}

export function isFixedSets(exercise) {
  return SetScheme.fromJSON(exercise?.setScheme).isFixedSets
}

export function isFixedReps(exercise) {
  return SetScheme.fromJSON(exercise?.setScheme).isFixedReps
}

/** Plain-object normalized scheme (kept for callers that serialize directly). */
export function normalizeSetScheme(input, legacyTier) {
  return SetScheme.fromJSON(input, legacyTier).toJSON()
}

export function defaultSetScheme(type) {
  return SetScheme.default(type).toJSON()
}

/** Human-readable setScheme summary for badges/labels. */
export function fmtSetScheme(scheme) {
  return SetScheme.fromJSON(scheme).describe()
}

function emptyData() {
  return { exercises: [], programs: [], plans: [], profiles: [], sessions: [] }
}

function toDay(value) {
  const d = value ? new Date(value) : new Date()
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)
}

function firstWorkingWeight(sets = []) {
  const found = sets.find((s) => s.type !== 'warmup')
  return found ? Number(found.weightKg) : null
}

/** Migrates the pre-model `records` array into one-exercise sessions. */
function migrateLegacyRecords(records = [], exercisesById = new Map()) {
  const groups = new Map()
  for (const rec of records) {
    if (!rec?.exerciseId) continue
    const day = toDay(rec.date)
    const planId = rec.planId ?? null
    const key = `${day}|${planId ?? ''}`
    if (!groups.has(key)) {
      groups.set(key, { day, planId, planName: rec.planName ?? null, exercises: [] })
    }
    groups.get(key).exercises.push(rec)
  }
  const sessions = []
  for (const group of groups.values()) {
    const session = new WorkoutSession({
      performedOn: group.day,
      planId: group.planId,
      planName: group.planName,
      exercises: []
    })
    for (const rec of group.exercises) {
      session.addExercise(rec.exerciseId, {
        setScheme: exercisesById.get(rec.exerciseId)?.setScheme ?? SetScheme.default(),
        trainingWeightKg: rec.trainingWeightKg ?? firstWorkingWeight(rec.sets),
        note: rec.note ?? null,
        sets: (rec.sets || []).map((s, i) => WorkoutSet.fromJSON(s, i))
      })
    }
    sessions.push(session)
  }
  return sessions
}

function planTemplateCatalog() {
  const catalog = new Map()
  for (const template of TEMPLATES) {
    for (const plan of template.plans) {
      catalog.set(plan.key ?? `${template.key}-${plan.name}`, template)
    }
  }
  return catalog
}

/**
 * Migrates pre-program data: plans installed from templates (identified by
 * `templateKey`) are grouped under one program per template; everything else
 * becomes standalone (programId = null). Positions follow the stored order.
 */
function groupLegacyPlans(rawPlans, resolveScheme) {
  const catalog = planTemplateCatalog()
  const programs = []
  const programsByTemplateKey = new Map()
  const plans = rawPlans.map((raw) => {
    const plan = WorkoutPlan.fromJSON(raw, resolveScheme)
    const template = plan.templateKey ? catalog.get(plan.templateKey) : null
    if (template) {
      let program = programsByTemplateKey.get(template.key)
      if (!program) {
        program = new WorkoutProgram({
          name: template.name,
          description: template.description,
          source: EntitySource.TEMPLATE,
          templateKey: template.key,
          templateVersion: raw.templateVersion ?? template.version ?? 1
        })
        programsByTemplateKey.set(template.key, program)
        programs.push(program)
      }
      plan.programId = program.id
    }
    return plan
  })
  const counters = new Map()
  for (const plan of plans) {
    const key = plan.programId ?? ''
    plan.position = counters.get(key) ?? 0
    counters.set(key, plan.position + 1)
  }
  return { programs, plans }
}

function normalize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const exercises = (Array.isArray(source.exercises) ? source.exercises : []).map(Exercise.fromJSON)
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const resolveScheme = (exerciseId) => byId.get(exerciseId)?.setScheme
  const rawPlans = Array.isArray(source.plans) ? source.plans : []

  let programs
  let plans
  if (Array.isArray(source.programs)) {
    programs = source.programs.map(WorkoutProgram.fromJSON)
    plans = rawPlans.map((p) => WorkoutPlan.fromJSON(p, resolveScheme))
    // Fill in positions only where they were not stored (older partial data).
    const counters = new Map()
    plans.forEach((plan, i) => {
      const key = plan.programId ?? ''
      if (rawPlans[i]?.position == null) plan.position = counters.get(key) ?? 0
      counters.set(key, Math.max(counters.get(key) ?? 0, plan.position + 1))
    })
  } else {
    ;({ programs, plans } = groupLegacyPlans(rawPlans, resolveScheme))
  }

  const profiles = (Array.isArray(source.profiles) ? source.profiles : []).map(WeightProfile.fromJSON)
  const sessions =
    Array.isArray(source.sessions) && source.sessions.length > 0
      ? source.sessions.map(WorkoutSession.fromJSON)
      : migrateLegacyRecords(Array.isArray(source.records) ? source.records : [], byId)

  // Backfill the program snapshot for sessions stored before programs existed.
  if (plans.length && programs.length) {
    const planById = new Map(plans.map((p) => [p.id, p]))
    const programById = new Map(programs.map((p) => [p.id, p]))
    for (const session of sessions) {
      if (session.programName != null || !session.planId) continue
      const plan = planById.get(session.planId)
      if (!plan?.programId) continue
      session.programId = plan.programId
      session.programName = programById.get(plan.programId)?.name ?? null
    }
  }

  return { exercises, programs, plans, profiles, sessions }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? normalize(JSON.parse(raw)) : emptyData()
  } catch {
    return emptyData()
  }
}

let data = load()
const listeners = new Set()

export function getData() {
  return data
}

export function save() {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      exercises: data.exercises,
      programs: data.programs,
      plans: data.plans,
      profiles: data.profiles,
      sessions: data.sessions
    })
  )
  listeners.forEach((fn) => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function clearAllData() {
  data = emptyData()
  save()
}

// --- Exercises -------------------------------------------------------------

export function addExercise(name, category = 'Barbell', setScheme = null) {
  // Also accepts legacy 'main'/'accessory' tier strings for convenience.
  const legacyTier = typeof setScheme === 'string' ? setScheme : undefined
  const exercise = new Exercise({
    name,
    category,
    setScheme: SetScheme.fromJSON(setScheme, legacyTier)
  })
  data.exercises.push(exercise)
  save()
  return exercise
}

export function updateExercise(id, patch) {
  const exercise = data.exercises.find((e) => e.id === id)
  if (!exercise) return exercise
  if (patch.name != null) exercise.name = String(patch.name).trim()
  if (patch.category != null) exercise.category = normalizeCategory(patch.category)
  if (patch.tier != null || patch.setScheme != null) {
    exercise.setScheme = SetScheme.fromJSON(patch.setScheme, patch.tier)
  }
  if (patch.deletedAt !== undefined) exercise.deletedAt = patch.deletedAt
  exercise.updatedAt = new Date().toISOString()
  save()
  return exercise
}

export function deleteExercise(id) {
  data.exercises = data.exercises.filter((e) => e.id !== id)
  for (const plan of data.plans) {
    const entry = plan.findEntryForExercise(id)
    if (entry) plan.removeEntry(entry.id)
  }
  save()
}

export function getExercise(id) {
  return data.exercises.find((e) => e.id === id)
}

export function getExercises() {
  return data.exercises
}

// --- Programs and their plans ---------------------------------------------

function nextPlanPosition(programId) {
  const siblings = data.plans.filter((p) => (p.programId ?? null) === (programId ?? null))
  return siblings.reduce((max, p) => Math.max(max, p.position + 1), 0)
}

function uniquePlanName(baseName, programId, excludeId = null) {
  const inScope = data.plans.filter(
    (p) => p.id !== excludeId && (p.programId ?? null) === (programId ?? null)
  )
  const taken = (name) => inScope.some((p) => p.name.trim().toLowerCase() === name.toLowerCase())
  const name = String(baseName).trim()
  if (!taken(name)) return name
  let candidate = `${name} (2)`
  let n = 3
  while (taken(candidate)) candidate = `${name} (${n++})`
  return candidate
}

function uniqueProgramName(baseName, excludeId = null) {
  const taken = (name) =>
    data.programs.some((p) => p.id !== excludeId && p.name.trim().toLowerCase() === name.toLowerCase())
  const name = String(baseName).trim()
  if (!taken(name)) return name
  let candidate = `${name} (2)`
  let n = 3
  while (taken(candidate)) candidate = `${name} (${n++})`
  return candidate
}

export function addProgram(
  name,
  { description = '', source = 'user', templateKey = null, templateVersion = null } = {}
) {
  const program = new WorkoutProgram({
    name: uniqueProgramName(name),
    description,
    source,
    templateKey,
    templateVersion
  })
  data.programs.push(program)
  save()
  return program
}

export function updateProgram(id, patch) {
  const program = data.programs.find((p) => p.id === id)
  if (!program) return program
  if (patch.name != null) program.name = uniqueProgramName(patch.name, id)
  if (patch.description !== undefined) program.description = String(patch.description ?? '')
  program.updatedAt = new Date().toISOString()
  save()
  return program
}

/**
 * Deletes a program but keeps its workouts: they become standalone.
 */
export function deleteProgram(id) {
  const program = data.programs.find((p) => p.id === id)
  if (!program) return
  data.programs = data.programs.filter((p) => p.id !== id)
  for (const plan of data.plans.filter((p) => p.programId === id)) {
    plan.programId = null
    plan.position = nextPlanPosition(null)
    plan.updatedAt = new Date().toISOString()
  }
  save()
}

export function getPrograms() {
  return data.programs
}

export function getProgram(id) {
  return data.programs.find((p) => p.id === id)
}

export function addPlan(
  name,
  { description = '', source = 'user', templateKey = null, programId = null } = {}
) {
  const pid = programId ?? null
  const plan = new WorkoutPlan({
    name: uniquePlanName(name, pid),
    description,
    source,
    templateKey,
    programId: pid,
    position: nextPlanPosition(pid)
  })
  data.plans.push(plan)
  save()
  return plan
}

/**
 * Patches a plan. Supports the legacy `{ exerciseIds: [...] }` shape by
 * rebuilding entries while keeping existing slots (and their schemes) intact.
 */
export function updatePlan(id, patch) {
  const plan = data.plans.find((p) => p.id === id)
  if (!plan) return plan
  if (patch.name != null) plan.name = uniquePlanName(patch.name, plan.programId, plan.id)
  if (patch.description !== undefined) plan.description = String(patch.description ?? '')
  if (patch.programId !== undefined) {
    const nextProgramId = patch.programId ?? null
    if (nextProgramId !== (plan.programId ?? null)) {
      plan.programId = nextProgramId
      plan.position = nextPlanPosition(nextProgramId)
    }
  }
  if (Array.isArray(patch.exerciseIds)) {
    const existing = new Map(plan.entries.map((e) => [e.exerciseId, e]))
    plan.entries = patch.exerciseIds
      .map((exerciseId, position) => {
        const entry = existing.get(exerciseId)
        if (entry) {
          entry.position = position
          return entry
        }
        return new ExerciseInWorkoutPlan({
          planId: plan.id,
          exerciseId,
          position,
          setScheme: getExercise(exerciseId)?.setScheme
        })
      })
      .sort((a, b) => a.position - b.position)
  }
  plan.updatedAt = new Date().toISOString()
  save()
  return plan
}

export function addExerciseToPlan(planId, exerciseId, setScheme) {
  const plan = data.plans.find((p) => p.id === planId)
  if (!plan) return null
  if (plan.findEntryForExercise(exerciseId)) return plan.findEntryForExercise(exerciseId)
  const entry = plan.addEntry(exerciseId, setScheme ?? getExercise(exerciseId)?.setScheme)
  plan.updatedAt = new Date().toISOString()
  save()
  return entry
}

export function updatePlanEntry(planId, entryId, patch) {
  const plan = data.plans.find((p) => p.id === planId)
  const entry = plan?.getEntry(entryId)
  if (!entry) return null
  if (patch.setScheme != null) entry.setScheme = SetScheme.fromJSON(patch.setScheme)
  plan.updatedAt = new Date().toISOString()
  save()
  return entry
}

export function removePlanEntry(planId, entryId) {
  const plan = data.plans.find((p) => p.id === planId)
  if (!plan) return
  plan.removeEntry(entryId)
  plan.updatedAt = new Date().toISOString()
  save()
}

export function movePlanEntry(planId, entryId, delta) {
  const plan = data.plans.find((p) => p.id === planId)
  if (!plan) return false
  const moved = plan.moveEntry(entryId, delta)
  if (moved) {
    plan.updatedAt = new Date().toISOString()
    save()
  }
  return moved
}

export function deletePlan(id) {
  data.plans = data.plans.filter((p) => p.id !== id)
  save()
}

export function getPlan(id) {
  return data.plans.find((p) => p.id === id)
}

export function getPlans() {
  return data.plans
}

/** Plans of a program, in display order. */
export function getPlansForProgram(programId) {
  return data.plans
    .filter((p) => p.programId === programId)
    .sort((a, b) => a.position - b.position)
}

/** Plans not attached to any program, in display order. */
export function getStandalonePlans() {
  return data.plans.filter((p) => p.programId == null).sort((a, b) => a.position - b.position)
}

// --- Cookie-cutter templates ----------------------------------------------

/**
 * Installs a template (see src/templates/*): creates/reuses its program, its
 * exercises (by name) and any workouts that are not installed yet.
 *
 * Everything is persisted with a single save() (one repaint, no half-installs).
 * Returns a summary for the UI.
 */
export function installTemplate(template) {
  if (!template?.key) throw new Error('Template key is required')
  const summary = {
    templateKey: template.key,
    programId: null,
    programName: null,
    createdProgram: null,
    createdExercises: [],
    reusedExercises: [],
    createdPlans: [],
    skippedPlans: []
  }
  try {
    let program = data.programs.find((p) => p.templateKey === template.key)
    if (!program) {
      program = new WorkoutProgram({
        name: uniqueProgramName(template.name),
        description: template.description ?? '',
        source: EntitySource.TEMPLATE,
        templateKey: template.key,
        templateVersion: template.version ?? 1
      })
      data.programs.push(program)
      summary.createdProgram = program.name
    }
    summary.programId = program.id
    summary.programName = program.name

    const exerciseByName = new Map(data.exercises.map((e) => [e.name.trim().toLowerCase(), e]))
    const ensureExercise = (spec) => {
      const key = spec.name.trim().toLowerCase()
      const existing = exerciseByName.get(key)
      if (existing) {
        summary.reusedExercises.push(existing.name)
        return existing
      }
      const exercise = new Exercise({
        name: spec.name,
        category: spec.category,
        setScheme: spec.setScheme,
        source: EntitySource.TEMPLATE
      })
      data.exercises.push(exercise)
      exerciseByName.set(key, exercise)
      summary.createdExercises.push(exercise.name)
      return exercise
    }

    for (const spec of template.exercises || []) ensureExercise(spec)

    ;(template.plans || []).forEach((planSpec, index) => {
      const planKey = planSpec.key ?? `${template.key}-${planSpec.name}`
      if (data.plans.some((p) => p.programId === program.id && p.templateKey === planKey)) {
        summary.skippedPlans.push(planSpec.name)
        return
      }
      const plan = new WorkoutPlan({
        name: uniquePlanName(planSpec.name, program.id),
        description: planSpec.description ?? template.description ?? '',
        source: EntitySource.TEMPLATE,
        templateKey: planKey,
        programId: program.id,
        position: index
      })
      for (const slot of planSpec.slots || []) {
        const exercise = exerciseByName.get(slot.exercise.trim().toLowerCase())
        if (!exercise) continue
        plan.addEntry(exercise.id, SetScheme.fromJSON(slot.setScheme))
      }
      data.plans.push(plan)
      summary.createdPlans.push(plan.name)
    })

    if (summary.createdProgram || summary.createdPlans.length || summary.createdExercises.length) save()
    return summary
  } catch (err) {
    // Roll back any in-memory changes so a failed install is a no-op.
    data = load()
    throw err
  }
}

/** How much of a template is already installed (for the Templates page). */
export function templateInstallState(template) {
  const program = data.programs.find((p) => p.templateKey === template.key)
  const keys = (template.plans || []).map((p) => p.key ?? `${template.key}-${p.name}`)
  const installed = program
    ? keys.filter((key) => data.plans.some((p) => p.programId === program.id && p.templateKey === key))
        .length
    : 0
  return { installed, total: keys.length, complete: keys.length > 0 && installed === keys.length }
}

// --- Weight profiles -------------------------------------------------------

export function addProfile(name, barbellKg) {
  const profile = new WeightProfile({ name, barbellKg, plates: [] })
  data.profiles.push(profile)
  save()
  return profile
}

export function updateProfile(id, patch) {
  const profile = data.profiles.find((p) => p.id === id)
  if (!profile) return profile
  if (patch.name != null) profile.name = String(patch.name).trim()
  if (patch.barbellKg != null) profile.barbellKg = Number(patch.barbellKg)
  if (Array.isArray(patch.plates)) {
    profile.plates = patch.plates.map((p) => (p instanceof WeightPlate ? p : WeightPlate.fromJSON(p)))
  }
  profile.updatedAt = new Date().toISOString()
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

export function getProfiles() {
  return data.profiles
}

// --- Sessions ("records") --------------------------------------------------

function findSessionExercise(id) {
  for (const session of data.sessions) {
    const entry = session.findExerciseById(id)
    if (entry) return { entry, session }
  }
  return null
}

/**
 * Records one exercise in a workout. Exercises saved for the same day+plan
 * are grouped into the same WorkoutSession. Returns the session-exercise.
 */
export function addRecord(record) {
  const day = toDay(record.date)
  const planId = record.planId ?? null
  let session = data.sessions.find(
    (s) => s.performedOn === day && (s.planId ?? null) === planId && !s.deletedAt
  )
  if (!session) {
    session = new WorkoutSession({
      performedOn: day,
      planId,
      planName: record.planName ?? null,
      programId: record.programId ?? null,
      programName: record.programName ?? null
    })
    data.sessions.push(session)
  } else if (session.programName == null && record.programName != null) {
    session.programId = record.programId ?? null
    session.programName = record.programName
  }
  let entry = session.findExercise(record.exerciseId)
  if (entry) {
    entry.replaceSets(record.sets || [])
    if (record.note != null) entry.note = record.note
  } else {
    entry = session.addExercise(record.exerciseId, {
      planEntryId: record.planEntryId ?? null,
      setScheme: record.setScheme ?? getExercise(record.exerciseId)?.setScheme,
      trainingWeightKg: record.trainingWeightKg ?? firstWorkingWeight(record.sets),
      note: record.note ?? null,
      sets: record.sets || []
    })
  }
  session.updatedAt = new Date().toISOString()
  save()
  return entry
}

export function findRecordForExerciseOnDate(exerciseId, dateIso) {
  const day = toDay(dateIso)
  const sessions = [...data.sessions]
    .filter((s) => !s.deletedAt && s.performedOn === day)
    .sort((a, b) => b.performedOn.localeCompare(a.performedOn))
  for (const session of sessions) {
    const entry = session.findExercise(exerciseId)
    if (entry) return entry.attachSession(session)
  }
  return undefined
}

export function updateRecord(id, patch) {
  const found = findSessionExercise(id)
  if (!found) return undefined
  const { entry, session } = found
  if (patch.sets) entry.replaceSets(patch.sets)
  if (patch.note !== undefined) entry.note = patch.note
  if (patch.setScheme != null) entry.setScheme = SetScheme.fromJSON(patch.setScheme)
  if (patch.trainingWeightKg != null) entry.trainingWeightKg = Number(patch.trainingWeightKg)
  if (patch.date) {
    const day = toDay(patch.date)
    if (day !== session.performedOn) {
      const samePlan = (s) => (s.planId ?? null) === (session.planId ?? null)
      if (session.exercises.length === 1) {
        session.performedOn = day
      } else {
        let target = data.sessions.find((s) => s !== session && s.performedOn === day && samePlan(s))
        if (!target) {
          target = new WorkoutSession({ performedOn: day, planId: session.planId, planName: session.planName })
          data.sessions.push(target)
        }
        session.exercises = session.exercises.filter((e) => e.id !== entry.id)
        entry.sessionId = target.id
        entry.position = target.exercises.length
        entry.attachSession(target)
        target.exercises.push(entry)
      }
    }
  }
  session.updatedAt = new Date().toISOString()
  save()
  return entry
}

/** Session-exercises for an exercise, newest first (history view). */
export function getRecordsForExercise(exerciseId) {
  return data.sessions
    .filter((s) => !s.deletedAt)
    .flatMap((session) =>
      session.exercises.filter((e) => e.exerciseId === exerciseId).map((e) => e.attachSession(session))
    )
    .sort((a, b) => (b.session?.performedOn || '').localeCompare(a.session?.performedOn || ''))
}

export function getSessions() {
  return data.sessions
}

// --- Backup ----------------------------------------------------------------

export const BACKUP_VERSION = 3

function exportShape() {
  return JSON.parse(
    JSON.stringify({
      exercises: data.exercises,
      programs: data.programs,
      plans: data.plans,
      profiles: data.profiles,
      sessions: data.sessions
    })
  )
}

function backupSummary(payload) {
  return {
    exportedAt: payload.exportedAt ?? null,
    exercises: payload.data.exercises.length,
    programs: payload.data.programs.length,
    plans: payload.data.plans.length,
    profiles: payload.data.profiles.length,
    sessions: payload.data.sessions.length
  }
}

function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Not a workout backup file.')
  }
  const isEnvelope = payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
  const hasBareKey = ['exercises', 'programs', 'plans', 'profiles', 'sessions', 'records'].some(
    (k) => k in payload
  )
  if (!isEnvelope && !hasBareKey) throw new Error('Not a workout backup file.')
  const envelope = isEnvelope ? payload : null
  const raw = isEnvelope ? payload.data : payload
  const d = { ...emptyData(), ...raw }
  for (const key of ['exercises', 'programs', 'plans', 'profiles']) {
    if (!Array.isArray(d[key])) throw new Error('Backup is missing valid data.')
    if (!d[key].every((item) => item && typeof item === 'object')) {
      throw new Error('Backup contains invalid entries.')
    }
  }
  if ('sessions' in raw && !Array.isArray(raw.sessions)) throw new Error('Backup is missing valid data.')
  if ('records' in raw && !Array.isArray(raw.records)) throw new Error('Backup is missing valid data.')
  return {
    version: envelope?.version ?? null,
    exportedAt:
      typeof (envelope?.exportedAt ?? payload.exportedAt) === 'string'
        ? (envelope?.exportedAt ?? payload.exportedAt)
        : null,
    data: normalize(d)
  }
}

export function exportData() {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: exportShape()
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
  const valid = validateBackupPayload(payload)
  data = valid.data
  save()
  return backupSummary(valid)
}
