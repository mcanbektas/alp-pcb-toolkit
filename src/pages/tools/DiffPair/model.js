// Diferansiyel çift empedans ekranının hesap modeli (spec §6.8).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH } from '../../../lib/units'
import {
  differentialPair, solveSpacingForZdiff, solveWidthForZ0,
  IMP_ERR_NO_SOLUTION,
} from '../../../lib/impedance'
import { solveBounded } from '../../../lib/solve'

export const STRUCT_MICROSTRIP = 'microstrip'
export const STRUCT_STRIPLINE = 'stripline'
export const STRUCTURES = [STRUCT_MICROSTRIP, STRUCT_STRIPLINE]

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

// Sentezde tek bir hedef sonsuz çözüm üretir (spec §6.8.2); bu yüzden
// kullanıcı W veya S'den birini sabitler.
export const FIX_WIDTH = 'width'
export const FIX_SPACING = 'spacing'
export const FIXED_OPTIONS = [FIX_WIDTH, FIX_SPACING]

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_NO_SOLUTION = IMP_ERR_NO_SOLUTION

export const INITIAL_FORM = {
  structure: STRUCT_MICROSTRIP,
  fixed: FIX_WIDTH,

  W: '0.2', Wu: 'mm',
  S: '0.2', Su: 'mm',
  H: '0.2', Hu: 'mm',
  t: '35', tu: 'um',
  epsR: '4.2',

  target: '100',
  tolerancePct: '10',
}

const PLAIN = { '': 1 }
const PCT = { '%': 1 }
const DIM = { mm: LENGTH.mm, um: LENGTH.um, mil: LENGTH.mil }
const OHM = { Ω: 1 }

export function formFields(f, mode) {
  return fieldsFor([
    [
      { key: 'H', label: 'Referans düzlem mesafesi (H)', unitKey: 'Hu', table: DIM, min: 0 },
      { key: 't', label: 'Bakır kalınlığı (t)', unitKey: 'tu', table: DIM, min: 0, allowZero: true },
      { key: 'epsR', label: 'Dielektrik sabiti (εr)', unit: '', table: PLAIN, min: 1 },
    ],
    when(mode === MODE_ANALYSIS, [
      { key: 'W', label: 'Hat genişliği (W)', unitKey: 'Wu', table: DIM, min: 0 },
      { key: 'S', label: 'Hatlar arası boşluk (S)', unitKey: 'Su', table: DIM, min: 0 },
    ]),
    when(mode === MODE_SYNTHESIS, [
      { key: 'target', label: 'Hedef diferansiyel empedans', unit: 'Ω', table: OHM, min: 0 },
      { key: 'tolerancePct', label: 'İzin verilen sapma', unit: '%', table: PCT, min: 0 },
    ]),
    when(mode === MODE_SYNTHESIS && f.fixed === FIX_WIDTH, [
      { key: 'W', label: 'Sabit hat genişliği (W)', unitKey: 'Wu', table: DIM, min: 0 },
    ]),
    when(mode === MODE_SYNTHESIS && f.fixed === FIX_SPACING, [
      { key: 'S', label: 'Sabit hat aralığı (S)', unitKey: 'Su', table: DIM, min: 0 },
    ]),
  ])
}

export function compute(mode, f) {
  const read = readForm(f, formFields(f, mode))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const structure = f.structure
  const base = { structure, H: v.H, t: v.t, epsR: v.epsR }

  let W = v.W
  let S = v.S
  let solvedBy = null
  let solvedFor = null

  if (mode === MODE_SYNTHESIS) {
    if (f.fixed === FIX_WIDTH) {
      const solved = solveSpacingForZdiff({ target: v.target, W: v.W, ...base })
      if (solved.error) return { ok: false, reason: REASON_NO_SOLUTION }
      S = solved.S
      solvedBy = solved.solvedBy
      solvedFor = 'S'
    } else {
      // Aralık sabitken genişlik aranır: tek uçlu hedefi Z_diff/2 üzerinden
      // başlatılır, sonra çift denklemiyle doğrulanır.
      const seed = solveWidthForZ0({
        target: v.target / 2, H: v.H, t: v.t, epsR: v.epsR, structure,
      })
      if (seed.error) return { ok: false, reason: REASON_NO_SOLUTION }

      // Kuplaj Z_diff'i düşürdüğü için tohum genişlik fazla dar kalır;
      // gerçek çözüm çift denklemiyle aranır.
      const solved = solveWidthForDiff({ target: v.target, S: v.S, ...base, seed: seed.W })
      if (solved.error) return { ok: false, reason: REASON_NO_SOLUTION }
      W = solved.W
      solvedBy = solved.solvedBy
      solvedFor = 'W'
    }
  }

  const r = differentialPair({ ...base, W, S })
  if (r.error) return { ok: false, reason: REASON_INCOMPLETE }

  const target = mode === MODE_SYNTHESIS ? v.target : null
  const errPct = target != null ? (100 * (r.Zdiff - target)) / target : null

  return {
    ok: true, mode, structure,
    ...r,
    W, S, H: v.H, t: v.t, epsR: v.epsR,
    target, errPct,
    acceptPct: mode === MODE_SYNTHESIS ? v.tolerancePct : null,
    solvedBy, solvedFor,
    tpdPsPerMm: r.tpd * 1e9,
    // Skew ekranıyla aynı birim: hat çifti arası gecikme farkı için
    fixed: f.fixed,
  }
}

// Aralık sabitken genişliği çözer. Ayrı fonksiyon çünkü lib katmanı yalnızca
// tek değişkenli iki hazır sentez sunuyor; bu üçüncü kombinasyon ekrana özgü.
function solveWidthForDiff({ target, S, structure, H, t, epsR, seed }) {
  // Kök arama lib/solve üzerinden; burada yalnızca hedef fonksiyonu kuruluyor.
  const F = (W) => {
    const r = differentialPair({ structure, W, S, H, t, epsR })
    return r.error ? NaN : r.Zdiff - target
  }
  const solved = solveBounded(F, { x0: seed, min: H / 500, max: H * 100 })
  if (solved.error) return { error: REASON_NO_SOLUTION }
  return { W: solved.value, solvedBy: solved.method }
}

// Grafik: sabitlenen değişkene göre diferansiyel empedans taraması
export function buildSweep(r) {
  if (!r.ok) return null

  const sweepSpacing = r.fixed === FIX_WIDTH || r.mode === MODE_ANALYSIS
  const centre = sweepSpacing ? r.S : r.W
  const from = centre / 8
  const to = centre * 8
  const steps = 70

  const rows = []
  for (let i = 0; i < steps; i++) {
    const x = Math.pow(10, Math.log10(from) + ((Math.log10(to) - Math.log10(from)) * i) / (steps - 1))
    const e = differentialPair({
      structure: r.structure,
      W: sweepSpacing ? r.W : x,
      S: sweepSpacing ? x : r.S,
      H: r.H, t: r.t, epsR: r.epsR,
    })
    rows.push({ x: x * 1e3, y: e.error ? NaN : e.Zdiff, odd: e.error ? NaN : e.Zodd })
  }

  return {
    sweepSpacing,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    oddPoints: rows.map((p) => [p.x, p.odd]),
    refs: r.target != null ? [{ key: 'target', y: r.target }] : [],
    marker: { x: centre * 1e3, y: r.Zdiff },
  }
}
