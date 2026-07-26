// Tek uçlu empedans ekranının kullanıcıya görünen metinleri.

import { fmt, fmtEng, fmtRes, fmtPct } from '../../../lib/num'
import { METHOD_CLOSED_FORM } from '../../../lib/impedance'
import { STRUCT_MICROSTRIP, STRUCT_STRIPLINE, STRUCT_CPW, REASON_NO_SOLUTION } from './model'

export const STRUCT_LABEL = {
  [STRUCT_MICROSTRIP]: 'Surface microstrip',
  [STRUCT_STRIPLINE]: 'Symmetric stripline',
  [STRUCT_CPW]: 'Coplanar waveguide (alt düzlemsiz)',
}

export const METHOD_NOTE =
  'Hızlı denklem modu — kapalı form. Üretim için önerilen sonuç alan çözücüden gelmelidir; ' +
  'bu sonuç üretime hazır kabul edilmemelidir.'

export const CHART = {
  x: 'Hat genişliği W (mm)', y: 'Z₀ (Ω)',
  caption: 'Genişlik arttıkça empedans düşer. Eğrinin eğimi, üretim genişlik toleransının empedansa ne kadar geçtiğini gösterir — dik bölgede aynı tolerans daha büyük sapma üretir.',
}

export function reasonText(reason) {
  if (reason === REASON_NO_SOLUTION) {
    return 'Bu yığınla hedef empedans fiziksel genişlik aralığında elde edilemiyor. Dielektrik yüksekliğini veya εr değerini değiştirin.'
  }
  return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  out.push({
    level: 'ok',
    text: `${STRUCT_LABEL[r.structure]} için Z₀ = ${fmtRes(r.Z0, 4)}, εeff = ${fmt(r.epsEff, 4)}, yayılma gecikmesi ${fmt(r.tpdPsPerMm, 4)} ps/mm.`,
  })

  if (r.mode === 'syn') {
    out.push({
      level: 'ok',
      text: `${fmtRes(r.target, 3)} hedefi için gereken genişlik ${fmtEng(r.W, 'm', 4)}; kök sınırlandırılmış aramayla bulundu (${r.solvedBy}).`,
    })
  }

  out.push({
    level: r.method === METHOD_CLOSED_FORM ? 'warn' : 'ok',
    text: r.method === METHOD_CLOSED_FORM
      ? 'Sonuç kapalı form denklemlerinden geliyor. Alan çözücü henüz yok; bu değer üretim için doğrulanmış sayılmaz.'
      : 'Sonuç alan çözücüden geliyor.',
  })

  if (!r.inRange) {
    out.push({
      level: 'danger',
      text: 'Geometri, kullanılan kapalı formun güvenilir aralığının dışında. Sonuç gösteriliyor ama bu bölgede sapma büyür.',
    })
  }

  if (r.structure === STRUCT_MICROSTRIP) {
    out.push({
      level: r.thicknessIncluded ? 'ok' : 'warn',
      text: r.thicknessIncluded
        ? `Bakır kalınlığı düzeltmesi uygulandı (τ = t/H = ${fmt(r.tau, 4)}); kalınlık empedansı düşürür.`
        : 'Bakır kalınlığı sıfır girildi. Gerçek bakır empedansı birkaç ohm düşürür; kalınlığı girmek daha gerçekçi sonuç verir.',
    })
    out.push({
      level: 'warn',
      text: 'Solder mask modelde yoktur. Mask kaplı microstrip empedansı tipik olarak birkaç ohm daha düşüktür.',
    })
  }

  if (r.structure === STRUCT_STRIPLINE) {
    out.push({
      level: 'warn',
      text: 'Kapalı form simetrik ve sıfır kalınlıklı hat içindir. Bakır kalınlığı, asimetrik yerleşim ve farklı prepreg/core dielektrikleri sonucu değiştirir — bunlar alan çözücü fazına bırakıldı.',
    })
  }

  if (r.structure === STRUCT_CPW) {
    out.push({
      level: 'danger',
      text: 'Bu sonuç ideal coplanar waveguide içindir: alt referans düzlemi YOKTUR. Altında düzlem bulunan yapı (grounded CPW) farklı davranır ve bu sonuç onun yerine kullanılmamalıdır.',
    })
  }

  if (r.tolerance) {
    const within = Math.max(Math.abs(r.tolerance.minPct), Math.abs(r.tolerance.maxPct))
    out.push({
      level: within > 10 ? 'danger' : within > 5 ? 'warn' : 'ok',
      text: `Tolerans sonrası Z₀ ${fmtRes(r.tolerance.min, 4)} … ${fmtRes(r.tolerance.max, 4)} (${fmtPct(r.tolerance.minPct)} / ${fmtPct(r.tolerance.maxPct)}). Kontrollü empedans siparişlerinde tipik hedef ±10 %'dir.`,
    })
  }

  out.push({
    level: 'warn',
    text: 'Empedans sonucu üreticiyle doğrulanmalıdır: gerçek Dk, preslenmiş prepreg kalınlığı, etch compensation ve bakır pürüzlülüğü sonucu değiştirir.',
  })

  return out
}
