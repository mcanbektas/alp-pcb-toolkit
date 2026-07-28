// Bakır kalınlığı dönüşümleri (spec §4.1.2, §4.3).
// Girişler ve çıkışlar SI: metre. Bakır ağırlığı oz/ft² olarak verilir.

import { copperThicknessFromWeight, OZ_NOMINAL_UM, LENGTH } from './units'
import { sheetResistance } from './plane'

export const COPPER_ERR_INVALID = 'invalid'
export const COPPER_ERR_TOLERANCE = 'tolerance'

// Endüstri nominal tablosu ile yoğunluktan türetilen değer arasındaki fark
// bilinçli olarak ikisi birden gösterilir: tablo üretim pratiğini, türetilmiş
// değer fiziği yansıtır. Hangisinin kullanıldığı ekranda belirtilir.
export const NOMINAL_UM_PER_OZ = 35

// Nominal tablonun satırları, SAYISAL sırada (spec §4.1.2).
//
// `Object.keys` JS'te tam sayı benzeri anahtarları (1, 2, 3, 4) artan sırada
// öne alır, kalanları ekleme sırasına göre arkaya koyar; ham hâliyle sıra
// [1, 2, 3, 4, 0.5, 1.5] olur. Bu sıra kullanıcıya gösterildiği için burada
// bir kez sayısal olarak sabitlenir.
export const OZ_NOMINAL_ROWS = Object.keys(OZ_NOMINAL_UM)
  .map(Number)
  .sort((a, b) => a - b)
  .map((oz) => ({ oz, um: OZ_NOMINAL_UM[oz], t: OZ_NOMINAL_UM[oz] * 1e-6 }))

// Ağırlık → kalınlık için iki yöntem (spec §4.1.2). Varsayılan nominal tablodur;
// yoğunluktan türetilen değer ek bir yoldur, varsayılanı değiştirmez.
export const METHOD_NOMINAL = 'nominal'
export const METHOD_DERIVED = 'derived'

// Seçim anahtarından (string) nominal satır. Tabloda yoksa null döner —
// bilinmeyen anahtar sessizce bir değere düşmez.
export function nominalRow(key) {
  return OZ_NOMINAL_ROWS.find((row) => String(row.oz) === String(key)) ?? null
}

// Seçilen yönteme göre bakır ağırlığından kalınlık (m).
export function thicknessFromWeight(oz, method = METHOD_NOMINAL) {
  return method === METHOD_DERIVED ? derivedThickness(oz) : nominalThickness(oz)
}

/**
 * Verilen kalınlığa en yakın SİPARİŞ EDİLEBİLİR nominal bakır ağırlığı
 * (spec §12 "üretim için önerilen değer").
 *
 * Aday küme yalnızca §4.1.2'nin altı basamağıdır: sipariş ara değerden değil
 * bu basamaklardan verilir. Eşit uzaklıkta kalın basamak seçilir — üretimde
 * fazla bakır güvenli taraftır.
 *
 * Döner: { oz, um, t, exact, deltaPct, outOfRange } | null
 */
export function nearestNominalWeight(t_m) {
  if (!(t_m > 0)) return null

  let best = OZ_NOMINAL_ROWS[0]
  for (const row of OZ_NOMINAL_ROWS) {
    if (Math.abs(row.t - t_m) <= Math.abs(best.t - t_m)) best = row
  }

  const first = OZ_NOMINAL_ROWS[0]
  const last = OZ_NOMINAL_ROWS[OZ_NOMINAL_ROWS.length - 1]

  return {
    oz: best.oz,
    um: best.um,
    t: best.t,
    // "Tam oturuyor" kayan nokta eşitliğiyle sınanmaz: 105 × 1e-6 ile 105e-6
    // son bitte farklıdır. Bağıl yuvarlama payı mühendislik toleransı değil,
    // yalnızca kayan nokta gürültüsü içindir.
    exact: Math.abs(best.t - t_m) <= 1e-12 * Math.max(best.t, t_m),
    // Önerilen basamağın girilen kalınlığa göre sapması
    deltaPct: (100 * (best.t - t_m)) / t_m,
    // Tablo aralığının dışındaysa öneri uç basamağa yapışır; sonuç bir
    // yuvarlama değil, aralık dışı uyarısıdır.
    outOfRange: t_m < first.t || t_m > last.t,
  }
}

export function nominalThickness(oz) {
  if (!(oz > 0)) return NaN
  const exact = OZ_NOMINAL_UM[oz]
  // Tabloda olmayan ağırlıklar için doğrusal nominal kural
  return (exact ?? oz * NOMINAL_UM_PER_OZ) * 1e-6
}

