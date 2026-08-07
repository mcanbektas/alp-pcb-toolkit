// Yol sözlüğü — saf katman: React, DOM ve tarayıcı API'si bilmez.
//
// Uygulama iki dilli URL ağacı taşır. TÜRKÇE YOL KANONİKTİR, İngilizce sürüm
// `/en` öneki ve İngilizce segmentlerle yaşar:
//
//   /                     ↔  /en
//   /kategori/empedans    ↔  /en/category/controlled-impedance
//   /arac/gerilim-bolucu  ↔  /en/tool/voltage-divider
//   /giris                ↔  /en/login
//   /proje/42             ↔  /en/project/42
//
// TEK KURAL: kaynak kodda her zaman KANONİK (TR) yol yazılır, çeviri render
// anında `components/LangLink.jsx` ile yapılır. Ekranlara ikinci bir yol
// sözlüğü ya da `lang === 'en' ? … : …` koşulu dağılmaz.
//
// Dil önekinin bütün rotaları kapsaması bilinçlidir — auth ve hesap sayfaları
// indekslenmiyor ama İngilizce ağaçtaki kullanıcı "Sign in"e bastığında
// dilinden düşmemeli. Kararların tamamı: docs/en-url-karari.md.

import { CATEGORIES } from '../data/categories.js'
import { LEGAL_DOCS } from '../data/legalPages.js'
import { DEFAULT_LANG, LANGS, isLang } from './i18n.js'

// Dil öneki. Varsayılan dil ÖNEKSİZDİR: TR yollar bu işten önce de böyleydi
// ve kayıtlı bağlantılar kırılmasın diye öyle kaldı (301 yok).
export const LANG_PREFIX = { tr: '', en: '/en' }

// Katalogdan türemeyen sabit rotalar. `:id` yer tutucusu React Router
// kalıbıdır ve çeviride aynen taşınır.
const STATIC_ROUTES = {
  home: { tr: '/', en: '/en' },
  login: { tr: '/giris', en: '/en/login' },
  register: { tr: '/kayit', en: '/en/register' },
  forgotPassword: { tr: '/parola-unuttum', en: '/en/forgot-password' },
  resetPassword: { tr: '/parola-sifirla', en: '/en/reset-password' },
  confirmEmail: { tr: '/e-posta-dogrula', en: '/en/confirm-email' },
  // Kilitlenme postasındaki "kilidi aç" bağlantısı. `confirmEmail` ile aynı
  // gerekçeyle `indexablePages()` dışı — bu fonksiyon yalnızca `home`, yasal
  // sayfalar, kategoriler ve araçları döndürür, bu anahtara hiç dokunmaz.
  unlockAccount: { tr: '/kilit-ac', en: '/en/unlock-account' },
  projects: { tr: '/projelerim', en: '/en/projects' },
  reports: { tr: '/raporlarim', en: '/en/reports' },
  account: { tr: '/hesabim', en: '/en/account' },
  project: { tr: '/proje/:id', en: '/en/project/:id' },
  // Yönetim paneli. `indexablePages()` bunu DÖNDÜRMEZ — oturum ve rol ister,
  // yani prerender'da boş kabuk üretir ve sitemap'e girmesi arama motoruna
  // hiçbir zaman açılmayacak bir adres bildirmek olurdu.
  admin: { tr: '/yonetim', en: '/en/admin' },
  // Denetim izi günlüğü — aynı gerekçeyle `indexablePages()` dışı.
  adminAudit: { tr: '/yonetim/gunluk', en: '/en/admin/audit' },
  // Operasyonel log ekranı (docs/brifler/12-loglama-ekrani.md §4) — aynı
  // gerekçeyle `indexablePages()` dışı.
  adminLogs: { tr: '/yonetim/loglar', en: '/en/admin/logs' },
  // Yasal sayfalar. Kayıtları `data/legalPages.js`te; buradaki anahtarlar
  // LEGAL_DOCS anahtarlarıyla BİREBİR aynı olmak zorundadır (guard testi var).
  privacy: { tr: '/gizlilik', en: '/en/privacy' },
  kvkk: { tr: '/kvkk-aydinlatma-metni', en: '/en/data-protection-notice' },
  terms: { tr: '/kullanim-sartlari', en: '/en/terms-of-use' },
}

export const ROUTE_KEYS = Object.keys(STATIC_ROUTES)

const CATEGORY_SEGMENT = { tr: '/kategori', en: '/en/category' }
const TOOL_SEGMENT = { tr: '/arac', en: '/en/tool' }

function lang0(lang) {
  return isLang(lang) ? lang : DEFAULT_LANG
}

// Sondaki eğik çizgi atılır (kök hariç): `/en/` ile `/en` aynı sayfadır ve
// prerender çıktısı eğik çizgisiz yazılır.
function normalize(pathname) {
  if (typeof pathname !== 'string' || pathname === '') return '/'
  const withRoot = pathname.startsWith('/') ? pathname : `/${pathname}`
  return withRoot.length > 1 ? withRoot.replace(/\/+$/, '') || '/' : withRoot
}

