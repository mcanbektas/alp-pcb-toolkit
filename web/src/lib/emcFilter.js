// EMC LC, Pi ve Ortak Mod Filtre Tasarım Aracı (REV2 §12).
//
// Üç topoloji: 'lc' (seri L + şönt C), 'pi' (şönt C1 + seri L + şönt C2),
// 'cm-choke' (ortak mod bobini — differential-mode ekleme yolu, leakage
// endüktansı + line-to-line kapasitans üzerinden aynı L-C merdiveniyle
// modellenir; ortak mod empedansı ayrı ve doğrudan raporlanır, §12.9).
//
// Gerçek filtre topolojisinde kaynak ve yük empedansları şönt/seri kolların
// büyüklüğüyle KARIŞTIRILAMAZ (REV2 §12.4: "nihai sonuç kompleks nodal
// çözümden alınır"). Bu yüzden her topoloji önce YALNIZ kendi L/C/damping
// kollarından bir ABCD (zincir) matrisi kurar; kaynak/yük empedansı bu
// matrisin ÜZERİNE ayrı kapalı-form bağıntılarla (twoPortTransfer /
// twoPortOutputImpedance) uygulanır. Bu ayrım tesadüfi değil: REV2 §12.7'nin
// K_Z kriteri açıkça Middlebrook'un "extra element" / 2-port filtre
// teorisinden türüyor — aynı ayrım olmadan Z_out,filter'ı yükten (converter)
// BAĞIMSIZ tanımlamanın bir yolu yok.
//
// ABCD/2-port makineleri BİLİNÇLİ olarak complex.js'e değil buraya konur:
// complex.js'in kendi sınırı "yalnız aritmetik", devre/ağ modelleri onu
// kullanan motor dosyasında durur (complex.js başlık yorumu).
//
// Ortak altyapı — kopya yazılmaz:
//   complex.js → kompleks aritmetik (add/mul/div/inv/scale/abs/parallel)
//   sweep.js   → logspace (frekans sweep'i her zaman logaritmik) + toDb
//
// Kardeş motor pdnResonance.js (REV2 §10, aynı REV2 Adım 4 turunda yazıldı)
// ile tutarlılık için aynı iki kural izlenir: (1) kompleks sonuç üreten
// kurucu fonksiyonlar hata durumunda {re:NaN,im:NaN} DEĞİL {error: KOD}
// döner — böylece `if (z.error) return z` zinciriyle birleşir; (2) frekans
// argümanı her yerde KESİN pozitiftir (f > 0, f >= 0 değil) — sweep.js zaten
// f <= 0'ı LOG_AXIS_NONPOSITIVE ile eliyor, bu motor aynı sınırı tekrar eder.
//
// Sembol notu — REV2 §12.2 iki AYRI gerilim listeler: "Kaynak gerilimi"
// (V_source, §12.6'daki H(f)=Vout/Vsource'un kaynağı — burada damping
// direncindeki güç kaybını hesaplamak için kullanılan AC/gürültü genliği,
// RMS büyüklük kabul edilir) ve "Giriş voltajı" (V_in, §12.7'nin converter
// çalışma gerilimi). Bu iki parametre KASITLI olarak ayrı tutulur
// (vSource ≠ vIn); karıştırılırsa P_R_D ile R_in,neg birbirini kirletir.
//
// Sembol notu 2 — REV2 §12.2 "Converter giriş gücü" listeler ama §12.7
// formülü açıkça P_in = P_out/η verir ve η'yı (verim) ayrı bir girdi olarak
// sayar. İkisi birlikte tutulduğunda (P_in doğrudan girilseydi η kullanılmaz
// kalırdı) yalnız §12.7'nin formülü uygulanabilir kalıyor; bu yüzden bu
// motor P_out + η alır, P_in'i TÜRETİR (pOut, efficiency → pIn). Adım 5
// ekranı alan adını "converter çıkış gücü" olarak sunmalı — bu ayrışma
// raporda ayrıca bildirilecek.

import {
  add, mul, div, inv, scale, abs, parallel,
} from './complex'
import { logspace, toDb } from './sweep'

export const EMC_ERR_INVALID = 'invalid'
export const EMC_ERR_TOPOLOGY = 'invalid-topology'

// Ekranın topoloji seçicisi bu listeyi kullanır — sabit dize üç kez kopyalanmaz.
export const EMC_TOPOLOGIES = ['lc', 'pi', 'cm-choke']

const I = { re: 1, im: 0 }
const O = { re: 0, im: 0 }

