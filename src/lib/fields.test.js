import { describe, it, expect } from 'vitest'
import {
  readField, readForm, when, fieldsFor,
  FIELD_ERR_AMBIGUOUS, FIELD_ERR_MISSING, FIELD_ERR_INVALID,
  FIELD_ERR_RANGE, FIELD_ERR_UNIT,
} from './fields'

const R_TABLE = { Ω: 1, kΩ: 1e3, MΩ: 1e6 }

describe('readField', () => {
  it('birim çarpanını uygular', () => {
    const r = readField({ R: '27', Ru: 'kΩ' }, { key: 'R', label: 'R', unitKey: 'Ru', table: R_TABLE })
    expect(r.value).toBe(27000)
  })

  it('ondalık virgülü kabul eder', () => {
    const r = readField({ R: '4,7', Ru: 'kΩ' }, { key: 'R', label: 'R', unitKey: 'Ru', table: R_TABLE })
    expect(r.value).toBeCloseTo(4700, 9)
  })

  it('belirsiz binlik ayırıcıyı ayrı hata olarak bildirir', () => {
    const r = readField({ R: '1.000', Ru: 'Ω' }, { key: 'R', label: 'R', unitKey: 'Ru', table: R_TABLE })
    expect(r.error).toBe(FIELD_ERR_AMBIGUOUS)
    expect(r.label).toBe('R')
  })

  it('zorunlu alan boşsa eksik döner', () => {
    expect(readField({ R: '' }, { key: 'R', label: 'R' }).error).toBe(FIELD_ERR_MISSING)
  })

  it('opsiyonel alan boşsa null döner', () => {
    expect(readField({ R: '' }, { key: 'R', label: 'R', optional: true }).value).toBeNull()
  })

  it('sayı olmayan girdi geçersizdir', () => {
    expect(readField({ R: 'abc' }, { key: 'R', label: 'R' }).error).toBe(FIELD_ERR_INVALID)
  })

  it('bilinmeyen birim sessizce 1 sayılmaz', () => {
    const r = readField({ R: '5', Ru: 'GΩ' }, { key: 'R', label: 'R', unitKey: 'Ru', table: R_TABLE })
    expect(r.error).toBe(FIELD_ERR_UNIT)
  })

  it('sıfır varsayılan olarak geçersiz, allowZero ile geçerli', () => {
    expect(readField({ R: '0' }, { key: 'R', label: 'R' }).error).toBe(FIELD_ERR_RANGE)
    expect(readField({ R: '0' }, { key: 'R', label: 'R', allowZero: true }).value).toBe(0)
  })

  it('min/max sınırları SI cinsinden uygulanır', () => {
    const spec = { key: 'R', label: 'R', unitKey: 'Ru', table: R_TABLE, min: 100, max: 1e6 }
    expect(readField({ R: '50', Ru: 'Ω' }, spec).error).toBe(FIELD_ERR_RANGE)
    expect(readField({ R: '10', Ru: 'MΩ' }, spec).error).toBe(FIELD_ERR_RANGE)
    expect(readField({ R: '1', Ru: 'kΩ' }, spec).value).toBe(1000)
  })

  it('negatif değer min sınırıyla engellenir', () => {
    expect(readField({ R: '-5' }, { key: 'R', label: 'R', min: 0 }).error).toBe(FIELD_ERR_RANGE)
  })
})

describe('readForm', () => {
  const specs = [
    { key: 'Vin', label: 'Giriş gerilimi' },
    { key: 'R1', label: 'R1', unitKey: 'R1u', table: R_TABLE },
    { key: 'RL', label: 'Yük', unitKey: 'RLu', table: R_TABLE, optional: true },
  ]

  it('hepsi geçerliyse ok döner', () => {
    const r = readForm({ Vin: '12', R1: '27', R1u: 'kΩ', RL: '', RLu: 'kΩ' }, specs)
    expect(r.ok).toBe(true)
    expect(r.values).toEqual({ Vin: 12, R1: 27000, RL: null })
  })

  it('belirsiz ve geçersiz alanları ayrı listeler', () => {
    const r = readForm({ Vin: '1.000', R1: 'abc', R1u: 'kΩ', RL: '' }, specs)
    expect(r.ok).toBe(false)
    expect(r.ambiguous).toEqual(['Giriş gerilimi'])
    expect(r.invalid).toEqual(['R1'])
  })

  it('hatalı alan values içine yazılmaz', () => {
    const r = readForm({ Vin: '12', R1: '', RL: '' }, specs)
    expect(r.values.R1).toBeUndefined()
    expect(r.values.Vin).toBe(12)
  })
})

describe('koşullu alan listesi', () => {
  it('when koşul sağlanmazsa boş dizi verir', () => {
    const a = [{ key: 'a', label: 'A' }]
    const b = [{ key: 'b', label: 'B' }]
    expect(fieldsFor([a, when(false, b)])).toHaveLength(1)
    expect(fieldsFor([a, when(true, b)])).toHaveLength(2)
  })
})
