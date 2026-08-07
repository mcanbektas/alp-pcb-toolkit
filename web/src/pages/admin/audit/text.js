// Günlük (denetim izi) ekranının metni. Ekranın tek dış yüzü `getText(lang)` —
// Kullanıcılar ekranındaki (../text.js) desenin aynısı.
//
// Olay kodu → cümle sözlüğü burada kurulur; sunucu (AdminEndpoints.ListAudit)
// ham kod döner, iki dillilik sunucuya taşınmaz. Kod listesi
// Alp.Api/Auth/AuditLog.cs → AuditEventCodes ile birebir.

import { pick } from '../../../lib/i18n'

const EVENT_LABELS = {
  'account.registered': { tr: 'Hesap oluşturuldu', en: 'Account registered' },
  'account.email-confirmed': { tr: 'E-posta doğrulandı', en: 'E-mail confirmed' },
  'auth.password-changed': { tr: 'Parola değiştirildi', en: 'Password changed' },
  'auth.password-reset': { tr: 'Parola sıfırlandı', en: 'Password reset' },
  'auth.lockout': { tr: 'Hesap kilitlendi', en: 'Account locked out' },
  // Kilidin KULLANICI tarafından temizlenmesi (postadaki bağlantı ya da parola
  // sıfırlama) — `admin.lockout-cleared` ile KARIŞTIRILMAMALI, o yönetim
  // panelinden açmanın ayrı kodu. İkisi de `markClassFor`da `ok`: kilidin
  // açılması olumlu bir sonuçtur, rengi kimin açtığını değil SONUCU anlatır
  // (bkz. markClassFor üstündeki not).
  'auth.lockout-cleared': { tr: 'Kilit açıldı', en: 'Lockout cleared' },
  'admin.user-deleted': { tr: 'Hesap silindi (yönetici)', en: 'Account deleted (admin)' },
  'admin.role-granted': { tr: 'Yönetim yetkisi verildi', en: 'Administrator role granted' },
  'admin.role-revoked': { tr: 'Yönetim yetkisi alındı', en: 'Administrator role revoked' },
  'admin.plan-changed': { tr: 'Plan değiştirildi (yönetici)', en: 'Plan changed (admin)' },
  'admin.lockout-cleared': { tr: 'Kilit açıldı (yönetici)', en: 'Lockout cleared (admin)' },
}

// DetailJson alan adı → etiket sözlüğü. Kaynak, AuditLog.Write*Async
// çağrılarına GERÇEKTEN geçirilen detail nesneleridir (JsonSerializerDefaults.Web
// → camelCase):
//   failedCount               → AuthEndpoints.cs Login (auth.lockout)
//   projectCount, reportCount → AccountDeletion.cs DeleteAsync (admin.user-deleted)
//   fromPlan, toPlan          → AdminEndpoints.cs ChangePlan (admin.plan-changed)
//   previousLockoutEnd       → AdminEndpoints.cs UnlockUser (admin.lockout-cleared)
//                               ve AuthEndpoints.cs Unlock/ResetPassword (auth.lockout-cleared)
//   via                       → AuthEndpoints.cs Unlock/ResetPassword (auth.lockout-cleared)
// DetailJson'un kendisi yapısal ve dilsiz kalır (docs/brifler/11-loglama.md §3);
// çeviri yalnız bu ekranın kartında yapılır. Sözlükte olmayan anahtar ham
// adıyla düşer — sessizce kaybolmaz (bilinmeyen olay koduyla aynı kural).
// `via` bir ENUM'DUR (`unlock-link` | `password-reset`) ama DEĞERİ yine de
// çevrilmez — yalnız alan ADI (`label`) çevrilir. `plan` (free/pro) alanının
// nasıl gösterildiğiyle AYNI kural: `detailRows` her değeri `String(value)`
// ile ham basar, ikinci bir değer-çeviri katmanı yoktur.
const DETAIL_LABELS = {
  failedCount: { tr: 'Başarısız giriş denemesi', en: 'Failed sign-in attempts' },
  projectCount: { tr: 'Silinen proje sayısı', en: 'Projects deleted' },
  reportCount: { tr: 'Silinen rapor sayısı', en: 'Reports deleted' },
  fromPlan: { tr: 'Önceki plan', en: 'Previous plan' },
  toPlan: { tr: 'Yeni plan', en: 'New plan' },
  previousLockoutEnd: { tr: 'Önceki kilit açılma tarihi', en: 'Previous lockout expiry' },
  via: { tr: 'Açılma yöntemi', en: 'Unlock method' },
}

