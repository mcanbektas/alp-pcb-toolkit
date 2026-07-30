// ReportDialog'un iki dilli metni. docs/uyelik-ve-rapor-plani.md §5.3 —
// ana başlık sabittir, kullanıcı seçmez.

import { pick } from '../lib/i18n'
import { API_ERR_NETWORK, API_ERR_PARSE } from '../lib/api'

export function reportText(lang) {
  const t = (dict) => pick(dict, lang)

  return {
    reportTitle: t({ tr: 'DONANIM RAPORU', en: 'HARDWARE REPORT' }),
    docLangLabel: t({ tr: 'Belge dili', en: 'Document language' }),
    // Bölümlerin dili henüz seçimi izlemiyor (ekranın/kaydın dilinde kurulur).
    // Sessiz kalmak yerine yazılır — kullanıcı karışık dilli belgeyi arıza
    // sanmasın, sınır bilinsin.
    docLangPartial: t({
      tr: 'Seçim belgenin başlıklarını çevirir. Hesap bölümleri şimdilik '
        + 'kaydedildikleri/ekranda durdukları dilde çıkar.',
      en: 'The choice translates the document headings. Calculation sections still come out '
        + 'in the language they were saved in or shown on screen.',
    }),
    heading: t({ tr: 'Rapor al', en: 'Get a report' }),
    preparedByLabel: t({ tr: 'Hazırlayan', en: 'Prepared by' }),
    pdfButton: t({ tr: 'PDF indir', en: 'Download PDF' }),
    xlsxButton: t({ tr: 'Excel indir', en: 'Download Excel' }),
    working: t({ tr: 'Hazırlanıyor…', en: 'Preparing…' }),
    // İndirme sessizce olup bitiyordu: düğme eski hâline dönüyor, başka hiçbir
    // şey olmuyordu. Dosya adı da bildirime yazılır — tarayıcı indirmeyi nereye
    // koyduğunu göstermiyorsa aranacak ad burada görünür.
    downloaded: (fileName) => t({
      tr: `Rapor indirildi — ${fileName}`,
      en: `Report downloaded — ${fileName}`,
    }),
    loginRequired: t({
      tr: 'Rapor almak için giriş yapmalısın.',
      en: 'Sign in to get a report.',
    }),
    loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
    missingPreparedBy: t({
      tr: 'Hazırlayan adı boş olamaz.',
      en: 'The prepared-by name cannot be empty.',
    }),
  }
}

// Sunucunun rapor uçlarından dönebilen kodlar. Dize sabiti tek yerde durur:
// hem burada hem uç noktada ayrı ayrı yazılırsa biri değişince eşleşme sessizce
// kopar ve kullanıcı genel hatayı görür.
export const REPORT_ERR_TOO_LARGE = 'REPORT_TOO_LARGE'
// Yeniden üretecek kaynak veri yok: rapor bir projeye bağlı değil ya da
// projede okunabilir rapor bölümü kalmamış.
export const REPORT_ERR_NOT_REPRODUCIBLE = 'REPORT_NOT_REPRODUCIBLE'

export function reportErrorText(res, lang) {
  if (!res || res.ok) return null
  const t = (dict) => pick(dict, lang)

  // PDF dizgisi içeriği sayfaya sığdıramadı (çok bölümlü, grafikli proje
  // raporu). Excel aynı yükü kaldırıyor, bu yüzden mesaj çıkış yolunu da
  // söyler — "tekrar deneyin" burada yanlış tavsiye olurdu, tekrar denemek
  // aynı sonucu verir.
  if (res.error === REPORT_ERR_TOO_LARGE) {
    return t({
      tr: 'Rapor bu içerikle tek belgeye sığmadı. Daha az hesapla deneyin ya da Excel indirin.',
      en: 'The report does not fit into a single document with this content. Try fewer calculations or download Excel.',
    })
  }
  if (res.error === API_ERR_NETWORK) {
    return t({
      tr: 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.',
      en: 'Could not reach the server. Check your connection.',
    })
  }
  if (res.error === API_ERR_PARSE) {
    return t({
      tr: 'Sunucudan beklenmeyen bir yanıt geldi.',
      en: 'The server returned an unexpected response.',
    })
  }
  return t({
    tr: 'Rapor üretilemedi. Lütfen tekrar deneyin.',
    en: 'The report could not be generated. Please try again.',
  })
}

