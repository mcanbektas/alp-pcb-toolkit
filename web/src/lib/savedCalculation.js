// Kaydedilmiş hesabın geri yüklenmesi — saf katman.
//
// Sunucu `InputsJson`/`ResultJson` alanlarını opak dize olarak saklar; hangi
// aracın hangi alanları olduğunu bilmez. Bu yüzden kaydı ekrana
// geri koyarken doğrulama tamamen burada yapılır. React, DOM ve ağ bilmez;
// hata durumunda `{ ok: false, error: <kod> }` döner, cümle kurmaz.
//
// Neden gerekli: bir aracın `INITIAL_FORM`'u zamanla değişir (alan eklenir,
// silinir, tipi değişir). Eski bir kaydı ham hâliyle `patch()`'e vermek, artık
// var olmayan alanları form state'ine geri sokar ve `compute()` bunları
// beklenmedik yerde bulur. Kayıt bu yüzden mevcut şemaya SÜZÜLEREK yüklenir:
// tanınmayan alan atılır, eksik alan başlangıç değerinde kalır.

export const CALC_ERR_PARSE = 'calc-parse'
export const CALC_ERR_SHAPE = 'calc-shape'

export const ENGINE_CURRENT = 'current'
export const ENGINE_STALE = 'stale'
export const ENGINE_UNKNOWN = 'unknown'

// Araç ekranına kaydı taşıyan sorgu parametresi. Yol durumunda (`navigate`
// state) değil URL'de tutulur: kayıt bağlantısı paylaşılabilsin ve sayfa
// yenilendiğinde kaybolmasın diye.
export const CALC_PARAM = 'hesap'

// Bozuk/şişirilmiş bir kaydın ekranı kilitlemesini engelleyen üst sınır.
// Normal bir satır listesi bunun çok altında kalır.
const MAX_ROWS = 500

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isPrimitive(v) {
  return v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
}

// Form state'i dize tutar (bkz. CLAUDE.md "Birim ve sayı akışı"). Kayıttan
// sayı ya da boolean dönerse alan `value={}` ile girişe basılacağı için dizeye
// çevrilir; `null` boş alan demektir.
function toFormValue(saved, initial) {
  if (typeof initial !== 'string') return saved
  return saved === null ? '' : String(saved)
}

// Satır listesi (RowList) satırı: başlangıçtaki satır şablonunun anahtarları
// korunur, kayıttaki fazlalık anahtarlar atılır, eksikler şablondan gelir.
function restoreRow(savedRow, template) {
  if (!isPlainObject(savedRow)) return null
  const row = { ...template }
  for (const key of Object.keys(template)) {
    const value = savedRow[key]
    if (isPrimitive(value)) row[key] = toFormValue(value, template[key])
  }
  return row
}

function restoreArray(savedValue, initialValue) {
  if (!Array.isArray(savedValue) || savedValue.length > MAX_ROWS) return undefined

  const template = initialValue.find(isPlainObject)
  if (!template) {
    // Şablon yoksa dizi düz değerler taşıyor demektir; yalnız ilkel eleman kabul edilir.
    return savedValue.every(isPrimitive) ? savedValue.slice() : undefined
  }

  const rows = []
  for (const savedRow of savedValue) {
    const row = restoreRow(savedRow, template)
    if (row === null) return undefined // tek bozuk satır bütün alanı düşürür, yarısı yüklenmez
    rows.push(row)
  }
  return rows
}

function restoreValue(savedValue, initialValue) {
  if (Array.isArray(initialValue)) return restoreArray(savedValue, initialValue)

  if (isPlainObject(initialValue)) {
    const row = restoreRow(savedValue, initialValue)
    return row === null ? undefined : row
  }

  if (!isPrimitive(savedValue)) return undefined
  return toFormValue(savedValue, initialValue)
}

/**
 * Kaydedilmiş `inputsJson`'ı aracın mevcut form şemasına süzerek geri yükler.
 *
 * @returns `{ ok: true, form, dropped, added }` — `dropped`: kayıtta olup
 *   şemaya uymadığı için alınamayan alan adları; `added`: şemada olup kayıtta
 *   hiç bulunmayan, başlangıç değerinde bırakılan alan adları. İkisi de araca
 *   sonradan alan eklendiğini/çıkarıldığını görünür kılar.
 */
export function restoreForm(inputsJson, initialForm) {
  if (typeof inputsJson !== 'string' || inputsJson.trim() === '') {
    return { ok: false, error: CALC_ERR_PARSE }
  }

  let parsed
  try {
    parsed = JSON.parse(inputsJson)
  } catch {
    return { ok: false, error: CALC_ERR_PARSE }
  }

  if (!isPlainObject(parsed)) return { ok: false, error: CALC_ERR_SHAPE }
  if (!isPlainObject(initialForm)) return { ok: false, error: CALC_ERR_SHAPE }

  const form = { ...initialForm }
  const dropped = []
  const added = []

  for (const key of Object.keys(initialForm)) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key)) {
      added.push(key)
      continue
    }
    const value = restoreValue(parsed[key], initialForm[key])
    if (value === undefined) dropped.push(key)
    else form[key] = value
  }

  for (const key of Object.keys(parsed)) {
    if (!Object.prototype.hasOwnProperty.call(initialForm, key)) dropped.push(key)
  }

  return { ok: true, form, dropped, added }
}

/**
 * Kaydın motor sürümü ile uygulamanın güncel sürümünü karşılaştırır.
 * Sürüm sayısal değilse karar verilmez — `unknown` döner, `stale` denmez.
 */
export function engineStatus(savedVersion, currentVersion) {
  const saved = Number.parseInt(savedVersion, 10)
  const current = Number.parseInt(currentVersion, 10)
  if (!Number.isFinite(saved) || !Number.isFinite(current)) return ENGINE_UNKNOWN
  return saved < current ? ENGINE_STALE : ENGINE_CURRENT
}
