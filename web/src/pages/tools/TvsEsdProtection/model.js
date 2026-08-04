// TVS ve ESD Koruma Boyutlandırıcısı ekranının hesap modeli (REV2 §14).
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, lib/tvsEsd.js motorunu çağırır, sonucu ve hata nedenini
// döner. Kullanıcıya gösterilecek metin text.js içindedir.
//
// Motor (tvsEsd.js) BİLİNÇLİ OLARAK lib/solve.js kullanmıyor — kendi
// sınırlandırılmış bisection çözücüsünü yazdı (solveTvsPulseCurrentBisection).
// Gerekçe motor dosyasında yorumla belgeli (kararlar §3.2, REV2 §14.5); burada
// DEĞİŞTİRİLMEZ, yalnızca çağrılır. Bu ekran motora hiçbir zaman doğrusal
// olmayan bir `clampVoltage` fonksiyonu vermez — R_dyn her zaman doğrudan
// girilir ya da datasheet iki noktasından (dynamicResistance) türetilir; motor
// yine de dahili olarak R_source+R_series+R_dyn ≤ 0 durumunda sayısal yola
// düşebilir (REV2 §14.5.2), bu yol ekranda "Sayısal (bisection)" etiketiyle
// şeffaf gösterilir.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { VOLTAGE, RESISTANCE, CURRENT, TIME, INDUCTANCE, CAPACITANCE } from '../../../lib/units'
import {
  tvsEsdProtectionPlan, solveTvsPulseCurrent, dynamicResistance,
  clampVoltageLinear, pathInductanceOvershoot, capacitanceCutoffFrequency,
  TVS_ERR_NO_CONVERGENCE,
  TVS_WAVEFORM_RECTANGULAR, TVS_WAVEFORM_TRIANGULAR, TVS_WAVEFORM_CUSTOM,
} from '../../../lib/tvsEsd'
import { logspace } from '../../../lib/sweep'

export { TVS_WAVEFORM_RECTANGULAR, TVS_WAVEFORM_TRIANGULAR, TVS_WAVEFORM_CUSTOM }

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_INVALID = 'invalid'
export const REASON_NO_CONVERGENCE = 'no-convergence'

export const RDYN_MODE_DIRECT = 'direct'
export const RDYN_MODE_DATASHEET = 'datasheet'
export const RDYN_MODES = [RDYN_MODE_DIRECT, RDYN_MODE_DATASHEET]

export const WAVEFORMS = [TVS_WAVEFORM_RECTANGULAR, TVS_WAVEFORM_TRIANGULAR, TVS_WAVEFORM_CUSTOM]

export const SWEEP_RSOURCE = 'rSource'
export const SWEEP_CLAMP_CURVE = 'clampCurve'
export const SWEEP_OVERSHOOT = 'overshoot'
export const SWEEP_CAPACITANCE = 'capacitance'
export const SWEEP_PARAMS = [SWEEP_RSOURCE, SWEEP_CLAMP_CURVE, SWEEP_OVERSHOOT, SWEEP_CAPACITANCE]

// Birimsiz alan ve özel di/dt tablosu için ekrana özgü tablolar —
// ReturnPathStitchingVia'daki PLAIN/COUNT ile aynı desen: her ekran kendi
// kopyasını tutar.
const PLAIN = { '': 1 }
// A/s temel SI birimi; ESD/surge datasheet'leri genelde A/ns ya da A/µs verir.
const DIDT = { 'A/s': 1, 'A/µs': 1e6, 'A/ns': 1e9 }

export const DIDT_UNITS = ['A/ns', 'A/µs', 'A/s']

