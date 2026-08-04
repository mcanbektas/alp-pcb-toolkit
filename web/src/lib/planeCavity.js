// Düzlem kavite rezonansı ve kapasitansı (REV2 §11).
//
// Bu motor mevcut GÜÇ DÜZLEMİ VE PARALEL YOL (`plane.js`, `power-plane` aracı)
// İLE FARKLI ve AYRI bir araçtır: `plane.js` DC akım taşıma ve paralel yol
// direncini (kare direnç üzerinden) hesaplar; bu motor dikdörtgen bir
// power-ground plane çiftinin GEOMETRİK KAVİTE REZONANSINI ve düzlem
// kapasitansını hesaplar. `plane.js` silinmedi, route'u kullanılmadı, içeriği
// kopyalanmadı (REV2 §11 giriş notu, kararlar §8).
//
// Solid power plane yapılarında geometrik rezonanslar oluşabilir; bu yüzden tek
// başına lumped plane capacitance yeterli değildir (REV2 §11.1).

import { EPS0, C0 } from './units'

export const PC_ERR_INVALID = 'invalid'
export const PC_ERR_MODE_INDEX = 'mode-index-invalid'
export const PC_ERR_STITCHING_N = 'stitching-divisor-invalid'

const STITCHING_N_OPTIONS = [10, 20, 40]

// C = ε0·εr·A/d — ideal paralel plaka (REV2 §11.3). Saçak alanları (fringing)
// ve düzlem boşlukları (splits) bu modelde YOKTUR.
export function planeCapacitance({ epsR, area, d }) {
  if (!(epsR > 0) || !(area > 0) || !(d > 0)) return NaN
  return (EPS0 * epsR * area) / d
}

// A = a·b — dikdörtgen plane alanı (REV2 §11.3).
export function rectangleArea({ a, b }) {
  if (!(a > 0) || !(b > 0)) return NaN
  return a * b
}

// C' = C/A = ε0·εr/d — alan başına kapasitans (REV2 §11.4). Alandan bağımsızdır;
// C/A bölmesi yerine DOĞRUDAN formülden hesaplanır — REV2 §11.4 ifadesiyle birebir.
export function capacitancePerArea({ epsR, d }) {
  if (!(epsR > 0) || !(d > 0)) return NaN
  return (EPS0 * epsR) / d
}

// f_mn = [c / (2√εr)] · √[(m/a)² + (n/b)²] — dikdörtgen cavity mode frekansı
// (REV2 §11.5). m, n negatif olmayan tam sayıdır; m = n = 0 geçersizdir (bu
// DC'dir, bir mod değil).
export function cavityModeFrequency({ m, n, a, b, epsR }) {
  if (!(a > 0) || !(b > 0) || !(epsR > 0)) return NaN
  if (!Number.isInteger(m) || !Number.isInteger(n) || m < 0 || n < 0) return NaN
  if (m === 0 && n === 0) return NaN
  return (C0 / (2 * Math.sqrt(epsR))) * Math.sqrt((m / a) ** 2 + (n / b) ** 2)
}

// [0, mMax] × [0, nMax] içindeki geçerli bütün modları frekansa göre artan
// sırada döner — (0,0) hariç. REV2 §11.9 "ilk 10 veya 20 cavity mode" ve
// §11.10 "mode index heatmap" bu listeden beslenir; kaçının gösterileceği
// ekran katmanının kararıdır, `limit` verilirse ilk o kadarı döner.
//
// Döner: { modes: [{ m, n, freq }, ...] } veya { error: KOD }
export function firstCavityModes({ a, b, epsR, mMax, nMax, limit = null }) {
  if (!(a > 0) || !(b > 0) || !(epsR > 0)) return { error: PC_ERR_INVALID }
  if (!Number.isInteger(mMax) || !Number.isInteger(nMax) || mMax < 0 || nMax < 0) {
    return { error: PC_ERR_MODE_INDEX }
  }

  const modes = []
  for (let m = 0; m <= mMax; m++) {
    for (let n = 0; n <= nMax; n++) {
      if (m === 0 && n === 0) continue
      modes.push({ m, n, freq: cavityModeFrequency({ m, n, a, b, epsR }) })
    }
  }
  modes.sort((x, y) => x.freq - y.freq)
  return { modes: limit !== null && limit > 0 ? modes.slice(0, limit) : modes }
}

// En düşük cavity resonance daima (1,0) veya (0,1) modundadır: m/a veya n/b
// artışı frekansı monoton artırır, dolayısıyla minimum, tek endeksin sıfır
// olduğu iki uç moddan gelir (REV2 §11.5, §11.9 "en düşük cavity resonance").
export function lowestCavityResonance({ a, b, epsR }) {
  const f10 = cavityModeFrequency({ m: 1, n: 0, a, b, epsR })
  const f01 = cavityModeFrequency({ m: 0, n: 1, a, b, epsR })
  if (!Number.isFinite(f10) || !Number.isFinite(f01)) return NaN
  return Math.min(f10, f01)
}

// Q_d ≈ 1/tanδ — yalnızca dielektrik kaybı dikkate alınırsa (REV2 §11.6).
export function dielectricQ({ lossTangent }) {
  if (!(lossTangent > 0)) return NaN
  return 1 / lossTangent
}

