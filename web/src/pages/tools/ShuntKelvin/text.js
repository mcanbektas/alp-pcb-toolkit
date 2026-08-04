// Shunt direnci ve Kelvin bağlantı hesaplayıcısı ekranının kullanıcıya
// görünen metinleri — iki dilli (tr/en).
//
// Motorun (lib/shuntKelvin.js) bulgu/seviye kavramı yok — Adım 2'nin altı
// kardeş motorundan hiçbirinde `divider.js`-tipi bir `findings()` yok (bkz.
// ReturnPathStitchingVia/text.js başındaki not). Bulgular burada, ham
// `compute()` çıktısından `commentary(r)` ile kurulur.

import { fmt, fmtEng, fmtRes, fmtAmp, fmtPow } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  REASON_INCOMPLETE, REASON_BITS, SK_ERR_POWER_EXCEEDED,
  SWEEP_CURRENT, SWEEP_TEMP,
} from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)
  const p = (x, sig = 3) => pct(fmt(x * 100, sig))

  return {
    pct,
    backlink: t({ tr: '← PCB Akım, Güç ve Bakır', en: '← PCB Current, Power and Copper' }),
    title: t({
      tr: 'Shunt Direnci ve Kelvin Bağlantı Hesaplayıcı',
      en: 'Shunt Resistor and Kelvin Connection Calculator',
    }),
    intro: t({
      tr: 'Akım ölçüm shuntının gücünü, sıcaklık kaymasını ve Kelvin (dört uçlu) bağlantının '
        + 'ortak yol hatasını önlemesini değerlendirir; amplifikatör ve ADC zinciriyle birlikte '
        + 'worst-case ve RSS toplam hata bütçesini hesaplar.',
      en: 'Evaluates a current-sense shunt’s power, temperature drift, and how a Kelvin '
        + '(four-wire) connection avoids the shared-path error; computes the worst-case and '
        + 'RSS total error budget together with the amplifier and ADC chain.',
    }),

    fields: {
      iMax: { label: t({ tr: 'Tam ölçek akımı (I_maks)', en: 'Full-scale current (I_max)' }) },
      shuntMode: { label: t({ tr: 'Shunt değeri kaynağı', en: 'Shunt value source' }) },
      shuntDirect: t({ tr: 'Doğrudan direnç', en: 'Direct resistance' }),
      shuntFromVsense: t({ tr: 'Hedef sense geriliminden', en: 'From target sense voltage' }),
      shunt: { label: t({ tr: 'Shunt direnci', en: 'Shunt resistance' }) },
      vSenseFs: { label: t({ tr: 'Tam ölçek sense gerilimi (V_sense,FS)', en: 'Full-scale sense voltage (V_sense,FS)' }) },

      iRms: {
        label: t({ tr: 'RMS akım (opsiyonel)', en: 'RMS current (optional)' }),
        hint: t({ tr: 'Verilmezse I_maks kullanılır', en: 'If not given, I_max is used' }),
      },
      iPeak: { label: t({ tr: 'Tepe akım (opsiyonel)', en: 'Peak current (optional)' }) },
      iNominal: {
        label: t({ tr: 'Tipik işletme akımı (opsiyonel)', en: 'Typical operating current (optional)' }),
        hint: t({
          tr: 'Offset hatası bu akımda hesaplanır; verilmezse I_maks kullanılır',
          en: 'The offset error is evaluated at this current; if not given, I_max is used',
        }),
      },

      tolerance: { label: t({ tr: 'Shunt toleransı (opsiyonel)', en: 'Shunt tolerance (optional)' }) },
      tcrPpm: { label: t({ tr: 'TCR (ppm/°C, opsiyonel)', en: 'TCR (ppm/°C, optional)' }) },
      referenceTemp: { label: t({ tr: 'Referans sıcaklık (°C)', en: 'Reference temperature (°C)' }) },
      ambient: { label: t({ tr: 'Ortam sıcaklığı (°C)', en: 'Ambient temperature (°C)' }) },
      gain: { label: t({ tr: 'Amplifikatör kazancı (G)', en: 'Amplifier gain (G)' }) },
      gainTolerance: { label: t({ tr: 'Kazanç toleransı (opsiyonel)', en: 'Gain tolerance (optional)' }) },
      vos: { label: t({ tr: 'Amplifikatör giriş offset gerilimi (V_OS)', en: 'Amplifier input offset voltage (V_OS)' }) },
      sharedResistance: {
        label: t({ tr: 'Ortak bakır yolu direnci (opsiyonel)', en: 'Shared copper path resistance (optional)' }),
        hint: t({
          tr: 'Kelvin YOKKEN pad/iz üzerinden ölçüme karışan direnç',
          en: 'The resistance that leaks into the measurement via pads/traces WITHOUT Kelvin',
        }),
      },
      kelvinCheck: t({ tr: 'Kelvin (dört uçlu) bağlantı kullanılıyor', en: 'A Kelvin (four-wire) connection is used' }),

      hasThermalCheck: t({ tr: 'Termal ve güç sınırını değerlendir', en: 'Evaluate power and thermal limits' }),
      thermalResistance: { label: t({ tr: 'Termal direnç (R_θ)', en: 'Thermal resistance (R_θ)' }) },
      ratedPower: { label: t({ tr: 'Nominal güç (opsiyonel)', en: 'Rated power (optional)' }) },
      derating: {
        label: t({ tr: 'Derating (opsiyonel)', en: 'Derating (optional)' }),
        hint: t({ tr: 'Boş bırakılırsa %100 kullanılır', en: 'If left blank, 100% is used' }),
      },

      hasAdcCheck: t({ tr: 'Ölçüm zinciri çözünürlüğünü göster', en: 'Show the measurement chain resolution' }),
      vRef: { label: t({ tr: 'ADC referans gerilimi (opsiyonel)', en: 'ADC reference voltage (optional)' }) },
      bits: { label: t({ tr: 'ADC çözünürlüğü (N, opsiyonel)', en: 'ADC resolution (N, optional)' }) },
      enob: {
        label: t({ tr: 'Gerçek çözünürlük (ENOB, opsiyonel)', en: 'Effective resolution (ENOB, optional)' }),
        hint: t({
          tr: 'Gürültü ve doğrusalsızlık sonrası GERÇEK çözünürlük',
          en: 'The REAL resolution after noise and nonlinearity',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen kısa etiketler; model.js'e verilir.
    fieldLabels: {
      iMax: t({ tr: 'Tam ölçek akımı', en: 'Full-scale current' }),
      shunt: t({ tr: 'Shunt direnci', en: 'Shunt resistance' }),
      vSenseFs: t({ tr: 'Tam ölçek sense gerilimi', en: 'Full-scale sense voltage' }),
      iRms: t({ tr: 'RMS akım', en: 'RMS current' }),
      iPeak: t({ tr: 'Tepe akım', en: 'Peak current' }),
      iNominal: t({ tr: 'Tipik işletme akımı', en: 'Typical operating current' }),
      tolerance: t({ tr: 'Shunt toleransı', en: 'Shunt tolerance' }),
      tcrPpm: t({ tr: 'TCR', en: 'TCR' }),
      referenceTemp: t({ tr: 'Referans sıcaklık', en: 'Reference temperature' }),
      ambient: t({ tr: 'Ortam sıcaklığı', en: 'Ambient temperature' }),
      gain: t({ tr: 'Amplifikatör kazancı', en: 'Amplifier gain' }),
      gainTolerance: t({ tr: 'Kazanç toleransı', en: 'Gain tolerance' }),
      vos: t({ tr: 'Amplifikatör offset gerilimi', en: 'Amplifier offset voltage' }),
      sharedResistance: t({ tr: 'Ortak bakır yolu direnci', en: 'Shared copper path resistance' }),
      thermalResistance: t({ tr: 'Termal direnç', en: 'Thermal resistance' }),
      ratedPower: t({ tr: 'Nominal güç', en: 'Rated power' }),
      derating: t({ tr: 'Derating', en: 'Derating' }),
      vRef: t({ tr: 'ADC referans gerilimi', en: 'ADC reference voltage' }),
      bits: t({ tr: 'ADC çözünürlüğü', en: 'ADC resolution' }),
      enob: t({ tr: 'Gerçek çözünürlük (ENOB)', en: 'Effective resolution (ENOB)' }),
    },

    bigResultLabel: t({ tr: 'Shunt direnci', en: 'Shunt resistance' }),
    altLabels: {
      power: t({ tr: 'güç', en: 'power' }),
      resolution: t({ tr: 'akım çözünürlüğü', en: 'current resolution' }),
    },

    table: {
      senseVoltageFs: t({ tr: 'Tam ölçek sense gerilimi', en: 'Full-scale sense voltage' }),
      power: t({ tr: 'Güç (I_rms²·R)', en: 'Power (I_rms²·R)' }),
      peakPower: t({ tr: 'Tepe güç', en: 'Peak power' }),
      powerMargin: t({ tr: 'Güç marjı (nominal/gerçek)', en: 'Power margin (rated/actual)' }),
      temperatureRise: t({ tr: 'Sıcaklık yükselmesi', en: 'Temperature rise' }),
      temperature: t({ tr: 'Shunt sıcaklığı', en: 'Shunt temperature' }),
      resistanceHot: t({ tr: 'Sıcak direnç (R_hot)', en: 'Hot resistance (R_hot)' }),
      tcrErrorRow: t({ tr: 'TCR hatası', en: 'TCR error' }),
      amplifierOutputFs: t({ tr: 'Amplifikatör çıkışı (tam ölçek)', en: 'Amplifier output (full scale)' }),
      offsetCurrentError: t({ tr: 'Offset akım hatası (mutlak)', en: 'Offset current error (absolute)' }),
      currentResolution: t({ tr: 'Akım çözünürlüğü (N bit)', en: 'Current resolution (N bits)' }),
      currentResolutionEnob: t({ tr: 'Akım çözünürlüğü (ENOB)', en: 'Current resolution (ENOB)' }),
      sharedError: t({ tr: 'Ortak yol hatası', en: 'Shared-path error' }),
      offsetError: t({ tr: 'Offset hatası (bağıl, işletme akımında)', en: 'Offset error (relative, at operating current)' }),
      worstCaseError: t({ tr: 'Worst-case toplam hata', en: 'Worst-case total error' }),
      rssError: t({ tr: 'RSS toplam hata', en: 'RSS total error' }),
    },

    formula: t({
      tr: `R = V_sense,FS / I_maks   (hedef sense geriliminden)
P = I_rms²·R
T_shunt = T_ortam + P·R_θ
R_hot = R·(1 + TCR_ppm×10⁻⁶·(T − T_ref))

V_amp,FS = G·I_maks·R + V_OS
E_offset = |V_OS| / (I_işletme·R)      (bağıl)
E_ortak = R_ortak / R                  (Kelvin yoksa; Kelvin'de 0)

Çözünürlük = (V_ref/2^N) / (G·R)

E_worst-case = Σ|bileşenler|
E_RSS = √(Σ bileşen²)`,
      en: `R = V_sense,FS / I_max   (from target sense voltage)
P = I_rms²·R
T_shunt = T_ambient + P·R_θ
R_hot = R·(1 + TCR_ppm×10⁻⁶·(T − T_ref))

V_amp,FS = G·I_max·R + V_OS
E_offset = |V_OS| / (I_operating·R)    (relative)
E_shared = R_shared / R                (without Kelvin; 0 with Kelvin)

Resolution = (V_ref/2^N) / (G·R)

E_worst-case = Σ|components|
E_RSS = √(Σ component²)`,
    }),

    detail: {
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
      errorComponentsNote: t({
        tr: 'Bütün hata bileşenleri (tolerans, TCR, kazanç toleransı, offset, ortak yol) '
          + 'BAĞIL orandır — yüzde olarak gösterilir ama motor birimsiz oran kullanır.',
        en: 'All error components (tolerance, TCR, gain tolerance, offset, shared path) are '
          + 'RELATIVE ratios — shown as a percentage but the engine works in a unitless ratio.',
      }),
    },

    validity: [
      t({
        tr: 'RSS toplamı bileşenlerin istatistiksel BAĞIMSIZ olduğunu varsayar. Kazanç ve '
          + 'offset aynı amplifikatörden geliyorsa bu varsayım tutmayabilir ve RSS sonucu '
          + 'iyimser çıkar — bu yüzden worst-case ile birlikte gösterilir.',
        en: 'The RSS sum assumes the components are statistically INDEPENDENT. If gain and '
          + 'offset come from the same amplifier this assumption may not hold and the RSS '
          + 'result is optimistic — this is why it is shown together with the worst-case sum.',
      }),
      t({
        tr: 'Kelvin bağlantı modeli sense hatlarında ihmal edilebilir akım aktığını varsayar; '
          + 'amplifikatör giriş bias akımı ve asimetrik filtre dirençleri yine hata üretebilir.',
        en: 'The Kelvin connection model assumes negligible current flows in the sense lines; '
          + 'amplifier input bias current and asymmetric filter resistors can still introduce '
          + 'error.',
      }),
      t({
        tr: 'Düşük işletme akımında baskın hata kaynağı genelde amplifikatör offsetidir: aynı '
          + 'V_OS, yarı akımda iki kat bağıl hata demektir.',
        en: 'At low operating current the dominant error source is usually the amplifier '
          + 'offset: the same V_OS means twice the relative error at half the current.',
      }),
      t({
        tr: 'Sonuçlar yaklaşık mühendislik tahminidir — kritik tasarımlarda ölçümle doğrulayın.',
        en: 'Results are approximate engineering estimates — verify with measurement for '
          + 'critical designs.',
      }),
    ],

    sweepGroup: t({ tr: 'Grafik', en: 'Chart' }),
    sweepLabel: {
      [SWEEP_CURRENT]: t({ tr: 'Offset hatası / işletme akımı', en: 'Offset error / operating current' }),
      [SWEEP_TEMP]: t({ tr: 'Toplam hata / sıcaklık', en: 'Total error / temperature' }),
    },
    sweepAxis: {
      [SWEEP_CURRENT]: t({ tr: 'İşletme akımı (A)', en: 'Operating current (A)' }),
      [SWEEP_TEMP]: t({ tr: 'Sıcaklık (°C)', en: 'Temperature (°C)' }),
    },
    sweepYLabel: {
      [SWEEP_CURRENT]: t({ tr: 'Bağıl offset hatası', en: 'Relative offset error' }),
      [SWEEP_TEMP]: t({ tr: 'Worst-case toplam hata (bağıl)', en: 'Worst-case total error (relative)' }),
    },
    sweepCaption: {
      [SWEEP_CURRENT]: t({
        tr: 'Offset geriliminin mutlak akım karşılığı sabittir; akım düştükçe bağıl payı '
          + 'büyür (log-log eksende düz çizgi).',
        en: 'The offset voltage’s absolute current equivalent is fixed; as the current falls '
          + 'its relative share grows (a straight line on log-log axes).',
      }),
      [SWEEP_TEMP]: t({
        tr: 'Yalnız TCR bileşeni sıcaklıkla değişir; diğer bileşenler (tolerans, kazanç, '
          + 'offset, ortak yol) sabit tutulur.',
        en: 'Only the TCR component changes with temperature; the other components '
          + '(tolerance, gain, offset, shared path) are held fixed.',
      }),
    },
    operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),

    schematic: {
      title: t({ tr: 'Kelvin (dört uçlu) bağlantı', en: 'Kelvin (four-wire) connection' }),
      captionKelvin: t({
        tr: 'Akım ve sense hatları ayrık — ortak yol direnci ölçüme karışmaz',
        en: 'Current and sense lines are separate — the shared path resistance does not leak '
          + 'into the measurement',
      }),
      captionShared: t({
        tr: 'Sense noktaları akım padinden sonra — ortak bakır direnci ölçüme karışır',
        en: 'The sense points are downstream of the current pad — the shared copper '
          + 'resistance leaks into the measurement',
      }),
      shunt: t({ tr: 'shunt', en: 'shunt' }),
      currentPath: t({ tr: 'akım yolu', en: 'current path' }),
      sensePlus: t({ tr: 'sense+', en: 'sense+' }),
      senseMinus: t({ tr: 'sense−', en: 'sense−' }),
      amp: t({ tr: 'amp', en: 'amp' }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_BITS:
          return t({
            tr: 'ADC çözünürlüğü (N) girilecekse 1 veya daha büyük bir tam sayı olmalı.',
            en: 'If entered, the ADC resolution (N) must be an integer of 1 or more.',
          })
        case SK_ERR_POWER_EXCEEDED:
          // Motor bu kodu yalnız `powerExceeded` bayrağı ile bildirir, üst
          // düzeyde başarısızlık üretmez (bkz. model.js) — bu dal pratikte
          // görünmez, tamlık için tutulur.
          return t({
            tr: 'Gerçek güç, derating uygulanmış nominal gücü aşıyor.',
            en: 'The actual power exceeds the derated rated power.',
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
          tr: `Shunt ${fmtRes(r.shunt)}, tam ölçekte ${fmtPow(r.power)} güç harcıyor.`,
          en: `The shunt is ${fmtRes(r.shunt)}, dissipating ${fmtPow(r.power)} at full scale.`,
        }),
      })

      if (r.powerMargin != null) {
        out.push(r.powerExceeded
          ? {
            key: SK_ERR_POWER_EXCEEDED,
            level: 'danger',
            text: t({
              tr: `Gerçek güç, derating uygulanmış nominal gücü AŞIYOR (marj `
                + `${fmt(r.powerMargin, 3)}×). Daha yüksek güçlü bir shunt seçin.`,
              en: `The actual power EXCEEDS the derated rated power (margin `
                + `${fmt(r.powerMargin, 3)}×). Choose a higher-power shunt.`,
            }),
          }
          : {
            level: 'ok',
            text: t({
              tr: `Güç marjı ${fmt(r.powerMargin, 3)}× — nominal güç bütçesi içinde.`,
              en: `The power margin is ${fmt(r.powerMargin, 3)}× — within the rated power `
                + 'budget.',
            }),
          })
      }

      if (r.temperatureRise != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Kendi ısınmasıyla shunt sıcaklığı ${fmt(r.temperature, 3)} °C’ye çıkıyor `
              + `(+${fmt(r.temperatureRise, 3)} °C); sıcak direnç ${fmtRes(r.resistanceHot)}.`,
            en: `Self-heating raises the shunt temperature to ${fmt(r.temperature, 3)} °C `
              + `(+${fmt(r.temperatureRise, 3)} °C); the hot resistance is `
              + `${fmtRes(r.resistanceHot)}.`,
          }),
        })
      }

      out.push(r.kelvin
        ? {
          level: 'ok',
          text: t({
            tr: 'Kelvin (dört uçlu) bağlantı kullanılıyor — ortak bakır yolu direnci ölçüme '
              + 'karışmıyor.',
            en: 'A Kelvin (four-wire) connection is used — the shared copper path resistance '
              + 'does not leak into the measurement.',
          }),
        }
        : {
          level: r.sharedError > 0.02 ? 'danger' : 'warn',
          text: t({
            tr: `Kelvin bağlantı YOK: ortak yol direnci ölçüme ${p(r.sharedError)} bağıl hata `
              + 'olarak karışıyor — bu hata sistematiktir, kalibrasyonla gizlenebilir ama '
              + 'sıcaklık ve akımla birlikte kayar.',
            en: `NO Kelvin connection: the shared path resistance leaks ${p(r.sharedError)} `
              + 'relative error into the measurement — this error is systematic, it can be '
              + 'hidden by calibration but drifts with temperature and current.',
          }),
        })

      if (r.iNominalInput < r.iMaxInput * 0.5) {
        out.push({
          level: 'warn',
          text: t({
            tr: `İşletme akımı (${fmtAmp(r.iNominalInput)}) tam ölçeğin `
              + `${p(r.iNominalInput / r.iMaxInput)}’i — offset hatasının bağıl payı bu düşük `
              + `akımda ${p(r.offsetError)}’e çıkıyor.`,
            en: `The operating current (${fmtAmp(r.iNominalInput)}) is `
              + `${p(r.iNominalInput / r.iMaxInput)} of full scale — the offset error’s `
              + `relative share rises to ${p(r.offsetError)} at this low current.`,
          }),
        })
      }

      out.push({
        level: 'ok',
        text: t({
          tr: `Toplam hata bütçesi: worst-case ${p(r.worstCaseError)}, RSS ${p(r.rssError)} `
            + '(bileşenler bağımsız değilse RSS iyimser olabilir).',
          en: `Total error budget: worst-case ${p(r.worstCaseError)}, RSS ${p(r.rssError)} `
            + '(RSS may be optimistic if the components are not independent).',
        }),
      })

      if (r.currentResolution != null || r.currentResolutionEnob != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Akım çözünürlüğü: ${r.currentResolution != null ? fmtAmp(r.currentResolution) : '—'}`
              + `${r.currentResolutionEnob != null ? ` (ideal), ENOB ile ${fmtAmp(r.currentResolutionEnob)} (gerçek)` : ''}.`,
            en: `Current resolution: ${r.currentResolution != null ? fmtAmp(r.currentResolution) : '—'}`
              + `${r.currentResolutionEnob != null ? ` (ideal), ${fmtAmp(r.currentResolutionEnob)} with ENOB (real)` : ''}.`,
          }),
        })
      }

      return out
    },
  }
}
