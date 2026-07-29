// Reaktans ve seri RLC (spec §9.9). Girişler SI: Ω, H, F, Hz.

const isNum = (x) => Number.isFinite(x)

export const reactanceC = (f, C) => (f > 0 && C > 0 ? 1 / (2 * Math.PI * f * C) : NaN)
export const reactanceL = (f, L) => (f >= 0 && L >= 0 ? 2 * Math.PI * f * L : NaN)

export function seriesRLC({ R, L, C, f }) {
  if (!isNum(R) || !isNum(L) || !isNum(C) || !isNum(f) || R < 0 || L < 0 || C <= 0 || f <= 0) {
    return { error: 'invalid' }
  }

  const w = 2 * Math.PI * f
  const XL = w * L
  const XC = 1 / (w * C)
  const X = XL - XC
  const magnitude = Math.hypot(R, X)
  const phase = Math.atan2(X, R)

  const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C))
  const w0 = 2 * Math.PI * f0
  const Q = R > 0 ? (w0 * L) / R : Infinity
  const BW = Q > 0 ? f0 / Q : NaN

  // Rezonansta XL − XC kayan nokta hatası kadar sıfırdan sapar; tam sıfır
  // beklemek f₀'da "kapasitif" gibi yanlış bir sınıflandırma üretir.
  const negligible = Math.abs(X) <= 1e-9 * Math.max(XL, XC)

  return {
    XL, XC, X, magnitude, phase, phaseDeg: (phase * 180) / Math.PI,
    real: R, imag: X,
    f0, Q, BW,
    kind: negligible ? 'resistive' : X > 0 ? 'inductive' : 'capacitive',
  }
}
