// Güç düzlemi ve paralel yol direnci (spec §4.2).
// Girişler SI: m, m², A, Ω, °C.

import { rhoCuAt } from './units'

export const PLANE_ERR_INVALID = 'invalid'

// Kare direnci (sheet resistance): R_□ = ρ(T) / t
// Düzlem hesabının doğal birimi budur — geometri "kaç kare" olduğuyla girer.
export function sheetResistance(t_m, T_C = 20) {
  if (!(t_m > 0)) return NaN
  return rhoCuAt(T_C) / t_m
}

// Düzgün genişlikte bir bakır şeridin direnci: R = R_□ · (L / W)
export function stripResistance({ L, W, t, T = 20 }) {
  if (!(L > 0) || !(W > 0) || !(t > 0)) {
    return { error: PLANE_ERR_INVALID, message: 'L, W ve t pozitif olmalı.' }
  }
  const Rsheet = sheetResistance(t, T)
  const squares = L / W
  return { R: Rsheet * squares, Rsheet, squares, L, W, t, T }
}

/**
 * Güç düzlemi.
 *
 * Geniş bir bakır poligonunda akım dağılımı düzgün değildir: dar boyun
 * bölgeleri, pad girişleri ve via kümeleri akımı yoğunlaştırır. Bu yüzden tek
 * bir sayı yerine iki uç birlikte hesaplanır — ortalama genişlik iyimser,
 * minimum boyun kötümser sınırı verir. Gerçek değer ikisinin arasındadır.
 */
export function powerPlane({ L, Wavg, Wneck, t, I, T = 20, Vsupply = null }) {
  if (!(L > 0) || !(Wavg > 0) || !(Wneck > 0) || !(t > 0) || !(I > 0)) {
    return { error: PLANE_ERR_INVALID, message: 'Tüm geometri ve akım değerleri pozitif olmalı.' }
  }
  if (Wneck > Wavg) {
    return { error: PLANE_ERR_INVALID, message: 'Boyun genişliği ortalama genişlikten büyük olamaz.' }
  }

  const avg = stripResistance({ L, W: Wavg, t, T })
  const neck = stripResistance({ L, W: Wneck, t, T })

  const build = (s) => ({
    ...s,
    Vdrop: I * s.R,
    Ploss: I * I * s.R,
    J: I / (s.W * t), // A/m²
    pct: Vsupply > 0 ? (100 * I * s.R) / Vsupply : null,
  })

  return {
    average: build(avg),
    neck: build(neck),
    Rsheet: avg.Rsheet,
    // Boyun bölgesi direncin kaç katına çıktığını gösterir
    neckFactor: neck.R / avg.R,
    I, T, t,
  }
}

/**
 * Paralel yollar.
 *
 * Akım iletkenlikle orantılı dağılır: I_i = I · (1/R_i) / Σ(1/R_j).
 * Eşit geometride pay eşittir, ama farklı uzunluk veya genişlikte değildir —
 * en kısa/en geniş yol en çok akımı çeker ve en çok ısınır.
 */
export function parallelTraces({ traces, I, T = 20 }) {
  if (!Array.isArray(traces) || traces.length === 0) {
    return { error: PLANE_ERR_INVALID, message: 'En az bir yol gerekli.' }
  }
  if (!(I > 0)) return { error: PLANE_ERR_INVALID, message: 'Toplam akım pozitif olmalı.' }

  const branches = []
  for (const tr of traces) {
    const s = stripResistance({ L: tr.L, W: tr.W, t: tr.t, T })
    if (s.error) return s
    branches.push(s)
  }

  const totalG = branches.reduce((a, b) => a + 1 / b.R, 0)
  const Req = 1 / totalG

  const detailed = branches.map((b) => {
    const share = 1 / b.R / totalG
    const Ii = I * share
    return {
      ...b,
      share,
      I: Ii,
      Vdrop: Ii * b.R,
      Ploss: Ii * Ii * b.R,
      J: Ii / (b.W * b.t),
    }
  })

  const shares = detailed.map((b) => b.share)
  const imbalance = Math.max(...shares) - Math.min(...shares)

  return {
    Req,
    branches: detailed,
    I,
    Vdrop: I * Req,
    Ploss: I * I * Req,
    // Eşit paydan sapma: 0 ise akım tam eşit dağılıyor
    imbalance,
    equalShare: 1 / traces.length,
    hottest: detailed.reduce((a, b) => (b.J > a.J ? b : a)),
  }
}

// Tek bir yolun aynı akımı taşıması için gereken genişlik — paralel yolların
// kaç kat bakır tasarrufu sağladığını göstermek için.
export function equivalentSingleWidth({ Req, L, t, T = 20 }) {
  if (!(Req > 0) || !(L > 0) || !(t > 0)) return NaN
  return (rhoCuAt(T) * L) / (Req * t)
}
