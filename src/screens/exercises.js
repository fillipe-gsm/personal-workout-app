import { el, header } from '../ui.js'
import { getData, addExercise, deleteExercise } from '../store.js'

export function exercisesScreen() {
  function render() {
    const { exercises } = getData()
    const input = el('input', { class: 'input', type: 'text', placeholder: 'New exercise name' })
    return el(
      'div',
      { class: 'screen' },
      header('Exercises', '#/'),
      el(
        'form',
        {
          class: 'row',
          onsubmit: (e) => {
            e.preventDefault()
            if (!input.value.trim()) return
            addExercise(input.value)
            input.value = ''
            rerender()
          }
        },
        input,
        el('button', { class: 'btn btn-primary', type: 'submit' }, 'Add')
      ),
      el('ul', { class: 'list' },
        exercises.length === 0 ? el('li', { class: 'empty' }, 'No exercises yet') :
        exercises.map((ex) =>
          el('li', { class: 'list-item' },
            el('span', {}, ex.name),
            el(
              'span',
              {},
              el('a', { class: 'btn', href: `#/history/${ex.id}` }, 'History'),
              el('button', { class: 'btn btn-danger', onclick: () => { if (confirm(`Delete "${ex.name}"?`)) { deleteExercise(ex.id); rerender() } } }, '✕')
            )
          )
        )
      )
    )
  }

  function rerender() {
    document.querySelector('.screen')?.replaceWith(render())
  }

  return render()
}
