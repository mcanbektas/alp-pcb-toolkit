// Ohm kanunu ve seri/paralel direnç birleşimi ekranının kullanıcıya görünen
// metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtRes, fmtPow, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  TOOL_OHM, TOOL_COMBO,
  COMBO_SERIES, COMBO_PARALLEL,
  REASON_OHM_INSUFFICIENT,
} from './model'
import {
  VALUE_LIST_ERR_EMPTY, VALUE_LIST_ERR_THOUSANDS,
  VALUE_LIST_ERR_COMMA_SEPARATOR, VALUE_LIST_ERR_NEGATIVE,
} from '../../../lib/valueList'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Yüzde işaretinin yeri dile göre değişir: Türkçede sayıdan önce, İngilizcede
  // sonra. Sayının kendisi her iki dilde de fmt() ile üretilir.
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  return {
    backlink: t({
      tr: '← Komponent ve Devre Hesapları',
      en: '← Component and Circuit Calculators',
    }),
    title: t({
      tr: 'Ohm Kanunu ve Seri/Paralel Direnç',
      en: 'Ohm’s Law and Series/Parallel Resistance',
    }),
    intro: t({
      tr: 'Ohm kanunu ve güç ile seri/paralel direnç birleşimlerini tek ekranda hesaplar; '
        + 'sonuç standart değer karşılığı ve güç marjıyla birlikte verilir.',
      en: 'Computes Ohm’s law and power together with series/parallel resistor combinations '
        + 'on a single screen; the result comes with its standard-value equivalent and power '
        + 'margin.',
    }),

    pct,

    toolLabel: {
      [TOOL_OHM]: t({ tr: 'Ohm kanunu ve güç', en: 'Ohm’s law and power' }),
      [TOOL_COMBO]: t({ tr: 'Seri / paralel birleşim', en: 'Series / parallel combination' }),
    },

    comboLabel: {
      [COMBO_PARALLEL]: t({ tr: 'Paralel', en: 'Parallel' }),
      [COMBO_SERIES]: t({ tr: 'Seri', en: 'Series' }),
    },

    fields: {
      tool: t({ tr: 'Hesap', en: 'Calculation' }),
      combo: t({ tr: 'Bağlantı', en: 'Connection' }),
      blankPlaceholder: t({ tr: 'boş = hesapla', en: 'blank = compute' }),

      V: { label: t({ tr: 'Gerilim (V)', en: 'Voltage (V)' }) },
      I: { label: t({ tr: 'Akım (I)', en: 'Current (I)' }) },
      R: { label: t({ tr: 'Direnç (R)', en: 'Resistance (R)' }) },
      P: { label: t({ tr: 'Güç (P)', en: 'Power (P)' }) },

      values: {
        label: t({ tr: 'Direnç değerleri', en: 'Resistor values' }),
        hint: t({
          tr: 'Boşluk veya noktalı virgülle ayırın; k/M/G soneki yapışık yazılır: 10k 22k 4,7M. '
            + 'Virgül ondalık ayracıdır (4,7k = 4.7 kΩ)',
          en: 'Separate with a space or a semicolon; the k/M/G suffix is written attached: '
            + '10k 22k 4,7M. The comma is the decimal separator (4,7k = 4.7 kΩ)',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      V: t({ tr: 'Gerilim (V)', en: 'Voltage (V)' }),
      I: t({ tr: 'Akım (I)', en: 'Current (I)' }),
      R: t({ tr: 'Direnç (R)', en: 'Resistance (R)' }),
      P: t({ tr: 'Güç (P)', en: 'Power (P)' }),
    },

    ohmNote: t({
      tr: 'Herhangi iki alanı doldurun, kalan ikisi hesaplanır. Üçünü doldurursanız tutarsızlık '
        + 'oranı gösterilir.',
      en: 'Fill in any two fields and the other two are computed. If you fill in three, the '
        + 'inconsistency ratio is shown as well.',
    }),

    big: {
      ohmLabel: t({ tr: 'Harcanan güç', en: 'Dissipated power' }),
      comboLabel: (combo) => t({
        tr: `Eşdeğer direnç (${combo === COMBO_SERIES ? 'seri' : 'paralel'})`,
        en: `Equivalent resistance (${combo === COMBO_SERIES ? 'series' : 'parallel'})`,
      }),
      // Ayırıcının iki yanındaki boşluk kırılmaz ( ): aynı ekrandaki diğer
      // `.alt` satırları da `&nbsp;·&nbsp;` kullanır, sayı ile ayırıcı ayrı
      // satıra düşmesin.
      comboAlt: (n, nearest, error) => t({
        tr: `${n} direnç  ·  en yakın tek değer ${nearest} (${error})`,
        en: `${n} resistor${n === 1 ? '' : 's'}  ·  nearest single value `
          + `${nearest} (${error})`,
      }),
    },

    table: {
      // Ohm kanunu
      voltage: t({ tr: 'Gerilim', en: 'Voltage' }),
      current: t({ tr: 'Akım', en: 'Current' }),
      resistance: t({ tr: 'Direnç', en: 'Resistance' }),
      power: t({ tr: 'Güç', en: 'Power' }),
      inconsistency: t({ tr: 'Girdi tutarsızlığı', en: 'Input inconsistency' }),

      // Seri / paralel
      shareHead: t({ tr: 'Direnç', en: 'Resistance' }),
      shareSeries: t({ tr: 'gerilim payı', en: 'voltage share' }),
      shareParallel: t({ tr: 'akım payı', en: 'current share' }),
    },

    formula: {
      [TOOL_OHM]: t({
        tr: `V = I·R
I = V/R
R = V/I

P = V·I
P = I²·R
P = V²/R

Tutarsızlık oranı
(V, I, R birlikte girilirse):
  E = |V − I·R| / |V|`,
        en: `V = I·R
I = V/R
R = V/I

P = V·I
P = I²·R
P = V²/R

Inconsistency ratio
(if V, I and R are all entered):
  E = |V − I·R| / |V|`,
      }),
      [TOOL_COMBO]: t({
        tr: `Seri: R_eş = Σ Rᵢ
Paralel: R_eş = (Σ 1/Rᵢ)⁻¹
İki için: R_eş = R₁R₂/(R₁+R₂)

Paralelde akım payı:
  Iᵢ = I · (1/Rᵢ) / Σ(1/Rⱼ)`,
        en: `Series: R_eq = Σ Rᵢ
Parallel: R_eq = (Σ 1/Rᵢ)⁻¹
For two: R_eq = R₁R₂/(R₁+R₂)

Current share in parallel:
  Iᵢ = I · (1/Rᵢ) / Σ(1/Rⱼ)`,
      }),
    },

    detail: {
      ohm: (r) => [
        t({
          tr: `Girilen bağımsız değerler: ${r.given.join(', ')}.`,
          en: `Independent values entered: ${r.given.join(', ')}.`,
        }),
        t({
          tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
          en: 'Intermediate values are never rounded; only the display is rounded.',
        }),
      ],
    },

    validity: {
      [TOOL_OHM]: [
        t({
          tr: 'Model saf DC ve dirençseldir; sıcaklıkla direnç değişimi yoktur.',
          en: 'The model is purely DC and resistive; there is no change of resistance with '
            + 'temperature.',
        }),
        t({
          tr: 'Güç değerlendirmesi sürekli çalışma içindir; darbeli yükte paket daha yüksek tepe '
            + 'gücü kaldırabilir.',
          en: 'The power assessment is for continuous operation; under a pulsed load a package can '
            + 'withstand a higher peak power.',
        }),
      ],
      [TOOL_COMBO]: [
        t({
          tr: 'Dirençler ideal ve birbirinden bağımsız kabul edilir.',
          en: 'The resistors are taken as ideal and independent of each other.',
        }),
        t({
          tr: 'Toleranslar birbirini götürmez; eşdeğerin toleransı tek bir direncinkinden iyi '
            + 'olmaz.',
          en: 'Tolerances do not cancel each other; the tolerance of the equivalent is no better '
            + 'than that of a single resistor.',
        }),
        t({
          tr: 'Paralel kollarda öz ısınma farkı ve termal kayma dikkate alınmaz.',
          en: 'Self-heating differences and thermal drift between parallel branches are not taken '
            + 'into account.',
        }),
      ],
      approximate: t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    },

    chart: {
      [TOOL_OHM]: {
        x: t({ tr: 'Direnç (Ω)', en: 'Resistance (Ω)' }),
        y: t({ tr: 'Güç (W)', en: 'Power (W)' }),
        caption: t({
          tr: 'Sabit gerilimde direnç küçüldükçe harcanan güç hızla büyür (P = V²/R). Çalışma '
            + 'noktası eğrinin dik bölgesindeyse küçük bir direnç hatası büyük bir güç farkı '
            + 'yaratır.',
          en: 'At a fixed voltage the dissipated power grows rapidly as the resistance falls '
            + '(P = V²/R). If the operating point sits on the steep part of the curve, a small '
            + 'resistance error produces a large difference in power.',
        }),
      },
      marker: t({ tr: 'çalışma noktası', en: 'operating point' }),
      comboNote: t({
        tr: 'Seri/paralel birleşimin taranacak sürekli bir parametresi yok; sonuç tablosu tüm '
          + 'bilgiyi taşır.',
        en: 'A series/parallel combination has no continuous parameter to sweep; the result table '
          + 'carries all the information.',
      }),
    },

    schematic: {
      title: t({ tr: 'Devre şeması', en: 'Circuit diagram' }),
      caption: {
        [TOOL_OHM]: t({ tr: 'Tek dirençli çevrim', en: 'Single-resistor loop' }),
      },
      captionSeries: t({ tr: 'Seri bağlı dirençler', en: 'Resistors in series' }),
      captionParallel: t({ tr: 'Paralel bağlı dirençler', en: 'Resistors in parallel' }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_OHM_INSUFFICIENT:
          return t({
            tr: 'Ohm kanunu için en az iki değer gerekli. V, I, R ve P alanlarından ikisini '
              + 'doldurun; kalan ikisi hesaplanır.',
            en: 'Ohm’s law needs at least two values. Fill in two of the V, I, R and P fields; the '
              + 'other two are computed.',
          })
        default:
          return t({
            tr: 'Tüm zorunlu alanlara geçerli değer girin. Ondalık için nokta veya virgül '
              + 'kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a valid value in every required field. You may use a point or a comma for '
              + 'decimals (0.25 = 0,25).',
          })
      }
    },

    // Ayrıştırıcı yalnızca kod döndürür; dile çevrilmiş karşılığı burada kurulur.
    valueListError: (code, at) => {
      switch (code) {
        case VALUE_LIST_ERR_EMPTY:
          return t({
            tr: 'Değer listesi boş. En az bir direnç girin, örn. 10k 22k.',
            en: 'The value list is empty. Enter at least one resistor, e.g. 10k 22k.',
          })
        case VALUE_LIST_ERR_COMMA_SEPARATOR:
          return t({
            tr: 'Virgül burada ondalık ayracıdır (4,7k = 4.7 kΩ), değerleri ayırmaz. '
              + 'Değerleri boşlukla veya noktalı virgülle ayırın: 10k 22k 4,7M.',
            en: 'Here the comma is the decimal separator (4,7k = 4.7 kΩ); it does not separate '
              + 'values. Separate the values with a space or a semicolon: 10k 22k 4,7M.',
          })
        case VALUE_LIST_ERR_THOUSANDS:
          return t({
            tr: `"${at}" belirsiz: nokta binlik ayracı mı ondalık mı, anlaşılmıyor. `
              + 'Binlik ayracı kullanmayın; 1000 yerine 1k yazabilirsiniz.',
            en: `"${at}" is ambiguous: it is not clear whether the point is a thousands separator `
              + 'or a decimal point. Do not use a thousands separator; you can write 1k instead of '
              + '1000.',
          })
        case VALUE_LIST_ERR_NEGATIVE:
          return t({
            tr: `"${at}" negatif. Direnç değeri sıfır veya daha büyük olmalı.`,
            en: `"${at}" is negative. A resistance value must be zero or greater.`,
          })
        default:
          return at
            ? t({
              tr: `Değer listesi okunamadı: "${at}". Beklenen biçim: 10k 22k 4,7M `
                + '(boşluk veya noktalı virgülle ayrılmış, k/M/G soneki yapışık).',
              en: `The value list could not be read: "${at}". Expected format: 10k 22k 4,7M `
                + '(separated by a space or a semicolon, with the k/M/G suffix attached).',
            })
            : t({
              tr: 'Değer listesi okunamadı. Beklenen biçim: 10k 22k 4,7M.',
              en: 'The value list could not be read. Expected format: 10k 22k 4,7M.',
            })
      }
    },

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      if (r.tool === TOOL_OHM) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Girilen değerler: ${r.given.join(', ')}. Kalanlar bunlardan türetildi.`,
            en: `Values entered: ${r.given.join(', ')}. The remaining ones were derived from them.`,
          }),
        })
        if (r.inconsistency != null && r.inconsistency > 0.01) {
          out.push({
            level: 'danger',
            text: t({
              tr: `V, I ve R birlikte girildi ve birbirini tutmuyor: sapma `
                + `${pct(fmt(r.inconsistency * 100, 3))}. Sonuçlar ilk iki değerden türetildi.`,
              en: `V, I and R were all entered and they do not agree: the deviation is `
                + `${pct(fmt(r.inconsistency * 100, 3))}. The results were derived from the first `
                + 'two values.',
            }),
          })
        } else if (r.inconsistency != null) {
          out.push({
            level: 'ok',
            text: t({
              tr: 'Girilen üç değer birbiriyle tutarlı.',
              en: 'The three values entered are consistent with each other.',
            }),
          })
        }
        out.push({
          level: r.P > 0.25 ? 'warn' : 'ok',
          text: r.P > 0.25
            ? t({
              tr: `Harcanan güç ${fmtPow(r.P, 3)} — 0603/0805 gibi küçük paketlerin nominal `
                + 'gücünün üzerinde. Paket boyutunu veya devreyi gözden geçirin.',
              en: `The dissipated power is ${fmtPow(r.P, 3)} — above the rating of small packages `
                + 'such as 0603/0805. Review the package size or the circuit.',
            })
            : t({
              tr: `Harcanan güç ${fmtPow(r.P, 3)}; yaygın küçük paketler için sorun değil.`,
              en: `The dissipated power is ${fmtPow(r.P, 3)}; not a problem for common small `
                + 'packages.',
            }),
        })
        return out
      }

      // Seri / paralel
      const series = r.combo === COMBO_SERIES
      out.push({
        level: 'ok',
        text: t({
          tr: `${series ? 'Seri' : 'Paralel'} bağlı ${r.values.length} direncin eşdeğeri `
            + `${fmtRes(r.equivalent, 4)}.`,
          en: `The equivalent of ${r.values.length} resistor${r.values.length === 1 ? '' : 's'} in `
            + `${series ? 'series' : 'parallel'} is ${fmtRes(r.equivalent, 4)}.`,
        }),
      })
      out.push({
        level: 'ok',
        text: series
          ? t({
            tr: 'Seri bağlamada akım her dirençte aynıdır; gerilim direnç oranında paylaşılır.',
            en: 'In a series connection the current is the same in every resistor; the voltage is '
              + 'shared in proportion to resistance.',
          })
          : t({
            tr: 'Paralel bağlamada gerilim her dirençte aynıdır; akım iletkenlik oranında '
              + 'paylaşılır — en küçük direnç en çok akımı çeker.',
            en: 'In a parallel connection the voltage is the same across every resistor; the '
              + 'current is shared in proportion to conductance — the smallest resistor draws the '
              + 'most current.',
          }),
      })
      out.push({
        level: 'ok',
        text: t({
          tr: `En yakın tek standart değer ${fmtRes(r.nearestE24.value, 4)} `
            + `(${pct(fmtPct(r.nearestE24.errorPct))}); tek dirençle karşılanabiliyorsa birleşime gerek `
            + 'yoktur.',
          en: `The nearest single standard value is ${fmtRes(r.nearestE24.value, 4)} `
            + `(${pct(fmtPct(r.nearestE24.errorPct))}); if a single resistor can meet the requirement `
            + 'there is no need for a combination.',
        }),
      })
      if (series) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Toleranslar birbirini götürmez. Seri bağlamada mutlak hatalar toplanır; '
              + 'eşdeğerin toleransı tek bir direncinkinden iyi olmaz.',
            en: 'Tolerances do not cancel each other. In a series connection the absolute errors '
              + 'add up; the tolerance of the equivalent is no better than that of a single '
              + 'resistor.',
          }),
        })
      }
      return out
    },
  }
}
