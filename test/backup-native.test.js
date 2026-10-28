// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  writeFile: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn()
}))

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }))
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: mocks.writeFile, checkPermissions: mocks.checkPermissions, requestPermissions: mocks.requestPermissions },
  Directory: { Documents: 'DOCUMENTS' },
  Encoding: { UTF8: 'utf8' }
}))

const storage = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
})

const store = await import('../src/store.js')
await import('../src/components/backup.js')

beforeEach(() => {
  store.clearAllData()
  document.body.innerHTML = ''
  mocks.writeFile.mockReset()
  mocks.writeFile.mockResolvedValue({
    uri: 'file:///storage/emulated/0/Documents/workout-backup.json'
  })
  mocks.checkPermissions.mockReset()
  mocks.checkPermissions.mockResolvedValue({ publicStorage: 'granted' })
  mocks.requestPermissions.mockReset()
  mocks.requestPermissions.mockResolvedValue({ publicStorage: 'granted' })
})

function clickExport() {
  document.body.append(document.createElement('backup-view'))
  document.querySelector('[data-export]').click()
  return new Promise((r) => setTimeout(r, 0))
}

describe('native backup export', () => {
  it('writes a real JSON file to Documents through Filesystem', async () => {
    store.addExercise('Squat')
    await clickExport()

    expect(mocks.writeFile).toHaveBeenCalledTimes(1)
    const options = mocks.writeFile.mock.calls[0][0]
    expect(options.directory).toBe('DOCUMENTS')
    expect(options.encoding).toBe('utf8')
    expect(options.path).toMatch(/^workout-backup-\d{8}-\d{4}\.json$/)

    const payload = JSON.parse(options.data)
    expect(payload.version).toBe(2)
    expect(payload.data.exercises).toHaveLength(1)

    const status = document.querySelector('[data-status]')
    expect(status.className).toContain('status-ok')
    expect(status.textContent).toContain('Documents')
    expect(status.textContent).toContain('workout-backup-')
  })

  it('requests storage permission and retries once when writing fails (Android <= 10)', async () => {
    mocks.writeFile.mockRejectedValueOnce(new Error('Permission denied'))
    mocks.checkPermissions.mockResolvedValue({ publicStorage: 'prompt' })
    mocks.requestPermissions.mockResolvedValue({ publicStorage: 'granted' })

    await clickExport()

    expect(mocks.writeFile).toHaveBeenCalledTimes(2)
    expect(document.querySelector('.status-ok').textContent).toContain('Documents')
  })

  it('shows an error instead of a fake success when writing fails', async () => {
    mocks.writeFile.mockRejectedValueOnce(new Error('Permission denied'))
    await clickExport()

    const status = document.querySelector('.status-err')
    expect(status).toBeTruthy()
    expect(status.textContent).toContain('Permission denied')
  })
})
