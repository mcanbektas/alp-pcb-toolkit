// EMC LC, Pi ve Ortak Mod Filtre Tasarım Aracı — hesap modeli (REV2 §12).
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, lib/emcFilter.js motorunu çağırır, sonucu ve hata kodunu
// döner. Kullanıcıya gösterilecek metin text.js içindedir.
//
// Motora DOKUNULMAZ (Adım 4'te yazılıp test edildi, `ok:true` eksikliği
// review'da bulunup düzeltildi). Üç topoloji genel bir ABCD (2-port zincir)
// modeliyle temsil edilir; bu dosya yalnızca motoru çağırır.
//
// Kararlar §3.3 "tek skor YOK" politikası: `evaluateDampingCandidates` HER
// ZAMAN çağrılır (tek aday olsa bile) — motor `damping: null`'ı "sönümsüz
// taban durumu" olarak zaten destekliyor (bkz. motorun kendi JSDoc'u), bu
// yüzden "sönümsüz" satırı aday listesinin BİRİNCİ ve sabit elemanı olarak
// eklenir (candidates[0]). Bu hem §12.11'in "dampingli/dampingsiz
// karşılaştırma" grafiğini hem de tek-aday ham metrik + `suitable`
// bayraklarını (evaluateDampingCandidate'ın kendi sözleşmesi) tek çağrıda
// verir — motor zaten her adayı ayrı ayrı `evaluateDampingCandidate` ile
// değerlendirip `dominated` bayrağını ekliyor.
//
// Spec ile motor arasında bulunan uyuşmazlıklar (uydurulmadı, ekrana da
// yansıtılmadı — raporda ayrıca belirtilir):
//   - REV2 §12.2 "Line-to-ground capacitance" listeler ama motorda (cm-choke
//     ağı yalnız lLeak/dcr/cLL/esrLL/eslLL alır) karşılığı YOK — alan
//     eklenmedi.
//   - REV2 §12.2 "Converter giriş gücü" der ama motorun `converterInputImpedance`
//     girdisi P_OUT + verim alıp P_IN'i türetiyor (P_in = P_out/η, §12.7) —
//     alan motorun gerçek sözleşmesine göre "Converter çıkış gücü" (pOut)
//     olarak sorulur, türetilen P_in bir SONUÇ satırı olarak gösterilir.
//   - REV2 §12.10 "İndüktör RMS/peak akımı", "Kondansatör ripple akımı",
//     "DCR kaybı" (ayrı kalem) motorda hiç yok — bu üç çıktı EKRANDA YOK.

import { fieldsFor, readForm, readRows, when } from '../../../lib/fields'
import {
  RESISTANCE, INDUCTANCE, CAPACITANCE, FREQUENCY, VOLTAGE, POWER,
} from '../../../lib/units'
import { abs } from '../../../lib/complex'
import { logspace } from '../../../lib/sweep'
import {
  idealCutoffFrequency,
  characteristicImpedance,
  filterResponse,
  converterInputImpedance,
  commonModeImpedance,
  differentialModeImpedance,
  evaluateDampingCandidates,
} from '../../../lib/emcFilter'

export const TOPOLOGY_LC = 'lc'
export const TOPOLOGY_PI = 'pi'
export const TOPOLOGY_CM = 'cm-choke'
export const TOPOLOGIES = [TOPOLOGY_LC, TOPOLOGY_PI, TOPOLOGY_CM]

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_INVALID = 'invalid'

export const CHART_GAIN = 'gain'
export const CHART_ZOUT = 'zout'
export const CHART_COMPARE = 'compare'
export const CHART_TOLERANCE = 'tolerance'
export const CHART_PARAMS = [CHART_GAIN, CHART_ZOUT, CHART_COMPARE, CHART_TOLERANCE]

// Motorun kendi arama çözünürlüğünden (DEFAULT_SWEEP_POINTS=300, dosya içi,
// dışa açılmaz) bağımsız — yalnız bu ekranın grafik çözünürlüğü.
const SWEEP_POINTS = 160

const PLAIN = { '': 1 }
const DB_TABLE = { dB: 1 }
const PCT_TABLE = { '%': 0.01 }

