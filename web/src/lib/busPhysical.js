// CAN ve RS-485 fiziksel katman (REV2 §8).
//
// Protokol frame çözümlemesi YOKTUR. Yalnız fiziksel katman: terminasyon, bias,
// kablo gecikmesi, stub ve yük.
//
// Gecikme bütçesinin can alıcı noktası: bit süresi tek başına anlamlı değildir,
// belirleyici olan SAMPLE POINT anıdır. Sinyalin en uzak düğüme gidip dönmesi ve
// bütün sabit gecikmeler o ana kadar bitmiş olmalıdır — aksi hâlde düğüm henüz
// oturmamış bir seviyeyi örnekler.
//
// Paralel direnç ohm.js'teki twoInParallel'dan gelir; ikinci kopyası yazılmaz.

import { twoInParallel } from './ohm'
import { nearestValue } from './eseries'

export const BUS_ERR_INVALID = 'invalid'
export const BUS_ERR_FIXED_DELAY = 'bus-fixed-delay-exceeds-sample-point'
export const BUS_ERR_DELAY_BUDGET = 'bus-delay-budget-exceeded'
export const BUS_ERR_BIAS_UNREACHABLE = 'bias-target-not-reachable'

// N kolun paralel eşdeğeri. İkili birleştirmeyi tekrarlamak (Σ1/R)^-1 ile
// matematiksel olarak aynıdır ve test edilmiş yardımcıyı yeniden kullanır.
export function parallelResistances(list) {
  if (!Array.isArray(list) || list.length === 0) return NaN
  if (list.some((r) => !(r > 0))) return NaN
  return list.reduce((acc, r) => twoInParallel(acc, r))
}

export function bitTime({ bitrate }) {
  if (!(bitrate > 0)) return NaN
  return 1 / bitrate
}

// Sample point oranı 0–1 arasındadır (ör. %87.5 → 0.875).
export function sampleTime({ bitrate, samplePoint }) {
  const tb = bitTime({ bitrate })
  if (!Number.isFinite(tb) || !(samplePoint > 0) || !(samplePoint <= 1)) return NaN
  return tb * samplePoint
}

export function cableDelay({ length, delayPerMeter }) {
  if (!(length >= 0) || !(delayPerMeter > 0)) return NaN
  return length * delayPerMeter
}

export function roundTripDelay({ length, delayPerMeter }) {
  const t = cableDelay({ length, delayPerMeter })
  return Number.isFinite(t) ? 2 * t : NaN
}

// Kablo uzunluğundan BAĞIMSIZ gecikmelerin toplamı (REV2 §8.4).
export function fixedDelay({
  controller = 0, tx = 0, rx = 0, isolatorTx = 0, isolatorRx = 0,
}) {
  const sum = controller + tx + rx + isolatorTx + isolatorRx
  return sum >= 0 ? sum : NaN
}

/**
 * Maksimum teorik bus uzunluğu:
 *   L_max = (t_sample − t_fixed) / (2·t_pd)
 *
 * t_sample ≤ t_fixed ise kablo sıfır uzunlukta olsa bile bütçe yetersizdir;
 * bölme yapılmadan açık hata döner.
 *
 * Sonuç attenuation, kablo kaybı, transceiver slew rate, jitter ve oscillator
 * toleransı İÇERMEZ.
 */
export function maxBusLength({ tSample, tFixed, delayPerMeter }) {
  if (!(tSample > 0) || !(tFixed >= 0) || !(delayPerMeter > 0)) return { error: BUS_ERR_INVALID }
  if (tSample <= tFixed) return { error: BUS_ERR_FIXED_DELAY }
  return { length: (tSample - tFixed) / (2 * delayPerMeter) }
}

// Split terminasyonun common-mode kolu ve kesim frekansı — birinci mertebe.
export function splitTermination({ r1, r2, cSplit = null }) {
  if (!(r1 > 0) || !(r2 > 0)) return { error: BUS_ERR_INVALID }
  const rCm = twoInParallel(r1, r2)
  return {
    total: r1 + r2,
    commonMode: rCm,
    cutoff: cSplit > 0 ? 1 / (2 * Math.PI * rCm * cSplit) : null,
  }
}

export function stubRoundTrip({ length, delayPerMeter }) {
  return roundTripDelay({ length, delayPerMeter })
}

/**
 * CAN fiziksel katman değerlendirmesi. Süreler saniye, uzunluk metre,
 * gecikme s/m, dirençler ohm.
 */
