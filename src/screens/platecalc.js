import { el, header } from '../ui.js'
import { getData, getProfile } from '../store.js'
import { calcPlates } from '../plates.js'

export function plateCalcScreen(params, query) {
  const { profiles } = getData()
  if (profiles.length === 0) {
    return el('div', { class: 'screen' }, header('Plate Calculator', '#/'),
      el('p', { class: 'empty' }, 'Create a weight profile first.'))
  }

  let profileId = query.profile || localStorage.getItem('last-profile') || profiles[0].id
  if (!getProfile(profileId)) profileId = profiles[0].id
  localStorage.setItem('last-profile', profileId)

  const weightInput = el('input', {
    class: 'input',
    type: 'number',
    step: '2.5',
    min: '0',
    placeholder: 'Target weight (kg)',
    value: query.weight || ''
  })
  const select = el('select', { class: 'input', onchange: () => { profileId = select.value; localStorage.setItem('last-profile', profileId); update() } },
    profiles.map((p) => el('option', { value: p.id, selected: p.id === profileId }, p.name))
  )
  const resultBox = el('div')

  function update() {
    resultBox.innerHTML = ''
    const profile = getProfile(profileId)
    const target = parseFloat(weightInput.value)
    if (!target || target <= 0) return
    const result = calcPlates(target, profile)
    resultBox.append(
      el('p', {}, `Per side to load: `, el('strong', {}, `${result.perSide} kg`)),
      result.plates.length === 0 && el('p', { class: 'empty' }, 'Nothing needed (just the bar).'),
      el('ul', { class: 'list' },
        result.plates.map((plate) =>
          el('li', { class: 'list-item' },
            el('strong', {}, `${plate.kg} kg`),
            el('span', { class: 'badge' }, `× ${plate.count} per side`)
          )
        )
      ),
      !result.achievable &&
        el('p', { class: 'warn' }, `Not exactly reachable — ${result.leftoverPerSide} kg/side missing with this profile.`),
      el('p', { class: 'muted' }, `Barbell: ${profile.barbellKg} kg`)
    )
  }
  weightInput.addEventListener('input', update)

  return el(
    'div',
    { class: 'screen' },
    header('Plate Calculator', '#/'),
    el('div', { class: 'col' }, select, weightInput),
    resultBox
  )
}
