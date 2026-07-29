// Kaydedilmiş stack-up'lar — kullanıcının adlandırıp sakladığı katman
// dizilimleri.
//
// Modül saftır: React, DOM ve localStorage bilmez. Depolama `lib/storage.js`
// sözleşmesini uygulayan bir port olarak dışarıdan verilir.
// `thicknessRecords.js` / `dfmProfile.js` ile aynı desen.
//
// BİRİM SÖZLEŞMESİ — zarf mm saklar. Kayıt geri yüklendiğinde doğrudan form
// alanına yazılır; bu yüzden kanonik birim tektir ve geri yüklerken birim
// seçicileri mm'ye ayarlanır. Hesap SI ile yapılır, dönüşüm ekran modelinde
// tek noktada olur. Zarfta hiçbir yuvarlama yoktur.
//
// ZAMAN DAMGASI — `createdAt` / `updatedAt` **dışarıdan verilir**. Saf katman
// `new Date()` çağırmaz: aynı girdi iki farklı çıktı üretirse fonksiyon test
// edilebilir olmaktan çıkar.

import {
  LAYER_TYPES, LAYER_ROLES, TOL_MODES, TOL_ABSOLUTE,
} from './stackup'

export const STACKUP_SCHEMA = 'alp-stackup-profile'
export const SCHEMA_VERSION = 1

const STORAGE_KEY = 'alp-pcb.stackups.v1'

export const SP_ERR_SCHEMA = 'schema'
export const SP_ERR_VERSION = 'version'
export const SP_ERR_NAME = 'name'
export const SP_ERR_LAYERS = 'layers'
export const SP_ERR_LAYER_FIELD = 'layer-field'
export const SP_ERR_METADATA = 'metadata'
export const SP_ERR_STORAGE = 'storage'
export const SP_ERR_LIMIT = 'limit'
export const SP_ERR_PARSE = 'parse'
export const SP_ERR_NOT_FOUND = 'not-found'

export const SP_VARIANT_NOT_OBJECT = 'not-object'
export const SP_VARIANT_NOT_ARRAY = 'not-array'
export const SP_VARIANT_SCHEMA_NAME = 'schema-name'
export const SP_VARIANT_EMPTY = 'empty'
export const SP_VARIANT_TOO_LONG = 'too-long'
export const SP_VARIANT_NOT_NUMBER = 'not-number'
export const SP_VARIANT_NOT_POSITIVE = 'not-positive'
export const SP_VARIANT_NEGATIVE = 'negative'
export const SP_VARIANT_NOT_STRING = 'not-string'
export const SP_VARIANT_UNKNOWN_VALUE = 'unknown-value'

export const NAME_MAX = 60
export const TEXT_MAX = 80
export const LAYER_MAX = 60
export const STACKUP_MAX = 25

// Katman zarfındaki sayısal alanlar. `positive` işaretli olanlar sıfır kabul
// etmez; kalanlar sıfır ve boş geçilebilir.
const NUMBER_FIELDS = [
  { key: 'thickness', positive: true, required: true },
  { key: 'tolerancePlus' },
  { key: 'toleranceMinus' },
  { key: 'minimumThickness' },
  { key: 'maximumThickness' },
  { key: 'dielectricConstant', positive: true },
  { key: 'lossTangent' },
  { key: 'copperCoveragePercent', max: 100 },
]

const TEXT_FIELDS = ['name', 'material']

function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x)
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

export function normalizeName(name) {
  return normalizeText(name)
}

export function stackupId(name) {
  return normalizeName(name).toLocaleLowerCase('tr')
}

