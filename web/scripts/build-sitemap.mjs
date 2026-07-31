#!/usr/bin/env node
// sitemap.xml üreteci — elle XML YAZILMAZ, rotalar tek kaynaktan
// (`src/lib/routes.js` → `indexablePages()`) türer: ana sayfa + her kategori
// sayfası + `path` alanı olan (aktif) araçlar, HER İKİ DİLDE.
//
// Prerender üreteciyle AYNI listeyi okur (`build-prerender.mjs`); ayrı liste
// tutulsaydı sitemap'te olup prerender'lanmamış (ya da tersi) sayfalar
// oluşurdu.
//
// Her `<url>` kendi `xhtml:link` alternatiflerini taşır. Küme karşılıklıdır:
// Türkçe kayıt da kendini listeler, aksi hâlde arama motoru kümeyi yok sayar.
// Ayrıntı: `docs/en-url-karari.md` §6.
//
// Alan adı henüz alınmadı — `VITE_SITE_URL` yoksa placeholder ve uyarı
// (`scripts/site-url.mjs`).
//
// Kullanım: `vite build` SONRASINDA koşar (`npm run build`), `dist/`in
// üzerine yazar — bkz. `package.json` → `"build"`.

import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LANGS } from '../src/lib/i18n.js'
import { indexablePages } from '../src/lib/routes.js'
import { siteUrl } from './site-url.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '..')
const DIST_FILE = path.join(webDir, 'dist', 'sitemap.xml')

const xmlEscape = (value) => value.replace(/&/g, '&amp;')

function buildXml(base) {
  const entries = []
  for (const page of indexablePages()) {
    const alternates = LANGS
      .map((lang) => '    <xhtml:link rel="alternate" '
        + `hreflang="${lang}" href="${xmlEscape(base + page[lang])}" />`)
      .join('\n')
    for (const lang of LANGS) {
      entries.push(`  <url>\n    <loc>${xmlEscape(base + page[lang])}</loc>\n${alternates}\n  </url>`)
    }
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
    + '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    + `${entries.join('\n')}\n</urlset>\n`
}

async function main() {
  const base = siteUrl()
  const xml = buildXml(base)
  await writeFile(DIST_FILE, xml)
  const count = (xml.match(/<loc>/g) ?? []).length
  console.log(`sitemap.xml yazıldı — ${count} url (${path.relative(webDir, DIST_FILE)}).`)
}

await main()
