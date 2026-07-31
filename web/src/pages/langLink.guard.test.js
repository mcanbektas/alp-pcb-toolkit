// Bağlantı katmanı bekçisi.
//
// İki dilli URL ağacında uygulama içi her bağlantı `LangLink` olmak zorunda:
// düz `Link` kanonik (Türkçe) yolu olduğu gibi basar ve İngilizce ağaçtaki
// kullanıcı o bağlantıda sessizce Türkçeye düşer. Bu build'den, tip
// denetiminden ve birim testlerinin geri kalanından KAÇAR — kırıldığında tek
// belirti, dil ağacından düşmüş bir kullanıcıdır.
//
// Aynı gerekçeyle kaynak kodda ÇIPLAK `/en/...` yolu da aranmaz: dil öneki
// tek yerde (`lib/routes.js`) kurulur, ekranlara dağılmaz.
//
// Bu bir bileşen testi DEĞİLDİR (statusChip.guard.test.js ile aynı teknik):
// kaynak dosyaları metin olarak okur.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

// Düz `Link` kullanmasına İZİN VERİLEN dosyalar. Ortak gerekçe: yolu zaten
// geçerli dilde ürettikleri için çevrilecek kanonik bir yol yok.
const ALLOWED = new Set([
  'components/LangLink.jsx',      // sarmalayıcının kendisi
  'App.jsx',                      // LangSwitch (translatePath) + altbilgi (categoryPath)
  'pages/Home.jsx',               // categoryPath
  'pages/CategoryPage.jsx',       // categoryPath / toolPath
  'pages/account/CalculationList.jsx', // openHref çağırandan hazır gelir
])

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.jsx?$/.test(entry) && !/\.test\.jsx?$/.test(entry)) out.push(full)
  }
  return out
}

// Yorumlar taramanın dışında kalır: bu dosyalarda yollar bol bol ANLATILIYOR
// (`/en`e döner…) ve yorum kuralı bozmaz. Yalnız tam satırlık `//` yorumları
// ve `/* */` blokları atılır — satır sonundaki `//` atılsaydı `https://`
// içeren bir satırın kalanı da sessizce taramadan düşerdi.
function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n')
}

const files = walk(srcDir).map((full) => ({
  rel: relative(srcDir, full).split('\\').join('/'),
  source: withoutComments(readFileSync(full, 'utf8')),
}))

describe('LangLink bekçisi', () => {
  it('taranacak dosya bulundu', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('react-router `Link`i yalnızca izinli dosyalar içe aktarır', () => {
    const offenders = files
      .filter(({ source }) => /import\s*\{[^}]*\bLink\b[^}]*\}\s*from\s*'react-router-dom'/.test(source))
      .map(({ rel }) => rel)
      .filter((rel) => !ALLOWED.has(rel))
    expect(offenders).toEqual([])
  })

  it('izin listesi ölü kayıt taşımaz', () => {
    const known = new Set(files.map((f) => f.rel))
    expect([...ALLOWED].filter((rel) => !known.has(rel))).toEqual([])
  })

  // Dil öneki tek yerde kurulur. Ekranın içine `/en/...` yazıldığı gün o
  // bağlantı Türkçe ağaçta da İngilizce sayfaya götürür.
  it('ekran ve bileşenlerde çıplak /en/ yolu yok', () => {
    const offenders = files
      .filter(({ rel }) => rel.startsWith('pages/') || rel.startsWith('components/'))
      .filter(({ source }) => /['"`]\/en(\/|['"`])/.test(source))
      .map(({ rel }) => rel)
    expect(offenders).toEqual([])
  })
})
