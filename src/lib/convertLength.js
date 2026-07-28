// Uzunluk dönüşümleri (spec §11.1).
//
// Girdi ve çıktı SI: metre. Dönüşüm katsayıları tanım gereği tamdır; bu modül
// yalnızca çarpar/böler, ara değerde yuvarlama yapmaz. Kullanıcıya görünen
// metin üretmez — hata durumunda kod döner.

import { LENGTH } from './units'

export const LEN_ERR_INVALID = 'invalid'
export const LEN_ERR_UNIT = 'unit'
export const LEN_ERR_RANGE = 'range'

// --- Tanım gereği tam sabitler (spec §11.1) ---
export const MM_PER_INCH = 25.4 // 1 inch = 25.4 mm (uluslararası inch, tam)
export const MM_PER_MIL = 0.0254 // 1 mil = 0.001 inch = 0.0254 mm
export const MIL_PER_INCH = 1000

// Hesapta kullanılan tam karşılık: 1 mm = 1/0.0254 mil = 39.370078740157480…
export const MIL_PER_MM = 1 / MM_PER_MIL

// Spec'te geçen 39.3701 yuvarlatılmış GÖSTERİM değeridir; hesapta kullanılmaz.
// Kaynağı tektir: uluslararası inch tanımından gelen 1/0.0254 = 39.370078740157…
// sayısının dört ondalığa yuvarlanmış hâli.
//
// Ayrı bir olgu: ABD arazi ölçümündeki survey inch "1 m = 39.37 survey inch"
// bağıntısıyla tam olarak tanımlıdır. Bu tanım kendi başına doğrudur ama
// 39.3701 ondan TÜREMEZ — 39.3701 yalnızca 1/0.0254'ün yuvarlanmışıdır.
// İki sayının yakın olmasının nedeni uluslararası inch'in survey inch'e yakın
// seçilmiş olmasıdır; yine de aynı sayı değillerdir. Bu modül yalnızca
// uluslararası inch tanımını kullanır.
export const MIL_PER_MM_ROUNDED = 39.3701

// Arayüzde sunulan birimler — PCB pratiğinde en sık kullanılanlar önde.
export const LENGTH_UNITS = ['mm', 'µm', 'mil', 'inch', 'cm', 'm']

// --- Sayısal geçerlilik aralığı ---
//
// Dönüşümün kendisinde fiziksel bir üst sınır yoktur; sınır çift duyarlıklı
// kayan noktadan gelir. Birim tablosunu ilk taşıran hane daima en küçük
// birimdir: L[µm] = L[m] / 1e-6. Sınır elle yazılmaz, o birimin çarpanından
// türetilir — böylece birim listesi değişirse sayı da kendiliğinden değişir.
export const LEN_SMALLEST_UNIT = 'µm'
export const LEN_MAX_METERS = Number.MAX_VALUE * LENGTH[LEN_SMALLEST_UNIT]

/**
 * Ekranın kullanıcıya sayı olarak söylediği geçerlilik aralığı (spec §12).
 *
 * Alt sınır dışlayandır (L > 0). Üst sınır dahildir: LEN_MAX_METERS'ta
 * allLengths hâlâ eksiksiz bir tablo verir, bir sonraki kayan nokta değerinde
 * µm hanesi taşar ve LEN_ERR_RANGE gelir.
 */
export function lengthRange() {
  return {
    minMeters: 0,
    maxMeters: LEN_MAX_METERS,
    maxMm: LEN_MAX_METERS / LENGTH.mm,
    maxMil: LEN_MAX_METERS / LENGTH.mil,
    maxUm: LEN_MAX_METERS / LENGTH.um,
  }
}

// PCB veri sayfalarında sık geçen yol/aralık ölçüleri (mil). Yalnızca hazır
// karşılaştırma listesidir; hesaba girmez.
export const COMMON_MIL = [3, 4, 5, 6, 8, 10, 12, 20]

// Birim çarpanı: bilinmeyen birim NaN döner, sessizce 1 kabul edilmez.
export function unitFactor(unit) {
  const f = LENGTH[unit]
  return f === undefined ? NaN : f
}

