// LED, Ohm kanunu ve RLC ekranının hesap modeli (spec §9.4, §9.5, §9.8, §9.9).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import {
  RESISTANCE, VOLTAGE, CURRENT, POWER, CAPACITANCE, INDUCTANCE, FREQUENCY,
} from '../../../lib/units'
import { ohmsLaw, seriesResistance, parallelResistance } from '../../../lib/ohm'
import { ledResistor, LED_ERR_HEADROOM } from '../../../lib/led'
import { seriesRLC } from '../../../lib/reactance'
import { nearestValue } from '../../../lib/eseries'
import { solveBounded } from '../../../lib/solve'

export const TOOL_OHM = 'ohm'
export const TOOL_LED = 'led'
export const TOOL_RLC = 'rlc'
export const TOOL_COMBO = 'combo'
export const TOOLS = [TOOL_OHM, TOOL_LED, TOOL_RLC, TOOL_COMBO]

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

// Analiz/sentez ayrımı yalnızca bu araçlarda anlamlıdır
export const HAS_MODES = { [TOOL_RLC]: true }

export const COMBO_SERIES = 'series'
export const COMBO_PARALLEL = 'parallel'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_OHM_INSUFFICIENT = 'ohm-insufficient'
export const REASON_LED_HEADROOM = 'led-headroom'
export const REASON_NO_SOLUTION = 'no-solution'

export const INITIAL_FORM = {
  tool: TOOL_OHM,

  // Ohm kanunu — boş bırakılan alanlar hesaplanır
  V: '5', Vu: 'V',
  I: '', Iu: 'mA',
  R: '220', Ru: 'Ω',
  P: '', Pu: 'mW',

  // LED
  Vs: '5', Vsu: 'V',
  Vf: '2.1', Vfu: 'V',
  n: '1',
  Iled: '20', Iledu: 'mA',
  derating: '50',

  // RLC
  Rr: '10', Rru: 'Ω',
  L: '1', Lu: 'µH',
  C: '1', Cu: 'nF',
  freq: '5', frequ: 'MHz',
  targetF0: '5', targetF0u: 'MHz',

  // Seri / paralel
  combo: COMBO_PARALLEL,
  values: '10k, 22k, 47k',
}

const PCT = { '%': 1 }
const COUNT = { adet: 1 }

export function formFields(tool, mode, f) {
  return fieldsFor([
    when(tool === TOOL_OHM, [
      { key: 'V', label: 'Gerilim (V)', unitKey: 'Vu', table: VOLTAGE, min: 0, optional: true },
      { key: 'I', label: 'Akım (I)', unitKey: 'Iu', table: CURRENT, min: 0, optional: true },
      { key: 'R', label: 'Direnç (R)', unitKey: 'Ru', table: RESISTANCE, min: 0, optional: true },
      { key: 'P', label: 'Güç (P)', unitKey: 'Pu', table: POWER, min: 0, optional: true },
    ]),

    when(tool === TOOL_LED, [
      { key: 'Vs', label: 'Besleme gerilimi (V_s)', unitKey: 'Vsu', table: VOLTAGE, min: 0 },
      { key: 'Vf', label: 'LED ileri gerilimi (V_f)', unitKey: 'Vfu', table: VOLTAGE, min: 0 },
      { key: 'n', label: 'Seri LED sayısı', unit: 'adet', table: COUNT, min: 1 },
      { key: 'Iled', label: 'LED akımı', unitKey: 'Iledu', table: CURRENT, min: 0 },
      { key: 'derating', label: 'Güç kullanım oranı', unit: '%', table: PCT, min: 0 },
    ]),

    when(tool === TOOL_RLC, [
      { key: 'Rr', label: 'Direnç (R)', unitKey: 'Rru', table: RESISTANCE, min: 0, allowZero: true },
      { key: 'L', label: 'Endüktans (L)', unitKey: 'Lu', table: INDUCTANCE, min: 0 },
    ]),
    when(tool === TOOL_RLC && mode === MODE_ANALYSIS, [
      { key: 'C', label: 'Kapasite (C)', unitKey: 'Cu', table: CAPACITANCE, min: 0 },
      { key: 'freq', label: 'Frekans (f)', unitKey: 'frequ', table: FREQUENCY, min: 0 },
    ]),
    when(tool === TOOL_RLC && mode === MODE_SYNTHESIS, [
      { key: 'targetF0', label: 'Hedef rezonans frekansı', unitKey: 'targetF0u', table: FREQUENCY, min: 0 },
    ]),
  ])
}

// "10k, 22k, 4.7M" gibi bir listeyi ohm dizisine çevirir.
// Ayrıştırma burada yapılır çünkü sonuç sayısaldır; hata kodu döner, metin değil.
export function parseValueList(text) {
  const parts = String(text).split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)
  if (parts.length === 0) return { error: 'empty' }

  const out = []
  for (const part of parts) {
    const m = part.match(/^(-?[\d.,]+)\s*([kKmMgG])?$/)
    if (!m) return { error: 'invalid', at: part }

    // Ondalık ayracı olarak virgül de kabul edilir; liste ayracı zaten virgüldür,
    // bu yüzden ayrıştırma parçalara bölündükten sonra yapılır.
    const n = parseFloat(m[1].replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) return { error: 'invalid', at: part }

    const scale = { k: 1e3, K: 1e3, m: 1e6, M: 1e6, g: 1e9, G: 1e9 }[m[2]] ?? 1
    out.push(n * scale)
  }
  return { values: out }
}

function computeOhm(v) {
  const r = ohmsLaw({ V: v.V, I: v.I, R: v.R, P: v.P })
  if (r.error) return { ok: false, reason: REASON_OHM_INSUFFICIENT }
  return { ok: true, tool: TOOL_OHM, ...r }
}

