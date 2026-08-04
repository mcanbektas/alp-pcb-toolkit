// CAN ve RS-485 fiziksel katman hesaplayıcısı ekranının kullanıcıya görünen
// metinleri — iki dilli (tr/en).
//
// Motorun (lib/busPhysical.js) bulgu/seviye kavramı yok — Adım 2'nin altı
// kardeş motorundan hiçbirinde `divider.js`-tipi bir `findings()` yok (bkz.
// ReturnPathStitchingVia/text.js başındaki not). Bulgular burada, ham
// `compute()` çıktısından `commentary(r)` ile kurulur.

import { fmt, fmtEng, fmtRes, fmtVolt, fmtAmp } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  REASON_INCOMPLETE, BUS_ERR_FIXED_DELAY, BUS_ERR_DELAY_BUDGET, BUS_ERR_BIAS_UNREACHABLE,
  MODE_CAN, MODE_RS485,
} from './model'

const fmtS = (x, sig = 4) => fmtEng(x, 's', sig)
const fmtM = (x, sig = 4) => fmtEng(x, 'm', sig)

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  return {
    pct,
    backlink: t({ tr: '← Sinyal Bütünlüğü', en: '← Signal Integrity' }),
    title: t({
      tr: 'CAN ve RS-485 Fiziksel Katman Hesaplayıcı',
      en: 'CAN and RS-485 Physical Layer Calculator',
    }),
    intro: t({
      tr: 'Terminasyon, bias, kablo gecikmesi, stub ve yükü değerlendirir — protokol frame '
        + 'çözümlemesi içermez. CAN’de gecikme bütçesinin belirleyicisi sample point anıdır; '
        + 'RS-485’te failsafe bias ve düğüm yükü değerlendirilir.',
      en: 'Evaluates termination, bias, cable delay, stub and load — it does not parse '
        + 'protocol frames. For CAN, the sample point instant is what determines the delay '
        + 'budget; for RS-485, failsafe bias and node loading are evaluated.',
    }),

    modeLabel: t({ tr: 'Veri yolu', en: 'Bus' }),
    modeCan: t({ tr: 'CAN', en: 'CAN' }),
    modeRs485: t({ tr: 'RS-485', en: 'RS-485' }),

    fields: {
      term1: { label: t({ tr: 'Terminasyon direnci 1', en: 'Termination resistor 1' }) },
      term2: { label: t({ tr: 'Terminasyon direnci 2', en: 'Termination resistor 2' }) },

      bitrate: { label: t({ tr: 'Bit hızı', en: 'Bit rate' }) },
      samplePoint: {
        label: t({ tr: 'Sample point (0–1)', en: 'Sample point (0–1)' }),
        hint: t({ tr: 'Örn. %87.5 için 0.875', en: 'E.g. 0.875 for 87.5%' }),
      },
      busLength: { label: t({ tr: 'Bus uzunluğu', en: 'Bus length' }) },
      delayPerMeter: { label: t({ tr: 'Metre başına yayılma gecikmesi', en: 'Propagation delay per metre' }) },
      controllerDelay: { label: t({ tr: 'Kontrolör gecikmesi', en: 'Controller delay' }) },
      txDelay: { label: t({ tr: 'Transceiver TX gecikmesi', en: 'Transceiver TX delay' }) },
      rxDelay: { label: t({ tr: 'Transceiver RX gecikmesi', en: 'Transceiver RX delay' }) },
      isolatorTxDelay: { label: t({ tr: 'İzolatör TX gecikmesi (opsiyonel)', en: 'Isolator TX delay (optional)' }) },
      isolatorRxDelay: { label: t({ tr: 'İzolatör RX gecikmesi (opsiyonel)', en: 'Isolator RX delay (optional)' }) },

      hasSplitCheck: t({ tr: 'Split terminasyon kullan', en: 'Use split termination' }),
      r1: { label: t({ tr: 'Split direnç 1', en: 'Split resistor 1' }) },
      r2: { label: t({ tr: 'Split direnç 2', en: 'Split resistor 2' }) },
      cSplit: { label: t({ tr: 'Split kondansatör (opsiyonel)', en: 'Split capacitor (optional)' }) },

      hasStubCheck: t({ tr: 'Stub değerlendir', en: 'Evaluate a stub' }),
      stubLength: { label: t({ tr: 'Stub uzunluğu', en: 'Stub length' }) },
      riseTime: { label: t({ tr: 'Sinyal yükselme süresi (opsiyonel)', en: 'Signal rise time (optional)' }) },

      vcc: { label: t({ tr: 'Besleme gerilimi (V_CC)', en: 'Supply voltage (V_CC)' }) },
      receiverEq: {
        label: t({ tr: 'Alıcı giriş direnci (opsiyonel)', en: 'Receiver input resistance (optional)' }),
        hint: t({
          tr: 'Terminasyona paralel ek yük olarak eklenir',
          en: 'Added as an extra load in parallel with the termination',
        }),
      },
      rPullUp: { label: t({ tr: 'Pull-up direnci (opsiyonel)', en: 'Pull-up resistor (optional)' }) },
      rPullDown: { label: t({ tr: 'Pull-down direnci (opsiyonel)', en: 'Pull-down resistor (optional)' }) },
      receiverThreshold: { label: t({ tr: 'Alıcı eşik gerilimi', en: 'Receiver threshold voltage' }) },
      unitLoad: {
        label: t({ tr: 'Düğüm başına unit load (opsiyonel)', en: 'Unit load per node (optional)' }),
        hint: t({ tr: 'Tam yük = 1', en: 'Full load = 1' }),
      },

      // RS-485'in kendi bus uzunluğu/gecikme/bit hızı alanları — CAN'ın aynı adlı
      // alanlarıyla (bitrate/busLength/delayPerMeter) PAYLAŞILMAZ, bkz. model.js.
      rs485Bitrate: {
        label: t({ tr: 'Bit hızı (opsiyonel)', en: 'Bit rate (optional)' }),
        hint: t({ tr: 'Yalnız bit süresi sonucu için kullanılır', en: 'Only used for the bit time result' }),
      },
      rs485BusLength: {
        label: t({ tr: 'Kablo uzunluğu (opsiyonel)', en: 'Cable length (optional)' }),
        hint: t({ tr: 'Yalnız kablo gecikmesi sonucu için kullanılır', en: 'Only used for the cable delay result' }),
      },
      rs485DelayPerMeter: {
        label: t({
          tr: 'Metre başına yayılma gecikmesi (opsiyonel)',
          en: 'Propagation delay per metre (optional)',
        }),
      },

      hasTargetCheck: t({
        tr: 'Hedef idle gerilimden bias direnci öner',
        en: 'Suggest a bias resistor from a target idle voltage',
      }),
      targetIdle: { label: t({ tr: 'Hedef idle diferansiyel gerilim', en: 'Target idle differential voltage' }) },
    },

    // Hata mesajında alan adı olarak görünen kısa etiketler; model.js'e verilir.
    fieldLabels: {
      term1: t({ tr: 'Terminasyon direnci 1', en: 'Termination resistor 1' }),
      term2: t({ tr: 'Terminasyon direnci 2', en: 'Termination resistor 2' }),
      bitrate: t({ tr: 'Bit hızı', en: 'Bit rate' }),
      samplePoint: t({ tr: 'Sample point', en: 'Sample point' }),
      busLength: t({ tr: 'Bus uzunluğu', en: 'Bus length' }),
      delayPerMeter: t({ tr: 'Metre başına gecikme', en: 'Delay per metre' }),
      controllerDelay: t({ tr: 'Kontrolör gecikmesi', en: 'Controller delay' }),
      txDelay: t({ tr: 'TX gecikmesi', en: 'TX delay' }),
      rxDelay: t({ tr: 'RX gecikmesi', en: 'RX delay' }),
      isolatorTxDelay: t({ tr: 'İzolatör TX gecikmesi', en: 'Isolator TX delay' }),
      isolatorRxDelay: t({ tr: 'İzolatör RX gecikmesi', en: 'Isolator RX delay' }),
      r1: t({ tr: 'Split direnç 1', en: 'Split resistor 1' }),
      r2: t({ tr: 'Split direnç 2', en: 'Split resistor 2' }),
      cSplit: t({ tr: 'Split kondansatör', en: 'Split capacitor' }),
      stubLength: t({ tr: 'Stub uzunluğu', en: 'Stub length' }),
      riseTime: t({ tr: 'Yükselme süresi', en: 'Rise time' }),
      vcc: t({ tr: 'Besleme gerilimi', en: 'Supply voltage' }),
      receiverEq: t({ tr: 'Alıcı giriş direnci', en: 'Receiver input resistance' }),
      rPullUp: t({ tr: 'Pull-up direnci', en: 'Pull-up resistor' }),
      rPullDown: t({ tr: 'Pull-down direnci', en: 'Pull-down resistor' }),
      receiverThreshold: t({ tr: 'Alıcı eşik gerilimi', en: 'Receiver threshold voltage' }),
      unitLoad: t({ tr: 'Unit load', en: 'Unit load' }),
      rs485Bitrate: t({ tr: 'Bit hızı', en: 'Bit rate' }),
      rs485BusLength: t({ tr: 'Kablo uzunluğu', en: 'Cable length' }),
      rs485DelayPerMeter: t({ tr: 'Metre başına gecikme', en: 'Delay per metre' }),
      targetIdle: t({ tr: 'Hedef idle gerilim', en: 'Target idle voltage' }),
    },

    bigResultLabelCan: t({ tr: 'Gecikme bütçesi marjı', en: 'Delay budget margin' }),
    bigResultLabelRs485: t({ tr: 'Diferansiyel yük (R_AB)', en: 'Differential load (R_AB)' }),

    table: {
      bitTime: t({ tr: 'Bit süresi', en: 'Bit time' }),
      sampleTime: t({ tr: 'Sample time', en: 'Sample time' }),
      cableDelay: t({ tr: 'Kablo gecikmesi (tek yön)', en: 'Cable delay (one-way)' }),
      roundTrip: t({ tr: 'Gidiş-dönüş gecikmesi', en: 'Round-trip delay' }),
      fixedDelay: t({ tr: 'Sabit gecikme (t_fixed)', en: 'Fixed delay (t_fixed)' }),
      loopDelay: t({ tr: 'Toplam döngü gecikmesi', en: 'Total loop delay' }),
      margin: t({ tr: 'Marj', en: 'Margin' }),
      maxLength: t({ tr: 'Maksimum bus uzunluğu', en: 'Maximum bus length' }),
      terminationEq: t({ tr: 'Terminasyon eşdeğeri', en: 'Termination equivalent' }),
      splitTotal: t({ tr: 'Split — toplam', en: 'Split — total' }),
      splitCm: t({ tr: 'Split — common-mode kolu', en: 'Split — common-mode leg' }),
      splitCutoff: t({ tr: 'Split — kesim frekansı', en: 'Split — cutoff frequency' }),
      stubRoundTrip: t({ tr: 'Stub gidiş-dönüş gecikmesi', en: 'Stub round-trip delay' }),
      stubRatio: t({ tr: 'Stub gecikmesi / yükselme süresi', en: 'Stub delay / rise time' }),

      differentialLoad: t({ tr: 'Diferansiyel yük (R_AB)', en: 'Differential load (R_AB)' }),
      biasCurrent: t({ tr: 'Bias akımı', en: 'Bias current' }),
      biasIdle: t({ tr: 'Idle diferansiyel gerilim', en: 'Idle differential voltage' }),
      biasMargin: t({ tr: 'Eşik marjı', en: 'Threshold margin' }),
      biasPowerUp: t({ tr: 'Pull-up güç kaybı', en: 'Pull-up power loss' }),
      biasPowerDown: t({ tr: 'Pull-down güç kaybı', en: 'Pull-down power loss' }),
      targetIdeal: t({ tr: 'Hedef — ideal direnç', en: 'Target — ideal resistor' }),
      targetStandard: t({ tr: 'Hedef — E24 standart direnç', en: 'Target — E24 standard resistor' }),
      targetAchieved: t({ tr: 'Hedef — standart dirençle gerçekleşen gerilim', en: 'Target — voltage achieved with the standard resistor' }),
      maxNodes: t({ tr: 'Maksimum düğüm sayısı', en: 'Maximum node count' }),
      rs485CableDelay: t({ tr: 'Kablo gecikmesi (opsiyonel)', en: 'Cable delay (optional)' }),
      rs485BitTime: t({ tr: 'Bit süresi (opsiyonel)', en: 'Bit time (optional)' }),
    },

    formula: (mode) => (mode === MODE_CAN
      ? t({
        tr: `t_bit = 1 / bitrate
t_sample = t_bit · sample_point

t_kablo = L·t_pd
t_gidiş-dönüş = 2·L·t_pd
t_fixed = t_kontrolör + t_TX + t_izolatör,TX + t_RX + t_izolatör,RX
t_döngü = t_fixed + t_gidiş-dönüş
marj = t_sample − t_döngü

L_maks = (t_sample − t_fixed) / (2·t_pd)`,
        en: `t_bit = 1 / bitrate
t_sample = t_bit · sample_point

t_cable = L·t_pd
t_round-trip = 2·L·t_pd
t_fixed = t_controller + t_TX + t_isolator,TX + t_RX + t_isolator,RX
t_loop = t_fixed + t_round-trip
margin = t_sample − t_loop

L_max = (t_sample − t_fixed) / (2·t_pd)`,
      })
      : t({
        tr: `R_AB = terminasyonlar ∥ alıcı yükü

I_bias = V_CC / (R_pull-up + R_AB + R_pull-down)
V_idle = I_bias · R_AB

R_bias,hedef = R_AB·(V_CC/V_hedef − 1) / 2   (simetrik pull-up/down)

N_maks = 32 / unit_load`,
        en: `R_AB = terminations ∥ receiver load

I_bias = V_CC / (R_pull-up + R_AB + R_pull-down)
V_idle = I_bias · R_AB

R_bias,target = R_AB·(V_CC/V_target − 1) / 2   (symmetric pull-up/down)

N_max = 32 / unit_load`,
      })),

    detail: {
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: (mode) => {
      const shared = [
        t({
          tr: 'Sonuçlar attenuation, kablo kaybı, transceiver slew rate, jitter ve oscillator '
            + 'toleransını içermez.',
          en: 'Results do not include attenuation, cable loss, transceiver slew rate, jitter '
            + 'or oscillator tolerance.',
        }),
        t({
          tr: 'Protokol frame çözümlemesi yapılmaz — yalnızca fiziksel katman değerlendirilir.',
          en: 'No protocol frame parsing is performed — only the physical layer is evaluated.',
        }),
        t({
          tr: 'Sonuçlar yaklaşık mühendislik tahminidir — kritik tasarımlarda ölçümle doğrulayın.',
          en: 'Results are approximate engineering estimates — verify with measurement for '
            + 'critical designs.',
        }),
      ]
      if (mode === MODE_CAN) {
        return [
          t({
            tr: 'Gecikme bütçesi tek yönlü en kötü durum yolunu varsayar; gerçek sistemde '
              + 'düğümler arası mesafe farklı olabilir.',
            en: 'The delay budget assumes a single-direction worst-case path; in a real '
              + 'system the inter-node distances may differ.',
          }),
          t({
            tr: 'Stub değerlendirmesi yalnız gidiş-dönüş gecikmesi / yükselme süresi oranını '
              + 'verir — yansıma genliğini hesaplamaz.',
            en: 'The stub evaluation only gives the round-trip delay / rise time ratio — it '
              + 'does not calculate the reflection amplitude.',
          }),
          ...shared,
        ]
      }
      return [
        t({
          tr: 'Unit load hesabı kablo kapasitansını, konnektörleri ve gerçek transceiver '
            + 'limitlerini içermez.',
          en: 'The unit load calculation does not include cable capacitance, connectors or '
            + 'real transceiver limits.',
        }),
        t({
          tr: 'Bias direnci hedefi simetrik pull-up/pull-down varsayar; asimetrik tasarımlar '
            + 'ayrıca hesaplanmalıdır.',
          en: 'The bias resistor target assumes symmetric pull-up/pull-down; asymmetric '
            + 'designs must be calculated separately.',
        }),
        ...shared,
      ]
    },

    sweepAxisCan: t({ tr: 'Bit hızı (bit/s)', en: 'Bit rate (bit/s)' }),
    sweepYLabelCan: t({ tr: 'Maksimum bus uzunluğu (m)', en: 'Maximum bus length (m)' }),
    sweepCaptionCan: t({
      tr: 'Bit hızı arttıkça sample time bütçesi daralır, izin verilen maksimum uzunluk düşer.',
      en: 'As the bit rate rises the sample-time budget shrinks, lowering the maximum allowed '
        + 'length.',
    }),
    sweepAxisRs485: t({ tr: 'Simetrik bias direnci (Ω)', en: 'Symmetric bias resistor (Ω)' }),
    sweepYLabelRs485: t({ tr: 'Idle diferansiyel gerilim (V)', en: 'Idle differential voltage (V)' }),
    sweepCaptionRs485: t({
      tr: 'Bias direnci büyüdükçe aynı akım daha büyük bir dirence bölünmez — idle gerilim '
        + 'düşer.',
      en: 'As the bias resistor grows, the same current is divided across a larger series '
        + 'path — the idle voltage falls.',
    }),
    seriesMain: t({ tr: 'sonuç', en: 'result' }),
    operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),

    schematic: {
      title: t({ tr: 'Veri yolu topolojisi', en: 'Bus topology' }),
      captionCan: (hasSplit, hasStub) => {
        if (hasSplit) {
          return t({
            tr: 'İki uçta split terminasyon ile CAN veri yolu',
            en: 'CAN bus with split termination at both ends',
          })
        }
        return hasStub
          ? t({ tr: 'CAN veri yolu, ara düğümde stub', en: 'CAN bus with a stub at a mid-node' })
          : t({ tr: 'İki uçta 120 Ω terminasyonlu CAN veri yolu', en: 'CAN bus terminated at both ends' })
      },
      captionRs485: t({
        tr: 'Failsafe bias dirençli RS-485 veri yolu',
        en: 'RS-485 bus with failsafe bias resistors',
      }),
      nodeA: t({ tr: 'düğüm A', en: 'node A' }),
      nodeB: t({ tr: 'düğüm B', en: 'node B' }),
      stub: t({ tr: 'stub', en: 'stub' }),
      pullUp: t({ tr: 'pull-up', en: 'pull-up' }),
      pullDown: t({ tr: 'pull-down', en: 'pull-down' }),
      vcc: t({ tr: 'V_CC', en: 'V_CC' }),
      gnd: t({ tr: 'GND', en: 'GND' }),
    },

    reasonText: () => t({
      tr: 'Tüm zorunlu alanlara geçerli sayısal değer girin. Ondalık için nokta veya virgül '
        + 'kullanabilirsiniz (0.25 = 0,25).',
      en: 'Enter a valid numeric value in every required field. Use a point or a comma for '
        + 'decimals (0.25 = 0,25).',
    }),

    // Mühendislik yorumu — motorun `level`/`findings` kavramı olmadığı için
    // ham `r`den burada kurulur (bkz. dosya başı notu).
    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      if (r.mode === MODE_CAN) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Sample time ${fmtS(r.sampleTime, 3)}; toplam döngü gecikmesi `
              + `${fmtS(r.loopDelay, 3)} (t_fixed ${fmtS(r.fixedDelay, 3)} + gidiş-dönüş `
              + `${fmtS(r.roundTrip, 3)}).`,
            en: `Sample time ${fmtS(r.sampleTime, 3)}; total loop delay ${fmtS(r.loopDelay, 3)} `
              + `(t_fixed ${fmtS(r.fixedDelay, 3)} + round-trip ${fmtS(r.roundTrip, 3)}).`,
          }),
        })

        out.push(r.budgetExceeded
          ? {
            key: BUS_ERR_DELAY_BUDGET,
            level: 'danger',
            text: t({
              tr: `Gecikme bütçesi AŞILDI: marj ${fmtS(r.margin, 3)}. Düğüm sample point'i `
                + 'henüz oturmamış bir seviyeyi örnekler.',
              en: `The delay budget is EXCEEDED: margin ${fmtS(r.margin, 3)}. The node samples `
                + 'a level that has not yet settled at the sample point.',
            }),
          }
          : {
            level: 'ok',
            text: t({
              tr: `Bütçe içinde: marj ${fmtS(r.margin, 3)}.`,
              en: `Within budget: margin ${fmtS(r.margin, 3)}.`,
            }),
          })

        if (r.maxLength != null) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Bu ayarlarla izin verilen maksimum bus uzunluğu ${fmtM(r.maxLength, 3)}.`,
              en: `The maximum bus length allowed with these settings is `
                + `${fmtM(r.maxLength, 3)}.`,
            }),
          })
        } else if (r.maxLengthError === BUS_ERR_FIXED_DELAY) {
          out.push({
            key: BUS_ERR_FIXED_DELAY,
            level: 'danger',
            text: t({
              tr: 'Sabit gecikme sample point’i tek başına aşıyor — kablo sıfır uzunlukta '
                + 'olsa bile bütçe yetersiz. Daha hızlı bir transceiver/izolatör veya daha '
                + 'düşük bit hızı gerekir.',
              en: 'The fixed delay alone exceeds the sample point — the budget is insufficient '
                + 'even with zero cable length. A faster transceiver/isolator or a lower bit '
                + 'rate is needed.',
            }),
          })
        }

        if (r.split) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Split terminasyon common-mode kolu ${fmtRes(r.split.commonMode)}`
                + `${r.split.cutoff != null ? `, kesim frekansı ${fmtEng(r.split.cutoff, 'Hz', 3)}.` : '.'}`,
              en: `The split termination common-mode leg is ${fmtRes(r.split.commonMode)}`
                + `${r.split.cutoff != null ? `, cutoff frequency ${fmtEng(r.split.cutoff, 'Hz', 3)}.` : '.'}`,
            }),
          })
        }

        if (r.stub) {
          out.push({
            level: 'warn',
            text: t({
              tr: `Stub gidiş-dönüş gecikmesi ${fmtS(r.stub.roundTrip, 3)}`
                + `${r.stub.ratio != null ? ` — yükselme süresinin ${fmt(r.stub.ratio, 3)} katı; bu yalnız bir orandır, yansıma genliğini hesaplamaz.` : '.'}`,
              en: `The stub round-trip delay is ${fmtS(r.stub.roundTrip, 3)}`
                + `${r.stub.ratio != null ? ` — ${fmt(r.stub.ratio, 3)}× the rise time; this is only a ratio, it does not compute the reflection amplitude.` : '.'}`,
            }),
          })
        }

        return out
      }

      // RS-485
      out.push({
        level: 'ok',
        text: t({
          tr: `Diferansiyel yük R_AB = ${fmtRes(r.differentialLoad)} (terminasyon eşdeğeri `
            + `${fmtRes(r.terminationEq)}).`,
          en: `The differential load R_AB = ${fmtRes(r.differentialLoad)} (termination `
            + `equivalent ${fmtRes(r.terminationEq)}).`,
        }),
      })

      if (r.bias) {
        out.push(r.bias.thresholdMargin >= 0
          ? {
            level: 'ok',
            text: t({
              tr: `Idle diferansiyel gerilim ${fmtVolt(r.bias.idleVoltage)} — alıcı eşiğinin `
                + `${fmtVolt(r.bias.thresholdMargin)} üzerinde.`,
              en: `The idle differential voltage is ${fmtVolt(r.bias.idleVoltage)} — `
                + `${fmtVolt(r.bias.thresholdMargin)} above the receiver threshold.`,
            }),
          }
          : {
            level: 'danger',
            text: t({
              tr: `Idle diferansiyel gerilim ${fmtVolt(r.bias.idleVoltage)} — alıcı eşiğinin `
                + `${fmtVolt(-r.bias.thresholdMargin)} ALTINDA. Failsafe garanti edilmiyor.`,
              en: `The idle differential voltage is ${fmtVolt(r.bias.idleVoltage)} — `
                + `${fmtVolt(-r.bias.thresholdMargin)} BELOW the receiver threshold. Failsafe `
                + 'is not guaranteed.',
            }),
          })
      } else {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Pull-up/pull-down direnci girilmedi — failsafe idle durumu '
              + 'değerlendirilmiyor.',
            en: 'No pull-up/pull-down resistor was entered — the failsafe idle state is not '
              + 'evaluated.',
          }),
        })
      }

      if (r.biasTarget) {
        out.push(r.biasTarget.error === BUS_ERR_BIAS_UNREACHABLE
          ? {
            key: BUS_ERR_BIAS_UNREACHABLE,
            level: 'danger',
            text: t({
              tr: 'Hedef idle gerilim besleme geriliminden büyük ya da ona eşit — bu hedefe '
                + 'hiçbir dirençle ulaşılamaz.',
              en: 'The target idle voltage is greater than or equal to the supply voltage — '
                + 'this target cannot be reached with any resistor value.',
            }),
          }
          : {
            level: 'ok',
            text: t({
              tr: `Hedef için önerilen standart direnç ${fmtRes(r.biasTarget.standard)} `
                + `(gerçekleşen idle gerilim ${fmtVolt(r.biasTarget.achieved)}).`,
              en: `The suggested standard resistor for the target is `
                + `${fmtRes(r.biasTarget.standard)} (achieved idle voltage `
                + `${fmtVolt(r.biasTarget.achieved)}).`,
            }),
          })
      }

      if (r.maxNodes != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Girilen unit load ile maksimum düğüm sayısı ${fmt(r.maxNodes, 3)} — kablo `
              + 'kapasitansı ve konnektörler dahil değildir.',
            en: `With the entered unit load the maximum node count is ${fmt(r.maxNodes, 3)} — `
              + 'cable capacitance and connectors are not included.',
          }),
        })
      }

      return out
    },
  }
}
