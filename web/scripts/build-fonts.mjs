#!/usr/bin/env node
// Yazı tipi üreteci — `src/fonts.css` bu betikten çıkar, elle düzenlenmez.
//
// Neden var: fontlar depoda durur ve siteyle birlikte servis edilir (Faz 3b),
// böylece hiçbir ziyaretçi üçüncü tarafa istek atmaz. Ama her `woff2` dosyası,
// onu çağıran `@font-face` bloğu ve o bloğun `unicode-range` satırı elle
// yazıldığında hangi dosyanın hangi aralıkla eşleştiği gözden kaçar — bir
// ağırlık eklemek yirmi satır kopyalamak demekti. Tek kaynak aşağıdaki
// `FAMILIES` tablosudur; dosyalar da CSS de oradan türetilir.
//
// Şu an: 3 aile, 26 `woff2` (26 `@font-face` bloğu), PDF için 5 `ttf`.
//
// Kullanım (`web/` dizininden):
//   npm run fonts                 yalnız `src/fonts.css`i yeniden üretir
//   npm run fonts -- --fetch      font dosyalarını da indirir (ağ gerekir)
//   npm run fonts -- --symbols    sembol alt kümesini tam ttf'den keser
//                                 (ağ + `python3 -m pip install --user fonttools brotli`)
//   npm run fonts -- --check      üretilmiş dosya güncel mi (çıkış kodu 0/1)
//   npm run fonts -- --coverage   sitedeki karakterler alt kümelerde var mı
//
// Yeni ağırlık ya da alt küme gerektiğinde: `FAMILIES` tablosuna ekle,
// `--fetch` ile koştur, inen dosyaları ve `fonts.css`i aynı commit'e koy.
// Ağırlık indirilmeden CSS'e yazılırsa tarayıcı var olanı sentetik kalınlaştırır
// ve harfler bozulur; bu yüzden CSS yazılmadan önce her dosya diskte aranır.
//
// Kaynaklar sabitlenmiştir — sürüm yükseltmek bilinçli bir adımdır:
//   woff2 + unicode aralıkları : `@fontsource/<paket>` (Google Fonts'un
//     alt kümelerinin birebir kopyası; dosya adları sürümler arası sabit)
//   ttf (PDF'e gömülen) + lisans metni : `google/fonts` deposu, sabit commit
//
// Not: `--fetch` indirdiği dosyayı diskteki ile karşılaştırıp `yeni` / `değişti`
// / `aynı` diye bildirir. Beklenmeyen bir `değişti` satırı, sabitlenen sürümün
// altından dosya değişmiş demektir; commit'lemeden önce bakılır.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

// ---- sabitlenen kaynaklar ----

const FONTSOURCE_VERSION = '5.3.0'
// google/fonts deposunun sabitlenmiş commit'i (2026-07-24). `main` yazılsa
// üretim tekrarlanabilir olmazdı: aynı komut yarın başka bayt indirir.
const GOOGLE_FONTS_REF = '7ff85c87f93ea6cca5f41c69f2e4edcb90240f26'

// ---- aileler: tek kaynak ----
//
// `weights` temaların gerçekten kullandıklarıdır (`src/themes/*.css`), fazlası
// boşa inen dosyadır. `subsets` sırası CSS'teki blok sırasını da belirler.
//   latin      temel harfler, µ, °
//   latin-ext  ŞART — Türkçe'nin ğ, ı, ş harfleri burada
//   greek      Ω ve Δ gibi mühendislik sembolleri
const FAMILIES = [
  {
    family: 'IBM Plex Sans',
    pkg: 'ibm-plex-sans',
    subsets: ['latin', 'latin-ext', 'greek'],
    weights: [400, 500, 600, 700],
  },
  {
    family: 'IBM Plex Mono',
    pkg: 'ibm-plex-mono',
    // Greek alt kümesi bu ailede YAYINLANMIYOR (paketin `metadata.json`ı da
    // saymaz, `--fetch` bunu doğrular): mono metindeki Ω sistem yazı tipinden
    // çizilir. Fontlar Google'dan gelirken de böyleydi, gerileme değil.
    subsets: ['latin', 'latin-ext'],
    weights: [400, 500, 600],
  },
  {
    family: 'Chakra Petch',
    pkg: 'chakra-petch',
    subsets: ['latin', 'latin-ext'],
    weights: [400, 500, 600, 700],
  },
]

