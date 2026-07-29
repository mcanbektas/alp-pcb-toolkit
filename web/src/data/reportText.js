// ReportDialog'un iki dilli metni. docs/uyelik-ve-rapor-plani.md §5.3 —
// ana başlık sabittir, kullanıcı seçmez.

import { pick } from '../lib/i18n'
import { API_ERR_NETWORK, API_ERR_PARSE } from '../lib/api'

export function reportText(lang) {
  const t = (dict) => pick(dict, lang)

  return {
    reportTitle: t({ tr: 'DONANIM RAPORU', en: 'HARDWARE REPORT' }),
    heading: t({ tr: 'Rapor al', en: 'Get a report' }),
    preparedByLabel: t({ tr: 'Hazırlayan', en: 'Prepared by' }),
    pdfButton: t({ tr: 'PDF indir', en: 'Download PDF' }),
    xlsxButton: t({ tr: 'Excel indir', en: 'Download Excel' }),
    working: t({ tr: 'Hazırlanıyor…', en: 'Preparing…' }),
    loginRequired: t({
      tr: 'Rapor almak için giriş yapmalısın.',
      en: 'Sign in to get a report.',
    }),
    loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
    missingPreparedBy: t({
      tr: 'Hazırlayan adı boş olamaz.',
      en: 'The prepared-by name cannot be empty.',
    }),
  }
}

export function reportErrorText(res, lang) {
  if (!res || res.ok) return null
  const t = (dict) => pick(dict, lang)

  if (res.error === API_ERR_NETWORK) {
    return t({
      tr: 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.',
      en: 'Could not reach the server. Check your connection.',
    })
  }
  if (res.error === API_ERR_PARSE) {
    return t({
      tr: 'Sunucudan beklenmeyen bir yanıt geldi.',
      en: 'The server returned an unexpected response.',
    })
  }
  return t({
    tr: 'Rapor üretilemedi. Lütfen tekrar deneyin.',
    en: 'The report could not be generated. Please try again.',
  })
}

// dd.MM.yyyy — planın §5.3 örneğiyle aynı biçim, dile göre değişmez (sayı
// biçimlendirmesi kuralıyla aynı gerekçe: mühendislik belgesi kopyalanabilir
// olmalı).
export function reportDateStamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(date.getDate())}.${p(date.getMonth() + 1)}.${date.getFullYear()}`
}
