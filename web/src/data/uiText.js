// Ekranlar arasında ortak arayüz metinleri — iki dilli (tr/en).
//
// Araca özgü metin o aracın `text.js` dosyasında durur; burada yalnızca her
// ekranda aynı olan başlıklar, durum çipi kalıpları ve gezinme metinleri var.
// Durum çipi kalıpları CLAUDE.md'deki tek kurala bağlıdır; kalıbı burada
// değiştirmeden ekran başına farklı metin yazılmaz.

import { pick } from '../lib/i18n'

export function commonText(lang) {
  const t = (dict) => pick(dict, lang)

  return {
    // Panel başlıkları
    inputs: t({ tr: 'Girdiler', en: 'Inputs' }),
    result: t({ tr: 'Sonuç', en: 'Result' }),
    technicalDetail: t({ tr: 'Teknik detay', en: 'Technical detail' }),
    validity: t({ tr: 'Geçerlilik ve varsayımlar', en: 'Validity and assumptions' }),
    commentary: t({ tr: 'Mühendislik yorumu', en: 'Engineering commentary' }),
    equations: t({ tr: 'Kullanılan denklemler', en: 'Equations used' }),
    chart: t({ tr: 'Parametrik grafik', en: 'Parametric chart' }),
    sources: t({ tr: 'Kaynak ve tanımlar', en: 'Sources and definitions' }),
    chartDataTable: t({ tr: 'Veri tablosu', en: 'Data table' }),

    // Yüzde işaretinin yeri dile göre değişir: Türkçede önde (%5), İngilizcede
    // arkada (5%). Sayının kendisi num.js ile biçimlenir, burada yalnızca işaret
    // yerleşir. Kalıp tek yerdedir — ekran başına yazıldığında ekranlar
    // birbiriyle çelişiyordu (bir ekran "5 %", diğeri "5%" yazıyordu).
    // Sonlu olmayan değerde `fmt`/`fmtPct` uzun tire döner; ona yüzde işareti
    // takılmaz — "%—" değil, yalnızca "—" görünür.
    pct: (v) => (v === '—' ? v : t({ tr: `%${v}`, en: `${v}%` })),

    // Durum çipi — en kötü bulgu seviyesi kuralı
    statusOk: t({ tr: 'Tüm kontroller geçti', en: 'All checks passed' }),
    statusWarn: (n) => t({
      tr: `Sınıra yakın — ${n} uyarı`,
      en: `Near the limit — ${n} warning${n === 1 ? '' : 's'}`,
    }),
    statusDanger: (n) => t({
      tr: `${n} kontrol sınırın dışında`,
      en: `${n} check${n === 1 ? '' : 's'} outside the limit`,
    }),
    // Dördüncü seviye yalnızca üretim/DFM ekranlarında doğar: karar verecek
    // sınır (üretici profili, karar profili, kullanıcı kuralı) yoksa kontrol
    // ne geçmiş ne kalmıştır. Bunu `warn` göstermek "sınıra yakın" demek olur
    // ve veri yokluğunu ölçülmüş bir yakınlık gibi sunardı.
    statusUnknown: (n) => t({
      tr: `${n} kontrol değerlendirilemedi`,
      en: `${n} check${n === 1 ? '' : 's'} could not be evaluated`,
    }),

    // Boş/hata durumları
    chartNeedsInput: t({
      tr: 'Grafik için geçerli girdi gerekli.',
      en: 'The chart needs valid input.',
    }),
    loadingTool: t({ tr: 'Araç yükleniyor…', en: 'Loading tool…' }),
    // Hata sınırı (ErrorBoundary.jsx) — tembel yüklenen bir ekran parçası
    // çöktüğünde ya da bayat dağıtımda chunk indirilemediğinde gösterilir.
    // "Yeniden dene" sayfayı TAM yeniler: bayat index.html ancak öyle tazelenir.
    errorBoundaryNote: t({
      tr: 'Sayfa yüklenirken bir sorun oluştu. Bağlantınızı kontrol edip yeniden deneyin.',
      en: 'Something went wrong while loading the page. Check your connection and try again.',
    }),
    errorBoundaryRetry: t({ tr: 'Yeniden dene', en: 'Try again' }),
    // 404 — bilinmeyen yol. Eskiden başlıkla altbilgi arasında BOŞ bir ana
    // alan kalıyordu; kullanıcı kırık bağlantıyı arıza sanıyordu.
    notFoundTitle: t({ tr: 'Sayfa bulunamadı', en: 'Page not found' }),
    notFoundNote: t({
      tr: 'Aradığınız adres taşınmış ya da hiç var olmamış olabilir.',
      en: 'The address you are looking for may have moved or never existed.',
    }),
    thousandsNote: (fields) => t({
      tr: `Binlik ayırıcı belirsiz; ondalık için nokta veya virgül kullanın. Etkilenen alan: ${fields.join(', ')}.`,
      en: `Ambiguous thousands separator; use a point or comma for decimals. Affected field${fields.length === 1 ? '' : 's'}: ${fields.join(', ')}.`,
    }),

    // Bildirim kartı (Toast.jsx) — çerçeve metni her bildirimde aynı, yalnızca
    // gösterilen cümle çağırandan gelir. Süre metne GÖMÜLMEZ, parametre olarak
    // geçer: sayı kodda değişip metinde kalırsa kart yalan söyler.
    toastClose: t({ tr: 'Bildirimi kapat', en: 'Dismiss notification' }),
    toastAutoClose: (seconds) => t({
      tr: `${seconds} saniye içinde kendiliğinden kapanacaktır.`,
      en: `This will close automatically in ${seconds} second${seconds === 1 ? '' : 's'}.`,
    }),

    // Onay kartı (ConfirmDialog.jsx) — vazgeçme düğmesinin yazısı her ekranda
    // birebir aynı çerçeve metnidir, o yüzden ekran sözlüğüne kopyalanmaz.
    // Onaylanan eylemin adı (Sil, Kaldır…) ekrana özgüdür ve prop olarak gelir.
    cancel: t({ tr: 'Vazgeç', en: 'Cancel' }),

    // Satır listesi — ekran başına değişmeyen varsayılanlar ve ekran okuyucu
    // etiketleri. Kalıp tek yerdedir; RowList kullanan üç ekran aynı sözlüğü
    // kopyalamaz.
    // Birim seçicinin ekran okuyucu etiketi — NumberField ve RowList aynı kalıbı
    // kullanır, o yüzden bileşen başına yazılmaz.
    unitAria: (label) => t({ tr: `${label} birimi`, en: `${label} unit` }),

    rowAdd: t({ tr: 'Satır ekle', en: 'Add row' }),
    rowLabel: t({ tr: 'Satır', en: 'Row' }),
    rowUnitAria: (row, i, col) => t({
      tr: `${row} ${i} — ${col} birimi`,
      en: `${row} ${i} — ${col} unit`,
    }),
    rowRemoveAria: (row, i) => t({
      tr: `${row} ${i} sil`,
      en: `Remove ${row} ${i}`,
    }),

    // Parola görünürlük düğmesinin ekran okuyucu adı (AuthField). Giriş, kayıt,
    // sıfırlama ve hesap ekranlarında birebir aynı cümle — bileşen başına ya da
    // ekran başına yazılmaz.
    passwordShow: t({ tr: 'Parolayı göster', en: 'Show password' }),
    passwordHide: t({ tr: 'Parolayı gizle', en: 'Hide password' }),

    // Gezinme ve kategori sayfaları
    backHome: t({ tr: '← Ana sayfaya dön', en: '← Back to home' }),
    allCategories: t({ tr: '← Tüm kategoriler', en: '← All categories' }),
    categoryNotFound: t({ tr: 'Kategori bulunamadı', en: 'Category not found' }),
    open: t({ tr: 'aç →', en: 'open →' }),
    soon: t({ tr: 'yakında', en: 'coming soon' }),
    toolsActive: (n) => t({
      tr: `${n} araç aktif`,
      en: `${n} tool${n === 1 ? '' : 's'} active`,
    }),
    toolCount: (n) => t({
      tr: `${n} araç`,
      en: `${n} tool${n === 1 ? '' : 's'}`,
    }),
  }
}
