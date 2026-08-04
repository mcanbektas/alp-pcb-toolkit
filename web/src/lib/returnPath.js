// Dönüş yolu ve stitching via planlaması (REV2 §4).
//
// Yüksek frekanslı dönüş akımı en düşük DC dirençli yolu değil, döngü
// endüktansını en aza indiren yolu izleme eğilimindedir. Bu motor "GND via ekle"
// demez; via endüktansını, frekansa bağlı reaktansı, dalga boyu tabanlı aralık
// önerisini ve stitching kondansatörünün kompleks empedansını sayı olarak verir.
//
// Via endüktansı BURADA HESAPLANMAZ: via.js'teki viaInductance tek kaynaktır.
// Aynı bağıntının ikinci kopyası, biri düzeltilip diğeri unutulduğunda iki aracın
// farklı sonuç vermesi demek.

import { C0 } from './units'
import { viaInductance } from './via'
import { complex, series, inv, abs, arg } from './complex'

export const RP_ERR_INVALID = 'invalid'

// Kenar bant genişliği yöntemi. İkisi de yaklaşık tasarım değeridir, kesin
// spektrum sınırı değil — ekran bunu etiketle söylemek zorunda.
export const BW_SINGLE_POLE = 'single-pole' // f ≈ 0.35 / t_r
export const BW_CONSERVATIVE = 'conservative' // f ≈ 0.50 / t_r
export const BW_FACTOR = { [BW_SINGLE_POLE]: 0.35, [BW_CONSERVATIVE]: 0.5 }

// Muhafazakârlık katsayısı seçenekleri (λ/N). Standart zorunluluğu değil,
// mühendislik kuralıdır.
export const SPACING_DIVISORS = [10, 20, 40]

export function edgeBandwidth({ tr, method = BW_CONSERVATIVE }) {
  const k = BW_FACTOR[method]
  if (!(tr > 0) || k === undefined) return NaN
  return k / tr
}

// v_p = c / √ε. Yüzey hattında εeff, gömülü hatta εr verilir; motor hangisi
// olduğunu bilmez, çağıran seçer.
export function propagationVelocity({ eps }) {
  if (!(eps > 0)) return NaN
  return C0 / Math.sqrt(eps)
}

export function wavelength({ vp, f }) {
  if (!(vp > 0) || !(f > 0)) return NaN
  return vp / f
}

// λ/N — stitching via aralığı üst sınırı.
export function stitchingSpacing({ lambda, divisor }) {
  if (!(lambda > 0) || !(divisor > 0)) return NaN
  return lambda / divisor
}

export function viaReactance({ L, f }) {
  if (!(L >= 0) || !(f > 0)) return NaN
  return 2 * Math.PI * f * L
}

// N eş ve BAĞIMSIZ via'nın eşdeğeri (REV2 §2.3, L_via,eq). Gerçek yapıda
// karşılıklı endüktans bulunduğu için sonuç iyimserdir; ekran bunu yazar.
export function parallelViaInductance({ L, n }) {
  if (!(L >= 0) || !Number.isInteger(n) || n < 1) return NaN
  return L / n
}

// ESL_total = ESL_component + L_mount + L_via,eq
export function eslTotal({ eslComponent = 0, lMount = 0, lViaEq = 0 }) {
  const sum = eslComponent + lMount + lViaEq
  return sum >= 0 ? sum : NaN
}

export function selfResonantFrequency({ esl, c }) {
  if (!(esl > 0) || !(c > 0)) return NaN
  return 1 / (2 * Math.PI * Math.sqrt(esl * c))
}

// Kondansatör kolu: Z = ESR + jωESL + 1/(jωC). Büyüklükleri toplamak yerine
// kompleks kurulur — SRF civarında iki sanal terim birbirini götürür ve
// büyüklük toplamı bu iptali göremez.
export function capacitorBranch({ esr = 0, esl, c, f }) {
  if (!(esl >= 0) || !(c > 0) || !(f > 0) || !(esr >= 0)) return { error: RP_ERR_INVALID }
  const w = 2 * Math.PI * f
  const z = series([complex(esr, 0), complex(0, w * esl), inv(complex(0, w * c))])
  return { z, magnitude: abs(z), phase: arg(z) }
}

