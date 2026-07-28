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

// --- Kaynak ve tanım bilgisi (spec §1: "Standart veya kaynak bilgisi") ---
//
// Sağ panelde "Kaynak ve tanımlar" başlığı altında listelenir. Kaynak
// dokümanda olmayan bir bağıntı varsa bu listede açıkça söylenir.
export const SOURCE_NOTES = [
  'Kaynak: docs/spec.md §11.3. Bölüm bu ekran için yalnızca iki bağıntı verir: f = 1/T ve T = 1/f. İkisi de tanım gereği tamdır — ampirik katsayı, eğri uydurma ya da tablo içermezler.',
  'Tanım: frekans birim zamandaki tam çevrim sayısıdır (Hz = 1/s), periyot ise bir tam çevrimin süresidir (s). Bu yüzden f = 1/T bir yaklaşıklık değil, iki büyüklüğün tanımının doğrudan sonucudur.',
  'Açısal frekans ω = 2π·f kaynak dokümanın §11.3 bölümünde YOKTUR; bu ekrana tanım gereği eklenmiştir. Bir tam çevrim 2π radyana karşılık geldiği için ω = 2π·f ve f = ω/(2π) yazılır. Sayısal bir katsayı seçimi değildir, ancak kaynak dokümandan doğrulanmış bir madde de değildir.',
  'Birim çarpanları ondalık SI önekleridir ve 10\'un tam kuvvetleridir: 1 kHz = 10³ Hz, 1 MHz = 10⁶ Hz, 1 GHz = 10⁹ Hz; 1 ms = 10⁻³ s, 1 µs = 10⁻⁶ s, 1 ns = 10⁻⁹ s, 1 ps = 10⁻¹² s. Çarpanlar yuvarlanmış değerler değildir.',
]

// --- Sayısal geçerlilik aralığı (spec §12: "Geçerlilik aralığı") ---
//
// Sınırların kaynağı convertFrequency.js: guard() sıfır ve negatifi reddeder,
// ters çevrim ile ω hesabı sonlu değilse aralık hatası döner. Aşağıdaki
// sayılar çift duyarlıklı kayan noktanın (IEEE-754 binary64) sınırlarıdır.
export const LIMIT_NOTES = [
  'Geçerli giriş aralığı sıfırdan büyük sonlu sayılardır: f > 0 ve T > 0. Sınır değerin kendisi (tam 0) dışarıdadır — f = 0 (DC) bir periyoda karşılık gelmez, 1/0 tanımsızdır ve negatif bir tekrar süresi yoktur. Bu girişlerde sonuç yerine hata gösterilir.',
  'Frekans girişinde üst taşma sınırı f ≈ 2.8611×10³⁰⁷ Hz\'dir: bunun üstünde ω = 2π·f, çift duyarlıklı kayan noktanın en büyük değerini (1.7977×10³⁰⁸) aşar ve aralık hatası döner.',
  'Frekans girişinde alt taşma sınırı f ≈ 5.5627×10⁻³⁰⁹ Hz\'dir: bunun altında T = 1/f aynı üst sınırı aşar. Frekans için başka bir alt sınır yoktur; f = 1×10⁻³⁰⁰ Hz gibi bir giriş hâlâ çevrilir.',
  'Periyot girişinde alt taşma sınırı T ≈ 3.4951×10⁻³⁰⁸ s\'dir; bunun altında ω = 2π/T temsil edilemez. Periyot için üst sınır yoktur: T ne kadar büyük olursa olsun f = 1/T temsil edilebilir kalır.',
  'Bu dört sınır fiziksel değil sayısal sınırdır; denklemden değil, sayının bilgisayarda tutulma biçiminden gelir. Baskı devre pratiğinde karşılaşılan hiçbir frekans veya periyot bu sınırlara yaklaşmaz.',
]

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
