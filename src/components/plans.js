import {
  getPlan,
  getPlans,
  getExercises,
  getExercise,
  addPlan,
  deletePlan,
  updatePlan,
  addExerciseToPlan,
  updatePlanEntry,
  removePlanEntry,
  movePlanEntry,
  fmtSetScheme
} from '../store.js'
import { ReactiveElement, esc } from './base.js'
import { schemeTypeOptions, schemeValueLabel, schemeValueDefault, buildScheme } from './scheme-form.js'
import './header.js'

export class PlanList extends ReactiveElement {
  template() {
    const plans = getPlans()
    const exercises = getExercises()
    const items = plans.map(
      (plan) => `
        <li class="list-item">
          <span>${esc(plan.name)} <small class="muted">(${plan.entries.length} exercises)</small></span>
          <span>
            <a class="btn btn-primary" href="#/plan/${plan.id}">Edit</a>
            <a class="btn btn-start" href="#/workout/${plan.id}">Start</a>
            <button class="btn btn-danger" data-delete="${plan.id}" data-name="${esc(plan.name)}">✕</button>
          </span>
        </li>`
    )
    return `
      <div class="screen">
        <app-header title="Workout Plans" back="#/"></app-header>
        <form class="row">
          <input class="input" type="text" placeholder="New plan name" />
          <button class="btn btn-primary" type="submit">Add</button>
        </form>
        <ul class="list">
          ${plans.length ? items.join('') : '<li class="empty">No plans yet</li>'}
        </ul>
        ${exercises.length === 0 ? '<p class="empty">Tip: add some exercises first.</p>' : ''}
      </div>`
  }

  bind(signal) {
    this.querySelector('form').addEventListener(
      'submit',
      (e) => {
        e.preventDefault()
        const input = e.target.querySelector('input')
        if (!input.value.trim()) return
        const plan = addPlan(input.value)
        location.hash = `#/plan/${plan.id}`
      },
      { signal }
    )
    this.querySelector('.list').addEventListener(
      'click',
      (e) => {
        const btn = e.target.closest('[data-delete]')
        if (!btn) return
        if (confirm(`Delete plan "${btn.dataset.name}"?`)) deletePlan(btn.dataset.delete)
      },
      { signal }
    )
  }
}

export class PlanEdit extends ReactiveElement {
  template() {
    const plan = getPlan(this.getAttribute('plan-id'))
    if (!plan) {
      return `<div class="screen"><app-header title="Plan not found" back="#/plans"></app-header></div>`
    }
    const inPlan = new Set(plan.entries.map((e) => e.exerciseId))
    const available = getExercises().filter((ex) => !inPlan.has(ex.id))
    return `
      <div class="screen">
        <app-header title="Edit: ${esc(plan.name)}" back="#/plans"></app-header>
        <div class="row" style="margin-bottom:16px">
          <input class="input" type="text" value="${esc(plan.name)}" data-plan-name style="flex:1" />
          <button class="btn btn-primary" data-save-name>Save name</button>
        </div>
        <div class="section-title">Exercises in this plan (tap to remove)</div>
        <ul class="list">
          ${
            plan.entries.length
              ? plan.entries
                  .map((entry, idx) => {
                    const ex = getExercise(entry.exerciseId)
                    const isFirst = idx === 0
                    const isLast = idx === plan.entries.length - 1
                    return `
                      <li class="list-item" data-entry="${entry.id}">
                        <span>
                          <strong>${idx + 1}. ${esc(ex ? ex.name : '?')}</strong>
                          <small class="badge" style="background:rgba(47,191,113,0.15); color:var(--start)">${esc(fmtSetScheme(entry.setScheme))}</small>
                        </span>
                        <span class="ex-actions">
                          <button class="btn btn-small" data-scheme="${entry.id}">Scheme</button>
                          <button class="btn btn-small" data-move-up="${entry.id}" ${isFirst ? 'disabled' : ''} title="Move up">▲</button>
                          <button class="btn btn-small" data-move-down="${entry.id}" ${isLast ? 'disabled' : ''} title="Move down">▼</button>
                          <button class="btn btn-danger" data-remove="${entry.id}">Remove</button>
                        </span>
                      </li>`
                  })
                  .join('')
              : '<li class="empty">Empty — add from below</li>'
          }
        </ul>
        <div class="section-title">Available exercises (tap to add)</div>
        <ul class="list">
          ${
            available.length
              ? available
                  .map(
                    (ex) => `
                      <li class="list-item">
                        <span>${esc(ex.name)} <small class="badge">${esc(fmtSetScheme(ex.setScheme))}</small></span>
                        <button class="btn btn-primary" data-add="${ex.id}">Add</button>
                      </li>`
                  )
                  .join('')
              : '<li class="empty">All exercises are in this plan</li>'
          }
        </ul>
        <a class="btn btn-start big" href="#/workout/${plan.id}">Start this workout</a>
      </div>`
  }

