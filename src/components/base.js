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
      // Re-rendering re-runs bind(); listeners bound to `this` (which survives
      // the innerHTML replacement) would accumulate on every paint, causing
      // e.g. one click to fire several handlers. Abort the previous signal
      // so per-render listeners are cleaned up automatically.
      this._ac?.abort()
      this._ac = new AbortController()
      this.innerHTML = this.template()
      this.bind(this._ac.signal)
    }
    paint()
    this._unsub = subscribe(() => paint())
  }

  disconnectedCallback() {
    this._ac?.abort()
    this._ac = null
    this._unsub?.()
    this._unsub = null
  }

  template() {
    return ''
  }

  bind() {}
}