// Alt küme aralıkları. Üç ailede de birebir aynıdır (hepsi aynı alt küme
// tanımından çıkıyor), bu yüzden tek tablo tutulur. `--fetch` her paketin
// `unicode.json`ı ile karşılaştırır ve ayrışırsa durur — aralığın sessizce
// eskimesi, dosyada olmayan karakteri var gibi göstermek demektir.
const SUBSET_RANGES = {
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, '
    + 'U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  'latin-ext': 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, '
    + 'U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, '
    + 'U+2C60-2C7F, U+A720-A7FF',
  greek: 'U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-03FF',
}

// ---- sembol alt kümesi ----
//
// Mühendislik metninin kullandığı ama Google'ın `latin` / `latin-ext` / `greek`
// alt kümelerinin HİÇBİRİNDE olmayan karakterler. Glif ailenin tam `ttf`sinde
// duruyor, alt küme dosyasına girmemiş — yani aralığı genişletmek işe yaramaz,
// kendi alt kümemizi kesmek gerekiyor (`--symbols`, `subset-symbols.py`).
//
// Liste elle tutulur, kaynak taramasından türetilmez: bir ekrana yeni bir sembol
// yazıldığında `woff2` ikilileri kendiliğinden değişmesin. `--coverage` sitede
// geçip de buraya girmemiş karakteri söyler; gerçekten gerekiyorsa buraya eklenir.
//
// Üç ailenin hiçbirinde OLMAYAN karakterler de listede duruyor (⁻ ₐ ₙ ∈ ∝ ∠ ∥ ≪
// ⌈ ⌉ □ ✗): kesme adımı onları sessizce atar ve CSS'te de görünmezler, ama listede
// kalmaları "denendi, fontta yok" kaydıdır. Onlar sistem yazı tipinden çizilir.
const SYMBOLS = [
  // üst simgeler ve üst eksi
  0x2070, 0x2074, 0x2075, 0x2076, 0x2077, 0x2078, 0x2079, 0x207B,
  // alt simgeler
  0x2080, 0x2081, 0x2082, 0x2083, 0x2084, 0x2085, 0x2090, 0x2099,
  // oklar
  0x2190, 0x2192, 0x2194,
  // matematik
  0x2202, 0x2208, 0x221A, 0x221D, 0x221E, 0x2220, 0x2225, 0x222B,
  0x2248, 0x2260, 0x2264, 0x2265, 0x226A,
  // tavan işareti, çizgi, kare, onay/çarpı
  0x2308, 0x2309, 0x2500, 0x25A1, 0x2713, 0x2717,
]

// Kesme kaynakları: `google/fonts` deposundaki tam kapsamlı `ttf`ler, sabit
// commit. Bunlar depoya GİRMEZ — geçici dizine inip kesildikten sonra silinirler;
// depoda yalnız çıkan `woff2` durur. IBM Plex Sans yalnız değişken font olarak
// yayınlandığı için istenen ağırlığa sabitlenir (`instance`).
const SYMBOL_SOURCES = {
  'ibm-plex-sans': {
    repoPath: 'ofl/ibmplexsans/IBMPlexSans[wdth,wght].ttf',
    instance: (weight) => ({ wght: weight, wdth: 100 }),
  },
  'ibm-plex-mono': {
    perWeight: {
      400: 'ofl/ibmplexmono/IBMPlexMono-Regular.ttf',
      500: 'ofl/ibmplexmono/IBMPlexMono-Medium.ttf',
      600: 'ofl/ibmplexmono/IBMPlexMono-SemiBold.ttf',
    },
  },
  'chakra-petch': {
    perWeight: {
      400: 'ofl/chakrapetch/ChakraPetch-Regular.ttf',
      500: 'ofl/chakrapetch/ChakraPetch-Medium.ttf',
      600: 'ofl/chakrapetch/ChakraPetch-SemiBold.ttf',
      700: 'ofl/chakrapetch/ChakraPetch-Bold.ttf',
    },
  },
}

