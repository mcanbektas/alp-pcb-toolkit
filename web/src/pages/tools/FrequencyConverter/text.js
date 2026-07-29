// Frekans ve periyot dönüştürücü ekranının kullanıcıya görünen metinleri —
// iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmtEng } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { REASON_NONPOSITIVE, REASON_RANGE, SOURCE_FREQUENCY, SOURCE_PERIOD } from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  return {
    backlink: t({
      tr: '← Dönüştürücüler',
      en: '← Converters',
    }),
    title: t({
      tr: 'Frekans ve Periyot Dönüştürücü',
      en: 'Frequency & Period Converter',
    }),
    intro: t({
      tr: 'Frekans ile periyot arasında çift yönlü çevirir: frekans girilirse periyodu, periyot '
        + 'girilirse frekansı verir. Sonucu her iki büyüklüğün tüm birim karşılıklarıyla ve '
        + 'açısal frekansla birlikte gösterir.',
      en: 'Converts in both directions between frequency and period: entering a frequency gives '
        + 'the period, entering a period gives the frequency. The result is shown with every '
        + 'unit equivalent of both quantities and with the angular frequency.',
    }),

    sourceLabel: {
      [SOURCE_FREQUENCY]: t({ tr: 'Frekanstan', en: 'From frequency' }),
      [SOURCE_PERIOD]: t({ tr: 'Periyottan', en: 'From period' }),
    },

    // Girilen büyüklüğe göre ana sonucun adı
    mainLabel: {
      [SOURCE_FREQUENCY]: t({ tr: 'Periyot (T)', en: 'Period (T)' }),
      [SOURCE_PERIOD]: t({ tr: 'Frekans (f)', en: 'Frequency (f)' }),
    },

    fields: {
      period: {
        label: t({ tr: 'Periyot (T)', en: 'Period (T)' }),
        hint: t({
          tr: 'Bir tam çevrimin süresi. Kenar süresi (t_r) ile karıştırmayın',
          en: 'The duration of one full cycle. Do not confuse it with the edge rate (t_r)',
        }),
      },
      freq: {
        label: t({ tr: 'Frekans (f)', en: 'Frequency (f)' }),
        hint: t({
          tr: 'Birim zamandaki çevrim sayısı. Sıfır ve negatif değer kabul edilmez',
          en: 'The number of cycles per unit time. Zero and negative values are not accepted',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      period: t({ tr: 'Periyot (T)', en: 'Period (T)' }),
      freq: t({ tr: 'Frekans (f)', en: 'Frequency (f)' }),
    },

    table: {
      frequency: t({ tr: 'Frekans', en: 'Frequency' }),
      period: t({ tr: 'Periyot', en: 'Period' }),
      equivalents: t({ tr: 'birim karşılıkları', en: 'unit equivalents' }),
    },

    formula: t({
      tr: `Frekans ve periyot:
  f = 1 / T
  T = 1 / f

Açısal frekans:
  ω = 2π·f  (rad/s)
  f = ω / (2π)

Birim çarpanları:
  1 kHz = 1e3 Hz
  1 MHz = 1e6 Hz
  1 GHz = 1e9 Hz

  1 ms = 1e-3 s
  1 µs = 1e-6 s
  1 ns = 1e-9 s
  1 ps = 1e-12 s`,
      en: `Frequency and period:
  f = 1 / T
  T = 1 / f

Angular frequency:
  ω = 2π·f  (rad/s)
  f = ω / (2π)

Unit multipliers:
  1 kHz = 1e3 Hz
  1 MHz = 1e6 Hz
  1 GHz = 1e9 Hz

  1 ms = 1e-3 s
  1 µs = 1e-6 s
  1 ns = 1e-9 s
  1 ps = 1e-12 s`,
    }),

    detail: {
      entered: (r) => {
        const value = r.source === SOURCE_FREQUENCY
          ? `f = ${fmtEng(r.frequency, 'Hz', 6)}`
          : `T = ${fmtEng(r.period, 's', 6)}`
        return t({
          tr: `Girilen büyüklük: ${value} — birim çarpanıyla SI'ye çevrilerek okundu.`,
          en: `Quantity entered: ${value} — read by converting to SI with the unit multiplier.`,
        })
      },
      derived: (r) => {
        const value = r.source === SOURCE_FREQUENCY
          ? `T = 1/f = ${fmtEng(r.period, 's', 6)}`
          : `f = 1/T = ${fmtEng(r.frequency, 'Hz', 6)}`
        return t({
          tr: `Türetilen büyüklük: ${value}.`,
          en: `Quantity derived: ${value}.`,
        })
      },
      omega: (value) => t({
        tr: `Açısal frekans: ω = 2π·f = ${value}.`,
        en: `Angular frequency: ω = 2π·f = ${value}.`,
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    // --- Kaynak ve tanım bilgisi ---
    //
    // Sağ panelde ayrı başlık altında listelenir. Kullanıcıya basılan metin
    // dahili doküman göndermesi içermez; tanımın kendisini söyler.
    sourceNotes: [
      t({
        tr: 'Ekranın çekirdek dönüşümü iki bağıntıdan oluşur: f = 1/T ve T = 1/f. İkisi de tanım '
          + 'gereği tamdır — ampirik katsayı, eğri uydurma ya da tablo içermezler.',
        en: 'The core conversion of this screen consists of two relations: f = 1/T and T = 1/f. '
          + 'Both are exact by definition — they contain no empirical coefficient, curve fit or '
          + 'table.',
      }),
      t({
        tr: 'Tanım: frekans birim zamandaki tam çevrim sayısıdır (Hz = 1/s), periyot ise bir tam '
          + 'çevrimin süresidir (s). Bu yüzden f = 1/T bir yaklaşıklık değil, iki büyüklüğün '
          + 'tanımının doğrudan sonucudur.',
        en: 'Definition: frequency is the number of full cycles per unit time (Hz = 1/s) and the '
          + 'period is the duration of one full cycle (s). So f = 1/T is not an approximation but '
          + 'a direct consequence of the definitions of the two quantities.',
      }),
      t({
        tr: 'Açısal frekans ω = 2π·f tanım gereğidir; frekans–periyot çiftine ek olarak verilir. '
          + 'Bir tam çevrim 2π radyana karşılık geldiği için ω = 2π·f ve f = ω/(2π) yazılır. '
          + '2π bir katsayı seçimi değil, çevrim başına radyan sayısıdır.',
        en: 'The angular frequency ω = 2π·f holds by definition; it is given in addition to the '
          + 'frequency–period pair. Because one full cycle corresponds to 2π radians, ω = 2π·f '
          + 'and f = ω/(2π). The 2π is not a chosen coefficient but the number of radians per '
          + 'cycle.',
      }),
      t({
        tr: 'Birim çarpanları ondalık SI önekleridir ve 10\'un tam kuvvetleridir: 1 kHz = 10³ Hz, '
          + '1 MHz = 10⁶ Hz, 1 GHz = 10⁹ Hz; 1 ms = 10⁻³ s, 1 µs = 10⁻⁶ s, 1 ns = 10⁻⁹ s, '
          + '1 ps = 10⁻¹² s. Çarpanlar yuvarlanmış değerler değildir.',
        en: 'The unit multipliers are decimal SI prefixes and exact powers of ten: 1 kHz = 10³ Hz, '
          + '1 MHz = 10⁶ Hz, 1 GHz = 10⁹ Hz; 1 ms = 10⁻³ s, 1 µs = 10⁻⁶ s, 1 ns = 10⁻⁹ s, '
          + '1 ps = 10⁻¹² s. The multipliers are not rounded values.',
      }),
    ],

    validity: [
      t({
        tr: 'Dönüşüm tanım gereği tamdır; f = 1/T bir yaklaşıklık değildir. Tek sınırlama '
          + 'gösterimdeki anlamlı basamak ve kayan nokta hassasiyetidir.',
        en: 'The conversion is exact by definition; f = 1/T is not an approximation. The only '
          + 'limitation is the significant digits of the display and floating-point precision.',
      }),
      t({
        tr: 'Periyot, tekrarlayan bir sinyalin bir tam çevriminin süresidir. Tek bir darbenin '
          + 'genişliği ya da kenarın yükselme süresi periyot değildir.',
        en: 'The period is the duration of one full cycle of a repeating signal. The width of a '
          + 'single pulse or the rise time of an edge is not the period.',
      }),

      // --- Sayısal geçerlilik aralığı (spec §12: "Geçerlilik aralığı") ---
      //
      // Sınırların kaynağı convertFrequency.js: guard() sıfır ve negatifi
      // reddeder, ters çevrim ile ω hesabı sonlu değilse aralık hatası döner.
      // Aşağıdaki sayılar çift duyarlıklı kayan noktanın (IEEE-754 binary64)
      // sınırlarıdır.
      t({
        tr: 'Geçerli giriş aralığı sıfırdan büyük sonlu sayılardır: f > 0 ve T > 0. Sınır değerin '
          + 'kendisi (tam 0) dışarıdadır — f = 0 (DC) bir periyoda karşılık gelmez, 1/0 '
          + 'tanımsızdır ve negatif bir tekrar süresi yoktur. Bu girişlerde sonuç yerine hata '
          + 'gösterilir.',
        en: 'The valid input range is finite numbers greater than zero: f > 0 and T > 0. The '
          + 'boundary value itself (exactly 0) is outside — f = 0 (DC) does not correspond to a '
          + 'period, 1/0 is undefined, and there is no negative repetition time. For such inputs '
          + 'an error is shown instead of a result.',
      }),
      t({
        tr: 'Frekans girişinde üst taşma sınırı f ≈ 2.8611×10³⁰⁷ Hz\'dir: bunun üstünde ω = 2π·f, '
          + 'çift duyarlıklı kayan noktanın en büyük değerini (1.7977×10³⁰⁸) aşar ve aralık '
          + 'hatası döner.',
        en: 'The upper overflow limit on the frequency input is f ≈ 2.8611×10³⁰⁷ Hz: above it '
          + 'ω = 2π·f exceeds the largest double-precision floating-point value (1.7977×10³⁰⁸) '
          + 'and a range error is returned.',
      }),
      t({
        tr: 'Frekans girişinde alt taşma sınırı f ≈ 5.5627×10⁻³⁰⁹ Hz\'dir: bunun altında T = 1/f '
          + 'aynı üst sınırı aşar. Frekans için başka bir alt sınır yoktur; f = 1×10⁻³⁰⁰ Hz gibi '
          + 'bir giriş hâlâ çevrilir.',
        en: 'The lower underflow limit on the frequency input is f ≈ 5.5627×10⁻³⁰⁹ Hz: below it '
          + 'T = 1/f exceeds the same upper bound. There is no other lower limit for frequency; '
          + 'an input such as f = 1×10⁻³⁰⁰ Hz is still converted.',
      }),
      t({
        tr: 'Periyot girişinde alt taşma sınırı T ≈ 3.4951×10⁻³⁰⁸ s\'dir; bunun altında ω = 2π/T '
          + 'temsil edilemez. Periyot için üst sınır yoktur: T ne kadar büyük olursa olsun '
          + 'f = 1/T temsil edilebilir kalır.',
        en: 'The lower underflow limit on the period input is T ≈ 3.4951×10⁻³⁰⁸ s; below it '
          + 'ω = 2π/T cannot be represented. There is no upper limit for the period: however '
          + 'large T becomes, f = 1/T stays representable.',
      }),
      t({
        tr: 'Bu dört sınır fiziksel değil sayısal sınırdır; denklemden değil, sayının '
          + 'bilgisayarda tutulma biçiminden gelir. Baskı devre pratiğinde karşılaşılan hiçbir '
          + 'frekans veya periyot bu sınırlara yaklaşmaz.',
        en: 'These four limits are numerical, not physical; they come from how the number is '
          + 'stored in the computer, not from the equation. No frequency or period met in printed '
          + 'circuit practice comes near them.',
      }),

      t({
        tr: 'Açısal frekans radyan/saniye taşır. 2π çarpanı atlanırsa faz ve reaktans hesapları '
          + 'bir 6.283 katsayısı kadar yanlış çıkar.',
        en: 'The angular frequency carries radians per second. If the 2π factor is dropped, phase '
          + 'and reactance calculations come out wrong by a factor of 6.283.',
      }),
      t({
        tr: 'Sapma yalnızca gösterim yuvarlamasından gelir; hesap tam değerle yapılır, yuvarlama '
          + 'son adımda uygulanır.',
        en: 'Any deviation comes only from display rounding; the calculation is done with the '
          + 'exact value and rounding is applied in the last step.',
      }),
    ],

    chart: {
      x: t({ tr: 'Frekans (Hz)', en: 'Frequency (Hz)' }),
      y: t({ tr: 'Periyot (s)', en: 'Period (s)' }),
      caption: t({
        tr: 'Periyot frekansın tersidir. Logaritmik frekans ekseninde eğri, çalışma noktasının '
          + 'iki yanında birer dekat gösterir; işaretli nokta girilen değerdir.',
        en: 'The period is the reciprocal of the frequency. On a logarithmic frequency axis the '
          + 'curve shows one decade on each side of the operating point; the marked point is the '
          + 'entered value.',
      }),
      legend: t({ tr: 'periyot', en: 'period' }),
      marker: t({ tr: 'seçilen', en: 'selected' }),
    },

    schematic: {
      title: t({
        tr: 'Periyodik sinyal — periyot ve frekans',
        en: 'Periodic signal — period and frequency',
      }),
      caption: t({
        tr: 'Bir tam çevrim T sürer; birim zamandaki çevrim sayısı f = 1/T',
        en: 'One full cycle lasts T; the number of cycles per unit time is f = 1/T',
      }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_NONPOSITIVE:
          return t({
            tr: 'Frekans ve periyot sıfırdan büyük olmalı. 1/0 tanımsızdır; f = 0 (DC) bir '
              + 'periyoda karşılık gelmez, negatif bir tekrar süresi de yoktur.',
            en: 'The frequency and the period must be greater than zero. 1/0 is undefined; f = 0 '
              + '(DC) does not correspond to a period, and there is no negative repetition time.',
          })
        case REASON_RANGE:
          return t({
            tr: 'Girilen değerin tersi sayı aralığının dışına taşıyor. Daha makul bir büyüklük '
              + 'girin.',
            en: 'The reciprocal of the entered value overflows the numeric range. Enter a more '
              + 'reasonable magnitude.',
          })
        default:
          return t({
            tr: 'Frekans ya da periyot alanına pozitif sayısal değer girin. Ondalık için nokta '
              + 'veya virgül kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a positive numeric value in the frequency or the period field. Use a point '
              + 'or a comma for decimals (0.25 = 0,25).',
          })
      }
    },

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: 'ok',
        text: t({
          tr: `${fmtEng(r.frequency, 'Hz', 4)} frekansın bir tam çevrimi `
            + `${fmtEng(r.period, 's', 4)} sürer. İki büyüklük tanım gereği birbirinin tersidir: `
            + 'frekans iki katına çıkarsa periyot yarıya iner.',
          en: `One full cycle of ${fmtEng(r.frequency, 'Hz', 4)} lasts `
            + `${fmtEng(r.period, 's', 4)}. The two quantities are reciprocals by definition: if `
            + 'the frequency doubles, the period halves.',
        }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `Açısal frekans ω = 2πf = ${fmtEng(r.omega, 'rad/s', 4)}. Reaktans, faz ve empedans `
            + 'denklemleri frekansı bu biçimde kullanır; birimi radyan/saniyedir, derece değildir.',
          en: `The angular frequency is ω = 2πf = ${fmtEng(r.omega, 'rad/s', 4)}. Reactance, phase `
            + 'and impedance equations use the frequency in this form; its unit is radians per '
            + 'second, not degrees.',
        }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: '%50 görev çevrimli bir kare dalgada yüksek ve alçak seviyeler periyodu ikiye '
            + 'böler. Periyot, sinyalin tekrar süresidir — kenarın kendi süresi (t_r) ayrı bir '
            + 'büyüklüktür.',
          en: 'In a square wave with a 50% duty cycle the high and low levels split the period in '
            + 'two. The period is the repetition time of the signal — the duration of the edge '
            + 'itself (t_r) is a separate quantity.',
        }),
      })

      if (r.frequency >= 1e9) {
        out.push({
          level: 'warn',
          text: t({
            tr: `Çalışma frekansı ${fmtEng(r.frequency, 'Hz', 3)}. Bu bölgede hat uzunluğu, dönüş `
              + 'yolu ve dielektrik kaybı sonucu belirler; frekans–periyot dönüşümü tek başına '
              + 'bir tasarım kararı vermez.',
            en: `The operating frequency is ${fmtEng(r.frequency, 'Hz', 3)}. In this region trace `
              + 'length, return path and dielectric loss govern the outcome; the frequency–period '
              + 'conversion alone does not make a design decision.',
          }),
        })
      }

      if (r.period < 1e-12) {
        out.push({
          level: 'warn',
          text: t({
            tr: `Periyot ${fmtEng(r.period, 's', 3)}, yani 1 ps'nin altında. Dönüşüm doğrudur `
              + 'ancak bu aralık tipik baskı devre tasarımının ve çoğu ölçüm ekipmanının dışında '
              + 'kalır.',
            en: `The period is ${fmtEng(r.period, 's', 3)}, i.e. below 1 ps. The conversion is `
              + 'correct, but this range lies outside typical printed circuit design and most '
              + 'measurement equipment.',
          }),
        })
      }

      if (r.frequency < 1) {
        out.push({
          level: 'warn',
          text: t({
            tr: `Frekans 1 Hz'in altında; bir çevrim ${fmtEng(r.period, 's', 3)} sürüyor. Bu `
              + 'aralıkta sinyal bütünlüğü değil, zamanlama ve örnekleme tarafındaki '
              + 'gereksinimler belirleyicidir.',
            en: `The frequency is below 1 Hz; one cycle lasts ${fmtEng(r.period, 's', 3)}. In this `
              + 'range it is not signal integrity but the timing and sampling requirements that '
              + 'govern.',
          }),
        })
      }

      return out
    },
  }
}
