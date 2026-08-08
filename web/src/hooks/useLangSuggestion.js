// Dil önerisi somut bağı — tarayıcı API'si (`navigator.languages`) ve depo
// (`localStorage`) YALNIZ burada görünür (CLAUDE.md'deki dörtlü listeye
// eklenir). Karar mantığı `lib/langSuggestion.js`te saf kalır.
//
// `isLangPrefPath` sayfalarında öneri gösterilmez: orası `LangPrefRedirect`in
// bölgesi (App.jsx), iki mekanizma aynı sayfada yarışmaz
// (docs/brifler/15-dil-onerisi-seridi.md §5).
//
// Karar yalnız MOUNT'TAN SONRA verilir (`useEffect`): ilk render hem
// prerender'da hem tarayıcıda şeritsizdir, `navigator`/depo okunana kadar
// aynı ağaç kurulur — hydration ayrışmaz (dört DFM ekranındaki kuralın
// aynısı).

import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { browserStorage } from '../lib/storage'
import { langFromPath, isLangPrefPath, translatePath } from '../lib/routes'
import { suggestLang, readDismissed, writeDismissed } from '../lib/langSuggestion'

export function useLangSuggestion() {
  const { pathname, search, hash } = useLocation()
  const urlLang = langFromPath(pathname)
  const storage = useMemo(() => browserStorage(), [])
  const [targetLang, setTargetLang] = useState(null)

  useEffect(() => {
    if (isLangPrefPath(pathname)) {
      setTargetLang(null)
      return
    }
    const browserLangs = typeof navigator === 'undefined'
      ? []
      : navigator.languages ?? (navigator.language ? [navigator.language] : [])
    setTargetLang(suggestLang({
      browserLangs,
      urlLang,
      dismissed: readDismissed(storage),
    }))
  }, [pathname, urlLang, storage])

  if (!targetLang) return null

  return {
    targetLang,
    targetPath: translatePath(`${pathname}${search}${hash}`, targetLang),
    dismiss() {
      writeDismissed(storage)
      setTargetLang(null)
    },
  }
}
