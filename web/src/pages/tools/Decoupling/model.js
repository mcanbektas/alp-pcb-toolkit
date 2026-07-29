// Decoupling ağı ekranının hesap modeli (spec §8.2, §8.2.1, §8.2.2).
// Saf: React, DOM ve gösterim bilmez. Bütün hesap src/lib/pdn.js içindeki
// mevcut fonksiyonlardan gelir; burada denklem yazılmaz.

import { readForm, readRows, fieldsFor, when } from '../../../lib/fields'
import {
  CAPACITANCE, RESISTANCE, INDUCTANCE, CURRENT, TIME, VOLTAGE, FREQUENCY,
} from '../../../lib/units'
import {
  minimumCapacitance, capacitorImpedance, selfResonantFrequency,
  identicalBank, parallelNetworkImpedance,
  PDN_ERR_INVALID, PDN_ERR_SINGULAR,
} from '../../../lib/pdn'

// İki mod: minimum ideal kapasite (§8.2) ve kapasitör ağı (§8.2.1, §8.2.2)
export const MODE_MIN = 'min'
export const MODE_NETWORK = 'net'
export const MODES = [MODE_MIN, MODE_NETWORK]

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_ROWS = 'rows'
export const REASON_INVALID = PDN_ERR_INVALID
export const REASON_SINGULAR = PDN_ERR_SINGULAR

// Frekans taraması sınırları (Hz) — ekran tanımı, denklem değil
const F_FROM = 1e3
const F_TO = 1e9
const F_STEPS = 241

// Grafikte en fazla dört kapasitör satırı çizilir; fazlası caption'da bildirilir
export const MAX_SERIES = 4

export const INITIAL_FORM = {
  // Mod 1 — minimum ideal kapasite
  dI: '2', dIu: 'A',
  dT: '10', dTu: 'ns',
  dV: '50', dVu: 'mV',

  // Mod 2 — kapasitör ağı
  fEval: '100', fEvalu: 'MHz',
  caps: [
    { C: '10', Cu: 'µF', ESR: '5', ESRu: 'mΩ', ESL: '1.2', ESLu: 'nH', n: '1' },
    { C: '100', Cu: 'nF', ESR: '20', ESRu: 'mΩ', ESL: '0.8', ESLu: 'nH', n: '4' },
  ],
}

// RowList sütunları — başlık dizeleri ekranın text.js'inden gelir
export function capColumns(labels = {}) {
  return [
    { key: 'C', unitKey: 'Cu', label: labels.C ?? 'C', units: ['µF', 'nF', 'pF'] },
    { key: 'ESR', unitKey: 'ESRu', label: labels.ESR ?? 'ESR', units: ['mΩ', 'Ω'] },
    { key: 'ESL', unitKey: 'ESLu', label: labels.ESL ?? 'ESL', units: ['nH', 'pH'] },
    { key: 'n', label: labels.n ?? 'n', placeholder: '1' },
  ]
}

// ESR sıfır GİRİLEBİLİR: alan doğrulaması reddetmez, motor PDN_ERR_SINGULAR
// döndürür ve kullanıcıya nedeni ayrıca anlatılır (kayıpsız kapasitör
// rezonansta sıfır empedans verir).
function capSpecs(labels = {}) {
  return [
    { key: 'C', label: labels.C ?? 'C', unitKey: 'Cu', table: CAPACITANCE, min: 0 },
    { key: 'ESR', label: labels.ESR ?? 'ESR', unitKey: 'ESRu', table: RESISTANCE, min: 0, allowZero: true },
    { key: 'ESL', label: labels.ESL ?? 'ESL', unitKey: 'ESLu', table: INDUCTANCE, min: 0, allowZero: true },
    { key: 'n', label: labels.n ?? 'n', min: 1 },
  ]
}

export function formFields(mode, labels = {}) {
  const L = (key) => labels[key] ?? key

  return fieldsFor([
    when(mode === MODE_MIN, [
      { key: 'dI', label: L('dI'), unitKey: 'dIu', table: CURRENT, min: 0 },
      { key: 'dT', label: L('dT'), unitKey: 'dTu', table: TIME, min: 0 },
      { key: 'dV', label: L('dV'), unitKey: 'dVu', table: VOLTAGE, min: 0 },
    ]),
    when(mode === MODE_NETWORK, [
      { key: 'fEval', label: L('fEval'), unitKey: 'fEvalu', table: FREQUENCY, min: 0 },
    ]),
  ])
}

export function compute(mode, f, labels = {}) {
  return mode === MODE_MIN ? computeMin(f, labels) : computeNetwork(f, labels)
}

// --- Mod 1: minimum ideal kapasite (§8.2) ---

