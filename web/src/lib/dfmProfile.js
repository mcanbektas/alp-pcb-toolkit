// Üretici yetenek profili — kullanıcının kendi üreticisinden aldığı ve JSON
// olarak içe aktardığı üretim sınırları. Dört üretim/DFM aracı (clearance,
// padstack, BGA breakout, stack-up, thermal relief) ortak bu profili okur;
// her araç kendi sınır alanlarını ayrı ayrı sormaz.
//
// Modül saftır: React, DOM ve localStorage bilmez. Depolama `lib/storage.js`
// sözleşmesini uygulayan bir port olarak dışarıdan verilir; testte bellek içi
// depo geçilir. `thicknessRecords.js` ile aynı desen: şema adı + `schemaVersion`,
// doğrulama, sonra port üstünde okuma/yazma/silme.
//
// BİRİM SÖZLEŞMESİ — zarf SI değil, üreticinin yeteneklerini yazdığı birimi
// saklar. `units` alanı bu sürümde yalnızca 'mm' olabilir ve uzunluk türündeki
// bütün sınırlar mm cinsindendir. Hesap motorları SI ile çalışır; dönüşümü
// `limitsToSI()` yapar ve **yalnızca o noktada** olur. Zarfın kendisinde hiçbir
// yuvarlama ya da ölçekleme yoktur.
//
// Oransız/boyutsuz alanlar (aspect ratio, katman sayısı, yüzde, yetenek
// bayrakları) dönüşüme girmez.
//
// Depoya gerçek bir üreticinin adıyla hazır profil konmaz: burada tanımlı olan
// yalnızca alan kümesidir, veri değil. Sınır girilmemişse (`null`) o kontrol
// değerlendirilmez — varsayılan bir "güvenli" değer uydurulmaz.

import { LENGTH } from './units'

export const DFM_SCHEMA = 'alp-dfm-profile'
export const SCHEMA_VERSION = 1

const STORAGE_KEY = 'alp-pcb.dfm-profiles.v1'
const ACTIVE_KEY = 'alp-pcb.dfm-active.v1'

// Bu sürümde tek geçerli zarf birimi. Alan başına birim taşınmaz: profil tek
// bir birim sisteminde yazılır, karışık zarf okunmaz.
export const PROFILE_UNIT = 'mm'
export const PROFILE_UNITS = [PROFILE_UNIT]

export const DFM_ERR_SCHEMA = 'schema'
export const DFM_ERR_VERSION = 'version'
export const DFM_ERR_NAME = 'name'
export const DFM_ERR_NOTES = 'notes'
export const DFM_ERR_UNITS = 'units'
export const DFM_ERR_LIMITS = 'limits'
export const DFM_ERR_FIELD = 'field'
export const DFM_ERR_UNKNOWN_FIELD = 'unknown-field'
export const DFM_ERR_ORDER = 'order'
export const DFM_ERR_STORAGE = 'storage'
export const DFM_ERR_LIMIT = 'limit'
export const DFM_ERR_PARSE = 'parse'
export const DFM_ERR_NOT_FOUND = 'not-found'

// Aynı hata kodunun birden çok durumu varsa ayrıntıdaki `variant` alanı ayırır
// (thicknessRecords.js / codes.js ile aynı desen). Hata yükü dilsizdir.
export const DFM_VARIANT_NOT_OBJECT = 'not-object'
export const DFM_VARIANT_SCHEMA_NAME = 'schema-name'
export const DFM_VARIANT_EMPTY = 'empty'
export const DFM_VARIANT_TOO_LONG = 'too-long'
export const DFM_VARIANT_NOT_NUMBER = 'not-number'
export const DFM_VARIANT_POSITIVE = 'positive'
export const DFM_VARIANT_NON_NEGATIVE = 'non-negative'
export const DFM_VARIANT_NOT_INTEGER = 'not-integer'
export const DFM_VARIANT_NOT_BOOLEAN = 'not-boolean'
export const DFM_VARIANT_PERCENT_RANGE = 'percent-range'