// PDF raporuna gömülen tam kapsamlı `ttf`ler; depoda `assets/report-fonts/`
// altında dururlar. Site bunları indirmez, api imajı alır (bkz.
// `api/Dockerfile`), böylece ekran ile belge aynı aileleri gösterir.
// `IBM Plex Sans` yukarı akışta yalnız değişken font olarak yayınlanıyor.
const REPORT_FONTS = [
  { file: 'IBMPlexSans-Variable.ttf', repoPath: 'ofl/ibmplexsans/IBMPlexSans[wdth,wght].ttf' },
  { file: 'IBMPlexMono-Regular.ttf', repoPath: 'ofl/ibmplexmono/IBMPlexMono-Regular.ttf' },
  { file: 'IBMPlexMono-SemiBold.ttf', repoPath: 'ofl/ibmplexmono/IBMPlexMono-SemiBold.ttf' },
  { file: 'ChakraPetch-Regular.ttf', repoPath: 'ofl/chakrapetch/ChakraPetch-Regular.ttf' },
  { file: 'ChakraPetch-SemiBold.ttf', repoPath: 'ofl/chakrapetch/ChakraPetch-SemiBold.ttf' },
]

// SIL Open Font License 1.1 — font baytıyla birlikte taşınması gereken metin.
// IBM Plex Sans ile Mono aynı metni taşır, tek kopya tutulur.
const LICENCES = [
  { file: 'OFL-IBMPlex.txt', repoPath: 'ofl/ibmplexsans/OFL.txt' },
  { file: 'OFL-ChakraPetch.txt', repoPath: 'ofl/chakrapetch/OFL.txt' },
]

// ---- yollar ----

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '..')
const repoDir = path.resolve(webDir, '..')
// Site yalnız woff2 çağırır, bu yüzden yalnız onlar `public/` altındadır. Tam
// kapsamlı ttf'ler depoda ayrı bir dizinde durur: `public/` altında olsalar
// tarayıcı hiç indirmediği hâlde `dist/`e ve web imajına girerlerdi.
const WOFF2_DIR = path.join(webDir, 'public', 'fonts')
const TTF_DIR = path.join(repoDir, 'assets', 'report-fonts')
const CSS_FILE = path.join(webDir, 'src', 'fonts.css')
// Sembol alt kümesinin ürünü: hangi ailede hangi kod noktası GERÇEKTEN var.
// `--symbols` yazar, CSS üretimi okur — böylece CSS yazmak ağ ya da Python
// istemez ve aralık, dosyanın içeriğiyle birebir aynı kalır.
const SYMBOLS_FILE = path.join(scriptDir, 'font-symbols.json')
const SUBSET_SCRIPT = path.join(scriptDir, 'subset-symbols.py')

const CDN = (pkg, file) => `https://cdn.jsdelivr.net/npm/@fontsource/${pkg}@${FONTSOURCE_VERSION}/${file}`
const RAW = (repoPath) => 'https://raw.githubusercontent.com/google/fonts/'
  + `${GOOGLE_FONTS_REF}/${repoPath.split('/').map(encodeURIComponent).join('/')}`

// ---- yardımcılar ----

const woff2Name = (pkg, subset, weight) => `${pkg}-${subset}-${weight}-normal.woff2`

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

// `unicode-range` satırı uzundur; okunabilir kalsın diye sarılır. Süslü değil,
// diff'te tek aralığın değişimi tek satırda görünsün diye.
function wrapRanges(ranges, indent = '  ', width = 100) {
  const items = ranges.split(',').map((s) => s.trim())
  const lines = []
  let line = `${indent}unicode-range:`
  for (const item of items) {
    const next = `${line} ${item},`
    if (next.length > width && line.trim() !== 'unicode-range:') {
      lines.push(line)
      line = `${indent}  ${item},`
    } else {
      line = next
    }
  }
  lines.push(`${line.replace(/,$/, ';')}`)
  return lines.join('\n')
}

