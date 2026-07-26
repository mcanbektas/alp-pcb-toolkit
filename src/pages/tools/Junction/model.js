// Junction sıcaklığı, soğutucu ve bakır termal ağı ekranının hesap modeli
// (spec §8.3 – §8.6). Saf: React, DOM ve gösterim bilmez; hata kodu döner,
// metni text.js çevirir.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH, AREA, POWER, THERMAL_R } from '../../../lib/units'
import {
  junctionTemperature, heatsink, junctionFromSurface,
  copperStripResistance, dielectricResistance, parallelThermalPaths, temperatureRise,
  PSI_JT, PSI_JB, THERMAL_ERR_INVALID, THERMAL_ERR_NEGATIVE_SINK,
} from '../../../lib/thermal'

// --- Modlar ---
export const MODE_JUNCTION = 'junction'   // §8.3
export const MODE_HEATSINK = 'heatsink'   // §8.4
export const MODE_SURFACE = 'surface'     // §8.5
export const MODES = [MODE_JUNCTION, MODE_HEATSINK, MODE_SURFACE]

// Yüzey ölçümünde hangi noktadan ölçüldüğü (§8.5)
export { PSI_JT, PSI_JB }
export const METRICS = [PSI_JT, PSI_JB]

// §8.6 bakır termal ağı ayrı bir seçimin arkasında durur
export const COPPER_OFF = 'off'
export const COPPER_ON = 'on'
export const COPPER_OPTIONS = [COPPER_OFF, COPPER_ON]

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_ENGINE = THERMAL_ERR_INVALID
// junctionTemperature() T_J,max ≤ T_A durumunu ayıklamaz (heatsink() ayıklar);
// bu ekran aynı davranışı §8.3 modunda da uygular.
export const REASON_TJMAX_LE_TA = 'tjmax-le-ta'
export const NEGATIVE_SINK = THERMAL_ERR_NEGATIVE_SINK

export const INITIAL_FORM = {
  metric: PSI_JT,
  copper: COPPER_OFF,

  // §8.3
  Ta: '40',
  P: '2', Pu: 'W',
  thetaJA: '30',
  TjMax: '125',

  // §8.4
  thetaJC: '1.5',
  thetaCS: '0.5',
  thetaSA: '',

  // §8.5
  Tsurface: '85',
  psi: '2',

  // §8.6
  Lcu: '20', Lcuu: 'mm',
  Wcu: '10', Wcuu: 'mm',
  tcu: '35', tcuu: 'um',
  Hdi: '1.6', Hdiu: 'mm',
  area: '100', areau: 'mm²',
}

const TEMP = { '°C': 1 }
const DIM = { mm: LENGTH.mm, um: LENGTH.um, mil: LENGTH.mil }
const SURF = { 'mm²': AREA['mm²'], 'mil²': AREA['mil²'], 'm²': AREA['m²'] }

