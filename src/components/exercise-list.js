import { getData, addExercise, deleteExercise, updateExercise, EXERCISE_CLASSES } from '../store.js'
import { ReactiveElement, esc } from './base.js'
import './header.js'

export class ExerciseList extends ReactiveElement {
  template() {
    const { exercises } = getData()
    const items = exercises.map(
      (ex) => `
        <li class="list-item">
          <span>${esc(ex.name)} <small class="badge">${esc(ex.category || 'Barbell')}</small></span>
          <span>
            <select class="input" data-category="${ex.id}" style="flex:0 0 110px; width:auto; padding:6px 8px;">
              ${EXERCISE_CLASSES.map((c) => `<option value="${c}" ${c === (ex.category || 'Barbell') ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
            <a class="btn" href="#/history/${ex.id}">History</a>
            <button class="btn btn-danger" data-delete="${ex.id}" data-name="${esc(ex.name)}">✕</button>
          </span>
        </li>`
    )
    return `
      <div class="screen">
        <app-header title="Exercises" back="#/"></app-header>
        <form class="row">
          <input class="input" type="text" placeholder="New exercise name" />
          <select class="input" style="flex:0 0 130px; width:auto;">
            ${EXERCISE_CLASSES.map((c) => `<option value="${c}">${c}</option>`).join('')}
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
    const categorySelect = form.querySelector('select')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      if (!nameInput.value.trim()) return
      addExercise(nameInput.value, categorySelect.value)
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
  }
}

if (!customElements.get('exercise-list')) customElements.define('exercise-list', ExerciseList)