function validateLayer(layer, index) {
  if (typeof layer !== 'object' || layer === null || Array.isArray(layer)) {
    return { error: SP_ERR_LAYERS, index, variant: SP_VARIANT_NOT_OBJECT }
  }
  if (!LAYER_TYPES.includes(layer.type)) {
    return {
      error: SP_ERR_LAYER_FIELD, index, field: 'type',
      variant: SP_VARIANT_UNKNOWN_VALUE, allowed: LAYER_TYPES,
    }
  }
  if (layer.role !== null && layer.role !== undefined && !LAYER_ROLES.includes(layer.role)) {
    return {
      error: SP_ERR_LAYER_FIELD, index, field: 'role',
      variant: SP_VARIANT_UNKNOWN_VALUE, allowed: LAYER_ROLES,
    }
  }

  const mode = layer.toleranceMode ?? TOL_ABSOLUTE
  if (!TOL_MODES.includes(mode)) {
    return {
      error: SP_ERR_LAYER_FIELD, index, field: 'toleranceMode',
      variant: SP_VARIANT_UNKNOWN_VALUE, allowed: TOL_MODES,
    }
  }

  const out = { type: layer.type, role: layer.role ?? null, toleranceMode: mode }

  for (const field of TEXT_FIELDS) {
    const v = layer[field]
    if (v === null || v === undefined) {
      out[field] = ''
      continue
    }
    if (typeof v !== 'string') {
      return { error: SP_ERR_LAYER_FIELD, index, field, variant: SP_VARIANT_NOT_STRING }
    }
    if (v.length > TEXT_MAX) {
      return { error: SP_ERR_LAYER_FIELD, index, field, variant: SP_VARIANT_TOO_LONG, max: TEXT_MAX }
    }
    out[field] = normalizeText(v)
  }

  for (const spec of NUMBER_FIELDS) {
    const v = layer[spec.key]
    if (v === null || v === undefined) {
      if (spec.required) {
        return { error: SP_ERR_LAYER_FIELD, index, field: spec.key, variant: SP_VARIANT_NOT_NUMBER }
      }
      out[spec.key] = null
      continue
    }
    if (!isNum(v)) {
      return { error: SP_ERR_LAYER_FIELD, index, field: spec.key, variant: SP_VARIANT_NOT_NUMBER }
    }
    if (spec.positive && !(v > 0)) {
      return { error: SP_ERR_LAYER_FIELD, index, field: spec.key, variant: SP_VARIANT_NOT_POSITIVE }
    }
    if (!spec.positive && v < 0) {
      return { error: SP_ERR_LAYER_FIELD, index, field: spec.key, variant: SP_VARIANT_NEGATIVE }
    }
    if (spec.max !== undefined && v > spec.max) {
      return {
        error: SP_ERR_LAYER_FIELD, index, field: spec.key,
        variant: SP_VARIANT_NEGATIVE, max: spec.max,
      }
    }
    out[spec.key] = v
  }

  return { layer: out }
}

/**
 * Ham nesneyi doğrular. Döner: { stackup } veya { error, ...ayrıntı }
 *
 * Hata yükü dilsizdir: katman sırası ve alan anahtarı taşır, kullanıcının
 * kendi katman adını taşımaz.
 */
