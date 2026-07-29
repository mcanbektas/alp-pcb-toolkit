// Rapor için SVG serileştirme — docs/uyelik-ve-rapor-plani.md §5.1.1.
//
// Şematik ve grafik zaten ekranda çizili duruyor; canlı DOM düğümünün
// `outerHTML`'i alınır (bkz. çağıran taraf: report.js dosyaları). Bu, o
// dizeyi rapora gömülebilir hâle getirir: sınıflardan gelen stilleri ve
// `var(--x)` çağrılarını satır içi özniteliğe çevirir. QuestPDF'in SVG
// çözümleyicisi CSS okumaz, yalnızca öznitelik okur.
//
// Palet elle kopyalanmaz — `resolveVars` her zaman `readActiveThemeVars()`
// çağrısıyla DOM'dan (document.documentElement) okunan GERÇEK değerleri
// kullanır. Yalnızca "hangi sınıf hangi CSS değişkenine bakar" eşlemesi
// (`RULES`) sabittir; bu, dört tema dosyasının da uyguladığı ORTAK sınıf
// sözleşmesidir (CLAUDE.md: "hepsi aynı sınıf sözlüğünü uygular"), tema
// dosyası değişse bile aynı kalması gerekir. `svgInline.test.js` bu
// sözleşmenin aktif tema dosyasından sapmadığını denetler.

// theme sınıf sözlüğü — src/themes/*.css'teki ORTAK sınıf sözleşmesinden.
// Değer üretim (declaration) kümesidir; gerçek renk burada YOK.
export const RULES = {
  // --- şematik (src/components/Schematic.jsx) ---
  'sch-wire': { stroke: 'var(--accent-dim)', 'stroke-width': '2', fill: 'none', 'stroke-linecap': 'round' },
  'sch-part': { stroke: 'var(--accent)', 'stroke-width': '2', fill: 'var(--surface)' },
  off: { stroke: 'var(--line)' },
  'sch-dash': { 'stroke-dasharray': '4 3' },
  'sch-node': { fill: 'var(--accent)' },
  'sch-body': { fill: 'var(--bg)', stroke: 'var(--muted)', 'stroke-width': '1' },
  'sch-band': { stroke: 'var(--muted)', 'stroke-width': '0.5' },
  'sch-dielectric': { fill: 'var(--raised)', stroke: 'var(--line)', 'stroke-width': '1' },
  'sch-copper': { fill: 'var(--accent)', stroke: 'var(--accent)', 'stroke-width': '1' },
  'sch-copper-fill': { fill: 'var(--green-deep)', stroke: 'var(--accent-dim)', 'stroke-width': '1' },
  'sch-dim': { stroke: 'var(--muted)', 'stroke-width': '1', fill: 'none' },
  'sch-hole': { fill: 'var(--bg)' },
  'sch-arrow': { stroke: 'var(--accent)', 'stroke-width': '1.5', 'stroke-linecap': 'round' },
  'sch-arrow-head': { fill: 'var(--accent)' },
  'sch-label': { fill: 'var(--text)', 'font-family': 'var(--font-mono)', 'font-size': '11px', 'font-weight': '600' },
  'sch-value': { fill: 'var(--text)', 'font-family': 'var(--font-mono)', 'font-size': '10px', 'font-weight': '600' },
  'band-black': { fill: 'var(--band-black)' },
  'band-brown': { fill: 'var(--band-brown)' },
  'band-red': { fill: 'var(--band-red)' },
  'band-orange': { fill: 'var(--band-orange)' },
  'band-yellow': { fill: 'var(--band-yellow)' },
  'band-green': { fill: 'var(--band-green)' },
  'band-blue': { fill: 'var(--band-blue)' },
  'band-violet': { fill: 'var(--band-violet)' },
  'band-grey': { fill: 'var(--band-grey)' },
  'band-white': { fill: 'var(--band-white)' },
  'band-gold': { fill: 'var(--band-gold)' },
  'band-silver': { fill: 'var(--band-silver)' },

  // --- ton: iki kademeli değişken (src/components/LineChart.jsx toneClass) ---
  'tone-1': { '--tone': 'var(--series-1)' },
  'tone-2': { '--tone': 'var(--series-2)' },
  'tone-3': { '--tone': 'var(--series-3)' },
  'tone-4': { '--tone': 'var(--series-4)' },
  'tone-muted': { '--tone': 'var(--muted)' },
  'tone-accent': { '--tone': 'var(--accent)' },

  // --- grafik ---
  'chart-grid': { stroke: 'var(--line)', 'stroke-width': '1' },
  'chart-axis': { stroke: 'var(--line)', 'stroke-width': '1' },
  'chart-tick': { fill: 'var(--muted)', 'font-family': 'var(--font-mono)', 'font-size': '10px' },
  'chart-axis-label': { fill: 'var(--muted)', 'font-family': 'var(--font-mono)', 'font-size': '10px' },
  'chart-line': { fill: 'none', stroke: 'var(--tone)', 'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' },
  'chart-band': { stroke: 'none', fill: 'var(--tone)', opacity: '0.16' },
  'chart-dot': { fill: 'var(--tone)' },
  'chart-ref': { stroke: 'var(--muted)', 'stroke-width': '1', 'stroke-dasharray': '5 4', fill: 'none' },
  'chart-marker-ring': { fill: 'none', stroke: 'var(--surface)', 'stroke-width': '2' },
  'chart-marker': { fill: 'var(--accent)' },
  'chart-crosshair': { stroke: 'var(--muted)', 'stroke-width': '1', 'stroke-dasharray': '3 3' },
  'chart-tip-box': { fill: 'var(--raised)', stroke: 'var(--line)', 'stroke-width': '1' },
  'chart-tip-text': { fill: 'var(--text)', 'font-family': 'var(--font-mono)', 'font-size': '11px' },
  dim: { fill: 'var(--muted)' },
  'chart-empty': { fill: 'var(--muted)', 'font-family': 'var(--font-mono)', 'font-size': '11px' },
}

