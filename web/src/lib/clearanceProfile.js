// Clearance / creepage karar profili — kullanıcının kendi kaynağından
// çıkarıp JSON olarak yüklediği tablo tabanlı karar verisi.
//
// LİSANSLI TABLO REPOYA GİRMEZ (CLAUDE.md §Kurallar). Bu dosya yalnızca
// zarfın **biçimini** tanımlar; içinde tek bir mesafe değeri, tek bir gerilim
// bandı yoktur. Veriyi kullanıcı sağlar, tarayıcı depolamasında tutulur ve
// kaynak koda hiç girmez. Profil yüklü değilken hiçbir sonuç tablo tabanlı
// doğrulanmış gibi sunulmaz.
//
// Modül saftır: React, DOM, localStorage ve kullanıcıya görünen metin bilmez.
// Depolama `lib/storage.js` portu olarak dışarıdan verilir.
//
// BİRİM SÖZLEŞMESİ — zarf mm ile yazılır (`minimumDistanceMm`), rakım metre,
// gerilim volt, CTI boyutsuzdur. Hesap motoru SI görür; dönüşümü
// `rulesToSI()` yapar ve yalnızca o noktada olur.
//
// SERBEST METİNLİ ALANLAR — kirlilik derecesi, izolasyon türü, kaplama durumu
// ve malzeme grubu birer **anahtar**tır, kaynak kodda sabit listesi yoktur.
// Kullanıcının profilinde hangi anahtarlar geçiyorsa ekran onları sunar.
// Böylece hiçbir sınıflandırma tablosu koda gömülmez.

import { LENGTH } from './units'

export const CLEARANCE_PROFILE_SCHEMA = 'alp-clearance-profile'
export const SCHEMA_VERSION = 1

const STORAGE_KEY = 'alp-pcb.clearance-profiles.v1'
const ACTIVE_KEY = 'alp-pcb.clearance-active.v1'

export const CLEAR_ERR_SCHEMA = 'schema'
export const CLEAR_ERR_VERSION = 'version'
export const CLEAR_ERR_NAME = 'name'
export const CLEAR_ERR_SOURCE = 'source'
export const CLEAR_ERR_RULES = 'rules'
export const CLEAR_ERR_RULE_FIELD = 'rule-field'
export const CLEAR_ERR_RANGE = 'range'
export const CLEAR_ERR_GROUPS = 'material-groups'
export const CLEAR_ERR_FACTORS = 'factors'
export const CLEAR_ERR_STORAGE = 'storage'
export const CLEAR_ERR_LIMIT = 'limit'
export const CLEAR_ERR_PARSE = 'parse'
export const CLEAR_ERR_NOT_FOUND = 'not-found'

export const CLEAR_VARIANT_NOT_OBJECT = 'not-object'
export const CLEAR_VARIANT_NOT_ARRAY = 'not-array'
export const CLEAR_VARIANT_SCHEMA_NAME = 'schema-name'
export const CLEAR_VARIANT_EMPTY = 'empty'
export const CLEAR_VARIANT_TOO_LONG = 'too-long'
export const CLEAR_VARIANT_NOT_NUMBER = 'not-number'
export const CLEAR_VARIANT_NEGATIVE = 'negative'
export const CLEAR_VARIANT_NOT_POSITIVE = 'not-positive'
export const CLEAR_VARIANT_NOT_STRING = 'not-string'
export const CLEAR_VARIANT_MIN_OVER_MAX = 'min-over-max'

export const NAME_MAX = 60
export const TEXT_MAX = 200
export const KEY_MAX = 60
export const RULE_MAX = 2000
export const PROFILE_MAX = 10

// Kural içindeki sayısal aralık çiftleri. Her çift isteğe bağlıdır; verilmeyen
// çift o kural için "her değer" anlamına gelir.
const CLEARANCE_RANGES = [
  ['minWorkingVoltage', 'maxWorkingVoltage'],
  ['minPeakVoltage', 'maxPeakVoltage'],
  ['minImpulseVoltage', 'maxImpulseVoltage'],
  ['minAltitudeM', 'maxAltitudeM'],
]