// --- Sınır alanı türleri ---
//
// `length`  → zarf biriminde (mm) uzunluk; `limitsToSI()` metreye çevirir
// `ratio`   → boyutsuz oran (aspect ratio)
// `percent` → yüzde, 0–100
// `count`   → pozitif tam sayı (katman sayısı)
// `flag`    → üretici yeteneği; true/false/null. `null` "bilinmiyor" demektir
//             ve kontrol `unknown` döner — false ile aynı şey değildir.
export const LIMIT_KIND_LENGTH = 'length'
export const LIMIT_KIND_RATIO = 'ratio'
export const LIMIT_KIND_PERCENT = 'percent'
export const LIMIT_KIND_COUNT = 'count'
export const LIMIT_KIND_FLAG = 'flag'

// `positive`: sıfır kabul edilmez (bir minimum genişlik sıfır olamaz)
// `signed`:   negatif değer anlamlıdır ve kabul edilir
//
// solder mask expansion tek `signed` alandır: mask açıklığı pad'den küçük
// tanımlanabilir (mask ile tanımlı pad), bu durumda genişleme negatiftir.
export const LIMIT_SPECS = [
  // İletken geometrisi
  { key: 'minTraceWidth', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'minTraceSpace', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'minCopperClearance', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'minCopperToEdge', kind: LIMIT_KIND_LENGTH, positive: true },

  // Delik
  { key: 'minMechanicalDrill', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'minLaserDrill', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'minFinishedHole', kind: LIMIT_KIND_LENGTH, positive: true },

  // Toleranslar — sıfır geçerlidir (tolerans tanımlanmamış değil, sıfır demek)
  { key: 'drillTolerancePlus', kind: LIMIT_KIND_LENGTH },
  { key: 'drillToleranceMinus', kind: LIMIT_KIND_LENGTH },
  { key: 'registrationTolerance', kind: LIMIT_KIND_LENGTH },
  // Pad çapı toleransı artı/eksi ayrıdır: matkap toleransında ayrı tutulan
  // yön, pad'de tek alana sıkıştırılırsa worst-case annular ring yanlış
  // hesaplanır (worst-case yalnızca eksi yönü kullanır).
  { key: 'padDiameterTolerancePlus', kind: LIMIT_KIND_LENGTH },
  { key: 'padDiameterToleranceMinus', kind: LIMIT_KIND_LENGTH },

  // Ring ve aspect ratio
  { key: 'minAnnularRing', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'maxPthAspectRatio', kind: LIMIT_KIND_RATIO, positive: true },
  { key: 'maxMicroviaAspectRatio', kind: LIMIT_KIND_RATIO, positive: true },

  // Düzlem ve maske
  { key: 'minPlaneClearance', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'solderMaskExpansion', kind: LIMIT_KIND_LENGTH, signed: true },
  { key: 'minSolderMaskWeb', kind: LIMIT_KIND_LENGTH, positive: true },

  // BGA alanı — üretici bu bölge için ayrı (daha sıkı) sınır verebilir
  { key: 'minBgaTraceWidth', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'minBgaTraceClearance', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'minBgaViaPadDiameter', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'minBgaDrillDiameter', kind: LIMIT_KIND_LENGTH, positive: true },

  // Thermal relief
  { key: 'minThermalSpokeWidth', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'minThermalGap', kind: LIMIT_KIND_LENGTH, positive: true },

  // Kart — stack-up kontrolleri bu üçü olmadan karar veremez
  { key: 'minBoardThickness', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'maxBoardThickness', kind: LIMIT_KIND_LENGTH, positive: true },
  { key: 'boardThicknessTolerancePercent', kind: LIMIT_KIND_PERCENT },
  { key: 'minLayerCount', kind: LIMIT_KIND_COUNT, positive: true },
  { key: 'maxLayerCount', kind: LIMIT_KIND_COUNT, positive: true },

  // Yetenek bayrakları — via tipi seçimi bunlar olmadan değerlendirilemez
  { key: 'viaInPadSupported', kind: LIMIT_KIND_FLAG },
  { key: 'blindViaSupported', kind: LIMIT_KIND_FLAG },
  { key: 'buriedViaSupported', kind: LIMIT_KIND_FLAG },
  { key: 'microviaSupported', kind: LIMIT_KIND_FLAG },
]

