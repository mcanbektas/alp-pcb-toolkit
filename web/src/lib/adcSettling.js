// ADC giriş yerleşme süresi ve RC filtre (REV2 §7).
//
// SAR ADC girişinin switched-capacitor yapısı örnekleme anında akım darbesi
// çeker. Yüksek kaynak empedansı, girişin acquisition süresi içinde gerekli
// doğruluğa YERLEŞEMEMESİNE yol açar ve bu hata kod tarafında hiç görünmez:
// dönüşüm tamamlanır, sayı gelir, sayı yanlıştır.
//
// Sürücü, filtre ve sampling ağı birlikte değerlendirilir; RC filtreyi tek başına
// kesim frekansından seçmek yerleşme koşulunu bozabilir.

import { K_B } from './units'

export const ADC_ERR_INVALID = 'invalid'
export const ADC_ERR_SETTLING_FAILED = 'adc-settling-failed'
export const ADC_ERR_BUFFER_REQUIRED = 'buffer-required'

// Yarım LSB hata sınırı: ε = 1 / 2^(N+1)
export function halfLsbError({ bits }) {
  if (!Number.isInteger(bits) || bits < 1) return NaN
  return 1 / 2 ** (bits + 1)
}

export function acquisitionTime({ cycles, clock, fixed = 0 }) {
  if (!(cycles > 0) || !(clock > 0) || !(fixed >= 0)) return NaN
  return cycles / clock + fixed
}

export function timeConstant({ rEq, cEq }) {
  if (!(rEq > 0) || !(cEq > 0)) return NaN
  return rEq * cEq
}

// Kalan bağıl hata: ε = e^(−t/τ)
export function relativeError({ t, tau }) {
  if (!(t >= 0) || !(tau > 0)) return NaN
  return Math.exp(-t / tau)
}

// Yarım LSB'ye yerleşmek için gereken minimum süre: (N+1)·ln2·R·C
export function minimumSettlingTime({ bits, rEq, cEq }) {
  const tau = timeConstant({ rEq, cEq })
  if (!Number.isFinite(tau) || !Number.isInteger(bits) || bits < 1) return NaN
  return (bits + 1) * Math.LN2 * tau
}

export function equivalentResistance({ source = 0, series = 0, switchR = 0, driver = 0 }) {
  const sum = source + series + switchR + driver
  return sum >= 0 ? sum : NaN
}

// R_eq,max = t_acq / (C_s·(N+1)·ln2)
export function maxEquivalentResistance({ tAcq, cs, bits }) {
  if (!(tAcq > 0) || !(cs > 0) || !Number.isInteger(bits) || bits < 1) return NaN
  return tAcq / (cs * (bits + 1) * Math.LN2)
}

/**
 * İzin verilen dış kaynak direnci:
 *   R_source,max = R_eq,max − R_switch − R_series − R_driver
 *
 * Negatif sonuç, iç dirençlerin tek başına bütçeyi yediğini gösterir: buffer ya
 * da daha uzun acquisition time gerekir. Sıfıra kırpmak, kullanıcının kaynak
 * direncini düşürerek çözebileceği izlenimi verirdi.
 */
export function maxSourceResistance({ tAcq, cs, bits, switchR = 0, series = 0, driver = 0 }) {
  const rEqMax = maxEquivalentResistance({ tAcq, cs, bits })
  if (!Number.isFinite(rEqMax)) return { error: ADC_ERR_INVALID }
  const rSourceMax = rEqMax - switchR - series - driver
  if (rSourceMax < 0) return { error: ADC_ERR_BUFFER_REQUIRED, rEqMax, rSourceMax }
  return { rEqMax, rSourceMax }
}

export function cutoffFrequency({ r, c }) {
  if (!(r > 0) || !(c > 0)) return NaN
  return 1 / (2 * Math.PI * r * c)
}

// Birinci dereceden filtre genliği ve zayıflatması.
export function filterResponse({ f, fc }) {
  if (!(f >= 0) || !(fc > 0)) return { error: ADC_ERR_INVALID }
  const magnitude = 1 / Math.sqrt(1 + (f / fc) ** 2)
  return { magnitude, attenuationDb: 20 * Math.log10(magnitude) }
}