// Olay kodu → renk sınıfı. ÖNEKTEN DEĞİL, olayın NİTELİĞİNDEN gelir: önek
// yalnızca kimin (hesap/kimlik akışı/yönetici) yaptığını söyler, "başarılı mı
// tehlikeli mi" sorusuna cevap vermez — bir yönetici kilidi AÇARSA (olumlu)
// bu önceki (önek-bazlı) tasarımda hesap SİLMESİYLE (yıkıcı) aynı kırmızıyı
// alıyordu. CSS sınıfları `.result-table .mark` altında hazır
// (ok/warning/danger/unknown) — Kullanıcılar ekranındaki doğrulama imiyle
// aynı sözlük. Sözlükte olmayan (yeni eklenip buraya işlenmemiş) kod sessizce
// yeşile düşmez, `unknown` olur — aşağıdaki bekçi testi kapsamı denetler.
const OK_CODES = new Set([
  'account.registered',
  'account.email-confirmed',
  'auth.password-changed',
  'auth.lockout-cleared',
  'admin.lockout-cleared',
])
const WARNING_CODES = new Set([
  'auth.password-reset',
  'admin.role-granted',
  'admin.role-revoked',
  'admin.plan-changed',
])
const DANGER_CODES = new Set([
  'auth.lockout',
  'admin.user-deleted',
])

function markClassFor(code) {
  if (OK_CODES.has(code)) return 'ok'
  if (WARNING_CODES.has(code)) return 'warning'
  if (DANGER_CODES.has(code)) return 'danger'
  return 'unknown'
}