export const LIMIT_KEYS = LIMIT_SPECS.map((s) => s.key)
const SPEC_BY_KEY = Object.fromEntries(LIMIT_SPECS.map((s) => [s.key, s]))

// Küçük olanı büyüğünden sonra gelmemeli. Zarf içinde tutarsız bir çift
// sessizce kabul edilirse stack-up kontrolü hiçbir zaman geçemez.
const ORDERED_PAIRS = [
  ['minBoardThickness', 'maxBoardThickness'],
  ['minLayerCount', 'maxLayerCount'],
]

export const NAME_MAX = 60
export const NOTES_MAX = 500
export const PROFILE_MAX = 25

function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x)
}

export function normalizeName(name) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
}

export function profileId(name) {
  return normalizeName(name).toLocaleLowerCase('tr')
}

// Boş profil iskeleti — bütün sınırlar `null`. Ekran yeni profil açarken
// kullanır; "varsayılan üretici" değildir, hiçbir sayı taşımaz.
export function emptyLimits() {
  return Object.fromEntries(LIMIT_KEYS.map((key) => [key, null]))
}

export function emptyProfile(name = '') {
  return {
    schema: DFM_SCHEMA,
    schemaVersion: SCHEMA_VERSION,
    id: profileId(name),
    name: normalizeName(name),
    notes: '',
    units: PROFILE_UNIT,
    limits: emptyLimits(),
  }
}

// Tek bir sınır alanını doğrular. Döner: null (sorun yok) veya hata nesnesi.
function validateLimit(key, value) {
  const spec = SPEC_BY_KEY[key]
  // Tanınmayan alan sessizce atılmaz: kullanıcı yanlış anahtarla yazdığı
  // sınırın uygulandığını sanmasın.
  if (!spec) return { error: DFM_ERR_UNKNOWN_FIELD, field: key, valid: LIMIT_KEYS }
  // null / eksik = "bu sınır tanımlı değil". Kontrol dışı bırakılır.
  if (value === null || value === undefined) return null

  if (spec.kind === LIMIT_KIND_FLAG) {
    if (typeof value !== 'boolean') {
      return { error: DFM_ERR_FIELD, field: key, variant: DFM_VARIANT_NOT_BOOLEAN }
    }
    return null
  }

  if (!isNum(value)) {
    return { error: DFM_ERR_FIELD, field: key, variant: DFM_VARIANT_NOT_NUMBER }
  }

  if (spec.kind === LIMIT_KIND_COUNT && !Number.isInteger(value)) {
    return { error: DFM_ERR_FIELD, field: key, variant: DFM_VARIANT_NOT_INTEGER }
  }

  if (spec.kind === LIMIT_KIND_PERCENT && (value < 0 || value > 100)) {
    return {
      error: DFM_ERR_FIELD, field: key, variant: DFM_VARIANT_PERCENT_RANGE, min: 0, max: 100,
    }
  }

  if (!spec.signed) {
    if (spec.positive && !(value > 0)) {
      return { error: DFM_ERR_FIELD, field: key, variant: DFM_VARIANT_POSITIVE }
    }
    if (!spec.positive && value < 0) {
      return { error: DFM_ERR_FIELD, field: key, variant: DFM_VARIANT_NON_NEGATIVE }
    }
  }

  return null
}

/**
 * Ham nesneyi doğrular. Döner: { profile } veya { error, ...ayrıntı }
 *
 * Ayrıntı alanları dilsizdir: kod, sayı, alan anahtarı taşırlar; cümle
 * taşımazlar. Cümleyi ekranın text.js dosyası kurar.
 *
 * Şema adı ya da sürümü uyuşmazsa zarf **hiç okunmaz**. Eski bir profil yeni
 * alan anlamlarıyla yorumlanırsa kullanıcı yanlış üretim sınırıyla karar verir.
 */
