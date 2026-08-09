// Sitenin mutlak kök adresi — sitemap, canonical ve hreflang'in ORTAK kaynağı.
//
// Üçü de mutlak adres ister (göreli yazılamaz), yani hepsi aynı ortam
// değişkenine bağlıdır. Ayrı ayrı okunsaydı biri değişkeni bulur diğeri
// bulamaz hâle gelebilirdi.
//
// Alan adı henüz alınmadı. `VITE_SITE_URL` verilmezse placeholder yazılır ve
// konsola uyarı basılır. Alan adı alınınca iki yerde tanımlanır: yayınlanan
// imaj için bu deponun `SITE_URL` Actions değişkeni, yerel yığın için
// alp-platform deposundaki `deploy/.env` (bkz. o deponun `deploy/README.md`).

import process from 'node:process'

const PLACEHOLDER_SITE_URL = 'https://alp-pcb-toolkit.example'

let warned = false

export function siteUrl() {
  const fromEnv = process.env.VITE_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  if (!warned) {
    warned = true
    console.warn(
      // Sayı yazılmıyor: burada duran sabit (76) katalog büyüdükçe eskidi ve
      // her build'de yanlış bilgi bastı. Rota sayısı `indexablePages()`ten
      // gelir, onu buraya import etmek build betiğine gereksiz bağımlılık
      // eklerdi — uyarının işi sayı vermek değil, eksik ayarı bildirmek.
      'site-url: VITE_SITE_URL tanımlı değil, placeholder alan adı kullanılıyor '
      + `(${PLACEHOLDER_SITE_URL}). Bu adres yalnız sitemap.xml'e değil, üretilen `
      + "HER sayfanın <head>'indeki canonical ve hreflang etiketlerine de yazılır. "
      + 'Alan adı alınınca: depo değişkeni SITE_URL (Actions) ve alp-platform '
      + "deposundaki deploy/.env → VITE_SITE_URL.",
    )
  }
  return PLACEHOLDER_SITE_URL
}
