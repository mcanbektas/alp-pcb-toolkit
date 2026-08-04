// RC/RL zaman sabiti ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni, grafik etiketi) fonksiyon olarak
// döner ki mantık tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtEng, fmtRes, fmtAmp, fmtVolt, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  TOOL_RC, TOOL_RL,
  MODE_SYNTHESIS,
  REASON_NO_SOLUTION,
} from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Yüzde işaretinin yeri dile göre değişir: Türkçe %5, İngilizce 5%.
  // Sayının kendisi her iki dilde de fmt() ile üretilir.
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)
  return {
    pct,

    backlink: t({
      tr: '← Komponent ve Devre Hesapları',
      en: '← Component and Circuit Calculators',
    }),
    title: t({
      tr: 'RC/RL Zaman Sabiti',
      en: 'RC/RL Time Constant',
    }),
    intro: t({
      tr: 'RC ve RL zaman sabitlerini, yükselme sürelerini ve şarj/deşarj eğrilerini hesaplar.',
      en: 'Computes RC and RL time constants, rise times and charge/discharge curves.',
    }),

    toolLabel: {
      [TOOL_RC]: t({ tr: 'RC zaman sabiti', en: 'RC time constant' }),
      [TOOL_RL]: t({ tr: 'RL zaman sabiti', en: 'RL time constant' }),
    },

    modeGroup: t({ tr: 'Hesap modu', en: 'Calculation mode' }),
    modeLabel: {
      [TOOL_RC]: {
        ana: t({ tr: 'Analiz — zaman sabitini bul', en: 'Analysis — find the time constant' }),
        syn: t({ tr: 'Sentez — kapasiteyi bul', en: 'Synthesis — find the capacitance' }),
      },
      [TOOL_RL]: {
        ana: t({ tr: 'Analiz — zaman sabitini bul', en: 'Analysis — find the time constant' }),
        syn: t({ tr: 'Sentez — endüktansı bul', en: 'Synthesis — find the inductance' }),
      },
    },

    fields: {
      tool: t({ tr: 'Hesap', en: 'Calculation' }),
      R: { label: t({ tr: 'Direnç (R)', en: 'Resistance (R)' }) },
      C: { label: t({ tr: 'Kapasite (C)', en: 'Capacitance (C)' }) },
      L: { label: t({ tr: 'Endüktans (L)', en: 'Inductance (L)' }) },
      targetTau: {
        label: t({ tr: 'Hedef zaman sabiti (τ)', en: 'Target time constant (τ)' }),
      },
      Vs: {
        label: t({ tr: 'Besleme gerilimi', en: 'Supply voltage' }),
        hint: t({ tr: 'Eğri ve tepe akım için', en: 'For the curve and the peak current' }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      R: t({ tr: 'Direnç (R)', en: 'Resistance (R)' }),
      Vs: t({ tr: 'Besleme gerilimi', en: 'Supply voltage' }),
      C: t({ tr: 'Kapasite (C)', en: 'Capacitance (C)' }),
      L: t({ tr: 'Endüktans (L)', en: 'Inductance (L)' }),
      targetTau: t({ tr: 'Hedef zaman sabiti', en: 'Target time constant' }),
    },

    big: {
      requiredC: t({ tr: 'Gerekli kapasite', en: 'Required capacitance' }),
      requiredL: t({ tr: 'Gerekli endüktans', en: 'Required inductance' }),
      tau: t({ tr: 'Zaman sabiti (τ)', en: 'Time constant (τ)' }),
    },

    table: {
      tau: t({ tr: 'Zaman sabiti τ', en: 'Time constant τ' }),
      rise: t({ tr: '%10 → %90 yükselme', en: '10% → 90% rise' }),
      settleHead: t({ tr: 'Yerleşme', en: 'Settling' }),
      settleSub: t({ tr: 'süre · ulaşılan oran', en: 'time · fraction reached' }),
      peakCurrent: t({ tr: 'Anahtarlama tepe akımı', en: 'Switching peak current' }),
      steadyCurrent: t({ tr: 'Sürekli rejim akımı', en: 'Steady-state current' }),
      nearestE24: t({ tr: 'En yakın E24 değeri', en: 'Nearest E24 value' }),
    },

    formula: {
      [TOOL_RC]: t({
        tr: `τ = R·C

Şarj:
  V_C(t) = V_s·(1 − e^(−t/τ))
Deşarj:
  V_C(t) = V₀·e^(−t/τ)

%10 → %90 yükselme:
  t_r = τ·ln(9) ≈ 2.2·τ
1τ: %63.2   3τ: %95.0   5τ: %99.3`,
        en: `τ = R·C

Charge:
  V_C(t) = V_s·(1 − e^(−t/τ))
Discharge:
  V_C(t) = V₀·e^(−t/τ)

10% → 90% rise:
  t_r = τ·ln(9) ≈ 2.2·τ
1τ: 63.2%   3τ: 95.0%   5τ: 99.3%`,
      }),
      [TOOL_RL]: t({
        tr: `τ = L / R

Akım yükselmesi:
  I(t) = (V/R)·(1 − e^(−t·R/L))

%10 → %90 yükselme:
  t_r = τ·ln(9) ≈ 2.2·τ
1τ: %63.2   3τ: %95.0   5τ: %99.3`,
        en: `τ = L / R

Current rise:
  I(t) = (V/R)·(1 − e^(−t·R/L))

10% → 90% rise:
  t_r = τ·ln(9) ≈ 2.2·τ
1τ: 63.2%   3τ: 95.0%   5τ: 99.3%`,
      }),
    },

    detail: {
      tauSource: (tau, isRc) => t({
        tr: `τ = ${tau}; bu değer ${isRc ? 'R·C' : 'L/R'} çarpımından gelir.`,
        en: `τ = ${tau}; this value comes from ${isRc ? 'R·C' : 'L/R'}.`,
      }),
      supply: (Vs, R) => t({
        tr: `Besleme ${Vs}, seri direnç ${R}.`,
        en: `Supply ${Vs}, series resistance ${R}.`,
      }),
      solved: (method) => t({
        tr: `Değer kapalı formdan başlatılıp ${method} yöntemiyle doğrulandı.`,
        en: `The value was started from the closed form and verified with the ${method} method.`,
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: {
      [TOOL_RC]: [
        t({
          tr: 'Kaynak iç direnci sıfır, kondansatör ideal kabul edilir.',
          en: 'The source internal resistance is taken as zero and the capacitor as ideal.',
        }),
        t({
          tr: 'Kaçak akım ve dielektrik soğurma modelde yoktur; uzun zaman sabitlerinde gerçek '
            + 'davranış sapar.',
          en: 'Leakage current and dielectric absorption are not in the model; at long time '
            + 'constants the real behaviour departs from it.',
        }),
        t({
          tr: 'Yükleme etkisi yoktur — çıkışa bağlanan devre zaman sabitini değiştirir.',
          en: 'There is no loading effect — a circuit connected to the output changes the time '
            + 'constant.',
        }),
      ],
      [TOOL_RL]: [
        t({
          tr: 'Bobin ideal kabul edilir: sargı direnci ve öz kapasite modelde yoktur.',
          en: 'The inductor is taken as ideal: winding resistance and self-capacitance are not in '
            + 'the model.',
        }),
        t({
          tr: 'Sargı direnci gerçek zaman sabitini kısaltır ve son akımı düşürür.',
          en: 'Winding resistance shortens the real time constant and lowers the final current.',
        }),
        t({
          tr: 'Çekirdek doyması dikkate alınmaz; doyan bobinde endüktans düşer.',
          en: 'Core saturation is not taken into account; in a saturating inductor the inductance '
            + 'drops.',
        }),
      ],
      approximate: t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    },

    chart: {
      [TOOL_RC]: {
        x: t({ tr: 'Zaman (s)', en: 'Time (s)' }),
        y: t({ tr: 'Kondansatör gerilimi (V)', en: 'Capacitor voltage (V)' }),
        caption: t({
          tr: 'Şarj eğrisi bir zaman sabitinde son değerin %63.2\'sine, beş zaman sabitinde '
            + '%99.3\'üne ulaşır. Deşarj eğrisi aynı sabitle ters yönde iner.',
          en: 'The charge curve reaches 63.2% of the final value in one time constant and 99.3% in '
            + 'five. The discharge curve falls in the opposite direction with the same constant.',
        }),
      },
      [TOOL_RL]: {
        x: t({ tr: 'Zaman (s)', en: 'Time (s)' }),
        y: t({ tr: 'Bobin akımı (A)', en: 'Inductor current (A)' }),
        caption: t({
          tr: 'Akım aynı üstel yasayla yükselir. Anahtarlama anında bobin akımı sıfırdan başlar; '
            + 'devreyi ani kesmek yüksek gerilim tepesi üretir.',
          en: 'The current rises with the same exponential law. At the instant of switching the '
            + 'inductor current starts from zero; interrupting the circuit abruptly produces a '
            + 'high voltage spike.',
        }),
      },

      series: {
        [TOOL_RC]: t({ tr: 'şarj', en: 'charge' }),
        [TOOL_RL]: t({ tr: 'akım', en: 'current' }),
      },
      discharge: t({ tr: 'deşarj', en: 'discharge' }),

      // Gösterge (legend) ve referans çizgisi etiketleri: mantık tek kopya,
      // yalnızca dizeler dile göre seçilir.
      legendRef: (key) => {
        if (key === 'final') return t({ tr: 'son değer', en: 'final value' })
        return t({ tr: '1τ seviyesi (%63.2)', en: '1τ level (63.2%)' })
      },
      refLine: (key) => {
        if (key === 'final') return t({ tr: 'son değer', en: 'final value' })
        return t({ tr: '%63.2', en: '63.2%' })
      },
      markerTiming: '1τ',
    },

    schematic: {
      title: t({ tr: 'Devre şeması', en: 'Circuit schematic' }),
      caption: {
        [TOOL_RC]: t({
          tr: 'RC kolu — çıkış kondansatör üzerinden alınır',
          en: 'RC branch — the output is taken across the capacitor',
        }),
        [TOOL_RL]: t({
          tr: 'RL kolu — akım bobin üzerinden yükselir',
          en: 'RL branch — the current rises through the inductor',
        }),
      },
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_NO_SOLUTION:
          return t({
            tr: 'Verilen değerler için fiziksel bir çözüm bulunamadı. Değerleri makul aralığa '
              + 'çekin.',
            en: 'No physical solution was found for the given values. Bring the values into a '
              + 'reasonable range.',
          })
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül '
              + 'kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a positive numeric value in every required field. Use a point or a comma '
              + 'for decimals (0.25 = 0,25).',
          })
      }
    },

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      const isRc = r.tool === TOOL_RC
      // Yükselen büyüklüğün adı: RC'de gerilim, RL'de akım. Sözcük çifti
      // burada seçilir; cümlenin kendisi tek kopyadır.
      const quantity = isRc
        ? t({ tr: 'gerilim', en: 'voltage' })
        : t({ tr: 'akım', en: 'current' })

      out.push({
        level: 'ok',
        text: t({
          tr: `Zaman sabiti τ = ${fmtEng(r.tau, 's', 4)}. Bir τ sonunda ${quantity} son değerin `
            + '%63.2\'sine ulaşır.',
          en: `Time constant τ = ${fmtEng(r.tau, 's', 4)}. After one τ the ${quantity} reaches `
            + '63.2% of its final value.',
        }),
      })
      out.push({
        level: 'ok',
        text: t({
          tr: `%10 → %90 yükselme süresi ${fmtEng(r.riseTime1090, 's', 4)}; beş τ `
            + `(${fmtEng(5 * r.tau, 's', 4)}) sonunda pratik olarak yerleşmiş sayılır.`,
          en: `The 10% → 90% rise time is ${fmtEng(r.riseTime1090, 's', 4)}; after five τ `
            + `(${fmtEng(5 * r.tau, 's', 4)}) it is considered practically settled.`,
        }),
      })

      if (r.mode === MODE_SYNTHESIS) {
        // Sentezlenen büyüklük RC'de kapasite, RL'de endüktanstır. Değerler ve
        // sözcük burada seçilir; cümle tek kopya kalır.
        const synth = isRc
          ? {
            word: t({ tr: 'kapasite', en: 'capacitance' }),
            value: fmtEng(r.C, 'F', 4),
            nearest: `${fmt(r.nearestC.value, 3)} nF`,
            err: pct(fmtPct(r.nearestC.errorPct)),
          }
          : {
            word: t({ tr: 'endüktans', en: 'inductance' }),
            value: fmtEng(r.L, 'H', 4),
            nearest: `${fmt(r.nearestL.value, 3)} µH`,
            err: pct(fmtPct(r.nearestL.errorPct)),
          }

        out.push({
          level: 'ok',
          text: t({
            tr: `Hedef zaman sabiti için gerekli ${synth.word} ${synth.value}; en yakın E24 `
              + `değeri ${synth.nearest} (${synth.err}).`,
            en: `The ${synth.word} required for the target time constant is ${synth.value}; the `
              + `nearest E24 value is ${synth.nearest} (${synth.err}).`,
          }),
        })
        out.push({
          level: 'ok',
          text: t({
            tr: `Çözüm sınırlandırılmış kök aramayla doğrulandı (${r.solvedBy}); sonuç fiziksel `
              + 'aralık içinde.',
            en: `The solution was verified with a bounded root search (${r.solvedBy}); the result `
              + 'lies within the physical range.',
          }),
        })
      }

      if (isRc) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Anahtarlama anında dirençten geçen tepe akım ${fmtAmp(r.Ifinal, 3)} `
              + `(${fmtVolt(r.Vs)} / ${fmtRes(r.R, 3)}).`,
            en: `At the instant of switching the peak current through the resistor is `
              + `${fmtAmp(r.Ifinal, 3)} (${fmtVolt(r.Vs)} / ${fmtRes(r.R, 3)}).`,
          }),
        })
        out.push({
          level: 'warn',
          text: t({
            tr: 'Kondansatörün kaçak akımı ve dielektrik soğurması uzun zaman sabitlerinde sonucu '
              + 'bozar. 1 s üzeri sabitlerde film veya düşük kaçaklı tip seçin.',
            en: 'The capacitor’s leakage current and dielectric absorption corrupt the result at '
              + 'long time constants. For constants above 1 s choose a film or low-leakage type.',
          }),
        })
      } else {
        out.push({
          level: 'ok',
          text: t({
            tr: `Sürekli rejimde bobin akımı ${fmtAmp(r.Ifinal, 3)}'e oturur.`,
            en: `In steady state the inductor current settles at ${fmtAmp(r.Ifinal, 3)}.`,
          }),
        })
        out.push({
          level: 'danger',
          text: t({
            tr: 'Bobin akımını ani kesmek büyük bir gerilim tepesi üretir (V = −L·dI/dt). '
              + 'Anahtarlama elemanının yanına sönümleme diyodu veya snubber koyun.',
            en: 'Interrupting the inductor current abruptly produces a large voltage spike '
              + '(V = −L·dI/dt). Place a freewheeling diode or a snubber next to the switching '
              + 'element.',
          }),
        })
      }

      return out
    },
  }
}
