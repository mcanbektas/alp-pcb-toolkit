// Via stub ve backdrill (REV2 §5).
//
// Through-hole via iç katmanda sona erdiğinde kullanılmayan bölüm açık uçlu bir
// iletim hattı stub'ı olur. Etki, stub'ın elektriksel uzunluğu çeyrek dalga
// mertebesine yaklaştığında ciddileşir. Backdrill bu bölümü kaldırır ama üretim
// toleransı nedeniyle bir residual stub kalır — asıl hesaplanan budur.
//
// İki farklı "maksimum residual" vardır ve karıştırılmamalıdır:
//   residualWorstCase : üretimde GERÇEKLEŞMESİ beklenen en kötü değer
//   allowedResidual   : hedef rezonanstan türeyen İZİN VERİLEN üst sınır
// İkisi ayrı alan adlarıyla taşınır (REV2 §5.3 sembol notu).

import { C0 } from './units'

export const VS_ERR_INVALID = 'invalid'
export const VS_ERR_RESIDUAL_NEGATIVE = 'residual-stub-negative'
export const VS_ERR_EXCEEDS_BOARD = 'backdrill-exceeds-board'
export const VS_ERR_TARGET_UNREACHABLE = 'target-not-reachable'

// Gidiş-dönüş gecikmesi / yükselme süresi oranının değerlendirme eşikleri.
// Bunlar fizik kuralı değil MÜHENDİSLİK SEZGİSİDİR; ekran öyle etiketler ve
// kullanıcı değiştirebilir.
export const KT_LOW = 0.1
export const KT_CONSIDER = 0.25

export const KT_CLASS_LOW = 'low' // genellikle küçük zaman alanı etkisi
export const KT_CLASS_CONSIDER = 'consider' // dikkate alınmalı
export const KT_CLASS_VERIFY = 'verify' // elektromanyetik doğrulama öner

export function classifyKt(kt) {
  if (!Number.isFinite(kt) || kt < 0) return null
  if (kt < KT_LOW) return KT_CLASS_LOW
  if (kt < KT_CONSIDER) return KT_CLASS_CONSIDER
  return KT_CLASS_VERIFY
}

export function stubLength({ viaTotal, used }) {
  if (!(viaTotal > 0) || !(used >= 0)) return NaN
  return viaTotal - used
}

// Backdrill sonrası kalan stub. Negatif sonuç fiziksel değildir: kaldırılan
// uzunluk stub'dan büyük olamaz, aksi hâlde hedef katmana girilmiştir.
export function residualStub({ stub, removed }) {
  if (!(stub >= 0) || !(removed >= 0)) return { error: VS_ERR_INVALID }
  const residual = stub - removed
  if (residual < 0) return { error: VS_ERR_RESIDUAL_NEGATIVE }
  return { residual }
}

// Üretim toleransı ve güvenlik payı dâhil, gerçekleşmesi beklenen en kötü değer.
export function residualWorstCase({ nominal, depthTol = 0, safety = 0 }) {
  if (!(nominal >= 0) || !(depthTol >= 0) || !(safety >= 0)) return NaN
  return nominal + depthTol + safety
}

// Kırpma burada FİZİKSEL: tolerans nominali aşarsa residual tamamen kalkmış
// demektir (elverişli sonuç, hata değil); worst-case toplamdır, negatife inemez.
export function residualBestCase({ nominal, depthTol = 0 }) {
  if (!(nominal >= 0) || !(depthTol >= 0)) return NaN
  return Math.max(0, nominal - depthTol)
}

// Via içindeki yayılma hızı. PCB'nin z ekseni dielektrik özelliği x-y'den farklı
// olabilir; bu birinci mertebe homojen ortam yaklaşımıdır.
export function viaVelocity({ epsR }) {
  if (!(epsR > 0)) return NaN
  return C0 / Math.sqrt(epsR)
}

// Açık uçlu stub çeyrek dalga rezonansı: f = c / (4·l·√εr)
export function quarterWaveResonance({ stub, epsR }) {
  if (!(stub > 0) || !(epsR > 0)) return NaN
  return C0 / (4 * stub * Math.sqrt(epsR))
}

// Tek harmonikler: f_n = (2n−1)·f_λ/4
export function resonanceHarmonics({ fundamental, count = 3 }) {
  if (!(fundamental > 0) || !Number.isInteger(count) || count < 1) return []
  return Array.from({ length: count }, (_, i) => (2 * (i + 1) - 1) * fundamental)
}

export function roundTripDelay({ stub, epsR }) {
  const v = viaVelocity({ epsR })
  if (!(stub > 0) || !Number.isFinite(v)) return NaN
  return (2 * stub) / v
}

