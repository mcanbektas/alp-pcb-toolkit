// Junction sıcaklığı ve soğutucu ekranının kullanıcıya görünen metinleri —
// iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni, grafik başlığı) fonksiyon olarak
// döner ki mantık tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtEng, fmtWatt } from '../../../lib/num'
import { fromSI, AREA } from '../../../lib/units'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  EXCLUDE_CONVECTION, EXCLUDE_RADIATION, EXCLUDE_SPREADING,
  EXCLUDE_PACKAGE_INTERNALS, EXCLUDE_NEIGHBOURING_SOURCES,
} from '../../../lib/thermal'
import {
  MODE_JUNCTION, MODE_HEATSINK, MODE_SURFACE,
  PSI_JT, PSI_JB, COPPER_OFF, COPPER_ON,
  REASON_ENGINE, REASON_TJMAX_LE_TA,
} from './model'

// --- Marj eşiği ---
//
// DİKKAT: bu eşik MÜHENDİSLİK YORUMUDUR, docs/spec.md §8.3 – §8.6'dan GELMEZ.
// thermal.js yalnızca margin ve within üretir, bir eşik tanımlamaz; spec de
// junction sıcaklığı için kabul edilebilir marj sınırı vermez. Aşağıdaki değer
// yaygın bir başlangıç kabulü olarak seçilmiştir ve spec'ten doğrulanamaz.
const MARGIN_WARN_C = 10

// `.big-result` alt satırındaki parça ayırıcı. Eskiden JSX içinde
// `&nbsp;·&nbsp;` yazılıyordu; metin text.js'e taşınınca aynı bölünmezlik
// kaybolmasın diye ayırıcı bölünemez boşlukla kurulur — satır sonu noktanın
// önünde ya da arkasında kırılmaz.
const SEP = ' \u00A0·\u00A0 '

