// Via özellikleri ekranının hesap modeli (spec §5.1).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH, CURRENT, VOLTAGE } from '../../../lib/units'
import {
  viaElectrical, annularRing, aspectRatio,
  viaInductance, viaCapacitance, viaDiscontinuity,
} from '../../../lib/via'

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

export const BASIS_DRILL = 'drill'
export const BASIS_FINISHED = 'finished'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_PAD = 'pad'

export const INITIAL_FORM = {
  Df: '0.3', Dfu: 'mm',
  tp: '25', tpu: 'µm',
  H: '1.6', Hu: 'mm',
  I: '3', Iu: 'A',
  T: '45',

  // Sentez kısıtları
  VdropMax: '50', VdropMaxu: 'mV',
  IsingleMax: '1', IsingleMaxu: 'A',
  Nmin: '1',

  // Padstack
  Dpad: '0.6', Dpadu: 'mm',
  Ddrill: '0.35', Ddrillu: 'mm',
  posTol: '0.05', posTolu: 'mm',
  etchTol: '0.025', etchTolu: 'mm',
  basis: BASIS_DRILL,

  // Parazitikler
  Dantipad: '1.0', Dantipadu: 'mm',
  epsR: '4.2',
}

const TEMP = { '°C': 1 }
const PLAIN = { '': 1, adet: 1 }
const DIA = { mm: LENGTH.mm, 'µm': LENGTH['µm'], um: LENGTH.um, mil: LENGTH.mil }

export function formFields(mode) {
  return fieldsFor([
    [
      { key: 'Df', label: 'Bitmiş delik çapı (D_f)', unitKey: 'Dfu', table: DIA, min: 0 },
      { key: 'tp', label: 'Kaplama kalınlığı (t_p)', unitKey: 'tpu', table: DIA, min: 0 },
      { key: 'H', label: 'Via uzunluğu / kart kalınlığı (H)', unitKey: 'Hu', table: DIA, min: 0 },
      { key: 'I', label: 'Toplam akım (I)', unitKey: 'Iu', table: CURRENT, min: 0 },
      { key: 'T', label: 'Çalışma sıcaklığı', unit: '°C', table: TEMP, allowZero: true },

      { key: 'Dpad', label: 'Pad çapı', unitKey: 'Dpadu', table: DIA, min: 0 },
      { key: 'Ddrill', label: 'Matkap çapı', unitKey: 'Ddrillu', table: DIA, min: 0 },
      { key: 'posTol', label: 'Delik konum toleransı', unitKey: 'posTolu', table: DIA, min: 0, allowZero: true },
      { key: 'etchTol', label: 'Pad aşındırma toleransı', unitKey: 'etchTolu', table: DIA, min: 0, allowZero: true },

      { key: 'Dantipad', label: 'Antipad çapı', unitKey: 'Dantipadu', table: DIA, min: 0 },
      { key: 'epsR', label: 'Dielektrik sabiti', unit: '', table: PLAIN, min: 0 },
    ],
    when(mode === MODE_SYNTHESIS, [
      { key: 'VdropMax', label: 'İzin verilen gerilim düşümü', unitKey: 'VdropMaxu', table: VOLTAGE, min: 0 },
      { key: 'IsingleMax', label: 'Tek via akım sınırı', unitKey: 'IsingleMaxu', table: CURRENT, min: 0 },
      { key: 'Nmin', label: 'En az via sayısı', unit: 'adet', table: PLAIN, min: 1 },
    ]),
  ])
}

export function compute(mode, f) {
  const read = readForm(f, formFields(mode))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  if (v.Ddrill >= v.Dpad) return { ok: false, reason: REASON_PAD }
  if (v.Dantipad <= v.Dpad) return { ok: false, reason: REASON_PAD }

  const elec = viaElectrical({
    Df: v.Df, tp: v.tp, H: v.H, I: v.I, T: v.T,
    VdropMax: mode === MODE_SYNTHESIS ? v.VdropMax : null,
    IsingleMax: mode === MODE_SYNTHESIS ? v.IsingleMax : null,
    Nmin: mode === MODE_SYNTHESIS ? v.Nmin : 1,
  })
  if (elec.error) return { ok: false, reason: REASON_INCOMPLETE }

  const ring = annularRing({
    Dpad: v.Dpad, Ddrill: v.Ddrill, positionTol: v.posTol, etchTol: v.etchTol,
  })
  if (ring.error) return { ok: false, reason: REASON_PAD }

  const ar = aspectRatio({
    boardThickness: v.H,
    diameter: f.basis === BASIS_DRILL ? v.Ddrill : v.Df,
    basis: f.basis,
  })

  const L = viaInductance({ H: v.H, D: v.Df })
  const C = viaCapacitance({ H: v.H, Dpad: v.Dpad, Dantipad: v.Dantipad, epsR: v.epsR })
  const disc = viaDiscontinuity({ L, C })

  return {
    ok: true, mode,
    ...elec,
    Df: v.Df, tp: v.tp, T: v.T,
    ring,
    aspect: ar,
    Dpad: v.Dpad, Ddrill: v.Ddrill, Dantipad: v.Dantipad, epsR: v.epsR,
    L, C, disc,
    limits: mode === MODE_SYNTHESIS
      ? { VdropMax: v.VdropMax, IsingleMax: v.IsingleMax, Nmin: v.Nmin }
      : null,
  }
}

// Grafik: via sayısına göre toplam gerilim düşümü
export function buildSweep(r) {
  if (!r.ok) return null

  const maxN = Math.max(20, r.N * 2)
  const rows = []
  for (let n = 1; n <= maxN; n++) {
    rows.push({ x: n, y: (r.I * r.R) / n })
  }

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    refs: r.limits?.VdropMax > 0 ? [{ key: 'limit', y: r.limits.VdropMax }] : [],
    marker: { x: r.N, y: (r.I * r.R) / r.N },
  }
}
