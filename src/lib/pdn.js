// Güç bütünlüğü — PDN hedef empedansı ve decoupling (spec §8.1, §8.2).
//
// Girişler SI: V, A, s, F, H, Ω, Hz, m².
//
// Bu modül SABİT YATAY hedef empedans yaklaşımını uygular (spec §8.1). Spec
// frekansa bağlı hedef profilin gelişmiş tasarımda kullanılabileceğini söylüyor
// ama denklemini vermiyor; o yüzden burada yok, uydurulmuyor.

import { EPS0 } from './units'

export const PDN_ERR_INVALID = 'invalid'
export const PDN_ERR_SINGULAR = 'singular'

// --- §8.1 Hedef empedans ---
//
// Z_target = ΔV_allowed / ΔI_step
// Tolerans yüzde verilmişse: ΔV_allowed = V_rail · T% / 100
//
// Referans (spec §13 Test 3): 1.0 V, %3, 5 A → 6 mΩ.

export function targetImpedance({ Vrail = null, tolerancePct = null, deltaV = null, deltaI }) {
  if (!(deltaI > 0)) {
    return { error: PDN_ERR_INVALID, message: 'Ani yük değişimi pozitif olmalı.' }
  }

  // Doğrudan ΔV verildiyse o kullanılır; verilmediyse raydan ve toleranstan türetilir
  let dV = deltaV
  let fromTolerance = false
  if (!(dV > 0)) {
    if (!(Vrail > 0) || !(tolerancePct > 0)) {
      return {
        error: PDN_ERR_INVALID,
        message: 'İzin verilen gerilim değişimi ya doğrudan ya da ray gerilimi + tolerans ile verilmeli.',
      }
    }
    dV = (Vrail * tolerancePct) / 100
    fromTolerance = true
  }

  return {
    Ztarget: dV / deltaI,
    deltaV: dV,
    deltaI,
    Vrail,
    tolerancePct,
    fromTolerance,
    // Sabit yatay hedef; frekansa bağlı profil bu fazda yok (spec §8.1)
    flatTarget: true,
  }
}

// --- §8.2 Minimum ideal kapasite ---
//
// ΔQ = ΔI·Δt  ve  ΔQ = C·ΔV  →  C_min = ΔI·Δt / ΔV
//
// Spec bu formülün ESR ve ESL etkisini İÇERMEDİĞİNİ açıkça söylüyor; sonuç
// bunu alan olarak taşır ki arayüz idealliği gizlemesin.
export function minimumCapacitance({ deltaI, deltaT, deltaV }) {
  if (!(deltaI > 0) || !(deltaT > 0) || !(deltaV > 0)) {
    return { error: PDN_ERR_INVALID, message: 'Akım değişimi, süre ve gerilim değişimi pozitif olmalı.' }
  }

  const charge = deltaI * deltaT
  return {
    C: charge / deltaV,
    charge,
    deltaI, deltaT, deltaV,
    includesEsrEsl: false,
  }
}

// --- §8.2.1 Gerçek kapasitör empedansı ---
//
// Z_C = ESR + j(ω·ESL − 1/(ω·C))
// |Z_C| = √(ESR² + (ω·ESL − 1/(ω·C))²)
// SRF = 1 / (2π·√(ESL·C)) — burada reaktanslar birbirini götürür, |Z_C| ≈ ESR

export function selfResonantFrequency({ C, ESL }) {
  if (!(C > 0) || !(ESL > 0)) {
    return { error: PDN_ERR_INVALID, message: 'Kapasite ve ESL pozitif olmalı.' }
  }
  return { srf: 1 / (2 * Math.PI * Math.sqrt(ESL * C)) }
}

export function capacitorImpedance({ C, ESR = 0, ESL = 0, f }) {
  if (!(C > 0) || !(f > 0) || !(ESR >= 0) || !(ESL >= 0)) {
    return { error: PDN_ERR_INVALID, message: 'Kapasite ve frekans pozitif, ESR/ESL negatif olmayan olmalı.' }
  }

  const omega = 2 * Math.PI * f
  // Kapasitif bölge negatif, endüktif bölge pozitif reaktans verir
  const X = omega * ESL - 1 / (omega * C)
  const mag = Math.sqrt(ESR * ESR + X * X)

  const srf = ESL > 0 ? 1 / (2 * Math.PI * Math.sqrt(ESL * C)) : Infinity

  return {
    mag,
    re: ESR,
    im: X,
    omega, f, C, ESR, ESL,
    srf,
    inductive: X > 0,
    // SRF'nin üstünde kapasitör endüktif davranır; bu bilgi seçim kararının kendisidir
    aboveSrf: f > srf,
  }
}

