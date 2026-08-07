// Yönetim paneli — operasyonel log ekranının metni (docs/brifler/
// 12-loglama-ekrani.md §4). Denetim izi (../audit) ekranıyla KARIŞTIRILMAZ:
// bu ekran bellek içi halka tampondan okur, kalıcı DEĞİLDİR — uygulama
// yeniden başlayınca sıfırlanır. Kalıcı iz Günlük sekmesindedir.
//
// Yetki kapısı ve debounce'lu arama deseni ../audit/text.js (dolayısıyla
// ../audit/index.jsx) ile BİREBİR aynı — bkz. o dosyanın başındaki not.

import { pick } from '../../../lib/i18n'

// Seviye adı ÇEVRİLMEZ: Information/Warning/Error/Fatal teknik terimdir ve
// sunucudan (LogBufferSink) ham gelir. Bilinmeyen/beklenmedik bir değer
// sessizce yeşile düşmez, `unknown` (nötr gri) olur — audit/text.js
// `markClassFor`daki "bilinmeyen kod sessizce iyi görünmez" kuralının aynısı.
function levelMarkClass(level) {
  if (level === 'Error' || level === 'Fatal') return 'danger'
  if (level === 'Warning') return 'warning'
  return 'unknown'
}

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const dash = '—'

  // Ayrıntı kartındaki (ve tablodaki, HER ZAMAN) tam zaman. Audit ekranının
  // aksine burada dakika/saniye ayrımı yok: operasyonel akışta art arda gelen
  // satırlar zaten sık, saniye HER satırda açık kalır.
  const formatDateSecondsFor = (iso) => {
    if (!iso) return dash
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return dash
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
      + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const columns = {
    time: t({ tr: 'Zaman', en: 'Time' }),
    level: t({ tr: 'Seviye', en: 'Level' }),
    source: t({ tr: 'Kaynak', en: 'Source' }),
    message: t({ tr: 'Mesaj', en: 'Message' }),
    detail: t({ tr: 'Ayrıntı', en: 'Detail' }),
  }
  const pathLabel = t({ tr: 'Yol', en: 'Path' })
  const userLabel = t({ tr: 'Kullanıcı', en: 'User' })
  const exceptionLabel = t({ tr: 'İstisna', en: 'Exception' })

  // Sunucu SourceContext'i TAM nitelikli sınıf adıyla döner (örn.
  // "Microsoft.AspNetCore.HttpsPolicy.HttpsRedirectionMiddleware") — arama
  // ve teşhis için gereken tam bilgi budur, ayrıntı kartı bunu OLDUĞU GİBİ
  // gösterir. Tablo hücresi dar; orada yalnız son bileşen (sınıf adı) yeter.
  const sourceShortFor = (sourceContext) => {
    if (!sourceContext) return dash
    const idx = sourceContext.lastIndexOf('.')
    return idx === -1 ? sourceContext : sourceContext.slice(idx + 1)
  }

  return {
    title: t({ tr: 'Loglar', en: 'Logs' }),
    intro: t({
      tr: 'Uygulamanın o anki operasyonel akışı — bellekteki son kayıtlar. '
        + 'Uygulama yeniden başlayınca sıfırlanır; kalıcı iz Günlük sekmesindedir.',
      en: 'The application’s current operational flow — the most recent in-memory entries. '
        + 'This resets when the application restarts; the permanent record is the Log tab.',
    }),

    loginRequired: t({ tr: 'Bu sayfa için giriş yapmalısın.', en: 'You need to sign in to see this page.' }),
    loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
    forbidden: t({
      tr: 'Bu sayfa yönetim yetkisi ister. Hesabında bu yetki yok.',
      en: 'This page requires administrator access. Your account does not have it.',
    }),
    homeLink: t({ tr: 'Ana sayfaya dön', en: 'Back to home' }),

    searchLabel: t({ tr: 'Ara', en: 'Search' }),
    searchHint: t({
      tr: 'Yazdıkça mesaj, kaynak ve yol içinde arar. Boş bırakılırsa hepsi listelenir.',
      en: 'Searches the message, source and path as you type. Leave empty to list everything.',
    }),

    levelFilterLabel: t({ tr: 'Seviye', en: 'Level' }),
    // FacetList aynı bileşen, audit'teki aile gruplaması burada yok — tek
    // düz grup: (hepsi) + iki eşik seçeneği.
    levelGroups: [
      { key: 'all', heading: null, options: [{ value: '', label: t({ tr: '(hepsi)', en: '(all)' }) }] },
      {
        key: 'level',
        heading: null,
        options: [
          { value: 'warning', label: t({ tr: 'Uyarı ve üstü', en: 'Warning and above' }), dotClass: 'warning' },
          { value: 'error', label: t({ tr: 'Hata ve üstü', en: 'Error and above' }), dotClass: 'danger' },
        ],
      },
    ],
    levelMarkClass,

    refresh: t({ tr: 'Yenile', en: 'Refresh' }),

    loading: t({ tr: 'Yükleniyor…', en: 'Loading…' }),
    empty: t({ tr: 'Tamponda kayıt yok.', en: 'The buffer is empty.' }),

    columns,

    formatDateSeconds: formatDateSecondsFor,
    sourceShort: sourceShortFor,

    // Sayfalama YOK: tampon kayan pencere, "toplam kayıt" kavramı taşımaz.
    // Bunun yerine tavanı gösteren tek satır not.
    capacityNote: (capacity) => t({
      tr: `Bellekteki son ${capacity} kaydın penceresi.`,
      en: `A window of the most recent ${capacity} in-memory entries.`,
    }),

    detailView: t({ tr: 'Görüntüle', en: 'View' }),
    detailViewAria: (message) => t({
      tr: `${message} ayrıntısını görüntüle`,
      en: `View detail of ${message}`,
    }),
    detailTitle: t({ tr: 'Log kaydı ayrıntısı', en: 'Log entry detail' }),
    detailClose: t({ tr: 'Kapat', en: 'Close' }),

    // Ayrıntı kartı: zaman/seviye/kaynak/yol/kullanıcı/mesaj HER ZAMAN gelir;
    // istisna yalnız varsa eklenir (audit/text.js → recordRows'taki
    // detailRows'un boş dönebilme deseninin aynısı).
    recordRows: (row) => {
      const rows = [
        { key: 'time', label: columns.time, value: formatDateSecondsFor(row.occurredAt) },
        { key: 'level', label: columns.level, value: row.level },
        { key: 'source', label: columns.source, value: row.sourceContext ?? dash },
        { key: 'path', label: pathLabel, value: row.requestPath ?? dash },
        { key: 'user', label: userLabel, value: row.userId ?? dash },
        { key: 'message', label: columns.message, value: row.message },
      ]
      if (row.exception) {
        rows.push({ key: 'exception', label: exceptionLabel, value: row.exception })
      }
      return rows
    },

    errorText: (res) => {
      if (!res || res.ok) return null
      if (res.error === 'network') {
        return t({
          tr: 'Sunucuya ulaşılamadı. Bağlantını kontrol et.',
          en: 'Could not reach the server. Check your connection.',
        })
      }
      switch (res.error) {
        case 'FORBIDDEN':
          return t({
            tr: 'Bu işlem için yönetim yetkisi gerekiyor.',
            en: 'This action requires administrator access.',
          })
        default:
          return t({
            tr: 'Loglar yüklenemedi. Biraz sonra tekrar dene.',
            en: 'The logs could not be loaded. Try again shortly.',
          })
      }
    },
  }
}
