// Sinyal bütünlüğü hesapları (spec §7.2 – §7.7).
// Girişler SI: m, s, Hz, V, Ω.

import { C0 } from './units'
import { delayPerLength, phaseVelocity } from './epsEff'
import { nearestValues } from './eseries'
import { twoInParallel } from './ohm'

export const SI_ERR_INVALID = 'invalid'
export const SI_ERR_NEGATIVE_SERIES = 'negative-series'
export const SI_ERR_NO_FEXT = 'fext-needs-modal-eps'

// impedance.js'teki ayrımın aynısı: denklemi spec'te tanımlı olmayan sonuçlar
// kapalı formlarla aynı etikete girmez. §7.2 – §7.5 ve §7.7 denklemleri
// spec'te var; §7.6 crosstalk kestirimi ise yok (aşağıdaki nota bak).
export const SI_METHOD_CLOSED_FORM = 'closed-form'
export const SI_METHOD_EMPIRICAL = 'empirical-coupling'

// --- §7.2 Dalga boyu ve elektriksel uzunluk ---

export function wavelength({ f, epsEff }) {
  if (!(f > 0) || !(epsEff >= 1)) {
    return { error: SI_ERR_INVALID, message: 'Frekans ve εeff pozitif olmalı.' }
  }

  const lambda0 = C0 / f
  const lambdaG = C0 / (f * Math.sqrt(epsEff))

  return {
    lambda0,
    lambdaG,
    quarter: lambdaG / 4,
    half: lambdaG / 2,
    vp: phaseVelocity(epsEff),
  }
}

// Belirli bir uzunluğun elektriksel uzunluğu
export function electricalLength({ length, f, epsEff }) {
  const w = wavelength({ f, epsEff })
  if (w.error) return w
  if (!(length > 0)) return { error: SI_ERR_INVALID, message: 'Uzunluk pozitif olmalı.' }

  const fraction = length / w.lambdaG
  return {
    ...w,
    length,
    fraction,
    degrees: 360 * fraction,
    radians: 2 * Math.PI * fraction,
    delay: length * delayPerLength(epsEff),
  }
}

// --- §7.3 Yükselme süresi bant genişliği ---
//
// f_BW ≈ K / t_r. K = 0.35 birinci dereceden sistem içindir; daha geniş
// spektral içerik için 0.5'e kadar seçilebilir. Bu değer VERİ HIZI DEĞİLDİR.
export const RISE_TIME_K_MIN = 0.35
export const RISE_TIME_K_MAX = 0.5

export function riseTimeBandwidth({ tr, k = RISE_TIME_K_MIN }) {
  if (!(tr > 0)) return { error: SI_ERR_INVALID, message: 'Yükselme süresi pozitif olmalı.' }
  if (!(k >= RISE_TIME_K_MIN && k <= RISE_TIME_K_MAX)) {
    return { error: SI_ERR_INVALID, message: 'Katsayı 0.35 ile 0.5 arasında olmalı.' }
  }
  return { fBW: k / tr, k, tr }
}

// --- §7.4 Kritik hat uzunluğu ---
//
// Hat gecikmesi yükselme süresinin belirli bir kesrine ulaştığında iletim
// hattı etkileri değerlendirilmelidir. Kriter mutlak fiziksel sınır değil,
// tasarım eşiğidir; uygulamada 1/6, 1/4 ve 1/2 kullanılır.
export const CRITICAL_DIVISORS = [6, 4, 2]

export function criticalLength({ tr, epsEff, divisor = 6, length = null }) {
  if (!(tr > 0) || !(epsEff >= 1) || !(divisor > 0)) {
    return { error: SI_ERR_INVALID, message: 'Yükselme süresi, εeff ve kriter pozitif olmalı.' }
  }

  const tpd = delayPerLength(epsEff)
  const critical = tr / (divisor * tpd)

  const out = { critical, tr, divisor, tpd, epsEff }

  if (length > 0) {
    const delay = length * tpd
    out.length = length
    out.delay = delay
    out.ratio = length / critical
    // Gecikmenin yükselme süresine oranı — kriterin doğrudan karşılığı
    out.delayFraction = delay / tr
    out.transmissionLine = length > critical
  }

  // Diğer kriterlerin verdiği uzunluklar da döner ki eşik seçiminin
  // sonucu ne kadar değiştirdiği görülsün
  out.byDivisor = CRITICAL_DIVISORS.map((d) => ({ divisor: d, critical: tr / (d * tpd) }))

  return out
}

