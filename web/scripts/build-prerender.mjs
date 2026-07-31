#!/usr/bin/env node
// Prerender (SSG) — araç ve kategori sayfalarını tarayıcısız indekslenebilir
// yapar. `vite build` SONRASINDA koşar (bkz. `package.json` → `"build"`).
//
// SORUN: site saf SPA'dır (BrowserRouter + tembel chunk'lar). JS koşturmayan
// bir bot her sayfada boş `<div id="root">` görür; 29 hesap aracının hiçbirinin
// indekslenebilir içeriği yoktur. Bu ürün kategorisi organik aramayla yaşar.
//
// YÖNTEM: `react-dom/server` ile derleme sonrası render. Yeni runtime
// bağımlılığı yok (react-dom zaten var), headless tarayıcı yok. Ayrıntılı
// gerekçe ve elenen seçenekler: `docs/prerender-karari.md`.
//
// İKİ DİL. Sayfalar hem Türkçe hem İngilizce URL ağacında üretilir
// (`/arac/gerilim-bolucu` ve `/en/tool/voltage-divider`) ve her sayfa kendi
// `canonical` + karşılıklı `hreflang` kümesini taşır. Dil URL'den okunduğu
// için render tarafında ek bir ayar yoktur: `StaticRouter` yolu alır,
// `LangProvider` dili o yoldan çıkarır. Kararlar: `docs/en-url-karari.md`.
//
// Rotalar `src/lib/routes.js` → `indexablePages()`ten türer — sitemap
// üreteciyle AYNI kaynak (`build-sitemap.mjs`), yani iki liste ayrışamaz.
//
// Oturum gerektiren sayfalar (giriş, kayıt, /projelerim, /hesabim, /proje/:id)
// ve `/en/...` karşılıkları bilerek prerender EDİLMEZ: indekslenmeleri
// istenmez, içerikleri de kullanıcıya özeldir.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { LANGS, pick } from '../src/lib/i18n.js'
import { indexablePages } from '../src/lib/routes.js'
import { siteUrl } from './site-url.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '..')
const DIST_DIR = path.join(webDir, 'dist')
const SHELL_FILE = path.join(DIST_DIR, 'index.html')
// SPA geri düşüşü. `dist/index.html` artık boş kabuk DEĞİL, prerender'lı ana
// sayfa; geri düşüş onu göstermeye devam etseydi `/giris` isteği ana sayfanın
// HTML'ini alır ve hydration her açılışta ayrışırdı. Boş kabuk bu yüzden
// ayrı bir dosyaya kopyalanır ve nginx geri düşüşü onu gösterir
// (bkz. deploy/nginx.conf, docs/prerender-karari.md §6).
const FALLBACK_FILE = path.join(DIST_DIR, 'spa-fallback.html')
// `vite build --ssr` çıktısı. `dist/` ALTINDA DEĞİL: oraya konsa web imajına
// ve tarayıcıya servis edilen dosyalar arasına girerdi.
const SERVER_ENTRY = path.join(webDir, '.prerender', 'entry-server.js')

const TITLE_SUFFIX = 'ALP PCB Toolkit'
// Varsayılan dil `hreflang="x-default"` sürümüdür: dil seçmemiş ziyaretçiye
// gösterilecek olan Türkçe sayfadır.
const DEFAULT_HREFLANG = 'tr'

// Prerender edilecek rotalar: her indekslenebilir sayfa × her dil.
// Sayfa kaydı iki dilin adresini de taşıdığı için hreflang kümesi de burada
// kurulur — TR sayfa da kendini listeler, aksi hâlde küme geçersizdir.
function routes(base) {
  const list = []
  for (const page of indexablePages()) {
    const alternates = LANGS.map((lang) => ({ lang, href: base + page[lang] }))
    for (const lang of LANGS) {
      list.push({
        url: page[lang],
        lang,
        title: pageTitle(page, lang),
        description: page.kind === 'category' ? pick(page.category.desc, lang) : null,
        canonical: base + page[lang],
        alternates,
        xDefault: base + page[DEFAULT_HREFLANG],
      })
    }
  }
  return list
}

// Sekme başlığı rotanın dilinde yazılır. `App.jsx` → TitleSync tarayıcıda
// aynı kalıbı ve aynı kaynağı kullanır, ikisi ayrışmamalı.
function pageTitle(page, lang) {
  if (page.kind === 'category') return `${pick(page.category.title, lang)} — ${TITLE_SUFFIX}`
  if (page.kind === 'tool') return `${pick(page.tool.name, lang)} — ${TITLE_SUFFIX}`
  return TITLE_SUFFIX
}

// HTML öznitelik değeri olarak güvenli hâle getirir. Katalog metni bizim
// yazdığımızdır ama başlığa `&` ya da tırnak girdiğinde kabuk bozulmasın.
const attrEscape = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const textEscape = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