function fontFace({ family, pkg, subset, weight, ranges }) {
  return [
    '@font-face {',
    `  font-family: '${family}';`,
    '  font-style: normal;',
    `  font-weight: ${weight};`,
    // `swap`: yazı tipi inerken metin görünmez kalmaz, sistem yüzüyle çizilir.
    '  font-display: swap;',
    `  src: url('/fonts/${woff2Name(pkg, subset, weight)}') format('woff2');`,
    wrapRanges(ranges ?? SUBSET_RANGES[subset]),
    '}',
  ].join('\n')
}

// `--symbols`ün bıraktığı kayıt. Yoksa sembol blokları hiç yazılmaz: uydurma bir
// aralıkla var olmayan dosyayı çağırmak, düzeltmeye çalıştığımız hatanın kendisi.
function readSymbols() {
  if (!existsSync(SYMBOLS_FILE)) return null
  const parsed = JSON.parse(readFileSync(SYMBOLS_FILE, 'utf8'))
  return parsed?.families ?? null
}

const codepointRange = (list) => list
  .map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`)
  .join(', ')

function buildCss() {
  const symbolFamilies = readSymbols()
  const total = FAMILIES.reduce((n, f) => n + f.subsets.length * f.weights.length, 0)
    + (symbolFamilies ? FAMILIES.filter((f) => symbolFamilies[f.family]?.length)
      .reduce((n, f) => n + f.weights.length, 0) : 0)
  const header = `/* Yazı tipleri — Faz 3b. BU DOSYA ÜRETİLMİŞTİR, ELLE DÜZENLENMEZ.
 *
 * Üretici: \`web/scripts/build-fonts.mjs\` — \`npm run fonts\`. Aile, ağırlık ve
 * alt küme listesi orada durur; bir ağırlık eklemek o tablodaki tek satırdır.
 *
 * Üç aile depoda durur ve siteyle birlikte servis edilir; sayfa hiçbir dış
 * kaynağa (Google Fonts vb.) istek atmaz. Eskiden \`index.html\` fontları
 * fonts.googleapis.com'dan çekiyordu: her ziyaretçi üçüncü tarafa istek
 * gönderiyor ve site o hizmete bağımlı kalıyordu.
 *
 * Aynı aileler PDF raporunda da kullanılır: tam kapsamlı \`ttf\` sürümleri
 * \`assets/report-fonts/\` altındadır ve api imajına oradan girer (bkz.
 * \`api/Dockerfile\`), yani ekran ile belge aynı yazı tipini gösterir. Site
 * yalnız woff2 çağırdığı için ttf'ler \`public/\` altında DURMAZ — orada olsalar
 * tarayıcı hiç indirmediği hâlde \`dist/\`e ve web imajına girerlerdi.
 *
 * Alt kümeler ayrı dosyalardır ve \`unicode-range\` ile seçilir; tarayıcı yalnız
 * gereken parçayı indirir:
 *   latin      temel harfler, µ, °
 *   latin-ext  ŞART — Türkçe'nin ğ, ı, ş harfleri burada
 *   greek      Ω ve Δ gibi mühendislik sembolleri
 *
 * IBM Plex Mono'nun greek alt kümesi YAYINLANMIYOR; mono metindeki Ω sistem
 * yazı tipinden çizilir. Site fontları dışarıdan çekerken de durum aynıydı,
 * bu bir gerileme değil.
 *
 *   symbols    BİZİM kestiğimiz alt küme — oklar, matematik, alt/üst simgeler
 *
 * Dördüncüsü Google'da yok: →, ≈, √, ✓ gibi karakterler yayınlanan üç alt kümenin
 * hiçbirinde değil, glifler yalnız tam \`ttf\`de duruyor. Aralığı genişletmek işe
 * yaramazdı; alt küme tam \`ttf\`den kesiliyor (\`npm run fonts -- --symbols\`).
 * Aralık dosyanın İÇİNDEKİ kod noktalarıdır, aile başına ayrı — Chakra Petch'in
 * charset'i IBM Plex'ten dar.
 *
 * Ağırlıklar temaların kullandıklarıdır (400/500/600/700). Hiçbir ailede
 * bulunmayan karakter (⁻ ₐ ₙ ∈ ∝ ∠ ∥ ≪ ⌈ ⌉ □ ✗) yine sistem yüzünden çizilir;
 * kalan açığı \`npm run fonts -- --coverage\` sayar.
 *
 * Lisans: SIL Open Font License 1.1 — metinler her iki font dizininde durur
 * (\`public/fonts/OFL-*.txt\`, \`assets/report-fonts/OFL-*.txt\`).
 *
 * ${total} blok, @fontsource ${FONTSOURCE_VERSION}.
 */`

  const blocks = FAMILIES.map(({ family, pkg, subsets, weights }) => {
    const faces = subsets.flatMap((subset) => weights
      .map((weight) => fontFace({ family, pkg, subset, weight })))
    const symbols = symbolFamilies?.[family] ?? []
    if (symbols.length > 0) {
      faces.push(...weights.map((weight) => fontFace({
        family, pkg, subset: 'symbols', weight, ranges: codepointRange(symbols),
      })))
    }
    return `/* --- ${family} --- */\n${faces.join('\n')}`
  })

  return `${header}\n\n${blocks.join('\n\n')}\n`
}

// CSS'in çağırdığı her dosya diskte var mı. Yoksa CSS yazılmaz: eksik dosyayı
// çağıran bir `@font-face` sessizce sentetik kalınlaştırmaya düşer.
function missingFiles() {
  const missing = []
  const label = (full) => path.relative(repoDir, full)
  const symbolFamilies = readSymbols()
  for (const { family, pkg, subsets, weights } of FAMILIES) {
    const all = symbolFamilies?.[family]?.length ? [...subsets, 'symbols'] : subsets
    for (const subset of all) {
      for (const weight of weights) {
        const full = path.join(WOFF2_DIR, woff2Name(pkg, subset, weight))
        if (!existsSync(full)) missing.push(label(full))
      }
    }
  }
  for (const { file } of REPORT_FONTS) {
    const full = path.join(TTF_DIR, file)
    if (!existsSync(full)) missing.push(label(full))
  }
  return missing
}

// ---- indirme ----

async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

async function writeIfChanged(dir, file, buf) {
  const target = path.join(dir, file)
  if (existsSync(target)) {
    const current = readFileSync(target)
    if (sha256(current) === sha256(buf)) return 'aynı'
    await writeFile(target, buf)
    return 'değişti'
  }
  await writeFile(target, buf)
  return 'yeni'
}

// Alt küme adı ve unicode aralığı, dosyaları veren paketin kendi verisiyle
// karşılaştırılır. Elle yazılmış bir alt küme adı 404 olarak değil, açık bir
// hata olarak görünsün diye indirmeden önce yapılır.
async function verifyManifest() {
  const problems = []
  for (const { family, pkg, subsets, weights } of FAMILIES) {
    const meta = await (await fetch(CDN(pkg, 'metadata.json'))).json()
    const unicode = await (await fetch(CDN(pkg, 'unicode.json'))).json()
    for (const subset of subsets) {
      if (!meta.subsets.includes(subset)) {
        problems.push(`${family}: '${subset}' alt kümesi paketle yayınlanmıyor `
          + `(var olanlar: ${meta.subsets.join(', ')})`)
        continue
      }
      const upstream = (unicode[subset] ?? '').replace(/\s+/g, '')
      const ours = SUBSET_RANGES[subset]?.replace(/\s+/g, '')
      if (!ours) problems.push(`${family}: '${subset}' için SUBSET_RANGES'te aralık yok`)
      else if (upstream !== ours) {
        problems.push(`${family}: '${subset}' aralığı yukarı akışta değişmiş.\n`
          + `    bizdeki : ${ours}\n    paketteki: ${upstream}`)
      }
    }
    for (const weight of weights) {
      if (!meta.weights.includes(weight)) {
        problems.push(`${family}: ${weight} ağırlığı paketle yayınlanmıyor `
          + `(var olanlar: ${meta.weights.join(', ')})`)
      }
    }
  }
  return problems
}

