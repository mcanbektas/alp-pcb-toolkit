// Uzunluk dönüştürücü ekranının hesap modeli (spec §11.1).
// Saf: React, DOM ve gösterim bilmez; kullanıcıya görünen metin üretmez.

import { fieldsFor, readForm } from '../../../lib/fields'
import { LENGTH } from '../../../lib/units'
import {
  LENGTH_UNITS, COMMON_MIL,
  convertLength, allLengths, roundingComparison, nearestCommonMil,
  LEN_ERR_RANGE, LEN_ERR_UNIT,
} from '../../../lib/convertLength'

// Hesap yapılamadığında dönen KODLAR — metne text.js çevirir
export const REASON_INCOMPLETE = 'incomplete'
export const REASON_RANGE = 'range'
export const REASON_UNIT = 'unit'
// Uzunluk sayı olarak temsil edilebiliyor ama karşılıkları taşıyor
export const REASON_OVERFLOW = 'overflow'

// Arayüzde sunulan birimler ve gösterim hassasiyeti seçenekleri
export const UNITS = LENGTH_UNITS
export const SIG_VALUES = [3, 4, 5, 6, 8]

// units.js tablosundan yalnızca bu ekranda sunulan birimler
const LEN = UNITS.reduce((acc, u) => {
  acc[u] = LENGTH[u]
  return acc
}, {})

export const INITIAL_FORM = {
  L: '1', Lu: 'mm',
  target: 'mil',
  sig: '5',
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// etiket verilmezse alan anahtarı gösterilir.
export function formFields(labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'L', label: L('L'), unitKey: 'Lu', table: LEN, min: 0 },
      { key: 'sig', label: L('sig'), min: 1, max: 12 },
    ],
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  if (!(v.L > 0)) return { ok: false, reason: REASON_RANGE }
  // "1e400" gibi bir giriş ayrıştırmadan Infinity olarak çıkar; sonsuz uzunluk
  // dönüştürülmez.
  if (!Number.isFinite(v.L)) return { ok: false, reason: REASON_OVERFLOW }

  // v.L readForm tarafından metreye çevrilmiş olarak gelir
  const conv = convertLength(v.L, 'm', f.target)
  if (conv.error === LEN_ERR_RANGE) return { ok: false, reason: REASON_OVERFLOW }
  if (conv.error === LEN_ERR_UNIT) return { ok: false, reason: REASON_UNIT }
  if (conv.error) return { ok: false, reason: REASON_INCOMPLETE }

  // Birim tablosu ve yuvarlama karşılaştırması taşarsa eksik tablo gösterilmez
  const all = allLengths(v.L)
  const rounding = roundingComparison(v.L)
  if (!all || !rounding) return { ok: false, reason: REASON_OVERFLOW }

  const common = COMMON_MIL.map((mil) => ({ mil, mm: convertLength(mil, 'mil', 'mm').value }))

  return {
    ok: true,
    L: v.L, // SI: metre
    unit: f.Lu,
    target: f.target,
    sig: v.sig,
    all,
    targetValue: conv.value,
    // Yuvarlatılmış 39.3701 kuralının bu uzunluktaki sapması
    rounding,
    common,
    nearest: nearestCommonMil(all.mil),
    // Kaynak ve hedef birim aynıysa ekran bunu ayrıca söyler
    sameUnit: f.Lu === f.target,
  }
}

// Grafik: mm ↔ mil doğrusu, çalışma noktası işaretli.
// Dönüşüm doğrusaldır; eğri eğimin (39.37 mil/mm) ne demek olduğunu gösterir.
export function buildSweep(r) {
  if (!r.ok) return null

  const steps = 61
  const maxMm = r.all.mm * 2
  if (!(maxMm > 0)) return null

  const rows = []
  for (let i = 0; i < steps; i++) {
    const mm = (maxMm * i) / (steps - 1)
    rows.push({ x: mm, y: convertLength(mm, 'mm', 'mil').value })
  }
  if (rows.length === 0) return null

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    refs: [],
    marker: { x: r.all.mm, y: r.all.mil },
  }
}