export function canPhysicalLayer({
  bitrate, samplePoint = 0.875,
  busLength, delayPerMeter,
  controllerDelay = 0, txDelay = 0, rxDelay = 0,
  isolatorTxDelay = 0, isolatorRxDelay = 0,
  terminations = [120, 120],
  split = null, // { r1, r2, cSplit }
  stubLength = null, riseTime = null,
}) {
  const tBit = bitTime({ bitrate })
  const tSample = sampleTime({ bitrate, samplePoint })
  if (!Number.isFinite(tSample)) return { error: BUS_ERR_INVALID }

  const tFixed = fixedDelay({
    controller: controllerDelay, tx: txDelay, rx: rxDelay,
    isolatorTx: isolatorTxDelay, isolatorRx: isolatorRxDelay,
  })
  const tRt = roundTripDelay({ length: busLength, delayPerMeter })
  if (!Number.isFinite(tFixed) || !Number.isFinite(tRt)) return { error: BUS_ERR_INVALID }

  const tLoop = tFixed + tRt
  const margin = tSample - tLoop

  const lMax = maxBusLength({ tSample, tFixed, delayPerMeter })

  return {
    ok: true,
    bitTime: tBit,
    sampleTime: tSample,
    cableDelay: cableDelay({ length: busLength, delayPerMeter }),
    roundTrip: tRt,
    fixedDelay: tFixed,
    loopDelay: tLoop,
    margin,
    // Negatif marj bütçenin aşıldığını gösterir; ekran ciddi uyarı basar.
    budgetExceeded: margin < 0,
    budgetError: margin < 0 ? BUS_ERR_DELAY_BUDGET : null,
    maxLength: lMax.error ? null : lMax.length,
    maxLengthError: lMax.error ?? null,
    terminationEq: parallelResistances(terminations),
    split: split ? splitTermination(split) : null,
    stub: stubLength !== null
      ? {
        roundTrip: stubRoundTrip({ length: stubLength, delayPerMeter }),
        ratio: riseTime > 0
          ? stubRoundTrip({ length: stubLength, delayPerMeter }) / riseTime
          : null,
      }
      : null,
  }
}

// --- RS-485 ---

// Terminasyonlar ve receiver yükleri diferansiyel hattı birlikte yükler.
export function differentialLoad({ terminations, receiverEq = null }) {
  const rt = parallelResistances(terminations)
  if (!Number.isFinite(rt)) return NaN
  return receiverEq > 0 ? twoInParallel(rt, receiverEq) : rt
}

// Simetrik failsafe bias: A hattı R_PU ile V_CC'ye, B hattı R_PD ile GND'ye.
export function biasCurrent({ vcc, rPullUp, rAB, rPullDown }) {
  const total = rPullUp + rAB + rPullDown
  if (!(vcc > 0) || !(total > 0)) return NaN
  return vcc / total
}

export function idleDifferentialVoltage({ vcc, rPullUp, rAB, rPullDown }) {
  const i = biasCurrent({ vcc, rPullUp, rAB, rPullDown })
  return Number.isFinite(i) ? i * rAB : NaN
}

/**
 * Hedef idle gerilimden simetrik bias direnci:
 *   R_B = R_AB·(V_CC/V_AB,target − 1) / 2
 *
 * Hedef gerilim besleme geriliminden büyükse ulaşılamaz.
 */
export function biasResistorForTarget({ vcc, rAB, target, series = 'E24' }) {
  if (!(vcc > 0) || !(rAB > 0) || !(target > 0)) return { error: BUS_ERR_INVALID }
  if (target >= vcc) return { error: BUS_ERR_BIAS_UNREACHABLE }

  const ideal = (rAB * (vcc / target - 1)) / 2
  if (!(ideal > 0)) return { error: BUS_ERR_BIAS_UNREACHABLE }

  // Standart seriye yuvarlanan değerle hesap YENİDEN yapılır: ideal direnç
  // satın alınamaz, kullanıcının göreceği gerilim gerçek dirençten gelmeli.
  const standard = nearestValue(ideal, series)
  const actual = standard?.value ?? null
  return {
    ideal,
    standard: actual,
    series,
    achieved: actual
      ? idleDifferentialVoltage({ vcc, rPullUp: actual, rAB, rPullDown: actual })
      : null,
  }
}

export function biasPower({ current, resistance }) {
  if (!(current >= 0) || !(resistance >= 0)) return NaN
  return current * current * resistance
}

// Unit load'dan ideal düğüm sayısı. Kablo kapasitansı, konnektörler ve gerçek
// transceiver limitlerini İÇERMEZ.
export function maxNodes({ unitLoad }) {
  if (!(unitLoad > 0)) return NaN
  return 32 / unitLoad
}

/**
 * RS-485 fiziksel katman değerlendirmesi.
 */
export function rs485PhysicalLayer({
  vcc, terminations = [120, 120], receiverEq = null,
  rPullUp = null, rPullDown = null,
  targetIdle = null, series = 'E24',
  receiverThreshold = 0.2, unitLoad = null,
  busLength = null, delayPerMeter = null, bitrate = null,
}) {
  const rAB = differentialLoad({ terminations, receiverEq })
  if (!Number.isFinite(rAB) || !(vcc > 0)) return { error: BUS_ERR_INVALID }

  let bias = null
  if (rPullUp > 0 && rPullDown > 0) {
    const i = biasCurrent({ vcc, rPullUp, rAB, rPullDown })
    const vIdle = i * rAB
    bias = {
      current: i,
      idleVoltage: vIdle,
      // Marj, alıcının eşik gerilimine göre ne kadar pay kaldığını gösterir.
      thresholdMargin: vIdle - receiverThreshold,
      powerPullUp: biasPower({ current: i, resistance: rPullUp }),
      powerPullDown: biasPower({ current: i, resistance: rPullDown }),
    }
  }

  return {
    ok: true,
    terminationEq: parallelResistances(terminations),
    differentialLoad: rAB,
    bias,
    biasTarget: targetIdle !== null
      ? biasResistorForTarget({ vcc, rAB, target: targetIdle, series })
      : null,
    maxNodes: unitLoad !== null ? maxNodes({ unitLoad }) : null,
    cableDelay: busLength !== null && delayPerMeter !== null
      ? cableDelay({ length: busLength, delayPerMeter })
      : null,
    bitTime: bitrate !== null ? bitTime({ bitrate }) : null,
  }
}
