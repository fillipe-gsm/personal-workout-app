export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue
    if (key === 'class') node.className = value
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value)
    else if (key === 'checked' || key === 'disabled' || key === 'selected') node[key] = value
    else if (key === 'value') node.value = value
    else node.setAttribute(key, value)
  }
  append(node, children)
  return node
}

function append(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue
    node.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
}

export function header(title, backHref) {
  const kids = []
  if (backHref) kids.push(el('a', { class: 'btn btn-back', href: backHref }, '←'))
  kids.push(el('h1', {}, title))
  return el('div', { class: 'header' }, ...kids)
}
