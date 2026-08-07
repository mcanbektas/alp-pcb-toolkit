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
  const requestIdLabel = t({ tr: 'İstek kimliği', en: 'Request ID' })

  // F2 — ayrıntı zenginleştirme (docs/brifler/14-loglama-altyapi.md §3).
  // Sunucudan HAM property adı gelir (`LogBufferSink.BuildProperties`).
  // Sık görülen birkaçı iki dilli etikete çevrilir; bilinmeyen ad ÇEVRİLMEZ,
  // ham basılır — teknik anahtarın kendisi zaten teşhis bilgisidir.
  const KNOWN_PROPERTY_LABELS = {
    StatusCode: { tr: 'Durum kodu', en: 'Status code' },
    Elapsed: { tr: 'Süre (ms)', en: 'Duration (ms)' },
    RequestMethod: { tr: 'Yöntem', en: 'Method' },
    ClientIp: { tr: 'İstemci IP', en: 'Client IP' },
  }
  const propertyLabelFor = (key) => (KNOWN_PROPERTY_LABELS[key] ? t(KNOWN_PROPERTY_LABELS[key]) : key)

  // Sunucu SourceContext'i TAM nitelikli sınıf adıyla döner (örn.
  // "Microsoft.AspNetCore.HttpsPolicy.HttpsRedirectionMiddleware") — arama
  // ve teşhis için gereken tam bilgi budur, ayrıntı kartı bunu OLDUĞU GİBİ
  // gösterir. Tablo hücresi dar; orada yalnız son bileşen (sınıf adı) yeter.
  const sourceShortFor = (sourceContext) => {
    if (!sourceContext) return dash
    const idx = sourceContext.lastIndexOf('.')
    return idx === -1 ? sourceContext : sourceContext.slice(idx + 1)
  }

  // Aşağıdaki iki fonksiyon return nesnesinden ÖNCE tanımlanır: hem panelin
  // kendisi hem F3'ün kopyalama metni ÜRETİCİLERİ (copyableText/rowsToTsv)
  // aynı satır tanımını kullanır — iki kopya mantık açılmasın.
  const recordRowsFor = (row) => [
    { key: 'time', label: columns.time, value: formatDateSecondsFor(row.occurredAt) },
    { key: 'level', label: columns.level, value: row.level },
    { key: 'source', label: columns.source, value: row.sourceContext ?? dash },
    { key: 'path', label: pathLabel, value: row.requestPath ?? dash },
    { key: 'user', label: userLabel, value: row.userId ?? dash },
    { key: 'requestId', label: requestIdLabel, value: row.requestId ?? dash },
    { key: 'message', label: columns.message, value: row.message },
  ]
  const propertyRowsFor = (row) => Object.entries(row.properties ?? {})
    .map(([key, value]) => ({ key, label: propertyLabelFor(key), value }))

  const propertiesTitleText = t({ tr: 'Özellikler', en: 'Properties' })
  const exceptionTitleText = t({ tr: 'İstisna', en: 'Exception' })
  // Tavanın SAYISI (sink'te 24) BİLEREK burada tekrarlanmaz — uç bunu
  // taşımıyor, iki ayrı yerde aynı sabiti elle senkron tutmak ("24" burada,
  // `MaxProperties` sink'te) review'da gereksiz risk olarak işaretlendi.
  const truncatedPropertyNoteFor = (count) => t({
    tr: `+${count} özellik daha (tavan aşıldı, gösterilmiyor).`,
    en: `+${count} more properties (over the cap, not shown).`,
  })

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
      tr: 'Yazdıkça mesaj, kaynak, yol ve istek kimliğinde arar. Boş bırakılırsa hepsi listelenir.',
      en: 'Searches the message, source, path and request ID as you type. Leave empty to list everything.',
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
    // Sekme arka plandayken zamanlayıcı tamamen durur (döngü kurulmaz) —
    // etiket bunu "sekme aktifken" diye açık söyler, sessiz bir varsayım
    // bırakmaz.
    autoRefreshLabel: t({
      tr: 'Otomatik yenile (5 sn, sekme aktifken)',
      en: 'Auto-refresh (5s, while tab is active)',
    }),

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

    // Ayrıntı kartının üst bloğu: zaman/seviye/kaynak/yol/kullanıcı/istek
    // kimliği/mesaj HER ZAMAN gelir. İstisna ve özellikler ARTIK burada
    // DEĞİL — F2'de ayrı bölümlere taşındı (aşağıda), tek `.result-table`
    // uzun bir istisna metniyle okunmaz hâle gelmesin diye.
    recordRows: recordRowsFor,

    // F2 — "Özellikler" bölümü. Sunucu sözlüğü ZATEN alfabetik sıralı
    // döner (LogBufferSink.BuildProperties); burada yeniden sıralanmaz.
    propertiesTitle: propertiesTitleText,
    propertyRows: propertyRowsFor,
    // Tavan aşıldıysa şeffaf not — sessiz kırpma YOK (aynı gerekçe:
    // `capacityNote`, tamponun kendi tavanı için de var).
    truncatedPropertyNote: truncatedPropertyNoteFor,

    // F2 — "İstisna" bölümü. Artık TAM metin (brif 12'nin "yalnız ilk
    // satır" kararının bilinçli revizyonu, docs/brifler/14-loglama-
    // altyapi.md §3) — kart içinde kaydırılabilir `pre` akışında gösterilir.
    exceptionTitle: exceptionTitleText,

    // F3 — kopyalama (docs/brifler/14-loglama-altyapi.md §4). Ayrıntı
    // kartının TAMAMINI `Etiket: değer` düz metin bloğu olarak üretir —
    // üst blok + özellikler (varsa) + tam istisna (varsa). Kart ne
    // gösteriyorsa metin de AYNI kaynaktan (`recordRowsFor`/`propertyRowsFor`)
    // çıkar, ikinci bir kopya mantık açılmaz.
    copyableText: (row) => {
      const lines = recordRowsFor(row).map((r) => `${r.label}: ${r.value}`)
      const propRows = propertyRowsFor(row)
      if (propRows.length > 0) {
        lines.push('', `${propertiesTitleText}:`)
        for (const r of propRows) lines.push(`${r.label}: ${r.value}`)
        // Review bulgusu: kart bu notu gösteriyor (kartın kendisi "sessiz
        // kırpma YOK" sözü veriyor) — kopya da AYNI sözü tutmalı, yoksa
        // yapıştırılan blok eksiksizmiş gibi görünür.
        if (row.truncatedPropertyCount > 0) lines.push(truncatedPropertyNoteFor(row.truncatedPropertyCount))
      }
      if (row.exception) {
        lines.push('', `${exceptionTitleText}:`, row.exception)
      }
      return lines.join('\n')
    },
    copyDetail: t({ tr: 'Kopyala', en: 'Copy' }),
    copyDetailDone: t({ tr: 'Kopyalandı', en: 'Copied' }),
    copyFailed: t({ tr: 'Kopyalanamadı — panoya erişim engellendi.', en: 'Could not copy — clipboard access blocked.' }),

    // F3 — "Görünen satırları kopyala". O an süzülü listeyi (otomatik
    // yenilemenin en son çektiği hâliyle) TSV olarak basar: editöre/
    // e-tabloya yapıştırılabilir, grep'lenebilir. Zaman ISO (ekrandaki
    // biçimlendirilmiş hâli DEĞİL) — makine tarafı sıralanabilir kalsın.
    // Kaynak TAM ad (kısaltılmış tablo hücresi değil, teşhis için).
    // Mesaj/kaynakta sekme ya da satır sonu VARSA boşluğa indirgenir —
    // yoksa tek bir hücre TSV'yi bozar, sonraki sütunlar kayar. Çift tırnak
    // BİLEREK kaçışlanmıyor (review'da soruldu): Excel'in pano ayrıştırıcısı
    // tek bir `"` gören satırda sonraki sütunları birleştirebilir, ama
    // kaçışlamak "abc" → "abc"'yi bozar ve bu özelliğin asıl amacını
    // (grep'lenebilir, editöre yapıştırılabilir düz metin) deler. Gerçek
    // saldırı yüzeyi (formül enjeksiyonu `=`/`+`/`-`/`@`) panoya kopyada
    // değil, DOSYA indirmede başlar — burası o değil.
    rowsToTsv: (rows) => {
      const clean = (v) => String(v ?? '').replace(/[\t\r\n]+/g, ' ')
      return rows
        .map((r) => [r.occurredAt, r.level, r.sourceContext, r.message].map(clean).join('\t'))
        .join('\n')
    },
    copyVisible: t({ tr: 'Görünen satırları kopyala', en: 'Copy visible rows' }),
    copyVisibleDone: t({ tr: 'Kopyalandı', en: 'Copied' }),

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
