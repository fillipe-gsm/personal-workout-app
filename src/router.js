const routes = []

export function route(pattern, factory) {
  const names = []
  const regex = new RegExp(
    '^' +
      pattern.replace(/:[a-zA-Z]+/g, (m) => {
        names.push(m.slice(1))
        return '([^/]+)'
      }) +
      '$'
  )
  routes.push({ regex, names, factory })
}

export function start(routerEl) {
  function render() {
    const hash = location.hash.replace(/^#/, '') || '/'
    const [path, queryString] = hash.split('?')
    const query = Object.fromEntries(new URLSearchParams(queryString || ''))
    for (const r of routes) {
      const match = path.match(r.regex)
      if (match) {
        const params = {}
        r.names.forEach((n, i) => (params[n] = decodeURIComponent(match[i + 1])))
        routerEl.replaceChildren(r.factory(params, query))
        window.scrollTo(0, 0)
        return
      }
    }
    routerEl.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Not found' }))
  }
  window.addEventListener('hashchange', render)
  render()
}
