import { addProgram } from '../store.js'
import './header.js'

export class ProgramAdd extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="screen">
        <app-header title="Add Program" back="#/programs"></app-header>
        <form class="col">
          <label class="field">
            <span class="field-label">Name</span>
            <input class="input" name="name" type="text" required placeholder="e.g. Stronglifts 5×5" />
          </label>
          <label class="field">
            <span class="field-label">Description (optional)</span>
            <textarea class="input" name="description" rows="3" placeholder="Details, notes or a link"></textarea>
          </label>
          <button class="btn btn-primary" type="submit">Create program</button>
        </form>
        <p class="muted" style="margin-top:12px">You can add workouts inside the program on the next screen.</p>
      </div>`

    this.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault()
      const name = this.querySelector('[name="name"]').value.trim()
      const description = this.querySelector('[name="description"]').value.trim()
      if (!name) return
      const program = addProgram(name, { description })
      location.replace(`#/program/${program.id}`)
    })
  }
}

if (!customElements.get('program-add')) customElements.define('program-add', ProgramAdd)
