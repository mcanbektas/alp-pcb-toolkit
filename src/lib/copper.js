// Bakır kalınlığı dönüşümleri (spec §4.1.2, §4.3).
// Girişler ve çıkışlar SI: metre. Bakır ağırlığı oz/ft² olarak verilir.

import { copperThicknessFromWeight, OZ_NOMINAL_UM, LENGTH } from './units'

export const COPPER_ERR_INVALID = 'invalid'

// Endüstri nominal tablosu ile yoğunluktan türetilen değer arasındaki fark
// bilinçli olarak ikisi birden gösterilir: tablo üretim pratiğini, türetilmiş
// değer fiziği yansıtır. Hangisinin kullanıldığı ekranda belirtilir.
export const NOMINAL_UM_PER_OZ = 35

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
