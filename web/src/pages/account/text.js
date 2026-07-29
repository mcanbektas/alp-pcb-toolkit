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
  }
}