// --- 12.3 İdeal cutoff ---

// f_0 = 1 / (2π√(LC))
export function idealCutoffFrequency({ L, C }) {
  if (!(L > 0) || !(C > 0)) return NaN
  return 1 / (2 * Math.PI * Math.sqrt(L * C))
}

// Z_0 = √(L/C)
export function characteristicImpedance({ L, C }) {
  if (!(L > 0) || !(C > 0)) return NaN
  return Math.sqrt(L / C)
}

// --- 12.4 Basitleştirilmiş seri RLC damping (referans amaçlı) ---
//
// Bu iki fonksiyon REV2'nin açıkça "basitleştirilmiş" dediği tek-dirençli seri
// RLC yaklaşımıdır. Gerçek filtre topolojisinde kaynak/yük empedansı farklı
// olduğu için asıl sönümleme davranışı bu formülden DEĞİL, aşağıdaki tam
// kompleks ağ çözümünden (filterResponse → evaluateDampingCandidate) gelir.

// ζ = (R/2)√(C/L)
export function dampingRatio({ R, L, C }) {
  if (!(R >= 0) || !(L > 0) || !(C > 0)) return NaN
  return (R / 2) * Math.sqrt(C / L)
}

// Q = 1/(2ζ) = (1/R)√(L/C)
export function qualityFactor({ R, L, C }) {
  if (!(R > 0) || !(L > 0) || !(C > 0)) return NaN
  return (1 / R) * Math.sqrt(L / C)
}

// --- 12.5 Kompleks komponent modelleri ---

// Z_L = DCR + jωL ; parazitik paralel kapasite varsa Z_L,real = Z_L ∥ 1/(jωC_p).
export function inductorImpedance({
  dcr = 0, L, f, parallelC = 0,
}) {
  if (!(L > 0) || !(f > 0) || !(dcr >= 0) || !(parallelC >= 0)) return { error: EMC_ERR_INVALID }
  const omega = 2 * Math.PI * f
  const zL = { re: dcr, im: omega * L }
  if (!(parallelC > 0)) return zL
  return parallel([zL, { re: 0, im: -1 / (omega * parallelC) }])
}

// Z_C = ESR + jω·ESL + 1/(jωC) = ESR + j(ωESL − 1/(ωC))
export function capacitorImpedance({
  esr = 0, esl = 0, C, f,
}) {
  if (!(C > 0) || !(f > 0) || !(esr >= 0) || !(esl >= 0)) return { error: EMC_ERR_INVALID }
  const omega = 2 * Math.PI * f
  return { re: esr, im: omega * esl - 1 / (omega * C) }
}

// Z_D = R_D + 1/(jωC_D). C_D verilmezse (0/null) saf dirençli kol: Z_D = R_D.
// REV2 §12.8: "Damping capacitance için sabit tek formül kullanılmaz. Kullanıcı
// değer girebilmelidir" — C_D'siz (yalnız R_D) bir aday da geçerli bir adaydır.
export function dampingBranchImpedance({ rD = 0, cD = 0, f }) {
  if (!(rD >= 0) || !(cD >= 0) || !(f > 0)) return { error: EMC_ERR_INVALID }
  if (!(cD > 0)) return { re: rD, im: 0 }
  const omega = 2 * Math.PI * f
  return { re: rD, im: -1 / (omega * cD) }
}

// --- Genel iki-kapılı (ABCD) makinesi ---
//
// Merdiven ağı: seri empedans Z → [[1,Z],[0,1]] ; şönt empedans Z (admitans
// 1/Z) → [[1,0],[1/Z,1]]. Zincirleme matris çarpımıdır. Kaynak/yük empedansı
// bu zincire eklenmez — twoPortTransfer / twoPortOutputImpedance'a ayrıca
// verilir (bkz. dosya başlığı).

export function seriesStage(z) {
  return { A: I, B: z, C: O, D: I }
}

export function shuntStage(z) {
  return { A: I, B: O, C: inv(z), D: I }
}

export function cascadeAbcd(stages) {
  return stages.reduce((m1, m2) => ({
    A: add(mul(m1.A, m2.A), mul(m1.B, m2.C)),
    B: add(mul(m1.A, m2.B), mul(m1.B, m2.D)),
    C: add(mul(m1.C, m2.A), mul(m1.D, m2.C)),
    D: add(mul(m1.C, m2.B), mul(m1.D, m2.D)),
  }), { A: I, B: O, C: O, D: I })
}

