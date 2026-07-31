#!/usr/bin/env node
// sitemap.xml üreteci — elle XML YAZILMAZ, rotalar tek kaynaktan
// (`src/data/categories.js`) türer: ana sayfa + her kategori sayfası +
// `path` alanı olan (aktif) araçlar.
//
// Alan adı henüz alınmadı. `VITE_SITE_URL` ortam değişkeni verilmezse
// placeholder yazılır ve konsola uyarı basılır; alan adı alınınca değişken
// `deploy/.env`'e eklenir (bkz. `deploy/README.md`).
//
// Kullanım: `vite build` SONRASINDA koşar (`npm run build`), `dist/`in
// üzerine yazar — bkz. `package.json` → `"build"`.

import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { CATEGORIES } from '../src/data/categories.js'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '..')
const DIST_FILE = path.join(webDir, 'dist', 'sitemap.xml')

const PLACEHOLDER_SITE_URL = 'https://alp-pcb-toolkit.example'

function siteUrl() {
  const fromEnv = process.env.VITE_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  console.warn(
    `build-sitemap: VITE_SITE_URL tanımlı değil, placeholder alan adıyla üretiliyor `
    + `(${PLACEHOLDER_SITE_URL}). Alan adı alınınca deploy/.env'e VITE_SITE_URL eklenir.`,
  )
  return PLACEHOLDER_SITE_URL
}

// `/` + her kategori sayfası + `path`i olan (aktif) her araç. "Yakında"
// araçların (path yok) henüz gerçek bir sayfası olmadığı için listeye girmez.
function routes() {
  const list = ['/']
  for (const category of CATEGORIES) {
    list.push(`/kategori/${category.slug}`)
    for (const tool of category.tools) {
      if (tool.path) list.push(tool.path)
    }
  }
  return list
}

const xmlEscape = (value) => value.replace(/&/g, '&amp;')

function buildXml(base, routePaths) {
  const urls = routePaths.map((p) => `  <url><loc>${xmlEscape(base + p)}</loc></url>`).join('\n')
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

async function main() {
  const base = siteUrl()
  const routePaths = routes()
  await writeFile(DIST_FILE, buildXml(base, routePaths))
  console.log(`sitemap.xml yazıldı — ${routePaths.length} url (${path.relative(webDir, DIST_FILE)}).`)
}

await main()
