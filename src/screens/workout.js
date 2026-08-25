import { el, header } from '../ui.js'
import { getPlan, getExercise, addRecord, getData } from '../store.js'
import { warmupWeights } from '../plates.js'

export function workoutScreen(params) {
  const plan = getPlan(params.id)
  if (!plan) return el('div', { class: 'screen' }, header('Plan not found', '#/plans'))
  const exercises = plan.exerciseIds.map(getExercise).filter(Boolean)

  return el(
    'div',
    { class: 'screen' },
    header(`Workout: ${plan.name}`, '#/plans'),
    exercises.length === 0
      ? el('p', { class: 'empty' }, 'This plan has no exercises.')
      : exercises.map((ex) => new ExerciseBlock(ex).root)
  )
}

class ExerciseBlock {
  constructor(exercise) {
    this.exercise = exercise
    this.sets = []
    this.root = el('div', { class: 'card' })
    this.renderInput()
  }

  renderInput() {
    this.root.innerHTML = ''
    const twInput = el('input', { class: 'input', type: 'number', step: '2.5', min: '0', placeholder: 'Training weight (kg)' })
    this.root.append(
      el('div', { class: 'card-title' },
        this.exercise.name,
        el('a', { class: 'btn', href: `#/history/${this.exercise.id}` }, 'Last records')
      ),
      el(
        'form',
        {
          class: 'row',
          onsubmit: (e) => {
            e.preventDefault()
            const tw = parseFloat(twInput.value)
            if (!tw || tw <= 0) return
            this.sets = [
              ...warmupWeights(tw).map((w) => ({ type: 'warmup', weightKg: w })),
              ...Array.from({ length: 3 }, () => ({ type: 'working', weightKg: tw }))
            ]
            this.renderSets()
          }
        },
        twInput,
        el('button', { class: 'btn btn-primary', type: 'submit' }, 'Start')
      )
    )
  }

  renderSets() {
    this.root.innerHTML = ''
    this.root.append(el('div', { class: 'card-title' }, this.exercise.name))
    this.sets.forEach((set, i) => {
      const repsInput = el('input', {
        class: 'input reps',
        type: 'number',
        min: '0',
        placeholder: 'reps',
        value: set.reps ?? '',
        oninput: () => (set.reps = repsInput.value === '' ? null : parseInt(repsInput.value, 10))
      })
      if (set.reps != null) repsInput.value = set.reps
      const label =
        set.type === 'warmup'
          ? `Warm-up ${this.warmupIndex(i) + 1}`
          : set.type === 'extra'
            ? 'Extra working set'
            : `Working set ${set.number}`
      this.root.append(
        el('div', { class: 'set-row' },
          el('span', { class: `set-label ${set.type}` }, label),
          el('strong', {}, `${set.weightKg} kg`),
          repsInput,
          el('a', { class: 'btn btn-small', href: `#/plates?weight=${set.weightKg}` }, 'Plates')
        )
      )
    })
    this.root.append(
      el('div', { class: 'row' },
        el('button', {
          class: 'btn',
          onclick: () => {
            this.sets.push({ type: 'extra', weightKg: this.workingWeight() })
            this.renderSets()
          }
        }, '+ Extra working set')
      ),
      el('div', { class: 'row' },
        el('button', { class: 'btn btn-start big', onclick: () => this.save() }, 'Save exercise')
      )
    )
  }

  warmupIndex(i) {
    return this.sets.slice(0, i).filter((s) => s.type === 'warmup').length
  }

  workingWeight() {
    const lastWorking = [...this.sets].reverse().find((s) => s.type !== 'warmup')
    return lastWorking ? lastWorking.weightKg : 0
  }

  save() {
    if (!this.sets.some((s) => s.reps != null)) {
      alert('Enter at least one rep count before saving.')
      return
    }
    addRecord({
      exerciseId: this.exercise.id,
      sets: this.sets.map(({ type, weightKg, reps }) => ({ type, weightKg, reps: reps ?? null }))
    })
    this.root.append(el('p', { class: 'saved-note' }, '✓ Saved'))
  }
}
