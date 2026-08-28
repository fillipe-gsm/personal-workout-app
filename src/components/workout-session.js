import { getPlan, getExercise, addRecord, isBarbell } from '../store.js'
import { warmupWeights } from '../plates.js'
import { esc } from './base.js'
import './header.js'

export class WorkoutSession extends HTMLElement {
  connectedCallback() {
    const plan = getPlan(this.getAttribute('plan-id'))
    if (!plan) {
      this.innerHTML = `<div class="screen"><app-header title="Plan not found" back="#/plans"></app-header></div>`
      return
    }
    const today = new Date().toISOString().split('T')[0]
    const exercises = plan.exerciseIds.map(getExercise).filter(Boolean)
    this.innerHTML = `
      <div class="screen">
        <app-header title="Workout: ${esc(plan.name)}" back="#/plans"></app-header>
        <div class="row" style="margin-bottom:12px">
          <label class="muted" style="min-width:50px">Date</label>
          <input class="input" type="date" data-workout-date value="${today}" />
        </div>
        ${exercises.length ? '' : '<p class="empty">This plan has no exercises.</p>'}
        <div class="blocks"></div>
        <button class="btn btn-start big" data-conclude style="margin-top:16px; width:100%">Conclude workout</button>
      </div>`
    const blocks = this.querySelector('.blocks')
    for (const exercise of exercises) {
      const block = document.createElement('exercise-set-block')
      block.exercise = exercise
      blocks.append(block)
    }

    this._stack = []
    this._onPopState = () => {
      const block = this._stack.pop()
      if (block && block.sets.length) {
        block.sets = []
        block.saved = false
        block.renderInput()
      }
    }
    window.addEventListener('popstate', this._onPopState)

    this.querySelector('[data-conclude]')?.addEventListener('click', () => {
      this._stack = []
      history.replaceState(null, '', location.href)
      location.hash = '#/'
    })

    const st = history.state
    if (st?.workoutPlanId === plan.id && Array.isArray(st.started)) {
      for (const entry of st.started) {
        const block = [...this.querySelectorAll('exercise-set-block')].find(
          (b) => b.exercise.id === entry.exerciseId
        )
        if (!block) continue
        if (Array.isArray(entry.sets) && entry.sets.length) {
          block.sets = entry.sets.map((s) => ({ ...s }))
        } else if (entry.tw) {
          const bb = isBarbell(block.exercise)
          const tw = entry.tw
          block.sets = bb
            ? [
                ...warmupWeights(tw).map((weightKg) => ({ type: 'warmup', weightKg })),
                ...Array.from({ length: 3 }, () => ({ type: 'working', weightKg: tw }))
              ]
            : Array.from({ length: 3 }, () => ({ type: 'working', weightKg: tw }))
        } else continue
        block.saved = false
        block.renderSets()
        this._stack.push(block)
      }
    }
  }

  disconnectedCallback() {
    if (this._onPopState) window.removeEventListener('popstate', this._onPopState)
  }

  _pushHistory() {
    const started = this._stack.map((b) => ({
      exerciseId: b.exercise.id,
      sets: b.sets.map((s) => ({ ...s }))
    }))
    history.replaceState({ workoutPlanId: this.getAttribute('plan-id'), started }, '', location.href)
  }
}

export class ExerciseSetBlock extends HTMLElement {
  connectedCallback() {
    this.sets = []
    this.saved = false
    this.renderInput()
  }

  renderInput() {
    this.className = 'card'
    this.innerHTML = `
      <div class="card-title">
        ${esc(this.exercise.name)}
        <a class="btn" href="#/history/${this.exercise.id}">Last records</a>
      </div>
      <form class="row">
        <input class="input tw" type="number" step="1" min="0" placeholder="Training weight (kg)" />
        <button class="btn btn-primary" type="submit">Start</button>
      </form>`
    this.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault()
      const tw = parseFloat(e.target.querySelector('.tw').value)
      if (!tw || tw <= 0) return
      const bb = isBarbell(this.exercise)
      this.sets = bb
        ? [
            ...warmupWeights(tw).map((weightKg) => ({ type: 'warmup', weightKg })),
            ...Array.from({ length: 3 }, () => ({ type: 'working', weightKg: tw }))
          ]
        : Array.from({ length: 3 }, () => ({ type: 'working', weightKg: tw }))
      this.saved = false
      this.renderSets()
      const session = this.closest('workout-session')
      if (session?._stack) {
        session._stack.push(this)
        session._pushHistory()
      }
    })
  }

  renderSets() {
    const bb = isBarbell(this.exercise)
    const rows = this.sets.map((set, i) => {
      const warmupsSoFar = this.sets.slice(0, i).filter((s) => s.type === 'warmup').length
      const label =
        set.type === 'warmup'
          ? `Warm-up ${warmupsSoFar + 1}`
          : set.type === 'extra'
            ? 'Extra working set'
            : `Working set ${this.sets.slice(0, i).filter((s) => s.type === 'working').length + 1}`
      return `
        <div class="set-row">
          <span class="set-label ${set.type}">${label}</span>
          <strong>${set.weightKg} kg</strong>
          <input class="input reps" data-index="${i}" type="number" min="0" placeholder="reps" value="${set.reps ?? ''}" />
          ${bb ? `<a class="btn btn-small" href="#/plates?weight=${set.weightKg}">Plates</a>` : ''}
        </div>`
    })
    this.innerHTML = `
      <div class="card-title">${esc(this.exercise.name)}</div>
      ${rows.join('')}
      <div class="row"><button class="btn" data-extra>+ Extra working set</button></div>
      <div class="row"><button class="btn btn-start big" data-save>Save exercise</button></div>
      ${this.saved ? '<p class="saved-note">✓ Saved</p>' : ''}`

    this.querySelectorAll('.reps').forEach((input) =>
      input.addEventListener('input', () => {
        const set = this.sets[Number(input.dataset.index)]
        set.reps = input.value === '' ? null : parseInt(input.value, 10)
        this.closest('workout-session')?._pushHistory()
      })
    )
    this.querySelector('[data-extra]').addEventListener('click', () => {
      this.sets.push({ type: 'extra', weightKg: this.workingWeight() })
      this.renderSets()
      this.closest('workout-session')?._pushHistory()
    })
    this.querySelector('[data-save]').addEventListener('click', () => this.save())
  }

  workingWeight() {
    const last = [...this.sets].reverse().find((s) => s.type !== 'warmup')
    return last ? last.weightKg : 0
  }

  save() {
    if (!this.sets.some((s) => s.reps != null)) {
      alert('Enter at least one rep count before saving.')
      return
    }
    const session = this.closest('workout-session')
    const dateInput = session?.querySelector('[data-workout-date]')
    let dateIso = null
    if (dateInput?.value) {
      dateIso = new Date(dateInput.value + 'T12:00:00').toISOString()
    }
    addRecord({
      exerciseId: this.exercise.id,
      sets: this.sets.map(({ type, weightKg, reps }) => ({ type, weightKg, reps: reps ?? null })),
      ...(dateIso ? { date: dateIso } : {})
    })
    this.saved = true
    this.renderSets()
  }
}

if (!customElements.get('workout-session')) customElements.define('workout-session', WorkoutSession)
if (!customElements.get('exercise-set-block')) customElements.define('exercise-set-block', ExerciseSetBlock)
