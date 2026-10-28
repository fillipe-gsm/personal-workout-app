import { uid } from './id.js'
import { normalizeCategory, normalizeEntitySource } from './enums.js'
import { SetScheme } from './set-scheme.js'

/**
 * A movement in the catalog (`exercise` table).
 * The scheme fields are defaults, copied into a plan slot when the exercise
 * is added to a workout plan. A logged session snapshots the scheme it used.
 */
export class Exercise {
  constructor({
    id = uid(),
    name = '',
    category,
    setScheme,
    source,
    createdAt,
    updatedAt,
    deletedAt = null
  } = {}) {
    this.id = id
    this.name = String(name).trim()
    this.category = normalizeCategory(category)
    this.setScheme = SetScheme.fromJSON(setScheme)
    this.source = normalizeEntitySource(source)
    this.createdAt = createdAt ?? new Date().toISOString()
    this.updatedAt = updatedAt ?? this.createdAt
    this.deletedAt = deletedAt
  }

  static fromJSON(raw) {
    return new Exercise({ ...raw, setScheme: SetScheme.fromJSON(raw.setScheme, raw.tier) })
  }

  get isBodyweight() {
    return this.category === 'Bodyweight'
  }

  get isBarbell() {
    return this.category === 'Barbell'
  }

  get isFromTemplate() {
    return this.source === 'template'
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      setScheme: this.setScheme.toJSON(),
      source: this.source,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt
    }
  }
}
