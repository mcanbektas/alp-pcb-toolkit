// Termal via dizisi ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır.

import { fmt, fmtEng, fmtPow } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  return {
    backlink: t({ tr: '← Via ve Padstack', en: '← Via and Padstack' }),
    title: t({ tr: 'Termal Via Dizisi', en: 'Thermal Via Array' }),
    intro: t({
      tr: 'Via barrel üzerinden katmanlar arası ısı iletimini tahmin eder: tek via ve dizi termal '
        + 'direnci, via sayısına göre göreceli iyileşme ve iletilen ısı.',
      en: 'Estimates layer-to-layer heat conduction through the via barrel: single-via and array '
        + 'thermal resistance, the relative improvement with via count and the heat conducted.',
    }),

    modeGroup: t({ tr: 'Hesap modu', en: 'Calculation mode' }),
    modeAnalysis: t({ tr: 'Analiz — direnci bul', en: 'Analysis — find resistance' }),
    modeSynthesis: t({ tr: 'Sentez — via sayısı bul', en: 'Synthesis — find via count' }),

    fields: {
      Df: {
        label: t({ tr: 'Bitmiş delik çapı (D_f)', en: 'Finished hole diameter (D_f)' }),
        hint: t({
          tr: 'Termal viada tipik 0.2–0.4 mm',
          en: 'Typically 0.2–0.4 mm for thermal vias',
        }),
      },
      tp: { label: t({ tr: 'Kaplama kalınlığı (t_p)', en: 'Plating thickness (t_p)' }) },
      H: { label: t({ tr: 'Via uzunluğu (H)', en: 'Via length (H)' }) },
      N: { label: t({ tr: 'Via sayısı', en: 'Via count' }) },
      Q: { label: t({ tr: 'İletilecek ısı', en: 'Heat to conduct' }) },
      deltaT: {
        label: t({ tr: 'Sıcaklık farkı (ΔT)', en: 'Temperature difference (ΔT)' }),
        hint: t({
          tr: 'Vianın iki ucu arasındaki fark',
          en: 'The difference between the two ends of the via',
        }),
      },
      filled: t({ tr: 'Bakır dolgulu via', en: 'Copper-filled via' }),
      k: {
        label: t({ tr: 'Bakır termal iletkenliği', en: 'Copper thermal conductivity' }),
        hint: t({ tr: 'Tipik aralık 385–400', en: 'Typical range 385–400' }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      Df: t({ tr: 'Bitmiş delik çapı (D_f)', en: 'Finished hole diameter (D_f)' }),
      tp: t({ tr: 'Kaplama kalınlığı (t_p)', en: 'Plating thickness (t_p)' }),
      H: t({ tr: 'Via uzunluğu (H)', en: 'Via length (H)' }),
      k: t({ tr: 'Bakır termal iletkenliği', en: 'Copper thermal conductivity' }),
      deltaT: t({ tr: 'Sıcaklık farkı (ΔT)', en: 'Temperature difference (ΔT)' }),
      N: t({ tr: 'Via sayısı', en: 'Via count' }),
      Q: t({ tr: 'İletilecek ısı', en: 'Heat to conduct' }),
    },

    countUnit: t({ tr: 'adet', en: 'pcs' }),

    bigResult: {
      synthesis: t({ tr: 'Gereken via sayısı', en: 'Required via count' }),
      analysis: t({ tr: 'Dizi termal direnci', en: 'Array thermal resistance' }),
      arrayR: t({ tr: 'dizi direnci', en: 'array resistance' }),
      singleR: t({ tr: 'tek via', en: 'single via' }),
      conducted: t({ tr: 'taşınan', en: 'conducted' }),
    },

    table: {
      area: t({ tr: 'Barrel kesit alanı', en: 'Barrel cross-section area' }),
      fillArea: t({ tr: 'Bakır dolgu alanı', en: 'Copper fill area' }),
      Rsingle: t({ tr: 'Tek via termal direnci', en: 'Single-via thermal resistance' }),
      Rarray: (N) => t({
        tr: `Dizi termal direnci (${N} via)`,
        en: `Array thermal resistance (${N} vias)`,
      }),
      improvement: t({ tr: 'Tek viaya göre iyileşme', en: 'Improvement over one via' }),
      deltaT: t({ tr: 'Sıcaklık farkı', en: 'Temperature difference' }),
      actualQ: t({ tr: 'Tahmini iletilen ısı', en: 'Estimated conducted heat' }),
      Rneeded: t({ tr: 'Hedef için gereken direnç', en: 'Resistance required for the target' }),
    },

    formula: t({
      tr: `A_barrel = π·t_p·(D_f + t_p)
Bakır dolgulu:
    A = A_barrel + π·D_f²/4

Tek via: R_θ = H / (k·A)
N via: R_θ,dizi = R_θ / N

İletilen ısı: Q = ΔT / R_θ

Gerçek toplam yol:
  R_θ,toplam = R_θ,üst yayılım
             + R_θ,vialar
             + R_θ,alt yayılım
             + R_θ,ortam`,
      en: `A_barrel = π·t_p·(D_f + t_p)
Copper-filled:
    A = A_barrel + π·D_f²/4

Single via: R_θ = H / (k·A)
N vias: R_θ,array = R_θ / N

Conducted heat: Q = ΔT / R_θ

Real total path:
  R_θ,total = R_θ,top spreading
            + R_θ,vias
            + R_θ,bottom spreading
            + R_θ,ambient`,
    }),

    detail: {
      conductivity: (k) => t({
        tr: `Kullanılan termal iletkenlik ${fmt(k, 4)} W/(m·K).`,
        en: `Thermal conductivity used: ${fmt(k, 4)} W/(m·K).`,
      }),
      section: (area, H) => t({
        tr: `İletken kesit ${fmtEng(area, 'm²', 5)}; via uzunluğu ${fmtEng(H, 'm', 4)}.`,
        en: `Conducting cross-section ${fmtEng(area, 'm²', 5)}; via length ${fmtEng(H, 'm', 4)}.`,
      }),
      division: t({
        tr: 'Dizi direnci tek via direncinin via sayısına bölümüdür — vialar aynı kabul edilir.',
        en: 'The array resistance is the single-via resistance divided by the via count — the '
          + 'vias are assumed identical.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      t({
        tr: 'Sonuç yalnızca via barrel direncidir. Sistemin toplam termal direnci buna üst ve alt '
          + 'bakır yayılımı ile ortam direncini de ekler; junction sıcaklığı bu hesapla '
          + 'belirlenemez.',
        en: 'The result is only the via barrel resistance. The system’s total thermal resistance '
          + 'adds top and bottom copper spreading and the ambient resistance; the junction '
          + 'temperature cannot be determined from this calculation.',
      }),
      t({
        tr: 'Tüm vialar aynı geometride ve eşit yüklü kabul edilir. Gerçekte kenar vialar merkez '
          + 'vialardan daha çok ısı taşır.',
        en: 'All vias are assumed identical in geometry and equally loaded. In reality edge vias '
          + 'carry more heat than centre vias.',
      }),
      t({
        tr: 'Bakır düzgün kalınlıkta kaplanmış varsayılır; delik ortasında incelme modelde yoktur.',
        en: 'The copper is assumed plated at uniform thickness; thinning at the middle of the '
          + 'hole is not in the model.',
      }),
      t({
        tr: 'Dielektrik üzerinden paralel iletim yolu ihmal edilir — FR-4 bakırın binde biri '
          + 'kadar iletir.',
        en: 'The parallel conduction path through the dielectric is neglected — FR-4 conducts '
          + 'about a thousandth of copper.',
      }),
      t({
        tr: 'Konveksiyon, radyasyon ve komşu bileşenlerin ısısı modelde yoktur.',
        en: 'Convection, radiation and heat from neighbouring components are not in the model.',
      }),
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    chart: {
      x: t({ tr: 'Via sayısı', en: 'Via count' }),
      y: t({ tr: 'Dizi termal direnci (°C/W)', en: 'Array thermal resistance (°C/W)' }),
      caption: t({
        tr: 'Termal direnç via sayısıyla 1/n azalır. Eğri ilk birkaç viadan sonra düzleşir — '
          + 'ondan sonrasında kazanç barrel direncinde değil, bakır yayılımı ve ortam '
          + 'direncindedir.',
        en: 'The thermal resistance falls as 1/n with via count. The curve flattens after the '
          + 'first few vias — beyond that the gain is not in the barrel resistance but in '
          + 'copper spreading and the ambient resistance.',
      }),
      seriesArray: t({ tr: 'dizi termal direnci', en: 'array thermal resistance' }),
      neededLegend: t({ tr: 'hedef için gereken', en: 'required for the target' }),
      refNeeded: (y) => t({
        tr: `gereken ${fmt(y, 3)} °C/W`,
        en: `required ${fmt(y, 3)} °C/W`,
      }),
    },

    schematic: {
      title: t({ tr: 'Termal via dizisi', en: 'Thermal via array' }),
      captionTruncated: (N) => t({
        tr: `${N} via — şemada ilk 36'sı gösteriliyor`,
        en: `${N} vias — the first 36 are shown in the schematic`,
      }),
      caption: t({
        tr: 'Termal ped altındaki via dizisi (üstten görünüş)',
        en: 'Via array under the thermal pad (top view)',
      }),
      pad: t({ tr: 'termal ped', en: 'thermal pad' }),
      filled: t({ tr: 'bakır dolgulu', en: 'copper-filled' }),
      unfilled: t({ tr: 'dolgusuz', en: 'unfilled' }),
      arrayR: t({ tr: 'R_θ dizi', en: 'R_θ array' }),
    },

    reasonText: () => t({
      tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül '
        + 'kullanabilirsiniz (0.25 = 0,25).',
      en: 'Enter a positive numeric value in every required field. Use a point or a comma for '
        + 'decimals (0.25 = 0,25).',
    }),

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: 'ok',
        text: t({
          tr: `Tek via barrel termal direnci ${fmt(r.Rsingle, 4)} °C/W; ${r.N} viayla dizi direnci ${fmt(r.Rarray, 4)} °C/W.`,
          en: `Single-via barrel thermal resistance ${fmt(r.Rsingle, 4)} °C/W; with ${r.N} vias the array resistance is ${fmt(r.Rarray, 4)} °C/W.`,
        }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `${r.N} via, tek viaya göre ${fmt(r.improvementVsOne, 3)} kat iyileşme sağlıyor — bu oran doğrudan via sayısıdır.`,
          en: `${r.N} vias give a ${fmt(r.improvementVsOne, 3)}× improvement over a single via — this ratio is simply the via count.`,
        }),
      })

      if (r.filled) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Bakır dolgu kesiti ${fmtEng(r.fillArea, 'm²', 3)} artırıyor; toplam iletken kesit ${fmtEng(r.area, 'm²', 3)}.`,
            en: `The copper fill adds ${fmtEng(r.fillArea, 'm²', 3)} of cross-section; the total conducting cross-section is ${fmtEng(r.area, 'm²', 3)}.`,
          }),
        })
      } else {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Via dolgusuz kabul edildi; yalnızca barrel duvarı iletiyor. Bakır dolgulu via kesiti belirgin biçimde artırır ama maliyeti yükseltir.',
            en: 'The via is taken as unfilled; only the barrel wall conducts. A copper-filled via increases the cross-section significantly but raises the cost.',
          }),
        })
      }

      if (r.mode === 'syn') {
        out.push({
          level: 'ok',
          text: t({
            tr: `${fmtPow(r.targetQ, 3)} ısıyı ${fmt(r.deltaT, 3)} °C fark altında taşımak için gereken direnç ${fmt(r.Rneeded, 4)} °C/W; ${r.N} via bunu ${fmt(r.Rarray, 4)} °C/W ile karşılıyor.`,
            en: `Carrying ${fmtPow(r.targetQ, 3)} of heat across a ${fmt(r.deltaT, 3)} °C difference requires ${fmt(r.Rneeded, 4)} °C/W; ${r.N} vias meet this with ${fmt(r.Rarray, 4)} °C/W.`,
          }),
        })
        out.push({
          level: 'ok',
          text: t({
            tr: `Bu diziyle taşınabilen ısı ${fmtPow(r.actualQ, 4)} — hedefin ${pct(fmt((r.actualQ / r.targetQ) * 100, 3))}'i.`,
            en: `The heat this array can carry is ${fmtPow(r.actualQ, 4)} — ${pct(fmt((r.actualQ / r.targetQ) * 100, 3))} of the target.`,
          }),
        })
      } else if (r.actualQ != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `${fmt(r.deltaT, 3)} °C fark altında bu dizi ${fmtPow(r.actualQ, 4)} ısı taşır.`,
            en: `Across a ${fmt(r.deltaT, 3)} °C difference this array carries ${fmtPow(r.actualQ, 4)} of heat.`,
          }),
        })
      }

      // Azalan getiri: bir sonraki via ne kadar kazandırıyor
      const gain = r.Rsingle / r.N - r.Rsingle / (r.N + 1)
      const gainPct = (100 * gain) / r.Rarray
      out.push({
        level: gainPct < 5 ? 'warn' : 'ok',
        text: gainPct < 5
          ? t({
            tr: `Bir via daha eklemek diziyi yalnızca ${pct(fmt(gainPct, 3))} iyileştiriyor. Bu noktadan sonra kazanç via eklemekte değil, bakır yayılım alanını büyütmekte.`,
            en: `Adding one more via improves the array by only ${pct(fmt(gainPct, 3))}. Beyond this point the gain is not in adding vias but in enlarging the copper spreading area.`,
          })
          : t({
            tr: `Bir via daha eklemek diziyi ${pct(fmt(gainPct, 3))} iyileştirir.`,
            en: `Adding one more via improves the array by ${pct(fmt(gainPct, 3))}.`,
          }),
      })

      out.push({
        level: 'danger',
        text: t({
          tr: 'Bu değer sistemin toplam termal direnci DEĞİLDİR. Gerçek yol üst bakır yayılımı + vialar + alt bakır yayılımı + ortam direncidir; junction sıcaklığı yalnızca bu hesapla belirlenemez.',
          en: 'This value is NOT the system’s total thermal resistance. The real path is top copper spreading + vias + bottom copper spreading + ambient resistance; the junction temperature cannot be determined from this calculation alone.',
        }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'Via dizisi pad altındaysa lehim akışı ve boşluk oluşumu ayrıca değerlendirilmelidir; dolgusuz via-in-pad lehimi içine çeker.',
          en: 'If the via array sits under a pad, solder wicking and void formation must be evaluated separately; unfilled via-in-pad draws the solder in.',
        }),
      })

      return out
    },
  }
}
