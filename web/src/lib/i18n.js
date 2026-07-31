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
//
// DİL ARTIK URL'DEN OKUNUR, depodan değil (`lib/routes.js` → langFromPath).
// Eski `readLang`/`writeLang` çifti ve `localStorage` anahtarı KALDIRILDI:
// URL ile depo iki ayrı kaynak demekti ve kanonik olarak TR bildirilen bir
// adres kullanıcıya EN içerik gösterebiliyordu. Gerekçe: docs/en-url-karari.md
// §3. Kalıcılık artık bağlantının kendisindedir — `/en/...` yer imi de,
// paylaşılan bağlantı da dilini taşır.

export const LANGS = ['tr', 'en']
export const DEFAULT_LANG = 'tr'

export const LANG_LABEL = { tr: 'Türkçe', en: 'English' }

export function isLang(value) {
  return LANGS.includes(value)
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
