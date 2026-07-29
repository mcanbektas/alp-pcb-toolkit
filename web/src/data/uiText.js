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

    // Boş/hata durumları
    chartNeedsInput: t({
      tr: 'Grafik için geçerli girdi gerekli.',
      en: 'The chart needs valid input.',
    }),
    loadingTool: t({ tr: 'Araç yükleniyor…', en: 'Loading tool…' }),
    thousandsNote: (fields) => t({
      tr: `Binlik ayırıcı belirsiz; ondalık için nokta veya virgül kullanın. Etkilenen alan: ${fields.join(', ')}.`,
      en: `Ambiguous thousands separator; use a point or comma for decimals. Affected field${fields.length === 1 ? '' : 's'}: ${fields.join(', ')}.`,
    }),

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
