// BGA breakout ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Ortak DFM metinleri (profil paneli, kontrol tablosu, özet başlıkları)
// `data/dfmText.js` içindedir ve burada tekrarlanmaz.

import { pick } from '../../../lib/i18n'
import { fmt } from '../../../lib/num'
import { commonText } from '../../../data/uiText'
import {
  CHECK_TRACE_WIDTH, CHECK_TRACE_CLEARANCE, CHECK_CHANNEL, CHECK_VIA_PAD,
  CHECK_VIA_DRILL, CHECK_VIA_ASPECT, CHECK_LAND_VIA, CHECK_VIA_VIA,
  CHECK_MASK_WEB, CHECK_NECK, CHECK_VIA_IN_PAD,
  BGA_WARN_CHANNEL_INSUFFICIENT, BGA_WARN_MASK_WEB_NEGATIVE,
  BGA_WARN_NECK_NON_POSITIVE, BGA_WARN_VIA_PAD_OVER_MAX,
  ASSUMPTION_ORTHOGONAL_CHANNEL, ASSUMPTION_EQUAL_LANDS, ASSUMPTION_CENTRED_VIA,
  ASSUMPTION_NO_ROUTER, ASSUMPTION_NO_FAB_PROFILE,
  VIA_THROUGH, VIA_BLIND, VIA_MICROVIA, VIA_IN_PAD,
} from '../../../lib/bgaBreakout'
import { REASON_INCOMPLETE, REASON_ENGINE, PAD_NSMD, PAD_SMD } from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  const checkLabels = {
    [CHECK_TRACE_WIDTH]: t({ tr: 'İz genişliği', en: 'Trace width' }),
    [CHECK_TRACE_CLEARANCE]: t({ tr: 'İz–land açıklığı', en: 'Trace-to-land clearance' }),
    [CHECK_CHANNEL]: t({ tr: 'Koridor kapasitesi', en: 'Channel capacity' }),
    [CHECK_VIA_PAD]: t({ tr: 'Via pad çapı', en: 'Via pad diameter' }),
    [CHECK_VIA_DRILL]: t({ tr: 'Via matkap çapı', en: 'Via drill diameter' }),
    [CHECK_VIA_ASPECT]: t({ tr: 'Via aspect ratio', en: 'Via aspect ratio' }),
    [CHECK_LAND_VIA]: t({ tr: 'Land–via açıklığı', en: 'Land-to-via clearance' }),
    [CHECK_VIA_VIA]: t({ tr: 'Via–via açıklığı', en: 'Via-to-via clearance' }),
    [CHECK_MASK_WEB]: t({ tr: 'Solder mask web', en: 'Solder mask web' }),
    [CHECK_NECK]: t({ tr: 'Dog-bone boyun geometrisi', en: 'Dog-bone neck geometry' }),
    [CHECK_VIA_IN_PAD]: t({ tr: 'Via-in-pad kabiliyeti', en: 'Via-in-pad capability' }),
  }

  const warningText = {
    [BGA_WARN_CHANNEL_INSUFFICIENT]: t({
      tr: 'İstenen iz sayısı koridora sığmıyor.',
      en: 'The requested number of traces does not fit the channel.',
    }),
    [BGA_WARN_MASK_WEB_NEGATIVE]: t({
      tr: 'Komşu mask açıklıkları üst üste geliyor. Bu tek başına elektriksel bir hata değildir; seçilen mask tanımını üreticinizle doğrulayın.',
      en: 'Neighbouring mask openings overlap. This alone is not an electrical fault; confirm the chosen mask definition with your fabricator.',
    }),
    [BGA_WARN_NECK_NON_POSITIVE]: t({
      tr: 'Dog-bone boynu pozitif değil: land ve via pad kenarları çakışıyor.',
      en: 'The dog-bone neck is not positive: the land and via pad edges overlap.',
    }),
    [BGA_WARN_VIA_PAD_OVER_MAX]: t({
      tr: 'Via pad çapı, diyagonal boşluğun izin verdiği en büyük değeri aşıyor.',
      en: 'The via pad diameter exceeds the largest value the diagonal gap allows.',
    }),
  }

  const assumptionText = {
    [ASSUMPTION_ORTHOGONAL_CHANNEL]: t({
      tr: 'Koridor hesabı, izlerin land sıraları arasından dik geçtiği varsayımına dayanır.',
      en: 'The channel calculation assumes traces run orthogonally between the land rows.',
    }),
    [ASSUMPTION_EQUAL_LANDS]: t({
      tr: 'Bütün landler eşit çaplı kabul edilir.',
      en: 'All lands are taken to have the same diameter.',
    }),
    [ASSUMPTION_CENTRED_VIA]: t({
      tr: 'Land–via mesafesi girilmediği için via, dört landin geometrik merkezine (P/√2) konmuş kabul edildi.',
      en: 'No land-to-via distance was entered, so the via is taken at the geometric centre of four lands (P/√2).',
    }),
    [ASSUMPTION_NO_ROUTER]: t({
      tr: 'Bu araç otomatik yol çizmez. Katman atama, dönüş yolu, empedans ve gerçek yol uzunlukları hesaba girmez.',
      en: 'This tool does not route. Layer assignment, return path, impedance and real trace lengths are not considered.',
    }),
    [ASSUMPTION_NO_FAB_PROFILE]: t({
      tr: 'Üretici yetenek profili seçilmedi; profile bağlı kontroller değerlendirilmedi.',
      en: 'No fabricator capability profile is selected; the checks that depend on it were not evaluated.',
    }),
  }

  return {
    backlink: t({ tr: '← PCB Üretim ve DFM', en: '← PCB Manufacturing and DFM' }),
    title: t({ tr: 'BGA Breakout', en: 'BGA Breakout' }),
    intro: t({
      tr: 'BGA landleri arasından kaç izin geçebileceğini, dog-bone via yerleşiminin kenar boşluklarını '
        + 've mask geometrisini hesaplar. Yol çizmez; geometrik uygulanabilirliği değerlendirir.',
      en: 'Computes how many traces fit between BGA lands, the edge clearances of a dog-bone via placement '
        + 'and the mask geometry. It does not route; it evaluates geometric feasibility.',
    }),

    viaType: {
      label: t({ tr: 'Via türü', en: 'Via type' }),
      [VIA_THROUGH]: t({ tr: 'Through via', en: 'Through via' }),
      [VIA_BLIND]: t({ tr: 'Blind via', en: 'Blind via' }),
      [VIA_MICROVIA]: t({ tr: 'Microvia', en: 'Microvia' }),
      [VIA_IN_PAD]: t({ tr: 'Via-in-pad', en: 'Via-in-pad' }),
      hint: t({
        tr: 'Kör ve mikrovia için üreticinin lazer delik ve mikrovia aspect ratio sınırları kullanılır.',
        en: 'For blind vias and microvias the fabricator’s laser drill and microvia aspect ratio limits are used.',
      }),
    },

    padDefinition: {
      label: t({ tr: 'Pad tanımı', en: 'Pad definition' }),
      [PAD_NSMD]: t({ tr: 'Mask ile tanımlı değil (NSMD)', en: 'Non-solder-mask-defined (NSMD)' }),
      [PAD_SMD]: t({ tr: 'Mask ile tanımlı (SMD)', en: 'Solder-mask-defined (SMD)' }),
      hint: t({
        tr: 'Yalnızca mask geometrisinin çizimini ve genişlemenin işaretini anlatır; hesap girilen genişleme değerini kullanır.',
        en: 'Only describes how the mask geometry is drawn and the sign of the expansion; the calculation uses the value you enter.',
      }),
    },

    fields: {
      pitch: { label: t({ tr: 'BGA pitch (P)', en: 'BGA pitch (P)' }) },
      landDiameter: { label: t({ tr: 'Land çapı (D_L)', en: 'Land diameter (D_L)' }) },
      traceWidth: { label: t({ tr: 'İz genişliği (W)', en: 'Trace width (W)' }) },
      traceClearance: { label: t({ tr: 'İz–land açıklığı (C)', en: 'Trace-to-land clearance (C)' }) },
      traceCount: {
        label: t({ tr: 'Geçirilecek iz sayısı (n)', en: 'Traces to route through (n)' }),
        hint: t({ tr: 'Tam sayı olmalı.', en: 'Must be a whole number.' }),
      },
      viaPadDiameter: { label: t({ tr: 'Via pad çapı (D_V)', en: 'Via pad diameter (D_V)' }) },
      viaDrillDiameter: { label: t({ tr: 'Via matkap çapı (D_D)', en: 'Via drill diameter (D_D)' }) },
      landViaDistance: {
        label: t({ tr: 'Land–via merkez mesafesi (d_LV)', en: 'Land-to-via centre distance (d_LV)' }),
        hint: t({
          tr: 'Boş bırakılırsa via dört landin merkezine konmuş kabul edilir: d_LV = P/√2.',
          en: 'If left empty the via is taken at the centre of four lands: d_LV = P/√2.',
        }),
      },
      viaPitch: { label: t({ tr: 'Via–via merkez mesafesi', en: 'Via-to-via centre distance' }) },
      viaDepth: {
        label: t({ tr: 'Via derinliği', en: 'Via depth' }),
        hint: t({
          tr: 'Aspect ratio için: through viada kart kalınlığı, kör/mikroviada delik derinliği.',
          en: 'For the aspect ratio: board thickness for a through via, drilled depth for a blind via or microvia.',
        }),
      },
      maskExpansion: {
        label: t({ tr: 'Solder mask genişlemesi', en: 'Solder mask expansion' }),
        hint: t({ tr: 'Mask ile tanımlı padde negatif girilebilir.', en: 'May be negative for a mask-defined pad.' }),
      },
      rows: { label: t({ tr: 'Satır sayısı', en: 'Row count' }) },
      cols: { label: t({ tr: 'Sütun sayısı', en: 'Column count' }) },
    },

    fieldLabels: {
      pitch: t({ tr: 'BGA pitch', en: 'BGA pitch' }),
      landDiameter: t({ tr: 'Land çapı', en: 'Land diameter' }),
      traceWidth: t({ tr: 'İz genişliği', en: 'Trace width' }),
      traceClearance: t({ tr: 'İz–land açıklığı', en: 'Trace-to-land clearance' }),
      traceCount: t({ tr: 'Geçirilecek iz sayısı', en: 'Traces to route through' }),
      viaPadDiameter: t({ tr: 'Via pad çapı', en: 'Via pad diameter' }),
      viaDrillDiameter: t({ tr: 'Via matkap çapı', en: 'Via drill diameter' }),
      landViaDistance: t({ tr: 'Land–via merkez mesafesi', en: 'Land-to-via centre distance' }),
      viaPitch: t({ tr: 'Via–via merkez mesafesi', en: 'Via-to-via centre distance' }),
      viaDepth: t({ tr: 'Via derinliği', en: 'Via depth' }),
      maskExpansion: t({ tr: 'Solder mask genişlemesi', en: 'Solder mask expansion' }),
      rows: t({ tr: 'Satır sayısı', en: 'Row count' }),
      cols: t({ tr: 'Sütun sayısı', en: 'Column count' }),
      warnPercent: t({ tr: 'Uyarı marjı', en: 'Warning margin' }),
    },

    countUnit: t({ tr: 'adet', en: 'pcs' }),

    bigResult: {
      label: t({ tr: 'Koridordan geçebilecek en fazla iz', en: 'Most traces the channel allows' }),
      gap: t({ tr: 'boşluk', en: 'gap' }),
      maxWidth: t({ tr: 'tek iz için en büyük genişlik', en: 'largest width for one trace' }),
    },

    verdict: {
      feasible: t({
        tr: 'Seçilen geometri belirtilen sınırlar içinde geometrik olarak uygulanabilir görünüyor.',
        en: 'The chosen geometry appears geometrically feasible within the limits stated.',
      }),
      notFeasible: t({
        tr: 'Seçilen geometri belirtilen sınırlar içinde geometrik olarak uygulanabilir görünmüyor.',
        en: 'The chosen geometry does not appear geometrically feasible within the limits stated.',
      }),
      undecided: t({
        tr: 'Geometrik uygulanabilirlik, girilen veriyle kısmen değerlendirilebildi.',
        en: 'Geometric feasibility could only be partly evaluated with the data entered.',
      }),
    },

    table: {
      gap: t({ tr: 'Landler arası yatay boşluk (G)', en: 'Horizontal gap between lands (G)' }),
      maxWidthSingle: t({ tr: 'Tek iz için maksimum genişlik', en: 'Maximum width for one trace' }),
      nMax: t({ tr: 'Maksimum iz sayısı', en: 'Maximum trace count' }),
      requiredSpace: t({ tr: 'İstenen izler için gereken alan', en: 'Space required for the requested traces' }),
      channelMargin: t({ tr: 'Koridor marjı', en: 'Channel margin' }),
      diagPitch: t({ tr: 'Diyagonal merkez mesafesi', en: 'Diagonal centre distance' }),
      diagGap: t({ tr: 'Diyagonal boşluk', en: 'Diagonal gap' }),
      maxWidthDiagonal: t({ tr: 'Diyagonal maksimum iz genişliği', en: 'Diagonal maximum trace width' }),
      landViaDistance: t({ tr: 'Land–via merkez mesafesi', en: 'Land-to-via centre distance' }),
      maxViaPad: t({ tr: 'Geometrik maksimum via pad çapı', en: 'Geometric maximum via pad diameter' }),
      landViaClearance: t({ tr: 'Land–via kenar boşluğu', en: 'Land-to-via edge clearance' }),
      neckLength: t({ tr: 'Dog-bone boyun uzunluğu', en: 'Dog-bone neck length' }),
      viaViaClearance: t({ tr: 'Via–via kenar boşluğu', en: 'Via-to-via edge clearance' }),
      maskOpening: t({ tr: 'Mask açıklığı', en: 'Mask opening' }),
      maskWeb: t({ tr: 'Mask web genişliği', en: 'Mask web width' }),
      viaAspect: t({ tr: 'Via aspect ratio', en: 'Via aspect ratio' }),
      viaType: t({ tr: 'Seçilen via türü', en: 'Selected via type' }),
    },

    checkLabel: (id) => checkLabels[id] ?? id,
    warningText: (code) => warningText[code] ?? '',
    assumptionText: (code) => assumptionText[code] ?? '',

    formula: {
      title: t({ tr: 'BGA breakout geometrisi', en: 'BGA breakout geometry' }),
      body: `G = P − D_L
W_max,1 = P − D_L − 2C
nW + (n + 1)C ≤ G
n_max = floor[(G − C) / (W + C)]
M_channel = G − [nW + (n + 1)C]
P_diag = P·√2
W_max,diag = P·√2 − D_L − 2C
d_LV = P / √2
D_V,max = P·√2 − D_L − 2C
C_land,via = d_LV − (D_L + D_V) / 2
C_via,via = P_via − (D_V1 + D_V2) / 2
D_mask = D_L + 2·E_mask
W_mask,web = P − D_mask`,
    },

    detail: {
      channelRule: t({
        tr: 'Koridor şartı n izin ve n+1 açıklığın toplamıdır: izlerin iki yanında da açıklık kalmalıdır.',
        en: 'The channel condition sums n traces and n+1 clearances: a clearance must remain on both sides of the traces.',
      }),
      floorNote: t({
        tr: 'İz sayısı bir taban (floor) işlemidir; tam sınırdaki geometrinin kayan nokta gürültüsüyle bir aşağı düşmemesi için bağıl pay uygulanır.',
        en: 'The trace count is a floor operation; a relative tolerance keeps geometry exactly at the limit from dropping one step through floating-point noise.',
      }),
      neckNote: t({
        tr: 'Dog-bone boyun uzunluğu, land kenarı ile via pad kenarı arasındaki geometrik mesafedir — bir clearance değeri değildir.',
        en: 'The dog-bone neck length is the geometric distance between the land edge and the via pad edge — it is not a clearance value.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yuvarlama yalnızca ekrana yazarken uygulanır.',
        en: 'No rounding is applied to intermediate values; rounding happens only when writing to the screen.',
      }),
    },

    validity: [
      t({
        tr: 'Bu araç otomatik yol çizen bir yazılım değildir. Sonuç, seçilen geometrinin verilen sınırlar içinde geometrik olarak uygulanabilir görünüp görünmediğini söyler; “route edilir” demez.',
        en: 'This tool is not routing software. The result states whether the chosen geometry appears geometrically feasible within the limits given; it does not say it will route.',
      }),
      t({
        tr: 'Katman atama, dönüş yolu sürekliliği, empedans kontrolü, via bölgesindeki referans düzlem delikleri ve gerçek yol uzunlukları hesaba girmez.',
        en: 'Layer assignment, return path continuity, impedance control, reference plane voiding around vias and real trace lengths are not considered.',
      }),
      t({
        tr: 'Bütün landler eşit çaplı ve düzgün ızgarada kabul edilir; kısmi doldurulmuş dizilim, farklı land çapları ve kenar sıraları modellenmez.',
        en: 'All lands are taken as equal in diameter and on a regular grid; depopulated arrays, differing land diameters and edge rows are not modelled.',
      }),
      t({
        tr: 'Solder mask açıklıklarının üst üste gelmesi otomatik olarak elektriksel bir hata sayılmaz; seçilen mask tanımının üreticiyle doğrulanması gerekir.',
        en: 'Overlapping solder mask openings are not automatically treated as an electrical fault; the chosen mask definition needs confirming with the fabricator.',
      }),
    ],

    chart: {
      sweepLabel: t({ tr: 'Süpürülen değişken', en: 'Swept variable' }),
      pitch: t({ tr: 'BGA pitch', en: 'BGA pitch' }),
      land: t({ tr: 'Land çapı', en: 'Land diameter' }),
      xPitch: t({ tr: 'BGA pitch (mm)', en: 'BGA pitch (mm)' }),
      xLand: t({ tr: 'Land çapı (mm)', en: 'Land diameter (mm)' }),
      yWidth: t({ tr: 'Maksimum iz genişliği (mm)', en: 'Maximum trace width (mm)' }),
      seriesHorizontal: t({ tr: 'Yatay kanal', en: 'Horizontal channel' }),
      seriesDiagonal: t({ tr: 'Diyagonal kanal', en: 'Diagonal channel' }),
      caption: t({
        tr: 'Yatay ve diyagonal koridorda tek iz için kalan en büyük genişlik. Geometrisi geçersiz olan aralıkta nokta üretilmez.',
        en: 'The largest width left for one trace in the horizontal and diagonal channels. No point is produced where the geometry is invalid.',
      }),
    },

    schematic: {
      title: t({ tr: 'BGA land dizilimi ve dog-bone via', en: 'BGA land array and dog-bone via' }),
      land: t({ tr: 'land', en: 'land' }),
      via: t({ tr: 'dog-bone via', en: 'dog-bone via' }),
      trace: t({ tr: 'iz', en: 'trace' }),
      pitch: t({ tr: 'pitch', en: 'pitch' }),
      gap: t({ tr: 'boşluk', en: 'gap' }),
      mask: t({ tr: 'mask açıklığı', en: 'mask opening' }),
      clearance: t({ tr: 'açıklık', en: 'clearance' }),
      caption: t({
        tr: 'Dört land, aradan geçen izler ve dog-bone via — girilen değerlere göre orantılı çizilir.',
        en: 'Four lands, the traces between them and the dog-bone via — drawn to scale from the values entered.',
      }),
    },

    reasonText: (reason, detail) => {
      if (reason === REASON_INCOMPLETE) {
        return t({
          tr: `Hesap için gerekli alanlar eksik veya geçersiz: ${(detail ?? []).join(', ')}.`,
          en: `Fields required for the calculation are missing or invalid: ${(detail ?? []).join(', ')}.`,
        })
      }
      if (reason === REASON_ENGINE) {
        return t({
          tr: 'Girilen geometri fiziksel olarak mümkün değil. Land çapı adımdan küçük olmalı, iz sayısı tam sayı olmalı ve mask açıklığı kapanmamalıdır.',
          en: 'The geometry entered is not physically possible. The land diameter must be smaller than the pitch, the trace count must be a whole number and the mask opening must not close.',
        })
      }
      return t({ tr: 'Sonuç üretilemedi.', en: 'No result could be produced.' })
    },

    commentary: (r, fmtLen) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: r.results.channelMargin < 0 ? 'danger' : 'ok',
        text: t({
          tr: `Landler arası boşluk ${fmtLen(r.results.gap)}; bu koridordan en fazla ${r.results.nMax} iz geçebilir.`,
          en: `The gap between lands is ${fmtLen(r.results.gap)}; at most ${r.results.nMax} trace(s) fit through this channel.`,
        }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `Diyagonal koridor daha geniştir: tek iz için ${fmtLen(r.results.maxWidthDiagonal)} yer kalır (yatayda ${fmtLen(r.results.maxWidthSingle)}).`,
          en: `The diagonal channel is wider: ${fmtLen(r.results.maxWidthDiagonal)} remains for one trace (horizontally ${fmtLen(r.results.maxWidthSingle)}).`,
        }),
      })

      if (r.results.landViaClearance !== null) {
        out.push({
          level: r.results.landViaClearance <= 0 ? 'danger' : 'ok',
          text: t({
            tr: `Land ile via pad kenarı arasında ${fmtLen(r.results.landViaClearance)} mesafe var; izin verilen en büyük via pad çapı ${fmtLen(r.results.maxViaPad)}.`,
            en: `There is ${fmtLen(r.results.landViaClearance)} between the land and the via pad edge; the largest via pad diameter allowed is ${fmtLen(r.results.maxViaPad)}.`,
          }),
        })
      }

      if (r.results.viaAspect !== null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Via aspect ratio ${fmt(r.results.viaAspect, 3)}.`,
            en: `The via aspect ratio is ${fmt(r.results.viaAspect, 3)}.`,
          }),
        })
      }

      for (const w of r.warnings) {
        out.push({ level: 'warn', text: warningText[w.code] ?? '' })
      }
      return out.filter((n) => n.text !== '')
    },

    pct,
  }
}
