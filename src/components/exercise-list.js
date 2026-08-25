import { getData, addExercise, deleteExercise } from '../store.js'
import { ReactiveElement, esc } from './base.js'
import './header.js'

export class ExerciseList extends ReactiveElement {
  template() {
    const { exercises } = getData()
    const items = exercises.map(
      (ex) => `
        <li class="list-item">
          <span>${esc(ex.name)}</span>
          <span>
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
          <button class="btn btn-primary" type="submit">Add</button>
        </form>
        <ul class="list">
          ${exercises.length ? items.join('') : '<li class="empty">No exercises yet</li>'}
        </ul>
      </div>`
  }

  bind() {
    this.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault()
      const input = e.target.querySelector('input')
      if (!input.value.trim()) return
      addExercise(input.value)
    })
    this.querySelector('.list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-delete]')
      if (!btn) return
      if (confirm(`Delete "${btn.dataset.name}"?`)) deleteExercise(btn.dataset.delete)
    })
  }
}

if (!customElements.get('exercise-list')) customElements.define('exercise-list', ExerciseList)
