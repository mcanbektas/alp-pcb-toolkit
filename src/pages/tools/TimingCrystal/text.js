// RC/RL zaman sabiti ve kristal ekranının kullanıcıya görünen metinleri —
// iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni, grafik etiketi) fonksiyon olarak
// döner ki mantık tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtEng, fmtRes, fmtAmp, fmtVolt, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  TOOL_RC, TOOL_RL, TOOL_CRYSTAL,
  MODE_SYNTHESIS,
  REASON_NO_SOLUTION, REASON_STRAY, REASON_PIN,
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
      tr: 'RC/RL Zaman Sabiti ve Kristal',
      en: 'RC/RL Time Constant & Crystal',
    }),
    intro: t({
      tr: 'RC ve RL zaman sabitlerini, yükselme sürelerini ve şarj/deşarj eğrilerini; kristal '
        + 'osilatörler için gerekli yük kapasitörlerini hesaplar.',
      en: 'Computes RC and RL time constants, rise times and charge/discharge curves, together '
        + 'with the load capacitors required for crystal oscillators.',
    }),

    toolLabel: {
      [TOOL_RC]: t({ tr: 'RC zaman sabiti', en: 'RC time constant' }),
      [TOOL_RL]: t({ tr: 'RL zaman sabiti', en: 'RL time constant' }),
      [TOOL_CRYSTAL]: t({ tr: 'Kristal yük kapasitesi', en: 'Crystal load capacitance' }),
    },

    modeLabel: {
      [TOOL_RC]: {
        ana: t({ tr: 'Analiz — zaman sabitini bul', en: 'Analysis — find the time constant' }),
        syn: t({ tr: 'Sentez — kapasiteyi bul', en: 'Synthesis — find the capacitance' }),
      },
      [TOOL_RL]: {
        ana: t({ tr: 'Analiz — zaman sabitini bul', en: 'Analysis — find the time constant' }),
        syn: t({ tr: 'Sentez — endüktansı bul', en: 'Synthesis — find the inductance' }),
      },
      [TOOL_CRYSTAL]: {
        ana: t({ tr: 'Analiz — yük kapasitesini bul', en: 'Analysis — find the load capacitance' }),
        syn: t({ tr: 'Sentez — kapasitörleri bul', en: 'Synthesis — find the capacitors' }),
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
      CL: {
        label: t({
          tr: 'Kristal yük kapasitesi (C_L)',
          en: 'Crystal load capacitance (C_L)',
        }),
        hint: t({
          tr: 'Kristalin veri sayfasından okunur',
          en: 'Read from the crystal datasheet',
        }),
      },
      C1: { label: 'C1' },
      C2: { label: 'C2' },
      Cstray: {
        label: t({ tr: 'PCB parazitik kapasitesi', en: 'PCB stray capacitance' }),
        hint: t({
          tr: 'Kısa izlerde tipik olarak 2–5 pF',
          en: 'Typically 2–5 pF with short traces',
        }),
      },
      Cin: {
        label: t({ tr: 'MCU giriş kapasitesi', en: 'MCU input capacitance' }),
        hint: t({
          tr: 'Veri sayfasında verilmişse girin; boş bırakmak basit modeli kullanır',
          en: 'Enter it if the datasheet gives it; leaving it blank uses the simple model',
        }),
      },
      Cout: {
        label: t({ tr: 'MCU çıkış kapasitesi', en: 'MCU output capacitance' }),
      },
      fXtal: {
        label: t({ tr: 'Kristal frekansı (opsiyonel)', en: 'Crystal frequency (optional)' }),
        hint: t({
          tr: 'Yalnızca şemada gösterilir; hesaba girmez',
          en: 'Shown on the schematic only; it does not enter the calculation',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      R: t({ tr: 'Direnç (R)', en: 'Resistance (R)' }),
      Vs: t({ tr: 'Besleme gerilimi', en: 'Supply voltage' }),
      C: t({ tr: 'Kapasite (C)', en: 'Capacitance (C)' }),
      L: t({ tr: 'Endüktans (L)', en: 'Inductance (L)' }),
      targetTau: t({ tr: 'Hedef zaman sabiti', en: 'Target time constant' }),
      Cstray: t({ tr: 'PCB parazitik kapasitesi', en: 'PCB stray capacitance' }),
      Cin: t({ tr: 'MCU giriş kapasitesi', en: 'MCU input capacitance' }),
      Cout: t({ tr: 'MCU çıkış kapasitesi', en: 'MCU output capacitance' }),
      fXtal: t({ tr: 'Kristal frekansı', en: 'Crystal frequency' }),
      C1: 'C1',
      C2: 'C2',
      CL: t({ tr: 'Kristal yük kapasitesi (C_L)', en: 'Crystal load capacitance (C_L)' }),
    },

    big: {
      requiredC: t({ tr: 'Gerekli kapasite', en: 'Required capacitance' }),
      requiredL: t({ tr: 'Gerekli endüktans', en: 'Required inductance' }),
      tau: t({ tr: 'Zaman sabiti (τ)', en: 'Time constant (τ)' }),
      requiredCaps: t({
        tr: 'Gerekli harici kapasitör (C1 = C2)',
        en: 'Required external capacitor (C1 = C2)',
      }),
      loadCap: t({ tr: 'Yük kapasitesi (C_L)', en: 'Load capacitance (C_L)' }),
      crystalAltSyn: (nearest, achieved, err) => t({
        tr: `en yakın E24: ${nearest} pF → C_L = ${achieved} pF (${err})`,
        en: `nearest E24: ${nearest} pF → C_L = ${achieved} pF (${err})`,
      }),
      crystalAltAna: (stray) => t({
        tr: `parazitik ${stray} pF dahil`,
        en: `including ${stray} pF of stray capacitance`,
      }),
    },

    table: {
      tau: t({ tr: 'Zaman sabiti τ', en: 'Time constant τ' }),
      rise: t({ tr: '%10 → %90 yükselme', en: '10% → 90% rise' }),
      settleHead: t({ tr: 'Yerleşme', en: 'Settling' }),
      settleSub: t({ tr: 'süre · ulaşılan oran', en: 'time · fraction reached' }),
      peakCurrent: t({ tr: 'Anahtarlama tepe akımı', en: 'Switching peak current' }),
      steadyCurrent: t({ tr: 'Sürekli rejim akımı', en: 'Steady-state current' }),
      nearestE24: t({ tr: 'En yakın E24 değeri', en: 'Nearest E24 value' }),

      targetCL: t({ tr: 'Hedef C_L', en: 'Target C_L' }),
      computedCaps: t({ tr: 'Hesaplanan C1 = C2', en: 'Computed C1 = C2' }),
      achievedWithComputed: t({
        tr: 'Bu değerle gerçekleşen C_L',
        en: 'C_L achieved with this value',
      }),
      standardHead: t({ tr: 'Standart değerle', en: 'With a standard value' }),
      standardSub: t({ tr: 'kapasitör · C_L · sapma', en: 'capacitor · C_L · deviation' }),
      e24: 'E24',
      achieved: t({ tr: 'Gerçekleşen C_L', en: 'Achieved C_L' }),
      stray: t({ tr: 'PCB parazitik kapasitesi', en: 'PCB stray capacitance' }),
      pinCaps: t({
        tr: 'MCU giriş / çıkış kapasitesi',
        en: 'MCU input / output capacitance',
      }),
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
      [TOOL_CRYSTAL]: t({
        tr: `Genel:
  C_L =
    (C_IN + C1)(C_OUT + C2)
    ──────────────────── + C_stray
    C_IN + C1 + C_OUT + C2

C1 = C2 = C ve giriş
kapasiteleri ihmal edilirse:
  C_L = C/2 + C_stray
  C = 2·(C_L − C_stray)`,
        en: `General:
  C_L =
    (C_IN + C1)(C_OUT + C2)
    ──────────────────── + C_stray
    C_IN + C1 + C_OUT + C2

With C1 = C2 = C and the input
capacitances neglected:
  C_L = C/2 + C_stray
  C = 2·(C_L − C_stray)`,
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
      crystalModel: (simplified) => t({
        tr: `Kullanılan model: ${simplified
          ? 'basitleştirilmiş (giriş kapasiteleri sıfır)'
          : 'genel denklem (giriş kapasiteleri dahil)'}.`,
        en: `Model used: ${simplified
          ? 'simplified (input capacitances zero)'
          : 'the general equation (input capacitances included)'}.`,
      }),
      seriesEquivalent: t({
        tr: 'Harici kapasitörlerin seri eşdeğeri C/2, parazitik doğrudan eklenir.',
        en: 'The series equivalent of the external capacitors is C/2; the stray capacitance is '
          + 'added directly.',
      }),
      slope: t({
        tr: 'Eğrinin eğimi 1/2\'dir: harici kapasitörü 2 pF artırmak C_L\'yi 1 pF artırır.',
        en: 'The slope of the curve is 1/2: increasing the external capacitor by 2 pF increases '
          + 'C_L by 1 pF.',
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
      [TOOL_CRYSTAL]: [
        t({
          tr: 'C1 ve C2 kollarının simetrik olduğu varsayılır.',
          en: 'The C1 and C2 branches are assumed to be symmetric.',
        }),
        t({
          tr: 'Parazitik kapasite tek bir sayıyla temsil edilir; gerçekte iz geometrisine bağlıdır.',
          en: 'The stray capacitance is represented by a single number; in reality it depends on '
            + 'the trace geometry.',
        }),
        t({
          tr: 'Osilatörün negatif direnç marjı bu hesapta yoktur — yük kapasitesi doğru olsa da '
            + 'sürücü gücü yetersiz kalabilir.',
          en: 'The oscillator’s negative-resistance margin is not part of this calculation — even '
            + 'with a correct load capacitance the drive level may still be insufficient.',
        }),
        t({
          tr: 'Kristalin çekme duyarlılığı (ppm/pF) üreticiye göre değişir; frekans kayması burada '
            + 'sayısallaştırılmaz.',
          en: 'The crystal’s pulling sensitivity (ppm/pF) varies between manufacturers; the '
            + 'frequency shift is not quantified here.',
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
      [TOOL_CRYSTAL]: {
        x: t({ tr: 'Harici kapasitör C1 = C2 (pF)', en: 'External capacitor C1 = C2 (pF)' }),
        y: t({ tr: 'Yük kapasitesi C_L (pF)', en: 'Load capacitance C_L (pF)' }),
        caption: t({
          tr: 'Yük kapasitesi harici kapasitörün yarısı artı parazitiklerdir; bu yüzden eğrinin '
            + 'eğimi 1/2\'dir. Hedeften sapma osilatör frekansını kaydırır.',
          en: 'The load capacitance is half the external capacitor plus the parasitics, which is '
            + 'why the slope of the curve is 1/2. A deviation from the target shifts the '
            + 'oscillator frequency.',
        }),
      },

      series: {
        [TOOL_RC]: t({ tr: 'şarj', en: 'charge' }),
        [TOOL_RL]: t({ tr: 'akım', en: 'current' }),
        [TOOL_CRYSTAL]: 'C_L',
      },
      discharge: t({ tr: 'deşarj', en: 'discharge' }),

      // Gösterge (legend) ve referans çizgisi etiketleri: mantık tek kopya,
      // yalnızca dizeler dile göre seçilir.
      legendRef: (key) => {
        if (key === 'final') return t({ tr: 'son değer', en: 'final value' })
        if (key === 'tau') return t({ tr: '1τ seviyesi (%63.2)', en: '1τ level (63.2%)' })
        return t({ tr: 'hedef C_L', en: 'target C_L' })
      },
      refLine: (key, y) => {
        if (key === 'final') return t({ tr: 'son değer', en: 'final value' })
        if (key === 'tau') return t({ tr: '%63.2', en: '63.2%' })
        return t({ tr: `hedef ${fmt(y, 3)} pF`, en: `target ${fmt(y, 3)} pF` })
      },
      markerTiming: '1τ',
      markerCrystal: t({ tr: 'seçilen', en: 'selected' }),
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
        [TOOL_CRYSTAL]: t({
          tr: 'Pierce osilatörü — yük kapasitesi iki kapasitörün seri eşdeğeridir',
          en: 'Pierce oscillator — the load capacitance is the series equivalent of the two '
            + 'capacitors',
        }),
      },
    },

    reasonText: (reason, r) => {
      switch (reason) {
        case REASON_STRAY:
          return t({
            tr: `PCB parazitik kapasitesi (${fmt(r?.Cstray, 3)} pF) hedef yük kapasitesine `
              + `(${fmt(r?.CL, 3)} pF) eşit veya ondan büyük. Harici kapasitör gerekmiyor; iz `
              + 'uzunluğunu kısaltarak parazitiği azaltın.',
            en: `The PCB stray capacitance (${fmt(r?.Cstray, 3)} pF) is equal to or greater than `
              + `the target load capacitance (${fmt(r?.CL, 3)} pF). No external capacitor is `
              + 'needed; reduce the parasitic capacitance by shortening the trace length.',
          })
        case REASON_PIN:
          return t({
            tr: 'MCU pin kapasitesi tek başına hedef yük kapasitesini aşıyor. Bu kristal bu MCU '
              + 'ile doğrudan kullanılamaz; daha yüksek C_L değerli bir kristal seçin.',
            en: 'The MCU pin capacitance alone exceeds the target load capacitance. This crystal '
              + 'cannot be used directly with this MCU; choose a crystal with a higher C_L value.',
          })
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

      if (r.tool === TOOL_CRYSTAL) {
        if (r.mode === MODE_SYNTHESIS) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Hedef ${fmt(r.CL, 3)} pF için gerekli harici kapasitör `
                + `C1 = C2 = ${fmt(r.C, 4)} pF.`,
              en: `For a target of ${fmt(r.CL, 3)} pF the required external capacitor is `
                + `C1 = C2 = ${fmt(r.C, 4)} pF.`,
            }),
          })
          out.push({
            level: Math.abs(r.standardErrPct) <= 5 ? 'ok' : 'warn',
            text: t({
              tr: `En yakın E24 değeri ${fmt(r.nearest.value, 3)} pF ile gerçekleşen yük `
                + `${fmt(r.withStandard, 4)} pF (${pct(fmtPct(r.standardErrPct))}).`,
              en: `With the nearest E24 value of ${fmt(r.nearest.value, 3)} pF the achieved load `
                + `is ${fmt(r.withStandard, 4)} pF (${pct(fmtPct(r.standardErrPct))}).`,
            }),
          })
          out.push({
            level: r.simplified ? 'warn' : 'ok',
            text: r.simplified
              ? t({
                tr: 'MCU pin kapasiteleri sıfır girildi; basitleştirilmiş model kullanıldı. Veri '
                  + 'sayfasındaki giriş/çıkış kapasitesi genellikle 2–7 pF\'tir ve sonucu kaydırır.',
                en: 'The MCU pin capacitances were entered as zero, so the simplified model was '
                  + 'used. The input/output capacitance in the datasheet is usually 2–7 pF and it '
                  + 'shifts the result.',
              })
              : t({
                tr: `MCU pin kapasiteleri hesaba katıldı (ortalama ${fmt(r.Cp, 3)} pF).`,
                en: `The MCU pin capacitances were taken into account (average `
                  + `${fmt(r.Cp, 3)} pF).`,
              }),
          })
        } else {
          out.push({
            level: 'ok',
            text: t({
              tr: `C1 = ${fmt(r.C1, 3)} pF ve C2 = ${fmt(r.C2, 3)} pF ile gerçekleşen yük `
                + `kapasitesi ${fmt(r.achieved, 4)} pF.`,
              en: `With C1 = ${fmt(r.C1, 3)} pF and C2 = ${fmt(r.C2, 3)} pF the achieved load `
                + `capacitance is ${fmt(r.achieved, 4)} pF.`,
            }),
          })
          out.push({
            level: 'ok',
            text: t({
              tr: 'Bu değeri kristalin veri sayfasındaki C_L değeriyle karşılaştırın; eşleşmezse '
                + 'osilatör frekansı kayar.',
              en: 'Compare this value with the C_L value in the crystal datasheet; if they do not '
                + 'match, the oscillator frequency shifts.',
            }),
          })
        }

        out.push({
          level: 'warn',
          text: t({
            tr: 'Yük kapasitesi hedeften düşükse frekans yukarı, yüksekse aşağı kayar. Kayma '
              + 'tipik olarak birkaç ppm mertebesindedir ama zaman tutan uygulamalarda birikir.',
            en: 'If the load capacitance is below the target the frequency shifts up; if it is '
              + 'above, it shifts down. The shift is typically of the order of a few ppm, but it '
              + 'accumulates in timekeeping applications.',
          }),
        })
        out.push({
          level: 'warn',
          text: t({
            tr: 'Parazitik kapasite iz uzunluğuna ve yakın bakıra güçlü biçimde bağlıdır. Kristal '
              + 'MCU\'ya mümkün olduğunca yakın, izler kısa ve altında kesintisiz toprak olacak '
              + 'şekilde yerleştirilmeli.',
            en: 'The stray capacitance depends strongly on the trace length and on nearby copper. '
              + 'The crystal must be placed as close to the MCU as possible, with short traces and '
              + 'an uninterrupted ground underneath.',
          }),
        })
        return out
      }

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
