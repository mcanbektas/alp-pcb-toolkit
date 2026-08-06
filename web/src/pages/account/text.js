// Hesap sayfalarının (Projelerim listesi + proje detayı) iki dilli metni —
// src/pages/tools/*/text.js ile aynı desen: tek dış yüz `getText(lang)`.
// Ekranlar arası ortak gezinme metni (ana sayfaya dön vb.) burada tekrar
// yazılmaz, `data/uiText.js`'teki `commonText(lang)`'ten gelir.

import { pick } from '../../lib/i18n'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  return {
    projects: {
      title: t({ tr: 'Projelerim', en: 'Projects' }),
      intro: t({
        tr: 'Kaydedilen hesapları proje altında topla; her projeden tek bir rapor indir.',
        en: 'Group saved calculations under a project; download a single report per project.',
      }),
      loginRequired: t({
        tr: 'Projelerini görmek için giriş yapmalısın.',
        en: 'Sign in to see your projects.',
      }),
      loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
      loading: t({ tr: 'Projeler yükleniyor…', en: 'Loading projects…' }),
      loadError: t({ tr: 'Proje listesi yüklenemedi.', en: 'The project list could not be loaded.' }),
      empty: t({ tr: 'Henüz proje yok. Yukarıdan bir tane oluştur.', en: 'No projects yet. Create one above.' }),

      newHeading: t({ tr: 'Yeni proje', en: 'New project' }),
      nameLabel: t({ tr: 'Proje adı', en: 'Project name' }),
      namePlaceholder: t({ tr: 'örn. Güç kartı Rev B', en: 'e.g. Power board Rev B' }),
      descLabel: t({ tr: 'Açıklama (opsiyonel)', en: 'Description (optional)' }),
      descPlaceholder: t({
        tr: 'örn. 4 katmanlı güç kartı revizyonu',
        en: 'e.g. 4-layer power board revision',
      }),
      createLabel: t({ tr: '+ Proje oluştur', en: '+ Create project' }),
      creating: t({ tr: 'Oluşturuluyor…', en: 'Creating…' }),
      missingName: t({ tr: 'Proje adı boş olamaz.', en: 'The project name cannot be empty.' }),
      genericError: t({
        tr: 'Bir şeyler ters gitti. Lütfen tekrar deneyin.',
        en: 'Something went wrong. Please try again.',
      }),

      noDescription: t({ tr: 'Açıklama girilmemiş', en: 'No description' }),
      calcCount: (n) => t({
        tr: `${n} hesap`,
        en: `${n} calculation${n === 1 ? '' : 's'}`,
      }),
      updatedLabel: (d) => t({ tr: `güncelleme: ${d}`, en: `updated: ${d}` }),
      deleteLabel: t({ tr: 'Sil', en: 'Delete' }),
      deleteAria: (name) => t({ tr: `${name} projesini sil`, en: `Delete project ${name}` }),
      // Onay kartının başlığı (ConfirmDialog). Kartın gövdesi aşağıdaki
      // `confirmDelete(name)` cümlesidir; iptal düğmesinin yazısı çerçeve
      // metnidir ve `commonText(lang).cancel`'dan gelir.
      deleteTitle: t({ tr: 'Projeyi sil', en: 'Delete project' }),
      confirmDelete: (name) => t({
        tr: `"${name}" projesi ve içindeki tüm hesaplar silinecek. Emin misin?`,
        en: `The project "${name}" and all its calculations will be deleted. Are you sure?`,
      }),
    },

    project: {
      backlink: t({ tr: '← Projelerim', en: '← Projects' }),
      loginRequired: t({
        tr: 'Proje detayını görmek için giriş yapmalısın.',
        en: 'Sign in to see project details.',
      }),
      loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
      loading: t({ tr: 'Proje yükleniyor…', en: 'Loading project…' }),
      notFound: t({ tr: 'Proje bulunamadı.', en: 'Project not found.' }),
      loadError: t({ tr: 'Proje yüklenemedi.', en: 'The project could not be loaded.' }),

      nameLabel: t({ tr: 'Proje adı', en: 'Project name' }),
      descLabel: t({ tr: 'Açıklama', en: 'Description' }),
      saveLabel: t({ tr: 'Kaydet', en: 'Save' }),
      saving: t({ tr: 'Kaydediliyor…', en: 'Saving…' }),
      savedNote: t({ tr: 'Proje güncellendi.', en: 'The project was updated.' }),
      missingName: t({ tr: 'Proje adı boş olamaz.', en: 'The project name cannot be empty.' }),
      genericError: t({
        tr: 'Bir şeyler ters gitti. Lütfen tekrar deneyin.',
        en: 'Something went wrong. Please try again.',
      }),

      calcsHeading: t({ tr: 'Hesaplar', en: 'Calculations' }),
      calcsEmpty: t({
        tr: 'Bu projede henüz kaydedilmiş hesap yok.',
        en: 'This project has no saved calculations yet.',
      }),
      deleteLabel: t({ tr: 'Sil', en: 'Delete' }),
      openLabel: t({ tr: 'Aç', en: 'Open' }),
      openAria: (name) => t({
        tr: `${name} hesabını araç ekranında aç`,
        en: `Open the ${name} calculation in its tool screen`,
      }),
      // Kaydın motor sürümü uygulamanınkinden geriyse: sonuç eski bir
      // denklem/sabit kümesiyle üretilmiştir, açıp yeniden kaydetmek gerekir.
      staleTag: t({ tr: 'eski sürüm', en: 'older version' }),
      deleteAria: (name) => t({ tr: `${name} hesabını sil`, en: `Delete calculation ${name}` }),
      // Onay kartının başlığı; gövdesi `confirmDeleteCalc(name)` cümlesidir ve
      // iptal düğmesinin yazısı çerçeve metni olduğu için `uiText.js`'ten gelir.
      deleteCalcTitle: t({ tr: 'Hesabı sil', en: 'Delete calculation' }),
      confirmDeleteCalc: (name) => t({
        tr: `"${name}" hesabı silinecek. Emin misin?`,
        en: `The calculation "${name}" will be deleted. Are you sure?`,
      }),
      noReportTag: t({ tr: 'rapor yok', en: 'no report' }),

      reportHeading: t({ tr: 'Proje raporu', en: 'Project report' }),
      preparedByLabel: t({ tr: 'Hazırlayan', en: 'Prepared by' }),
      // Firma profilden dolu gelir ve düzenlenebilir; düzenleme profili
      // değiştirmez, yalnız o belgeyi etkiler. Metin ReportDialog'dakiyle aynı
      // olmak zorunda değil ama aynı sözü vermeli — iki rapor yüzeyi arasında
      // kural ayrışmasın.
      companyLabel: t({ tr: 'Firma (opsiyonel)', en: 'Company (optional)' }),
      companyHint: t({
        tr: 'Profilinden geldi. Burada değiştirmek yalnızca bu belgeyi etkiler.',
        en: 'Taken from your profile. Editing here affects this document only.',
      }),
      pdfButton: t({ tr: 'PDF indir', en: 'Download PDF' }),
      xlsxButton: t({ tr: 'Excel indir', en: 'Download Excel' }),
      working: t({ tr: 'Hazırlanıyor…', en: 'Preparing…' }),
      noSections: t({
        tr: 'Bu projede henüz raporlanabilir hesap yok — bazı araçların rapor modülü daha eklenmedi.',
        en: 'This project has no reportable calculations yet — some tools do not have a report '
          + 'module yet.',
      }),
    },

    reports: {
      title: t({ tr: 'Raporlarım', en: 'Reports' }),
      intro: t({
        tr: 'Bugüne kadar indirilen raporların kütüğü. Bir raporu tekrar indirmek '
          + 'belgeyi yeniden üretir; hangi içerikle üretileceğini satırdaki etiket söyler.',
        en: 'The log of every report downloaded so far. Downloading a report again '
          + 'reproduces the document; the tag on the row says which content it will carry.',
      }),
      loginRequired: t({
        tr: 'Raporlarını görmek için giriş yapmalısın.',
        en: 'Sign in to see your reports.',
      }),
      loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
      loading: t({ tr: 'Raporlar yükleniyor…', en: 'Loading reports…' }),
      loadError: t({ tr: 'Rapor listesi yüklenemedi.', en: 'The report list could not be loaded.' }),
      empty: t({
        tr: 'Henüz rapor yok. Bir araç ekranından ya da proje sayfasından rapor indir.',
        en: 'No reports yet. Download one from a tool screen or a project page.',
      }),

      // İki indirme davranışı aynı listede yaşıyor ve hangisinin geçerli
      // olduğu belgeden anlaşılmıyor — ayrım burada, satırın üstünde durmak
      // zorunda (docs/rapor-snapshot-karari.md §3).
      snapshotTag: t({ tr: 'o günkü içerik', en: 'content as of that day' }),
      liveTag: t({ tr: 'güncel içerikten üretilir', en: 'produced from current content' }),

      preparedByLine: (name) => t({ tr: `Hazırlayan: ${name}`, en: `Prepared by: ${name}` }),
      sizeLine: (kb) => t({ tr: `${kb} KB`, en: `${kb} KB` }),

      downloadPdf: t({ tr: 'PDF indir', en: 'Download PDF' }),
      downloadXlsx: t({ tr: 'Excel indir', en: 'Download Excel' }),
      working: t({ tr: 'Hazırlanıyor…', en: 'Preparing…' }),

      // Snapshot'sız VE kaynağı kalmamış rapor: projesi silinmiş ya da projede
      // okunabilir bölüm yok. Genel hata değil — kayıt duruyor, belge yok.
      notReproducible: t({
        tr: 'Bu raporun belgesi geri getirilemiyor: anlık görüntüsü yok ve '
          + 'üretildiği kaynak veri (proje/bölümler) artık durmuyor.',
        en: 'This report cannot be reproduced: it has no snapshot and the source '
          + 'data it was built from (project/sections) is gone.',
      }),
    },

    account: {
      title: t({ tr: 'Hesabım', en: 'Account' }),
      intro: t({
        tr: 'Raporlarda görünen ad ve firma burada durur.',
        en: 'The name and company that appear on reports live here.',
      }),
      loginRequired: t({ tr: 'Hesap bilgilerini görmek için giriş yapmalısın.', en: 'Sign in to see your account.' }),
      loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
      loading: t({ tr: 'Yükleniyor…', en: 'Loading…' }),

      profileHeading: t({ tr: 'Profil', en: 'Profile' }),
      emailLabel: t({ tr: 'E-posta', en: 'E-mail' }),
      emailHint: t({
        tr: 'E-posta adresi değiştirilemez.',
        en: 'The e-mail address cannot be changed.',
      }),
      displayNameLabel: t({ tr: 'Ad', en: 'Name' }),
      displayNameHint: t({
        tr: 'Raporun "Hazırlayan" alanında bu ad öneriliyor.',
        en: 'This name is suggested in the report\'s "Prepared by" field.',
      }),
      companyLabel: t({ tr: 'Firma (opsiyonel)', en: 'Company (optional)' }),
      companyHint: t({
        tr: 'Girilirse rapor başlığında adın altında görünür. Boş bırakılırsa alan silinir.',
        en: 'When filled, it appears under your name in the report header. Leaving it empty clears the field.',
      }),
      saveLabel: t({ tr: 'Kaydet', en: 'Save' }),
      saving: t({ tr: 'Kaydediliyor…', en: 'Saving…' }),
      profileSaved: t({ tr: 'Profil güncellendi.', en: 'Profile updated.' }),

      passwordHeading: t({ tr: 'Parola', en: 'Password' }),
      passwordIntro: t({
        tr: 'Parolanı değiştirdiğinde diğer cihazlardaki oturumların kapanır; '
          + 'bu ekranda oturumun açık kalır.',
        en: 'Changing your password signs you out on your other devices; this screen stays '
          + 'signed in.',
      }),
      currentPasswordLabel: t({ tr: 'Mevcut parola', en: 'Current password' }),
      newPasswordLabel: t({ tr: 'Yeni parola', en: 'New password' }),
      newPasswordRepeatLabel: t({ tr: 'Yeni parola (tekrar)', en: 'New password (again)' }),
      passwordSaveLabel: t({ tr: 'Parolayı değiştir', en: 'Change password' }),
      passwordSaving: t({ tr: 'Değiştiriliyor…', en: 'Changing…' }),
      passwordChanged: t({ tr: 'Parola değiştirildi.', en: 'The password was changed.' }),
      passwordMissing: t({ tr: 'Bütün alanları doldur.', en: 'Fill in every field.' }),
      passwordMismatch: t({
        tr: 'Yeni parolanın iki kopyası aynı değil.',
        en: 'The two copies of the new password do not match.',
      }),
      passwordSame: t({
        tr: 'Yeni parola mevcut parolayla aynı olamaz.',
        en: 'The new password cannot be the same as the current one.',
      }),

      // (Hesap silme metinleri kaldırıldı: kullanıcı kendi hesabını silmiyor,
      // talep yasal metinlerdeki başvuru adresine gidiyor. Yönetim panelinin
      // kendi sözlüğü ayrı: src/pages/admin/text.js.)

      // Sunucu kodları buradan cümleye çevrilir; hata yükü dilsiz gelir
      // (kod + yapısal detay), cümle bu dosyada kurulur.
      errorText: (res) => {
        if (!res || res.ok) return null
        if (res.error === 'network') {
          return t({
            tr: 'Sunucuya ulaşılamadı. Bağlantını kontrol et.',
            en: 'Could not reach the server. Check your connection.',
          })
        }
        if (res.error === 'MISSING_FIELDS' && res.detail?.field === 'displayName') {
          return t({ tr: 'Ad boş olamaz.', en: 'The name cannot be empty.' })
        }
        // Hesap silmede yanlış parola. Sunucu bunu bilerek 401 değil 400 ile
        // döner (401 oturumun düştüğü sanılıp kullanıcıyı çıkışa atardı), o
        // yüzden burada olağan bir alan hatası gibi çevrilir.
        if (res.error === 'INVALID_CREDENTIALS') {
          return t({ tr: 'Parola yanlış.', en: 'The password is incorrect.' })
        }
        if (res.error === 'TOO_LONG') {
          return t({
            tr: `Değer çok uzun (en çok ${res.detail?.max} karakter).`,
            en: `The value is too long (at most ${res.detail?.max} characters).`,
          })
        }
        if (res.error === 'FILE_TOO_LARGE') {
          return t({
            tr: `Dosya çok büyük (en çok ${Math.round((res.detail?.max ?? 0) / 1024)} KB).`,
            en: `The file is too large (at most ${Math.round((res.detail?.max ?? 0) / 1024)} KB).`,
          })
        }
        if (res.error === 'UNSUPPORTED_IMAGE' || res.error === 'INVALID_CONTENT_TYPE') {
          return t({
            tr: 'Yalnızca PNG ve JPEG kabul ediliyor.',
            en: 'Only PNG and JPEG are accepted.',
          })
        }
        return t({ tr: 'İşlem tamamlanamadı. Tekrar dene.', en: 'The operation could not be completed. Try again.' })
      },
    },
  }
}
