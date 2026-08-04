// RLC rezonans ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtRes, fmtEng, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  MODE_ANALYSIS, MODE_SYNTHESIS, REASON_NO_SOLUTION,
} from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)
  const kindLabel = {
    resistive: t({ tr: 'saf dirençsel (rezonans)', en: 'purely resistive (resonance)' }),
    inductive: t({ tr: 'endüktif', en: 'inductive' }),
    capacitive: t({ tr: 'kapasitif', en: 'capacitive' }),
  }

  return {
    backlink: t({
      tr: '← Komponent ve Devre Hesapları',
      en: '← Component and Circuit Calculators',
    }),
    title: t({ tr: 'RLC Rezonans', en: 'RLC Resonance' }),
    intro: t({
      tr: 'Seri RLC devresinin empedansını, rezonans frekansını ve kalite faktörünü hesaplar; '
        + 'hedef bir rezonans frekansı için gereken kapasiteyi de bulur.',
      en: 'Computes the impedance, resonant frequency and quality factor of a series RLC '
        + 'circuit; it also finds the capacitance required for a target resonant frequency.',
    }),

    pct,
    kindLabel,

    modeGroup: t({ tr: 'Hesap modu', en: 'Calculation mode' }),
    modeLabel: {
      [MODE_ANALYSIS]: t({
        tr: 'Analiz — empedansı bul',
        en: 'Analysis — find the impedance',
      }),
      [MODE_SYNTHESIS]: t({
        tr: 'Sentez — kapasiteyi bul',
        en: 'Synthesis — find the capacitance',
      }),
    },

    fields: {
      blankPlaceholder: t({ tr: 'boş = hesapla', en: 'blank = compute' }),

      Rr: { label: t({ tr: 'Direnç (R)', en: 'Resistance (R)' }) },
      L: { label: t({ tr: 'Endüktans (L)', en: 'Inductance (L)' }) },
      C: { label: t({ tr: 'Kapasite (C)', en: 'Capacitance (C)' }) },
      freq: { label: t({ tr: 'Frekans (f)', en: 'Frequency (f)' }) },
      targetF0: {
        label: t({ tr: 'Hedef rezonans frekansı', en: 'Target resonant frequency' }),
        hint: t({
          tr: 'Gerekli kapasite sınırlandırılmış kök aramayla bulunur',
          en: 'The required capacitance is found with a bounded root search',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      Rr: t({ tr: 'Direnç (R)', en: 'Resistance (R)' }),
      L: t({ tr: 'Endüktans (L)', en: 'Inductance (L)' }),
      C: t({ tr: 'Kapasite (C)', en: 'Capacitance (C)' }),
      freq: t({ tr: 'Frekans (f)', en: 'Frequency (f)' }),
      targetF0: t({ tr: 'Hedef rezonans frekansı', en: 'Target resonant frequency' }),
    },

    big: {
      synthesisLabel: t({ tr: 'Gerekli kapasite', en: 'Required capacitance' }),
      analysisLabel: (f) => t({ tr: `Empedans @ ${f}`, en: `Impedance @ ${f}` }),
    },

    table: {
      XL: t({ tr: 'Endüktif reaktans X_L', en: 'Inductive reactance X_L' }),
      XC: t({ tr: 'Kapasitif reaktans X_C', en: 'Capacitive reactance X_C' }),
      X: t({ tr: 'Net reaktans X', en: 'Net reactance X' }),
      magnitude: t({ tr: 'Empedans büyüklüğü |Z|', en: 'Impedance magnitude |Z|' }),
      phase: t({ tr: 'Faz açısı', en: 'Phase angle' }),
      f0: t({ tr: 'Rezonans frekansı f₀', en: 'Resonant frequency f₀' }),
      Q: t({ tr: 'Kalite faktörü Q', en: 'Quality factor Q' }),
      BW: t({ tr: 'Bant genişliği', en: 'Bandwidth' }),
      nearestC: t({ tr: 'En yakın E24 kapasite', en: 'Nearest E24 capacitance' }),
    },

    formula: t({
      tr: `X_L = 2πfL
X_C = 1/(2πfC)
Z = R + j(X_L − X_C)
|Z| = √(R² + (X_L − X_C)²)
φ = atan[(X_L − X_C)/R]

f₀ = 1/(2π√(LC))
Q = ω₀L/R = 1/(ω₀CR)
BW = f₀/Q`,
      en: `X_L = 2πfL
X_C = 1/(2πfC)
Z = R + j(X_L − X_C)
|Z| = √(R² + (X_L − X_C)²)
φ = atan[(X_L − X_C)/R]

f₀ = 1/(2π√(LC))
Q = ω₀L/R = 1/(ω₀CR)
BW = f₀/Q`,
    }),

    detail: (r) => {
      const out = [
        `ω = 2πf = ${fmtEng(2 * Math.PI * r.f, 'rad/s', 4)}.`,
        t({
          tr: `X_L − X_C = ${fmtRes(r.X, 5)}; işareti devrenin karakterini belirler.`,
          en: `X_L − X_C = ${fmtRes(r.X, 5)}; its sign determines the character of the circuit.`,
        }),
        t({
          tr: 'Q iki tanımdan da aynı çıkar: ω₀L/R ve 1/(ω₀CR).',
          en: 'Q comes out the same from both definitions: ω₀L/R and 1/(ω₀CR).',
        }),
      ]
      if (r.mode === MODE_SYNTHESIS) {
        out.push(t({
          tr: `Kapasite kapalı formdan başlatılıp ${r.solvedBy} yöntemiyle doğrulandı.`,
          en: `The capacitance was started from the closed form and verified with the `
            + `${r.solvedBy} method.`,
        }))
      }
      return out
    },

    validity: [
      t({
        tr: 'Komponentler ideal kabul edilir: kondansatörde ESR/ESL, bobinde öz kapasite ve '
          + 'kayıp yoktur.',
        en: 'The components are taken as ideal: the capacitor has no ESR/ESL and the inductor no '
          + 'self-capacitance and no loss.',
      }),
      t({
        tr: 'Yüksek frekansta gerçek empedans bu modelden belirgin biçimde sapar.',
        en: 'At high frequency the real impedance departs noticeably from this model.',
      }),
      t({
        tr: 'Model seri RLC içindir; paralel rezonans devresi farklı davranır.',
        en: 'The model is for a series RLC; a parallel resonant circuit behaves differently.',
      }),
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    chart: {
      x: t({ tr: 'Frekans (Hz)', en: 'Frequency (Hz)' }),
      y: '|Z| (Ω)',
      caption: t({
        tr: 'Rezonansta endüktif ve kapasitif reaktans birbirini götürür, empedans direnç '
          + 'değerine iner. Çukurun genişliği kalite faktörüyle ters orantılıdır.',
        en: 'At resonance the inductive and capacitive reactances cancel each other and the '
          + 'impedance falls to the resistance value. The width of the notch is inversely '
          + 'proportional to the quality factor.',
      }),
      resistanceLegend: t({
        tr: 'direnç değeri (rezonans tabanı)',
        en: 'resistance value (resonance floor)',
      }),
      marker: t({ tr: 'çalışma noktası', en: 'operating point' }),
    },

    schematic: {
      title: t({ tr: 'Devre şeması', en: 'Circuit diagram' }),
      caption: t({ tr: 'Seri RLC kolu', en: 'Series RLC branch' }),
    },

    reasonText: (reason, r) => {
      switch (reason) {
        case REASON_NO_SOLUTION:
          return t({
            tr: 'Verilen endüktans ve hedef frekans için fiziksel bir kapasite değeri bulunamadı. '
              + 'Değerleri makul aralığa çekin.',
            en: 'No physical capacitance value was found for the given inductance and target '
              + 'frequency. Bring the values into a reasonable range.',
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

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: 'ok',
        text: t({
          tr: `Rezonans frekansı ${fmtEng(r.f0, 'Hz', 4)}; bu noktada empedans direnç değerine `
            + `(${fmtRes(r.R, 3)}) iner.`,
          en: `The resonant frequency is ${fmtEng(r.f0, 'Hz', 4)}; at that point the impedance `
            + `falls to the resistance value (${fmtRes(r.R, 3)}).`,
        }),
      })
      out.push({
        level: 'ok',
        text: t({
          tr: `${fmtEng(r.f, 'Hz', 4)} frekansında devre ${kindLabel[r.kind]}: `
            + `|Z| = ${fmtRes(r.magnitude, 4)}, faz ${fmt(r.phaseDeg, 3)}°.`,
          en: `At ${fmtEng(r.f, 'Hz', 4)} the circuit is ${kindLabel[r.kind]}: `
            + `|Z| = ${fmtRes(r.magnitude, 4)}, phase ${fmt(r.phaseDeg, 3)}°.`,
        }),
      })
      out.push({
        level: r.Q > 50 ? 'warn' : 'ok',
        text: r.Q > 50
          ? t({
            tr: `Kalite faktörü ${fmt(r.Q, 4)} yüksek, bant genişliği `
              + `${fmtEng(r.BW, 'Hz', 3)} dar. Bu kadar keskin bir tepki komponent toleransına `
              + 'çok duyarlıdır; gerçek rezonans hesaplanandan kayabilir.',
            en: `The quality factor ${fmt(r.Q, 4)} is high and the bandwidth `
              + `${fmtEng(r.BW, 'Hz', 3)} is narrow. A response this sharp is very sensitive to `
              + 'component tolerance; the real resonance can shift away from the computed one.',
          })
          : t({
            tr: `Kalite faktörü ${fmt(r.Q, 4)}, bant genişliği ${fmtEng(r.BW, 'Hz', 3)}.`,
            en: `Quality factor ${fmt(r.Q, 4)}, bandwidth ${fmtEng(r.BW, 'Hz', 3)}.`,
          }),
      })
      if (r.mode === MODE_SYNTHESIS) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Hedef frekans için gerekli kapasite ${fmtEng(r.C, 'F', 4)}; en yakın E24 değeri `
              + `${fmt(r.nearestC.value, 4)} pF (${pct(fmtPct(r.nearestC.errorPct))}).`,
            en: `The capacitance required for the target frequency is ${fmtEng(r.C, 'F', 4)}; `
              + `the nearest E24 value is ${fmt(r.nearestC.value, 4)} pF `
              + `(${pct(fmtPct(r.nearestC.errorPct))}).`,
          }),
        })
        out.push({
          level: 'ok',
          text: t({
            tr: `Kök sınırlandırılmış aramayla doğrulandı (${r.solvedBy}); sonuç fiziksel aralık `
              + 'içinde.',
            en: `The root was verified with a bounded search (${r.solvedBy}); the result is `
              + 'within the physical range.',
          }),
        })
      }
      out.push({
        level: 'warn',
        text: t({
          tr: 'Model ideal komponent varsayar. Gerçek kondansatörün ESR ve ESL\'si, bobinin öz '
            + 'kapasitesi ve kayıpları yüksek frekansta sonucu değiştirir.',
          en: 'The model assumes ideal components. The ESR and ESL of a real capacitor, and the '
            + 'self-capacitance and losses of a real inductor, change the result at high '
            + 'frequency.',
        }),
      })
      return out
    },
  }
}
