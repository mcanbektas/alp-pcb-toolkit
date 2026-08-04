// Kristal yük kapasitansı ekranının kullanıcıya görünen metinleri — iki dilli
// (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni, grafik etiketi) fonksiyon olarak
// döner ki mantık tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  TOOL_CRYSTAL, MODE_SYNTHESIS, REASON_STRAY, REASON_PIN,
} from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Yüzde işaretinin yeri dile göre değişir: Türkçe %5, İngilizce 5%.
  // Sayının kendisi her iki dilde de fmt() ile üretilir. Kalıp uiText.js'te
  // tek yerdedir.
  const { pct } = commonText(lang)
  return {
    pct,

    backlink: t({
      tr: '← Komponent ve Devre Hesapları',
      en: '← Component and Circuit Calculators',
    }),
    title: t({
      tr: 'Kristal Yük Kapasitesi',
      en: 'Crystal Load Capacitance',
    }),
    intro: t({
      tr: 'Kristal osilatörler için gerekli yük kapasitörlerini hesaplar.',
      en: 'Computes the load capacitors required for crystal oscillators.',
    }),

    modeGroup: t({ tr: 'Hesap modu', en: 'Calculation mode' }),
    modeAnalysis: t({ tr: 'Analiz — yük kapasitesini bul', en: 'Analysis — find the load capacitance' }),
    modeSynthesis: t({ tr: 'Sentez — kapasitörleri bul', en: 'Synthesis — find the capacitors' }),

    fields: {
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
      Cstray: t({ tr: 'PCB parazitik kapasitesi', en: 'PCB stray capacitance' }),
      Cin: t({ tr: 'MCU giriş kapasitesi', en: 'MCU input capacitance' }),
      Cout: t({ tr: 'MCU çıkış kapasitesi', en: 'MCU output capacitance' }),
      fXtal: t({ tr: 'Kristal frekansı', en: 'Crystal frequency' }),
      C1: 'C1',
      C2: 'C2',
      CL: t({ tr: 'Kristal yük kapasitesi (C_L)', en: 'Crystal load capacitance (C_L)' }),
    },

    big: {
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

    formula: t({
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

    detail: {
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
    },

    validity: [
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
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    chart: {
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
        [TOOL_CRYSTAL]: 'C_L',
      },

      // Gösterge (legend) ve referans çizgisi etiketleri: tek olası ref
      // 'target' anahtarıdır (sentez modunda hedef C_L çizgisi).
      legendRef: () => t({ tr: 'hedef C_L', en: 'target C_L' }),
      refLine: (key, y) => t({ tr: `hedef ${fmt(y, 3)} pF`, en: `target ${fmt(y, 3)} pF` }),
      markerCrystal: t({ tr: 'seçilen', en: 'selected' }),
    },

    schematic: {
      title: t({ tr: 'Devre şeması', en: 'Circuit schematic' }),
      caption: t({
        tr: 'Pierce osilatörü — yük kapasitesi iki kapasitörün seri eşdeğeridir',
        en: 'Pierce oscillator — the load capacitance is the series equivalent of the two '
          + 'capacitors',
      }),
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
    },
  }
}
