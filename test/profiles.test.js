// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

const storage = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
})

const store = await import('../src/store.js')
await import('../src/components/profiles.js')

beforeEach(() => {
  store.clearAllData()
  document.body.innerHTML = ''
  history.replaceState(null, '', '/')
  vi.stubGlobal('confirm', () => true)
})

async function showProfiles(profileId) {
  const el = document.createElement('profile-page')
  if (profileId) el.setAttribute('profile-id', profileId)
  document.body.append(el)
  await Promise.resolve()
  return el
}

async function showAdd() {
  const el = document.createElement('profile-add')
  document.body.append(el)
  await Promise.resolve()
  return el
}

function submit(form) {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

describe('weight profiles page', () => {
  it('shows an add link and empty message when there are no profiles', async () => {
    await showProfiles()
    expect(document.querySelector('.empty').textContent).toContain('No profiles yet')
    expect(document.querySelector('a[href="#/profiles/add"]').textContent).toContain('Add profile')
    expect(document.querySelector('weight-profile')).toBeNull()
  })

  it('shows one profile at a time with prev/next and dots', async () => {
    const p1 = store.addProfile('Home', 20)
    const p2 = store.addProfile('Gym', 20)
    await showProfiles(p1.id)

    expect(document.querySelectorAll('weight-profile')).toHaveLength(1)
    expect(document.querySelector('[data-counter]').textContent).toBe('Profile 1 of 2')
    expect(document.querySelector('.card-title').textContent).toContain('Home')
    expect(document.querySelector('[data-prev]').disabled).toBe(true)
    expect(document.querySelectorAll('[data-dot]')).toHaveLength(2)

    document.querySelector('[data-next]').click()
    await Promise.resolve()
    expect(document.querySelector('[data-counter]').textContent).toBe('Profile 2 of 2')
    expect(document.querySelector('.card-title').textContent).toContain('Gym')
    expect(document.querySelector('[data-next]').disabled).toBe(true)
    expect(location.hash).toBe(`#/profiles/${p2.id}`)

    document.querySelectorAll('[data-dot]')[0].click()
    await Promise.resolve()
    expect(document.querySelector('[data-counter]').textContent).toBe('Profile 1 of 2')
    expect(location.hash).toBe(`#/profiles/${p1.id}`)
  })

  it('opens at the profile from the url and syncs the url on entry', async () => {
    const p1 = store.addProfile('Home', 20)
    const p2 = store.addProfile('Gym', 20)
    await showProfiles(p2.id)

    expect(document.querySelector('[data-counter]').textContent).toBe('Profile 2 of 2')
    expect(document.querySelector('.card-title').textContent).toContain('Gym')
    expect(location.hash).toBe(`#/profiles/${p2.id}`)

    document.body.innerHTML = ''
    await showProfiles()
    expect(location.hash).toBe(`#/profiles/${p1.id}`)
  })

  it('deletes the current profile and moves to the next one', async () => {
    const p1 = store.addProfile('Home', 20)
    const p2 = store.addProfile('Gym', 20)
    await showProfiles(p1.id)

    document.querySelector('[data-delete-profile]').click()
    await Promise.resolve()
    expect(store.getData().profiles.map((p) => p.name)).toEqual(['Gym'])
    expect(document.querySelector('[data-counter]').textContent).toBe('Profile 1 of 1')
    expect(document.querySelector('.card-title').textContent).toContain('Gym')
    expect(location.hash).toBe(`#/profiles/${p2.id}`)

    document.querySelector('[data-delete-profile]').click()
    await Promise.resolve()
    expect(store.getData().profiles).toEqual([])
    expect(document.querySelector('.empty').textContent).toContain('No profiles yet')
    expect(location.hash).toBe('#/profiles')
  })
})

describe('add profile view', () => {
  it('does not constrain barbell weight to 0.5 steps', async () => {
    await showAdd()
    const barbell = document.querySelector('.barbell')
    expect(barbell.getAttribute('step')).toBe('any')
    expect(barbell.required).toBe(true)
  })

  it('flags zero or negative barbell weights as invalid', async () => {
    await showAdd()
    const barbell = document.querySelector('.barbell')
    for (const bad of ['0', '-20']) {
      barbell.value = bad
      expect(barbell.validity.valid, `barbell ${bad} should be invalid`).toBe(false)
    }
    barbell.value = '20'
    expect(barbell.validity.valid).toBe(true)
  })

  it('creates the profile and navigates straight to it', async () => {
    const existing = store.addProfile('Home', 20)
    await showAdd()

    const form = document.querySelector('profile-add form')
    form.querySelector('[name="name"]').value = 'Aquafit'
    form.querySelector('.barbell').value = '1.25'
    submit(form)
    await Promise.resolve()

    const created = store.getData().profiles.find((p) => p.name === 'Aquafit')
    expect(created).toBeTruthy()
    expect(created.barbellKg).toBe(1.25)
    expect(location.hash).toBe(`#/profiles/${created.id}`)

    document.body.innerHTML = ''
    await showProfiles(created.id)
    expect(document.querySelector('[data-counter]').textContent).toBe('Profile 2 of 2')
    expect(document.querySelector('.card-title').textContent).toContain('Aquafit')
    expect(existing.id).not.toBe(created.id)
  })
})

describe('profile plate editing', () => {
  it('does not constrain plate weight to 0.5 steps', async () => {
    store.addProfile('Gym', 20)
    await showProfiles()
    expect(document.querySelector('.new-plate').getAttribute('step')).toBe('any')
  })

  it('accepts fractional plates like 1.25 and 0.25', async () => {
    store.addProfile('Gym', 20)
    await showProfiles()

    for (const kg of ['1.25', '0.25']) {
      const form = document.querySelector('weight-profile form')
      form.querySelector('.new-plate').value = kg
      submit(form)
      await Promise.resolve()
    }

    expect(store.getData().profiles[0].plates.map((p) => p.kg)).toEqual([1.25, 0.25])
  })

  it('flags zero or negative plate weights and counts as invalid', async () => {
    store.addProfile('Gym', 20)
    await showProfiles()

    const form = document.querySelector('weight-profile form')
    const weight = form.querySelector('.new-plate')
    const count = form.querySelector('.new-count')

    for (const bad of ['0', '-5']) {
      weight.value = bad
      expect(weight.validity.valid, `weight ${bad} should be invalid`).toBe(false)
    }
    weight.value = '0.01'
    expect(weight.validity.valid).toBe(true)

    for (const bad of ['0', '-2']) {
      count.value = bad
      expect(count.validity.valid, `count ${bad} should be invalid`).toBe(false)
    }
    count.value = '1'
    expect(count.validity.valid).toBe(true)
  })

  it('adds a plate with weight and total count in one step', async () => {
    store.addProfile('Gym', 20)
    await showProfiles()

    const form = document.querySelector('weight-profile form')
    form.querySelector('.new-plate').value = '10'
    form.querySelector('.new-count').value = '4'
    submit(form)
    await Promise.resolve()

    expect(store.getData().profiles[0].plates).toHaveLength(1)
    expect(store.getData().profiles[0].plates[0]).toMatchObject({ kg: 10, count: 4 })
  })

  it('treats an empty count as unlimited', async () => {
    store.addProfile('Gym', 20)
    await showProfiles()

    const form = document.querySelector('weight-profile form')
    form.querySelector('.new-plate').value = '5'
    form.querySelector('.new-count').value = ''
    submit(form)
    await Promise.resolve()

    expect(store.getData().profiles[0].plates[0].count).toBe(Infinity)
  })

  it('rejects a zero or invalid count', async () => {
    store.addProfile('Gym', 20)
    await showProfiles()

    const form = document.querySelector('weight-profile form')
    form.querySelector('.new-plate').value = '5'
    form.querySelector('.new-count').value = '0'
    submit(form)
    await Promise.resolve()

    expect(store.getData().profiles[0].plates).toEqual([])
  })

  it('renders unlimited rows with a checked ∞ and disabled count', async () => {
    const profile = store.addProfile('Gym', 20)
    store.updateProfile(profile.id, { plates: [{ kg: 25, count: Infinity }, { kg: 10, count: 2 }] })
    await showProfiles()

    const boxes = document.querySelectorAll('[data-unlimited]')
    const counts = document.querySelectorAll('[data-count]')
    expect(boxes[0].checked).toBe(true)
    expect(counts[0].disabled).toBe(true)
    expect(counts[0].value).toBe('')
    expect(boxes[1].checked).toBe(false)
    expect(counts[1].disabled).toBe(false)
    expect(counts[1].value).toBe('2')
  })

  it('can switch a finite count to unlimited and back', async () => {
    const profile = store.addProfile('Gym', 20)
    store.updateProfile(profile.id, { plates: [{ kg: 10, count: 2 }] })
    await showProfiles()

    document.querySelector('[data-unlimited]').click()
    await Promise.resolve()
    expect(store.getData().profiles[0].plates[0].count).toBe(Infinity)

    document.querySelector('[data-unlimited]').click()
    await Promise.resolve()
    expect(store.getData().profiles[0].plates[0].count).toBe(1)
  })

  it('updates a finite count in place', async () => {
    const profile = store.addProfile('Gym', 20)
    store.updateProfile(profile.id, { plates: [{ kg: 10, count: 2 }] })
    await showProfiles()

    const count = document.querySelector('[data-count]')
    count.value = '6'
    count.dispatchEvent(new Event('change', { bubbles: true }))
    await Promise.resolve()

    expect(store.getData().profiles[0].plates[0].count).toBe(6)
  })

  it('calculator can use a 1.25 kg plate', async () => {
    const profile = store.addProfile('Gym', 0)
    store.updateProfile(profile.id, { plates: [{ kg: 1.25, count: Infinity }] })
    const { calcPlates } = await import('../src/plates.js')
    const result = calcPlates(5, store.getProfile(profile.id))
    expect(result.achievable).toBe(true)
    expect(result.plates).toEqual([{ kg: 1.25, count: 2 }])
  })
})