export const INITIAL_FORM = {
  vSurge: '100', vSurgeu: 'V',
  rSource: '2', rSourceu: 'Ω',
  rSeries: '0', rSeriesu: 'Ω',
  vBR: '33', vBRu: 'V',
  iT: '0', iTu: 'A',

  vNormalMax: '', vNormalMaxu: 'V',
  vRWM: '', vRWMu: 'V',
  vProtectedMax: '', vProtectedMaxu: 'V',

  rDynMode: RDYN_MODE_DIRECT,
  rDyn: '0', rDynu: 'Ω',
  vCDatasheet: '', vCDatasheetu: 'V',
  iPPDatasheet: '', iPPDatasheetu: 'A',

  hasEnergy: false,
  tp: '', tpu: 'µs',
  waveform: TVS_WAVEFORM_RECTANGULAR,
  kw: '',

  hasOvershoot: false,
  lPath: '', lPathu: 'nH',
  didt: '', didtu: 'A/ns',

  hasCapacitance: false,
  cTvs: '', cTvsu: 'pF',
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'vSurge', label: L('vSurge'), unitKey: 'vSurgeu', table: VOLTAGE, min: 0 },
      { key: 'rSource', label: L('rSource'), unitKey: 'rSourceu', table: RESISTANCE, min: 0, allowZero: true },
      {
        key: 'rSeries', label: L('rSeries'), unitKey: 'rSeriesu', table: RESISTANCE,
        min: 0, optional: true, allowZero: true,
      },
      { key: 'vBR', label: L('vBR'), unitKey: 'vBRu', table: VOLTAGE, min: 0 },
      { key: 'iT', label: L('iT'), unitKey: 'iTu', table: CURRENT, min: 0, optional: true, allowZero: true },
    ],
    [
      { key: 'vNormalMax', label: L('vNormalMax'), unitKey: 'vNormalMaxu', table: VOLTAGE, min: 0, optional: true },
      { key: 'vRWM', label: L('vRWM'), unitKey: 'vRWMu', table: VOLTAGE, min: 0, optional: true },
      {
        key: 'vProtectedMax', label: L('vProtectedMax'), unitKey: 'vProtectedMaxu',
        table: VOLTAGE, min: 0, optional: true,
      },
    ],
    when(f.rDynMode === RDYN_MODE_DIRECT, [
      { key: 'rDyn', label: L('rDyn'), unitKey: 'rDynu', table: RESISTANCE, min: 0, optional: true, allowZero: true },
    ]),
    when(f.rDynMode === RDYN_MODE_DATASHEET, [
      { key: 'vCDatasheet', label: L('vCDatasheet'), unitKey: 'vCDatasheetu', table: VOLTAGE, min: 0 },
      { key: 'iPPDatasheet', label: L('iPPDatasheet'), unitKey: 'iPPDatasheetu', table: CURRENT, min: 0 },
    ]),
    when(f.hasEnergy, [
      { key: 'tp', label: L('tp'), unitKey: 'tpu', table: TIME, min: 0 },
    ]),
    when(f.hasEnergy && f.waveform === TVS_WAVEFORM_CUSTOM, [
      { key: 'kw', label: L('kw'), unit: '', table: PLAIN, min: 0 },
    ]),
    when(f.hasOvershoot, [
      { key: 'lPath', label: L('lPath'), unitKey: 'lPathu', table: INDUCTANCE, min: 0 },
      { key: 'didt', label: L('didt'), unitKey: 'didtu', table: DIDT, min: 0 },
    ]),
    when(f.hasCapacitance, [
      { key: 'cTvs', label: L('cTvs'), unitKey: 'cTvsu', table: CAPACITANCE, min: 0 },
    ]),
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const iT = v.iT ?? 0

  // REV2 §14.5: datasheet iki noktası verildiyse R_dyn buradan türetilir —
  // motorun kendisinin de kullandığı aynı dynamicResistance() fonksiyonu ile
  // (bkz. lib/tvsEsd.js). Doğrudan girildiyse aynen kullanılır.
  const rDyn = f.rDynMode === RDYN_MODE_DATASHEET
    ? dynamicResistance({ vC: v.vCDatasheet, vBR: v.vBR, iPP: v.iPPDatasheet, iT })
    : (v.rDyn ?? 0)

  const plan = tvsEsdProtectionPlan({
    vSurge: v.vSurge,
    rSource: v.rSource,
    rSeries: v.rSeries ?? 0,
    vBR: v.vBR,
    rDyn,
    iT,
    tp: f.hasEnergy ? v.tp : null,
    waveform: f.hasEnergy ? f.waveform : TVS_WAVEFORM_RECTANGULAR,
    kw: f.hasEnergy && f.waveform === TVS_WAVEFORM_CUSTOM ? v.kw : null,
    lPath: f.hasOvershoot ? v.lPath : null,
    didt: f.hasOvershoot ? v.didt : null,
    cTvs: f.hasCapacitance ? v.cTvs : null,
  })

  // Motorun kendi hata alanı ÜST DÜZEYDİR (`{ error: CODE }`, `ok` alanı hiç
  // yok) — kararlar §3.2 / REV2 §14.5.3. Ekran bunu standart geçersiz-sonuç
  // yoluna (ResultPanel → reason) çevirir; TVS_SOLVER_NO_CONVERGENCE kendi
  // `reason` koduyla ayrı tutulur ki text.js'te ayrı, açıklayıcı bir mesaj
  // yazılabilsin (genel "eksik alan" mesajıyla karıştırılmasın).
  if (plan.error === TVS_ERR_NO_CONVERGENCE) return { ok: false, reason: REASON_NO_CONVERGENCE }
  if (plan.error) return { ok: false, reason: REASON_INVALID }

  return {
    ok: true,
    vSurge: v.vSurge,
    rSource: v.rSource,
    rSeries: v.rSeries ?? 0,
    vBR: v.vBR,
    iT,
    rDyn,
    rDynMode: f.rDynMode,
    vNormalMax: v.vNormalMax ?? null,
    vRWM: v.vRWM ?? null,
    vProtectedMax: v.vProtectedMax ?? null,
    hasEnergy: f.hasEnergy,
    waveform: f.waveform,
    hasOvershoot: f.hasOvershoot,
    lPath: f.hasOvershoot ? v.lPath : null,
    didt: f.hasOvershoot ? v.didt : null,
    hasCapacitance: f.hasCapacitance,
    cTvs: f.hasCapacitance ? v.cTvs : null,
    ...plan,
  }
}

