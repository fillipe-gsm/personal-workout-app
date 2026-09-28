import { getData, addExercise, deleteExercise, updateExercise, EXERCISE_CLASSES, EXERCISE_TIERS } from '../store.js'
import { ReactiveElement, esc } from './base.js'
import './header.js'

export class ExerciseList extends ReactiveElement {
  template() {
    const { exercises } = getData()
    const items = exercises.map(
      (ex) => `
        <li class="card ex-card" data-card="${ex.id}">
          <div class="ex-top">
            <div class="ex-name-wrap">
              <div class="ex-name">${esc(ex.name)}</div>
              <div class="ex-badges"><small class="badge">${esc(ex.category || 'Barbell')}</small> <small class="badge" style="background:rgba(47,191,113,0.15); color:var(--start)">${esc(ex.tier || 'main')}</small></div>
            </div>
            <div class="ex-actions">
              <a class="btn btn-small" href="#/history/${ex.id}">History</a>
              <button class="btn btn-small" data-edit="${ex.id}">Edit</button>
              <button class="btn btn-small btn-danger" data-delete="${ex.id}" data-name="${esc(ex.name)}">✕</button>
            </div>
          </div>
        </li>`
    )
    return `
      <div class="screen">
        <app-header title="Exercises" back="#/"></app-header>
        <form class="card ex-add-form">
          <input class="input" type="text" placeholder="New exercise name" />
          <div class="ex-add-controls">
            <select class="input" data-new-category>
              ${EXERCISE_CLASSES.map((c) => `<option value="${c}">${c}</option>`).join('')}
            </select>
            <select class="input" data-new-tier>
              ${EXERCISE_TIERS.map((t) => `<option value="${t}">${t}</option>`).join('')}
            </select>
            <button class="btn btn-primary" type="submit">Add</button>
          </div>
        </form>
        <ul class="list">
          ${exercises.length ? items.join('') : '<li class="empty">No exercises yet</li>'}
        </ul>
      </div>`
  }

  editCardHTML(ex) {
    return `
      <div class="ex-edit">
        <input class="input" data-edit-name="${ex.id}" type="text" value="${esc(ex.name)}" placeholder="Exercise name" />
        <div class="ex-controls">
          <select class="input" data-edit-category="${ex.id}">
            ${EXERCISE_CLASSES.map((c) => `<option value="${c}" ${c === (ex.category || 'Barbell') ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <select class="input" data-edit-tier="${ex.id}">
            ${EXERCISE_TIERS.map((t) => `<option value="${t}" ${t === (ex.tier || 'main') ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="ex-edit-actions">
          <button class="btn btn-small btn-primary" data-save="${ex.id}">Save</button>
          <button class="btn btn-small" data-cancel="${ex.id}">Cancel</button>
        </div>
      </div>`
  }

  rerender() {
    this.innerHTML = this.template()
    this.bind()
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
      const delBtn = e.target.closest('[data-delete]')
      if (delBtn) {
        if (confirm(`Delete "${delBtn.dataset.name}"?`)) deleteExercise(delBtn.dataset.delete)
        return
      }
      const editBtn = e.target.closest('[data-edit]')
      if (editBtn) {
        const ex = getData().exercises.find((x) => x.id === editBtn.dataset.edit)
        if (!ex) return
        const card = this.querySelector(`[data-card="${ex.id}"]`)
        if (card) card.innerHTML = this.editCardHTML(ex)
        return
      }
      const cancelBtn = e.target.closest('[data-cancel]')
      if (cancelBtn) {
        this.rerender()
        return
      }
      const saveBtn = e.target.closest('[data-save]')
      if (saveBtn) {
        const id = saveBtn.dataset.save
        const card = this.querySelector(`[data-card="${id}"]`)
        if (!card) return
        const name = card.querySelector(`[data-edit-name]`)?.value.trim()
        const category = card.querySelector(`[data-edit-category]`)?.value
        const tier = card.querySelector(`[data-edit-tier]`)?.value
        if (!name) return
        updateExercise(id, { name, category, tier })
        return
      }
    })
  }
}

if (!customElements.get('exercise-list')) customElements.define('exercise-list', ExerciseList)
