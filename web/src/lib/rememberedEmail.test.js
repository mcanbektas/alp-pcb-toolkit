import { describe, it, expect } from 'vitest'
import { memoryStorage, nullStorage } from './storage'
import {
  readRememberedEmail, writeRememberedEmail, clearRememberedEmail,
  REMEMBER_ERR_EMPTY, REMEMBER_ERR_TOO_LONG,
} from './rememberedEmail'

describe('rememberedEmail', () => {
  it('yazılanı geri okur', () => {
    const s = memoryStorage()
    expect(writeRememberedEmail(s, 'kisi@ornek.test')).toEqual({ ok: true })
    expect(readRememberedEmail(s)).toBe('kisi@ornek.test')
  })

  it('boş depoda boş dize döner', () => {
    expect(readRememberedEmail(memoryStorage())).toBe('')
  })

  it('baştaki ve sondaki boşluğu kırpar', () => {
    const s = memoryStorage()
    writeRememberedEmail(s, '  kisi@ornek.test  ')
    expect(readRememberedEmail(s)).toBe('kisi@ornek.test')
  })

  it('boş ya da yalnızca boşluk olan adresi yazmaz', () => {
    const s = memoryStorage()
    expect(writeRememberedEmail(s, '')).toEqual({ error: REMEMBER_ERR_EMPTY })
    expect(writeRememberedEmail(s, '   ')).toEqual({ error: REMEMBER_ERR_EMPTY })
    expect(writeRememberedEmail(s, null)).toEqual({ error: REMEMBER_ERR_EMPTY })
    expect(readRememberedEmail(s)).toBe('')
  })

  it('sınırı aşan adresi yazmaz', () => {
    const s = memoryStorage()
    const long = `${'a'.repeat(311)}@ornek.test` // 322 karakter
    expect(writeRememberedEmail(s, long)).toEqual({ error: REMEMBER_ERR_TOO_LONG })
    expect(readRememberedEmail(s)).toBe('')
  })

  it('sınırdaki adresi kabul eder', () => {
    const s = memoryStorage()
    const exact = `${'a'.repeat(309)}@ornek.test` // 320 karakter
    expect(exact).toHaveLength(320)
    expect(writeRememberedEmail(s, exact)).toEqual({ ok: true })
    expect(readRememberedEmail(s)).toBe(exact)
  })

  it('depodaki bozuk değeri sessizce kısaltmaz, yok sayar', () => {
    // Elle bozulmuş / eski biçimli kayıt: kısaltılıp yanlış adres teklif
    // edilmesindense hiç yokmuş gibi davranılır.
    const s = memoryStorage({ 'alp:remembered-email': 'x'.repeat(400) })
    expect(readRememberedEmail(s)).toBe('')
  })

  it('dize olmayan değeri yok sayar', () => {
    expect(readRememberedEmail(memoryStorage({ 'alp:remembered-email': 42 }))).toBe('')
  })

  it('temizler', () => {
    const s = memoryStorage()
    writeRememberedEmail(s, 'kisi@ornek.test')
    clearRememberedEmail(s)
    expect(readRememberedEmail(s)).toBe('')
  })

  it('depolama yokken çökmez', () => {
    expect(readRememberedEmail(nullStorage)).toBe('')
    expect(writeRememberedEmail(nullStorage, 'kisi@ornek.test')).toHaveProperty('error')
    expect(clearRememberedEmail(nullStorage)).toHaveProperty('error')
    expect(readRememberedEmail(undefined)).toBe('')
    expect(writeRememberedEmail(undefined, 'kisi@ornek.test')).toEqual({ ok: true })
  })
})