export function validateProfile(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { error: DFM_ERR_SCHEMA, variant: DFM_VARIANT_NOT_OBJECT }
  }
  if (obj.schema !== DFM_SCHEMA) {
    return {
      error: DFM_ERR_SCHEMA,
      variant: DFM_VARIANT_SCHEMA_NAME,
      expected: DFM_SCHEMA,
      found: typeof obj.schema === 'string' ? obj.schema : null,
    }
  }
  if (obj.schemaVersion !== SCHEMA_VERSION) {
    return { error: DFM_ERR_VERSION, expected: SCHEMA_VERSION, found: obj.schemaVersion }
  }

  const name = normalizeName(obj.name)
  if (name === '') return { error: DFM_ERR_NAME, variant: DFM_VARIANT_EMPTY }
  if (name.length > NAME_MAX) {
    return { error: DFM_ERR_NAME, variant: DFM_VARIANT_TOO_LONG, max: NAME_MAX, length: name.length }
  }

  const notes = obj.notes === undefined || obj.notes === null ? '' : obj.notes
  if (typeof notes !== 'string') {
    return { error: DFM_ERR_NOTES, variant: DFM_VARIANT_NOT_OBJECT }
  }
  if (notes.length > NOTES_MAX) {
    return {
      error: DFM_ERR_NOTES, variant: DFM_VARIANT_TOO_LONG, max: NOTES_MAX, length: notes.length,
    }
  }

  if (!PROFILE_UNITS.includes(obj.units)) {
    return {
      error: DFM_ERR_UNITS,
      found: typeof obj.units === 'string' ? obj.units : null,
      valid: PROFILE_UNITS,
    }
  }

  const raw = obj.limits
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { error: DFM_ERR_LIMITS, variant: DFM_VARIANT_NOT_OBJECT }
  }

  const limits = emptyLimits()
  for (const [key, value] of Object.entries(raw)) {
    const bad = validateLimit(key, value)
    if (bad) return bad
    if (value !== null && value !== undefined) limits[key] = value
  }

  for (const [lowKey, highKey] of ORDERED_PAIRS) {
    const low = limits[lowKey]
    const high = limits[highKey]
    if (low !== null && high !== null && low > high) {
      return { error: DFM_ERR_ORDER, low: lowKey, high: highKey, lowValue: low, highValue: high }
    }
  }

  return {
    profile: {
      schema: DFM_SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      id: profileId(name),
      name,
      notes,
      units: obj.units,
      limits,
    },
  }
}

/**
 * Zarf birimindeki (mm) uzunluk sınırlarını SI'ye (m) çevirir. Oran, yüzde,
 * sayı ve bayrak alanları aynen geçer.
 *
 * Hesap motorları yalnızca bu çıktıyı görür; zarf birimini hiç tanımazlar.
 * Tanımsız (`null`) sınır `null` kalır — sıfıra dönüşmez, çünkü "sınır yok"
 * ile "sınır sıfır" aynı şey değildir.
 */
export function limitsToSI(limits) {
  const src = limits ?? {}
  const out = {}
  for (const spec of LIMIT_SPECS) {
    const value = src[spec.key]
    if (value === null || value === undefined) {
      out[spec.key] = null
      continue
    }
    out[spec.key] = spec.kind === LIMIT_KIND_LENGTH ? value * LENGTH[PROFILE_UNIT] : value
  }
  return out
}

// Profil yoksa da hesaplar çalışır: bütün sınırlar `null` olan bir küme döner
// ve profile bağlı kontroller `unknown` olur. Sessiz bir varsayılan üretmez.
export function noProfileLimits() {
  return limitsToSI(emptyLimits())
}

