// Via özellikleri ve termal via dizisi (spec §5.1, §5.2).
// Girişler SI: m, m², A, V, Ω, H, F, °C.

import { rhoCuAt, K_CU, EPS0 } from './units'

export const VIA_ERR_INVALID = 'invalid'
export const VIA_ERR_THIN = 'thin-plating'

// --- §5.1.1 Geometri ---

// Barrel dış çapı: D_o = D_f + 2·t_p
export function barrelOuterDiameter(Df, tp) {
  if (!(Df > 0) || !(tp > 0)) return NaN
  return Df + 2 * tp
}

/**
 * §5.1.2 Barrel kesit alanı.
 *
 * Tam halka alanı kullanılır: A = π/4·(D_o² − D_f²) = π·t_p·(D_f + t_p).
 *
 * İnce kaplama yaklaşımı (A ≈ π·D_f·t_p) tam olarak π·t_p² kadar eksik kalır,
 * yani alanı küçük gösterir ve direnci yüksek tahmin eder — konservatiftir.
 * Yalnızca t_p ≪ D_f olduğunda kullanılmalıdır; ikisi birlikte döner ki sapma
 * görülebilsin.
 */
export function barrelArea(Df, tp) {
  if (!(Df > 0) || !(tp > 0)) {
    return { error: VIA_ERR_INVALID, message: 'Delik çapı ve kaplama kalınlığı pozitif olmalı.' }
  }

  const Do = barrelOuterDiameter(Df, tp)
  const exact = (Math.PI / 4) * (Do * Do - Df * Df)
  const thin = Math.PI * Df * tp

  return {
    Do,
    area: exact,
    thinApprox: thin,
    // İnce yaklaşımın sapması — kaplama kalınlaştıkça büyür
    thinErrorPct: exact > 0 ? (100 * (thin - exact)) / exact : NaN,
    ratio: tp / Df,
  }
}

// --- §5.1.3 – §5.1.7 Elektriksel ---

export function viaElectrical({ Df, tp, H, I, T = 20, VdropMax = null, IsingleMax = null, Nmin = 1 }) {
  const b = barrelArea(Df, tp)
  if (b.error) return b
  if (!(H > 0) || !(I > 0)) {
    return { error: VIA_ERR_INVALID, message: 'Via uzunluğu ve akım pozitif olmalı.' }
  }

  const R = (rhoCuAt(T) * H) / b.area
  const Vdrop = I * R
  const Ploss = I * I * R
  const J = I / b.area

  // §5.1.6 Gerekli paralel via sayısı — iki ayrı kısıt ve kullanıcı alt sınırı
  const Ncurrent = IsingleMax > 0 ? Math.ceil(I / IsingleMax) : 1
  const Nvoltage = VdropMax > 0 ? Math.ceil((I * R) / VdropMax) : 1
  const N = Math.max(Ncurrent, Nvoltage, Nmin > 0 ? Math.ceil(Nmin) : 1)

  return {
    ...b,
    H, I, T, R,
    Vdrop, Ploss, J,
    Ncurrent, Nvoltage, N,
    // N via paralel bağlandığında
    Rparallel: R / N,
    VdropParallel: (I * R) / N,
    PlossParallel: (I * I * R) / N,
    IperVia: I / N,
    JperVia: I / N / b.area,
  }
}

// --- §5.1.8 Annular ring ---

export function annularRing({ Dpad, Ddrill, positionTol = 0, etchTol = 0 }) {
  if (!(Dpad > 0) || !(Ddrill > 0)) {
    return { error: VIA_ERR_INVALID, message: 'Pad ve delik çapı pozitif olmalı.' }
  }
  if (Ddrill >= Dpad) {
    return { error: VIA_ERR_INVALID, message: 'Pad çapı delik çapından büyük olmalı.' }
  }

  const nominal = (Dpad - Ddrill) / 2
  // Worst-case: delik konum kayması ve pad aşındırması ringi tek yönde yer
  const worst = nominal - positionTol - etchTol

  return {
    nominal,
    worst,
    positionTol,
    etchTol,
    // Ring tamamen kaybolduğunda delik pad kenarını kırar
    breakout: worst <= 0,
  }
}