// Vout/Vsource = ZL / (A·ZL + B + C·Zs·ZL + D·Zs)
export function twoPortTransfer({ abcd, zSource, zLoad }) {
  const { A, B, C, D } = abcd
  const den = add(
    add(mul(A, zLoad), B),
    add(mul(mul(C, zSource), zLoad), mul(D, zSource)),
  )
  return div(zLoad, den)
}

// Z_out (Thevenin, yük hariç, kaynak dahil) = (B + Zs·D) / (A + Zs·C)
export function twoPortOutputImpedance({ abcd, zSource }) {
  const { A, B, C, D } = abcd
  return div(add(B, mul(zSource, D)), add(A, mul(zSource, C)))
}

// --- 12.6 Topoloji ağları ---
//
// Damping kolu HER ÜÇ topolojide de ÇIKIŞ şönt kondansatörüne (lc: C, pi: C2,
// cm-choke: C_LL) paralel yerleşir — bu, K_Z/Z_out,filter'ın ölçüldüğü TAM
// düğümdür ve klasik "çıkış kapasitörü üstü RC damper" tekniğiyle örtüşür.
// REV2 metni damping kolunun HANGİ düğüme bağlandığını açıkça vermiyor; bu
// bilinçli bir mühendislik yorumudur (R_D ≈ √(L/C) başlangıç tahmini de aynı
// düğümdeki L/C çiftini hedefler).

function lcNetwork(f, { L, dcr = 0, parallelC = 0, C, esr = 0, esl = 0 } = {}, damping) {
  const zL = inductorImpedance({ dcr, L, f, parallelC })
  if (zL.error) return zL
  const zC = capacitorImpedance({ esr, esl, C, f })
  if (zC.error) return zC

  const branches = [zC]
  if (damping) {
    const zD = dampingBranchImpedance({ ...damping, f })
    if (zD.error) return zD
    branches.push(zD)
  }
  return { abcd: cascadeAbcd([seriesStage(zL), shuntStage(parallel(branches))]) }
}

function piNetwork(f, {
  L, dcr = 0, parallelC = 0, C1, esr1 = 0, esl1 = 0, C2, esr2 = 0, esl2 = 0,
} = {}, damping) {
  const zC1 = capacitorImpedance({ esr: esr1, esl: esl1, C: C1, f })
  if (zC1.error) return zC1
  const zL = inductorImpedance({ dcr, L, f, parallelC })
  if (zL.error) return zL
  const zC2 = capacitorImpedance({ esr: esr2, esl: esl2, C: C2, f })
  if (zC2.error) return zC2

  const branches = [zC2]
  if (damping) {
    const zD = dampingBranchImpedance({ ...damping, f })
    if (zD.error) return zD
    branches.push(zD)
  }
  return { abcd: cascadeAbcd([shuntStage(zC1), seriesStage(zL), shuntStage(parallel(branches))]) }
}

// Ortak mod bobininin differential-mode EKLEME yolu: seri leakage endüktansı +
// şönt line-to-line kapasitans, aynı L-C merdiveni. Ortak mod empedansının
// kendisi bu ağdan GEÇMEZ, ayrı ve doğrudan raporlanır (commonModeImpedance,
// §12.9) — tek uçlu Vout/Vsource tanımı ortak mod referansına uymuyor.
function cmChokeDmNetwork(f, {
  lLeak, dcr = 0, cLL, esrLL = 0, eslLL = 0,
} = {}, damping) {
  const zDm = inductorImpedance({ dcr, L: lLeak, f, parallelC: 0 })
  if (zDm.error) return zDm
  const zC = capacitorImpedance({ esr: esrLL, esl: eslLL, C: cLL, f })
  if (zC.error) return zC

  const branches = [zC]
  if (damping) {
    const zD = dampingBranchImpedance({ ...damping, f })
    if (zD.error) return zD
    branches.push(zD)
  }
  return { abcd: cascadeAbcd([seriesStage(zDm), shuntStage(parallel(branches))]) }
}

// topology: 'lc' | 'pi' | 'cm-choke'. network alanları topolojiye göre değişir
// (bkz. lcNetwork/piNetwork/cmChokeDmNetwork). damping = { rD, cD } | null.
export function filterNetwork({
  topology, f, network = {}, damping = null,
}) {
  if (topology === 'lc') return lcNetwork(f, network, damping)
  if (topology === 'pi') return piNetwork(f, network, damping)
  if (topology === 'cm-choke') return cmChokeDmNetwork(f, network, damping)
  return { error: EMC_ERR_TOPOLOGY }
}

