// RC/RL zaman sabiti ekranının hesap modeli (spec §9.10). Saf: React, DOM ve
// gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { RESISTANCE, CAPACITANCE, INDUCTANCE, TIME, VOLTAGE } from '../../../lib/units'
import { rcTime, rlTime, chargeVoltage, dischargeVoltage, risingCurrent } from '../../../lib/timing'
import { nearestValue } from '../../../lib/eseries'
import { solveBounded } from '../../../lib/solve'

export const TOOL_RC = 'rc'
export const TOOL_RL = 'rl'
export const TOOLS = [TOOL_RC, TOOL_RL]

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_NO_SOLUTION = 'no-solution'

export const INITIAL_FORM = {
  tool: TOOL_RC,

  R: '10', Ru: 'kΩ',
  C: '100', Cu: 'nF',
  L: '10', Lu: 'mH',
  Vs: '3.3', Vsu: 'V',
  targetTau: '1', targetTauu: 'ms',
}

// Alan etiketleri dışarıdan gelir: model dil bilmez. Etiket verilmezse alan
// anahtarı görünür — sessiz boşluk yerine teşhis edilebilir bir ad.
export function formFields(tool, mode, f, labels = {}) { // eslint-disable-line no-unused-vars
  const L = (key) => labels[key] ?? key

  return fieldsFor([
    when(tool === TOOL_RC, [
      { key: 'R', label: L('R'), unitKey: 'Ru', table: RESISTANCE, min: 0 },
      { key: 'Vs', label: L('Vs'), unitKey: 'Vsu', table: VOLTAGE, min: 0 },
    ]),
    when(tool === TOOL_RC && mode === MODE_ANALYSIS, [
      { key: 'C', label: L('C'), unitKey: 'Cu', table: CAPACITANCE, min: 0 },
    ]),

    when(tool === TOOL_RL, [
      { key: 'R', label: L('R'), unitKey: 'Ru', table: RESISTANCE, min: 0 },
      { key: 'Vs', label: L('Vs'), unitKey: 'Vsu', table: VOLTAGE, min: 0 },
    ]),
    when(tool === TOOL_RL && mode === MODE_ANALYSIS, [
      { key: 'L', label: L('L'), unitKey: 'Lu', table: INDUCTANCE, min: 0 },
    ]),

    when((tool === TOOL_RC || tool === TOOL_RL) && mode === MODE_SYNTHESIS, [
      { key: 'targetTau', label: L('targetTau'), unitKey: 'targetTauu', table: TIME, min: 0 },
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

export function compute(tool, mode, f, labels = {}) {
  const read = readForm(f, formFields(tool, mode, f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  return tool === TOOL_RC ? computeRc(mode, v) : computeRl(mode, v)
}

// --- Parametrik grafikler ---

export function buildSweep(r) {
  if (!r.ok) return null

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