export const INITIAL_FORM = {
  topology: TOPOLOGY_LC,

  rSource: '0.1', rSourceu: 'Ω',
  lSource: '0', lSourceu: 'µH',
  rLoad: '5', rLoadu: 'Ω',
  vIn: '12', vInu: 'V',
  pOut: '10', pOutu: 'W',
  efficiency: '90',
  vSource: '1', vSourceu: 'V',

  fMin: '1', fMinu: 'kHz',
  fMax: '1', fMaxu: 'MHz',
  fNoise: '150', fNoiseu: 'kHz',

  requiredAttenuationDb: '20',
  dampingPowerMaxW: '0.25', dampingPowerMaxWu: 'W',
  gainPeakMaxDb: '0',
  impedanceRatioMax: '0.3333',
  componentTolerancePct: '10',

  // lc + pi ortak: ana bobin + birinci kapasitör (pi'de "C1/ESR1/ESL1")
  L: '10', Lu: 'µH',
  dcr: '0', dcru: 'Ω',
  parallelC: '0', parallelCu: 'pF',
  C: '10', Cu: 'µF',
  esr: '0', esru: 'Ω',
  esl: '0', eslu: 'nH',

  // yalnız pi: ikinci kapasitör (C2/ESR2/ESL2)
  C2: '10', C2u: 'µF',
  esr2: '0', esr2u: 'Ω',
  esl2: '0', esl2u: 'nH',

  // yalnız ortak mod
  lLeak: '10', lLeaku: 'µH',
  lCm: '1', lCmu: 'mH',
  cLL: '10', cLLu: 'µF',
  esrLL: '0', esrLLu: 'Ω',
  eslLL: '0', eslLLu: 'nH',

  // Damping adayları — REV2 §12.12 referansı L=10µH/C=10µF → Z0=1Ω civarında
  // üç örnek değer. "Sönümsüz" satırı burada TUTULMAZ: compute() onu her
  // zaman candidates[0] olarak kendisi ekler (bkz. dosya başı notu). Satır
  // ekleme/silme `components/RowList.jsx`nin kendi işi (sonuncuyu kopyalar /
  // index'e göre siler) — burada ayrı bir id/factory yardımcıya gerek yok.
  candidates: [
    { rD: '0.33', rDu: 'Ω', cD: '0', cDu: 'µF' },
    { rD: '1', rDu: 'Ω', cD: '0', cDu: 'µF' },
    { rD: '3', rDu: 'Ω', cD: '0', cDu: 'µF' },
  ],
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// lib/ bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L_ = (key) => labels[key] ?? key
  const isCm = f.topology === TOPOLOGY_CM
  const isPi = f.topology === TOPOLOGY_PI

  return fieldsFor([
    // Kaynak / yük / converter çalışma noktası / analiz ayarları — üç
    // topolojide de ortak.
    [
      { key: 'rSource', label: L_('rSource'), unitKey: 'rSourceu', table: RESISTANCE, min: 0, allowZero: true },
      {
        key: 'lSource', label: L_('lSource'), unitKey: 'lSourceu', table: INDUCTANCE,
        min: 0, allowZero: true, optional: true,
      },
      { key: 'rLoad', label: L_('rLoad'), unitKey: 'rLoadu', table: RESISTANCE, min: 0 },
      { key: 'vIn', label: L_('vIn'), unitKey: 'vInu', table: VOLTAGE, min: 0 },
      { key: 'pOut', label: L_('pOut'), unitKey: 'pOutu', table: POWER, min: 0 },
      { key: 'efficiency', label: L_('efficiency'), unit: '%', table: PCT_TABLE, min: 0, max: 1 },
      { key: 'vSource', label: L_('vSource'), unitKey: 'vSourceu', table: VOLTAGE, min: 0 },
      { key: 'fMin', label: L_('fMin'), unitKey: 'fMinu', table: FREQUENCY, min: 0 },
      { key: 'fMax', label: L_('fMax'), unitKey: 'fMaxu', table: FREQUENCY, min: 0 },
      { key: 'fNoise', label: L_('fNoise'), unitKey: 'fNoiseu', table: FREQUENCY, min: 0 },
      {
        key: 'requiredAttenuationDb', label: L_('requiredAttenuationDb'),
        unit: 'dB', table: DB_TABLE, allowZero: true,
      },
      { key: 'dampingPowerMaxW', label: L_('dampingPowerMaxW'), unitKey: 'dampingPowerMaxWu', table: POWER, min: 0 },
      { key: 'gainPeakMaxDb', label: L_('gainPeakMaxDb'), unit: 'dB', table: DB_TABLE, allowZero: true },
      { key: 'impedanceRatioMax', label: L_('impedanceRatioMax'), unit: '', table: PLAIN, min: 0 },
      { key: 'componentTolerancePct', label: L_('componentTolerancePct'), unit: '%', table: PCT_TABLE, min: 0, max: 1 },
    ],
    // lc + pi: ana bobin + birinci kapasitör
    when(!isCm, [
      { key: 'L', label: L_('L'), unitKey: 'Lu', table: INDUCTANCE, min: 0 },
      { key: 'dcr', label: L_('dcr'), unitKey: 'dcru', table: RESISTANCE, min: 0, allowZero: true, optional: true },
      {
        key: 'parallelC', label: L_('parallelC'), unitKey: 'parallelCu',
        table: CAPACITANCE, min: 0, allowZero: true, optional: true,
      },
      { key: 'C', label: L_('C'), unitKey: 'Cu', table: CAPACITANCE, min: 0 },
      { key: 'esr', label: L_('esr'), unitKey: 'esru', table: RESISTANCE, min: 0, allowZero: true, optional: true },
      { key: 'esl', label: L_('esl'), unitKey: 'eslu', table: INDUCTANCE, min: 0, allowZero: true, optional: true },
    ]),
    // yalnız pi: ikinci kapasitör
    when(isPi, [
      { key: 'C2', label: L_('C2'), unitKey: 'C2u', table: CAPACITANCE, min: 0 },
      { key: 'esr2', label: L_('esr2'), unitKey: 'esr2u', table: RESISTANCE, min: 0, allowZero: true, optional: true },
      { key: 'esl2', label: L_('esl2'), unitKey: 'esl2u', table: INDUCTANCE, min: 0, allowZero: true, optional: true },
    ]),
    // yalnız ortak mod: choke + line-to-line kapasitör. `dcr` yukarıdaki
    // grupla AYNI anahtar ama `when` karşılıklı dışlayıcı olduğu için tek
    // kopya aktif kalır (choke DCR, tek girdi — REV2 §12.2).
    when(isCm, [
      { key: 'lLeak', label: L_('lLeak'), unitKey: 'lLeaku', table: INDUCTANCE, min: 0 },
      { key: 'lCm', label: L_('lCm'), unitKey: 'lCmu', table: INDUCTANCE, min: 0 },
      { key: 'dcr', label: L_('dcr'), unitKey: 'dcru', table: RESISTANCE, min: 0, allowZero: true, optional: true },
      { key: 'cLL', label: L_('cLL'), unitKey: 'cLLu', table: CAPACITANCE, min: 0 },
      { key: 'esrLL', label: L_('esrLL'), unitKey: 'esrLLu', table: RESISTANCE, min: 0, allowZero: true, optional: true },
      { key: 'eslLL', label: L_('eslLL'), unitKey: 'eslLLu', table: INDUCTANCE, min: 0, allowZero: true, optional: true },
    ]),
  ])
}

