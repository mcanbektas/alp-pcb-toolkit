// SaveToProject bileşeninin iki dilli metni — `data/reportText.js` ile aynı
// desen: ReportDialog nasıl metnini `reportText(lang)`'ten alıp bileşen
// dosyasında çıplak Türkçe barındırmıyorsa, SaveToProject de metnini buradan
// alır.

import { pick } from '../lib/i18n'

export function saveToProjectText(lang) {
  const t = (dict) => pick(dict, lang)
  return {
    heading: t({ tr: 'Projeye kaydet', en: 'Save to project' }),
    loginRequired: t({
      tr: 'Projeye kaydetmek için giriş yapmalısın.',
      en: 'Sign in to save to a project.',
    }),
    loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
    loadingProjects: t({ tr: 'Projeler yükleniyor…', en: 'Loading projects…' }),
    existingLabel: t({ tr: 'Mevcut proje', en: 'Existing project' }),
    existingPlaceholder: t({ tr: '— proje seç —', en: '— choose a project —' }),
    newLabel: t({ tr: 'ya da yeni proje adı', en: 'or new project name' }),
    newPlaceholder: t({ tr: 'örn. Güç kartı Rev B', en: 'e.g. Power board Rev B' }),
    saveLabel: t({ tr: 'Kaydet', en: 'Save' }),
    saving: t({ tr: 'Kaydediliyor…', en: 'Saving…' }),
    savedNote: t({ tr: 'Hesap projeye kaydedildi.', en: 'The calculation was saved to the project.' }),
    needTarget: t({
      tr: 'Bir proje seçin veya yeni bir proje adı girin.',
      en: 'Choose a project or enter a new project name.',
    }),
    loadError: t({ tr: 'Proje listesi yüklenemedi.', en: 'The project list could not be loaded.' }),
    genericError: t({
      tr: 'Kaydedilemedi. Lütfen tekrar deneyin.',
      en: 'Could not save. Please try again.',
    }),
  }
}
