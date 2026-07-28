// AWG dönüştürücü ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
// Hesap kodları burada cümleye çevrilir; model.js hiç cümle üretmez.

import { fmt, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  REASON_INCOMPLETE, REASON_AWG_RANGE, REASON_DIAMETER_RANGE,
  DIR_AWG, DIR_DIAMETER, SWEEP_D, SWEEP_AREA,
  AWG_MIN, AWG_MAX, AWG_D_MIN, AWG_D_MAX,
  AWG_ERR_TOLERANCE, AWG_REF_GAUGE, AWG_REF_INCH, AWG_RATIO, AWG_STEPS,
} from './model'

// Aralık sınırlarının mm gösterimi — daima dört ondalık.
//
// fmt() sondaki sıfırları attığı için üst sınır "11.684" diye yazılıyordu:
// bu, ondalık ayracından sonra tam üç basamak taşıyan ve uygulamanın kendi
// giriş ayrıştırıcısının belirsiz binlik ayırıcı sayıp reddettiği kalıptır
// (num.js, NUM_ERR_THOUSANDS). Sınırı alana kopyalayan kullanıcı hata alırdı.
// Dört ondalıklı yazım aynı sayıyı bu kalıba düşmeden gösterir.
const mmLimit = (meters) => (meters * 1e3).toFixed(4)

