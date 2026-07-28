// Sıcaklık dönüştürücü ekranının hesap modeli (spec §11.5).
// Saf: React, DOM ve gösterim bilmez; hata durumunda kod döner, cümle döndürmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import {
  UNIT_C, UNIT_F, UNIT_K, TEMP_UNITS,
  ABS_ZERO_C, ABS_ZERO_F, ABS_ZERO_K,
  cToF, cToK,
  convertTemperature, convertDelta, finalTemperature,
  TEMP_ERR_UNIT, TEMP_ERR_ABSOLUTE_ZERO,
} from '../../../lib/convertTemperature'

// Mod, form içinde bir alan olarak tutulur (compute(f) imzası korunur).
export const MODE_ABS = 'abs'
export const MODE_DELTA = 'delta'
export const MODES = [MODE_ABS, MODE_DELTA]

// Hesap yapılamadığında dönen kodlar — metne text.js çevirir
export const REASON_INCOMPLETE = 'incomplete'
export const REASON_ABSOLUTE_ZERO = 'absolute-zero'
export const REASON_UNIT = 'unit'

// Grafik tarama seçenekleri
export const SWEEP_F = 'F'
export const SWEEP_K = 'K'
export const SWEEP_PARAMS = [SWEEP_F, SWEEP_K]

// NumberField'ın birim listesi
export const UNITS = TEMP_UNITS

export { UNIT_C, UNIT_F, UNIT_K, ABS_ZERO_C, ABS_ZERO_F, ABS_ZERO_K }

// Sonuç panelindeki referans noktaları. Yalnızca tartışmasız tanım noktaları:
// mutlak sıfır, suyun donma/kaynama noktası (1 atm) ve kod tabanının başka
// yerinde de kullanılan iki referans (bakır özdirenci 20 °C, veri sayfası 25 °C).
export const REFERENCE_POINTS = [
  { key: 'absZero', C: ABS_ZERO_C },
  { key: 'waterFreeze', C: 0 },
  { key: 'copperRef', C: 20 },
  { key: 'roomRef', C: 25 },
  { key: 'waterBoil', C: 100 },
]

export const INITIAL_FORM = {
  mode: MODE_ABS,
  T: '25', Tu: UNIT_C,
  amb: '25', ambu: UNIT_C,
}

// `T` alanının adı moda göre değişir: ekran iki ayrı etiket geçirir
// (`absT` / `deltaT`), model hangisini kullanacağını moddan seçer.
export function formFields(f, labels = {}) {
  const delta = f.mode === MODE_DELTA
  const tLabel = delta ? (labels.deltaT ?? 'deltaT') : (labels.absT ?? 'absT')

  return fieldsFor([
    // Sıcaklık afin dönüşür; çarpan tablosu verilmez, ham sayı okunur ve
    // ölçek dönüşümü convertTemperature.js içinde yapılır.
    [{ key: 'T', label: tLabel, allowZero: true }],
    when(delta, [
      { key: 'amb', label: labels.amb ?? 'amb', optional: true, allowZero: true },
    ]),
  ])
}

function reasonFor(err) {
  if (err === TEMP_ERR_ABSOLUTE_ZERO) return REASON_ABSOLUTE_ZERO
  if (err === TEMP_ERR_UNIT) return REASON_UNIT
  return REASON_INCOMPLETE
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const mode = f.mode === MODE_DELTA ? MODE_DELTA : MODE_ABS

  if (mode === MODE_DELTA) {
    const delta = convertDelta({ value: v.T, unit: f.Tu })
    if (delta.error) return { ok: false, reason: reasonFor(delta.error) }

    // Ortam sıcaklığı isteğe bağlı: verilirse mutlak sonuç da türetilir.
    let final = null
    if (v.amb !== null && v.amb !== undefined) {
      const fin = finalTemperature({
        ambient: v.amb, ambientUnit: f.ambu,
        delta: v.T, deltaUnit: f.Tu,
      })
      if (fin.error) return { ok: false, reason: reasonFor(fin.error) }
      final = fin
    }

    return {
      ok: true,
      mode,
      unit: f.Tu,
      ambientUnit: f.ambu,
      input: v.T,
      delta,
      final,
      // ΔT'nin üç ölçekteki karşılığı — gösterim sırası sabit
      scales: [
        { unit: UNIT_C, value: delta.dC },
        { unit: UNIT_F, value: delta.dF },
        { unit: UNIT_K, value: delta.dK },
      ],
    }
  }

  const temp = convertTemperature({ value: v.T, unit: f.Tu })
  if (temp.error) return { ok: false, reason: reasonFor(temp.error) }

  return {
    ok: true,
    mode,
    unit: f.Tu,
    input: v.T,
    temp,
    scales: [
      { unit: UNIT_C, value: temp.C },
      { unit: UNIT_F, value: temp.F },
      { unit: UNIT_K, value: temp.K },
    ],
    refs: REFERENCE_POINTS.map((p) => ({
      key: p.key,
      C: p.C,
      F: cToF(p.C),
      K: cToK(p.C),
    })),
  }
}

// Grafik: santigrat ekseni üzerinde seçilen ölçeğin karşılığı.
// Mutlak modda doğru 32 (veya 273.15) ofsetiyle kayar; fark modunda
// başlangıç noktasından geçer — iki dönüşümün farkı grafikte görünür.
export function buildSweep(r, param) {
  if (!r.ok) return null

  const p = param === SWEEP_K ? SWEEP_K : SWEEP_F
  const steps = 61
  const rows = []

  let lo
  let hi
  let marker
  let refs = []

  if (r.mode === MODE_DELTA) {
    const dC = r.delta.dC
    const span = Math.max(100, Math.abs(dC) * 1.5)
    lo = dC < 0 ? -span : 0
    hi = dC < 0 ? 0 : span
    marker = { x: dC, y: p === SWEEP_K ? r.delta.dK : r.delta.dF }
  } else {
    const C = r.temp.C
    lo = ABS_ZERO_C
    hi = Math.max(200, C + 50)
    marker = { x: C, y: p === SWEEP_K ? r.temp.K : r.temp.F }
    refs = [{
      key: 'absZero',
      y: p === SWEEP_K ? ABS_ZERO_K : ABS_ZERO_F,
      unit: p === SWEEP_K ? UNIT_K : UNIT_F,
    }]
  }

  for (let i = 0; i < steps; i++) {
    const x = lo + ((hi - lo) * i) / (steps - 1)
    let y
    if (r.mode === MODE_DELTA) {
      y = p === SWEEP_K ? x : (x * 9) / 5
    } else {
      y = p === SWEEP_K ? cToK(x) : cToF(x)
    }
    rows.push({ x, y })
  }

  if (rows.length === 0) return null

  return {
    param: p,
    mode: r.mode,
    rows,
    points: rows.map((q) => [q.x, q.y]),
    bandPoints: null,
    refs,
    marker: Number.isFinite(marker.x) && Number.isFinite(marker.y) ? marker : null,
  }
}
