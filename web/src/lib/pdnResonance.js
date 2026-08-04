// PDN Rezonans ve Antirezonans Analizörü (REV2 §10).
//
// Mevcut `pdn.js` (PDN Target Impedance / Decoupling) FARKLI bir motordur ve
// buradan hiçbir şey içe aktarılmaz: o araç sabit yatay hedef empedans ve tek
// frekanslı kapasitör ağı hesabı yapar, bu motor ise VRM + kondansatör
// grupları + plane kolunu birlikte, tüm bir frekans sweep'i boyunca kompleks
// olarak çözer ve doğrulanmış rezonans/antirezonans tepelerini bulur —
// "ileri seviye devamı" (REV2 §10.1).
//
// Terminoloji: dB(|Z|) eğrisinde LOKAL MAKSİMUM = antirezonans (paralel LC
// etkisiyle empedansın yükseldiği nokta), LOKAL MİNİMUM = rezonans (seri LC
// etkisiyle empedansın çöktüğü nokta). REV2 §10.9 metni bunu "tepe/çukur"
// olarak nötr adlandırıyor; peaks.js'in `peaks`/`valleys` alanları burada
// aynen bu anlamda kullanılır.
//
// Ortak altyapı — kopya yazılmaz:
//   complex.js → kompleks aritmetik (Y_total = Σ1/Z_k, Z_total = 1/Y_total)
//   sweep.js   → logspace (frekans sweep'i her zaman logaritmik, REV2 §17)
//   peaks.js   → findResonances (dB tabanlı prominence, kararlar §3.1 ile
//                birebir aynı politika; prominence mantığı burada TEKRAR
//                YAZILMAZ)
//
// L_via,eq: REV2 §10.2 kondansatör grubu girdilerinde "Via inductance" doğrudan
// bir değer olarak listelenir (H/D geometrisi değil) — bu yüzden via.js'teki
// viaInductance({H, D}) burada KULLANILMAZ, kullanıcı L_via,eq'yi doğrudan verir.

import { add, scale, parallel, abs } from './complex'
import { logspace } from './sweep'
import { findResonances, PROMINENCE_DEFAULT_DB } from './peaks'

export const PDNR_ERR_INVALID = 'invalid'
export const PDNR_ERR_NO_BRANCHES = 'no-branches'
export const PDNR_ERR_DERATING_RANGE = 'derating-out-of-range'
export const PDNR_ERR_TOLERANCE_RANGE = 'tolerance-out-of-range'

// --- §10.3 Hedef empedans ---
//
// Z_target = ΔV_allowed / ΔI_step ; yüzde ripple verilirse ΔV_allowed = V_rail·r.
// REV2 açıkça belirtiyor: bu hedef bütün frekanslarda gerçek sistem
// stabilitesini GARANTİ ETMEZ — ekran katmanı bu notu göstermeli.
export function targetImpedance({ Vrail = null, ripplePct = null, deltaVAllowed = null, deltaI }) {
  if (!(deltaI > 0)) return { error: PDNR_ERR_INVALID }

  let dV = deltaVAllowed
  let fromRipplePct = false
  if (!(dV > 0)) {
    if (!(Vrail > 0) || !(ripplePct > 0)) return { error: PDNR_ERR_INVALID }
    dV = Vrail * (ripplePct / 100)
    fromRipplePct = true
  }

  return { Ztarget: dV / deltaI, deltaVAllowed: dV, deltaI, fromRipplePct }
}

// --- §10.4 Kondansatör modeli ---

// ESL_total = ESL_component + L_mount + L_via,eq (kararlar §4 — tek resmî sembol)
export function eslTotal({ eslComponent = 0, Lmount = 0, LviaEq = 0 }) {
  if (!(eslComponent >= 0) || !(Lmount >= 0) || !(LviaEq >= 0)) return NaN
  return eslComponent + Lmount + LviaEq
}

