import { describe, it, expect } from 'vitest'
import { CATEGORIES } from '../data/categories'
import { LEGAL_DOCS } from '../data/legalPages'
import { LANGS } from './i18n'
import {
  ROUTE_KEYS, categoryFromPath, categoryPath, categoryRoutePattern, indexablePages,
  isAdminPath, langFromPath, projectPath, staticPath, toolFromPath, toolPath, translatePath,
} from './routes'

// İki dilli URL ağacının değişmezleri. Buradaki hataların hepsi build'den,
// tip denetiminden ve birim testlerinin geri kalanından KAÇAR: sonuçları kırık
// bağlantı, yanlış dilde açılan sayfa ya da geçersiz bir hreflang kümesidir.
// Kararlar: docs/en-url-karari.md.

const ACTIVE_TOOLS = CATEGORIES.flatMap((c) => c.tools).filter((t) => t.path)

// Brif 13 — hangi sayfalar site genelinin genişlik sözleşmesinden ayrışıyor
// (`App.jsx` → `Layout`). Yanlış-pozitif en pahalı hata: `/yonetimx` gibi
// varsayımsal bir yolun geniş düzene düşmesi — bu yüzden ayrıca test edilir.
describe('isAdminPath', () => {
  it.each([
    ['tr kök', '/yonetim', true],
    ['tr kök, sondaki eğik çizgi', '/yonetim/', true],
    ['tr alt yol — günlük', '/yonetim/gunluk', true],
    ['tr alt yol — loglar', '/yonetim/loglar', true],
    ['en kök', '/en/admin', true],
    ['en alt yol — audit', '/en/admin/audit', true],
    ['en alt yol — logs', '/en/admin/logs', true],
    ['çıplak startsWith tuzağı', '/yonetimx', false],
    ['en tarafın aynı tuzağı', '/en/administration', false],
    ['ilgisiz yol', '/giris', false],
    ['kök', '/', false],
    ['boş dize', '', false],
    ['undefined', undefined, false],
  ])('%s: %s → %s', (_label, path, expected) => {
    expect(isAdminPath(path)).toBe(expected)
  })
})

describe('langFromPath', () => {
  it.each([
    ['kök', '/', 'tr'],
    ['Türkçe araç', '/arac/gerilim-bolucu', 'tr'],
    ['Türkçe kategori', '/kategori/empedans', 'tr'],
    ['İngilizce kök', '/en', 'en'],
    ['sondaki eğik çizgili İngilizce kök', '/en/', 'en'],
    ['İngilizce araç', '/en/tool/voltage-divider', 'en'],
    ['İngilizce giriş', '/en/login', 'en'],
  ])('%s → %s', (_ad, pathname, expected) => {
    expect(langFromPath(pathname)).toBe(expected)
  })

  // Sınır SEGMENT sonudur, dize öneki değil. `/energy` İngilizce ağaca ait
  // değildir; öyle sayılsaydı Türkçe bir sayfa İngilizce çizilirdi.
  it.each(['/energy', '/enerji-hesabi', '/end', '/environment/x'])(
    '%s İngilizce SAYILMAZ',
    (pathname) => {
      expect(langFromPath(pathname)).toBe('tr')
    },
  )

  it('bozuk girdide varsayılana düşer', () => {
    expect(langFromPath('')).toBe('tr')
    expect(langFromPath(undefined)).toBe('tr')
    expect(langFromPath(null)).toBe('tr')
  })
})