// Belge dili seçicisinin metni. Dil adları KENDİ dillerinde yazılır ve
// `lang={code}` taşır — `<html lang>` kuralıyla aynı gerekçe (bkz. CLAUDE.md):
// `text-transform` sayfanın diline bakar ve kullanıcı anlamadığı bir arayüzde
// bile kendi dilini tanıyabilmeli.
export const DOC_LANG_NAMES = { tr: 'Türkçe', en: 'English' }

// Belgenin ÇERÇEVE metni — sayfa başlıkları, blok adları, Excel sayfa adları
// ve dizgi başarısızlığında basılan iki cümle.
//
// Bunlar eskiden `Alp.Reports` içindeki iki dizgicide çakılı Türkçeydi ve
// İngilizce arayüzde karışık dilli belge çıkıyordu: bölümler İngilizce,
// başlıklar Türkçe. Sunucuya dil parametresi vermek yerine metin buraya
// taşındı, çünkü kural (docs/uyelik-ve-rapor-plani.md §5.1) sunucunun hiçbir
// kullanıcı metni tanımaması: tarayıcı zaten çevrilmiş yükü kurar, sunucu
// yalnızca dizer. Üçüncü bir dil eklendiğinde yalnızca bu dosya değişir.
//
// Yükün parçası olduğu için alan adları sözleşmedir — karşılığı
// `Alp.Reports/ReportPayload.cs` içindeki `ReportLabels`.
export function reportLabels(lang) {
  const t = (dict) => pick(dict, lang)

  return {
    summarySheet: t({ tr: 'Özet', en: 'Summary' }),
    preparedBy: t({ tr: 'Hazırlayan', en: 'Prepared by' }),
    company: t({ tr: 'Firma', en: 'Company' }),
    date: t({ tr: 'Tarih', en: 'Date' }),
    calculation: t({ tr: 'Hesap', en: 'Calculation' }),

    inputs: t({ tr: 'Girdiler', en: 'Inputs' }),
    results: t({ tr: 'Sonuçlar', en: 'Results' }),
    equations: t({ tr: 'Denklemler', en: 'Equations' }),
    notes: t({ tr: 'Notlar', en: 'Notes' }),
    chartData: t({ tr: 'Grafik verisi', en: 'Chart data' }),

    chartHint: t({
      tr: 'Aşağıdaki aralığı seçip Ekle → Grafik ile kendi grafiğini çizebilirsin.',
      en: 'Select the range below and use Insert → Chart to draw your own chart.',
    }),
    summaryHintSingle: t({
      tr: 'Hesabın girdileri, sonuçları, denklemleri ve grafik verisi için yukarıdaki ada '
        + 'tıkla ya da alttaki sayfa sekmesine geç.',
      en: 'For the calculation\'s inputs, results, equations and chart data, click the name '
        + 'above or switch to the sheet tab below.',
    }),
    summaryHintMany: t({
      tr: 'Her hesabın ayrıntısı kendi sayfasındadır — yukarıdaki ada tıkla ya da '
        + 'alttaki sayfa sekmelerine geç.',
      en: 'Each calculation has its own sheet — click the name above or switch to the '
        + 'sheet tabs below.',
    }),

    schematicFailed: t({
      tr: 'Şema bu raporda gösterilemedi.',
      en: 'The schematic could not be shown in this report.',
    }),
    chartFailed: t({
      tr: 'Grafik bu raporda gösterilemedi.',
      en: 'The chart could not be shown in this report.',
    }),
  }
}

// dd.MM.yyyy — planın §5.3 örneğiyle aynı biçim, dile göre değişmez (sayı
// biçimlendirmesi kuralıyla aynı gerekçe: mühendislik belgesi kopyalanabilir
// olmalı).
export function reportDateStamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(date.getDate())}.${p(date.getMonth() + 1)}.${date.getFullYear()}`
}
