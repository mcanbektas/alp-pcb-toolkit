// Durum çipi tek kaynak bekçisi.
//
// F turunda 29 ekranın kopya çip mantığı (`LEVEL_RANK` + satır içi
// `worst → {cls,text}` if-zinciri) `lib/statusChip.js`'e indirildi. Bu test o
// birleşmenin geri sızmasını engeller: bir ekran yeniden kendi eşlemesini
// yazarsa (ya da yeni bir ekran kopyalayarak doğarsa) CLAUDE.md'nin "durum
// çipi tek kurala bağlıdır" kuralı sessizce yeniden bozulurdu.
//
// dfmTextPaths/toolKeys ile aynı teknik: kaynak dosyaları metin olarak tarar,
// bileşen render etmez.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

const screens = readdirSync(here, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => ({ dir: e.name, file: join(here, e.name, 'index.jsx') }))
  .filter((s) => existsSync(s.file))
  .map((s) => ({ ...s, source: readFileSync(s.file, 'utf8') }))

// Çip GÖSTEREN ekran (`className={`status ...`}`) mutlaka merkezî yardımcıyı
// kullanmalı. Çip göstermeyen (saf dönüştürücü) ekranlar muaf.
const withChip = screens.filter((s) => /className=\{`status /.test(s.source))

describe('durum çipi tek kaynaktan gelir', () => {
  it('en az 20 ekran çip gösterir (tarama gerçekten çalışıyor)', () => {
    expect(withChip.length).toBeGreaterThanOrEqual(20)
  })

  it.each(withChip)('$dir kendi LEVEL_RANK\'ini tanımlamaz', ({ source }) => {
    expect(source).not.toMatch(/const LEVEL_RANK\b/)
  })

  it.each(withChip)('$dir satır içi çip eşlemesi yazmaz (statusChip kullanır)', ({ source }) => {
    // `{ cls: 'ok', text: ui.statusOk }` gibi elle kurulmuş çip nesnesi kalmamalı.
    expect(source).not.toMatch(/cls:\s*'(ok|warn|danger|unknown)'/)
    expect(source).toMatch(/statusChip\(/)
  })
})
