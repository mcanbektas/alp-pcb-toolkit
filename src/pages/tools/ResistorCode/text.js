// Direnç ve SMD kod çözücü ekranının kullanıcıya görünen metinleri.
// Motor (lib/codes.js) yalnızca kod ve sayısal/simgesel alan döndürür; cümleyi
// bu dosya kurar. İkinci dil gerekirse değişecek tek dosya budur.

import { fmt, fmtRes, fmtPct } from '../../../lib/num'
import { REASON_INCOMPLETE, REASON_SYNTHESIS_COLOR_ONLY, KIND_COLOR, KIND_SMD, KIND_CAP } from './model'
import {
  TOLERANCE_COLORS, TCR_COLORS, EIA96_MULTIPLIERS,
  CAP_TOLERANCE_LETTERS, CAP_TOLERANCE_ASYMMETRIC,
  CODE_ERR_BANDS, CODE_ERR_COLOR, CODE_ERR_DIGIT, CODE_ERR_FORMAT, CODE_ERR_RANGE,
  BAND_ROLE_DIGIT, BAND_ROLE_MULTIPLIER, BAND_ROLE_TOLERANCE, BAND_ROLE_TCR,
  CODE_VARIANT_NOT_TEXT, CODE_VARIANT_EMPTY, CODE_VARIANT_R_NOTATION,
  CODE_VARIANT_SMD_SHAPE, CODE_VARIANT_EIA96_INDEX, CODE_VARIANT_EIA96_LETTER,
  CODE_VARIANT_CAP_SHAPE, CODE_VARIANT_CAP_LETTER,
  CODE_VARIANT_POSITIVE, CODE_VARIANT_MULTIPLIER, CODE_VARIANT_TOLERANCE, CODE_VARIANT_TCR,
} from '../../../lib/codes'

// Bant renklerinin Türkçe adları. Motor yalnızca anahtarı bilir.
export const COLOR_NAME = {
  black: 'Siyah',
  brown: 'Kahverengi',
  red: 'Kırmızı',
  orange: 'Turuncu',
  yellow: 'Sarı',
  green: 'Yeşil',
  blue: 'Mavi',
  violet: 'Mor',
  grey: 'Gri',
  white: 'Beyaz',
  gold: 'Altın',
  silver: 'Gümüş',
}

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

// Bant rolünün cümledeki iki karşılığı: bandın adı ve taşıması gereken büyüklük.
const BAND_ROLE_TEXT = {
  [BAND_ROLE_DIGIT]: { band: 'rakam', carries: 'rakam' },
  [BAND_ROLE_MULTIPLIER]: { band: 'çarpan', carries: 'çarpan' },
  [BAND_ROLE_TOLERANCE]: { band: 'tolerans', carries: 'tolerans' },
  [BAND_ROLE_TCR]: { band: 'sıcaklık katsayısı', carries: 'TCR' },
}

const numberList = (values) => values.map((v) => fmt(v, 3)).join(', ')

// Motorun hata kodunu ve kodu tamamlayan alanları cümleye çevirir.
// Karşılığı olmayan kod için null döner; çağıran genel cümleye düşer.
function codeErrorText(code, detail) {
  const d = detail ?? {}

  switch (code) {
    case CODE_ERR_BANDS:
      return 'Bant sayısı 4, 5 veya 6 olmalı.'

    case CODE_ERR_COLOR:
      return d.band ? `Bant ${d.band}: bilinmeyen renk.` : null

    case CODE_ERR_DIGIT: {
      const role = BAND_ROLE_TEXT[d.role]
      const name = COLOR_NAME[d.color]
      if (!role || !name) return null
      return `Bant ${d.band} ${role.band} bandı — ${name} ${role.carries} taşımaz.`
    }

    case CODE_ERR_RANGE:
      switch (d.variant) {
        case CODE_VARIANT_POSITIVE:
          return 'Direnç pozitif olmalı.'
        case CODE_VARIANT_MULTIPLIER:
          return `${fmtRes(d.ohms, 4)} renk bandı çarpan aralığının (×0.01 … ×10⁹) dışında.`
        case CODE_VARIANT_TOLERANCE:
          return `%${fmt(d.tolerance, 3)} toleransın renk karşılığı yok. Geçerli: ${numberList(TOLERANCE_COLORS.map((c) => c.tolerance))}.`
        case CODE_VARIANT_TCR:
          return `${fmt(d.tcr, 3)} ppm/°C sıcaklık katsayısının renk karşılığı yok. Geçerli: ${numberList(TCR_COLORS.map((c) => c.tcr))}.`
        case CODE_VARIANT_EIA96_INDEX:
          return `EIA-96 kod numarası 01–96 aralığında olmalı, "${d.index}" geçersiz.`
        default:
          return null
      }

    case CODE_ERR_FORMAT:
      switch (d.variant) {
        case CODE_VARIANT_NOT_TEXT:
          return 'Kod metin olmalı.'
        case CODE_VARIANT_EMPTY:
          return 'Kod boş.'
        case CODE_VARIANT_R_NOTATION:
          return 'R işaretli kod okunamadı.'
        case CODE_VARIANT_EIA96_LETTER:
          return `"${d.letter}" standart EIA-96 çarpan harfi değil. Geçerli: ${Object.keys(EIA96_MULTIPLIERS.standard).join(', ')}. Üretici alias'ı için üretici profilini seçin.`
        case CODE_VARIANT_SMD_SHAPE:
          return `"${d.code}" tanınmadı. Desteklenen biçimler: 3 hane (472), 4 hane (4701), R işareti (4R7), EIA-96 (01A), sıfır ohm (0, 00, 000, 0000).`
        case CODE_VARIANT_CAP_SHAPE:
          return `"${d.code}" tanınmadı. Beklenen biçim: üç rakam ve opsiyonel tolerans harfi (örn. 104, 104K).`
        case CODE_VARIANT_CAP_LETTER:
          return `"${d.letter}" bilinen bir tolerans harfi değil. Geçerli: ${Object.keys(CAP_TOLERANCE_LETTERS).join(', ')}.`
        default:
          return null
      }

    default:
      return null
  }
}

export function reasonText(reason, detail) {
  if (reason === REASON_SYNTHESIS_COLOR_ONLY) {
    return 'Değerden koda çevirme yalnızca renk bandı için yapılır. SMD ve kondansatör kodları üreticiye göre değişir; ters çevirmek tek bir doğru sonuç vermez.'
  }
  if (reason === REASON_INCOMPLETE) {
    return 'Tüm zorunlu alanlara geçerli değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
  // Motorun kodu + kodu tamamlayan alanlar (hangi bant, hangi harf) burada cümleye döner
  return codeErrorText(reason, detail) ?? 'Girilen kod çözülemedi.'
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
    const asym = CAP_TOLERANCE_ASYMMETRIC[r.toleranceLetter]
    if (r.tolerance != null) {
      out.push({
        level: 'ok',
        text: `Tolerans harfi ${r.toleranceLetter} → ±${fmt(r.tolerance, 3)} %; gerçek değer ${fmt(r.min, 4)} … ${fmt(r.max, 4)} pF arasında.`,
      })
    } else if (asym) {
      out.push({
        level: 'warn',
        text: `Tolerans harfi ${r.toleranceLetter}: +${fmt(asym.plus, 3)} % / −${fmt(asym.minus, 3)} % — asimetrik, tek sayıyla ifade edilmez.`,
      })
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