/**
 * İçe aktarma: JSON metnini ayrıştırıp doğrular.
 *
 * Ayrıştırma hatası tarayıcı istisnasının metnini taşımaz — o metin dile
 * bağlıdır ve hata yüküne giremez (CLAUDE.md §Mimari-1).
 */
export function parseProfileJson(textInput) {
  let parsed
  try {
    parsed = JSON.parse(textInput)
  } catch {
    return { error: DFM_ERR_PARSE }
  }
  return validateProfile(parsed)
}

/**
 * Dışa aktarma: doğrulanmış profilden okunabilir JSON metni üretir.
 * `id` zarfa yazılmaz — kimlik addan türetilir, iki kaynak tutulmaz.
 */
export function profileToJson(profile) {
  const check = validateProfile(profile)
  if (check.error) return check
  const { id, ...envelope } = check.profile
  return { json: JSON.stringify(envelope, null, 2) }
}

// --- Saklama ---
//
// Depolama bir bağımlılık olarak dışarıdan verilir (`lib/storage.js` sözleşmesi).
// Bu modül `localStorage`'ı hiç tanımaz; testte bellek içi depo geçilebilir.

export function createDfmProfileStore(storage) {
  if (!storage || typeof storage.read !== 'function') {
    throw new TypeError('createDfmProfileStore: storage portu gerekli (read/write/remove).')
  }

  function readAll() {
    const raw = storage.read(STORAGE_KEY)
    if (!raw) return []
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Bozuk kayıt uygulamayı düşürmez; kayıt yokmuş gibi davranılır
      return []
    }
    if (!Array.isArray(parsed)) return []
    // Depodan okunan profil de doğrulanır: şema sürümü değişmişse eski zarf
    // sessizce yanlış okunmaz, hiç yüklenmez.
    return parsed.map((p) => validateProfile(p).profile).filter(Boolean)
  }

  function writeAll(list) {
    const w = storage.write(STORAGE_KEY, JSON.stringify(list))
    if (w.error) return { error: DFM_ERR_STORAGE, cause: w.error }
    return { ok: true }
  }

  return {
    list() {
      return readAll()
    },

    get(id) {
      return readAll().find((p) => p.id === id) ?? null
    },

    // Aynı adlı profil varsa üzerine yazar. Sınır aşılıyorsa açık hata döner;
    // sessizce en eskiyi atmaz.
    save(profile) {
      const check = validateProfile(profile)
      if (check.error) return check

      const rest = readAll().filter((p) => p.id !== check.profile.id)
      if (rest.length >= PROFILE_MAX) {
        return { error: DFM_ERR_LIMIT, limit: PROFILE_MAX, stored: rest.length }
      }

      const w = writeAll([...rest, check.profile])
      if (w.error) return w
      return { profile: check.profile }
    },

    remove(id) {
      const w = writeAll(readAll().filter((p) => p.id !== id))
      if (w.error) return w
      // Silinen profil aktifse aktiflik de düşer; ekran var olmayan bir
      // profili seçili göstermez.
      if (storage.read(ACTIVE_KEY) === id) {
        const r = storage.remove(ACTIVE_KEY)
        if (r.error) return { error: DFM_ERR_STORAGE, cause: r.error }
      }
      return { ok: true }
    },

    // Aktif profil kimliği. Kayıtlı kimlik listede yoksa null döner — silinmiş
    // bir profil aktif görünmez.
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
        if (r.error) return { error: DFM_ERR_STORAGE, cause: r.error }
        return { ok: true }
      }
      if (!readAll().some((p) => p.id === id)) {
        return { error: DFM_ERR_FIELD, field: 'id', variant: DFM_VARIANT_EMPTY }
      }
      const w = storage.write(ACTIVE_KEY, id)
      if (w.error) return { error: DFM_ERR_STORAGE, cause: w.error }
      return { ok: true }
    },

    clear() {
      const w = writeAll([])
      if (w.error) return w
      const r = storage.remove(ACTIVE_KEY)
      if (r.error) return { error: DFM_ERR_STORAGE, cause: r.error }
      return { ok: true }
    },
  }
}
