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
// ÜRÜN BAŞINA YAPILANDIRMA GELDİ: tablolar artık `AuthEmailText.cs`te değil,
// `ProductMail.cs`te ve iki katmanlı — önce ürün (`pcb`/`comm`), sonra dil.
// Bekçi yalnız `pcb` satırını denetler; Comm kendi SPA'sını kurunca kendi
// deposunda kendi bekçisini yazar. Sunucu tarafında bu varsayılanlar
// `App:Products:<ürün>:ConfirmEmailPath:<dil>` ile ezilebilir — bekçi ezmeyi
// GÖRMEZ, yalnız derlemeye gömülü varsayılanı doğrular.
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
const serverFile = join(repoRoot, '..', 'alp-platform', 'api', 'Alp.Api', 'Auth', 'ProductMail.cs')
const source = existsSync(serverFile) ? readFileSync(serverFile, 'utf8') : null

// `Dictionary<string, Dictionary<string, string>> <Ad> = new() { [Pcb] = new()
//  { ["tr"] = "…", ["en"] = "…" }, [Comm] = new() { … } };`
// Dış blok `[Pcb]` satırına kadar okunur, dil sözlüğü o satırdan çıkarılır.
function serverPaths(name) {
  const outer = new RegExp(`${name}\\s*=\\s*new\\(\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\};`).exec(source)?.[1]
  const block = outer ? /\[Pcb\]\s*=\s*new\(\)\s*\{([^}]*)\}/.exec(outer)?.[1] : null
  if (!block) return null
  const out = {}
  for (const [, lang, path] of block.matchAll(/\["(\w+)"\]\s*=\s*"([^"]+)"/g)) out[lang] = path
  return out
}

const TABLES = [
  { name: 'DefaultConfirmEmailPath', route: 'confirmEmail' },
  { name: 'DefaultResetPasswordPath', route: 'resetPassword' },
  { name: 'DefaultUnlockAccountPath', route: 'unlockAccount' },
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
