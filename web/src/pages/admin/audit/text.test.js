// Günlük ekranının metin sözlüğü. Bileşen testi DEĞİL: sözlük saf bir
// fonksiyondur (../text.test.js ile aynı desen, gerekçe orada).

import { describe, expect, it } from 'vitest'
import { getText } from './text'

const LANGS = ['tr', 'en']

const PLAIN = [
  'title', 'intro',
  'loginRequired', 'loginLink', 'forbidden', 'homeLink',
  'searchLabel', 'searchHint',
  'eventFilterLabel', 'eventAll',
  'loading', 'empty',
  'pagePrev', 'pageNext',
]

const COLUMNS = ['time', 'event', 'actor', 'target', 'detail']

// Alp.Api/Auth/AuditLog.cs → AuditEventCodes ile birebir. Biri eksik kalırsa
// filtre menüsünde ham kod görünür ve olay hücresi çevrilmez.
const EVENT_CODES = [
  'account.registered',
  'account.email-confirmed',
  'auth.password-changed',
  'auth.password-reset',
  'auth.lockout',
  'admin.user-deleted',
  'admin.role-granted',
  'admin.role-revoked',
]

describe.each(LANGS)('günlük metni (%s)', (lang) => {
  const t = getText(lang)

  it('düz metin yollarının hepsi dolu', () => {
    for (const key of PLAIN) {
      expect(typeof t[key], `${key} bir dize olmalı`).toBe('string')
      expect(t[key].length, `${key} boş`).toBeGreaterThan(0)
    }
  })

  it('sütun başlıklarının hepsi dolu', () => {
    for (const key of COLUMNS) {
      expect(typeof t.columns[key], `columns.${key} bir dize olmalı`).toBe('string')
      expect(t.columns[key].length, `columns.${key} boş`).toBeGreaterThan(0)
    }
  })

  it('her olay kodunun kendi cümlesi var', () => {
    for (const code of EVENT_CODES) {
      expect(t.eventText(code), `${code} çevrilmemiş`).not.toBe(code)
    }
  })

  it('olay filtre seçenekleri tüm kodları kapsar', () => {
    const values = t.eventOptions.map((o) => o.value)
    expect(values.slice().sort()).toEqual([...EVENT_CODES].sort())
    for (const opt of t.eventOptions) {
      expect(opt.label.length, `${opt.value} etiketi boş`).toBeGreaterThan(0)
    }
  })

  it('olay renk sınıfı önekine göre belirlenir', () => {
    expect(t.eventMarkClass('admin.user-deleted')).toBe('danger')
    expect(t.eventMarkClass('auth.lockout')).toBe('warning')
    expect(t.eventMarkClass('account.registered')).toBe('ok')
    expect(t.eventMarkClass('bilinmeyen.kod')).toBe('unknown')
  })

  // Sessiz boşluk yerine teşhis edilebilir değer — sözlükte olmayan bir kod
  // ham hâliyle görünür, boş hücre değil.
  it('bilinmeyen kod ham hâliyle döner', () => {
    expect(t.eventText('bilinmeyen.kod')).toBe('bilinmeyen.kod')
  })

  it('zaman biçimi sayısal (dakika dahil), geçersiz girdide tire', () => {
    expect(t.formatDate('2026-08-06T11:23:33.656879+00:00')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    expect(t.formatDate(null)).toBe('—')
    expect(t.formatDate('anlamsız')).toBe('—')
  })

  it('ayrıntı yapısal alanları anahtar: değer olarak dizer, cümle kurmaz', () => {
    expect(t.formatDetail('{"projectCount":1,"reportCount":2}')).toBe('projectCount: 1, reportCount: 2')
    expect(t.formatDetail(null)).toBe('—')
    expect(t.formatDetail('{}')).toBe('—')
    expect(t.formatDetail('bozuk-json')).toBe('—')
  })

  it('sayfa durumu sayıları içerir', () => {
    const status = t.pageStatus(1, 25, 132)
    expect(status).toContain('132')
    expect(status).toContain('25')
  })

  it('sunucu hata kodlarının cümlesi var', () => {
    expect(t.errorText({ ok: false, error: 'FORBIDDEN' })).toBeTruthy()
    expect(t.errorText({ ok: false, error: 'network' })).toBeTruthy()
    expect(t.errorText({ ok: true })).toBeNull()
    expect(t.errorText(null)).toBeNull()
  })
})

// Çeviri eksikse büyük olasılıkla İngilizce Türkçenin kopyasıdır — `pick`in
// sessiz Türkçeye düşüşü burada açıkça sınanır (../text.test.js ile aynı gerekçe).
it('İngilizce metin Türkçenin kopyası değil', () => {
  const tr = getText('tr')
  const en = getText('en')
  const same = PLAIN.filter((k) => tr[k] === en[k])
  expect(same, `çevrilmemiş olabilir: ${same.join(', ')}`).toEqual([])
})