describe('yol üreticileri', () => {
  it('Türkçe araç yolu katalogdaki `path` alanının kendisidir', () => {
    for (const tool of ACTIVE_TOOLS) expect(toolPath(tool, 'tr')).toBe(tool.path)
  })

  it('İngilizce yollar /en öneki taşır', () => {
    for (const tool of ACTIVE_TOOLS) expect(toolPath(tool, 'en')).toBe(`/en/tool/${tool.slugEn}`)
    for (const c of CATEGORIES) expect(categoryPath(c, 'en')).toBe(`/en/category/${c.slugEn}`)
    for (const key of ROUTE_KEYS) expect(staticPath(key, 'en').startsWith('/en')).toBe(true)
  })

  it('"yakında" aracın yolu yoktur', () => {
    const soon = CATEGORIES.flatMap((c) => c.tools).filter((t) => !t.path)
    for (const tool of soon) {
      for (const lang of LANGS) expect(toolPath(tool, lang)).toBeNull()
    }
  })

  it('bilinmeyen dil kodu Türkçeye düşer', () => {
    const tool = ACTIVE_TOOLS[0]
    expect(toolPath(tool, 'de')).toBe(tool.path)
    expect(staticPath('login', undefined)).toBe('/giris')
  })

  it('kategori rota kalıbı :slug parametresi taşır', () => {
    expect(categoryRoutePattern('tr')).toBe('/kategori/:slug')
    expect(categoryRoutePattern('en')).toBe('/en/category/:slug')
  })

  it('proje yolu kimliği kodlar', () => {
    expect(projectPath('42', 'tr')).toBe('/proje/42')
    expect(projectPath('42', 'en')).toBe('/en/project/42')
    expect(projectPath('a b', 'tr')).toBe('/proje/a%20b')
  })
})

describe('yoldan katalog kaydı', () => {
  it('araç kaydı iki dilin yolundan da bulunur', () => {
    for (const tool of ACTIVE_TOOLS) {
      for (const lang of LANGS) expect(toolFromPath(toolPath(tool, lang))).toBe(tool)
    }
  })

  it('kategori kaydı iki dilin yolundan da bulunur', () => {
    for (const c of CATEGORIES) {
      for (const lang of LANGS) expect(categoryFromPath(categoryPath(c, lang))).toBe(c)
    }
  })

  it('sondaki eğik çizgi kaydı bulmayı engellemez', () => {
    expect(categoryFromPath('/kategori/empedans/')).toBe(categoryFromPath('/kategori/empedans'))
  })

  it('bilinmeyen yol null döner', () => {
    expect(toolFromPath('/arac/yok-boyle-bir-sey')).toBeNull()
    expect(categoryFromPath('/en/category/nope')).toBeNull()
  })
})

describe('translatePath', () => {
  // En önemli değişmez: her rota gidip geri döndüğünde KENDİNE dönmeli.
  // Dönmediği gün dil değiştiren kullanıcı başka bir sayfada uyanır.
  it('bütün rotalar tr → en → tr gidiş-dönüşünde kendine döner', () => {
    const paths = [
      ...ROUTE_KEYS.map((k) => staticPath(k, 'tr')).filter((p) => !p.includes(':')),
      ...CATEGORIES.map((c) => categoryPath(c, 'tr')),
      ...ACTIVE_TOOLS.map((t) => t.path),
      '/proje/42',
    ]
    for (const p of paths) {
      const en = translatePath(p, 'en')
      expect(en).not.toBe(p)
      expect(translatePath(en, 'tr')).toBe(p)
    }
  })

  it('aynı dile çevirmek yolu değiştirmez', () => {
    for (const tool of ACTIVE_TOOLS) {
      expect(translatePath(tool.path, 'tr')).toBe(tool.path)
      expect(translatePath(toolPath(tool, 'en'), 'en')).toBe(toolPath(tool, 'en'))
    }
  })

  it.each([
    ['araç', '/arac/gerilim-bolucu', '/en/tool/voltage-divider'],
    ['kategori', '/kategori/empedans', '/en/category/controlled-impedance'],
    ['ana sayfa', '/', '/en'],
    ['giriş', '/giris', '/en/login'],
    ['proje', '/proje/42', '/en/project/42'],
  ])('%s çevrilir', (_ad, tr, en) => {
    expect(translatePath(tr, 'en')).toBe(en)
    expect(translatePath(en, 'tr')).toBe(tr)
  })

  // Sorgu parametresi ÇEVRİLMEZ ve KAYBOLMAZ: `?hesap=<id>` paylaşılabilir
  // kayıt bağıdır ve iki ağaçta da aynı adı taşır.
  it('sorgu ve # parçası korunur', () => {
    expect(translatePath('/arac/gerilim-bolucu?hesap=7', 'en'))
      .toBe('/en/tool/voltage-divider?hesap=7')
    expect(translatePath('/en/tool/voltage-divider?hesap=7', 'tr'))
      .toBe('/arac/gerilim-bolucu?hesap=7')
    expect(translatePath('/kategori/empedans#liste', 'en'))
      .toBe('/en/category/controlled-impedance#liste')
    expect(translatePath('/giris?token=a&email=b%40c.d', 'en'))
      .toBe('/en/login?token=a&email=b%40c.d')
  })

  // Tanınmayan yol ATILMAZ: kullanıcı dilinde kalır, bilinmeyen yol olarak
  // yine NotFound'a düşer. Ana sayfaya sessizce kaçırılsaydı kırık bağlantı
  // kırık olduğunu belli etmezdi.
  it('bilinmeyen yolda yalnız dil öneki değişir', () => {
    expect(translatePath('/bilinmeyen', 'en')).toBe('/en/bilinmeyen')
    expect(translatePath('/en/unknown', 'tr')).toBe('/unknown')
    expect(translatePath('/bilinmeyen?x=1', 'en')).toBe('/en/bilinmeyen?x=1')
  })

  it('site dışı adres olduğu gibi kalır', () => {
    expect(translatePath('mailto:a@b.c', 'en')).toBe('mailto:a@b.c')
    expect(translatePath('https://ornek.test/x', 'en')).toBe('https://ornek.test/x')
    expect(translatePath('//ornek.test/x', 'en')).toBe('//ornek.test/x')
  })

  it('boş girdide dilin ana sayfasına düşer', () => {
    expect(translatePath('', 'en')).toBe('/en')
    expect(translatePath(undefined, 'tr')).toBe('/')
  })

  it('kimlikteki $ işareti bozulmaz', () => {
    expect(translatePath('/proje/a$&b', 'en')).toBe('/en/project/a$&b')
  })
})

