// Bakır kalınlığı dönüştürücü ekranının kullanıcıya görünen metinleri —
// iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni, kayıt bildirimi) fonksiyon olarak
// döner ki mantık tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtEng, fmtOhm, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import { REASON_ETCH, REASON_FINISHED, OZ_ROWS, OZ_OPTIONS, OZ_CUSTOM } from './model'
import { METHOD_NOMINAL, METHOD_DERIVED, COPPER_ERR_TOLERANCE } from '../../../lib/copper'
import {
  NAME_MAX, RECORD_MAX,
  THICKNESS_ERR_SCHEMA, THICKNESS_ERR_VERSION, THICKNESS_ERR_NAME,
  THICKNESS_ERR_SOURCE, THICKNESS_ERR_LAYER, THICKNESS_ERR_UNIT,
  THICKNESS_ERR_FIELD, THICKNESS_ERR_CONSISTENCY, THICKNESS_ERR_STORAGE,
  THICKNESS_ERR_LIMIT,
  THICKNESS_VARIANT_EMPTY, THICKNESS_VARIANT_TOO_LONG, THICKNESS_VARIANT_NOT_OBJECT,
  THICKNESS_VARIANT_NON_NEGATIVE, THICKNESS_VARIANT_INTERNAL_PLATING, THICKNESS_VARIANT_SUM,
} from '../../../lib/thicknessRecords'
import { STORAGE_ERR_UNAVAILABLE, STORAGE_ERR_WRITE } from '../../../lib/storage'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Yüzde işaretinin yeri dile göre değişir: Türkçede önde, İngilizcede arkada.
  // Sayının kendisi num.js ile biçimlenir, burada yalnızca işaret yerleşir.
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)
  // Tolerans bandı: ± işareti sayıya bitişik kalır, yüzde işaretini pct() koyar
  // (tr: ±%5, en: ±5%). İşaret buraya elle yazılmaz.
  const tolPct = (v) => `±${pct(v)}`

  const firstRow = OZ_ROWS[0]
  const lastRow = OZ_ROWS[OZ_ROWS.length - 1]

  const methodLabel = {
    [METHOD_NOMINAL]: t({ tr: 'Endüstri nominal tablosu', en: 'Industry nominal table' }),
    [METHOD_DERIVED]: t({ tr: 'Bakır yoğunluğundan türetilen', en: 'Derived from copper density' }),
  }

  // Cümle içinde küçük harfle geçen biçim. `toLocaleLowerCase` dile bağlı
  // olduğu için ayrı yazılır — "I" harfi Türkçede ayrı küçülür.
  const methodDerivedInline = t({
    tr: 'bakır yoğunluğundan türetilen',
    en: 'derived from copper density',
  })

  const ozCustomLabel = t({ tr: 'Özel değer…', en: 'Custom value…' })

  // Tolerans taramasının reddettiği girdiler. Ana sonuç bundan etkilenmez;
  // yalnızca tolerans bölümü hesaplanamaz.
  const toleranceReason = (code) => {
    if (code === COPPER_ERR_TOLERANCE) {
      return t({
        tr: 'Her tolerans %0 ile %100 arasında olmalı (100 hariç) ve aşındırma oranının üst ucu '
          + '%100’e ulaşmamalı. %100 tolerans kalınlığı sıfırlar, kare direncini tanımsız yapar.',
        en: 'Every tolerance must be between 0% and 100% (100 excluded) and the upper end of the '
          + 'etch factor must not reach 100%. A 100% tolerance zeroes the thickness and makes the '
          + 'sheet resistance undefined.',
      })
    }
    return t({
      tr: 'Tolerans taraması için geçerli bir geometri gerekli.',
      en: 'The tolerance sweep needs a valid geometry.',
    })
  }

  // Boş/eksik ayrıntı alanı "undefined" olarak yazılmaz; yerine em dash konur.
  const shown = (v) => (v === undefined || v === null || v === '' ? '—' : String(v))

  // Kayıt deposunun hata yükünü okunur metne çevirir. Yük dilsizdir: kod +
  // sayı + alan anahtarı taşır; cümlenin tamamı burada, iki dilde kurulur.
  // Tarayıcının kendi istisna metni bu yola hiç girmez — depo yalnızca
  // `cause` alanında kendi kodunu iletir.
  const savedErrorText = (res) => {
    const d = res ?? {}
    switch (d.error) {
      case THICKNESS_ERR_NAME:
        if (d.variant === THICKNESS_VARIANT_EMPTY) {
          return t({
            tr: 'Kayıt adı boş olamaz.',
            en: 'The record name cannot be empty.',
          })
        }
        if (d.variant === THICKNESS_VARIANT_TOO_LONG) {
          return t({
            tr: `Kayıt adı en fazla ${d.max ?? NAME_MAX} karakter olabilir; girilen ad `
              + `${shown(d.length)} karakter.`,
            en: `The record name can be at most ${d.max ?? NAME_MAX} characters long; the name `
              + `entered is ${shown(d.length)} characters.`,
          })
        }
        return t({
          tr: `Kayıt adı boş olamaz ve en fazla ${d.max ?? NAME_MAX} karakter olabilir.`,
          en: `The record name cannot be empty and can be at most ${d.max ?? NAME_MAX} `
            + 'characters long.',
        })
      case THICKNESS_ERR_LIMIT:
        return t({
          tr: `En fazla ${d.limit ?? RECORD_MAX} kayıt saklanabilir. Yeni kayıt için önce `
            + 'listeden bir kaydı silin.',
          en: `At most ${d.limit ?? RECORD_MAX} records can be stored. Delete a record from the `
            + 'list before saving a new one.',
        })
      case THICKNESS_ERR_STORAGE:
        if (d.cause === STORAGE_ERR_UNAVAILABLE) {
          return t({
            tr: 'Tarayıcı depolamasına erişilemiyor (gizli sekme ya da kapalı site verisi), '
              + 'kayıt yazılamadı. Hesap ve sonuçlar normal çalışmaya devam eder.',
            en: 'Browser storage is not reachable (a private tab or disabled site data), so the '
              + 'record could not be written. The calculation and all results keep working '
              + 'normally.',
          })
        }
        if (d.cause === STORAGE_ERR_WRITE) {
          return t({
            tr: 'Tarayıcı depolaması yazmayı reddetti — en olası neden depolama kotasının '
              + 'dolmuş olması. Birkaç kaydı silip yeniden deneyin.',
            en: 'Browser storage rejected the write — the most likely reason is that the storage '
              + 'quota is full. Delete a few records and try again.',
          })
        }
        return t({
          tr: 'Kayıt tarayıcı depolamasına yazılamadı.',
          en: 'The record could not be written to browser storage.',
        })
      case THICKNESS_ERR_VERSION:
        return t({
          tr: `Kayıt farklı bir şema sürümüyle yazılmış (beklenen ${shown(d.expected)}, `
            + `kayıtta ${shown(d.found)}); bu sürümle okunamaz ve yüklenmedi.`,
          en: `The record was written with a different schema version (expected `
            + `${shown(d.expected)}, found ${shown(d.found)}); it cannot be read by this version `
            + 'and was not loaded.',
        })
      case THICKNESS_ERR_SCHEMA:
        if (d.variant === THICKNESS_VARIANT_NOT_OBJECT) {
          return t({
            tr: 'Kayıt verisi tanınmadı: beklenen biçim bir kayıt nesnesi.',
            en: 'The record data was not recognised: a record object is expected.',
          })
        }
        return t({
          tr: `Kayıt bu ekranın şemasına ait değil (beklenen "${shown(d.expected)}", `
            + `kayıtta "${shown(d.found)}"), yazılmadı.`,
          en: `The record does not belong to this screen's schema (expected `
            + `"${shown(d.expected)}", found "${shown(d.found)}") and was not written.`,
        })
      case THICKNESS_ERR_SOURCE:
        return t({
          tr: `Kayıttaki kaynak alanı tanınmadı ("${shown(d.found)}"). Geçerli değerler: `
            + `${(d.valid ?? []).join(', ')}.`,
          en: `The source field of the record was not recognised ("${shown(d.found)}"). Valid `
            + `values: ${(d.valid ?? []).join(', ')}.`,
        })
      case THICKNESS_ERR_LAYER:
        return t({
          tr: `Kayıttaki katman alanı tanınmadı ("${shown(d.found)}"). Geçerli değerler: `
            + `${(d.valid ?? []).join(', ')}.`,
          en: `The layer field of the record was not recognised ("${shown(d.found)}"). Valid `
            + `values: ${(d.valid ?? []).join(', ')}.`,
        })
      case THICKNESS_ERR_UNIT:
        return t({
          tr: `"${shown(d.source)}" kaydında birim "${shown(d.expected)}" olmalı, kayıtta `
            + `"${shown(d.found)}" var.`,
          en: `A "${shown(d.source)}" record must carry the unit "${shown(d.expected)}", but it `
            + `carries "${shown(d.found)}".`,
        })
      case THICKNESS_ERR_FIELD:
        if (d.variant === THICKNESS_VARIANT_NON_NEGATIVE) {
          return t({
            tr: `Kaydın "${shown(d.field)}" alanı negatif olmayan bir sayı olmalı.`,
            en: `The "${shown(d.field)}" field of the record must be a non-negative number.`,
          })
        }
        return t({
          tr: `Kaydın "${shown(d.field)}" alanı pozitif bir sayı olmalı.`,
          en: `The "${shown(d.field)}" field of the record must be a positive number.`,
        })
      case THICKNESS_ERR_CONSISTENCY:
        if (d.variant === THICKNESS_VARIANT_INTERNAL_PLATING) {
          return t({
            tr: 'İç katman kaydında kaplama 0 olmalı — iç katmanda kaplama bitmiş kalınlığa '
              + 'girmez.',
            en: 'Plating must be 0 in an internal-layer record — on an internal layer the plating '
              + 'does not add to the finished thickness.',
          })
        }
        if (d.variant === THICKNESS_VARIANT_SUM) {
          return t({
            tr: `Kayıt tutarsız: bitmiş kalınlık ${fmt(d.finished, 4)} µm, başlangıç + kaplama `
              + `toplamı ${fmt(d.expected, 4)} µm. Kayıt yazılmadı.`,
            en: `The record is inconsistent: the finished thickness is ${fmt(d.finished, 4)} µm, `
              + `while starting + plating is ${fmt(d.expected, 4)} µm. The record was not written.`,
          })
        }
        return t({
          tr: 'Kayıt kendi içinde tutarsız, yazılmadı. Sonucu yeniden hesaplayıp tekrar deneyin.',
          en: 'The record is not internally consistent and was not written. Recompute the result '
            + 'and try again.',
        })
      default:
        // Bilinmeyen kod da okunur kalır: kodun kendisi parantez içinde görünür,
        // "undefined" yazmaz.
        return t({
          tr: `Kayıt işlemi tamamlanamadı (kod: ${shown(d.error)}).`,
          en: `The record operation could not be completed (code: ${shown(d.error)}).`,
        })
    }
  }

  return {
    backlink: t({
      tr: '← PCB Akım, Güç ve Bakır',
      en: '← PCB Current, Power and Copper',
    }),
    title: t({
      tr: 'Bakır Kalınlığı Dönüştürücü',
      en: 'Copper Thickness Converter',
    }),
    intro: t({
      tr: 'Bakır ağırlığı ile kalınlık arasında çevirir; nominal tablo ile yoğunluktan türetilen '
        + 'değeri karşılaştırır, kaplamayla bitmiş kalınlığı ve trapez kesit etkisini gösterir. '
        + 'Ölçülen bitmiş kalınlık doğrudan girilebilir — o yolda kaplama geriye çözülür — ve '
        + 'nominal ile bitmiş kalınlıklar adlandırılıp bu tarayıcıda saklanabilir.',
      en: 'Converts between copper weight and thickness; compares the nominal table with the value '
        + 'derived from density, and shows the finished thickness with plating and the effect of '
        + 'the trapezoidal cross-section. A measured finished thickness can be entered directly — '
        + 'on that path the plating is solved backwards — and nominal and finished thicknesses can '
        + 'be named and stored in this browser.',
    }),

    // Kaynak seçicisinin kısa etiketleri — üç düğme aynı şeride sığmalı.
    sourceLabel: {
      weight: t({ tr: 'Bakır ağırlığından', en: 'From copper weight' }),
      thickness: t({ tr: 'Kalınlıktan', en: 'From thickness' }),
      finished: t({ tr: 'Bitmiş (ölçülen)', en: 'Finished (measured)' }),
    },

    // Tablo ve listelerde kullanılan uzun ad.
    sourceLong: {
      weight: t({ tr: 'Bakır ağırlığı', en: 'Copper weight' }),
      thickness: t({ tr: 'Başlangıç (folyo) kalınlığı', en: 'Starting (foil) thickness' }),
      finished: t({ tr: 'Bitmiş kalınlık (ölçülen)', en: 'Finished thickness (measured)' }),
    },

    layerLabel: {
      external: t({ tr: 'Dış katman', en: 'Outer layer' }),
      internal: t({ tr: 'İç katman', en: 'Inner layer' }),
    },

    // Nominal tablo basamakları hazır seçenek olarak; son satır serbest giriş
    // yolu (spec §4.1.2: "Kullanıcı mutlaka özel kalınlık girebilmelidir").
    ozPickOptions: [
      ...OZ_ROWS.map((row) => ({
        value: String(row.oz),
        label: `${fmt(row.oz, 3)} oz/ft² — ${fmt(row.um, 4)} µm`,
      })),
      { value: OZ_CUSTOM, label: ozCustomLabel },
    ],

    methodLabel,

    methodOptions: [
      // "(varsayılan)" eki seçicinin dar kutusuna sığmıyor, alan ipucunda yazıyor.
      { value: METHOD_NOMINAL, label: methodLabel[METHOD_NOMINAL] },
      { value: METHOD_DERIVED, label: methodLabel[METHOD_DERIVED] },
    ],

    fields: {
      ozPick: {
        label: t({ tr: 'Bakır ağırlığı', en: 'Copper weight' }),
        hint: t({
          tr: `Nominal tablo basamakları: ${OZ_OPTIONS.join(', ')} oz/ft². Ara bir değer için `
            + `“${ozCustomLabel}” seçin.`,
          en: `Nominal table steps: ${OZ_OPTIONS.join(', ')} oz/ft². Choose “${ozCustomLabel}” for `
            + 'an intermediate value.',
        }),
      },
      oz: {
        label: t({ tr: 'Özel bakır ağırlığı', en: 'Custom copper weight' }),
        hint: t({
          tr: 'Tablo dışı ağırlıklar doğrusal nominal kuralla çevrilir: t[µm] = 35 × oz.',
          en: 'Weights outside the table are converted with the linear nominal rule: '
            + 't[µm] = 35 × oz.',
        }),
      },
      method: {
        label: t({ tr: 'Dönüşüm yöntemi', en: 'Conversion method' }),
        hint: t({
          tr: 'Varsayılan nominal tablodur; seçim sonuç panelinde ve teknik detayda yazar.',
          en: 'The default is the nominal table; the choice is stated in the result panel and in '
            + 'the technical detail.',
        }),
      },
      finished: {
        label: t({ tr: 'Ölçülen bitmiş kalınlık', en: 'Measured finished thickness' }),
        hint: t({
          tr: 'Kupon ya da kesit ölçümünden gelen bitmiş bakır kalınlığı; türetilmez, olduğu gibi '
            + 'kullanılır.',
          en: 'The finished copper thickness from a coupon or cross-section measurement; it is not '
            + 'derived, it is used as entered.',
        }),
      },
      thickness: {
        label: t({ tr: 'Başlangıç (folyo) kalınlığı', en: 'Starting (foil) thickness' }),
        hintFinished: t({
          tr: 'Sipariş edilen folyo kalınlığı. Kaplama bundan geriye çözülür: '
            + 'kaplama = bitmiş − folyo.',
          en: 'The foil thickness ordered. The plating is solved backwards from it: '
            + 'plating = finished − foil.',
        }),
        hintDirect: t({
          tr: 'Ağırlık çevrimi yapılmaz; yöntem seçimi yalnızca ağırlıktan çevirirken geçerlidir.',
          en: 'No weight conversion is performed; the method choice applies only when converting '
            + 'from a weight.',
        }),
      },
      layer: {
        label: t({ tr: 'Katman', en: 'Layer' }),
        external: t({ tr: 'Dış katman (kaplama eklenir)', en: 'Outer layer (plating is added)' }),
        internal: t({ tr: 'İç katman (kaplama yok)', en: 'Inner layer (no plating)' }),
      },
      plating: {
        label: t({ tr: 'Kaplama kalınlığı', en: 'Plating thickness' }),
        hint: t({
          tr: 'Tipik delik kaplaması 20–30 µm; iç katmanda yok sayılır',
          en: 'Typical hole plating is 20–30 µm; it is ignored on an inner layer',
        }),
      },
      W: {
        label: t({ tr: 'Yol genişliği', en: 'Trace width' }),
        hint: t({
          tr: 'Kesit alanı ve trapez etkisi bu genişlikte hesaplanır',
          en: 'The cross-sectional area and the trapezoidal effect are computed at this width',
        }),
      },
      etch: {
        label: t({ tr: 'Aşındırma oranı', en: 'Etch factor' }),
        hint: t({
          tr: 'W_üst = W_alt · (1 − E). Sıfır girilirse kesit dikdörtgen sayılır',
          en: 'W_top = W_bottom · (1 − E). If zero is entered the cross-section is taken as '
            + 'rectangular',
        }),
      },
      T: {
        label: t({ tr: 'Sıcaklık', en: 'Temperature' }),
        hint: t({
          tr: 'Kare direnci bu sıcaklığa göre düzeltilir',
          en: 'The sheet resistance is corrected for this temperature',
        }),
      },
      toleranceHeading: t({
        tr: 'Üretim toleransı (isteğe bağlı)',
        en: 'Manufacturing tolerance (optional)',
      }),
      tolPlaceholder: t({ tr: 'boş = tolerans yok', en: 'empty = no tolerance' }),
      tolStart: {
        label: t({ tr: 'Folyo kalınlığı toleransı', en: 'Foil thickness tolerance' }),
        hint: t({
          tr: 'Girilen ya da ağırlıktan çevrilen başlangıç kalınlığına uygulanır',
          en: 'Applied to the starting thickness, whether entered directly or converted from a '
            + 'weight',
        }),
      },
      tolPlate: {
        label: t({ tr: 'Kaplama kalınlığı toleransı', en: 'Plating thickness tolerance' }),
        hint: t({
          tr: 'İç katmanda kaplama olmadığı için sonucu etkilemez',
          en: 'It does not affect the result on an inner layer, where there is no plating',
        }),
      },
      tolEtch: {
        label: t({ tr: 'Aşındırma oranı toleransı', en: 'Etch factor tolerance' }),
        hint: t({
          tr: 'Aşındırma oranının kendi değerine göre bağıl sapması; yalnızca kesit alanını oynatır',
          en: 'The relative deviation of the etch factor about its own value; it moves only the '
            + 'cross-sectional area',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      oz: t({ tr: 'Bakır ağırlığı', en: 'Copper weight' }),
      thickness: t({ tr: 'Başlangıç (folyo) kalınlığı', en: 'Starting (foil) thickness' }),
      finished: t({ tr: 'Ölçülen bitmiş kalınlık', en: 'Measured finished thickness' }),
      plating: t({ tr: 'Kaplama kalınlığı', en: 'Plating thickness' }),
      W: t({ tr: 'Yol genişliği', en: 'Trace width' }),
      etch: t({ tr: 'Aşındırma oranı', en: 'Etch factor' }),
      T: t({ tr: 'Sıcaklık', en: 'Temperature' }),
      tolStart: t({ tr: 'Folyo kalınlığı toleransı', en: 'Foil thickness tolerance' }),
      tolPlate: t({ tr: 'Kaplama kalınlığı toleransı', en: 'Plating thickness tolerance' }),
      tolEtch: t({ tr: 'Aşındırma oranı toleransı', en: 'Etch factor tolerance' }),
    },

    // Yüzde işareti yalnızca burada yerleşir; ekran sayıyı fmt ile üretip
    // bu yardımcıdan geçirir, böylece iki dilde de aynı kural işler.
    pct,

    bigLabel: t({ tr: 'Bitmiş bakır kalınlığı', en: 'Finished copper thickness' }),

    thicknessTable: {
      head: t({ tr: 'Kalınlık', en: 'Thickness' }),
      headCols: t({ tr: 'başlangıç · bitmiş', en: 'starting · finished' }),
      ozNominal: t({ tr: 'oz/ft² (nominal)', en: 'oz/ft² (nominal)' }),
    },

    nominalTable: {
      caption: t({ tr: 'Nominal ve türetilmiş', en: 'Nominal and derived' }),
      methodUsed: t({ tr: 'Kullanılan yöntem', en: 'Method used' }),
      difference: t({ tr: 'Fark', en: 'Difference' }),
      starting: t({ tr: 'Başlangıç kalınlığı', en: 'Starting thickness' }),
    },

    platingTable: {
      caption: t({ tr: 'Geriye çözülen kaplama', en: 'Back-solved plating' }),
      plating: t({ tr: 'Kaplama', en: 'Plating' }),
      subExternal: t({ tr: '(bitmiş − folyo)', en: '(finished − foil)' }),
      subInternal: t({ tr: '(iç katmanda yok)', en: '(none on an inner layer)' }),
      finished: t({ tr: 'Ölçülen bitmiş kalınlık', en: 'Measured finished thickness' }),
      starting: t({ tr: 'Başlangıç (folyo) kalınlığı', en: 'Starting (foil) thickness' }),
      share: t({
        tr: 'Kaplamanın kesitteki payı',
        en: 'Plating share of the cross-section',
      }),
    },

    recommendedTable: {
      caption: t({
        tr: 'Üretim için önerilen bakır ağırlığı',
        en: 'Recommended copper weight for manufacturing',
      }),
      outOfRange: t({ tr: 'tablo aralığının dışı', en: 'outside the table range' }),
      exact: t({ tr: 'bitmiş kalınlığın kendisi', en: 'the finished thickness itself' }),
      nearest: t({ tr: 'en yakın sipariş basamağı', en: 'nearest orderable step' }),
      stepThickness: t({
        tr: 'Basamağın nominal kalınlığı',
        en: 'Nominal thickness of the step',
      }),
      finished: t({ tr: 'Bitmiş kalınlık', en: 'Finished thickness' }),
      difference: t({ tr: 'Fark', en: 'Difference' }),
    },

    ozTable: {
      caption: t({ tr: 'Nominal bakır ağırlığı tablosu', en: 'Nominal copper weight table' }),
      head: t({ tr: 'Bakır ağırlığı', en: 'Copper weight' }),
      headCols: t({ tr: 'nominal kalınlık', en: 'nominal thickness' }),
      recommended: t({ tr: ' (önerilen)', en: ' (recommended)' }),
    },

    sectionTable: {
      caption: t({ tr: 'Kesit ve direnç', en: 'Cross-section and resistance' }),
      rectArea: t({ tr: 'Dikdörtgen kesit alanı', en: 'Rectangular cross-sectional area' }),
      trapArea: t({ tr: 'Trapez kesit alanı', en: 'Trapezoidal cross-sectional area' }),
      widths: t({ tr: 'Üst / alt genişlik', en: 'Top / bottom width' }),
      sheet: (T) => t({ tr: `Kare direnci @ ${T} °C`, en: `Sheet resistance @ ${T} °C` }),
      sheetTrap: t({
        tr: 'Trapez kesitle etkin kare direnci',
        en: 'Effective sheet resistance with the trapezoidal section',
      }),
    },

    toleranceTable: {
      caption: t({
        tr: 'Üretim toleransı — minimum · nominal · maksimum',
        en: 'Manufacturing tolerance — minimum · nominal · maximum',
      }),
      bandLabel: t({ tr: 'tolerans bandı', en: 'tolerance band' }),
      head: t({ tr: 'Worst-case köşe taraması', en: 'Worst-case corner sweep' }),
      headCols: (n) => t({
        tr: `${n} köşe · min · nominal · maks`,
        en: `${n} corners · min · nominal · max`,
      }),
      finished: t({ tr: 'Bitmiş kalınlık (µm)', en: 'Finished thickness (µm)' }),
      area: t({ tr: 'Kesit alanı (mm²)', en: 'Cross-sectional area (mm²)' }),
      sheet: t({ tr: 'Kare direnci', en: 'Sheet resistance' }),
      applied: t({ tr: 'Uygulanan tolerans', en: 'Applied tolerance' }),
      appliedValue: (start, plate, etch) => t({
        tr: `folyo ${tolPct(start)} · kaplama ${tolPct(plate)} · aşındırma ${tolPct(etch)}`,
        en: `foil ${tolPct(start)} · plating ${tolPct(plate)} · etch ${tolPct(etch)}`,
      }),
    },

    // --- Kalınlık kayıtları (spec §4.3) ---
    saved: {
      caption: t({ tr: 'Kayıtlı kalınlıklar', en: 'Saved thicknesses' }),
      nameLabel: t({ tr: 'Kayıt adı', en: 'Record name' }),
      namePlaceholder: t({ tr: 'ör. 1 oz dış katman', en: 'e.g. 1 oz outer layer' }),
      nameHint: t({
        tr: `Aynı ad yeniden kaydedilirse kayıt güncellenir; en fazla ${RECORD_MAX} kayıt, ad en `
          + `fazla ${NAME_MAX} karakter. Kayıtlar yalnızca bu tarayıcıda saklanır, sunucuya `
          + 'gönderilmez.',
        en: `Saving the same name again updates the record; at most ${RECORD_MAX} records, and a `
          + `name of at most ${NAME_MAX} characters. Records are stored only in this browser and `
          + 'are never sent to a server.',
      }),
      saveLabel: t({ tr: 'Bu kalınlığı kaydet', en: 'Save this thickness' }),
      restoreLabel: t({ tr: 'Geri yükle', en: 'Restore' }),
      removeLabel: t({ tr: 'Sil', en: 'Delete' }),
      headName: t({ tr: 'Ad', en: 'Name' }),
      headSummary: t({ tr: 'başlangıç · bitmiş', en: 'starting · finished' }),
      empty: t({
        tr: 'Henüz kayıt yok. Hesabı istediğiniz gibi kurun, bir ad verip kaydedin; kayıt bu '
          + 'tarayıcıda kalır ve sayfa yenilenince listede durur.',
        en: 'No records yet. Set the calculation up as you like, give it a name and save it; the '
          + 'record stays in this browser and remains in the list after a page reload.',
      }),
      tableNote: t({
        tr: 'Kalınlıklar µm. Bir satıra tıklayınca (ya da Enter/Boşluk ile) kayıt forma geri '
          + 'yüklenir.',
        en: 'Thicknesses are in µm. Clicking a row (or pressing Enter/Space) restores the record '
          + 'into the form.',
      }),
      unavailable: t({
        tr: 'Tarayıcı depolaması kullanılamıyor (gizli sekme ya da kapalı site verisi olabilir). '
          + 'Kayıt saklanamaz; hesap ve tüm sonuçlar normal çalışmaya devam eder.',
        en: 'Browser storage is unavailable (this may be a private tab or site data may be '
          + 'disabled). Records cannot be stored; the calculation and all results keep working '
          + 'normally.',
      }),
      needResult: t({
        tr: 'Kaydetmek için önce geçerli bir sonuç gerekir.',
        en: 'A valid result is needed before saving.',
      }),
      needName: t({
        tr: 'Kaydetmek için bir ad girin.',
        en: 'Enter a name in order to save.',
      }),
      // Kayıt listesi tablosunun başlıkları
      colName: t({ tr: 'Ad', en: 'Name' }),
      colSource: t({ tr: 'kaynak', en: 'source' }),
      colLayer: t({ tr: 'katman', en: 'layer' }),
      colStarting: t({ tr: 'başlangıç', en: 'starting' }),
      colPlating: t({ tr: 'kaplama', en: 'plating' }),
      colFinished: t({ tr: 'bitmiş', en: 'finished' }),
    },

    // Son eylemin ekranda gösterilecek tek satırlık sonucu.
    // Döner: { level: 'ok' | 'warn', text } | null
    //
    // `savedErrorText` dışarı verilmez: hata yükünü cümleye çeviren tek yol
    // burasıdır, ekran kodu doğrudan çağırmaz.
    savedNotice: (action, res) => {
      if (!res) return null
      // Yükün tamamı geçilir: ayrıntı alanları (variant, expected, found,
      // limit, cause…) cümlenin değişen parçalarını kurar.
      if (res.error) return { level: 'warn', text: savedErrorText(res) }
      if (action === 'save') {
        return {
          level: 'ok',
          text: t({
            tr: `"${res.record.name}" kaydedildi: başlangıç ${fmt(res.record.starting, 4)} µm, `
              + `bitmiş ${fmt(res.record.finished, 4)} µm.`,
            en: `"${res.record.name}" saved: starting ${fmt(res.record.starting, 4)} µm, finished `
              + `${fmt(res.record.finished, 4)} µm.`,
          }),
        }
      }
      if (action === 'remove') {
        return { level: 'ok', text: t({ tr: 'Kayıt silindi.', en: 'The record was deleted.' }) }
      }
      if (action === 'restore') {
        return {
          level: 'ok',
          text: t({
            tr: 'Kayıt forma geri yüklendi.',
            en: 'The record was restored into the form.',
          }),
        }
      }
      return null
    },

    formula: t({
      tr: `Yoğunluktan kalınlık:
  m_A = 0.0283495 kg /
          0.092903 m²
      ≈ 0.30515 kg/m²
  t = m_A / ρ_m
    = 0.30515 / 8960
    ≈ 34.06 µm

Nominal tablo:
  t[µm] ≈ 35 × oz

Birim dönüşümleri:
  t[mm]  = t[µm] / 1000
  t[mil] = t[mm] / 0.0254
  t[µm]  = 25.4 × t[mil]

Kesit:
  Dikdörtgen:
    A = W·t
  Trapez:
    A = t·(W_üst + W_alt)/2
    W_üst = W_alt·(1 − E)

Kare direnci:
  R_□ = ρ(T) / t`,
      en: `Thickness from density:
  m_A = 0.0283495 kg /
          0.092903 m²
      ≈ 0.30515 kg/m²
  t = m_A / ρ_m
    = 0.30515 / 8960
    ≈ 34.06 µm

Nominal table:
  t[µm] ≈ 35 × oz

Unit conversions:
  t[mm]  = t[µm] / 1000
  t[mil] = t[mm] / 0.0254
  t[µm]  = 25.4 × t[mil]

Cross-section:
  Rectangular:
    A = W·t
  Trapezoidal:
    A = t·(W_top + W_bottom)/2
    W_top = W_bottom·(1 − E)

Sheet resistance:
  R_□ = ρ(T) / t`,
    }),

    detail: {
      // "Kullanılan yöntem" satırı üç yoldan birini anlatır; mantık tek kopya.
      method: (r) => {
        if (r.method) {
          return t({
            tr: `Kullanılan yöntem: ${methodLabel[r.method]} — başlangıç kalınlığı `
              + `${fmtEng(r.starting, 'm', 5)} buradan geldi.`,
            en: `Method used: ${methodLabel[r.method]} — the starting thickness `
              + `${fmtEng(r.starting, 'm', 5)} came from it.`,
          })
        }
        if (r.platingSolved) {
          return t({
            tr: `Kullanılan yöntem: bitmiş kalınlık ölçümden girildi `
              + `(${fmtEng(r.finished, 'm', 5)}), ağırlık çevrimi yapılmadı; kaplama `
              + `${fmtEng(r.plating, 'm', 4)} olarak geriye çözüldü.`,
            en: `Method used: the finished thickness was entered from a measurement `
              + `(${fmtEng(r.finished, 'm', 5)}) and no weight conversion was performed; the `
              + `plating was solved backwards as ${fmtEng(r.plating, 'm', 4)}.`,
          })
        }
        return t({
          tr: 'Kullanılan yöntem: kalınlık doğrudan girildi, ağırlık çevrimi yapılmadı.',
          en: 'Method used: the thickness was entered directly and no weight conversion was '
            + 'performed.',
        })
      },
      thicknessUsed: (r) => {
        const parts = r.plating > 0
          ? t({
            tr: ` (folyo ${fmtEng(r.starting, 'm', 4)} + kaplama ${fmtEng(r.plating, 'm', 4)})`,
            en: ` (foil ${fmtEng(r.starting, 'm', 4)} + plating ${fmtEng(r.plating, 'm', 4)})`,
          })
          : ''
        return t({
          tr: `Kullanılan kalınlık: bitmiş ${fmtEng(r.finished, 'm', 5)}${parts}.`,
          en: `Thickness used: finished ${fmtEng(r.finished, 'm', 5)}${parts}.`,
        })
      },
      recommended: (rec) => t({
        tr: `Üretim için önerilen sipariş basamağı ${fmt(rec.oz, 3)} oz/ft² `
          + `(${fmt(rec.um, 4)} µm); bitmiş kalınlığa göre fark ${pct(fmtPct(rec.deltaPct))}.`,
        en: `The recommended order step for manufacturing is ${fmt(rec.oz, 3)} oz/ft² `
          + `(${fmt(rec.um, 4)} µm); relative to the finished thickness the difference is `
          + `${pct(fmtPct(rec.deltaPct))}.`,
      }),
      copperOnly: t({
        tr: 'Elektriksel kesit yalnızca bakır geometrisidir; PCB kalınlığı buna eklenmez.',
        en: 'The electrical cross-section is the copper geometry alone; the board thickness is not '
          + 'added to it.',
      }),
      etch: (r) => t({
        tr: `Aşındırma oranı ${pct(fmt(r.etch, 3))}; kesit kaybı ${pct(fmt(r.trap.lossPct, 3))}.`,
        en: `The etch factor is ${pct(fmt(r.etch, 3))}; the cross-section loss is `
          + `${pct(fmt(r.trap.lossPct, 3))}.`,
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    /**
     * Toleransın hangi büyüklüğü ne kadar oynattığını anlatan tek cümle
     * (spec §1 "üretim toleransı etkisi"). Sağ panelde gösterilir.
     */
    toleranceNote: (r) => {
      const tol = r.ok ? r.tolerance : null
      if (!tol || tol.error || !tol.active) return null

      const widest = [
        { at: t({ tr: 'bitmiş kalınlıkta', en: 'in the finished thickness' }), span: tol.finished },
        { at: t({ tr: 'kesit alanında', en: 'in the cross-sectional area' }), span: tol.area },
        { at: t({ tr: 'kare direncinde', en: 'in the sheet resistance' }), span: tol.Rsheet },
      ].reduce((a, b) => (b.span.spreadPct > a.span.spreadPct ? b : a))

      // Aşındırma toleransı kalınlığa hiç dokunmaz; yalnız girildiğinde bunu
      // açıkça söylemek gerekir, yoksa "kalınlık neden oynamadı" sorusu kalır.
      const etchOnly = tol.tol.starting === 0 && tol.tol.plating === 0 && tol.tol.etch > 0
      const because = etchOnly
        ? t({
          tr: ', çünkü aşındırma toleransı yalnızca kesiti daraltır, kalınlığa ve kare direncine '
            + 'dokunmaz',
          en: ', because the etch tolerance only narrows the cross-section and does not touch the '
            + 'thickness or the sheet resistance',
        })
        : ''

      return t({
        tr: `Girilen toleranslar bitmiş kalınlığı ${pct(fmtPct(tol.finished.minPct))} / `
          + `${pct(fmtPct(tol.finished.maxPct))}, kesit alanını ${pct(fmtPct(tol.area.minPct))} / `
          + `${pct(fmtPct(tol.area.maxPct))}, kare direncini ${pct(fmtPct(tol.Rsheet.minPct))} / `
          + `${pct(fmtPct(tol.Rsheet.maxPct))} oynatıyor; en geniş bant `
          + `${pct(fmt(widest.span.spreadPct, 3))} ile ${widest.at}${because}.`,
        en: `The tolerances entered move the finished thickness by ${pct(fmtPct(tol.finished.minPct))} / `
          + `${pct(fmtPct(tol.finished.maxPct))}, the cross-sectional area by ${pct(fmtPct(tol.area.minPct))} `
          + `/ ${pct(fmtPct(tol.area.maxPct))} and the sheet resistance by `
          + `${pct(fmtPct(tol.Rsheet.minPct))} / ${pct(fmtPct(tol.Rsheet.maxPct))}; the widest band is `
          + `${pct(fmt(widest.span.spreadPct, 3))} and it appears ${widest.at}${because}.`,
      })
    },

    // --- Kaynak ve tanım bilgisi ---
    //
    // Sağ panelde ayrı başlık altında listelenir; tanımın kendisini söyler,
    // dahili doküman göndermesi içermez.
    sourceNotes: [
      t({
        tr: 'Uzunluk: uluslararası inç tanımı 1 inch = 25.4 mm (tam). Buradan 1 mil = 0.001 inch = '
          + '25.4 µm. Tüm mil/inch dönüşümleri yalnızca bu tanımdan gelir.',
        en: 'Length: the international definition of the inch is 1 inch = 25.4 mm (exact). From it, '
          + '1 mil = 0.001 inch = 25.4 µm. Every mil/inch conversion comes from this definition '
          + 'alone.',
      }),
      t({
        tr: 'Kütle ve alan: uluslararası avoirdupois ons 1 oz = 0.0283495231 kg; uluslararası foot '
          + 'ile 1 ft² = 0.09290304 m². İkisinden 1 oz/ft² ≈ 0.30515 kg/m².',
        en: 'Mass and area: the international avoirdupois ounce is 1 oz = 0.0283495231 kg; with the '
          + 'international foot, 1 ft² = 0.09290304 m². The two together give '
          + '1 oz/ft² ≈ 0.30515 kg/m².',
      }),
      t({
        tr: 'Bakır yoğunluğu ρ_m = 8960 kg/m³ (oda sıcaklığı). Yoğunluktan türetilen kalınlık '
          + 'yalnızca bu sabitten çıkar; ölçüm ya da tablo değil, tanım gereği hesaptır.',
        en: 'The density of copper is ρ_m = 8960 kg/m³ (room temperature). The thickness derived '
          + 'from density follows from this constant alone; it is not a measurement or a table but '
          + 'a calculation by definition.',
      }),
      t({
        tr: '1 oz/ft² ≈ 35 µm eşitliği fizikten değil, endüstri nominal folyo tablosundan gelir. '
          + 'Lisanslı tablonun tamamı kullanılmaz; hesap yalnızca yaygın olarak yayımlanan altı '
          + 'nominal basamağa dayanır.',
        en: 'The equality 1 oz/ft² ≈ 35 µm comes not from physics but from the industry nominal '
          + 'foil table. The licensed table is not used in full; the calculation rests only on the '
          + 'six widely published nominal steps.',
      }),
      t({
        tr: 'Bakır özdirenci ρ₂₀ = 1.724×10⁻⁸ Ω·m ve sıcaklık katsayısı α = 0.00393 1/°C — '
          + 'kare direnci ve sıcaklık düzeltmesi bu iki sabite dayanır.',
        en: 'The resistivity of copper is ρ₂₀ = 1.724×10⁻⁸ Ω·m and the temperature coefficient '
          + 'α = 0.00393 1/°C — the sheet resistance and the temperature correction rest on these '
          + 'two constants.',
      }),
    ],

    // --- Geçerlilik aralığı ---
    //
    // Sağ panelde kendi başlığı altında listelenir; hesabın nerede geçerli
    // olduğunu ve girdi sınırlarını söyler.
    validityHeading: t({ tr: 'Geçerlilik aralığı', en: 'Range of validity' }),
    validityRange: [
      t({
        tr: `Nominal tablo ${fmt(firstRow.oz, 3)}–${fmt(lastRow.oz, 3)} oz/ft² arasını, yani `
          + `${fmt(firstRow.um, 4)}–${fmt(lastRow.um, 4)} µm aralığını kapsar. Bu aralığın dışı `
          + 'doğrusal kuralla (t[µm] = 35 × oz) uzatılır ve sipariş basamağı önerisi uç değere '
          + 'yapışır.',
        en: `The nominal table covers ${fmt(firstRow.oz, 3)}–${fmt(lastRow.oz, 3)} oz/ft², that is `
          + `the ${fmt(firstRow.um, 4)}–${fmt(lastRow.um, 4)} µm range. Outside that range the `
          + 'linear rule (t[µm] = 35 × oz) is extended and the recommended order step sticks to '
          + 'the end value.',
      }),
      t({
        tr: 'Nominal ile yoğunluktan türetilen değer 1 oz/ft²\'de 35 µm ile ≈34.06 µm\'dir; '
          + 'aradaki fark ≈ %2.8. Endüstri nominal tanımları 34.8–35 µm bandında verilir.',
        en: 'At 1 oz/ft² the nominal value is 35 µm and the value derived from density ≈34.06 µm; '
          + 'the difference between them is ≈ 2.8%. Industry nominal definitions are given in the '
          + '34.8–35 µm band.',
      }),
      t({
        tr: 'Aşındırma oranı 0 ≤ E < %100. E = %100 üst genişliği sıfırlar, bu yüzden '
          + 'reddedilir. Kaplama ≥ 0 µm; dış katmanda tipik delik kaplaması 20–30 µm.',
        en: 'The etch factor satisfies 0 ≤ E < 100%. E = 100% zeroes the top width and is '
          + 'therefore rejected. Plating ≥ 0 µm; on an outer layer typical hole plating is '
          + '20–30 µm.',
      }),
      t({
        tr: 'Bakır ağırlığı, kalınlık ve yol genişliği sıfırdan büyük olmalıdır; sıfır ve negatif '
          + 'girdi hesaplanmaz.',
        en: 'The copper weight, the thickness and the trace width must be greater than zero; zero '
          + 'and negative inputs are not computed.',
      }),
      t({
        tr: 'Ölçülen bitmiş kalınlık yolunda kaplama geriye çözülür: kaplama = bitmiş − folyo. Bu '
          + 'yüzden ölçüm folyo kalınlığından küçük olamaz — negatif kaplama hesaplanmaz. İç '
          + 'katmanda kaplama tanım gereği sıfırdır, ölçülen değer doğrudan folyo kalınlığı '
          + 'sayılır ve ayrı bir folyo girdisi istenmez.',
        en: 'On the measured finished thickness path the plating is solved backwards: '
          + 'plating = finished − foil. The measurement therefore cannot be smaller than the foil '
          + 'thickness — a negative plating is not computed. On an inner layer the plating is zero '
          + 'by definition, the measured value is taken directly as the foil thickness and no '
          + 'separate foil input is requested.',
      }),
      t({
        tr: 'Tolerans alanları isteğe bağlıdır ve boş bırakılabilir; boşken tolerans taraması hiç '
          + 'çalışmaz. Her tolerans %0 ile %100 arasında olmalıdır (100 hariç): %100 folyo '
          + 'toleransı kalınlığı sıfırlar ve kare direncini tanımsız yapar. Aşındırma toleransının '
          + 'üst ucu da aşındırma oranını %100\'e çıkaramaz.',
        en: 'The tolerance fields are optional and may be left empty; while they are empty the '
          + 'tolerance sweep does not run at all. Every tolerance must be between 0% and 100% '
          + '(100 excluded): a 100% foil tolerance zeroes the thickness and makes the sheet '
          + 'resistance undefined. The upper end of the etch tolerance likewise cannot raise the '
          + 'etch factor to 100%.',
      }),
      t({
        tr: 'Kare direnci 20 °C referanslı doğrusal modelle düzeltilir: '
          + 'ρ(T) = 1.724×10⁻⁸ · [1 + 0.00393·(T − 20)] Ω·m. Bu doğrusal modelin tanımlı bir '
          + 'sayısal sıcaklık üst sınırı yoktur; oda sıcaklığından uzaklaştıkça doğrusallık '
          + 'bozulur.',
        en: 'The sheet resistance is corrected with a linear model referred to 20 °C: '
          + 'ρ(T) = 1.724×10⁻⁸ · [1 + 0.00393·(T − 20)] Ω·m. This linear model has no defined '
          + 'numerical upper temperature limit; the further you move from room temperature, the '
          + 'more the linearity breaks down.',
      }),
    ],

    // --- Varsayımlar ---
    //
    // Sağ panelde kendi başlığı altında listelenir; modelin bilinçli
    // basitleştirmelerini ve neyin bağlayıcı olmadığını söyler.
    assumptionsHeading: t({ tr: 'Varsayımlar', en: 'Assumptions' }),
    assumptions: [
      t({
        tr: 'Nominal tablo ile yoğunluktan türetilen değer arasındaki fark bilinçlidir; ikisi de '
          + 'gösterilir, hesapta hangisinin kullanıldığı yöntem seçicisiyle belirlenir ve sonuç '
          + 'panelinde yazar. Varsayılan nominal tablodur.',
        en: 'The difference between the nominal table and the value derived from density is '
          + 'deliberate; both are shown, which one is used in the calculation is set by the method '
          + 'selector and is stated in the result panel. The default is the nominal table.',
      }),
      t({
        tr: 'Sipariş basamağı önerisi, bitmiş kalınlığa en yakın nominal ağırlıktır; eşit '
          + 'uzaklıkta kalın basamak seçilir. Öneri bir yuvarlamadır, üretici onayı değildir.',
        en: 'The recommended order step is the nominal weight closest to the finished thickness; on '
          + 'a tie the thicker step is chosen. The recommendation is a rounding, not a '
          + 'manufacturer approval.',
      }),
      t({
        tr: 'Grafik ve "oz/ft² (nominal)" satırı her zaman nominal kuralı (35 µm/oz) kullanır; '
          + 'yöntem seçimi yalnızca ağırlıktan kalınlığa çevrimi etkiler.',
        en: 'The chart and the "oz/ft² (nominal)" row always use the nominal rule (35 µm/oz); the '
          + 'method choice affects only the conversion from weight to thickness.',
      }),
      t({
        tr: 'Kaplama yalnızca dış katmanlara eklenir ve düzgün kalınlıkta varsayılır. Gerçekte '
          + 'kaplama dağılımı panel üzerinde değişir.',
        en: 'Plating is added to outer layers only and is assumed to be of uniform thickness. In '
          + 'reality the plating distribution varies across the panel.',
      }),
      t({
        tr: 'Aşındırma oranı tek bir sayıyla temsil edilir. Üreticinin gerçek üst-alt genişlik '
          + 'verisi varsa o tercih edilmelidir.',
        en: 'The etch factor is represented by a single number. If the manufacturer has real '
          + 'top-to-bottom width data, that should be preferred.',
      }),
      t({
        tr: 'Tolerans analizi basit worst-case yaklaşımıdır: toleranslı üç giriş — folyo '
          + 'kalınlığı, kaplama kalınlığı ve aşındırma oranı — yalnızca uç değerlerine konur ve '
          + '2³ = 8 köşenin hepsi hesaplanır. Sonuçların üçü de her girişte monoton olduğundan '
          + 'köşeler gerçek uçları verir. Toleranslar bağımsız ve eşit olasılıklı sayılmaz; '
          + 'istatistiksel bir dağılım varsayılmaz, bu yüzden üçlü bir olasılık aralığı değil, '
          + 'mutlak sınırdır. Bu hesabın varsayılan bir sayısal tolerans değeri yoktur — '
          + 'yüzdeler üreticinin kendi verisinden girilmelidir.',
        en: 'The tolerance analysis is a simple worst-case approach: the three toleranced inputs — '
          + 'foil thickness, plating thickness and etch factor — are placed at their extreme '
          + 'values only and all 2³ = 8 corners are computed. Because all three results are '
          + 'monotonic in every input, the corners do give the true extremes. The tolerances are '
          + 'not treated as independent and equally probable; no statistical distribution is '
          + 'assumed, so the triple is not a probability interval but an absolute bound. This '
          + 'calculation has no default numerical tolerance value — the percentages must be '
          + 'entered from the manufacturer\'s own data.',
      }),
      t({
        tr: 'Grafikteki tolerans bandı, çalışma noktasında bulunan bağıl kalınlık aralığının eğri '
          + 'boyunca sabit kaldığı varsayımıyla çizilir. Gerçekte kaplamanın bitmiş kalınlıktaki '
          + 'payı bakır ağırlığıyla değişir; bağlayıcı olan sayı orta paneldeki üçlüdür.',
        en: 'The tolerance band on the chart is drawn assuming that the relative thickness range '
          + 'found at the operating point stays constant along the curve. In reality the share of '
          + 'the plating in the finished thickness varies with the copper weight; the binding '
          + 'numbers are the triple in the middle panel.',
      }),
      t({
        tr: 'Kare direnci DC içindir; yüksek frekansta deri etkisi akımı yüzeye iter ve etkin '
          + 'kesiti küçültür.',
        en: 'The sheet resistance is for DC; at high frequency the skin effect pushes the current '
          + 'to the surface and reduces the effective cross-section.',
      }),
      t({
        tr: 'Ölçülen bitmiş kalınlık yolunda kaplama tek bir sayıya indirgenir: ölçüm ile folyo '
          + 'arasındaki bütün fark kaplamaya yazılır. Folyonun kendi toleransı, kaplamanın panel '
          + 'üzerindeki dağılımı ve ölçüm belirsizliği bu tek sayının içinde toplanır — çözülen '
          + 'kaplama bir ölçüm değil, iki sayının farkıdır.',
        en: 'On the measured finished thickness path the plating collapses into a single number: '
          + 'the whole difference between the measurement and the foil is charged to the plating. '
          + 'The foil\'s own tolerance, the distribution of the plating across the panel and the '
          + 'measurement uncertainty are all gathered into that one number — the solved plating is '
          + 'not a measurement but the difference of two numbers.',
      }),
      t({
        tr: 'Kalınlık kayıtları yalnızca bu tarayıcıda, site verisi içinde tutulur; sunucuya '
          + 'gönderilmez, cihazlar arasında taşınmaz ve tarayıcı verisi silinince kaybolur. '
          + 'Kayıt zarfı sürüm numarası taşır: format değişirse eski kayıt sessizce yanlış '
          + 'okunmaz, hiç yüklenmez. Kayıtlar kanonik olarak µm saklanır; geri yüklerken birim '
          + 'seçicileri µm\'ye ayarlanır, sayının kendisi değişmez.',
        en: 'Thickness records are kept only in this browser, inside the site data; they are not '
          + 'sent to a server, do not travel between devices and are lost when the browser data is '
          + 'cleared. The record envelope carries a version number: if the format changes, an old '
          + 'record is never silently misread, it is simply not loaded. Records are stored '
          + 'canonically in µm; on restore the unit selectors are set to µm and the number itself '
          + 'does not change.',
      }),
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    chart: {
      x: t({ tr: 'Bakır ağırlığı (oz/ft²)', en: 'Copper weight (oz/ft²)' }),
      y: t({ tr: 'Kare direnci (Ω/□)', en: 'Sheet resistance (Ω/□)' }),
      legend: t({ tr: 'kare direnci', en: 'sheet resistance' }),
      marker: t({ tr: 'seçilen', en: 'selected' }),
      caption: t({
        tr: 'Kare direnci kalınlıkla ters orantılıdır: bakırı iki katına çıkarmak direnci yarıya '
          + 'indirir. Eğri nominal kurala (1 oz = 35 µm) göre çizilir; çalışma noktası bitmiş '
          + 'kalınlığın (folyo + kaplama) eşdeğer bakır ağırlığına konur, bu yüzden dış katmanda '
          + 'imleç girilen folyo ağırlığının sağına düşer ama her zaman eğrinin üstündedir. Tarama '
          + 'aralığı çalışma noktasını kapsayacak biçimde genişletilir.',
        en: 'The sheet resistance is inversely proportional to the thickness: doubling the copper '
          + 'halves the resistance. The curve is drawn from the nominal rule (1 oz = 35 µm); the '
          + 'operating point is placed at the copper weight equivalent to the finished thickness '
          + '(foil + plating), so on an outer layer the marker falls to the right of the foil '
          + 'weight entered but always sits on the curve. The sweep range is widened so that it '
          + 'contains the operating point.',
      }),
      bandNote: t({
        tr: 'Taralı bant, çalışma noktasında bulunan worst-case kalınlık aralığının bağıl '
          + 'genişliğini eğri boyunca sabit kabul ederek çizilir; kalınlığın üst ucu direncin alt '
          + 'kenarını verir. Sayısal karşılığı orta paneldeki min · nominal · maks üçlüsüdür.',
        en: 'The shaded band is drawn by taking the relative width of the worst-case thickness '
          + 'range found at the operating point as constant along the curve; the upper end of the '
          + 'thickness gives the lower edge of the resistance. Its numerical counterpart is the '
          + 'min · nominal · max triple in the middle panel.',
      }),
    },

    schematic: {
      title: t({ tr: 'Bakır kesiti', en: 'Copper cross-section' }),
      captionPlated: t({
        tr: 'Bitmiş kesit — folyo üstüne kaplama eklenir',
        en: 'Finished cross-section — plating is added on top of the foil',
      }),
      captionPlain: t({
        tr: 'Bakır kesiti — aşındırma üst genişliği daraltır',
        en: 'Copper cross-section — etching narrows the top width',
      }),
      plating: t({ tr: 'kaplama', en: 'plating' }),
      wTop: t({ tr: 'W_üst', en: 'W_top' }),
      wBottom: t({ tr: 'W_alt', en: 'W_bottom' }),
      // Kalınlık ölçüsünün simgesi; birim/simge olduğu için çevrilmez.
      thickness: 't',
    },

    toleranceReason,

    reasonText: (reason) => {
      if (reason === REASON_ETCH) {
        return t({
          tr: 'Aşındırma oranı %0 ile %100 arasında olmalı. %100 üst genişliğin sıfıra inmesi '
            + 'demektir.',
          en: 'The etch factor must be between 0% and 100%. 100% means the top width falls to '
            + 'zero.',
        })
      }
      if (reason === REASON_FINISHED) {
        return t({
          tr: 'Ölçülen bitmiş kalınlık, başlangıç (folyo) kalınlığından küçük olamaz — kaplama '
            + 'negatif çıkar. Ya ölçümü ya da folyo kalınlığını düzeltin; kaplaması olmayan bir '
            + 'katman için "İç katman" seçin.',
          en: 'The measured finished thickness cannot be smaller than the starting (foil) '
            + 'thickness — the plating would come out negative. Correct either the measurement or '
            + 'the foil thickness; for a layer without plating choose "Inner layer".',
        })
      }
      return t({
        tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül '
          + 'kullanabilirsiniz (0.25 = 0,25).',
        en: 'Enter a positive numeric value in every required field. Use a point or a comma for '
          + 'decimals (0.25 = 0,25).',
      })
    },

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      if (r.nominal != null && r.derived != null) {
        const diffPct = (100 * (r.nominal - r.derived)) / r.derived
        out.push({
          level: 'ok',
          text: t({
            tr: `Nominal tablo ${fmtEng(r.nominal, 'm', 4)} veriyor; bakır yoğunluğundan türetilen `
              + `değer ${fmtEng(r.derived, 'm', 4)}. Aradaki ${pct(fmt(diffPct, 3))} fark folyo `
              + 'tanımı, yuvarlama ve üretim sürecinden gelir.',
            en: `The nominal table gives ${fmtEng(r.nominal, 'm', 4)}; the value derived from `
              + `copper density is ${fmtEng(r.derived, 'm', 4)}. The ${pct(fmt(diffPct, 3))} `
              + 'difference between them comes from the foil definition, rounding and the '
              + 'manufacturing process.',
          }),
        })
        out.push({
          level: 'warn',
          text: r.method === METHOD_DERIVED
            ? t({
              tr: `Başlangıç kalınlığı ${methodDerivedInline} yöntemiyle bulundu `
                + `(${fmtEng(r.starting, 'm', 4)}). Üretici sipariş kalınlıklarını nominal tabloya `
                + 'göre verir; bu yöntem fiziksel kütleyi doğru, sipariş karşılığını eksik '
                + 'anlatır.',
              en: `The starting thickness was found with the "${methodDerivedInline}" method `
                + `(${fmtEng(r.starting, 'm', 4)}). Manufacturers quote order thicknesses against `
                + 'the nominal table; this method describes the physical mass correctly but the '
                + 'ordering equivalent incompletely.',
            })
            : t({
              tr: 'Hesaplarda nominal tablo değeri kullanıldı. Kritik bir kesit hesabı '
                + 'yapıyorsanız üreticinin kendi kalınlık toleransını sorun.',
              en: 'The nominal table value was used in the calculations. If you are making a '
                + 'critical cross-section calculation, ask the manufacturer for their own '
                + 'thickness tolerance.',
            }),
        })
      }

      if (r.recommended) {
        const rec = r.recommended
        if (rec.outOfRange) {
          out.push({
            level: 'warn',
            text: t({
              tr: `Bitmiş kalınlık ${fmtEng(r.finished, 'm', 4)}, nominal tablonun `
                + `${fmt(firstRow.oz, 3)}–${fmt(lastRow.oz, 3)} oz/ft² aralığının dışında. En `
                + `yakın basamak ${fmt(rec.oz, 3)} oz/ft² (${fmt(rec.um, 4)} µm) ama fark `
                + `${pct(fmtPct(rec.deltaPct))}; bu kalınlık standart sipariş dışıdır, üreticiye ayrıca `
                + 'sorun.',
              en: `The finished thickness ${fmtEng(r.finished, 'm', 4)} is outside the `
                + `${fmt(firstRow.oz, 3)}–${fmt(lastRow.oz, 3)} oz/ft² range of the nominal table. `
                + `The nearest step is ${fmt(rec.oz, 3)} oz/ft² (${fmt(rec.um, 4)} µm) but the `
                + `difference is ${pct(fmtPct(rec.deltaPct))}; this thickness is outside the standard `
                + 'ordering range, so ask the manufacturer separately.',
            }),
          })
        } else if (rec.exact) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Bitmiş kalınlık ${fmt(rec.oz, 3)} oz/ft² basamağına tam oturuyor `
                + `(${fmt(rec.um, 4)} µm). Sipariş için ek yuvarlama gerekmiyor.`,
              en: `The finished thickness lands exactly on the ${fmt(rec.oz, 3)} oz/ft² step `
                + `(${fmt(rec.um, 4)} µm). No further rounding is needed for ordering.`,
            }),
          })
        } else {
          out.push({
            level: 'ok',
            text: t({
              tr: `Üretim için önerilen sipariş basamağı ${fmt(rec.oz, 3)} oz/ft² (nominal `
                + `${fmt(rec.um, 4)} µm); bitmiş kalınlığa göre fark ${pct(fmtPct(rec.deltaPct))}. `
                + 'Sipariş ara kalınlıktan değil bu basamaklardan verilir.',
              en: `The recommended order step for manufacturing is ${fmt(rec.oz, 3)} oz/ft² `
                + `(nominal ${fmt(rec.um, 4)} µm); relative to the finished thickness the `
                + `difference is ${pct(fmtPct(rec.deltaPct))}. Orders are placed from these steps, not `
                + 'from an intermediate thickness.',
            }),
          })
        }
      }

      // İç katmanda kaplama zaten yok; oradaki notu aşağıdaki mevcut madde veriyor.
      if (r.platingSolved && r.layer === 'external') {
        out.push({
          level: 'warn',
          text: t({
            tr: `Bitmiş kalınlık ölçümden geldi (${fmtEng(r.finished, 'm', 4)}); kaplama geriye `
              + `çözüldü: ${fmtEng(r.plating, 'm', 4)} = bitmiş − folyo `
              + `(${fmtEng(r.starting, 'm', 4)}). Çözülen kaplama, girilen folyo kalınlığı kadar `
              + 'doğrudur; folyo kalınlığı da kendi toleransını taşır.',
            en: `The finished thickness came from a measurement (${fmtEng(r.finished, 'm', 4)}); `
              + `the plating was solved backwards: ${fmtEng(r.plating, 'm', 4)} = finished − foil `
              + `(${fmtEng(r.starting, 'm', 4)}). The solved plating is only as accurate as the `
              + 'foil thickness entered; the foil thickness carries its own tolerance too.',
          }),
        })
      }

      if (r.plating > 0) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Dış katmanda kaplama ${fmtEng(r.plating, 'm', 3)} ekliyor; bitmiş kalınlık `
              + `${fmtEng(r.finished, 'm', 4)} ve kaplamanın kesitteki payı `
              + `${pct(fmt(r.platingShare * 100, 3))}.`,
            en: `On the outer layer the plating adds ${fmtEng(r.plating, 'm', 3)}; the finished `
              + `thickness is ${fmtEng(r.finished, 'm', 4)} and the plating share of the `
              + `cross-section is ${pct(fmt(r.platingShare * 100, 3))}.`,
          }),
        })
        if (r.platingShare > 0.4) {
          out.push({
            level: 'warn',
            text: t({
              tr: 'Kesitin büyük kısmı kaplamadan geliyor. Kaplama kalınlığı folyodan daha '
                + 'değişkendir; gerçek kesit tahmin edilenden belirgin biçimde sapabilir.',
              en: 'Most of the cross-section comes from the plating. The plating thickness varies '
                + 'more than the foil; the real cross-section can deviate noticeably from the '
                + 'estimate.',
            }),
          })
        }
      } else if (r.layer === 'internal') {
        out.push({
          level: 'ok',
          text: t({
            tr: 'İç katmanda delik kaplaması yüzeye bakır eklemez; bitmiş kalınlık folyo '
              + 'kalınlığına eşittir.',
            en: 'On an inner layer the hole plating adds no copper to the surface; the finished '
              + 'thickness equals the foil thickness.',
          }),
        })
      }

      out.push({
        level: 'ok',
        text: t({
          tr: `${fmtEng(r.W, 'm', 3)} genişliğinde dikdörtgen kesit `
            + `${fmtEng(r.rect.area, 'm²', 4)}; kare direnci ${fmtOhm(r.Rsheet)}/□ @ `
            + `${fmt(r.T, 3)} °C.`,
          en: `A rectangular cross-section ${fmtEng(r.W, 'm', 3)} wide is `
            + `${fmtEng(r.rect.area, 'm²', 4)}; the sheet resistance is ${fmtOhm(r.Rsheet)}/□ @ `
            + `${fmt(r.T, 3)} °C.`,
        }),
      })

      if (r.tolerance) {
        const tol = r.tolerance
        if (tol.error) {
          out.push({
            level: 'warn',
            text: t({
              tr: `Tolerans analizi yapılamadı. ${toleranceReason(tol.error)}`,
              en: `The tolerance analysis could not be carried out. ${toleranceReason(tol.error)}`,
            }),
          })
        } else if (!tol.active) {
          out.push({
            level: 'ok',
            text: t({
              tr: 'Tolerans alanlarına sıfır girildi; worst-case üçlüsü nominal değerin '
                + 'kendisidir. Üretim sapmasını görmek için en az bir alana yüzde girin.',
              en: 'Zero was entered in the tolerance fields; the worst-case triple is the nominal '
                + 'value itself. Enter a percentage in at least one field to see the manufacturing '
                + 'spread.',
            }),
          })
        } else {
          out.push({
            level: 'ok',
            text: t({
              tr: `Worst-case köşe taramasında bitmiş kalınlık ${fmtEng(tol.finished.min, 'm', 4)} `
                + `… ${fmtEng(tol.finished.max, 'm', 4)}, kare direnci `
                + `${fmtOhm(tol.Rsheet.min)}/□ … ${fmtOhm(tol.Rsheet.max)}/□ arasında. Akım `
                + 'kapasitesi ve gerilim düşümü marjını nominale değil bu uçlara göre kontrol '
                + 'edin.',
              en: `In the worst-case corner sweep the finished thickness spans `
                + `${fmtEng(tol.finished.min, 'm', 4)} … ${fmtEng(tol.finished.max, 'm', 4)} and `
                + `the sheet resistance ${fmtOhm(tol.Rsheet.min)}/□ … `
                + `${fmtOhm(tol.Rsheet.max)}/□. Check the current-capacity and voltage-drop margin `
                + 'against these extremes, not against the nominal.',
            }),
          })
        }
      }

      if (r.etch > 0) {
        out.push({
          level: r.trap.lossPct > 15 ? 'warn' : 'ok',
          text: t({
            tr: `Aşındırma üst genişliği ${fmtEng(r.trap.Wtop, 'm', 3)}'e indiriyor; gerçek kesit `
              + `dikdörtgen varsayımından ${pct(fmt(r.trap.lossPct, 3))} küçük. Dikdörtgen `
              + 'varsayımı her zaman iyimserdir.',
            en: `Etching brings the top width down to ${fmtEng(r.trap.Wtop, 'm', 3)}; the real `
              + `cross-section is ${pct(fmt(r.trap.lossPct, 3))} smaller than the rectangular `
              + 'assumption. The rectangular assumption is always optimistic.',
          }),
        })
      } else {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Aşındırma oranı sıfır girildi, yani kesit dikdörtgen kabul edildi. Dar RF '
              + 'hatlarında ve ince geometrilerde gerçek kesit trapezdir ve bu varsayımdan '
              + 'küçüktür.',
            en: 'An etch factor of zero was entered, so the cross-section is taken as rectangular. '
              + 'On narrow RF lines and fine geometries the real cross-section is trapezoidal and '
              + 'smaller than this assumption.',
          }),
        })
      }

      return out
    },
  }
}