// Z_C(f) = ESR + jω·ESL_total + 1/(jω·C_effective) ; 1/(jωC) = −j/(ωC).
export function capacitorBranchImpedance({ f, ESR = 0, ESLtotal = 0, Ceffective }) {
  if (!(f > 0) || !(ESR >= 0) || !(ESLtotal >= 0) || !(Ceffective > 0)) {
    return { error: PDNR_ERR_INVALID }
  }
  const omega = 2 * Math.PI * f
  return { re: ESR, im: omega * ESLtotal - 1 / (omega * Ceffective) }
}

/**
 * §10.4 — N ideal ve bağımsız kolun toplamı: Z_C,N = Z_C / N.
 *
 * Bütün bağlantı endüktanslarının BAĞIMSIZ olduğu varsayımına dayanır. Ortak
 * via veya ortak boyun kullanılıyorsa gerçek endüktans 1/N kadar düşmez —
 * REV2 bunu açıkça "iyimser olabilir" diye işaretliyor (kararlar §4). Daha
 * gerçekçi paylaşılan/bireysel model için sharedIndividualGroupImpedance
 * kullanılır.
 */
export function capacitorGroupImpedance({
  f, ESR = 0, eslComponent = 0, Lmount = 0, LviaEq = 0, Ceffective, count = 1,
}) {
  if (!(count > 0)) return { error: PDNR_ERR_INVALID }
  const zSingle = capacitorBranchImpedance({
    f, ESR, ESLtotal: eslTotal({ eslComponent, Lmount, LviaEq }), Ceffective,
  })
  if (zSingle.error) return zSingle
  return scale(zSingle, 1 / count)
}

// §10.4 "daha gerçekçi model": Z_group = Z_shared + Z_individual/N. REV2 §10.2
// girdi listesinde ayrı bir "paylaşılan endüktans" alanı yok; bu yüzden ana
// sweep'te (capacitorGroupImpedance) zorunlu değildir — isteyen çağıran için
// ayrı bir yapı taşı olarak durur.
export function sharedIndividualGroupImpedance({ Zshared, Zindividual, count }) {
  if (!(count > 0)) return { error: PDNR_ERR_INVALID }
  return add(Zshared, scale(Zindividual, 1 / count))
}

// --- §10.5 Self resonance ---

// f_SRF = 1 / (2π√(ESL_total·C)) — SRF altında kapasitif, üstünde endüktif.
export function selfResonantFrequency({ ESLtotal, C }) {
  if (!(ESLtotal > 0) || !(C > 0)) return NaN
  return 1 / (2 * Math.PI * Math.sqrt(ESLtotal * C))
}

// Kondansatör grubu tanımından kısayol (ESL_total'i kendi hesaplar).
export function capacitorGroupSrf({ eslComponent = 0, Lmount = 0, LviaEq = 0, Ceffective }) {
  return selfResonantFrequency({
    ESLtotal: eslTotal({ eslComponent, Lmount, LviaEq }), C: Ceffective,
  })
}

// --- §10.6 VRM modeli ---

/**
 * Basit seri model: Z_VRM = R + jωL. REV2 metni "İsteğe bağlı çıkış
 * kondansatörü eklenirse bu kol kompleks olarak oluşturulur" diyor ama
 * topolojiyi (seri mi paralel mi) açıkça vermiyor. Çıkış kondansatörünün
 * fiziksel rolü — VRM'in R+jωL çıkış empedansını yüksek frekansta düşürmek —
 * yalnızca PARALEL bağlantıyla tutarlıdır (seri C, DC'de bloke eder ve "çıkış
 * empedansı" tanımıyla çelişirdi). Bu yüzden C verildiğinde kol
 * parallel(R+jωL, 1/(jωC)) olarak kurulur; bu bilinçli bir mühendislik
 * yorumudur, REV2'de birebir formül verilmez.
 */
