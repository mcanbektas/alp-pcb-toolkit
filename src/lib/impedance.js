// Kontrollü empedans — kapalı form motoru (spec §6).
//
// SÖZLEŞME: Bu modüldeki her empedans fonksiyonu
//   { Z0, epsEff, method, ... }
// döndürür. `method` alanı
//   'closed-form'        → denklemi spec'te tanımlı kapalı form
//   'empirical-coupling' → kaynağı spec'te OLMAYAN ampirik yaklaşım
//   'field-solver'       → alan çözücü
// değerlerinden birini taşır.
// Alan çözücü sonradan aynı arayüzün arkasına girer; arayüz değişmez.
//
// Kapalı form sonuçları üretim için önerilen sonuç DEĞİLDİR (spec §6.1).
// Arayüz bunları daima "hızlı denklem modu" etiketiyle ve geçerlilik
// sınırlarıyla birlikte gösterir.
//
// Girişler SI: metre, Ω, s.

import { C0, ETA0 } from './units'
import { solveBounded } from './solve'

export const METHOD_CLOSED_FORM = 'closed-form'
export const METHOD_FIELD_SOLVER = 'field-solver'

// Ampirik yaklaşım — kapalı formla AYNI KEFEYE KONMAZ. Kapalı formların
// denklemi docs/spec.md'de tanımlıdır ve oradan alınmıştır; bu etiketi taşıyan
// sonucun denklemi spec'te yoktur (bkz. §6.8 kuplaj notu). Arayüz bu ayrımı
// göstermek zorundadır.
export const METHOD_EMPIRICAL = 'empirical-coupling'

export const IMP_ERR_INVALID = 'invalid'
export const IMP_ERR_NO_SOLUTION = 'no-solution'
export const IMP_ERR_RANGE = 'range'

// --- Tam eliptik integral K(k) — aritmetik-geometrik ortalama ile ---
//
// Stripline ve coplanar waveguide kapalı formları K(k')/K(k) oranına dayanır.
// AGM yöntemi kuadratik yakınsar; 20 adım çift duyarlıkta fazlasıyla yeter.
export function ellipticK(k) {
  if (!(k >= 0) || k >= 1) return k === 0 ? Math.PI / 2 : Infinity

  let a = 1
  let b = Math.sqrt(1 - k * k)
  for (let i = 0; i < 40; i++) {
    if (Math.abs(a - b) < 1e-16) break
    const an = (a + b) / 2
    b = Math.sqrt(a * b)
    a = an
  }
  return Math.PI / (2 * a)
}

// K(k')/K(k) oranı — k → 1 olduğunda K(k) ıraksar, oran yine de sonludur.
export function ellipticRatio(k) {
  const kp = Math.sqrt(Math.max(0, 1 - k * k))
  return ellipticK(kp) / ellipticK(k)
}

// --- §6.4 Microstrip — Hammerstad–Jensen ---

function hjA(u) {
  return (
    1 +
    (1 / 49) * Math.log((Math.pow(u, 4) + Math.pow(u / 52, 2)) / (Math.pow(u, 4) + 0.432)) +
    (1 / 18.7) * Math.log(1 + Math.pow(u / 18.1, 3))
  )
}

function hjB(epsR) {
  return 0.564 * Math.pow((epsR - 0.9) / (epsR + 3), 0.053)
}

// Efektif dielektrik sabiti
export function microstripEpsEff(u, epsR) {
  return (
    (epsR + 1) / 2 +
    ((epsR - 1) / 2) * Math.pow(1 + 10 / u, -hjA(u) * hjB(epsR))
  )
}

// Havadaki eşdeğer empedans
export function microstripZair(u) {
  const fu = 6 + (2 * Math.PI - 6) * Math.exp(-Math.pow(30.666 / u, 0.7528))
  return (ETA0 / (2 * Math.PI)) * Math.log(fu / u + Math.sqrt(1 + Math.pow(2 / u, 2)))
}

// --- §6.5 Bakır kalınlığı düzeltmesi ---

const sech = (x) => 1 / Math.cosh(x)
const coth = (x) => 1 / Math.tanh(x)

