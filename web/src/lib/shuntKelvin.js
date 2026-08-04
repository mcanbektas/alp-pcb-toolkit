// Shunt direnci ve Kelvin bağlantı (REV2 §9).
//
// Kelvin (dört uçlu) bağlantı, akım taşıyan pad ve bakır yolların I·R düşümünün
// sense ölçümüne karışmasını azaltır. Karışırsa hata SİSTEMATİKTİR: kalibrasyonla
// gizlenebilir ama sıcaklıkla ve akımla birlikte kayar.
//
// Düşük akımlarda baskın hata kaynağı amplifikatör offset'idir ve YÜZDE olarak
// büyür: aynı V_OS, yarı akımda iki kat bağıl hata demektir.

export const SK_ERR_INVALID = 'invalid'
export const SK_ERR_POWER_EXCEEDED = 'shunt-power-exceeded'

// Hedef full-scale sense geriliminden shunt değeri.
export function shuntFromSenseVoltage({ vSenseFs, iMax }) {
  if (!(vSenseFs > 0) || !(iMax > 0)) return NaN
  return vSenseFs / iMax
}

export function senseVoltage({ current, shunt }) {
  if (!(current >= 0) || !(shunt > 0)) return NaN
  return current * shunt
}

export function shuntPower({ current, shunt }) {
  if (!(current >= 0) || !(shunt > 0)) return NaN
  return current * current * shunt
}

// Derating yüzdesi 0–1 arasındadır (ör. %60 kullanım → 0.6).
export function powerMargin({ rated, derating = 1, actual }) {
  if (!(rated > 0) || !(derating > 0) || !(derating <= 1) || !(actual > 0)) return NaN
  return (rated * derating) / actual
}

export function selfHeating({ power, thermalResistance, ambient }) {
  if (!(power >= 0) || !(thermalResistance >= 0) || !Number.isFinite(ambient)) {
    return { error: SK_ERR_INVALID }
  }
  const rise = power * thermalResistance
  return { rise, temperature: ambient + rise }
}

// TCR ppm/°C olarak girilir; α_R = TCR_ppm × 1e−6
export function tcrCoefficient({ ppm }) {
  return Number.isFinite(ppm) ? ppm * 1e-6 : NaN
}

export function resistanceAtTemperature({ r0, ppm, temperature, reference = 25 }) {
  const alpha = tcrCoefficient({ ppm })
  if (!(r0 > 0) || !Number.isFinite(alpha) || !Number.isFinite(temperature)) return NaN
  return r0 * (1 + alpha * (temperature - reference))
}

// TCR kaynaklı BAĞIL hata (birimsiz oran, yüzde değil).
export function tcrError({ ppm, temperature, reference = 25 }) {
  const alpha = tcrCoefficient({ ppm })
  if (!Number.isFinite(alpha) || !Number.isFinite(temperature)) return NaN
  return alpha * (temperature - reference)
}

export function amplifierOutput({ gain, current, shunt, offsetOut = 0 }) {
  if (!(gain > 0) || !(current >= 0) || !(shunt > 0)) return NaN
  return gain * current * shunt + offsetOut
}

// Offset'in akıma çevrilmiş karşılığı: shunt küçüldükçe büyür.
export function offsetCurrentError({ vos, shunt }) {
  if (!Number.isFinite(vos) || !(shunt > 0)) return NaN
  return Math.abs(vos) / shunt
}

export function lsbVoltage({ vRef, bits }) {
  if (!(vRef > 0) || !Number.isInteger(bits) || bits < 1) return NaN
  return vRef / 2 ** bits
}

// İdeal akım çözünürlüğü. ENOB verilirse gerçek çözünürlük için o kullanılır.
export function currentResolution({ vRef, bits, gain, shunt }) {
  const vLsb = lsbVoltage({ vRef, bits })
  if (!Number.isFinite(vLsb) || !(gain > 0) || !(shunt > 0)) return NaN
  return vLsb / (gain * shunt)
}

/**
 * Kelvin KULLANILMAYAN yapıda ortak bakır direnci ölçüme karışır:
 *   V_measured = I·(R_shunt + R_shared)
 *   E_shared   = R_shared / R_shunt
 *
 * Kelvin bağlantıda sense hatlarında ihmal edilebilir akım aktığı varsayılır;
 * amplifier input bias current ve asimetrik filtre dirençleri yine hata üretir.
 */
