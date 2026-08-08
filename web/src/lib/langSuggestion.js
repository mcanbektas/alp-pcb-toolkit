// Dil önerisi kararı — saf katman: React, DOM ve tarayıcı API'si bilmez.
//
// Amaç: tarayıcı dili sayfanın dilinden FARKLIYSA, öteki dilin karşılığına
// giden kapatılabilir bir öneri göstermek. Sinyal `navigator.languages`tır,
// IP/coğrafya DEĞİL: Googlebot çoğunlukla ABD IP'sinden tarar ve GeoIP
// kanonik TR indekslemesini bozar; tarayıcı dili kullanıcının kendi
// beyanıdır. Otomatik YÖNLENDİRME de değildir, yalnızca ÖNERİ — URL tek
// gerçek kaynak kalır (docs/en-url-karari.md §3).
// Kararların tamamı: docs/brifler/15-dil-onerisi-seridi.md.
//
// Depo yardımcıları portu (`storage.js` sözleşmesi) parametre alır — burada
// doğrudan `localStorage`'a konuşulmaz.

import { isLang } from './i18n'

export const LANG_SUGGESTION_KEY = 'alp-lang-suggestion-dismissed'

function primaryLang(tag) {
  if (typeof tag !== 'string' || tag === '') return null
  const base = tag.split('-')[0].toLowerCase()
  return isLang(base) ? base : null
}

/**
 * Önerilecek dili döner ya da öneri yoksa `null`.
 *   browserLangs — `navigator.languages` (ör. `['en-US', 'en']`)
 *   urlLang      — sayfanın dili (`langFromPath`)
 *   dismissed    — kullanıcı öneriyi daha önce kapattı mı
 *
 * Tanınmayan bir dile (ör. `de`) öneri YAPILMAZ — iki dilimizden birini
 * beyan edene yapılır, üçüncü bir dile rastgele bir sürüm dayatılmaz.
 */
export function suggestLang({ browserLangs, urlLang, dismissed }) {
  if (dismissed) return null
  if (!Array.isArray(browserLangs) || browserLangs.length === 0) return null
  const target = primaryLang(browserLangs[0])
  if (!target || target === urlLang) return null
  return target
}

export function readDismissed(storage) {
  return storage.read(LANG_SUGGESTION_KEY) === '1'
}

export function writeDismissed(storage) {
  storage.write(LANG_SUGGESTION_KEY, '1')
}
