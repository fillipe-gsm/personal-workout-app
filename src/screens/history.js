import { el, header } from '../ui.js'
import { getExercise, getRecordsForExercise } from '../store.js'

export function historyScreen(params) {
  const exercise = getExercise(params.id)
  if (!exercise) return el('div', { class: 'screen' }, header('Not found', '#/exercises'))
  const records = getRecordsForExercise(exercise.id).slice(0, 10)

  return el(
    'div',
    { class: 'screen' },
    header(`History: ${exercise.name}`, '#/'),
    records.length === 0
      ? el('p', { class: 'empty' }, 'No records yet for this exercise.')
      : records.map((rec, idx) =>
          el(
            'div',
            { class: 'card' },
            el('div', { class: 'card-title' },
              new Date(rec.date).toLocaleString(),
              idx === 0 ? el('span', { class: 'badge' }, 'latest') : null,
              el('small', { class: 'muted' }, `TW ${rec.sets.find((s) => s.type !== 'warmup')?.weightKg ?? '-'} kg`)
            ),
            el('ul', { class: 'sets-list' },
              rec.sets.map((s) =>
                el('li', {},
                  `${s.type === 'warmup' ? 'WU' : s.type === 'extra' ? 'Extra' : 'WS'}: ${s.weightKg} kg × ${s.reps ?? '?'}`
                )
              )
            )
          )
        )
  )
}