// Olay kodunun aile öneki (`account`/`auth`/`admin`) → facet listesindeki
// grup başlığı. Bu gruplama KİMİN yaptığını sorar (hesap/kimlik akışı/
// yönetici); nokta rengi (`markClassFor`) SONUCUN niteliğini sorar — ikisi
// bilerek farklı eksenler, aynı grupta yeşil de kırmızı da nokta görünebilir.
// Önek dördüncüsü (bilinmeyen) olmaz çünkü EVENT_LABELS'taki her kod bu
// üçünden biriyle başlar (aşağıdaki bekçi testi bunu doğrular).
const GROUP_HEADINGS = {
  account: { tr: 'Hesap', en: 'Account' },
  auth: { tr: 'Kimlik', en: 'Identity' },
  admin: { tr: 'Yönetim', en: 'Administration' },
}

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const eventAllLabel = t({ tr: '(hepsi)', en: '(all)' })
  const eventTextFor = (code) => (EVENT_LABELS[code] ? t(EVENT_LABELS[code]) : code)
  const columns = {
    time: t({ tr: 'Zaman', en: 'Time' }),
    event: t({ tr: 'Olay', en: 'Event' }),
    actor: t({ tr: 'Yapan', en: 'Actor' }),
    target: t({ tr: 'Hedef', en: 'Target' }),
    detail: t({ tr: 'Ayrıntı', en: 'Detail' }),
  }
  const recordIdLabel = t({ tr: 'Kayıt no', en: 'Record ID' })
  const dash = '—'
  const formatDateSecondsFor = (iso) => {
    if (!iso) return dash
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return dash
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
      + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  const detailRowsFor = (detailJson) => {
    if (!detailJson) return []
    let parsed
    try {
      parsed = JSON.parse(detailJson)
    } catch {
      return []
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return []
    return Object.entries(parsed).map(([key, value]) => ({
      key,
      label: DETAIL_LABELS[key] ? t(DETAIL_LABELS[key]) : key,
      value: value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value),
    }))
  }

  return {
    title: t({ tr: 'Günlük', en: 'Audit log' }),
    intro: t({
      tr: 'Yönetim panelinde ve kimlik akışlarında yapılan işlemlerin kalıcı izi. '
        + 'Bu liste yalnızca okunur — hiçbir satır elle değiştirilmez ya da silinmez.',
      en: 'A permanent record of actions taken in the admin panel and identity flows. '
        + 'This list is read-only — no row is edited or deleted by hand.',
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
      tr: 'Yazdıkça yapan ve hedef e-posta adresinde arar. Boş bırakılırsa hepsi listelenir.',
      en: 'Searches the actor and target e-mail address as you type. Leave empty to list everyone.',
    }),

    eventFilterLabel: t({ tr: 'Olay türü', en: 'Event type' }),
    // Facet listesi (`FacetList`) için aileleştirilmiş seçenekler. İlk grup
    // başlıksız tek satır ("hepsi", value: ''); sonrakiler `EVENT_LABELS`teki
    // kod sırasına göre (account → auth → admin) kendiliğinden oluşur — kod
    // eklendiğinde burada elle bir şey güncellenmez.
    eventGroups: (() => {
      const order = []
      const byPrefix = new Map()
      for (const code of Object.keys(EVENT_LABELS)) {
        const prefix = code.split('.')[0]
        if (!byPrefix.has(prefix)) {
          byPrefix.set(prefix, [])
          order.push(prefix)
        }
        byPrefix.get(prefix).push({ value: code, label: t(EVENT_LABELS[code]), dotClass: markClassFor(code) })
      }
      return [
        { key: 'all', heading: null, options: [{ value: '', label: eventAllLabel }] },
        ...order.map((prefix) => ({
          key: prefix,
          heading: GROUP_HEADINGS[prefix] ? t(GROUP_HEADINGS[prefix]) : prefix,
          options: byPrefix.get(prefix),
        })),
      ]
    })(),
    // Bilinmeyen kod ham hâliyle döner: sessiz boşluk yerine teşhis edilebilir
    // bir değer (`text.js` desenindeki genel kural — `pick` de eksik çeviride
    // aynı gerekçeyle Türkçeye düşer, burada düşecek ikinci dil yok).
    eventText: eventTextFor,
    eventMarkClass: markClassFor,

    loading: t({ tr: 'Yükleniyor…', en: 'Loading…' }),
    empty: t({ tr: 'Kayıt bulunamadı.', en: 'No events found.' }),

    columns,

    // Kullanıcılar ekranındaki tarih biçiminin (yalnız gün) üstüne saat:dakika
    // eklenir — denetim izinde ne zaman sorusu dakika hassasiyeti ister.
    // Sayısal ve dile göre değişmez (num.js kuralıyla aynı gerekçe).
    formatDate: (iso) => {
      if (!iso) return '—'
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return '—'
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
        + `${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    // Ayrıntı kartındaki tam zaman — tablo hücresi dakikada durur (satırları
    // ayırt etmek yeter), kart saniyeye iner: iki olay aynı dakikada
    // düşebilir ve kart "hangisi bu" sorusuna cevap vermeli.
    formatDateSeconds: formatDateSecondsFor,

    // Ayrıntı kartı: tablo hücresine ham JSON basılmaz, kartta etiket–değer
    // satırları gösterilir. Düğme HER satırda çizilir (`recordRows` hiçbir
    // zaman boş dönmez — bkz. aşağıdaki not); DetailJson'suz bir olayda kart
    // yine de "ne, kim, ne zaman, hangi kayıt" sorularına cevap verir.
    detailView: t({ tr: 'Görüntüle', en: 'View' }),
    detailViewAria: (event) => t({
      tr: `${event} ayrıntısını görüntüle`,
      en: `View detail of ${event}`,
    }),
    detailTitle: t({ tr: 'Olay ayrıntısı', en: 'Event detail' }),
    detailClose: t({ tr: 'Kapat', en: 'Close' }),

    // Bilinen alan adı DETAIL_LABELS'tan çevrilir; bilinmeyen ham adıyla ama
    // yine etiket–değer satırı olarak düşer (sessiz boşluk yerine teşhis
    // edilebilir değer — eventText ile aynı kural). Değer cümleye KURULMAZ:
    // sayı sayı olarak basılır (docs/brifler/11-loglama.md §3).
    detailRows: detailRowsFor,

    // Ayrıntı kartının TAM içeriği: satırın yapısal kaydı (zaman, olay,
    // yapan, hedef, kayıt no) + varsa `detailRows`. Çoğu olayda ikinci grup
    // boştur (docs/brifler/11-loglama.md §3 — detay yalnız gerçekten bilgi
    // taşıyorsa sunucuda yazılır) ama İLK grup hiçbir zaman boş değildir; bu
    // yüzden "Görüntüle" düğmesi artık her satırda çizilir, DetailJson'a
    // bakılmaz (bkz. `pages/admin/audit/index.jsx`). Olay hücresi ham kodu da
    // taşır (`kod (event.code)`): tablo yalnız çeviriyi gösteriyor, kart
    // destek/loglarla eşleştirmek için tam kodu da versin diye.
    recordRows: (row) => [
      { key: 'time', label: columns.time, value: formatDateSecondsFor(row.occurredAt) },
      { key: 'event', label: columns.event, value: `${eventTextFor(row.event)} (${row.event})` },
      { key: 'actor', label: columns.actor, value: row.actorEmail ?? dash },
      { key: 'target', label: columns.target, value: row.targetEmail ?? dash },
      { key: 'id', label: recordIdLabel, value: String(row.id) },
      ...detailRowsFor(row.detailJson),
    ],

    pagePrev: t({ tr: 'Önceki', en: 'Previous' }),
    pageNext: t({ tr: 'Sonraki', en: 'Next' }),
    pageStatus: (from, to, total) => t({
      tr: `${from}–${to} / ${total} kayıt`,
      en: `${from}–${to} of ${total}`,
    }),

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
            tr: 'Günlük yüklenemedi. Biraz sonra tekrar dene.',
            en: 'The log could not be loaded. Try again shortly.',
          })
      }
    },
  }
}
