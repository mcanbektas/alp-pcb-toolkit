// Sıcaklık dönüştürücü ekranının kullanıcıya görünen metinleri.
// model.js'ten yalnızca kod sabitleri alınır; hesap burada yapılmaz.

import { fmt } from '../../../lib/num'
import {
  MODE_ABS, MODE_DELTA,
  SWEEP_F, SWEEP_K,
  REASON_ABSOLUTE_ZERO, REASON_UNIT,
  UNIT_C, UNIT_F, UNIT_K,
  ABS_ZERO_C, ABS_ZERO_F,
} from './model'

// Sıcaklık dört anlamlı basamakta okunaksız kalır (298.2 K gibi);
// ekranın tamamında altı basamak kullanılır.
const SIG = 6

export const MODE_LABEL = {
  [MODE_ABS]: 'Mutlak sıcaklık',
  [MODE_DELTA]: 'Sıcaklık farkı (ΔT)',
}

export const SCALE_LABEL = {
  [UNIT_C]: 'Santigrat (°C)',
  [UNIT_F]: 'Fahrenheit (°F)',
  [UNIT_K]: 'Kelvin (K)',
}

export const DELTA_SCALE_LABEL = {
  [UNIT_C]: 'ΔT — santigrat derece (°C)',
  [UNIT_F]: 'ΔT — Fahrenheit derece (°F)',
  [UNIT_K]: 'ΔT — kelvin (K)',
}

export const REF_POINT_LABEL = {
  absZero: 'Mutlak sıfır',
  waterFreeze: 'Suyun donma noktası (1 atm)',
  copperRef: 'Bakır özdirenci referansı (ρ₂₀)',
  roomRef: 'Veri sayfası oda sıcaklığı',
  waterBoil: 'Suyun kaynama noktası (1 atm)',
}

export const SWEEP_LABEL = {
  [SWEEP_F]: 'Fahrenheit ekseni',
  [SWEEP_K]: 'Kelvin ekseni',
}

// Grafik etiketleri moda ve seçilen taramaya göre değişir.
export const CHART = {
  x: (mode) => (mode === MODE_DELTA
    ? 'Sıcaklık farkı ΔT_C (°C — kelvin farkıyla aynı)'
    : 'Santigrat sıcaklık T_C (°C)'),

  y: (mode, param) => {
    if (mode === MODE_DELTA) {
      return param === SWEEP_K ? 'Sıcaklık farkı ΔT_K (K)' : 'Sıcaklık farkı ΔT_F (°F)'
    }
    return param === SWEEP_K ? 'Kelvin sıcaklık T_K (K)' : 'Fahrenheit sıcaklık T_F (°F)'
  },

  caption: (mode, param) => {
    if (mode === MODE_DELTA) {
      return param === SWEEP_K
        ? 'Fark büyüklüğünde santigrat derece ile kelvin özdeştir: doğru başlangıç noktasından geçer ve eğimi 1\'dir. Mutlak sıcaklıktaki 273.15 ofseti burada yoktur.'
        : 'Fark büyüklüğünde yalnızca eğim kalır: ΔT_F = (9/5)·ΔT_C. Doğru başlangıç noktasından geçer — mutlak dönüşümdeki 32 ofseti burada kullanılmaz.'
    }
    return param === SWEEP_K
      ? 'Kelvin ölçeği santigradın 273.15 kaydırılmış hâlidir; eğim aynı olduğu için doğru 45°\'dir. Yatay çizgi mutlak sıfırı, yani ölçeğin fiziksel tabanını gösterir.'
      : 'Fahrenheit doğrusunun hem eğimi (9/5) hem ofseti (32) farklıdır; iki ölçek yalnızca −40 noktasında kesişir. Yatay çizgi mutlak sıfıra karşılık gelir.'
  },
}

export const REF_LABEL = {
  absZero: (y, unit) => `mutlak sıfır ${fmt(y, SIG)} ${unit}`,
}

