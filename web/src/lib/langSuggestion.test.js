import { describe, it, expect } from 'vitest'
import { memoryStorage } from './storage'
import {
  suggestLang, readDismissed, writeDismissed, LANG_SUGGESTION_KEY,
} from './langSuggestion'

describe('suggestLang', () => {
  it('tarayıcı dili sayfa dilinden farklıysa hedefi önerir', () => {
    expect(suggestLang({ browserLangs: ['en-US', 'en'], urlLang: 'tr', dismissed: false }))
      .toBe('en')
    expect(suggestLang({ browserLangs: ['tr-TR'], urlLang: 'en', dismissed: false }))
      .toBe('tr')
  })

  it('tarayıcı dili sayfa diliyle aynıysa önermez', () => {
    expect(suggestLang({ browserLangs: ['tr-TR', 'en'], urlLang: 'tr', dismissed: false }))
      .toBeNull()
  })

  it('kapatılmışsa önermez', () => {
    expect(suggestLang({ browserLangs: ['en-US'], urlLang: 'tr', dismissed: true }))
      .toBeNull()
  })

  it('tanınmayan dile öneri yapmaz (üçüncü dil)', () => {
    expect(suggestLang({ browserLangs: ['de-DE', 'fr'], urlLang: 'tr', dismissed: false }))
      .toBeNull()
  })

  it('boş ya da eksik tarayıcı dili listesinde önermez', () => {
    expect(suggestLang({ browserLangs: [], urlLang: 'tr', dismissed: false })).toBeNull()
    expect(suggestLang({ browserLangs: undefined, urlLang: 'tr', dismissed: false })).toBeNull()
    expect(suggestLang({ browserLangs: null, urlLang: 'tr', dismissed: false })).toBeNull()
  })

  it('yalnız ilk tercihe bakar', () => {
    // İkinci tercih sayfa diliyle aynı olsa da ilk tercih belirleyicidir.
    expect(suggestLang({ browserLangs: ['en-US', 'tr'], urlLang: 'tr', dismissed: false }))
      .toBe('en')
  })
})

describe('readDismissed / writeDismissed', () => {
  it('varsayılan olarak kapatılmamıştır', () => {
    expect(readDismissed(memoryStorage())).toBe(false)
  })

  it('yazıldıktan sonra kapatılmış okunur', () => {
    const s = memoryStorage()
    writeDismissed(s)
    expect(readDismissed(s)).toBe(true)
    expect(s._dump()[LANG_SUGGESTION_KEY]).toBe('1')
  })
})
