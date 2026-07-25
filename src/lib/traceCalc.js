// Trace hesap motoru.
// İç hesaplar SI birimleriyle yapılır; ampirik ısınma denklemi ise
// tanımı gereği mil² / A / °C birimlerinde çalışır ve bu açıkça belirtilir.

export const RHO20 = 1.724e-8 // bakır özdirenci, ohm·m @ 20°C
export const ALPHA = 0.00393 // bakır sıcaklık katsayısı, 1/°C

// Klasik ampirik iletken ısınma denklemi: I = k · ΔT^0.44 · A^0.725
// A: mil², I: A, ΔT: °C
const K_COEFF = { external: 0.048, internal: 0.024 }

export const MIL = 0.0254 // 1 mil = 0.0254 mm
export const MIL2_TO_MM2 = 0.00064516 // 1 mil² = 0.00064516 mm²

// Bakır ağırlığı → nominal kalınlık (µm)
export const OZ_TABLE = [
  { key: '0.5', label: '0.5 oz (17.5 µm)', um: 17.5 },
  { key: '1', label: '1 oz (35 µm)', um: 35 },
  { key: '1.5', label: '1.5 oz (52.5 µm)', um: 52.5 },
  { key: '2', label: '2 oz (70 µm)', um: 70 },
  { key: '3', label: '3 oz (105 µm)', um: 105 },
  { key: '4', label: '4 oz (140 µm)', um: 140 },
  { key: 'custom', label: 'Özel kalınlık…', um: null },
]

// Verilen akım ve sıcaklık artışı için gerekli kesit alanı (mil²)
export function areaForCurrent_mil2(I, dT, layer) {
  const k = K_COEFF[layer]
  return Math.pow(I / (k * Math.pow(dT, 0.44)), 1 / 0.725)
}

// Verilen kesit alanı için maksimum sürekli akım (A)
export function currentForArea(A_mil2, dT, layer) {
  const k = K_COEFF[layer]
  return k * Math.pow(dT, 0.44) * Math.pow(A_mil2, 0.725)
}

export function kCoeff(layer) {
  return K_COEFF[layer]
}

// Sıcaklığa bağlı özdirenç (ohm·m)
export function rhoAt(T) {
  return RHO20 * (1 + ALPHA * (T - 20))
}

// Hat direnci (ohm). Tüm girişler SI: metre.
export function traceResistance(L_m, W_m, t_m, T) {
  return (rhoAt(T) * L_m) / (W_m * t_m)
}

// Denklemin kabaca geçerli olduğu aralık için uyarı üretir
export function validityWarnings(I, dT) {
  const w = []
  if (dT < 10 || dT > 100) {
    w.push(`ΔT = ${dT} °C, denklemin tipik geçerlilik aralığı (10–100 °C) dışında.`)
  }
  if (I > 35) {
    w.push(`I = ${I} A, denklemin tipik geçerlilik üst sınırının (≈35 A) üzerinde.`)
  }
  return w
}
