import {
  getPrograms,
  getProgram,
  getPlansForProgram,
  getStandalonePlans,
  updateProgram,
  deleteProgram,
  deletePlan,
  updatePlan
} from '../store.js'
import { ReactiveElement, esc, linkify } from './base.js'
import './header.js'

export class ProgramList extends ReactiveElement {
  template() {
    const programs = getPrograms()
    const standalone = getStandalonePlans()
    const programCards = programs.map((program) => {
      const workouts = getPlansForProgram(program.id)
      return `
        <li class="card" data-program="${program.id}">
          <div class="card-title">
            <span><a href="#/program/${program.id}">${esc(program.name)}</a> ${program.isFromTemplate ? '<small class="badge">Template</small>' : ''}</span>
            <small class="muted">${workouts.length} workout${workouts.length === 1 ? '' : 's'}</small>
          </div>
          ${program.description ? `<p class="muted plan-desc">${linkify(program.description)}</p>` : ''}
          <div class="row">
            <a class="btn btn-primary" href="#/program/${program.id}">Open</a>
            <a class="btn" href="#/plans/add?program=${program.id}">+ Workout</a>
          </div>
        </li>`
    })
    const standaloneItems = standalone.map(
      (plan) => `
        <li class="list-item">
          <span>
            <strong>${esc(plan.name)}</strong>
            ${plan.description ? `<small class="muted plan-desc">${linkify(plan.description)}</small>` : ''}
          </span>
          <span>
            <a class="btn btn-primary" href="#/plan/${plan.id}">Edit</a>
            <a class="btn btn-start" href="#/workout/${plan.id}">Start</a>
            <button class="btn btn-danger" data-delete-plan="${plan.id}" data-name="${esc(plan.name)}">✕</button>
          </span>
        </li>`
    )
    return `
      <div class="screen">
        <app-header title="Workout Programs" back="#/"></app-header>
        <div class="row" style="margin-bottom:12px">
          <a class="btn btn-primary" href="#/programs/add">+ Add program</a>
          <a class="btn" href="#/templates">Templates</a>
        </div>
        ${programs.length ? `<ul class="list">${programCards.join('')}</ul>` : '<p class="empty">No programs yet.</p>'}
        <div class="section-title">Standalone workouts</div>
        <div class="row" style="margin-bottom:8px">
          <a class="btn" href="#/plans/add">+ Add workout</a>
        </div>
        <ul class="list">
          ${standalone.length ? standaloneItems.join('') : '<li class="empty">No standalone workouts</li>'}
        </ul>
      </div>`
  }

  bind(signal) {
    this.addEventListener(
      'click',
      (e) => {
        const btn = e.target.closest('[data-delete-plan]')
        if (!btn) return
        if (confirm(`Delete workout "${btn.dataset.name}"? Its history is kept.`)) {
          deletePlan(btn.dataset.deletePlan)
        }
      },
      { signal }
    )
  }
}

export class ProgramPage extends ReactiveElement {
  template() {
    const program = getProgram(this.getAttribute('program-id'))
    if (!program) {
      return `<div class="screen"><app-header title="Program not found" back="#/programs"></app-header></div>`
    }
    const workouts = getPlansForProgram(program.id)
    return `
      <div class="screen">
        <app-header title="${esc(program.name)}" back="#/programs"></app-header>
        ${program.isFromTemplate ? `<p class="muted">Installed from template <strong>${esc(program.templateKey)}</strong> (v${program.templateVersion ?? 1}). Edit freely — this is your copy.</p>` : ''}
        <div class="row" style="margin-bottom:8px">
          <input class="input" type="text" value="${esc(program.name)}" data-program-name style="flex:1" />
          <button class="btn btn-primary" data-save-program>Save</button>
        </div>
        <label class="field" style="margin-bottom:16px">
          <span class="field-label">Description</span>
          <textarea class="input" data-program-description rows="2" placeholder="Details, notes or a link">${esc(program.description)}</textarea>
        </label>
        <div class="section-title">Workouts</div>
        <ul class="list">
          ${
            workouts.length
              ? workouts
                  .map(
                    (plan) => `
                      <li class="list-item">
                        <span>
                          <strong>${esc(plan.name)}</strong>
                          <small class="muted">${plan.entries.length} exercise${plan.entries.length === 1 ? '' : 's'}</small>
                        </span>
                        <span>
                          <a class="btn btn-primary" href="#/plan/${plan.id}">Edit</a>
                          <a class="btn btn-start" href="#/workout/${plan.id}">Start</a>
                          <button class="btn btn-small" data-detach="${plan.id}" data-name="${esc(plan.name)}">Remove</button>
                        </span>
                      </li>`
                  )
                  .join('')
              : '<li class="empty">No workouts in this program yet</li>'
          }
        </ul>
        <a class="btn btn-primary big" href="#/plans/add?program=${program.id}">+ Add workout</a>
        <button class="btn btn-danger big" data-delete-program style="margin-top:12px; width:100%">Delete program</button>
      </div>`
  }

  bind(signal) {
    const programId = this.getAttribute('program-id')

    const saveDetails = () => {
      const program = getProgram(programId)
      if (!program) return
      const nameInput = this.querySelector('[data-program-name]')
      const descInput = this.querySelector('[data-program-description]')
      const name = nameInput ? nameInput.value.trim() : program.name
      if (!name) return
      const description = descInput ? descInput.value.trim() : program.description
      if (name === program.name && description === program.description) return
      updateProgram(programId, { name, description })
    }

    this.querySelector('[data-save-program]')?.addEventListener('click', saveDetails, { signal })
    this.querySelector('[data-program-name]')?.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        saveDetails()
      },
      { signal }
    )

    this.addEventListener(
      'click',
      (e) => {
        const detachBtn = e.target.closest('[data-detach]')
        if (detachBtn) {
          if (confirm(`Remove "${detachBtn.dataset.name}" from this program? It becomes a standalone workout.`)) {
            updatePlan(detachBtn.dataset.detach, { programId: null })
          }
          return
        }
        const deleteBtn = e.target.closest('[data-delete-program]')
        if (deleteBtn) {
          const program = getProgram(programId)
          if (!program) return
          if (confirm(`Delete program "${program.name}"? Its workouts become standalone.`)) {
            deleteProgram(programId)
            location.hash = '#/programs'
          }
        }
      },
      { signal }
    )
  }
}

if (!customElements.get('program-list')) customElements.define('program-list', ProgramList)
if (!customElements.get('program-page')) customElements.define('program-page', ProgramPage)