  schemeEditorHTML(entry) {
    const scheme = entry.setScheme
    return `
      <li class="card plan-scheme-editor" data-editor="${entry.id}">
        <div class="ex-controls">
          <label class="field">
            <span class="field-label">Scheme</span>
            <select class="input" data-editor-type>${schemeTypeOptions(scheme.type)}</select>
          </label>
          <label class="field">
            <span class="field-label">Warm-up sets</span>
            <input class="input" data-editor-warmups type="number" step="1" min="0" value="${scheme.warmupCount}" />
          </label>
          <label class="field">
            <span class="field-label" data-editor-value-label>${schemeValueLabel(scheme.type)}</span>
            <input class="input" data-editor-value type="number" step="1" min="1" value="${scheme.value}" />
          </label>
        </div>
        <div class="row" style="margin-top:8px">
          <button class="btn btn-primary btn-small" data-editor-save="${entry.id}">Save scheme</button>
          <button class="btn btn-small" data-editor-cancel="${entry.id}">Cancel</button>
        </div>
      </li>`
  }

  openSchemeEditor(entryId) {
    const plan = getPlan(this.getAttribute('plan-id'))
    const entry = plan?.getEntry(entryId)
    const row = this.querySelector(`[data-entry="${entryId}"]`)
    if (!entry || !row) return
    this.querySelectorAll('[data-editor]').forEach((el) => el.remove())
    row.insertAdjacentHTML('afterend', this.schemeEditorHTML(entry))
    const editor = this.querySelector(`[data-editor="${entryId}"]`)
    const typeSelect = editor.querySelector('[data-editor-type]')
    const warmupsInput = editor.querySelector('[data-editor-warmups]')
    const valueInput = editor.querySelector('[data-editor-value]')
    const valueLabel = editor.querySelector('[data-editor-value-label]')
    typeSelect.addEventListener('change', () => {
      valueInput.min = '1'
      valueInput.value = String(schemeValueDefault(typeSelect.value))
      valueLabel.textContent = schemeValueLabel(typeSelect.value)
    })
    editor.querySelector('[data-editor-save]').addEventListener('click', () => {
      const setScheme = buildScheme(
        typeSelect.value,
        parseInt(warmupsInput.value, 10) || 0,
        parseInt(valueInput.value, 10)
      )
      updatePlanEntry(plan.id, entryId, { setScheme })
    })
    editor.querySelector('[data-editor-cancel]').addEventListener('click', () => editor.remove())
  }

  bind(signal) {
    const planId = this.getAttribute('plan-id')
    const plan = getPlan(planId)
    if (!plan) return

    const saveName = () => {
      const input = this.querySelector('[data-plan-name]')
      if (!input) return
      const next = input.value.trim()
      const current = getPlan(planId)
      if (!current || !next || next === current.name) return
      updatePlan(planId, { name: next })
    }
    this.querySelector('[data-save-name]')?.addEventListener('click', saveName, { signal })
    this.querySelector('[data-plan-name]')?.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        saveName()
      },
      { signal }
    )

    this.addEventListener(
      'click',
      (e) => {
        if (e.target.closest('[data-save-name]')) return
        const current = getPlan(planId)
        if (!current) return

        const addBtn = e.target.closest('[data-add]')
        if (addBtn) {
          addExerciseToPlan(planId, addBtn.dataset.add)
          return
        }
        const removeBtn = e.target.closest('[data-remove]')
        if (removeBtn) {
          removePlanEntry(planId, removeBtn.dataset.remove)
          return
        }
        const upBtn = e.target.closest('[data-move-up]')
        if (upBtn && !upBtn.disabled) {
          movePlanEntry(planId, upBtn.dataset.moveUp, -1)
          return
        }
        const downBtn = e.target.closest('[data-move-down]')
        if (downBtn && !downBtn.disabled) {
          movePlanEntry(planId, downBtn.dataset.moveDown, 1)
          return
        }
        const schemeBtn = e.target.closest('[data-scheme]')
        if (schemeBtn) {
          this.openSchemeEditor(schemeBtn.dataset.scheme)
        }
      },
      { signal }
    )
  }
}

if (!customElements.get('plan-list')) customElements.define('plan-list', PlanList)
if (!customElements.get('plan-edit')) customElements.define('plan-edit', PlanEdit)
