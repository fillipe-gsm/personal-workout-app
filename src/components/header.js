import { esc } from './base.js'

export class AppHeader extends HTMLElement {
  connectedCallback() {
    const back = this.getAttribute('back')
    const title = esc(this.getAttribute('title') || '')
    this.innerHTML =
      (back ? `<a class="btn btn-back" href="${esc(back)}">←</a>` : '') + `<h1>${title}</h1>`
  }
}

if (!customElements.get('app-header')) customElements.define('app-header', AppHeader)
