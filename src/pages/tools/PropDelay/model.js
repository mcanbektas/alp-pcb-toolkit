// Yayılma gecikmesi ve dalga boyu ekranının hesap modeli (spec §7.1, §7.2).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor } from '../../../lib/fields'
import { LENGTH, FREQUENCY } from '../../../lib/units'
import { epsFields, resolveEpsEff, INITIAL_EPS_FORM, psPerMm } from '../../../lib/epsEff'
import { wavelength, electricalLength } from '../../../lib/signalIntegrity'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_EPS = 'eps'

export const INITIAL_FORM = {
  ...INITIAL_EPS_FORM,
  length: '50', lengthu: 'mm',
  freq: '1', frequ: 'GHz',
}

const DIM = { mm: LENGTH.mm, cm: LENGTH.cm, m: LENGTH.m, mil: LENGTH.mil, inch: LENGTH.inch }

export function formFields(f) {
  return fieldsFor([
    epsFields(f),
    [
      { key: 'length', label: 'Hat uzunluğu', unitKey: 'lengthu', table: DIM, min: 0 },
      { key: 'freq', label: 'Frekans', unitKey: 'frequ', table: FREQUENCY, min: 0 },
    ],
  ])
}

export function compute(f) {
  const read = readForm(f, formFields(f))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const eps = resolveEpsEff(read.values, f)
  if (eps.error) return { ok: false, reason: REASON_EPS }

  const v = read.values
  const el = electricalLength({ length: v.length, f: v.freq, epsEff: eps.epsEff })
  if (el.error) return { ok: false, reason: REASON_INCOMPLETE }

  // Hattın çeyrek dalga olduğu frekans — rezonans davranışının başladığı yer
  const quarterWaveFreq = eps.epsEff > 0
    ? 1 / (4 * v.length * eps.tpd)
    : NaN

  return {
    ok: true,
    eps,
    length: v.length,
    freq: v.freq,
    ...el,
    tpdPsPerMm: psPerMm(eps.tpd),
    quarterWaveFreq,
  }
}

// Grafik: frekansa göre elektriksel uzunluk
export function buildSweep(r) {
  if (!r.ok) return null

  const from = r.freq / 100
  const to = r.freq * 100
  const steps = 70
  const rows = []
  for (let i = 0; i < steps; i++) {
    const f = Math.pow(10, Math.log10(from) + ((Math.log10(to) - Math.log10(from)) * i) / (steps - 1))
    const e = electricalLength({ length: r.length, f, epsEff: r.eps.epsEff })
    rows.push({ x: f, y: e.error ? NaN : e.degrees })
  }

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    // 90° çeyrek dalga, 180° yarım dalga — rezonans eşikleri
    refs: [
      { key: 'quarter', y: 90 },
      { key: 'half', y: 180 },
    ],
    marker: { x: r.freq, y: r.degrees },
  }
}