describe('indexablePages', () => {
  it('ana sayfa + yasal sayfalar + 8 kategori + aktif araçları kapsar', () => {
    const pages = indexablePages()
    expect(pages.length).toBe(1 + LEGAL_DOCS.length + CATEGORIES.length + ACTIVE_TOOLS.length)
    expect(pages.filter((p) => p.kind === 'home')).toHaveLength(1)
    expect(pages.filter((p) => p.kind === 'legal')).toHaveLength(LEGAL_DOCS.length)
  })

  // Yasal sayfalar indekslenmeli: KVKK aydınlatma metninin aranabilir ve
  // bulunabilir olması gerekir. Listeden düşerlerse ne prerender'lanır ne de
  // sitemap'e girerler — ikisi de sessizce olur.
  it('üç yasal sayfa da iki dilde listede', () => {
    const pages = indexablePages().filter((p) => p.kind === 'legal')
    for (const doc of LEGAL_DOCS) {
      const page = pages.find((p) => p.legal.key === doc.key)
      expect(page).toBeTruthy()
      expect(page.tr).toBe(staticPath(doc.key, 'tr'))
      expect(page.en).toBe(staticPath(doc.key, 'en'))
    }
  })

  it('her sayfa iki dilin adresini de taşır ve adresler benzersizdir', () => {
    const pages = indexablePages()
    const all = []
    for (const page of pages) {
      for (const lang of LANGS) {
        expect(typeof page[lang]).toBe('string')
        expect(page[lang].startsWith('/')).toBe(true)
        expect(langFromPath(page[lang])).toBe(lang)
        all.push(page[lang])
      }
    }
    expect(new Set(all).size).toBe(all.length)
  })

  // Oturum gerektiren sayfalar indekslenmemeli — listeye sızarlarsa hem
  // prerender'lanır hem sitemap'e girerler.
  it('oturum gerektiren sayfalar listede yok', () => {
    const urls = indexablePages().flatMap((p) => LANGS.map((l) => p[l]))
    for (const key of ['login', 'register', 'projects', 'account', 'project']) {
      for (const lang of LANGS) expect(urls).not.toContain(staticPath(key, lang))
    }
  })
})
