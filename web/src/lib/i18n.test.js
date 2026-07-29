import { describe, it, expect } from 'vitest'
import {
  LANGS, DEFAULT_LANG, LANG_LABEL,
  isLang, readLang, writeLang, pick,
} from './i18n'
import { memoryStorage, nullStorage } from './storage'

// i18n.js iki dilli arayüzün çekirdeğidir: 25 ekranın tamamı `pick()` üzerinden
// metin çözer. Buradaki tek kritik değişmez, eksik çevirinin İngilizceye ya da
// boşluğa değil TÜRKÇEye düşmesidir.

describe('LANGS / DEFAULT_LANG', () => {
  it('iki dil vardır ve varsayılan Türkçedir', () => {
    expect(LANGS).toEqual(['tr', 'en'])
    expect(DEFAULT_LANG).toBe('tr')
    expect(LANGS).toContain(DEFAULT_LANG)
  })

  it('her dilin kendi dilinde bir adı vardır', () => {
    for (const code of LANGS) {
      expect(typeof LANG_LABEL[code]).toBe('string')
      expect(LANG_LABEL[code].length).toBeGreaterThan(0)
    }
  })
})

describe('isLang', () => {
  it('yalnızca LANGS üyelerini kabul eder', () => {
    for (const code of LANGS) expect(isLang(code)).toBe(true)
  })

  it.each([
    ['büyük harf', 'TR'],
    ['bölgeli etiket', 'en-US'],
    ['bilinmeyen dil', 'de'],
    ['boş dize', ''],
    ['boşluk', ' tr'],
    ['null', null],
    ['undefined', undefined],
    ['sayı', 0],
    ['nesne', { tr: 'x' }],
  ])('%s reddedilir', (_ad, value) => {
    expect(isLang(value)).toBe(false)
  })
})

describe('pick — dil seçimi', () => {
  it('istenen dilin karşılığını döner', () => {
    const d = { tr: 'Girdiler', en: 'Inputs' }
    expect(pick(d, 'en')).toBe('Inputs')
    expect(pick(d, 'tr')).toBe('Girdiler')
  })

  // Göçün en önemli değişmezi: eksik çeviri anahtar adına, boş kutuya ya da
  // undefined'a değil, okunabilir Türkçe metne düşer.
  it('çeviri eksikse TÜRKÇEye düşer', () => {
    const missing = { tr: 'Sonuç' }
    expect(pick(missing, 'en')).toBe('Sonuç')
    expect(pick(missing, 'en')).not.toBeUndefined()
    expect(pick(missing, 'en')).not.toBe('')
    expect(pick(missing, 'en')).not.toBe('en')
  })

  it('bilinmeyen dil kodu da Türkçeye düşer', () => {
    expect(pick({ tr: 'Sonuç', en: 'Result' }, 'de')).toBe('Sonuç')
    expect(pick({ tr: 'Sonuç', en: 'Result' }, undefined)).toBe('Sonuç')
  })

  it('null/undefined değeri olan çeviri de Türkçeye düşer', () => {
    expect(pick({ tr: 'Sonuç', en: null }, 'en')).toBe('Sonuç')
    expect(pick({ tr: 'Sonuç', en: undefined }, 'en')).toBe('Sonuç')
  })

  it('dize olmayan değerleri de taşır (JSX, fonksiyon, sayı)', () => {
    const fn = () => 'x'
    expect(pick({ tr: fn, en: fn }, 'tr')).toBe(fn)
    expect(pick({ tr: 0, en: 1 }, 'en')).toBe(1)
    // 0 nullish değildir, Türkçeye düşmez
    expect(pick({ tr: 5, en: 0 }, 'en')).toBe(0)
  })

  it.each([
    ['null sözlük', null],
    ['undefined sözlük', undefined],
    ['boş sözlük', {}],
  ])('%s ile patlamaz', (_ad, dict) => {
    expect(() => pick(dict, 'en')).not.toThrow()
    expect(pick(dict, 'en')).toBeUndefined()
  })
})

describe('readLang', () => {
  it('saklanan geçerli dili döner', () => {
    const store = memoryStorage()
    writeLang(store, 'en')
    expect(readLang(store)).toBe('en')
  })

  it('depo boşsa varsayılana düşer', () => {
    expect(readLang(memoryStorage())).toBe(DEFAULT_LANG)
  })

  it.each([
    ['bozuk değer', 'de'],
    ['boş dize', ''],
    ['eski büyük harf değer', 'TR'],
    ['JSON kalıntısı', '{"lang":"en"}'],
  ])('%s varsayılana düşer', (_ad, stored) => {
    // Depolama anahtarı i18n.js'in içindedir; teste kopyalamak yerine önce
    // geçerli bir yazma yapılıp anahtar depodan okunur.
    const store = memoryStorage()
    writeLang(store, 'en')
    const [key] = Object.keys(store._dump())
    store.write(key, stored)
    expect(readLang(store)).toBe(DEFAULT_LANG)
  })

  it.each([
    ['erişilemeyen depo', nullStorage],
    ['depo yok', undefined],
    ['eksik sözleşme', {}],
  ])('%s ile patlamaz, varsayılana düşer', (_ad, store) => {
    expect(() => readLang(store)).not.toThrow()
    expect(readLang(store)).toBe(DEFAULT_LANG)
  })
})

describe('writeLang', () => {
  it('yazdığını geri okur', () => {
    const store = memoryStorage()
    for (const code of LANGS) {
      expect(writeLang(store, code)).toEqual({ ok: true })
      expect(readLang(store)).toBe(code)
    }
  })

  it('geçersiz dili yazmaz, hata kodu döner', () => {
    const store = memoryStorage()
    writeLang(store, 'en')
    expect(writeLang(store, 'de')).toEqual({ error: 'lang' })
    // Saklanan geçerli seçim bozulmadı
    expect(readLang(store)).toBe('en')
  })

  it('erişilemeyen depoda hata kodu döner, patlamaz', () => {
    expect(() => writeLang(nullStorage, 'en')).not.toThrow()
    expect(writeLang(nullStorage, 'en').error).toBeTruthy()
  })

  it.each([
    ['depo yok', undefined],
    ['eksik sözleşme', {}],
  ])('%s ile patlamaz', (_ad, store) => {
    expect(() => writeLang(store, 'en')).not.toThrow()
    expect(writeLang(store, 'en')).toEqual({ ok: true })
  })
})