// Kabuğa render çıktısını ve rota başına meta bilgisini yerleştirir.
//
// `<div id="root"></div>` BOŞ olarak aranır: Vite'ın ürettiği kabukta tam
// olarak bu dize vardır. Bulunamazsa sessizce meta'sız/gövdesiz bir sayfa
// yazmak yerine hata verilir — sessiz geçen bir eşleşme hatası, bütün
// prerender'ı işe yaramaz hâle getirir ve bunu kimse fark etmez.
function injectShell(shell, route, html) {
  const ROOT_MARKER = '<div id="root"></div>'
  if (!shell.includes(ROOT_MARKER)) {
    throw new Error(`kabukta '${ROOT_MARKER}' bulunamadı — dist/index.html beklenen biçimde değil`)
  }

  let out = shell.replace(ROOT_MARKER, `<div id="root">${html}</div>`)

  // <html lang> rotanın dilidir. Kozmetik değil: `text-transform: uppercase`
  // sayfanın dilini kullanır ve `lang="tr"` altında İngilizce "via" sözcüğü
  // büyütülünce "VİA" çıkar. JS koşturmayan botun ve ilk boyamanın gördüğü
  // değer BUDUR — tarayıcıdaki `LangProvider` etkisi ondan sonra gelir.
  const langRe = /<html\s+lang="[^"]*"/
  if (!langRe.test(out)) {
    throw new Error('kabukta <html lang="…"> yok — dist/index.html beklenen biçimde değil')
  }
  out = out.replace(langRe, `<html lang="${route.lang}"`)

  // Sekme başlığı rota başına yazılır. Tek sabit başlıkla 76 sayfa aynı adla
  // indekslenirdi; TitleSync bunu tarayıcıda düzeltiyor ama JS koşturmayan
  // bot düzeltilmemiş hâli görür — prerender'ın asıl kazancı burada.
  const titleTag = `<title>${textEscape(route.title)}</title>`
  if (!/<title>[^<]*<\/title>/.test(out)) {
    throw new Error('kabukta <title> etiketi yok — dist/index.html beklenen biçimde değil')
  }
  out = out.replace(/<title>[^<]*<\/title>/, titleTag)

  if (route.description) {
    const metaRe = /<meta\s+name="description"[\s\S]*?\/>/
    if (!metaRe.test(out)) {
      throw new Error('kabukta description meta etiketi yok — dist/index.html beklenen biçimde değil')
    }
    out = out.replace(metaRe, `<meta name="description" content="${attrEscape(route.description)}" />`)
  }

  // canonical + hreflang. Küme KARŞILIKLI olmak zorundadır: her sayfa hem
  // kendini hem öteki dili listeler, yoksa arama motoru kümeyi yok sayar.
  // `x-default` varsayılan dile (tr) işaret eder.
  const links = [
    `<link rel="canonical" href="${attrEscape(route.canonical)}" />`,
    ...route.alternates.map(
      ({ lang, href }) => `<link rel="alternate" hreflang="${lang}" href="${attrEscape(href)}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${attrEscape(route.xDefault)}" />`,
  ].join('\n    ')

  if (!out.includes('</head>')) {
    throw new Error('kabukta </head> yok — dist/index.html beklenen biçimde değil')
  }
  return out.replace('</head>', `  ${links}\n  </head>`)
}

// `/arac/trace-width` → `dist/arac/trace-width.html`,
// `/en/tool/trace-width` → `dist/en/tool/trace-width.html`,
// `/en` → `dist/en.html`.
// Kök rota kabuğun kendisinin (`dist/index.html`) üzerine yazar.
//
// `<yol>/index.html` DEĞİL, ölçülerek değiştirildi: dizin biçiminde nginx
// `/arac/trace-width` isteğini `/arac/trace-width/` adresine **301** ile
// yönlendiriyor (dizin isteğine eğik çizgi ekleme davranışı). Sitemap'teki
// URL eğik çizgisiz olduğu için bot her sayfada önce yönlendirme görürdü;
// kullanıcının adres çubuğu da değişirdi. Düz `.html` dosyası nginx'te
// `try_files $uri $uri.html` ile yönlendirmesiz servis edilir.
function outputFile(url) {
  if (url === '/') return SHELL_FILE
  return path.join(DIST_DIR, `${url.replace(/^\/+/, '')}.html`)
}

async function main() {
  const shell = await readFile(SHELL_FILE, 'utf8')

  // Boş kabuk ÖNCE ayrılır: kök rota birazdan `dist/index.html`in üzerine
  // yazacak ve o andan sonra boş kabuk elde kalmaz.
  await writeFile(FALLBACK_FILE, shell)

  let renderRoute
  try {
    ({ renderRoute } = await import(SERVER_ENTRY))
  } catch (err) {
    console.error(`build-prerender: sunucu paketi yüklenemedi (${path.relative(webDir, SERVER_ENTRY)}).`)
    console.error('  Önce `vite build --ssr` adımı koşmalı — bkz. package.json → "build".')
    console.error(`  ${err.message}`)
    process.exitCode = 1
    return
  }

  const list = routes(siteUrl())
  const started = Date.now()

  // Rotalar SIRAYLA render edilir. Paralel koşmak Node'da aynı React
  // ağacını eşzamanlı kurardı; 76 rota zaten yarım saniye sürüyor, kazanç
  // belirsizliğe değmez.
  for (const route of list) {
    let html
    try {
      // eslint-disable-next-line no-await-in-loop
      html = await renderRoute(route.url)
    } catch (err) {
      console.error(`build-prerender: ${route.url} render edilemedi — ${err.message}`)
      process.exitCode = 1
      return
    }
    const file = outputFile(route.url)
    // eslint-disable-next-line no-await-in-loop
    await mkdir(path.dirname(file), { recursive: true })
    // eslint-disable-next-line no-await-in-loop
    await writeFile(file, injectShell(shell, route, html))
  }

  console.log(`prerender: ${list.length} sayfa (${LANGS.join('/')}) + spa-fallback.html yazıldı `
    + `— ${((Date.now() - started) / 1000).toFixed(1)} sn.`)
}

await main()
