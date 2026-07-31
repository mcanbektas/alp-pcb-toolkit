// api.js — deponun en durum-yoğun saf-olmayan modülü test KAPSAMI DIŞINDAYDI:
// tek uçuşlu yenileme, 401 sonrası yeniden deneme ve hata sözleşmesi hiç
// sınanmıyordu. Ağ, global `fetch` taklit edilerek kesilir; gerçek istek yok.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApiClient, API_ERR_NETWORK, API_ERR_PARSE } from './api'

const BASE = 'https://api.test'

function jsonResponse(body, status = 200) {
  return new Response(body === null ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Testler istek geçmişini URL üzerinden okur: `calls('/api/x')` o yola kaç
// istek gittiğini ve hangi başlıklarla gittiğini verir.
function makeClient({ routes, token = 't1' }) {
  const fetchMock = vi.fn((url, init) => {
    const path = url.slice(BASE.length)
    const handler = routes[path]
    if (!handler) throw new Error(`beklenmeyen istek: ${path}`)
    return Promise.resolve(handler(init))
  })
  vi.stubGlobal('fetch', fetchMock)

  let accessToken = token
  const setAccessToken = vi.fn((t) => { accessToken = t })
  const onSessionExpired = vi.fn()

  const api = createApiClient({
    baseUrl: BASE,
    getAccessToken: () => accessToken,
    setAccessToken,
    onSessionExpired,
  })

  const calls = (path) => fetchMock.mock.calls.filter(([url]) => url === `${BASE}${path}`)
  return { api, fetchMock, setAccessToken, onSessionExpired, calls }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('hata sözleşmesi', () => {
  it('başarılı JSON yanıt { ok, data } döner', async () => {
    const { api } = makeClient({ routes: { '/api/x': () => jsonResponse({ a: 1 }) } })
    expect(await api.get('/api/x')).toEqual({ ok: true, status: 200, data: { a: 1 } })
  })

  it('204 gövdesiz başarıdır', async () => {
    const { api } = makeClient({ routes: { '/api/x': () => new Response(null, { status: 204 }) } })
    expect(await api.del('/api/x')).toEqual({ ok: true, status: 204, data: null })
  })

  it('ağ hatası istisna DEĞİL, API_ERR_NETWORK sonucudur', async () => {
    const { api } = makeClient({ routes: { '/api/x': () => { throw new TypeError('ağ koptu') } } })
    expect(await api.get('/api/x')).toEqual({ ok: false, status: 0, error: API_ERR_NETWORK })
  })

  it('JSON olmayan gövde API_ERR_PARSE verir', async () => {
    const { api } = makeClient({ routes: { '/api/x': () => new Response('<html>', { status: 200 }) } })
    const res = await api.get('/api/x')
    expect(res.ok).toBe(false)
    expect(res.error).toBe(API_ERR_PARSE)
  })

  it('sunucu hata kodu ve detail olduğu gibi taşınır', async () => {
    const { api } = makeClient({
      routes: {
        '/api/x': () => jsonResponse({ error: 'TOO_LONG', detail: { field: 'name', max: 200 } }, 400),
      },
    })
    const res = await api.post('/api/x', { name: 'çok uzun' })
    expect(res).toEqual({
      ok: false, status: 400, error: 'TOO_LONG', detail: { field: 'name', max: 200 },
    })
  })
})

describe('401 → sessiz yenileme → yeniden deneme', () => {
  it('eski token 401 alınca yenileme yapılır ve istek YENİ tokenla tekrarlanır', async () => {
    const { api, setAccessToken, calls } = makeClient({
      routes: {
        '/api/auth/refresh': () => jsonResponse({ accessToken: 't2' }),
        '/api/x': (init) => (init.headers.Authorization === 'Bearer t2'
          ? jsonResponse({ ok: 1 })
          : jsonResponse({ error: 'unauthorized' }, 401)),
      },
    })

    const res = await api.get('/api/x')

    expect(res.ok).toBe(true)
    expect(setAccessToken).toHaveBeenCalledWith('t2')
    // 401 alan ilk deneme + yeniden deneme = 2; ikincisi yeni tokenla.
    expect(calls('/api/x')).toHaveLength(2)
    expect(calls('/api/x')[1][1].headers.Authorization).toBe('Bearer t2')
  })

  it('eşzamanlı iki 401 TEK yenileme isteği açar (tek uçuş)', async () => {
    const { api, calls } = makeClient({
      routes: {
        '/api/auth/refresh': () => jsonResponse({ accessToken: 't2' }),
        '/api/a': (init) => (init.headers.Authorization === 'Bearer t2'
          ? jsonResponse({ r: 'a' })
          : jsonResponse({ error: 'unauthorized' }, 401)),
        '/api/b': (init) => (init.headers.Authorization === 'Bearer t2'
          ? jsonResponse({ r: 'b' })
          : jsonResponse({ error: 'unauthorized' }, 401)),
      },
    })

    const [a, b] = await Promise.all([api.get('/api/a'), api.get('/api/b')])

    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    expect(calls('/api/auth/refresh')).toHaveLength(1)
  })

  it('yenileme de düşerse oturum kapatılır ve tekrar denenmez', async () => {
    const { api, setAccessToken, onSessionExpired, calls } = makeClient({
      routes: {
        '/api/auth/refresh': () => jsonResponse({ error: 'INVALID_REFRESH_TOKEN' }, 401),
        '/api/x': () => jsonResponse({ error: 'unauthorized' }, 401),
      },
    })

    const res = await api.get('/api/x')

    expect(res.ok).toBe(false)
    expect(res.status).toBe(401)
    expect(setAccessToken).toHaveBeenCalledWith(null)
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
    // Asıl uca yalnızca İLK deneme gitmiş olmalı — yenileme başarısızken
    // isteği tekrarlamak aynı 401'i bir kez daha almak olurdu.
    expect(calls('/api/x')).toHaveLength(1)
    // Sekme yarışı telafisi: yenileme, kısa bir bekleyişle İKİ kez denenir
    // (api.js REFRESH_RETRY_MS) — çerezi öteki sekme tazelemiş olabilir.
    expect(calls('/api/auth/refresh')).toHaveLength(2)
  })
}, 10_000)
