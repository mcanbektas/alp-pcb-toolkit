// LED seri direnci ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.
//
// Brif 11 §C: LedOhmRlc'nin TOOL_LED alt-aracından bölündü — davranış birebir
// korunur, yeni özellik eklenmedi.

import { fmt, fmtRes, fmtAmp, fmtPow, fmtVolt, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import { REASON_LED_HEADROOM } from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  return {
    backlink: t({
      tr: '← Komponent ve Devre Hesapları',
      en: '← Component and Circuit Calculators',
    }),
    title: t({
      tr: 'LED Seri Direnci',
      en: 'LED Series Resistor',
    }),
    intro: t({
      tr: 'LED seri direncini hesaplar; standart değer karşılıkları, güç marjı ve '
        + 'parlaklık/akım grafiğiyle birlikte verir.',
      en: 'Computes the LED series resistor; the result comes with its standard-value '
        + 'equivalents, power margin and a brightness/current chart.',
    }),

    pct,

    fields: {
      blankPlaceholder: t({ tr: 'boş = hesapla', en: 'blank = compute' }),
      countUnit: t({ tr: 'adet', en: 'pcs' }),

      Vs: { label: t({ tr: 'Besleme gerilimi (V_s)', en: 'Supply voltage (V_s)' }) },
      Vf: {
        label: t({ tr: 'LED ileri gerilimi (V_f)', en: 'LED forward voltage (V_f)' }),
        hint: t({
          tr: 'Kırmızı ≈ 1.8–2.2 V, yeşil/mavi/beyaz ≈ 2.8–3.4 V',
          en: 'Red ≈ 1.8–2.2 V, green/blue/white ≈ 2.8–3.4 V',
        }),
      },
      n: { label: t({ tr: 'Seri LED sayısı', en: 'Number of LEDs in series' }) },
      Iled: { label: t({ tr: 'LED akımı', en: 'LED current' }) },
      derating: {
        label: t({ tr: 'Güç kullanım oranı', en: 'Power utilisation ratio' }),
        hint: t({
          tr: 'Direnç nominal gücünün en fazla bu oranında çalıştırılır',
          en: 'The resistor is operated at no more than this fraction of its power rating',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      Vs: t({ tr: 'Besleme gerilimi (V_s)', en: 'Supply voltage (V_s)' }),
      Vf: t({ tr: 'LED ileri gerilimi (V_f)', en: 'LED forward voltage (V_f)' }),
      n: t({ tr: 'Seri LED sayısı', en: 'Number of LEDs in series' }),
      Iled: t({ tr: 'LED akımı', en: 'LED current' }),
      derating: t({ tr: 'Güç kullanım oranı', en: 'Power utilisation ratio' }),
    },

    big: {
      ledLabel: t({ tr: 'Gerekli seri direnç', en: 'Required series resistor' }),
      ledAlt: (value, current) => t({
        tr: `en yakın E24: ${value} → ${current}`,
        en: `nearest E24: ${value} → ${current}`,
      }),
    },

    table: {
      totalLedVoltage: t({ tr: 'Toplam LED gerilimi', en: 'Total LED voltage' }),
      headroom: t({ tr: 'Dirence düşen gerilim', en: 'Voltage across the resistor' }),
      idealResistance: t({ tr: 'İdeal direnç', en: 'Ideal resistance' }),
      resistorPower: t({ tr: 'Direnç gücü', en: 'Resistor power' }),
      ratedPower: t({ tr: 'Gereken nominal güç', en: 'Required power rating' }),
      utilisation: (p) => t({ tr: `(${p} kullanım)`, en: `(${p} utilisation)` }),
      standardHead: t({ tr: 'Standart değerle', en: 'With a standard value' }),
      standardHeadSub: t({
        tr: 'direnç · akım · sapma',
        en: 'resistance · current · deviation',
      }),
    },

    formula: t({
      tr: `V_LED = Σ V_f,i
  (seri LED'ler)
R = (V_s − V_LED) / I_LED
P_R = I_LED²·R
    = (V_s − V_LED)·I_LED

Güvenli güç seçimi:
  P_nominal ≥ P_R / D
    (D: kullanım oranı)`,
      en: `V_LED = Σ V_f,i
  (series LEDs)
R = (V_s − V_LED) / I_LED
P_R = I_LED²·R
    = (V_s − V_LED)·I_LED

Safe power rating:
  P_rated ≥ P_R / D
    (D: utilisation ratio)`,
    }),

    detail: {
      led: (r) => [
        t({
          tr: `Dirence düşen gerilim beslemenin ${pct(fmt((r.headroom / r.Vs) * 100, 3))}'i.`,
          en: `The voltage across the resistor is ${pct(fmt((r.headroom / r.Vs) * 100, 3))} of the `
            + 'supply.',
        }),
        t({
          tr: `İdeal direnç ${fmtRes(r.R, 6)}; kuantalama hatası standart değer seçiminden gelir.`,
          en: `The ideal resistance is ${fmtRes(r.R, 6)}; the quantisation error comes from the `
            + 'standard-value choice.',
        }),
      ],
    },

    validity: [
      t({
        tr: 'LED sabit ileri gerilimli eleman olarak modellenir. Gerçekte V_f akımla ve '
          + 'sıcaklıkla değişir.',
        en: 'The LED is modelled as a constant forward-voltage element. In reality V_f varies '
          + 'with current and with temperature.',
      }),
      t({
        tr: 'İleri gerilim toleransı doğrudan akıma geçer; parça arası parlaklık farkı bu '
          + 'hesapta yoktur.',
        en: 'The forward-voltage tolerance passes directly into the current; part-to-part '
          + 'brightness variation is not part of this calculation.',
      }),
      t({
        tr: 'Darbeli sürüşte (PWM) ortalama akım farklıdır; buradaki sonuç sürekli akım içindir.',
        en: 'Under pulsed drive (PWM) the average current is different; the result here is for '
          + 'continuous current.',
      }),
    ],
    validityApproximate: t({
      tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
      en: 'Results are approximate — verify against manufacturer data and measurement for '
        + 'critical designs.',
    }),

    chart: {
      x: t({ tr: 'Seri direnç (Ω)', en: 'Series resistance (Ω)' }),
      y: t({ tr: 'LED akımı (A)', en: 'LED current (A)' }),
      caption: t({
        tr: 'Seri direnç değiştikçe LED akımı ters orantılı değişir. Yatay çizgi hedef akımdır; '
          + 'eğrinin dikliği, direnç toleransının parlaklığa ne kadar geçtiğini gösterir.',
        en: 'As the series resistance changes the LED current varies inversely. The horizontal '
          + 'line is the target current; the steepness of the curve shows how much of the '
          + 'resistor tolerance passes through to the brightness.',
      }),
      targetLegend: t({ tr: 'hedef akım', en: 'target current' }),
      targetRef: (v) => t({ tr: `hedef ${v}`, en: `target ${v}` }),
      marker: t({ tr: 'çalışma noktası', en: 'operating point' }),
    },

    schematic: {
      title: t({ tr: 'Devre şeması', en: 'Circuit diagram' }),
      caption: t({
        tr: 'LED kolu — akımı seri direnç sınırlar',
        en: 'LED branch — the series resistor limits the current',
      }),
    },

    reasonText: (reason, r) => {
      if (reason === REASON_LED_HEADROOM) {
        return t({
          tr: `Seri LED gerilimi (${fmtVolt(r?.Vled)}) besleme geriliminden düşük olmalı. LED `
            + 'sayısını azaltın, ileri gerilimi düşürün veya beslemeyi yükseltin.',
          en: `The series LED voltage (${fmtVolt(r?.Vled)}) must be lower than the supply `
            + 'voltage. Reduce the number of LEDs, lower the forward voltage or raise the supply.',
        })
      }
      return t({
        tr: 'Tüm zorunlu alanlara geçerli değer girin. Ondalık için nokta veya virgül '
          + 'kullanabilirsiniz (0.25 = 0,25).',
        en: 'Enter a valid value in every required field. You may use a point or a comma for '
          + 'decimals (0.25 = 0,25).',
      })
    },

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: 'ok',
        text: t({
          tr: `${r.n} LED için toplam ileri gerilim ${fmtVolt(r.Vled)}; dirence düşen fark `
            + `${fmtVolt(r.headroom)}.`,
          en: `For ${r.n} LED${r.n === 1 ? '' : 's'} the total forward voltage is `
            + `${fmtVolt(r.Vled)}; the difference dropped across the resistor is `
            + `${fmtVolt(r.headroom)}.`,
        }),
      })
      out.push({
        level: 'ok',
        text: t({
          tr: `İdeal direnç ${fmtRes(r.R, 4)}; en yakın E24 değeri ${fmtRes(r.e24.value, 4)} ile `
            + `akım ${fmtAmp(r.e24.I, 3)} olur `
            + `(${pct(fmtPct((100 * (r.e24.I - r.targetI)) / r.targetI))}).`,
          en: `The ideal resistance is ${fmtRes(r.R, 4)}; with the nearest E24 value `
            + `${fmtRes(r.e24.value, 4)} the current becomes ${fmtAmp(r.e24.I, 3)} `
            + `(${pct(fmtPct((100 * (r.e24.I - r.targetI)) / r.targetI))}).`,
        }),
      })
      out.push({
        level: 'ok',
        text: t({
          tr: `Direnç ${fmtPow(r.P, 3)} harcıyor; ${pct(fmt(r.derating * 100, 3))} kullanım `
            + `oranıyla en az ${fmtPow(r.Prated, 3)} nominal güç seçin.`,
          en: `The resistor dissipates ${fmtPow(r.P, 3)}; at a `
            + `${pct(fmt(r.derating * 100, 3))} utilisation ratio choose a rating of at least `
            + `${fmtPow(r.Prated, 3)}.`,
        }),
      })

      // Düşük headroom oranı, V_f toleransını akıma büyük oranda geçirir
      const ratio = r.headroom / r.Vs
      out.push({
        level: ratio < 0.2 ? 'danger' : ratio < 0.35 ? 'warn' : 'ok',
        text: ratio < 0.35
          ? t({
            tr: `Dirence düşen gerilim beslemenin yalnızca ${pct(fmt(ratio * 100, 3))}'i. Bu `
              + `oranda LED'in ileri gerilim toleransı akıma neredeyse doğrudan geçer; parlaklık `
              + 'parçadan parçaya belirgin değişir. Akım kaynağı sürücü düşünün.',
            en: `The voltage across the resistor is only ${pct(fmt(ratio * 100, 3))} of the `
              + 'supply. At this ratio the forward-voltage tolerance of the LED passes into the '
              + 'current almost directly; brightness varies noticeably from part to part. '
              + 'Consider a constant-current driver.',
          })
          : t({
            tr: `Dirence düşen gerilim beslemenin ${pct(fmt(ratio * 100, 3))}'i — ileri gerilim `
              + 'toleransının akıma etkisi sınırlı.',
            en: `The voltage across the resistor is ${pct(fmt(ratio * 100, 3))} of the supply — `
              + 'the effect of the forward-voltage tolerance on the current is limited.',
          }),
      })
      out.push({
        level: 'warn',
        text: t({
          tr: 'Paralel LED kollarında tek ortak direnç kullanmayın; ileri gerilim farkı akımı '
            + 'eşitsiz dağıtır. Her kola ayrı direnç verin.',
          en: 'Do not use a single shared resistor for parallel LED branches; the difference in '
            + 'forward voltage distributes the current unevenly. Give each branch its own '
            + 'resistor.',
        }),
      })
      return out
    },
  }
}
