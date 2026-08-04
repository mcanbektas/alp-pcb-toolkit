// Dönüş yolu ve stitching via planlayıcısı ekranının hesap modeli (REV2 §4).
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, lib/returnPath.js motorunu çağırır, sonucu ve hata kodunu
// döner. Kullanıcıya gösterilecek metin text.js içindedir.
//
// Bu araçta analiz/sentez modu YOK: REV2 §4 yalnızca ileri yönde değerlendirme
// tarif eder (ters çözüm — "hedef X_L için via sayısı bul" gibi — §4'te yok).

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { parseNum } from '../../../lib/num'
import {
  LENGTH, FREQUENCY, TIME, CAPACITANCE, INDUCTANCE, RESISTANCE, CURRENT,
} from '../../../lib/units'
import {
  returnPathPlan, viaReactance, parallelViaInductance, capacitorBranch,
  wavelength, stitchingSpacing,
  BW_CONSERVATIVE, BW_SINGLE_POLE, SPACING_DIVISORS,
} from '../../../lib/returnPath'
import { logspace } from '../../../lib/sweep'

export { BW_CONSERVATIVE, BW_SINGLE_POLE, SPACING_DIVISORS }

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_COUNT = 'count'
export const REASON_INVALID = 'invalid'

export const PLANE_GND = 'gnd'
export const PLANE_POWER = 'power'
export const PLANE_SPLIT = 'split'
export const PLANE_TYPES = [PLANE_GND, PLANE_POWER, PLANE_SPLIT]

export const SIGNAL_SINGLE = 'single-ended'
export const SIGNAL_DIFF = 'differential'

export const SWEEP_REACTANCE = 'reactance'
export const SWEEP_CAPACITOR = 'capacitor'
export const SWEEP_SPACING = 'spacing'
export const SWEEP_VIA_COUNT = 'viaCount'
export const SWEEP_PARAMS = [SWEEP_REACTANCE, SWEEP_CAPACITOR, SWEEP_SPACING, SWEEP_VIA_COUNT]

// Birimsiz ve adet alanları için ekrana özgü tablolar — SingleEnded'teki PLAIN
// ve ThermalVia'daki COUNT ile aynı desen, her ekran kendi kopyasını tutar.
const PLAIN = { '': 1 }
const COUNT = { adet: 1 }

export const INITIAL_FORM = {
  signalType: SIGNAL_SINGLE,
  planeType: PLANE_GND,

  tr: '1', tru: 'ns',
  bandwidthMethod: BW_CONSERVATIVE,
  clockFreq: '', clockFrequ: 'MHz',
  analysisFreq: '', analysisFrequ: 'MHz',

  epsR: '4', epsEff: '',

  viaLength: '1.6', viaLengthu: 'mm',
  viaDiameter: '0.3', viaDiameteru: 'mm',
  stitchingViaCount: '1',

  actualSpacing: '', actualSpacingu: 'mm',
  spacingDivisor: '20',
  signalToReturnViaDistance: '', signalToReturnViaDistanceu: 'mm',

  returnCurrentPeak: '', returnCurrentPeaku: 'mA',

  hasCapacitor: false,
  capC: '10', capCu: 'nF',
  capEsr: '0.03', capEsru: 'Ω',
  capEsl: '0.5', capEslu: 'nH',
  capMountL: '0.6', capMountLu: 'nH',
  capDistance: '', capDistanceu: 'mm',
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'tr', label: L('tr'), unitKey: 'tru', table: TIME, min: 0 },
      { key: 'epsR', label: L('epsR'), unit: '', table: PLAIN, min: 1 },
      { key: 'viaLength', label: L('viaLength'), unitKey: 'viaLengthu', table: LENGTH, min: 0 },
      { key: 'viaDiameter', label: L('viaDiameter'), unitKey: 'viaDiameteru', table: LENGTH, min: 0 },
      { key: 'stitchingViaCount', label: L('stitchingViaCount'), unit: 'adet', table: COUNT, min: 1 },
    ],
    [
      { key: 'epsEff', label: L('epsEff'), unit: '', table: PLAIN, min: 1, optional: true },
      { key: 'clockFreq', label: L('clockFreq'), unitKey: 'clockFrequ', table: FREQUENCY, min: 0, optional: true },
      {
        key: 'analysisFreq', label: L('analysisFreq'), unitKey: 'analysisFrequ',
        table: FREQUENCY, min: 0, optional: true,
      },
      {
        key: 'returnCurrentPeak', label: L('returnCurrentPeak'), unitKey: 'returnCurrentPeaku',
        table: CURRENT, min: 0, optional: true,
      },
      { key: 'actualSpacing', label: L('actualSpacing'), unitKey: 'actualSpacingu', table: LENGTH, min: 0, optional: true },
      {
        key: 'signalToReturnViaDistance', label: L('signalToReturnViaDistance'),
        unitKey: 'signalToReturnViaDistanceu', table: LENGTH, min: 0, optional: true,
      },
    ],
    when(f.hasCapacitor, [
      { key: 'capC', label: L('capC'), unitKey: 'capCu', table: CAPACITANCE, min: 0 },
      { key: 'capEsr', label: L('capEsr'), unitKey: 'capEsru', table: RESISTANCE, min: 0, optional: true, allowZero: true },
      { key: 'capEsl', label: L('capEsl'), unitKey: 'capEslu', table: INDUCTANCE, min: 0, optional: true, allowZero: true },
      {
        key: 'capMountL', label: L('capMountL'), unitKey: 'capMountLu',
        table: INDUCTANCE, min: 0, optional: true, allowZero: true,
      },
      { key: 'capDistance', label: L('capDistance'), unitKey: 'capDistanceu', table: LENGTH, min: 0, optional: true },
    ]),
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values

  // fields.js tamsayı zorlamaz (bkz. lib/fields.js) — via sayısı burada
  // denetlenir, motora kesirli değer geçmez.
  if (!Number.isInteger(v.stitchingViaCount) || v.stitchingViaCount < 1) {
    return { ok: false, reason: REASON_COUNT }
  }

  // εeff girildiyse yüzey hattı (microstrip) kabul edilir ve εr'nin yerine
  // geçer (REV2 §4.4: "yüzey hattı için etkin dielektrik sabiti girilmişse").
  const eps = v.epsEff ?? v.epsR
  const spacingDivisor = parseNum(f.spacingDivisor)

  const capacitor = f.hasCapacitor ? {
    c: v.capC,
    esr: v.capEsr ?? 0,
    esl: v.capEsl ?? 0,
    // REV2 §4.2 tek girdi olarak "via ve bağlantı endüktansı" listeler; motor
    // lMount ve lViaEq'i ayrı alır ama ikisi de aynı toplama girer (§4.7
    // ESL_total) — birleşik değeri lMount'a yazmak, lViaEq'i sıfır bırakmak
    // aynı sonucu verir, ikinci bir girdi alanı açmaya gerek yok.
    lMount: v.capMountL ?? 0,
    lViaEq: 0,
  } : null

  const plan = returnPathPlan({
    tr: v.tr,
    bandwidthMethod: f.bandwidthMethod,
    clockFreq: v.clockFreq,
    eps,
    viaLength: v.viaLength,
    viaDiameter: v.viaDiameter,
    stitchingViaCount: v.stitchingViaCount,
    actualSpacing: v.actualSpacing,
    spacingDivisor,
    analysisFreq: v.analysisFreq,
    returnCurrentPeak: v.returnCurrentPeak,
    capacitor,
  })
  if (plan.error) return { ok: false, reason: REASON_INVALID }

  return {
    ok: true,
    signalType: f.signalType,
    planeType: f.planeType,
    hasCapacitor: f.hasCapacitor,
    eps,
    usedEpsEff: v.epsEff != null,
    stitchingViaCount: v.stitchingViaCount,
    signalToReturnViaDistance: v.signalToReturnViaDistance,
    capDistance: v.capDistance,
    spacingDivisor,
    ...plan,
    // Kondansatör bloğuna ham C/ESR eklenir: motor yalnızca türetilmiş
    // değerleri (eslTotal, fSrf, impedance, phase) döner; grafik taraması
    // başka frekanslarda aynı dalı yeniden çağırmak için ham girdiye ihtiyaç
    // duyar — burada kopyası yazılmaz, capacitorBranch aynen çağrılır.
    capacitor: plan.capacitor ? { ...plan.capacitor, c: v.capC, esr: v.capEsr ?? 0 } : null,
  }
}