export function candidateFields(labels = {}) {
  const L_ = (key) => labels[key] ?? key
  return [
    { key: 'rD', label: L_('rD'), unitKey: 'rDu', table: RESISTANCE, min: 0, allowZero: true },
    { key: 'cD', label: L_('cD'), unitKey: 'cDu', table: CAPACITANCE, min: 0, allowZero: true, optional: true },
  ]
}

function networkFor(topology, v) {
  if (topology === TOPOLOGY_LC) {
    return {
      L: v.L, dcr: v.dcr ?? 0, parallelC: v.parallelC ?? 0, C: v.C, esr: v.esr ?? 0, esl: v.esl ?? 0,
    }
  }
  if (topology === TOPOLOGY_PI) {
    return {
      L: v.L,
      dcr: v.dcr ?? 0,
      parallelC: v.parallelC ?? 0,
      C1: v.C,
      esr1: v.esr ?? 0,
      esl1: v.esl ?? 0,
      C2: v.C2,
      esr2: v.esr2 ?? 0,
      esl2: v.esl2 ?? 0,
    }
  }
  return {
    lLeak: v.lLeak, dcr: v.dcr ?? 0, cLL: v.cLL, esrLL: v.esrLL ?? 0, eslLL: v.eslLL ?? 0,
  }
}

