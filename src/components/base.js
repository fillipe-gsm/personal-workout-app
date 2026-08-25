import { subscribe } from '../store.js'

export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c])
}

export class ReactiveElement extends HTMLElement {
  connectedCallback() {
    const paint = () => {
      this.innerHTML = this.template()
      this.bind()
    }
    paint()
    this._unsub = subscribe(() => paint())
  }

  disconnectedCallback() {
    this._unsub?.()
    this._unsub = null
  }

  template() {
    return ''
  }

  bind() {}
}
