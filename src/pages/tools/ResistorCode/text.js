// Direnç ve SMD kod çözücü ekranının kullanıcıya görünen metinleri.

import { fmt, fmtRes, fmtPct } from '../../../lib/num'
import { REASON_INCOMPLETE, REASON_SYNTHESIS_COLOR_ONLY, KIND_COLOR, KIND_SMD, KIND_CAP } from './model'

export const KIND_LABEL = {
  [KIND_COLOR]: 'Renk bandı',
  [KIND_SMD]: 'SMD direnç',
  [KIND_CAP]: 'Kondansatör',
}

export const ROLE_LABEL = {
  digit: (i) => `${i + 1}. rakam`,
  multiplier: () => 'Çarpan',
  tolerance: () => 'Tolerans',
  tcr: () => 'Sıcaklık katsayısı',
}

export const SMD_KIND_LABEL = {
  '3-digit': '3 haneli kod',
  '4-digit': '4 haneli kod',
  'r-notation': 'R işaretli kod',
  eia96: 'EIA-96 kodu',
  zero: 'Sıfır ohm jumper',
}

export const CHART_CAPTION =
  'Direnç sıcaklıkla doğrusal olarak kayar; eğim sıcaklık katsayısıdır. ' +
  'Yatay çizgiler oda sıcaklığındaki tolerans sınırlarıdır — eğri bunların dışına ' +
  'çıkıyorsa sıcaklık kayması tek başına toleransı aşıyor demektir.'

export function reasonText(reason, message) {
  if (reason === REASON_SYNTHESIS_COLOR_ONLY) {
    return 'Değerden koda çevirme yalnızca renk bandı için yapılır. SMD ve kondansatör kodları üreticiye göre değişir; ters çevirmek tek bir doğru sonuç vermez.'
  }
  if (reason === REASON_INCOMPLETE) {
    return 'Tüm zorunlu alanlara geçerli değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
  // Motorun ürettiği ayrıntılı mesaj (hangi bant, hangi harf) doğrudan gösterilir
  return message ?? 'Girilen kod çözülemedi.'
}

// Mühendislik yorumu — bu ekranda bulgular doğrudan burada üretilir,
// çünkü hepsi tek bir çözülmüş değere bakar.
export function commentary(r) {
  if (!r.ok) return []
  const out = []

  if (r.kind === KIND_CAP) {
    out.push({
      level: 'ok',
      text: `Kod ${fmt(r.pF, 4)} pF = ${fmt(r.nF, 4)} nF = ${fmt(r.uF, 4)} µF değerini gösteriyor.`,
    })
    if (r.tolerance != null) {
      out.push({
        level: 'ok',
        text: `Tolerans harfi ${r.toleranceLetter} → ±${fmt(r.tolerance, 3)} %; gerçek değer ${fmt(r.min, 4)} … ${fmt(r.max, 4)} pF arasında.`,
      })
    } else if (r.toleranceNote) {
      out.push({ level: 'warn', text: `Tolerans harfi ${r.toleranceLetter}: ${r.toleranceNote}` })
    } else {
      out.push({ level: 'warn', text: 'Kodda tolerans harfi yok; gerçek sapma üretici verisinden okunmalı.' })
    }
    out.push({
      level: 'warn',
      text: 'Sınıf II seramiklerde (X7R, Y5V) kapasite uygulanan gerilim ve sıcaklıkla belirgin biçimde düşer. Kod bu düşüşü göstermez.',
    })
    return out
  }

  if (r.zero) {
    out.push({ level: 'ok', text: 'Sıfır ohm jumper — direnç değil, atlama teli olarak kullanılır.' })
    out.push({
      level: 'warn',
      text: 'Gerçek direnci sıfır değildir (tipik olarak 10–50 mΩ) ve akım taşıma sınırı vardır; güç dağıtımında yol gibi değerlendirin.',
    })
    return out
  }

  out.push({ level: 'ok', text: `Çözülen değer ${fmtRes(r.ohms, 4)}.` })

  if (r.tolerance != null) {
    out.push({
      level: 'ok',
      text: `Tolerans ±${fmt(r.tolerance, 3)} % → gerçek değer ${fmtRes(r.min, 4)} … ${fmtRes(r.max, 4)} arasında.`,
    })
  }

  if (r.nearestE24) {
    const exact = Math.abs(r.nearestE24.errorPct) < 1e-9
    out.push({
      level: 'ok',
      text: exact
        ? 'Değer E24 serisinde birebir var — yaygın bulunur.'
        : `E24'te en yakın değer ${fmtRes(r.nearestE24.value, 4)} (${fmtPct(r.nearestE24.errorPct)}); E96'da ${fmtRes(r.nearestE96.value, 4)} (${fmtPct(r.nearestE96.errorPct)}).`,
    })
  }

  if (r.tcr != null) {
    const drift = Math.abs(r.driftPct)
    const overTolerance = r.tolerance != null && drift > r.tolerance
    out.push({
      level: overTolerance ? 'danger' : drift > 0.5 ? 'warn' : 'ok',
      text: overTolerance
        ? `${fmt(r.temps.Tref, 3)} °C'de sıcaklık kayması ${fmtPct(r.driftPct)} — tek başına ±${fmt(r.tolerance, 3)} % toleransı aşıyor. Toplam hata iki etkinin birleşimidir.`
        : `${fmt(r.temps.Tref, 3)} °C'de sıcaklık kayması ${fmtPct(r.driftPct)} → ${fmtRes(r.atTref, 4)}.`,
    })
  } else if (r.kind === KIND_COLOR && r.bandCount < 6) {
    out.push({
      level: 'warn',
      text: 'Sıcaklık katsayısı bantlarda yok. Geniş sıcaklık aralığında çalışacaksa üretici verisinden TCR okunmalı.',
    })
  }

  if (r.kind === KIND_SMD && r.aliasUsed) {
    out.push({
      level: 'warn',
      text: 'Çarpan harfi standart EIA-96 tablosunda yok, üretici alias\'ı olarak yorumlandı. Üretici dokümanıyla doğrulayın.',
    })
  }

  if (r.mode === 'syn' && r.exact === false) {
    out.push({
      level: 'warn',
      text: `Renk bantları yalnızca kuantalanmış değerleri gösterebilir. İstenen ${fmtRes(r.requested, 4)} yerine en yakın gösterilebilir değer ${fmtRes(r.ohms, 4)}.`,
    })
  }

  return out
}