export function derivedThickness(oz) {
  if (!(oz > 0)) return NaN
  return copperThicknessFromWeight(oz)
}

// Kalınlıktan bakır ağırlığına (nominal kurala göre)
export function weightFromThickness(t_m) {
  if (!(t_m > 0)) return NaN
  return (t_m * 1e6) / NOMINAL_UM_PER_OZ
}

/**
 * Başlangıç (folyo) ve bitmiş kalınlık.
 *
 * Dış katmanlarda delik kaplaması yüzeye de bakır ekler, bu yüzden bitmiş
 * kalınlık folyo kalınlığından fazladır. İç katmanlarda kaplama yoktur.
 * Elektriksel kesit hesabında bitmiş kalınlık kullanılır.
 */
export function finishedThickness({ starting, plating = 0, layer = 'external' }) {
  if (!(starting > 0)) return { error: COPPER_ERR_INVALID, message: 'Başlangıç kalınlığı pozitif olmalı.' }
  if (plating < 0) return { error: COPPER_ERR_INVALID, message: 'Kaplama kalınlığı negatif olamaz.' }

  const added = layer === 'external' ? plating : 0
  return {
    starting,
    plating: added,
    finished: starting + added,
    layer,
    // Kaplamanın kesite katkısı — ince folyoda oran büyüktür
    platingShare: starting + added > 0 ? added / (starting + added) : 0,
  }
}

// Tüm gösterim birimlerini tek seferde üretir. Yalnızca dönüşüm yapar,
// yuvarlama yapmaz — biçimlendirme arayüz katmanının işidir.
export function allUnits(t_m) {
  if (!(t_m > 0)) return null
  return {
    m: t_m,
    mm: t_m / LENGTH.mm,
    um: t_m / LENGTH.um,
    mil: t_m / LENGTH.mil,
    inch: t_m / LENGTH.inch,
    ozNominal: weightFromThickness(t_m),
  }
}

// Kesit alanı ve kare direnci — dönüştürülen kalınlığın ne işe yaradığını
// göstermek için (spec §4.1.3).
export function crossSection({ t, W }) {
  if (!(t > 0) || !(W > 0)) return null
  return { area: t * W, t, W }
}

// Trapez kesit: aşındırma nedeniyle üst ve alt genişlik farklıdır (spec §4.1.3)
//   A = t · (W_top + W_bottom) / 2
//   W_top = W_bottom · (1 − E)
export function trapezoidArea({ t, Wbottom, etchFactor = 0 }) {
  if (!(t > 0) || !(Wbottom > 0)) return { error: COPPER_ERR_INVALID, message: 't ve alt genişlik pozitif olmalı.' }
  if (etchFactor < 0 || etchFactor >= 1) {
    return { error: COPPER_ERR_INVALID, message: 'Aşındırma oranı 0 ile 1 arasında olmalı.' }
  }

  const Wtop = Wbottom * (1 - etchFactor)
  const area = (t * (Wtop + Wbottom)) / 2
  const rectangular = t * Wbottom

  return {
    Wtop, Wbottom, area, rectangular,
    // Dikdörtgen varsayımının ne kadar iyimser olduğu
    lossPct: rectangular > 0 ? (100 * (rectangular - area)) / rectangular : 0,
  }
}

// --- Tolerans analizi (spec §3.4) ---

// Bir büyüklüğün ± bağıl toleransla aldığı iki sınır. Tolerans sıfırken iki
// sınır da değerin kendisidir; çarpma 1 ile yapıldığı için kayan noktada da
// birebir aynı sayı çıkar, yani min = nominal = maks garanti olur.
const boundsOf = (x, tol) => [x * (1 - tol), x * (1 + tol)]

// Tek bir köşenin (tek bir giriş üçlüsünün) sonuçları.
function cornerAt({ s, p, e, W, T }) {
  const finished = s + p
  const trap = trapezoidArea({ t: finished, Wbottom: W, etchFactor: e })
  return {
    starting: s,
    plating: p,
    etch: e,
    finished,
    // Kesit alanı trapez kesittir; E = 0 iken dikdörtgenle birebir aynı çıkar.
    area: trap.error ? NaN : trap.area,
    // R_□ = ρ(T)/t — genişliğe ve aşındırmaya bağlı değildir, bu yüzden
    // aşındırma toleransı bu büyüklüğü hiç oynatmaz.
    Rsheet: sheetResistance(finished, T),
  }
}

// Bir büyüklüğün köşeler üzerindeki uçları + nominale göre sapması.
function spanOf(points, nominal, pick) {
  const values = points.map(pick).filter(Number.isFinite)
  if (values.length === 0) return null
  const nom = pick(nominal)
  const min = Math.min(...values)
  const max = Math.max(...values)
  return {
    min, nom, max,
    minPct: nom > 0 ? (100 * (min - nom)) / nom : 0,
    maxPct: nom > 0 ? (100 * (max - nom)) / nom : 0,
    spreadPct: nom > 0 ? (100 * (max - min)) / nom : 0,
  }
}

