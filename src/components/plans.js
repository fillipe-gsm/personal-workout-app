import { getData, addPlan, deletePlan, updatePlan, getExercise } from '../store.js'
import { ReactiveElement, esc } from './base.js'
import './header.js'

export class PlanList extends ReactiveElement {
  template() {
    const { plans, exercises } = getData()
    const items = plans.map(
      (plan) => `
        <li class="list-item">
          <span>${esc(plan.name)} <small class="muted">(${plan.exerciseIds.length} exercises)</small></span>
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

  bind() {
    this.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault()
      const input = e.target.querySelector('input')
      if (!input.value.trim()) return
      const plan = addPlan(input.value)
      location.hash = `#/plan/${plan.id}`
    })
    this.querySelector('.list').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-delete]')
      if (!btn) return
      if (confirm(`Delete plan "${btn.dataset.name}"?`)) deletePlan(btn.dataset.delete)
    })
  }
}

export class PlanEdit extends ReactiveElement {
  template() {
    const plan = getData().plans.find((p) => p.id === this.getAttribute('plan-id'))
    if (!plan) {
      return `<div class="screen"><app-header title="Plan not found" back="#/plans"></app-header></div>`
    }
    const inPlan = new Set(plan.exerciseIds)
    const available = getData().exercises.filter((ex) => !inPlan.has(ex.id))
    return `
      <div class="screen">
        <app-header title="Edit: ${esc(plan.name)}" back="#/plans"></app-header>
        <div class="section-title">Exercises in this plan (tap to remove)</div>
        <ul class="list">
          ${
            plan.exerciseIds.length
              ? plan.exerciseIds
                  .map((id, idx) => {
                    const ex = getExercise(id)
                    return `
                      <li class="list-item">
                        <span>${idx + 1}. ${esc(ex ? ex.name : '?')}</span>
                        <button class="btn btn-danger" data-remove="${id}">Remove</button>
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
                        <span>${esc(ex.name)}</span>
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

  bind() {
    this.addEventListener('click', (e) => {
      const planId = this.getAttribute('plan-id')
      const plan = getData().plans.find((p) => p.id === planId)
      if (!plan) return
      const addBtn = e.target.closest('[data-add]')
      if (addBtn) {
        // Prevent duplicate adds – the available list already excludes exercises in the plan,
        // but this guard is a safety net.
        if (plan.exerciseIds.includes(addBtn.dataset.add)) {
          // Already in plan – don't add again
          return
        }
        updatePlan(plan.id, { exerciseIds: [...plan.exerciseIds, addBtn.dataset.add] })
      }
      const removeBtn = e.target.closest('[data-remove]')
      if (removeBtn) updatePlan(plan.id, { exerciseIds: plan.exerciseIds.filter((x) => x !== removeBtn.dataset.remove) })
    })
  }
}

if (!customElements.get('plan-list')) customElements.define('plan-list', PlanList)
if (!customElements.get('plan-edit')) customElements.define('plan-edit', PlanEdit)