export function toMeters(value, unit) {
  const f = unitFactor(unit)
  return Number.isFinite(f) ? value * f : NaN
}

export function fromMeters(meters, unit) {
  const f = unitFactor(unit)
  return Number.isFinite(f) ? meters / f : NaN
}

/**
 * İki birim arasında çift yönlü dönüşüm. Ara adım daima metredir; bu sayede
 * birim çiftlerinin ayrı ayrı katsayı tablosuna gerek kalmaz.
 */
export function convertLength(value, from, to) {
  if (!Number.isFinite(value)) {
    return { error: LEN_ERR_INVALID }
  }
  const fFrom = unitFactor(from)
  const fTo = unitFactor(to)
  if (!Number.isFinite(fFrom) || !Number.isFinite(fTo)) {
    return { error: LEN_ERR_UNIT }
  }
  const meters = value * fFrom
  const converted = meters / fTo
  // Aşırı büyük girişte ara değer ya da sonuç kayan nokta aralığının dışına
  // taşar (ör. 1e308 m → µm). Infinity'yi geçerli bir sonuç gibi döndürmek,
  // tanımsız bir değeri sayı diye göstermek olurdu.
  if (!Number.isFinite(meters) || !Number.isFinite(converted)) {
    return { error: LEN_ERR_RANGE }
  }
  return { value: converted, meters, from, to }
}

/**
 * Tek bir uzunluğun tüm gösterim birimlerindeki karşılığı. Yalnızca dönüşüm
 * yapar; biçimlendirme arayüz katmanının işidir.
 *
 * Uzunluk çok büyükse küçük birimlerin karşılığı temsil edilemez (1e303 m'nin
 * µm karşılığı 1e309'dur); yarısı Infinity olan bir tablo döndürmek yerine
 * hiç tablo döndürülmez.
 */
export function allLengths(meters) {
  if (!Number.isFinite(meters)) return null
  const out = {
    m: meters,
    cm: meters / LENGTH.cm,
    mm: meters / LENGTH.mm,
    um: meters / LENGTH.um,
    mil: meters / LENGTH.mil,
    inch: meters / LENGTH.inch,
  }
  return Object.values(out).every((x) => Number.isFinite(x)) ? out : null
}

/**
 * Tam kural (1/0.0254) ile yuvarlatılmış 39.3701 kuralının aynı uzunluk için
 * verdiği mil değerlerini karşılaştırır. Yuvarlatılmış kuralın nerede görünür
 * hale geldiğini göstermek içindir.
 *
 * Aşırı büyük uzunlukta iki mil değeri de kayan nokta aralığını aşar; fark
 * o zaman ∞ − ∞ = NaN olur ve ekranda "—" diye maskelenirdi. Bu durumda
 * karşılaştırma hiç üretilmez.
 */
export function roundingComparison(meters) {
  if (!Number.isFinite(meters)) return null
  const mm = meters / LENGTH.mm
  const exact = mm * MIL_PER_MM
  const rounded = mm * MIL_PER_MM_ROUNDED
  const diff = rounded - exact
  if (!Number.isFinite(exact) || !Number.isFinite(rounded) || !Number.isFinite(diff)) return null
  return {
    mm,
    exact,
    rounded,
    diff,
    relPct: exact !== 0 ? (100 * diff) / exact : 0,
  }
}

/**
 * Hazır mil listesinde girilen uzunluğa en yakın kaydın indeksi.
 * Uzunluk listenin dışında kalıyorsa -1 döner — uzak bir değeri "en yakın"
 * diye işaretlemek yanıltıcı olurdu.
 */
export function nearestCommonMil(milValue, list = COMMON_MIL) {
  if (!Number.isFinite(milValue) || list.length === 0) return -1
  const lo = Math.min(...list)
  const hi = Math.max(...list)
  if (milValue < lo || milValue > hi) return -1
  let best = -1
  let bestDiff = Infinity
  list.forEach((mil, i) => {
    const d = Math.abs(mil - milValue)
    if (d < bestDiff) {
      bestDiff = d
      best = i
    }
  })
  return best
}
