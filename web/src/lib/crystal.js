// Kristal yük kapasitesi (spec §9.11).
// Kapasiteler tutarlı olmak kaydıyla aynı birimde verilir (tipik olarak pF).
//
// Genel:  C_L = (C_IN + C1)(C_OUT + C2) / (C_IN + C1 + C_OUT + C2) + C_stray
// Basit:  C1 = C2 = C ve giriş kapasiteleri ihmal → C_L = C/2 + C_stray

export const CRYSTAL_ERR_INVALID = 'invalid'
export const CRYSTAL_ERR_STRAY = 'stray'
export const CRYSTAL_ERR_PIN = 'pin-capacitance'

export function crystalLoad({ C1, C2, Cin = 0, Cout = 0, Cstray = 0 }) {
  if (!(C1 >= 0) || !(C2 >= 0)) {
    return { error: CRYSTAL_ERR_INVALID }
  }
  const a = Cin + C1
  const b = Cout + C2
  if (a + b === 0) {
    return { error: CRYSTAL_ERR_INVALID }
  }
  return { CL: (a * b) / (a + b) + Cstray, a, b }
}

// Hedef C_L için gerekli harici kapasitör.
export function crystalCapsForLoad({ CL, Cin = 0, Cout = 0, Cstray = 0 }) {
  if (!(CL > 0)) {
    return { error: CRYSTAL_ERR_INVALID }
  }

  const target = CL - Cstray
  if (!(target > 0)) {
    // Kodun yanında yalnızca ham sayı döner; cümlesini ekranın text.js'i kurar.
    return { error: CRYSTAL_ERR_STRAY, CL, Cstray }
  }

  // C1 = C2 = C ve Cin = Cout = Cp varsayımıyla: target = (Cp + C)/2 → C = 2·target − Cp
  const Cp = (Cin + Cout) / 2
  const C = 2 * target - Cp
  if (!(C > 0)) {
    return { error: CRYSTAL_ERR_PIN, Cp, CL }
  }

  return { C, simplified: Cin === 0 && Cout === 0, Cp, target }
}