function thicknessCorrections(u, tau, epsR) {
  if (!(tau > 0)) return { du1: 0, dur: 0 }

  const c = coth(Math.sqrt(6.517 * u))
  const du1 = (tau / Math.PI) * Math.log(1 + (4 * Math.E) / (tau * c * c))
  const dur = (du1 / 2) * (1 + sech(Math.sqrt(epsR - 1)))
  return { du1, dur }
}

/**
 * Yüzey microstrip.
 *
 * @param {number} W  hat genişliği (m)
 * @param {number} H  dielektrik yüksekliği (m)
 * @param {number} t  bakır kalınlığı (m); 0 verilirse sıfır kalınlık çözümü
 * @param {number} epsR
 */
export function microstrip({ W, H, t = 0, epsR }) {
  if (!(W > 0) || !(H > 0) || !(epsR > 1)) {
    return { error: IMP_ERR_INVALID }
  }

  const u = W / H
  const tau = t / H
  const { du1, dur } = thicknessCorrections(u, tau, epsR)

  const u1 = u + du1
  const ur = u + dur

  const epsEffUr = microstripEpsEff(ur, epsR)
  const Zair1 = microstripZair(u1)
  const ZairR = microstripZair(ur)

  // Kalınlık düzeltmesi uygulanmışsa efektif dielektrik de düzeltilir
  const epsEff = tau > 0 ? epsEffUr * Math.pow(Zair1 / ZairR, 2) : microstripEpsEff(u, epsR)
  const Z0 = tau > 0 ? ZairR / Math.sqrt(epsEffUr) : microstripZair(u) / Math.sqrt(epsEff)

  return {
    Z0, epsEff,
    method: METHOD_CLOSED_FORM,
    model: 'hammerstad-jensen',
    u, tau, u1, ur,
    thicknessIncluded: tau > 0,
    tpd: Math.sqrt(epsEff) / C0, // s/m
    // Geçerlilik: Hammerstad–Jensen 0.05 ≤ u ≤ 20 aralığında iyi çalışır
    inRange: u >= 0.05 && u <= 20 && epsR <= 20,
  }
}

// --- §6.6 Stripline (simetrik, sıfır kalınlık — tam çözüm) ---
//
// k = tanh(πW / 2b),  k' = sech(πW / 2b)
// Z0 = (30π / √εr) · K(k') / K(k)
//
// Modülün doğru yönde olduğu limitlerden görülür: hat genişledikçe yapı
// paralel plakaya yaklaşır (k → 1, Z0 → 0); daraldıkça Z0 büyür.
//
// Homojen dielektrik olduğu için εeff = εr. Bakır kalınlığı bu kapalı formda
// yoktur; kalınlık ve asimetri alan çözücü fazına bırakılmıştır.
export function stripline({ W, b, epsR }) {
  if (!(W > 0) || !(b > 0) || !(epsR > 1)) {
    return { error: IMP_ERR_INVALID }
  }

  const x = (Math.PI * W) / (2 * b)
  const k = Math.tanh(x)
  const Z0 = ((30 * Math.PI) / Math.sqrt(epsR)) * ellipticRatio(k)

  return {
    Z0,
    epsEff: epsR,
    method: METHOD_CLOSED_FORM,
    model: 'cohn-elliptic',
    k,
    thicknessIncluded: false,
    tpd: Math.sqrt(epsR) / C0,
    inRange: W / b >= 0.05 && W / b <= 3,
  }
}

// --- §6.7 Coplanar waveguide (ideal, alt referans düzlemi YOK) ---
//
// k = W / (W + 2S),  Z0 = (30π / √εeff) · K(k') / K(k)
// εeff ≈ (εr + 1) / 2  (kalın substrat yaklaşımı)
//
// Bu sonuç grounded CPW sonucu olarak SUNULMAZ (spec §6.7). Alt düzlemi olan
// yapı alan çözücü fazına bırakılmıştır.
export function coplanarWaveguide({ W, S, epsR }) {
  if (!(W > 0) || !(S > 0) || !(epsR > 1)) {
    return { error: IMP_ERR_INVALID }
  }

  const k = W / (W + 2 * S)
  const epsEff = (epsR + 1) / 2
  const Z0 = ((30 * Math.PI) / Math.sqrt(epsEff)) * ellipticRatio(k)

  return {
    Z0, epsEff,
    method: METHOD_CLOSED_FORM,
    model: 'cpw-ideal',
    k,
    thicknessIncluded: false,
    groundedBelow: false,
    tpd: Math.sqrt(epsEff) / C0,
    inRange: true,
  }
}

