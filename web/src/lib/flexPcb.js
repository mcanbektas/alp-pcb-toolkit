// Flex PCB bükülme (bend) strain'i ve iz (trace) direnci — REV2 §15.
//
// Bükülme modeli salt GEOMETRİKTİR: copper'ın neutral axis'e olan mesafesi ve
// bend radius'tan strain kestirir (ε ≈ y/R). Malzeme modülü, plastik
// deformasyon, work hardening, adhesive viscoelasticity, copper grain
// structure, rolled-annealed/electrodeposited copper farkı ve tekrarlı
// fatigue etkilerini İÇERMEZ (REV2 §15.3). Bu yüzden yüksek strain
// çıktısının gerçek kullanım uygunluğu copper türü, stack-up ve üretici
// verisi olmadan bu motorla tek başına belirlenemez.
//
// İzin verilen strain (epsilonAllow) ve üretici bend-radius çarpanı (Kb)
// GİZLİ VARSAYILAN OLARAK KURULMAZ: ikisi de çağırana aittir, sağlanmazsa
// ilgili sonuç bloğu null döner (REV2 §15.4–§15.5). Değerin "üretici verisi"
// mi yoksa "kullanıcı varsayımı" mı olduğunu etiketlemek ekranın (Adım 5)
// işidir — bu saf katman dil ve sunum bilmez.
//
// Trace direnci sıcaklık düzeltmesi units.js → rhoCuAt(T) ile BİREBİR AYNI
// formülü kullanır (ρ_T = ρ_20·[1+α(T−20)]); ikinci bir kopyası burada
// yazılmaz. traceCalc.js'teki ampirik ısınma denklemiyle KARIŞTIRILMAZ —
// flex trace sıcaklığı yalnızca I²R ile tahmin edilmez (REV2 §15.8): ısı
// yayılımı, coverlay, hava, rigid bölge ve bonding yapısına bağlıdır, bu
// motor termal modelleme yapmaz.
//
// §15.9'daki on kontrolden yalnız üçü (via/pad/stiffener mesafesi) sayısal
// eşik karşılaştırmasıdır ve dfmCheck.js → checkLimit ile kurulur (kopyası
// yazılmaz); üretici eşiği verilmezse (`null`) kontrol 'unknown' döner —
// gizli varsayılan üretici limiti oluşturulmaz. Kalan yedi kontrol (keskin
// trace açısı, keskin köşe, copper pour türü, katman geçişi, ani genişlik
// değişimi, katmanlar arası çakışma, teardrop) için REV2 bir türetme
// formülü ya da eşik vermez — layout geometrisi analizi gerektirir, bu saf
// motorun skaler girdi kümesinin dışındadır ve uydurulmaz.

import { rhoCuAt } from './units'
import { degToRad } from './convertComplex'
import { checkLimit } from './dfmCheck'

export const FLEX_ERR_INVALID = 'invalid'
export const FLEX_ERR_NEGATIVE_INNER_LENGTH = 'negative-inner-length'

// §15.5 — örnek üretici BAŞLANGIÇ profili, evrensel sabit DEĞİLDİR ve gerçek
// üretici verisinin yerine geçmez. Dynamic flex için REV2 sabit bir K_b
// vermez ("Dynamic flex için sabit bir K_b varsayılmaz") — bu tabloda
// dynamic satırı bilinçli olarak YOK; kullanıcı üretici değeri girmelidir.
export const VENDOR_BEND_PROFILE_EXAMPLES = {
  'double-layer-static': 12,
  'multilayer-static': 24,
}

// --- §15.3 Bend strain ---

// ε ≈ y/R — neutral axis biliniyorsa.
export function copperStrain({ y, R }) {
  if (!(y >= 0) || !(R > 0)) return NaN
  return y / R
}

// ε_outer ≈ t_total/(2R) — neutral axis bilinmiyor, simetrik yapı varsayımı.
export function outerSurfaceStrain({ tTotal, R }) {
  if (!(tTotal > 0) || !(R > 0)) return NaN
  return tTotal / (2 * R)
}

// ε_% = 100·ε
export function strainPercent({ epsilon }) {
  return Number.isFinite(epsilon) ? 100 * epsilon : NaN
}

// --- §15.4 İzin verilen strain'den bend radius ---

// R_min = y/ε_allow — neutral axis biliniyorsa.
export function minBendRadiusFromStrain({ y, epsilonAllow }) {
  if (!(y > 0) || !(epsilonAllow > 0)) return NaN
  return y / epsilonAllow
}

// R_min = t_total/(2·ε_allow) — simetrik dış yüzey yaklaşımı.
export function minBendRadiusFromStrainSymmetric({ tTotal, epsilonAllow }) {
  if (!(tTotal > 0) || !(epsilonAllow > 0)) return NaN
  return tTotal / (2 * epsilonAllow)
}

// --- §15.5 Üretici çarpanı ---