// --- §8.2.2 Paralel kapasitör ağı ---
//
// Z_total(ω) = [ Σ 1/Z_i(ω) ]⁻¹
//
// Toplam KOMPLEKS admitans üzerinden alınır. Gerçel büyüklükleri toplamak
// anti-rezonans tepelerini yok eder; spec bu yaklaşımın tepeleri "doğal olarak
// göstermesini" bekliyor, o yüzden kompleks toplam zorunludur.
//
// N adet aynı kapasitör için spec: C_eq = N·C, ESR_eq = ESR/N, ESL_eq = ESL/N.
// Bu, tek kapasitörün admitansını N ile çarpmakla özdeştir; burada öyle
// uygulanır. UYARI (spec §8.2.2): ortak via veya ortak dar bağlantı varsa ESL
// tam olarak 1/N azalmaz — sonuç bunu `idealSharing` alanıyla bildirir.

// Kompleks tersleme: 1/(R + jX) = (R − jX) / (R² + X²)
function admittanceOf(re, im) {
  const d = re * re + im * im
  if (!(d > 0)) return null
  return { g: re / d, b: -im / d }
}

/**
 * @param {Array<{C, ESR, ESL, count}>} caps
 * @param {number} f  Hz
 */
export function parallelNetworkImpedance(caps, f) {
  if (!Array.isArray(caps) || caps.length === 0) {
    return { error: PDN_ERR_INVALID, message: 'En az bir kapasitör gerekli.' }
  }
  if (!(f > 0)) return { error: PDN_ERR_INVALID, message: 'Frekans pozitif olmalı.' }

  let g = 0
  let b = 0

  for (const c of caps) {
    const n = c.count ?? 1
    if (!(n > 0)) return { error: PDN_ERR_INVALID, message: 'Kapasitör adedi pozitif olmalı.' }

    // ESR > 0 ZORUNLU. Kayıpsız kapasitör bu modelde dejenere: kendi rezonans
    // frekansında empedansı tam sıfır, anti-rezonans tepesi ise sonsuz olur ve
    // SRF civarındaki sonuçlar fizik değil yuvarlama gürültüsü haline gelir.
    // Gerçek kapasitörün ESR'si vardır; spec §8.2.1 modeli de ESR'yi açıkça
    // içerir. Tahmin üretmek yerine hata döndürülür.
    if (!(c.ESR > 0)) {
      return {
        error: PDN_ERR_SINGULAR,
        message: 'Her kapasitör için ESR > 0 girilmeli; kayıpsız kapasitör rezonansta sıfır empedans verir ve sonuç anlamsızlaşır.',
      }
    }

    const z = capacitorImpedance({ C: c.C, ESR: c.ESR, ESL: c.ESL ?? 0, f })
    if (z.error) return z

    const y = admittanceOf(z.re, z.im)
    if (!y) return { error: PDN_ERR_SINGULAR, message: 'Kapasitör empedansı bu frekansta tekil.' }

    g += n * y.g
    b += n * y.b
  }

  const y2 = g * g + b * b
  if (!(y2 > 0)) {
    return { error: PDN_ERR_SINGULAR, message: 'Ağ empedansı bu frekansta hesaplanamıyor.' }
  }

  const re = g / y2
  const im = -b / y2

  return {
    re, im,
    mag: Math.sqrt(re * re + im * im),
    f,
    count: caps.reduce((a, c) => a + (c.count ?? 1), 0),
    // ESL'in 1/N ölçeklenmesi ortak via/bağlantı yoksa geçerlidir
    idealSharing: true,
  }
}

// Aynı nominal değerde N kapasitörün spec §8.2.2 eşdeğerleri.
// Ayrı fonksiyon, çünkü ekran bu üç sayıyı doğrudan gösteriyor.
export function identicalBank({ C, ESR, ESL, count }) {
  if (!(C > 0) || !(count > 0)) {
    return { error: PDN_ERR_INVALID, message: 'Kapasite ve adet pozitif olmalı.' }
  }
  return {
    Ceq: count * C,
    ESReq: ESR > 0 ? ESR / count : 0,
    ESLeq: ESL > 0 ? ESL / count : 0,
    count,
    // Ortak via/dar bağlantı varsa ESL 1/N azalmaz (spec §8.2.2)
    idealSharing: true,
  }
}

// --- §8.2.3 Plane capacitance ---
//
// C = ε₀·εr·A / d
// Kenar saçılması bu basit denklemde YOKTUR (spec §8.2.3).
export function planeCapacitance({ area, d, epsR }) {
  if (!(area > 0) || !(d > 0) || !(epsR >= 1)) {
    return { error: PDN_ERR_INVALID, message: 'Alan, dielektrik kalınlığı pozitif ve εr ≥ 1 olmalı.' }
  }
  return {
    C: (EPS0 * epsR * area) / d,
    area, d, epsR,
    fringingIncluded: false,
  }
}

