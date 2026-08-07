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
  'admin.user-deleted': { tr: 'Hesap silindi (yönetici)', en: 'Account deleted (admin)' },
  'admin.role-granted': { tr: 'Yönetim yetkisi verildi', en: 'Administrator role granted' },
  'admin.role-revoked': { tr: 'Yönetim yetkisi alındı', en: 'Administrator role revoked' },
  'admin.plan-changed': { tr: 'Plan değiştirildi (yönetici)', en: 'Plan changed (admin)' },
}

// DetailJson alan adı → etiket sözlüğü. Kaynak, AuditLog.Write*Async
// çağrılarına GERÇEKTEN geçirilen detail nesneleridir (JsonSerializerDefaults.Web
// → camelCase):
//   failedCount               → AuthEndpoints.cs Login (auth.lockout)
//   projectCount, reportCount → AccountDeletion.cs DeleteAsync (admin.user-deleted)
//   fromPlan, toPlan          → AdminEndpoints.cs ChangePlan (admin.plan-changed)
// DetailJson'un kendisi yapısal ve dilsiz kalır (docs/brifler/11-loglama.md §3);
// çeviri yalnız bu ekranın kartında yapılır. Sözlükte olmayan anahtar ham
// adıyla düşer — sessizce kaybolmaz (bilinmeyen olay koduyla aynı kural).
const DETAIL_LABELS = {
  failedCount: { tr: 'Başarısız giriş denemesi', en: 'Failed sign-in attempts' },
  projectCount: { tr: 'Silinen proje sayısı', en: 'Projects deleted' },
  reportCount: { tr: 'Silinen rapor sayısı', en: 'Reports deleted' },
  fromPlan: { tr: 'Önceki plan', en: 'Previous plan' },
  toPlan: { tr: 'Yeni plan', en: 'New plan' },
}

// Olay kodunun öneki renk sınıfını belirler. CSS sınıfları `.result-table
// .mark` altında hazır (ok/warning/danger/unknown) — Kullanıcılar ekranındaki
// doğrulama imiyle aynı sözlük.
function markClassFor(code) {
  if (code.startsWith('admin.')) return 'danger'
  if (code.startsWith('auth.')) return 'warning'
  if (code.startsWith('account.')) return 'ok'
  return 'unknown'
}

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

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
    eventAll: t({ tr: '(hepsi)', en: '(all)' }),
    eventOptions: Object.keys(EVENT_LABELS).map((code) => ({ value: code, label: t(EVENT_LABELS[code]) })),
    // Bilinmeyen kod ham hâliyle döner: sessiz boşluk yerine teşhis edilebilir
    // bir değer (`text.js` desenindeki genel kural — `pick` de eksik çeviride
    // aynı gerekçeyle Türkçeye düşer, burada düşecek ikinci dil yok).
    eventText: (code) => (EVENT_LABELS[code] ? t(EVENT_LABELS[code]) : code),
    eventMarkClass: markClassFor,

    loading: t({ tr: 'Yükleniyor…', en: 'Loading…' }),
    empty: t({ tr: 'Kayıt bulunamadı.', en: 'No events found.' }),

    columns: {
      time: t({ tr: 'Zaman', en: 'Time' }),
      event: t({ tr: 'Olay', en: 'Event' }),
      actor: t({ tr: 'Yapan', en: 'Actor' }),
      target: t({ tr: 'Hedef', en: 'Target' }),
      detail: t({ tr: 'Ayrıntı', en: 'Detail' }),
    },

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

    // Ayrıntı kartı: tablo hücresine ham JSON basılmaz, kartta etiket–değer
    // satırları gösterilir. Hücre düğmesi yalnız satır varken çizilir — boş,
    // bozuk ya da alansız DetailJson boş dizi döner ve hücre boş kalır.
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
    detailRows: (detailJson) => {
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
    },

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
