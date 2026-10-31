import { TEMPLATES } from '../templates/index.js'
import { installTemplate, templateInstallState } from '../store.js'
import { esc, linkify } from './base.js'
import './header.js'

export class TemplateList extends HTMLElement {
  connectedCallback() {
    this._status = null
    this.render()
  }

  summaryText(summary) {
    const bits = []
    if (summary.createdPlans.length) {
      bits.push(`${summary.createdPlans.length} workout${summary.createdPlans.length === 1 ? '' : 's'}`)
    }
    if (summary.createdExercises.length) {
      bits.push(
        `${summary.createdExercises.length} exercise${summary.createdExercises.length === 1 ? '' : 's'}`
      )
    }
    if (summary.reusedExercises.length) {
      bits.push(
        `${summary.reusedExercises.length} existing exercise${summary.reusedExercises.length === 1 ? '' : 's'} reused`
      )
    }
    if (summary.skippedPlans.length) {
      bits.push(`${summary.skippedPlans.length} already installed`)
    }
    return bits.join(', ')
  }

  render() {
    const status = this._status
    const cards = TEMPLATES.map((template) => {
      const state = templateInstallState(template)
      const exerciseNames = template.exercises.map((e) => esc(e.name)).join(', ')
      return `
        <div class="card" data-template="${template.key}">
          <div class="card-title">
            <span>${esc(template.name)}</span>
            <small class="badge">${template.plans.length} workout${template.plans.length === 1 ? '' : 's'}</small>
          </div>
          <p class="muted">${linkify(template.description)}</p>
          <p class="muted"><strong>Exercises:</strong> ${exerciseNames}</p>
          ${state.complete ? '<p class="saved-note">✓ Installed</p>' : ''}
          <button class="btn btn-primary" data-install="${template.key}" ${state.complete ? 'disabled' : ''}>
            ${state.installed ? 'Install remaining workouts' : 'Install template'}
          </button>
        </div>`
    })
    this.innerHTML = `
      <div class="screen">
        <app-header title="Workout Templates" back="#/programs"></app-header>
        <p class="muted">
          Cookie-cutter programs. Installing one creates its exercises (reusing existing ones by name)
          and its workouts as a program; you can edit them afterwards.
        </p>
        ${cards.join('')}
        ${status ? `<p class="${status.ok ? 'status-ok' : 'status-err'}" data-status role="status">${esc(status.text)}</p>` : ''}
      </div>`

    this.querySelectorAll('[data-install]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const template = TEMPLATES.find((t) => t.key === btn.dataset.install)
        if (!template) return
        try {
          const summary = installTemplate(template)
          const text = this.summaryText(summary)
          this._status = {
            ok: true,
            text: summary.createdPlans.length ? `Installed ${text}.` : `Nothing to install — ${text}.`
          }
        } catch (err) {
          this._status = { ok: false, text: err?.message || 'Could not install that template.' }
        }
        this.render()
      })
    )
  }
}

if (!customElements.get('template-list')) customElements.define('template-list', TemplateList)
