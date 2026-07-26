// Termal via dizisi ekranının kullanıcıya görünen metinleri.

import { fmt, fmtEng, fmtPow } from '../../../lib/num'

export const CHART = {
  x: 'Via sayısı', y: 'Dizi termal direnci (°C/W)',
  caption: 'Termal direnç via sayısıyla 1/n azalır. Eğri ilk birkaç viadan sonra düzleşir — ondan sonrasında kazanç barrel direncinde değil, bakır yayılımı ve ortam direncindedir.',
}

export function reasonText() {
  return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  out.push({
    level: 'ok',
    text: `Tek via barrel termal direnci ${fmt(r.Rsingle, 4)} °C/W; ${r.N} viayla dizi direnci ${fmt(r.Rarray, 4)} °C/W.`,
  })

  out.push({
    level: 'ok',
    text: `${r.N} via, tek viaya göre ${fmt(r.improvementVsOne, 3)} kat iyileşme sağlıyor — bu oran doğrudan via sayısıdır.`,
  })

  if (r.filled) {
    out.push({
      level: 'ok',
      text: `Bakır dolgu kesiti ${fmtEng(r.fillArea, 'm²', 3)} artırıyor; toplam iletken kesit ${fmtEng(r.area, 'm²', 3)}.`,
    })
  } else {
    out.push({
      level: 'warn',
      text: 'Via dolgusuz kabul edildi; yalnızca barrel duvarı iletiyor. Bakır dolgulu via kesiti belirgin biçimde artırır ama maliyeti yükseltir.',
    })
  }

  if (r.mode === 'syn') {
    out.push({
      level: 'ok',
      text: `${fmtPow(r.targetQ, 3)} ısıyı ${fmt(r.deltaT, 3)} °C fark altında taşımak için gereken direnç ${fmt(r.Rneeded, 4)} °C/W; ${r.N} via bunu ${fmt(r.Rarray, 4)} °C/W ile karşılıyor.`,
    })
    out.push({
      level: 'ok',
      text: `Bu diziyle taşınabilen ısı ${fmtPow(r.actualQ, 4)} — hedefin ${fmt((r.actualQ / r.targetQ) * 100, 3)} %'i.`,
    })
  } else if (r.actualQ != null) {
    out.push({
      level: 'ok',
      text: `${fmt(r.deltaT, 3)} °C fark altında bu dizi ${fmtPow(r.actualQ, 4)} ısı taşır.`,
    })
  }

  // Azalan getiri: bir sonraki via ne kadar kazandırıyor
  const gain = r.Rsingle / r.N - r.Rsingle / (r.N + 1)
  const gainPct = (100 * gain) / r.Rarray
  out.push({
    level: gainPct < 5 ? 'warn' : 'ok',
    text: gainPct < 5
      ? `Bir via daha eklemek diziyi yalnızca %${fmt(gainPct, 3)} iyileştiriyor. Bu noktadan sonra kazanç via eklemekte değil, bakır yayılım alanını büyütmekte.`
      : `Bir via daha eklemek diziyi %${fmt(gainPct, 3)} iyileştirir.`,
  })

  out.push({
    level: 'danger',
    text: 'Bu değer sistemin toplam termal direnci DEĞİLDİR. Gerçek yol üst bakır yayılımı + vialar + alt bakır yayılımı + ortam direncidir; junction sıcaklığı yalnızca bu hesapla belirlenemez.',
  })

  out.push({
    level: 'warn',
    text: 'Via dizisi pad altındaysa lehim akışı ve boşluk oluşumu ayrıca değerlendirilmelidir; dolgusuz via-in-pad lehimi içine çeker.',
  })

  return out
}
