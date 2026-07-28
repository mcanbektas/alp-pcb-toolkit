// Direnç ve SMD kod çözücü ekranının kullanıcıya görünen metinleri —
// iki dilli (tr/en).
//
// Motor (lib/codes.js) yalnızca kod ve sayısal/simgesel alan döndürür; cümleyi
// bu dosya kurar. Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini
// kullanır; koşullu metin üreten yerler (yorum, hata nedeni) fonksiyon olarak
// döner ki mantık tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtRes, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  REASON_INCOMPLETE, REASON_SYNTHESIS_COLOR_ONLY,
  KIND_COLOR, KIND_SMD, KIND_CAP, MODE_SYNTHESIS,
} from './model'
import {
  TOLERANCE_COLORS, TCR_COLORS, EIA96_MULTIPLIERS,
  CAP_TOLERANCE_LETTERS,
  CODE_ERR_BANDS, CODE_ERR_COLOR, CODE_ERR_DIGIT, CODE_ERR_FORMAT, CODE_ERR_RANGE,
  BAND_ROLE_DIGIT, BAND_ROLE_MULTIPLIER, BAND_ROLE_TOLERANCE, BAND_ROLE_TCR,
  CODE_VARIANT_NOT_TEXT, CODE_VARIANT_EMPTY, CODE_VARIANT_R_NOTATION,
  CODE_VARIANT_SMD_SHAPE, CODE_VARIANT_EIA96_INDEX, CODE_VARIANT_EIA96_LETTER,
  CODE_VARIANT_CAP_SHAPE, CODE_VARIANT_CAP_LETTER,
  CODE_VARIANT_POSITIVE, CODE_VARIANT_MULTIPLIER, CODE_VARIANT_TOLERANCE, CODE_VARIANT_TCR,
} from '../../../lib/codes'

const numberList = (values) => values.map((v) => fmt(v, 3)).join(', ')

