import { el, header } from '../ui.js'
import { getData, addPlan, deletePlan, updatePlan, getExercise, getRecordsForExercise } from '../store.js'

export function plansScreen() {
  const { plans, exercises } = getData()
  const input = el('input', { class: 'input', type: 'text', placeholder: 'New plan name' })
  return el(
    'div',
    { class: 'screen' },
    header('Workout Plans', '#/'),
    el(
      'form',
      {
        class: 'row',
        onsubmit: (e) => {
          e.preventDefault()
          if (!input.value.trim()) return
          const plan = addPlan(input.value)
          location.hash = `#/plan/${plan.id}`
        }
      },
      input,
      el('button', { class: 'btn btn-primary', type: 'submit' }, 'Add')
    ),
    el('ul', { class: 'list' },
      plans.length === 0 ? el('li', { class: 'empty' }, 'No plans yet') :
      plans.map((plan) =>
        el('li', { class: 'list-item' },
          el('span', {}, plan.name, el('small', { class: 'muted' }, ` (${plan.exerciseIds.length} exercises)`)),
          el('span', {},
            el('a', { class: 'btn btn-primary', href: `#/plan/${plan.id}` }, 'Edit'),
            el('a', { class: 'btn btn-start', href: `#/workout/${plan.id}` }, 'Start'),
            el('button', { class: 'btn btn-danger', onclick: () => { if (confirm(`Delete plan "${plan.name}"?`)) deletePlan(plan.id) } }, '✕')
          )
        )
      )
    ),
    exercises.length === 0 && el('p', { class: 'empty' }, 'Tip: add some exercises first.')
  )
}

export function planEditScreen(params) {
  const plan = getData().plans.find((p) => p.id === params.id)
  if (!plan) return el('div', { class: 'screen' }, header('Plan not found', '#/plans'))

  function render() {
    const { exercises } = getData()
    const inPlan = new Set(plan.exerciseIds)
    return el(
      'div',
      { class: 'screen' },
      header(`Edit: ${plan.name}`, '#/plans'),
      el(
        'div',
        { class: 'section-title' },
        'Exercises in this plan (tap to remove)'
      ),
      el('ul', { class: 'list' },
        plan.exerciseIds.length === 0 ? el('li', { class: 'empty' }, 'Empty — add from below') :
        plan.exerciseIds.map((id, idx) => {
          const ex = getExercise(id)
          return el('li', { class: 'list-item' },
            el('span', {}, `${idx + 1}. ${ex ? ex.name : '?'}`),
            el('button', {
              class: 'btn btn-danger',
              onclick: () => {
                updatePlan(plan.id, { exerciseIds: plan.exerciseIds.filter((x) => x !== id) })
                rerender()
              }
            }, 'Remove')
          )
        })
      ),
      el('div', { class: 'section-title' }, 'Available exercises (tap to add)'),
      el('ul', { class: 'list' },
        exercises.filter((ex) => !inPlan.has(ex.id)).length === 0
          ? el('li', { class: 'empty' }, 'All exercises are in this plan')
          : getData().exercises
              .filter((ex) => !inPlan.has(ex.id))
              .map((ex) =>
                el('li', { class: 'list-item' },
                  el('span', {}, ex.name),
                  el('button', {
                    class: 'btn btn-primary',
                    onclick: () => {
                      updatePlan(plan.id, { exerciseIds: [...plan.exerciseIds, ex.id] })
                      rerender()
                    }
                  }, 'Add')
                )
              )
      ),
      el('a', { class: 'btn btn-start big', href: `#/workout/${plan.id}` }, 'Start this workout')
    )
  }

  function rerender() {
    const fresh = document.querySelector('#app > div')
    if (fresh) fresh.replaceWith(render())
  }

  return render()
}
