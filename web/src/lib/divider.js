// Gerilim bölücü (spec §9.7) — analiz, sentez, tolerans ve değerlendirme.
// Tüm girişler SI: V, Ω, A, W.

import { nearestValues, seriesValues } from './eseries'
import { twoInParallel } from './ohm'

const isNum = (x) => Number.isFinite(x)

export const DIVIDER_ERR_INVALID = 'invalid'
export const DIVIDER_ERR_RANGE = 'range'
export const DIVIDER_ERR_NO_PAIR = 'no-pair'

export function voltageDivider({ Vin, R1, R2, RL = null }) {
  if (!isNum(Vin) || !isNum(R1) || !isNum(R2) || R1 < 0 || R2 < 0) {
    return { error: DIVIDER_ERR_INVALID }
  }
  if (R1 + R2 === 0) return { error: DIVIDER_ERR_INVALID }

  const Vout = Vin * (R2 / (R1 + R2))
  const Idiv = Vin / (R1 + R2)
  const P1 = Idiv * Idiv * R1
  const P2 = Idiv * Idiv * R2

  let loaded = null
  if (isNum(RL) && RL > 0) {
    const R2eff = twoInParallel(R2, RL)
    const VoutL = Vin * (R2eff / (R1 + R2eff))
    const IdivL = Vin / (R1 + R2eff)
    loaded = {
      RL,
      R2eff,
      Vout: VoutL,
      Idiv: IdivL,
      IL: VoutL / RL,
      // Yük yokken çıkışa göre sapma — yükleme etkisinin büyüklüğü
      dropPct: Vout === 0 ? NaN : (100 * (VoutL - Vout)) / Vout,
      P1: IdivL * IdivL * R1,
      P2: (VoutL * VoutL) / R2,
    }
  }

  return { Vin, R1, R2, Vout, Idiv, P1, P2, loaded }
}

// Çıkış gerilimi — yük varsa yüklü değeri, yoksa yüksüz değeri verir.
export function outputVoltage(r) {
  return r.loaded ? r.loaded.Vout : r.Vout
}

// Hedef çıkışa göre oran: k = Vout/Vin, R1/R2 = (1 − k)/k
export function dividerRatio(Vin, Vout) {
  if (!(Vin > 0) || !(Vout > 0) || Vout >= Vin) {
    return { error: DIVIDER_ERR_RANGE }
  }
  const k = Vout / Vin
  return { k, ratio: (1 - k) / k }
}

// §3.4 tolerans: worst-case köşeler.
// Vout; Vin ve R2 ile artar, R1 ile azalır — bu yüzden uç kombinasyonları
// yeterlidir, ara noktaları taramaya gerek yoktur.
export function dividerTolerance({ Vin, R1, R2, RL = null, tolR1 = 0, tolR2 = 0, tolVin = 0 }) {
  const base = voltageDivider({ Vin, R1, R2, RL })
  if (base.error) return base

  const corner = (vSign, r1Sign, r2Sign) => {
    const r = voltageDivider({
      Vin: Vin * (1 + (vSign * tolVin) / 100),
      R1: R1 * (1 + (r1Sign * tolR1) / 100),
      R2: R2 * (1 + (r2Sign * tolR2) / 100),
      RL,
    })
    return r.error ? NaN : outputVoltage(r)
  }

  const nom = outputVoltage(base)
  const max = corner(+1, -1, +1)
  const min = corner(-1, +1, -1)

  return {
    min, nom, max,
    spread: max - min,
    spreadPct: nom === 0 ? NaN : (100 * (max - min)) / nom,
    // Tek yönlü sapmalar simetrik değildir; ikisi de ayrı gösterilir
    minPct: nom === 0 ? NaN : (100 * (min - nom)) / nom,
    maxPct: nom === 0 ? NaN : (100 * (max - nom)) / nom,
  }
}

// --- Mühendislik değerlendirmesi ---
//
// Yalnızca kod ve sayı döner; metin arayüz katmanında yazılır. Böylece bu modül
// dilden ve gösterimden bağımsız kalır.

export const DIVIDER_STIFFNESS_RATIO = 10 // I_div ≥ 10·I_L için "sert" bölücü
export const SOURCE_Z_OK = 10e3
export const SOURCE_Z_WARN = 100e3