export function formFields(mode, f) {
  return fieldsFor([
    when(mode === MODE_JUNCTION, [
      { key: 'Ta', label: 'Ortam sıcaklığı (T_A)', unit: '°C', table: TEMP, allowZero: true },
      // Motor bu modda P = 0'ı kabul ediyor (junctionTemperature: P >= 0) ve
      // P = 0 fiziksel olarak anlamlıdır: T_J = T_A. Sıfır geçersiz sayılmaz.
      { key: 'P', label: 'Güç kaybı (P)', unitKey: 'Pu', table: POWER, min: 0, allowZero: true },
      { key: 'thetaJA', label: 'Junction–ortam direnci (θ_JA)', unit: '°C/W', table: THERMAL_R, min: 0 },
      { key: 'TjMax', label: 'İzin verilen junction sıcaklığı (T_J,max)', unit: '°C', table: TEMP, allowZero: true },
    ]),
    when(mode === MODE_HEATSINK, [
      { key: 'Ta', label: 'Ortam sıcaklığı (T_A)', unit: '°C', table: TEMP, allowZero: true },
      // Bu modda sıfır bilinçli olarak geçersiz: heatsink() P > 0 istiyor
      // (termal bütçe P'ye bölünüyor), P = 0 sonuç üretmez.
      { key: 'P', label: 'Güç kaybı (P)', unitKey: 'Pu', table: POWER, min: 0 },
      { key: 'thetaJC', label: 'Junction–case direnci (θ_JC)', unit: '°C/W', table: THERMAL_R, min: 0, allowZero: true },
      { key: 'thetaCS', label: 'Case–soğutucu direnci (θ_CS)', unit: '°C/W', table: THERMAL_R, min: 0, allowZero: true },
      { key: 'TjMax', label: 'İzin verilen junction sıcaklığı (T_J,max)', unit: '°C', table: TEMP, allowZero: true },
      { key: 'thetaSA', label: 'Seçilen soğutucu direnci (θ_SA)', unit: '°C/W', table: THERMAL_R, min: 0, allowZero: true, optional: true },
    ]),
    when(mode === MODE_SURFACE, [
      { key: 'Tsurface', label: 'Ölçülen sıcaklık', unit: '°C', table: TEMP, allowZero: true },
      // junctionFromSurface de P >= 0 kabul ediyor; P = 0 iken T_J = ölçülen sıcaklık.
      { key: 'P', label: 'Güç kaybı (P)', unitKey: 'Pu', table: POWER, min: 0, allowZero: true },
      { key: 'psi', label: 'Ψ değeri', unit: '°C/W', table: THERMAL_R, min: 0, allowZero: true },
      { key: 'TjMax', label: 'İzin verilen junction sıcaklığı (T_J,max)', unit: '°C', table: TEMP, allowZero: true, optional: true },
    ]),
    when(f.copper === COPPER_ON, [
      { key: 'Lcu', label: 'Bakır şerit uzunluğu (L)', unitKey: 'Lcuu', table: DIM, min: 0 },
      { key: 'Wcu', label: 'Bakır şerit genişliği (W)', unitKey: 'Wcuu', table: DIM, min: 0 },
      { key: 'tcu', label: 'Bakır kalınlığı (t)', unitKey: 'tcuu', table: DIM, min: 0 },
      { key: 'Hdi', label: 'Dielektrik kalınlığı (H)', unitKey: 'Hdiu', table: DIM, min: 0 },
      { key: 'area', label: 'Dielektrik alanı (A)', unitKey: 'areau', table: SURF, min: 0 },
    ]),
  ])
}

// §8.6 — bakır şerit ve dielektrik iki paralel iletim yolu olarak birleşir.
// Yalnızca motor fonksiyonları çağrılır; burada denklem yazılmaz.
function copperNetwork(v, P) {
  const strip = copperStripResistance({ L: v.Lcu, W: v.Wcu, t: v.tcu })
  if (strip.error) return { error: strip.error }

  const diel = dielectricResistance({ H: v.Hdi, area: v.area })
  if (diel.error) return { error: diel.error }

  const eq = parallelThermalPaths([strip.Rth, diel.Rth])
  if (eq.error) return { error: eq.error }

  const rise = temperatureRise({ P, Rth: eq.Rth })
  if (rise.error) return { error: rise.error }

  return { strip, dielectric: diel, eq, rise }
}