function freqRange(fAnalysis) {
  const { values } = logspace(fAnalysis / 100, fAnalysis * 100, 160)
  return values ?? []
}

function reactanceSweep(r) {
  return freqRange(r.fAnalysis).map((f) => ({
    x: f,
    y: viaReactance({ L: r.viaInductanceSingle, f }),
    yParallel: viaReactance({ L: r.viaInductanceEq, f }),
  }))
}

function capacitorSweep(r) {
  if (!r.capacitor) return null
  return freqRange(r.fAnalysis).map((f) => {
    const branch = capacitorBranch({
      esr: r.capacitor.esr, esl: r.capacitor.eslTotal, c: r.capacitor.c, f,
    })
    return { x: f, y: branch.magnitude }
  })
}

function spacingSweep(r) {
  return freqRange(r.fAnalysis).map((f) => ({
    x: f,
    y: stitchingSpacing({ lambda: wavelength({ vp: r.vp, f }), divisor: r.spacingDivisor }),
  }))
}

function viaCountSweep(r) {
  const maxN = Math.max(20, r.stitchingViaCount * 2)
  const rows = []
  for (let n = 1; n <= maxN; n++) {
    rows.push({ x: n, y: parallelViaInductance({ L: r.viaInductanceSingle, n }) })
  }
  return rows
}

// Grafik: REV2 §4.10'daki dört grafiğin her biri ayrı bir taranan parametre.
// Kondansatör taraması yalnızca kondansatör girildiyse veri döner; girilmediyse
// null — ekran bunu mevcut "grafik için geçerli girdi gerekli" notuyla gösterir.
export function buildSweep(r, param) {
  if (!r.ok) return null

  if (param === SWEEP_REACTANCE) {
    const rows = reactanceSweep(r)
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      pointsParallel: rows.map((p) => [p.x, p.yParallel]),
      marker: { x: r.fAnalysis, y: r.reactanceParallel },
    }
  }

  if (param === SWEEP_CAPACITOR) {
    const rows = capacitorSweep(r)
    if (!rows) return null
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.fAnalysis, y: r.capacitor.impedance },
    }
  }

  if (param === SWEEP_SPACING) {
    const rows = spacingSweep(r)
    return {
      param,
      rows,
      points: rows.map((p) => [p.x, p.y]),
      marker: { x: r.fAnalysis, y: r.spacingLimit },
    }
  }

  const rows = viaCountSweep(r)
  return {
    param: SWEEP_VIA_COUNT,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: { x: r.stitchingViaCount, y: r.viaInductanceEq },
  }
}
