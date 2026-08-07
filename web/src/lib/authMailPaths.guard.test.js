// Kimlik postası bağlantı bekçisi.
//
// Postadaki doğrulama ve parola sıfırlama bağlantılarını SUNUCU üretir
// (`api/Alp.Api/Auth/AuthEmailText.cs`), ama yol sözlüğünün asıl kaynağı
// istemcidedir (`lib/routes.js` → `STATIC_ROUTES`). Sunucudaki tablo o
// sözlüğün ikinci kopyasıdır: bir yol istemcide değişip sunucuda unutulursa
// postadaki bağlantı 404'e gider ve kullanıcı hesabını doğrulayamaz. Ne
// derleme ne de bir başka test bunu görür.
//
// Karar ve elenen seçenekler: docs/eposta-dili-karari.md §3.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { staticPath } from './routes.js'
import { LANGS } from './i18n.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const source = readFileSync(join(repoRoot, 'api', 'Alp.Api', 'Auth', 'AuthEmailText.cs'), 'utf8')

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

describe('Kimlik postası bağlantı bekçisi', () => {
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
