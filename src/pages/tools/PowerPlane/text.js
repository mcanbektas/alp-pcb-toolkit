// Güç düzlemi ve paralel yol ekranının kullanıcıya görünen metinleri.

import { fmt, fmtEng, fmtOhm, fmtRes, fmtAmp, fmtVolt, fmtPow, fmtPct } from '../../../lib/num'
import { TOOL_PLANE, TOOL_PARALLEL, REASON_NECK, REASON_ROWS } from './model'

export const TOOL_LABEL = {
  [TOOL_PLANE]: 'Güç düzlemi',
  [TOOL_PARALLEL]: 'Paralel yollar',
}

export const CHART = {
  [TOOL_PLANE]: {
    x: 'Genişlik (mm)', y: 'Direnç (Ω)',
    caption: 'Aynı uzunlukta direnç genişlikle ters orantılıdır. Çalışma noktası boyun genişliğidir; referans çizgi ortalama genişliğin direncidir. İkisi arasındaki fark darboğazın maliyetidir.',
  },
  [TOOL_PARALLEL]: {
    x: 'Kol sayısı', y: 'Eşdeğer direnç (Ω)',
    caption: 'Aynı geometrideki kol sayısı arttıkça eşdeğer direnç 1/n ile düşer. Elektriksel kazanç böyle ölçeklenir; akım kapasitesi ise ısıl etkileşim yüzünden aynı oranda artmaz.',
  },
}

export function reasonText(reason, r) {
  switch (reason) {
    case REASON_NECK:
      return 'Minimum boyun genişliği ortalama düzlem genişliğinden büyük olamaz. Değerleri kontrol edin.'
    case REASON_ROWS:
      return `Yol listesinde eksik veya geçersiz alan var: ${r?.invalid?.join(', ')}.`
    default:
      return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  if (r.tool === TOOL_PLANE) {
    out.push({
      level: 'ok',
      text: `Kare direnci ${fmtOhm(r.Rsheet)}/□. Düzlem ${fmt(r.average.squares, 3)} kare (ortalama genişlikte) ya da ${fmt(r.neck.squares, 3)} kare (boyunda) olarak görülüyor.`,
    })

    out.push({
      level: r.neckFactor > 4 ? 'danger' : r.neckFactor > 2 ? 'warn' : 'ok',
      text: r.neckFactor > 2
        ? `Boyun bölgesi direnci ortalama geometrinin ${fmt(r.neckFactor, 3)} katı. Gerilim düşümünün büyük kısmı bu darboğazda oluşuyor; boynu genişletmek düzlemin geri kalanını genişletmekten çok daha etkili.`
        : `Boyun bölgesi direnci ortalamanın ${fmt(r.neckFactor, 3)} katı — geometri makul ölçüde düzgün.`,
    })

    const pct = r.neck.pct
    if (pct != null) {
      out.push({
        level: pct > 5 ? 'danger' : pct > 2 ? 'warn' : 'ok',
        text: `Boyun bölgesindeki gerilim düşümü ${fmtVolt(r.neck.Vdrop)} — beslemenin %${fmt(pct, 3)}'i.`,
      })
    } else {
      out.push({
        level: 'ok',
        text: `Boyun bölgesindeki gerilim düşümü ${fmtVolt(r.neck.Vdrop)}, güç kaybı ${fmtPow(r.neck.Ploss, 3)}.`,
      })
    }

    out.push({
      level: r.neckUtil > 1 ? 'danger' : r.neckUtil > 0.8 ? 'warn' : 'ok',
      text: r.neckUtil > 0.8
        ? `Boyun, ampirik ısınma denklemine göre ${fmtAmp(r.neckCapacity, 3)} taşıyabilir; ${fmtAmp(r.I, 3)} bunun %${fmt(r.neckUtil * 100, 3)}'i. Darboğaz geniş bir düzlemde bile tek bir yol gibi ısınır.`
        : `Boyun bölgesinin akım kapasitesi ${fmtAmp(r.neckCapacity, 3)}; kullanım %${fmt(r.neckUtil * 100, 3)}.`,
    })

    out.push({
      level: 'warn',
      text: 'Bu model akımın düzgün genişlik boyunca aktığını varsayar. Gerçek poligonda pad girişleri, via kümeleri ve kesikler akımı yoğunlaştırır; iki sonuç alt ve üst sınır olarak okunmalıdır.',
    })
    return out
  }

  // Paralel yollar
  out.push({
    level: 'ok',
    text: `${r.branches.length} kolun eşdeğer direnci ${fmtOhm(r.Req)}; toplam gerilim düşümü ${fmtVolt(r.Vdrop)}, güç kaybı ${fmtPow(r.Ploss, 3)}.`,
  })

  out.push({
    level: r.imbalance > 0.1 ? 'warn' : 'ok',
    text: r.imbalance > 0.1
      ? `Akım payları eşit değil: en yüksek ve en düşük pay arasında ${fmt(r.imbalance * 100, 3)} puan fark var. Farklı uzunluk veya genişlikteki kollar akımı eşit paylaşmaz; en kısa ve en geniş kol en çok yüklenir.`
      : 'Kollar akımı neredeyse eşit paylaşıyor; geometriler birbirine yakın.',
  })

  out.push({
    level: r.worst.util > 1 ? 'danger' : r.worst.util > 0.8 ? 'warn' : 'ok',
    text: r.worst.util > 0.8
      ? `En yüklü kol kapasitesinin %${fmt(r.worst.util * 100, 3)}'ini kullanıyor (${fmtAmp(r.worst.I, 3)} / ${fmtAmp(r.worst.capacity, 3)}). Kolları eşitleyin veya en dar kolu genişletin.`
      : `En yüklü kol kapasitesinin %${fmt(r.worst.util * 100, 3)}'ini kullanıyor.`,
  })

  out.push({
    level: 'ok',
    text: `Aynı direnci tek yolla elde etmek için ${fmtEng(r.equivalentW, 'm', 3)} genişlik gerekirdi; kollara bölünen toplam genişlik ${fmtEng(r.totalWidth, 'm', 3)}.`,
  })

  out.push({
    level: 'danger',
    text: 'Birbirine yakın paralel yolların akım kapasitesi, bağımsız yolların toplamı gibi değerlendirilmemelidir. Isıl etkileşim nedeniyle her kol komşusunu ısıtır; gerçek toplam kapasite tek tek kapasitelerin toplamından düşüktür.',
  })

  return out
}
