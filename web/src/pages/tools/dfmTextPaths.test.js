// Üretim/DFM ekranlarının metin yolu doğrulaması.
//
// CLAUDE.md §Dil: "Değişikliğin doğruluğunu gözle kontrol etme — hiçbir şey
// tip denetiminden geçmiyor ve `text.foo.bar` yoksa React sessizce boş ya da
// `undefined` basar, build hata vermez." Bu sınıftan bir hata bir ekranı
// tümüyle çökertmişti.
//
// Bu bir bileşen testi DEĞİLDİR: kaynak dosyaları metin olarak okur, içindeki
// `text.…` yollarını çıkarır ve `getText('tr')` / `getText('en')` nesneleri
// üzerinde gerçekten yürür. Arity de denetlenir — `text.foo(x)` biçiminde
// çağrılan yol fonksiyon olmalı, `{text.foo}` biçiminde basılan yol fonksiyon
// olmamalıdır.
//
// Aynı denetim `ui` (uiText) ve `dfm` (dfmText) için de yapılır.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { commonText } from '../../data/uiText'
import { dfmText } from '../../data/dfmText'
import { getText as clearanceText } from './ClearanceCreepagePadstack/text'
import { getText as bgaText } from './BgaBreakout/text'
import { getText as stackupText } from './StackupPlanner/text'
import { getText as thermalText } from './ThermalRelief/text'
import { getText as flexText } from './FlexPcbBendTrace/text'
import { collectPaths, scanSource } from './textPathScan'

const here = dirname(fileURLToPath(import.meta.url))

const SCREENS = [
  { dir: 'ClearanceCreepagePadstack', getText: clearanceText },
  { dir: 'BgaBreakout', getText: bgaText },
  { dir: 'StackupPlanner', getText: stackupText },
  { dir: 'ThermalRelief', getText: thermalText },
  // REV2 ile geldi ve DFM makinesini kullanıyor (`DfmChecks` + `dfmText` +
  // `lib/dfmCheck`) ama listeye eklenmemişti — CLAUDE.md: "Yeni bir üretim/DFM
  // ekranı eklendiğinde listesine yazılır."
  { dir: 'FlexPcbBendTrace', getText: flexText },
]

const FILES = ['index.jsx', 'schematic.jsx', 'report.js']

// Tarama mantığı `textPathScan.js`te — bütün ekranları kapsayan
// `textPaths.guard.test.js` ile aynı kaynak. Buradaki testler onun üstüne
// üretim/DFM'e özgü denetimleri (boş metin, anahtar kümesi) ekler.

describe.each(SCREENS)('$dir — metin yolları', ({ dir, getText }) => {
  const sources = FILES.map((name) => {
    const path = join(here, dir, name)
    return { name, source: readFileSync(path, 'utf8') }
  })

  // `schematic.jsx` kök nesneyi değil, index.jsx'in geçirdiği alt nesneyi alır.
  // Hangi alt nesne olduğu ekranlarda `text.schematic`tir.
  const rootsFor = (lang, fileName) => ({
    text: fileName === 'schematic.jsx' ? getText(lang).schematic : getText(lang),
    ui: commonText(lang),
    dfm: dfmText(lang),
  })

  // Desen bozulursa test hiçbir yol bulamaz ve sessizce geçerdi. Taban,
  // denetimin gerçekten çalıştığını garanti eder.
  it('kaynaklardan anlamlı sayıda metin yolu çıkarılır', () => {
    const total = sources.reduce((acc, { source }) => acc + collectPaths(source).length, 0)
    expect(total).toBeGreaterThan(100)
  })

  it.each(['tr', 'en'])('%s dilinde bütün yollar çözülür', (lang) => {
    const problems = []
    for (const { name, source } of sources) {
      problems.push(...scanSource({ name, source, roots: rootsFor(lang, name) }))
    }
    expect(problems).toEqual([])
  })

  it.each(['tr', 'en'])('%s dilinde hiçbir metin boş kalmaz', (lang) => {
    const empty = []
    const walk = (node, trail) => {
      if (typeof node === 'string') {
        if (node.trim() === '') empty.push(trail)
        return
      }
      if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, `${trail}[${i}]`))
        return
      }
      if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) walk(v, `${trail}.${k}`)
      }
    }
    walk(getText(lang), dir)
    // Bilinçli boş dizeler yok; hepsi bir metin taşımalı.
    expect(empty).toEqual([])
  })

  it('iki dil aynı anahtar kümesini taşır', () => {
    const keysOf = (node, trail, out) => {
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        for (const [k, v] of Object.entries(node)) {
          out.push(`${trail}.${k}`)
          keysOf(v, `${trail}.${k}`, out)
        }
      }
      return out
    }
    expect(keysOf(getText('en'), '', [])).toEqual(keysOf(getText('tr'), '', []))
  })

  it('Türkçe ve İngilizce metinler birbirinden farklı', () => {
    // Aynı kalan tek şey teknik terim ve birim olmalı; sözlüğün tamamı birebir
    // aynıysa bir dil doldurulmamış demektir.
    const tr = JSON.stringify(getText('tr'))
    const en = JSON.stringify(getText('en'))
    expect(tr).not.toBe(en)
  })
})

describe('ortak DFM sözlüğü', () => {
  it('iki dil aynı anahtar kümesini taşır', () => {
    const keysOf = (node, trail, out) => {
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        for (const [k, v] of Object.entries(node)) {
          out.push(`${trail}.${k}`)
          keysOf(v, `${trail}.${k}`, out)
        }
      }
      return out
    }
    expect(keysOf(dfmText('en'), '', [])).toEqual(keysOf(dfmText('tr'), '', []))
  })

  it('durum ve kaynak etiketleri iki dilde de doludur', () => {
    for (const lang of ['tr', 'en']) {
      const d = dfmText(lang)
      for (const status of ['ok', 'warning', 'danger', 'unknown']) {
        expect(d.statusLabel(status).length).toBeGreaterThan(0)
      }
      for (const source of ['geometry', 'fab-profile', 'user-rule', 'standard-profile']) {
        expect(d.sourceLabel(source).length).toBeGreaterThan(0)
      }
    }
  })
})
