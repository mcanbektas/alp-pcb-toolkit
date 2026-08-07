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
import { useLang } from './useLang'

const AuthContext = createContext(null)

export const AUTH_LOADING = 'loading'
export const AUTH_AUTHENTICATED = 'authenticated'
export const AUTH_ANONYMOUS = 'anonymous'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export function AuthProvider({ children }) {
  // Kimlik postalarının dili buradan geçer: sağlayıcı `LangProvider`ın
  // İÇİNDEDİR, yani o an görülen arayüz dilini okuyabilir. Ekran başına
  // geçirilseydi bir ekranın unutması sessizce Türkçe postaya düşerdi
  // (docs/eposta-dili-karari.md §1). Sunucuya yalnız DİL KODU gider, metin
  // değil — gövdeyi istemci belirlese kimlik avı yüzeyi açılırdı (§2).
  const { lang } = useLang()
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
  // `lang` giriş isteğinde de gider: eşiği aşan başarısız deneme hesabı
  // kilitler ve sunucu kullanıcıya iki bağlantılı bir bilgilendirme postalar
  // (kilidi aç / parolayı sıfırla). Postanın dilini başka hiçbir kaynaktan
  // okuyamaz — kayıt ve parola sıfırlamayla aynı kural.
  const login = useCallback(async (email, password, rememberMe = false) => {
    const res = await api.post('/api/auth/login', { email, password, rememberMe, lang }, { auth: false })
    if (res.ok) {
      tokenRef.current = res.data.accessToken
      await loadMe()
    }
    return res
  }, [api, loadMe, lang])

  const register = useCallback((email, password, displayName) => (
    api.post('/api/auth/register', { email, password, displayName, lang }, { auth: false })
  ), [api, lang])

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout', undefined, { auth: false })
    tokenRef.current = null
    setUser(null)
    setStatus(AUTH_ANONYMOUS)
  }, [api])

  const forgotPassword = useCallback((email) => (
    api.post('/api/auth/forgot-password', { email, lang }, { auth: false })
  ), [api, lang])

  const resetPassword = useCallback((email, token, newPassword) => (
    api.post('/api/auth/reset-password', { email, token, newPassword }, { auth: false })
  ), [api])

  // Parola değiştirme. Sunucu bu kullanıcının bütün yenileme token'larını
  // iptal edip BU oturuma yenisini basar — diğer cihazlar düşer, buradaki
  // sekme ayakta kalır. Dönen erişim token'ı bu yüzden saklanmalı: eskisi
  // süresi dolunca yenilenemez ve kullanıcı sessizce oturumdan düşerdi.
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const res = await api.post('/api/me/password', { currentPassword, newPassword })
    if (res.ok) tokenRef.current = res.data.accessToken
    return res
  }, [api])

  const confirmEmail = useCallback((userId, token) => {
    const q = `userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
    return api.get(`/api/auth/confirm-email?${q}`, { auth: false })
  }, [api])

  // Kilitlenme postasındaki "kilidi aç" bağlantısının ucu. `confirmEmail` ile
  // aynı `userId`/`token` çiftini taşır ama GET değil POST'tur (bkz.
  // AuthEndpoints.Unlock) — parolayı değiştirmez, yalnızca kilidi kaldırır.
  const unlockAccount = useCallback((userId, token) => (
    api.post('/api/auth/unlock', { userId, token }, { auth: false })
  ), [api])

  // Profil (ad/firma) değiştikten sonra başlıktaki ad ve rapor formundaki
  // "Hazırlayan" varsayılanı da tazelenmeli; ekran kendi kopyasını tutarsa
  // ikisi ayrışır. `loadMe` zaten oturum durumunu da doğru bırakır.
  const refreshUser = useCallback(() => loadMe(), [loadMe])

  const value = useMemo(() => ({
    status,
    user,
    refreshUser,
    isAuthenticated: status === AUTH_AUTHENTICATED,
    isLoading: status === AUTH_LOADING,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    confirmEmail,
    unlockAccount,
    // Auth dışı uçlar (rapor, proje) için: token ekleme ve 401'de sessiz
    // yenileme burada zaten çözülmüş durumda, ekran yeniden kurmaz.
    api,
  }), [status, user, refreshUser, login, register, logout, forgotPassword, resetPassword,
    changePassword, confirmEmail, unlockAccount, api])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth, AuthProvider dışında çağrıldı.')
  return ctx
}