// Grafik: REV2 §14.11'deki dört grafiğin her biri ayrı bir taranan parametre.
// Overshoot/capacitance taraması yalnızca ilgili opsiyonel blok etkinse veri
// döner; değilse null — ekran bunu "grafik için geçerli girdi gerekli"
// notuyla gösterir (ReturnPathStitchingVia'daki kondansatör taramasıyla aynı
// desen).
export function buildSweep(r, param) {
  if (!r.ok) return null

  if (param === SWEEP_RSOURCE) {
    const rows = rSourceSweep(r)
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.rSource, y: r.solver.current },
    }
  }

  if (param === SWEEP_CLAMP_CURVE) {
    const rows = clampCurveSweep(r)
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.solver.current, y: r.vClamp },
    }
  }

  if (param === SWEEP_OVERSHOOT) {
    if (!r.overshoot) return null
    const rows = overshootSweep(r)
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.lPath, y: r.overshoot.vL },
    }
  }

  if (r.capacitanceCutoffHz == null) return null
  const rows = capacitanceSweep(r)
  return {
    param: SWEEP_CAPACITANCE,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: { x: r.cTvs, y: r.capacitanceCutoffHz },
  }
}

function rSourceSweep(r) {
  const center = Math.max(r.rSource, 1e-3)
  const { values } = logspace(center / 20, center * 20, 120)
  if (!values) return []
  return values.map((rSource) => {
    const solved = solveTvsPulseCurrent({
      vSurge: r.vSurge, rSource, rSeries: r.rSeries, vBR: r.vBR, rDyn: r.rDyn, iT: r.iT,
    })
    return { x: rSource, y: solved.current ?? 0 }
  })
}

function clampCurveSweep(r) {
  const iMax = Math.max(r.solver.current * 1.5, r.iT * 1.5, 1e-6)
  const n = 120
  const rows = []
  for (let k = 0; k < n; k++) {
    const current = (iMax * k) / (n - 1)
    rows.push({ x: current, y: clampVoltageLinear({ vBR: r.vBR, rDyn: r.rDyn, iT: r.iT, current }) })
  }
  return rows
}

function overshootSweep(r) {
  const center = Math.max(r.lPath, 1e-12)
  const { values } = logspace(center / 100, center * 100, 120)
  if (!values) return []
  return values.map((lPath) => ({ x: lPath, y: pathInductanceOvershoot({ lPath, didt: r.didt }) }))
}

function capacitanceSweep(r) {
  const center = Math.max(r.cTvs, 1e-15)
  const { values } = logspace(center / 100, center * 100, 120)
  if (!values) return []
  return values.map((cTvs) => ({ x: cTvs, y: capacitanceCutoffFrequency({ rSource: r.rSource, cTvs }) }))
}