export function sharedPathError({ shunt, shared = 0, kelvin = true }) {
  if (!(shunt > 0) || !(shared >= 0)) return NaN
  return kelvin ? 0 : shared / shunt
}

// Worst-case: bileşenlerin mutlak değerleri toplanır (hepsi aynı yönde varsayılır).
export function worstCaseError(components) {
  if (!Array.isArray(components) || components.length === 0) return NaN
  if (components.some((e) => !Number.isFinite(e))) return NaN
  return components.reduce((s, e) => s + Math.abs(e), 0)
}

// RSS: bileşenlerin istatistiksel BAĞIMSIZ olduğu varsayımıyla karekök toplam.
// Bu varsayım tutmuyorsa (ör. gain ve offset aynı amplifikatörden geliyorsa)
// sonuç iyimserdir; ekran ikisini birlikte gösterir.
export function rssError(components) {
  if (!Array.isArray(components) || components.length === 0) return NaN
  if (components.some((e) => !Number.isFinite(e))) return NaN
  return Math.sqrt(components.reduce((s, e) => s + e * e, 0))
}

/**
 * Bütün shunt değerlendirmesi. Akımlar amper, dirençler ohm, gerilimler volt,
 * sıcaklıklar °C, TCR ppm/°C.
 */
export function shuntKelvinPlan({
  iMax, iRms = null, iPeak = null, iNominal = null,
  vSenseFs = null, shunt = null,
  tolerance = 0, tcrPpm = 0, referenceTemp = 25, ambient = 25,
  thermalResistance = null, ratedPower = null, derating = 1,
  gain = 1, gainTolerance = 0, vos = 0,
  vRef = null, bits = null, enob = null,
  sharedResistance = 0, kelvin = true,
}) {
  const r = shunt ?? shuntFromSenseVoltage({ vSenseFs, iMax })
  if (!(r > 0) || !(iMax > 0)) return { error: SK_ERR_INVALID }

  const rms = iRms ?? iMax
  const power = shuntPower({ current: rms, shunt: r })
  const peakPower = iPeak !== null ? shuntPower({ current: iPeak, shunt: r }) : null

  const thermal = thermalResistance !== null
    ? selfHeating({ power, thermalResistance, ambient })
    : null
  const temperature = thermal && !thermal.error ? thermal.temperature : ambient

  const margin = ratedPower !== null
    ? powerMargin({ rated: ratedPower, derating, actual: power })
    : null

  // Hata bileşenlerinin tamamı BAĞIL orandır (birimsiz), yüzde değil.
  const measureCurrent = iNominal ?? iMax
  const eTcr = tcrError({ ppm: tcrPpm, temperature, reference: referenceTemp })
  const eOffset = measureCurrent > 0 ? Math.abs(vos) / (measureCurrent * r) : NaN
  const eShared = sharedPathError({ shunt: r, shared: sharedResistance, kelvin })
  const components = [tolerance, eTcr, gainTolerance, eOffset, eShared]

  return {
    ok: true,
    shunt: r,
    senseVoltageFs: senseVoltage({ current: iMax, shunt: r }),
    power,
    peakPower,
    powerMargin: margin,
    powerExceeded: margin !== null && margin < 1,
    powerError: margin !== null && margin < 1 ? SK_ERR_POWER_EXCEEDED : null,
    temperatureRise: thermal && !thermal.error ? thermal.rise : null,
    temperature,
    resistanceHot: resistanceAtTemperature({
      r0: r, ppm: tcrPpm, temperature, reference: referenceTemp,
    }),
    tcrError: eTcr,
    amplifierOutputFs: amplifierOutput({ gain, current: iMax, shunt: r }),
    offsetCurrentError: offsetCurrentError({ vos, shunt: r }),
    currentResolution: vRef !== null && bits !== null
      ? currentResolution({ vRef, bits, gain, shunt: r })
      : null,
    // ENOB, gürültü ve doğrusalsızlık sonrası GERÇEK çözünürlüktür; ideal
    // bit sayısıyla verilen sayı sistemin ulaşabileceği en iyi hâldir.
    currentResolutionEnob: vRef !== null && enob !== null
      ? currentResolution({ vRef, bits: Math.round(enob), gain, shunt: r })
      : null,
    sharedError: eShared,
    offsetError: eOffset,
    worstCaseError: worstCaseError(components),
    rssError: rssError(components),
  }
}
