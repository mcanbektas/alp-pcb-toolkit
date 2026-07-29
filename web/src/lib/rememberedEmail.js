// "Beni kaydet" tikinin hatırladığı e-posta adresi — saf katman.
//
// i18n.js'teki readLang/writeLang ile aynı desen: burada yalnızca depolama
// PORTU bilinir, somut `localStorage` bağı `hooks/useRememberedEmail.js`tedir.
//
// PAROLA BURAYA YAZILMAZ ve yazılacak bir yer de açılmaz. Uygulamanın kendi
// depolamasındaki parola, XSS'te doğrudan hesap kaybı demektir; parolayı
// hatırlatmak tarayıcının kendi parola yöneticisinin işidir.

const STORAGE_KEY = 'alp:remembered-email'

// RFC 5321'in izin verdiği en uzun adres. Sınır, bozuk/şişirilmiş bir değerin
// depolamayı doldurmasına karşı — biçim doğrulaması değil.
const MAX_LENGTH = 320

export const REMEMBER_ERR_EMPTY = 'empty'
export const REMEMBER_ERR_TOO_LONG = 'tooLong'

/**
 * @param {{read?: (key: string) => unknown}} storage
 * @returns {string} hatırlanan adres; yoksa ya da bozuksa boş dize
 */
export function readRememberedEmail(storage) {
  const stored = storage?.read?.(STORAGE_KEY)
  if (typeof stored !== 'string') return ''
  const trimmed = stored.trim()
  // Sınırı aşan eski/bozuk kayıt sessizce kısaltılmaz: hiç yokmuş gibi
  // davranılır, kullanıcı adresini yeniden yazar.
  return trimmed.length > 0 && trimmed.length <= MAX_LENGTH ? trimmed : ''
}

/**
 * @param {{write?: (key: string, value: string) => unknown}} storage
 * @param {string} email
 */
export function writeRememberedEmail(storage, email) {
  const value = typeof email === 'string' ? email.trim() : ''
  if (value.length === 0) return { error: REMEMBER_ERR_EMPTY }
  if (value.length > MAX_LENGTH) return { error: REMEMBER_ERR_TOO_LONG }
  return storage?.write?.(STORAGE_KEY, value) ?? { ok: true }
}

/** Tik kaldırıldığında ya da çıkış yapıldığında çağrılır. */
export function clearRememberedEmail(storage) {
  return storage?.remove?.(STORAGE_KEY) ?? { ok: true }
}