// 1/Q_total = 1/Q_d + 1/Q_c + 1/Q_r + 1/Q_loading (REV2 §11.6). Q_c, Q_r veya
// yükleme DEĞERİ bilinmiyorsa toplam Q hesaplanmış GİBİ gösterilmez: eksik
// girdide `null` döner — bu bir hata değil, bilinçli bir eksikliktir (bkz.
// motor tasarım kararları: opsiyonel bloklar uydurma varsayılanla doldurulmaz).
export function totalQ({ qd, qc = null, qr = null, qLoading = null }) {
  if (!(qd > 0)) return NaN
  if (qc === null || qr === null || qLoading === null) return null
  if (!(qc > 0) || !(qr > 0) || !(qLoading > 0)) return NaN
  return 1 / (1 / qd + 1 / qc + 1 / qr + 1 / qLoading)
}

// E_C = ½·C·V² — plane'de depolanan yaklaşık enerji (REV2 §11.7). Tek başına
// load step sağlama kapasitesinin ölçüsü DEĞİLDİR.
export function storedEnergy({ capacitance, voltage }) {
  if (!(capacitance > 0) || !(voltage >= 0)) return NaN
  return 0.5 * capacitance * voltage * voltage
}

// λ_d = c / (f·√εr) — hedef frekansta dielektrik dalga boyu (REV2 §11.8).
export function dielectricWavelength({ frequency, epsR }) {
  if (!(frequency > 0) || !(epsR > 0)) return NaN
  return C0 / (frequency * Math.sqrt(epsR))
}

// s_max = λ_d / N — stitching via aralığı üst sınırı, kullanıcının gerçek
// aralığıyla karşılaştırması (REV2 §11.8/§11.9). N yalnızca 10, 20 veya 40
// olabilir (REV2 §11.8) — peaks.js'teki eşik aralığı denetimiyle aynı desen:
// domain dışı seçim NaN'a gizlenmez, kendi hata koduyla bildirilir.
//
// Döner: { lambda, sMax, actualSpacing, withinLimit } veya { error: KOD }
export function stitchingSpacingCheck({ frequency, epsR, n, actualSpacing = null }) {
  if (!STITCHING_N_OPTIONS.includes(n)) return { error: PC_ERR_STITCHING_N }
  const lambda = dielectricWavelength({ frequency, epsR })
  if (!Number.isFinite(lambda)) return { error: PC_ERR_INVALID }

  const sMax = lambda / n
  return {
    lambda,
    sMax,
    actualSpacing,
    withinLimit: actualSpacing !== null ? actualSpacing <= sMax : null,
  }
}

/**
 * Düzlem kavite rezonansı ve kapasitansının tam değerlendirmesi (REV2 §11.9).
 * Uzunluklar metre, alan m², kapasitans farad, frekans Hz, gerilim volt.
 *
 * `area` verilirse (örtüşen etkin alan dikdörtgen değilse) doğrudan kullanılır;
 * verilmezse a·b'den hesaplanır. a/b, cavity modları için HER ZAMAN gerekir —
 * alan override edilse bile mod frekansları yalnızca a·b'den gelir.
 */
export function planeCavityAnalysis({
  a, b, d, epsR, lossTangent,
  area = null,
  mMax, nMax, modeLimit = null,
  voltage = null,
  qc = null, qr = null, qLoading = null,
  targetFrequency = null, stitchingN = null, actualStitchingSpacing = null,
}) {
  if (!(a > 0) || !(b > 0) || !(d > 0) || !(epsR > 0) || !(lossTangent > 0)) {
    return { error: PC_ERR_INVALID }
  }

  const effectiveArea = area !== null && area > 0 ? area : rectangleArea({ a, b })
  if (!(effectiveArea > 0)) return { error: PC_ERR_INVALID }

  const modesResult = firstCavityModes({ a, b, epsR, mMax, nMax, limit: modeLimit })
  if (modesResult.error) return { error: modesResult.error }

  const qd = dielectricQ({ lossTangent })
  const capacitance = planeCapacitance({ epsR, area: effectiveArea, d })

  // Alt blok deseni gateDriver.js ile aynı: hedef frekans + N verilmezse blok
  // null kalır; verilip N geçersizse blok kendi .error'ını taşır, üst düzey
  // `ok` true kalmaya devam eder (bkz. targetOn/targetOff, Adım 2/3 kararı).
  const stitching = targetFrequency !== null && stitchingN !== null
    ? stitchingSpacingCheck({
      frequency: targetFrequency, epsR, n: stitchingN, actualSpacing: actualStitchingSpacing,
    })
    : null

  return {
    ok: true,
    area: effectiveArea,
    capacitance,
    capacitancePerArea: capacitancePerArea({ epsR, d }),
    modes: modesResult.modes,
    lowestResonance: lowestCavityResonance({ a, b, epsR }),
    dielectricQ: qd,
    // qc/qr/qLoading verilmezse null: toplam Q "hesaplanmış gibi" gösterilmez.
    totalQ: totalQ({ qd, qc, qr, qLoading }),
    // voltage REV2 §11.2 zorunlu girdi listesinde yok; verilmezse enerji null.
    energy: voltage !== null ? storedEnergy({ capacitance, voltage }) : null,
    stitching,
  }
}
