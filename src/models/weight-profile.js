import { uid } from './id.js'
import { WeightPlate } from './weight-plate.js'

/**
 * A bar + available plates (`weight_profile` table), used by the plate
 * calculator. Plates are stored as owned children, like the JSON model.
 */
export class WeightProfile {
  constructor({ id = uid(), name = '', barbellKg, plates = [], createdAt, updatedAt, deletedAt = null } = {}) {
    this.id = id
    this.name = String(name).trim()
    this.barbellKg = Number(barbellKg)
    this.plates = plates.map((p) => (p instanceof WeightPlate ? p : WeightPlate.fromJSON(p)))
    this.createdAt = createdAt ?? new Date().toISOString()
    this.updatedAt = updatedAt ?? this.createdAt
    this.deletedAt = deletedAt
  }

  static fromJSON(raw) {
    return new WeightProfile(raw)
  }

  addPlate(kg, count = Infinity) {
    this.plates.push(new WeightPlate({ kg, count }))
  }

  setPlateCount(index, count) {
    const plate = this.plates[index]
    if (!plate) return
    plate.count = count === Infinity || count == null ? Infinity : Math.max(0, Math.floor(Number(count)))
  }

  removePlate(index) {
    this.plates.splice(index, 1)
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      barbellKg: this.barbellKg,
      plates: this.plates.map((p) => p.toJSON()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt
    }
  }
}
