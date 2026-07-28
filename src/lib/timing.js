// RC ve RL zaman sabitleri (spec §9.10). Girişler SI: Ω, F, H, s.

function timeConstant(tau) {
  return {
    tau,
    // Yaygın eşikler: %63.2, %86.5, %95, %98.2, %99.3
    t: [1, 2, 3, 4, 5].map((n) => ({ n, time: n * tau, pct: 100 * (1 - Math.exp(-n)) })),
    // %10 → %90 yükselme süresi: t = τ·ln(9)
    riseTime1090: tau * Math.log(9),
  }
}

export function rcTime({ R, C }) {
  if (!(R > 0) || !(C > 0)) return { error: 'invalid' }
  return timeConstant(R * C)
}

export function rlTime({ R, L }) {
  if (!(R > 0) || !(L > 0)) return { error: 'invalid' }
  return timeConstant(L / R)
}

export const chargeVoltage = (Vs, t, tau) => Vs * (1 - Math.exp(-t / tau))
export const dischargeVoltage = (V0, t, tau) => V0 * Math.exp(-t / tau)
export const risingCurrent = (V, R, t, tau) => (V / R) * (1 - Math.exp(-t / tau))