// R_min,vendor = K_b·t_total
export function vendorMinBendRadius({ Kb, tTotal }) {
  if (!(Kb > 0) || !(tTotal > 0)) return NaN
  return Kb * tTotal
}

// --- §15.6 Bend uzunluğu ---
// θ_rad = θ_deg·π/180 dönüşümü burada tekrar yazılmaz — convertComplex.js'in
// (spec §11.6) zaten dışa verdiği degToRad kullanılır.

// l_bend = R·θ_rad — neutral-axis arc length.
export function bendArcLength({ R, thetaRad }) {
  if (!(R > 0) || !(thetaRad >= 0)) return NaN
  return R * thetaRad
}

/**
 * Dış ve iç yüzey uzunlukları: l_outer=(R+y)θ, l_inner=(R-y)θ.
 *
 * y bend radius'u aşarsa (R < y) iç yüzey uzunluğu negatif çıkar — bu
 * geometrinin tutarsız olduğunu gösterir ve sessizce sıfıra kırpılmaz,
 * hesaplanan (negatif) değerle birlikte ayrı hata koduyla bildirilir
 * (Adım 2 kuralı: negatif sonuçlar sıfıra kırpılmaz).
 */
export function bendSurfaceLengths({ R, y, thetaRad }) {
  if (!(R > 0) || !(y >= 0) || !(thetaRad >= 0)) return { error: FLEX_ERR_INVALID }
  const outer = (R + y) * thetaRad
  const inner = (R - y) * thetaRad
  if (inner < 0) return { error: FLEX_ERR_NEGATIVE_INNER_LENGTH, outer, inner }
  return { outer, inner }
}

// Δl = 2yθ — dış ve iç yüzey arasındaki uzama farkı.
export function elongationDifference({ y, thetaRad }) {
  if (!(y >= 0) || !(thetaRad >= 0)) return NaN
  return 2 * y * thetaRad
}

// --- §15.7 Trace direnci ---

// A_Cu = w·t
export function copperArea({ w, t }) {
  if (!(w > 0) || !(t > 0)) return NaN
  return w * t
}

/**
 * R_trace = ρ_T·l/(w·t). Sıcaklık düzeltmesi units.js → rhoCuAt(T) ile
 * BİREBİR AYNI formülü kullanır (ρ_T=ρ_20[1+α(T−20)]); burada ikinci bir
 * kopyası yazılmaz. T verilmezse 20 °C kabul edilir (ρ_20'nin tanımlı olduğu
 * referans sıcaklık — düzeltmesiz nötr başlangıç, gizli bir mühendislik
 * varsayımı değil).
 */
export function traceResistance({ l, w, t, T = 20 }) {
  const area = copperArea({ w, t })
  if (!(l > 0) || !(area > 0) || !Number.isFinite(T)) return NaN
  return (rhoCuAt(T) * l) / area
}

// R_eq = R_trace/N — paralel eş trace.
export function parallelTraceResistance({ rSingle, n = 1 }) {
  if (!(rSingle > 0) || !(n >= 1)) return NaN
  return rSingle / n
}

// --- §15.8 Gerilim düşümü ve güç ---
//
// Flex trace sıcaklığı yalnızca I²R ile tahmin edilmez: ısı yayılımı,
// coverlay, hava, rigid bölge ve bonding yapısına bağlıdır (REV2 §15.8).
// Bu motor yalnız elektriksel V_drop ve P_loss'u verir, termal modelleme
// yapmaz.

// V_drop = I·R
export function voltageDrop({ current, resistance }) {
  if (!(current > 0) || !(resistance > 0)) return NaN
  return current * resistance
}

// P_loss = I²·R
export function powerLoss({ current, resistance }) {
  if (!(current > 0) || !(resistance > 0)) return NaN
  return current * current * resistance
}

// --- §15.9 Tasarım kontrolleri ---
//
// On kontrolden yalnız üçü (via/pad/stiffener mesafesi) sayısal eşik
// karşılaştırmasıdır; dfmCheck.js → checkLimit ile kurulur. Üretici eşiği
// (*MinDistance) verilmezse checkLimit 'unknown' döner — gizli varsayılan
// üretici limiti oluşturulmaz (REV2 §15.9: "Üretici eşiği bilinmiyorsa
// 'unknown' sonucu verilir"). Kalan yedi kontrol (keskin trace açısı, keskin
// köşe, copper pour türü, katman geçişi, ani genişlik değişimi, katmanlar
// arası çakışma, teardrop önerisi) için REV2 bir türetme formülü/eşik
// vermez — trace path ve layout geometrisi analizi gerektirir, bu saf
// motorun skaler girdi kümesinin dışındadır ve uydurulmaz.
export function bendClearanceChecks({
  viaDistance = null, viaMinDistance = null,
  padDistance = null, padMinDistance = null,
  stiffenerDistance = null, stiffenerMinDistance = null,
  warnPercent = null,
}) {
  return {
    via: checkLimit({ id: 'via-bend-clearance', actual: viaDistance, required: viaMinDistance, warnPercent }),
    pad: checkLimit({ id: 'pad-bend-clearance', actual: padDistance, required: padMinDistance, warnPercent }),
    stiffener: checkLimit({
      id: 'stiffener-bend-clearance', actual: stiffenerDistance, required: stiffenerMinDistance, warnPercent,
    }),
  }
}

