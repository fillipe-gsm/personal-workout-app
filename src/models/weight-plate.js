import { uid } from './id.js'

/**
 * A plate available in a weight profile (`weight_plate` table).
 * `count` is the TOTAL number of that plate across both sides of the bar;
 * `Infinity` means unlimited (stored as `null` in JSON).
 */
export class WeightPlate {
  constructor({ id = uid(), kg, count = Infinity } = {}) {
    this.id = id
    this.kg = Number(kg)
    this.count = count === Infinity || count == null ? Infinity : Math.max(0, Math.floor(Number(count)))
  }

  static fromJSON(raw) {
    return new WeightPlate(raw)
  }

  get isUnlimited() {
    return this.count === Infinity
  }

  toJSON() {
    return { id: this.id, kg: this.kg, count: this.count }
  }
}
