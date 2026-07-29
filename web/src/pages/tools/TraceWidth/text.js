// Trace genişliği ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (uyarı, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtAmp, fmtEng, fmtOhm, fmtVolt, fmtWatt } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  // Geçerlilik uyarısı kodunu cümleye çevirir. Eşikler lib/traceCalc.js'te,
  // cümle burada. Tek kopya: hem sağ paneldeki geçerlilik listesi hem
  // mühendislik yorumu aynı fonksiyonu kullanır.
  const warningText = (w) => {
    switch (w.code) {
      case 'dt-range':
        return t({
          tr: `ΔT = ${w.dT} °C, denklemin tipik geçerlilik aralığı (10–100 °C) dışında.`,
          en: `ΔT = ${w.dT} °C is outside the equation’s typical validity range (10–100 °C).`,
        })
      case 'i-range':
        return t({
          tr: `I = ${w.I} A, denklemin tipik geçerlilik üst sınırının (≈35 A) üzerinde.`,
          en: `I = ${w.I} A is above the equation’s typical upper validity limit (≈35 A).`,
        })
      default:
        return null
    }
  }

  return {
    backlink: t({
      tr: '← PCB Akım, Güç ve Bakır',
      en: '← PCB Current, Power and Copper',
    }),
    title: t({
      tr: 'Yol Genişliği ve Akım Kapasitesi',
      en: 'Trace Width & Current Capacity',
    }),
    intro: t({
      tr: 'Akımdan gerekli yol genişliğini (sentez) ya da mevcut genişliğin akım kapasitesini '
        + '(analiz) hesaplar; direnç, gerilim düşümü, güç kaybı ve akım yoğunluğunu birlikte verir.',
      en: 'Computes the required trace width from the current (synthesis) or the current capacity '
        + 'of an existing width (analysis); reports resistance, voltage drop, power loss and '
        + 'current density together.',
    }),

    modeSynthesis: t({ tr: 'Sentez — genişlik bul', en: 'Synthesis — find width' }),
    modeAnalysis: t({ tr: 'Analiz — kapasite bul', en: 'Analysis — find capacity' }),

    fields: {
      I: { label: t({ tr: 'Akım (I)', en: 'Current (I)' }) },
      W: { label: t({ tr: 'Yol genişliği (W)', en: 'Trace width (W)' }) },
      dT: {
        label: t({
          tr: 'İzin verilen sıcaklık artışı (ΔT)',
          en: 'Allowed temperature rise (ΔT)',
        }),
        hint: t({
          tr: 'Tipik geçerlilik aralığı: 10–100 °C',
          en: 'Typical validity range: 10–100 °C',
        }),
      },
      Ta: { label: t({ tr: 'Ortam sıcaklığı (Tₐ)', en: 'Ambient temperature (Tₐ)' }) },
      layer: { label: t({ tr: 'Katman', en: 'Layer' }) },
      layerExternal: t({ tr: 'Dış katman', en: 'Outer layer' }),
      layerInternal: t({ tr: 'İç katman', en: 'Inner layer' }),
      oz: { label: t({ tr: 'Bakır kalınlığı', en: 'Copper thickness' }) },
      // lib/traceCalc.js OZ_TABLE'daki "custom" satırının ekran karşılığı;
      // sayısal satırların etiketi ("1 oz (35 µm)") dilden bağımsızdır.
      ozCustom: t({ tr: 'Özel kalınlık…', en: 'Custom thickness…' }),
      tCustom: { label: t({ tr: 'Özel bakır kalınlığı', en: 'Custom copper thickness' }) },
      L: {
        label: t({ tr: 'Yol uzunluğu (L)', en: 'Trace length (L)' }),
        hint: t({
          tr: 'Direnç, gerilim düşümü ve güç kaybı için',
          en: 'Used for resistance, voltage drop and power loss',
        }),
      },
      Vs: {
        label: t({ tr: 'Besleme gerilimi (opsiyonel)', en: 'Supply voltage (optional)' }),
        hint: t({
          tr: 'Girilirse yüzdesel gerilim düşümü gösterilir',
          en: 'If entered, the percentage voltage drop is shown',
        }),
        placeholder: t({ tr: 'örn. 3.3', en: 'e.g. 3.3' }),
      },
      margin: {
        label: t({ tr: 'Güvenlik marjı (M)', en: 'Safety margin (M)' }),
        hint: t({
          tr: 'Önerilen üretim genişliği = minimum × (1 + M)',
          en: 'Recommended production width = minimum × (1 + M)',
        }),
      },
      tolCheck: t({ tr: 'Tolerans analizi (worst-case)', en: 'Tolerance analysis (worst-case)' }),
      wTol: { label: t({ tr: 'Genişlik toleransı (±)', en: 'Width tolerance (±)' }) },
      tTol: {
        label: t({
          tr: 'Bakır kalınlığı toleransı (±)',
          en: 'Copper thickness tolerance (±)',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      I: t({ tr: 'Akım (I)', en: 'Current (I)' }),
      dT: t({ tr: 'Sıcaklık artışı (ΔT)', en: 'Temperature rise (ΔT)' }),
      Ta: t({ tr: 'Ortam sıcaklığı (Tₐ)', en: 'Ambient temperature (Tₐ)' }),
      L: t({ tr: 'Yol uzunluğu (L)', en: 'Trace length (L)' }),
      tCustom: t({ tr: 'Özel bakır kalınlığı', en: 'Custom copper thickness' }),
      W: t({ tr: 'Yol genişliği (W)', en: 'Trace width (W)' }),
      margin: t({ tr: 'Güvenlik marjı (M)', en: 'Safety margin (M)' }),
      Vs: t({ tr: 'Besleme gerilimi', en: 'Supply voltage' }),
      wTol: t({ tr: 'Genişlik toleransı', en: 'Width tolerance' }),
      tTol: t({ tr: 'Bakır kalınlığı toleransı', en: 'Copper thickness tolerance' }),
    },

    reasonText: () => t({
      tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül '
        + 'kullanabilirsiniz (0.25 = 0,25).',
      en: 'Enter a positive numeric value in every required field. Use a point or a comma '
        + 'for decimals (0.25 = 0,25).',
    }),

    // Zorunlu uyarı — ampirik sonuç veri tabanlı yöntemin sonucu gibi sunulmaz.
    methodNote: t({
      tr: 'Klasik ampirik yöntem — veri tabanlı hesapla eşdeğer değildir.',
      en: 'Classic empirical method — not equivalent to a data-driven calculation.',
    }),

    bigResultSyn: (M) => t({
      tr: `Önerilen üretim genişliği (marj dahil, ${pct(fmt(M * 100, 3))})`,
      en: `Recommended production width (including the ${pct(fmt(M * 100, 3))} margin)`,
    }),
    bigResultAna: (dT) => t({
      tr: `Maksimum sürekli akım (ΔT = ${fmt(dT, 3)} °C için)`,
      en: `Maximum continuous current (for ΔT = ${fmt(dT, 3)} °C)`,
    }),
    minimumWord: t({ tr: 'minimum:', en: 'minimum:' }),

    table: {
      area: t({ tr: 'Bakır kesit alanı', en: 'Copper cross-section area' }),
      r20: t({ tr: 'Direnç @ 20 °C', en: 'Resistance @ 20 °C' }),
      rAvg: (T) => t({
        tr: `Direnç @ ortalama sıcaklık (${fmt(T, 3)} °C)`,
        en: `Resistance @ average temperature (${fmt(T, 3)} °C)`,
      }),
      rMax: (T) => t({
        tr: `Direnç @ maksimum sıcaklık (${fmt(T, 3)} °C)`,
        en: `Resistance @ maximum temperature (${fmt(T, 3)} °C)`,
      }),
      vdropAvg: t({ tr: 'Gerilim düşümü (ortalama)', en: 'Voltage drop (average)' }),
      vdropMax: t({ tr: 'Gerilim düşümü (worst-case)', en: 'Voltage drop (worst-case)' }),
      // Gerilim düşümünün beslemeye oranı, düşüm değerinin yanında parantez
      // içinde durur; yüzde işaretinin yeri ortak `pct` kalıbından gelir.
      pctOfSupply: (v) => `(${pct(fmt(v, 3))})`,
      ploss: t({ tr: 'Güç kaybı', en: 'Power loss' }),
      perLength: t({ tr: 'Birim uzunluk başına kayıp', en: 'Loss per unit length' }),
      j: t({ tr: 'Akım yoğunluğu', en: 'Current density' }),
      tmax: t({
        tr: 'Tahmini maksimum hat sıcaklığı',
        en: 'Estimated maximum trace temperature',
      }),
    },

    tolSynHeading: t({ tr: 'Tolerans — worst-case', en: 'Tolerance — worst-case' }),
    tolSyn: {
      width: t({ tr: 'En dar üretilmiş genişlik', en: 'Narrowest manufactured width' }),
      copper: t({ tr: 'En ince bakır', en: 'Thinnest copper' }),
      capacity: t({ tr: 'Worst-case akım kapasitesi', en: 'Worst-case current capacity' }),
      sufficient: t({ tr: '≥ hedef akım ✓', en: '≥ target current ✓' }),
      insufficient: t({ tr: '< hedef akım ✗', en: '< target current ✗' }),
    },
    tolAnaHeading: t({
      tr: 'Tolerans — min · nominal · maks',
      en: 'Tolerance — min · nominal · max',
    }),
    tolAna: {
      capacity: t({ tr: 'Akım kapasitesi', en: 'Current capacity' }),
      r20: t({ tr: 'Direnç @ 20 °C', en: 'Resistance @ 20 °C' }),
    },

    formula: t({
      tr: `I = k · ΔT^0.44 · A^0.725
    A: mil²   I: A   ΔT: °C
    k(dış) = 0.048   k(iç) = 0.024

R(T) = ρ₂₀·[1 + α(T − 20)] ·
    L / (W·t)
    ρ₂₀ = 1.724×10⁻⁸ Ω·m
    α = 0.00393 /°C`,
      en: `I = k · ΔT^0.44 · A^0.725
    A: mil²   I: A   ΔT: °C
    k(outer) = 0.048   k(inner) = 0.024

R(T) = ρ₂₀·[1 + α(T − 20)] ·
    L / (W·t)
    ρ₂₀ = 1.724×10⁻⁸ Ω·m
    α = 0.00393 /°C`,
    }),

    detail: {
      method: t({
        tr: 'Yöntem: klasik ampirik iletken ısınma denklemi + sıcaklık düzeltmeli DC direnç '
          + 'modeli.',
        en: 'Method: classic empirical conductor heating equation + temperature-corrected DC '
          + 'resistance model.',
      }),
      kCoeff: (k, layer) => t({
        tr: `Kullanılan katsayı: k = ${k} (${layer === 'external' ? 'dış' : 'iç'} katman).`,
        en: `Coefficient used: k = ${k} (${layer === 'external' ? 'outer' : 'inner'} layer).`,
      }),
      thickness: (t_um, t_mil) => t({
        tr: `Bakır kalınlığı: ${fmt(t_um)} µm = ${fmt(t_mil)} mil.`,
        en: `Copper thickness: ${fmt(t_um)} µm = ${fmt(t_mil)} mil.`,
      }),
      rhoWord: t({ tr: 'Özdirenç', en: 'Resistivity' }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    // Geçerlilik uyarıları — eşikler lib/traceCalc.js'te, metin karşılıkları burada.
    warningText,

    // Mühendislik yorumu. Her bulgu modelin hesapladığı bir değere dayanır;
    // dizinin en kötü seviyesi durum çipini de belirler (CLAUDE.md tek kuralı).
    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      // Aralık dışı girdi altındaki her sonucu nitelediği için başta durur.
      for (const w of r.warnings) {
        const line = warningText(w)
        if (line) out.push({ level: 'danger', text: line })
      }

      if (r.mode === 'syn') {
        out.push({
          level: 'ok',
          text: t({
            tr: `Bu akım için gereken minimum bakır kesiti ${fmt(r.A_mm2, 3)} mm² ve minimum `
              + `genişlik ${fmtEng(r.Wmin_m, 'm', 3)}; ${pct(fmt(r.M * 100, 3))} marjla önerilen `
              + `üretim genişliği ${fmtEng(r.Wrec_m, 'm', 3)}.`,
            en: `The minimum copper cross-section needed for this current is ${fmt(r.A_mm2, 3)} `
              + `mm² and the minimum width is ${fmtEng(r.Wmin_m, 'm', 3)}; with the `
              + `${pct(fmt(r.M * 100, 3))} margin the recommended production width is `
              + `${fmtEng(r.Wrec_m, 'm', 3)}.`,
          }),
        })

        if (r.tol) {
          out.push({
            level: r.tol.sufficient ? 'ok' : 'warn',
            text: r.tol.sufficient
              ? t({
                tr: `Worst-case kesitte (genişlik ${fmtEng(r.tol.Wwc_m, 'm', 3)}, bakır `
                  + `${fmt(r.tol.twc_um, 3)} µm) kapasite ${fmtAmp(r.tol.ImaxWc, 3)} — hedef `
                  + `${fmtAmp(r.I, 3)} akımın üstünde; seçilen marj bu toleransı karşılıyor.`,
                en: `At the worst-case cross-section (width ${fmtEng(r.tol.Wwc_m, 'm', 3)}, `
                  + `copper ${fmt(r.tol.twc_um, 3)} µm) the capacity is `
                  + `${fmtAmp(r.tol.ImaxWc, 3)} — above the ${fmtAmp(r.I, 3)} target, so the `
                  + 'chosen margin covers this tolerance.',
              })
              : t({
                tr: `Worst-case kesitte (genişlik ${fmtEng(r.tol.Wwc_m, 'm', 3)}, bakır `
                  + `${fmt(r.tol.twc_um, 3)} µm) kapasite ${fmtAmp(r.tol.ImaxWc, 3)} — hedef `
                  + `${fmtAmp(r.I, 3)} akımın altında. Marjı büyütmek ya da daha kalın bakır `
                  + 'seçmek gerekir.',
                en: `At the worst-case cross-section (width ${fmtEng(r.tol.Wwc_m, 'm', 3)}, `
                  + `copper ${fmt(r.tol.twc_um, 3)} µm) the capacity is `
                  + `${fmtAmp(r.tol.ImaxWc, 3)} — below the ${fmtAmp(r.I, 3)} target. The `
                  + 'margin must be increased or a thicker copper chosen.',
              }),
          })
        }
      } else {
        out.push({
          level: r.util > 1 ? 'danger' : r.util > 0.8 ? 'warn' : 'ok',
          text: r.util > 1
            ? t({
              tr: `${fmtEng(r.W_m, 'm', 3)} genişlik ΔT = ${fmt(r.dT, 3)} °C'de `
                + `${fmtAmp(r.Imax, 3)} taşır; ${fmtAmp(r.I, 3)} için kullanım oranı `
                + `${pct(fmt(r.util * 100, 3))}. Bu genişlik hedef akım için yetersiz — `
                + 'genişliği artırın, bakırı kalınlaştırın ya da daha yüksek ΔT kabul edin.',
              en: `A width of ${fmtEng(r.W_m, 'm', 3)} carries ${fmtAmp(r.Imax, 3)} at `
                + `ΔT = ${fmt(r.dT, 3)} °C; at ${fmtAmp(r.I, 3)} the utilisation is `
                + `${pct(fmt(r.util * 100, 3))}. This width is not sufficient for the target `
                + 'current — widen the trace, use thicker copper or accept a higher ΔT.',
            })
            : r.util > 0.8
              ? t({
                tr: `${fmtEng(r.W_m, 'm', 3)} genişlik ΔT = ${fmt(r.dT, 3)} °C'de `
                  + `${fmtAmp(r.Imax, 3)} taşır; ${fmtAmp(r.I, 3)} için kullanım oranı `
                  + `${pct(fmt(r.util * 100, 3))}. Kapasitenin sınırına yakın çalışılıyor; `
                  + 'üretim toleransı ve ortam sıcaklığı bu payı hızla tüketir.',
                en: `A width of ${fmtEng(r.W_m, 'm', 3)} carries ${fmtAmp(r.Imax, 3)} at `
                  + `ΔT = ${fmt(r.dT, 3)} °C; at ${fmtAmp(r.I, 3)} the utilisation is `
                  + `${pct(fmt(r.util * 100, 3))}. This runs close to the capacity limit; `
                  + 'manufacturing tolerance and ambient temperature consume that headroom fast.',
              })
              : t({
                tr: `${fmtEng(r.W_m, 'm', 3)} genişlik ΔT = ${fmt(r.dT, 3)} °C'de `
                  + `${fmtAmp(r.Imax, 3)} taşır; ${fmtAmp(r.I, 3)} için kullanım oranı `
                  + `${pct(fmt(r.util * 100, 3))}.`,
                en: `A width of ${fmtEng(r.W_m, 'm', 3)} carries ${fmtAmp(r.Imax, 3)} at `
                  + `ΔT = ${fmt(r.dT, 3)} °C; at ${fmtAmp(r.I, 3)} the utilisation is `
                  + `${pct(fmt(r.util * 100, 3))}.`,
              }),
        })

        if (r.tol) {
          const tolOk = r.tol.ImaxMin >= r.I
          out.push({
            level: tolOk ? 'ok' : 'warn',
            text: tolOk
              ? t({
                tr: `Tolerans bandında kapasite ${fmtAmp(r.tol.ImaxMin, 3)} … `
                  + `${fmtAmp(r.tol.ImaxMax, 3)}, 20 °C direnci ${fmtOhm(r.tol.R20Min)} … `
                  + `${fmtOhm(r.tol.R20Max)} arasında değişir; en dar ve en ince üretim `
                  + `durumunda bile kapasite hedef akımın (${fmtAmp(r.I, 3)}) üstünde kalır.`,
                en: `Across the tolerance band the capacity ranges from `
                  + `${fmtAmp(r.tol.ImaxMin, 3)} to ${fmtAmp(r.tol.ImaxMax, 3)} and the 20 °C `
                  + `resistance from ${fmtOhm(r.tol.R20Min)} to ${fmtOhm(r.tol.R20Max)}; even at `
                  + `the narrowest and thinnest build the capacity stays above the `
                  + `${fmtAmp(r.I, 3)} target.`,
              })
              : t({
                tr: `Tolerans bandında kapasite ${fmtAmp(r.tol.ImaxMin, 3)} … `
                  + `${fmtAmp(r.tol.ImaxMax, 3)}, 20 °C direnci ${fmtOhm(r.tol.R20Min)} … `
                  + `${fmtOhm(r.tol.R20Max)} arasında değişir; en dar ve en ince üretim `
                  + `durumunda kapasite hedef akımın (${fmtAmp(r.I, 3)}) altına düşer.`,
                en: `Across the tolerance band the capacity ranges from `
                  + `${fmtAmp(r.tol.ImaxMin, 3)} to ${fmtAmp(r.tol.ImaxMax, 3)} and the 20 °C `
                  + `resistance from ${fmtOhm(r.tol.R20Min)} to ${fmtOhm(r.tol.R20Max)}; at the `
                  + `narrowest and thinnest build the capacity falls below the `
                  + `${fmtAmp(r.I, 3)} target.`,
              }),
          })
        }
      }

      out.push({
        level: 'ok',
        text: t({
          tr: `Tahmini maksimum hat sıcaklığı Tₐ + ΔT = ${fmt(r.e.Tmax, 3)} °C; direnç 20 °C'de `
            + `${fmtOhm(r.e.R20)}, bu sıcaklıkta ${fmtOhm(r.e.Rmax)}.`,
          en: `The estimated maximum trace temperature is Tₐ + ΔT = ${fmt(r.e.Tmax, 3)} °C; the `
            + `resistance is ${fmtOhm(r.e.R20)} at 20 °C and ${fmtOhm(r.e.Rmax)} at that `
            + 'temperature.',
        }),
      })

      out.push({
        level: 'ok',
        text: r.e.pctMax !== null
          ? t({
            tr: `Worst-case gerilim düşümü ${fmtVolt(r.e.VdropMax)} (beslemeye oranı `
              + `${pct(fmt(r.e.pctMax, 3))}); güç kaybı ${fmtWatt(r.e.Ploss)}, birim uzunluk `
              + `başına ${fmtEng(r.e.PperLength, 'W/m', 3)}.`,
            en: `The worst-case voltage drop is ${fmtVolt(r.e.VdropMax)} `
              + `(${pct(fmt(r.e.pctMax, 3))} of the supply); the power loss is `
              + `${fmtWatt(r.e.Ploss)}, or ${fmtEng(r.e.PperLength, 'W/m', 3)} per unit length.`,
          })
          : t({
            tr: `Worst-case gerilim düşümü ${fmtVolt(r.e.VdropMax)}, güç kaybı `
              + `${fmtWatt(r.e.Ploss)} (birim uzunluk başına `
              + `${fmtEng(r.e.PperLength, 'W/m', 3)}). Besleme gerilimi girilirse düşümün `
              + 'yüzdesi de gösterilir.',
            en: `The worst-case voltage drop is ${fmtVolt(r.e.VdropMax)} and the power loss `
              + `${fmtWatt(r.e.Ploss)} (${fmtEng(r.e.PperLength, 'W/m', 3)} per unit length). `
              + 'Enter the supply voltage to also see the drop as a percentage.',
          }),
      })

      return out
    },

    validity: [
      t({
        tr: 'Yaklaşık geçerlilik: I ≤ ~35 A, ΔT 10–100 °C, tekil düz hat.',
        en: 'Approximate validity: I ≤ ~35 A, ΔT 10–100 °C, a single straight trace.',
      }),
      t({
        tr: 'Bitişik sıcak hatlar, bakır düzlemler, hava akışı ve kart kalınlığı modelde yoktur.',
        en: 'Adjacent hot traces, copper planes, airflow and board thickness are not in the '
          + 'model.',
      }),
      t({
        tr: 'İç katman katsayısı konservatiftir; gerçek kapasite kart yapısına göre değişir.',
        en: 'The inner-layer coefficient is conservative; the real capacity depends on the '
          + 'board construction.',
      }),
      t({
        tr: 'Kesit dikdörtgen kabul edilir; aşındırmadan gelen trapez kesit modelde yoktur.',
        en: 'The cross-section is assumed rectangular; the trapezoidal cross-section from '
          + 'etching is not in the model.',
      }),
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    layerSeries: {
      external: t({ tr: 'dış katman', en: 'outer layer' }),
      internal: t({ tr: 'iç katman', en: 'inner layer' }),
    },

    chart: {
      x: t({ tr: 'Yol genişliği W (mm)', en: 'Trace width W (mm)' }),
      y: t({ tr: 'Kapasite (A)', en: 'Capacity (A)' }),
      caption: t({
        tr: 'Kesit alanı arttıkça akım kapasitesi artar; eğri ampirik ısınma denkleminden gelir. '
          + 'İkinci eğri diğer katman türünü gösterir — iç katman aynı genişlikte daha az akım '
          + 'taşır. Yatay çizgi hedef akımdır; çalışma noktası bunun üzerindeyse kapasite '
          + 'yeterlidir.',
        en: 'Current capacity grows with cross-section area; the curve comes from the empirical '
          + 'heating equation. The second curve shows the other layer type — an inner layer '
          + 'carries less current at the same width. The horizontal line is the target current; '
          + 'if the operating point sits above it, the capacity is sufficient.',
      }),
      targetLegend: (I) => t({
        tr: `hedef akım ${fmt(I, 3)} A`,
        en: `target current ${fmt(I, 3)} A`,
      }),
      targetRef: (I) => t({ tr: `hedef ${fmt(I, 3)} A`, en: `target ${fmt(I, 3)} A` }),
      operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),
    },

    schematic: {
      title: t({ tr: 'Yol kesiti', en: 'Trace cross-section' }),
      captionInner: t({
        tr: 'İç katman — dielektrik içinde gömülü',
        en: 'Inner layer — buried in the dielectric',
      }),
      captionOuter: t({ tr: 'Dış katman — üstü açık', en: 'Outer layer — exposed on top' }),
      innerLabel: t({ tr: 'iç katman', en: 'inner layer' }),
      outerLabel: t({ tr: 'dış katman', en: 'outer layer' }),
    },
  }
}