/**
 * Worst-case köşe taraması (spec §3.4).
 *
 * Spec basit worst-case yaklaşımında "girişlerin tüm sınır kombinasyonlarının"
 * değerlendirilmesini istiyor. Burada toleranslı üç giriş vardır — folyo
 * kalınlığı, kaplama kalınlığı ve aşındırma oranı — yani 2³ = 8 köşe taranır.
 * İstenen üç sonuç (minimum · nominal · maksimum) bitmiş kalınlık, kesit alanı
 * ve kare direnci için ayrı ayrı döner.
 *
 * Toleranslar BAĞIL kesirdir: 0.1 = ±%10. Sıfır tolerans o girişi sabitler.
 *
 * Nominal nokta da taramaya katılır. Üç sonuç da her girişte monoton olduğu
 * için köşeler zaten gerçek uçları verir; nominalin de katılması, tolerans
 * sıfırken min = nominal = maks çıkmasını taramadan bağımsız olarak garanti
 * eder.
 *
 * Döner: { tol, active, corners, finished, area, Rsheet } | { error }
 */
export function toleranceCorners({
  starting, plating = 0, layer = 'external', W, etchFactor = 0, T = 20, tol = {},
}) {
  if (!(starting > 0) || !(W > 0)) {
    return { error: COPPER_ERR_INVALID, message: 'Başlangıç kalınlığı ve yol genişliği pozitif olmalı.' }
  }
  if (plating < 0) return { error: COPPER_ERR_INVALID, message: 'Kaplama kalınlığı negatif olamaz.' }
  if (etchFactor < 0 || etchFactor >= 1) {
    return { error: COPPER_ERR_INVALID, message: 'Aşındırma oranı 0 ile 1 arasında olmalı.' }
  }

  const ts = tol.starting ?? 0
  const tp = tol.plating ?? 0
  const te = tol.etch ?? 0
  // %100 tolerans folyoyu sıfırlar; kalınlık sıfırken kare direnci tanımsızdır.
  // Bu yüzden üst uç dahil değildir.
  for (const t of [ts, tp, te]) {
    if (!(t >= 0) || t >= 1) {
      return { error: COPPER_ERR_TOLERANCE, message: 'Her tolerans 0 ile %100 arasında olmalı (100 hariç).' }
    }
  }
  // Aşındırma oranının üst ucu %100'e ulaşırsa üst genişlik sıfırlanır.
  if (etchFactor * (1 + te) >= 1) {
    return { error: COPPER_ERR_TOLERANCE, message: 'Toleransın üst ucu aşındırma oranını %100 yapıyor.' }
  }

  // İç katmanda kaplama bitmiş kalınlığa hiç girmez; toleransı da girmez.
  const platedNom = layer === 'external' ? plating : 0
  const platedTol = layer === 'external' ? tp : 0

  const corners = []
  for (const s of boundsOf(starting, ts)) {
    for (const p of boundsOf(platedNom, platedTol)) {
      for (const e of boundsOf(etchFactor, te)) corners.push(cornerAt({ s, p, e, W, T }))
    }
  }

  const nominal = cornerAt({ s: starting, p: platedNom, e: etchFactor, W, T })
  const scanned = [...corners, nominal]

  const finishedSpan = spanOf(scanned, nominal, (c) => c.finished)
  const areaSpan = spanOf(scanned, nominal, (c) => c.area)
  const RsheetSpan = spanOf(scanned, nominal, (c) => c.Rsheet)
  // Yukarıdaki denetimlerden sonra köşelerin hepsi sonlu olmalıdır. Yine de
  // sonlu olmayan bir uç çıkarsa eksik üçlü döndürmek yerine hata döner —
  // çağıran taraf "hesaplanamadı" der, yarım bir aralık göstermez.
  if (!finishedSpan || !areaSpan || !RsheetSpan) {
    return { error: COPPER_ERR_TOLERANCE, message: 'Tolerans köşelerinden geçerli sonuç çıkmadı.' }
  }

  return {
    tol: { starting: ts, plating: platedTol, etch: te },
    // Hiçbir tolerans girilmemişse üçlü tek bir sayıya çöker; çağıran taraf
    // buna bakarak tolerans bölümünü hiç göstermeyebilir.
    active: ts > 0 || platedTol > 0 || te > 0,
    corners,
    nominal,
    finished: finishedSpan,
    area: areaSpan,
    Rsheet: RsheetSpan,
  }
}