function computeLed(v) {
  const r = ledResistor({
    Vs: v.Vs, Vf: v.Vf, n: v.n, I: v.Iled, derating: v.derating / 100,
  })
  if (r.error === LED_ERR_HEADROOM) {
    return { ok: false, reason: REASON_LED_HEADROOM, Vled: r.Vled, Vs: r.Vs }
  }
  if (r.error) return { ok: false, reason: REASON_INCOMPLETE }

  // Standart dirençle gerçekleşen akım — ideal R çoğu zaman stokta yoktur
  const e24 = nearestValue(r.R, 'E24')
  const e96 = nearestValue(r.R, 'E96')
  const actual = (R) => (v.Vs - r.Vled) / R

  return {
    ok: true, tool: TOOL_LED, ...r,
    Vs: v.Vs, n: v.n, targetI: v.Iled,
    e24: { ...e24, I: actual(e24.value), P: actual(e24.value) ** 2 * e24.value },
    e96: { ...e96, I: actual(e96.value), P: actual(e96.value) ** 2 * e96.value },
  }
}

function computeRlc(mode, v) {
  if (mode === MODE_SYNTHESIS) {
    // f₀ = 1/(2π√(LC)) → C = 1/(L·(2πf₀)²). Kapalı çözüm var, yine de sonuç
    // sınırlandırılmış kök aramayla doğrulanır: L veya f₀ uçlarda ise kapalı
    // form sessizce fiziksel olmayan bir değer üretebilir.
    const w0 = 2 * Math.PI * v.targetF0
    const Cclosed = 1 / (v.L * w0 * w0)
    const F = (C) => 1 / (2 * Math.PI * Math.sqrt(v.L * C)) - v.targetF0
    const solved = solveBounded(F, { x0: Cclosed, min: 1e-18, max: 1 })
    if (solved.error) return { ok: false, reason: REASON_NO_SOLUTION }

    const C = solved.value
    const at = seriesRLC({ R: v.Rr, L: v.L, C, f: v.targetF0 })
    return {
      ok: true, tool: TOOL_RLC, mode,
      R: v.Rr, L: v.L, C, f: v.targetF0,
      targetF0: v.targetF0,
      solvedBy: solved.method,
      nearestC: nearestValue(C * 1e12, 'E24'), // pF cinsinden standart değer
      ...at,
    }
  }

  const at = seriesRLC({ R: v.Rr, L: v.L, C: v.C, f: v.freq })
  if (at.error) return { ok: false, reason: REASON_INCOMPLETE }
  return { ok: true, tool: TOOL_RLC, mode, R: v.Rr, L: v.L, C: v.C, f: v.freq, ...at }
}

function computeCombo(f) {
  const parsed = parseValueList(f.values)
  if (parsed.error) return { ok: false, reason: REASON_INCOMPLETE, at: parsed.at }

  const values = parsed.values
  const equivalent = f.combo === COMBO_SERIES
    ? seriesResistance(values)
    : parallelResistance(values)

  // Paralelde akım payları iletkenlikle orantılıdır
  const totalG = values.reduce((a, x) => a + (x === 0 ? Infinity : 1 / x), 0)
  const shares = values.map((x) => (f.combo === COMBO_PARALLEL ? (x === 0 ? 1 : 1 / x / totalG) : x / seriesResistance(values)))

  return {
    ok: true, tool: TOOL_COMBO,
    combo: f.combo, values, equivalent, shares,
    nearestE24: nearestValue(equivalent, 'E24'),
  }
}

export function compute(tool, mode, f) {
  const read = readForm(f, formFields(tool, mode, f))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok && tool !== TOOL_COMBO) {
    return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }
  }

  const v = read.values
  if (tool === TOOL_OHM) return computeOhm(v)
  if (tool === TOOL_LED) return computeLed(v)
  if (tool === TOOL_RLC) return computeRlc(mode, v)
  return computeCombo(f)
}

// --- Parametrik grafikler ---

function logSweep(from, to, steps, fn) {
  const rows = []
  const a = Math.log10(from)
  const b = Math.log10(to)
  for (let i = 0; i < steps; i++) {
    const x = Math.pow(10, a + ((b - a) * i) / (steps - 1))
    rows.push({ x, y: fn(x) })
  }
  return rows
}

export function buildSweep(r) {
  if (!r.ok) return null

  if (r.tool === TOOL_OHM) {
    if (!(r.V > 0) || !(r.R > 0)) return null
    // Sabit gerilimde direnç değiştikçe harcanan güç
    const rows = logSweep(r.R / 100, r.R * 100, 70, (R) => (r.V * r.V) / R)
    return {
      kind: TOOL_OHM,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.R, y: r.P },
      refs: [],
    }
  }

  if (r.tool === TOOL_LED) {
    if (!(r.R > 0)) return null
    // Seri direnç değiştikçe LED akımı
    const rows = logSweep(r.R / 20, r.R * 20, 70, (R) => (r.Vs - r.Vled) / R)
    return {
      kind: TOOL_LED,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.R, y: r.targetI },
      refs: [{ key: 'target', y: r.targetI }],
    }
  }

  if (r.tool === TOOL_RLC) {
    if (!(r.f0 > 0)) return null
    // Frekansa göre empedans büyüklüğü — rezonans çukuru burada görünür
    const rows = logSweep(r.f0 / 100, r.f0 * 100, 90, (f) => {
      const z = seriesRLC({ R: r.R, L: r.L, C: r.C, f })
      return z.error ? NaN : z.magnitude
    })
    return {
      kind: TOOL_RLC,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.f, y: r.magnitude },
      refs: [{ key: 'esr', y: r.R }],
      f0: r.f0,
    }
  }

  // Seri/paralel birleşimin taranacak sürekli bir parametresi yok
  return null
}