function computeMin(f, labels = {}) {
  const read = readForm(f, formFields(MODE_MIN, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const m = minimumCapacitance({ deltaI: v.dI, deltaT: v.dT, deltaV: v.dV })
  if (m.error) return { ok: false, reason: m.error }

  // Grafik: izin verilen ΔV değiştikçe gereken minimum kapasite
  const sweep = []
  const from = v.dV / 5
  const to = v.dV * 5
  const a = Math.log10(from)
  const b = Math.log10(to)
  for (let i = 0; i < 70; i++) {
    const dV = Math.pow(10, a + ((b - a) * i) / 69)
    const s = minimumCapacitance({ deltaI: v.dI, deltaT: v.dT, deltaV: dV })
    sweep.push({ x: dV, y: s.error ? NaN : s.C })
  }

  return { ok: true, mode: MODE_MIN, ...m, sweep }
}

// --- Mod 2: kapasitör ağı (§8.2.1, §8.2.2) ---

function computeNetwork(f, labels = {}) {
  const read = readForm(f, formFields(MODE_NETWORK, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const rows = readRows(f.caps, capSpecs(labels), labels.rowLabel ?? 'row')
  if (rows.ambiguous.length) return { ok: false, ambiguous: rows.ambiguous }
  if (!rows.ok) return { ok: false, reason: REASON_ROWS, invalid: rows.invalid }

  const fEval = read.values.fEval
  const caps = rows.rows.map((x) => ({ C: x.C, ESR: x.ESR, ESL: x.ESL, count: x.n }))

  const net = parallelNetworkImpedance(caps, fEval)
  if (net.error) return { ok: false, reason: net.error }

  // Satır başına: tekil empedans, tekil SRF, N adet için eşdeğerler ve
  // eşdeğerlerin empedansı. Hepsi motor fonksiyonlarından gelir.
  const items = caps.map((c) => {
    const single = capacitorImpedance({ C: c.C, ESR: c.ESR, ESL: c.ESL, f: fEval })
    const srf = selfResonantFrequency({ C: c.C, ESL: c.ESL })
    const bank = identicalBank({ C: c.C, ESR: c.ESR, ESL: c.ESL, count: c.count })
    const group = bank.error
      ? null
      : capacitorImpedance({ C: bank.Ceq, ESR: bank.ESReq, ESL: bank.ESLeq, f: fEval })
    return {
      C: c.C, ESR: c.ESR, ESL: c.ESL, count: c.count,
      single: single.error ? null : single,
      srf: srf.error ? null : srf.srf,
      bank: bank.error ? null : bank,
      group: group && !group.error ? group : null,
    }
  })

  // Frekans taraması: ağ toplamı + her satırın (N adetli) eğrisi
  const sweep = []
  const a = Math.log10(F_FROM)
  const b = Math.log10(F_TO)
  for (let i = 0; i < F_STEPS; i++) {
    const fx = Math.pow(10, a + ((b - a) * i) / (F_STEPS - 1))
    const z = parallelNetworkImpedance(caps, fx)
    const per = items.map((it) => {
      if (!it.bank) return NaN
      const g = capacitorImpedance({ C: it.bank.Ceq, ESR: it.bank.ESReq, ESL: it.bank.ESLeq, f: fx })
      return g.error ? NaN : g.mag
    })
    sweep.push({ x: fx, y: z.error ? NaN : z.mag, per })
  }

  // Anti-rezonans: taramadaki yerel tepe noktaları. Tek tip kapasitörde tepe
  // yoktur; farklı değerli kapasitörler paralelken biri endüktif diğeri
  // kapasitifken paralel rezonans oluşur ve empedans tepe yapar.
  let peak = null
  let peakCount = 0
  for (let i = 1; i < sweep.length - 1; i++) {
    const p = sweep[i]
    if (!Number.isFinite(p.y)) continue
    if (p.y > sweep[i - 1].y && p.y > sweep[i + 1].y) {
      peakCount += 1
      if (!peak || p.y > peak.mag) peak = { f: p.x, mag: p.y, index: i }
    }
  }

  // Tepe, tek tek kapasitörlerin o frekanstaki empedansından yüksek mi
  let peakWorstSingle = null
  if (peak) {
    const per = sweep[peak.index].per.filter((x) => Number.isFinite(x))
    peakWorstSingle = per.length ? Math.max(...per) : null
  }

  return {
    ok: true,
    mode: MODE_NETWORK,
    f: fEval,
    mag: net.mag, re: net.re, im: net.im,
    count: net.count,
    idealSharing: net.idealSharing,
    // Reaktans pozitifse ağ bu frekansta endüktif davranır
    inductive: net.im > 0,
    aboveCount: items.filter((it) => it.single?.aboveSrf).length,
    noEslCount: items.filter((it) => it.srf == null).length,
    items,
    sweep,
    peak,
    peakCount,
    peakWorstSingle,
    peakAbove: peak != null && peakWorstSingle != null && peak.mag > peakWorstSingle,
  }
}

// Logaritmik y ekseni: LineChart y'yi doğrusal ölçekler, empedans ise altı
// dekat değişir. Model log10 değerini üretir, gösterim tarafı 10^y ile geri
// çevirip birimli yazar — böylece anti-rezonans tepesi grafikte görünür kalır.
function log10safe(v) {
  return Number.isFinite(v) && v > 0 ? Math.log10(v) : NaN
}

export function buildSweep(r) {
  if (!r.ok || !r.sweep?.length) return null

  if (r.mode === MODE_MIN) {
    // x ekseni SI (V) olarak bırakılır. Hangi birimde çizileceği gösterim
    // kararıdır; çevrimi gösterim tarafı units.js tablosuyla yapar.
    return {
      kind: MODE_MIN,
      logY: false,
      rows: r.sweep,
      points: r.sweep.map((p) => [p.x, p.y]),
      series: [],
      refs: [{ key: 'cmin', y: r.C }],
      marker: { x: r.deltaV, y: r.C },
      hidden: 0,
    }
  }

  const shown = Math.min(r.items.length, MAX_SERIES)
  const series = []
  for (let i = 0; i < shown; i++) {
    series.push({
      index: i,
      count: r.items[i].count,
      C: r.items[i].C,
      points: r.sweep.map((p) => [p.x, log10safe(p.per[i])]),
    })
  }

  return {
    kind: MODE_NETWORK,
    logY: true,
    rows: r.sweep,
    points: r.sweep.map((p) => [p.x, log10safe(p.y)]),
    series,
    refs: r.peak ? [{ key: 'peak', y: log10safe(r.peak.mag) }] : [],
    marker: { x: r.f, y: log10safe(r.mag) },
    hidden: r.items.length - shown,
  }
}
