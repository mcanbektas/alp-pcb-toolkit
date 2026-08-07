// Dil TERCİHİ — dil KAYNAĞINDAN (`lib/routes.js` → langFromPath, URL) AYRI bir
// şey. Kaynak hâlâ URL'dir (docs/en-url-karari.md §3) ve açık/taranan
// sayfalarda (ana sayfa, kategori, araç, yasal) hiçbir şey değişmedi.
//
// Bu depo yalnız OTURUMLA İLGİLİ, indekslenmeyen sayfalarda (`/yonetim`,
// `/giris`, `/projelerim`, ...) kullanılır: kullanıcı son gezindiği dilde
// kalsın diye `App.jsx` → `LangPrefRedirect` bu değeri okur. Eski
// `readLang`/`writeLang` (kaldırılan) ile KARIŞTIRILMAMALI — o dilin
// KAYNAĞIYDI, bu yalnız bir HATIRLAMA katmanıdır ve indekslenen tek bir
// sayfayı bile yönlendirmez.
import { isLang } from './i18n'

const KEY = 'alp-lang-pref'

export function readLangPref() {
  try {
    const value = window.localStorage.getItem(KEY)
    return isLang(value) ? value : null
  } catch {
    return null
  }
}

export function writeLangPref(lang) {
  try {
    window.localStorage.setItem(KEY, lang)
  } catch {
    // Depolama kapalı ya da dolu olabilir (gizli sekme, kota) — tercih
    // kalıcı olmaz ama sayfa yine çalışır, bu yüzden hata yutulur.
  }
}
