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

    // DetailJson yapısal ve DİLSİZDİR (docs/brifler/11-loglama.md §3): alan
    // adları ÇEVRİLMEZ, olduğu gibi "anahtar: değer" dizilir — cümle kurulmaz.
    formatDetail: (detailJson) => {
      if (!detailJson) return '—'
      let parsed
      try {
        parsed = JSON.parse(detailJson)
      } catch {
        return '—'
      }
      const entries = Object.entries(parsed ?? {})
      if (entries.length === 0) return '—'
      return entries.map(([k, v]) => `${k}: ${v}`).join(', ')
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
