import { esc } from './base.js'

export class AppHeader extends HTMLElement {
  connectedCallback() {
    const fallback = this.getAttribute('back')
    const title = esc(this.getAttribute('title') || '')
    this.classList.add('header')
    if (fallback) {
      this.innerHTML = `<button class="btn btn-back" type="button">←</button><h1>${title}</h1>`
      this.querySelector('button').addEventListener('click', () => {
        if (window.history.length > 1) window.history.back()
        else location.hash = fallback
      })
    } else {
      this.innerHTML = `<h1>${title}</h1>`
    }
  }
}

if (!customElements.get('app-header')) customElements.define('app-header', AppHeader)
