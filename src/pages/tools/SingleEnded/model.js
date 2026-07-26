// Tek uçlu kontrollü empedans ekranının hesap modeli (spec §6.4 – §6.7).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH } from '../../../lib/units'
import {
  microstrip, stripline, coplanarWaveguide,
  solveWidthForZ0, impedanceTolerance,
  IMP_ERR_NO_SOLUTION,
} from '../../../lib/impedance'

export const STRUCT_MICROSTRIP = 'microstrip'
export const STRUCT_STRIPLINE = 'stripline'
export const STRUCT_CPW = 'cpw'
export const STRUCTURES = [STRUCT_MICROSTRIP, STRUCT_STRIPLINE, STRUCT_CPW]

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_NO_SOLUTION = IMP_ERR_NO_SOLUTION

export const INITIAL_FORM = {
  structure: STRUCT_MICROSTRIP,

  W: '0.4', Wu: 'mm',
  H: '0.2', Hu: 'mm',
  b: '0.5', bu: 'mm',
  S: '0.2', Su: 'mm',
  t: '35', tu: 'um',
  epsR: '4.2',

  target: '50',

  tol: false,
  tolW: '10', tolH: '10', tolT: '10', tolEps: '3',
}

const PLAIN = { '': 1 }
const PCT = { '%': 1 }
const DIM = { mm: LENGTH.mm, um: LENGTH.um, mil: LENGTH.mil }
const OHM = { Ω: 1 }

export function formFields(f, mode) {
  const structure = f.structure
  return fieldsFor([
    [
      { key: 'epsR', label: 'Dielektrik sabiti (εr)', unit: '', table: PLAIN, min: 1 },
      { key: 't', label: 'Bakır kalınlığı (t)', unitKey: 'tu', table: DIM, min: 0, allowZero: true },
    ],
    when(mode === MODE_ANALYSIS, [
      { key: 'W', label: 'Hat genişliği (W)', unitKey: 'Wu', table: DIM, min: 0 },
    ]),
    when(mode === MODE_SYNTHESIS, [
      { key: 'target', label: 'Hedef empedans', unit: 'Ω', table: OHM, min: 0 },
    ]),
    when(structure === STRUCT_MICROSTRIP || structure === STRUCT_CPW, [
      { key: 'H', label: 'Dielektrik yüksekliği (H)', unitKey: 'Hu', table: DIM, min: 0 },
    ]),
    when(structure === STRUCT_STRIPLINE, [
      { key: 'b', label: 'Düzlemler arası mesafe (b)', unitKey: 'bu', table: DIM, min: 0 },
    ]),
    when(structure === STRUCT_CPW, [
      { key: 'S', label: 'Coplanar boşluk (S)', unitKey: 'Su', table: DIM, min: 0 },
    ]),
    when(f.tol, [
      { key: 'tolW', label: 'Genişlik toleransı', unit: '%', table: PCT, min: 0, allowZero: true },
      { key: 'tolH', label: 'Dielektrik toleransı', unit: '%', table: PCT, min: 0, allowZero: true },
      { key: 'tolT', label: 'Bakır kalınlığı toleransı', unit: '%', table: PCT, min: 0, allowZero: true },
      { key: 'tolEps', label: 'εr toleransı', unit: '%', table: PCT, min: 0, allowZero: true },
    ]),
  ])
}

function evaluate(structure, { W, H, b, S, t, epsR }) {
  if (structure === STRUCT_STRIPLINE) return stripline({ W, b, epsR })
  if (structure === STRUCT_CPW) return coplanarWaveguide({ W, S, epsR })
  return microstrip({ W, H, t, epsR })
}

export function compute(mode, f) {
  const read = readForm(f, formFields(f, mode))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const structure = f.structure
  // CPW'de bakır kalınlığı kapalı forma girmiyor; yine de raporlanır
  const geom = { H: v.H, b: v.b, S: v.S, t: v.t, epsR: v.epsR }

  let W = v.W
  let solvedBy = null

  if (mode === MODE_SYNTHESIS) {
    const solved = solveWidthForZ0({
      target: v.target,
      H: v.H, b: v.b, S: v.S, t: v.t, epsR: v.epsR,
      structure,
    })
    if (solved.error) return { ok: false, reason: REASON_NO_SOLUTION }
    W = solved.W
    solvedBy = solved.solvedBy
  }

  const r = evaluate(structure, { ...geom, W })
  if (r.error) return { ok: false, reason: REASON_INCOMPLETE }

  const height = structure === STRUCT_STRIPLINE ? v.b : v.H
  const tolerance = f.tol && structure !== STRUCT_CPW
    ? impedanceTolerance({
        W, H: v.H, b: v.b, t: v.t, epsR: v.epsR,
        tolW: v.tolW, tolH: v.tolH, tolT: v.tolT, tolEps: v.tolEps,
        structure,
      })
    : null

  return {
    ok: true, mode, structure,
    ...r,
    W, height, t: v.t, epsR: v.epsR, S: v.S,
    target: mode === MODE_SYNTHESIS ? v.target : null,
    solvedBy,
    tolerance,
    // ps/mm — sinyal bütünlüğü ekranlarıyla aynı birim
    tpdPsPerMm: r.tpd * 1e9,
  }
}

// Grafik: genişliğe göre empedans
export function buildSweep(r) {
  if (!r.ok) return null

  const from = r.W / 10
  const to = r.W * 10
  const steps = 70
  const rows = []
  for (let i = 0; i < steps; i++) {
    const W = Math.pow(10, Math.log10(from) + ((Math.log10(to) - Math.log10(from)) * i) / (steps - 1))
    const e = evaluate(r.structure, {
      W, H: r.height, b: r.height, S: r.S, t: r.t, epsR: r.epsR,
    })
    rows.push({ x: W * 1e3, y: e.error ? NaN : e.Z0 })
  }

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    refs: r.target != null ? [{ key: 'target', y: r.target }] : [],
    marker: { x: r.W * 1e3, y: r.Z0 },
  }
}
