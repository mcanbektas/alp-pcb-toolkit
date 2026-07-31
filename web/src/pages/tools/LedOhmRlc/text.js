// LED, Ohm kanunu ve RLC ekranının kullanıcıya görünen metinleri —
// iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtRes, fmtAmp, fmtPow, fmtVolt, fmtEng, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  TOOL_OHM, TOOL_LED, TOOL_RLC, TOOL_COMBO,
  MODE_ANALYSIS, MODE_SYNTHESIS,
  COMBO_SERIES, COMBO_PARALLEL,
  REASON_OHM_INSUFFICIENT, REASON_LED_HEADROOM, REASON_NO_SOLUTION,
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
    title: t({
      tr: 'LED, Ohm Kanunu ve RLC',
      en: 'LED, Ohm’s Law & RLC',
    }),
    intro: t({
      tr: 'Ohm kanunu ve güç, LED seri direnci, seri RLC empedansı ile seri/paralel direnç '
        + 'birleşimlerini tek ekranda hesaplar; standart değer karşılıkları ve güç marjıyla '
        + 'birlikte verir.',
      en: 'Computes Ohm’s law and power, the LED series resistor, series RLC impedance and '
        + 'series/parallel resistor combinations on a single screen; each result comes with its '
        + 'standard-value equivalents and power margin.',
    }),

    pct,

    toolLabel: {
      [TOOL_OHM]: t({ tr: 'Ohm kanunu ve güç', en: 'Ohm’s law and power' }),
      [TOOL_LED]: t({ tr: 'LED seri direnci', en: 'LED series resistor' }),
      [TOOL_RLC]: t({ tr: 'Seri RLC', en: 'Series RLC' }),
      [TOOL_COMBO]: t({ tr: 'Seri / paralel birleşim', en: 'Series / parallel combination' }),
    },

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

    comboLabel: {
      [COMBO_PARALLEL]: t({ tr: 'Paralel', en: 'Parallel' }),
      [COMBO_SERIES]: t({ tr: 'Seri', en: 'Series' }),
    },

    kindLabel,

    fields: {
      tool: t({ tr: 'Hesap', en: 'Calculation' }),
      combo: t({ tr: 'Bağlantı', en: 'Connection' }),
      blankPlaceholder: t({ tr: 'boş = hesapla', en: 'blank = compute' }),
      countUnit: t({ tr: 'adet', en: 'pcs' }),

      V: { label: t({ tr: 'Gerilim (V)', en: 'Voltage (V)' }) },
      I: { label: t({ tr: 'Akım (I)', en: 'Current (I)' }) },
      R: { label: t({ tr: 'Direnç (R)', en: 'Resistance (R)' }) },
      P: { label: t({ tr: 'Güç (P)', en: 'Power (P)' }) },

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
      Vs: t({ tr: 'Besleme gerilimi (V_s)', en: 'Supply voltage (V_s)' }),
      Vf: t({ tr: 'LED ileri gerilimi (V_f)', en: 'LED forward voltage (V_f)' }),
      n: t({ tr: 'Seri LED sayısı', en: 'Number of LEDs in series' }),
      Iled: t({ tr: 'LED akımı', en: 'LED current' }),
      derating: t({ tr: 'Güç kullanım oranı', en: 'Power utilisation ratio' }),
      Rr: t({ tr: 'Direnç (R)', en: 'Resistance (R)' }),
      L: t({ tr: 'Endüktans (L)', en: 'Inductance (L)' }),
      C: t({ tr: 'Kapasite (C)', en: 'Capacitance (C)' }),
      freq: t({ tr: 'Frekans (f)', en: 'Frequency (f)' }),
      targetF0: t({ tr: 'Hedef rezonans frekansı', en: 'Target resonant frequency' }),
    },

    ohmNote: t({
      tr: 'Herhangi iki alanı doldurun, kalan ikisi hesaplanır. Üçünü doldurursanız tutarsızlık '
        + 'oranı gösterilir.',
      en: 'Fill in any two fields and the other two are computed. If you fill in three, the '
        + 'inconsistency ratio is shown as well.',
    }),

    big: {
      ohmLabel: t({ tr: 'Harcanan güç', en: 'Dissipated power' }),
      ledLabel: t({ tr: 'Gerekli seri direnç', en: 'Required series resistor' }),
      ledAlt: (value, current) => t({
        tr: `en yakın E24: ${value} → ${current}`,
        en: `nearest E24: ${value} → ${current}`,
      }),
      rlcSynthesisLabel: t({ tr: 'Gerekli kapasite', en: 'Required capacitance' }),
      rlcAnalysisLabel: (f) => t({ tr: `Empedans @ ${f}`, en: `Impedance @ ${f}` }),
      comboLabel: (combo) => t({
        tr: `Eşdeğer direnç (${combo === COMBO_SERIES ? 'seri' : 'paralel'})`,
        en: `Equivalent resistance (${combo === COMBO_SERIES ? 'series' : 'parallel'})`,
      }),
      // Ayırıcının iki yanındaki boşluk kırılmaz ( ): aynı ekrandaki diğer
      // `.alt` satırları da `&nbsp;·&nbsp;` kullanır, sayı ile ayırıcı ayrı
      // satıra düşmesin.
      comboAlt: (n, nearest, error) => t({
        tr: `${n} direnç  ·  en yakın tek değer ${nearest} (${error})`,
        en: `${n} resistor${n === 1 ? '' : 's'}  ·  nearest single value `
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

      // LED
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

      // RLC
      XL: t({ tr: 'Endüktif reaktans X_L', en: 'Inductive reactance X_L' }),
      XC: t({ tr: 'Kapasitif reaktans X_C', en: 'Capacitive reactance X_C' }),
      X: t({ tr: 'Net reaktans X', en: 'Net reactance X' }),
      magnitude: t({ tr: 'Empedans büyüklüğü |Z|', en: 'Impedance magnitude |Z|' }),
      phase: t({ tr: 'Faz açısı', en: 'Phase angle' }),
      f0: t({ tr: 'Rezonans frekansı f₀', en: 'Resonant frequency f₀' }),
      Q: t({ tr: 'Kalite faktörü Q', en: 'Quality factor Q' }),
      BW: t({ tr: 'Bant genişliği', en: 'Bandwidth' }),
      nearestC: t({ tr: 'En yakın E24 kapasite', en: 'Nearest E24 capacitance' }),

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
      [TOOL_LED]: t({
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
      [TOOL_RLC]: t({
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
      rlc: (r) => {
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
      [TOOL_LED]: [
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
      [TOOL_RLC]: [
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
      [TOOL_LED]: {
        x: t({ tr: 'Seri direnç (Ω)', en: 'Series resistance (Ω)' }),
        y: t({ tr: 'LED akımı (A)', en: 'LED current (A)' }),
        caption: t({
          tr: 'Seri direnç değiştikçe LED akımı ters orantılı değişir. Yatay çizgi hedef akımdır; '
            + 'eğrinin dikliği, direnç toleransının parlaklığa ne kadar geçtiğini gösterir.',
          en: 'As the series resistance changes the LED current varies inversely. The horizontal '
            + 'line is the target current; the steepness of the curve shows how much of the '
            + 'resistor tolerance passes through to the brightness.',
        }),
      },
      [TOOL_RLC]: {
        x: t({ tr: 'Frekans (Hz)', en: 'Frequency (Hz)' }),
        y: '|Z| (Ω)',
        caption: t({
          tr: 'Rezonansta endüktif ve kapasitif reaktans birbirini götürür, empedans direnç '
            + 'değerine iner. Çukurun genişliği kalite faktörüyle ters orantılıdır.',
          en: 'At resonance the inductive and capacitive reactances cancel each other and the '
            + 'impedance falls to the resistance value. The width of the notch is inversely '
            + 'proportional to the quality factor.',
        }),
      },
      targetLegend: t({ tr: 'hedef akım', en: 'target current' }),
      resistanceLegend: t({
        tr: 'direnç değeri (rezonans tabanı)',
        en: 'resistance value (resonance floor)',
      }),
      targetRef: (v) => t({ tr: `hedef ${v}`, en: `target ${v}` }),
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
        [TOOL_LED]: t({
          tr: 'LED kolu — akımı seri direnç sınırlar',
          en: 'LED branch — the series resistor limits the current',
        }),
        [TOOL_RLC]: t({ tr: 'Seri RLC kolu', en: 'Series RLC branch' }),
      },
      captionSeries: t({ tr: 'Seri bağlı dirençler', en: 'Resistors in series' }),
      captionParallel: t({ tr: 'Paralel bağlı dirençler', en: 'Resistors in parallel' }),
    },

    reasonText: (reason, r) => {
      switch (reason) {
        case REASON_OHM_INSUFFICIENT:
          return t({
            tr: 'Ohm kanunu için en az iki değer gerekli. V, I, R ve P alanlarından ikisini '
              + 'doldurun; kalan ikisi hesaplanır.',
            en: 'Ohm’s law needs at least two values. Fill in two of the V, I, R and P fields; the '
              + 'other two are computed.',
          })
        case REASON_LED_HEADROOM:
          return t({
            tr: `Seri LED gerilimi (${fmtVolt(r?.Vled)}) besleme geriliminden düşük olmalı. LED `
              + 'sayısını azaltın, ileri gerilimi düşürün veya beslemeyi yükseltin.',
            en: `The series LED voltage (${fmtVolt(r?.Vled)}) must be lower than the supply `
              + 'voltage. Reduce the number of LEDs, lower the forward voltage or raise the supply.',
          })
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

      if (r.tool === TOOL_LED) {
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
      }

      if (r.tool === TOOL_RLC) {
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
