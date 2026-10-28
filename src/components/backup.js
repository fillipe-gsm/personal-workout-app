import { exportData, previewBackup, importBackup } from '../store.js'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { esc } from './base.js'
import './header.js'

function backupFileName(exportedAt) {
  const d = new Date(exportedAt)
  const pad = (n) => String(n).padStart(2, '0')
  return `workout-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`
}

function canShareFiles() {
  try {
    if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false
    return navigator.canShare({ files: [new File([''], 'backup.json', { type: 'application/json' })] })
  } catch {
    return false
  }
}

function downloadTextFile(name, text) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Writes the backup where the user can actually find it.
 * - Native (Android/iOS): writes a real JSON file to the public Documents
 *   folder through the Capacitor Filesystem plugin, which returns the actual
 *   file URI shown in the UI.
 * - Web: falls back to a browser download (Downloads folder).
 */
async function writeNativeFile(name, text) {
  const options = {
    path: name,
    data: text,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true
  }
  try {
    return await Filesystem.writeFile(options)
  } catch (err) {
    // On Android <= 10 the public Documents folder needs a runtime storage
    // permission. Ask for it and retry once; newer Androids don't need it.
    if (Capacitor.getPlatform() !== 'android') throw err
    const status = await Filesystem.checkPermissions()
    if (status.publicStorage === 'granted') throw err
    const requested = await Filesystem.requestPermissions()
    if (requested.publicStorage !== 'granted') throw err
    return Filesystem.writeFile(options)
  }
}

async function saveBackupFile(backup) {
  const name = backupFileName(backup.exportedAt)
  const text = JSON.stringify(backup, null, 2)
  if (Capacitor.isNativePlatform()) {
    const result = await writeNativeFile(name, text)
    return { name, uri: result?.uri ?? null, native: true }
  }
  downloadTextFile(name, text)
  return { name, uri: null, native: false }
}

export class BackupView extends HTMLElement {
  connectedCallback() {
    this._pending = null
    this._status = null
    this._shareOk = canShareFiles()
    this.render()
  }

  summaryText(s) {
    const bits = [
      `${s.exercises} exercise${s.exercises === 1 ? '' : 's'}`,
      `${s.plans} plan${s.plans === 1 ? '' : 's'}`,
      `${s.profiles} profile${s.profiles === 1 ? '' : 's'}`,
      `${s.sessions} session${s.sessions === 1 ? '' : 's'}`
    ]
    return bits.join(', ')
  }

  render() {
    const pending = this._pending
    const status = this._status
    this.innerHTML = `
      <div class="screen">
        <app-header title="Backup" back="#/"></app-header>
        <div class="card">
          <div class="card-title">Export</div>
          <p class="muted">Saves every exercise, plan, weight profile and workout session to a single JSON file in your Documents folder.</p>
          <div class="backup-actions">
            <button class="btn" data-export>Download backup</button>
            ${this._shareOk ? '<button class="btn" data-share>Share backup…</button>' : ''}
          </div>
        </div>
        <div class="card">
          <div class="card-title">Import</div>
          <p class="muted">Restores a backup file. This <strong>replaces everything</strong> currently on this phone, so export first if you are unsure.</p>
          <label class="btn" data-pick>Choose backup file<input type="file" accept="application/json,.json" data-file hidden /></label>
          ${pending ? `
            <div class="backup-preview">
              <p>This file contains: <strong>${esc(this.summaryText(pending.summary))}</strong>${pending.summary.exportedAt ? ` (exported ${esc(new Date(pending.summary.exportedAt).toLocaleString())})` : ''}.</p>
              <p><strong>Replace everything on this phone with this backup?</strong></p>
              <div class="backup-actions">
                <button class="btn btn-danger" data-confirm>Yes, replace everything</button>
                <button class="btn" data-cancel>Cancel</button>
              </div>
            </div>` : ''}
        </div>
        ${status ? `<p class="${status.ok ? 'status-ok' : 'status-err'}" data-status role="status">${esc(status.text)}</p>` : ''}
      </div>`
    this.bind()
  }

  setStatus(ok, text) {
    this._status = { ok, text }
    this.render()
  }

  bind() {
    this.querySelector('[data-export]')?.addEventListener('click', async () => {
      try {
        const backup = exportData()
        const { name, uri, native } = await saveBackupFile(backup)
        if (native) {
          this.setStatus(
            true,
            `Saved ${name} to your Documents folder${uri ? ` (${uri})` : ''}. Open the Files app → Documents to find it.`
          )
        } else {
          this.setStatus(
            true,
            `Saved ${name}. Move it to your other phone (Drive, email, USB), then use Import there.`
          )
        }
      } catch (err) {
        this.setStatus(false, `Could not save the backup: ${err?.message || err}`)
      }
    })
    this.querySelector('[data-share]')?.addEventListener('click', async () => {
      const backup = exportData()
      const name = backupFileName(backup.exportedAt)
      const file = new File([JSON.stringify(backup, null, 2)], name, { type: 'application/json' })
      try {
        await navigator.share({ files: [file], title: 'Workout backup' })
      } catch (err) {
        if (err?.name !== 'AbortError') this.setStatus(false, `Sharing failed: ${err?.message || err}`)
      }
    })
    this.querySelector('[data-file]')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const { payload, summary } = previewBackup(String(reader.result ?? ''))
          this._pending = { payload, summary, fileName: file.name }
          this._status = null
          this.render()
        } catch (err) {
          this._pending = null
          this.setStatus(false, err?.message || 'Could not read that backup file.')
        }
      }
      reader.onerror = () => {
        this._pending = null
        this.setStatus(false, 'Could not read that file.')
      }
      reader.readAsText(file)
    })
    this.querySelector('[data-confirm]')?.addEventListener('click', () => {
      try {
        const summary = importBackup(this._pending.payload)
        this._pending = null
        this.setStatus(true, `Import complete: ${this.summaryText(summary)}.`)
      } catch (err) {
        this.setStatus(false, err?.message || 'Import failed.')
      }
    })
    this.querySelector('[data-cancel]')?.addEventListener('click', () => {
      this._pending = null
      this._status = null
      this.render()
    })
  }
}

if (!customElements.get('backup-view')) customElements.define('backup-view', BackupView)