// --- §15.10 Dynamic flex ---
//
// Cycle life için evrensel kapalı form YOK. A ve b üretici ampirik
// katsayılarıdır; ikisi de verilmezse tahmin üretilmez (bkz. flexPcbPlan —
// orkestratör bu durumda bloğu null döndürür, bu fonksiyon kendisi çağrılmaz).

// N_f = A·ε^(−b)
export function cycleLife({ A, b, epsilon }) {
  if (!(A > 0) || !(b > 0) || !(epsilon > 0)) return NaN
  return A * Math.pow(epsilon, -b)
}

// --- §15.11 Sonuçlar: tüm plan tek çağrıda ---

/**
 * Bükülme ve iz analizinin tamamı.
 *
 * Zorunlu girdi yalnızca `tTotal` ve `R`dir (strain/minimum-radius
 * hesaplarının temeli, REV2 §15.3–§15.5 — hiçbiri bend açısına bağlı
 * değildir). Geri kalan her şey opsiyoneldir ve verilmezse ilgili sonuç
 * bloğu `null` kalır; uydurma varsayım kurulmaz:
 * - `thetaDeg` yoksa bend-uzunluğu ailesi (arcLength, surfaceLengths,
 *   elongation) null kalır (§15.6).
 * - `y` yoksa strain, neutral axis bilinmeyen SİMETRİK yaklaşımla hesaplanır
 *   (§15.3); `y` verilirse neutral-axis-known formülü kullanılır ve
 *   surfaceLengths/elongation de hesaplanabilir hâle gelir (bu ikisi yalnız
 *   `y` ile tanımlıdır).
 * - `epsilonAllow` yoksa strainMinRadius null kalır (§15.4).
 * - `Kb` yoksa vendorMinRadius null kalır (§15.5).
 * - `l`/`w`/`t` üçü birden verilmezse trace bloğu (direnç, gerilim düşümü,
 *   güç kaybı) null kalır — araç yalnız bükülme analizi için de kullanılabilir.
 * - `cycleA`/`cycleB` ikisi birden verilmezse cycleLife null kalır (§15.10).
 */
export function flexPcbPlan({
  tTotal, R, thetaDeg = null, y = null, epsilonAllow = null, Kb = null,
  l = null, w = null, t = null, T = 20, n = 1, current = null,
  viaDistance = null, viaMinDistance = null,
  padDistance = null, padMinDistance = null,
  stiffenerDistance = null, stiffenerMinDistance = null,
  cycleA = null, cycleB = null,
}) {
  if (!(tTotal > 0) || !(R > 0)) return { error: FLEX_ERR_INVALID }

  const thetaRad = thetaDeg !== null ? degToRad(thetaDeg) : null
  const strain = y !== null ? copperStrain({ y, R }) : outerSurfaceStrain({ tTotal, R })

  const strainMinRadius = epsilonAllow !== null
    ? (y !== null
      ? minBendRadiusFromStrain({ y, epsilonAllow })
      : minBendRadiusFromStrainSymmetric({ tTotal, epsilonAllow }))
    : null

  const hasTrace = l !== null && w !== null && t !== null
  const rTraceSingle = hasTrace ? traceResistance({ l, w, t, T }) : null
  const rTraceEq = hasTrace ? parallelTraceResistance({ rSingle: rTraceSingle, n }) : null

  return {
    ok: true,
    strain,
    strainPercent: strainPercent({ epsilon: strain }),
    vendorMinRadius: Kb !== null ? vendorMinBendRadius({ Kb, tTotal }) : null,
    strainMinRadius,
    bendRadius: R,
    arcLength: thetaRad !== null ? bendArcLength({ R, thetaRad }) : null,
    surfaceLengths: (thetaRad !== null && y !== null) ? bendSurfaceLengths({ R, y, thetaRad }) : null,
    elongation: (thetaRad !== null && y !== null) ? elongationDifference({ y, thetaRad }) : null,
    copperArea: hasTrace ? copperArea({ w, t }) : null,
    traceResistance: rTraceEq,
    traceResistanceSingle: rTraceSingle,
    voltageDrop: (hasTrace && current !== null) ? voltageDrop({ current, resistance: rTraceEq }) : null,
    powerLoss: (hasTrace && current !== null) ? powerLoss({ current, resistance: rTraceEq }) : null,
    clearance: bendClearanceChecks({
      viaDistance, viaMinDistance, padDistance, padMinDistance, stiffenerDistance, stiffenerMinDistance,
    }),
    cycleLife: (cycleA !== null && cycleB !== null) ? cycleLife({ A: cycleA, b: cycleB, epsilon: strain }) : null,
  }
}
