// Diferansiyel çift empedans ekranının hesap modeli (spec §6.8).
// Saf: React, DOM ve gösterim bilmez.
//
// F2'den itibaren çiftin odd/even/diferansiyel/common sayıları ALAN
// ÇÖZÜCÜDEN gelir (lib/fieldSolver.js → fieldDifferentialPair, spec §6.8.1
// kapasitans matrisi rotası). Çözücü uzun sürdüğü için Web Worker'da koşar
// (hooks/useFieldSolver.js); bu modelin compute()'u yalnız senkron olanı
// üretir: form doğrulama, geometri, kapalı form TEK UÇLU taban (referans) ve
// çözücüye gidecek parametreler. Eski ampirik kuplaj katsayısı söküldü —
// kaynağı spec'te yoktu (docs/alan-cozucu-karari.md F2).

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH, RESISTANCE } from '../../../lib/units'
import {
  microstrip, stripline, solveWidthForZ0,
  IMP_ERR_NO_SOLUTION,
} from '../../../lib/impedance'

export const STRUCT_MICROSTRIP = 'microstrip'
export const STRUCT_STRIPLINE = 'stripline'
export const STRUCTURES = [STRUCT_MICROSTRIP, STRUCT_STRIPLINE]

export const MODE_ANALYSIS = 'ana'
export const MODE_SYNTHESIS = 'syn'

// Sentezde spec §6.8.2 W veya S'ten birinin sabitlenmesini ister (tek hedef,
// iki bilinmeyen → sonsuz çözüm). İki dal iki ayrı rotadan çözülür:
//   - S sabit → W: kuplajsız kapalı form tohumu (hedef Z₀ = Z_diff/2),
//     çözücü bulunan geometriyi TEK SEFER doğrular (F2 rotası).
//   - W sabit → S: aralığa bağlı senkron model yok; kök arama ÇÖZÜCÜNÜN
//     İÇİNDE koşar (fieldSolveSpacingForZdiff, worker'da — brif 09 F3,
//     karar #10 ölçümle açıldı).
export const FIX_WIDTH = 'width'
export const FIX_SPACING = 'spacing'
export const FIXED_OPTIONS = [FIX_SPACING, FIX_WIDTH]

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_NO_SOLUTION = IMP_ERR_NO_SOLUTION

export const INITIAL_FORM = {
  structure: STRUCT_MICROSTRIP,
  fixed: FIX_SPACING,

  W: '0.2', Wu: 'mm',
  S: '0.2', Su: 'mm',
  H: '0.2', Hu: 'mm',
  t: '35', tu: 'µm',
  epsR: '4.2',

  target: '100',
  tolerancePct: '10',
}

const PLAIN = { '': 1 }
const PCT = { '%': 1 }
const DIM = { mm: LENGTH.mm, 'µm': LENGTH['µm'], um: LENGTH.um, mil: LENGTH.mil }

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, mode, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'H', label: L('H'), unitKey: 'Hu', table: DIM, min: 0 },
      { key: 't', label: L('t'), unitKey: 'tu', table: DIM, min: 0, allowZero: true },
      { key: 'epsR', label: L('epsR'), unit: '', table: PLAIN, min: 1 },
    ],
    when(mode === MODE_ANALYSIS, [
      { key: 'W', label: L('W'), unitKey: 'Wu', table: DIM, min: 0 },
      { key: 'S', label: L('S'), unitKey: 'Su', table: DIM, min: 0 },
    ]),
    when(mode === MODE_SYNTHESIS, [
      // Birim seçici yok: tek birim `unit` ile sabitlenir, çarpan units.js
      // RESISTANCE tablosundan gelir (yerel çarpan tablosu yazılmaz).
      { key: 'target', label: L('target'), unit: 'Ω', table: RESISTANCE, min: 0 },
      { key: 'tolerancePct', label: L('tolerancePct'), unit: '%', table: PCT, min: 0 },
    ]),
    when(mode === MODE_SYNTHESIS && f.fixed === FIX_SPACING, [
      { key: 'S', label: L('S'), unitKey: 'Su', table: DIM, min: 0 },
    ]),
    when(mode === MODE_SYNTHESIS && f.fixed === FIX_WIDTH, [
      { key: 'W', label: L('W'), unitKey: 'Wu', table: DIM, min: 0 },
    ]),
  ])
}

export function compute(mode, f, labels = {}) {
  const read = readForm(f, formFields(f, mode, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const structure = f.structure
  const fixWidth = mode === MODE_SYNTHESIS && f.fixed === FIX_WIDTH

  let W = v.W
  let solvedBy = null
  let solvedFor = null

  if (mode === MODE_SYNTHESIS && !fixWidth) {
    // S sabit → W: kapalı form kuplajı bilmez; tohum, kuplajsız
    // Z_diff ≈ 2·Z₀ varsayımıyla tek uçlu Z₀ = hedef/2 için çözülür. Gerçek
    // Z_diff'i ve hedeften sapmayı alan çözücü bulunan geometride TEK SEFER
    // hesaplar (ekran, worker).
    const solved = solveWidthForZ0({
      target: v.target / 2,
      H: v.H, b: v.H, t: v.t, epsR: v.epsR,
      structure,
    })
    if (solved.error) return { ok: false, reason: REASON_NO_SOLUTION }
    W = solved.W
    solvedBy = solved.solvedBy
    solvedFor = 'W'
  }
  if (fixWidth) {
    // W sabit → S: kök arama çözücünün içinde koşar (worker, F3). S burada
    // bilinmez; sonuç zarfı (S dahil) çözücüden gelir.
    solvedFor = 'S'
  }

  // Kapalı form tek uçlu taban: çözücü gelene kadarki referans ve
  // "kuplajsız 2·Z₀" karşılaştırması. Çiftin sayıları buradan TÜREMEZ.
  const single = structure === STRUCT_STRIPLINE
    ? stripline({ W, b: v.H, epsR: v.epsR })
    : microstrip({ W, H: v.H, t: v.t, epsR: v.epsR })
  if (single.error) return { ok: false, reason: REASON_INCOMPLETE }

  return {
    ok: true, mode, structure,
    W, S: fixWidth ? null : v.S, H: v.H, t: v.t, epsR: v.epsR,
    Z0: single.Z0,
    epsEff: single.epsEff,
    singleMethod: single.method,
    singleModel: single.model,
    singleInRange: single.inRange,
    tpdPsPerMm: single.tpd * 1e9,
    ratio: fixWidth ? null : v.S / v.H,
    target: mode === MODE_SYNTHESIS ? v.target : null,
    acceptPct: mode === MODE_SYNTHESIS ? v.tolerancePct : null,
    solvedBy, solvedFor,
    // Ekranın useFieldSolver'a geçirdiği iş — worker sözleşmesiyle aynı adlar.
    // W sabit sentezde iş, kök aramayı çözücüde koşturan 'pair-spacing'tir.
    solverParams: fixWidth
      ? {
        kind: 'pair-spacing', structure,
        W, S: 0, height: v.H, t: v.t, epsR: v.epsR, target: v.target,
      }
      : {
        kind: 'pair', structure, W, S: v.S, height: v.H, t: v.t, epsR: v.epsR,
      },
  }
}