/**
 * Yolun dili. `/en` ve `/en/...` İngilizcedir; `/energy` DEĞİLDİR — sınır
 * segment sonudur, dize öneki değil.
 */
export function langFromPath(pathname) {
  const p = normalize(pathname)
  return p === '/en' || p.startsWith('/en/') ? 'en' : DEFAULT_LANG
}

// Dil önekini söker: `/en/login` → `/login`, `/en` → `/`.
function stripLangPrefix(pathname) {
  const p = normalize(pathname)
  if (p === '/en') return '/'
  return p.startsWith('/en/') ? p.slice(3) : p
}

export function staticPath(key, lang) {
  const route = STATIC_ROUTES[key]
  if (!route) return null
  return route[lang0(lang)] ?? route[DEFAULT_LANG]
}

export function projectPath(id, lang) {
  return staticPath('project', lang).replace(':id', encodeURIComponent(id))
}

export function categoryPath(category, lang) {
  if (!category) return null
  return lang0(lang) === 'en'
    ? `${CATEGORY_SEGMENT.en}/${category.slugEn}`
    : `${CATEGORY_SEGMENT.tr}/${category.slug}`
}

/** Yalnız AKTİF araç (path'i olan) yol taşır; "yakında" araçların sayfası yok. */
export function toolPath(tool, lang) {
  if (!tool?.path) return null
  return lang0(lang) === 'en' ? `${TOOL_SEGMENT.en}/${tool.slugEn}` : tool.path
}

// Yol → katalog kaydı aramaları. İki dilin yolları da aynı haritaya girer,
// böylece çeviri hangi dilden başlarsa başlasın tek arama yeter.
const CATEGORY_BY_PATH = new Map()
const TOOL_BY_PATH = new Map()
for (const category of CATEGORIES) {
  for (const lang of LANGS) CATEGORY_BY_PATH.set(categoryPath(category, lang), category)
  for (const tool of category.tools) {
    if (!tool.path) continue
    for (const lang of LANGS) TOOL_BY_PATH.set(toolPath(tool, lang), tool)
  }
}

/**
 * Kategori rotasının React Router kalıbı: `/kategori/:slug` | `/en/category/:slug`.
 * Rota tablosu tek `<Route>` ile kurulur, kategori sayfası kaydı aşağıdaki
 * `categoryFromPath` ile çözer — `slug` parametresi dile göre farklı sözlükten
 * geldiği için ham slug'la arama yapılmaz.
 */
export function categoryRoutePattern(lang) {
  return `${CATEGORY_SEGMENT[lang0(lang)]}/:slug`
}

/** Tam yoldan kategori kaydı — hangi dilin yolu olduğunu bilmek gerekmez. */
export function categoryFromPath(pathname) {
  return CATEGORY_BY_PATH.get(normalize(pathname)) ?? null
}

/** Tam yoldan araç kaydı — `TitleSync` ve testler için. */
export function toolFromPath(pathname) {
  return TOOL_BY_PATH.get(normalize(pathname)) ?? null
}

// Yasal sayfa kaydı, yolun hangi dilde olduğuna bakılmaksızın.
const LEGAL_BY_PATH = new Map()
for (const doc of LEGAL_DOCS) {
  for (const lang of LANGS) LEGAL_BY_PATH.set(staticPath(doc.key, lang), doc)
}

/** Tam yoldan yasal sayfa kaydı — `TitleSync` ve prerender aynı kaynağı okur. */
export function legalFromPath(pathname) {
  return LEGAL_BY_PATH.get(normalize(pathname)) ?? null
}

// Sabit rotanın yolunu anahtara çevirir. `:id` taşıyan kalıplar burada değil,
// aşağıdaki segment karşılaştırmasında çözülür.
const KEY_BY_PATH = new Map()
for (const [key, byLang] of Object.entries(STATIC_ROUTES)) {
  if (byLang.tr.includes(':')) continue
  for (const lang of LANGS) KEY_BY_PATH.set(byLang[lang], key)
}

// `:id` taşıyan sabit rotalar: kalıbın sabit önekini ve parametrenin yerini
// tutar. Bugün yalnız `/proje/:id` var, ama tablo büyüyünce burası kendiliğinden
// kapsar — ikinci bir çeviri dalı yazılmaz.
const PARAM_ROUTES = Object.entries(STATIC_ROUTES)
  .filter(([, byLang]) => byLang.tr.includes(':'))
  .map(([key, byLang]) => ({
    key,
    prefixes: LANGS.map((lang) => ({ lang, prefix: byLang[lang].replace(/\/:[^/]+$/, '') })),
  }))

/**
 * Bir yolu hedef dilin karşılığına çevirir. Sorgu ve `#` parçası korunur —
 * `?hesap=<id>` bağı iki ağaçta da AYNI adı taşır ve çevrilmez (paylaşılmış
 * kayıt bağlantıları kırılmasın diye; docs/en-url-karari.md §2).
 *
 * Tanınmayan yol atılmaz, yalnız dil öneki değiştirilir: kullanıcı dilinde
 * kalır ve bilinmeyen yol yine `NotFound`a düşer.
 */
