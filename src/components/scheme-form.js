import { SET_SCHEME_TYPES, SET_SCHEME_LABELS, SetScheme } from '../store.js'

export function isFixedSetsType(type) {
  return type !== 'fixedReps'
}

export function schemeTypeOptions(selected) {
  return SET_SCHEME_TYPES.map(
    (t) => `<option value="${t}" ${t === selected ? 'selected' : ''}>${SET_SCHEME_LABELS[t]}</option>`
  ).join('')
}

export function schemeValueLabel(type) {
  return isFixedSetsType(type) ? 'Work sets' : 'Total reps'
}

export function schemeValueDefault(type) {
  return isFixedSetsType(type) ? 3 : 15
}

export function buildScheme(type, warmupCount, value) {
  return new SetScheme(
    isFixedSetsType(type)
      ? { type, warmupCount, workSets: value }
      : { type, warmupCount, totalReps: value }
  )
}
