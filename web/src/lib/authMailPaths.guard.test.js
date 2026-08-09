// Kimlik postası bağlantı bekçisi.
//
// Postadaki doğrulama ve parola sıfırlama bağlantılarını SUNUCU üretir
// (`AuthEmailText.cs`), ama yol sözlüğünün asıl kaynağı istemcidedir
// (`lib/routes.js` → `STATIC_ROUTES`). Sunucudaki tablo o sözlüğün ikinci
// kopyasıdır: bir yol istemcide değişip sunucuda unutulursa postadaki bağlantı
// 404'e gider ve kullanıcı hesabını doğrulayamaz. Ne derleme ne de bir başka
// test bunu görür.
//
// AYRIŞTIRMA SONRASI (Faz 0): sunucu artık başka bir depodadır (alp-platform).
// Bekçi iki depo KARDEŞ DİZİNLERDE duruyorsa koşar, bulamazsa kendini atlar —
// CI'da ve imaj derlemesinde atlanır, çünkü orada yalnız bu depo checkout
// edilir. Yani koruma yerelde kalır, boru hattında kalmaz.
//
// Kalıcı çözüm Faz 3'e bırakıldı ve sabit tabloyu tümden değiştirecek: auth
// mail yolları ÜRÜN BAŞINA yapılandırmaya taşınacak (Comm'un da kendi
// doğrulama sayfası olacak, tek sabit tablo zaten yetmeyecek). O gün bu dosya
// da yerini o modelin testine bırakır.
//
// Karar ve elenen seçenekler: docs/eposta-dili-karari.md §3.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { staticPath } from './routes.js'
import { LANGS } from './i18n.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
// Kardeş dizin varsayımı: <bir dizin>/alp-pcb-toolkit + <bir dizin>/alp-platform
const serverFile = join(repoRoot, '..', 'alp-platform', 'api', 'Alp.Api', 'Auth', 'AuthEmailText.cs')
const source = existsSync(serverFile) ? readFileSync(serverFile, 'utf8') : null

// `private static readonly Dictionary<string, string> <Ad> = new() { ["tr"] = "…", … };`
function serverPaths(name) {
  const block = new RegExp(`${name}\\s*=\\s*new\\(\\)\\s*\\{([^}]*)\\}`).exec(source)?.[1]
  if (!block) return null
  const out = {}
  for (const [, lang, path] of block.matchAll(/\["(\w+)"\]\s*=\s*"([^"]+)"/g)) out[lang] = path
  return out
}

const TABLES = [
  { name: 'ConfirmEmailPaths', route: 'confirmEmail' },
  { name: 'ResetPasswordPaths', route: 'resetPassword' },
  { name: 'UnlockAccountPaths', route: 'unlockAccount' },
]

// Sunucu kaynağı yoksa bekçi ATLANIR — kırmızı vermez. Kırmızı vermesi
// yanlış olurdu: burada kanıtlanmış bir uyuşmazlık yok, ölçüm yapılamamış
// durum var. `describe.skip` bunu koşum çıktısında görünür kılar.
const guard = source ? describe : describe.skip

guard('Kimlik postası bağlantı bekçisi', () => {
  it('sunucudaki yol tabloları okunabildi', () => {
    for (const { name } of TABLES) {
      expect(serverPaths(name), name).not.toBeNull()
    }
  })

  it('sunucudaki yollar istemcideki rota sözlüğüyle aynı', () => {
    const offenders = []
    for (const { name, route } of TABLES) {
      const table = serverPaths(name) ?? {}
      for (const lang of LANGS) {
        const expected = staticPath(route, lang)
        if (table[lang] !== expected) {
          offenders.push(`${name}[${lang}]: sunucu ${table[lang]} ≠ istemci ${expected}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('sunucu her dili tanımlar — eksik dil sessizce Türkçeye düşmez', () => {
    for (const { name } of TABLES) {
      expect(Object.keys(serverPaths(name) ?? {}).sort()).toEqual([...LANGS].sort())
    }
  })
})