const CREEPAGE_RANGES = [
  ['minWorkingVoltage', 'maxWorkingVoltage'],
]

// Kural içindeki anahtar (serbest metin) alanları.
const CLEARANCE_KEYS = ['pollutionDegree', 'insulationType', 'coating']
const CREEPAGE_KEYS = ['pollutionDegree', 'insulationType', 'coating', 'materialGroup']

function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x)
}

function normalizeText(value, fallback = '') {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : fallback
}

export function normalizeName(name) {
  return normalizeText(name)
}

export function profileId(name) {
  return normalizeName(name).toLocaleLowerCase('tr')
}

// Anahtar alanları karşılaştırma öncesi normalleşir: baştaki/sondaki boşluk ve
// harf büyüklüğü farkı iki ayrı anahtar üretmesin.
export function normalizeKey(value) {
  const t = normalizeText(value, '')
  return t === '' ? null : t.toLocaleLowerCase('tr')
}

// Kural dizisindeki tek bir kuralı doğrular. Hata yükü **kullanıcının kendi
// metnini taşımaz**: yalnızca dizi adı, kural sırası ve alan anahtarı döner.
function validateRule(rule, index, listKey, ranges, keys) {
  if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
    return { error: CLEAR_ERR_RULES, list: listKey, index, variant: CLEAR_VARIANT_NOT_OBJECT }
  }

  const distance = rule.minimumDistanceMm
  if (!isNum(distance)) {
    return {
      error: CLEAR_ERR_RULE_FIELD,
      list: listKey,
      index,
      field: 'minimumDistanceMm',
      variant: CLEAR_VARIANT_NOT_NUMBER,
    }
  }
  if (distance < 0) {
    return {
      error: CLEAR_ERR_RULE_FIELD,
      list: listKey,
      index,
      field: 'minimumDistanceMm',
      variant: CLEAR_VARIANT_NEGATIVE,
    }
  }

  for (const [minKey, maxKey] of ranges) {
    for (const key of [minKey, maxKey]) {
      const v = rule[key]
      if (v === null || v === undefined) continue
      if (!isNum(v)) {
        return {
          error: CLEAR_ERR_RULE_FIELD, list: listKey, index, field: key,
          variant: CLEAR_VARIANT_NOT_NUMBER,
        }
      }
      if (v < 0) {
        return {
          error: CLEAR_ERR_RULE_FIELD, list: listKey, index, field: key,
          variant: CLEAR_VARIANT_NEGATIVE,
        }
      }
    }
    const lo = rule[minKey]
    const hi = rule[maxKey]
    if (isNum(lo) && isNum(hi) && lo > hi) {
      return {
        error: CLEAR_ERR_RANGE, list: listKey, index, low: minKey, high: maxKey,
        variant: CLEAR_VARIANT_MIN_OVER_MAX,
      }
    }
  }

  for (const key of keys) {
    const v = rule[key]
    if (v === null || v === undefined) continue
    if (typeof v !== 'string') {
      return {
        error: CLEAR_ERR_RULE_FIELD, list: listKey, index, field: key,
        variant: CLEAR_VARIANT_NOT_STRING,
      }
    }
    if (v.length > KEY_MAX) {
      return {
        error: CLEAR_ERR_RULE_FIELD, list: listKey, index, field: key,
        variant: CLEAR_VARIANT_TOO_LONG, max: KEY_MAX,
      }
    }
  }

  const normalized = { minimumDistanceMm: distance }
  for (const [minKey, maxKey] of ranges) {
    normalized[minKey] = isNum(rule[minKey]) ? rule[minKey] : null
    normalized[maxKey] = isNum(rule[maxKey]) ? rule[maxKey] : null
  }
  for (const key of keys) {
    normalized[key] = normalizeKey(rule[key])
  }
  return { rule: normalized }
}

