// Yönetim panelinin metni. Ekranın tek dış yüzü `getText(lang)` — araç
// ekranlarındaki desenin aynısı.
//
// Sunucu hata kodları burada cümleye çevrilir: yük dilsiz gelir (kod + yapısal
// detay), cümle bu dosyada kurulur. Kod listesi AdminEndpoints.cs ile birebir.

import { pick } from '../../lib/i18n'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Tarih + saat, sayısal ve dilden bağımsız (audit ekranındaki formatDate ile
  // aynı kalıp — `admin/audit/text.js`). Buradaki `formatDate` (aşağıda) tarih
  // SÜTUNU için tarih-yalnız kalır; bu yalnızca kilit tooltip'i içindir.
  const formatDateTime = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
      + `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return {
    title: t({ tr: 'Yönetim', en: 'Administration' }),
    intro: t({
      tr: 'Kayıtlı hesapların listesi. Silme geri alınamaz: hesabın projeleri, '
        + 'kayıtlı hesapları ve rapor geçmişi de gider.',
      en: 'Registered accounts. Deletion cannot be undone: the account’s projects, '
        + 'saved calculations and report history go with it.',
    }),

    // Yetki kapısı. İki ayrı durum, iki ayrı cümle: oturum yoksa giriş
    // gerekiyor, oturum varken rol yoksa sayfa bu kullanıcıya kapalı.
    loginRequired: t({
      tr: 'Bu sayfa için giriş yapmalısın.',
      en: 'You need to sign in to see this page.',
    }),
    loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
    forbidden: t({
      tr: 'Bu sayfa yönetim yetkisi ister. Hesabında bu yetki yok.',
      en: 'This page requires administrator access. Your account does not have it.',
    }),
    homeLink: t({ tr: 'Ana sayfaya dön', en: 'Back to home' }),

    searchLabel: t({ tr: 'Ara', en: 'Search' }),
    searchHint: t({
      tr: 'Yazdıkça e-posta adresinde ve görünen adda arar. Boş bırakılırsa hepsi listelenir.',
      en: 'Searches the email address and the display name as you type. Leave empty to list everyone.',
    }),

    loading: t({ tr: 'Yükleniyor…', en: 'Loading…' }),
    empty: t({ tr: 'Kayıt bulunamadı.', en: 'No accounts found.' }),

    // Sütunlar bilerek AZ: dokuz alan tek satıra dizilince tablo dar ekranda
    // taşıyordu ve göz hangi bilginin önemli olduğunu seçemiyordu. Alanlar
    // ikişerli gruplanıp hücre içinde iki satıra indi — DFM tablolarındaki
    // desenin aynısı (ana değer + `.sub` alt satır).
    columns: {
      status: t({ tr: 'Durum', en: 'Status' }),
      account: t({ tr: 'Hesap', en: 'Account' }),
      usage: t({ tr: 'Kullanım', en: 'Usage' }),
      createdAt: t({ tr: 'Kayıt', en: 'Registered' }),
      actions: t({ tr: 'İşlem', en: 'Action' }),
    },

    confirmedYes: t({ tr: 'Doğrulandı', en: 'Confirmed' }),
    confirmedNo: t({ tr: 'Doğrulanmadı', en: 'Not confirmed' }),

    // Kilit rozeti YALNIZ hesap gerçekten kilitliyken basılır (sunucu ham
    // `lockoutEnd` verir, "kilitli mi" istemcide `lockoutEnd > şu an` ile
    // türetilir — bkz. Contracts.cs → AdminUserRow yorumu). `confirmedNo`'nun
    // aksine "kilitli değil" hâli YOK: satırda hiçbir şey basılmaz.
    lockedBadge: t({ tr: 'Kilitli', en: 'Locked' }),
    // Rozetin title tooltip'i — "ne zaman açılacak" bilgisini taşır.
    lockedUntil: (iso) => t({
      tr: `${formatDateTime(iso)} tarihine kadar kilitli`,
      en: `Locked until ${formatDateTime(iso)}`,
    }),

    // Kilit açma düğmesi — badge'in yanında, YALNIZ kilitliyken çizilir.
    // Parola istemez (yanlış kilitlenmeyi düzeltmek için var, sürtünme
    // gerekmiyor — ChangePlan'daki gerekçenin aynısı) ve onay kartı yok.
    unlockLabel: t({ tr: 'Kilidi aç', en: 'Unlock' }),
    unlockAria: (email) => t({
      tr: `${email} hesabının kilidini aç`,
      en: `Unlock the account ${email}`,
    }),
    unlocked: (email) => t({
      tr: `${email} hesabının kilidi açıldı.`,
      en: `The account ${email} has been unlocked.`,
    }),

    // "Alp Test · ALP PCB Ltd." — firma yoksa yalnız ad. Ayırıcı orta nokta:
    // tire tarih alanıyla, eğik çizgi de yol gösterimiyle karışıyordu.
    accountMeta: (displayName, company) =>
      (company ? `${displayName} · ${company}` : displayName),

    // "2 proje · 5 rapor" — sıfır da yazılır, boş bırakılmaz: boş hücre
    // "veri yok" gibi okunurdu, oysa sayı gerçekten sıfır.
    usageText: (projects, reports) => t({
      tr: `${projects} proje · ${reports} rapor`,
      en: `${projects} projects · ${reports} reports`,
    }),

    adminBadge: t({ tr: 'Yönetici', en: 'Administrator' }),
    // Yöneticiler listede görünür ama silinemez; düğme yerine bu yazı durur.
    // Gerekçe kullanıcıya da söylenir, yoksa düğmenin yokluğu hata sanılır.
    adminNotDeletable: t({
      tr: 'Yönetici hesabı panelden silinemez',
      en: 'Administrator accounts cannot be deleted here',
    }),

    // Tarih yerel biçimde ama SABİT bir kalıpla: gün-ay-yıl sırası dile göre
    // değişse de sütun genişliği değişmesin diye sayısal biçim seçildi.
    formatDate: (iso) => {
      if (!iso) return '—'
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return '—'
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    },

    // Plan değişimi (free ↔ pro) — parola istemez, DeleteUser'dan farklı risk
    // sınıfı (geri alınabilir). İki küçük düğme mevcut değeri de gösterir:
    // geçerli olan devre dışıdır, yalnız öteki tıklanabilir — segment seçici
    // gibi okunur ama `.row-add` deseninin dışına çıkmaz (yeni CSS yok).
    // `plan` kelimesi iki dilde de aynı yazılır (Türkçede de ödünç sözcük).
    plan: t({ tr: 'Plan', en: 'Plan' }),
    planMakeFree: t({ tr: 'Free yap', en: 'Make Free' }),
    planMakePro: t({ tr: 'Pro yap', en: 'Make Pro' }),
    planMakeFreeAria: (email) => t({
      tr: `${email} hesabını Free yap`,
      en: `Make ${email} Free`,
    }),
    planMakeProAria: (email) => t({
      tr: `${email} hesabını Pro yap`,
      en: `Make ${email} Pro`,
    }),
    // Plan değerinin kendisi ÇEVRİLMEZ — satırdaki ham `row.plan` ile aynı
    // gerekçe (yukarıdaki yorum): bilinmeyen bir değer geldiğinde de teşhis
    // edilebilir kalsın diye olduğu gibi basılır.
    planChanged: (email, plan) => t({
      tr: `${email} hesabının planı ${plan} oldu.`,
      en: `${email}'s plan is now ${plan}.`,
    }),

    deleteLabel: t({ tr: 'Sil', en: 'Delete' }),
    // Satırda düğmenin yazısı yalnız "Sil"; ekran okuyucu hangi satırda
    // olduğunu göremez, o yüzden erişilebilir ad hesabı da söyler.
    deleteAria: (email) => t({ tr: `${email} hesabını sil`, en: `Delete the account ${email}` }),
    deleting: t({ tr: 'Siliniyor…', en: 'Deleting…' }),
    deleteTitle: t({ tr: 'Hesap silinsin mi?', en: 'Delete this account?' }),
    // Onay metni HANGİ hesabın gideceğini adıyla söyler: listede yanlış satıra
    // basmak kolaydır ve işlem geri alınamaz.
    deleteConfirm: (email) => t({
      tr: `${email} hesabı ve ona bağlı bütün projeler, kayıtlı hesaplar ve raporlar `
        + 'kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      en: `The account ${email} and all of its projects, saved calculations and reports `
        + 'will be permanently deleted. This cannot be undone.',
    }),
    deletePasswordLabel: t({ tr: 'Kendi parolanı doğrula', en: 'Confirm your own password' }),
    deletePasswordHint: t({
      tr: 'Silinen hesabın değil, senin parolan.',
      en: 'Your password, not the password of the account being deleted.',
    }),
    deletePasswordMissing: t({
      tr: 'Silmeyi onaylamak için parolanı gir.',
      en: 'Enter your password to confirm the deletion.',
    }),
    deleted: (email) => t({
      tr: `${email} hesabı silindi.`,
      en: `The account ${email} has been deleted.`,
    }),

    pagePrev: t({ tr: 'Önceki', en: 'Previous' }),
    pageNext: t({ tr: 'Sonraki', en: 'Next' }),
    // "1–25 / 132" — sayı biçimi iki dilde de aynı (num.js kuralı).
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
        case 'INVALID_CREDENTIALS':
          return t({ tr: 'Parola yanlış.', en: 'That password is not correct.' })
        case 'MISSING_FIELDS':
          return t({ tr: 'Parola alanı boş.', en: 'The password field is empty.' })
        case 'FORBIDDEN':
          return t({
            tr: 'Bu işlem için yönetim yetkisi gerekiyor.',
            en: 'This action requires administrator access.',
          })
        case 'SELF_DELETE':
          return t({
            tr: 'Kendi hesabını buradan silemezsin.',
            en: 'You cannot delete your own account here.',
          })
        case 'ADMIN_TARGET':
          return t({
            tr: 'Yönetici hesabı silinemez. Önce yetkiyi sunucu ayarından kaldır.',
            en: 'Administrator accounts cannot be deleted. Remove the role in the server '
              + 'configuration first.',
          })
        case 'NOT_FOUND':
          return t({
            tr: 'Hesap bulunamadı. Liste güncel olmayabilir.',
            en: 'Account not found. The list may be out of date.',
          })
        case 'INVALID_PLAN':
          return t({
            tr: 'Geçersiz plan değeri.',
            en: 'That plan value is not valid.',
          })
        default:
          return t({
            tr: 'İşlem tamamlanamadı. Biraz sonra tekrar dene.',
            en: 'The action could not be completed. Try again shortly.',
          })
      }
    },
  }
}