export function dividerFindings({
  Vin, R1, R2, RL = null, tolerance = null,
  targetVout = null, acceptPct = null, maxPowerEach = null,
}) {
  const r = voltageDivider({ Vin, R1, R2, RL })
  if (r.error) return { error: r.error }

  const out = []
  const Vout = outputVoltage(r)
  const Idiv = r.loaded ? r.loaded.Idiv : r.Idiv

  // Yük altında sertlik: bölücü akımı yük akımının kaç katı
  if (r.loaded && r.loaded.IL > 0) {
    const ratio = r.Idiv / r.loaded.IL
    out.push({
      code: 'stiffness',
      level: ratio >= DIVIDER_STIFFNESS_RATIO ? 'ok' : ratio >= 3 ? 'warn' : 'danger',
      ratio,
      threshold: DIVIDER_STIFFNESS_RATIO,
    })
    out.push({
      code: 'loading-error',
      level: Math.abs(r.loaded.dropPct) <= 1 ? 'ok' : Math.abs(r.loaded.dropPct) <= 5 ? 'warn' : 'danger',
      dropPct: r.loaded.dropPct,
      unloaded: r.Vout,
      loaded: r.loaded.Vout,
    })
  }

  // Direnç gücü
  const Pmax = Math.max(r.P1, r.P2)
  if (maxPowerEach > 0) {
    out.push({
      code: 'power',
      level: Pmax <= maxPowerEach * 0.5 ? 'ok' : Pmax <= maxPowerEach ? 'warn' : 'danger',
      Pmax, limit: maxPowerEach,
      utilisation: Pmax / maxPowerEach,
    })
  } else {
    out.push({ code: 'power', level: 'ok', Pmax, limit: null, utilisation: null })
  }

  // Sürekli çekilen akım — pil beslemeli tasarımda belirleyici
  out.push({ code: 'quiescent', level: 'ok', Idiv, Pdiv: Vin * Idiv })

  // Çok yüksek kaynak empedansı: kaçak akım ve gürültüye duyarlılık
  const Zout = twoInParallel(R1, R2)
  out.push({
    code: 'source-impedance',
    level: Zout <= SOURCE_Z_OK ? 'ok' : Zout <= SOURCE_Z_WARN ? 'warn' : 'danger',
    Zout,
  })

  if (tolerance && Number.isFinite(tolerance.spreadPct)) {
    const within = acceptPct != null
      ? Math.abs(tolerance.maxPct) <= acceptPct && Math.abs(tolerance.minPct) <= acceptPct
      : null
    out.push({
      code: 'tolerance-window',
      level: within === null || within ? 'ok' : 'danger',
      ...tolerance,
      acceptPct,
    })
  }

  if (targetVout != null && targetVout > 0) {
    const errPct = (100 * (Vout - targetVout)) / targetVout
    const limit = acceptPct ?? 2
    out.push({
      code: 'target-error',
      level: Math.abs(errPct) <= limit ? 'ok' : Math.abs(errPct) <= limit * 2 ? 'warn' : 'danger',
      errPct, targetVout, Vout, limit,
    })
  }

  return { findings: out, Vout, Idiv, Zout }
}

// --- Sentez: standart değer çifti arama ---
//
// Skor = wV·|EV| + wI·|EI| + wP·|EP|
// EI ve EP yalnızca hedef akım / güç sınırı verildiğinde devreye girer.
export function findDividerPair({
  Vin, Vout, series = 'E24', RL = null,
  targetIdiv = null, maxPowerEach = null,
  min = 100, max = 1e6, count = 5,
  wV = 1, wI = 0.2, wP = 0.2,
}) {
  const ratio = dividerRatio(Vin, Vout)
  if (ratio.error) return ratio

  // Aralıkta hiç standart değer yoksa sonuç da yoktur. Bu, geçersiz bir aralık
  // değil; yalnızca fazla dar bir aralıktır — kullanıcıya aynı öneri verilir.
  const values = seriesValues(series, min, max)
  if (values.length === 0) {
    return { error: DIVIDER_ERR_NO_PAIR }
  }

  const out = []
  for (const R2 of values) {
    // Her R2 için yalnızca ideal R1'e en yakın birkaç standart değer denenir;
    // tüm çiftleri taramaya gerek yok, çünkü uzak adaylar hedefe daha kötü düşer.
    // En yakın tek değerle yetinilmez: en iyi gerilim hatası veren çift güç veya
    // akım sınırını aşabilir, o zaman komşu adaylar devreye girer.
    const near = nearestValues(R2 * ratio.ratio, series, 3)
    if (near.length === 0) continue

    for (const R1 of new Set(near.map((n) => n.value))) {
      const r = voltageDivider({ Vin, R1, R2, RL })
      if (r.error) continue

      const actualVout = outputVoltage(r)
      const EV = (100 * (actualVout - Vout)) / Vout
      const Idiv = r.loaded ? r.loaded.Idiv : r.Idiv
      const EI = targetIdiv ? (100 * (Idiv - targetIdiv)) / targetIdiv : 0
      const Pmax = Math.max(r.P1, r.P2)
      const EP = maxPowerEach ? (100 * (Pmax - maxPowerEach)) / maxPowerEach : 0

      out.push({
        R1, R2, Vout: actualVout, Idiv, P1: r.P1, P2: r.P2,
        EV, EI, EP,
        score: wV * Math.abs(EV) + wI * Math.abs(EI) + wP * Math.abs(EP),
        overPower: maxPowerEach ? Pmax > maxPowerEach : false,
      })
    }
  }

  if (out.length === 0) {
    return { error: DIVIDER_ERR_NO_PAIR }
  }

  out.sort((a, b) => a.score - b.score)
  return { pairs: out.slice(0, count), series }
}

// --- Grafik için tarama ---
// param: 'RL' | 'R2' | 'R1'. Logaritmik adımlanır.
export function sweepDivider({ Vin, R1, R2, RL, param, from, to, steps = 60, tol = null }) {
  if (!(from > 0) || !(to > from) || !(steps > 1)) return []

  const out = []
  const a = Math.log10(from)
  const b = Math.log10(to)
  for (let i = 0; i < steps; i++) {
    const x = Math.pow(10, a + ((b - a) * i) / (steps - 1))
    const args = { Vin, R1, R2, RL, [param]: x }
    const r = voltageDivider(args)
    if (r.error) continue

    let lo = null
    let hi = null
    if (tol) {
      const t = dividerTolerance({ ...args, ...tol })
      if (!t.error) { lo = t.min; hi = t.max }
    }
    out.push({ x, y: outputVoltage(r), lo, hi })
  }
  return out
}
