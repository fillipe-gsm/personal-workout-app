import { getExercise, getRecordsForExercise } from '../store.js'
import { ReactiveElement, esc } from './base.js'
import './header.js'

export class ExerciseHistory extends ReactiveElement {
  template() {
    const exercise = getExercise(this.getAttribute('exercise-id'))
    if (!exercise) {
      return `<div class="screen"><app-header title="Not found" back="#/exercises"></app-header></div>`
    }
    const records = getRecordsForExercise(exercise.id).slice(0, 10)
    return `
      <div class="screen">
        <app-header title="History: ${esc(exercise.name)}" back="#/"></app-header>
        ${
          records.length
            ? records
                .map((rec, idx) => {
                  const tw = rec.sets.find((s) => s.type !== 'warmup')?.weightKg ?? '-'
                  return `
                    <div class="card">
                      <div class="card-title">
                        ${new Date(rec.date).toLocaleString()}
                        ${idx === 0 ? '<span class="badge">latest</span>' : ''}
                        <small class="muted">TW ${tw} kg</small>
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
                })
                .join('')
            : '<p class="empty">No records yet for this exercise.</p>'
        }
      </div>`
  }
}

if (!customElements.get('exercise-history')) customElements.define('exercise-history', ExerciseHistory)
