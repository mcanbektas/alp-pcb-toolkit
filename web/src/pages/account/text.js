// Hesap sayfalarının (Projelerim listesi + proje detayı) iki dilli metni —
// src/pages/tools/*/text.js ile aynı desen: tek dış yüz `getText(lang)`.
// Ekranlar arası ortak gezinme metni (ana sayfaya dön vb.) burada tekrar
// yazılmaz, `data/uiText.js`'teki `commonText(lang)`'ten gelir.

import { pick } from '../../lib/i18n'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  return {
    projects: {
      title: t({ tr: 'Projelerim', en: 'My projects' }),
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
      confirmDelete: (name) => t({
        tr: `"${name}" projesi ve içindeki tüm hesaplar silinecek. Emin misin?`,
        en: `The project "${name}" and all its calculations will be deleted. Are you sure?`,
      }),
    },

    project: {
      backlink: t({ tr: '← Projelerim', en: '← My projects' }),
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
      moveUpAria: (name) => t({ tr: `${name} yukarı taşı`, en: `Move ${name} up` }),
      moveDownAria: (name) => t({ tr: `${name} aşağı taşı`, en: `Move ${name} down` }),
      deleteAria: (name) => t({ tr: `${name} hesabını sil`, en: `Delete calculation ${name}` }),
      confirmDeleteCalc: (name) => t({
        tr: `"${name}" hesabı silinecek. Emin misin?`,
        en: `The calculation "${name}" will be deleted. Are you sure?`,
      }),
      noReportTag: t({ tr: 'rapor yok', en: 'no report' }),

      reportHeading: t({ tr: 'Proje raporu', en: 'Project report' }),
      preparedByLabel: t({ tr: 'Hazırlayan', en: 'Prepared by' }),
      pdfButton: t({ tr: 'PDF indir', en: 'Download PDF' }),
      xlsxButton: t({ tr: 'Excel indir', en: 'Download Excel' }),
      working: t({ tr: 'Hazırlanıyor…', en: 'Preparing…' }),
      noSections: t({
        tr: 'Bu projede henüz raporlanabilir hesap yok — bazı araçların rapor modülü daha eklenmedi.',
        en: 'This project has no reportable calculations yet — some tools do not have a report '
          + 'module yet.',
      }),
    },

    account: {
      title: t({ tr: 'Hesabım', en: 'My account' }),
      intro: t({
        tr: 'Raporlarda görünen ad, firma ve logo burada durur. Kaydedilmiş bakır kalınlığı '
          + 'kayıtların da bu sayfadan yönetilir.',
        en: 'The name, company and logo that appear on reports live here. Your saved copper '
          + 'thickness records are managed from this page too.',
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

      logoHeading: t({ tr: 'Firma logosu', en: 'Company logo' }),
      logoHint: t({
        tr: 'PNG ya da JPEG, en çok 512 KB. Yüklenirse rapor başlığındaki varsayılan logonun '
          + 'yerine geçer.',
        en: 'PNG or JPEG, at most 512 KB. Once uploaded it replaces the default logo in the '
          + 'report header.',
      }),
      logoAlt: t({ tr: 'Yüklenmiş firma logosu', en: 'Uploaded company logo' }),
      logoEmpty: t({ tr: 'Logo yüklenmemiş — raporlar varsayılan logoyla çıkar.', en: 'No logo uploaded — reports use the default logo.' }),
      logoPick: t({ tr: 'Dosya seç', en: 'Choose a file' }),
      logoUpload: t({ tr: 'Yükle', en: 'Upload' }),
      logoUploading: t({ tr: 'Yükleniyor…', en: 'Uploading…' }),
      logoRemove: t({ tr: 'Logoyu kaldır', en: 'Remove logo' }),
      logoUploaded: t({ tr: 'Logo yüklendi.', en: 'The logo was uploaded.' }),
      logoRemoved: t({ tr: 'Logo kaldırıldı.', en: 'The logo was removed.' }),
      confirmLogoRemove: t({
        tr: 'Logo kaldırılacak; raporlar yeniden varsayılan logoyla çıkacak. Emin misin?',
        en: 'The logo will be removed and reports will use the default logo again. Are you sure?',
      }),

      recordsHeading: t({ tr: 'Kayıtlı bakır kalınlıkları', en: 'Saved copper thicknesses' }),
      recordsIntro: t({
        tr: 'Bakır Kalınlığı Dönüştürücü ekranında kaydettiklerin. Giriş yaptığında hesabına '
          + 'taşınır; çıkış yaptığında tarayıcındaki kopyayla çalışmaya devam edersin.',
        en: 'What you saved on the Copper Thickness Converter screen. They move to your account '
          + 'when you sign in; signed out, you keep working with the copy in your browser.',
      }),
      recordsEmpty: t({ tr: 'Henüz kayıt yok.', en: 'No records yet.' }),
      recordsLoading: t({ tr: 'Kayıtlar yükleniyor…', en: 'Loading records…' }),
      recordSummary: (rec) => t({
        tr: `başlangıç ${rec.starting} µm · kaplama ${rec.plating} µm · bitmiş ${rec.finished} µm`,
        en: `starting ${rec.starting} µm · plating ${rec.plating} µm · finished ${rec.finished} µm`,
      }),
      recordRemove: t({ tr: 'Sil', en: 'Delete' }),
      recordRemoveAria: (name) => t({ tr: `${name} kaydını sil`, en: `Delete record ${name}` }),
      recordRemoved: t({ tr: 'Kayıt silindi.', en: 'The record was deleted.' }),
      confirmRecordRemove: (name) => t({
        tr: `"${name}" kaydı silinecek. Emin misin?`,
        en: `The record "${name}" will be deleted. Are you sure?`,
      }),

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