// Simge; birim sembolü gibi çevrilmez, iki dilde aynı basılır.
const METRIC_SHORT = {
  [PSI_JT]: 'Ψ_JT',
  [PSI_JB]: 'Ψ_JB',
}

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  // Ekranın iki yerinde birebir aynı geçen notlar; tek kopya tutulur.
  const thetaNote = t({
    tr: 'θ_JA paketin değişmez fiziksel özelliği DEĞİLDİR. Test kartı, bakır alanı, hava akışı '
      + 've montaj şartlarından etkilenir; katalog değeri üreticinin test kartına aittir. Kendi '
      + 'kartınızda ölçülen değer belirgin biçimde farklı çıkabilir.',
    en: 'θ_JA is NOT an invariant physical property of the package. It is affected by the test '
      + 'board, the copper area, the airflow and the mounting conditions; the datasheet value '
      + 'belongs to the manufacturer\'s test board. The value measured on your own board can come '
      + 'out noticeably different.',
  })

  const psiNote = t({
    tr: 'Ψ ve θ aynı şey değildir. θ_JC tek boyutlu bir yol direncidir; Ψ_JT ise paketten dışarı '
      + 'kaçan ısının yalnızca bir kısmını gören ampirik bir metriktir. Paket üstünden ölçüm '
      + 'yapıldığında θ_JC doğrudan kullanılmaz — üreticinin Ψ değeri gerekir.',
    en: 'Ψ and θ are not the same thing. θ_JC is a one-dimensional path resistance, whereas Ψ_JT '
      + 'is an empirical metric that sees only a part of the heat leaving the package. When the '
      + 'measurement is taken on top of the package, θ_JC is not used directly — the '
      + 'manufacturer\'s Ψ value is required.',
  })

  const firstOrderNote = t({
    tr: 'Bakır termal ağı sonucu ilk derece termal ağ tahminidir: yalnızca iletim yolu '
      + 'modellenmiştir.',
    en: 'The copper thermal network result is a first-order thermal network estimate: only the '
      + 'conduction path is modelled.',
  })

  const marginThresholdNote = t({
    tr: `Marj eşiği (${MARGIN_WARN_C} °C altı uyarı) bu ekranın mühendislik yorumudur; kullanılan `
      + 'termal direnç denklemleri böyle bir sınır tanımlamaz. Gereken marj ortam sıcaklığı '
      + 'aralığına, θ değerlerindeki üretim saçılmasına ve komponentin ömür hedefine göre değişir.',
    en: `The margin threshold (a warning below ${MARGIN_WARN_C} °C) is this screen's engineering `
      + 'judgement; the thermal resistance equations used define no such limit. The margin needed '
      + 'depends on the ambient temperature range, on the production spread of the θ values and on '
      + 'the lifetime target of the component.',
  })

  // Termal yolun baskın parçası — iyileştirme oradan seçilir
  const pathLabel = {
    jc: t({ tr: 'paket içi yol (θ_JC)', en: 'the path inside the package (θ_JC)' }),
    cs: t({ tr: 'termal arayüz (θ_CS)', en: 'the thermal interface (θ_CS)' }),
    sa: t({ tr: 'soğutucu (θ_SA)', en: 'the heatsink (θ_SA)' }),
  }

  const dominantPath = (shares) => {
    const list = [
      { key: 'jc', v: shares.jc },
      { key: 'cs', v: shares.cs },
      { key: 'sa', v: shares.sa },
    ]
    return list.reduce((a, b) => (b.v > a.v ? b : a))
  }

  // lib/thermal.js `excludes` alanını dil bilmeyen KOD olarak döndürür; kodu
  // okunabilir ada çeviren yer burasıdır. Anahtarlar motorun dışa aktardığı
  // sabitlerden gelir, elle yazılmaz. Tanınmayan bir kod olduğu gibi geçirilir —
  // liste sessizce kısalmaz.
  const excludeLabel = {
    [EXCLUDE_CONVECTION]: t({ tr: 'konveksiyon', en: 'convection' }),
    [EXCLUDE_RADIATION]: t({ tr: 'radyasyon', en: 'radiation' }),
    [EXCLUDE_SPREADING]: t({ tr: 'iki boyutlu yayılım', en: 'two-dimensional spreading' }),
    [EXCLUDE_PACKAGE_INTERNALS]: t({
      tr: 'paket iç yapısı',
      en: 'the internal structure of the package',
    }),
    [EXCLUDE_NEIGHBOURING_SOURCES]: t({
      tr: 'komşu ısı kaynakları',
      en: 'neighbouring heat sources',
    }),
  }
  const excludeList = (items) => items.map((x) => excludeLabel[x] ?? x).join(', ')

  return {
    backlink: t({ tr: '← Güç Bütünlüğü ve Termal', en: '← Power Integrity and Thermal' }),
    // categories.js'teki kayıtla birebir aynı kalır
    title: t({ tr: 'Jonksiyon Sıcaklığı ve Soğutucu', en: 'Junction Temperature & Heatsink' }),
    intro: t({
      tr: 'Komponentin junction sıcaklığını ortam sıcaklığı ve termal dirençten hesaplar; gereken '
        + 'soğutucu direncini bulur, ölçülen yüzey sıcaklığından junction tahmini üretir ve '
        + 'isteğe bağlı olarak kart üzerindeki bakır termal ağını modeller.',
      en: 'Computes the junction temperature of a component from the ambient temperature and the '
        + 'thermal resistance; finds the required heatsink resistance, produces a junction '
        + 'estimate from a measured surface temperature and optionally models the copper thermal '
        + 'network on the board.',
    }),

    modeLabel: {
      [MODE_JUNCTION]: 'Junction (θ_JA)',
      [MODE_HEATSINK]: t({ tr: 'Soğutucu', en: 'Heatsink' }),
      [MODE_SURFACE]: t({ tr: 'Yüzey ölçümü', en: 'Surface measurement' }),
    },

    metricLabel: {
      [PSI_JT]: t({
        tr: 'Paket üstünden ölçüm (Ψ_JT)',
        en: 'Measured on top of the package (Ψ_JT)',
      }),
      [PSI_JB]: t({
        tr: 'Kart üzerinden ölçüm (Ψ_JB)',
        en: 'Measured on the board (Ψ_JB)',
      }),
    },

    metricShort: METRIC_SHORT,

    copperLabel: {
      [COPPER_OFF]: t({ tr: 'Hesaplama', en: 'Do not compute' }),
      [COPPER_ON]: t({
        tr: 'Bakır şerit + dielektrik paralel yolunu ekle',
        en: 'Add the parallel copper strip + dielectric path',
      }),
    },

    // Yüzde işaretinin yeri dile göre değişir: Türkçede önde, İngilizcede arkada.
    // Sayının kendisi num.js ile biçimlenir, burada yalnızca işaret yerleşir.
    pct,
    fields: {
      Tsurface: {
        label: t({ tr: 'Ölçülen sıcaklık', en: 'Measured temperature' }),
        hint: t({
          tr: 'Termal kamera veya termokupl ile okunan yüzey sıcaklığı',
          en: 'The surface temperature read with a thermal camera or a thermocouple',
        }),
      },
      metric: {
        label: t({ tr: 'Ölçüm noktası', en: 'Measurement point' }),
        hint: t({
          tr: 'Ψ değeri yalnızca kendi ölçüm noktasıyla geçerlidir',
          en: 'A Ψ value is valid only together with its own measurement point',
        }),
      },
      psi: {
        // Etiket seçilen metrik simgesini taşır (Ψ_JT / Ψ_JB)
        label: (short) => t({ tr: `${short} değeri`, en: `${short} value` }),
        hint: t({
          tr: 'Üreticinin verdiği ampirik metrik — θ değeri değildir',
          en: 'The empirical metric given by the manufacturer — it is not a θ value',
        }),
      },
      Ta: {
        label: t({ tr: 'Ortam sıcaklığı (T_A)', en: 'Ambient temperature (T_A)' }),
        hint: t({
          tr: 'Kutu içi sıcaklık; oda sıcaklığı değil',
          en: 'The temperature inside the enclosure; not room temperature',
        }),
      },
      P: { label: t({ tr: 'Güç kaybı (P)', en: 'Power dissipation (P)' }) },
      thetaJA: {
        label: t({
          tr: 'Junction–ortam direnci (θ_JA)',
          en: 'Junction-to-ambient resistance (θ_JA)',
        }),
        hint: t({
          tr: 'Katalog değeri üreticinin test kartına aittir',
          en: 'The datasheet value belongs to the manufacturer\'s test board',
        }),
      },
      thetaJC: {
        label: t({
          tr: 'Junction–case direnci (θ_JC)',
          en: 'Junction-to-case resistance (θ_JC)',
        }),
      },
      thetaCS: {
        label: t({
          tr: 'Case–soğutucu direnci (θ_CS)',
          en: 'Case-to-heatsink resistance (θ_CS)',
        }),
        hint: t({
          tr: 'Termal arayüz malzemesi; montaj basıncına bağlıdır',
          en: 'The thermal interface material; it depends on the mounting pressure',
        }),
      },
      thetaSA: {
        label: t({
          tr: 'Seçilen soğutucu direnci (θ_SA) — opsiyonel',
          en: 'Selected heatsink resistance (θ_SA) — optional',
        }),
        hint: t({
          tr: 'Girilirse T_J, marj ve yol payları da hesaplanır',
          en: 'If entered, T_J, the margin and the path shares are computed as well',
        }),
      },
      TjMax: {
        label: t({
          tr: 'İzin verilen junction sıcaklığı (T_J,max)',
          en: 'Allowed junction temperature (T_J,max)',
        }),
        labelOptional: t({
          tr: 'İzin verilen junction sıcaklığı (T_J,max) — opsiyonel',
          en: 'Allowed junction temperature (T_J,max) — optional',
        }),
      },
      copper: {
        label: t({
          tr: 'Bakır termal ağı (kart üzeri yayılım)',
          en: 'Copper thermal network (spreading on the board)',
        }),
        hint: t({
          tr: 'Bakır şerit ile dielektriği paralel iki iletim yolu olarak ekler',
          en: 'Adds the copper strip and the dielectric as two parallel conduction paths',
        }),
      },
      Lcu: { label: t({ tr: 'Bakır şerit uzunluğu (L)', en: 'Copper strip length (L)' }) },
      Wcu: { label: t({ tr: 'Bakır şerit genişliği (W)', en: 'Copper strip width (W)' }) },
      tcu: { label: t({ tr: 'Bakır kalınlığı (t)', en: 'Copper thickness (t)' }) },
      Hdi: { label: t({ tr: 'Dielektrik kalınlığı (H)', en: 'Dielectric thickness (H)' }) },
      area: {
        label: t({ tr: 'Dielektrik alanı (A)', en: 'Dielectric area (A)' }),
        hint: t({
          tr: 'Isının dielektrik üzerinden geçtiği yüzey alanı',
          en: 'The surface area through which the heat crosses the dielectric',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      Ta: t({ tr: 'Ortam sıcaklığı (T_A)', en: 'Ambient temperature (T_A)' }),
      P: t({ tr: 'Güç kaybı (P)', en: 'Power dissipation (P)' }),
      thetaJA: t({
        tr: 'Junction–ortam direnci (θ_JA)',
        en: 'Junction-to-ambient resistance (θ_JA)',
      }),
      TjMax: t({
        tr: 'İzin verilen junction sıcaklığı (T_J,max)',
        en: 'Allowed junction temperature (T_J,max)',
      }),
      thetaJC: t({
        tr: 'Junction–case direnci (θ_JC)',
        en: 'Junction-to-case resistance (θ_JC)',
      }),
      thetaCS: t({
        tr: 'Case–soğutucu direnci (θ_CS)',
        en: 'Case-to-heatsink resistance (θ_CS)',
      }),
      thetaSA: t({
        tr: 'Seçilen soğutucu direnci (θ_SA)',
        en: 'Selected heatsink resistance (θ_SA)',
      }),
      Tsurface: t({ tr: 'Ölçülen sıcaklık', en: 'Measured temperature' }),
      psi: t({ tr: 'Ψ değeri', en: 'Ψ value' }),
      Lcu: t({ tr: 'Bakır şerit uzunluğu (L)', en: 'Copper strip length (L)' }),
      Wcu: t({ tr: 'Bakır şerit genişliği (W)', en: 'Copper strip width (W)' }),
      tcu: t({ tr: 'Bakır kalınlığı (t)', en: 'Copper thickness (t)' }),
      Hdi: t({ tr: 'Dielektrik kalınlığı (H)', en: 'Dielectric thickness (H)' }),
      area: t({ tr: 'Dielektrik alanı (A)', en: 'Dielectric area (A)' }),
    },

    formula: {
      [MODE_JUNCTION]: t({
        tr: `T_J = T_A + P·θ_JA
  kararlı hâl, tek boyutlu
  termal direnç modeli

P_max = (T_J,max − T_A) / θ_JA
kullanım = P / P_max

θ_JA sabit bir paket özelliği
DEĞİLDİR:
  test kartı, bakır alanı, hava
  akışı ve montaj şartları
  değeri değiştirir.`,
        en: `T_J = T_A + P·θ_JA
  steady state, one-dimensional
  thermal resistance model

P_max = (T_J,max − T_A) / θ_JA
utilisation = P / P_max

θ_JA is NOT a fixed package
property:
  the test board, the copper
  area, the airflow and the
  mounting conditions change it.`,
      }),

      [MODE_HEATSINK]: t({
        tr: `T_J = T_A + P·(θ_JC + θ_CS + θ_SA)
  seri termal direnç zinciri

termal bütçe = (T_J,max − T_A) / P
θ_SA,max = bütçe − θ_JC − θ_CS

θ_SA,max ≤ 0 →
  hiçbir soğutucu yetmez;
  gücü azalt, hava akışını artır
  veya farklı paket seç.`,
        en: `T_J = T_A + P·(θ_JC + θ_CS + θ_SA)
  series thermal resistance chain

thermal budget = (T_J,max − T_A) / P
θ_SA,max = budget − θ_JC − θ_CS

θ_SA,max ≤ 0 →
  no heatsink is enough;
  reduce the power, raise the
  airflow or pick another package.`,
      }),

      [MODE_SURFACE]: t({
        tr: `paket üstü: T_J ≈ T_top + Ψ_JT·P
kart üzeri: T_J ≈ T_board + Ψ_JB·P
  ampirik Ψ metriğiyle tahmin

Ψ ≠ θ
  θ_JC tek boyutlu bir yol
  direncidir.
  Ψ_JT paketten kaçan ısının
  yalnızca bir kısmını gören
  ampirik metriktir.
  Paket üstü ölçümde θ_JC
  kullanılmaz.`,
        en: `package top: T_J ≈ T_top + Ψ_JT·P
board:       T_J ≈ T_board + Ψ_JB·P
  estimate with the empirical
  Ψ metric

Ψ ≠ θ
  θ_JC is a one-dimensional
  path resistance.
  Ψ_JT is an empirical metric
  that sees only a part of the
  heat leaving the package.
  For a measurement on top of
  the package θ_JC is not used.`,
      }),
    },

    copperFormula: t({
      tr: `ilk derece termal ağ:
bakır şerit: R_θ = L / (k_Cu·W·t)
dielektrik: R_θ = H / (k_FR4·A)
paralel: R_θ,eq = [ Σ 1/R_θ,i ]⁻¹
artış: ΔT = P · R_θ,eq`,
      en: `first-order thermal network:
copper strip: R_θ = L / (k_Cu·W·t)
dielectric: R_θ = H / (k_FR4·A)
parallel: R_θ,eq = [ Σ 1/R_θ,i ]⁻¹
rise: ΔT = P · R_θ,eq`,
    }),

    bigLabel: {
      junction: t({ tr: 'Junction sıcaklığı', en: 'Junction temperature' }),
      sinkNeeded: t({
        tr: 'Gereken maksimum soğutucu direnci',
        en: 'Required maximum heatsink resistance',
      }),
      surface: t({ tr: 'Tahmini junction sıcaklığı', en: 'Estimated junction temperature' }),
    },

    bigAlt: {
      junction: (Ta, rise) => t({
        tr: `ortam ${Ta} °C${SEP}artış P·θ_JA = ${rise} °C`,
        en: `ambient ${Ta} °C${SEP}rise P·θ_JA = ${rise} °C`,
      }),
      heatsinkWithSink: (saMax, total) => t({
        tr: `θ_SA,max = ${saMax} °C/W${SEP}toplam yol ${total} °C/W`,
        en: `θ_SA,max = ${saMax} °C/W${SEP}total path ${total} °C/W`,
      }),
      heatsinkNoSink: (budget, jc, cs) => t({
        tr: `termal bütçe ${budget} °C/W${SEP}θ_JC ${jc} · θ_CS ${cs} °C/W`,
        en: `thermal budget ${budget} °C/W${SEP}θ_JC ${jc} · θ_CS ${cs} °C/W`,
      }),
      surface: (short, Ts, rise) => t({
        tr: `${short} ile ölçülen ${Ts} °C üzerine ${rise} °C`,
        en: `${rise} °C on top of the ${Ts} °C measured with ${short}`,
      }),
    },

    thetaNote,
    psiNote,
    firstOrderNote,

    table: {
      Tj: t({ tr: 'Junction sıcaklığı (T_J)', en: 'Junction temperature (T_J)' }),
      rise: t({ tr: 'Sıcaklık artışı (P·θ_JA)', en: 'Temperature rise (P·θ_JA)' }),
      TjMax: t({ tr: 'İzin verilen sıcaklık (T_J,max)', en: 'Allowed temperature (T_J,max)' }),
      margin: t({ tr: 'Marj', en: 'Margin' }),
      Pmax: t({ tr: 'Maksimum güç (P_max)', en: 'Maximum power (P_max)' }),
      utilisation: t({ tr: 'Kullanım oranı', en: 'Utilisation' }),

      budget: t({
        tr: 'Termal bütçe (T_J,max − T_A)/P',
        en: 'Thermal budget (T_J,max − T_A)/P',
      }),
      thetaSAmax: t({ tr: 'Gereken θ_SA,max', en: 'Required θ_SA,max' }),
      thetaJC: t({ tr: 'Junction–case (θ_JC)', en: 'Junction-to-case (θ_JC)' }),
      thetaCS: t({ tr: 'Case–soğutucu (θ_CS)', en: 'Case-to-heatsink (θ_CS)' }),
      thetaTotal: t({
        tr: 'Toplam yol (θ_JC + θ_CS + θ_SA)',
        en: 'Total path (θ_JC + θ_CS + θ_SA)',
      }),
      shareHead: t({ tr: 'Yol payları', en: 'Path shares' }),
      shareCols: 'θ_JC · θ_CS · θ_SA',
      shareRow: t({ tr: 'Toplam dirençteki pay', en: 'Share of the total resistance' }),

      TjEstimate: t({
        tr: 'Tahmini junction sıcaklığı (T_J)',
        en: 'Estimated junction temperature (T_J)',
      }),
      metricUsed: t({ tr: 'Kullanılan metrik', en: 'Metric used' }),
      metricValue: t({ tr: 'Metrik değeri (Ψ)', en: 'Metric value (Ψ)' }),
      psiRise: t({ tr: 'Artış (Ψ·P)', en: 'Rise (Ψ·P)' }),
      Tsurface: t({ tr: 'Ölçülen sıcaklık', en: 'Measured temperature' }),

      copperHead: t({ tr: 'Bakır termal ağı', en: 'Copper thermal network' }),
      copperHeadNote: t({ tr: 'ilk derece tahmin', en: 'first-order estimate' }),
      copperStrip: t({ tr: 'Bakır şerit (R_θ)', en: 'Copper strip (R_θ)' }),
      copperDielectric: t({ tr: 'Dielektrik (R_θ)', en: 'Dielectric (R_θ)' }),
      copperEq: t({ tr: 'Paralel eşdeğer (R_θ,eq)', en: 'Parallel equivalent (R_θ,eq)' }),
      copperShares: t({
        tr: 'Yolların payı (bakır · dielektrik)',
        en: 'Share of the paths (copper · dielectric)',
      }),
      copperRise: t({
        tr: 'Sıcaklık artışı (ΔT = P·R_θ,eq)',
        en: 'Temperature rise (ΔT = P·R_θ,eq)',
      }),
    },

    detail: {
      junction: (r) => t({
        tr: `Eğrinin eğimi θ_JA = ${fmt(r.thetaJA, 4)} °C/W: her watt ${fmt(r.thetaJA, 4)} °C `
          + `artış demektir. Marj ${fmt(r.margin, 4)} °C, kullanım oranı `
          + `${pct(fmt(r.utilisation * 100, 4))}.`,
        en: `The slope of the curve is θ_JA = ${fmt(r.thetaJA, 4)} °C/W: every watt means `
          + `${fmt(r.thetaJA, 4)} °C of rise. Margin ${fmt(r.margin, 4)} °C, utilisation `
          + `${pct(fmt(r.utilisation * 100, 4))}.`,
      }),
      heatsink: (r) => t({
        tr: `Termal bütçe ${fmt(r.budget, 4)} °C/W; paket ve arayüz bunun `
          + `${fmt(r.thetaJC, 4)} + ${fmt(r.thetaCS, 4)} °C/W kadarını harcıyor, soğutucuya `
          + `${fmt(r.thetaSAmax, 4)} °C/W kalıyor.`,
        en: `Thermal budget ${fmt(r.budget, 4)} °C/W; the package and the interface spend `
          + `${fmt(r.thetaJC, 4)} + ${fmt(r.thetaCS, 4)} °C/W of it, leaving `
          + `${fmt(r.thetaSAmax, 4)} °C/W for the heatsink.`,
      }),
      surface: (r) => t({
        tr: `Kullanılan metrik ${METRIC_SHORT[r.metric]}. Motorun sonucu bunun bir yol direnci `
          + 'olmadığını taşır; θ_JC ile yer değiştiremez.',
        en: `The metric used is ${METRIC_SHORT[r.metric]}. The engine result carries the fact `
          + 'that it is not a path resistance; it cannot be swapped with θ_JC.',
      }),
      copper: (r) => t({
        tr: `Bakır şerit iletkenliği ${fmt(r.copper.strip.k, 4)} W/(m·K), dielektrik `
          + `${fmt(r.copper.dielectric.k, 4)} W/(m·K). Kesit `
          + `${fmtEng(r.copper.strip.W, 'm', 3)} × ${fmtEng(r.copper.strip.t, 'm', 3)}, `
          + `dielektrik alanı ${fmt(fromSI(r.copper.dielectric.area, 'mm²', AREA), 4)} mm².`,
        en: `Copper strip conductivity ${fmt(r.copper.strip.k, 4)} W/(m·K), dielectric `
          + `${fmt(r.copper.dielectric.k, 4)} W/(m·K). Cross-section `
          + `${fmtEng(r.copper.strip.W, 'm', 3)} × ${fmtEng(r.copper.strip.t, 'm', 3)}, `
          + `dielectric area ${fmt(fromSI(r.copper.dielectric.area, 'mm²', AREA), 4)} mm².`,
      }),
      degreeUnits: t({
        tr: 'Sıcaklık farkı üzerinden çalışıldığı için °C ve K aynı sonucu verir; termal '
          + 'dirençte °C/W ile K/W aynı büyüklüktür.',
        en: 'Because the work is done on a temperature difference, °C and K give the same '
          + 'result; for thermal resistance °C/W and K/W are the same quantity.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    // Geçerlilik listesi: strong varsa başlık cümlesi kalın basılır.
    validity: [
      {
        strong: t({
          tr: 'θ_JA paketin değişmez özelliği değildir.',
          en: 'θ_JA is not an invariant property of the package.',
        }),
        text: t({
          tr: 'Test PCB\'si, bakır alanı, hava akışı ve montaj şartlarından etkilenir; katalog '
            + 'değeri üreticinin test kartına aittir. Kendi yığınınızda ölçülen değer farklı '
            + 'çıkacaktır.',
          en: 'It is affected by the test PCB, the copper area, the airflow and the mounting '
            + 'conditions; the datasheet value belongs to the manufacturer\'s test board. The '
            + 'value measured in your own stack-up will come out different.',
        }),
      },
      {
        strong: t({
          tr: 'Ψ ve θ aynı şey değildir.',
          en: 'Ψ and θ are not the same thing.',
        }),
        text: t({
          tr: 'θ_JC tek boyutlu bir yol direncidir; Ψ_JT paketten kaçan ısının yalnızca bir '
            + 'kısmını gören ampirik bir metriktir. Paket üstünden ölçüm yapıldığında θ_JC '
            + 'doğrudan kullanılmaz.',
          en: 'θ_JC is a one-dimensional path resistance; Ψ_JT is an empirical metric that sees '
            + 'only a part of the heat leaving the package. When the measurement is taken on top '
            + 'of the package, θ_JC is not used directly.',
        }),
      },
      {
        text: t({
          tr: 'θ_SA,max negatif çıkarsa hiçbir soğutucu yetmez: bütçe paket ve arayüzde '
            + 'tükenmiştir. Çözüm gücü azaltmak, hava akışını artırmak veya farklı paket '
            + 'seçmektir.',
          en: 'If θ_SA,max comes out negative, no heatsink is enough: the budget has been used up '
            + 'by the package and the interface. The remedy is to reduce the power, increase the '
            + 'airflow or choose a different package.',
        }),
      },
      { text: marginThresholdNote },
      {
        text: t({
          tr: 'Bakır termal ağı sonucu ilk derece termal ağ tahminidir; yalnızca iletim '
            + 'modellenir. Konveksiyon, radyasyon, iki boyutlu yayılım, paket iç yapısı ve komşu '
            + 'ısı kaynakları modelde yoktur.',
          en: 'The copper thermal network result is a first-order thermal network estimate; only '
            + 'conduction is modelled. Convection, radiation, two-dimensional spreading, the '
            + 'internal structure of the package and neighbouring heat sources are not in the '
            + 'model.',
        }),
      },
      {
        strong: t({
          tr: 'Tüm modeller kararlı haldir.',
          en: 'All models are steady-state.',
        }),
        text: t({
          tr: 'Geçici ısınma modellenmez: termal kütlenin gecikmesi, darbeli yük altındaki tepe '
            + 'sıcaklık ve ısınma zaman sabiti bu ekranda hesaplanmaz. Kısa süreli tepe güçler '
            + 'burada görünmez.',
          en: 'Transient heating is not modelled: the lag of the thermal mass, the peak '
            + 'temperature under a pulsed load and the heating time constant are not computed on '
            + 'this screen. Short-duration peak powers do not show up here.',
        }),
      },
      {
        text: t({
          tr: 'Termal dirençler tek boyutlu ve doğrusal kabul edilir; sıcaklıkla değişen malzeme '
            + 'iletkenliği ve konveksiyonun sıcaklık farkına bağlılığı hesaba katılmaz.',
          en: 'The thermal resistances are assumed one-dimensional and linear; the temperature '
            + 'dependence of the material conductivity and the dependence of convection on the '
            + 'temperature difference are not taken into account.',
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
      [MODE_JUNCTION]: {
        x: t({ tr: 'Güç kaybı P (W)', en: 'Power dissipation P (W)' }),
        y: t({ tr: 'Junction sıcaklığı T_J (°C)', en: 'Junction temperature T_J (°C)' }),
        caption: t({
          tr: 'T_J güçle doğrusal artar; eğrinin eğimi θ_JA değeridir. Referans çizgi izin '
            + 'verilen T_J,max, işaret ise çalışma noktasıdır.',
          en: 'T_J rises linearly with power; the slope of the curve is θ_JA. The reference line '
            + 'is the allowed T_J,max and the marker is the operating point.',
        }),
      },
      [MODE_HEATSINK]: {
        x: t({ tr: 'Soğutucu direnci θ_SA (°C/W)', en: 'Heatsink resistance θ_SA (°C/W)' }),
        y: t({ tr: 'Junction sıcaklığı T_J (°C)', en: 'Junction temperature T_J (°C)' }),
        caption: t({
          tr: 'Soğutucu direnci arttıkça T_J doğrusal yükselir. Eğrinin T_J,max çizgisini '
            + 'kestiği yer θ_SA,max değeridir; sağındaki her soğutucu sınırın dışında kalır.',
          en: 'As the heatsink resistance increases, T_J rises linearly. Where the curve crosses '
            + 'the T_J,max line is θ_SA,max; every heatsink to the right of it falls outside the '
            + 'limit.',
        }),
      },
      [MODE_SURFACE]: {
        x: t({ tr: 'Güç kaybı P (W)', en: 'Power dissipation P (W)' }),
        y: t({
          tr: 'Tahmini junction sıcaklığı T_J (°C)',
          en: 'Estimated junction temperature T_J (°C)',
        }),
        caption: t({
          tr: 'Ölçülen yüzey sıcaklığı sabit tutulduğunda tahmin güçle doğrusal artar; eğim Ψ '
            + 'değeridir.',
          en: 'With the measured surface temperature held constant the estimate rises linearly '
            + 'with power; the slope is Ψ.',
        }),
      },
      // Seri adları ve referans etiketi yalnızca simge ve birim taşır
      seriesTj: 'T_J',
      seriesTjMax: 'T_J,max',
      refLabel: (v) => `T_J,max ${v} °C`,
      marker: t({ tr: 'çalışma noktası', en: 'operating point' }),
    },

    // θ_SA,max ≤ 0 iken tarama hiç kurulamıyor; boş grafik notu bu durumda
    // ortak "geçerli girdi gerekli" notunun yerini alır.
    chartInfeasible: t({
      tr: 'Termal bütçe paket ve arayüz direnciyle zaten tükendiği için θ_SA taraması '
        + 'yapılamıyor: hiçbir soğutucu direnci T_J değerini sınırın altına indirmez.',
      en: 'The θ_SA sweep cannot be run because the thermal budget is already used up by the '
        + 'package and interface resistance: no heatsink resistance brings T_J below the limit.',
    }),

    schematic: {
      title: t({ tr: 'Termal direnç zinciri', en: 'Thermal resistance chain' }),
      captionHeatsink: t({
        tr: 'Junction → case → termal arayüz → soğutucu → ortam: seri termal dirençler',
        en: 'Junction → case → thermal interface → heatsink → ambient: series thermal resistances',
      }),
      captionSurface: t({
        tr: 'Ölçüm noktası ile junction arasındaki ampirik metrik — yol direnci değildir',
        en: 'The empirical metric between the measurement point and the junction — it is not a '
          + 'path resistance',
      }),
      captionJunction: t({
        tr: 'Junction → ortam: tek eşdeğer direnç (θ_JA)',
        en: 'Junction → ambient: a single equivalent resistance (θ_JA)',
      }),
      // Zincir yuvasına yazılan değer; uzunluğu yerleşimi etkiler (schematic.jsx)
      noSink: t({ tr: 'seçilmedi', en: 'not selected' }),
      measurePoint: t({ tr: 'ölçüm', en: 'measurement' }),
      copperNetwork: t({ tr: 'bakır termal ağı', en: 'copper thermal network' }),
      copper: t({ tr: 'bakır', en: 'copper' }),
    },

    reasonText: (reason) => {
      if (reason === REASON_TJMAX_LE_TA) {
        return t({
          tr: 'İzin verilen junction sıcaklığı (T_J,max) ortam sıcaklığından (T_A) büyük olmalı. '
            + 'Eşit veya küçükken komponent hiç güç harcamadan sınırın dışında kalır; '
            + 'çekilebilecek en yüksek güç negatife düşer ve sonuç anlamsız olur. Ortam '
            + 'sıcaklığını düşürün veya sınırı daha yüksek bir komponent seçin.',
          en: 'The allowed junction temperature (T_J,max) must be greater than the ambient '
            + 'temperature (T_A). When it is equal or lower, the component is already outside the '
            + 'limit without dissipating any power; the highest power that could be dissipated '
            + 'goes negative and the result becomes meaningless. Lower the ambient temperature or '
            + 'choose a component with a higher limit.',
        })
      }
      if (reason === REASON_ENGINE) {
        return t({
          tr: 'Girilen değerlerle termal model kurulamıyor. Güç pozitif, termal dirençler negatif '
            + 'olmayan sayılar olmalı ve izin verilen junction sıcaklığı ortam sıcaklığından '
            + 'büyük olmalıdır.',
          en: 'The thermal model cannot be built with the entered values. The power must be '
            + 'positive, the thermal resistances must be non-negative numbers and the allowed '
            + 'junction temperature must be greater than the ambient temperature.',
        })
      }
      return t({
        tr: 'Tüm zorunlu alanlara sayısal değer girin. Ondalık için nokta veya virgül '
          + 'kullanabilirsiniz (0.25 = 0,25).',
        en: 'Enter a numeric value in every required field. You can use a point or a comma for '
          + 'decimals (0.25 = 0,25).',
      })
    },

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      // --- §8.3 Junction ---
      if (r.mode === MODE_JUNCTION) {
        out.push({
          level: 'ok',
          text: t({
            tr: `T_J = T_A + P·θ_JA = ${fmt(r.Ta, 4)} °C + ${fmtWatt(r.P)}·${fmt(r.thetaJA, 4)} `
              + `°C/W = ${fmt(r.Tj, 4)} °C; sıcaklık artışı ${fmt(r.rise, 4)} °C.`,
            en: `T_J = T_A + P·θ_JA = ${fmt(r.Ta, 4)} °C + ${fmtWatt(r.P)}·${fmt(r.thetaJA, 4)} `
              + `°C/W = ${fmt(r.Tj, 4)} °C; temperature rise ${fmt(r.rise, 4)} °C.`,
          }),
        })

        if (Number.isFinite(r.Pmax)) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Bu θ_JA ile çekilebilecek en yüksek güç ${fmtWatt(r.Pmax)}; şu anki güç bunun `
                + `${pct(fmt(r.utilisation * 100, 3))} kadarı.`,
              en: `The highest power that can be dissipated with this θ_JA is ${fmtWatt(r.Pmax)}; `
                + `the present power is ${pct(fmt(r.utilisation * 100, 3))} of it.`,
            }),
          })
        }
      }

      // §8.3'ün açık uyarısı — motorun taşıdığı alana bağlı, her zaman görünür
      if (r.thetaIsBoardDependent) {
        out.push({ level: 'warn', text: thetaNote })
      }

      // --- §8.4 Soğutucu ---
      if (r.mode === MODE_HEATSINK) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Termal bütçe (T_J,max − T_A)/P = ${fmt(r.budget, 4)} °C/W; bunun `
              + `${fmt(r.thetaJC, 4)} °C/W kadarı pakette, ${fmt(r.thetaCS, 4)} °C/W kadarı `
              + 'termal arayüzde harcanıyor.',
            en: `Thermal budget (T_J,max − T_A)/P = ${fmt(r.budget, 4)} °C/W; `
              + `${fmt(r.thetaJC, 4)} °C/W of it is spent in the package and `
              + `${fmt(r.thetaCS, 4)} °C/W in the thermal interface.`,
          }),
        })

        if (r.negativeSink) {
          out.push({
            level: 'danger',
            text: t({
              tr: `Gereken θ_SA,max = ${fmt(r.thetaSAmax, 4)} °C/W, yani negatif: paket ve arayüz `
                + 'direnci tek başına termal bütçeyi aşıyor. Hiçbir soğutucu bu durumu çözmez — '
                + 'gücü azaltın, hava akışını artırın veya farklı paket seçin.',
              en: `The required θ_SA,max = ${fmt(r.thetaSAmax, 4)} °C/W, i.e. negative: the `
                + 'package and interface resistance alone exceeds the thermal budget. No heatsink '
                + 'solves this — reduce the power, increase the airflow or choose a different '
                + 'package.',
            }),
          })
        } else {
          out.push({
            level: 'ok',
            text: t({
              tr: `Soğutucu için kalan pay ${fmt(r.thetaSAmax, 4)} °C/W. Katalogdan seçilecek `
                + 'θ_SA bu değerin altında olmalı; üstündeki her soğutucu T_J,max sınırını '
                + 'aştırır.',
              en: `The share left for the heatsink is ${fmt(r.thetaSAmax, 4)} °C/W. The θ_SA `
                + 'chosen from a catalogue must be below this value; any heatsink above it pushes '
                + 'T_J past the T_J,max limit.',
            }),
          })
          out.push({
            level: 'warn',
            text: t({
              tr: 'Soğutucu katalog değeri belirli bir hava akışı, montaj yönü ve yüzey işlemi '
                + 'içindir. Doğal konveksiyonda ve sıkışık kutuda gerçek θ_SA katalog değerinin '
                + 'üstüne çıkar; termal arayüz malzemesinin montaj basıncı da θ_CS değerini '
                + 'değiştirir.',
              en: 'A heatsink catalogue value is given for a particular airflow, mounting '
                + 'orientation and surface finish. In natural convection and in a cramped '
                + 'enclosure the real θ_SA comes out above the catalogue value; the mounting '
                + 'pressure of the thermal interface material also changes θ_CS.',
            }),
          })
        }

        if (r.hasSink && Number.isFinite(r.Tj)) {
          const dom = dominantPath(r.shares)
          out.push({
            level: 'ok',
            text: t({
              tr: `Seçilen θ_SA = ${fmt(r.thetaSA, 4)} °C/W ile toplam yol `
                + `${fmt(r.thetaTotal, 4)} °C/W ve T_J = ${fmt(r.Tj, 4)} °C.`,
              en: `With the selected θ_SA = ${fmt(r.thetaSA, 4)} °C/W the total path is `
                + `${fmt(r.thetaTotal, 4)} °C/W and T_J = ${fmt(r.Tj, 4)} °C.`,
            }),
          })
          out.push({
            level: 'ok',
            text: t({
              tr: `Termal yolun baskın parçası ${pathLabel[dom.key]}: toplam direncin `
                + `${pct(fmt(dom.v * 100, 3))} kadarı orada. İyileştirme önce oradan yapılır; diğer `
                + 'parçaları küçültmek sonucu az değiştirir.',
              en: `The dominant part of the thermal path is ${pathLabel[dom.key]}: `
                + `${pct(fmt(dom.v * 100, 3))} of the total resistance sits there. Improve that part `
                + 'first; shrinking the others changes the result little.',
            }),
          })
        } else if (!r.negativeSink) {
          out.push({
            level: 'warn',
            text: t({
              tr: 'Soğutucu direnci girilmedi; ekran yalnızca gereken üst sınırı veriyor. Seçilen '
                + 'soğutucunun θ_SA değerini girerseniz T_J, marj ve yol payları da hesaplanır.',
              en: 'No heatsink resistance was entered; the screen only gives the required upper '
                + 'limit. If you enter the θ_SA of the heatsink you selected, T_J, the margin and '
                + 'the path shares are computed as well.',
            }),
          })
        }
      }

      // --- §8.5 Yüzey ölçümü ---
      if (r.mode === MODE_SURFACE) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Ölçülen ${fmt(r.Tsurface, 4)} °C üzerine Ψ·P = ${fmt(r.psi, 4)} °C/W · `
              + `${fmtWatt(r.P)} = ${fmt(r.rise, 4)} °C eklenerek T_J ≈ ${fmt(r.Tj, 4)} °C `
              + 'bulundu.',
            en: `Adding Ψ·P = ${fmt(r.psi, 4)} °C/W · ${fmtWatt(r.P)} = ${fmt(r.rise, 4)} °C on `
              + `top of the measured ${fmt(r.Tsurface, 4)} °C gives T_J ≈ ${fmt(r.Tj, 4)} °C.`,
          }),
        })

        // Spec §8.5 bu ayrımın açıkça anlatılmasını istiyor
        out.push({ level: 'warn', text: psiNote })

        out.push({
          level: 'warn',
          text: t({
            tr: `Kullanılan metrik ${METRIC_SHORT[r.metric]}; motorun sonucu bu değerin bir yol `
              + 'direnci olmadığını taşıyor. Ψ değeri yalnızca üreticinin tanımladığı ölçüm '
              + 'noktasıyla birlikte anlamlıdır — '
              + `${r.metric === PSI_JT ? 'paket üstü' : 'kart üzeri'} dışında bir noktadan `
              + 'ölçtüyseniz sonuç geçersizdir.',
            en: `The metric used is ${METRIC_SHORT[r.metric]}; the engine result carries the fact `
              + 'that this value is not a path resistance. A Ψ value is meaningful only together '
              + 'with the measurement point defined by the manufacturer — if you measured at a '
              + `point other than ${r.metric === PSI_JT ? 'the top of the package' : 'the board'}, `
              + 'the result is invalid.',
          }),
        })

        if (r.within === false) {
          out.push({
            level: 'danger',
            text: t({
              tr: `Tahmini T_J = ${fmt(r.Tj, 4)} °C, izin verilen ${fmt(r.TjMax, 4)} °C değerinin `
                + 'üzerinde.',
              en: `The estimated T_J = ${fmt(r.Tj, 4)} °C is above the allowed `
                + `${fmt(r.TjMax, 4)} °C.`,
            }),
          })
        } else if (r.within === true) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Tahmini T_J = ${fmt(r.Tj, 4)} °C, izin verilen ${fmt(r.TjMax, 4)} °C değerinin `
                + 'altında.',
              en: `The estimated T_J = ${fmt(r.Tj, 4)} °C is below the allowed `
                + `${fmt(r.TjMax, 4)} °C.`,
            }),
          })
        }
      }

      // --- Marj kontrolü (motorun within/margin alanı olan modlar) ---
      if (Number.isFinite(r.margin)) {
        if (r.within === false) {
          out.push({
            level: 'danger',
            text: t({
              tr: `T_J = ${fmt(r.Tj, 4)} °C, izin verilen ${fmt(r.TjMax, 4)} °C sınırının `
                + `${fmt(Math.abs(r.margin), 4)} °C üzerinde. Bu haliyle komponent sınırın `
                + 'dışında çalışır.',
              en: `T_J = ${fmt(r.Tj, 4)} °C is ${fmt(Math.abs(r.margin), 4)} °C above the allowed `
                + `limit of ${fmt(r.TjMax, 4)} °C. As it stands the component operates outside `
                + 'the limit.',
            }),
          })
        } else if (r.margin < MARGIN_WARN_C) {
          out.push({
            level: 'warn',
            text: t({
              tr: `Marj yalnızca ${fmt(r.margin, 4)} °C. ${MARGIN_WARN_C} °C altındaki marj; `
                + 'ortam sıcaklığındaki dalgalanma, θ değerlerindeki üretim saçılması ve montaj '
                + `farklarıyla kolayca tükenir. ${marginThresholdNote}`,
              en: `The margin is only ${fmt(r.margin, 4)} °C. A margin below ${MARGIN_WARN_C} °C `
                + 'is easily consumed by fluctuation in the ambient temperature, by production '
                + 'spread in the θ values and by mounting differences. '
                + `${marginThresholdNote}`,
            }),
          })
        } else {
          out.push({
            level: 'ok',
            text: t({
              tr: `T_J,max sınırına ${fmt(r.margin, 4)} °C marj var.`,
              en: `There is ${fmt(r.margin, 4)} °C of margin to the T_J,max limit.`,
            }),
          })
        }
      }

      // --- §8.6 Bakır termal ağı ---
      if (r.copperOn && r.copper) {
        const c = r.copper
        const stripShare = c.eq.shares[0]
        const dielShare = c.eq.shares[1]
        const dominant = stripShare >= dielShare
          ? t({ tr: 'bakır şerit', en: 'the copper strip' })
          : t({ tr: 'dielektrik', en: 'the dielectric' })

        out.push({
          level: 'ok',
          text: t({
            tr: `Bakır şerit ${fmt(c.strip.Rth, 4)} °C/W, dielektrik `
              + `${fmt(c.dielectric.Rth, 4)} °C/W; paralel eşdeğer ${fmt(c.eq.Rth, 4)} °C/W ve `
              + `ΔT = P·R_θ,eq = ${fmt(c.rise.deltaT, 4)} °C.`,
            en: `Copper strip ${fmt(c.strip.Rth, 4)} °C/W, dielectric `
              + `${fmt(c.dielectric.Rth, 4)} °C/W; parallel equivalent ${fmt(c.eq.Rth, 4)} °C/W `
              + `and ΔT = P·R_θ,eq = ${fmt(c.rise.deltaT, 4)} °C.`,
          }),
        })

        out.push({
          level: 'ok',
          text: t({
            tr: `Isının ${pct(fmt(stripShare * 100, 3))} kadarı bakır şeritten, `
              + `${pct(fmt(dielShare * 100, 3))} kadarı dielektrikten geçiyor; baskın yol `
              + `${dominant}. Bakır alanını büyütmek yalnızca baskın yol bakırken işe yarar.`,
            en: `${pct(fmt(stripShare * 100, 3))} of the heat goes through the copper strip and `
              + `${pct(fmt(dielShare * 100, 3))} through the dielectric; the dominant path is `
              + `${dominant}. Enlarging the copper area helps only while the dominant path is the `
              + 'copper.',
          }),
        })

        out.push({
          level: 'warn',
          // Motor yön iddiası taşımıyor (temperatureRise yalnızca firstOrder + excludes
          // döner) ve spec §8.6 da sapmanın yönünü söylemiyor: listedeki etkilerin bir
          // kısmı sonucu aşağı, bir kısmı yukarı çeker. Yön uydurulmaz.
          text: t({
            tr: `${firstOrderNote} Modelde bulunmayanlar: ${excludeList(c.rise.excludes)}. Bu `
              + 'etkiler sonucu iki yöne de kaydırabilir (paralel ısı yolları düşürür, komşu ısı '
              + 'kaynakları yükseltir); sonucu tasarım kararı için tek başına kullanmayın.',
            en: `${firstOrderNote} Not in the model: ${excludeList(c.rise.excludes)}. These `
              + 'effects can shift the result in either direction (parallel heat paths lower it, '
              + 'neighbouring heat sources raise it); do not use the result on its own for a '
              + 'design decision.',
          }),
        })
      }

      return out
    },
  }
}