export function translatePath(to, lang) {
  const target = lang0(lang)
  if (typeof to !== 'string' || to === '') return staticPath('home', target)

  const cut = to.search(/[?#]/)
  const rawPath = cut === -1 ? to : to.slice(0, cut)
  const suffix = cut === -1 ? '' : to.slice(cut)

  // Site dışı ya da göreli adres (protokol, `//`, `mailto:`) çevrilmez.
  if (!rawPath.startsWith('/') || rawPath.startsWith('//')) return to

  const path = normalize(rawPath)

  const tool = TOOL_BY_PATH.get(path)
  if (tool) return toolPath(tool, target) + suffix

  const category = CATEGORY_BY_PATH.get(path)
  if (category) return categoryPath(category, target) + suffix

  const key = KEY_BY_PATH.get(path)
  if (key) return staticPath(key, target) + suffix

  for (const route of PARAM_ROUTES) {
    for (const { prefix } of route.prefixes) {
      if (!path.startsWith(`${prefix}/`)) continue
      const rest = path.slice(prefix.length + 1)
      if (rest === '' || rest.includes('/')) continue
      // Yerine koyma FONKSİYONLA yapılır: dize biçimi `$&`/`$1` kaçışlarını
      // yorumlar ve içinde `$` geçen bir kimlik sessizce bozulurdu.
      return staticPath(route.key, target).replace(/:[^/]+$/, () => rest) + suffix
    }
  }

  const bare = stripLangPrefix(path)
  const prefixed = bare === '/' ? staticPath('home', target) : `${LANG_PREFIX[target]}${bare}`
  return prefixed + suffix
}

// Dil tercihi yönlendirmesinin (App.jsx → LangPrefRedirect) kapsadığı
// anahtarlar: STATIC_ROUTES eksi `home` eksi yasal sayfalar. Kapsam dar —
// açık/taranan sayfalar (ana sayfa, kategori, araç, yasal) buraya GİRMEZ,
// çünkü onlarda TR adres kanoniktir ve bot/kullanıcı aynı sayfayı görmek
// zorundadır (docs/en-url-karari.md §3). Kalan anahtarların hepsi zaten
// `indexablePages()` dışıdır (giriş, /yonetim, /projelerim, /proje/:id, ...)
// — yani burada yönlendirme SEO'ya dokunmaz.
const LEGAL_KEYS = new Set(LEGAL_DOCS.map((doc) => doc.key))
const LANG_PREF_KEYS = new Set(
  ROUTE_KEYS.filter((key) => key !== 'home' && !LEGAL_KEYS.has(key)),
)

/** Yol dil tercihi yönlendirmesine açık mı — bkz. LANG_PREF_KEYS üstündeki not. */
export function isLangPrefPath(pathname) {
  const path = normalize(pathname)
  const key = KEY_BY_PATH.get(path)
  if (key) return LANG_PREF_KEYS.has(key)
  for (const route of PARAM_ROUTES) {
    for (const { prefix } of route.prefixes) {
      if (path.startsWith(`${prefix}/`)) return LANG_PREF_KEYS.has(route.key)
    }
  }
  return false
}

/**
 * Prerender ve sitemap'in ortak kaynağı: indekslenebilir sayfaların iki dilli
 * listesi — ana sayfa + 8 kategori + `path`i olan araçlar. Her kayıt kendi
 * `tr`/`en` adreslerini taşır, yani `hreflang` kümesi de buradan çıkar.
 *
 * İki üreteç bu tek listeyi okur; ayrı liste tutulsaydı sitemap'te olup
 * prerender'lanmamış (ya da tersi) sayfalar oluşurdu.
 *
 * Oturum gerektiren sayfalar (giriş, kayıt, /projelerim, /hesabim, /proje/:id)
 * ve İngilizce karşılıkları BİLEREK yok: indekslenmeleri istenmiyor.
 */
export function indexablePages() {
  const pages = [{ kind: 'home', tr: staticPath('home', 'tr'), en: staticPath('home', 'en') }]
  // Yasal sayfalar indekslenir: oturum gerektirmezler ve herkese açık içeriktir.
  // Ana sayfadan hemen sonra gelirler ki sitemap'te araç kalabalığının altında
  // kaybolmasınlar.
  for (const doc of LEGAL_DOCS) {
    pages.push({
      kind: 'legal',
      legal: doc,
      tr: staticPath(doc.key, 'tr'),
      en: staticPath(doc.key, 'en'),
    })
  }
  for (const category of CATEGORIES) {
    pages.push({
      kind: 'category',
      category,
      tr: categoryPath(category, 'tr'),
      en: categoryPath(category, 'en'),
    })
    for (const tool of category.tools) {
      if (!tool.path) continue
      pages.push({ kind: 'tool', tool, tr: toolPath(tool, 'tr'), en: toolPath(tool, 'en') })
    }
  }
  return pages
}
