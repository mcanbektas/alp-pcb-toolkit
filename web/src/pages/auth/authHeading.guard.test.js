// Auth ekranı başlık bekçisi.
//
// Auth ekranları sayfa başlıklarını `h2` ile kuruyordu: araç ekranları `h1`
// kullandığı için "sayfa başına tek `h1`" beklentisi bu beş ekranda bozuktu.
// Auth sayfaları indekslenmiyor, yani SEO etkisi yok — erişilebilirlik etkisi
// var: ekran okuyucunun başlık gezintisi sayfanın adını bulamıyor.
//
// Her dal kendi panelini döndürdüğü için kural sayıya bağlanır: panel başına
// bir `h1`. Yeni bir dal (hata/başarı ekranı) başlıksız eklendiğinde ya da
// başlık `h2`ye geri düştüğünde test düşer.
//
// Bu bir bileşen testi DEĞİLDİR (langLink.guard.test.js ile aynı teknik):
// kaynak dosyaları metin olarak okur.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const authDir = dirname(fileURLToPath(import.meta.url))
const themesDir = join(authDir, '..', '..', 'themes')

const screens = readdirSync(authDir)
  .filter((name) => /\.jsx$/.test(name) && !/\.test\.jsx$/.test(name))
  .map((name) => ({ name, source: readFileSync(join(authDir, name), 'utf8') }))

const count = (source, re) => (source.match(re) ?? []).length

describe('Auth başlık bekçisi', () => {
  it('taranacak ekran bulundu', () => {
    expect(screens.length).toBeGreaterThanOrEqual(5)
  })

  it('her auth paneli tam bir `h1` taşır', () => {
    const found = screens.map(({ name, source }) => ({
      name,
      panels: count(source, /className="panel auth-panel"/g),
      headings: count(source, /<h1[\s>]/g),
    }))
    // Sayıya bağlı kural sıfır-sıfır eşitliğiyle boşa düşebilir: panel hiç
    // bulunamadığında test sessizce yeşil kalırdı.
    expect(found.reduce((n, s) => n + s.panels, 0)).toBeGreaterThanOrEqual(10)
    const offenders = found
      .filter(({ panels, headings }) => panels !== headings)
      .map(({ name, panels, headings }) => `${name}: ${panels} panel, ${headings} h1`)
    expect(offenders).toEqual([])
  })

  // Panel içindeki İKİNCİL başlık `h2` kalır (`<h2 className="section">`) —
  // yasaklanan, sayfa başlığının yeniden `h2`ye düşmesi.
  it('sayfa başlığı `h2`ye geri düşmemiş', () => {
    const offenders = screens
      .filter(({ source }) => /<h2(?![^>]*className="section")/.test(source))
      .map(({ name }) => name)
    expect(offenders).toEqual([])
  })

  // Görünüm kuralı dört temada da tanımlanır; biri unutulursa o tema
  // seçildiğinde başlık tarayıcının varsayılan `h1` biçimine düşer.
  it('`.auth-panel h1` dört temada da tanımlı', () => {
    const themes = readdirSync(themesDir).filter((name) => /\.css$/.test(name))
    expect(themes.length).toBe(4)
    const offenders = themes
      .filter((name) => !/\.auth-panel h1\b/.test(readFileSync(join(themesDir, name), 'utf8')))
    expect(offenders).toEqual([])
  })
})
