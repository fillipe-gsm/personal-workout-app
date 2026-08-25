import { getData, getProfile } from '../store.js'
import { calcPlates } from '../plates.js'
import { esc } from './base.js'
import './header.js'

export class PlateCalculator extends HTMLElement {
  connectedCallback() {
    const profiles = getData().profiles
    if (!profiles.length) {
      this.innerHTML = `
        <div class="screen">
          <app-header title="Plate Calculator" back="#/"></app-header>
          <p class="empty">Create a weight profile first.</p>
        </div>`
      return
    }

    let profileId =
      this.getAttribute('profile-id') || localStorage.getItem('last-profile') || profiles[0].id
    if (!getProfile(profileId)) profileId = profiles[0].id

    this.innerHTML = `
      <div class="screen">
        <app-header title="Plate Calculator" back="#/"></app-header>
        <div class="col">
          <select class="input">
            ${profiles
              .map(
                (p) =>
                  `<option value="${p.id}" ${p.id === profileId ? 'selected' : ''}>${esc(p.name)}</option>`
              )
              .join('')}
          </select>
          <input class="input target" type="number" step="2.5" min="0" placeholder="Target weight (kg)" value="${esc(this.getAttribute('weight') || '')}" />
        </div>
        <div class="result"></div>
      </div>`

    const resultBox = this.querySelector('.result')

    const update = () => {
      const profile = getProfile(profileId)
      const target = parseFloat(this.querySelector('.target').value)
      if (!target || target <= 0) {
        resultBox.innerHTML = ''
        return
      }
      const r = calcPlates(target, profile)
      resultBox.innerHTML = `
        <p>Per side to load: <strong>${r.perSide ?? '-'} kg</strong></p>
        ${
          r.perSide === null
            ? ''
            : r.plates.length
              ? `<ul class="list">
                  ${r.plates
                    .map(
                      (pl) => `
                      <li class="list-item">
                        <strong>${pl.kg} kg</strong>
                        <span class="badge">× ${pl.count} per side</span>
                      </li>`
                    )
                    .join('')}
                </ul>`
              : '<p class="empty">Nothing needed (just the bar).</p>'
        }
        ${r.achievable || r.perSide === null ? '' : `<p class="warn">Not exactly reachable — ${r.leftoverPerSide} kg/side missing with this profile.</p>`}
        <p class="muted">Barbell: ${profile.barbellKg} kg</p>`
    }

    this.querySelector('select').addEventListener('change', (e) => {
      profileId = e.target.value
      localStorage.setItem('last-profile', profileId)
      update()
    })
    this.querySelector('.target').addEventListener('input', update)
    update()
  }
}

if (!customElements.get('plate-calculator')) customElements.define('plate-calculator', PlateCalculator)
