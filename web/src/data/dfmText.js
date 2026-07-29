// Üretim/DFM ekranlarının paylaştığı arayüz metinleri — iki dilli (tr/en).
//
// Dört ekran (clearance/creepage/padstack, BGA breakout, stack-up, thermal
// relief) aynı üretici profili panelini, aynı kontrol tablosunu ve aynı özet
// raporu gösterir. Bu metinler ekran başına yazılsaydı dört kopya oluşur ve
// ilki değiştiğinde diğer üçü sessizce çelişirdi — `reportText.js` /
// `authText.js` ile aynı gerekçe.
//
// Araca özgü her şey (alan etiketi, formül, şematik yazısı, yorum cümlesi)
// yine o aracın kendi `text.js` dosyasındadır.
//
// UYGUNLUK İDDİASI KURALI: burada hiçbir metin bir sonucu "standarda uygun"
// ya da "kesin üretilebilir" diye nitelemez. Üretici profilinden gelen bir
// sonuç yalnızca "profildeki girilmiş minimumları sağlıyor" der; karar profili
// yüklü değilken tablo tabanlı uygunluk değerlendirilmedi denir.

import { pick } from '../lib/i18n'
import {
  STATUS_OK, STATUS_WARNING, STATUS_DANGER, STATUS_UNKNOWN,
  SOURCE_GEOMETRY, SOURCE_FAB_PROFILE, SOURCE_USER_RULE, SOURCE_STANDARD_PROFILE,
  UNKNOWN_NO_LIMIT, UNKNOWN_NO_ACTUAL, UNKNOWN_NOT_FINITE, UNKNOWN_NO_CAPABILITY,
} from '../lib/dfmCheck'
import {
  DFM_ERR_SCHEMA, DFM_ERR_VERSION, DFM_ERR_NAME, DFM_ERR_NOTES, DFM_ERR_UNITS,
  DFM_ERR_LIMITS, DFM_ERR_FIELD, DFM_ERR_UNKNOWN_FIELD, DFM_ERR_ORDER,
  DFM_ERR_STORAGE, DFM_ERR_LIMIT, DFM_ERR_PARSE, DFM_ERR_NOT_FOUND,
  DFM_VARIANT_NOT_BOOLEAN, DFM_VARIANT_NOT_INTEGER, DFM_VARIANT_NOT_NUMBER,
  DFM_VARIANT_PERCENT_RANGE, DFM_VARIANT_POSITIVE, DFM_VARIANT_NON_NEGATIVE,
  DFM_VARIANT_TOO_LONG, DFM_VARIANT_EMPTY,
} from '../lib/dfmProfile'
import {
  CLEAR_ERR_SCHEMA, CLEAR_ERR_VERSION, CLEAR_ERR_NAME, CLEAR_ERR_SOURCE,
  CLEAR_ERR_RULES, CLEAR_ERR_RULE_FIELD, CLEAR_ERR_RANGE, CLEAR_ERR_GROUPS,
  CLEAR_ERR_FACTORS, CLEAR_ERR_STORAGE, CLEAR_ERR_LIMIT, CLEAR_ERR_PARSE,
  CLEAR_ERR_NOT_FOUND,
} from '../lib/clearanceProfile'

