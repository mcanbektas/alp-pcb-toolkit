// RC/RL zaman sabiti ve kristal yük kapasitesi ekranının hesap modeli
// (spec §9.10, §9.11). Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { RESISTANCE, CAPACITANCE, INDUCTANCE, TIME, VOLTAGE, FREQUENCY } from '../../../lib/units'
import { rcTime, rlTime, chargeVoltage, dischargeVoltage, risingCurrent } from '../../../lib/timing'
import { crystalLoad, crystalCapsForLoad, CRYSTAL_ERR_STRAY, CRYSTAL_ERR_PIN } from '../../../lib/crystal'
import { nearestValue } from '../../../lib/eseries'
import { solveBounded } from '../../../lib/solve'

export const TOOL_RC = 'rc'
export const TOOL_RL = 'rl'
export const TOOL_CRYSTAL = 'crystal'
export const TOOLS = [TOOL_RC, TOOL_RL, TOOL_CRYSTAL]

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_NO_SOLUTION = 'no-solution'
export const REASON_STRAY = CRYSTAL_ERR_STRAY
export const REASON_PIN = CRYSTAL_ERR_PIN

export const INITIAL_FORM = {
  tool: TOOL_RC,

  R: '10', Ru: 'kΩ',
  C: '100', Cu: 'nF',
  L: '10', Lu: 'mH',
  Vs: '3.3', Vsu: 'V',
  targetTau: '1', targetTauu: 'ms',

  // Kristal — kapasiteler pF cinsinden tutulur
  CL: '12',
  C1: '18', C2: '18',
  Cin: '0', Cout: '0',
  Cstray: '3',
  fXtal: '8', fXtalu: 'MHz',
}

const PF = { pF: 1 } // kristal hesabı kendi içinde pF ile tutarlı

export function formFields(tool, mode, f) { // eslint-disable-line no-unused-vars
  return fieldsFor([
    when(tool === TOOL_RC, [
      { key: 'R', label: 'Direnç (R)', unitKey: 'Ru', table: RESISTANCE, min: 0 },
      { key: 'Vs', label: 'Besleme gerilimi', unitKey: 'Vsu', table: VOLTAGE, min: 0 },
    ]),
    when(tool === TOOL_RC && mode === MODE_ANALYSIS, [
      { key: 'C', label: 'Kapasite (C)', unitKey: 'Cu', table: CAPACITANCE, min: 0 },
    ]),

    when(tool === TOOL_RL, [
      { key: 'R', label: 'Direnç (R)', unitKey: 'Ru', table: RESISTANCE, min: 0 },
      { key: 'Vs', label: 'Besleme gerilimi', unitKey: 'Vsu', table: VOLTAGE, min: 0 },
    ]),
    when(tool === TOOL_RL && mode === MODE_ANALYSIS, [
      { key: 'L', label: 'Endüktans (L)', unitKey: 'Lu', table: INDUCTANCE, min: 0 },
    ]),

    when((tool === TOOL_RC || tool === TOOL_RL) && mode === MODE_SYNTHESIS, [
      { key: 'targetTau', label: 'Hedef zaman sabiti', unitKey: 'targetTauu', table: TIME, min: 0 },
    ]),

    when(tool === TOOL_CRYSTAL, [
      { key: 'Cstray', label: 'PCB parazitik kapasitesi', unit: 'pF', table: PF, min: 0, allowZero: true },
      { key: 'Cin', label: 'MCU giriş kapasitesi', unit: 'pF', table: PF, min: 0, allowZero: true },
      { key: 'Cout', label: 'MCU çıkış kapasitesi', unit: 'pF', table: PF, min: 0, allowZero: true },
      { key: 'fXtal', label: 'Kristal frekansı', unitKey: 'fXtalu', table: FREQUENCY, min: 0, optional: true },
    ]),
    when(tool === TOOL_CRYSTAL && mode === MODE_ANALYSIS, [
      { key: 'C1', label: 'C1', unit: 'pF', table: PF, min: 0 },
      { key: 'C2', label: 'C2', unit: 'pF', table: PF, min: 0 },
    ]),
    when(tool === TOOL_CRYSTAL && mode === MODE_SYNTHESIS, [
      { key: 'CL', label: 'Kristal yük kapasitesi (C_L)', unit: 'pF', table: PF, min: 0 },
    ]),
  ])
}

function timingResult(base, v, tool) {
  const tau = base.tau
  const Vs = v.Vs

  return {
    ok: true, tool,
    tau,
    steps: base.t,
    riseTime1090: base.riseTime1090,
    Vs,
    R: v.R,
    // Sürekli rejim akımı — RL'de bobinden geçen son akım, RC'de dirençten geçen tepe akım
    Ifinal: Vs / v.R,
    // 1τ'da ulaşılan değerler
    atTau: tool === TOOL_RC ? chargeVoltage(Vs, tau, tau) : risingCurrent(Vs, v.R, tau, tau),
  }
}

function computeRc(mode, v) {
  if (mode === MODE_SYNTHESIS) {
    // τ = RC → C = τ/R. Kapalı çözüm var; sonuç yine sınırlandırılmış aramayla
    // doğrulanır, böylece uç değerlerde fiziksel olmayan sonuç geçmez.
    const F = (C) => v.R * C - v.targetTau
    const solved = solveBounded(F, { x0: v.targetTau / v.R, min: 1e-18, max: 1 })
    if (solved.error) return { ok: false, reason: REASON_NO_SOLUTION }

    const C = solved.value
    const base = rcTime({ R: v.R, C })
    if (base.error) return { ok: false, reason: REASON_INCOMPLETE }

    return {
      ...timingResult(base, v, TOOL_RC), mode,
      C, targetTau: v.targetTau, solvedBy: solved.method,
      nearestC: nearestValue(C * 1e9, 'E24'), // nF cinsinden
    }
  }

  const base = rcTime({ R: v.R, C: v.C })
  if (base.error) return { ok: false, reason: REASON_INCOMPLETE }
  return { ...timingResult(base, v, TOOL_RC), mode, C: v.C }
}

