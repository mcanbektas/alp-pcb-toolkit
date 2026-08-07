// Loglar ekranının metin sözlüğü. Bileşen testi DEĞİL: sözlük saf bir
// fonksiyondur (../audit/text.test.js ile aynı desen, gerekçe orada).

import { describe, expect, it } from 'vitest'
import { getText } from './text'

const LANGS = ['tr', 'en']

const PLAIN = [
  'title', 'intro',
  'loginRequired', 'loginLink', 'forbidden', 'homeLink',
  'searchLabel', 'searchHint',
  'levelFilterLabel',
  'refresh',
  'loading', 'empty',
  'detailView', 'detailTitle', 'detailClose',
]

const COLUMNS = ['time', 'level', 'source', 'message', 'detail']

describe.each(LANGS)('loglar metni (%s)', (lang) => {
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
      expect(t.columns[key].length).toBeGreaterThan(0)
    }
  })

  it('levelGroups (hepsi) + uyarı + hata seçeneklerini taşır, etiketler dolu', () => {
    const flat = t.levelGroups.flatMap((g) => g.options)
    const values = flat.map((o) => o.value)
    expect(values).toEqual(['', 'warning', 'error'])
    for (const opt of flat) {
      expect(typeof opt.label).toBe('string')
      expect(opt.label.length).toBeGreaterThan(0)
    }
  })

  // Sunucudan (LogBufferSink) HAM gelen seviye adı — sabit bir kod listesi
  // yok, bilinmeyen bir değer de sessizce "iyi" görünmemeli (unknown/nötr).
  it('levelMarkClass bilinen seviyeleri doğru sınıfa düşürür, bilinmeyeni unknown yapar', () => {
    expect(t.levelMarkClass('Error')).toBe('danger')
    expect(t.levelMarkClass('Fatal')).toBe('danger')
    expect(t.levelMarkClass('Warning')).toBe('warning')
    expect(t.levelMarkClass('Information')).toBe('unknown')
    expect(t.levelMarkClass('BeklenmedikSeviye')).toBe('unknown')
  })

  it('sourceShort son bileşeni verir, tire için nokta yoksa oldugu gibi doner', () => {
    expect(t.sourceShort('Microsoft.AspNetCore.HttpsPolicy.HttpsRedirectionMiddleware'))
      .toBe('HttpsRedirectionMiddleware')
    expect(t.sourceShort('Alp.Api.Auth.AuditLog')).toBe('AuditLog')
    expect(t.sourceShort('TekKelime')).toBe('TekKelime')
    expect(t.sourceShort(null)).toBe('—')
  })

  it('detailViewAria ve capacityNote dolu cümle üretir', () => {
    expect(t.detailViewAria('mesaj').length).toBeGreaterThan(0)
    expect(t.capacityNote(500)).toContain('500')
  })

  it('formatDateSeconds geçerli ISO tarihi biçimler, geçersizde tire döner', () => {
    expect(t.formatDateSeconds('2026-01-01T00:00:00Z')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(t.formatDateSeconds(null)).toBe('—')
    expect(t.formatDateSeconds('geçersiz')).toBe('—')
  })

  it('errorText bilinen/bilinmeyen hata kodlarında dolu cümle döner, ok=true iken null', () => {
    expect(t.errorText({ ok: true })).toBeNull()
    expect(t.errorText({ ok: false, error: 'network' }).length).toBeGreaterThan(0)
    expect(t.errorText({ ok: false, error: 'FORBIDDEN' }).length).toBeGreaterThan(0)
    expect(t.errorText({ ok: false, error: 'SERVER_ERROR' }).length).toBeGreaterThan(0)
  })

  it('recordRows tüm alanları taşır, exception yoksa satır eklemez', () => {
    const withoutException = t.recordRows({
      occurredAt: '2026-01-01T00:00:00Z', level: 'Information', message: 'mesaj',
      sourceContext: null, requestPath: null, userId: null, exception: null,
    })
    expect(withoutException.some((r) => r.key === 'exception')).toBe(false)
    expect(withoutException.map((r) => r.key)).toEqual(['time', 'level', 'source', 'path', 'user', 'message'])

    const withException = t.recordRows({
      occurredAt: '2026-01-01T00:00:00Z', level: 'Error', message: 'mesaj',
      sourceContext: 'Kaynak', requestPath: '/api/x', userId: 'u1', exception: 'boom',
    })
    const exceptionRow = withException.find((r) => r.key === 'exception')
    expect(exceptionRow?.value).toBe('boom')
  })
})