// --- §7.5 Diferansiyel skew ve uzunluk eşitleme ---

export function skew({ lengthP, lengthN, epsEff, epsEffN = null, skewMax = null }) {
  if (!(lengthP > 0) || !(lengthN > 0) || !(epsEff >= 1)) {
    return { error: SI_ERR_INVALID, message: 'Uzunluklar ve εeff pozitif olmalı.' }
  }

  const tpdP = delayPerLength(epsEff)
  // Hatlar farklı katmandaysa εeff de farklıdır; o zaman yalnızca fiziksel
  // uzunluk eşitlemek yeterli olmaz.
  const tpdN = delayPerLength(epsEffN ?? epsEff)
  const sameLayer = epsEffN == null || epsEffN === epsEff

  const delayP = lengthP * tpdP
  const delayN = lengthN * tpdN
  const skewTime = Math.abs(delayP - delayN)
  const deltaL = Math.abs(lengthP - lengthN)

  const out = {
    lengthP, lengthN, deltaL,
    tpdP, tpdN, sameLayer,
    delayP, delayN,
    skew: skewTime,
    longer: delayP > delayN ? 'P' : 'N',
  }

  if (skewMax > 0) {
    out.skewMax = skewMax
    out.within = skewTime <= skewMax
    // İzin verilen skew'e karşılık gelen maksimum uzunluk farkı
    out.maxDeltaL = skewMax / tpdP
    // Eşitlemek için kısa hatta eklenmesi gereken uzunluk
    out.addLength = sameLayer
      ? deltaL
      : Math.abs(delayP - delayN) / (delayP > delayN ? tpdN : tpdP)
  } else {
    out.addLength = sameLayer ? deltaL : Math.abs(delayP - delayN) / tpdN
  }

  return out
}

// --- §7.6 Crosstalk ---
//
// BİLİNEN SAPMA — bu blok spec'i uygulamıyor. Spec §7.6 çok iletkenli iletim
// hattı çözümü istiyor: kapasitans matrisi 2B alan çözücüden, L = μ₀ε₀·C₀⁻¹,
// G ≈ ω·tanδ·C, aggressor sinyali FFT ile frekans alanına, her frekansta
// e^(−Mℓ) çözümü, IFFT ile zaman alanına. Alan çözücü olmadan bunun hiçbir
// adımı yapılamaz.
//
// Yerine kestirim konuyor. Bu ifadelerin KAYNAĞI SPEC'TE YOK:
//   K_b   = (Z_even − Z_odd) / (2·(Z_even + Z_odd))     ← NEXT katsayısı
//   L_sat = t_r / (2·t_pd)                              ← doyma uzunluğu
//   V_FEXT ≈ (Δt / t_r)·V_agg/2                         ← FEXT tepe gerilimi
// Paralel uzunluk L_sat altındaysa NEXT doğrusal ölçeklenir.
//
// Bu yüzden sonuç `method: SI_METHOD_EMPIRICAL` ve `multiconductorModel: false`
// taşır; arayüz bunu kapalı form sonuçlarıyla aynı güven seviyesinde
// sunamaz. Spec'te yalnızca 3W kontrolü (S ≥ 3W) birebir tanımlıdır ve o da
// açıkça yalnızca geometrik bir kontroldür — crosstalk hesabı değildir,
// sağlandığında "crosstalk yoktur" denmez.
//
// FEXT modal hız farkına bağlıdır ve mevcut motorların hiçbiri bunu vermez.
// impedance.js diferansiyel çift bloğu tek bir εeff kullanır; bu iki modun
// hızını özdeş varsaymak demektir ve o varsayım altında FEXT katsayısı
//   K_f = −½·t_pd·(C_m/C − L_m/L)
// özdeş olarak SIFIR çıkar. Microstrip'te FEXT genelde baskın crosstalk
// olduğundan bu sıfır yanlıştır; kapalı formdan geliyormuş gibi sunulan yanlış
// bir sayı, sonuç vermemekten kötüdür.
// Bu yüzden: kullanıcı odd ve even mod εeff değerlerini girerse hesaplanır,
// girmezse hesaplanmaz — Z_odd/Z_even'den türetilmez, uydurulmaz.

