// ADC giriş yerleşme süresi ve RC filtre hesaplayıcısı ekranının kullanıcıya
// görünen metinleri — iki dilli (tr/en).
//
// Motorun (lib/adcSettling.js) bulgu/seviye kavramı yok — Adım 2'nin altı
// kardeş motorundan hiçbirinde `divider.js`-tipi bir `findings()` yok (bkz.
// ReturnPathStitchingVia/text.js başındaki not). Bulgular burada, ham
// `compute()` çıktısından `commentary(r)` ile kurulur.

import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  REASON_INCOMPLETE, REASON_BITS, ADC_ERR_BUFFER_REQUIRED, ADC_ERR_SETTLING_FAILED,
  ACQ_DIRECT, ACQ_CYCLES,
  SWEEP_SETTLING, SWEEP_FILTER,
} from './model'

const fmtS = (x, sig = 4) => fmtEng(x, 's', sig)
const fmtHz = (x, sig = 4) => fmtEng(x, 'Hz', sig)

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  return {
    pct,
    backlink: t({ tr: '← Komponent ve Devre Hesapları', en: '← Component and Circuit Calculators' }),
    title: t({
      tr: 'ADC Giriş Yerleşme ve RC Filtre Hesaplayıcı',
      en: 'ADC Input Settling and RC Filter Calculator',
    }),
    intro: t({
      tr: 'SAR ADC girişinin acquisition süresi içinde yarım LSB doğruluğuna yerleşip '
        + 'yerleşmediğini, izin verilen maksimum kaynak direncini ve opsiyonel bir RC '
        + 'filtrenin kesim frekansı ile zayıflatmasını değerlendirir.',
      en: 'Evaluates whether the SAR ADC input settles to half-LSB accuracy within the '
        + 'acquisition time, the maximum allowed source resistance, and — optionally — an RC '
        + 'filter’s cutoff frequency and attenuation.',
    }),

    fields: {
      bits: { label: t({ tr: 'Çözünürlük (N)', en: 'Resolution (N)' }) },
      vFullScale: { label: t({ tr: 'Tam ölçek gerilimi (V_FS)', en: 'Full-scale voltage (V_FS)' }) },
      cs: { label: t({ tr: 'Sampling kapasitörü (C_s)', en: 'Sampling capacitor (C_s)' }) },

      acqMode: { label: t({ tr: 'Acquisition süresi kaynağı', en: 'Acquisition time source' }) },
      acqDirect: t({ tr: 'Doğrudan süre', en: 'Direct time' }),
      acqCycles: t({ tr: 'Çevrim sayısından', en: 'From cycle count' }),
      tAcq: { label: t({ tr: 'Acquisition süresi (t_acq)', en: 'Acquisition time (t_acq)' }) },
      cycles: { label: t({ tr: 'Acquisition çevrim sayısı', en: 'Acquisition cycle count' }) },
      clock: { label: t({ tr: 'ADC saat frekansı', en: 'ADC clock frequency' }) },
      acqFixed: {
        label: t({ tr: 'Sabit ek gecikme (opsiyonel)', en: 'Fixed additional delay (optional)' }),
        hint: t({ tr: 'Çevrim sayısına eklenen sabit süre', en: 'Fixed time added to the cycle count' }),
      },

      rSource: { label: t({ tr: 'Kaynak direnci', en: 'Source resistance' }) },
      rSeries: { label: t({ tr: 'Seri direnç', en: 'Series resistance' }) },
      rSwitch: { label: t({ tr: 'ADC anahtar direnci', en: 'ADC switch resistance' }) },
      rDriver: { label: t({ tr: 'Sürücü/op-amp çıkış direnci', en: 'Driver/op-amp output resistance' }) },

      cFilter: { label: t({ tr: 'Harici filtre kondansatörü (opsiyonel)', en: 'External filter capacitor (optional)' }) },
      rFilter: {
        label: t({ tr: 'Filtre direnci (opsiyonel)', en: 'Filter resistance (optional)' }),
        hint: t({
          tr: 'C_filter ile birlikte verilirse kesim frekansı hesaplanır',
          en: 'If given together with C_filter, the cutoff frequency is calculated',
        }),
      },
      noiseFreq: {
        label: t({ tr: 'Gürültü frekansı (opsiyonel)', en: 'Noise frequency (optional)' }),
        hint: t({
          tr: 'Bu frekansta filtrenin zayıflatmasını gösterir',
          en: 'Shows the filter’s attenuation at this frequency',
        }),
      },

      vStep: {
        label: t({ tr: 'Adım gerilimi (opsiyonel)', en: 'Step voltage (optional)' }),
        hint: t({
          tr: 'Verilmezse tam ölçek gerilimi kullanılır; charge-sharing droop’u da bu '
            + 'girilirse hesaplanır',
          en: 'If not given, the full-scale voltage is used; the charge-sharing droop is also '
            + 'calculated only if this is given',
        }),
      },
      tempC: { label: t({ tr: 'Ortam sıcaklığı (°C, opsiyonel)', en: 'Ambient temperature (°C, optional)' }) },
    },

    // Hata mesajında alan adı olarak görünen kısa etiketler; model.js'e verilir.
    fieldLabels: {
      bits: t({ tr: 'Çözünürlük', en: 'Resolution' }),
      vFullScale: t({ tr: 'Tam ölçek gerilimi', en: 'Full-scale voltage' }),
      cs: t({ tr: 'Sampling kapasitörü', en: 'Sampling capacitor' }),
      tAcq: t({ tr: 'Acquisition süresi', en: 'Acquisition time' }),
      cycles: t({ tr: 'Acquisition çevrim sayısı', en: 'Acquisition cycle count' }),
      clock: t({ tr: 'ADC saat frekansı', en: 'ADC clock frequency' }),
      acqFixed: t({ tr: 'Sabit ek gecikme', en: 'Fixed additional delay' }),
      rSource: t({ tr: 'Kaynak direnci', en: 'Source resistance' }),
      rSeries: t({ tr: 'Seri direnç', en: 'Series resistance' }),
      rSwitch: t({ tr: 'ADC anahtar direnci', en: 'ADC switch resistance' }),
      rDriver: t({ tr: 'Sürücü çıkış direnci', en: 'Driver output resistance' }),
      cFilter: t({ tr: 'Harici filtre kondansatörü', en: 'External filter capacitor' }),
      rFilter: t({ tr: 'Filtre direnci', en: 'Filter resistance' }),
      noiseFreq: t({ tr: 'Gürültü frekansı', en: 'Noise frequency' }),
      vStep: t({ tr: 'Adım gerilimi', en: 'Step voltage' }),
      tempC: t({ tr: 'Ortam sıcaklığı', en: 'Ambient temperature' }),
    },

    bigResultLabel: t({ tr: 'Maksimum eşdeğer direnç (R_eq,maks)', en: 'Maximum equivalent resistance (R_eq,max)' }),
    altLabels: {
      settles: t({ tr: 'yerleşme', en: 'settling' }),
      acq: t({ tr: 'acquisition', en: 'acquisition' }),
    },
    settleOk: t({ tr: 'yeterli', en: 'sufficient' }),
    settleFail: t({ tr: 'YETERSİZ', en: 'INSUFFICIENT' }),

    table: {
      acquisitionTime: t({ tr: 'Acquisition süresi (t_acq)', en: 'Acquisition time (t_acq)' }),
      rEq: t({ tr: 'Toplam eşdeğer direnç (R_eq)', en: 'Total equivalent resistance (R_eq)' }),
      cEq: t({ tr: 'Toplam eşdeğer kapasitans (C_eq)', en: 'Total equivalent capacitance (C_eq)' }),
      tau: t({ tr: 'Zaman sabiti (τ = R_eq·C_eq)', en: 'Time constant (τ = R_eq·C_eq)' }),
      requiredSettlingTime: t({ tr: 'Gereken minimum yerleşme süresi', en: 'Required minimum settling time' }),
      settlingMargin: t({ tr: 'Yerleşme marjı', en: 'Settling margin' }),
      relativeError: t({ tr: 'Kalan bağıl hata (ε = e^(−t/τ))', en: 'Remaining relative error (ε = e^(−t/τ))' }),
      allowedError: t({ tr: 'İzin verilen hata (yarım LSB)', en: 'Allowed error (half LSB)' }),
      lsbVoltage: t({ tr: 'LSB gerilimi', en: 'LSB voltage' }),
      voltageError: t({ tr: 'Yerleşme gerilim hatası', en: 'Settling voltage error' }),
      errorLsb: t({ tr: 'Hata (LSB cinsinden)', en: 'Error (in LSB)' }),
      maxEquivalentResistance: t({ tr: 'Maksimum eşdeğer direnç (R_eq,maks)', en: 'Maximum equivalent resistance (R_eq,max)' }),
      maxSourceResistance: t({ tr: 'Maksimum kaynak direnci (R_source,maks)', en: 'Maximum source resistance (R_source,max)' }),
      cutoffFrequency: t({ tr: 'Filtre kesim frekansı (f_c)', en: 'Filter cutoff frequency (f_c)' }),
      filterAtten: t({ tr: 'Gürültü frekansında zayıflatma', en: 'Attenuation at the noise frequency' }),
      capacitorRatio: t({ tr: 'C_filter / C_s oranı', en: 'C_filter / C_s ratio' }),
      droop: t({ tr: 'Charge-sharing droop', en: 'Charge-sharing droop' }),
      thermalNoise: t({ tr: 'kT/C termal gürültü (RMS)', en: 'kT/C thermal noise (RMS)' }),
    },

    formula: t({
      tr: `ε_izin = 1 / 2^(N+1)
τ = R_eq·C_eq
t_gerekli = (N+1)·ln2·τ
ε(t) = e^(−t/τ)

R_eq,maks = t_acq / (C_s·(N+1)·ln2)
R_source,maks = R_eq,maks − R_switch − R_seri − R_sürücü

f_c = 1 / (2π·R_filter·C_filter)
Zayıflatma(dB) = 20·log10( 1/√(1+(f/f_c)²) )

droop = V_adım·C_s / (C_filter + C_s)
gürültü_kT/C = √(k_B·T / C_eq)`,
      en: `ε_allowed = 1 / 2^(N+1)
τ = R_eq·C_eq
t_required = (N+1)·ln2·τ
ε(t) = e^(−t/τ)

R_eq,max = t_acq / (C_s·(N+1)·ln2)
R_source,max = R_eq,max − R_switch − R_series − R_driver

f_c = 1 / (2π·R_filter·C_filter)
Attenuation(dB) = 20·log10( 1/√(1+(f/f_c)²) )

droop = V_step·C_s / (C_filter + C_s)
kT/C_noise = √(k_B·T / C_eq)`,
    }),

    detail: {
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
      stepSource: (usedDefault) => (usedDefault
        ? t({
          tr: 'Adım gerilimi girilmedi; hata hesabında tam ölçek gerilimi kullanıldı.',
          en: 'No step voltage was entered; the full-scale voltage was used for the error '
            + 'calculation.',
        })
        : t({
          tr: 'Hata hesabında girilen adım gerilimi kullanıldı.',
          en: 'The entered step voltage was used for the error calculation.',
        })),
    },

    validity: [
      t({
        tr: 'Model birinci dereceden RC yerleşmesi varsayar; ADC girişinin doğrusal olmayan '
          + 'switched-capacitor davranışını ve çok kutuplu gerçek yerleşmeyi tam yansıtmaz.',
        en: 'The model assumes first-order RC settling; it does not fully capture the ADC '
          + 'input’s nonlinear switched-capacitor behaviour or a real multi-pole settling.',
      }),
      t({
        tr: 'kT/C gürültüsü yalnız sampling kapasitörünün teorik termal gürültüsüdür — '
          + 'toplam ADC gürültüsü (kuantalama, referans, dijital) dahil değildir.',
        en: 'The kT/C noise is only the sampling capacitor’s theoretical thermal noise — it '
          + 'does not include the total ADC noise (quantization, reference, digital).',
      }),
      t({
        tr: 'Charge-sharing droop hesabı ADC anahtar direncini ve sürücü dinamiğini ihmal '
          + 'eder; gerçek droop genelde daha küçüktür.',
        en: 'The charge-sharing droop calculation ignores the ADC switch resistance and '
          + 'driver dynamics; the real droop is generally smaller.',
      }),
      t({
        tr: 'Sonuçlar yaklaşık mühendislik tahminidir — kritik tasarımlarda datasheet ve '
          + 'ölçümle doğrulayın.',
        en: 'Results are approximate engineering estimates — verify with the datasheet and '
          + 'measurement for critical designs.',
      }),
    ],

    sweepGroup: t({ tr: 'Grafik', en: 'Chart' }),
    sweepLabel: {
      [SWEEP_SETTLING]: t({ tr: 'Yerleşme eğrisi', en: 'Settling curve' }),
      [SWEEP_FILTER]: t({ tr: 'Filtre yanıtı', en: 'Filter response' }),
    },
    sweepAxis: {
      [SWEEP_SETTLING]: t({ tr: 'Süre (s)', en: 'Time (s)' }),
      [SWEEP_FILTER]: t({ tr: 'Frekans (Hz)', en: 'Frequency (Hz)' }),
    },
    sweepYLabel: {
      [SWEEP_SETTLING]: t({ tr: 'Kalan bağıl hata (ε)', en: 'Remaining relative error (ε)' }),
      [SWEEP_FILTER]: t({ tr: 'Zayıflatma (dB)', en: 'Attenuation (dB)' }),
    },
    sweepCaption: {
      [SWEEP_SETTLING]: t({
        tr: 'Hata zamanla üstel olarak azalır (log-y eksende düz çizgi); işaretçi gerçek '
          + 'acquisition süresindeki konumu gösterir.',
        en: 'The error decays exponentially with time (a straight line on a log-y axis); the '
          + 'marker shows the position at the actual acquisition time.',
      }),
      [SWEEP_FILTER]: t({
        tr: 'Kesim frekansının üstünde zayıflatma dekat başına ~20 dB artar (birinci '
          + 'dereceden filtre).',
        en: 'Above the cutoff frequency the attenuation increases by ~20 dB per decade '
          + '(first-order filter).',
      }),
    },
    operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),

    schematic: {
      title: t({ tr: 'ADC giriş eşdeğer devresi', en: 'ADC input equivalent circuit' }),
      caption: t({
        tr: 'Kaynak, seri ve anahtar direnci sampling kapasitörünü besliyor',
        en: 'Source, series and switch resistance charge the sampling capacitor',
      }),
      source: t({ tr: 'kaynak', en: 'source' }),
      filter: t({ tr: 'filtre', en: 'filter' }),
      adc: t({ tr: 'ADC', en: 'ADC' }),
      cs: t({ tr: 'C_s', en: 'C_s' }),
      switchR: t({ tr: 'anahtar', en: 'switch' }),
      rSeries: t({ tr: 'R_seri', en: 'R_series' }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_BITS:
          return t({
            tr: 'Çözünürlük (N) 1 veya daha büyük bir tam sayı olmalı.',
            en: 'The resolution (N) must be an integer of 1 or more.',
          })
        case ADC_ERR_BUFFER_REQUIRED:
          // Motor bu kodu yalnız `bufferRequired` bayrağı ile bildirir, üst
          // düzeyde başarısızlık üretmez (bkz. model.js) — bu dal pratikte
          // görünmez, tamlık için tutulur.
          return t({
            tr: 'İç dirençler bütçeyi tek başına tüketiyor; buffer gerekir.',
            en: 'The internal resistances alone consume the budget; a buffer is required.',
          })
        case REASON_INCOMPLETE:
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya '
              + 'virgül kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a positive numeric value in every required field. Use a point or a '
              + 'comma for decimals (0.25 = 0,25).',
          })
      }
    },

    // Mühendislik yorumu — motorun `level`/`findings` kavramı olmadığı için
    // ham `r`den burada kurulur (bkz. dosya başı notu).
    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: 'ok',
        text: t({
          tr: `R_eq,maks = ${fmtRes(r.maxEquivalentResistance)} — ${fmtS(r.acquisitionTime)} `
            + `acquisition süresinde ${fmtS(r.tau)} zaman sabitiyle.`,
          en: `R_eq,max = ${fmtRes(r.maxEquivalentResistance)} — with a ${fmtS(r.tau)} time `
            + `constant over a ${fmtS(r.acquisitionTime)} acquisition time.`,
        }),
      })

      out.push(r.settles
        ? {
          level: 'ok',
          text: t({
            tr: `Giriş yerleşiyor: marj ${fmtS(r.settlingMargin)}, kalan hata `
              + `${fmt(r.errorLsb, 3)} LSB.`,
            en: `The input settles: margin ${fmtS(r.settlingMargin)}, remaining error `
              + `${fmt(r.errorLsb, 3)} LSB.`,
          }),
        }
        : {
          key: ADC_ERR_SETTLING_FAILED,
          level: 'danger',
          text: t({
            tr: `Giriş YERLEŞMİYOR: acquisition süresi gerekenden ${fmtS(-r.settlingMargin)} `
              + `kısa. Kalan hata ${fmt(r.errorLsb, 2)} LSB — sonuç sessizce yanlış çıkar, `
              + 'hiçbir hata koddan görünmez.',
            en: `The input does NOT settle: the acquisition time is ${fmtS(-r.settlingMargin)} `
              + `short of what is required. The remaining error is ${fmt(r.errorLsb, 2)} LSB — `
              + 'the result is silently wrong, nothing shows up as an error code.',
          }),
        })

      if (r.maxSourceResistance != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `İç dirençler çıkarıldıktan sonra izin verilen maksimum kaynak direnci `
              + `${fmtRes(r.maxSourceResistance)}.`,
            en: `After subtracting the internal resistances, the maximum allowed source `
              + `resistance is ${fmtRes(r.maxSourceResistance)}.`,
          }),
        })
      } else if (r.bufferRequired) {
        out.push({
          key: ADC_ERR_BUFFER_REQUIRED,
          level: 'danger',
          text: t({
            tr: `Anahtar/seri/sürücü dirençleri tek başına ${fmtRes(r.maxEquivalentResistance)} `
              + 'bütçesini tüketiyor — kaynak direnci sıfır olsa bile yerleşmez. Bir buffer '
              + '(op-amp izleyici) gerekir.',
            en: `The switch/series/driver resistances alone consume the `
              + `${fmtRes(r.maxEquivalentResistance)} budget — it would not settle even with `
              + 'zero source resistance. A buffer (op-amp follower) is required.',
          }),
        })
      }

      if (r.cutoffFrequency != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `RC filtre kesim frekansı ${fmtHz(r.cutoffFrequency, 3)}`
              + `${r.filter ? `; ${fmtHz(r.noiseFreqInput, 3)}’te zayıflatma ${fmt(r.filter.attenuationDb, 3)} dB.` : '.'}`,
            en: `The RC filter cutoff frequency is ${fmtHz(r.cutoffFrequency, 3)}`
              + `${r.filter ? `; the attenuation at ${fmtHz(r.noiseFreqInput, 3)} is ${fmt(r.filter.attenuationDb, 3)} dB.` : '.'}`,
          }),
        })
      }

      if (r.droop != null) {
        out.push({
          level: 'warn',
          text: t({
            tr: `Charge-sharing droop tahmini ${fmtVolt(r.droop)} — ADC anahtar direncini ve `
              + 'sürücü dinamiğini ihmal eder, gerçek değer genelde daha küçüktür.',
            en: `The estimated charge-sharing droop is ${fmtVolt(r.droop)} — it ignores the `
              + 'ADC switch resistance and driver dynamics, the real value is generally '
              + 'smaller.',
          }),
        })
      }

      return out
    },
  }
}
