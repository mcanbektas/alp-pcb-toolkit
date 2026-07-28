// Güç düzlemi ve paralel yol ekranının hesap modeli (spec §4.2).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, readRows, fieldsFor, when } from '../../../lib/fields'
import { LENGTH, CURRENT, VOLTAGE } from '../../../lib/units'
import { powerPlane, parallelTraces, equivalentSingleWidth, stripResistance } from '../../../lib/plane'
import { ozThickness_m, currentForArea } from '../../../lib/traceCalc'

export const TOOL_PLANE = 'plane'
export const TOOL_PARALLEL = 'parallel'
export const TOOLS = [TOOL_PLANE, TOOL_PARALLEL]

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_NECK = 'neck'
export const REASON_ROWS = 'rows'

export const INITIAL_FORM = {
  tool: TOOL_PLANE,

  I: '10', Iu: 'A',
  T: '45',
  oz: '1', tCustom: '35',
  Vs: '5', Vsu: 'V',
  layer: 'external',

  // Düzlem geometrisi
  L: '50', Lu: 'mm',
  Wavg: '20', Wavgu: 'mm',
  Wneck: '5', Wnecku: 'mm',

  // Paralel yollar
  traces: [
    { L: '50', Lu: 'mm', W: '1', Wu: 'mm' },
    { L: '50', Lu: 'mm', W: '1', Wu: 'mm' },
  ],
}

const TEMP = { '°C': 1 }
const WIDTH = { mm: LENGTH.mm, mil: LENGTH.mil }

// Satır listesi sütunları — etiketler ekranın text.js'inden gelir, model dili bilmez.
export function traceColumns(labels = {}) {
  return [
    { key: 'L', unitKey: 'Lu', label: labels.rowL ?? 'L', units: ['mm', 'cm', 'mil', 'inch'] },
    { key: 'W', unitKey: 'Wu', label: labels.rowW ?? 'W', units: ['mm', 'mil'] },
  ]
}

function traceSpecs(labels = {}) {
  return [
    { key: 'L', label: labels.rowL ?? 'L', unitKey: 'Lu', table: LENGTH, min: 0 },
    { key: 'W', label: labels.rowW ?? 'W', unitKey: 'Wu', table: WIDTH, min: 0 },
  ]
}

export function formFields(tool, f, labels = {}) {
  const L = (key) => labels[key] ?? key

  return fieldsFor([
    [
      { key: 'I', label: L('I'), unitKey: 'Iu', table: CURRENT, min: 0 },
      { key: 'T', label: L('T'), unit: '°C', table: TEMP, allowZero: true },
      { key: 'Vs', label: L('Vs'), unitKey: 'Vsu', table: VOLTAGE, min: 0, optional: true },
    ],
    when(f.oz === 'custom', [
      { key: 'tCustom', label: L('tCustom'), unit: 'µm', table: LENGTH, min: 0 },
    ]),
    when(tool === TOOL_PLANE, [
      { key: 'L', label: L('L'), unitKey: 'Lu', table: LENGTH, min: 0 },
      { key: 'Wavg', label: L('Wavg'), unitKey: 'Wavgu', table: WIDTH, min: 0 },
      { key: 'Wneck', label: L('Wneck'), unitKey: 'Wnecku', table: WIDTH, min: 0 },
    ]),
  ])
}

function copperThickness(f, values) {
  if (f.oz === 'custom') return values.tCustom
  return ozThickness_m(f.oz)
}

export function compute(tool, f, labels = {}) {
  const read = readForm(f, formFields(tool, f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const t = copperThickness(f, v)
  if (!Number.isFinite(t) || t <= 0) return { ok: false, reason: REASON_INCOMPLETE }

  const Vsupply = v.Vs ?? null

  if (tool === TOOL_PLANE) {
    if (v.Wneck > v.Wavg) return { ok: false, reason: REASON_NECK }

    const r = powerPlane({
      L: v.L, Wavg: v.Wavg, Wneck: v.Wneck, t, I: v.I, T: v.T, Vsupply,
    })
    if (r.error) return { ok: false, reason: REASON_INCOMPLETE }

    // Boyun bölgesinin akım kapasitesi ampirik ısınma denkleminden — düzlem
    // geniş olsa da darboğaz tek bir yol gibi davranır.
    const neckArea_mil2 = (v.Wneck / LENGTH.mil) * (t / LENGTH.mil)
    const neckCapacity = currentForArea(neckArea_mil2, 20, f.layer)

    return {
      ok: true, tool: TOOL_PLANE, t, I: v.I, T: v.T, Vsupply, layer: f.layer,
      ...r,
      neckCapacity,
      neckUtil: v.I / neckCapacity,
    }
  }

  const rows = readRows(f.traces, traceSpecs(labels), labels.rowLabel ?? 'row')
  if (rows.ambiguous.length) return { ok: false, ambiguous: rows.ambiguous }
  if (!rows.ok) return { ok: false, reason: REASON_ROWS, invalid: rows.invalid }

  const r = parallelTraces({
    traces: rows.rows.map((x) => ({ L: x.L, W: x.W, t })),
    I: v.I,
    T: v.T,
  })
  if (r.error) return { ok: false, reason: REASON_INCOMPLETE }

  // Her kolun kendi akımıyla kapasitesi karşılaştırılır
  const branches = r.branches.map((b) => {
    const area_mil2 = (b.W / LENGTH.mil) * (t / LENGTH.mil)
    const capacity = currentForArea(area_mil2, 20, f.layer)
    return { ...b, capacity, util: b.I / capacity }
  })

  const worst = branches.reduce((a, b) => (b.util > a.util ? b : a))
  const equivalentW = equivalentSingleWidth({
    Req: r.Req, L: rows.rows[0].L, t, T: v.T,
  })

  return {
    ok: true, tool: TOOL_PARALLEL, t, I: v.I, T: v.T, Vsupply, layer: f.layer,
    ...r,
    branches,
    worst,
    equivalentW,
    totalWidth: rows.rows.reduce((a, x) => a + x.W, 0),
    pct: Vsupply > 0 ? (100 * r.Vdrop) / Vsupply : null,
  }
}

// Grafik: düzlemde genişliğe göre direnç, paralelde kol sayısına göre eşdeğer
export function buildSweep(r) {
  if (!r.ok) return null

  if (r.tool === TOOL_PLANE) {
    const centre = r.neck.W
    const from = centre / 10
    const to = r.average.W * 2
    const steps = 70
    const rows = []
    for (let i = 0; i < steps; i++) {
      const W = Math.pow(10, Math.log10(from) + ((Math.log10(to) - Math.log10(from)) * i) / (steps - 1))
      const s = stripResistance({ L: r.average.L, W, t: r.t, T: r.T })
      rows.push({ x: W * 1e3, y: s.error ? NaN : s.R })
    }
    return {
      kind: TOOL_PLANE,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      refs: [{ key: 'avg', y: r.average.R }],
      marker: { x: r.neck.W * 1e3, y: r.neck.R },
    }
  }

  // Aynı geometride kol sayısı arttıkça eşdeğer direnç 1/n ile düşer
  const one = r.branches[0]
  const steps = 12
  const rows = []
  for (let n = 1; n <= steps; n++) {
    rows.push({ x: n, y: one.R / n })
  }
  return {
    kind: TOOL_PARALLEL,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    refs: [{ key: 'now', y: r.Req }],
    marker: { x: r.branches.length, y: r.Req },
  }
}