// --- §6.8 Diferansiyel çift (kenar bağlı) ---
//
// BİLİNEN SAPMA — bu blok spec'i uygulamıyor, yerine geçici bir yaklaşım
// koyuyor. Spec §6.8.1 odd/even empedansları Maxwell kapasitans matrisinden
// istiyor:
//   C_odd = C₁₁ − C₁₂, C_even = C₁₁ + C₁₂
//   Z_odd = 1 / (c·√(C_odd·C₀,odd)),  Z_even = 1 / (c·√(C_even·C₀,even))
// C₁₁ ve C₁₂ için kapalı form YOKTUR; kapasitans matrisi alan çözücüden çıkar.
// Çözücü olmadığı için burada bunun yerine ampirik bir kuplaj katsayısı
// kullanılıyor:
//   Z_odd  ≈ Z0·(1 − k_c)
//   Z_even ≈ Z0·(1 + k_c)
// Microstrip için  k_c = 0.48·exp(−0.96·S/H)
// Stripline için   k_c = 0.347·exp(−2.9·S/b)
//
// Bu iki k_c ifadesinin KAYNAĞI SPEC'TE YOK. Sayısal katsayıları spec'ten
// doğrulanamıyor, geçerlilik aralıkları da spec'ten gelmiyor. Bu yüzden
// sonuç `method: METHOD_EMPIRICAL` taşır ve kapalı form sonuçlarıyla aynı
// güven seviyesinde sunulamaz. Alan çözücü fazında bu blok §6.8.1 rotasıyla
// bütünüyle değiştirilecektir.
//
// Türetilmiş büyüklükler spec'e uygundur: Z_diff = 2·Z_odd,
// Z_common = Z_even / 2 (spec §6.8.1, §16.4) — sapma yalnızca Z_odd/Z_even'in
// nereden geldiğindedir.
//
// Yaklaşım yalnızca simetrik çift ve zayıf-orta kuplaj içindir. Tek bir εeff
// kullandığı için iki modun hızını eşit varsayar; modal hız farkı ve dolayısıyla
// far-end crosstalk bu modelden ÇIKARILAMAZ (bkz. signalIntegrity.js §7.6).

export const COUPLING = {
  microstrip: { a: 0.48, b: 0.96 },
  stripline: { a: 0.347, b: 2.9 },
}

export function couplingFactor(structure, ratio) {
  const c = COUPLING[structure]
  if (!c || !(ratio >= 0)) return NaN
  return c.a * Math.exp(-c.b * ratio)
}

/**
 * Kenar bağlı diferansiyel çift.
 *
 * @param {'microstrip'|'stripline'} structure
 * @param {number} W  hat genişliği (m)
 * @param {number} S  hatlar arası kenar-kenar boşluk (m)
 * @param {number} H  microstrip'te dielektrik yüksekliği, stripline'da düzlemler arası mesafe (m)
 * @param {number} t  bakır kalınlığı (m)
 * @param {number} epsR
 */
export function differentialPair({ structure = 'microstrip', W, S, H, t = 0, epsR }) {
  if (!(S > 0)) return { error: IMP_ERR_INVALID }

  const single = structure === 'stripline'
    ? stripline({ W, b: H, epsR })
    : microstrip({ W, H, t, epsR })
  if (single.error) return single

  const ratio = S / H
  const kc = couplingFactor(structure, ratio)
  if (!Number.isFinite(kc)) return { error: IMP_ERR_INVALID }

  const Zodd = single.Z0 * (1 - kc)
  const Zeven = single.Z0 * (1 + kc)

  return {
    // Sözleşme gereği tek uçlu değerler de aynı adlarla döner
    Z0: single.Z0,
    epsEff: single.epsEff,
    // Tek uçlu Z0 kapalı formdan gelse de çiftin sonucunu ampirik kuplaj
    // belirliyor; sonucun etiketi en zayıf halkayı gösterir.
    method: METHOD_EMPIRICAL,
    // Tek uçlu formun yöntemi ayrıca taşınır ki arayüz ikisini ayırabilsin
    singleMethod: single.method,
    model: `${single.model}+empirical-coupling`,
    // Spec §6.8.1 kapasitans matrisi rotası uygulanmadı
    capacitanceMatrix: false,
    structure,
    Zodd, Zeven,
    Zdiff: 2 * Zodd,
    Zcommon: Zeven / 2,
    coupling: kc,
    ratio,
    tpd: single.tpd,
    thicknessIncluded: single.thicknessIncluded,
    // Yaklaşım S/H > 0.2 civarında güvenilir; çok sıkı kuplajda sapar
    inRange: single.inRange && ratio >= 0.2,
    single,
  }
}