async function fetchAll() {
  const problems = await verifyManifest()
  if (problems.length > 0) {
    console.error('Bildirim listesi paketle uyuşmuyor:')
    for (const p of problems) console.error(`  - ${p}`)
    return false
  }

  await mkdir(WOFF2_DIR, { recursive: true })
  await mkdir(TTF_DIR, { recursive: true })

  const counts = { yeni: 0, değişti: 0, aynı: 0 }
  const note = (state, label) => {
    counts[state] += 1
    if (state !== 'aynı') console.log(`  ${state.padEnd(8)} ${label}`)
  }

  console.log(`woff2 — @fontsource ${FONTSOURCE_VERSION}`)
  for (const { pkg, subsets, weights } of FAMILIES) {
    for (const subset of subsets) {
      for (const weight of weights) {
        const name = woff2Name(pkg, subset, weight)
        // eslint-disable-next-line no-await-in-loop
        const buf = await download(CDN(pkg, `files/${name}`))
        // eslint-disable-next-line no-await-in-loop
        note(await writeIfChanged(WOFF2_DIR, name, buf), name)
      }
    }
  }

  console.log(`ttf + lisans — google/fonts @ ${GOOGLE_FONTS_REF.slice(0, 10)}`)
  for (const { file, repoPath } of REPORT_FONTS) {
    // eslint-disable-next-line no-await-in-loop
    const buf = await download(RAW(repoPath))
    // eslint-disable-next-line no-await-in-loop
    note(await writeIfChanged(TTF_DIR, file, buf), file)
  }
  // Lisans metni her iki dizine de yazılır: woff2'ler ve ttf'ler ayrı yerlerde
  // durup ayrı imajlara giriyor, SIL OFL 1.1 metnin fontla birlikte taşınmasını
  // istiyor. Aynı dosyanın iki kopyası, eksik lisanstan iyidir.
  //
  // Satır sonu LF'e çevrilir: yukarı akıştaki metin CRLF taşıyor, depo ise
  // (`core.autocrlf=input`) LF tutuyor. Çevrilmezse indirilen dosya diskteki
  // ile hiç eşleşmez ve `--fetch` her koşuda "değişti" der.
  for (const { file, repoPath } of LICENCES) {
    // eslint-disable-next-line no-await-in-loop
    const buf = Buffer.from((await download(RAW(repoPath))).toString('utf8').replace(/\r\n/g, '\n'))
    for (const dir of [WOFF2_DIR, TTF_DIR]) {
      // eslint-disable-next-line no-await-in-loop
      note(await writeIfChanged(dir, file, buf), `${path.basename(dir)}/${file}`)
    }
  }

  console.log(`  ${counts.yeni} yeni, ${counts.değişti} değişti, ${counts.aynı} aynı`)
  return true
}