export function vrmImpedance({ f, R = 0, L = 0, C = null }) {
  if (!(f > 0) || !(R >= 0) || !(L >= 0)) return { error: PDNR_ERR_INVALID }
  const omega = 2 * Math.PI * f
  const zRL = { re: R, im: omega * L }
  if (C === null) return zRL
  if (!(C > 0)) return { error: PDNR_ERR_INVALID }
  return parallel([zRL, { re: 0, im: -1 / (omega * C) }])
}

// --- §10.7 Plane modeli ---

// Z_plane = R + jωL + 1/(jωC) — gerçek cavity modlarını İÇERMEYEN lumped model.
export function planeImpedance({ f, R = 0, L = 0, C }) {
  if (!(f > 0) || !(R >= 0) || !(L >= 0) || !(C > 0)) return { error: PDNR_ERR_INVALID }
  const omega = 2 * Math.PI * f
  return { re: R, im: omega * L - 1 / (omega * C) }
}

// --- §10.8 Toplam empedans ---

// Y_total = Σ 1/Z_k ; Z_total = 1/Y_total — complex.js'in parallel()'i birebir bu.
export function pdnImpedanceAt({ f, vrm = null, capGroups = [], plane = null }) {
  if (!(f > 0)) return { error: PDNR_ERR_INVALID }

  const branches = []

  if (vrm) {
    const zVrm = vrmImpedance({ f, R: vrm.R ?? 0, L: vrm.L ?? 0, C: vrm.C ?? null })
    if (zVrm.error) return zVrm
    branches.push(zVrm)
  }

  for (const g of capGroups) {
    const zg = capacitorGroupImpedance({
      f,
      ESR: g.ESR ?? 0,
      eslComponent: g.eslComponent ?? 0,
      Lmount: g.Lmount ?? 0,
      LviaEq: g.LviaEq ?? 0,
      Ceffective: g.Ceffective,
      count: g.count ?? 1,
    })
    if (zg.error) return zg
    branches.push(zg)
  }

  if (plane) {
    const zp = planeImpedance({ f, R: plane.R ?? 0, L: plane.L ?? 0, C: plane.C })
    if (zp.error) return zp
    branches.push(zp)
  }

  if (branches.length === 0) return { error: PDNR_ERR_NO_BRANCHES }

  return parallel(branches)
}

// --- §10.9 Rezonans ve antirezonans tespiti ---
//
// Tepe/çukur tespiti dB gösterimi üzerinde, prominence tabanlı yapılır —
// mantık burada TEKRAR YAZILMAZ, doğrudan peaks.js → findResonances çağrılır
// (kararlar §3.1). Frekans ekseni her zaman logaritmiktir (sweep.js).
export function pdnResonanceSweep({
  fMin, fMax, points, vrm = null, capGroups = [], plane = null,
  threshold = PROMINENCE_DEFAULT_DB, Ztarget = null,
}) {
  const sw = logspace(fMin, fMax, points)
  if (sw.error) return sw

  const freqs = sw.values
  const n = freqs.length
  const impedances = new Array(n)
  const magnitudes = new Array(n)

  for (let i = 0; i < n; i++) {
    const z = pdnImpedanceAt({ f: freqs[i], vrm, capGroups, plane })
    if (z.error) return z
    impedances[i] = z
    magnitudes[i] = abs(z)
  }

  const res = findResonances(freqs, magnitudes, { threshold })
  if (res.error) return res

  // §10.9.5 — her doğrulanmış tepe için: frekans, empedans (peaks.js zaten
  // verir), target oranı (burada eklenir), komşu uçlara göre prominence
  // (peaks.js zaten verir).
  const withRatio = (c) => ({
    ...c,
    ratioToTarget: Number.isFinite(Ztarget) && Ztarget > 0 ? c.magnitude / Ztarget : null,
  })

  return {
    freqs,
    magnitudes,
    impedances,
    peaks: res.peaks.map(withRatio), // antirezonans — |Z| lokal maksimumu
    valleys: res.valleys.map(withRatio), // rezonans — |Z| lokal minimumu
    candidates: res.candidates.map(withRatio),
    threshold: res.threshold,
    maxImpedance: Math.max(...magnitudes),
    Ztarget,
  }
}

