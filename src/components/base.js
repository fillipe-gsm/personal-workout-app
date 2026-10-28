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

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g

/**
 * Escapes text and turns http(s) URLs into safe links.
 * - the whole string is HTML-escaped first, so user text can never inject markup;
 * - only http:// and https:// are linked (no javascript:/data: URLs);
 * - links open in a new tab with rel="noopener noreferrer";
 * - trailing punctuation is left outside the link.
 */
export function linkify(value) {
  const safe = esc(value ?? '')
  return safe.replace(URL_PATTERN, (match) => {
    let url = match
    let trailing = ''
    while (/[.,;:!?]$/.test(url)) {
      trailing = url.slice(-1) + trailing
      url = url.slice(0, -1)
    }
    return `<a class="text-link" href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${trailing}`
  })
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
