// Uzunluk dönüştürücü ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır.

import { fmt } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import {
  lengthRange, MM_PER_INCH, MM_PER_MIL, MIL_PER_MM, MIL_PER_MM_ROUNDED,
} from '../../../lib/convertLength'
import { REASON_RANGE, REASON_UNIT, REASON_OVERFLOW } from './model'

// Sınır elle yazılmaz; convertLength.js'teki türetilmiş aralıktan biçimlenir.
const RANGE = lengthRange()

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  return {
    backlink: t({
      tr: '← Dönüştürücüler',
      en: '← Converters',
    }),
    title: t({ tr: 'Uzunluk Dönüştürücü', en: 'Length Converter' }),
    intro: t({
      tr: 'PCB tasarımında sık karşılaşılan mm, µm, mil, inç, cm ve m birimleri arasında çift '
        + 'yönlü dönüşüm yapar; girilen uzunluğun tüm birimlerdeki karşılığını birlikte gösterir '
        + 've yuvarlatılmış 39.3701 kuralının nerede görünür hale geldiğini işaretler.',
      en: 'Converts both ways between the mm, µm, mil, inch, cm and m units common in PCB '
        + 'design; shows the entered length in every unit at once and flags where the rounded '
        + '39.3701 rule becomes visible.',
    }),

    fields: {
      L: {
        label: t({ tr: 'Uzunluk', en: 'Length' }),
        hint: t({
          tr: 'Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25)',
          en: 'Use a point or a comma for decimals (0.25 = 0,25)',
        }),
      },
      target: {
        label: t({ tr: 'Hedef birim', en: 'Target unit' }),
        hint: t({
          tr: 'Ana sonuçta bu birim gösterilir; tablo yine tüm birimleri verir',
          en: 'The main result is shown in this unit; the table still lists all units',
        }),
      },
      sig: {
        label: t({ tr: 'Gösterim hassasiyeti', en: 'Display precision' }),
        hint: t({
          tr: 'Yalnızca gösterimi etkiler; hesap tam değerlerle yapılır',
          en: 'Affects the display only; the computation uses exact values',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      L: t({ tr: 'Uzunluk', en: 'Length' }),
      sig: t({ tr: 'Gösterim hassasiyeti', en: 'Display precision' }),
    },

    // Birim seçicilerde görünen uzun adlar
    unitLabel: {
      mm: t({ tr: 'milimetre (mm)', en: 'millimetre (mm)' }),
      'µm': t({ tr: 'mikrometre (µm)', en: 'micrometre (µm)' }),
      mil: t({ tr: 'mil (0.001 inç)', en: 'mil (0.001 inch)' }),
      inch: t({ tr: 'inç (in)', en: 'inch (in)' }),
      cm: t({ tr: 'santimetre (cm)', en: 'centimetre (cm)' }),
      m: t({ tr: 'metre (m)', en: 'metre (m)' }),
    },

    // Sonuç tablosundaki satır adları
    unitRow: {
      mm: t({ tr: 'milimetre', en: 'millimetre' }),
      'µm': t({ tr: 'mikrometre', en: 'micrometre' }),
      mil: 'mil',
      inch: t({ tr: 'inç', en: 'inch' }),
      cm: t({ tr: 'santimetre', en: 'centimetre' }),
      m: t({ tr: 'metre', en: 'metre' }),
    },

    sigLabel: (n) => t({
      tr: `${n} anlamlı basamak`,
      en: `${n} significant digits`,
    }),

    bigLabel: (rowName) => t({
      tr: `${rowName} karşılığı`,
      en: `${rowName} equivalent`,
    }),

    table: {
      headBoard: t({ tr: 'Kart ölçüleri', en: 'Board dimensions' }),
      headBoardUnits: 'mm · µm · mil',
      headOther: t({ tr: 'Diğer birimler', en: 'Other units' }),
      headOtherUnits: t({ tr: 'inç · cm · m', en: 'inch · cm · m' }),
      targetTag: t({ tr: '(hedef)', en: '(target)' }),
    },

    commonSection: t({ tr: 'Sık kullanılan mil ölçüleri', en: 'Common mil sizes' }),
    commonHead: {
      mil: 'mil',
      mm: t({ tr: 'mm karşılığı', en: 'mm equivalent' }),
    },
    nearestTag: t({
      tr: '(girilen değere en yakın)',
      en: '(closest to the entered value)',
    }),

    formula: t({
      tr: `Tanım gereği tam:
  1 inç = 25.4 mm
  1 mil = 0.001 inç = 0.0254 mm
  1 µm = 0.001 mm

Dönüşüm daima SI (metre)
üzerinden yapılır:
  L[m] =
    değer × çarpan[kaynak birim]
  sonuç =
    L[m] / çarpan[hedef birim]

mm → mil:
  mil = mm / 0.0254
      = mm × 39.370078740157…

Gösterim değeri:
  1 mm ≈ 39.3701 mil
  (yuvarlatılmış, hesapta
   KULLANILMAZ)`,
      en: `Exact by definition:
  1 inch = 25.4 mm
  1 mil = 0.001 inch = 0.0254 mm
  1 µm = 0.001 mm

Conversion always goes
through SI (metres):
  L[m] =
    value × factor[source unit]
  result =
    L[m] / factor[target unit]

mm → mil:
  mil = mm / 0.0254
      = mm × 39.370078740157…

Display value:
  1 mm ≈ 39.3701 mil
  (rounded, NOT used
   in the computation)`,
    }),

    detail: {
      si: (siStr) => t({
        tr: `Girilen uzunluğun SI karşılığı: ${siStr}.`,
        en: `SI equivalent of the entered length: ${siStr}.`,
      }),
      exactRule: (relPpm) => t({
        tr: `Hesapta 1/0.0254 = 39.370078740157… kullanılır. Kaynaklarda sık yazılan 39.3701 `
          + `dört ondalığa yuvarlatılmış gösterim değeridir; onunla çarpmak sonucu milyonda `
          + `${relPpm} kadar büyütür.`,
        en: `The computation uses 1/0.0254 = 39.370078740157…. The 39.3701 often written in `
          + `references is a display value rounded to four decimals; multiplying by it inflates `
          + `the result by ${relPpm} parts per million.`,
      }),
      thisLength: (exact, rounded, diff) => t({
        tr: `Bu uzunluk için tam kural ${exact} mil, yuvarlatılmış kural ${rounded} mil verir; `
          + `fark ${diff} mil.`,
        en: `For this length the exact rule gives ${exact} mil and the rounded rule ${rounded} `
          + `mil; the difference is ${diff} mil.`,
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    // --- Sağ panel: geçerlilik aralığı (spec §12) ---
    // Liste KOŞULSUZDUR: girdi geçerli olmasa da kullanıcı sınırı sayı olarak görür.
    rangeNotes: [
      t({
        tr: `Sayısal geçerlilik aralığı: 0 < L ≤ ${fmt(RANGE.maxMeters)} m. Aynı sınır `
          + `${fmt(RANGE.maxMm)} mm ya da ${fmt(RANGE.maxMil)} mil demektir.`,
        en: `Numeric validity range: 0 < L ≤ ${fmt(RANGE.maxMeters)} m. The same limit is `
          + `${fmt(RANGE.maxMm)} mm or ${fmt(RANGE.maxMil)} mil.`,
      }),
      t({
        tr: `Üst sınırı en küçük gösterim birimi belirler: bu uzunluğun mikrometre karşılığı `
          + `${fmt(RANGE.maxUm)} µm ile çift duyarlıklı kayan noktanın en büyük sonlu sayısına `
          + `oturur. Bir adım büyüğünde µm hanesi taşar; ekran o zaman sayı yerine aralık `
          + `uyarısı gösterir, taşan haneyi “sonsuz” diye yazmaz.`,
        en: `The upper limit is set by the smallest display unit: the micrometre equivalent of `
          + `this length, ${fmt(RANGE.maxUm)} µm, lands on the largest finite number of `
          + `double-precision floating point. One step above, the µm figure overflows; the `
          + `screen then shows a range warning instead of a number rather than writing the `
          + `overflowed figure as “infinite”.`,
      }),
      t({
        tr: 'Alt sınır dışlayandır: L ≤ 0 için dönüşüm yapılmaz. Sıfır ya da negatif uzunluğun '
          + 'birim karşılığı mühendislik olarak anlamlı değildir.',
        en: 'The lower limit is exclusive: no conversion is done for L ≤ 0. A zero or negative '
          + 'length has no meaningful unit equivalent in engineering terms.',
      }),
    ],

    // --- Sağ panel: kullanılan tanımların kaynağı (spec §1) ---
    sourceNotes: [
      t({
        tr: `Kaynak: 1 inç = ${fmt(MM_PER_INCH)} mm eşitliği ölçüm sonucu değil tanımdır ve `
          + `1959 tarihli uluslararası yard ve pound anlaşmasından gelir. Anlaşma `
          + `1 yard = 0.9144 m'yi tam kabul eder; 0.9144 / 36 = 0.0254 m tam olarak bir inç `
          + `eder. Bu yüzden dönüşümün kendisinde belirsizlik yoktur.`,
        en: `Source: the equality 1 inch = ${fmt(MM_PER_INCH)} mm is a definition, not a `
          + `measurement, and comes from the international yard and pound agreement of 1959. `
          + `The agreement takes 1 yard = 0.9144 m as exact; 0.9144 / 36 = 0.0254 m is exactly `
          + `one inch. The conversion itself therefore carries no uncertainty.`,
      }),
      t({
        tr: `Mil ve mikrometre aynı tanım zincirinden türer: 1 mil = 0.001 inç = `
          + `${fmt(MM_PER_MIL)} mm; 1 µm = 0.001 mm, SI ön ek tanımı gereği (µ = 10⁻⁶).`,
        en: `Mil and micrometre derive from the same chain of definitions: 1 mil = 0.001 inch = `
          + `${fmt(MM_PER_MIL)} mm; 1 µm = 0.001 mm by the SI prefix definition (µ = 10⁻⁶).`,
      }),
      t({
        tr: `Kaynaklarda geçen 1 mm = ${fmt(MIL_PER_MM_ROUNDED, 6)} mil satırı bağımsız bir `
          + `tanım değildir: 1/${fmt(MM_PER_MIL)} = ${fmt(MIL_PER_MM, 14)} sayısının dört `
          + `ondalığa yuvarlanmış gösterimidir. Bu ekran hesabı tam değerle yapar, yuvarlatılmış `
          + `katsayıyı yalnızca karşılaştırma için gösterir.`,
        en: `The line 1 mm = ${fmt(MIL_PER_MM_ROUNDED, 6)} mil seen in references is not an `
          + `independent definition: it is the four-decimal rounded form of `
          + `1/${fmt(MM_PER_MIL)} = ${fmt(MIL_PER_MM, 14)}. This screen computes with the exact `
          + `value and shows the rounded coefficient only for comparison.`,
      }),
      t({
        tr: 'ABD arazi ölçümünde kullanılan survey inch ayrı bir tanımdır: 1 m = 39.37 survey '
          + 'inch bağıntısıyla verilir, yani 1 survey inch = 0.0254000508 m ve uluslararası '
          + 'inç’ten yaklaşık 2 ppm büyüktür. Elektronik ve mekanik çizimlerde uluslararası '
          + 'inç geçerlidir; bu ekran yalnızca onu kullanır.',
        en: 'The survey inch used in US land surveying is a separate definition: it is given by '
          + '1 m = 39.37 survey inch, i.e. 1 survey inch = 0.0254000508 m, about 2 ppm larger '
          + 'than the international inch. Electronic and mechanical drawings use the '
          + 'international inch; this screen uses only that.',
      }),
    ],

    validityExtra: [
      t({
        tr: 'Ekran yalnızca sayı çevirir: üretim ızgarasına yuvarlama, üreticinin en küçük '
          + 'yol/aralık sınırı ve kalıp toleransı burada dikkate alınmaz.',
        en: 'The screen only converts numbers: rounding to the production grid, the '
          + 'fabricator’s minimum trace/space limit and tooling tolerance are not considered '
          + 'here.',
      }),
      t({
        tr: 'Gösterim hassasiyeti seçimi sonucu değil yalnızca yazımı etkiler; kopyaladığınız '
          + 'değerin basamak sayısına dikkat edin.',
        en: 'The display precision choice affects only the notation, not the result; mind the '
          + 'digit count of the value you copy.',
      }),
      t({
        tr: 'Sonuç yaklaşık değildir: dönüşüm tanım gereği tamdır ve sapma yalnızca gösterim '
          + 'yuvarlamasından gelir.',
        en: 'The result is not approximate: the conversion is exact by definition and any '
          + 'deviation comes only from display rounding.',
      }),
    ],

    chart: {
      x: t({ tr: 'Uzunluk (mm)', en: 'Length (mm)' }),
      y: t({ tr: 'Karşılığı (mil)', en: 'Equivalent (mil)' }),
      caption: t({
        tr: 'Dönüşüm doğrusaldır: doğrunun eğimi 1/0.0254 = 39.370078… mil/mm. Milimetre '
          + 'ızgarası ile mil ızgarası yalnızca sıfırda çakışır; ara değerlerde biri diğerinin '
          + 'tam katı olmaz.',
        en: 'The conversion is linear: the slope of the line is 1/0.0254 = 39.370078… mil/mm. '
          + 'The millimetre grid and the mil grid coincide only at zero; at intermediate values '
          + 'neither is an exact multiple of the other.',
      }),
      legend: t({ tr: 'mil karşılığı', en: 'mil equivalent' }),
      selected: t({ tr: 'seçilen', en: 'selected' }),
    },

    schematic: {
      title: t({ tr: 'Çift ölçekli uzunluk cetveli', en: 'Dual-scale length ruler' }),
      captionLive: t({
        tr: 'Aynı uzunluk iki ızgarayla ölçülür — bölmeler yalnızca sıfırda çakışır',
        en: 'The same length measured with two grids — the divisions coincide only at zero',
      }),
      captionIdle: t({
        tr: 'Üstte milimetre, altta mil ızgarası — geçerli girdi ile ölçeklenir',
        en: 'Millimetre grid on top, mil grid below — scales with valid input',
      }),
      division: t({ tr: 'bölme', en: 'division' }),
    },

    // --- Hata kodu → cümle ---
    reasonText: (reason) => {
      switch (reason) {
        case REASON_RANGE:
          return t({
            tr: 'Uzunluk sıfırdan büyük olmalı. Negatif ya da sıfır uzunluğun dönüşümü anlamlı '
              + 'bir sonuç vermez.',
            en: 'The length must be greater than zero. Converting a negative or zero length '
              + 'gives no meaningful result.',
          })
        case REASON_OVERFLOW:
          return t({
            tr: 'Uzunluk sayı olarak temsil edilebilecek aralığın dışına taşıyor: bu büyüklükte '
              + 'µm ve mil karşılıkları hesaplanamıyor. Daha küçük bir değer girin.',
            en: 'The length overflows the numerically representable range: at this magnitude '
              + 'the µm and mil equivalents cannot be computed. Enter a smaller value.',
          })
        case REASON_UNIT:
          return t({
            tr: 'Seçilen birim tanınmıyor. Listeden bir birim seçin.',
            en: 'The selected unit is not recognised. Pick a unit from the list.',
          })
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya '
              + 'virgül kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a positive numeric value in every required field. Use a point or a '
              + 'comma for decimals (0.25 = 0,25).',
          })
      }
    },

    // --- Bulgu → cümle ---
    commentary: (r) => {
      if (!r.ok) return []
      const out = []
      const sig = r.sig

      out.push({
        level: 'ok',
        text: t({
          tr: `Dönüşüm tanım gereği tam: 1 inch = 25.4 mm ve 1 mil = 0.0254 mm. Girilen `
            + `uzunluk ${fmt(r.all.mm, sig)} mm = ${fmt(r.all.mil, sig)} mil.`,
          en: `The conversion is exact by definition: 1 inch = 25.4 mm and 1 mil = 0.0254 mm. `
            + `The entered length is ${fmt(r.all.mm, sig)} mm = ${fmt(r.all.mil, sig)} mil.`,
        }),
      })

      // Yuvarlatılmış 39.3701 kuralı seçilen hassasiyette görünür mü?
      const exactStr = fmt(r.rounding.exact, sig)
      const roundedStr = fmt(r.rounding.rounded, sig)
      if (exactStr === roundedStr) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Yuvarlatılmış 39.3701 kuralı bu uzunlukta ${sig} anlamlı basamakta aynı sayıyı `
              + `veriyor (${roundedStr} mil), yani fark gösterimde görünmüyor. Hesap yine de `
              + `tam değer 1/0.0254 ile yapıldı.`,
            en: `At this length the rounded 39.3701 rule gives the same number at ${sig} `
              + `significant digits (${roundedStr} mil), so the difference does not show in `
              + `the display. The computation was still done with the exact value 1/0.0254.`,
          }),
        })
      } else {
        out.push({
          level: 'warn',
          text: t({
            tr: `Yuvarlatılmış 39.3701 kuralı ${roundedStr} mil verirdi; tam değerle sonuç `
              + `${exactStr} mil. Fark ${fmt(r.rounding.diff, 3)} mil ve seçtiğiniz `
              + `hassasiyette görünür hale geliyor. Bu ekran tam değeri kullanır.`,
            en: `The rounded 39.3701 rule would give ${roundedStr} mil; with the exact value `
              + `the result is ${exactStr} mil. The difference is ${fmt(r.rounding.diff, 3)} `
              + `mil and becomes visible at your chosen precision. This screen uses the exact `
              + `value.`,
          }),
        })
      }

      out.push({
        level: 'ok',
        text: t({
          tr: `Yuvarlatılmış kuralın bağıl sapması uzunluktan bağımsızdır: milyonda `
            + `${fmt(r.rounding.relPct * 1e4, 3)} (her zaman büyük tarafa). Kısa yollarda `
            + `önemsiz, uzun panel ölçülerinde toplanır.`,
          en: `The relative deviation of the rounded rule is independent of length: `
            + `${fmt(r.rounding.relPct * 1e4, 3)} parts per million (always on the high side). `
            + `Negligible on short traces, it accumulates over long panel dimensions.`,
        }),
      })

      // Ölçek yorumu — hangi birimin okunabilir olduğunu söyler
      if (r.all.mil < 1) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Uzunluk 1 mil'in (25.4 µm) altında. Bu ölçekte üretim verileri genelde `
              + `mikrometre ile verilir: ${fmt(r.all.um, sig)} µm.`,
            en: `The length is below 1 mil (25.4 µm). At this scale fabrication data is `
              + `usually given in micrometres: ${fmt(r.all.um, sig)} µm.`,
          }),
        })
      } else if (r.all.inch >= 1) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Uzunluk 1 inch'ten büyük; mekanik çizimlerde ${fmt(r.all.mm, sig)} mm, veri `
              + `sayfalarında ${fmt(r.all.inch, sig)} inch olarak yazılır.`,
            en: `The length is above 1 inch; mechanical drawings write it as `
              + `${fmt(r.all.mm, sig)} mm, datasheets as ${fmt(r.all.inch, sig)} inch.`,
          }),
        })
      } else {
        out.push({
          level: 'ok',
          text: t({
            tr: `Uzunluk yol genişliği ve aralık ölçeğinde. Kart üreticisine mm, bileşen veri `
              + `sayfasına mil ile bakmak gerekir: ${fmt(r.all.mm, sig)} mm = `
              + `${fmt(r.all.mil, sig)} mil.`,
            en: `The length is at trace width and spacing scale. You will need mm for the `
              + `board fabricator and mil for the component datasheet: ${fmt(r.all.mm, sig)} `
              + `mm = ${fmt(r.all.mil, sig)} mil.`,
          }),
        })
      }

      if (r.nearest >= 0) {
        const near = r.common[r.nearest]
        out.push({
          level: 'ok',
          text: t({
            tr: `Sık kullanılan ölçüler arasında en yakını ${near.mil} mil `
              + `(${fmt(near.mm, 4)} mm). Kartı üretime verirken üreticinin en küçük yol/aralık `
              + `sınırını da kontrol edin.`,
            en: `Among the common sizes the closest is ${near.mil} mil (${fmt(near.mm, 4)} mm). `
              + `When releasing the board, also check the fabricator’s minimum trace/space `
              + `limit.`,
          }),
        })
      }

      if (r.sameUnit) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Kaynak ve hedef birim aynı seçili; ana sonuç girilen değeri tekrarlıyor. '
              + 'Karşılaştırma için hedef birimi değiştirin, tablo yine tüm birimleri gösterir.',
            en: 'The source and target units are the same; the main result repeats the entered '
              + 'value. Change the target unit for a comparison — the table still shows all '
              + 'units.',
          }),
        })
      }

      return out
    },
  }
}