export function validateStackup(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { error: SP_ERR_SCHEMA, variant: SP_VARIANT_NOT_OBJECT }
  }
  if (obj.schema !== STACKUP_SCHEMA) {
    return { error: SP_ERR_SCHEMA, variant: SP_VARIANT_SCHEMA_NAME, expected: STACKUP_SCHEMA }
  }
  if (obj.schemaVersion !== SCHEMA_VERSION) {
    return { error: SP_ERR_VERSION, expected: SCHEMA_VERSION, found: obj.schemaVersion }
  }

  const name = normalizeName(obj.name)
  if (name === '') return { error: SP_ERR_NAME, variant: SP_VARIANT_EMPTY }
  if (name.length > NAME_MAX) {
    return { error: SP_ERR_NAME, variant: SP_VARIANT_TOO_LONG, max: NAME_MAX }
  }

  if (!Array.isArray(obj.layers)) {
    return { error: SP_ERR_LAYERS, variant: SP_VARIANT_NOT_ARRAY }
  }
  if (obj.layers.length === 0) {
    return { error: SP_ERR_LAYERS, variant: SP_VARIANT_EMPTY }
  }
  if (obj.layers.length > LAYER_MAX) {
    return { error: SP_ERR_LAYERS, variant: SP_VARIANT_TOO_LONG, max: LAYER_MAX }
  }

  const layers = []
  for (let i = 0; i < obj.layers.length; i += 1) {
    const r = validateLayer(obj.layers[i], i)
    if (r.error) return r
    layers.push(r.layer)
  }

  const rawMeta = obj.metadata ?? {}
  if (typeof rawMeta !== 'object' || rawMeta === null || Array.isArray(rawMeta)) {
    return { error: SP_ERR_METADATA, variant: SP_VARIANT_NOT_OBJECT }
  }
  const metadata = {}
  for (const key of ['createdAt', 'updatedAt']) {
    const v = rawMeta[key]
    if (v === null || v === undefined) {
      metadata[key] = ''
      continue
    }
    if (typeof v !== 'string') {
      return { error: SP_ERR_METADATA, field: key, variant: SP_VARIANT_NOT_STRING }
    }
    metadata[key] = v
  }

  return {
    stackup: {
      schema: STACKUP_SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      id: stackupId(name),
      name,
      layers,
      metadata,
    },
  }
}

export function parseStackupJson(textInput) {
  let parsed
  try {
    parsed = JSON.parse(textInput)
  } catch {
    return { error: SP_ERR_PARSE }
  }
  return validateStackup(parsed)
}

export function stackupToJson(stackup) {
  const check = validateStackup(stackup)
  if (check.error) return check
  const { id, ...envelope } = check.stackup
  return { json: JSON.stringify(envelope, null, 2) }
}

// --- Saklama ---

export function createStackupStore(storage) {
  if (!storage || typeof storage.read !== 'function') {
    throw new TypeError('createStackupStore: storage portu gerekli (read/write/remove).')
  }

  function readAll() {
    const raw = storage.read(STORAGE_KEY)
    if (!raw) return []
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
    if (!Array.isArray(parsed)) return []
    return parsed.map((s) => validateStackup(s).stackup).filter(Boolean)
  }

  function writeAll(list) {
    const w = storage.write(STORAGE_KEY, JSON.stringify(list))
    if (w.error) return { error: SP_ERR_STORAGE, cause: w.error }
    return { ok: true }
  }

  return {
    list() {
      return readAll()
    },

    get(id) {
      return readAll().find((s) => s.id === id) ?? null
    },

    save(stackup) {
      const check = validateStackup(stackup)
      if (check.error) return check
      const rest = readAll().filter((s) => s.id !== check.stackup.id)
      if (rest.length >= STACKUP_MAX) {
        return { error: SP_ERR_LIMIT, limit: STACKUP_MAX, stored: rest.length }
      }
      const w = writeAll([...rest, check.stackup])
      if (w.error) return w
      return { stackup: check.stackup }
    },

    // Yeniden adlandırma kimliği de değiştirir: kimlik addan türer, iki kaynak
    // tutulmaz. Eski kayıt silinir, yenisi yazılır.
    rename(id, nextName, updatedAt = '') {
      const current = readAll().find((s) => s.id === id)
      if (!current) return { error: SP_ERR_NOT_FOUND, id }
      const renamed = {
        ...current,
        name: nextName,
        metadata: { ...current.metadata, updatedAt },
      }
      const check = validateStackup(renamed)
      if (check.error) return check
      const rest = readAll().filter((s) => s.id !== id && s.id !== check.stackup.id)
      const w = writeAll([...rest, check.stackup])
      if (w.error) return w
      return { stackup: check.stackup }
    },

    remove(id) {
      return writeAll(readAll().filter((s) => s.id !== id))
    },

    clear() {
      return writeAll([])
    },
  }
}