/**
 * Tek frekans noktasında tam yanıt: transfer fonksiyonu, kazanç (dB), filtre
 * çıkış empedansı, insertion loss. Kaynak/yük empedansı burada eklenir (bkz.
 * dosya başlığı — ağın kendisi bunları içermez).
 *
 * IL_dB = 20log10|Vout,no-filter/Vout,filter| — "no filter" durumu da kaynak/yük
 * yüklemesini içerir (REV2 §12.6: yalnız ideal 1/√(LC) ile insertion loss
 * VERİLMEZ uyarısı budur).
 */
export function filterResponse({
  topology, f, network, damping = null, rSource = 0, lSource = 0, rLoad,
}) {
  if (!(f > 0) || !(rSource >= 0) || !(lSource >= 0) || !(rLoad > 0)) {
    return { error: EMC_ERR_INVALID }
  }
  const net = filterNetwork({
    topology, f, network, damping,
  })
  if (net.error) return net

  const omega = 2 * Math.PI * f
  const zSource = { re: rSource, im: omega * lSource }
  const zLoad = { re: rLoad, im: 0 }

  const h = twoPortTransfer({ abcd: net.abcd, zSource, zLoad })
  const zOutFilter = twoPortOutputImpedance({ abcd: net.abcd, zSource })
  const noFilterH = div(zLoad, add(zSource, zLoad))

  return {
    h,
    gainDb: toDb(abs(h)),
    zOutFilter,
    insertionLossDb: toDb(abs(noFilterH)) - toDb(abs(h)),
  }
}

// --- 12.7 Converter negatif giriş direnci ---
//
// R_in,neg ≈ -V_in²/P_in ; P_in = P_out/η (bkz. dosya başlığı sembol notu 2 —
// pOut + efficiency alınır, pIn türetilir).
export function converterInputImpedance({ vIn, pOut, efficiency }) {
  if (!(vIn > 0) || !(pOut > 0) || !(efficiency > 0) || efficiency > 1) {
    return { error: EMC_ERR_INVALID }
  }
  const pIn = pOut / efficiency
  const rInNeg = (vIn * vIn) / pIn
  return { pIn, rInNeg, z: { re: -rInNeg, im: 0 } }
}

// K_Z = |Z_out,filter| / |Z_in,converter|. Varsayılan sınır 1/3 çağıran tarafta
// (evaluateDampingCandidate) uygulanır — bu fonksiyon yalnız oranı hesaplar.
export function impedanceRatio({ zOutFilter, zInConverter }) {
  const denom = abs(zInConverter)
  if (!(denom > 0)) return NaN
  return abs(zOutFilter) / denom
}

// --- 12.9 Ortak mod bobini ---

// Z_CM ≈ R_DCR + jωL_CM
export function commonModeImpedance({ dcr = 0, lCm, f }) {
  return inductorImpedance({
    dcr, L: lCm, f, parallelC: 0,
  })
}

// Z_DM ≈ R_DCR + jωL_leak (bilgi amaçlı basit form; 'cm-choke' topolojisinin
// tam ekleme kaybı hesabı cmChokeDmNetwork'ün line-to-line kapasitansla
// birlikte kurduğu ağdan gelir, bu fonksiyondan değil).
export function differentialModeImpedance({ dcr = 0, lLeak, f }) {
  return inductorImpedance({
    dcr, L: lLeak, f, parallelC: 0,
  })
}

// --- 12.8 Damping değerlendirmesi — TEK SKOR YOK (kararlar §3.3) ---

// Frekans sweep çözünürlüğü: grafiklerin kendi çözünürlüğünden BAĞIMSIZ, yalnız
// bu motorun kendi tepe/K_Z/-3dB arama hassasiyeti için. Ekranın buildSweep()'i
// ayrı bir karardır (Adım 5).
const DEFAULT_SWEEP_POINTS = 300

function maxFinite(arr) {
  let m = -Infinity
  for (const v of arr) if (Number.isFinite(v) && v > m) m = v
  return Number.isFinite(m) ? m : NaN
}

function argmaxFreq(freqs, values) {
  let best = -Infinity
  let bestF = null
  for (let i = 0; i < values.length; i++) {
    if (Number.isFinite(values[i]) && values[i] > best) {
      best = values[i]
      bestF = freqs[i]
    }
  }
  return bestF
}

