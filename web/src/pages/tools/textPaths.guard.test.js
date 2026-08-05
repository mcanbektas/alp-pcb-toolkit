// BÜTÜN araç ekranları için metin yolu bekçisi.
//
// CLAUDE.md §Dil: "Değişikliğin doğruluğunu gözle kontrol etme — hiçbir şey tip
// denetiminden geçmiyor ve `text.foo.bar` yoksa React sessizce boş ya da
// `undefined` basar, build hata vermez." Bu sınıftan bir hata
// (`text.table.pctOfSupply is not a function`) bir ekranı tümüyle çökertmişti.
//
// `dfmTextPaths.test.js` bu denetimi dört DFM ekranı için, `impedanceTextPaths`
// iki empedans ekranı için yapıyordu; kalan 38 ekran (2026-08 REV2 paketiyle
// gelen 17'si dahil) hiçbir bekçinin kapsamında değildi — index.jsx ve
// schematic.jsx içindeki yolların çoğunluğu yalnız elle denetlenmişti.
// Buradaki liste ELLE TUTULMAZ: dizin taranır, yeni ekran doğduğu anda kapsama
// girer. Ekran başına ayrıca yazılması gereken bir şey yoktur.
//
// Bileşen testi DEĞİLDİR: kaynak dosyaları metin olarak okur, yolları çıkarır
// ve `getText('tr')`/`getText('en')` nesneleri üzerinde gerçekten yürür.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { commonText } from '../../data/uiText'
import { dfmText } from '../../data/dfmText'
import { collectPaths, scanSource } from './textPathScan'

const here = dirname(fileURLToPath(import.meta.url))
const FILES = ['index.jsx', 'schematic.jsx', 'report.js']

// Ekranın `getText`i çalışma anında yüklenir; import listesi elle tutulsaydı
// yeni ekran eklenirken unutulur ve bekçi sessizce eksik kalırdı.
const screens = []
for (const entry of readdirSync(here, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const textFile = join(here, entry.name, 'text.js')
  if (!existsSync(textFile)) continue
  const mod = await import(`./${entry.name}/text.js`)
  if (typeof mod.getText !== 'function') continue
  screens.push({
    dir: entry.name,
    getText: mod.getText,
    sources: FILES
      .map((name) => ({ name, path: join(here, entry.name, name) }))
      .filter((f) => existsSync(f.path))
      .map((f) => ({ name: f.name, source: readFileSync(f.path, 'utf8') })),
  })
}

// Tarama mantığı `textPathScan.js`te: aynı iki kör nokta (yorum içindeki yol
// sözü, prop olarak geçirilen fonksiyon) iki bekçide ayrı ayrı öğrenilmesin.

// `schematic.jsx` kök nesneyi değil, index.jsx'in geçirdiği ALT nesneyi alır —
// ekranların tamamında bu `text.schematic`tir. Kök nesneyle çözülürse her yol
// tanımsız görünür ve test anlamsız kırmızı verirdi.
const rootsFor = (getText, lang, fileName) => ({
  text: fileName === 'schematic.jsx' ? getText(lang).schematic : getText(lang),
  ui: commonText(lang),
  dfm: dfmText(lang),
})

describe('metin yolu bekçisi — kapsam', () => {
  it('bütün araç ekranları taranır (liste elle tutulmuyor)', () => {
    // 2026-08 itibarıyla 44 aktif ekran var; sayı düşerse tarama bozulmuştur.
    expect(screens.length).toBeGreaterThanOrEqual(40)
  })

  it('taranan kaynaklardan anlamlı sayıda yol çıkar', () => {
    const total = screens.reduce(
      (acc, s) => acc + s.sources.reduce((a, { source }) => a + collectPaths(source).length, 0),
      0,
    )
    // Desen bozulursa hiçbir yol bulunmaz ve bütün denetim sessizce geçerdi.
    expect(total).toBeGreaterThan(1000)
  })
})

describe.each(screens)('$dir — metin yolları', ({ getText, sources }) => {
  it.each(['tr', 'en'])('%s dilinde bütün yollar çözülür ve arity tutar', (lang) => {
    const problems = []
    for (const { name, source } of sources) {
      const roots = rootsFor(getText, lang, name)
      // `schematic.jsx` olan ama `text.schematic` taşımayan ekran yoktur;
      // olsaydı bütün yollar tanımsız görünürdü, bu yüzden ayrıca söylenir.
      if (name === 'schematic.jsx' && roots.text === undefined) {
        problems.push(`${name}: text.schematic tanımsız (schematic.jsx'e geçen alt nesne yok)`)
        continue
      }
      problems.push(...scanSource({ name, source, roots }))
    }
    expect(problems).toEqual([])
  })

  it('iki dil aynı anahtar kümesini taşır', () => {
    const keys = (node, trail, acc) => {
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        for (const [k, v] of Object.entries(node)) keys(v, trail ? `${trail}.${k}` : k, acc)
      } else {
        acc.push(trail)
      }
      return acc
    }
    // Bir dilde var olup ötekinde olmayan anahtar, o dilde `undefined` basar.
    expect(keys(getText('tr'), '', []).sort()).toEqual(keys(getText('en'), '', []).sort())
  })
})
