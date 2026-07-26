// Kullanıcı veri profilleri — içe aktarma, doğrulama, localStorage saklama.
//
// Lisanslı standart tabloları (akım/ısınma eğrileri, clearance/creepage
// tabloları, üretici limitleri) repoya girmez. Kullanıcı kendi profilini JSON
// olarak içe aktarır; profil yalnızca localStorage'da tutulur. Her ekran kendi
// içe aktarma kodunu yazmaz — hepsi buradan geçer.
//
// Profil yokken ekranlar çalışmaya devam eder; sonuç o zaman açık etiketiyle
// (ampirik / geometrik) sunulur ve hiçbir yerde standarda uygunluk iması olmaz.

export const PROFILE_SCHEMA = 'alp-pcb-profile'
export const SCHEMA_VERSION = 1

const STORAGE_KEY = 'alp-pcb.profiles.v1'

export const PROFILE_ERR_JSON = 'json'
export const PROFILE_ERR_SCHEMA = 'schema'
export const PROFILE_ERR_VERSION = 'version'
export const PROFILE_ERR_KIND = 'kind'
export const PROFILE_ERR_FIELD = 'field'
export const PROFILE_ERR_DATA = 'data'
export const PROFILE_ERR_STORAGE = 'storage'

// --- Profil türleri ---
//
// Her tür kendi `data` doğrulayıcısını taşır. Doğrulayıcı { ok: true } ya da
// { ok: false, message } döner. Şema sürümü değişirse eski profil sessizce
// yanlış okunmaz — SCHEMA_VERSION uyuşmazlığı hata olarak döner.

function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x)
}

function requireRows(data, fields, label) {
  if (!Array.isArray(data?.rows) || data.rows.length === 0) {
    return { ok: false, message: `${label}: "data.rows" boş olmayan bir dizi olmalı.` }
  }
  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i]
    if (typeof row !== 'object' || row === null) {
      return { ok: false, message: `${label}: satır ${i + 1} bir nesne değil.` }
    }
    for (const f of fields) {
      if (!isNum(row[f])) {
        return { ok: false, message: `${label}: satır ${i + 1} içinde sayısal "${f}" alanı yok.` }
      }
    }
  }
  return { ok: true }
}

export const PROFILE_KINDS = {
  // İletken kesit alanı ↔ akım ↔ sıcaklık artışı veri noktaları.
  // Trace ve via akım kapasitesi ekranları interpolasyon için bunu kullanır.
  'trace-current': {
    label: 'İletken akım/ısınma veri seti',
    describe: 'Kesit alanı, akım ve sıcaklık artışı veri noktaları',
    validate: (data) =>
      requireRows(data, ['areaMm2', 'currentA', 'tempRiseC'], 'trace-current'),
  },

  // Gerilim → minimum clearance/creepage mesafesi karar tablosu.
  clearance: {
    label: 'Clearance / creepage tablosu',
    describe: 'Gerilime göre minimum hava ve yüzey mesafeleri',
    validate: (data) =>
      requireRows(data, ['voltageV', 'clearanceMm', 'creepageMm'], 'clearance'),
  },

  // Üretici yetenek sınırları — hesabın alt sınırını belirler.
  fab: {
    label: 'Üretici yetenek profili',
    describe: 'Minimum yol/aralık, aspect ratio, kaplama, tolerans sınırları',
    validate: (data) => {
      if (typeof data !== 'object' || data === null) {
        return { ok: false, message: 'fab: "data" bir nesne olmalı.' }
      }
      const numeric = Object.entries(data).filter(([, v]) => v !== null && v !== undefined)
      if (numeric.length === 0) {
        return { ok: false, message: 'fab: en az bir sınır değeri gerekli.' }
      }
      for (const [k, v] of numeric) {
        if (!isNum(v)) return { ok: false, message: `fab: "${k}" sayısal olmalı.` }
      }
      return { ok: true }
    },
  },

  // Protokol empedans presetleri — yalnızca form alanlarını doldurur.
  protocol: {
    label: 'Protokol empedans presetleri',
    describe: 'Hedef empedans ve tolerans değerleri',
    validate: (data) =>
      requireRows(data, ['targetOhm', 'tolerancePct'], 'protocol'),
  },
}