// --- §8.2.4 Toplam PDN empedansı ---
//
// Z_PDN(ω) = [ 1/Z_VRM + 1/Z_caps + jω·C_plane ]⁻¹
//
// Spec Z_VRM için denklem VERMİYOR — VRM modeli kullanıcıdan gelir. Burada
// R + jωL olarak alınır; ωL endüktif reaktansın tanımıdır, uydurma bir model
// değildir. L verilmezse VRM saf dirençtir.
export function pdnImpedance({ caps = [], vrm = null, Cplane = 0, f }) {
  if (!(f > 0)) return { error: PDN_ERR_INVALID, message: 'Frekans pozitif olmalı.' }

  const omega = 2 * Math.PI * f
  let g = 0
  let b = 0

  const capsZ = caps.length ? parallelNetworkImpedance(caps, f) : null
  if (capsZ && capsZ.error) return capsZ
  if (capsZ) {
    const y = admittanceOf(capsZ.re, capsZ.im)
    if (!y) return { error: PDN_ERR_SINGULAR, message: 'Kapasitör ağı bu frekansta tekil.' }
    g += y.g
    b += y.b
  }

  if (vrm) {
    const R = vrm.R ?? 0
    const L = vrm.L ?? 0
    if (!(R > 0) && !(L > 0)) {
      return { error: PDN_ERR_INVALID, message: 'VRM için direnç veya endüktans verilmeli.' }
    }
    const y = admittanceOf(R, omega * L)
    if (!y) return { error: PDN_ERR_SINGULAR, message: 'VRM empedansı bu frekansta tekil.' }
    g += y.g
    b += y.b
  }

  // Düzlem kapasitansı doğrudan admitans olarak eklenir: Y = jω·C
  // Spec §8.2.4 düzlemi KAYIPSIZ yazıyor (yalnızca jωC). Kayıpsız olduğu için
  // ürettiği anti-rezonans tepesi sönümsüzdür; gerçek düzlemde kayıp vardır ve
  // tepe daha alçaktır. Sonuç bunu `losslessPlane` ile bildirir.
  if (Cplane > 0) b += omega * Cplane

  const y2 = g * g + b * b
  if (!(y2 > 0)) {
    return { error: PDN_ERR_INVALID, message: 'En az bir PDN bileşeni (kapasitör, VRM veya düzlem) gerekli.' }
  }

  const re = g / y2
  const im = -b / y2

  return {
    re, im,
    mag: Math.sqrt(re * re + im * im),
    f, omega,
    capsMag: capsZ ? capsZ.mag : null,
    Cplane,
    // Bağlantı loop endüktansı BU HESABA DAHİL DEĞİL; ayrı eklenmeli (spec §8.2.4)
    mountingIncluded: false,
    // Düzlem kayıpsız modellendi; gerçek tepe bundan alçaktır
    losslessPlane: Cplane > 0,
    // Ağ bu frekansta endüktifse paralel eklenen her kapasite anti-rezonans
    // tepesi üretebilir — empedansı DÜŞÜRMEZ, yükseltebilir
    inductive: im > 0,
  }
}

// --- §8.2.4 Bağlantı loop endüktansı ---
//
// L_loop = ESL_component + L_mount + L_via + L_plane-spread
//
// Spec bu dört terimin TOPLANDIĞINI söylüyor ama L_mount, L_via ve
// L_plane-spread için denklem vermiyor — değerler kullanıcıdan veya alan
// çözücüden gelir. Burada yalnızca toplam alınır, terim uydurulmaz.
export function loopInductance({ eslComponent = 0, Lmount = 0, Lvia = 0, Lspread = 0 }) {
  const terms = [eslComponent, Lmount, Lvia, Lspread]
  if (terms.some((x) => !(x >= 0))) {
    return { error: PDN_ERR_INVALID, message: 'Endüktans terimleri negatif olmayan olmalı.' }
  }

  const total = terms.reduce((a, x) => a + x, 0)
  if (!(total > 0)) {
    return { error: PDN_ERR_INVALID, message: 'En az bir endüktans terimi pozitif olmalı.' }
  }

  return {
    total,
    eslComponent, Lmount, Lvia, Lspread,
    // Toplam içindeki paylar — hangi terimin baskın olduğu tasarım kararıdır
    shares: {
      component: eslComponent / total,
      mount: Lmount / total,
      via: Lvia / total,
      spread: Lspread / total,
    },
  }
}
