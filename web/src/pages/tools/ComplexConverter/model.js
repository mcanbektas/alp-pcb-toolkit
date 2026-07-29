// Kompleks sayı dönüştürücü ekranının hesap modeli (spec §11.6).
// Saf: React, DOM ve gösterim bilmez; Türkçe cümle döndürmez, yalnızca kod ve sayı.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { RESISTANCE } from '../../../lib/units'
import {
  rectToPolar, polarToRect, degToRad,
  COMPLEX_ERR_UNDEFINED_PHASE, COMPLEX_ERR_NEGATIVE_MAGNITUDE,
} from '../../../lib/convertComplex'

// --- Mod: dönüşüm yönü. Form içinde alan olarak tutulur (compute(f)) ---
export const MODE_RECT = 'rect'   // R + jX  →  |Z| ∠ φ
export const MODE_POLAR = 'polar' // |Z| ∠ φ  →  R + jX
export const MODES = [MODE_RECT, MODE_POLAR]

// --- Hesap yapılamadığında dönen kodlar; metne text.js çevirir ---
export const REASON_INCOMPLETE = 'incomplete'
export const REASON_UNDEFINED_PHASE = 'undefined-phase'
export const REASON_NEGATIVE_MAGNITUDE = 'negative-magnitude'
export const REASON_INVALID = 'invalid'

// --- Parametrik grafik taramaları ---
export const SWEEP_MAG = 'mag'
export const SWEEP_PHASE = 'phase'
export const SWEEP_PARAMS = [SWEEP_MAG, SWEEP_PHASE]

// units.js'te açı tablosu yok; ekranın yerel tanımı. SI karşılığı radyandır.
const ANGLE = { '°': Math.PI / 180, rad: 1 }

// Girilebilecek açı sınırı: ±3600°. Daha büyük açılarda cos/sin argüman
// indirgemesi anlamlı basamak kaybettirir, sonuç sayısal olarak güvenilmez olur.
export const PHASE_LIMIT_DEG = 3600
export const PHASE_LIMIT_RAD = degToRad(PHASE_LIMIT_DEG)
// Aynı sınırın tur cinsinden karşılığı; sağ panelde sayı olarak yazılır.
export const PHASE_LIMIT_TURNS = PHASE_LIMIT_DEG / 360

export const INITIAL_FORM = {
  mode: MODE_RECT,
  R: '50', Ru: 'Ω',
  X: '-30', Xu: 'Ω',
  mag: '58.31', magu: 'Ω',
  phase: '-30.96', phaseu: '°',
}

