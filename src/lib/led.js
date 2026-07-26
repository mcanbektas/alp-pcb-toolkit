// LED seri direnci (spec §9.8). Girişler SI: V, A, Ω, W.

const isNum = (x) => Number.isFinite(x)

export const LED_ERR_INVALID = 'invalid'
export const LED_ERR_HEADROOM = 'headroom'

export function ledResistor({ Vs, Vf, n = 1, I, derating = 1 }) {
  if (!isNum(Vs) || !isNum(Vf) || !isNum(I) || !(I > 0) || !(n >= 1)) {
    return { error: LED_ERR_INVALID, message: 'Vs, Vf ve I sayısal, I ve n pozitif olmalı.' }
  }

  const Vled = Vf * n
  if (Vled >= Vs) {
    return {
      error: LED_ERR_HEADROOM,
      message: 'Seri LED gerilimi besleme geriliminden düşük olmalı.',
      Vled, Vs,
    }
  }

  const R = (Vs - Vled) / I
  const P = I * I * R
  // Derating 0–1 arası; komponent nominal gücünün bu oranında çalıştırılır
  const d = derating > 0 && derating <= 1 ? derating : 1

  return {
    Vled, R, P,
    Prated: P / d,
    derating: d,
    headroom: Vs - Vled,
  }
}
