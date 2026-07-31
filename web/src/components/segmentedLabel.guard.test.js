// `Segmented` adı bekçisi.
//
// `Segmented` `role="radiogroup"` ilan eder ve grubun adını `label` prop'undan
// alır. Prop isteğe bağlı olduğu için eksikliği `aria-label={undefined}` olarak
// SESSİZCE geçer: build de tip denetimi de birim testleri de görmez, tek
// belirti ekran okuyucunun "radio group" diye adsız duyurmasıdır. Bir ekranda
// iki grup varsa ikisi birbirinden ayırt edilemez.
//
// Bu bir bileşen testi DEĞİLDİR (langLink.guard.test.js ile aynı teknik):
// kaynak dosyaları metin olarak okur, hiçbir şey render etmez.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

// Bileşenin kendi tanımı: `label` orada prop olarak GEÇİLMEZ, okunur.
const DEFINITION = 'components/Segmented.jsx'

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.jsx?$/.test(entry) && !/\.test\.jsx?$/.test(entry)) out.push(full)
  }
  return out
}

// Her `<Segmented` çağrısını açılış etiketinin sonuna kadar çıkarır. Bileşen
// her yerde kendi kendini kapatır; yine de arama `>` ile sınırlanır ki bir gün
// çocuk alırsa test sessizce dosyanın kalanını yutmasın.
function segmentedTags(source) {
  const tags = []
  const re = /<Segmented\b/g
  let m = re.exec(source)
  while (m) {
    const end = source.indexOf('>', m.index)
    tags.push(source.slice(m.index, end === -1 ? source.length : end + 1))
    m = re.exec(source)
  }
  return tags
}

const uses = walk(srcDir)
  .map((full) => ({
    rel: relative(srcDir, full).split('\\').join('/'),
    source: readFileSync(full, 'utf8'),
  }))
  .filter(({ rel }) => rel !== DEFINITION)
  .flatMap(({ rel, source }) => segmentedTags(source).map((tag, i) => ({ rel, i, tag })))

describe('Segmented adı bekçisi', () => {
  it('taranacak çağrı bulundu', () => {
    // Sayı bilerek "en az" — yeni ekran eklendiğinde test güncellenmek zorunda
    // kalmasın, ama tarayıcı boşa düştüğünde sessizce yeşil de kalmasın.
    expect(uses.length).toBeGreaterThanOrEqual(31)
  })

  it('her `<Segmented` bir `label` taşır', () => {
    const offenders = uses
      .filter(({ tag }) => !/[\s{]label=/.test(tag))
      .map(({ rel, i }) => `${rel} #${i + 1}`)
    expect(offenders).toEqual([])
  })

  // Ad iki dilli olmak zorunda: `text.js` / `uiText.js` üzerinden gelir.
  // Çıplak dize İngilizce arayüzde Türkçe ad basar.
  it('`label` çıplak dize değildir', () => {
    const offenders = uses
      .filter(({ tag }) => /[\s{]label=['"]/.test(tag))
      .map(({ rel, i }) => `${rel} #${i + 1}`)
    expect(offenders).toEqual([])
  })

  // Aynı dosyadaki iki grup aynı adı taşırsa ekran okuyucu ikisini yine
  // ayırt edemez — adsızlıkla aynı sonuç, farklı görünüm.
  it('aynı dosyadaki gruplar aynı adı paylaşmaz', () => {
    const byFile = new Map()
    for (const { rel, tag } of uses) {
      const label = /[\s{]label=\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/.exec(tag)?.[1]?.trim()
      if (!label) continue
      if (!byFile.has(rel)) byFile.set(rel, [])
      byFile.get(rel).push(label)
    }
    const offenders = [...byFile.entries()]
      .filter(([, labels]) => new Set(labels).size !== labels.length)
      .map(([rel]) => rel)
    expect(offenders).toEqual([])
  })
})