// Alan etiketleri dışarıdan gelir: model dil bilmez, hata mesajında gösterilecek
// adı ekran geçirir. Etiket verilmezse alan anahtarı görünür — sessiz boşluk
// yerine teşhis edilebilir bir ad.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key

  return fieldsFor([
    // R, X ve φ için sıfır ve negatif değer meşrudur: sıfır saf reaktans/saf
    // direnç, negatif X kapasitif davranış, negatif R ise ikinci/üçüncü çeyrek demektir.
    when(f.mode === MODE_RECT, [
      { key: 'R', label: L('R'), unitKey: 'Ru', table: RESISTANCE, allowZero: true },
      { key: 'X', label: L('X'), unitKey: 'Xu', table: RESISTANCE, allowZero: true },
    ]),
    when(f.mode === MODE_POLAR, [
      // min konmaz: negatif |Z| alan hatası yerine kendi açıklamalı nedenini alsın
      { key: 'mag', label: L('mag'), unitKey: 'magu', table: RESISTANCE, allowZero: true },
      {
        key: 'phase', label: L('phase'), unitKey: 'phaseu', table: ANGLE,
        allowZero: true, min: -PHASE_LIMIT_RAD, max: PHASE_LIMIT_RAD,
      },
    ]),
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const mode = f.mode === MODE_POLAR ? MODE_POLAR : MODE_RECT

  // İleri dönüşüm — hangi biçimden girildiyse ondan
  const base = mode === MODE_RECT
    ? rectToPolar({ R: v.R, X: v.X })
    : polarToRect({ magnitude: v.mag, phase: v.phase })

  if (base.error === COMPLEX_ERR_UNDEFINED_PHASE) {
    return { ok: false, reason: REASON_UNDEFINED_PHASE }
  }
  if (base.error === COMPLEX_ERR_NEGATIVE_MAGNITUDE) {
    return { ok: false, reason: REASON_NEGATIVE_MAGNITUDE }
  }
  if (base.error) return { ok: false, reason: REASON_INVALID }

  // Ters dönüşüm — spec §11.6'nın karşı bağıntıları ile tutarlılık kontrolü.
  // Girilen biçim zaten `base` olduğu için o yön yeniden hesaplanmaz.
  const fromRect = mode === MODE_RECT ? base : rectToPolar({ R: base.R, X: base.X })
  const fromPolar = mode === MODE_POLAR ? base : polarToRect({ magnitude: base.magnitude, phase: base.phase })
  const check = fromRect.error || fromPolar.error
    ? null
    : {
        R: fromPolar.R,                 // |Z|·cos φ
        X: fromPolar.X,                 // |Z|·sin φ
        magnitude: fromRect.magnitude,  // √(R² + X²)
        phase: fromRect.phase,          // atan2(X, R)
        phaseDeg: fromRect.phaseDeg,
      }

  // Girilen açı ana değer aralığının dışındaysa eşdeğeri gösterilecek
  const wrapped = Math.abs(base.phaseDeg - base.phasePrincipalDeg) > 1e-9

  return {
    ok: true,
    mode,
    R: base.R,
    X: base.X,
    magnitude: base.magnitude,
    phase: base.phasePrincipal,          // radyan, ana değer
    phaseDeg: base.phasePrincipalDeg,    // derece, ana değer
    phaseEntered: base.phase,            // girilen açı (radyan)
    phaseEnteredDeg: base.phaseDeg,
    wrapped,
    kind: base.kind,
    quadrant: base.quadrant,
    check,
    // Geçerlilik bayrakları — cümleye text.js çevirir.
    // "Negatif gerçel bileşen" kararı büyüklüğe göreli eşikle verilir: polar
    // girişte cos(±90°) tam sıfır yerine −3.7e-16 döner ve bu, gerçekten
    // negatif bir R değildir.
    flags: {
      negativeReal: base.R < -1e-12 * base.magnitude,
      wrapped,
      polarInput: mode === MODE_POLAR,
    },
  }
}

// Parametrik grafik: R sabit tutulup X taranır.
//   'mag'   → |Z| = √(R² + X²)
//   'phase' → φ = atan2(X, R), derece
export function buildSweep(r, param) {
  if (!r.ok) return null

  const scale = Math.max(Math.abs(r.R), Math.abs(r.X))
  if (!(scale > 0)) return null

  const span = 3 * scale
  const steps = 121
  const rows = []
  for (let i = 0; i < steps; i++) {
    const X = -span + (2 * span * i) / (steps - 1)
    const p = rectToPolar({ R: r.R, X })
    if (p.error) continue // R = 0 ve X = 0 noktası: faz tanımsız, o nokta atlanır
    rows.push({ x: X, y: param === SWEEP_PHASE ? p.phaseDeg : p.magnitude })
  }
  if (rows.length === 0) return null

  const markerY = param === SWEEP_PHASE ? r.phaseDeg : r.magnitude
  const refs = param === SWEEP_PHASE
    ? [{ key: 'resistive', y: 0 }]
    : [{ key: 'minMag', y: Math.abs(r.R) }]

  return {
    param,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    bandPoints: null,
    refs,
    marker: Number.isFinite(r.X) && Number.isFinite(markerY) ? { x: r.X, y: markerY } : null,
  }
}