export function profileKinds() {
  return Object.entries(PROFILE_KINDS).map(([kind, v]) => ({ kind, ...v }))
}

// --- Doğrulama ---

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function profileId(kind, name) {
  return `${kind}:${slug(name)}`
}

// Ham nesneyi doğrular. Döner: { profile } veya { error, message }
export function validateProfile(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { error: PROFILE_ERR_SCHEMA, message: 'Profil bir JSON nesnesi olmalı.' }
  }
  if (obj.schema !== PROFILE_SCHEMA) {
    return {
      error: PROFILE_ERR_SCHEMA,
      message: `"schema" alanı "${PROFILE_SCHEMA}" olmalı.`,
    }
  }
  if (obj.schemaVersion !== SCHEMA_VERSION) {
    return {
      error: PROFILE_ERR_VERSION,
      message: `Şema sürümü ${SCHEMA_VERSION} bekleniyor, dosyada ${obj.schemaVersion ?? '—'} var. Profil bu sürümle okunamaz.`,
    }
  }
  const kindDef = PROFILE_KINDS[obj.kind]
  if (!kindDef) {
    return {
      error: PROFILE_ERR_KIND,
      message: `Bilinmeyen profil türü "${obj.kind}". Geçerli türler: ${Object.keys(PROFILE_KINDS).join(', ')}.`,
    }
  }
  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    return { error: PROFILE_ERR_FIELD, message: '"name" alanı boş olamaz.' }
  }
  if (typeof obj.source !== 'string' || obj.source.trim() === '') {
    return {
      error: PROFILE_ERR_FIELD,
      message: '"source" alanı zorunlu — verinin hangi dokümandan/revizyondan geldiği kayıtlı olmalı.',
    }
  }

  const dataCheck = kindDef.validate(obj.data)
  if (!dataCheck.ok) return { error: PROFILE_ERR_DATA, message: dataCheck.message }

  return {
    profile: {
      schema: PROFILE_SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      kind: obj.kind,
      name: obj.name.trim(),
      source: obj.source.trim(),
      note: typeof obj.note === 'string' ? obj.note : '',
      data: obj.data,
      id: profileId(obj.kind, obj.name),
    },
  }
}

// JSON metninden doğrulanmış profil üretir.
export function parseProfile(text) {
  let obj
  try {
    obj = JSON.parse(text)
  } catch (e) {
    return { error: PROFILE_ERR_JSON, message: `JSON okunamadı: ${e.message}` }
  }
  return validateProfile(obj)
}

// --- Saklama ---
//
// Depolama bir bağımlılık olarak dışarıdan verilir (`lib/storage.js` sözleşmesi).
// Bu modül `localStorage`'ı hiç tanımaz; testte bellek içi depo geçilebilir.

export function createProfileStore(storage) {
  if (!storage || typeof storage.read !== 'function') {
    throw new TypeError('createProfileStore: storage portu gerekli (read/write/remove).')
  }

  function readAll() {
    const raw = storage.read(STORAGE_KEY)
    if (!raw) return []
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Bozuk kayıt uygulamayı düşürmez; profil yokmuş gibi davranılır
      return []
    }
    if (!Array.isArray(parsed)) return []
    // Depodan okunan kayıt da doğrulanır: şema sürümü değişmişse eski profil
    // sessizce yanlış okunmaz, hiç yüklenmez.
    return parsed.map((p) => validateProfile(p).profile).filter(Boolean)
  }

  function writeAll(list) {
    const w = storage.write(STORAGE_KEY, JSON.stringify(list))
    if (w.error) return { error: PROFILE_ERR_STORAGE, message: w.message }
    return { ok: true }
  }

  return {
    list(kind) {
      const all = readAll()
      return kind ? all.filter((p) => p.kind === kind) : all
    },

    get(id) {
      return readAll().find((p) => p.id === id) ?? null
    },

    // Aynı id'li profil varsa üzerine yazar.
    save(profile) {
      const check = validateProfile(profile)
      if (check.error) return check
      const next = readAll().filter((p) => p.id !== check.profile.id)
      next.push(check.profile)
      const w = writeAll(next)
      if (w.error) return w
      return { profile: check.profile }
    },

    remove(id) {
      return writeAll(readAll().filter((p) => p.id !== id))
    },

    clear() {
      return writeAll([])
    },
  }
}
