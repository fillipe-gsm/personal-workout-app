import { getProfiles, addProfile, updateProfile, deleteProfile, getProfile } from '../store.js'
import { ReactiveElement, esc } from './base.js'
import './header.js'

export class ProfilePage extends ReactiveElement {
  connectedCallback() {
    const profiles = getProfiles()
    const id = this.getAttribute('profile-id')
    const idx = id ? profiles.findIndex((p) => p.id === id) : 0
    this.index = idx > 0 ? idx : 0
    super.connectedCallback()
    this.syncUrl()
  }

  template() {
    const profiles = getProfiles()
    this.index = Math.max(0, Math.min(profiles.length - 1, this.index ?? 0))
    const addButton = '<a class="btn btn-primary big" href="#/profiles/add">+ Add profile</a>'
    if (!profiles.length) {
      return `
        <div class="screen">
          <app-header title="Weight Profiles" back="#/"></app-header>
          <div class="profiles-top">${addButton}</div>
          <p class="empty">No profiles yet. Add one to use the plate calculator.</p>
        </div>`
    }
    const current = profiles[this.index]
    const dots = profiles
      .map(
        (p, i) =>
          `<button class="dot${i === this.index ? ' active' : ''}" data-dot="${i}" title="${esc(p.name)}" aria-label="Profile ${esc(p.name)}">${i + 1}</button>`
      )
      .join('')
    return `
      <div class="screen">
        <app-header title="Weight Profiles" back="#/"></app-header>
        <div class="profiles-top">${addButton}</div>
        <div class="workout-progress">
          <span class="muted" data-counter>Profile ${this.index + 1} of ${profiles.length}</span>
          <div class="dots" data-dots>${dots}</div>
        </div>
        <div class="profile-stage workout-stage">
          <weight-profile profile-id="${current.id}"></weight-profile>
        </div>
        <div class="workout-nav">
          <button class="btn" data-prev ${this.index <= 0 ? 'disabled' : ''}>← Prev</button>
          <button class="btn" data-next ${this.index >= profiles.length - 1 ? 'disabled' : ''}>Next →</button>
        </div>
      </div>`
  }

  bind() {
    this.querySelector('[data-prev]')?.addEventListener('click', () => this.show(this.index - 1))
    this.querySelector('[data-next]')?.addEventListener('click', () => this.show(this.index + 1))
    this.querySelector('[data-dots]')?.addEventListener('click', (e) => {
      const dot = e.target.closest('[data-dot]')
      if (dot) this.show(Number(dot.dataset.dot))
    })

    this.querySelector('weight-profile')?.addEventListener('delete-request', () => {
      const profile = getProfiles()[this.index]
      if (!profile || !confirm(`Delete profile "${profile.name}"?`)) return
      deleteProfile(profile.id)
      const remaining = getProfiles()
      this.index = Math.max(0, Math.min(this.index, remaining.length - 1))
      this.syncUrl()
      this.rerender()
    })

    const stage = this.querySelector('.profile-stage')
    if (!stage) return
    let touchX = null
    let touchY = null
    stage.addEventListener(
      'touchstart',
      (e) => {
        if (e.target.closest('input, textarea, select')) return
        const t = e.changedTouches[0]
        touchX = t.clientX
        touchY = t.clientY
      },
      { passive: true }
    )
    stage.addEventListener(
      'touchend',
      (e) => {
        if (touchX == null) return
        if (e.target.closest('input, textarea, select')) {
          touchX = touchY = null
          return
        }
        const t = e.changedTouches[0]
        const dx = t.clientX - touchX
        const dy = t.clientY - touchY
        touchX = touchY = null
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0) this.show(this.index + 1)
          else this.show(this.index - 1)
        }
      },
      { passive: true }
    )
  }

  show(i) {
    const profiles = getProfiles()
    if (!profiles.length) return
    const next = Math.max(0, Math.min(profiles.length - 1, i))
    if (next === this.index) return
    this.index = next
    this.syncUrl()
    this.rerender()
  }

  syncUrl() {
    const profiles = getProfiles()
    const path = profiles.length ? `#/profiles/${profiles[this.index].id}` : '#/profiles'
    if (location.hash !== path) history.replaceState(null, '', path)
  }

  rerender() {
    this.innerHTML = this.template()
    this.bind()
  }
}

export class ProfileAdd extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="screen">
        <app-header title="Add Profile" back="#/profiles"></app-header>
        <form class="col">
          <input class="input" name="name" type="text" required placeholder="Profile name (e.g. Home gym)" />
          <input class="input barbell" name="barbell" type="number" step="any" min="0.01" required placeholder="Barbell kg" />
          <button class="btn btn-primary" type="submit">Add profile</button>
        </form>
      </div>`
    this.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault()
      const name = this.querySelector('[name="name"]').value.trim()
      const kg = parseFloat(this.querySelector('.barbell').value)
      if (!name || !Number.isFinite(kg) || kg <= 0) return
      const profile = addProfile(name, kg)
      location.replace(`#/profiles/${profile.id}`)
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
      const unlimited = plate.count === Infinity
      return `
        <li class="list-item">
          <span>${plate.kg} kg</span>
          <span>
            <label class="plate-unlimited">
              <input type="checkbox" data-unlimited="${i}" ${unlimited ? 'checked' : ''} /> ∞
            </label>
            <input class="input tiny" data-count="${i}" type="number" min="1" step="1"
              value="${unlimited ? '' : plate.count}" ${unlimited ? 'disabled' : ''} placeholder="count" />
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
        <input class="input tiny new-plate" type="number" step="any" min="0.01" placeholder="kg" />
        <input class="input tiny new-count" type="number" min="1" step="1" placeholder="∞" />
        <button class="btn btn-primary" type="submit">+ Add</button>
      </form>
      <p class="muted plate-hint">Count is total plates (both sides). Leave empty for unlimited.</p>
      <a class="btn btn-start big" href="#/plates?profile=${p.id}">Open calculator</a>`

    this.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault()
      const kg = parseFloat(this.querySelector('.new-plate').value)
      const countRaw = this.querySelector('.new-count').value.trim()
      const count = countRaw === '' ? Infinity : parseInt(countRaw, 10)
      if (!Number.isFinite(kg) || kg <= 0) return
      if (count !== Infinity && (!Number.isFinite(count) || count < 1)) return
      updateProfile(p.id, { plates: [...p.plates, { kg, count }] })
    })

    this.querySelector('[data-delete-profile]').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('delete-request', { bubbles: true }))
    })

    this.querySelectorAll('[data-count]').forEach((input) =>
      input.addEventListener('change', () => {
        const count = parseInt(input.value, 10)
        if (isNaN(count) || count < 1) return
        this.setCount(p, Number(input.dataset.count), count)
      })
    )

    this.querySelectorAll('[data-unlimited]').forEach((box) =>
      box.addEventListener('change', () => {
        const index = Number(box.dataset.unlimited)
        const current = p.plates[index].count
        this.setCount(p, index, box.checked ? Infinity : Number.isFinite(current) ? current || 1 : 1)
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

if (!customElements.get('profile-page')) customElements.define('profile-page', ProfilePage)
if (!customElements.get('profile-add')) customElements.define('profile-add', ProfileAdd)
if (!customElements.get('weight-profile')) customElements.define('weight-profile', WeightProfile)