// ---- sembol alt kümesi kesme ----
//
// Ağ burada, font cerrahisi `subset-symbols.py`de: kaynak `ttf`ler geçici dizine
// iner, kesilir, yalnız çıkan `woff2` depoda kalır. Kaynak `ttf`ler depoya
// girmez — 1,4 MB'ı ikinci kez taşımanın anlamı yok.
async function buildSymbols() {
  const tmpDir = await mkdtemp(path.join(tmpdir(), 'alp-fonts-'))
  const jobs = []

  console.log(`sembol alt kümesi — google/fonts @ ${GOOGLE_FONTS_REF.slice(0, 10)}`)
  for (const { family, pkg, weights } of FAMILIES) {
    const source = SYMBOL_SOURCES[pkg]
    if (!source) {
      console.error(`  ${family}: kesme kaynağı tanımlı değil (SYMBOL_SOURCES)`)
      return false
    }
    for (const weight of weights) {
      const repoPath = source.perWeight?.[weight] ?? source.repoPath
      if (!repoPath) {
        console.error(`  ${family} ${weight}: kaynak ttf yok`)
        return false
      }
      const local = path.join(tmpDir, `${pkg}-${weight}-${path.basename(repoPath)}`)
      if (!existsSync(local)) {
        // eslint-disable-next-line no-await-in-loop
        await writeFile(local, await download(RAW(repoPath)))
      }
      jobs.push({
        name: woff2Name(pkg, 'symbols', weight),
        family,
        source: local,
        instance: source.instance ? source.instance(weight) : null,
      })
    }
  }

  let report
  try {
    const out = execFileSync('python3', [SUBSET_SCRIPT], {
      input: JSON.stringify({ outDir: tmpDir, codepoints: SYMBOLS, jobs }),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'inherit'],
    })
    report = JSON.parse(out)
  } catch (err) {
    console.error('  kesme başarısız — `python3 -m pip install --user fonttools brotli` gerekir.')
    console.error(`  ${err.message.split('\n')[0]}`)
    await rm(tmpDir, { recursive: true, force: true })
    return false
  }

  const counts = { yeni: 0, değişti: 0, aynı: 0 }
  for (const item of report.files) {
    if (item.skipped) {
      console.log(`  atlandı  ${item.name} — ailede tek sembol yok`)
      continue
    }
    const buf = readFileSync(path.join(tmpDir, item.name))
    const state = await writeIfChanged(WOFF2_DIR, item.name, buf)
    counts[state] += 1
    if (state !== 'aynı') console.log(`  ${state.padEnd(8)} ${item.name} (${item.bytes} B)`)
  }
  await rm(tmpDir, { recursive: true, force: true })

  // Aralık kaydı: aile başına dosyanın İÇİNDEKİ kod noktaları. CSS bunu okur.
  const families = Object.fromEntries(Object.entries(report.families)
    .map(([family, list]) => [family, [...list].sort((a, b) => a - b)]))
  const record = `${JSON.stringify({
    note: 'ÜRETİLMİŞTİR — build-fonts.mjs --symbols. Aile başına, kesilen woff2 '
      + 'dosyasının içindeki kod noktaları; fonts.css aralıkları buradan gelir.',
    families,
  }, null, 2)}\n`
  await writeFile(SYMBOLS_FILE, record)

  for (const [family, list] of Object.entries(families)) {
    console.log(`  ${family}: ${list.length}/${SYMBOLS.length} sembol kesildi`)
  }
  console.log(`  ${counts.yeni} yeni, ${counts.değişti} değişti, ${counts.aynı} aynı`)
  return true
}