// İngilizce sıra sayıları; rakam bandı en çok üç tanedir, dördüncüsü emniyet payı.
const ORDINAL_EN = ['1st', '2nd', '3rd', '4th']

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Yüzde işaretinin yeri dile göre değişir: Türkçe "%5", İngilizce "5%".
  // Sayının kendisini yine fmt() üretir; burada yalnızca işaret yerleşir.
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)
  // Bant renklerinin adları. Motor yalnızca anahtarı bilir.
  const colorName = {
    black: t({ tr: 'Siyah', en: 'Black' }),
    brown: t({ tr: 'Kahverengi', en: 'Brown' }),
    red: t({ tr: 'Kırmızı', en: 'Red' }),
    orange: t({ tr: 'Turuncu', en: 'Orange' }),
    yellow: t({ tr: 'Sarı', en: 'Yellow' }),
    green: t({ tr: 'Yeşil', en: 'Green' }),
    blue: t({ tr: 'Mavi', en: 'Blue' }),
    violet: t({ tr: 'Mor', en: 'Violet' }),
    grey: t({ tr: 'Gri', en: 'Grey' }),
    white: t({ tr: 'Beyaz', en: 'White' }),
    gold: t({ tr: 'Altın', en: 'Gold' }),
    silver: t({ tr: 'Gümüş', en: 'Silver' }),
  }

  // Bant rolünün cümledeki iki karşılığı: bandın adı ve taşıması gereken büyüklük.
  const bandRoleText = {
    [BAND_ROLE_DIGIT]: {
      band: t({ tr: 'rakam', en: 'digit' }),
      carries: t({ tr: 'rakam', en: 'digit' }),
    },
    [BAND_ROLE_MULTIPLIER]: {
      band: t({ tr: 'çarpan', en: 'multiplier' }),
      carries: t({ tr: 'çarpan', en: 'multiplier' }),
    },
    [BAND_ROLE_TOLERANCE]: {
      band: t({ tr: 'tolerans', en: 'tolerance' }),
      carries: t({ tr: 'tolerans', en: 'tolerance' }),
    },
    [BAND_ROLE_TCR]: {
      band: t({ tr: 'sıcaklık katsayısı', en: 'temperature coefficient' }),
      carries: t({ tr: 'TCR', en: 'TCR' }),
    },
  }

  // Motorun hata kodunu ve kodu tamamlayan alanları cümleye çevirir.
  // Karşılığı olmayan kod için null döner; çağıran genel cümleye düşer.
  function codeErrorText(code, detail) {
    const d = detail ?? {}

    switch (code) {
      case CODE_ERR_BANDS:
        return t({
          tr: 'Bant sayısı 4, 5 veya 6 olmalı.',
          en: 'The band count must be 4, 5 or 6.',
        })

      case CODE_ERR_COLOR:
        return d.band
          ? t({
            tr: `Bant ${d.band}: bilinmeyen renk.`,
            en: `Band ${d.band}: unknown colour.`,
          })
          : null

      case CODE_ERR_DIGIT: {
        const role = bandRoleText[d.role]
        const name = colorName[d.color]
        if (!role || !name) return null
        return t({
          tr: `Bant ${d.band} ${role.band} bandı — ${name} ${role.carries} taşımaz.`,
          en: `Band ${d.band} is the ${role.band} band — ${name} does not carry a ${role.carries}.`,
        })
      }

      case CODE_ERR_RANGE:
        switch (d.variant) {
          case CODE_VARIANT_POSITIVE:
            return t({
              tr: 'Direnç pozitif olmalı.',
              en: 'The resistance must be positive.',
            })
          case CODE_VARIANT_MULTIPLIER:
            return t({
              tr: `${fmtRes(d.ohms, 4)} renk bandı çarpan aralığının (×0.01 … ×10⁹) dışında.`,
              en: `${fmtRes(d.ohms, 4)} is outside the colour-band multiplier range `
                + '(×0.01 … ×10⁹).',
            })
          case CODE_VARIANT_TOLERANCE:
            return t({
              tr: `${pct(fmt(d.tolerance, 3))} toleransın renk karşılığı yok. Geçerli: `
                + `${numberList(TOLERANCE_COLORS.map((c) => c.tolerance))}.`,
              en: `There is no colour for a tolerance of ${pct(fmt(d.tolerance, 3))}. Valid `
                + `values: ${numberList(TOLERANCE_COLORS.map((c) => c.tolerance))}.`,
            })
          case CODE_VARIANT_TCR:
            return t({
              tr: `${fmt(d.tcr, 3)} ppm/°C sıcaklık katsayısının renk karşılığı yok. Geçerli: `
                + `${numberList(TCR_COLORS.map((c) => c.tcr))}.`,
              en: `There is no colour for a temperature coefficient of ${fmt(d.tcr, 3)} ppm/°C. `
                + `Valid values: ${numberList(TCR_COLORS.map((c) => c.tcr))}.`,
            })
          case CODE_VARIANT_EIA96_INDEX:
            return t({
              tr: `EIA-96 kod numarası 01–96 aralığında olmalı, "${d.index}" geçersiz.`,
              en: `The EIA-96 code number must lie in the range 01–96; "${d.index}" is invalid.`,
            })
          default:
            return null
        }

      case CODE_ERR_FORMAT:
        switch (d.variant) {
          case CODE_VARIANT_NOT_TEXT:
            return t({ tr: 'Kod metin olmalı.', en: 'The code must be text.' })
          case CODE_VARIANT_EMPTY:
            return t({ tr: 'Kod boş.', en: 'The code is empty.' })
          case CODE_VARIANT_R_NOTATION:
            return t({
              tr: 'R işaretli kod okunamadı.',
              en: 'The R-notation code could not be read.',
            })
          case CODE_VARIANT_EIA96_LETTER:
            return t({
              tr: `"${d.letter}" standart EIA-96 çarpan harfi değil. Geçerli: `
                + `${Object.keys(EIA96_MULTIPLIERS.standard).join(', ')}. Üretici alias'ı için `
                + 'üretici profilini seçin.',
              en: `"${d.letter}" is not a standard EIA-96 multiplier letter. Valid: `
                + `${Object.keys(EIA96_MULTIPLIERS.standard).join(', ')}. Select the manufacturer `
                + 'profile to accept a manufacturer alias.',
            })
          case CODE_VARIANT_SMD_SHAPE:
            return t({
              tr: `"${d.code}" tanınmadı. Desteklenen biçimler: 3 hane (472), 4 hane (4701), `
                + 'R işareti (4R7), EIA-96 (01A), sıfır ohm (0, 00, 000, 0000).',
              en: `"${d.code}" was not recognised. Supported formats: 3 digits (472), 4 digits `
                + '(4701), R notation (4R7), EIA-96 (01A), zero ohm (0, 00, 000, 0000).',
            })
          case CODE_VARIANT_CAP_SHAPE:
            return t({
              tr: `"${d.code}" tanınmadı. Beklenen biçim: üç rakam ve opsiyonel tolerans harfi `
                + '(örn. 104, 104K).',
              en: `"${d.code}" was not recognised. Expected format: three digits and an optional `
                + 'tolerance letter (e.g. 104, 104K).',
            })
          case CODE_VARIANT_CAP_LETTER:
            return t({
              tr: `"${d.letter}" bilinen bir tolerans harfi değil. Geçerli: `
                + `${Object.keys(CAP_TOLERANCE_LETTERS).join(', ')}.`,
              en: `"${d.letter}" is not a known tolerance letter. Valid: `
                + `${Object.keys(CAP_TOLERANCE_LETTERS).join(', ')}.`,
            })
          default:
            return null
        }

      default:
        return null
    }
  }

  return {
    backlink: t({
      tr: '← Komponent ve Devre Hesapları',
      en: '← Component and Circuit Calculators',
    }),
    title: t({
      tr: 'Direnç ve SMD Kod Çözücü',
      en: 'Resistor & SMD Code Decoder',
    }),
    intro: t({
      tr: 'Renk bantlarını, SMD direnç kodlarını ve seramik kondansatör kodlarını çözer; değerden '
        + 'renk bandına ters çevirme, tolerans penceresi, en yakın E serisi değeri ve sıcaklık '
        + 'kaymasını birlikte verir.',
      en: 'Decodes colour bands, SMD resistor codes and ceramic capacitor codes; it gives the '
        + 'reverse conversion from a value to colour bands, the tolerance window, the nearest '
        + 'E-series value and the temperature drift together.',
    }),

    modeAnalysis: t({ tr: 'Analiz — koddan değere', en: 'Analysis — code to value' }),
    modeSynthesis: t({ tr: 'Sentez — değerden koda', en: 'Synthesis — value to code' }),

    kindLabel: {
      [KIND_COLOR]: t({ tr: 'Renk bandı', en: 'Colour band' }),
      [KIND_SMD]: t({ tr: 'SMD direnç', en: 'SMD resistor' }),
      [KIND_CAP]: t({ tr: 'Kondansatör', en: 'Capacitor' }),
    },

    colorName,

    // Bant konumunun adı; rakam bantları numaralanır.
    roleLabel: {
      digit: (i) => t({
        tr: `${i + 1}. rakam`,
        en: `${ORDINAL_EN[i] ?? `${i + 1}th`} digit`,
      }),
      multiplier: () => t({ tr: 'Çarpan', en: 'Multiplier' }),
      tolerance: () => t({ tr: 'Tolerans', en: 'Tolerance' }),
      tcr: () => t({ tr: 'Sıcaklık katsayısı', en: 'Temperature coefficient' }),
    },

    smdKindLabel: {
      '3-digit': t({ tr: '3 haneli kod', en: '3-digit code' }),
      '4-digit': t({ tr: '4 haneli kod', en: '4-digit code' }),
      'r-notation': t({ tr: 'R işaretli kod', en: 'R-notation code' }),
      eia96: t({ tr: 'EIA-96 kodu', en: 'EIA-96 code' }),
      zero: t({ tr: 'Sıfır ohm jumper', en: 'Zero-ohm jumper' }),
    },

    bandCountOption: (n) => t({ tr: `${n} bant`, en: `${n} bands` }),

    fields: {
      kind: t({ tr: 'Komponent işareti', en: 'Component marking' }),
      bandCount: t({ tr: 'Bant sayısı', en: 'Band count' }),
      target: t({ tr: 'Hedef direnç', en: 'Target resistance' }),
      tolerance: {
        label: t({ tr: 'Tolerans', en: 'Tolerance' }),
        hint: t({
          tr: 'Renklerle gösterilebilen değerler: 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10',
          en: 'Values representable with colours: 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10',
        }),
      },
      tcr: {
        label: t({ tr: 'Sıcaklık katsayısı (TCR)', en: 'Temperature coefficient (TCR)' }),
        hint: t({
          tr: 'Renklerle gösterilebilenler: 5, 10, 15, 25, 50, 100',
          en: 'Representable with colours: 5, 10, 15, 25, 50, 100',
        }),
      },
      smd: {
        label: t({ tr: 'SMD kodu', en: 'SMD code' }),
        // Yalnızca kod örnekleri — çevrilmez.
        hint: '472 · 4701 · 4R7 · R22 · 01A · 0',
      },
      smdProfile: {
        label: t({ tr: 'Kod profili', en: 'Code profile' }),
        standard: t({ tr: 'Standart EIA-96', en: 'Standard EIA-96' }),
        manufacturer: t({
          tr: 'Üretici profili (alias harfleri dahil)',
          en: 'Manufacturer profile (alias letters included)',
        }),
      },
      cap: {
        label: t({ tr: 'Kondansatör kodu', en: 'Capacitor code' }),
        hint: t({
          tr: 'Üç rakam ve opsiyonel tolerans harfi: 104 · 104K · 223J',
          en: 'Three digits and an optional tolerance letter: 104 · 104K · 223J',
        }),
      },
      Tref: {
        label: t({ tr: 'Değerlendirme sıcaklığı', en: 'Evaluation temperature' }),
        hint: t({
          tr: 'Sıcaklık kayması bu noktada hesaplanır',
          en: 'The temperature drift is computed at this point',
        }),
      },
      Tmin: t({ tr: 'Grafik alt sıcaklık', en: 'Chart lower temperature' }),
      Tmax: t({ tr: 'Grafik üst sıcaklık', en: 'Chart upper temperature' }),
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      target: t({ tr: 'Hedef direnç', en: 'Target resistance' }),
      tolerance: t({ tr: 'Tolerans', en: 'Tolerance' }),
      tcr: t({ tr: 'Sıcaklık katsayısı (TCR)', en: 'Temperature coefficient (TCR)' }),
      Tmin: t({ tr: 'Grafik alt sıcaklık', en: 'Chart lower temperature' }),
      Tmax: t({ tr: 'Grafik üst sıcaklık', en: 'Chart upper temperature' }),
      Tref: t({ tr: 'Değerlendirme sıcaklığı', en: 'Evaluation temperature' }),
    },

    big: {
      capacitance: t({ tr: 'Kapasite', en: 'Capacitance' }),
      representable: t({ tr: 'Gösterilebilen değer', en: 'Representable value' }),
      resistance: t({ tr: 'Direnç', en: 'Resistance' }),
      // Birim ve işaretten ibaret satır; iki dilde de aynı dizilir.
      capAlt: (pf, uf) => t({ tr: `${pf} pF · ${uf} µF`, en: `${pf} pF · ${uf} µF` }),
      tolRange: (tol, min, max) => t({
        tr: `±${pct(tol)} → ${min} … ${max}`,
        en: `±${pct(tol)} → ${min} … ${max}`,
      }),
      noTolerance: t({
        tr: 'tolerans kodda belirtilmemiş',
        en: 'the code does not state a tolerance',
      }),
    },

    table: {
      bands: t({ tr: 'Bantlar (soldan sağa)', en: 'Bands (left to right)' }),
      requested: t({ tr: 'İstenen değer', en: 'Requested value' }),
      representable: t({ tr: 'Gösterilebilen değer', en: 'Representable value' }),
      nearestNote: t({ tr: '(en yakın)', en: '(nearest)' }),
      smdKind: t({ tr: 'Kod türü', en: 'Code type' }),
      baseTimesMultiplier: t({
        tr: 'E96 temel değeri × çarpan',
        en: 'E96 base value × multiplier',
      }),
      nearestE24: t({ tr: 'En yakın E24', en: 'Nearest E24' }),
      nearestE96: t({ tr: 'En yakın E96', en: 'Nearest E96' }),
      tcr: t({ tr: 'Sıcaklık katsayısı', en: 'Temperature coefficient' }),
      resistanceAt: (T) => t({ tr: `Direnç @ ${T} °C`, en: `Resistance @ ${T} °C` }),
      capTolerance: (letter) => t({
        tr: `Tolerans (${letter})`,
        en: `Tolerance (${letter})`,
      }),
    },

    formula: t({
      tr: `4 bant:
  R = (10·D₁ + D₂) · 10^M
5 bant:
  R = (100·D₁ + 10·D₂ + D₃) · 10^M
6. bant:
  R(T) = R₂₅ ·
    [1 + TCR·10⁻⁶·(T − 25)]

SMD 3 hane:
  R = (10·D₁ + D₂) · 10^D₃
SMD 4 hane:
  R = (100·D₁ + 10·D₂ + D₃) ·
    10^D₄
R işareti:
  4R7 = 4.7 Ω, R22 = 0.22 Ω
EIA-96:
  R = E96[kod] × M[harf]

Kondansatör:
  C[pF] = (10·D₁ + D₂) · 10^D₃

Tolerans sınırları:
  R_min = R·(1 − Tol/100)
  R_max = R·(1 + Tol/100)`,
      en: `4 bands:
  R = (10·D₁ + D₂) · 10^M
5 bands:
  R = (100·D₁ + 10·D₂ + D₃) · 10^M
6th band:
  R(T) = R₂₅ ·
    [1 + TCR·10⁻⁶·(T − 25)]

SMD 3 digits:
  R = (10·D₁ + D₂) · 10^D₃
SMD 4 digits:
  R = (100·D₁ + 10·D₂ + D₃) ·
    10^D₄
R notation:
  4R7 = 4.7 Ω, R22 = 0.22 Ω
EIA-96:
  R = E96[code] × M[letter]

Capacitor:
  C[pF] = (10·D₁ + D₂) · 10^D₃

Tolerance limits:
  R_min = R·(1 − Tol/100)
  R_max = R·(1 + Tol/100)`,
    }),

    detail: {
      nominal: (v) => t({
        tr: `Çözülen nominal değer: ${v}.`,
        en: `Decoded nominal value: ${v}.`,
      }),
      toleranceWindow: (min, max) => t({
        tr: `Tolerans penceresi: ${min} … ${max}.`,
        en: `Tolerance window: ${min} … ${max}.`,
      }),
      drift: (T, d) => t({
        tr: `Sıcaklık kayması 25 °C referansına göre hesaplanır; ${T} °C'de ${d}.`,
        en: `The temperature drift is computed against the 25 °C reference; at ${T} °C it is ${d}.`,
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      t({
        tr: 'Bant renkleri ve SMD kod düzenleri endüstride yaygın kabul görmüş biçimlerdir; bazı '
          + 'üreticiler farklı çarpan harfi veya bant düzeni kullanır.',
        en: 'The band colours and SMD code layouts are the formats widely accepted in the '
          + 'industry; some manufacturers use a different multiplier letter or band layout.',
      }),
      t({
        tr: 'EIA-96 alias harfleri (R, S, H) yalnızca üretici profili seçildiğinde kabul edilir. '
          + 'Standart profilde bilinmeyen harf hata verir — sessizce tahmin edilmez.',
        en: 'The EIA-96 alias letters (R, S, H) are accepted only when the manufacturer profile is '
          + 'selected. In the standard profile an unknown letter raises an error — it is never '
          + 'guessed silently.',
      }),
      t({
        tr: 'Sıcaklık modeli doğrusaldır. Gerçek TCR sıcaklıkla değişir ve üretici eğrisi '
          + 'doğrusaldan sapar.',
        en: 'The temperature model is linear. The real TCR varies with temperature and the '
          + 'manufacturer curve departs from a straight line.',
      }),
      t({
        tr: 'Tolerans ve sıcaklık kayması bağımsız etkilerdir; worst-case toplam hata ikisinin '
          + 'birleşimidir, tek başına hiçbiri değildir.',
        en: 'Tolerance and temperature drift are independent effects; the worst-case total error '
          + 'is the combination of the two, not either one on its own.',
      }),
      t({
        tr: 'Tantal ve polimer kondansatör işaretleri üreticiye göre değişir; bu araç yalnızca üç '
          + 'rakamlı seramik kodunu çözer.',
        en: 'Tantalum and polymer capacitor markings vary by manufacturer; this tool decodes only '
          + 'the three-digit ceramic code.',
      }),
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    chart: {
      x: t({ tr: 'Sıcaklık (°C)', en: 'Temperature (°C)' }),
      y: t({ tr: 'Direnç (Ω)', en: 'Resistance (Ω)' }),
      // Seri adı bir bağıntı simgesidir; çevrilmez.
      series: 'R(T)',
      legendMin: t({ tr: 'tolerans alt sınırı', en: 'tolerance lower limit' }),
      legendMax: t({ tr: 'tolerans üst sınırı', en: 'tolerance upper limit' }),
      refMin: (v) => t({ tr: `alt sınır ${v}`, en: `lower limit ${v}` }),
      refMax: (v) => t({ tr: `üst sınır ${v}`, en: `upper limit ${v}` }),
      tempTick: (v) => t({ tr: `${v} °C`, en: `${v} °C` }),
      caption: t({
        tr: 'Direnç sıcaklıkla doğrusal olarak kayar; eğim sıcaklık katsayısıdır. Yatay çizgiler '
          + 'oda sıcaklığındaki tolerans sınırlarıdır — eğri bunların dışına çıkıyorsa sıcaklık '
          + 'kayması tek başına toleransı aşıyor demektir.',
        en: 'Resistance drifts linearly with temperature; the slope is the temperature '
          + 'coefficient. The horizontal lines are the tolerance limits at room temperature — if '
          + 'the curve leaves them, the temperature drift alone exceeds the tolerance.',
      }),
    },

    // Grafik yalnızca TCR bilindiğinde çizilir; boş not ortak metinden değil
    // buradan gelir, çünkü kullanıcıya ne yapacağını da söylüyor.
    chartEmpty: t({
      tr: 'Sıcaklık eğrisi yalnızca sıcaklık katsayısı bilindiğinde çizilir. 6 bantlı direnç seçin '
        + 'veya sentez modunda TCR girin.',
      en: 'The temperature curve is drawn only when the temperature coefficient is known. Select a '
        + '6-band resistor or enter a TCR in synthesis mode.',
    }),

    schematic: {
      title: t({ tr: 'Komponent işareti', en: 'Component marking' }),
      captionColor: t({
        tr: 'Tolerans bandı gövdenin sağ ucunda, diğerlerinden aralıklı durur',
        en: 'The tolerance band sits at the right end of the body, spaced apart from the others',
      }),
      captionSmd: t({
        tr: 'SMD direnç — kod gövdenin üstüne basılır',
        en: 'SMD resistor — the code is printed on top of the body',
      }),
      captionCap: t({ tr: 'Seramik kondansatör', en: 'Ceramic capacitor' }),
      // Kod girilmediğinde gövdeye basılan yer tutucu; dilden bağımsız simge.
      noCode: '—',
    },

    reasonText: (reason, detail) => {
      if (reason === REASON_SYNTHESIS_COLOR_ONLY) {
        return t({
          tr: 'Değerden koda çevirme yalnızca renk bandı için yapılır. SMD ve kondansatör kodları '
            + 'üreticiye göre değişir; ters çevirmek tek bir doğru sonuç vermez.',
          en: 'Converting a value into a code is done for colour bands only. SMD and capacitor '
            + 'codes vary by manufacturer; reversing them does not give a single correct result.',
        })
      }
      if (reason === REASON_INCOMPLETE) {
        return t({
          tr: 'Tüm zorunlu alanlara geçerli değer girin. Ondalık için nokta veya virgül '
            + 'kullanabilirsiniz (0.25 = 0,25).',
          en: 'Enter a valid value in every required field. You may use a point or a comma for '
            + 'decimals (0.25 = 0,25).',
        })
      }
      // Motorun kodu + kodu tamamlayan alanlar (hangi bant, hangi harf) burada cümleye döner
      return codeErrorText(reason, detail) ?? t({
        tr: 'Girilen kod çözülemedi.',
        en: 'The code entered could not be decoded.',
      })
    },

    // Mühendislik yorumu — bu ekranda bulgular doğrudan burada üretilir,
    // çünkü hepsi tek bir çözülmüş değere bakar.
    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      if (r.kind === KIND_CAP) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Kod ${fmt(r.pF, 4)} pF = ${fmt(r.nF, 4)} nF = ${fmt(r.uF, 4)} µF değerini `
              + 'gösteriyor.',
            en: `The code indicates ${fmt(r.pF, 4)} pF = ${fmt(r.nF, 4)} nF = ${fmt(r.uF, 4)} µF.`,
          }),
        })
        const asym = r.toleranceAsymmetric
        if (r.tolerance != null) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Tolerans harfi ${r.toleranceLetter} → ±${pct(fmt(r.tolerance, 3))}; gerçek değer `
                + `${fmt(r.min, 4)} … ${fmt(r.max, 4)} pF arasında.`,
              en: `Tolerance letter ${r.toleranceLetter} → ±${pct(fmt(r.tolerance, 3))}; the real `
                + `value lies between ${fmt(r.min, 4)} … ${fmt(r.max, 4)} pF.`,
            }),
          })
        } else if (asym) {
          out.push({
            level: 'warn',
            text: t({
              tr: `Tolerans harfi ${r.toleranceLetter}: ${pct(`+${fmt(asym.plus, 3)}`)} / `
                + `${pct(`−${fmt(asym.minus, 3)}`)} — asimetrik, tek sayıyla ifade edilmez.`,
              en: `Tolerance letter ${r.toleranceLetter}: ${pct(`+${fmt(asym.plus, 3)}`)} / `
                + `${pct(`−${fmt(asym.minus, 3)}`)} — asymmetric, it cannot be expressed as a single `
                + 'number.',
            }),
          })
        } else {
          out.push({
            level: 'warn',
            text: t({
              tr: 'Kodda tolerans harfi yok; gerçek sapma üretici verisinden okunmalı.',
              en: 'The code carries no tolerance letter; the real deviation must be read from '
                + 'manufacturer data.',
            }),
          })
        }
        out.push({
          level: 'warn',
          text: t({
            tr: 'Sınıf II seramiklerde (X7R, Y5V) kapasite uygulanan gerilim ve sıcaklıkla '
              + 'belirgin biçimde düşer. Kod bu düşüşü göstermez.',
            en: 'In class II ceramics (X7R, Y5V) the capacitance falls markedly with the applied '
              + 'voltage and with temperature. The code does not show this fall.',
          }),
        })
        return out
      }

      if (r.zero) {
        out.push({
          level: 'ok',
          text: t({
            tr: 'Sıfır ohm jumper — direnç değil, atlama teli olarak kullanılır.',
            en: 'Zero-ohm jumper — it is not a resistor; it is used as a jumper link.',
          }),
        })
        out.push({
          level: 'warn',
          text: t({
            tr: 'Gerçek direnci sıfır değildir (tipik olarak 10–50 mΩ) ve akım taşıma sınırı '
              + 'vardır; güç dağıtımında yol gibi değerlendirin.',
            en: 'Its real resistance is not zero (typically 10–50 mΩ) and it has a '
              + 'current-carrying limit; treat it as a trace in power distribution.',
          }),
        })
        return out
      }

      out.push({
        level: 'ok',
        text: t({
          tr: `Çözülen değer ${fmtRes(r.ohms, 4)}.`,
          en: `The decoded value is ${fmtRes(r.ohms, 4)}.`,
        }),
      })

      if (r.tolerance != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Tolerans ±${pct(fmt(r.tolerance, 3))} → gerçek değer ${fmtRes(r.min, 4)} … `
              + `${fmtRes(r.max, 4)} arasında.`,
            en: `Tolerance ±${pct(fmt(r.tolerance, 3))} → the real value lies between `
              + `${fmtRes(r.min, 4)} … ${fmtRes(r.max, 4)}.`,
          }),
        })
      }

      if (r.nearestE24) {
        const exact = Math.abs(r.nearestE24.errorPct) < 1e-9
        out.push({
          level: 'ok',
          text: exact
            ? t({
              tr: 'Değer E24 serisinde birebir var — yaygın bulunur.',
              en: 'The value exists exactly in the E24 series — it is widely available.',
            })
            : t({
              tr: `E24'te en yakın değer ${fmtRes(r.nearestE24.value, 4)} `
                + `(${pct(fmtPct(r.nearestE24.errorPct))}); E96'da ${fmtRes(r.nearestE96.value, 4)} `
                + `(${pct(fmtPct(r.nearestE96.errorPct))}).`,
              en: `The nearest value in E24 is ${fmtRes(r.nearestE24.value, 4)} `
                + `(${pct(fmtPct(r.nearestE24.errorPct))}); in E96 it is `
                + `${fmtRes(r.nearestE96.value, 4)} (${pct(fmtPct(r.nearestE96.errorPct))}).`,
            }),
        })
      }

      if (r.tcr != null) {
        const drift = Math.abs(r.driftPct)
        const overTolerance = r.tolerance != null && drift > r.tolerance
        out.push({
          level: overTolerance ? 'danger' : drift > 0.5 ? 'warn' : 'ok',
          text: overTolerance
            ? t({
              tr: `${fmt(r.temps.Tref, 3)} °C'de sıcaklık kayması ${pct(fmtPct(r.driftPct))} — tek `
                + `başına ±${pct(fmt(r.tolerance, 3))} toleransı aşıyor. Toplam hata iki etkinin `
                + 'birleşimidir.',
              en: `At ${fmt(r.temps.Tref, 3)} °C the temperature drift is ${pct(fmtPct(r.driftPct))} — `
                + `on its own it exceeds the ±${pct(fmt(r.tolerance, 3))} tolerance. The total error `
                + 'is the combination of the two effects.',
            })
            : t({
              tr: `${fmt(r.temps.Tref, 3)} °C'de sıcaklık kayması ${pct(fmtPct(r.driftPct))} → `
                + `${fmtRes(r.atTref, 4)}.`,
              en: `At ${fmt(r.temps.Tref, 3)} °C the temperature drift is ${pct(fmtPct(r.driftPct))} → `
                + `${fmtRes(r.atTref, 4)}.`,
            }),
        })
      } else if (r.kind === KIND_COLOR && r.bandCount < 6) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Sıcaklık katsayısı bantlarda yok. Geniş sıcaklık aralığında çalışacaksa üretici '
              + 'verisinden TCR okunmalı.',
            en: 'The temperature coefficient is not present in the bands. If the part will work '
              + 'over a wide temperature range, the TCR must be read from manufacturer data.',
          }),
        })
      }

      if (r.kind === KIND_SMD && r.aliasUsed) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Çarpan harfi standart EIA-96 tablosunda yok, üretici alias\'ı olarak yorumlandı. '
              + 'Üretici dokümanıyla doğrulayın.',
            en: 'The multiplier letter is not in the standard EIA-96 table; it was interpreted as '
              + 'a manufacturer alias. Verify it against the manufacturer documentation.',
          }),
        })
      }

      if (r.mode === MODE_SYNTHESIS && r.exact === false) {
        out.push({
          level: 'warn',
          text: t({
            tr: `Renk bantları yalnızca kuantalanmış değerleri gösterebilir. İstenen `
              + `${fmtRes(r.requested, 4)} yerine en yakın gösterilebilir değer `
              + `${fmtRes(r.ohms, 4)}.`,
            en: `Colour bands can represent quantised values only. In place of the requested `
              + `${fmtRes(r.requested, 4)}, the nearest representable value is `
              + `${fmtRes(r.ohms, 4)}.`,
          }),
        })
      }

      return out
    },

    pct,
  }
}
