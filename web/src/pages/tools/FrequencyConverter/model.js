// Frekans ve periyot dönüştürücü ekranının hesap modeli (spec §11.3).
// Saf: React, DOM ve gösterim bilmez, Türkçe cümle döndürmez.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { FREQUENCY, TIME, fromSI } from '../../../lib/units'
import {
  convertFrequency, periodFromFrequency,
  SOURCE_FREQUENCY, SOURCE_PERIOD,
  FREQ_ERR_NONPOSITIVE, FREQ_ERR_RANGE,
} from '../../../lib/convertFrequency'

export { SOURCE_FREQUENCY, SOURCE_PERIOD }
export const SOURCES = [SOURCE_FREQUENCY, SOURCE_PERIOD]

// Hesap yapılamadığında dönen kodlar — metne text.js çevirir
export const REASON_INCOMPLETE = 'incomplete'
export const REASON_NONPOSITIVE = 'nonpositive'
export const REASON_RANGE = 'range'

// Gösterim birimleri (sonuç tablosundaki satır sırası)
export const FREQ_UNITS = ['Hz', 'kHz', 'MHz', 'GHz']
export const TIME_UNITS = ['s', 'ms', 'µs', 'ns', 'ps']

export const INITIAL_FORM = {
  source: SOURCE_FREQUENCY,
  freq: '100', frequ: 'MHz',
  period: '10', periodu: 'ns',
}

// Sıfır ve negatif giriş alan doğrulamasında değil, hesap motorunda yakalanır:
// kullanıcı "1/0 tanımsız" gerekçesini görsün diye allowZero açık bırakılır ve
// alt sınır konmaz.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key

  return fieldsFor([
    when(f.source === SOURCE_PERIOD, [
      { key: 'period', label: L('period'), unitKey: 'periodu', table: TIME, allowZero: true },
    ]),
    when(f.source !== SOURCE_PERIOD, [
      { key: 'freq', label: L('freq'), unitKey: 'frequ', table: FREQUENCY, allowZero: true },
    ]),
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const source = f.source === SOURCE_PERIOD ? SOURCE_PERIOD : SOURCE_FREQUENCY
  const value = source === SOURCE_PERIOD ? read.values.period : read.values.freq

  const base = convertFrequency({ source, value })
  if (base.error === FREQ_ERR_NONPOSITIVE) return { ok: false, reason: REASON_NONPOSITIVE }
  if (base.error === FREQ_ERR_RANGE) return { ok: false, reason: REASON_RANGE }
  if (base.error) return { ok: false, reason: REASON_INCOMPLETE }

  return {
    ok: true,
    source,
    // SI değerler — grafik, şema ve metin bunları kullanır
    frequency: base.frequency,
    period: base.period,
    omega: base.omega,
    // Birim karşılıkları: yalnızca çarpan uygulanır, yuvarlama yapılmaz
    freqRows: FREQ_UNITS.map((unit) => ({ unit, value: fromSI(base.frequency, unit, FREQUENCY) })),
    timeRows: TIME_UNITS.map((unit) => ({ unit, value: fromSI(base.period, unit, TIME) })),
  }
}

// Grafik: frekansa göre periyot — ters orantı eğrisi.
// Çalışma noktasının iki yanında birer dekat, logaritmik aralıklı.
export function buildSweep(r) {
  if (!r.ok) return null

  const steps = 61
  const from = r.frequency / 10
  const to = r.frequency * 10
  if (!(from > 0) || !Number.isFinite(to) || !(to > from)) return null

  const rows = []
  for (let i = 0; i < steps; i++) {
    const x = from * Math.pow(to / from, i / (steps - 1))
    const p = periodFromFrequency(x)
    if (p.error) continue
    rows.push({ x, y: p.period })
  }
  if (rows.length === 0) return null

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: { x: r.frequency, y: r.period },
    refs: [],
  }
}
