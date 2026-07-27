// Uzunluk dönüştürücü ekranının kullanıcıya görünen metinleri.

import { fmt } from '../../../lib/num'
import { REASON_RANGE, REASON_UNIT, REASON_OVERFLOW } from './model'

// --- Etiketler ---

// Birim seçicilerde görünen uzun adlar
export const UNIT_LABEL = {
  mm: 'milimetre (mm)',
  'µm': 'mikrometre (µm)',
  mil: 'mil (0.001 inch)',
  inch: 'inch (in)',
  cm: 'santimetre (cm)',
  m: 'metre (m)',
}

// Sonuç tablosundaki satır adları
export const UNIT_ROW = {
  mm: 'milimetre',
  'µm': 'mikrometre',
  mil: 'mil',
  inch: 'inch',
  cm: 'santimetre',
  m: 'metre',
}

export const SIG_LABEL = (n) => `${n} anlamlı basamak`

export const CHART = {
  x: 'Uzunluk (mm)',
  y: 'Karşılığı (mil)',
  caption:
    'Dönüşüm doğrusaldır: doğrunun eğimi 1/0.0254 = 39.370078… mil/mm. Milimetre ızgarası ile mil ızgarası yalnızca sıfırda çakışır; ara değerlerde biri diğerinin tam katı olmaz.',
}

// --- Hata kodu → Türkçe ---

export function reasonText(reason) {
  switch (reason) {
    case REASON_RANGE:
      return 'Uzunluk sıfırdan büyük olmalı. Negatif ya da sıfır uzunluğun dönüşümü anlamlı bir sonuç vermez.'
    case REASON_OVERFLOW:
      return 'Uzunluk sayı olarak temsil edilebilecek aralığın dışına taşıyor: bu büyüklükte µm ve mil karşılıkları hesaplanamıyor. Daha küçük bir değer girin.'
    case REASON_UNIT:
      return 'Seçilen birim tanınmıyor. Listeden bir birim seçin.'
    default:
      return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
}

// --- Bulgu → cümle ---

export function commentary(r) {
  if (!r.ok) return []
  const out = []
  const sig = r.sig

  out.push({
    level: 'ok',
    text: `Dönüşüm tanım gereği tam: 1 inch = 25.4 mm ve 1 mil = 0.0254 mm. Girilen uzunluk ${fmt(r.all.mm, sig)} mm = ${fmt(r.all.mil, sig)} mil.`,
  })

  // Yuvarlatılmış 39.3701 kuralı seçilen hassasiyette görünür mü?
  const exactStr = fmt(r.rounding.exact, sig)
  const roundedStr = fmt(r.rounding.rounded, sig)
  if (exactStr === roundedStr) {
    out.push({
      level: 'ok',
      text: `Yuvarlatılmış 39.3701 kuralı bu uzunlukta ${sig} anlamlı basamakta aynı sayıyı veriyor (${roundedStr} mil), yani fark gösterimde görünmüyor. Hesap yine de tam değer 1/0.0254 ile yapıldı.`,
    })
  } else {
    out.push({
      level: 'warn',
      text: `Yuvarlatılmış 39.3701 kuralı ${roundedStr} mil verirdi; tam değerle sonuç ${exactStr} mil. Fark ${fmt(r.rounding.diff, 3)} mil ve seçtiğiniz hassasiyette görünür hale geliyor. Bu ekran tam değeri kullanır.`,
    })
  }

  out.push({
    level: 'ok',
    text: `Yuvarlatılmış kuralın bağıl sapması uzunluktan bağımsızdır: milyonda ${fmt(r.rounding.relPct * 1e4, 3)} (her zaman büyük tarafa). Kısa yollarda önemsiz, uzun panel ölçülerinde toplanır.`,
  })

  // Ölçek yorumu — hangi birimin okunabilir olduğunu söyler
  if (r.all.mil < 1) {
    out.push({
      level: 'ok',
      text: `Uzunluk 1 mil'in (25.4 µm) altında. Bu ölçekte üretim verileri genelde mikrometre ile verilir: ${fmt(r.all.um, sig)} µm.`,
    })
  } else if (r.all.inch >= 1) {
    out.push({
      level: 'ok',
      text: `Uzunluk 1 inch'ten büyük; mekanik çizimlerde ${fmt(r.all.mm, sig)} mm, veri sayfalarında ${fmt(r.all.inch, sig)} inch olarak yazılır.`,
    })
  } else {
    out.push({
      level: 'ok',
      text: `Uzunluk yol genişliği ve aralık ölçeğinde. Kart üreticisine mm, bileşen veri sayfasına mil ile bakmak gerekir: ${fmt(r.all.mm, sig)} mm = ${fmt(r.all.mil, sig)} mil.`,
    })
  }

  if (r.nearest >= 0) {
    const near = r.common[r.nearest]
    out.push({
      level: 'ok',
      text: `Sık kullanılan ölçüler arasında en yakını ${near.mil} mil (${fmt(near.mm, 4)} mm). Kartı üretime verirken üreticinin en küçük yol/aralık sınırını da kontrol edin.`,
    })
  }

  if (r.sameUnit) {
    out.push({
      level: 'warn',
      text: 'Kaynak ve hedef birim aynı seçili; ana sonuç girilen değeri tekrarlıyor. Karşılaştırma için hedef birimi değiştirin, tablo yine tüm birimleri gösterir.',
    })
  }

  return out
}
