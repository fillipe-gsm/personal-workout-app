import { getData, addExercise, deleteExercise, updateExercise, EXERCISE_CLASSES, SET_SCHEME_TYPES, fmtSetScheme } from '../store.js'
import { ReactiveElement, esc } from './base.js'
import './header.js'

const SCHEME_LABELS = { fixedSets: 'Fixed sets', fixedReps: 'Fixed reps' }

function isSetsType(type) {
  return type !== 'fixedReps'
}

function schemeOptions(selected) {
  return SET_SCHEME_TYPES.map(
    (t) => `<option value="${t}" ${t === selected ? 'selected' : ''}>${SCHEME_LABELS[t]}</option>`
  ).join('')
}

function syncSchemeValueInput(input, label, type) {
  if (!input) return
  const text = isSetsType(type) ? 'Work sets' : 'Total reps'
  input.min = '1'
  input.value = isSetsType(type) ? '3' : '15'
  input.placeholder = text
  if (label) label.textContent = text
}

export class ExerciseList extends ReactiveElement {
  template() {
    const { exercises } = getData()
    const items = exercises.map(
      (ex) => `
        <li class="card ex-card" data-card="${ex.id}">
          <div class="ex-top">
            <div class="ex-name-wrap">
              <div class="ex-name">${esc(ex.name)}</div>
              <div class="ex-badges"><small class="badge">${esc(ex.category || 'Barbell')}</small> <small class="badge" style="background:rgba(47,191,113,0.15); color:var(--start)">${esc(fmtSetScheme(ex.setScheme))}</small></div>
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
            <select class="input" data-new-scheme-type>
              ${schemeOptions('fixedSets')}
            </select>
            <label class="field">
              <span class="field-label">Warm-up sets</span>
              <input class="input" data-new-warmups type="number" step="1" min="0" value="3" placeholder="Warm-up sets" />
            </label>
            <label class="field">
              <span class="field-label" data-new-scheme-value-label>Work sets</span>
              <input class="input" data-new-scheme-value type="number" step="1" min="1" value="3" placeholder="Work sets" />
            </label>
            <button class="btn btn-primary" type="submit">Add</button>
          </div>
        </form>
        <ul class="list">
          ${exercises.length ? items.join('') : '<li class="empty">No exercises yet</li>'}
        </ul>
      </div>`
  }

  editCardHTML(ex) {
    const type = ex.setScheme.type
    const value = isSetsType(type) ? ex.setScheme.workSets : ex.setScheme.totalReps
    return `
      <div class="ex-edit">
        <input class="input" data-edit-name="${ex.id}" type="text" value="${esc(ex.name)}" placeholder="Exercise name" />
        <div class="ex-controls">
          <select class="input" data-edit-category="${ex.id}">
            ${EXERCISE_CLASSES.map((c) => `<option value="${c}" ${c === (ex.category || 'Barbell') ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <select class="input" data-edit-scheme-type="${ex.id}">
            ${schemeOptions(type)}
          </select>
          <label class="field">
            <span class="field-label">Warm-up sets</span>
            <input class="input" data-edit-warmups="${ex.id}" type="number" step="1" min="0" value="${ex.setScheme.warmupCount}" placeholder="Warm-up sets" />
          </label>
          <label class="field">
            <span class="field-label" data-edit-scheme-value-label="${ex.id}">${isSetsType(type) ? 'Work sets' : 'Total reps'}</span>
            <input class="input" data-edit-scheme-value="${ex.id}" type="number" step="1" min="1" value="${value}" placeholder="${isSetsType(type) ? 'Work sets' : 'Total reps'}" />
          </label>
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
    const schemeTypeSelect = form.querySelector('[data-new-scheme-type]')
    const warmupsInput = form.querySelector('[data-new-warmups]')
    const schemeValueInput = form.querySelector('[data-new-scheme-value]')
    const schemeValueLabel = form.querySelector('[data-new-scheme-value-label]')
    schemeTypeSelect.addEventListener('change', () =>
      syncSchemeValueInput(schemeValueInput, schemeValueLabel, schemeTypeSelect.value)
    )
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      if (!nameInput.value.trim()) return
      const type = schemeTypeSelect.value
      const warmupCount = parseInt(warmupsInput.value, 10) || 0
      const value = parseInt(schemeValueInput.value, 10)
      const scheme = isSetsType(type)
        ? { type, warmupCount, workSets: value }
        : { type, warmupCount, totalReps: value }
      addExercise(nameInput.value, categorySelect.value, scheme)
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
        if (card) {
          card.innerHTML = this.editCardHTML(ex)
          const typeSel = card.querySelector('[data-edit-scheme-type]')
          const valueInput = card.querySelector('[data-edit-scheme-value]')
          const valueLabel = card.querySelector('[data-edit-scheme-value-label]')
          typeSel?.addEventListener('change', () =>
            syncSchemeValueInput(valueInput, valueLabel, typeSel.value)
          )
        }
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
        const type = card.querySelector(`[data-edit-scheme-type]`)?.value
        const warmupCount = parseInt(card.querySelector(`[data-edit-warmups]`)?.value, 10) || 0
        const value = parseInt(card.querySelector(`[data-edit-scheme-value]`)?.value, 10)
        if (!name) return
        const setScheme = isSetsType(type)
          ? { type, warmupCount, workSets: value }
          : { type, warmupCount, totalReps: value }
        updateExercise(id, { name, category, setScheme })
        return
      }
    })
  }
}

if (!customElements.get('exercise-list')) customElements.define('exercise-list', ExerciseList)
