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

    // ---- Bağlı kayıt (ekran kaydedilmiş bir hesaba bağlıyken) ----
    // Ekran bir kayda bağlıysa "Kaydet" yeni satır AÇMAZ, mevcut satırın
    // üzerine yazar; kopya kayıt böylece oluşmaz.
    boundNote: (project) => t({
      tr: `Bu ekran "${project}" projesindeki bir kayda bağlı.`,
      en: `This screen is linked to a calculation in "${project}".`,
    }),
    updateLabel: t({ tr: 'Kaydı güncelle', en: 'Update calculation' }),
    updating: t({ tr: 'Güncelleniyor…', en: 'Updating…' }),
    updatedNote: t({ tr: 'Kayıt güncellendi.', en: 'The calculation was updated.' }),
    detachLabel: t({ tr: 'Yeni kayıt olarak ekle', en: 'Save as a new calculation' }),
    openProjectLink: t({ tr: 'Projeyi aç', en: 'Open project' }),

    // ---- Kayıt yükleme durumu ----
    linkLoading: t({ tr: 'Kayıt yükleniyor…', en: 'Loading the saved calculation…' }),
    linkAnonymous: t({
      tr: 'Bu bağlantı kaydedilmiş bir hesabı açıyor; görmek için giriş yapmalısın.',
      en: 'This link opens a saved calculation; sign in to see it.',
    }),
    linkNotFound: t({
      tr: 'Kayıt bulunamadı — silinmiş ya da başka bir hesaba ait olabilir. Ekran boş açıldı.',
      en: 'The calculation was not found — it may have been deleted or belong to another account. '
        + 'The screen opened empty.',
    }),
    linkMismatch: t({
      tr: 'Bu kayıt başka bir araca ait, buraya yüklenmedi. Ekran boş açıldı.',
      en: 'This calculation belongs to a different tool and was not loaded. The screen opened empty.',
    }),
    linkBroken: t({
      tr: 'Kaydın girdileri okunamadı, yüklenmedi. Ekran boş açıldı.',
      en: 'The saved inputs could not be read and were not loaded. The screen opened empty.',
    }),
    linkError: t({
      tr: 'Kayıt yüklenemedi. Sayfayı yenileyip tekrar deneyin.',
      en: 'The calculation could not be loaded. Refresh the page and try again.',
    }),
    linkRestored: t({ tr: 'Kayıtlı girdiler ekrana yüklendi.', en: 'The saved inputs were loaded.' }),

    // Araç şeması kayıttan sonra değişmişse hangi alanların düştüğü söylenir —
    // sessizce eksik yüklemek, kullanıcının fark etmediği bir hesap demek.
    droppedNote: (fields) => t({
      tr: `Kayıttaki şu alanlar bu araçta artık yok, yüklenmedi: ${fields.join(', ')}.`,
      en: `These saved fields no longer exist in this tool and were not loaded: ${fields.join(', ')}.`,
    }),
    staleNote: t({
      tr: 'Bu kayıt daha eski bir hesap sürümüyle üretilmiş. Güncellersen ekrandaki güncel '
        + 'sonuçla ve güncel sürümle kaydedilir.',
      en: 'This calculation was produced with an older calculation version. Updating it stores the '
        + 'current on-screen result with the current version.',
    }),
  }
}
