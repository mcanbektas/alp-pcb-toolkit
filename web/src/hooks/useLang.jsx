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
  // İlk render HER ZAMAN varsayılan dille çizilir, depodaki seçimle DEĞİL.
  // Gerekçe hydration: sayfalar derleme sonrası prerender'lanıyor
  // (`scripts/build-prerender.mjs`) ve prerender sunucuda koşarken depoyu
  // göremez, yani varsayılan dille üretilir. Burada depo ilk render'da
  // okunsaydı EN seçmiş kullanıcıda ağaç prerender'lı HTML ile ayrışır ve
  // React bütün sayfayı sessizce yeniden çizerdi.
  //
  // Karşılığı, EN kullanıcısında bir karelik TR görüntüsüdür — o kare
  // prerender'la zaten kaçınılmazdı (sunucu ziyaretçinin dilini bilmez),
  // bu sıralama yalnızca React'e "beklenen" diyor.
  // Ayrıntı: docs/prerender-karari.md §2.
  const [lang, setLangState] = useState(DEFAULT_LANG)

  useEffect(() => {
    const stored = readLang(storage)
    if (stored !== DEFAULT_LANG) setLangState(stored)
    // Yalnız ilk mount: sonraki değişiklikler `setLang` üzerinden gelir ve
    // burada tekrar okunursa kullanıcının seçimi kendi üzerine yazılır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