// İdeal L-C rezonans çiftleri — topolojiye göre bir (lc/cm-choke) ya da iki
// (pi: C1 ve C2 ile ayrı ayrı) çift. REV2 §12.10 "İdeal cutoff" ve "Rezonans
// frekansı"nı iki ayrı kalem sayar ama çok-kapasitörlü topolojide ikisinin
// nasıl ayrışacağını tanımlamaz (bkz. dosya başı notu) — burada topolojinin
// TÜM ilgili L-C çiftleri tek grupta, ayrı ayrı etiketlenerek gösterilir.
function idealPairsFor(topology, v) {
  const pair = (key, L, C) => ({
    key, L, C, f0: idealCutoffFrequency({ L, C }), z0: characteristicImpedance({ L, C }),
  })
  if (topology === TOPOLOGY_LC) return [pair('main', v.L, v.C)]
  if (topology === TOPOLOGY_PI) return [pair('c1', v.L, v.C), pair('c2', v.L, v.C2)]
  return [pair('dm', v.lLeak, v.cLL)]
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  const rowsRead = readRows(f.candidates, candidateFields(labels), labels.candidateRow ?? 'candidate')

  const ambiguous = [...read.ambiguous, ...rowsRead.ambiguous]
  if (ambiguous.length) return { ok: false, ambiguous }

  const invalid = [...read.invalid, ...rowsRead.invalid]
  if (!read.ok || !rowsRead.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid }

  const v = read.values
  const { topology } = f
  const network = networkFor(topology, v)

  const shared = {
    topology,
    network,
    rSource: v.rSource ?? 0,
    lSource: v.lSource ?? 0,
    rLoad: v.rLoad,
    fMin: v.fMin,
    fMax: v.fMax,
    points: SWEEP_POINTS,
    fNoise: v.fNoise,
    vSource: v.vSource,
    vIn: v.vIn,
    pOut: v.pOut,
    efficiency: v.efficiency,
    limits: {
      gainPeakMaxDb: v.gainPeakMaxDb,
      impedanceRatioMax: v.impedanceRatioMax,
      requiredAttenuationDb: v.requiredAttenuationDb,
      dampingPowerMaxW: v.dampingPowerMaxW,
    },
  }

  // candidates[0] HER ZAMAN "sönümsüz" (damping: null) taban durumudur —
  // motorun kendi JSDoc'u bu kullanımı öngörüyor (bkz. dosya başı notu).
  // Kullanıcının girdiği satırlar 1'den başlar ve `rowsRead.rows` ile aynı
  // sırada kalır (skor/otomatik sıralama YOK — kararlar §3.3).
  const candidateInputs = [null, ...rowsRead.rows.map((row) => ({ rD: row.rD, cD: row.cD ?? 0 }))]

  const evalRes = evaluateDampingCandidates({ candidates: candidateInputs, ...shared })
  if (evalRes.error) return { ok: false, reason: REASON_INVALID }

  const zIn = converterInputImpedance({ vIn: v.vIn, pOut: v.pOut, efficiency: v.efficiency })
  if (zIn.error) return { ok: false, reason: REASON_INVALID }

  // Gürültü frekansında sönümsüz filtre çıkış empedansı — §12.10 "Filter
  // output impedance" sonucu, tek somut sayı olarak (sweep grafiği ayrıca
  // var, bkz. buildSweep CHART_ZOUT).
  const noiseUndamped = filterResponse({
    topology,
    f: v.fNoise,
    network,
    damping: null,
    rSource: shared.rSource,
    lSource: shared.lSource,
    rLoad: v.rLoad,
  })
  if (noiseUndamped.error) return { ok: false, reason: REASON_INVALID }

  // Zaten büyüklüğe (skaler) indirgenmiş saklanır: text.js ve schematic.jsx
  // kompleks sayı bilmez, yalnız gösterime hazır değer alır (ekranlar arası
  // yerleşik desen — bkz. ReturnPathStitchingVia'nın `capacitor.impedance`si).
  let cm = null
  let dm = null
  if (topology === TOPOLOGY_CM) {
    const cmZ = commonModeImpedance({ dcr: v.dcr ?? 0, lCm: v.lCm, f: v.fNoise })
    const dmZ = differentialModeImpedance({ dcr: v.dcr ?? 0, lLeak: v.lLeak, f: v.fNoise })
    if (cmZ.error || dmZ.error) return { ok: false, reason: REASON_INVALID }
    cm = abs(cmZ)
    dm = abs(dmZ)
  }

  return {
    ok: true,
    topology,
    network,
    shared,
    candidateRows: rowsRead.rows,
    candidates: evalRes.candidates,
    zIn,
    zOutAtNoise: abs(noiseUndamped.zOutFilter),
    idealPairs: idealPairsFor(topology, v),
    cm,
    dm,
    componentTolerancePct: v.componentTolerancePct,
  }
}

