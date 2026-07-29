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
  it('en az 29 araç ekranı bulunur', () => {
    expect(screens.length).toBeGreaterThanOrEqual(29)
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