/**
 * Gerçekleşen -3dB frekansı: pasband referansı sweep'in İLK noktasındaki
 * kazanç (gainsDb[0]); hedef = referans - 3dB. Log-frekans ekseninde doğrusal
 * enterpolasyonla geçiş noktası bulunur (peaks.js'in dB-tabanlı enterpolasyon
 * yaklaşımıyla aynı ruh). Sweep aralığında geçiş yoksa null — uydurma referans
 * konmaz (peaks.js ile aynı ilke).
 */
export function actualCutoffFrequency(freqs, gainsDb) {
  if (!Array.isArray(freqs) || freqs.length < 2 || freqs.length !== gainsDb.length) return null
  if (!Number.isFinite(gainsDb[0])) return null
  const targetDb = gainsDb[0] - 3

  for (let i = 1; i < freqs.length; i++) {
    const prev = gainsDb[i - 1]
    const cur = gainsDb[i]
    if (!Number.isFinite(prev) || !Number.isFinite(cur)) continue
    if ((prev - targetDb) * (cur - targetDb) <= 0) {
      if (cur === prev) return freqs[i - 1]
      const t = (targetDb - prev) / (cur - prev)
      const logF0 = Math.log10(freqs[i - 1])
      const logF1 = Math.log10(freqs[i])
      return 10 ** (logF0 + t * (logF1 - logF0))
    }
  }
  return null
}

/**
 * İki adayın Pareto dominansı (kararlar §3.3 tanımı BİREBİR): a, b'yi domine
 * eder ⟺ a'nın peaking'i ≤, attenuation'ı ≥, direnç kaybı ≤ (üçünde de eşit
 * veya daha iyi) VE en az birinde KESİN daha iyi.
 */
export function dominatesCandidate(a, b) {
  const notWorse = a.gPeakDb <= b.gPeakDb && a.aTargetDb >= b.aTargetDb && a.pRD <= b.pRD
  const strictlyBetter = a.gPeakDb < b.gPeakDb || a.aTargetDb > b.aTargetDb || a.pRD < b.pRD
  return notWorse && strictlyBetter
}

/**
 * Tek bir damping adayının (R_D, C_D) tam değerlendirmesi — REV2 §12.8.1/
 * §12.8.2/§12.8.3, kararlar §3.3. TEK SKOR ÜRETMEZ: üç ana metrik
 * (G_peak,dB, A_target,dB, P_R_D) ve iki yardımcı metrik (K_Z, gerçek -3dB
 * frekansı) ayrı ayrı döner; dört uygunluk koşulu ayrı ayrı değerlendirilir.
 * Nihai "en iyi" seçimi bu fonksiyonun işi değildir (bkz. evaluateDampingCandidates).
 *
 * damping = { rD, cD } sönümleme kolu demektir; null = sönümsüz taban durumu
 * (REV2 §12.11 "dampingli/dampingsiz karşılaştırma" grafiği için gereklidir —
 * pRD o durumda tanım gereği 0'dır).
 *
 * P_R_D VARSAYIMI: REV2 girdi listesinde ayrı bir "ripple akım genliği" alanı
 * yok. Damping koluna düşen anlık güç, "Kaynak gerilimi" (vSource, §12.2) AC
 * uyarımının sönümleme düğümünde (= Vout düğümü, bkz. lcNetwork/piNetwork
 * yorumu) ürettiği akımdan hesaplanır: V_node(f) = vSource·H(f),
 * I_RD(f) = V_node(f)/Z_D(f), P(f) = |I_RD(f)|²·R_D. vSource'un RMS büyüklük
 * taşıdığı kabul edilir (P doğrudan ortalama güçtür, ek 1/2 çarpanı yok).
 * Sweep boyunca EN KÖTÜ (maksimum) değer raporlanır — G_peak,dB ve K_Z ile
 * aynı "max_f" yöntemi, iç tutarlılık için.
 */