// --- Sentez: hedef empedans için genişlik ---
//
// Kapalı formların hiçbiri W için analitik olarak ters çevrilemez, bu yüzden
// sınırlandırılmış kök arama kullanılır (spec §3.3). Arama fiziksel sınırlarla
// kapatılır; sınırlar içinde kök yoksa hata döner, tahmin üretilmez.

export function solveWidthForZ0({ target, H, t = 0, epsR, structure = 'microstrip', b, S }) {
  if (!(target > 0)) return { error: IMP_ERR_INVALID }

  const height = structure === 'stripline' ? b : H
  if (!(height > 0)) return { error: IMP_ERR_INVALID }

  const evaluate = (W) => {
    if (structure === 'stripline') return stripline({ W, b: height, epsR })
    if (structure === 'cpw') return coplanarWaveguide({ W, S, epsR })
    return microstrip({ W, H: height, t, epsR })
  }

  const F = (W) => {
    const r = evaluate(W)
    return r.error ? NaN : r.Z0 - target
  }

  // Fiziksel arama sınırları: dielektrik yüksekliğinin binde biri ile 100 katı
  const solved = solveBounded(F, {
    x0: height,
    min: height / 1000,
    max: height * 100,
  })
  if (solved.error) {
    return { error: IMP_ERR_NO_SOLUTION }
  }

  return { W: solved.value, solvedBy: solved.method, ...evaluate(solved.value) }
}

// Hedef diferansiyel empedans için hat aralığı (W sabit tutulur, spec §6.8.2)
export function solveSpacingForZdiff({ target, W, H, t = 0, epsR, structure = 'microstrip' }) {
  if (!(target > 0)) return { error: IMP_ERR_INVALID }

  const F = (S) => {
    const r = differentialPair({ structure, W, S, H, t, epsR })
    return r.error ? NaN : r.Zdiff - target
  }

  const solved = solveBounded(F, { x0: H, min: H / 500, max: H * 50 })
  if (solved.error) {
    return { error: IMP_ERR_NO_SOLUTION }
  }

  return {
    S: solved.value,
    solvedBy: solved.method,
    ...differentialPair({ structure, W, S: solved.value, H, t, epsR }),
  }
}

// --- Tolerans (spec §3.4) ---
//
// Z0; W, H, t ve εr'de monoton olduğundan uç kombinasyonları yeterlidir.
// W ve t artınca Z0 düşer; H artınca yükselir; εr artınca düşer.
export function impedanceTolerance({ W, H, t = 0, epsR, tolW = 0, tolH = 0, tolT = 0, tolEps = 0, structure = 'microstrip', b }) {
  const evaluate = (w, h, tt, er) => {
    const r = structure === 'stripline'
      ? stripline({ W: w, b: h, epsR: er })
      : microstrip({ W: w, H: h, t: tt, epsR: er })
    return r.error ? NaN : r.Z0
  }

  const height = structure === 'stripline' ? b : H
  const scale = (x, pct, sign) => x * (1 + (sign * pct) / 100)

  const nom = evaluate(W, height, t, epsR)
  // En yüksek Z0: dar hat, ince bakır, kalın dielektrik, düşük εr
  const max = evaluate(
    scale(W, tolW, -1), scale(height, tolH, +1), scale(t, tolT, -1), scale(epsR, tolEps, -1),
  )
  const min = evaluate(
    scale(W, tolW, +1), scale(height, tolH, -1), scale(t, tolT, +1), scale(epsR, tolEps, +1),
  )

  return {
    min, nom, max,
    spread: max - min,
    spreadPct: nom > 0 ? (100 * (max - min)) / nom : NaN,
    minPct: nom > 0 ? (100 * (min - nom)) / nom : NaN,
    maxPct: nom > 0 ? (100 * (max - nom)) / nom : NaN,
  }
}
