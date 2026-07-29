// Sunucu API istemcisi.
//
// storage.js ile aynı desen: somut istek (fetch) burada, hangi taban adresin
// ve token kaynağının kullanılacağı kararı `hooks/useAuth.jsx`'te verilir.
// Hiçbir çağrı istisna fırlatmaz; sonuç her zaman { ok, ... } biçiminde döner.
// Hata yükü dilsizdir — yalnızca sunucunun döndürdüğü kod ve `detail` taşınır,
// cümleyi kuran taraf `data/authText.js`'tir.

export const API_ERR_NETWORK = 'network'
export const API_ERR_PARSE = 'parse'

async function parseBody(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return undefined // ayrıştırılamadı işareti — geçerli bir gövde `null` döner, bu `undefined` döner
  }
}

// PDF/Excel gibi ikili gövdeli yanıt hatalıysa (auth, doğrulama) sunucu yine
// JSON `{ error, detail }` döner — yalnızca BAŞARILI yanıt ikili gövdedir.
// Bu yüzden hata yolunda `parseBody`, başarı yolunda `res.blob()` kullanılır.
function fileNameFrom(res, fallback) {
  const header = res.headers.get('content-disposition') ?? ''
  const m = header.match(/filename="?([^";]+)"?/)
  return m ? m[1] : fallback
}

/**
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {() => string|null} opts.getAccessToken
 * @param {(token: string|null) => void} opts.setAccessToken
 * @param {() => void} [opts.onSessionExpired]  sessiz yenileme de başarısız olunca çağrılır
 */
export function createApiClient({ baseUrl, getAccessToken, setAccessToken, onSessionExpired }) {
  // Eşzamanlı birden çok 401 aynı anda yenileme isteği açmasın diye tek
  // "uçuştaki" yenileme sözü paylaşılır.
  let refreshing = null

  async function fetchRaw(method, path, body, token) {
    try {
      return await fetch(`${baseUrl}${path}`, {
        method,
        credentials: 'include',
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch {
      return null // ağ hatası — çağıran taraf null'ı API_ERR_NETWORK'e çevirir
    }
  }

  async function rawRequest(method, path, body, token) {
    const res = await fetchRaw(method, path, body, token)
    if (res === null) return { ok: false, status: 0, error: API_ERR_NETWORK }

    if (res.status === 204) return { ok: true, status: 204, data: null }

    const parsed = await parseBody(res)
    if (parsed === undefined) return { ok: false, status: res.status, error: API_ERR_PARSE }

    if (!res.ok) {
      return { ok: false, status: res.status, error: parsed?.error ?? 'unknown', detail: parsed?.detail }
    }
    return { ok: true, status: res.status, data: parsed }
  }

  async function rawBlobRequest(method, path, body, token, fallbackFileName) {
    const res = await fetchRaw(method, path, body, token)
    if (res === null) return { ok: false, status: 0, error: API_ERR_NETWORK }

    if (res.ok) {
      const blob = await res.blob()
      return { ok: true, status: res.status, blob, fileName: fileNameFrom(res, fallbackFileName) }
    }

    // Hata yolunda gövde JSON'dur (rapor uçları da diğer uçlarla aynı hata
    // sözleşmesini kullanır).
    const parsed = await parseBody(res)
    if (parsed === undefined) return { ok: false, status: res.status, error: API_ERR_PARSE }
    return { ok: false, status: res.status, error: parsed?.error ?? 'unknown', detail: parsed?.detail }
  }

  async function refreshOnce() {
    if (!refreshing) {
      refreshing = rawRequest('POST', '/api/auth/refresh', undefined, null)
        .then((res) => {
          if (res.ok) setAccessToken(res.data.accessToken)
          return res
        })
        .finally(() => { refreshing = null })
    }
    return refreshing
  }

  // 401'de bir kez sessiz yenileme deneyen ortak sarmalayıcı — hem JSON hem
  // ikili istek yolu bunu kullanır, tek kopya.
  async function withRefresh(perform, { auth = true, retry = true } = {}) {
    const token = auth ? getAccessToken() : null
    const res = await perform(token)

    if (res.status === 401 && auth && retry) {
      const refreshed = await refreshOnce()
      if (refreshed.ok) return withRefresh(perform, { auth, retry: false })
      setAccessToken(null)
      onSessionExpired?.()
    }

    return res
  }

  function request(method, path, body, opts) {
    return withRefresh((token) => rawRequest(method, path, body, token), opts)
  }

  // Rapor indirme gibi ikili gövdeli uçlar için. `fallbackFileName`, sunucu
  // Content-Disposition göndermezse kullanılır.
  function requestBlob(method, path, body, fallbackFileName, opts) {
    return withRefresh((token) => rawBlobRequest(method, path, body, token, fallbackFileName), opts)
  }

  return {
    get: (path, opts) => request('GET', path, undefined, opts),
    post: (path, body, opts) => request('POST', path, body, opts),
    patch: (path, body, opts) => request('PATCH', path, body, opts),
    del: (path, opts) => request('DELETE', path, undefined, opts),
    postBlob: (path, body, fallbackFileName, opts) => requestBlob('POST', path, body, fallbackFileName, opts),
  }
}

// Tarayıcıda bir blob'u dosya olarak indirtir. Somut DOM erişimi — yalnızca
// çağıran bileşen (ReportDialog) kullanır, lib/ katmanı bunu port olarak görmez
// çünkü tek yönlü bir "yaz ve unut" eylemidir, test edilecek bir sonuç yoktur.
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