export function evaluateDampingCandidate({
  topology, network, damping = null,
  rSource = 0, lSource = 0, rLoad,
  fMin, fMax, points = DEFAULT_SWEEP_POINTS,
  fNoise, vSource,
  vIn, pOut, efficiency,
  limits = {},
}) {
  if (!(fNoise > 0) || !(vSource > 0)) return { error: EMC_ERR_INVALID }

  const {
    gainPeakMaxDb = 0, // REV2 §12.8.3 metnindeki sabit varsayılan koşul (G_peak,dB ≤ 0dB)
    impedanceRatioMax = 1 / 3, // REV2 §12.7 "Varsayılan K=1/3" (Middlebrook marjı)
    requiredAttenuationDb, // tasarım hedefi — REV2'de sabit varsayılanı yok, kullanıcı verir
    dampingPowerMaxW, // bileşen seçimine bağlı — sabit varsayılanı yok, kullanıcı verir
  } = limits
  const validLimit = (x) => typeof x === 'number' && !Number.isNaN(x)
  if (!validLimit(requiredAttenuationDb) || !validLimit(dampingPowerMaxW)) {
    return { error: EMC_ERR_INVALID }
  }

  const zIn = converterInputImpedance({ vIn, pOut, efficiency })
  if (zIn.error) return zIn

  const sweep = logspace(fMin, fMax, points)
  if (sweep.error) return { error: sweep.error }
  const { values: freqs } = sweep

  const gainsDb = new Array(freqs.length)
  const kZs = new Array(freqs.length)
  const powers = new Array(freqs.length)

  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i]
    const resp = filterResponse({
      topology, f, network, damping, rSource, lSource, rLoad,
    })
    if (resp.error) return resp

    gainsDb[i] = resp.gainDb
    kZs[i] = impedanceRatio({ zOutFilter: resp.zOutFilter, zInConverter: zIn.z })

    if (damping) {
      const vNode = scale(resp.h, vSource)
      const zD = dampingBranchImpedance({ ...damping, f })
      if (zD.error) return zD
      const iD = div(vNode, zD)
      powers[i] = abs(iD) ** 2 * damping.rD
    } else {
      powers[i] = 0
    }
  }

  const gPeakDb = maxFinite(gainsDb)
  const fPeak = argmaxFreq(freqs, gainsDb)
  const kZ = maxFinite(kZs)
  const pRD = maxFinite(powers)
  const f3dbActual = actualCutoffFrequency(freqs, gainsDb)

  const noiseResp = filterResponse({
    topology, f: fNoise, network, damping, rSource, lSource, rLoad,
  })
  if (noiseResp.error) return noiseResp
  const aTargetDb = -noiseResp.gainDb

  const suitable = {
    gainPeak: gPeakDb <= gainPeakMaxDb,
    attenuation: aTargetDb >= requiredAttenuationDb,
    impedanceRatio: kZ <= impedanceRatioMax,
    dampingPower: pRD <= dampingPowerMaxW,
  }
  const meetsAll = suitable.gainPeak && suitable.attenuation
    && suitable.impedanceRatio && suitable.dampingPower

  return {
    ok: true,
    damping,
    gPeakDb,
    fPeak,
    aTargetDb,
    pRD,
    kZ,
    f3dbActual,
    limits: {
      gainPeakMaxDb, impedanceRatioMax, requiredAttenuationDb, dampingPowerMaxW,
    },
    suitable,
    meetsAll,
  }
}

/**
 * Birden fazla damping adayının toplu değerlendirmesi — kararlar §3.3 "tek
 * skor yok" politikasının doğrudan uygulaması. Adaylar TEK bir puanla
 * sıralanmaz: her biri kendi metrikleriyle döner, uygun bölgedeki (meetsAll)
 * adaylar arasında Pareto bakımından BASKIN OLMAYANLAR `dominated: false`,
 * baskın olanlar `dominated: true` ile işaretlenir.
 *
 * Dominans YALNIZ "uygun bölge" adayları arasında hesaplanır — REV2 §12.8.4
 * metni Pareto işaretlemesini açıkça "uygun adaylar tablosu" bağlamında
 * tanımlıyor. Uygun olmayan bir aday zaten başka bir koşuldan elenmiştir;
 * onun için `dominated` alanı `null` (uygulanamaz), `true`/`false` değil.
 *
 * Dönüş: { candidates: [...], dominated: [...] } — candidates[i].dominated ile
 * dominated[i] aynı bilgiyi taşır (ikincisi görev tanımındaki sözleşmeyle
 * birebir, ilki kendi başına taşınabilir aday nesnesi için).
 */
export function evaluateDampingCandidates({ candidates, ...shared }) {
  if (!Array.isArray(candidates) || candidates.length === 0) return { error: EMC_ERR_INVALID }

  const results = candidates.map((damping) => evaluateDampingCandidate({ ...shared, damping }))
  const failed = results.find((r) => r.error)
  if (failed) return failed

  const dominated = results.map((a) => (
    a.meetsAll ? results.some((b) => b !== a && b.meetsAll && dominatesCandidate(b, a)) : null
  ))

  return {
    ok: true,
    candidates: results.map((r, i) => ({ ...r, dominated: dominated[i] })),
    dominated,
  }
}
