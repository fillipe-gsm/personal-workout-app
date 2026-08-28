import { getData, addExercise, deleteExercise, updateExercise, EXERCISE_CLASSES, EXERCISE_TIERS } from '../store.js'
import { ReactiveElement, esc } from './base.js'
import './header.js'

export class ExerciseList extends ReactiveElement {
  template() {
    const { exercises } = getData()
    const items = exercises.map(
      (ex) => `
        <li class="list-item">
          <span>${esc(ex.name)} <small class="badge">${esc(ex.category || 'Barbell')}</small> <small class="badge" style="background:rgba(47,191,113,0.15); color:var(--start)">${esc(ex.tier || 'main')}</small></span>
          <span>
            <select class="input" data-category="${ex.id}" style="flex:0 0 110px; width:auto; padding:6px 8px;">
              ${EXERCISE_CLASSES.map((c) => `<option value="${c}" ${c === (ex.category || 'Barbell') ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
            <select class="input" data-tier="${ex.id}" style="flex:0 0 105px; width:auto; padding:6px 8px;">
              ${EXERCISE_TIERS.map((t) => `<option value="${t}" ${t === (ex.tier || 'main') ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
            <a class="btn" href="#/history/${ex.id}">History</a>
            <button class="btn btn-danger" data-delete="${ex.id}" data-name="${esc(ex.name)}">✕</button>
          </span>
        </li>`
    )
    return `
      <div class="screen">
        <app-header title="Exercises" back="#/"></app-header>
        <form class="row" style="flex-wrap:wrap">
          <input class="input" type="text" placeholder="New exercise name" style="min-width:140px" />
          <select class="input" data-new-category style="flex:0 0 120px; width:auto;">
            ${EXERCISE_CLASSES.map((c) => `<option value="${c}">${c}</option>`).join('')}
          </select>
          <select class="input" data-new-tier style="flex:0 0 110px; width:auto;">
            ${EXERCISE_TIERS.map((t) => `<option value="${t}">${t}</option>`).join('')}
          </select>
          <button class="btn btn-primary" type="submit">Add</button>
        </form>
        <ul class="list">
          ${exercises.length ? items.join('') : '<li class="empty">No exercises yet</li>'}
        </ul>
      </div>`
  }

  bind() {
    const form = this.querySelector('form')
    const nameInput = form.querySelector('input[type="text"]')
    const categorySelect = form.querySelector('[data-new-category]')
    const tierSelect = form.querySelector('[data-new-tier]')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      if (!nameInput.value.trim()) return
      addExercise(nameInput.value, categorySelect.value, tierSelect.value)
    })
    this.querySelector('.list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-delete]')
      if (!btn) return
      if (confirm(`Delete "${btn.dataset.name}"?`)) deleteExercise(btn.dataset.delete)
    })
    this.querySelectorAll('[data-category]').forEach((sel) => {
      sel.addEventListener('change', () => {
        updateExercise(sel.dataset.category, { category: sel.value })
      })
    })
    this.querySelectorAll('[data-tier]').forEach((sel) => {
      sel.addEventListener('change', () => {
        updateExercise(sel.dataset.tier, { tier: sel.value })
      })
    })
  }
}

if (!customElements.get('exercise-list')) customElements.define('exercise-list', ExerciseList)
