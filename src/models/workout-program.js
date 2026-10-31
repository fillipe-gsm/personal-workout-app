import { uid } from './id.js'
import { normalizeEntitySource } from './enums.js'

/**
 * A workout program (`workout_program` table): a group of workouts that belong
 * together (e.g. "Stronglifts 5×5" containing workouts A and B).
 *
 * Workouts may also live without a program (standalone), so deleting a program
 * never destroys user workouts — it just detaches them.
 */
export class WorkoutProgram {
  constructor({
    id = uid(),
    name = '',
    description = '',
    source,
    templateKey = null,
    templateVersion = null,
    createdAt,
    updatedAt,
    deletedAt = null
  } = {}) {
    this.id = id
    this.name = String(name).trim()
    this.description = description == null ? '' : String(description)
    this.source = normalizeEntitySource(source)
    this.templateKey = templateKey ?? null
    this.templateVersion = templateVersion ?? null
    this.createdAt = createdAt ?? new Date().toISOString()
    this.updatedAt = updatedAt ?? this.createdAt
    this.deletedAt = deletedAt
  }

  static fromJSON(raw) {
    return new WorkoutProgram(raw)
  }

  get isFromTemplate() {
    return this.source === 'template'
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      source: this.source,
      templateKey: this.templateKey,
      templateVersion: this.templateVersion,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt
    }
  }
}