// --- §5.1.9 Aspect ratio ---
//
// Bazı üreticiler bitmiş delik çapını, bazıları matkap çapını kullanır.
// Hangisinin kullanıldığı sonuçla birlikte döner; sabit bir üretilebilirlik
// sınırı kodlanmaz, sınır kullanıcı veya üretici profilinden gelir.
export function aspectRatio({ boardThickness, diameter, basis = 'drill' }) {
  if (!(boardThickness > 0) || !(diameter > 0)) return NaN
  return { ratio: boardThickness / diameter, basis }
}

// --- §5.1.10 Via endüktansı ---
//
// L[nH] ≈ 0.2·H[mm]·[ln(4H/D) + 1]
// İzole tek iletken self-endüktansıdır; dönüş yolu ve referans düzlemler
// hesaba girmez. Gerçekte önemli olan sinyal + dönüş yolunun loop endüktansıdır.
export function viaInductance({ H, D }) {
  if (!(H > 0) || !(D > 0)) return NaN
  const H_mm = H * 1e3
  const D_mm = D * 1e3
  const L_nH = 0.2 * H_mm * (Math.log((4 * H_mm) / D_mm) + 1)
  return L_nH * 1e-9
}

// --- §5.1.11 Via kapasitesi ---
//
// C[pF] ≈ 0.0555·εr·H[mm]·D_pad[mm] / (D_antipad[mm] − D_pad[mm])
// Yalnızca basit dairesel pad-antipad yapısı için yaklaşıktır.
export function viaCapacitance({ H, Dpad, Dantipad, epsR }) {
  if (!(H > 0) || !(Dpad > 0) || !(Dantipad > Dpad) || !(epsR > 0)) return NaN
  const C_pF = (0.0555 * epsR * H * 1e3 * Dpad * 1e3) / ((Dantipad - Dpad) * 1e3)
  return C_pF * 1e-12
}

// Via parazitiklerinden gelen karakteristik empedans ve gecikme —
// süreksizliğin büyüklüğünü tek sayıya indirmek için
export function viaDiscontinuity({ L, C }) {
  if (!(L > 0) || !(C > 0)) return null
  return {
    Z: Math.sqrt(L / C),
    delay: Math.sqrt(L * C),
  }
}

// --- §5.2 Termal via dizisi ---

/**
 * Barrel üzerinden termal direnç: R_θ = H / (k·A)
 *
 * Bakır dolgulu via varsa dolgu alanı da iletir. Sonuç sistemin toplam termal
 * direnci DEĞİLDİR: üst ve alt bakır yayılımı ile ortam direnci ayrıca vardır.
 */
export function thermalVia({ Df, tp, H, N = 1, filled = false, deltaT = null, k = K_CU }) {
  const b = barrelArea(Df, tp)
  if (b.error) return b
  if (!(H > 0) || !(N >= 1)) {
    return { error: VIA_ERR_INVALID, message: 'Via uzunluğu ve sayısı pozitif olmalı.' }
  }

  const fillArea = filled ? (Math.PI * Df * Df) / 4 : 0
  const area = b.area + fillArea

  const single = H / (k * area)
  const parallel = single / N

  return {
    ...b,
    area,
    fillArea,
    filled,
    H, N, k,
    Rsingle: single,
    Rarray: parallel,
    // Isı akısı yalnızca sıcaklık farkı verildiğinde anlamlıdır
    Q: deltaT > 0 ? deltaT / parallel : null,
    // Via sayısını iki katına çıkarmanın getirisi azalır çünkü toplam direnç
    // yalnızca bu terimden ibaret değildir; oran yine de gösterilir
    improvementVsOne: single / parallel,
  }
}

// Belirli bir ısıyı taşımak için gereken via sayısı
export function thermalViaCount({ Df, tp, H, deltaT, Q, filled = false, k = K_CU }) {
  if (!(deltaT > 0) || !(Q > 0)) {
    return { error: VIA_ERR_INVALID, message: 'Sıcaklık farkı ve ısı pozitif olmalı.' }
  }
  const one = thermalVia({ Df, tp, H, N: 1, filled, k })
  if (one.error) return one

  const Rneeded = deltaT / Q
  return {
    Rneeded,
    N: Math.ceil(one.Rsingle / Rneeded),
    Rsingle: one.Rsingle,
  }
}