function validateRuleList(list, listKey, ranges, keys) {
  if (list === null || list === undefined) return { rules: [] }
  if (!Array.isArray(list)) {
    return { error: CLEAR_ERR_RULES, list: listKey, variant: CLEAR_VARIANT_NOT_ARRAY }
  }
  if (list.length > RULE_MAX) {
    return {
      error: CLEAR_ERR_RULES, list: listKey, variant: CLEAR_VARIANT_TOO_LONG,
      max: RULE_MAX, length: list.length,
    }
  }
  const rules = []
  for (let i = 0; i < list.length; i += 1) {
    const r = validateRule(list[i], i, listKey, ranges, keys)
    if (r.error) return r
    rules.push(r.rule)
  }
  return { rules }
}

// Rakım (ya da creepage) düzeltme bantları.
function validateFactorList(list, listKey) {
  if (list === null || list === undefined) return { factors: [] }
  if (!Array.isArray(list)) {
    return { error: CLEAR_ERR_FACTORS, list: listKey, variant: CLEAR_VARIANT_NOT_ARRAY }
  }
  const factors = []
  for (let i = 0; i < list.length; i += 1) {
    const f = list[i]
    if (typeof f !== 'object' || f === null || Array.isArray(f)) {
      return { error: CLEAR_ERR_FACTORS, list: listKey, index: i, variant: CLEAR_VARIANT_NOT_OBJECT }
    }
    for (const key of ['minAltitudeM', 'maxAltitudeM']) {
      const v = f[key]
      if (v === null || v === undefined) continue
      if (!isNum(v)) {
        return {
          error: CLEAR_ERR_FACTORS, list: listKey, index: i, field: key,
          variant: CLEAR_VARIANT_NOT_NUMBER,
        }
      }
      if (v < 0) {
        return {
          error: CLEAR_ERR_FACTORS, list: listKey, index: i, field: key,
          variant: CLEAR_VARIANT_NEGATIVE,
        }
      }
    }
    if (isNum(f.minAltitudeM) && isNum(f.maxAltitudeM) && f.minAltitudeM > f.maxAltitudeM) {
      return {
        error: CLEAR_ERR_FACTORS, list: listKey, index: i,
        low: 'minAltitudeM', high: 'maxAltitudeM', variant: CLEAR_VARIANT_MIN_OVER_MAX,
      }
    }
    // Düzeltme katsayısı sıfır ya da negatif olamaz: mesafeyi yok eder.
    if (!isNum(f.factor) || !(f.factor > 0)) {
      return {
        error: CLEAR_ERR_FACTORS, list: listKey, index: i, field: 'factor',
        variant: isNum(f.factor) ? CLEAR_VARIANT_NOT_POSITIVE : CLEAR_VARIANT_NOT_NUMBER,
      }
    }
    factors.push({
      minAltitudeM: isNum(f.minAltitudeM) ? f.minAltitudeM : null,
      maxAltitudeM: isNum(f.maxAltitudeM) ? f.maxAltitudeM : null,
      factor: f.factor,
    })
  }
  return { factors }
}

// CTI bantlarından malzeme grubu. Bantlar da profildedir; kaynak kodda
// sabit sınır yoktur.
function validateMaterialGroups(list) {
  if (list === null || list === undefined) return { groups: [] }
  if (!Array.isArray(list)) {
    return { error: CLEAR_ERR_GROUPS, variant: CLEAR_VARIANT_NOT_ARRAY }
  }
  const groups = []
  for (let i = 0; i < list.length; i += 1) {
    const g = list[i]
    if (typeof g !== 'object' || g === null || Array.isArray(g)) {
      return { error: CLEAR_ERR_GROUPS, index: i, variant: CLEAR_VARIANT_NOT_OBJECT }
    }
    const id = normalizeKey(g.id)
    if (id === null) {
      return { error: CLEAR_ERR_GROUPS, index: i, field: 'id', variant: CLEAR_VARIANT_EMPTY }
    }
    for (const key of ['minCti', 'maxCti']) {
      const v = g[key]
      if (v === null || v === undefined) continue
      if (!isNum(v)) {
        return { error: CLEAR_ERR_GROUPS, index: i, field: key, variant: CLEAR_VARIANT_NOT_NUMBER }
      }
      if (v < 0) {
        return { error: CLEAR_ERR_GROUPS, index: i, field: key, variant: CLEAR_VARIANT_NEGATIVE }
      }
    }
    if (isNum(g.minCti) && isNum(g.maxCti) && g.minCti > g.maxCti) {
      return {
        error: CLEAR_ERR_GROUPS, index: i, low: 'minCti', high: 'maxCti',
        variant: CLEAR_VARIANT_MIN_OVER_MAX,
      }
    }
    groups.push({
      id,
      minCti: isNum(g.minCti) ? g.minCti : null,
      maxCti: isNum(g.maxCti) ? g.maxCti : null,
    })
  }
  return { groups }
}