// --- §10.10 Düşük frekans kapasite ihtiyacı ---

// C_min ≥ ΔI·Δt / ΔV — ESR, ESL ve VRM cevabını İÇERMEZ.
export function minLowFrequencyCapacitance({ deltaI, deltaT, deltaV }) {
  if (!(deltaI > 0) || !(deltaT > 0) || !(deltaV > 0)) return NaN
  return (deltaI * deltaT) / deltaV
}

// Aynı ΔQ = ΔI·Δt = C·ΔV bağıntısının ΔV_C için çözümü (gerçek/verilen C ile).
export function capacitiveDroop({ deltaI, deltaT, C }) {
  if (!(deltaI > 0) || !(deltaT > 0) || !(C > 0)) return NaN
  return (deltaI * deltaT) / C
}

// ΔV_ESR = ΔI·ESR_eq
export function esrDroop({ deltaI, ESReq }) {
  if (!(deltaI > 0) || !(ESReq >= 0)) return NaN
  return deltaI * ESReq
}

// ΔV_ESL = L_eq·di/dt ; di/dt verilmezse load step / rise time'dan türetilir.
export function eslDroop({ Leq, deltaI = null, tRise = null, diDt = null }) {
  const rate = diDt ?? (deltaI !== null && tRise > 0 ? deltaI / tRise : NaN)
  if (!(Leq >= 0) || !Number.isFinite(rate)) return NaN
  return Leq * rate
}

/**
 * §10.10 — ΔV_approx ≈ ΔV_C + ΔV_ESR + ΔV_ESL.
 *
 * Bu cebirsel toplam, ana PDN kompleks empedans hesabının (pdnImpedanceAt /
 * pdnResonanceSweep) YERİNE kullanılmaz. Kapasitif droop, ESR step'i ve ESL
 * kaynaklı gerilim sıçramasının AYNI YÖNDE oluştuğu muhafazakâr bir zaman
 * alanı worst-case tahminidir; ortak kompleks empedans kuralının bilinçli ve
 * yalnızca bu tahmin için kullanılan istisnasıdır (kararlar §5, REV2 §10.10).
 * `engineeringRule` alanı ekran katmanının bu notu göstermesi içindir —
 * cümlenin kendisi burada değil, text.js'te durur.
 */
export function worstCaseDroopEstimate({
  deltaI, deltaT, tRise = null, diDt = null, C, ESReq = 0, Leq = 0,
}) {
  const dVC = capacitiveDroop({ deltaI, deltaT, C })
  const dVESR = esrDroop({ deltaI, ESReq })
  const dVESL = eslDroop({ Leq, deltaI, tRise, diDt })
  if (!Number.isFinite(dVC) || !Number.isFinite(dVESR) || !Number.isFinite(dVESL)) {
    return { error: PDNR_ERR_INVALID }
  }
  return {
    dVC, dVESR, dVESL,
    total: dVC + dVESR + dVESL,
    engineeringRule: 'worst-case-time-domain-estimate',
  }
}

// --- §10.11 Tolerans ---

// C_effective = C_nominal · K_DCbias · K_temperature · K_aging ; katsayılar [0,1].
export function deratedCapacitance({ Cnominal, kDcBias = 1, kTemperature = 1, kAging = 1 }) {
  if (!(Cnominal > 0)) return { error: PDNR_ERR_INVALID }
  for (const k of [kDcBias, kTemperature, kAging]) {
    if (!(k >= 0) || !(k <= 1)) return { error: PDNR_ERR_DERATING_RANGE }
  }
  return { Ceffective: Cnominal * kDcBias * kTemperature * kAging, kDcBias, kTemperature, kAging }
}