// ---- kapsama raporu ----
//
// "Yeni bir alt küme gerekiyor mu?" sorusunun cevabı. Sitedeki metinlerde geçen
// ASCII dışı her karakter, üretilen aralıkların içinde mi diye bakılır. Dışında
// kalan karakter kayıp değildir — tarayıcı sıradaki yazı tipine düşer — ama o
// yüz sistemden sisteme değişir, yani listenin kısa kalması iyidir.
function parseRanges() {
  return Object.values(SUBSET_RANGES).flatMap((spec) => spec.split(',').map((item) => {
    const [from, to] = item.trim().replace('U+', '').split('-')
    return [parseInt(from, 16), parseInt(to ?? from, 16)]
  }))
}

async function sourceFiles(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const full = path.join(dir, entry.name)
    // Üretilen CSS taranmaz: başlığındaki "şu karakterler eksik" notu, taramanın
    // kendi çıktısıdır — sayılırsa her sembol sonsuza dek listede kalır.
    if (full === CSS_FILE) continue
    if (entry.isDirectory()) await sourceFiles(full, out)
    else if (/\.(jsx?|css|html)$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name)) out.push(full)
  }
  return out
}

async function coverage() {
  const ranges = parseRanges()
  const symbolFamilies = readSymbols() ?? {}
  // Sembol alt kümesinde kod noktası her ailede olmayabilir. "Kapsandı" saymak
  // için EN AZ BİR ailede bulunması yeter — gövde metni IBM Plex Sans, tablo
  // Mono, başlık Chakra; hangisinde geçtiğini karakter bazında bilemeyiz.
  const inSymbols = new Set(Object.values(symbolFamilies).flat())
  const covered = (cp) => inSymbols.has(cp) || ranges.some(([from, to]) => cp >= from && cp <= to)
  const files = [...await sourceFiles(path.join(webDir, 'src')), path.join(webDir, 'index.html')]
  const found = new Map()
  for (const file of files) {
    for (const ch of readFileSync(file, 'utf8')) {
      const cp = ch.codePointAt(0)
      if (cp < 0x80 || covered(cp)) continue
      const key = `U+${cp.toString(16).toUpperCase().padStart(4, '0')} ${ch}`
      const where = found.get(key) ?? new Set()
      where.add(path.relative(webDir, file))
      found.set(key, where)
    }
  }
  // Aile başına eksik: sembol listesinde olup o ailenin fontunda bulunmayanlar.
  // Bunlar o ailede sistem yüzünden çizilir, ötekinde çizilebilir.
  for (const { family } of FAMILIES) {
    const list = symbolFamilies[family] ?? []
    const eksik = SYMBOLS.filter((cp) => !list.includes(cp))
    if (eksik.length > 0) {
      console.log(`${family}: ${SYMBOLS.length - eksik.length}/${SYMBOLS.length} sembol fontta var, `
        + `${eksik.length} yok — ${eksik.map((cp) => String.fromCodePoint(cp)).join(' ')}`)
    }
  }
  if (found.size === 0) {
    console.log('Kapsama: sitedeki her karakter en az bir ailenin alt kümesinde.')
    return
  }
  console.log(`\nKapsama: ${found.size} karakter hiçbir alt kümede yok — sistem yazı tipinden çizilir.`)
  for (const [key, where] of [...found.entries()].sort()) {
    const first = [...where][0]
    const rest = where.size > 1 ? ` (+${where.size - 1} dosya)` : ''
    console.log(`  ${key}  ${first}${rest}`)
  }
}

