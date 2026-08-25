import { el, header } from '../ui.js'
import { getData, addProfile, updateProfile, deleteProfile } from '../store.js'

export function profilesScreen() {
  const { profiles } = getData()
  const nameInput = el('input', { class: 'input', type: 'text', placeholder: 'Profile name (e.g. Home gym)' })
  const barInput = el('input', { class: 'input', type: 'number', step: '0.5', min: '0', placeholder: 'Barbell kg' })

  function rerender() {
    document.querySelector('.screen')?.replaceWith(profilesScreen())
  }

  return el(
    'div',
    { class: 'screen' },
    header('Weight Profiles', '#/'),
    el(
      'form',
      {
        class: 'col',
        onsubmit: (e) => {
          e.preventDefault()
          const kg = parseFloat(barInput.value)
          if (!nameInput.value.trim() || !kg) return
          addProfile(nameInput.value, kg)
          rerender()
        }
      },
      nameInput,
      barInput,
      el('button', { class: 'btn btn-primary', type: 'submit' }, 'Add profile')
    ),
    profiles.length === 0
      ? el('p', { class: 'empty' }, 'No profiles yet. Add one to use the plate calculator.')
      : profiles.map((profile) => new ProfileCard(profile, rerender).root)
  )
}

class ProfileCard {
  constructor(profile, onChanged) {
    this.profile = profile
    this.onChanged = onChanged
    this.root = el('div', { class: 'card' })
    this.render()
  }

  render() {
    const p = this.profile
    this.root.innerHTML = ''
    const plateList = el(
      'ul',
      { class: 'list compact' },
      p.plates.length === 0 ? el('li', { class: 'empty' }, 'No plates configured — all default to ∞ when added') :
      p.plates.map((plate, i) =>
        el('li', { class: 'list-item' },
          el('span', {}, `${plate.kg} kg`),
          (() => {
            if (plate.count === Infinity) {
              return el('button', {
                class: 'btn btn-small',
                onclick: () => setCount(i, null)
              }, '∞ → limit')
            }
            const countInput = el('input', {
              class: 'input tiny',
              type: 'number',
              min: '0',
              step: '1',
              value: plate.count,
              onchange: () => setCount(i, parseInt(countInput.value, 10))
            })
            return countInput
          })(),
          el('button', { class: 'btn btn-danger btn-small', onclick: () => removePlate(i) }, '✕')
        )
      )
    )

    const kgInput = el('input', { class: 'input tiny', type: 'number', step: '0.5', min: '0', placeholder: 'kg' })
    const addPlateForm = el(
      'form',
      {
        class: 'row',
        onsubmit: (e) => {
          e.preventDefault()
          const kg = parseFloat(kgInput.value)
          if (!kg || kg <= 0) return
          updateProfile(p.id, { plates: [...p.plates, { kg, count: Infinity }] })
          this.render()
        }
      },
      kgInput,
      el('button', { class: 'btn btn-primary', type: 'submit' }, '+ Plate (∞)')
    )

    const setCount = (i, count) => {
      const plates = [...p.plates]
      plates[i] = { ...plates[i], count: count == null || isNaN(count) ? Infinity : Math.max(0, count) }
      updateProfile(p.id, { plates })
      this.render()
    }
    const removePlate = (i) => {
      updateProfile(p.id, { plates: p.plates.filter((_, idx) => idx !== i) })
      this.render()
    }

    this.root.append(
      el('div', { class: 'card-title' }, p.name, el('small', { class: 'muted' }, `barbell: ${p.barbellKg} kg`),
        el('button', { class: 'btn btn-danger', onclick: () => { if (confirm(`Delete profile "${p.name}"?`)) { deleteProfile(p.id); this.onChanged?.() } } }, '✕')
      ),
      plateList,
      addPlateForm,
      el('a', { class: 'btn btn-start big', href: `#/plates?profile=${p.id}` }, 'Open calculator')
    )
  }
}