// Dönüş bağlantısının endüktif gerilim büyüklüğü. Bu doğrudan ground bounce ya
// da EMI sonucu DEĞİLDİR; yalnızca bağlantının endüktif düşümüdür.
export function inductiveVoltage({ L, didt = null, ipk = null, f = null }) {
  if (didt !== null) return L >= 0 && Number.isFinite(didt) ? L * didt : NaN
  if (ipk !== null && f !== null) {
    const XL = viaReactance({ L, f })
    return Number.isFinite(XL) && ipk >= 0 ? ipk * XL : NaN
  }
  return NaN
}

/**
 * Bütün dönüş yolu değerlendirmesi tek çağrıda (REV2 §4.8 hesap akışı).
 *
 * Uzunluklar metre, süreler saniye, frekans Hz — motorun tamamı SI.
 * Stitching kondansatörü verilmezse o bölüm null döner; uydurma varsayılan
 * kondansatör kurulmaz.
 */
export function returnPathPlan({
  tr, bandwidthMethod = BW_CONSERVATIVE, clockFreq = null,
  eps, viaLength, viaDiameter, stitchingViaCount = 1,
  actualSpacing = null, spacingDivisor = 20, analysisFreq = null,
  returnCurrentPeak = null,
  capacitor = null, // { c, esr, esl, lMount, lViaEq }
}) {
  const fEdge = edgeBandwidth({ tr, method: bandwidthMethod })
  if (!Number.isFinite(fEdge)) return { error: RP_ERR_INVALID }

  // Analiz frekansı verilmezse kenar bant genişliği kullanılır. Saat frekansı
  // düşük olsa bile kısa yükselme süresi analiz frekansını çok yukarı taşır —
  // sonuçta ikisi birlikte gösterilir.
  const fAnalysis = analysisFreq ?? fEdge
  if (!(fAnalysis > 0)) return { error: RP_ERR_INVALID }

  const vp = propagationVelocity({ eps })
  const lambda = wavelength({ vp, f: fAnalysis })
  if (!Number.isFinite(lambda)) return { error: RP_ERR_INVALID }

  const lVia = viaInductance({ H: viaLength, D: viaDiameter })
  if (!Number.isFinite(lVia)) return { error: RP_ERR_INVALID }

  const lViaEq = parallelViaInductance({ L: lVia, n: stitchingViaCount })
  const xlSingle = viaReactance({ L: lVia, f: fAnalysis })
  const xlParallel = viaReactance({ L: lViaEq, f: fAnalysis })

  const spacingLimits = Object.fromEntries(
    SPACING_DIVISORS.map((d) => [d, stitchingSpacing({ lambda, divisor: d })]),
  )
  const spacingLimit = stitchingSpacing({ lambda, divisor: spacingDivisor })
  // Oran 1'in altındaysa gerçek aralık seçilen sınırın içindedir.
  const spacingRatio = actualSpacing !== null && spacingLimit > 0
    ? actualSpacing / spacingLimit
    : null

  let cap = null
  if (capacitor) {
    const esl = eslTotal({
      eslComponent: capacitor.esl ?? 0,
      lMount: capacitor.lMount ?? 0,
      lViaEq: capacitor.lViaEq ?? 0,
    })
    const branch = capacitorBranch({ esr: capacitor.esr ?? 0, esl, c: capacitor.c, f: fAnalysis })
    if (branch.error) return { error: branch.error }
    cap = {
      eslTotal: esl,
      fSrf: selfResonantFrequency({ esl, c: capacitor.c }),
      impedance: branch.magnitude,
      phase: branch.phase,
    }
  }

  return {
    ok: true,
    fEdge,
    fAnalysis,
    clockFreq,
    // Saat frekansı ile kenar bandı arasındaki oran: kullanıcı "1 MHz saat"
    // derken 500 MHz'lik bir kenarla uğraştığını burada görür.
    edgeToClockRatio: clockFreq > 0 ? fEdge / clockFreq : null,
    vp,
    lambda,
    spacingLimits,
    spacingLimit,
    spacingRatio,
    viaInductanceSingle: lVia,
    viaInductanceEq: lViaEq,
    reactanceSingle: xlSingle,
    reactanceParallel: xlParallel,
    returnVoltage: returnCurrentPeak !== null
      ? inductiveVoltage({ L: lViaEq, ipk: returnCurrentPeak, f: fAnalysis })
      : null,
    capacitor: cap,
  }
}
