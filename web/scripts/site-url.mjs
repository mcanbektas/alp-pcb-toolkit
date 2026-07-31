// Sitenin mutlak kök adresi — sitemap, canonical ve hreflang'in ORTAK kaynağı.
//
// Üçü de mutlak adres ister (göreli yazılamaz), yani hepsi aynı ortam
// değişkenine bağlıdır. Ayrı ayrı okunsaydı biri değişkeni bulur diğeri
// bulamaz hâle gelebilirdi.
//
// Alan adı henüz alınmadı. `VITE_SITE_URL` verilmezse placeholder yazılır ve
// konsola uyarı basılır; alan adı alınınca değişken `deploy/.env`e eklenir
// (bkz. `deploy/README.md`).

import process from 'node:process'

const PLACEHOLDER_SITE_URL = 'https://alp-pcb-toolkit.example'

let warned = false

export function siteUrl() {
  const fromEnv = process.env.VITE_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  if (!warned) {
    warned = true
    console.warn(
      'site-url: VITE_SITE_URL tanımlı değil, placeholder alan adı kullanılıyor '
      + `(${PLACEHOLDER_SITE_URL}). Bu adres yalnız sitemap.xml'e değil, 76 sayfanın `
      + "<head>'indeki canonical ve hreflang etiketlerine de yazılır. "
      + "Alan adı alınınca deploy/.env'e VITE_SITE_URL eklenir.",
    )
  }
  return PLACEHOLDER_SITE_URL
}