export function reasonText(reason) {
  switch (reason) {
    case REASON_ABSOLUTE_ZERO:
      return `Girilen sıcaklık mutlak sıfırın altında. Fiziksel alt sınır T_K = 0, yani ${fmt(ABS_ZERO_C, SIG)} °C ve ${fmt(ABS_ZERO_F, SIG)} °F; bu değerin altı hesaplanmaz.`
    case REASON_UNIT:
      return 'Seçilen sıcaklık birimi tanınmadı. Santigrat (°C), Fahrenheit (°F) veya kelvin (K) seçin.'
    default:
      return 'Sıcaklık alanına sayısal bir değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25); negatif değerler ve sıfır geçerlidir.'
  }
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  if (r.mode === MODE_DELTA) {
    const d = r.delta
    out.push({
      level: 'ok',
      text: `${fmt(r.input, SIG)} ${r.unit} büyüklüğünde bir sıcaklık farkı, ${fmt(d.dC, SIG)} °C = ${fmt(d.dK, SIG)} K = ${fmt(d.dF, SIG)} °F farkına karşılık gelir.`,
    })

    out.push({
      level: 'ok',
      text: 'Fark büyüklüğünde santigrat derece ile kelvin aynı adımdır; ölçekler arasındaki 273.15 kayması farkta yok olur. Bu yüzden termal direnç birimi °C/W ile K/W birbirinin yerine kullanılabilir.',
    })

    out.push({
      level: 'warn',
      text: '32 ofseti farkta uygulanmaz: 10 °C\'lik bir ısınma 50 °F değil, 18 °F\'dir. Mutlak sıcaklık dönüşümünü bu modun sonucuyla karıştırmayın.',
    })

    if (d.dC < 0) {
      out.push({
        level: 'warn',
        text: 'Fark negatif girildi; bu bir soğuma adımıdır. Fark büyüklüğüne mutlak sıfır sınırı uygulanmaz, ancak ortam sıcaklığıyla toplandığında sınır yeniden geçerlidir.',
      })
    }

    if (r.final) {
      out.push({
        level: 'ok',
        text: `Ortam ${fmt(r.final.ambient.C, SIG)} °C alındığında, bu artışla ulaşılan mutlak sıcaklık ${fmt(r.final.C, SIG)} °C = ${fmt(r.final.F, SIG)} °F = ${fmt(r.final.K, SIG)} K olur.`,
      })
      out.push({
        level: 'warn',
        text: 'Ortam ile artışın toplamı yalnızca aritmetiktir. Artışın gerçekte ne kadar olacağı akıma, bakır kesitine ve ısı yoluna bağlıdır; bu ekran onu hesaplamaz.',
      })
    } else {
      out.push({
        level: 'warn',
        text: 'Ortam sıcaklığı boş bırakıldı; yalnızca farkın ölçek karşılığı verildi. Mutlak sonucu görmek için ortam sıcaklığını girin.',
      })
    }

    return out
  }

  const t = r.temp
  out.push({
    level: 'ok',
    text: `${fmt(r.input, SIG)} ${r.unit} girişi, ${fmt(t.C, SIG)} °C = ${fmt(t.F, SIG)} °F = ${fmt(t.K, SIG)} K değerine karşılık gelir.`,
  })

  out.push({
    level: 'ok',
    text: `Mutlak sıfıra kalan pay ${fmt(t.marginK, SIG)} K. Kelvin ölçeğinin sıfırı fiziksel bir tabandır; santigrat ve Fahrenheit sıfırları ise yalnızca tanım noktasıdır.`,
  })

  if (t.atAbsoluteZero) {
    out.push({
      level: 'warn',
      text: 'Giriş tam mutlak sıfırda. Bu, ölçeğin alt sınırıdır; altındaki hiçbir değer fiziksel değildir.',
    })
  }

  out.push({
    level: 'ok',
    text: 'Santigrat ile Fahrenheit yalnızca −40 noktasında kesişir; başka hiçbir sıcaklıkta iki ölçeğin sayısı eşit olmaz.',
  })

  out.push({
    level: 'warn',
    text: 'Bu sonuç mutlak sıcaklıktır. Bir ısınma miktarını (ΔT) çevirmek istiyorsanız ΔT moduna geçin: farkta 32 ofseti kullanılmaz ve °C ile K özdeştir.',
  })

  return out
}
