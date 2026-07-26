// Form alanı okuma — string girdiden doğrulanmış SI değerine.
//
// Her araç ekranı aynı üç işi yapıyordu: birim çarpanıyla SI'ye çevirmek,
// belirsiz binlik ayırıcıyı yakalamak, eksik/geçersiz alanı ada göre bildirmek.
// O iş burada bir kez yazılır. Modül saftır: React, DOM ve gösterim bilmez;
// alan etiketleri çağıran taraftan gelir.
//
// Alan tanımı (spec):
//   { key, label, unitKey?, table?, optional?, min?, max?, allowZero? }
//     key       — form nesnesindeki alan adı
//     label     — hata mesajında gösterilecek ad (çağıranın dilinde)
//     unitKey   — birim seçicinin form alanı adı; yoksa çarpan uygulanmaz
//     table     — birim → SI çarpan tablosu (units.js)
//     optional  — boş bırakılabilir; boşsa değer null olur
//     min/max   — SI cinsinden geçerlilik sınırı (dahil)
//     allowZero — varsayılan olarak sıfır geçersizdir; true ise kabul edilir

import { parseNumResult, NUM_ERR_EMPTY, NUM_ERR_THOUSANDS } from './num'

export const FIELD_ERR_AMBIGUOUS = 'ambiguous'
export const FIELD_ERR_MISSING = 'missing'
export const FIELD_ERR_INVALID = 'invalid'
export const FIELD_ERR_RANGE = 'range'
export const FIELD_ERR_UNIT = 'unit'

function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === ''
}

// Tek alanı okur. Döner: { value } | { error, label }
export function readField(form, spec) {
  const raw = form[spec.key]

  if (isBlank(raw)) {
    if (spec.optional) return { value: null }
    return { error: FIELD_ERR_MISSING, label: spec.label }
  }

  const parsed = parseNumResult(raw)
  if (parsed.error === NUM_ERR_THOUSANDS) {
    return { error: FIELD_ERR_AMBIGUOUS, label: spec.label }
  }
  if (parsed.error === NUM_ERR_EMPTY) {
    return spec.optional ? { value: null } : { error: FIELD_ERR_MISSING, label: spec.label }
  }
  if (parsed.error) return { error: FIELD_ERR_INVALID, label: spec.label }

  let value = parsed.value

  // Birim çarpanı. Bilinmeyen birim sessizce 1 kabul edilmez — bu, sessiz bir
  // birim hatası olurdu.
  if (spec.table) {
    const unit = spec.unitKey ? form[spec.unitKey] : spec.unit
    const factor = spec.table[unit]
    if (factor === undefined) return { error: FIELD_ERR_UNIT, label: spec.label }
    value *= factor
  }

  if (value === 0 && !spec.allowZero) return { error: FIELD_ERR_RANGE, label: spec.label }
  if (spec.min !== undefined && value < spec.min) return { error: FIELD_ERR_RANGE, label: spec.label }
  if (spec.max !== undefined && value > spec.max) return { error: FIELD_ERR_RANGE, label: spec.label }

  return { value }
}

/**
 * Alan listesini toplu okur.
 *
 * Belirsiz binlik ayırıcı diğer hatalardan ayrı raporlanır: kullanıcıya
 * "girdin okunamadı" yerine "bu sayı bin mi 1.0 mı belirsiz" demek gerekir.
 *
 * @returns {{ values: object, ambiguous: string[], invalid: string[], ok: boolean }}
 */
export function readForm(form, specs) {
  const values = {}
  const ambiguous = []
  const invalid = []

  for (const spec of specs) {
    const r = readField(form, spec)
    if (r.error === FIELD_ERR_AMBIGUOUS) {
      ambiguous.push(r.label)
    } else if (r.error) {
      invalid.push(r.label)
    } else {
      values[spec.key] = r.value
    }
  }

  return { values, ambiguous, invalid, ok: ambiguous.length === 0 && invalid.length === 0 }
}

/**
 * Satır listesi okur (paralel yollar, stack-up katmanları, kapasitör ağı gibi).
 *
 * Her satır kendi içinde aynı alan tanımlarını taşır. Hatalı satırın numarası
 * etikete eklenir, böylece kullanıcı hangi satırı düzelteceğini bilir.
 *
 * @returns {{ rows: object[], ambiguous: string[], invalid: string[], ok: boolean }}
 */
export function readRows(rows, specs, rowLabel = 'Satır') {
  const out = []
  const ambiguous = []
  const invalid = []

  if (!Array.isArray(rows) || rows.length === 0) {
    return { rows: [], ambiguous, invalid: [rowLabel], ok: false }
  }

  rows.forEach((row, i) => {
    const values = {}
    for (const spec of specs) {
      const label = `${rowLabel} ${i + 1} — ${spec.label}`
      const r = readField(row, spec)
      if (r.error === FIELD_ERR_AMBIGUOUS) ambiguous.push(label)
      else if (r.error) invalid.push(label)
      else values[spec.key] = r.value
    }
    out.push(values)
  })

  return { rows: out, ambiguous, invalid, ok: ambiguous.length === 0 && invalid.length === 0 }
}

// Koşullu alan listesi kurmayı okunur kılar:
//   fieldsFor([ base, when(f.tol, tolFields) ])
export function when(condition, specs) {
  return condition ? specs : []
}

export function fieldsFor(groups) {
  return groups.flat()
}