// Bu isimlerin GERÇEK karşılığı hep canlı DOM'dan okunur — burada hardcode
// değer yoktur. `readActiveThemeVars` bunları `:root` üstünde arar.
export const VAR_NAMES = [
  '--bg', '--surface', '--raised', '--line', '--green-deep', '--accent', '--accent-dim',
  '--text', '--muted', '--warn', '--danger',
  '--series-1', '--series-2', '--series-3', '--series-4',
  '--band-black', '--band-brown', '--band-red', '--band-orange', '--band-yellow',
  '--band-green', '--band-blue', '--band-violet', '--band-grey', '--band-white',
  '--band-gold', '--band-silver',
  '--font-mono', '--font-body', '--font-display',
]

// Tarayıcıda: aktif temanın gerçek değerlerini `:root`'tan okur. Testte
// (DOM yok) elle bir değer haritası verilebilir — bkz. svgInline.test.js.
export function readActiveThemeVars(doc = typeof document === 'undefined' ? null : document) {
  if (!doc) return {}
  const style = getComputedStyle(doc.documentElement)
  const out = {}
  for (const name of VAR_NAMES) {
    const v = style.getPropertyValue(name).trim()
    if (v) out[name] = v
  }
  return out
}

// var(--x) çözümü. Kapsam: elemanın kendi özel özellikleri, sonra verilen
// tema haritası. İç içe geçebilir (--tone → --series-1 → #22914e), o yüzden
// sabit noktaya kadar yinelenir.
export function resolveVars(value, themeVars, scope = {}) {
  let out = String(value)
  for (let pass = 0; pass < 5; pass++) {
    const next = out.replace(/var\((--[\w-]+)\)/g, (m, name) => scope[name] ?? themeVars[name] ?? m)
    if (next === out) break
    out = next
  }
  return out
}

function attrsForClasses(classList, themeVars) {
  const custom = {}
  const decl = {}
  for (const cls of classList) {
    const rule = RULES[cls]
    if (!rule) continue
    for (const [k, v] of Object.entries(rule)) {
      if (k.startsWith('--')) custom[k] = v
      else decl[k] = v
    }
  }
  for (const k of Object.keys(custom)) custom[k] = resolveVars(custom[k], themeVars, custom)

  const out = {}
  for (const [k, v] of Object.entries(decl)) out[k] = resolveVars(v, themeVars, custom)
  return out
}

// Dize üzerinde yürür — çağıran taraf `svgEl.outerHTML`'i verir.
export function inlineSvg(svg, themeVars) {
  let out = svg.replace(/<([a-zA-Z]+)([^>]*?)\sclass="([^"]*)"([^>]*?)(\/?)>/g,
    (m, tag, pre, classes, post, selfClose) => {
      const attrs = attrsForClasses(classes.trim().split(/\s+/), themeVars)
      const own = new Set()
      for (const seg of [pre, post]) {
        for (const mm of seg.matchAll(/([\w-]+)\s*=/g)) own.add(mm[1])
      }
      const add = Object.entries(attrs)
        .filter(([k]) => !own.has(k))
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      return `<${tag}${pre}${post}${add ? ' ' + add : ''}${selfClose}>`
    })

  // Öznitelik içine doğrudan yazılmış var(--x) çağrıları (ör. Schematic.jsx
  // → Terminal bileşeni: fill="var(--bg)").
  out = out.replace(/="([^"]*var\(--[\w-]+\)[^"]*)"/g, (m, v) => `="${resolveVars(v, themeVars)}"`)

  return out
}

// Kolaylık sarmalayıcı: canlı bir <svg> düğümünü doğrudan alır.
export function serializeSvgElement(svgEl) {
  return inlineSvg(svgEl.outerHTML, readActiveThemeVars())
}
