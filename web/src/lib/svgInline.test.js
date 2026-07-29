import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { RULES, VAR_NAMES, resolveVars, inlineSvg } from './svgInline'

const HERE = path.dirname(fileURLToPath(import.meta.url))

// theme.css'in @import satırından aktif tema dosyasını okur — elle
// güncellenen bir dosya adı yerine gerçek kaynaktan çözülür, o yüzden tema
// değiştirildiğinde bu test otomatik olarak DOĞRU dosyayı denetler.
function activeThemeFile() {
  const themeCss = readFileSync(path.join(HERE, '../theme.css'), 'utf8')
  const m = themeCss.match(/@import\s+['"](\.\/themes\/[\w.-]+\.css)['"]/)
  if (!m) throw new Error('theme.css içinde @import satırı bulunamadı')
  return path.join(HERE, '..', m[1])
}

// `:root { --x: değer; ... }` bloğundaki değişken adlarını çıkarır. Basit
// bir ayrıştırıcı — tema dosyaları tek düz bir :root bloğu kullanır, iç içe
// seçici veya medya sorgusu içinde değişken tanımlamaz.
function themeVarNames(css) {
  const names = new Set()
  for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) names.add(m[1])
  return names
}

describe('svgInline — aktif temayla sürüklenme denetimi', () => {
  it('VAR_NAMES içindeki her değişken aktif tema dosyasında tanımlı', () => {
    const css = readFileSync(activeThemeFile(), 'utf8')
    const defined = themeVarNames(css)
    const missing = VAR_NAMES.filter((n) => !defined.has(n))
    expect(missing, `aktif temada eksik: ${missing.join(', ')}`).toEqual([])
  })

  it('RULES içinde kullanılan her var(--x) adı VAR_NAMES kümesinde', () => {
    const used = new Set()
    for (const decl of Object.values(RULES)) {
      for (const value of Object.values(decl)) {
        for (const m of String(value).matchAll(/var\((--[\w-]+)\)/g)) used.add(m[1])
      }
    }
    // --tone RULES içinde ÜRETİLEN bir özel özelliktir (tone-N sınıfları),
    // VAR_NAMES'te olması gerekmez — kaynağı theme.css değil, kendi RULES'u.
    used.delete('--tone')
    const missing = [...used].filter((n) => !VAR_NAMES.includes(n))
    expect(missing, `VAR_NAMES'te eksik: ${missing.join(', ')}`).toEqual([])
  })
})

describe('resolveVars', () => {
  const vars = { '--accent': '#007937', '--bg': '#f0f8f1' }

  it('doğrudan bir değişkeni çözer', () => {
    expect(resolveVars('var(--accent)', vars)).toBe('#007937')
  })

  it('kapsam (scope) üzerinden iki kademeli değişkeni çözer', () => {
    // tone-1 gibi: --tone -> --series-1 -> gerçek renk
    const scope = { '--tone': 'var(--accent)' }
    expect(resolveVars('var(--tone)', vars, scope)).toBe('#007937')
  })

  it('bilinmeyen değişkeni olduğu gibi bırakır', () => {
    expect(resolveVars('var(--yok)', vars)).toBe('var(--yok)')
  })
})

describe('inlineSvg', () => {
  const vars = {
    '--accent': '#007937', '--surface': '#ffffff', '--bg': '#f0f8f1',
    '--series-1': '#22914e', '--series-2': '#855a00',
    // Tarayıcının GERÇEKTEN döndürdüğü biçim: `getComputedStyle` yazı tipi
    // adını ÇİFT tırnağa normalleştirir (CSS kaynağında tek tırnak yazsa
    // bile). Fikstür tırnaksız bırakıldığı için kaçış hatası testlerden
    // kaçmıştı ve PDF üretimini tümüyle düşürüyordu.
    '--muted': '#5d6e60', '--text': '#1c261e',
    '--font-mono': '"IBM Plex Mono", ui-monospace, monospace',
  }

  it('sınıf bildirimini satır içi özniteliğe çevirir', () => {
    const out = inlineSvg('<rect class="sch-copper" x="1" y="2"/>', vars)
    expect(out).toContain('fill="#007937"')
    expect(out).toContain('stroke="#007937"')
    expect(out).not.toContain('class=')
  })

  it('elemanda zaten yazılı öznitelik sınıftan geleni ezmez', () => {
    const out = inlineSvg('<rect class="sch-copper" fill="#ff0000"/>', vars)
    expect(out).toContain('fill="#ff0000"')
  })

  it('öznitelik içine doğrudan yazılmış var(--x) çağrısını çözer', () => {
    const out = inlineSvg('<circle fill="var(--bg)" stroke="var(--accent)"/>', vars)
    expect(out).toContain('fill="#f0f8f1"')
    expect(out).toContain('stroke="#007937"')
  })

  it('tone-N sınıfını iki kademeli olarak çözer', () => {
    const out = inlineSvg('<path class="chart-line tone-1"/>', vars)
    expect(out).toContain('stroke="#22914e"')
  })

  it('<g> üzerinde stroke mirası bırakılabilecek şekilde satır içi yazar', () => {
    const out = inlineSvg('<g class="sch-dim"><line x1="0" y1="0" x2="1" y2="1"/></g>', vars)
    expect(out).toMatch(/<g[^>]*stroke="#\w+"/)
  })

  // --- Öznitelik kaçışı ---
  //
  // Bu blok gerçek bir arızayı kilitler: kaçış olmadan
  // `font-family=""IBM Plex Mono", …"` üretiliyordu, öznitelik ilk tırnakta
  // kapanıyor ve QuestPDF SVG'yi hiç çözemeyip RAPORUN TAMAMINI düşürüyordu.
  it('tema değerindeki çift tırnağı kaçırır', () => {
    const out = inlineSvg('<text class="sch-label">pad</text>', vars)
    expect(out).toContain('font-family="&quot;IBM Plex Mono&quot;, ui-monospace, monospace"')
    // Kaçışsız hâlin imzası: çıplak çift tırnaklı yazı tipi adı çıktıda
    // hiçbir yerde kalmamalı — kaldığı an öznitelik erken kapanıyor demektir.
    expect(out).not.toContain('"IBM Plex Mono"')
  })

  it('enjekte edilen değerde & ve < karakterlerini kaçırır', () => {
    const out = inlineSvg('<text class="sch-label">x</text>', {
      ...vars,
      '--font-mono': 'A & B <C>',
    })
    expect(out).toContain('font-family="A &amp; B &lt;C&gt;"')
  })

  it('mevcut öznitelikteki var() çözümünde tırnağı kaçırır', () => {
    const out = inlineSvg('<text font-family="var(--font-mono)">x</text>', vars)
    expect(out).toContain('font-family="&quot;IBM Plex Mono&quot;, ui-monospace, monospace"')
  })

  it('mevcut öznitelikteki varlıkları İKİNCİ kez kaçırmaz', () => {
    // `&amp;` zaten kaçırılmış; tekrar kaçırılırsa `&amp;amp;` olur ve metin bozulur.
    const out = inlineSvg('<text aria-label="a &amp; b var(--accent)">x</text>', vars)
    expect(out).toContain('a &amp; b #007937')
    expect(out).not.toContain('&amp;amp;')
  })

  it('çıktıda hiçbir var(--x) veya class= kalmaz', () => {
    const out = inlineSvg(
      '<g class="sch-current"><line class="sch-arrow" x1="0" y1="0" x2="1" y2="1"/>'
      + '<text class="sch-value">I</text></g>',
      vars,
    )
    expect(out).not.toMatch(/var\(/)
    expect(out).not.toMatch(/class=/)
  })
})
