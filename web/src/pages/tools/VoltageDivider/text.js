// Gerilim bölücü ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (bulgu, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtVolt, fmtAmp, fmtPow, fmtRes, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import {
  REASON_INCOMPLETE, REASON_RATIO, REASON_NO_PAIR, REASON_RANGE,
} from './model'
import { commonText } from '../../../data/uiText'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  return {
    pct,
    backlink: t({
      tr: '← Komponent ve Devre Hesapları',
      en: '← Component and Circuit Calculators',
    }),
    // Başlık categories.js'teki `divider` aracının `name` alanıyla birebir aynı
    // kalmalı; ekranın kendi sözlüğü de (E serisi seçimi, aday çiftler) budur.
    title: t({
      tr: 'Gerilim Bölücü ve E Serisi Bulucu',
      en: 'Voltage Divider & E-Series Finder',
    }),
    intro: t({
      tr: 'Verilen dirençlerden çıkış gerilimini (analiz) ya da hedef çıkış için standart E serisi '
        + 'direnç çiftini (sentez) bulur; yükleme etkisi, tolerans penceresi, güç ve kaynak '
        + 'empedansını birlikte değerlendirir.',
      en: 'Finds the output voltage from given resistors (analysis) or a standard E-series '
        + 'resistor pair for a target output (synthesis); evaluates loading effect, tolerance '
        + 'window, power and source impedance together.',
    }),

    modeGroup: t({ tr: 'Hesap modu', en: 'Calculation mode' }),
    modeAnalysis: t({ tr: 'Analiz — çıkışı bul', en: 'Analysis — find output' }),
    modeSynthesis: t({ tr: 'Sentez — çifti bul', en: 'Synthesis — find pair' }),

    fields: {
      Vin: { label: t({ tr: 'Giriş gerilimi (Vᵢₙ)', en: 'Input voltage (Vᵢₙ)' }) },
      R1: { label: t({ tr: 'R1 (üst)', en: 'R1 (upper)' }) },
      R2: {
        label: t({
          tr: 'R2 (alt, çıkış bu direncin üzerinden alınır)',
          en: 'R2 (lower, the output is taken across this resistor)',
        }),
      },
      Vout: { label: t({ tr: 'Hedef çıkış (V_out)', en: 'Target output (V_out)' }) },
      series: { label: t({ tr: 'E serisi', en: 'E-series' }) },
      rMin: { label: t({ tr: 'En küçük direnç', en: 'Smallest resistance' }) },
      rMax: {
        label: t({ tr: 'En büyük direnç', en: 'Largest resistance' }),
        hint: t({
          tr: 'Arama bu aralıkla sınırlanır',
          en: 'The search is limited to this range',
        }),
      },
      RL: {
        label: t({ tr: 'Yük direnci (R_L, opsiyonel)', en: 'Load resistance (R_L, optional)' }),
        hint: t({
          tr: 'Boş bırakılırsa çıkış yüksüz kabul edilir',
          en: 'If left blank the output is assumed unloaded',
        }),
        placeholder: t({ tr: 'örn. 100', en: 'e.g. 100' }),
      },
      Prated: {
        label: t({ tr: 'Direnç güç sınırı (opsiyonel)', en: 'Resistor power rating (optional)' }),
        hint: t({
          tr: 'Paket başına nominal güç, örn. 0603 için 100 mW',
          en: 'Rated power per package, e.g. 100 mW for 0603',
        }),
        placeholder: t({ tr: 'örn. 100', en: 'e.g. 100' }),
      },
      accept: {
        label: t({ tr: 'Kabul edilebilir sapma', en: 'Acceptable deviation' }),
        hint: t({
          tr: 'Hedef ve tolerans kontrolleri bu sınıra göre değerlendirilir',
          en: 'Target and tolerance checks are evaluated against this limit',
        }),
      },
      tolCheck: t({ tr: 'Tolerans analizi (worst-case)', en: 'Tolerance analysis (worst-case)' }),
      tolR1: { label: t({ tr: 'R1 toleransı (±)', en: 'R1 tolerance (±)' }) },
      tolR2: { label: t({ tr: 'R2 toleransı (±)', en: 'R2 tolerance (±)' }) },
      tolVin: { label: t({ tr: 'Vᵢₙ toleransı (±)', en: 'Vᵢₙ tolerance (±)' }) },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      Vin: t({ tr: 'Giriş gerilimi (Vᵢₙ)', en: 'Input voltage (Vᵢₙ)' }),
      R1: 'R1',
      R2: 'R2',
      Vout: t({ tr: 'Hedef çıkış (V_out)', en: 'Target output (V_out)' }),
      rMin: t({ tr: 'En küçük direnç', en: 'Smallest resistance' }),
      rMax: t({ tr: 'En büyük direnç', en: 'Largest resistance' }),
      RL: t({ tr: 'Yük direnci (R_L)', en: 'Load resistance (R_L)' }),
      Prated: t({ tr: 'Direnç güç sınırı', en: 'Resistor power rating' }),
      accept: t({ tr: 'Kabul edilebilir sapma', en: 'Acceptable deviation' }),
      tolR1: t({ tr: 'R1 toleransı', en: 'R1 tolerance' }),
      tolR2: t({ tr: 'R2 toleransı', en: 'R2 tolerance' }),
      tolVin: t({ tr: 'Vᵢₙ toleransı', en: 'Vᵢₙ tolerance' }),
    },

    bigResultLoaded: (RL) => t({
      tr: `Çıkış gerilimi (${fmtRes(RL, 3)} yük altında)`,
      en: `Output voltage (under ${fmtRes(RL, 3)} load)`,
    }),
    bigResultUnloaded: t({ tr: 'Çıkış gerilimi (yüksüz)', en: 'Output voltage (unloaded)' }),
    targetWord: t({ tr: 'hedef', en: 'target' }),

    table: {
      // Sentez sonuç bloğunda "hedef değer + sapma" satırının kendi etiketi —
      // girdi bloğundaki fields.Vout.label ile aynı dizeyi kullanmaz
      // (ResistorCode/report.js'teki nearestE24/nearestE96 deseniyle aynı gerekçe).
      targetDeviation: t({ tr: 'Hedef (sapma)', en: 'Target (deviation)' }),
      tolWindow: t({ tr: 'Çıkış — min · nominal · maks', en: 'Output — min · nominal · max' }),
      unloadedOut: t({ tr: 'Yüksüz çıkış', en: 'Unloaded output' }),
      r2ParRL: 'R2 ∥ R_L',
      loadCurrent: t({ tr: 'Yük akımı', en: 'Load current' }),
      dividerCurrent: t({ tr: 'Bölücü akımı', en: 'Divider current' }),
      sourceImpedance: t({
        tr: 'Çıkış kaynak empedansı (R1 ∥ R2)',
        en: 'Output source impedance (R1 ∥ R2)',
      }),
      p1: t({ tr: 'R1 gücü', en: 'R1 power' }),
      p2: t({ tr: 'R2 gücü', en: 'R2 power' }),
      totalPower: t({ tr: 'Toplam harcanan güç', en: 'Total dissipated power' }),
    },

    pairsHeading: (series) => t({
      tr: `Aday çiftler — ${series}`,
      en: `Candidate pairs — ${series}`,
    }),
    pairsCols: {
      deviation: t({ tr: 'sapma', en: 'deviation' }),
      pMax: t({ tr: 'P_maks', en: 'P_max' }),
    },
    pairsNote: t({
      tr: 'Satıra tıklayarak çifti seçin. Sıralama ölçütü: gerilim sapması, ardından güç sınırı.',
      en: 'Click a row to select the pair. Sorted by voltage deviation, then power limit.',
    }),

    formula: t({
      tr: `V_out = V_in · R2 / (R1 + R2)

Yük altında:
  R2_eff = R2 · R_L / (R2 + R_L)
  V_out = V_in · R2_eff /
    (R1 + R2_eff)

I_div = V_in / (R1 + R2)
P₁ = I_div²·R1
P₂ = I_div²·R2
Z_out = R1 ∥ R2

Hedeften orana:
  k = V_out / V_in
  R1 / R2 = (1 − k) / k`,
      en: `V_out = V_in · R2 / (R1 + R2)

Under load:
  R2_eff = R2 · R_L / (R2 + R_L)
  V_out = V_in · R2_eff /
    (R1 + R2_eff)

I_div = V_in / (R1 + R2)
P₁ = I_div²·R1
P₂ = I_div²·R2
Z_out = R1 ∥ R2

From target to ratio:
  k = V_out / V_in
  R1 / R2 = (1 − k) / k`,
    }),

    detail: {
      modeSynthesis: t({
        tr: 'Mod: sentez — hedef gerilimden çift aranıyor.',
        en: 'Mode: synthesis — searching for a pair from the target voltage.',
      }),
      modeAnalysis: t({
        tr: 'Mod: analiz — verilen dirençlerden çıkış hesaplanıyor.',
        en: 'Mode: analysis — computing the output from the given resistors.',
      }),
      ratio: (k, ratio) => t({
        tr: `k = V_out / V_in = ${k}; gerekli R1/R2 oranı = ${ratio}.`,
        en: `k = V_out / V_in = ${k}; required R1/R2 ratio = ${ratio}.`,
      }),
      sum: (sum) => t({
        tr: `R1 + R2 = ${sum}; bölücü akımı bu toplamın tersiyle ölçeklenir.`,
        en: `R1 + R2 = ${sum}; the divider current scales with the inverse of this sum.`,
      }),
      loaded: (r2eff) => t({
        tr: `R2 ∥ R_L = ${r2eff} — yükleme etkisi bu eşdeğerden gelir.`,
        en: `R2 ∥ R_L = ${r2eff} — the loading effect comes from this equivalent.`,
      }),
      corners: t({
        tr: 'Worst-case köşeler: V_out(maks) = V_in(maks), R1(min), R2(maks); V_out(min) tersi. '
          + 'Ara noktalar taranmaz, çünkü V_out bu üç değişkende monotondur.',
        en: 'Worst-case corners: V_out(max) = V_in(max), R1(min), R2(max); V_out(min) is the '
          + 'opposite. Intermediate points are not swept because V_out is monotonic in these '
          + 'three variables.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      t({
        tr: 'Model saf DC ve dirençseldir; kaynak iç direnci sıfır, dirençler ideal kabul edilir.',
        en: 'The model is purely DC and resistive; source impedance is taken as zero and the '
          + 'resistors as ideal.',
      }),
      t({
        tr: 'Yük saf direnç olarak modellenir. Kapasitif yük, ADC örnekleme kapasitesi ve giriş '
          + 'kaçak akımı bu hesapta yoktur.',
        en: 'The load is modelled as a pure resistance. Capacitive loading, ADC sampling '
          + 'capacitance and input leakage current are not included.',
      }),
      t({
        tr: 'Direnç sıcaklık katsayısı (TCR) ve öz ısınma dikkate alınmaz; sıcak ortamda gerçek '
          + 'sapma girilen toleransın üzerine çıkabilir.',
        en: 'Resistor temperature coefficient (TCR) and self-heating are ignored; in a hot '
          + 'environment the real deviation can exceed the entered tolerance.',
      }),
      t({
        tr: 'Tolerans analizi worst-case köşe yöntemidir. Gerçek üretim dağılımı istatistikseldir; '
          + 'köşe sonucu karşılaşılacak en kötü durumu verir, tipik durumu değil.',
        en: 'The tolerance analysis uses the worst-case corner method. Real production spread is '
          + 'statistical; the corner result gives the worst case you may encounter, not the '
          + 'typical one.',
      }),
      t({
        tr: 'E serisi değerleri tercih edilen sayı tablolarından gelir; stoktaki gerçek değer ve '
          + 'tolerans üreticiye göre değişir.',
        en: 'E-series values come from the preferred number tables; actual stocked values and '
          + 'tolerances vary by manufacturer.',
      }),
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    sweepGroup: t({ tr: 'Taranan parametre', en: 'Swept parameter' }),
    sweepLabel: {
      RL: t({ tr: 'R_L taraması', en: 'R_L sweep' }),
      R2: t({ tr: 'R2 taraması', en: 'R2 sweep' }),
      R1: t({ tr: 'R1 taraması', en: 'R1 sweep' }),
    },
    sweepAxis: {
      RL: t({ tr: 'Yük direnci R_L (Ω)', en: 'Load resistance R_L (Ω)' }),
      R2: 'R2 (Ω)',
      R1: 'R1 (Ω)',
    },
    sweepCaption: {
      RL: t({
        tr: 'Yük direnci küçüldükçe çıkış düşer. Eğrinin sağ ucundaki düzlük yüksüz çıkıştır; '
          + 'dikleşmeye başladığı bölge bölücünün yükü taşıyamadığı bölgedir.',
        en: 'As the load resistance shrinks the output drops. The flat right end of the curve is '
          + 'the unloaded output; where it starts to steepen, the divider can no longer drive '
          + 'the load.',
      }),
      R2: t({
        tr: 'Diğer değerler sabit tutularak R2 taranır. Eğrinin eğimi, bu direncin üretim '
          + 'toleransının çıkışa ne kadar geçtiğini gösterir.',
        en: 'R2 is swept with the other values held fixed. The slope of the curve shows how much '
          + 'of this resistor’s production tolerance passes through to the output.',
      }),
      R1: t({
        tr: 'Diğer değerler sabit tutularak R1 taranır. Eğrinin eğimi, bu direncin üretim '
          + 'toleransının çıkışa ne kadar geçtiğini gösterir.',
        en: 'R1 is swept with the other values held fixed. The slope of the curve shows how much '
          + 'of this resistor’s production tolerance passes through to the output.',
      }),
    },
    refLabel: {
      target: (y) => t({ tr: `hedef ${fmtVolt(y)}`, en: `target ${fmtVolt(y)}` }),
      open: (y) => t({ tr: `yüksüz ${fmtVolt(y)}`, en: `unloaded ${fmtVolt(y)}` }),
    },
    toleranceBand: t({ tr: 'Tolerans aralığı', en: 'Tolerance band' }),
    toleranceBandLegend: t({ tr: 'tolerans aralığı', en: 'tolerance band' }),
    operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),

    schematic: {
      title: t({ tr: 'Gerilim bölücü devre şeması', en: 'Voltage divider circuit schematic' }),
      captionLoaded: t({ tr: 'Yüklü gerilim bölücü', en: 'Loaded voltage divider' }),
      captionUnloaded: t({
        tr: 'Yüksüz gerilim bölücü — R_L girilirse şemaya eklenir',
        en: 'Unloaded voltage divider — R_L is added to the schematic when entered',
      }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_RATIO:
          return t({
            tr: 'Hedef çıkış giriş geriliminden küçük olmalı. Gerilim bölücü yükseltme yapmaz.',
            en: 'The target output must be below the input voltage. A voltage divider cannot '
              + 'step up.',
          })
        case REASON_NO_PAIR:
          return t({
            tr: 'Verilen direnç aralığında uygun çift bulunamadı. Aralığı genişletin veya daha '
              + 'sık bir E serisi seçin.',
            en: 'No suitable pair was found in the given resistance range. Widen the range or '
              + 'pick a denser E-series.',
          })
        case REASON_RANGE:
          return t({
            tr: 'Girilen değerler geçerli aralıkta değil. En büyük direnç en küçükten büyük olmalı.',
            en: 'The entered values are out of range. The largest resistance must be greater '
              + 'than the smallest.',
          })
        case REASON_INCOMPLETE:
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya '
              + 'virgül kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a positive numeric value in every required field. Use a point or a comma '
              + 'for decimals (0.25 = 0,25).',
          })
      }
    },

    // Mühendislik yorumu — bulgu kodundan cümleye
    findingText: (fd) => {
      switch (fd.code) {
        case 'stiffness':
          return fd.ratio >= fd.threshold
            ? t({
              tr: `Bölücü akımı yük akımının ${fmt(fd.ratio, 3)} katı — yük, çıkışı belirgin `
                + 'biçimde çekmiyor.',
              en: `The divider current is ${fmt(fd.ratio, 3)}× the load current — the load does `
                + 'not pull the output down noticeably.',
            })
            : t({
              tr: `Bölücü akımı yük akımının yalnızca ${fmt(fd.ratio, 3)} katı. Sert bir bölücü `
                + `için ${fd.threshold}× hedeflenir; dirençleri küçültün veya çıkışı bir tampon `
                + 'üzerinden alın.',
              en: `The divider current is only ${fmt(fd.ratio, 3)}× the load current. A stiff `
                + `divider targets ${fd.threshold}×; reduce the resistances or buffer the output.`,
            })

        case 'loading-error':
          return t({
            tr: `Yük, çıkışı ${fmtVolt(fd.unloaded)} → ${fmtVolt(fd.loaded)} `
              + `(${pct(fmtPct(fd.dropPct))}) değiştiriyor.`,
            en: `The load shifts the output ${fmtVolt(fd.unloaded)} → ${fmtVolt(fd.loaded)} `
              + `(${pct(fmtPct(fd.dropPct))}).`,
          })

        case 'power':
          if (fd.limit == null) {
            return t({
              tr: `En yüklü direnç ${fmtPow(fd.Pmax, 3)} harcıyor. Güç sınırı girilirse marj `
                + 'değerlendirilir.',
              en: `The most loaded resistor dissipates ${fmtPow(fd.Pmax, 3)}. Enter a power `
                + 'rating to evaluate the margin.',
            })
          }
          return fd.utilisation <= 1
            ? t({
              tr: `En yüklü direnç ${fmtPow(fd.Pmax, 3)} harcıyor — sınırın `
                + `${pct(fmt(fd.utilisation * 100, 3))}'i.`,
              en: `The most loaded resistor dissipates ${fmtPow(fd.Pmax, 3)} — `
                + `${pct(fmt(fd.utilisation * 100, 3))} of the rating.`,
            })
            : t({
              tr: `En yüklü direnç ${fmtPow(fd.Pmax, 3)} harcıyor, ${fmtPow(fd.limit, 3)} `
                + 'sınırının üzerinde. Daha yüksek dirençler veya daha büyük paket gerekli.',
              en: `The most loaded resistor dissipates ${fmtPow(fd.Pmax, 3)}, above the `
                + `${fmtPow(fd.limit, 3)} rating. Higher resistances or a larger package is `
                + 'needed.',
            })

        case 'quiescent':
          return t({
            tr: `Bölücü sürekli ${fmtAmp(fd.Idiv, 3)} çekiyor (${fmtPow(fd.Pdiv, 3)}). Pil `
              + 'beslemeli tasarımda bu akım hiç kesilmez.',
            en: `The divider continuously draws ${fmtAmp(fd.Idiv, 3)} (${fmtPow(fd.Pdiv, 3)}). `
              + 'In a battery-powered design this current never stops.',
          })

        case 'source-impedance':
          return fd.level === 'ok'
            ? t({
              tr: `Çıkış kaynak empedansı ${fmtRes(fd.Zout, 3)} — çoğu ADC ve op-amp girişi `
                + 'için düşük.',
              en: `The output source impedance is ${fmtRes(fd.Zout, 3)} — low for most ADC and `
                + 'op-amp inputs.',
            })
            : t({
              tr: `Çıkış kaynak empedansı ${fmtRes(fd.Zout, 3)}. Bu değerde giriş kaçak akımı, `
                + 'ADC örnekleme kapasitesi ve gürültü kuplajı ölçülebilir hata üretir.',
              en: `The output source impedance is ${fmtRes(fd.Zout, 3)}. At this value input `
                + 'leakage, ADC sampling capacitance and noise coupling produce measurable error.',
            })

        case 'tolerance-window':
          if (fd.acceptPct == null) {
            return t({
              tr: `Tolerans sonrası çıkış ${fmtVolt(fd.min)} … ${fmtVolt(fd.max)} aralığında `
                + `(${pct(fmtPct(fd.minPct))} / ${pct(fmtPct(fd.maxPct))}).`,
              en: `After tolerances the output spans ${fmtVolt(fd.min)} … ${fmtVolt(fd.max)} `
                + `(${pct(fmtPct(fd.minPct))} / ${pct(fmtPct(fd.maxPct))}).`,
            })
          }
          return fd.level === 'ok'
            ? t({
              tr: `Tolerans sonrası çıkış ${fmtVolt(fd.min)} … ${fmtVolt(fd.max)}; kabul sınırı `
                + `±${pct(fmt(fd.acceptPct, 3))} içinde kalıyor.`,
              en: `After tolerances the output spans ${fmtVolt(fd.min)} … ${fmtVolt(fd.max)}; `
                + `it stays within the ±${pct(fmt(fd.acceptPct, 3))} acceptance limit.`,
            })
            : t({
              tr: `Tolerans sonrası çıkış ${fmtVolt(fd.min)} … ${fmtVolt(fd.max)} `
                + `(${pct(fmtPct(fd.minPct))} / ${pct(fmtPct(fd.maxPct))}) — kabul sınırı `
                + `±${pct(fmt(fd.acceptPct, 3))} dışına çıkıyor.`,
              en: `After tolerances the output spans ${fmtVolt(fd.min)} … ${fmtVolt(fd.max)} `
                + `(${pct(fmtPct(fd.minPct))} / ${pct(fmtPct(fd.maxPct))}) — outside the `
                + `±${pct(fmt(fd.acceptPct, 3))} acceptance limit.`,
            })

        case 'target-error':
          return fd.level === 'ok'
            ? t({
              tr: `Seçilen çift hedefi ${pct(fmtPct(fd.errPct))} sapmayla karşılıyor.`,
              en: `The selected pair meets the target with a ${pct(fmtPct(fd.errPct))} deviation.`,
            })
            : t({
              tr: `Seçilen çift hedeften ${pct(fmtPct(fd.errPct))} sapıyor (sınır `
                + `±${pct(fmt(fd.limit, 3))}). Daha sık bir E serisi deneyin veya aralığı genişletin.`,
              en: `The selected pair deviates from the target by ${pct(fmtPct(fd.errPct))} (limit `
                + `±${pct(fmt(fd.limit, 3))}). Try a denser E-series or widen the range.`,
            })

        default:
          return null
      }
    },
  }
}
