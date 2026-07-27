// Frekans ve periyot dönüştürücü ekranının kullanıcıya görünen metinleri.
// Hata kodları burada Türkçeye çevrilir; model.js cümle üretmez.

import { fmtEng } from '../../../lib/num'
import { REASON_NONPOSITIVE, REASON_RANGE } from './model'

export const SOURCE_LABEL = {
  frequency: 'Frekanstan',
  period: 'Periyottan',
}

// Girilen büyüklüğe göre ana sonucun adı
export const MAIN_LABEL = {
  frequency: 'Periyot (T)',
  period: 'Frekans (f)',
}

export const CHART = {
  x: 'Frekans (Hz)',
  y: 'Periyot (s)',
  caption: 'Periyot frekansın tersidir. Logaritmik frekans ekseninde eğri, çalışma noktasının iki yanında birer dekat gösterir; işaretli nokta girilen değerdir.',
}

export function reasonText(reason) {
  switch (reason) {
    case REASON_NONPOSITIVE:
      return 'Frekans ve periyot sıfırdan büyük olmalı. 1/0 tanımsızdır; f = 0 (DC) bir periyoda karşılık gelmez, negatif bir tekrar süresi de yoktur.'
    case REASON_RANGE:
      return 'Girilen değerin tersi sayı aralığının dışına taşıyor. Daha makul bir büyüklük girin.'
    default:
      return 'Frekans ya da periyot alanına pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  out.push({
    level: 'ok',
    text: `${fmtEng(r.frequency, 'Hz', 4)} frekansın bir tam çevrimi ${fmtEng(r.period, 's', 4)} sürer. İki büyüklük tanım gereği birbirinin tersidir: frekans iki katına çıkarsa periyot yarıya iner.`,
  })

  out.push({
    level: 'ok',
    text: `Açısal frekans ω = 2πf = ${fmtEng(r.omega, 'rad/s', 4)}. Reaktans, faz ve empedans denklemleri frekansı bu biçimde kullanır; birimi radyan/saniyedir, derece değildir.`,
  })

  out.push({
    level: 'ok',
    text: '%50 görev çevrimli bir kare dalgada yüksek ve alçak seviyeler periyodu ikiye böler. Periyot, sinyalin tekrar süresidir — kenarın kendi süresi (t_r) ayrı bir büyüklüktür.',
  })

  if (r.frequency >= 1e9) {
    out.push({
      level: 'warn',
      text: `Çalışma frekansı ${fmtEng(r.frequency, 'Hz', 3)}. Bu bölgede hat uzunluğu, dönüş yolu ve dielektrik kaybı sonucu belirler; frekans–periyot dönüşümü tek başına bir tasarım kararı vermez.`,
    })
  }

  if (r.period < 1e-12) {
    out.push({
      level: 'warn',
      text: `Periyot ${fmtEng(r.period, 's', 3)}, yani 1 ps'nin altında. Dönüşüm doğrudur ancak bu aralık tipik baskı devre tasarımının ve çoğu ölçüm ekipmanının dışında kalır.`,
    })
  }

  if (r.frequency < 1) {
    out.push({
      level: 'warn',
      text: `Frekans 1 Hz'in altında; bir çevrim ${fmtEng(r.period, 's', 3)} sürüyor. Bu aralıkta sinyal bütünlüğü değil, zamanlama ve örnekleme tarafındaki gereksinimler belirleyicidir.`,
    })
  }

  return out
}