// Tolerans yüzdesinden min/nominal/maksimum kapasitans (derating ÖNCESİ).
// Cmin sıfıra veya altına inerse SIFIRA KIRPILMAZ, ayrı hata koduyla bildirilir.
export function toleranceCapacitanceBand({ Cnominal, tolerancePct }) {
  if (!(Cnominal > 0) || !(tolerancePct >= 0)) return { error: PDNR_ERR_INVALID }
  const delta = Cnominal * (tolerancePct / 100)
  const Cmin = Cnominal - delta
  const Cmax = Cnominal + delta
  if (!(Cmin > 0)) return { error: PDNR_ERR_TOLERANCE_RANGE, Cmin, Cnominal, Cmax }
  return { Cmin, Cnominal, Cmax }
}

// §10.11 "Minimum, nominal ve maksimum kapasitans sweep'i yapılır" — aynı ağ,
// her grubun kendi toleransı ve derating katsayılarıyla üç kez taranır.
export function pdnToleranceSweep({
  fMin, fMax, points, vrm = null, capGroups = [], plane = null,
  threshold = PROMINENCE_DEFAULT_DB, Ztarget = null,
}) {
  if (!capGroups || capGroups.length === 0) return { error: PDNR_ERR_INVALID }

  const bandGroups = { min: [], nominal: [], max: [] }

  for (const g of capGroups) {
    const band = toleranceCapacitanceBand({ Cnominal: g.Cnominal, tolerancePct: g.tolerancePct ?? 0 })
    if (band.error) return band

    const derate = (C) => deratedCapacitance({
      Cnominal: C, kDcBias: g.kDcBias ?? 1, kTemperature: g.kTemperature ?? 1, kAging: g.kAging ?? 1,
    })
    const dMin = derate(band.Cmin)
    const dNom = derate(band.Cnominal)
    const dMax = derate(band.Cmax)
    if (dMin.error) return dMin
    if (dNom.error) return dNom
    if (dMax.error) return dMax

    bandGroups.min.push({ ...g, Ceffective: dMin.Ceffective })
    bandGroups.nominal.push({ ...g, Ceffective: dNom.Ceffective })
    bandGroups.max.push({ ...g, Ceffective: dMax.Ceffective })
  }

  const min = pdnResonanceSweep({ fMin, fMax, points, vrm, capGroups: bandGroups.min, plane, threshold, Ztarget })
  if (min.error) return min
  const nominal = pdnResonanceSweep({
    fMin, fMax, points, vrm, capGroups: bandGroups.nominal, plane, threshold, Ztarget,
  })
  if (nominal.error) return nominal
  const max = pdnResonanceSweep({ fMin, fMax, points, vrm, capGroups: bandGroups.max, plane, threshold, Ztarget })
  if (max.error) return max

  return { min, nominal, max }
}

// --- §10.12 Sonuçlar ---

// Target'ın aşıldığı frekans aralıkları — ardışık örnekler arasında dB
// enterpolasyonuyla geçiş frekansı kestirilir, ham nokta indeksi değil.
export function bandsOverTarget({ freqs, magnitudes, Ztarget }) {
  if (!(Ztarget > 0) || !Array.isArray(freqs) || freqs.length < 2 || freqs.length !== magnitudes.length) {
    return { error: PDNR_ERR_INVALID }
  }

  const targetDb = 20 * Math.log10(Ztarget)
  const crossFreq = (f0, f1, db0, db1) => {
    const t = (targetDb - db0) / (db1 - db0)
    return 10 ** (Math.log10(f0) + t * (Math.log10(f1) - Math.log10(f0)))
  }

  const bands = []
  let openStart = null

  for (let i = 0; i < freqs.length; i++) {
    const m = magnitudes[i]
    if (!(m > 0) || !Number.isFinite(m)) return { error: PDNR_ERR_INVALID }
    const db = 20 * Math.log10(m)
    const over = db > targetDb

    if (over && openStart === null) {
      openStart = i === 0
        ? freqs[0]
        : crossFreq(freqs[i - 1], freqs[i], 20 * Math.log10(magnitudes[i - 1]), db)
    } else if (!over && openStart !== null) {
      bands.push({ start: openStart, end: crossFreq(freqs[i - 1], freqs[i], 20 * Math.log10(magnitudes[i - 1]), db) })
      openStart = null
    }
  }
  if (openStart !== null) bands.push({ start: openStart, end: freqs[freqs.length - 1] })

  return { bands }
}