export function compute(mode, f) {
  const read = readForm(f, formFields(mode, f))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const copperOn = f.copper === COPPER_ON

  let copper = null
  if (copperOn) {
    copper = copperNetwork(v, v.P)
    if (copper.error) return { ok: false, reason: REASON_ENGINE }
  }

  if (mode === MODE_JUNCTION) {
    // T_J,max ≤ T_A ise P_max = (T_J,max − T_A)/θ_JA negatif çıkar ve motor bunu
    // ayıklamaz. heatsink() aynı durumu geçersiz girdi sayıyor; burada da öyle
    // sayılır, negatif güç sonuç gibi sunulmaz.
    if (!(v.TjMax > v.Ta)) return { ok: false, reason: REASON_TJMAX_LE_TA }

    const j = junctionTemperature({ Ta: v.Ta, P: v.P, thetaJA: v.thetaJA, TjMax: v.TjMax })
    if (j.error) return { ok: false, reason: j.error }
    return { ok: true, mode, copperOn, copper, ...j }
  }

  if (mode === MODE_HEATSINK) {
    // Motorun opsiyonel θ_SA dalı `thetaSA >= 0` testiyle açılır; null bu testi
    // geçer ve toplamda sıfır gibi davranır. Alan boşken dal hiç açılmasın diye
    // sayı olmayan bir değer geçilir.
    const thetaSA = v.thetaSA == null ? NaN : v.thetaSA

    const h = heatsink({
      Ta: v.Ta, P: v.P, thetaJC: v.thetaJC, thetaCS: v.thetaCS, TjMax: v.TjMax, thetaSA,
    })
    if (h.error === THERMAL_ERR_INVALID) return { ok: false, reason: THERMAL_ERR_INVALID }

    // Motorun kullanıcıya dönük metnini taşımayız; kod yeterli, çeviri text.js'te.
    const { error, message, ...rest } = h
    return {
      ok: true, mode, copperOn, copper, ...rest,
      negativeSink: error === THERMAL_ERR_NEGATIVE_SINK,
      hasSink: Number.isFinite(rest.thetaSA),
    }
  }

  const s = junctionFromSurface({ Tsurface: v.Tsurface, P: v.P, psi: v.psi, metric: f.metric })
  if (s.error) return { ok: false, reason: s.error }

  const TjMax = v.TjMax ?? null
  return {
    ok: true, mode, copperOn, copper, ...s,
    TjMax,
    // Karşılaştırma; marj hesabı §8.5'te yok, uydurulmaz
    within: TjMax != null ? s.Tj <= TjMax : null,
  }
}

// Grafik: moda göre tarama. Her nokta yine motordan gelir.
export function buildSweep(r) {
  if (!r.ok) return null
  const steps = 61

  if (r.mode === MODE_JUNCTION) {
    const to = r.P * 2
    const rows = []
    for (let i = 0; i < steps; i++) {
      const P = (to * i) / (steps - 1)
      const e = junctionTemperature({ Ta: r.Ta, P, thetaJA: r.thetaJA })
      rows.push({ x: P, y: e.error ? NaN : e.Tj })
    }
    return {
      kind: MODE_JUNCTION,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      refs: Number.isFinite(r.TjMax) ? [{ key: 'tjmax', y: r.TjMax }] : [],
      marker: { x: r.P, y: r.Tj },
    }
  }

  if (r.mode === MODE_HEATSINK) {
    // θ_SA,max ≤ 0 iken motor erken döner ve hiçbir θ_SA için T_J üretmez;
    // tahmin uydurmak yerine grafik çizilmez.
    if (!r.feasible) return null

    // İşaret kullanıcının girdiği θ_SA'da durur. LineChart marker.y'yi y ekseni
    // sınırlarına katıyor ama marker.x'i x sınırlarına KATMIYOR; tarama işareti
    // kapsamazsa işaret çizim alanının dışına düşer. Üst sınır işareti içine
    // alacak şekilde genişletilir.
    const to = Math.max(r.thetaSAmax * 2, r.hasSink ? r.thetaSA * 1.2 : 0)
    const rows = []
    for (let i = 0; i < steps; i++) {
      const thetaSA = (to * i) / (steps - 1)
      const e = heatsink({
        Ta: r.Ta, P: r.P, thetaJC: r.thetaJC, thetaCS: r.thetaCS, TjMax: r.TjMax, thetaSA,
      })
      rows.push({ x: thetaSA, y: e.error ? NaN : e.Tj })
    }
    return {
      kind: MODE_HEATSINK,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      refs: [{ key: 'tjmax', y: r.TjMax }],
      // Soğutucu seçilmediyse işaret bütçenin bittiği noktayı gösterir
      marker: r.hasSink
        ? { x: r.thetaSA, y: r.Tj }
        : { x: r.thetaSAmax, y: r.TjMax },
    }
  }

  const to = r.P * 2
  const rows = []
  for (let i = 0; i < steps; i++) {
    const P = (to * i) / (steps - 1)
    const e = junctionFromSurface({ Tsurface: r.Tsurface, P, psi: r.psi, metric: r.metric })
    rows.push({ x: P, y: e.error ? NaN : e.Tj })
  }
  return {
    kind: MODE_SURFACE,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    refs: Number.isFinite(r.TjMax) ? [{ key: 'tjmax', y: r.TjMax }] : [],
    marker: { x: r.P, y: r.Tj },
  }
}
