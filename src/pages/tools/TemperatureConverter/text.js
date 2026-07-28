// Sıcaklık dönüştürücü ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni, grafik başlığı) fonksiyon olarak
// döner ki mantık tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import {
  MODE_ABS, MODE_DELTA,
  SWEEP_F, SWEEP_K,
  REASON_ABSOLUTE_ZERO, REASON_UNIT,
  UNIT_C, UNIT_F, UNIT_K,
  ABS_ZERO_C, ABS_ZERO_F,
} from './model'

// Sıcaklık dört anlamlı basamakta okunaksız kalır (298.2 K gibi);
// ekranın tamamında altı basamak kullanılır.
const SIG = 6

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  return {
    backlink: t({
      tr: '← Dönüştürücüler',
      en: '← Converters',
    }),
    title: t({ tr: 'Sıcaklık Dönüştürücü', en: 'Temperature Converter' }),
    intro: t({
      tr: 'Santigrat, Fahrenheit ve kelvin arasında çift yönlü çevirir; mutlak sıcaklığı mutlak '
        + 'sıfır sınırıyla birlikte, sıcaklık farkını (ΔT) ise ayrı bir modda ofsetsiz olarak '
        + 'verir — ikisi aynı denklemle çevrilmediği için karıştırılmaz.',
      en: 'Converts in both directions between Celsius, Fahrenheit and kelvin; it gives the '
        + 'absolute temperature together with the absolute-zero limit and the temperature '
        + 'difference (ΔT) in a separate mode without offsets — the two are not mixed because '
        + 'they are not converted with the same equation.',
    }),

    modeLabel: {
      [MODE_ABS]: t({ tr: 'Mutlak sıcaklık', en: 'Absolute temperature' }),
      [MODE_DELTA]: t({ tr: 'Sıcaklık farkı (ΔT)', en: 'Temperature difference (ΔT)' }),
    },

    scaleLabel: {
      [UNIT_C]: t({ tr: 'Santigrat (°C)', en: 'Celsius (°C)' }),
      [UNIT_F]: t({ tr: 'Fahrenheit (°F)', en: 'Fahrenheit (°F)' }),
      [UNIT_K]: t({ tr: 'Kelvin (K)', en: 'Kelvin (K)' }),
    },

    deltaScaleLabel: {
      [UNIT_C]: t({ tr: 'ΔT — santigrat derece (°C)', en: 'ΔT — degrees Celsius (°C)' }),
      [UNIT_F]: t({ tr: 'ΔT — Fahrenheit derece (°F)', en: 'ΔT — degrees Fahrenheit (°F)' }),
      [UNIT_K]: t({ tr: 'ΔT — kelvin (K)', en: 'ΔT — kelvin (K)' }),
    },

    refPointLabel: {
      absZero: t({ tr: 'Mutlak sıfır', en: 'Absolute zero' }),
      waterFreeze: t({
        tr: 'Suyun donma noktası (1 atm)',
        en: 'Freezing point of water (1 atm)',
      }),
      copperRef: t({
        tr: 'Bakır özdirenci referansı (ρ₂₀)',
        en: 'Copper resistivity reference (ρ₂₀)',
      }),
      roomRef: t({ tr: 'Veri sayfası oda sıcaklığı', en: 'Datasheet room temperature' }),
      waterBoil: t({
        tr: 'Suyun kaynama noktası (1 atm)',
        en: 'Boiling point of water (1 atm)',
      }),
    },

    sweepLabel: {
      [SWEEP_F]: t({ tr: 'Fahrenheit ekseni', en: 'Fahrenheit axis' }),
      [SWEEP_K]: t({ tr: 'Kelvin ekseni', en: 'Kelvin axis' }),
    },

    fields: {
      absLabel: t({ tr: 'Sıcaklık', en: 'Temperature' }),
      deltaLabel: t({ tr: 'Sıcaklık farkı (ΔT)', en: 'Temperature difference (ΔT)' }),
      absHint: t({
        tr: 'Ölçek üzerindeki tek bir nokta. Alt sınır mutlak sıfırdır',
        en: 'A single point on the scale. The lower limit is absolute zero',
      }),
      deltaHint: t({
        tr: 'İki sıcaklık arasındaki fark. Negatif değer soğumadır; ofset uygulanmaz',
        en: 'The difference between two temperatures. A negative value is cooling; no offset is '
          + 'applied',
      }),
      ambLabel: t({ tr: 'Ortam sıcaklığı', en: 'Ambient temperature' }),
      ambHint: t({
        tr: 'İsteğe bağlı — girilirse artışın üstüne bindiği mutlak sıcaklık da hesaplanır. Boş '
          + 'bırakılırsa yalnızca fark çevrilir',
        en: 'Optional — if entered, the absolute temperature the rise sits on top of is computed '
          + 'as well. If left empty, only the difference is converted',
      }),
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    // `T` alanının adı moda göre değişir, o yüzden iki ayrı anahtar tutulur.
    fieldLabels: {
      absT: t({ tr: 'Sıcaklık', en: 'Temperature' }),
      deltaT: t({ tr: 'Sıcaklık farkı (ΔT)', en: 'Temperature difference (ΔT)' }),
      amb: t({ tr: 'Ortam sıcaklığı', en: 'Ambient temperature' }),
    },

    bigLabel: {
      [MODE_ABS]: t({
        tr: 'Diğer ölçeklerdeki karşılığı',
        en: 'Equivalent on the other scales',
      }),
      [MODE_DELTA]: t({
        tr: 'Farkın diğer ölçeklerdeki karşılığı',
        en: 'Equivalent of the difference on the other scales',
      }),
    },
    inputWord: t({ tr: 'giriş', en: 'input' }),

    table: {
      head: {
        [MODE_ABS]: t({ tr: 'Mutlak sıcaklık', en: 'Absolute temperature' }),
        [MODE_DELTA]: t({ tr: 'Sıcaklık farkı', en: 'Temperature difference' }),
      },
      threeScales: t({ tr: 'üç ölçekte', en: 'on three scales' }),
      margin: t({ tr: 'Mutlak sıfıra kalan pay', en: 'Margin to absolute zero' }),
      marginSub: t({ tr: '(T_K değerinin kendisi)', en: '(the value of T_K itself)' }),
    },

    rise: {
      heading: t({ tr: 'Ortam üstüne yükselme', en: 'Rise above ambient' }),
      pointCol: t({ tr: 'Nokta', en: 'Point' }),
      scalesCol: '°C · °F · K',
      ambient: t({ tr: 'Ortam sıcaklığı (mutlak)', en: 'Ambient temperature (absolute)' }),
      delta: t({ tr: 'Sıcaklık artışı (fark)', en: 'Temperature rise (difference)' }),
      deltaSub: t({ tr: '(ofsetsiz)', en: '(no offset)' }),
      final: t({ tr: 'Ulaşılan sıcaklık (mutlak)', en: 'Resulting temperature (absolute)' }),
    },

    refs: {
      heading: t({ tr: 'Sık kullanılan referanslar', en: 'Commonly used references' }),
      pointCol: t({ tr: 'Nokta', en: 'Point' }),
      scalesCol: '°C · °F · K',
    },

    formula: t({
      tr: `Mutlak sıcaklık:
  T_F = (9/5)·T_C + 32
  T_C = (5/9)·(T_F − 32)
  T_K = T_C + 273.15
  T_C = T_K − 273.15

Sıcaklık farkı (ΔT) — ofset yok:
  ΔT_K = ΔT_C
  ΔT_F = (9/5)·ΔT_C
  ΔT_C = (5/9)·ΔT_F

Ortam üstüne yükselme:
  T_son = T_ortam + ΔT

Fiziksel alt sınır:
  T_K ≥ 0
    →  T_C ≥ −273.15
    →  T_F ≥ −459.67`,
      en: `Absolute temperature:
  T_F = (9/5)·T_C + 32
  T_C = (5/9)·(T_F − 32)
  T_K = T_C + 273.15
  T_C = T_K − 273.15

Temperature difference (ΔT) — no offset:
  ΔT_K = ΔT_C
  ΔT_F = (9/5)·ΔT_C
  ΔT_C = (5/9)·ΔT_F

Rise above ambient:
  T_final = T_ambient + ΔT

Physical lower limit:
  T_K ≥ 0
    →  T_C ≥ −273.15
    →  T_F ≥ −459.67`,
    }),

    detail: {
      input: (r) => (r.mode === MODE_DELTA
        ? t({
          tr: `Giriş ${fmt(r.input, SIG)} ${r.unit}; fark santigrat karşılığı `
            + `${fmt(r.delta.dC, SIG)} °C olarak taşındı.`,
          en: `Input ${fmt(r.input, SIG)} ${r.unit}; the difference was carried as its Celsius `
            + `equivalent ${fmt(r.delta.dC, SIG)} °C.`,
        })
        : t({
          tr: `Giriş ${fmt(r.input, SIG)} ${r.unit}; santigrat karşılığı `
            + `${fmt(r.temp.C, SIG)} °C üzerinden diğer ölçekler türetildi.`,
          en: `Input ${fmt(r.input, SIG)} ${r.unit}; the other scales were derived from its `
            + `Celsius equivalent ${fmt(r.temp.C, SIG)} °C.`,
        })),
      preserve: t({
        tr: 'Girişin kendi ölçeğindeki değeri gidiş-dönüş yapılmadan korunur; yalnızca diğer iki '
          + 'ölçek türetilir, böylece yazılan sayı çevrim artığıyla değişmiş görünmez.',
        en: 'The value on the scale it was entered on is preserved without a round trip; only the '
          + 'other two scales are derived, so the number typed in never appears changed by '
          + 'conversion residue.',
      }),
      deltaRule: t({
        tr: 'Fark büyüklüğünde yalnızca 9/5 eğimi uygulanır; 32 ve 273.15 ofsetleri kullanılmaz. '
          + 'Bu yüzden ΔT_C ile ΔT_K sayıca özdeştir.',
        en: 'For a difference only the 9/5 slope is applied; the 32 and 273.15 offsets are not '
          + 'used. This is why ΔT_C and ΔT_K are numerically identical.',
      }),
      absZeroCheck: t({
        tr: 'Mutlak sıfır kontrolü kelvin üzerinden yapılır (T_K ≥ 0). Sınırın tam üstündeki '
          + 'girişler ikilik tabandaki temsil hatası nedeniyle reddedilmesin diye 1e-9 K\'lik '
          + 'sayısal pay bırakılır.',
        en: 'The absolute-zero check is done in kelvin (T_K ≥ 0). A numerical margin of 1e-9 K is '
          + 'left so that inputs exactly at the limit are not rejected because of binary '
          + 'representation error.',
      }),
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
        tr: 'Ekran mutlak dönüşüm için yalnızca üç bağıntı kullanır: T_F = (9/5)·T_C + 32, '
          + 'T_C = (5/9)·(T_F − 32) ve T_K = T_C + 273.15. Üçü de ölçek tanımının doğrudan '
          + 'sonucudur; ampirik katsayı içermezler.',
        en: 'For the absolute conversion the screen uses only three relations: '
          + 'T_F = (9/5)·T_C + 32, T_C = (5/9)·(T_F − 32) and T_K = T_C + 273.15. All three '
          + 'follow directly from the definition of the scales; they contain no empirical '
          + 'coefficient.',
      }),
      t({
        tr: 'Kelvin ofseti tam olarak 273.15\'tir; ekranın hiçbir yerinde yuvarlanmış bir ofset '
          + '(273 gibi) kullanılmaz. Fahrenheit ofseti 32 ve eğim 9/5 = 1.8 de tanım gereği tam '
          + 'değerlerdir.',
        en: 'The kelvin offset is exactly 273.15; nowhere on this screen is a rounded offset '
          + '(such as 273) used. The Fahrenheit offset 32 and the slope 9/5 = 1.8 are likewise '
          + 'exact by definition.',
      }),
      t({
        tr: '°C, °F ve K bu ekranda yalnızca yukarıdaki üç bağıntıyla tanımlıdır; ayrı bir '
          + 'dönüşüm tablosu kullanılmaz. Mutlak sıfırın ölçek karşılıkları da tablodan '
          + 'okunmamış, aynı bağıntılara T_K = 0 konarak türetilmiştir: T_C = 0 − 273.15 = '
          + '−273.15 °C ve T_F = 1.8·(−273.15) + 32 = −459.67 °F.',
        en: 'On this screen °C, °F and K are defined only by the three relations above; no '
          + 'separate conversion table is used. The scale equivalents of absolute zero were not '
          + 'read from a table either but derived by setting T_K = 0 in the same relations: '
          + 'T_C = 0 − 273.15 = −273.15 °C and T_F = 1.8·(−273.15) + 32 = −459.67 °F.',
      }),
      t({
        tr: 'Sıcaklık FARKININ kuralı mutlak dönüşümden ayrı yazılır ama ondan türer: fark '
          + 'büyüklüğünde santigrat derece ile kelvin özdeş olduğu için sıcaklık farkları bu araç '
          + 'setinde ikisinden biriyle verilir. ΔT_F = 1.8·ΔT_C ise mutlak bağıntının eğiminden '
          + 'çıkar: iki mutlak sıcaklığın farkı alındığında 32 ofseti sadeleşir, geriye yalnızca '
          + '9/5 eğimi kalır. Uydurulmuş bir katsayı değil, mutlak bağıntının doğrudan sonucudur.',
        en: 'The rule for a temperature DIFFERENCE is written separately from the absolute '
          + 'conversion but derives from it: because a Celsius degree and a kelvin are identical '
          + 'as a difference, temperature differences are given in either of the two throughout '
          + 'this tool set. ΔT_F = 1.8·ΔT_C comes from the slope of the absolute relation: when '
          + 'the difference of two absolute temperatures is taken, the 32 offset cancels and only '
          + 'the 9/5 slope remains. It is not an invented coefficient but a direct consequence of '
          + 'the absolute relation.',
      }),
      t({
        tr: 'Sonuç panelindeki referans noktalarından yalnızca 20 °C bir hesap referansıdır: '
          + 'bakır özdirencinin ρ₂₀ referans sıcaklığı, araç genelinde iletken direnci hesabında '
          + 'kullanılır. Suyun 1 atm\'deki donma ve kaynama noktaları ile 25 °C veri sayfası '
          + 'sıcaklığı bu ekranda hesap girdisi değildir; tabloda yalnızca yaygın çevrim örneği '
          + 'olarak durur.',
        en: 'Of the reference points in the result panel only 20 °C is a calculation reference: '
          + 'it is the ρ₂₀ reference temperature of copper resistivity, used across the tool set '
          + 'in conductor resistance calculations. The freezing and boiling points of water at '
          + '1 atm and the 25 °C datasheet temperature are not calculation inputs on this screen; '
          + 'they appear in the table only as common conversion examples.',
      }),
    ],

    validity: [
      t({
        tr: 'Mutlak sıfır fiziksel alt sınırdır: T_K = 0, yani −273.15 °C ve −459.67 °F. Bu '
          + 'sınırın altındaki bir giriş hesaplanmaz; sonuç yerine hata gösterilir.',
        en: 'Absolute zero is the physical lower limit: T_K = 0, i.e. −273.15 °C and −459.67 °F. '
          + 'An input below this limit is not computed; an error is shown instead of a result.',
      }),

      // --- ΔT modunun ayrı kuralı (spec §12: "Geçerlilik aralığı") ---
      //
      // Mutlak sıcaklık ile fark aynı denklemle çevrilmez; ikisi ayrı modlarda
      // tutulur ve kural burada sayıyla yazılır.
      t({
        tr: 'ΔT modu AYRI bir kuraldır ve mutlak dönüşümün denklemini kullanmaz. Farkta ofset '
          + 'yoktur, yalnızca eğim kalır: ΔT_C = ΔT_K ve ΔT_F = 1.8·ΔT_C (1.8 = 9/5). Ters yönde '
          + 'ΔT_C = ΔT_F / 1.8. Ne 32 ne de 273.15 farka uygulanır.',
        en: 'The ΔT mode is a SEPARATE rule and does not use the equation of the absolute '
          + 'conversion. A difference has no offset, only the slope remains: ΔT_C = ΔT_K and '
          + 'ΔT_F = 1.8·ΔT_C (1.8 = 9/5). In the other direction ΔT_C = ΔT_F / 1.8. Neither 32 '
          + 'nor 273.15 is applied to a difference.',
      }),
      t({
        tr: 'Sayısal karşılığı: 10 °C\'lik bir ısınma 10 K ve 18 °F\'dir — 50 °F değildir. Buna '
          + 'karşılık MUTLAK 10 °C, 283.15 K ve 50 °F\'dir. Aynı "10" girişi iki modda farklı '
          + 'sonuç verir; bu yüzden ikisi tek tabloda birleştirilmez.',
        en: 'Numerically: a rise of 10 °C is 10 K and 18 °F — not 50 °F. By contrast an ABSOLUTE '
          + '10 °C is 283.15 K and 50 °F. The same input "10" gives different results in the two '
          + 'modes; this is why they are not merged into one table.',
      }),
      t({
        tr: 'ΔT_C = ΔT_K özdeşliğinin doğrudan sonucu: fark cinsinden tanımlı büyüklüklerde °C/W '
          + 'ile K/W aynı birimdir. Termal direnç, sıcaklık artışı ve sıcaklık katsayısı bu gruba '
          + 'girer; mutlak ölçek dönüşümü bu değerlere uygulanmaz.',
        en: 'A direct consequence of the identity ΔT_C = ΔT_K: for quantities defined as a '
          + 'difference, °C/W and K/W are the same unit. Thermal resistance, temperature rise and '
          + 'temperature coefficient belong to this group; the absolute scale conversion is not '
          + 'applied to these values.',
      }),
      t({
        tr: 'Mutlak sıfır sınırı ΔT\'ye uygulanmaz: negatif bir fark soğuma adımıdır ve '
          + 'geçerlidir. Sınır yalnızca mutlak sıcaklığa ve "ortam + ΔT" toplamına uygulanır — '
          + 'T_K ≥ 0, yani T_C ≥ −273.15 ve T_F ≥ −459.67.',
        en: 'The absolute-zero limit does not apply to ΔT: a negative difference is a cooling '
          + 'step and is valid. The limit applies only to an absolute temperature and to the sum '
          + '"ambient + ΔT" — T_K ≥ 0, i.e. T_C ≥ −273.15 and T_F ≥ −459.67.',
      }),

      t({
        tr: 'Ölçek dönüşümleri tanım gereği tamdır; yaklaşıklık formülde değil, girilen değerin '
          + 've ölçüm cihazının doğruluğundadır.',
        en: 'The scale conversions are exact by definition; the approximation is not in the '
          + 'formula but in the accuracy of the entered value and of the measuring instrument.',
      }),
      t({
        tr: 'Ortam artı artış satırı yalnızca doğrusal bir toplamdır. Gerçek yükselmenin ne kadar '
          + 'olacağı akıma, bakır kesitine ve ısı yoluna bağlıdır; bu ekran onu hesaplamaz.',
        en: 'The ambient-plus-rise row is only a linear sum. How large the real rise will be '
          + 'depends on the current, the copper cross-section and the heat path; this screen does '
          + 'not compute it.',
      }),
      t({
        tr: 'Rankine (°R) ve Réaumur gibi diğer ölçekler kapsam dışıdır; yalnızca °C, °F ve K '
          + 'desteklenir.',
        en: 'Other scales such as Rankine (°R) and Réaumur are out of scope; only °C, °F and K '
          + 'are supported.',
      }),
      t({
        tr: 'Sapma yalnızca gösterim yuvarlamasından gelir; hesap tam değerle yapılır, yuvarlama '
          + 'son adımda uygulanır.',
        en: 'Any deviation comes only from display rounding; the calculation is done with the '
          + 'exact value and rounding is applied in the last step.',
      }),
    ],

    // Grafik etiketleri moda ve seçilen taramaya göre değişir.
    chart: {
      x: (mode) => (mode === MODE_DELTA
        ? t({
          tr: 'Sıcaklık farkı ΔT_C (°C — kelvin farkıyla aynı)',
          en: 'Temperature difference ΔT_C (°C — same as a kelvin difference)',
        })
        : t({
          tr: 'Santigrat sıcaklık T_C (°C)',
          en: 'Celsius temperature T_C (°C)',
        })),

      y: (mode, param) => {
        if (mode === MODE_DELTA) {
          return param === SWEEP_K
            ? t({ tr: 'Sıcaklık farkı ΔT_K (K)', en: 'Temperature difference ΔT_K (K)' })
            : t({ tr: 'Sıcaklık farkı ΔT_F (°F)', en: 'Temperature difference ΔT_F (°F)' })
        }
        return param === SWEEP_K
          ? t({ tr: 'Kelvin sıcaklık T_K (K)', en: 'Kelvin temperature T_K (K)' })
          : t({ tr: 'Fahrenheit sıcaklık T_F (°F)', en: 'Fahrenheit temperature T_F (°F)' })
      },

      caption: (mode, param) => {
        if (mode === MODE_DELTA) {
          return param === SWEEP_K
            ? t({
              tr: 'Fark büyüklüğünde santigrat derece ile kelvin özdeştir: doğru başlangıç '
                + 'noktasından geçer ve eğimi 1\'dir. Mutlak sıcaklıktaki 273.15 ofseti burada '
                + 'yoktur.',
              en: 'As a difference a Celsius degree and a kelvin are identical: the line passes '
                + 'through the origin and its slope is 1. The 273.15 offset of the absolute '
                + 'temperature is absent here.',
            })
            : t({
              tr: 'Fark büyüklüğünde yalnızca eğim kalır: ΔT_F = (9/5)·ΔT_C. Doğru başlangıç '
                + 'noktasından geçer — mutlak dönüşümdeki 32 ofseti burada kullanılmaz.',
              en: 'As a difference only the slope remains: ΔT_F = (9/5)·ΔT_C. The line passes '
                + 'through the origin — the 32 offset of the absolute conversion is not used '
                + 'here.',
            })
        }
        return param === SWEEP_K
          ? t({
            tr: 'Kelvin ölçeği santigradın 273.15 kaydırılmış hâlidir; eğim aynı olduğu için '
              + 'doğru 45°\'dir. Yatay çizgi mutlak sıfırı, yani ölçeğin fiziksel tabanını '
              + 'gösterir.',
            en: 'The kelvin scale is the Celsius scale shifted by 273.15; because the slope is '
              + 'the same the line is at 45°. The horizontal line marks absolute zero, the '
              + 'physical floor of the scale.',
          })
          : t({
            tr: 'Fahrenheit doğrusunun hem eğimi (9/5) hem ofseti (32) farklıdır; iki ölçek '
              + 'yalnızca −40 noktasında kesişir. Yatay çizgi mutlak sıfıra karşılık gelir.',
            en: 'The Fahrenheit line differs in both slope (9/5) and offset (32); the two scales '
              + 'cross only at −40. The horizontal line corresponds to absolute zero.',
          })
      },

      refLabel: (y, unit) => t({
        tr: `mutlak sıfır ${fmt(y, SIG)} ${unit}`,
        en: `absolute zero ${fmt(y, SIG)} ${unit}`,
      }),
      marker: t({ tr: 'seçilen', en: 'selected' }),
    },

    schematic: {
      titleDelta: t({ tr: 'Sıcaklık farkı ölçeği', en: 'Temperature difference scale' }),
      titleAbs: t({ tr: 'Mutlak sıcaklık ölçeği', en: 'Absolute temperature scale' }),
      captionDelta: t({
        tr: 'Fark, ölçek üzerindeki iki nokta arasındaki açıklıktır — başlangıcı nerede olursa '
          + 'olsun aynıdır',
        en: 'A difference is the gap between two points on the scale — it is the same wherever it '
          + 'starts',
      }),
      captionAbs: t({
        tr: 'Mutlak sıcaklık, ölçek üzerinde tek bir noktadır',
        en: 'An absolute temperature is a single point on the scale',
      }),
      ambient: t({ tr: 'ortam', en: 'ambient' }),
      start: t({ tr: 'başlangıç', en: 'start' }),
      end: t({ tr: 'sonuç', en: 'end' }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_ABSOLUTE_ZERO:
          return t({
            tr: `Girilen sıcaklık mutlak sıfırın altında. Fiziksel alt sınır T_K = 0, yani `
              + `${fmt(ABS_ZERO_C, SIG)} °C ve ${fmt(ABS_ZERO_F, SIG)} °F; bu değerin altı `
              + 'hesaplanmaz.',
            en: `The entered temperature is below absolute zero. The physical lower limit is `
              + `T_K = 0, i.e. ${fmt(ABS_ZERO_C, SIG)} °C and ${fmt(ABS_ZERO_F, SIG)} °F; below `
              + 'this value nothing is computed.',
          })
        case REASON_UNIT:
          return t({
            tr: 'Seçilen sıcaklık birimi tanınmadı. Santigrat (°C), Fahrenheit (°F) veya kelvin '
              + '(K) seçin.',
            en: 'The selected temperature unit was not recognised. Choose Celsius (°C), '
              + 'Fahrenheit (°F) or kelvin (K).',
          })
        default:
          return t({
            tr: 'Sıcaklık alanına sayısal bir değer girin. Ondalık için nokta veya virgül '
              + 'kullanabilirsiniz (0.25 = 0,25); negatif değerler ve sıfır geçerlidir.',
            en: 'Enter a numeric value in the temperature field. Use a point or a comma for '
              + 'decimals (0.25 = 0,25); negative values and zero are valid.',
          })
      }
    },

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      if (r.mode === MODE_DELTA) {
        const d = r.delta
        out.push({
          level: 'ok',
          text: t({
            tr: `${fmt(r.input, SIG)} ${r.unit} büyüklüğünde bir sıcaklık farkı, `
              + `${fmt(d.dC, SIG)} °C = ${fmt(d.dK, SIG)} K = ${fmt(d.dF, SIG)} °F farkına `
              + 'karşılık gelir.',
            en: `A temperature difference of ${fmt(r.input, SIG)} ${r.unit} corresponds to a `
              + `difference of ${fmt(d.dC, SIG)} °C = ${fmt(d.dK, SIG)} K = ${fmt(d.dF, SIG)} °F.`,
          }),
        })

        out.push({
          level: 'ok',
          text: t({
            tr: 'Fark büyüklüğünde santigrat derece ile kelvin aynı adımdır; ölçekler arasındaki '
              + '273.15 kayması farkta yok olur. Bu yüzden termal direnç birimi °C/W ile K/W '
              + 'birbirinin yerine kullanılabilir.',
            en: 'As a difference a Celsius degree and a kelvin are the same step; the 273.15 shift '
              + 'between the scales vanishes in a difference. This is why the thermal resistance '
              + 'units °C/W and K/W are interchangeable.',
          }),
        })

        out.push({
          level: 'warn',
          text: t({
            tr: '32 ofseti farkta uygulanmaz: 10 °C\'lik bir ısınma 50 °F değil, 18 °F\'dir. '
              + 'Mutlak sıcaklık dönüşümünü bu modun sonucuyla karıştırmayın.',
            en: 'The 32 offset is not applied to a difference: a rise of 10 °C is 18 °F, not '
              + '50 °F. Do not confuse the absolute temperature conversion with the result of '
              + 'this mode.',
          }),
        })

        if (d.dC < 0) {
          out.push({
            level: 'warn',
            text: t({
              tr: 'Fark negatif girildi; bu bir soğuma adımıdır. Fark büyüklüğüne mutlak sıfır '
                + 'sınırı uygulanmaz, ancak ortam sıcaklığıyla toplandığında sınır yeniden '
                + 'geçerlidir.',
              en: 'The difference was entered as negative; this is a cooling step. The '
                + 'absolute-zero limit does not apply to a difference, but it applies again once '
                + 'it is added to the ambient temperature.',
            }),
          })
        }

        if (r.final) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Ortam ${fmt(r.final.ambient.C, SIG)} °C alındığında, bu artışla ulaşılan mutlak `
                + `sıcaklık ${fmt(r.final.C, SIG)} °C = ${fmt(r.final.F, SIG)} °F = `
                + `${fmt(r.final.K, SIG)} K olur.`,
              en: `Taking the ambient as ${fmt(r.final.ambient.C, SIG)} °C, the absolute `
                + `temperature reached with this rise is ${fmt(r.final.C, SIG)} °C = `
                + `${fmt(r.final.F, SIG)} °F = ${fmt(r.final.K, SIG)} K.`,
            }),
          })
          out.push({
            level: 'warn',
            text: t({
              tr: 'Ortam ile artışın toplamı yalnızca aritmetiktir. Artışın gerçekte ne kadar '
                + 'olacağı akıma, bakır kesitine ve ısı yoluna bağlıdır; bu ekran onu hesaplamaz.',
              en: 'The sum of ambient and rise is arithmetic only. How large the rise actually '
                + 'turns out depends on the current, the copper cross-section and the heat path; '
                + 'this screen does not compute it.',
            }),
          })
        } else {
          out.push({
            level: 'warn',
            text: t({
              tr: 'Ortam sıcaklığı boş bırakıldı; yalnızca farkın ölçek karşılığı verildi. Mutlak '
                + 'sonucu görmek için ortam sıcaklığını girin.',
              en: 'The ambient temperature was left empty; only the scale equivalent of the '
                + 'difference was given. Enter the ambient temperature to see the absolute result.',
            }),
          })
        }

        return out
      }

      const temp = r.temp
      out.push({
        level: 'ok',
        text: t({
          tr: `${fmt(r.input, SIG)} ${r.unit} girişi, ${fmt(temp.C, SIG)} °C = `
            + `${fmt(temp.F, SIG)} °F = ${fmt(temp.K, SIG)} K değerine karşılık gelir.`,
          en: `The input ${fmt(r.input, SIG)} ${r.unit} corresponds to ${fmt(temp.C, SIG)} °C = `
            + `${fmt(temp.F, SIG)} °F = ${fmt(temp.K, SIG)} K.`,
        }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `Mutlak sıfıra kalan pay ${fmt(temp.marginK, SIG)} K. Kelvin ölçeğinin sıfırı `
            + 'fiziksel bir tabandır; santigrat ve Fahrenheit sıfırları ise yalnızca tanım '
            + 'noktasıdır.',
          en: `The margin to absolute zero is ${fmt(temp.marginK, SIG)} K. The zero of the kelvin `
            + 'scale is a physical floor; the zeros of Celsius and Fahrenheit are only definition '
            + 'points.',
        }),
      })

      if (temp.atAbsoluteZero) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Giriş tam mutlak sıfırda. Bu, ölçeğin alt sınırıdır; altındaki hiçbir değer '
              + 'fiziksel değildir.',
            en: 'The input is exactly at absolute zero. This is the lower limit of the scale; no '
              + 'value below it is physical.',
          }),
        })
      }

      out.push({
        level: 'ok',
        text: t({
          tr: 'Santigrat ile Fahrenheit yalnızca −40 noktasında kesişir; başka hiçbir sıcaklıkta '
            + 'iki ölçeğin sayısı eşit olmaz.',
          en: 'Celsius and Fahrenheit cross only at −40; at no other temperature do the two scales '
            + 'give the same number.',
        }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'Bu sonuç mutlak sıcaklıktır. Bir ısınma miktarını (ΔT) çevirmek istiyorsanız ΔT '
            + 'moduna geçin: farkta 32 ofseti kullanılmaz ve °C ile K özdeştir.',
          en: 'This result is an absolute temperature. To convert an amount of heating (ΔT), '
            + 'switch to the ΔT mode: a difference does not use the 32 offset and °C and K are '
            + 'identical there.',
        }),
      })

      return out
    },
  }
}
