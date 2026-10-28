import { getPlan, getExercise, addRecord, findRecordForExerciseOnDate, updateRecord, isBarbell, isBodyweight, fmtSetScheme, SetScheme } from '../store.js'
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
    const blocksData = plan.entries
      .map((entry) => ({ entry, exercise: getExercise(entry.exerciseId) }))
      .filter((x) => x.exercise)
    this.exercises = blocksData.map((x) => x.exercise)
    this.index = 0
    this.blocks = []
    this.innerHTML = `
      <div class="screen">
        <app-header title="Workout: ${esc(plan.name)}" back="#/plans"></app-header>
        <div class="row" style="margin-bottom:12px">
          <label class="muted" style="min-width:50px">Date</label>
          <input class="input" type="date" data-workout-date value="${today}" />
        </div>
        ${blocksData.length ? '' : '<p class="empty">This plan has no exercises.</p>'}
        <div class="workout-progress">
          <span class="muted" data-counter></span>
          <div class="dots" data-dots></div>
        </div>
        <div class="blocks workout-stage"></div>
        <div class="workout-nav">
          <button class="btn" data-prev>← Prev</button>
          <button class="btn" data-next>Next →</button>
        </div>
        <button class="btn btn-start big" data-conclude style="margin-top:12px; width:100%">Conclude workout</button>
      </div>`
    const stage = this.querySelector('.blocks')
    for (const { entry, exercise } of blocksData) {
      const block = document.createElement('exercise-set-block')
      block.entry = entry
      block.exercise = exercise
      stage.append(block)
      this.blocks.push(block)
    }

    this._stack = []
    this._onPopState = () => {
      const block = this._stack.pop()
      if (block && block.sets.length) {
        block.sets = []
        block.note = ''
        block.suggestedReps = null
        block.performedScheme = null
        block.saved = false
        block.renderInput()
        const i = this.blocks.indexOf(block)
        if (i >= 0) this.show(i, { push: true })
        else this._pushHistory()
      }
    }
    window.addEventListener('popstate', this._onPopState)

    this.querySelector('[data-prev]')?.addEventListener('click', () => this.show(this.index - 1))
    this.querySelector('[data-next]')?.addEventListener('click', () => this.show(this.index + 1))
    this.querySelector('[data-dots]')?.addEventListener('click', (e) => {
      const dot = e.target.closest('[data-dot]')
      if (dot) this.show(Number(dot.dataset.dot))
    })
    this.querySelector('[data-conclude]')?.addEventListener('click', () => {
      this._stack = []
      history.replaceState(null, '', location.href)
      location.hash = '#/'
    })

    let touchX = null
    let touchY = null
    stage.addEventListener(
      'touchstart',
      (e) => {
        if (e.target.closest('input, textarea, select')) return
        const t = e.changedTouches[0]
        touchX = t.clientX
        touchY = t.clientY
      },
      { passive: true }
    )
    stage.addEventListener(
      'touchend',
      (e) => {
        if (touchX == null) return
        if (e.target.closest('input, textarea, select')) {
          touchX = touchY = null
          return
        }
        const t = e.changedTouches[0]
        const dx = t.clientX - touchX
        const dy = t.clientY - touchY
        touchX = touchY = null
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0) this.show(this.index + 1)
          else this.show(this.index - 1)
        }
      },
      { passive: true }
    )

    const st = history.state
    if (st?.workoutPlanId === plan.id && Array.isArray(st.started)) {
      for (const entry of st.started) {
        const block =
          this.blocks.find((b) => entry.entryId && b.entry?.id === entry.entryId) ||
          this.blocks.find((b) => b.exercise.id === entry.exerciseId)
        if (!block) continue
        if (Array.isArray(entry.sets) && entry.sets.length) {
          block.sets = entry.sets.map((s) => ({ ...s }))
          block.note = entry.note || ''
          block.suggestedReps = entry.suggestedReps ?? null
        } else if (entry.tw != null) {
          const tw = entry.tw
          const scheme = block.scheme
          const works = scheme.isFixedSets ? scheme.workSets : 3
          block.sets = [
            ...warmupWeights(tw, scheme.warmupCount).map((weightKg) => ({ type: 'warmup', weightKg })),
            ...Array.from({ length: works }, () => ({ type: 'working', weightKg: tw }))
          ]
          block.note = entry.note || ''
          block.suggestedReps = entry.suggestedReps ?? null
        } else continue
        block.performedScheme = entry.performedScheme ? SetScheme.fromJSON(entry.performedScheme) : null
        block.saved = false
        block.renderSets()
        this._stack.push(block)
      }
      if (Number.isInteger(st.index)) this.index = st.index
    }
    this.show(this.index, { push: false })
  }

  disconnectedCallback() {
    if (this._onPopState) window.removeEventListener('popstate', this._onPopState)
  }

  show(i, { push = true } = {}) {
    if (!this.blocks?.length) return
    this.index = Math.max(0, Math.min(this.blocks.length - 1, i))
    this.blocks.forEach((b, bi) => {
      b.hidden = bi !== this.index
    })
    const counter = this.querySelector('[data-counter]')
    if (counter) counter.textContent = `Exercise ${this.index + 1} of ${this.blocks.length}`
    const dots = this.querySelector('[data-dots]')
    if (dots) {
      dots.innerHTML = this.blocks
        .map(
          (b, bi) =>
            `<button class="dot${bi === this.index ? ' active' : ''}${b.saved ? ' done' : ''}" data-dot="${bi}" aria-label="Exercise ${bi + 1}${b.saved ? ' saved' : ''}">${b.saved ? '✓' : bi + 1}</button>`
        )
        .join('')
    }
    const prev = this.querySelector('[data-prev]')
    const next = this.querySelector('[data-next]')
    if (prev) prev.disabled = this.index <= 0
    if (next) next.disabled = this.index >= this.blocks.length - 1
    if (push) this._pushHistory()
  }

  refreshDots() {
    const dots = this.querySelector('[data-dots]')
    if (!dots || !this.blocks) return
    dots.innerHTML = this.blocks
      .map(
        (b, bi) =>
          `<button class="dot${bi === this.index ? ' active' : ''}${b.saved ? ' done' : ''}" data-dot="${bi}" aria-label="Exercise ${bi + 1}${b.saved ? ' saved' : ''}">${b.saved ? '✓' : bi + 1}</button>`
      )
      .join('')
  }

  _pushHistory() {
    const started = this._stack.map((b) => ({
      entryId: b.entry?.id ?? null,
      exerciseId: b.exercise.id,
      sets: b.sets.map((s) => ({ ...s })),
      note: b.note || '',
      suggestedReps: b.suggestedReps ?? null,
      performedScheme: b.performedScheme ? b.performedScheme.toJSON() : null
    }))
    history.replaceState(
      { workoutPlanId: this.getAttribute('plan-id'), started, index: this.index },
      '',
      location.href
    )
  }
}