// Geometri karşılaştırması bağıl toleransla yapılır: kullanıcı W = 0.2 mm ve
// S = 0.6 mm girdiğinde 3·W ile S kayan noktada son bitte ayrışır ve tam
// sınırdaki bir tasarım yanlışlıkla "sağlanmadı" görünür.
const GEOM_REL_TOL = 1e-9

export function threeWRule({ W, S }) {
  if (!(W > 0) || !(S > 0)) return { error: SI_ERR_INVALID, message: 'W ve S pozitif olmalı.' }

  const required = 3 * W
  return {
    satisfied: S >= required * (1 - GEOM_REL_TOL),
    ratio: S / W,
    required,
    S, W,
  }
}

export function nextCoupling({ Zeven, Zodd }) {
  if (!(Zeven > 0) || !(Zodd > 0) || Zeven <= Zodd) {
    return { error: SI_ERR_INVALID, message: 'Z_even, Z_odd değerinden büyük ve ikisi pozitif olmalı.' }
  }
  return { Kb: (Zeven - Zodd) / (2 * (Zeven + Zodd)) }
}

export function crosstalk({
  Zeven, Zodd, epsEff, tr, coupledLength, Vagg,
  epsEffOdd = null, epsEffEven = null,
}) {
  const kb = nextCoupling({ Zeven, Zodd })
  if (kb.error) return kb
  if (!(epsEff >= 1) || !(tr > 0) || !(coupledLength > 0) || !(Vagg > 0)) {
    return { error: SI_ERR_INVALID, message: 'εeff, yükselme süresi, uzunluk ve gerilim pozitif olmalı.' }
  }

  // Doyma uzunluğu: bu uzunluktan sonra NEXT artmaz, yalnızca uzar
  const tpd = delayPerLength(epsEff)
  const Lsat = tr / (2 * tpd)
  const saturated = coupledLength >= Lsat
  const scale = saturated ? 1 : coupledLength / Lsat

  const Vnext = kb.Kb * Vagg * scale

  const out = {
    // Denklemleri spec'te olmayan kestirim; §7.6'nın istediği çok iletkenli
    // model uygulanmadı
    method: SI_METHOD_EMPIRICAL,
    multiconductorModel: false,
    Kb: kb.Kb,
    Lsat,
    saturated,
    scale,
    Vnext,
    nextPct: (100 * Vnext) / Vagg,
    coupledLength,
    tr, Vagg, epsEff,
    // NEXT süresi: iki yönlü gidiş dönüş
    nextDuration: 2 * coupledLength * tpd,
  }

  // FEXT yalnızca modal hızlar farklıysa vardır. Homojen dielektrikte
  // (stripline) iki mod aynı hızda ilerler ve FEXT sıfırdır.
  // εeff < 1 fiziksel değil (mod ışıktan hızlı olurdu); NEXT tarafındaki
  // εeff kontrolüyle aynı eşik uygulanır.
  if (epsEffOdd >= 1 && epsEffEven >= 1) {
    const tpdOdd = delayPerLength(epsEffOdd)
    const tpdEven = delayPerLength(epsEffEven)
    const dt = Math.abs(tpdEven - tpdOdd) * coupledLength
    // V_FEXT ≈ (Δt / t_r)·V_agg/2 — mod gecikme farkının yükselme kenarına oranı
    const Vfext = (dt / tr) * (Vagg / 2)
    out.fext = {
      available: true,
      epsEffOdd, epsEffEven,
      modalDelayDiff: dt,
      Vfext,
      fextPct: (100 * Vfext) / Vagg,
      homogeneous: Math.abs(epsEffEven - epsEffOdd) < 1e-9,
    }
  } else {
    out.fext = { available: false, reason: SI_ERR_NO_FEXT }
  }

  return out
}

