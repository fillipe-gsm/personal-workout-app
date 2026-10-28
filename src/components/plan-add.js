import { addPlan } from '../store.js'
import './header.js'

export class PlanAdd extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="screen">
        <app-header title="Add Workout" back="#/plans"></app-header>
        <form class="col">
          <label class="field">
            <span class="field-label">Name</span>
            <input class="input" name="name" type="text" required placeholder="e.g. Upper body" />
          </label>
          <label class="field">
            <span class="field-label">Description (optional)</span>
            <textarea class="input" name="description" rows="3" placeholder="Details, notes or a link"></textarea>
          </label>
          <button class="btn btn-primary" type="submit">Create workout</button>
        </form>
        <p class="muted" style="margin-top:12px">You can add exercises and fine-tune their set schemes on the next screen.</p>
      </div>`

    this.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault()
      const name = this.querySelector('[name="name"]').value.trim()
      const description = this.querySelector('[name="description"]').value.trim()
      if (!name) return
      const plan = addPlan(name, { description })
      location.replace(`#/plan/${plan.id}`)
    })
  }
}

if (!customElements.get('plan-add')) customElements.define('plan-add', PlanAdd)