/**
 * Ham nesneyi doğrular. Döner: { profile } veya { error, ...ayrıntı }
 *
 * Hata yükü kullanıcının profil metnini taşımaz — yalnızca dizi adı, kural
 * sırası, alan anahtarı ve sayısal sınır döner.
 */
export function validateClearanceProfile(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { error: CLEAR_ERR_SCHEMA, variant: CLEAR_VARIANT_NOT_OBJECT }
  }
  if (obj.schema !== CLEARANCE_PROFILE_SCHEMA) {
    return {
      error: CLEAR_ERR_SCHEMA,
      variant: CLEAR_VARIANT_SCHEMA_NAME,
      expected: CLEARANCE_PROFILE_SCHEMA,
    }
  }
  if (obj.schemaVersion !== SCHEMA_VERSION) {
    return { error: CLEAR_ERR_VERSION, expected: SCHEMA_VERSION, found: obj.schemaVersion }
  }

  const name = normalizeName(obj.name)
  if (name === '') return { error: CLEAR_ERR_NAME, variant: CLEAR_VARIANT_EMPTY }
  if (name.length > NAME_MAX) {
    return { error: CLEAR_ERR_NAME, variant: CLEAR_VARIANT_TOO_LONG, max: NAME_MAX }
  }

  // Kaynak künyesi: hangi belgeden çıkarıldığı kullanıcının kendi notudur.
  // İçeriği kopyalanmaz, yalnızca adı/revizyonu taşınır ve sonuçta gösterilir.
  const rawSource = obj.source ?? {}
  if (typeof rawSource !== 'object' || rawSource === null || Array.isArray(rawSource)) {
    return { error: CLEAR_ERR_SOURCE, variant: CLEAR_VARIANT_NOT_OBJECT }
  }
  const source = {}
  for (const key of ['title', 'revision', 'note']) {
    const v = rawSource[key]
    if (v === null || v === undefined) {
      source[key] = ''
      continue
    }
    if (typeof v !== 'string') {
      return { error: CLEAR_ERR_SOURCE, field: key, variant: CLEAR_VARIANT_NOT_STRING }
    }
    if (v.length > TEXT_MAX) {
      return { error: CLEAR_ERR_SOURCE, field: key, variant: CLEAR_VARIANT_TOO_LONG, max: TEXT_MAX }
    }
    source[key] = normalizeText(v)
  }

  const clearance = validateRuleList(
    obj.clearanceRules, 'clearanceRules', CLEARANCE_RANGES, CLEARANCE_KEYS,
  )
  if (clearance.error) return clearance
  const creepage = validateRuleList(
    obj.creepageRules, 'creepageRules', CREEPAGE_RANGES, CREEPAGE_KEYS,
  )
  if (creepage.error) return creepage

  // Boş bir profil kabul edilmez: hiçbir kuralı olmayan profil yüklendiğinde
  // ekran "profil var" der ama hiçbir karar veremez.
  if (clearance.rules.length === 0 && creepage.rules.length === 0) {
    return { error: CLEAR_ERR_RULES, variant: CLEAR_VARIANT_EMPTY }
  }

  const altitude = validateFactorList(obj.altitudeFactors, 'altitudeFactors')
  if (altitude.error) return altitude
  const creepageFactors = validateFactorList(obj.creepageFactors, 'creepageFactors')
  if (creepageFactors.error) return creepageFactors

  const groups = validateMaterialGroups(obj.materialGroups)
  if (groups.error) return groups

  return {
    profile: {
      schema: CLEARANCE_PROFILE_SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      id: profileId(name),
      name,
      source,
      materialGroups: groups.groups,
      clearanceRules: clearance.rules,
      creepageRules: creepage.rules,
      altitudeFactors: altitude.factors,
      creepageFactors: creepageFactors.factors,
    },
  }
}

