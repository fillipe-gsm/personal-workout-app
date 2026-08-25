import { getData, addProfile, updateProfile, deleteProfile, getProfile } from '../store.js'
import { ReactiveElement, esc } from './base.js'
import './header.js'

export class ProfileList extends ReactiveElement {
  template() {
    const { profiles } = getData()
    return `
      <div class="screen">
        <app-header title="Weight Profiles" back="#/"></app-header>
        <form class="col">
          <input class="input" type="text" placeholder="Profile name (e.g. Home gym)" />
          <input class="input barbell" type="number" step="0.5" min="0" placeholder="Barbell kg" />
          <button class="btn btn-primary" type="submit">Add profile</button>
        </form>
        ${
          profiles.length
            ? profiles.map((p) => `<weight-profile profile-id="${p.id}"></weight-profile>`).join('')
            : '<p class="empty">No profiles yet. Add one to use the plate calculator.</p>'
        }
      </div>`
  }

  bind() {
    this.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault()
      const name = e.target.querySelector('input[type="text"]').value.trim()
      const kg = parseFloat(e.target.querySelector('.barbell').value)
      if (!name || !kg) return
      addProfile(name, kg)
    })
  }
}

export class WeightProfile extends HTMLElement {
  connectedCallback() {
    this.render()
  }

  render() {
    const p = getProfile(this.getAttribute('profile-id'))
    if (!p) {
      this.innerHTML = ''
      return
    }
    this.className = 'card'
    const rows = p.plates.map((plate, i) => {
      const control =
        plate.count === Infinity
          ? `<button class="btn btn-small" data-limit="${i}">∞ → limit</button>`
          : `<input class="input tiny" data-count="${i}" type="number" min="0" step="1" value="${plate.count}" />`
      return `
        <li class="list-item">
          <span>${plate.kg} kg</span>
          <span>
            ${control}
            <button class="btn btn-danger btn-small" data-remove="${i}">✕</button>
          </span>
        </li>`
    })
    this.innerHTML = `
      <div class="card-title">
        ${esc(p.name)} <small class="muted">barbell: ${p.barbellKg} kg</small>
        <button class="btn btn-danger" data-delete-profile>✕</button>
      </div>
      <ul class="list compact">
        ${p.plates.length ? rows.join('') : '<li class="empty">No plates configured — all default to ∞ when added</li>'}
      </ul>
      <form class="row">
        <input class="input tiny new-plate" type="number" step="0.5" min="0" placeholder="kg" />
        <button class="btn btn-primary" type="submit">+ Plate (∞)</button>
      </form>
      <a class="btn btn-start big" href="#/plates?profile=${p.id}">Open calculator</a>`

    this.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault()
      const kg = parseFloat(this.querySelector('.new-plate').value)
      if (!kg || kg <= 0) return
      updateProfile(p.id, { plates: [...p.plates, { kg, count: Infinity }] })
    })

    this.querySelector('[data-delete-profile]').addEventListener('click', () => {
      if (confirm(`Delete profile "${p.name}"?`)) deleteProfile(p.id)
    })

    this.querySelectorAll('[data-count]').forEach((input) =>
      input.addEventListener('change', () => {
        const count = parseInt(input.value, 10)
        if (isNaN(count) || count < 0) return
        this.setCount(p, Number(input.dataset.count), count)
      })
    )

    this.querySelectorAll('[data-limit]').forEach((btn) =>
      btn.addEventListener('click', () => {
        this.setCount(p, Number(btn.dataset.limit), 1)
      })
    )

    this.querySelectorAll('[data-remove]').forEach((btn) =>
      btn.addEventListener('click', () => {
        updateProfile(p.id, { plates: p.plates.filter((_, i) => i !== Number(btn.dataset.remove)) })
      })
    )
  }

  setCount(profile, index, count) {
    const plates = [...profile.plates]
    plates[index] = { ...plates[index], count }
    updateProfile(profile.id, { plates })
  }
}

if (!customElements.get('profile-list')) customElements.define('profile-list', ProfileList)
if (!customElements.get('weight-profile')) customElements.define('weight-profile', WeightProfile)