// Harici kondansatörün sampling capacitor ile ani charge sharing droop'u.
// ADC switch direncini ve driver dinamiğini İHMAL EDER — gerçek droop daha azdır.
export function chargeSharingDroop({ vStep, cs, cf }) {
  if (!(vStep >= 0) || !(cs > 0) || !(cf >= 0)) return NaN
  return (vStep * cs) / (cf + cs)
}

export function lsbVoltage({ vFullScale, bits }) {
  if (!(vFullScale > 0) || !Number.isInteger(bits) || bits < 1) return NaN
  return vFullScale / 2 ** bits
}

// Sampling capacitor termal gürültüsü: √(kT/C). Bu TOPLAM ADC gürültüsü DEĞİLDİR,
// yalnız teorik kT/C bileşenidir.
export function thermalNoise({ c, tempK = 298.15 }) {
  if (!(c > 0) || !(tempK > 0)) return NaN
  return Math.sqrt((K_B * tempK) / c)
}

/**
 * Bütün yerleşme değerlendirmesi. Dirençler ohm, kapasitanslar farad,
 * süreler saniye, gerilimler volt, sıcaklık kelvin.
 */
export function adcSettlingPlan({
  bits, vFullScale, cs,
  cycles = null, clock = null, acqFixed = 0, tAcq = null,
  rSource = 0, rSeries = 0, rSwitch = 0, rDriver = 0,
  cFilter = 0, rFilter = null, noiseFreq = null,
  vStep = null, tempK = 298.15,
}) {
  if (!Number.isInteger(bits) || bits < 1 || !(vFullScale > 0) || !(cs > 0)) {
    return { error: ADC_ERR_INVALID }
  }

  const acq = tAcq ?? acquisitionTime({ cycles, clock, fixed: acqFixed })
  if (!(acq > 0)) return { error: ADC_ERR_INVALID }

  const rEq = equivalentResistance({
    source: rSource, series: rSeries, switchR: rSwitch, driver: rDriver,
  })
  // Örnekleme anında görülen toplam kapasitans: harici filtre kondansatörü
  // sampling capacitor'a paralel görünür.
  const cEq = cs + cFilter
  const tau = timeConstant({ rEq, cEq })

  const required = minimumSettlingTime({ bits, rEq, cEq })
  const epsRel = relativeError({ t: acq, tau })
  const epsAllowed = halfLsbError({ bits })
  const vLsb = lsbVoltage({ vFullScale, bits })

  const step = vStep ?? vFullScale
  const vError = Number.isFinite(epsRel) ? step * epsRel : NaN
  const errorLsb = Number.isFinite(vError) && vLsb > 0 ? vError / vLsb : NaN

  const source = maxSourceResistance({
    tAcq: acq, cs: cEq, bits, switchR: rSwitch, series: rSeries, driver: rDriver,
  })

  const fc = rFilter !== null && cFilter > 0 ? cutoffFrequency({ r: rFilter, c: cFilter }) : null
  const filter = fc !== null && noiseFreq !== null ? filterResponse({ f: noiseFreq, fc }) : null

  return {
    ok: true,
    acquisitionTime: acq,
    rEq,
    cEq,
    tau,
    requiredSettlingTime: required,
    // Marj negatifse acquisition süresi yetmiyor demektir; hata kodu ekranda
    // ADC_ERR_SETTLING_FAILED olarak gösterilir.
    settlingMargin: Number.isFinite(required) ? acq - required : NaN,
    settles: Number.isFinite(required) ? acq >= required : false,
    relativeError: epsRel,
    allowedError: epsAllowed,
    lsbVoltage: vLsb,
    voltageError: vError,
    errorLsb,
    maxEquivalentResistance: source.error ? source.rEqMax : source.rEqMax,
    maxSourceResistance: source.error ? null : source.rSourceMax,
    bufferRequired: source.error === ADC_ERR_BUFFER_REQUIRED,
    cutoffFrequency: fc,
    filter,
    capacitorRatio: cFilter > 0 ? cFilter / cs : null,
    droop: vStep !== null ? chargeSharingDroop({ vStep, cs, cf: cFilter }) : null,
    thermalNoise: thermalNoise({ c: cEq, tempK }),
  }
}
