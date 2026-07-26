// Bakır kalınlığı dönüştürücü ekranının kullanıcıya görünen metinleri.

import { fmt, fmtEng, fmtOhm } from '../../../lib/num'
import { REASON_ETCH } from './model'

export const SOURCE_LABEL = {
  weight: 'Bakır ağırlığından',
  thickness: 'Kalınlıktan',
}

export const CHART = {
  x: 'Bakır ağırlığı (oz/ft²)', y: 'Kare direnci (Ω/□)',
  caption: 'Kare direnci kalınlıkla ters orantılıdır: bakırı iki katına çıkarmak direnci yarıya indirir. Eğri nominal tabloya (1 oz = 35 µm) göre çizilir.',
}

export function reasonText(reason) {
  if (reason === REASON_ETCH) {
    return 'Aşındırma oranı 0 ile 100 % arasında olmalı. %100 üst genişliğin sıfıra inmesi demektir.'
  }
  return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  if (r.nominal != null && r.derived != null) {
    const diffPct = (100 * (r.nominal - r.derived)) / r.derived
    out.push({
      level: 'ok',
      text: `Nominal tablo ${fmtEng(r.nominal, 'm', 4)} veriyor; bakır yoğunluğundan türetilen değer ${fmtEng(r.derived, 'm', 4)}. Aradaki %${fmt(diffPct, 3)} fark folyo tanımı, yuvarlama ve üretim sürecinden gelir.`,
    })
    out.push({
      level: 'warn',
      text: 'Hesaplarda nominal tablo değeri kullanıldı. Kritik bir kesit hesabı yapıyorsanız üreticinin kendi kalınlık toleransını sorun.',
    })
  }

  if (r.plating > 0) {
    out.push({
      level: 'ok',
      text: `Dış katmanda kaplama ${fmtEng(r.plating, 'm', 3)} ekliyor; bitmiş kalınlık ${fmtEng(r.finished, 'm', 4)} ve kaplamanın kesitteki payı %${fmt(r.platingShare * 100, 3)}.`,
    })
    if (r.platingShare > 0.4) {
      out.push({
        level: 'warn',
        text: 'Kesitin büyük kısmı kaplamadan geliyor. Kaplama kalınlığı folyodan daha değişkendir; gerçek kesit tahmin edilenden belirgin biçimde sapabilir.',
      })
    }
  } else if (r.layer === 'internal') {
    out.push({
      level: 'ok',
      text: 'İç katmanda delik kaplaması yüzeye bakır eklemez; bitmiş kalınlık folyo kalınlığına eşittir.',
    })
  }

  out.push({
    level: 'ok',
    text: `${fmtEng(r.W, 'm', 3)} genişliğinde dikdörtgen kesit ${fmtEng(r.rect.area, 'm²', 4)}; kare direnci ${fmtOhm(r.Rsheet)}/□ @ ${fmt(r.T, 3)} °C.`,
  })

  if (r.etch > 0) {
    out.push({
      level: r.trap.lossPct > 15 ? 'warn' : 'ok',
      text: `Aşındırma üst genişliği ${fmtEng(r.trap.Wtop, 'm', 3)}'e indiriyor; gerçek kesit dikdörtgen varsayımından %${fmt(r.trap.lossPct, 3)} küçük. Dikdörtgen varsayımı her zaman iyimserdir.`,
    })
  } else {
    out.push({
      level: 'warn',
      text: 'Aşındırma oranı sıfır girildi, yani kesit dikdörtgen kabul edildi. Dar RF hatlarında ve ince geometrilerde gerçek kesit trapezdir ve bu varsayımdan küçüktür.',
    })
  }

  return out
}
