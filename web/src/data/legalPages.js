// Yasal sayfaların KAYIT LİSTESİ — `categories.js` ile aynı işi görür: rota
// katmanı (`lib/routes.js`) bunu okur, prerender ve sitemap de oradan türer.
// Gövde metni burada DEĞİL, `legalText.js`tedir; bu dosya yalnızca sayfanın
// kimliğini ve `<title>` / `<meta description>` için gereken kısa metni taşır.
//
// Ayrı dosya olmasının nedeni katman: `routes.js` saf ve hafiftir, üç sayfalık
// hukuk metninin tamamını oraya bağlamak onu her rota aramasında belleğe
// çekmek olurdu.

export const LEGAL_DOCS = [
  {
    // `key` hem STATIC_ROUTES anahtarı hem de `legalText(lang)` içindeki
    // belge anahtarıdır — ikisi ayrışırsa sayfa boş çizilir.
    key: 'privacy',
    title: { tr: 'Gizlilik Politikası', en: 'Privacy Policy' },
    desc: {
      tr: 'ALP PCB Toolkit hangi verileri topluyor, neden topluyor, nerede saklıyor ve ne kadar süreyle tutuyor.',
      en: 'What data ALP PCB Toolkit collects, why, where it is stored and how long it is kept.',
    },
  },
  {
    key: 'kvkk',
    title: { tr: 'KVKK Aydınlatma Metni', en: 'Data Protection Notice (KVKK)' },
    desc: {
      tr: '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusunun aydınlatma yükümlülüğü.',
      en: 'Disclosure under Turkish Personal Data Protection Law no. 6698 (KVKK).',
    },
  },
  {
    key: 'terms',
    title: { tr: 'Kullanım Şartları', en: 'Terms of Use' },
    desc: {
      tr: 'ALP PCB Toolkit’i kullanmanın koşulları, hesap kuralları ve mühendislik sorumluluk sınırı.',
      en: 'Conditions for using ALP PCB Toolkit, account rules and the engineering liability limit.',
    },
  },
]

export const LEGAL_KEYS = LEGAL_DOCS.map((d) => d.key)

export function legalDoc(key) {
  return LEGAL_DOCS.find((d) => d.key === key) ?? null
}