// --- §7.7 Terminasyon ---

export function seriesTermination({ Z0, Rdriver }) {
  if (!(Z0 > 0) || !(Rdriver >= 0)) {
    return { error: SI_ERR_INVALID, message: 'Z₀ pozitif, sürücü direnci negatif olmayan olmalı.' }
  }

  const Rs = Z0 - Rdriver
  if (Rs < 0) {
    return {
      error: SI_ERR_NEGATIVE_SERIES,
      message: 'Sürücü çıkış direnci hat empedansından büyük; seri terminasyon önerilmez.',
      Rs, Z0, Rdriver,
    }
  }

  const near = nearestValues(Rs, 'E24', 3)
  return {
    Rs, Z0, Rdriver,
    // Sürücü + seri direnç hattı tam eşlemeli mi
    total: Rdriver + Rs,
    nearest: near,
    // Standart değerle gerçekleşen kaynak empedansı
    withStandard: near.length ? Rdriver + near[0].value : null,
  }
}

export function parallelTermination({ Z0, V, duty = 1 }) {
  if (!(Z0 > 0) || !(V > 0)) {
    return { error: SI_ERR_INVALID, message: 'Z₀ ve gerilim pozitif olmalı.' }
  }
  if (!(duty > 0 && duty <= 1)) {
    return { error: SI_ERR_INVALID, message: 'Duty cycle 0 ile 1 arasında olmalı.' }
  }

  const RT = Z0
  const Pdc = (V * V) / RT
  return {
    RT,
    Pdc,
    Pavg: duty * Pdc,
    duty,
    Idc: V / RT,
  }
}

/**
 * Thevenin terminasyonu.
 *
 * Eşdeğer paralel direnç Z₀ olacak, bölücü de istenen bias gerilimini verecek:
 *   a = V_bias / V_cc
 *   R_top    = Z₀ / a
 *   R_bottom = Z₀ / (1 − a)
 *
 * Standart değer çifti seçildikten sonra gerçek bias ve gerçek paralel direnç
 * yeniden hesaplanır — kuantalama ikisini birden kaydırır.
 */
export function theveninTermination({ Z0, Vcc, Vbias, series = 'E24' }) {
  if (!(Z0 > 0) || !(Vcc > 0) || !(Vbias > 0) || Vbias >= Vcc) {
    return { error: SI_ERR_INVALID, message: 'Bias gerilimi V_cc\'den küçük ve tüm değerler pozitif olmalı.' }
  }

  const a = Vbias / Vcc
  const Rtop = Z0 / a
  const Rbottom = Z0 / (1 - a)

  const topCandidates = nearestValues(Rtop, series, 3)
  const bottomCandidates = nearestValues(Rbottom, series, 3)

  let best = null
  for (const t of topCandidates) {
    for (const b of bottomCandidates) {
      const Rpar = twoInParallel(t.value, b.value)
      const bias = Vcc * (b.value / (t.value + b.value))
      const zErr = (100 * (Rpar - Z0)) / Z0
      const vErr = (100 * (bias - Vbias)) / Vbias
      const score = Math.abs(zErr) + Math.abs(vErr)
      if (!best || score < best.score) {
        best = { Rtop: t.value, Rbottom: b.value, Rpar, bias, zErr, vErr, score }
      }
    }
  }

  return {
    ideal: { Rtop, Rbottom, a },
    standard: best,
    series,
    Z0, Vcc, Vbias,
    // Sürekli çekilen akım — Thevenin terminasyonunun bedeli
    Idc: Vcc / (Rtop + Rbottom),
    Pdc: (Vcc * Vcc) / (Rtop + Rbottom),
  }
}
