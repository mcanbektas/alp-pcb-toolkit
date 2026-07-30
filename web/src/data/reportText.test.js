import { describe, it, expect } from 'vitest'
import { reportDateStamp, reportErrorText, REPORT_ERR_TOO_LARGE } from './reportText'
import { API_ERR_NETWORK } from '../lib/api'

describe('reportDateStamp', () => {
  it('gün.ay.yıl biçiminde, sıfır dolgulu', () => {
    expect(reportDateStamp(new Date(2026, 6, 29))).toBe('29.07.2026')
  })

  it('tek haneli gün/ay sıfırla dolgulanır', () => {
    expect(reportDateStamp(new Date(2026, 0, 5))).toBe('05.01.2026')
  })
})

describe('reportErrorText', () => {
  it('başarılı yanıtta metin üretmez', () => {
    expect(reportErrorText({ ok: true }, 'tr')).toBeNull()
    expect(reportErrorText(null, 'tr')).toBeNull()
  })

  it('REPORT_TOO_LARGE kendi mesajını alır ve iki dilde farklıdır', () => {
    const res = { ok: false, status: 422, error: REPORT_ERR_TOO_LARGE }
    const tr = reportErrorText(res, 'tr')
    const en = reportErrorText(res, 'en')

    expect(tr).toContain('Excel')
    expect(en).toContain('Excel')
    expect(tr).not.toBe(en)
    // Genel "tekrar deneyin" metnine düşmemeli: tekrar denemek aynı sonucu verir.
    expect(tr).not.toBe(reportErrorText({ ok: false, error: 'unknown' }, 'tr'))
  })

  it('ağ hatası ile sunucu hata kodu ayrı mesajlara düşer', () => {
    const network = reportErrorText({ ok: false, status: 0, error: API_ERR_NETWORK }, 'tr')
    const generic = reportErrorText({ ok: false, status: 500, error: 'SERVER_ERROR' }, 'tr')
    expect(network).not.toBe(generic)
  })
})
