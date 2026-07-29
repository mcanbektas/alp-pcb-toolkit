// Kısa süreli bildirim bağı — "Çıkış yapıldı", "Rapor indirildi" gibi,
// kullanıcıyı durdurmayan geri bildirim. Kartı `components/Toast.jsx` çizer,
// nerede duracağına `App.jsx` → Layout karar verir.
//
// Neden bağlam (context): bildirimi tetikleyen yer ile gösterildiği yer aynı
// bileşen değil. Çıkışta yönlendirme de var — sağlayıcı yönlendirmenin ÜSTÜNDE
// durduğu için mesaj sayfa değişse de yaşar. Önceden bu iş yönlendirme durumuna
// (`navigate(…, { state })`) yüklenmişti; o yol yalnızca yönlendirmeyle birlikte
// çalışıyordu ve gösterildikten sonra geçmişten elle temizlenmesi gerekiyordu.
//
// Mesaj hazır dize olarak gelir: cümleyi çağıran kurar, burada dil bilgisi yok.

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const NoticeContext = createContext(null)

export function NoticeProvider({ children }) {
  const [notice, setNotice] = useState(null)

  const showNotice = useCallback((message) => {
    // Boş mesaj kart açmaz — çağıran tarafta beklenmedik bir `undefined`
    // sessiz bir boş kutu olarak görünmesin.
    setNotice(typeof message === 'string' && message !== '' ? message : null)
  }, [])

  const dismissNotice = useCallback(() => setNotice(null), [])

  const value = useMemo(
    () => ({ notice, showNotice, dismissNotice }),
    [notice, showNotice, dismissNotice],
  )

  return <NoticeContext.Provider value={value}>{children}</NoticeContext.Provider>
}

export function useNotice() {
  const ctx = useContext(NoticeContext)
  if (!ctx) throw new Error('useNotice, NoticeProvider dışında çağrıldı.')
  return ctx
}
