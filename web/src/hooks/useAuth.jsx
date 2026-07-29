// Oturum bağı — somut API istemcisi ve erişim token'ının tutulduğu yer.
//
// Erişim token'ı yalnızca bellekte durur (React ref), `localStorage`'a hiç
// yazılmaz: XSS ile çalınabilecek bir yere konmaz. Sayfa yenilendiğinde
// yenileme çerezi (HttpOnly, tarayıcı taşır) üzerinden sessizce yeni bir
// erişim token'ı istenir — kullanıcı tekrar giriş yapmaz.
// docs/uyelik-ve-rapor-plani.md §4.1

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'
import { createApiClient } from '../lib/api'

const AuthContext = createContext(null)

export const AUTH_LOADING = 'loading'
export const AUTH_AUTHENTICATED = 'authenticated'
export const AUTH_ANONYMOUS = 'anonymous'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export function AuthProvider({ children }) {
  const [status, setStatus] = useState(AUTH_LOADING)
  const [user, setUser] = useState(null)
  const tokenRef = useRef(null)

  const getAccessToken = useCallback(() => tokenRef.current, [])
  const setAccessToken = useCallback((token) => { tokenRef.current = token }, [])

  const handleSessionExpired = useCallback(() => {
    setUser(null)
    setStatus(AUTH_ANONYMOUS)
  }, [])

  const api = useMemo(() => createApiClient({
    baseUrl: API_BASE,
    getAccessToken,
    setAccessToken,
    onSessionExpired: handleSessionExpired,
  }), [getAccessToken, setAccessToken, handleSessionExpired])

  const loadMe = useCallback(async () => {
    const res = await api.get('/api/me')
    if (res.ok) {
      setUser(res.data)
      setStatus(AUTH_AUTHENTICATED)
    } else {
      setUser(null)
      setStatus(AUTH_ANONYMOUS)
    }
    return res
  }, [api])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // `api.post(...)` DEĞİL: sekme yarışında ilk yenileme 401 alabiliyor
      // (öteki sekme çerezi az önce döndürmüştür) ve tek denemede pes etmek
      // kullanıcıyı gereksiz yere oturumdan atıyordu. `refreshSession`
      // kısa bir bekleyişten sonra güncel çerezle bir kez daha dener.
      const res = await api.refreshSession()
      if (cancelled) return
      if (res.ok) {
        tokenRef.current = res.data.accessToken
        await loadMe()
      } else {
        setStatus(AUTH_ANONYMOUS)
      }
    })()
    return () => { cancelled = true }
    // Yalnızca ilk yüklemede — bağımlılıklar `api`/`loadMe` her render'da
    // aynı referansı korur (useMemo/useCallback), yine de tek seferlik
    // niyeti açık tutmak için boş bırakıldı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // rememberMe: sunucu yenileme çerezini son kullanma tarihiyle mi (kalıcı)
  // yoksa oturum çerezi olarak mı (tarayıcı kapanınca silinir) yazacağını
  // buna bakarak seçer. Erişim token'ı her iki durumda da yalnızca bellekte
  // kalır — "beni kaydet" hiçbir şeyi localStorage'a yazmaz.
  const login = useCallback(async (email, password, rememberMe = false) => {
    const res = await api.post('/api/auth/login', { email, password, rememberMe }, { auth: false })
    if (res.ok) {
      tokenRef.current = res.data.accessToken
      await loadMe()
    }
    return res
  }, [api, loadMe])

  const register = useCallback((email, password, displayName) => (
    api.post('/api/auth/register', { email, password, displayName }, { auth: false })
  ), [api])

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout', undefined, { auth: false })
    tokenRef.current = null
    setUser(null)
    setStatus(AUTH_ANONYMOUS)
  }, [api])

  const forgotPassword = useCallback((email) => (
    api.post('/api/auth/forgot-password', { email }, { auth: false })
  ), [api])

  const resetPassword = useCallback((email, token, newPassword) => (
    api.post('/api/auth/reset-password', { email, token, newPassword }, { auth: false })
  ), [api])

  const confirmEmail = useCallback((userId, token) => {
    const q = `userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
    return api.get(`/api/auth/confirm-email?${q}`, { auth: false })
  }, [api])

  const value = useMemo(() => ({
    status,
    user,
    isAuthenticated: status === AUTH_AUTHENTICATED,
    isLoading: status === AUTH_LOADING,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    confirmEmail,
    // Auth dışı uçlar (rapor, proje) için: token ekleme ve 401'de sessiz
    // yenileme burada zaten çözülmüş durumda, ekran yeniden kurmaz.
    api,
  }), [status, user, login, register, logout, forgotPassword, resetPassword, confirmEmail, api])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider dışında çağrıldı.')
  return ctx
}