export class ExerciseSetBlock extends HTMLElement {
  connectedCallback() {
    this.sets = []
    this.note = ''
    this.suggestedReps = null
    this.saved = false
    this.renderInput()
  }

  /** Effective scheme: the plan slot wins over the exercise default. */
  get scheme() {
    return this.entry?.setScheme ?? this.exercise.setScheme
  }

  renderInput() {
    this.className = 'card'
    const scheme = this.scheme
    const fixedSets = scheme.isFixedSets
    const schemeBadge = `<small class="badge" style="background:rgba(47,191,113,0.15); color:var(--start)">${esc(fmtSetScheme(scheme))}</small>`
    const bw = isBodyweight(this.exercise)
    const twPlaceholder = bw ? 'Extra weight (kg)' : 'Training weight (kg)'
    if (fixedSets) {
      this.innerHTML = `
        <div class="card-title">
          <span>${esc(this.exercise.name)} ${schemeBadge}</span>
          <a class="btn btn-small" href="#/history/${this.exercise.id}">Last records</a>
        </div>
        <form class="workout-start">
          <input class="input tw" type="number" step="any" min="0" placeholder="${twPlaceholder}" />
          <label class="field worksets-field">
            <span class="field-label">Work sets</span>
            <input class="input worksets" type="number" step="1" min="1" value="${scheme.workSets}" />
          </label>
          <button class="btn btn-primary" type="submit">Start</button>
        </form>`
      this.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault()
        const raw = e.target.querySelector('.tw').value
        const tw = raw.trim() === '' && bw ? 0 : parseFloat(raw)
        const workSets = parseInt(e.target.querySelector('.worksets').value, 10)
        if (Number.isNaN(tw) || tw < 0 || (!bw && tw <= 0) || !workSets || workSets < 1) return
        this.performedScheme = scheme.withValue(workSets)
        this.sets = [
          ...warmupWeights(tw, scheme.warmupCount).map((weightKg) => ({ type: 'warmup', weightKg })),
          ...Array.from({ length: workSets }, () => ({ type: 'working', weightKg: tw }))
        ]
        this.note = ''
        this.saved = false
        this.renderSets()
        const session = this.closest('workout-session')
        if (session?._stack) {
          if (!session._stack.includes(this)) session._stack.push(this)
          session._pushHistory()
        }
      })
    } else {
      this.innerHTML = `
        <div class="card-title">
          <span>${esc(this.exercise.name)} ${schemeBadge}</span>
          <a class="btn btn-small" href="#/history/${this.exercise.id}">Last records</a>
        </div>
        <form class="workout-start-acc">
          <input class="input tw" type="number" step="any" min="0" placeholder="${twPlaceholder}" />
          <div class="tw-grid">
            <label class="field">
              <span class="field-label">Total reps</span>
              <input class="input total" type="number" step="1" min="1" value="${scheme.totalReps}" placeholder="Total reps" />
            </label>
            <label class="field">
              <span class="field-label">Reps / set</span>
              <input class="input perSet" type="number" step="1" min="1" placeholder="Reps / set" />
            </label>
          </div>
          <button class="btn btn-primary" type="submit">Start</button>
        </form>`
      this.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault()
        const raw = e.target.querySelector('.tw').value
        const tw = raw.trim() === '' && bw ? 0 : parseFloat(raw)
        const total = parseInt(e.target.querySelector('.total').value, 10)
        const perSet = parseInt(e.target.querySelector('.perSet').value, 10)
        if (Number.isNaN(tw) || tw < 0 || (!bw && tw <= 0) || !total || total <= 0 || !perSet || perSet <= 0) return
        const count = Math.max(1, Math.floor(total / perSet))
        this.suggestedReps = perSet
        this.performedScheme = scheme.withValue(total)
        this.sets = [
          ...warmupWeights(tw, scheme.warmupCount).map((weightKg) => ({ type: 'warmup', weightKg })),
          ...Array.from({ length: count }, () => ({ type: 'working', weightKg: tw, reps: null }))
        ]
        this.note = ''
        this.saved = false
        this.renderSets()
        const session = this.closest('workout-session')
        if (session?._stack) {
          if (!session._stack.includes(this)) session._stack.push(this)
          session._pushHistory()
        }
      })
    }
  }

  renderSets() {
    const bb = isBarbell(this.exercise)
    const fixedSets = this.scheme.isFixedSets
    const rows = this.sets.map((set, i) => {
      const warmupsSoFar = this.sets.slice(0, i).filter((s) => s.type === 'warmup').length
      const label =
        set.type === 'warmup'
          ? `Warm-up ${warmupsSoFar + 1}`
          : set.type === 'extra'
            ? 'Extra working set'
            : `Working set ${this.sets.slice(0, i).filter((s) => s.type === 'working').length + 1}`
      const ph = !fixedSets && this.suggestedReps != null ? this.suggestedReps : 'reps'
      return `
        <div class="set-row">
          <span class="set-label ${set.type}">${label}</span>
          <strong>${set.weightKg} kg</strong>
          <input class="input reps" data-index="${i}" type="number" min="0" placeholder="${ph}" value="${set.reps ?? ''}" />
          ${bb ? `<a class="btn btn-small" href="#/plates?weight=${set.weightKg}">Plates</a>` : ''}
        </div>`
    })
    const schemeBadge = `<small class="badge" style="background:rgba(47,191,113,0.15); color:var(--start)">${esc(fmtSetScheme(this.performedScheme ?? this.scheme))}</small>`
    this.innerHTML = `
      <div class="card-title">
        <span>${esc(this.exercise.name)} ${schemeBadge}</span>
        <a class="btn btn-small" href="#/history/${this.exercise.id}">Last records</a>
      </div>
      ${rows.join('')}
      <div class="row"><button class="btn" data-extra>+ Extra working set</button></div>
      <textarea class="input" data-note placeholder="Add a note... (e.g. This was hard)" rows="2" style="width:100%; margin-top:8px; resize:vertical">${esc(this.note || '')}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn btn-start big" data-save>Save exercise</button></div>
      ${this.saved ? '<p class="saved-note">✓ Saved</p>' : ''}`

    this.querySelectorAll('.reps').forEach((input) =>
      input.addEventListener('input', () => {
        const set = this.sets[Number(input.dataset.index)]
        set.reps = input.value === '' ? null : parseInt(input.value, 10)
        this.closest('workout-session')?._pushHistory()
      })
    )
    this.querySelector('[data-note]')?.addEventListener('input', (e) => {
      this.note = e.target.value
      this.closest('workout-session')?._pushHistory()
    })
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
    const dateForCheck = dateIso || new Date().toISOString()
    const existing = findRecordForExerciseOnDate(this.exercise.id, dateForCheck)
    const setsPayload = this.sets.map(({ type, weightKg, reps }) => ({ type, weightKg, reps: reps ?? null }))
    const notePayload = (this.note || '').trim()
    const planId = session?.getAttribute('plan-id') ?? null
    const plan = planId ? getPlan(planId) : null
    const snapshot = {
      setScheme: this.performedScheme ?? this.scheme,
      trainingWeightKg: this.workingWeight(),
      planId,
      planName: plan?.name ?? null,
      planEntryId: this.entry?.id ?? null
    }
    if (existing) {
      if (!confirm('There is a record for this exercise in this day already. Update it?')) return
      updateRecord(existing.id, { sets: setsPayload, note: notePayload, date: dateForCheck, ...snapshot })
    } else {
      addRecord({
        exerciseId: this.exercise.id,
        sets: setsPayload,
        note: notePayload,
        ...(dateIso ? { date: dateIso } : {}),
        ...snapshot
      })
    }
    this.saved = true
    this.renderSets()
    session?.refreshDots?.()
  }
}

if (!customElements.get('workout-session')) customElements.define('workout-session', WorkoutSession)
if (!customElements.get('exercise-set-block')) customElements.define('exercise-set-block', ExerciseSetBlock)
