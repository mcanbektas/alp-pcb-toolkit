// dB, kazanç ve dBm dönüşümleri (spec §11.4; RMS gerilim için §9.4).
//
// Saf modül: React, DOM ve kullanıcıya görünen metin bilmez. Hata durumunda
// kod döner; kodu Türkçeye çeviren tek yer ekranın text.js dosyasıdır.
//
// Temel ayrım: dB bir ORANDIR (birimsizdir), dBm ise 1 mW referansına göre
// MUTLAK bir seviyedir. İkisi aynı fonksiyonla üretilmez.

export const DB_ERR_INVALID = 'invalid'
export const DB_ERR_RATIO = 'ratio'
export const DB_ERR_POWER = 'power'
// Giriş sonlu olsa bile sonuç kayan nokta aralığının dışına taşabilir:
// 10^(G/10) yaklaşık |G| > 3083 dB'de temsil edilemez. Taşmayı sessizce
// Infinity olarak geçirmek, tanımsız bir sonucu geçerli sayı gibi göstermek
// olurdu; ayrı bir kodla bildirilir.
export const DB_ERR_RANGE = 'range'

const RANGE_MESSAGE = 'Sonuç kayan nokta aralığının dışına taşıyor.'

// Sonuç alanlarının hepsi sonlu mu? Değilse aralık hatası döner.
function finiteOrRange(result, ...values) {
  for (const x of values) {
    if (!Number.isFinite(x)) return { error: DB_ERR_RANGE, message: RANGE_MESSAGE }
  }
  return result
}

// dBm referansı: 1 mW = 1e-3 W
export const DBM_REF_W = 1e-3

// Logaritma yalnızca pozitif argüman için tanımlıdır; oran sıfır ya da negatif
// olduğunda tahmin üretilmez, hata kodu döner.
function ratioGuard(ratio) {
  if (!Number.isFinite(ratio)) return DB_ERR_INVALID
  if (!(ratio > 0)) return DB_ERR_RATIO
  return null
}

// --- Güç oranı ↔ dB ---

// G_dB = 10·log₁₀(P₂/P₁)
export function powerRatioToDb(ratio) {
  const bad = ratioGuard(ratio)
  if (bad) {
    return {
      error: bad,
      message: bad === DB_ERR_RATIO
        ? 'Güç oranı pozitif olmalı; log10 sıfır ve negatif değerde tanımsızdır.'
        : 'Güç oranı sonlu bir sayı olmalı.',
    }
  }
  return { ratio, dB: 10 * Math.log10(ratio) }
}

// P₂/P₁ = 10^(G_dB/10)
export function dbToPowerRatio(dB) {
  if (!Number.isFinite(dB)) {
    return { error: DB_ERR_INVALID, message: 'Kazanç sonlu bir sayı olmalı.' }
  }
  const ratio = Math.pow(10, dB / 10)
  return finiteOrRange({ dB, ratio }, ratio)
}

// --- Gerilim oranı ↔ dB ---
//
// 20·log₁₀ biçimi yalnızca giriş ve çıkış empedansları EŞİTKEN güç kazancına
// eşittir (spec §11.4). Motor bu koşulu doğrulayamaz; koşul ekranda açıkça
// yazılır.

// G_dB = 20·log₁₀(V₂/V₁)
export function voltageRatioToDb(ratio) {
  const bad = ratioGuard(ratio)
  if (bad) {
    return {
      error: bad,
      message: bad === DB_ERR_RATIO
        ? 'Gerilim oranı pozitif olmalı; log10 sıfır ve negatif değerde tanımsızdır.'
        : 'Gerilim oranı sonlu bir sayı olmalı.',
    }
  }
  return { ratio, dB: 20 * Math.log10(ratio) }
}

// V₂/V₁ = 10^(G_dB/20)
export function dbToVoltageRatio(dB) {
  if (!Number.isFinite(dB)) {
    return { error: DB_ERR_INVALID, message: 'Kazanç sonlu bir sayı olmalı.' }
  }
  const ratio = Math.pow(10, dB / 20)
  return finiteOrRange({ dB, ratio }, ratio)
}

// Empedanslar eşitken güç oranı gerilim oranının karesidir:
//   20·log₁₀(k) = 10·log₁₀(k²)
export function powerRatioFromVoltageRatio(vr) {
  const bad = ratioGuard(vr)
  if (bad) {
    return {
      error: bad,
      message: bad === DB_ERR_RATIO
        ? 'Gerilim oranı pozitif olmalı.'
        : 'Gerilim oranı sonlu bir sayı olmalı.',
    }
  }
  const powerRatio = vr * vr
  return finiteOrRange({ voltageRatio: vr, powerRatio }, powerRatio)
}

// Aynı dB değerinin iki oran karşılığını birlikte verir.
export function ratiosFromDb(dB) {
  const p = dbToPowerRatio(dB)
  if (p.error) return p
  const v = dbToVoltageRatio(dB)
  if (v.error) return v
  return { dB, powerRatio: p.ratio, voltageRatio: v.ratio }
}

// --- Mutlak seviye: dBm ---

// P_dBm = 10·log₁₀(P_mW)
export function wattToDbm(P_W) {
  if (!Number.isFinite(P_W)) {
    return { error: DB_ERR_INVALID, message: 'Güç sonlu bir sayı olmalı.' }
  }
  if (!(P_W > 0)) {
    return { error: DB_ERR_POWER, message: 'Güç pozitif olmalı; 0 W için dBm tanımsızdır.' }
  }
  const mW = P_W / DBM_REF_W
  return finiteOrRange({ W: P_W, mW, dBm: 10 * Math.log10(mW) }, mW)
}

// P_mW = 10^(P_dBm/10)   ve   P_W = 10^((P_dBm − 30)/10)
export function dbmToWatt(dBm) {
  if (!Number.isFinite(dBm)) {
    return { error: DB_ERR_INVALID, message: 'Seviye sonlu bir sayı olmalı.' }
  }
  const mW = Math.pow(10, dBm / 10)
  const W = Math.pow(10, (dBm - 30) / 10)
  return finiteOrRange({ dBm, mW, W }, mW, W)
}

// --- Seviyenin gerilim karşılığı ---
//
// P = V²/R (spec §9.4) → V_RMS = √(P·R). Gücün tamamının R üzerinde
// harcandığı ve gerilimin RMS olduğu varsayılır.
export function rmsVoltage(P_W, R) {
  if (!Number.isFinite(P_W) || !Number.isFinite(R)) {
    return { error: DB_ERR_INVALID, message: 'Güç ve direnç sonlu sayı olmalı.' }
  }
  if (!(P_W > 0)) {
    return { error: DB_ERR_POWER, message: 'Güç pozitif olmalı.' }
  }
  if (!(R > 0)) {
    return { error: DB_ERR_INVALID, message: 'Referans empedans pozitif olmalı.' }
  }
  const V = Math.sqrt(P_W * R)
  return finiteOrRange({ V, P: P_W, R }, V)
}
