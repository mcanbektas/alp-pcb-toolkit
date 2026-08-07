// Yönetim geniş düzen bekçisi (docs/brifler/13-yonetim-genis-duzen.md).
//
// Admin sayfaları (`isAdminPath`) site genelinin 1400/1360px genişlik
// sözleşmesine uymuyor — bunun için üç seçici (.container-wide, .cell-wrap,
// .dialog-wide) dört temanın DÖRDÜNDE de tanımlı olmak zorunda; biri
// unutulursa o tema seçildiğinde admin ekranı sessizce eski dar hâline
// düşer, build de testin geri kalanı da bunu yakalamaz (authHeading.guard.
// test.js ile aynı teknik ve gerekçe).
//
// Yalnız VAR OLMA yetmez: `.container-wide` `.container`la AYNI özgüllükte
// (0,1,0), yalnız kaynak sırasıyla kazanır — biri `.container`dan ÖNCEYE ya
// da bir `@media` bloğunun içine taşınırsa hiçbir şey değişmez ama seçici
// hâlâ dosyada "var" görünür. Bu yüzden sıra ve gerçek `max-width` değeri de
// ayrıca doğrulanır.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const adminDir = dirname(fileURLToPath(import.meta.url))
const themesDir = join(adminDir, '..', '..', 'themes')

function themeFiles() {
  return readdirSync(themesDir).filter((name) => /\.css$/.test(name))
}

describe('Yönetim geniş düzen bekçisi', () => {
  it('4 tema dosyası bulundu', () => {
    expect(themeFiles().length).toBe(4)
  })

  it('.container-wide dört temada da tanımlı, .container SONRASINDA ve 1720px', () => {
    const offenders = themeFiles().filter((name) => {
      const css = readFileSync(join(themesDir, name), 'utf8')
      const containerAt = css.indexOf('.container {')
      const wideAt = css.search(/\.container-wide\s*\{\s*max-width:\s*1720px/)
      return containerAt === -1 || wideAt === -1 || wideAt < containerAt
    })
    expect(offenders).toEqual([])
  })

  it('.cell-wrap dört temada da tanımlı, min-width 280px taşıyor', () => {
    const offenders = themeFiles().filter((name) => {
      const css = readFileSync(join(themesDir, name), 'utf8')
      return !/\.cell-wrap\s*\{[^}]*min-width:\s*280px/s.test(css)
    })
    expect(offenders).toEqual([])
  })

  it('.dialog-wide dört temada da tanımlı, .confirm-dialog SONRASINDA ve 720px', () => {
    const offenders = themeFiles().filter((name) => {
      const css = readFileSync(join(themesDir, name), 'utf8')
      const baseAt = css.indexOf('dialog.confirm-dialog {')
      const wideAt = css.search(/dialog\.confirm-dialog\.dialog-wide\s*\{\s*max-width:\s*720px/)
      return baseAt === -1 || wideAt === -1 || wideAt < baseAt
    })
    expect(offenders).toEqual([])
  })
})
