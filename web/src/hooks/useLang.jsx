// Dil bağı — dil ARTIK URL'DEN okunur, depodan değil.
//
// `/arac/gerilim-bolucu` Türkçe sayfadır, `/en/tool/voltage-divider`
// İngilizce. Tek kaynak URL olduğu için:
//
//   - Kanonik adresle gösterilen içerik ayrışamaz (hreflang doğru kalır).
//   - Prerender ve tarayıcı aynı girdiden aynı ağacı kurar; dil kaynaklı
//     hydration ayrışması diye bir sınıf kalmadı. Eski "ilk render her zaman
//     DEFAULT_LANG, depodaki seçim mount'tan sonra" kuralı bu yüzden
//     kaldırıldı — İngilizce kullanıcı artık bir kare Türkçe GÖRMEZ.
//   - Dil değiştirmek gezinmedir: `LangSwitch` karşılık gelen adrese giden
//     bir bağlantıdır (App.jsx), `setLang` diye bir çağrı kalmadı.
//
// Kararlar: docs/en-url-karari.md §3.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DEFAULT_LANG, isLang } from '../lib/i18n'
import { langFromPath } from '../lib/routes'

const LangContext = createContext({ lang: DEFAULT_LANG, setLangOverride: () => {} })

export function LangProvider({ children }) {
  const { pathname } = useLocation()
  const urlLang = langFromPath(pathname)

  // GEÇİCİ geçersiz kılma — tek kullanıcısı `useLangCapture`: rapor başka bir
  // dilde isteniyorsa ekran iki `flushSync` arasında o dile çevrilir, çıktı
  // okunur ve geri alınır. Adres çubuğu bu iş için DEĞİŞTİRİLEMEZ: kullanıcı
  // gezinmemiştir, form durumu ve `?hesap=` bağı yerinde kalmalıdır.
  //
  // Başlangıcı `null`dır, yani ilk render her zaman URL'in dilidir —
  // prerender'lı HTML ile hydration bu yüzden ayrışmaz.
  const [override, setOverride] = useState(null)
  const lang = override ?? urlLang

  // Geçersiz değer sessizce arayüzü Türkçeye düşürmesin; `null` geri alma
  // demektir ve geçerlidir.
  const setLangOverride = useCallback(
    (next) => setOverride(next === null || isLang(next) ? next : null),
    [],
  )

  // <html lang> dille birlikte değişir: `text-transform: uppercase` sayfanın
  // diline göre büyütür ve Türkçe etiket altında "i" harfi "İ" olur.
  // Prerender çıktısında bu öznitelik zaten doğru yazılıdır
  // (`scripts/build-prerender.mjs`); buradaki etki tarayıcı içi gezinme
  // içindir — sayfa yenilenmeden dil ağacı değiştiğinde.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => ({ lang, setLangOverride }), [lang, setLangOverride])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