// ---- giriş ----

async function main() {
  const args = new Set(process.argv.slice(2))
  const bilinen = ['--fetch', '--symbols', '--check', '--coverage']
  const unknown = [...args].filter((a) => !bilinen.includes(a))
  if (unknown.length > 0) {
    console.error(`Bilinmeyen argüman: ${unknown.join(', ')}`)
    console.error(`Kullanım: node scripts/build-fonts.mjs [${bilinen.join('] [')}]`)
    process.exitCode = 2
    return
  }

  if (args.has('--fetch') && !await fetchAll()) {
    process.exitCode = 1
    return
  }

  if (args.has('--symbols') && !await buildSymbols()) {
    process.exitCode = 1
    return
  }

  const css = buildCss()

  if (args.has('--check')) {
    const current = existsSync(CSS_FILE) ? readFileSync(CSS_FILE, 'utf8') : ''
    if (current === css) {
      console.log('src/fonts.css güncel.')
    } else {
      console.error('src/fonts.css üreteçle uyuşmuyor — `npm run fonts` koştur.')
      process.exitCode = 1
      return
    }
  } else {
    const missing = missingFiles()
    if (missing.length > 0) {
      console.error(`${missing.length} font dosyası diskte yok — \`npm run fonts -- --fetch\` koştur:`)
      for (const file of missing.slice(0, 10)) console.error(`  - ${file}`)
      if (missing.length > 10) console.error(`  … ve ${missing.length - 10} tane daha`)
      process.exitCode = 1
      return
    }
    await writeFile(CSS_FILE, css)
    const blocks = (css.match(/@font-face/g) ?? []).length
    console.log(`src/fonts.css yazıldı — ${blocks} blok, ${FAMILIES.length} aile.`)
  }

  if (args.has('--coverage')) await coverage()
}

await main()
