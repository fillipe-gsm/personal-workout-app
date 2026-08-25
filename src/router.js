const routes = []

export function route(pattern, handler) {
  const names = []
  const regex = new RegExp(
    '^' +
      pattern.replace(/:[a-zA-Z]+/g, (m) => {
        names.push(m.slice(1))
        return '([^/]+)'
      }) +
      '$'
  )
  routes.push({ regex, names, handler })
}

export function start(routerEl) {
  function render() {
    const hash = location.hash.replace(/^#/, '') || '/'
    const [path, queryString] = hash.split('?')
    const query = Object.fromEntries(new URLSearchParams(queryString || ''))
    routerEl.innerHTML = ''
    for (const r of routes) {
      const match = path.match(r.regex)
      if (match) {
        const params = {}
        r.names.forEach((n, i) => (params[n] = decodeURIComponent(match[i + 1])))
        routerEl.append(r.handler(params, query))
        window.scrollTo(0, 0)
        return
      }
    }
    routerEl.append(Object.assign(document.createElement('p'), { textContent: 'Not found' }))
  }
  window.addEventListener('hashchange', render)
  render()
}
