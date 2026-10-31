import { addPlan, getProgram } from '../store.js'
import './header.js'

export class PlanAdd extends HTMLElement {
  connectedCallback() {
    const programId = this.getAttribute('program-id')
    const program = programId ? getProgram(programId) : null
    const back = program ? `#/program/${program.id}` : '#/programs'
    this.innerHTML = `
      <div class="screen">
        <app-header title="Add Workout" back="${back}"></app-header>
        ${program ? `<p class="muted">Adding to program: <strong>${program.name}</strong></p>` : '<p class="muted">Standalone workout (not part of a program).</p>'}
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
      const plan = addPlan(name, { description, programId: program?.id ?? null })
      location.replace(`#/plan/${plan.id}`)
    })
  }
}

if (!customElements.get('plan-add')) customElements.define('plan-add', PlanAdd)
