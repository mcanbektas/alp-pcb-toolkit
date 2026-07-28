// Dil seçimi — saf katman: React bilmez, tarayıcı API'sini port üzerinden görür.
//
// Uygulama iki dillidir (tr, en). Varsayılan Türkçedir: araç adlarının ve
// mühendislik terimlerinin karşılığı önce Türkçe yazıldı, İngilizce onun
// çevirisidir.
//
// DİL ETİKETİ ÖNEMLİDİR, yalnızca çeviri meselesi değil: `text-transform:
// uppercase` kuralı sayfanın dilini kullanır. `lang="tr"` altında tarayıcı
// "i" harfini "İ" yapar, çünkü Türkçede noktalı büyük harf ayrı bir harftir.
// İngilizce metin Türkçe etiket altında büyütülünce "VIA" yerine "VİA" çıkar.
// Bu yüzden dil değiştiğinde <html lang> de değişir.

export const LANGS = ['tr', 'en']
export const DEFAULT_LANG = 'tr'

export const LANG_LABEL = { tr: 'Türkçe', en: 'English' }

const STORAGE_KEY = 'alp-pcb-lang'

export function isLang(value) {
  return LANGS.includes(value)
}

/**
 * Saklanan dili okur. Geçersiz veya eksikse varsayılana düşer — kullanıcının
 * eski/bozuk bir değeri arayüzü boş bırakmasın.
 */
export function readLang(storage) {
  const stored = storage?.read?.(STORAGE_KEY)
  return isLang(stored) ? stored : DEFAULT_LANG
}

export function writeLang(storage, lang) {
  if (!isLang(lang)) return { error: 'lang' }
  return storage?.write?.(STORAGE_KEY, lang) ?? { ok: true }
}

/**
 * İki dilli bir sözlükten geçerli dilin karşılığını verir.
 *
 * Çeviri eksikse İngilizce yerine TÜRKÇE'ye düşer: eksik çeviri boş kutu ya da
 * anahtar adı olarak değil, en azından okunabilir bir metin olarak görünsün.
 */
export function pick(dict, lang) {
  if (!dict) return undefined
  return dict[lang] ?? dict[DEFAULT_LANG]
}
