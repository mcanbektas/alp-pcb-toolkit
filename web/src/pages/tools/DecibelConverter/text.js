// dB, kazanç ve dBm dönüştürücü ekranının kullanıcıya görünen metinleri —
// iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtEng, fmtOhm, fmtVolt } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import {
  MODE_POWER, MODE_VOLTAGE, MODE_DBM,
  DIR_FORWARD, DIR_REVERSE,
  REASON_RATIO, REASON_POWER, REASON_RANGE,
} from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  const methodNote = t({
    tr: 'dB bir orandır ve birimsizdir; dBm ise 1 mW referansına göre mutlak bir seviyedir. '
      + 'Kazanç seviyeye eklenebilir (P_çıkış[dBm] = P_giriş[dBm] + G[dB]), ancak iki dBm değeri '
      + 'birbiriyle toplanmaz.',
    en: 'dB is a ratio and is dimensionless; dBm is an absolute level referred to 1 mW. A gain '
      + 'can be added to a level (P_out[dBm] = P_in[dBm] + G[dB]), but two dBm values are never '
      + 'added together.',
  })

  const equalZNote = t({
    tr: '20·log₁₀(V₂/V₁) biçimi yalnızca giriş ve çıkış empedansları eşitken güç kazancına '
      + 'eşittir. Empedanslar farklıysa gerilim oranından bulunan dB, güç kazancını vermez; güç '
      + 'oranı doğrudan 10·log₁₀ ile hesaplanmalıdır.',
    en: 'The form 20·log₁₀(V₂/V₁) equals the power gain only when the input and output impedances '
      + 'are equal. If the impedances differ, the dB found from the voltage ratio does not give '
      + 'the power gain; the power ratio must be computed directly with 10·log₁₀.',
  })

  return {
    backlink: t({
      tr: '← Dönüştürücüler',
      en: '← Converters',
    }),
    title: t({
      tr: 'Desibel, Kazanç ve dBm Dönüştürücü',
      en: 'Decibel, Gain & dBm Converter',
    }),
    intro: t({
      tr: 'Güç ve gerilim oranlarını dB\'ye, dB değerini oranlara çevirir; ayrıca 1 mW referanslı '
        + 'dBm seviyesi ile mW/W arasında dönüşüm yapar ve seçilen referans empedansta RMS gerilim '
        + 'karşılığını gösterir. 10·log₁₀ ile 20·log₁₀ arasındaki farkı ve bu farkın hangi koşulda '
        + 'geçerli olduğunu birlikte değerlendirir.',
      en: 'Converts power and voltage ratios to dB and a dB value back to ratios; it also converts '
        + 'between a dBm level referred to 1 mW and mW/W, and shows the RMS voltage equivalent at '
        + 'the selected reference impedance. It presents the difference between 10·log₁₀ and '
        + '20·log₁₀ together with the condition under which that difference holds.',
    }),

    modeLabel: {
      [MODE_POWER]: t({ tr: 'Güç oranı', en: 'Power ratio' }),
      [MODE_VOLTAGE]: t({ tr: 'Gerilim oranı', en: 'Voltage ratio' }),
      [MODE_DBM]: t({ tr: 'dBm seviyesi', en: 'dBm level' }),
    },

    dirLabel: {
      [MODE_POWER]: {
        [DIR_FORWARD]: t({ tr: 'İki güçten dB', en: 'dB from two powers' }),
        [DIR_REVERSE]: t({ tr: 'dB değerinden güç oranı', en: 'Power ratio from a dB value' }),
      },
      [MODE_VOLTAGE]: {
        [DIR_FORWARD]: t({ tr: 'İki gerilimden dB', en: 'dB from two voltages' }),
        [DIR_REVERSE]: t({ tr: 'dB değerinden gerilim oranı', en: 'Voltage ratio from a dB value' }),
      },
      [MODE_DBM]: {
        [DIR_FORWARD]: t({ tr: 'Güçten dBm', en: 'dBm from power' }),
        [DIR_REVERSE]: t({ tr: 'dBm değerinden güç', en: 'Power from a dBm value' }),
      },
    },

    fields: {
      dir: t({ tr: 'Dönüşüm yönü', en: 'Conversion direction' }),
      P1: { label: t({ tr: 'Giriş gücü (P₁)', en: 'Input power (P₁)' }) },
      P2: {
        label: t({ tr: 'Çıkış gücü (P₂)', en: 'Output power (P₂)' }),
        hint: t({
          tr: 'Oran P₂/P₁ olarak alınır; iki değer de sıfırdan büyük olmalı',
          en: 'The ratio is taken as P₂/P₁; both values must be greater than zero',
        }),
      },
      P1Optional: {
        hint: t({
          tr: 'İsteğe bağlı — girilirse çıkış gücü de hesaplanır',
          en: 'Optional — if entered, the output power is computed as well',
        }),
      },
      dB: {
        label: t({ tr: 'Kazanç (G)', en: 'Gain (G)' }),
        hint: t({ tr: 'Negatif değer zayıflamadır', en: 'A negative value is attenuation' }),
      },
      V1: { label: t({ tr: 'Giriş gerilimi (V₁)', en: 'Input voltage (V₁)' }) },
      V2: {
        label: t({ tr: 'Çıkış gerilimi (V₂)', en: 'Output voltage (V₂)' }),
        hint: t({
          tr: 'İki gerilim de aynı türden olmalı (ikisi de RMS ya da ikisi de tepe)',
          en: 'Both voltages must be of the same kind (both RMS or both peak)',
        }),
      },
      V1Optional: {
        hint: t({
          tr: 'İsteğe bağlı — girilirse çıkış gerilimi de hesaplanır',
          en: 'Optional — if entered, the output voltage is computed as well',
        }),
      },
      P: {
        label: t({ tr: 'Güç (P)', en: 'Power (P)' }),
        hint: t({
          tr: 'Sıfırdan büyük olmalı; 0 W için dBm tanımsızdır',
          en: 'Must be greater than zero; dBm is undefined for 0 W',
        }),
      },
      dBm: {
        label: t({ tr: 'Güç seviyesi', en: 'Power level' }),
        hint: t({
          tr: '0 dBm = 1 mW; negatif değer 1 mW altını gösterir',
          en: '0 dBm = 1 mW; a negative value indicates below 1 mW',
        }),
      },
      Z: {
        label: t({ tr: 'Referans empedans (Z₀)', en: 'Reference impedance (Z₀)' }),
        hint: t({
          tr: 'RMS gerilim karşılığı bu empedansta hesaplanır',
          en: 'The RMS voltage equivalent is computed at this impedance',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      P1: t({ tr: 'Giriş gücü (P₁)', en: 'Input power (P₁)' }),
      P2: t({ tr: 'Çıkış gücü (P₂)', en: 'Output power (P₂)' }),
      V1: t({ tr: 'Giriş gerilimi (V₁)', en: 'Input voltage (V₁)' }),
      V2: t({ tr: 'Çıkış gerilimi (V₂)', en: 'Output voltage (V₂)' }),
      dB: t({ tr: 'Kazanç (G)', en: 'Gain (G)' }),
      P: t({ tr: 'Güç (P)', en: 'Power (P)' }),
      dBm: t({ tr: 'Güç seviyesi', en: 'Power level' }),
      Z: t({ tr: 'Referans empedans (Z₀)', en: 'Reference impedance (Z₀)' }),
    },

    bigDbm: {
      label: t({ tr: 'Güç seviyesi', en: 'Power level' }),
      rms: (v, z) => t({ tr: `${v} RMS @ ${z}`, en: `${v} RMS @ ${z}` }),
    },
    bigGain: {
      label: t({ tr: 'Kazanç', en: 'Gain' }),
      alt: (p, v) => t({
        tr: `güç oranı ×${p} · gerilim oranı ×${v}`,
        en: `power ratio ×${p} · voltage ratio ×${v}`,
      }),
    },

    dbmTable: {
      head: t({ tr: 'Seviye', en: 'Level' }),
      headSub: t({ tr: '1 mW referansına göre', en: 'referred to 1 mW' }),
      power: t({ tr: 'Güç', en: 'Power' }),
      ratio: t({ tr: 'Referansa oran', en: 'Ratio to the reference' }),
      ratioSub: '(P / 1 mW)',
      voltageHeading: t({
        tr: 'Referans empedansta gerilim',
        en: 'Voltage at the reference impedance',
      }),
      refZ: t({ tr: 'Referans empedans', en: 'Reference impedance' }),
      vrms: t({ tr: 'RMS gerilim', en: 'RMS voltage' }),
      vrmsSub: '(V = √(P·Z₀))',
    },

    gainTable: {
      head: t({ tr: 'Oran', en: 'Ratio' }),
      headSub: t({ tr: 'dB karşılığı', en: 'dB equivalent' }),
      powerRatio: t({ tr: 'Güç oranı P₂/P₁', en: 'Power ratio P₂/P₁' }),
      voltageRatio: t({ tr: 'Gerilim oranı V₂/V₁', en: 'Voltage ratio V₂/V₁' }),
      voltageSub: t({ tr: '(20·log₁₀, eşit empedans)', en: '(20·log₁₀, equal impedance)' }),
      gain: t({ tr: 'Kazanç', en: 'Gain' }),
      ioHeading: t({ tr: 'Giriş ve çıkış', en: 'Input and output' }),
      P1: t({ tr: 'Giriş gücü P₁', en: 'Input power P₁' }),
      P2: t({ tr: 'Çıkış gücü P₂', en: 'Output power P₂' }),
      V1: t({ tr: 'Giriş gerilimi V₁', en: 'Input voltage V₁' }),
      V2: t({ tr: 'Çıkış gerilimi V₂', en: 'Output voltage V₂' }),
    },

    formula: t({
      tr: `Güç oranı:
  G_dB = 10·log₁₀(P₂/P₁)

Gerilim oranı (eşit empedansta):
  G_dB = 20·log₁₀(V₂/V₁)

Ters dönüşüm:
  P₂/P₁ = 10^(G_dB/10)
  V₂/V₁ = 10^(G_dB/20)

Mutlak seviye — dBm (ref. 1 mW):
  P_dBm = 10·log₁₀(P_mW)
  P_mW = 10^(P_dBm/10)
  P_W = 10^((P_dBm − 30)/10)

Referans empedansta RMS gerilim:
  P = V²/R  →  V_RMS = √(P·Z₀)`,
      en: `Power ratio:
  G_dB = 10·log₁₀(P₂/P₁)

Voltage ratio (at equal impedance):
  G_dB = 20·log₁₀(V₂/V₁)

Inverse conversion:
  P₂/P₁ = 10^(G_dB/10)
  V₂/V₁ = 10^(G_dB/20)

Absolute level — dBm (ref. 1 mW):
  P_dBm = 10·log₁₀(P_mW)
  P_mW = 10^(P_dBm/10)
  P_W = 10^((P_dBm − 30)/10)

RMS voltage at the reference impedance:
  P = V²/R  →  V_RMS = √(P·Z₀)`,
    }),

    detail: {
      dbm: (r) => [
        t({
          tr: `Referansa oran P/1 mW = ${fmt(r.powerRatio, 6)}; 10·log₁₀ ile `
            + `${fmt(r.dBm, 6)} dBm.`,
          en: `Ratio to the reference P/1 mW = ${fmt(r.powerRatio, 6)}; with 10·log₁₀ that is `
            + `${fmt(r.dBm, 6)} dBm.`,
        }),
        t({
          tr: `${fmtOhm(r.Z)} üzerinde V_RMS = √(${fmtEng(r.W, 'W', 5)} · ${fmtOhm(r.Z)}) = `
            + `${fmtVolt(r.Vrms)}.`,
          en: `Across ${fmtOhm(r.Z)}, V_RMS = √(${fmtEng(r.W, 'W', 5)} · ${fmtOhm(r.Z)}) = `
            + `${fmtVolt(r.Vrms)}.`,
        }),
        t({
          tr: 'W ve mW aynı seviyeden bağımsız olarak türetilir: 10^((dBm−30)/10) ile '
            + '10^(dBm/10)/1000 aynı sonucu verir.',
          en: 'W and mW are derived independently from the same level: 10^((dBm−30)/10) and '
            + '10^(dBm/10)/1000 give the same result.',
        }),
      ],
      gain: (r) => [
        t({
          tr: `Güç oranı ${fmt(r.powerRatio, 6)}; 10·log₁₀ ile ${fmt(r.dB, 6)} dB.`,
          en: `Power ratio ${fmt(r.powerRatio, 6)}; with 10·log₁₀ that is ${fmt(r.dB, 6)} dB.`,
        }),
        t({
          tr: `Aynı dB değerinin gerilim oranı karşılığı 10^(G/20) = ${fmt(r.voltageRatio, 6)}; `
            + 'güç oranı bunun karesidir.',
          en: `The voltage-ratio equivalent of the same dB value is `
            + `10^(G/20) = ${fmt(r.voltageRatio, 6)}; the power ratio is its square.`,
        }),
        r.mode === MODE_VOLTAGE
          ? t({
            tr: 'Hesap gerilim oranı üzerinden yürütüldü; diğer oran aynı dB değerinden '
              + 'türetildi.',
            en: 'The calculation was carried through the voltage ratio; the other ratio was '
              + 'derived from the same dB value.',
          })
          : t({
            tr: 'Hesap güç oranı üzerinden yürütüldü; diğer oran aynı dB değerinden türetildi.',
            en: 'The calculation was carried through the power ratio; the other ratio was derived '
              + 'from the same dB value.',
          }),
      ],
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    // --- Kaynak ve tanım bilgisi ---
    //
    // Sağ panelde ayrı başlık altında listelenir. Kullanıcıya basılan metin
    // dahili doküman göndermesi içermez; tanımın kendisini söyler.
    sourceNotes: [
      t({
        tr: 'Ekran yalnızca dB tanımından çıkan bağıntıları kullanır: güç oranı 10·log₁₀(P₂/P₁), '
          + 'gerilim oranı 20·log₁₀(V₂/V₁), ters dönüşümler 10^(G/10) ile 10^(G/20), ve dBm için '
          + '10·log₁₀(P_mW), 10^(P_dBm/10), 10^((P_dBm − 30)/10). Hiçbiri ampirik katsayı, eğri '
          + 'uydurma ya da tablo içermez.',
        en: 'The screen uses only the relations that follow from the definition of the dB: power '
          + 'ratio 10·log₁₀(P₂/P₁), voltage ratio 20·log₁₀(V₂/V₁), the inverse conversions '
          + '10^(G/10) and 10^(G/20), and for dBm 10·log₁₀(P_mW), 10^(P_dBm/10), '
          + '10^((P_dBm − 30)/10). None of them contains an empirical coefficient, a curve fit or '
          + 'a table.',
      }),
      t({
        tr: 'Gerilim oranı biçiminin geçerlilik koşulu tanımın bir parçasıdır: 20·log₁₀(V₂/V₁) '
          + 'yalnızca empedanslar eşitken güç kazancına eşittir. Koşul sağlanmıyorsa gerilim '
          + 'oranından bulunan sayı bir gerilim oranı olarak doğru kalır ama güç kazancı '
          + 'DEĞİLDİR; o durumda güç kazancı doğrudan 10·log₁₀(P₂/P₁) ile hesaplanmalıdır. Ekran '
          + 'giriş ve çıkış empedanslarını bilmediği için bu koşulu doğrulayamaz — koşulun '
          + 'sağlandığını kullanıcı garanti eder.',
        en: 'The validity condition of the voltage-ratio form is part of the definition: '
          + '20·log₁₀(V₂/V₁) equals the power gain only when the impedances are equal. If the '
          + 'condition does not hold, the number found from the voltage ratio remains correct as '
          + 'a voltage ratio but is NOT the power gain; in that case the power gain must be '
          + 'computed directly with 10·log₁₀(P₂/P₁). The screen cannot verify this condition '
          + 'because it does not know the input and output impedances — the user guarantees that '
          + 'it holds.',
      }),
      t({
        tr: 'dBm tanım gereği 10·log₁₀(P_mW)\'dır. P_mW gücün miliwatt cinsinden değeri olduğu '
          + 'için referans 1 mW\'tır: dBm bir oran değil, bu referansa bağlı MUTLAK bir '
          + 'seviyedir. 0 dBm tam olarak 1 mW demektir; negatif dBm 1 mW\'ın altını gösterir. '
          + 'Ters bağıntı P_W = 10^((P_dBm − 30)/10) içindeki 30 dB, watt ile miliwatt arasındaki '
          + '1000 çarpanının dB karşılığıdır.',
        en: 'By definition dBm is 10·log₁₀(P_mW). Because P_mW is the power expressed in '
          + 'milliwatts, the reference is 1 mW: dBm is not a ratio but an ABSOLUTE level tied to '
          + 'that reference. 0 dBm means exactly 1 mW; a negative dBm indicates below 1 mW. The '
          + '30 dB in the inverse relation P_W = 10^((P_dBm − 30)/10) is the dB equivalent of the '
          + 'factor 1000 between watt and milliwatt.',
      }),
      t({
        tr: 'Buradan çıkan ayrım toplama kuralını belirler: dB birimsiz bir orandır ve bir '
          + 'seviyeye eklenebilir (P_çıkış[dBm] = P_giriş[dBm] + G[dB]), dBm ise seviyedir ve iki '
          + 'seviye birbirine eklenemez.',
        en: 'The distinction that follows sets the addition rule: dB is a dimensionless ratio and '
          + 'can be added to a level (P_out[dBm] = P_in[dBm] + G[dB]), whereas dBm is a level and '
          + 'two levels cannot be added to each other.',
      }),
      t({
        tr: 'Referans empedanstaki RMS gerilim dB tanımından değil, güç bağıntısı P = V²/R\'den '
          + 'gelir: V_RMS = √(P·Z₀). Dönüşüm listesine ek olarak verilir ve belirli bir referans '
          + 'empedansa bağlı değildir; Z₀ kullanıcı girdisidir.',
        en: 'The RMS voltage at the reference impedance comes not from the dB definition but from '
          + 'the power relation P = V²/R: V_RMS = √(P·Z₀). It is given in addition to the '
          + 'conversion list and is not tied to a particular reference impedance; Z₀ is a user '
          + 'input.',
      }),
    ],

    validity: [
      // --- Sayısal geçerlilik aralığı (spec §12: "Geçerlilik aralığı") ---
      //
      // Sınırların kaynağı convertDecibel.js: ratioGuard() pozitif olmayan
      // oranı reddeder, finiteOrRange() sonuç sonlu değilse aralık hatası
      // döner. Sayılar çift duyarlıklı kayan noktanın (IEEE-754 binary64)
      // sınırlarıdır.
      {
        text: t({
          tr: 'Logaritma yalnızca pozitif argüman için tanımlıdır. Geçerli aralık P₂/P₁ > 0 ve '
            + 'V₂/V₁ > 0\'dır; oran tam sıfır ya da negatifken dB karşılığı yoktur ve hesap '
            + 'yerine hata gösterilir. Sıfır ya da negatif bir oran için sayı üretmek, tanımsız '
            + 'bir sonucu geçerli gibi göstermek olurdu. Aynı kural mutlak seviyede de '
            + 'geçerlidir: P > 0, 0 W için dBm tanımsızdır. Referans empedans için de Z₀ > 0 '
            + 'gerekir.',
          en: 'The logarithm is defined only for a positive argument. The valid range is '
            + 'P₂/P₁ > 0 and V₂/V₁ > 0; when the ratio is exactly zero or negative there is no dB '
            + 'equivalent and an error is shown instead of a result. Producing a number for a '
            + 'zero or negative ratio would present an undefined result as if it were valid. The '
            + 'same rule applies to the absolute level: P > 0, and dBm is undefined for 0 W. The '
            + 'reference impedance likewise requires Z₀ > 0.',
        }),
      },
      {
        text: t({
          tr: 'Ters yönde (dB\'den orana) üst sınır G ≈ 3082.55 dB\'dir: bu değerin üstünde '
            + '10^(G/10), çift duyarlıklı kayan noktanın en büyük değerini (1.7977×10³⁰⁸) aşar ve '
            + 'aralık hatası döner. Ekran her iki oranı birlikte ürettiği için bağlayıcı sınır '
            + '10·log₁₀ yoludur; 20·log₁₀ yolu tek başına ancak G ≈ 6165.09 dB\'de taşardı. Aynı '
            + 'sınır mutlak seviyede de geçerlidir: P_dBm ≈ 3082.55 dBm.',
          en: 'In the inverse direction (dB to ratio) the upper limit is G ≈ 3082.55 dB: above it '
            + '10^(G/10) exceeds the largest double-precision floating-point value '
            + '(1.7977×10³⁰⁸) and a range error is returned. Because the screen produces both '
            + 'ratios together, the binding limit is the 10·log₁₀ path; the 20·log₁₀ path on its '
            + 'own would overflow only at G ≈ 6165.09 dB. The same limit applies to the absolute '
            + 'level: P_dBm ≈ 3082.55 dBm.',
        }),
      },
      {
        text: t({
          tr: 'Alt uçta davranış farklıdır ve hata verilmez: G ≈ −3236.07 dB\'nin altında '
            + '10^(G/10) tam sıfıra iner. Sıfır sonlu bir sayı olduğu için aralık kontrolü '
            + 'tetiklenmez ve oran sütununda 0 görünür. Bu bir taşma değil, alt taşmadır — sonuç '
            + 'sıfıra yuvarlanmıştır, gerçekten sıfır değildir.',
          en: 'At the lower end the behaviour differs and no error is raised: below '
            + 'G ≈ −3236.07 dB, 10^(G/10) falls to exactly zero. Because zero is a finite number '
            + 'the range check is not triggered and a 0 appears in the ratio column. This is not '
            + 'an overflow but an underflow — the result has been rounded to zero, it is not '
            + 'truly zero.',
        }),
      },
      {
        text: t({
          tr: 'İleri yönde (güçten dBm\'e) üst sınır P ≈ 1.7977×10³⁰⁵ W\'tır; bunun üstünde '
            + 'gücün miliwatt karşılığı (P / 1 mW) temsil edilemez.',
          en: 'In the forward direction (power to dBm) the upper limit is P ≈ 1.7977×10³⁰⁵ W; '
            + 'above it the milliwatt equivalent of the power (P / 1 mW) cannot be represented.',
        }),
      },
      {
        text: t({
          tr: 'Bu sınırlar fiziksel değil sayısal sınırlardır; denklemden değil, sayının '
            + 'bilgisayarda tutulma biçiminden gelir. Gerçek bir kazanç ya da güç seviyesi bu '
            + 'sınırlara yaklaşmaz — birkaç yüz dB\'yi aşan bir giriş genellikle birim hatasına '
            + 'işaret eder.',
          en: 'These limits are numerical, not physical; they come from how the number is stored '
            + 'in the computer, not from the equation. A real gain or power level never comes '
            + 'near them — an input beyond a few hundred dB usually signals a unit mistake.',
        }),
      },

      { warn: true, text: equalZNote },
      {
        text: t({
          tr: 'Gerilim oranı hesabında iki gerilimin aynı türden olduğu varsayılır; RMS ile tepe '
            + 'değeri karıştırılırsa sonuç sabit bir hata taşır.',
          en: 'The voltage-ratio calculation assumes both voltages are of the same kind; mixing '
            + 'RMS with peak leaves a constant error in the result.',
        }),
      },
      { warn: true, text: methodNote },
      {
        text: t({
          tr: 'dBm 1 mW referansına bağlıdır. dBW (1 W), dBµV (1 µV) gibi başka referanslarla '
            + 'karıştırılmamalıdır: dBm = dBW + 30.',
          en: 'dBm is tied to the 1 mW reference. It must not be confused with other references '
            + 'such as dBW (1 W) or dBµV (1 µV): dBm = dBW + 30.',
        }),
      },
      {
        text: t({
          tr: 'RMS gerilim karşılığı, gücün tamamının referans empedans üzerinde harcandığını '
            + 'varsayar. Uyumsuz hatta yansıyan güç bu varsayımı bozar.',
          en: 'The RMS voltage equivalent assumes all the power is dissipated in the reference '
            + 'impedance. On a mismatched line the reflected power breaks this assumption.',
        }),
      },
      {
        text: t({
          tr: 'Model yalnızca cebirsel dönüşüm yapar; frekans bağımlılığı, gürültü tabanı ve '
            + 'doğrusal olmayan davranış hesaba katılmaz.',
          en: 'The model performs an algebraic conversion only; frequency dependence, noise floor '
            + 'and non-linear behaviour are not accounted for.',
        }),
      },
      {
        text: t({
          tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
          en: 'Results are approximate — verify against manufacturer data and measurement for '
            + 'critical designs.',
        }),
      },
    ],

    chart: {
      ratio: {
        x: t({ tr: 'Oran (P₂/P₁ veya V₂/V₁)', en: 'Ratio (P₂/P₁ or V₂/V₁)' }),
        y: t({ tr: 'Kazanç (dB)', en: 'Gain (dB)' }),
        power: t({ tr: 'güç oranı — 10·log₁₀', en: 'power ratio — 10·log₁₀' }),
        voltage: t({ tr: 'gerilim oranı — 20·log₁₀', en: 'voltage ratio — 20·log₁₀' }),
        caption: t({
          tr: 'Aynı sayısal oran, güç için 10·log₁₀ ve gerilim için 20·log₁₀ ile iki farklı dB '
            + 'değeri verir; gerilim eğrisi her zaman güç eğrisinin iki katıdır. İşaretli nokta '
            + 'seçilen moda ait çalışma noktasıdır. Gerilim eğrisi yalnızca giriş ve çıkış '
            + 'empedansları eşitken güç kazancını temsil eder.',
          en: 'The same numerical ratio gives two different dB values — 10·log₁₀ for power and '
            + '20·log₁₀ for voltage; the voltage curve is always twice the power curve. The '
            + 'marked point is the operating point of the selected mode. The voltage curve '
            + 'represents the power gain only when the input and output impedances are equal.',
        }),
      },
      dbm: {
        x: t({ tr: 'Güç (mW)', en: 'Power (mW)' }),
        y: t({ tr: 'Seviye (dBm)', en: 'Level (dBm)' }),
        series: t({ tr: 'seviye — 10·log₁₀(P_mW)', en: 'level — 10·log₁₀(P_mW)' }),
        caption: t({
          tr: 'dBm 1 mW referansına göre mutlak seviyedir: gücün her on katı 10 dB, her iki katı '
            + '3.01 dB ekler. Logaritmik x ekseninde bağıntı doğrusaldır.',
          en: 'dBm is an absolute level referred to 1 mW: every factor of ten in power adds 10 dB '
            + 'and every factor of two adds 3.01 dB. On a logarithmic x axis the relation is '
            + 'linear.',
        }),
      },
      marker: t({ tr: 'seçilen', en: 'selected' }),
    },

    schematic: {
      title: t({ tr: 'İki kapılı kazanç bloğu', en: 'Two-port gain block' }),
      captionDbm: t({
        tr: 'Mutlak seviye referans empedans üzerinde tanımlıdır',
        en: 'An absolute level is defined across a reference impedance',
      }),
      captionRatio: t({
        tr: 'Giriş ve çıkış büyüklüğünün oranı dB olarak yazılır',
        en: 'The ratio of the input and output quantities is written in dB',
      }),
      ratioValue: (v) => t({ tr: `oran ×${v}`, en: `ratio ×${v}` }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_RATIO:
          return t({
            tr: 'Logaritma yalnızca pozitif oran için tanımlıdır. Güç ve gerilim değerleri '
              + 'sıfırdan büyük olmalı; oran sıfır ya da negatif olduğunda dB karşılığı yoktur.',
            en: 'The logarithm is defined only for a positive ratio. The power and voltage values '
              + 'must be greater than zero; when the ratio is zero or negative there is no dB '
              + 'equivalent.',
          })
        case REASON_POWER:
          return t({
            tr: 'dBm mutlak güç seviyesidir: güç sıfırdan büyük olmalı, 0 W için dBm tanımsızdır. '
              + 'Referans empedans da pozitif olmalıdır.',
            en: 'dBm is an absolute power level: the power must be greater than zero and dBm is '
              + 'undefined for 0 W. The reference impedance must be positive as well.',
          })
        case REASON_RANGE:
          return t({
            tr: 'Girişler geçerli, ancak sonuç kayan nokta aralığının dışına taşıyor: 10^(G/10) '
              + 'yaklaşık G > 3082.55 dB değerinde sayı olarak temsil edilemez (üst sınır '
              + '1.7977×10³⁰⁸). İleri yönde aynı sınır güçte P ≈ 1.7977×10³⁰⁵ W olarak karşımıza '
              + 'çıkar. Sonsuz bir değer göstermek yerine hesap durduruldu; daha küçük bir kazanç '
              + 'ya da seviye girin.',
            en: 'The inputs are valid but the result overflows the floating-point range: '
              + '10^(G/10) cannot be represented as a number beyond about G > 3082.55 dB (upper '
              + 'bound 1.7977×10³⁰⁸). In the forward direction the same limit appears in power as '
              + 'P ≈ 1.7977×10³⁰⁵ W. Rather than show an infinite value the calculation was '
              + 'stopped; enter a smaller gain or level.',
          })
        default:
          return t({
            tr: 'Tüm zorunlu alanlara sayısal değer girin. Ondalık için nokta veya virgül '
              + 'kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a numeric value in every required field. Use a point or a comma for '
              + 'decimals (0.25 = 0,25).',
          })
      }
    },

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      if (r.mode === MODE_DBM) {
        out.push({
          level: 'ok',
          text: t({
            tr: `${fmtEng(r.W, 'W', 4)} güç, 1 mW referansına göre ${fmt(r.mW, 4)}× oran demektir; `
              + `10·log₁₀ ile ${fmt(r.dBm, 4)} dBm.`,
            en: `A power of ${fmtEng(r.W, 'W', 4)} means a ratio of ${fmt(r.mW, 4)}× against the `
              + `1 mW reference; with 10·log₁₀ that is ${fmt(r.dBm, 4)} dBm.`,
          }),
        })
        out.push({
          level: 'ok',
          text: t({
            tr: `${fmtOhm(r.Z)} üzerinde bu seviye ${fmtVolt(r.Vrms)} RMS gerilime karşılık gelir. `
              + 'Gerilim tepe değeri değil, etkin (RMS) değerdir.',
            en: `Across ${fmtOhm(r.Z)} this level corresponds to ${fmtVolt(r.Vrms)} RMS. The `
              + 'voltage is the effective (RMS) value, not the peak value.',
          }),
        })
        out.push({
          level: 'warn',
          text: t({
            tr: 'RMS gerilim, gücün tamamının referans empedans üzerinde harcandığı varsayımıyla '
              + 'bulunur. Uyumsuz hatta gücün bir kısmı yansır ve gerçek gerilim bu değerden '
              + 'sapar.',
            en: 'The RMS voltage is found assuming all the power is dissipated in the reference '
              + 'impedance. On a mismatched line part of the power is reflected and the real '
              + 'voltage departs from this value.',
          }),
        })
        if (r.dBm > 0) {
          out.push({
            level: 'ok',
            text: t({
              tr: 'Seviye 0 dBm üzerinde, yani güç 1 mW referansından büyük. Negatif dBm '
                + 'değerleri 1 mW altını gösterir.',
              en: 'The level is above 0 dBm, i.e. the power is greater than the 1 mW reference. '
                + 'Negative dBm values indicate below 1 mW.',
            }),
          })
        } else if (r.dBm < 0) {
          out.push({
            level: 'ok',
            text: t({
              tr: 'Seviye 0 dBm altında, yani güç 1 mW referansından küçük. İşaret referansın '
                + 'hangi tarafında olunduğunu söyler.',
              en: 'The level is below 0 dBm, i.e. the power is smaller than the 1 mW reference. '
                + 'The sign tells which side of the reference you are on.',
            }),
          })
        }
        return out
      }

      const gain = r.dB > 0
      const unity = Math.abs(r.dB) < 1e-9

      if (r.mode === MODE_POWER) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Güç oranı ${fmt(r.powerRatio, 4)}× → 10·log₁₀ ile ${fmt(r.dB, 4)} dB.`,
            en: `Power ratio ${fmt(r.powerRatio, 4)}× → with 10·log₁₀ that is ${fmt(r.dB, 4)} dB.`,
          }),
        })
        out.push({
          level: 'warn',
          text: t({
            tr: `Aynı dB değerinin gerilim oranı karşılığı ${fmt(r.voltageRatio, 4)}×'tir. Bu `
              + 'satır yalnızca giriş ve çıkış empedansları eşitken geçerlidir; empedanslar '
              + 'farklıysa gerilim oranı bu değerden sapar.',
            en: `The voltage-ratio equivalent of the same dB value is ${fmt(r.voltageRatio, 4)}×. `
              + 'This row holds only when the input and output impedances are equal; if they '
              + 'differ, the voltage ratio departs from this value.',
          }),
        })
      } else {
        out.push({
          level: 'ok',
          text: t({
            tr: `Gerilim oranı ${fmt(r.voltageRatio, 4)}× → 20·log₁₀ ile ${fmt(r.dB, 4)} dB.`,
            en: `Voltage ratio ${fmt(r.voltageRatio, 4)}× → with 20·log₁₀ that is `
              + `${fmt(r.dB, 4)} dB.`,
          }),
        })
        out.push({
          level: 'warn',
          text: t({
            tr: `Bu dönüşüm empedansların eşit olduğunu varsayar. Eşitse güç oranı gerilim `
              + `oranının karesidir: ${fmt(r.voltageRatio, 4)}² = ${fmt(r.powerRatio, 4)}×. `
              + 'Empedanslar farklıysa bu eşitlik bozulur.',
            en: `This conversion assumes the impedances are equal. If they are, the power ratio is `
              + `the square of the voltage ratio: ${fmt(r.voltageRatio, 4)}² = `
              + `${fmt(r.powerRatio, 4)}×. If the impedances differ, this equality breaks down.`,
          }),
        })
      }

      if (unity) {
        out.push({
          level: 'ok',
          text: t({
            tr: '0 dB birim kazançtır: çıkış girişe eşittir. Sıfır dB "sinyal yok" demek değildir.',
            en: '0 dB is unity gain: the output equals the input. Zero dB does not mean "no '
              + 'signal".',
          }),
        })
      } else {
        out.push({
          level: 'ok',
          text: gain
            ? t({
              tr: `Pozitif dB kazanç demektir: çıkış giriş büyüklüğünün üzerindedir. Güç `
                + `${fmt(r.powerRatio, 4)} katına çıkar.`,
              en: `A positive dB means gain: the output is above the input quantity. The power `
                + `rises to ${fmt(r.powerRatio, 4)} times its value.`,
            })
            : t({
              tr: `Negatif dB zayıflama demektir: çıkış giriş büyüklüğünün altındadır. Güç `
                + `${fmt(r.powerRatio, 4)} katına iner.`,
              en: `A negative dB means attenuation: the output is below the input quantity. The `
                + `power falls to ${fmt(r.powerRatio, 4)} times its value.`,
            }),
        })
      }

      out.push({
        level: 'ok',
        text: t({
          tr: 'Aklınızda kalması için: güçte 3.01 dB iki kat, 10 dB on kat; gerilimde 6.02 dB iki '
            + 'kat, 20 dB on kattır.',
          en: 'A useful rule of thumb: in power 3.01 dB is a factor of two and 10 dB a factor of '
            + 'ten; in voltage 6.02 dB is a factor of two and 20 dB a factor of ten.',
        }),
      })

      return out
    },
  }
}
