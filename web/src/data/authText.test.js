// `authErrorText` — sunucunun dilsiz hata kodundan ekrandaki cümleyi kurar.
// Saf: React ve DOM bilmez, `res` nesnesi ile dil kodundan başka girdi almaz.

import { describe, it, expect } from 'vitest'
import { authErrorText } from './authText'
import { API_ERR_NETWORK, API_ERR_PARSE } from '../lib/api'

describe('authErrorText', () => {
  it('başarılı yanıtta cümle kurmaz', () => {
    expect(authErrorText({ ok: true, status: 200 }, 'tr')).toBeNull()
    expect(authErrorText(null, 'tr')).toBeNull()
  })

  it('bilinen kodları kendi cümlesine çevirir', () => {
    const res = { ok: false, status: 401, error: 'INVALID_CREDENTIALS' }
    expect(authErrorText(res, 'tr')).toBe('E-posta veya parola hatalı.')
    expect(authErrorText(res, 'en')).toBe('Incorrect email or password.')
  })

  it('ağ ve ayrıştırma hataları ayrı cümlelerdir', () => {
    expect(authErrorText({ ok: false, status: 0, error: API_ERR_NETWORK }, 'tr'))
      .toMatch(/sunucuya ulaşılamadı/i)
    expect(authErrorText({ ok: false, status: 500, error: API_ERR_PARSE }, 'tr'))
      .toMatch(/beklenmeyen bir yanıt/i)
  })

  // Hız sınırı, kodu OLMAYAN tek hata yolu. ASP.NET'in sınırlayıcısı isteği
  // uçlara hiç ulaştırmadan reddeder ve gövdeyi BOŞ bırakır; boş gövde
  // `lib/api.js` içinde `error: 'unknown'`a dönüşür. Bu yüzden ayırt edici
  // olan `status`tur — kod değil.
  describe('429 hız sınırı', () => {
    // Gövdesiz 429'un `lib/api.js`ten çıktığı hâli birebir bu.
    const res = { ok: false, status: 429, error: 'unknown', detail: undefined }

    it('ne yapılacağını söyleyen kendi cümlesini verir', () => {
      expect(authErrorText(res, 'tr')).toBe('Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.')
      expect(authErrorText(res, 'en')).toBe('Too many attempts. Try again in a few minutes.')
    })

    it('genel "bir şeyler ters gitti" cümlesine DÜŞMEZ', () => {
      // Regresyonun asıl şekli buydu: kullanıcı ne olduğunu da ne yapacağını
      // da anlamıyordu. `status` kontrolü kalkarsa bu iki iddia kırmızıya döner.
      const genel = authErrorText({ ok: false, status: 500, error: 'unknown' }, 'tr')
      expect(authErrorText(res, 'tr')).not.toBe(genel)
      expect(authErrorText(res, 'tr')).not.toMatch(/ters gitti/i)
    })
  })

  it('tanınmayan kod genel cümleye düşer', () => {
    expect(authErrorText({ ok: false, status: 500, error: 'unknown' }, 'tr'))
      .toMatch(/ters gitti/i)
  })
})