// Target altında kalan toplam bant yüzdesi — LOG-frekans ağırlıklı. Örnekler
// arasında doğrusal (dB) enterpolasyonla geçiş noktası kestirilir; aksi hâlde
// örnekleme sıklığı sonucu çarpıtırdı (sık örneklenen bölge fazla ağırlık alır).
export function bandUnderTargetPct({ freqs, magnitudes, Ztarget }) {
  if (!(Ztarget > 0) || !Array.isArray(freqs) || freqs.length < 2 || freqs.length !== magnitudes.length) {
    return NaN
  }

  const targetDb = 20 * Math.log10(Ztarget)
  let totalLog = 0
  let underLog = 0

  for (let i = 0; i < freqs.length - 1; i++) {
    const f0 = freqs[i]
    const f1 = freqs[i + 1]
    if (!(f0 > 0) || !(f1 > 0)) return NaN
    const l0 = Math.log10(f0)
    const l1 = Math.log10(f1)
    const span = l1 - l0
    if (!(span > 0)) continue
    totalLog += span

    const m0 = magnitudes[i]
    const m1 = magnitudes[i + 1]
    if (!(m0 > 0) || !(m1 > 0)) return NaN
    const db0 = 20 * Math.log10(m0)
    const db1 = 20 * Math.log10(m1)
    const under0 = db0 <= targetDb
    const under1 = db1 <= targetDb

    if (under0 && under1) {
      underLog += span
    } else if (under0 !== under1) {
      const t = (targetDb - db0) / (db1 - db0)
      underLog += under0 ? span * t : span * (1 - t)
    }
  }

  return totalLog > 0 ? (100 * underLog) / totalLog : NaN
}

/**
 * Bütün PDN rezonans değerlendirmesi — REV2 §10.12'nin toplayıcısı. Gerilimler
 * volt, akımlar amper, süreler saniye, frekanslar Hz, R ohm, L henry, C farad.
 */
export function pdnResonanceAnalysis({
  fMin, fMax, points,
  Vrail = null, ripplePct = null, deltaVAllowed = null, deltaI,
  vrm = null, capGroups = [], plane = null,
  threshold = PROMINENCE_DEFAULT_DB,
}) {
  const target = targetImpedance({ Vrail, ripplePct, deltaVAllowed, deltaI })
  if (target.error) return target

  const sweep = pdnResonanceSweep({
    fMin, fMax, points, vrm, capGroups, plane, threshold, Ztarget: target.Ztarget,
  })
  if (sweep.error) return sweep

  const over = bandsOverTarget({ freqs: sweep.freqs, magnitudes: sweep.magnitudes, Ztarget: target.Ztarget })
  if (over.error) return over
  const underPct = bandUnderTargetPct({ freqs: sweep.freqs, magnitudes: sweep.magnitudes, Ztarget: target.Ztarget })

  // En kötü antirezonans: doğrulanmış tepeler arasında |Z| en yüksek olan.
  const worstAntiresonance = sweep.peaks.length
    ? sweep.peaks.reduce((a, b) => (b.magnitude > a.magnitude ? b : a))
    : null

  const groupSrf = capGroups.map((g, i) => ({
    index: i,
    label: g.label ?? null,
    srf: capacitorGroupSrf(g),
  }))

  return {
    ok: true,
    target,
    sweep,
    maxImpedance: sweep.maxImpedance,
    overTargetBands: over.bands,
    underTargetPct: underPct,
    worstAntiresonance,
    groupSrf,
    threshold: sweep.threshold,
  }
}
