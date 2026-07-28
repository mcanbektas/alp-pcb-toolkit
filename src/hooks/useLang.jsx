// Dil bağı — somut depolama portu yalnızca burada bağlanır (lib saf kalır).
//
// Seçim tarayıcıda saklanır, böylece sayfa yenilendiğinde ya da başka bir araca
// geçildiğinde dil korunur. Depolamaya erişilemediğinde (gizli sekme, kapalı
// site verisi) port nullStorage'a düşer: dil o oturum boyunca çalışır, yalnızca
// kalıcı olmaz — arayüz yine de açılır.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { defaultStorage } from '../lib/storage'
import { DEFAULT_LANG, isLang, readLang, writeLang } from '../lib/i18n'

const LangContext = createContext({ lang: DEFAULT_LANG, setLang: () => {} })

export function LangProvider({ children, storage = defaultStorage }) {
  const [lang, setLangState] = useState(() => readLang(storage))

  // <html lang> dille birlikte değişir: `text-transform: uppercase` sayfanın
  // diline göre büyütür ve Türkçe etiket altında "i" harfi "İ" olur.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next) => {
    if (!isLang(next)) return
    setLangState(next)
    writeLang(storage, next)
  }, [storage])

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