function scaleReactive(topology, network, factor) {
  if (topology === TOPOLOGY_LC) return { ...network, L: network.L * factor, C: network.C * factor }
  if (topology === TOPOLOGY_PI) {
    return {
      ...network, L: network.L * factor, C1: network.C1 * factor, C2: network.C2 * factor,
    }
  }
  return { ...network, lLeak: network.lLeak * factor, cLL: network.cLL * factor }
}

// Grafik: REV2 §12.11'in beş grafiğinden dördü burada — "Filter output
// impedance" ve "Converter input impedance" tek CHART_ZOUT'ta birleşir
// (motor converter empedansını frekanstan bağımsız/sabit bir negatif direnç
// olarak modelliyor — bkz. converterInputImpedance; ayrı bir sweep'i olmayan
// sabit bir değeri ayrı grafik yapmak yerine aynı eksende referans çizgisi
// olarak gösterilir, raporda belirtilir). Kararlar §3.3'ün "üç ana metrik
// AYRI grafik" kuralı bunları KAPSAMAZ — o kural yalnız G_peak/A_target/P_R_D
// için geçerlidir (bkz. index.jsx'teki candidate metric grafikleri).
export function buildSweep(r, chartParam) {
  if (!r.ok) return null
  const { topology, network, shared } = r
  const { values: freqs } = logspace(shared.fMin, shared.fMax, SWEEP_POINTS)
  if (!freqs) return null

  const respAt = (damping, netOverride) => freqs.map((f) => filterResponse({
    topology,
    f,
    network: netOverride ?? network,
    damping,
    rSource: shared.rSource,
    lSource: shared.lSource,
    rLoad: shared.rLoad,
  }))

  if (chartParam === CHART_GAIN) {
    const resp = respAt(null)
    return {
      param: chartParam,
      freqs,
      gainDb: resp.map((p) => p.gainDb),
      ilDb: resp.map((p) => p.insertionLossDb),
    }
  }

  if (chartParam === CHART_ZOUT) {
    const resp = respAt(null)
    return {
      param: chartParam,
      freqs,
      zOut: resp.map((p) => abs(p.zOutFilter)),
      zInThreshold: r.zIn.rInNeg * shared.limits.impedanceRatioMax,
    }
  }

  if (chartParam === CHART_COMPARE) {
    const rows = [null, ...r.candidateRows.map((c) => ({ rD: c.rD, cD: c.cD ?? 0 }))].map((damping, i) => ({
      key: i,
      damping,
      gainDb: respAt(damping).map((p) => p.gainDb),
    }))
    return { param: chartParam, freqs, rows }
  }

  // CHART_TOLERANCE — §16 taban mekanizması: nominal / worst-case min /
  // worst-case maks köşeleri. Monte Carlo (§16.1) İLERİ SEÇENEKTİR ve bu
  // araç için REV2'de zorunlu kılınmamıştır (bkz. rapor); uygulanmadı.
  const tol = r.componentTolerancePct
  return {
    param: chartParam,
    freqs,
    nominal: respAt(null).map((p) => p.gainDb),
    worstMin: respAt(null, scaleReactive(topology, network, 1 - tol)).map((p) => p.gainDb),
    worstMax: respAt(null, scaleReactive(topology, network, 1 + tol)).map((p) => p.gainDb),
  }
}
