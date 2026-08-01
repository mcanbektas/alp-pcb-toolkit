// Tek uçlu kontrollü empedans ekranının hesap modeli (spec §6.4 – §6.7).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH, RESISTANCE } from '../../../lib/units'
import {
  microstrip, stripline, coplanarWaveguide,
  solveWidthForZ0, impedanceTolerance,
  IMP_ERR_NO_SOLUTION,
} from '../../../lib/impedance'

export const STRUCT_MICROSTRIP = 'microstrip'
export const STRUCT_STRIPLINE = 'stripline'
export const STRUCT_CPW = 'cpw'
// Grounded CPW yalnız alan çözücüyle sunulur (spec §6.7 — kapalı form dalı
// YAZILMAZ; ideal CPW denklemi bu yapının sonucu olarak kullanılamaz).
// compute() bu yapıda sayı üretmez: geometri + solverParams döner, sayılar
// worker'daki çözücüden gelir (brif 09 F2).
export const STRUCT_GCPW = 'gcpw'
export const STRUCTURES = [STRUCT_MICROSTRIP, STRUCT_STRIPLINE, STRUCT_CPW, STRUCT_GCPW]

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_NO_SOLUTION = IMP_ERR_NO_SOLUTION
// Grounded CPW sentezi bu fazda yok: kapalı form yok, çözücünün kök
// döngüsüne girmesi F3 (karar #10). Ekran bu nedeni açıklayıcı metne çevirir.
export const REASON_SOLVER_ONLY = 'solver-only-synthesis'

export const INITIAL_FORM = {
  structure: STRUCT_MICROSTRIP,

  W: '0.4', Wu: 'mm',
  H: '0.2', Hu: 'mm',
  b: '0.5', bu: 'mm',
  S: '0.2', Su: 'mm',
  t: '35', tu: 'µm',
  epsR: '4.2',

  target: '50',

  tol: false,
  tolW: '10', tolH: '10', tolT: '10', tolEps: '3',
}

const PLAIN = { '': 1 }
const PCT = { '%': 1 }
const DIM = { mm: LENGTH.mm, 'µm': LENGTH['µm'], um: LENGTH.um, mil: LENGTH.mil }

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, mode, labels = {}) {
  const L = (key) => labels[key] ?? key
  const structure = f.structure
  return fieldsFor([
    [
      { key: 'epsR', label: L('epsR'), unit: '', table: PLAIN, min: 1 },
      { key: 't', label: L('t'), unitKey: 'tu', table: DIM, min: 0, allowZero: true },
    ],
    when(mode === MODE_ANALYSIS, [
      { key: 'W', label: L('W'), unitKey: 'Wu', table: DIM, min: 0 },
    ]),
    when(mode === MODE_SYNTHESIS, [
      // Birim seçici yok: tek birim `unit` ile sabitlenir, çarpan units.js
      // RESISTANCE tablosundan gelir (yerel çarpan tablosu yazılmaz).
      { key: 'target', label: L('target'), unit: 'Ω', table: RESISTANCE, min: 0 },
    ]),
    when(structure === STRUCT_MICROSTRIP || structure === STRUCT_CPW || structure === STRUCT_GCPW, [
      { key: 'H', label: L('H'), unitKey: 'Hu', table: DIM, min: 0 },
    ]),
    when(structure === STRUCT_STRIPLINE, [
      { key: 'b', label: L('b'), unitKey: 'bu', table: DIM, min: 0 },
    ]),
    when(structure === STRUCT_CPW || structure === STRUCT_GCPW, [
      { key: 'S', label: L('S'), unitKey: 'Su', table: DIM, min: 0 },
    ]),
    // CPW/GCPW ekranı tolerans kontrolünü ve alanlarını hiç göstermez
    // (compute()'un kendi koşuluyla aynı), yoksa form state'inde f.tol=true
    // kalmışken rapora görünmeyen dört tolerans girdisi sızar.
    when(f.tol && structure !== STRUCT_CPW && structure !== STRUCT_GCPW, [
      { key: 'tolW', label: L('tolW'), unit: '%', table: PCT, min: 0, allowZero: true },
      { key: 'tolH', label: L('tolH'), unit: '%', table: PCT, min: 0, allowZero: true },
      { key: 'tolT', label: L('tolT'), unit: '%', table: PCT, min: 0, allowZero: true },
      { key: 'tolEps', label: L('tolEps'), unit: '%', table: PCT, min: 0, allowZero: true },
    ]),
  ])
}

function evaluate(structure, { W, H, b, S, t, epsR }) {
  if (structure === STRUCT_STRIPLINE) return stripline({ W, b, epsR })
  if (structure === STRUCT_CPW) return coplanarWaveguide({ W, S, epsR })
  return microstrip({ W, H, t, epsR })
}

export function compute(mode, f, labels = {}) {
  const read = readForm(f, formFields(f, mode, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const structure = f.structure
  // CPW'de bakır kalınlığı kapalı forma girmiyor; yine de raporlanır
  const geom = { H: v.H, b: v.b, S: v.S, t: v.t, epsR: v.epsR }

  // Grounded CPW: kapalı form yok, sentez de yok (REASON_SOLVER_ONLY).
  // Analizde sayı üretilmez; geometri ve worker işi döner, ekran sonucu
  // çözücüden basar.
  if (structure === STRUCT_GCPW) {
    if (mode === MODE_SYNTHESIS) return { ok: false, reason: REASON_SOLVER_ONLY }
    return {
      ok: true, mode, structure,
      solverOnly: true,
      W: v.W, height: v.H, t: v.t, epsR: v.epsR, S: v.S,
      target: null,
      solvedBy: null,
      tolerance: null,
      solverParams: {
        kind: 'gcpw', structure, W: v.W, S: v.S, height: v.H, t: v.t, epsR: v.epsR,
      },
    }
  }

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
    // İdeal CPW alan çözücü doğrulaması taşımaz (F1 kararı: yapı kataloğunda
    // ayrı; grounded CPW ayrı seçenek). Diğer yapılar tek uçlu işi taşır.
    solverParams: structure === STRUCT_CPW
      ? null
      : { kind: 'single', structure, W, S: 0, height, t: v.t, epsR: v.epsR },
  }
}

// Grafik: genişliğe göre empedans. Grounded CPW'de senkron motor yok —
// nokta başına alan çözümü koşturulamaz, grafik bu yapıda üretilmez.
export function buildSweep(r) {
  if (!r.ok || r.solverOnly) return null

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