function computeRl(mode, v) {
  if (mode === MODE_SYNTHESIS) {
    const F = (L) => L / v.R - v.targetTau
    const solved = solveBounded(F, { x0: v.targetTau * v.R, min: 1e-15, max: 1e4 })
    if (solved.error) return { ok: false, reason: REASON_NO_SOLUTION }

    const L = solved.value
    const base = rlTime({ R: v.R, L })
    if (base.error) return { ok: false, reason: REASON_INCOMPLETE }

    return {
      ...timingResult(base, v, TOOL_RL), mode,
      L, targetTau: v.targetTau, solvedBy: solved.method,
      nearestL: nearestValue(L * 1e6, 'E24'), // µH cinsinden
    }
  }

  const base = rlTime({ R: v.R, L: v.L })
  if (base.error) return { ok: false, reason: REASON_INCOMPLETE }
  return { ...timingResult(base, v, TOOL_RL), mode, L: v.L }
}

function computeCrystal(mode, v) {
  if (mode === MODE_SYNTHESIS) {
    const r = crystalCapsForLoad({ CL: v.CL, Cin: v.Cin, Cout: v.Cout, Cstray: v.Cstray })
    if (r.error) return { ok: false, reason: r.error, CL: v.CL, Cstray: v.Cstray, Cp: r.Cp }

    // Seçilen kapasitörle gerçekleşen yük kapasitesi
    const nearest = nearestValue(r.C, 'E24')
    const achieved = crystalLoad({ C1: r.C, C2: r.C, Cin: v.Cin, Cout: v.Cout, Cstray: v.Cstray })
    const withStandard = crystalLoad({
      C1: nearest.value, C2: nearest.value, Cin: v.Cin, Cout: v.Cout, Cstray: v.Cstray,
    })

    return {
      ok: true, tool: TOOL_CRYSTAL, mode,
      C: r.C, simplified: r.simplified, Cp: r.Cp,
      CL: v.CL, Cstray: v.Cstray, Cin: v.Cin, Cout: v.Cout,
      achieved: achieved.CL,
      nearest,
      withStandard: withStandard.CL,
      standardErrPct: (100 * (withStandard.CL - v.CL)) / v.CL,
      f: v.fXtal,
    }
  }

  const r = crystalLoad({ C1: v.C1, C2: v.C2, Cin: v.Cin, Cout: v.Cout, Cstray: v.Cstray })
  if (r.error) return { ok: false, reason: REASON_INCOMPLETE }

  return {
    ok: true, tool: TOOL_CRYSTAL, mode,
    achieved: r.CL,
    C1: v.C1, C2: v.C2, Cin: v.Cin, Cout: v.Cout, Cstray: v.Cstray,
    f: v.fXtal,
  }
}

export function compute(tool, mode, f) {
  const read = readForm(f, formFields(tool, mode, f))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  if (tool === TOOL_RC) return computeRc(mode, v)
  if (tool === TOOL_RL) return computeRl(mode, v)
  return computeCrystal(mode, v)
}

// --- Parametrik grafikler ---

export function buildSweep(r) {
  if (!r.ok) return null

  if (r.tool === TOOL_RC || r.tool === TOOL_RL) {
    const steps = 80
    const tEnd = 5 * r.tau
    const rows = []
    for (let i = 0; i < steps; i++) {
      const t = (tEnd * i) / (steps - 1)
      rows.push({
        x: t,
        y: r.tool === TOOL_RC ? chargeVoltage(r.Vs, t, r.tau) : risingCurrent(r.Vs, r.R, t, r.tau),
        // Deşarj eğrisi yalnızca RC için anlamlı
        discharge: r.tool === TOOL_RC ? dischargeVoltage(r.Vs, t, r.tau) : null,
      })
    }

    const final = r.tool === TOOL_RC ? r.Vs : r.Ifinal
    return {
      kind: r.tool,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      dischargePoints: r.tool === TOOL_RC ? rows.map((p) => [p.x, p.discharge]) : null,
      refs: [
        { key: 'final', y: final },
        { key: 'tau', y: final * (1 - Math.exp(-1)) },
      ],
      marker: { x: r.tau, y: r.atTau },
    }
  }

  // Kristal: harici kapasitör değiştikçe gerçekleşen yük kapasitesi
  const centre = r.mode === MODE_SYNTHESIS ? r.C : (r.C1 + r.C2) / 2
  if (!(centre > 0)) return null

  const steps = 70
  const from = Math.max(1, centre / 5)
  const to = centre * 5
  const rows = []
  for (let i = 0; i < steps; i++) {
    const C = from + ((to - from) * i) / (steps - 1)
    const load = crystalLoad({ C1: C, C2: C, Cin: r.Cin, Cout: r.Cout, Cstray: r.Cstray })
    rows.push({ x: C, y: load.error ? NaN : load.CL })
  }

  return {
    kind: TOOL_CRYSTAL,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    refs: r.mode === MODE_SYNTHESIS ? [{ key: 'target', y: r.CL }] : [],
    marker: { x: centre, y: r.achieved },
  }
}