/**
 * Profildeki mesafeleri SI'ye (m) çevirir. Gerilim, rakım ve CTI zaten SI ya
 * da boyutsuzdur; dokunulmaz.
 */
export function rulesToSI(rules) {
  return (rules ?? []).map((r) => ({
    ...r,
    minimumDistance: r.minimumDistanceMm * LENGTH.mm,
  }))
}

/** Profilde geçen anahtarların kümesi — ekran seçicilerini bununla kurar. */
export function profileKeyOptions(profile, listKey, field) {
  const rules = profile?.[listKey] ?? []
  const seen = new Set()
  for (const r of rules) {
    if (r[field] !== null && r[field] !== undefined) seen.add(r[field])
  }
  return [...seen].sort()
}

export function parseClearanceProfileJson(textInput) {
  let parsed
  try {
    parsed = JSON.parse(textInput)
  } catch {
    return { error: CLEAR_ERR_PARSE }
  }
  return validateClearanceProfile(parsed)
}

export function clearanceProfileToJson(profile) {
  const check = validateClearanceProfile(profile)
  if (check.error) return check
  const { id, ...envelope } = check.profile
  return { json: JSON.stringify(envelope, null, 2) }
}

// --- Saklama ---

export function createClearanceProfileStore(storage) {
  if (!storage || typeof storage.read !== 'function') {
    throw new TypeError('createClearanceProfileStore: storage portu gerekli (read/write/remove).')
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
    return parsed.map((p) => validateClearanceProfile(p).profile).filter(Boolean)
  }

  function writeAll(list) {
    const w = storage.write(STORAGE_KEY, JSON.stringify(list))
    if (w.error) return { error: CLEAR_ERR_STORAGE, cause: w.error }
    return { ok: true }
  }

  return {
    list() {
      return readAll()
    },

    get(id) {
      return readAll().find((p) => p.id === id) ?? null
    },

    save(profile) {
      const check = validateClearanceProfile(profile)
      if (check.error) return check
      const rest = readAll().filter((p) => p.id !== check.profile.id)
      if (rest.length >= PROFILE_MAX) {
        return { error: CLEAR_ERR_LIMIT, limit: PROFILE_MAX, stored: rest.length }
      }
      const w = writeAll([...rest, check.profile])
      if (w.error) return w
      return { profile: check.profile }
    },

    remove(id) {
      const w = writeAll(readAll().filter((p) => p.id !== id))
      if (w.error) return w
      if (storage.read(ACTIVE_KEY) === id) {
        const r = storage.remove(ACTIVE_KEY)
        if (r.error) return { error: CLEAR_ERR_STORAGE, cause: r.error }
      }
      return { ok: true }
    },

    activeId() {
      const id = storage.read(ACTIVE_KEY)
      if (!id) return null
      return readAll().some((p) => p.id === id) ? id : null
    },

    active() {
      const id = this.activeId()
      return id ? this.get(id) : null
    },

    setActive(id) {
      if (id === null) {
        const r = storage.remove(ACTIVE_KEY)
        if (r.error) return { error: CLEAR_ERR_STORAGE, cause: r.error }
        return { ok: true }
      }
      if (!readAll().some((p) => p.id === id)) {
        return { error: CLEAR_ERR_NOT_FOUND, field: 'id' }
      }
      const w = storage.write(ACTIVE_KEY, id)
      if (w.error) return { error: CLEAR_ERR_STORAGE, cause: w.error }
      return { ok: true }
    },

    clear() {
      const w = writeAll([])
      if (w.error) return w
      const r = storage.remove(ACTIVE_KEY)
      if (r.error) return { error: CLEAR_ERR_STORAGE, cause: r.error }
      return { ok: true }
    },
  }
}