export function dfmText(lang) {
  const t = (dict) => pick(dict, lang)

  const statusLabels = {
    [STATUS_OK]: t({ tr: 'geçti', en: 'passed' }),
    [STATUS_WARNING]: t({ tr: 'sınıra yakın', en: 'near the limit' }),
    [STATUS_DANGER]: t({ tr: 'sınırın dışında', en: 'outside the limit' }),
    [STATUS_UNKNOWN]: t({ tr: 'değerlendirilemedi', en: 'not evaluated' }),
  }

  const sourceLabels = {
    [SOURCE_GEOMETRY]: t({ tr: 'geometri', en: 'geometry' }),
    [SOURCE_FAB_PROFILE]: t({ tr: 'üretici profili', en: 'fabricator profile' }),
    [SOURCE_USER_RULE]: t({ tr: 'kullanıcı kuralı', en: 'user rule' }),
    [SOURCE_STANDARD_PROFILE]: t({ tr: 'karar profili', en: 'decision profile' }),
  }

  const unknownReasons = {
    [UNKNOWN_NO_LIMIT]: t({
      tr: 'sınır girilmedi',
      en: 'no limit entered',
    }),
    [UNKNOWN_NO_ACTUAL]: t({
      tr: 'tasarım değeri girilmedi',
      en: 'no design value entered',
    }),
    [UNKNOWN_NOT_FINITE]: t({
      tr: 'değer sayısal değil',
      en: 'the value is not numeric',
    }),
    [UNKNOWN_NO_CAPABILITY]: t({
      tr: 'üretici profilinde bu yetenek tanımlı değil',
      en: 'the fabricator profile does not define this capability',
    }),
  }

  // Üretici profili doğrulama hataları. Kod + alan anahtarı + sayıdan cümle
  // burada kurulur; saf katman cümle taşımaz.
  const dfmVariantText = {
    [DFM_VARIANT_NOT_NUMBER]: t({ tr: 'sayı değil', en: 'is not a number' }),
    [DFM_VARIANT_POSITIVE]: t({ tr: 'sıfırdan büyük olmalı', en: 'must be greater than zero' }),
    [DFM_VARIANT_NON_NEGATIVE]: t({ tr: 'negatif olamaz', en: 'cannot be negative' }),
    [DFM_VARIANT_NOT_INTEGER]: t({ tr: 'tam sayı olmalı', en: 'must be a whole number' }),
    [DFM_VARIANT_NOT_BOOLEAN]: t({ tr: 'true veya false olmalı', en: 'must be true or false' }),
    [DFM_VARIANT_PERCENT_RANGE]: t({ tr: '0 ile 100 arasında olmalı', en: 'must be between 0 and 100' }),
    [DFM_VARIANT_TOO_LONG]: t({ tr: 'çok uzun', en: 'is too long' }),
    [DFM_VARIANT_EMPTY]: t({ tr: 'boş olamaz', en: 'cannot be empty' }),
  }

  function dfmProfileErrorText(err) {
    if (!err) return ''
    const variant = dfmVariantText[err.variant]
    switch (err.error) {
      case DFM_ERR_PARSE:
        return t({
          tr: 'Dosya geçerli bir JSON değil.',
          en: 'The file is not valid JSON.',
        })
      case DFM_ERR_SCHEMA:
        return t({
          tr: 'Bu dosya bir üretici yetenek profili değil.',
          en: 'This file is not a fabricator capability profile.',
        })
      case DFM_ERR_VERSION:
        return t({
          tr: `Profil sürümü uyuşmuyor: beklenen ${err.expected}, bulunan ${err.found}. `
            + 'Eski bir profil yeni alan anlamlarıyla okunmaz.',
          en: `Profile version mismatch: expected ${err.expected}, found ${err.found}. `
            + 'An older profile is not read with the current field meanings.',
        })
      case DFM_ERR_NAME:
        return t({ tr: `Profil adı ${variant}.`, en: `The profile name ${variant}.` })
      case DFM_ERR_NOTES:
        return t({ tr: `Profil notu ${variant}.`, en: `The profile note ${variant}.` })
      case DFM_ERR_UNITS:
        return t({
          tr: 'Profil birimi okunamadı; bu sürümde yalnızca mm kabul edilir.',
          en: 'The profile unit could not be read; only mm is accepted in this version.',
        })
      case DFM_ERR_LIMITS:
        return t({
          tr: 'Profildeki sınır listesi bir nesne değil.',
          en: 'The limits block in the profile is not an object.',
        })
      case DFM_ERR_UNKNOWN_FIELD:
        return t({
          tr: `Tanınmayan sınır alanı: ${err.field}. Yazım hatası olabilir; `
            + 'tanınmayan alan sessizce yok sayılmaz.',
          en: `Unrecognised limit field: ${err.field}. It may be a typo; `
            + 'an unknown field is not silently ignored.',
        })
      case DFM_ERR_FIELD:
        return t({ tr: `${err.field} alanı ${variant}.`, en: `The ${err.field} field ${variant}.` })
      case DFM_ERR_ORDER:
        return t({
          tr: `${err.low} değeri ${err.high} değerinden büyük olamaz.`,
          en: `${err.low} cannot be greater than ${err.high}.`,
        })
      case DFM_ERR_LIMIT:
        return t({
          tr: `Kayıtlı profil sınırına ulaşıldı (${err.limit}). Yeni profil için önce birini silin.`,
          en: `The stored profile limit has been reached (${err.limit}). Delete one before adding another.`,
        })
      case DFM_ERR_NOT_FOUND:
        return t({ tr: 'Profil bulunamadı.', en: 'Profile not found.' })
      case DFM_ERR_STORAGE:
        return t({
          tr: 'Tarayıcı depolamasına yazılamadı; profil bu oturumda saklanmayacak.',
          en: 'Could not write to browser storage; the profile will not persist in this session.',
        })
      default:
        return t({ tr: 'Profil okunamadı.', en: 'The profile could not be read.' })
    }
  }

  function clearanceProfileErrorText(err) {
    if (!err) return ''
    const where = err.index === undefined
      ? ''
      : t({ tr: ` (${err.list}, ${err.index + 1}. kural)`, en: ` (${err.list}, rule ${err.index + 1})` })
    switch (err.error) {
      case CLEAR_ERR_PARSE:
        return t({ tr: 'Dosya geçerli bir JSON değil.', en: 'The file is not valid JSON.' })
      case CLEAR_ERR_SCHEMA:
        return t({
          tr: 'Bu dosya bir clearance/creepage karar profili değil.',
          en: 'This file is not a clearance/creepage decision profile.',
        })
      case CLEAR_ERR_VERSION:
        return t({
          tr: `Profil sürümü uyuşmuyor: beklenen ${err.expected}, bulunan ${err.found}.`,
          en: `Profile version mismatch: expected ${err.expected}, found ${err.found}.`,
        })
      case CLEAR_ERR_NAME:
        return t({ tr: 'Profil adı geçersiz.', en: 'The profile name is not valid.' })
      case CLEAR_ERR_SOURCE:
        return t({
          tr: `Kaynak künyesi geçersiz${err.field ? `: ${err.field}` : ''}.`,
          en: `The source block is not valid${err.field ? `: ${err.field}` : ''}.`,
        })
      case CLEAR_ERR_RULES:
        return t({
          tr: `Kural listesi geçersiz${where}. Profilde en az bir clearance ya da creepage kuralı bulunmalı.`,
          en: `The rule list is not valid${where}. The profile must contain at least one clearance or creepage rule.`,
        })
      case CLEAR_ERR_RULE_FIELD:
        return t({
          tr: `Kural alanı geçersiz: ${err.field}${where}.`,
          en: `Invalid rule field: ${err.field}${where}.`,
        })
      case CLEAR_ERR_RANGE:
        return t({
          tr: `Aralık ters tanımlanmış: ${err.low} > ${err.high}${where}.`,
          en: `The range is inverted: ${err.low} > ${err.high}${where}.`,
        })
      case CLEAR_ERR_GROUPS:
        return t({
          tr: 'Malzeme grubu tanımı geçersiz.',
          en: 'The material group definition is not valid.',
        })
      case CLEAR_ERR_FACTORS:
        return t({
          tr: 'Düzeltme katsayısı tanımı geçersiz; katsayı sıfırdan büyük olmalı.',
          en: 'The correction factor definition is not valid; the factor must be greater than zero.',
        })
      case CLEAR_ERR_LIMIT:
        return t({
          tr: `Kayıtlı profil sınırına ulaşıldı (${err.limit}).`,
          en: `The stored profile limit has been reached (${err.limit}).`,
        })
      case CLEAR_ERR_NOT_FOUND:
        return t({ tr: 'Profil bulunamadı.', en: 'Profile not found.' })
      case CLEAR_ERR_STORAGE:
        return t({
          tr: 'Tarayıcı depolamasına yazılamadı; profil bu oturumda saklanmayacak.',
          en: 'Could not write to browser storage; the profile will not persist in this session.',
        })
      default:
        return t({ tr: 'Profil okunamadı.', en: 'The profile could not be read.' })
    }
  }

  return {
    statusLabel: (status) => statusLabels[status] ?? statusLabels[STATUS_UNKNOWN],
    sourceLabel: (source) => sourceLabels[source] ?? t({ tr: 'kaynak yok', en: 'no source' }),
    unknownReason: (variant) => unknownReasons[variant] ?? '',

    dfmProfileErrorText,
    clearanceProfileErrorText,

    // --- Üretici profili paneli ---
    profile: {
      title: t({ tr: 'Üretici yetenek profili', en: 'Fabricator capability profile' }),
      active: t({ tr: 'Aktif profil', en: 'Active profile' }),
      none: t({ tr: 'Profil seçilmedi', en: 'No profile selected' }),
      importLabel: t({ tr: 'Profil dosyası yükle (JSON)', en: 'Load a profile file (JSON)' }),
      importPaste: t({ tr: 'Ya da profil JSON metnini yapıştırın', en: 'Or paste the profile JSON here' }),
      importButton: t({ tr: 'İçe aktar', en: 'Import' }),
      exportButton: t({ tr: 'Dışa aktar', en: 'Export' }),
      removeButton: t({ tr: 'Sil', en: 'Delete' }),
      copyButton: t({ tr: 'Panoya kopyala', en: 'Copy to clipboard' }),
      copied: t({ tr: 'Kopyalandı', en: 'Copied' }),
      copyFailed: t({
        tr: 'Panoya kopyalanamadı; metni elle seçip kopyalayabilirsiniz.',
        en: 'Could not copy to the clipboard; you can select and copy the text manually.',
      }),
      storageUnavailable: t({
        tr: 'Tarayıcı depolaması kapalı. Profil bu oturumda kullanılabilir ama kaydedilmez.',
        en: 'Browser storage is unavailable. The profile works in this session but is not saved.',
      }),
      imported: t({ tr: 'Profil yüklendi ve aktif yapıldı.', en: 'The profile was loaded and made active.' }),
      schemaHint: t({
        tr: 'Profil, üreticinizin verdiği minimum değerlerden kendiniz kurduğunuz bir JSON dosyasıdır. '
          + 'Uygulama hazır üretici verisi içermez; girilmeyen her alan değerlendirme dışı kalır.',
        en: 'The profile is a JSON file you build from the minimums your fabricator gives you. '
          + 'The application ships no fabricator data; every field left empty stays out of the evaluation.',
      }),
    },

    // --- Karar profili paneli ---
    decisionProfile: {
      title: t({ tr: 'Karar profili', en: 'Decision profile' }),
      none: t({ tr: 'Karar profili yüklenmedi', en: 'No decision profile loaded' }),
      sourceTitle: t({ tr: 'Kaynak', en: 'Source' }),
      revision: t({ tr: 'Revizyon', en: 'Revision' }),
      hint: t({
        tr: 'Mesafe karar tabloları lisanslıdır ve uygulamaya gömülmez. Kullandığınız kaynaktan '
          + 'kendi kurduğunuz profili JSON olarak yükleyin; veri yalnızca sizin tarayıcınızda kalır.',
        en: 'Distance decision tables are licensed and are not embedded in the application. Load the '
          + 'profile you build from your own source as JSON; the data stays in your browser only.',
      }),
    },

    // --- Ortak kontrol tablosu ---
    checks: {
      title: t({ tr: 'Üretilebilirlik kontrolleri', en: 'Manufacturability checks' }),
      check: t({ tr: 'Kontrol', en: 'Check' }),
      actual: t({ tr: 'Tasarım', en: 'Design' }),
      required: t({ tr: 'Sınır', en: 'Limit' }),
      margin: t({ tr: 'Marj', en: 'Margin' }),
      source: t({ tr: 'Kaynak', en: 'Source' }),
      status: t({ tr: 'Durum', en: 'Status' }),
      none: t({ tr: 'Değerlendirilecek kontrol yok.', en: 'There is no check to evaluate.' }),
    },

    warnPercent: {
      label: t({ tr: 'Uyarı marjı', en: 'Warning margin' }),
      hint: t({
        tr: 'Sizin tercihiniz — gizli bir güvenlik eşiği değildir. Sınırı sağlayan ama bu payın '
          + 'altında kalan sonuçlar uyarı olarak işaretlenir.',
        en: 'Your own preference — not a hidden safety threshold. Results that meet the limit but '
          + 'stay below this margin are flagged as warnings.',
      }),
    },

    // --- Uygunluk iddiası sınırları ---
    noProfileNote: t({
      tr: 'Üretici yetenek profili seçilmedi. Üretilebilirlik değerlendirmesi yalnızca girilen '
        + 'kullanıcı sınırlarına göre yapılmıştır.',
      en: 'No fabricator capability profile is selected. Manufacturability has been evaluated only '
        + 'against the user limits entered here.',
    }),
    noStandardNote: t({
      tr: 'Karar profili yüklü değil; tablo tabanlı uygunluk değerlendirilmedi.',
      en: 'No decision profile is loaded; table-based conformity has not been evaluated.',
    }),
    fabOnlyNote: t({
      tr: 'Bu sonuç yalnızca üretici profilinde girilmiş minimumları sağladığını gösterir; '
        + 'bir standarda uygunluk beyanı değildir.',
      en: 'This result only shows that the minimums entered in the fabricator profile are met; '
        + 'it is not a declaration of conformity to any standard.',
    }),

    // --- Kopyalanabilir DFM özeti (düz metin) ---
    summary: {
      title: t({ tr: 'DFM özeti', en: 'DFM summary' }),
      copy: t({ tr: 'Özeti panoya kopyala', en: 'Copy the summary' }),
      copied: t({ tr: 'Özet kopyalandı', en: 'Summary copied' }),
      tool: t({ tr: 'Araç', en: 'Tool' }),
      profile: t({ tr: 'Profil', en: 'Profile' }),
      decisionProfile: t({ tr: 'Karar profili', en: 'Decision profile' }),
      date: t({ tr: 'Tarih', en: 'Date' }),
      inputs: t({ tr: 'Girdiler', en: 'Inputs' }),
      results: t({ tr: 'Ana sonuçlar', en: 'Main results' }),
      passed: t({ tr: 'Başarılı kontroller', en: 'Passed checks' }),
      warnings: t({ tr: 'Uyarılar', en: 'Warnings' }),
      failed: t({ tr: 'Başarısız kontroller', en: 'Failed checks' }),
      unevaluated: t({ tr: 'Değerlendirilemeyen kontroller', en: 'Checks not evaluated' }),
      assumptions: t({ tr: 'Varsayımlar', en: 'Assumptions' }),
      method: t({ tr: 'Yöntem', en: 'Method' }),
      none: t({ tr: 'yok', en: 'none' }),
      notSelected: t({ tr: 'seçilmedi', en: 'not selected' }),
      disclaimer: t({
        tr: 'Bu özet yaklaşık bir mühendislik değerlendirmesidir. Üretilebilirlik ve güvenlik '
          + 'kararı üreticinizle ve geçerli kaynaklarla doğrulanmadan verilmemelidir.',
        en: 'This summary is an approximate engineering evaluation. Manufacturability and safety '
          + 'decisions should not be made without confirming them with your fabricator and the '
          + 'applicable sources.',
      }),
    },

    // --- Yöntem etiketleri ---
    method: {
      geometric: t({
        tr: 'Tam geometrik bağıntı — ampirik katsayı ya da eğri uydurma içermez.',
        en: 'Exact geometric relation — contains no empirical coefficient or curve fit.',
      }),
      tableProfile: t({
        tr: 'Kullanıcı tarafından yüklenen karar profilinden okunan tablo tabanlı sonuç.',
        en: 'Table-based result read from the decision profile loaded by the user.',
      }),
      fabUserOnly: t({
        tr: 'Yalnızca üretici ve kullanıcı kuralı kontrolü — tablo tabanlı değerlendirme yapılmadı.',
        en: 'Fabricator and user rule check only — no table-based evaluation was performed.',
      }),
      noLimit: t({
        tr: 'Karşılaştırılacak hiçbir sınır girilmedi.',
        en: 'No limit was entered to compare against.',
      }),
      worstCase: t({
        tr: 'Worst-case tolerans toplamı — bütün toleransların aynı yönde gerçekleştiği '
          + 'konservatif senaryodur, istatistiksel bir toplam değildir.',
        en: 'Worst-case tolerance stack — the conservative scenario in which every tolerance lands '
          + 'in the same direction, not a statistical sum.',
      }),
      heuristic: t({
        tr: 'Geometrik ön kontrol — gerçek bakır çözümü ya da fiziksel benzetim değildir.',
        en: 'Geometric pre-check — not a real copper solve or a physical simulation.',
      }),
      oneDimensionalThermal: t({
        tr: 'Bir boyutlu ısı iletimi modeli — yalnızca belirtilen bakır kesitinden iletimi kapsar.',
        en: 'One-dimensional heat conduction model — covers conduction through the stated copper '
          + 'cross-section only.',
      }),
      notEvaluated: t({
        tr: 'Veri bulunmadığı için değerlendirilemeyen kontrol.',
        en: 'A check that could not be evaluated because the data is missing.',
      }),
    },
  }
}
