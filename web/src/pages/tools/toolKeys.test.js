// Araç anahtarı ↔ katalog tutarlılığı.
//
// Bir hesabın kalıcı kimliği `SaveToProject`'e verilen `toolKey`'dir; kayıt
// veritabanına onunla yazılır. Proje listesindeki araç adı ve "Aç" bağlantısı
// ise `data/categories.js`'teki `id` alanı üzerinden bulunur. İkisi ayrışırsa
// build de test de sessiz kalır, kullanıcı ise ham anahtar görür ve kaydını
// geri açamaz — üç DFM aracında tam olarak bu olmuştu.
//
// Bu bir bileşen testi DEĞİLDİR (dfmTextPaths.test.js ile aynı gerekçe):
// kaynak dosyaları metin olarak okur, `toolKey` alanlarını çıkarır ve katalogla
// karşılaştırır.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIES, findTool } from '../../data/categories'

const here = dirname(fileURLToPath(import.meta.url))

const screens = readdirSync(here, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => ({ dir: e.name, file: join(here, e.name, 'index.jsx') }))
  .filter((s) => existsSync(s.file))
  .map((s) => ({
    ...s,
    source: readFileSync(s.file, 'utf8'),
  }))
  .map((s) => ({ ...s, toolKey: s.source.match(/toolKey="([^"]+)"/)?.[1] ?? null }))

describe('araç anahtarları', () => {
  // Alt sınır KATALOGDAN türer, elle tutulmaz: sabit sayı (29) REV2'yle 17
  // ekran eklenmesine rağmen güncellenmemişti ve bekçi zayıflamıştı — 15 ekran
  // birden dizinden düşse bile `44 >= 29` geçiyordu.
  it('katalogdaki aktif araç sayısı kadar ekran dizini bulunur', () => {
    const aktif = CATEGORIES.flatMap((c) => c.tools ?? []).filter((t) => t.path).length
    expect(screens.length).toBeGreaterThanOrEqual(aktif)
  })

  it.each(screens)('$dir ekranı bir toolKey verir', ({ toolKey }) => {
    expect(toolKey).toBeTruthy()
  })

  it.each(screens)('$dir ekranının toolKey\'i katalogda vardır', ({ toolKey }) => {
    expect(findTool(toolKey)).not.toBeNull()
  })

  it.each(screens)('$dir ekranı SaveToProject\'e kayıt bağını geçirir', ({ source }) => {
    // Bağ geçirilmezse ekran her kaydetmede yeni satır açar; kopya kayıt
    // sessizce geri gelir.
    expect(source).toMatch(/useSavedCalculation\(\{/)
    expect(source).toMatch(/saved=\{saved(Calc)?\}/)
  })

  it('katalogdaki her aktif aracın bir ekranı vardır', () => {
    const keys = new Set(screens.map((s) => s.toolKey))
    const orphans = CATEGORIES
      .flatMap((c) => c.tools)
      .filter((t) => t.path && !keys.has(t.id))
      .map((t) => t.id)
    expect(orphans).toEqual([])
  })

  it('aynı toolKey iki ekranda kullanılmaz', () => {
    const seen = new Map()
    for (const s of screens) seen.set(s.toolKey, [...(seen.get(s.toolKey) ?? []), s.dir])
    const duplicates = [...seen.entries()].filter(([, dirs]) => dirs.length > 1)
    expect(duplicates).toEqual([])
  })
})

// İki dilli URL ağacının katalog tarafı. `path` varken `slugEn` eksikse o
// aracın İngilizce sayfası hiç üretilmez ve Türkçe sayfa VAR OLMAYAN bir
// alternatife hreflang verir — build de test de sessiz kalırdı.
describe('İngilizce slug\'lar', () => {
  const activeTools = CATEGORIES.flatMap((c) => c.tools).filter((t) => t.path)

  it('aktif her aracın slugEn alanı vardır', () => {
    const missing = activeTools.filter((t) => !t.slugEn).map((t) => t.id)
    expect(missing).toEqual([])
  })

  it('her kategorinin slugEn alanı vardır', () => {
    const missing = CATEGORIES.filter((c) => !c.slugEn).map((c) => c.slug)
    expect(missing).toEqual([])
  })

  it.each([
    ['araç', () => activeTools.map((t) => t.slugEn)],
    ['kategori', () => CATEGORIES.map((c) => c.slugEn)],
  ])('%s slugEn değerleri benzersiz ve URL güvenlidir', (_ad, get) => {
    const slugs = get()
    expect(new Set(slugs).size).toBe(slugs.length)
    // Büyük harf, boşluk, Türkçe karakter ve eğik çizgi URL'de ya kaçışlanır
    // ya da yolu ikiye böler; ikisi de sessiz kırılma demek.
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
})

// Rota tablosu artık katalogdan üretiliyor (`App.jsx` → langRoutes) ve elle
// tutulan tek şey araç `id` → ekran eşlemesi. Katalogda aktif olup eşlemede
// olmayan araç ROTASIZ kalır: build hatası yok, kullanıcı 404 görür.
//
// `App.jsx` metin olarak okunur — bileşen testi değil, dfmTextPaths.test.js
// ile aynı teknik.
describe('TOOL_SCREENS eşlemesi', () => {
  const appSource = readFileSync(join(here, '..', '..', 'App.jsx'), 'utf8')
  const block = appSource.match(/const TOOL_SCREENS = \{([\s\S]*?)\n\}/)?.[1] ?? ''
  const mapped = new Set(
    [...block.matchAll(/^\s*'?([a-z0-9-]+)'?\s*:/gm)].map((m) => m[1]),
  )

  it('eşleme okunabildi', () => {
    const aktif = CATEGORIES.flatMap((c) => c.tools ?? []).filter((t) => t.path).length
    expect(mapped.size).toBeGreaterThanOrEqual(aktif)
  })

  it('katalogdaki her aktif aracın rotası üretilir', () => {
    const orphans = CATEGORIES
      .flatMap((c) => c.tools)
      .filter((t) => t.path && !mapped.has(t.id))
      .map((t) => t.id)
    expect(orphans).toEqual([])
  })

  it('eşlemede katalogda olmayan anahtar yoktur', () => {
    const known = new Set(CATEGORIES.flatMap((c) => c.tools).map((t) => t.id))
    expect([...mapped].filter((id) => !known.has(id))).toEqual([])
  })
})