// Standart numara gösterimi: 0 ve altı için 1/0 … 4/0 yazımı kullanılır.
// Dilden bağımsızdır; getText üzerinden ekrana verilir.
function awgLabel(n) {
  if (!Number.isFinite(n)) return '—'
  if (!Number.isInteger(n)) return fmt(n, 4)
  if (n > 0) return String(n)
  const zeros = 1 - n
  return `${zeros}/0 (${'0'.repeat(zeros)})`
}

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  return {
    pct,
    backlink: t({
      tr: '← Dönüştürücüler',
      en: '← Converters',
    }),
    title: t({ tr: 'AWG Tel Çapı Dönüştürücü', en: 'AWG Wire Gauge Converter' }),
    intro: t({
      tr: 'AWG numarası ile çıplak iletken çapı ve kesit alanı arasında iki yönlü çevirir; '
        + 'çaptan numaraya dönüşü analitik tersiyle çözer, sonucu hem kesirli hem en yakın '
        + 'standart numara olarak verir ve ölçeğin geçerli sınırlarını birlikte gösterir.',
      en: 'Converts both ways between the AWG number and the bare conductor diameter and '
        + 'cross-sectional area; solves diameter-to-gauge with the analytic inverse, reports '
        + 'the result both as a fractional and as the closest standard gauge, and shows the '
        + 'valid limits of the scale alongside.',
    }),

    awgLabel,

    dirLabel: {
      [DIR_AWG]: t({ tr: 'Numaradan çapa', en: 'Gauge to diameter' }),
      [DIR_DIAMETER]: t({ tr: 'Çaptan numaraya', en: 'Diameter to gauge' }),
    },

    fields: {
      awg: {
        label: t({ tr: 'AWG numarası', en: 'AWG number' }),
        hint: t({
          tr: '4/0 için -3, 3/0 için -2, 00 için -1, 0 için 0 yazın. Kesirli ara değer de '
            + 'kabul edilir.',
          en: 'Enter -3 for 4/0, -2 for 3/0, -1 for 00 and 0 for 0. Fractional intermediate '
            + 'values are also accepted.',
        }),
      },
      d: {
        label: t({ tr: 'İletken çapı (çıplak)', en: 'Conductor diameter (bare)' }),
        hint: t({
          tr: `Ölçeğin kapsadığı çıplak iletken çapı ${mmLimit(AWG_D_MIN)} mm ile `
            + `${mmLimit(AWG_D_MAX)} mm arasıdır. Sınırlar dört ondalıkla yazılır; ondalık `
            + `ayracından sonra tam üç basamak yazan bir değer binlik ayırıcı sanılıp `
            + `reddedilir.`,
          en: `The bare conductor diameters covered by the scale run from `
            + `${mmLimit(AWG_D_MIN)} mm to ${mmLimit(AWG_D_MAX)} mm. The limits are written `
            + `with four decimals; a value with exactly three digits after the decimal `
            + `separator would be mistaken for a thousands separator and rejected.`,
        }),
      },
      tolD: {
        label: t({ tr: 'Çap toleransı', en: 'Diameter tolerance' }),
        hint: t({
          tr: 'Üreticinin verdiği çekme toleransı. Boş bırakılırsa tolerans bandı hiç '
            + 'hesaplanmaz ve yalnızca nominal sonuç gösterilir.',
          en: 'The drawing tolerance given by the manufacturer. If left blank, no tolerance '
            + 'band is computed and only the nominal result is shown.',
        }),
        placeholder: t({ tr: 'boş = tolerans yok', en: 'blank = no tolerance' }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      awg: t({ tr: 'AWG numarası', en: 'AWG number' }),
      d: t({ tr: 'İletken çapı', en: 'Conductor diameter' }),
      tolD: t({ tr: 'Çap toleransı', en: 'Diameter tolerance' }),
    },

    bigFromDiameter: t({ tr: 'AWG numarası (kesirli)', en: 'AWG number (fractional)' }),
    bigFromAwg: t({ tr: 'Çıplak iletken çapı', en: 'Bare conductor diameter' }),
    nearestStdPrefix: t({ tr: 'en yakın standart AWG', en: 'closest standard AWG' }),

    table: {
      diameterHead: t({ tr: 'Çap', en: 'Diameter' }),
      areaSection: t({ tr: 'Kesit alanı', en: 'Cross-sectional area' }),
      areaHeadNote: t({ tr: 'yuvarlak kesit', en: 'round cross-section' }),
    },

    toleranceCaption: t({
      tr: 'Çap toleransı (minimum · nominal · maksimum)',
      en: 'Diameter tolerance (minimum · nominal · maximum)',
    }),
    toleranceFieldCaption: t({
      tr: 'Çekme toleransı (isteğe bağlı)',
      en: 'Drawing tolerance (optional)',
    }),
    tolTable: {
      head: (v) => t({
        tr: `Çekme toleransı ±${pct(v)}`,
        en: `Drawing tolerance ±${pct(v)}`,
      }),
      headNote: t({ tr: 'minimum · nominal · maksimum', en: 'minimum · nominal · maximum' }),
      dMm: t({ tr: 'Çap (mm)', en: 'Diameter (mm)' }),
      dMil: t({ tr: 'Çap (mil)', en: 'Diameter (mil)' }),
      aMm2: t({ tr: 'Kesit alanı (mm²)', en: 'Cross-sectional area (mm²)' }),
      aMil2: t({ tr: 'Kesit alanı (mil²)', en: 'Cross-sectional area (mil²)' }),
      band: t({ tr: 'Bant genişliği', en: 'Band width' }),
      bandRow: (dPct, aPct) => t({
        tr: `çap ${pct(dPct)} · kesit ${pct(aPct)}`,
        en: `diameter ${pct(dPct)} · area ${pct(aPct)}`,
      }),
      bandNote: t({
        tr: '(kesit bandı çapınkinin ≈ iki katı)',
        en: '(the area band is ≈ twice the diameter band)',
      }),
    },

    nearestSection: t({ tr: 'En yakın standart numara', en: 'Closest standard gauge' }),
    nearest: {
      self: t({ tr: 'girilen değerin kendisi', en: 'the entered value itself' }),
      rounded: t({ tr: 'yuvarlanmış karşılık', en: 'rounded equivalent' }),
      d: t({ tr: 'Çap', en: 'Diameter' }),
      area: t({ tr: 'Kesit alanı', en: 'Cross-sectional area' }),
      dDelta: t({ tr: 'Çap farkı', en: 'Diameter difference' }),
      areaDelta: t({ tr: 'Kesit farkı', en: 'Area difference' }),
    },

    neighborsSection: t({ tr: 'Komşu standart numaralar', en: 'Neighbouring standard gauges' }),
    neighbors: {
      gauge: t({ tr: 'Numara', en: 'Gauge' }),
      cols: t({ tr: 'çap · kesit', en: 'diameter · area' }),
      nearestTag: t({ tr: '(en yakın)', en: '(closest)' }),
    },

    formula: t({
      tr: `Numaradan çap:
  d[inch] =
    0.005 × 92^((36 − AWG)/39)
  d[mm] =
    0.127 × 92^((36 − AWG)/39)

Kesit alanı:
  A = π·d²/4

Çaptan numara (analitik ters):
  AWG = 36 − 39 ·
    ln(d[mm]/0.127) / ln(92)

Birim bağıntıları:
  1 inch = 25.4 mm
  1 mil = 0.001 inch = 0.0254 mm
  1 mil² = 0.00064516 mm²

Çekme toleransı (isteğe bağlı):
  d ∈ [d·(1−t), d·(1+t)]
  A ∈ [A·(1−t)², A·(1+t)²]

Geçerli aralık: AWG -3 (4/0) … 40`,
      en: `Gauge to diameter:
  d[inch] =
    0.005 × 92^((36 − AWG)/39)
  d[mm] =
    0.127 × 92^((36 − AWG)/39)

Cross-sectional area:
  A = π·d²/4

Diameter to gauge (analytic inverse):
  AWG = 36 − 39 ·
    ln(d[mm]/0.127) / ln(92)

Unit relations:
  1 inch = 25.4 mm
  1 mil = 0.001 inch = 0.0254 mm
  1 mil² = 0.00064516 mm²

Drawing tolerance (optional):
  d ∈ [d·(1−t), d·(1+t)]
  A ∈ [A·(1−t)², A·(1+t)²]

Valid range: AWG -3 (4/0) … 40`,
    }),

    detail: {
      exponent: (awgStr, expStr) => t({
        tr: `Üs: (36 − ${awgStr}) / 39 = ${expStr}`,
        en: `Exponent: (36 − ${awgStr}) / 39 = ${expStr}`,
      }),
      factor: (expStr, facStr) => t({
        tr: `Çarpan: 92^${expStr} = ${facStr}`,
        en: `Factor: 92^${expStr} = ${facStr}`,
      }),
      diameter: (facStr, mmStr) => t({
        tr: `Çap: 0.127 mm × ${facStr} = ${mmStr} mm`,
        en: `Diameter: 0.127 mm × ${facStr} = ${mmStr} mm`,
      }),
      diameterSolvedSub: t({
        tr: '(çap girildi, numara bundan çözüldü)',
        en: '(diameter entered, the gauge was solved from it)',
      }),
      area: (mm2, mil2) => t({
        tr: `Kesit: π·d²/4 = ${mm2} mm² = ${mil2} mil²`,
        en: `Area: π·d²/4 = ${mm2} mm² = ${mil2} mil²`,
      }),
      ratio: (ratioStr) => t({
        tr: `Ölçek oranı: 92^(1/39) = ${ratioStr} — bir numara başına çap oranı`,
        en: `Scale ratio: 92^(1/39) = ${ratioStr} — diameter ratio per gauge step`,
      }),
      tolerance: (tolStr, dMin, dMax, aMin, aMax) => t({
        tr: `Tolerans: t = ${tolStr} → çap ${dMin} … ${dMax} mm, kesit ${aMin} … ${aMax} mm²`,
        en: `Tolerance: t = ${tolStr} → diameter ${dMin} … ${dMax} mm, area ${aMin} … `
          + `${aMax} mm²`,
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    scaleSourceSection: t({ tr: 'Kullanılan ölçek ve kaynak', en: 'Scale and source used' }),

    // Kullanılan ölçek ve kaynak (spec §1: standart veya kaynak bilgisi)
    scaleSource: [
      t({
        tr: `Ölçek: AWG geometrik tel ölçüsü tanımı — ${AWG_REF_GAUGE} numaranın çapı `
          + `${AWG_REF_INCH} inch ve ardışık iki numara arasındaki çap oranı sabittir. `
          + `${AWG_STEPS} adımlık aralık ${AWG_RATIO} katlık çap oranını verir; numara başına `
          + `oran ${AWG_RATIO}^(1/${AWG_STEPS}) ≈ ${fmt(Math.pow(AWG_RATIO, 1 / AWG_STEPS), 5)}.`,
        en: `Scale: the geometric wire gauge definition — gauge ${AWG_REF_GAUGE} has a `
          + `diameter of ${AWG_REF_INCH} inch and the diameter ratio between two consecutive `
          + `gauges is constant. A span of ${AWG_STEPS} steps gives a ${AWG_RATIO}× diameter `
          + `ratio; the per-gauge ratio is ${AWG_RATIO}^(1/${AWG_STEPS}) ≈ `
          + `${fmt(Math.pow(AWG_RATIO, 1 / AWG_STEPS), 5)}.`,
      }),
      t({
        tr: 'Uzunluk: uluslararası inch tanımı, 1 inch = 25.4 mm (tam). Milimetre, mil ve '
          + 'mikrometre karşılıkları bu tek eşitlikten çıkar.',
        en: 'Length: the international inch definition, 1 inch = 25.4 mm (exact). The '
          + 'millimetre, mil and micrometre equivalents all follow from this single equality.',
      }),
      t({
        tr: 'Kesit alanı yuvarlak ve tek telli iletken varsayımıyla A = π·d²/4 bağıntısından '
          + 'gelir.',
        en: 'The cross-sectional area comes from A = π·d²/4 under the assumption of a round, '
          + 'solid conductor.',
      }),
      t({
        tr: 'Bütün değerler bu tanımlardan hesaplanır; yayınlanmış bir çap tablosu '
          + 'kopyalanmamıştır. Sipariş verirken üreticinin kendi veri sayfasındaki nominal çap '
          + 've toleransı esas alın.',
        en: 'All values are computed from these definitions; no published diameter table has '
          + 'been copied. When ordering, rely on the nominal diameter and tolerance in the '
          + 'manufacturer’s own datasheet.',
      }),
    ],

    // Kesitin toleransı neden çapın iki katı — sağ panelde tek cümle.
    toleranceSquareNote: t({
      tr: 'Kesit alanı çapın karesiyle gittiği için çap toleransı kesitte yaklaşık iki katına '
        + 'çıkar: A(d·(1±t)) = A(d)·(1±t)², yani ±%5 çap toleransı kesitte −%9.75 / +%10.25 '
        + 'demektir. Bant simetrik değildir; üst uç alt uçtan biraz geniştir.',
      en: 'Because the cross-sectional area goes with the square of the diameter, the diameter '
        + 'tolerance roughly doubles in the area: A(d·(1±t)) = A(d)·(1±t)², i.e. a ±5% '
        + 'diameter tolerance means −9.75% / +10.25% in area. The band is not symmetric; the '
        + 'upper end is slightly wider than the lower.',
    }),

    approxNote: t({
      tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
      en: 'Results are approximate — verify against manufacturer data and measurement for '
        + 'critical designs.',
    }),

    toleranceReason: (code) => {
      switch (code) {
        case AWG_ERR_TOLERANCE:
          return t({
            tr: 'Çap toleransı %0 ile %100 arasında olmalı (100 hariç). %100 tolerans alt '
              + 'uçta çapı sıfırlar ve kesit alanı tanımsız kalır.',
            en: 'The diameter tolerance must be between 0% and 100% (100 excluded). A 100% '
              + 'tolerance zeroes the diameter at the lower end and the cross-sectional area '
              + 'becomes undefined.',
          })
        default:
          return t({
            tr: 'Tolerans bandı hesaplanamadı; nominal çapın pozitif olması gerekir.',
            en: 'The tolerance band could not be computed; the nominal diameter must be '
              + 'positive.',
          })
      }
    },

    // --- Hata kodu → cümle ---
    reasonText: (reason) => {
      switch (reason) {
        case REASON_AWG_RANGE:
          return t({
            tr: `Numara ölçeğin dışında. Geçerli aralık AWG ${awgLabel(AWG_MIN)} ile `
              + `${AWG_MAX} arasıdır; 4/0 için -3, 3/0 için -2, 00 için -1, 0 için 0 yazın.`,
            en: `The gauge is outside the scale. The valid range is AWG ${awgLabel(AWG_MIN)} `
              + `to ${AWG_MAX}; enter -3 for 4/0, -2 for 3/0, -1 for 00 and 0 for 0.`,
          })
        case REASON_DIAMETER_RANGE:
          return t({
            tr: `Çap ölçeğin dışında. AWG ${awgLabel(AWG_MAX)} ile ${awgLabel(AWG_MIN)} `
              + `arasındaki çıplak iletken çapları ${mmLimit(AWG_D_MIN)} mm ile `
              + `${mmLimit(AWG_D_MAX)} mm arasındadır; bu aralığın dışında sonuç üretilmez.`,
            en: `The diameter is outside the scale. Bare conductor diameters between AWG `
              + `${awgLabel(AWG_MAX)} and ${awgLabel(AWG_MIN)} run from `
              + `${mmLimit(AWG_D_MIN)} mm to ${mmLimit(AWG_D_MAX)} mm; no result is produced `
              + `outside this range.`,
          })
        case REASON_INCOMPLETE:
        default:
          return t({
            tr: 'Tüm zorunlu alanlara sayısal değer girin. Ondalık için nokta veya virgül '
              + 'kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a numeric value in every required field. Use a point or a comma for '
              + 'decimals (0.25 = 0,25).',
          })
      }
    },

    // --- Bulgular ---
    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      const shown = r.standard ? `AWG ${awgLabel(r.awgExact)}` : `AWG ${fmt(r.awgExact, 5)}`

      out.push({
        level: 'ok',
        text: t({
          tr: `${shown} çıplak iletken çapı ${fmt(r.dUnits.mm, 4)} mm `
            + `(${fmt(r.dUnits.mil, 4)} mil, ${fmt(r.dUnits.inch, 4)} inch); kesit alanı `
            + `${fmt(r.aUnits.mm2, 4)} mm² (${fmt(r.aUnits.mil2, 6)} mil²).`,
          en: `${shown} has a bare conductor diameter of ${fmt(r.dUnits.mm, 4)} mm `
            + `(${fmt(r.dUnits.mil, 4)} mil, ${fmt(r.dUnits.inch, 4)} inch); the `
            + `cross-sectional area is ${fmt(r.aUnits.mm2, 4)} mm² `
            + `(${fmt(r.aUnits.mil2, 6)} mil²).`,
        }),
      })

      if (r.standard) {
        out.push({
          level: 'ok',
          text: t({
            tr: 'Girilen numara ölçekte tam bir basamağa oturuyor; en yakın standart karşılık '
              + 'kendisidir.',
            en: 'The entered gauge sits exactly on an integer step of the scale; the closest '
              + 'standard equivalent is itself.',
          }),
        })
      } else {
        out.push({
          level: Math.abs(r.dDeltaPct) > 2 ? 'warn' : 'ok',
          text: t({
            tr: `Değer standart bir basamağa tam oturmuyor. En yakın standart AWG `
              + `${awgLabel(r.awgNearest)} çapı ${fmt(r.nearest.dUnits.mm, 4)} mm; fark çapta `
              + `${pct(fmtPct(r.dDeltaPct))}, kesitte ${pct(fmtPct(r.areaDeltaPct))}. Sipariş verirken `
              + `standart basamağı kullanın.`,
            en: `The value does not sit exactly on a standard step. The closest standard, AWG `
              + `${awgLabel(r.awgNearest)}, has a diameter of ${fmt(r.nearest.dUnits.mm, 4)} `
              + `mm; the difference is ${pct(fmtPct(r.dDeltaPct))} in diameter and `
              + `${pct(fmtPct(r.areaDeltaPct))} in area. Use the standard step when ordering.`,
          }),
        })
      }

      out.push({
        level: 'ok',
        text: t({
          tr: 'Ölçek geometriktir: 6 numara aşağı inmek çapı 2.0050 katına, 3 numara aşağı '
            + 'inmek kesiti 2.0050 katına, 10 numara aşağı inmek kesiti 10.16 katına çıkarır. '
            + 'Küçük numara kalın teldir.',
          en: 'The scale is geometric: going down 6 gauges multiplies the diameter by 2.0050, '
            + 'going down 3 gauges multiplies the area by 2.0050, and going down 10 gauges '
            + 'multiplies the area by 10.16. A smaller gauge number is a thicker wire.',
        }),
      })

      // Tolerans girilmişse bandın sayısal karşılığı yoruma da girer; boşken bu
      // madde hiç eklenmez ve liste bugünkü hâlinde kalır.
      const tol = r.tolerance
      if (tol && !tol.error && tol.active) {
        out.push({
          level: 'ok',
          text: t({
            tr: `±${pct(fmt(tol.tol * 100, 3))} çekme toleransıyla çap `
              + `${fmt(tol.dUnits.min.mm, 4)} … ${fmt(tol.dUnits.max.mm, 4)} mm, kesit `
              + `${fmt(tol.aUnits.min.mm2, 4)} … ${fmt(tol.aUnits.max.mm2, 4)} mm² bandına `
              + `oturur; kesitteki sapma ${pct(fmtPct(tol.area.minPct, 4))} / `
              + `${pct(fmtPct(tol.area.maxPct, 4))}. Akım ve direnç hesaplarında kötü durum için `
              + `alt ucu kullanın.`,
            en: `With a ±${pct(fmt(tol.tol * 100, 3))} drawing tolerance the diameter falls in `
              + `the ${fmt(tol.dUnits.min.mm, 4)} … ${fmt(tol.dUnits.max.mm, 4)} mm band and `
              + `the area in ${fmt(tol.aUnits.min.mm2, 4)} … ${fmt(tol.aUnits.max.mm2, 4)} `
              + `mm²; the area deviation is ${pct(fmtPct(tol.area.minPct, 4))} / `
              + `${pct(fmtPct(tol.area.maxPct, 4))}. Use the lower end for worst-case current and `
              + `resistance calculations.`,
          }),
        })
      }

      // Zorunlu uyarı — çıplak iletken (spec §11.2)
      out.push({
        level: 'warn',
        text: t({
          tr: 'Bu değerler yalnızca çıplak iletkene aittir. İzolasyonlu telin dış çapı '
            + 'yalıtkan malzemesine, kalınlığına ve sıcaklık sınıfına göre değişir; üreticinin '
            + 'veri tabanından okunmalıdır.',
          en: 'These values apply to the bare conductor only. The outer diameter of insulated '
            + 'wire depends on the insulation material, thickness and temperature class; it '
            + 'must be read from the manufacturer’s data.',
        }),
      })

      if (r.awgExact >= 30) {
        out.push({
          level: 'warn',
          text: t({
            tr: `Bu incelikte (${shown}) çekme toleransı ve yüzey işlemi çapın kayda değer `
              + `bir yüzdesini oluşturur; ölçülen kesit tablodaki değerden sapabilir. `
              + `Lehimleme ve mekanik dayanım da sınırlayıcı olur.`,
            en: `At this fineness (${shown}) the drawing tolerance and surface finish make up `
              + `a notable percentage of the diameter; the measured cross-section can deviate `
              + `from the tabulated value. Soldering and mechanical strength also become `
              + `limiting.`,
          }),
        })
      }

      if (r.awgExact <= 0) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Bu kalınlıkta iletken pratikte çok telli örgüdür. Örgünün bakır kesiti aynı '
              + 'numaranın tek telli kesitine yakın olsa da dış çapı belirgin biçimde '
              + 'büyüktür; kanal, pabuç ve bükülme yarıçapı buna göre seçilir.',
            en: 'At this thickness the conductor is in practice a stranded bundle. While the '
              + 'copper cross-section of the strand is close to the solid cross-section of '
              + 'the same gauge, its outer diameter is markedly larger; conduit, lugs and '
              + 'bend radius are chosen accordingly.',
          }),
        })
      }

      return out
    },

    // Sağ paneldeki "Geçerlilik ve varsayımlar" listesinin değişken maddeleri
    validityNotes: (r) => {
      const out = [
        t({
          tr: 'Gösterilen bütün ölçüler çıplak iletkene aittir; izolasyon dış çapı bu hesaba '
            + 'dahil değildir ve üretici veri tabanından alınır.',
          en: 'All dimensions shown apply to the bare conductor; the insulation outer '
            + 'diameter is not part of this calculation and is taken from the manufacturer’s '
            + 'data.',
        }),
        t({
          tr: 'Ölçek tek telli (solid), yuvarlak kesitli iletken için tanımlıdır. Çok telli '
            + 'örgüde aynı numara benzer bakır kesitini hedefler; dış çap, esneklik ve deri '
            + 'etkisi davranışı farklıdır.',
          en: 'The scale is defined for a solid, round conductor. In a stranded bundle the '
            + 'same gauge targets a similar copper cross-section; the outer diameter, '
            + 'flexibility and skin-effect behaviour differ.',
        }),
        t({
          tr: `Geçerli aralık AWG ${awgLabel(AWG_MIN)} … ${AWG_MAX}, yani `
            + `${mmLimit(AWG_D_MIN)} mm ile ${mmLimit(AWG_D_MAX)} mm arası çap. Aralığın `
            + `dışında sonuç üretilmez.`,
          en: `The valid range is AWG ${awgLabel(AWG_MIN)} … ${AWG_MAX}, i.e. diameters from `
            + `${mmLimit(AWG_D_MIN)} mm to ${mmLimit(AWG_D_MAX)} mm. No result is produced `
            + `outside the range.`,
        }),
        t({
          tr: 'Bu ekran yalnızca geometrik dönüşüm yapar: akım taşıma kapasitesi, direnç, '
            + 'gerilim düşümü ve ısınma bu numaradan çıkarılmaz. Bunlar ortam sıcaklığına, '
            + 'demetlemeye, yalıtkan sınıfına ve kablo uzunluğuna bağlıdır; ayrı hesaplanır.',
          en: 'This screen performs a geometric conversion only: current-carrying capacity, '
            + 'resistance, voltage drop and heating are not derived from this gauge number. '
            + 'They depend on ambient temperature, bundling, insulation class and cable '
            + 'length; they are calculated separately.',
        }),
      ]

      if (r.ok && r.dir === DIR_DIAMETER) {
        out.push(t({
          tr: 'Ölçülen çap üretim toleransı ve yüzey kaplaması taşır; ölçüyü telin birkaç '
            + 'noktasında alıp ortalamayı kullanın.',
          en: 'A measured diameter carries manufacturing tolerance and surface plating; take '
            + 'the measurement at several points along the wire and use the average.',
        }))
      }

      if (r.ok && r.tolerance && !r.tolerance.error && r.tolerance.active) {
        out.push(t({
          tr: 'Tolerans bandı basit worst-case yaklaşımıdır: çapın iki ucu alınır, kesit bu '
            + 'uçlardan hesaplanır; olasılık dağılımı varsayılmaz. Tolerans değeri '
            + 'uygulamanın kendi verisi değildir, üreticinin veri sayfasından girilir.',
          en: 'The tolerance band is a simple worst-case approach: the two diameter extremes '
            + 'are taken and the area is computed from them; no probability distribution is '
            + 'assumed. The tolerance value is not the application’s own data — it is entered '
            + 'from the manufacturer’s datasheet.',
        }))
      }

      return out
    },

    // --- Grafik ---
    sweepLabel: {
      [SWEEP_D]: t({ tr: 'Çap', en: 'Diameter' }),
      [SWEEP_AREA]: t({ tr: 'Kesit alanı', en: 'Cross-sectional area' }),
    },
    sweepAxis: {
      [SWEEP_D]: t({
        tr: 'İletken çapı (mm, logaritmik)',
        en: 'Conductor diameter (mm, logarithmic)',
      }),
      [SWEEP_AREA]: t({
        tr: 'Kesit alanı (mm², logaritmik)',
        en: 'Cross-sectional area (mm², logarithmic)',
      }),
    },
    sweepCaption: {
      [SWEEP_D]: t({
        tr: 'Çap logaritmik eksende çizildiğinde numara ile doğrusal bir doğru verir: ölçek '
          + 'geometriktir, aritmetik değil. 6 numara aşağı inmek çapı yaklaşık iki katına '
          + 'çıkarır.',
        en: 'Plotted on a logarithmic axis, the diameter forms a straight line against the '
          + 'gauge number: the scale is geometric, not arithmetic. Going down 6 gauges '
          + 'roughly doubles the diameter.',
      }),
      [SWEEP_AREA]: t({
        tr: 'Kesit alanı çapın karesiyle büyüdüğü için doğrunun eğimi çap grafiğinin yarısı '
          + 'kadardır: 3 numara aşağı inmek kesiti yaklaşık iki katına, 10 numara aşağı inmek '
          + 'yaklaşık on katına çıkarır.',
        en: 'Because the cross-sectional area grows with the square of the diameter, the '
          + 'slope of the line is half that of the diameter chart: going down 3 gauges '
          + 'roughly doubles the area, going down 10 gauges multiplies it by roughly ten.',
      }),
    },
    chartY: t({ tr: 'AWG numarası', en: 'AWG gauge number' }),
    chartLegend: t({ tr: 'tam numaralar', en: 'integer gauges' }),
    selected: t({ tr: 'seçilen', en: 'selected' }),

    schematic: {
      title: t({ tr: 'Tel kesiti', en: 'Wire cross-section' }),
      caption: t({
        tr: 'Kesit — hesap yalnızca çıplak iletken çapını (d) kapsar; izolasyon dış çapı '
          + 'üretici verisidir.',
        en: 'Cross-section — the calculation covers only the bare conductor diameter (d); '
          + 'the insulation outer diameter is manufacturer data.',
      }),
      insulation: t({ tr: 'izolasyon — dahil değil', en: 'insulation — not included' }),
    },
  }
}