// Rezonansın çalışma bandının dışında olması stub etkisinin YOK OLDUĞU anlamına
// gelmez: stub kapasitif bir süreksizlik olarak rezonansın çok altında da
// return loss'u bozar. Ekran bunu yazmak zorunda.
export function frequencyMargin({ resonance, fMax }) {
  if (!(resonance > 0) || !(fMax > 0)) return NaN
  return resonance / fMax
}

// Hedef rezonans frekansından İZİN VERİLEN maksimum residual stub.
export function allowedResidual({ fTarget, epsR }) {
  if (!(fTarget > 0) || !(epsR > 0)) return NaN
  return C0 / (4 * fTarget * Math.sqrt(epsR))
}

// Üretim toleransı ve güvenlik payı ÇIKARILDIKTAN sonra nominal üretim hedefi.
// Negatif sonuç, hedef rezonansın bu tolerans ve payla üretilemeyeceğini gösterir.
export function nominalBackdrillTarget({ allowed, fabricationTol = 0, safety = 0 }) {
  if (!(allowed > 0) || !(fabricationTol >= 0) || !(safety >= 0)) return { error: VS_ERR_INVALID }
  const target = allowed - fabricationTol - safety
  if (target <= 0) return { error: VS_ERR_TARGET_UNREACHABLE, target }
  return { target }
}

/**
 * Bütün stub değerlendirmesi tek çağrıda. Uzunluklar metre, süreler saniye.
 *
 * `removed` verilirse residual ondan hesaplanır; verilmezse `nominalResidual`
 * doğrudan kullanılır. İkisi de yoksa yalnız nominal stub sonuçları döner.
 */
export function viaStubPlan({
  viaTotal, used, stub = null,
  removed = null, nominalResidual = null,
  depthTol = 0, safety = 0,
  boardThickness = null,
  epsR, tr = null, fMax = null,
  fTarget = null, fabricationTol = 0,
  harmonicCount = 3,
}) {
  const lStub = stub ?? stubLength({ viaTotal, used })
  if (!(lStub > 0) || !(epsR > 0)) return { error: VS_ERR_INVALID }

  // Backdrill kartın kendisinden derin olamaz.
  if (boardThickness !== null && removed !== null && removed > boardThickness) {
    return { error: VS_ERR_EXCEEDS_BOARD }
  }

  let residual = null
  if (removed !== null) {
    const r = residualStub({ stub: lStub, removed })
    if (r.error) return { error: r.error }
    residual = r.residual
  } else if (nominalResidual !== null) {
    if (!(nominalResidual >= 0)) return { error: VS_ERR_INVALID }
    residual = nominalResidual
  }

  const fNominal = quarterWaveResonance({ stub: lStub, epsR })
  const tRt = roundTripDelay({ stub: lStub, epsR })
  const kt = tr > 0 ? tRt / tr : null

  let residualBlock = null
  if (residual !== null) {
    const wc = residualWorstCase({ nominal: residual, depthTol, safety })
    const bc = residualBestCase({ nominal: residual, depthTol })
    residualBlock = {
      nominal: residual,
      worstCase: wc,
      bestCase: bc,
      // Worst-case stub en UZUN olandır, dolayısıyla rezonansı en DÜŞÜK.
      resonanceNominal: residual > 0 ? quarterWaveResonance({ stub: residual, epsR }) : Infinity,
      resonanceWorstCase: wc > 0 ? quarterWaveResonance({ stub: wc, epsR }) : Infinity,
      // Backdrill'in kazandırdığı rezonans yükselmesi.
      resonanceGain: residual > 0 ? quarterWaveResonance({ stub: residual, epsR }) / fNominal : null,
    }
  }

  let backdrillTarget = null
  if (fTarget !== null) {
    const allowed = allowedResidual({ fTarget, epsR })
    const t = nominalBackdrillTarget({ allowed, fabricationTol, safety })
    backdrillTarget = t.error
      ? { allowed, error: t.error }
      : { allowed, nominalTarget: t.target, requiredRemoval: Math.max(0, lStub - t.target) }
  }

  return {
    ok: true,
    stub: lStub,
    velocity: viaVelocity({ epsR }),
    resonance: fNominal,
    harmonics: resonanceHarmonics({ fundamental: fNominal, count: harmonicCount }),
    roundTrip: tRt,
    kt,
    ktClass: kt !== null ? classifyKt(kt) : null,
    margin: fMax !== null ? frequencyMargin({ resonance: fNominal, fMax }) : null,
    residual: residualBlock,
    backdrillTarget,
  }
}
