import { getExercise, getRecordsForExercise, isBodyweight } from '../store.js'
import { ReactiveElement, esc } from './base.js'
import './header.js'

function trainingWeight(rec) {
  return rec.sets.find((s) => s.type !== 'warmup')?.weightKg ?? null
}

export class ExerciseHistory extends ReactiveElement {
  template() {
    const exercise = getExercise(this.getAttribute('exercise-id'))
    if (!exercise) {
      return `<div class="screen"><app-header title="Not found" back="#/exercises"></app-header></div>`
    }
    const bw = isBodyweight(exercise)
    const all = getRecordsForExercise(exercise.id)
    const filter = this._filter ?? null
    const view = this.filtered(all, filter)
    return `
      <div class="screen">
        <app-header title="History: ${esc(exercise.name)}" back="#/"></app-header>
        <div class="card hist-filter">
          <input class="input" data-filter-weight type="number" step="1" min="0" placeholder="Filter by ${bw ? 'extra' : 'training'} weight (kg)" value="${filter ?? ''}" />
          <button class="btn btn-small" data-clear-filter ${filter == null ? 'disabled' : ''}>Clear</button>
        </div>
        <p class="muted" data-count>${esc(view.countText)}</p>
        <div data-records>
          ${view.records.length ? view.records.map((rec, idx) => this.cardHTML(rec, idx, view, bw)).join('') : `<p class="empty">${esc(view.emptyText)}</p>`}
        </div>
      </div>`
  }

  filtered(all, filter) {
    if (filter == null || Number.isNaN(filter)) {
      const records = all.slice(0, 10)
      return {
        records,
        badgeLatest: true,
        countText:
          all.length === 0
            ? ''
            : all.length > records.length
              ? `Showing last ${records.length} of ${all.length}`
              : `${all.length} record${all.length === 1 ? '' : 's'}`,
        emptyText: 'No records yet for this exercise.'
      }
    }
    const matches = all.filter((r) => trainingWeight(r) === filter)
    const records = matches.slice(0, 20)
    return {
      records,
      badgeLatest: false,
      countText:
        matches.length === 0
          ? ''
          : matches.length > records.length
            ? `Showing ${records.length} of ${matches.length} with ${filter} kg`
            : `${matches.length} record${matches.length === 1 ? '' : 's'} with ${filter} kg`,
      emptyText: `No records with ${filter} kg.`
    }
  }

  cardHTML(rec, idx, view, bw) {
    const tw = trainingWeight(rec) ?? '-'
    const weightLabel = bw ? `Extra ${tw} kg` : `TW ${tw} kg`
    return `
      <div class="card">
        <div class="card-title">
          ${new Date(rec.date).toLocaleString()}
          ${view.badgeLatest && idx === 0 ? '<span class="badge">latest</span>' : ''}
          <small class="muted">${weightLabel}</small>
        </div>
        <ul class="sets-list">
          ${rec.sets
            .map(
              (s) =>
                `<li>${s.type === 'warmup' ? 'WU' : s.type === 'extra' ? 'Extra' : 'WS'}: ${s.weightKg} kg × ${s.reps ?? '?'}</li>`
            )
            .join('')}
        </ul>
        ${rec.note ? `<p class="muted" style="margin-top:8px; white-space:pre-wrap; font-style:italic">Note: ${esc(rec.note)}</p>` : ''}
      </div>`
  }

  bind() {
    const input = this.querySelector('[data-filter-weight]')
    input?.addEventListener('input', () => {
      const raw = input.value
      this._filter = raw.trim() === '' ? null : parseFloat(raw)
      this.refreshList()
    })
    this.querySelector('[data-clear-filter]')?.addEventListener('click', () => {
      this._filter = null
      this.refreshList()
    })
  }

  refreshList() {
    const exercise = getExercise(this.getAttribute('exercise-id'))
    if (!exercise) return
    const bw = isBodyweight(exercise)
    const all = getRecordsForExercise(exercise.id)
    const view = this.filtered(all, this._filter ?? null)
    const input = this.querySelector('[data-filter-weight]')
    if (input && input.value !== (this._filter == null ? '' : String(this._filter))) {
      input.value = this._filter == null ? '' : String(this._filter)
    }
    const clear = this.querySelector('[data-clear-filter]')
    if (clear) clear.disabled = this._filter == null
    const count = this.querySelector('[data-count]')
    if (count) count.textContent = view.countText
    const container = this.querySelector('[data-records]')
    if (container) {
      container.innerHTML = view.records.length
        ? view.records.map((rec, idx) => this.cardHTML(rec, idx, view, bw)).join('')
        : `<p class="empty">${esc(view.emptyText)}</p>`
    }
  }
}

if (!customElements.get('exercise-history')) customElements.define('exercise-history', ExerciseHistory)
