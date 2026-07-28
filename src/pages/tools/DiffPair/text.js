// Diferansiyel çift ekranının kullanıcıya görünen metinleri.

import { fmt, fmtEng, fmtRes, fmtPct } from '../../../lib/num'
import { STRUCT_MICROSTRIP, STRUCT_STRIPLINE, FIX_WIDTH, REASON_NO_SOLUTION } from './model'

export const STRUCT_LABEL = {
  [STRUCT_MICROSTRIP]: 'Edge-coupled microstrip',
  [STRUCT_STRIPLINE]: 'Edge-coupled stripline',
}

export const FIXED_LABEL = {
  [FIX_WIDTH]: 'Genişliği sabitle, aralığı bul',
  spacing: 'Aralığı sabitle, genişliği bul',
}

export const METHOD_NOTE =
  'Kaba yaklaşım — tek uçlu empedans kapalı formdan geliyor, ama çiftin odd/even ayrımı ' +
  'kaynağı belirsiz ampirik bir kuplaj katsayısından geliyor. Maxwell kapasitans matrisi ' +
  'rotası uygulanmadı. Bu Z_diff ile üretim kararı vermeyin: ' +
  'yığın onayı, panel çıkışı veya empedans kontrol kuponu için alan çözücü sonucu ya da ' +
  'üretici ölçümü gerekir.'

// Ampirik kuplaj katsayısının nereden geldiği ve neden ayrı etiketlendiği.
// Sonuç panelinde METHOD_NOTE'un hemen altında durur.
export const COUPLING_SOURCE_NOTE =
  'Kuplaj katsayısı k_c = 0.48·exp(−0.96·S/H) (stripline: 0.347·exp(−2.9·S/b)) ' +
  'AMPİRİKTİR — sayısal katsayıları ve geçerlilik aralığı doğrulanmış bir kaynağa ' +
  'dayanmıyor. Bu yüzden sonucun yöntem etiketi `empirical-coupling`, kapalı form ' +
  'sonuçlarının taşıdığı `closed-form` değil.'

export const CHART_SPACING = {
  x: 'Hatlar arası boşluk S (mm)', y: 'Empedans (Ω)',
  caption: 'Aralık açıldıkça kuplaj zayıflar ve Z_diff 2·Z₀ değerine yaklaşır. Sıkı kuplajda eğri dikleşir; orada üretim aralık toleransı empedansa daha çok geçer.',
}

export const CHART_WIDTH = {
  x: 'Hat genişliği W (mm)', y: 'Empedans (Ω)',
  caption: 'Aralık sabitken genişlik arttıkça hem tek uçlu hem diferansiyel empedans düşer.',
}

export function reasonText(reason) {
  if (reason === REASON_NO_SOLUTION) {
    return 'Bu yığın ve sabitlenen değerle hedef diferansiyel empedans elde edilemiyor. Sabitlediğiniz değeri, dielektrik yüksekliğini veya εr değerini değiştirin.'
  }
  return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  out.push({
    level: 'ok',
    text: `Z_diff = ${fmtRes(r.Zdiff, 4)}; odd mod ${fmtRes(r.Zodd, 4)}, even mod ${fmtRes(r.Zeven, 4)}, common mod ${fmtRes(r.Zcommon, 4)}.`,
  })

  out.push({
    level: 'ok',
    text: `Z_diff = 2·Z_odd olarak hesaplandı. İki tek uçlu empedansın toplamı (${fmtRes(2 * r.Z0, 4)}) DEĞİLDİR — aradaki fark kuplajdan gelir.`,
  })

  if (r.mode === 'syn') {
    const within = Math.abs(r.errPct) <= r.acceptPct
    out.push({
      level: within ? 'ok' : 'danger',
      text: within
        ? `${r.solvedFor === 'S' ? 'Aralık' : 'Genişlik'} ${r.solvedFor === 'S' ? fmtEng(r.S, 'm', 4) : fmtEng(r.W, 'm', 4)} bulundu; hedeften sapma ${fmtPct(r.errPct)}, kabul sınırı ±${fmt(r.acceptPct, 3)} % içinde.`
        : `Bulunan çözüm hedeften ${fmtPct(r.errPct)} sapıyor; kabul sınırı ±${fmt(r.acceptPct, 3)} %.`,
    })
    out.push({
      level: 'ok',
      text: `Kök sınırlandırılmış aramayla bulundu (${r.solvedBy}); sonuç fiziksel aralık içinde.`,
    })
  }

  out.push({
    level: r.coupling > 0.35 ? 'warn' : 'ok',
    text: r.coupling > 0.35
      ? `Kuplaj katsayısı ${fmt(r.coupling, 4)} — çift sıkı kuplajlı. Bu bölgede ampirik yaklaşım sapar ve aralık toleransı empedansa güçlü biçimde geçer.`
      : `Kuplaj katsayısı ${fmt(r.coupling, 4)}; S/H oranı ${fmt(r.ratio, 3)}.`,
  })

  if (!r.inRange) {
    out.push({
      level: 'danger',
      text: 'Geometri ampirik kuplaj yaklaşımının güvenilir aralığının dışında (S/H < 0.2 veya tek uçlu form aralık dışı). Sonuç gösteriliyor ama sapma büyük olabilir.',
    })
  }

  out.push({
    level: 'warn',
    text: 'Bu ekranın odd/even ayrımı kaba bir yaklaşımdır: kuplaj katsayısı ampiriktir ve doğrulanmış bir kaynağa dayanmıyor. Sonuç yığın onayı, panel çıkışı veya empedans kuponu kararı için kullanılmamalıdır.',
  })

  out.push({
    level: 'warn',
    text: 'Odd/even empedanslarının tam çözümü Maxwell kapasitans matrisinden geçer (C_odd = C₁₁ − C₁₂, C_even = C₁₁ + C₁₂). Bu rota uygulanmadı — C₁₁ ve C₁₂ için kapalı form yok, alan çözücü gerekiyor. Alan çözücü devreye girdiğinde bu ekranın hesabı o rotayla değiştirilecek.',
  })

  out.push({
    level: 'ok',
    text: `Z_diff = 2·Z_odd ve Z_common = Z_even / 2 dönüşümleri tanım gereği tam bağıntılardır; sapma yalnızca Z_odd ve Z_even'in nereden geldiğindedir. Bu sonucun yöntem etiketi bu yüzden \`${r.method}\`, tek uçlu formunki ise \`${r.singleMethod}\`.`,
  })

  if (r.structure === STRUCT_MICROSTRIP) {
    out.push({
      level: 'warn',
      text: 'Microstrip diferansiyel çiftte odd ve even modların yayılma hızları farklıdır. Bu fark far-end crosstalk ve mod dönüşümü üretir; stripline\'da homojen dielektrik yüzünden fark yoktur.',
    })
  }

  out.push({
    level: 'ok',
    text: `Yayılma gecikmesi ${fmt(r.tpdPsPerMm, 4)} ps/mm; 1 mm uzunluk farkı ${fmt(r.tpdPsPerMm, 3)} ps skew üretir.`,
  })

  out.push({
    level: 'warn',
    text: 'Protokol presetleri yalnızca form alanlarını doldurur. Bu sonuç protokole uygunluk iddiası değildir; ilgili komponent ve protokol dokümanını doğrulayın.',
  })

  return out
}
