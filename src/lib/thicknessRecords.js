// Kalınlık kayıtları — kullanıcının adlandırıp sakladığı kalınlık kümeleri
// (spec §4.3: "Kullanıcı hem nominal hem bitmiş kalınlık saklayabilmelidir").
//
// Modül saftır: React, DOM ve localStorage bilmez. Depolama `lib/storage.js`
// sözleşmesini uygulayan bir port olarak dışarıdan verilir; testte bellek içi
// depo geçilir. `dataProfiles.js` ile aynı desen: şema adı + `schemaVersion`,
// doğrulama, sonra port üstünde okuma/yazma/silme.
//
// BİRİM SÖZLEŞMESİ — kayıt zarfı SI değil, ekranda okunan birimleri saklar:
//   value  → kaynak "weight" ise oz/ft², diğer kaynaklarda µm
//   plating / starting / finished → µm
// Kayıt geri yüklendiğinde doğrudan form alanına yazılır; bu yüzden zarf
// kanonik olarak µm tutar ve geri yüklerken birim seçicileri µm'ye ayarlanır.
// Burada hiçbir yuvarlama yoktur, yalnızca birim seçimi sabittir.

export const THICKNESS_SCHEMA = 'alp-pcb-thickness'
export const SCHEMA_VERSION = 1

const STORAGE_KEY = 'alp-pcb.thickness.v1'

export const THICKNESS_ERR_SCHEMA = 'schema'
export const THICKNESS_ERR_VERSION = 'version'
export const THICKNESS_ERR_NAME = 'name'
export const THICKNESS_ERR_SOURCE = 'source'
export const THICKNESS_ERR_LAYER = 'layer'
export const THICKNESS_ERR_UNIT = 'unit'
export const THICKNESS_ERR_FIELD = 'field'
export const THICKNESS_ERR_CONSISTENCY = 'consistency'
export const THICKNESS_ERR_STORAGE = 'storage'
export const THICKNESS_ERR_LIMIT = 'limit'

// Kaydın geldiği yol. Değerler ekrandaki kaynak seçicisinin anahtarlarıyla
// birebir aynıdır (CopperConverter/model.js: SOURCE_WEIGHT / SOURCE_THICKNESS /
// SOURCE_FINISHED); şemanın kendi alan kümesi olduğu için burada tanımlıdır.
export const RECORD_SOURCE_WEIGHT = 'weight'
export const RECORD_SOURCE_THICKNESS = 'thickness'
export const RECORD_SOURCE_FINISHED = 'finished'
export const RECORD_SOURCES = [
  RECORD_SOURCE_WEIGHT, RECORD_SOURCE_THICKNESS, RECORD_SOURCE_FINISHED,
]

export const RECORD_LAYERS = ['external', 'internal']

// `value` alanının birimi. Mikro işareti tek kod noktasıdır (U+00B5).
export const RECORD_UNIT_WEIGHT = 'oz/ft²'
export const RECORD_UNIT_LENGTH = 'µm'

// Ad uzunluğu ve kayıt sayısı sınırlıdır: depolama kotası dolduğunda yazma
// baştan reddedilsin, kullanıcı sessizce kayıp yaşamasın.
export const NAME_MAX = 60
export const RECORD_MAX = 50

function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x)
}

// Ada göre kimlik. Aynı ad = aynı kayıt: ikinci kayıt üzerine yazar, çoğaltmaz.
// Kimlik ASCII'ye indirgenmez — "Üst katman" ile "Ust katman" farklı kayıttır.
export function normalizeName(name) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
}

export function recordId(name) {
  return normalizeName(name).toLocaleLowerCase('tr')
}

// Kaynağa göre `value` alanının taşıması gereken birim.
export function unitForSource(source) {
  return source === RECORD_SOURCE_WEIGHT ? RECORD_UNIT_WEIGHT : RECORD_UNIT_LENGTH
}

/**
 * Ham nesneyi doğrular. Döner: { record } veya { error, message }
 *
 * Şema sürümü uyuşmazsa kayıt sessizce okunmaz — eski bir zarf yeni alan
 * anlamlarıyla yorumlanırsa kullanıcı yanlış kalınlığı üretime gönderir.
 */
export function validateRecord(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { error: THICKNESS_ERR_SCHEMA, message: 'Kayıt bir nesne olmalı.' }
  }
  if (obj.schema !== THICKNESS_SCHEMA) {
    return {
      error: THICKNESS_ERR_SCHEMA,
      message: `"schema" alanı "${THICKNESS_SCHEMA}" olmalı.`,
    }
  }
  if (obj.schemaVersion !== SCHEMA_VERSION) {
    return {
      error: THICKNESS_ERR_VERSION,
      message: `Şema sürümü ${SCHEMA_VERSION} bekleniyor, kayıtta ${obj.schemaVersion ?? '—'} var. Bu kayıt okunamaz.`,
    }
  }

  const name = normalizeName(obj.name)
  if (name === '') {
    return { error: THICKNESS_ERR_NAME, message: 'Kayıt adı boş olamaz.' }
  }
  if (name.length > NAME_MAX) {
    return { error: THICKNESS_ERR_NAME, message: `Kayıt adı en fazla ${NAME_MAX} karakter olabilir.` }
  }

  if (!RECORD_SOURCES.includes(obj.source)) {
    return {
      error: THICKNESS_ERR_SOURCE,
      message: `Bilinmeyen kaynak "${obj.source}". Geçerli değerler: ${RECORD_SOURCES.join(', ')}.`,
    }
  }
  if (!RECORD_LAYERS.includes(obj.layer)) {
    return {
      error: THICKNESS_ERR_LAYER,
      message: `Bilinmeyen katman "${obj.layer}". Geçerli değerler: ${RECORD_LAYERS.join(', ')}.`,
    }
  }
  if (obj.unit !== unitForSource(obj.source)) {
    return {
      error: THICKNESS_ERR_UNIT,
      message: `"${obj.source}" kaydında birim "${unitForSource(obj.source)}" olmalı.`,
    }
  }

  for (const key of ['value', 'starting', 'finished']) {
    if (!isNum(obj[key]) || !(obj[key] > 0)) {
      return { error: THICKNESS_ERR_FIELD, message: `"${key}" alanı pozitif bir sayı olmalı.` }
    }
  }
  if (!isNum(obj.plating) || obj.plating < 0) {
    return { error: THICKNESS_ERR_FIELD, message: '"plating" alanı negatif olmayan bir sayı olmalı.' }
  }
  // İç katmanda delik kaplaması yüzeye bakır eklemez; kayıt bunu etkin
  // değeriyle (0) saklar, girilen ama kullanılmayan değerle değil.
  if (obj.layer === 'internal' && obj.plating !== 0) {
    return {
      error: THICKNESS_ERR_CONSISTENCY,
      message: 'İç katman kaydında kaplama 0 olmalı — iç katmanda kaplama bitmiş kalınlığa girmez.',
    }
  }
  // Zarfın kendi içinde tutarlı olması şart: bitmiş = başlangıç + kaplama.
  // Pay yalnızca kayan nokta gürültüsü içindir, mühendislik toleransı değildir.
  if (Math.abs(obj.finished - (obj.starting + obj.plating)) > 1e-9 * obj.finished) {
    return {
      error: THICKNESS_ERR_CONSISTENCY,
      message: 'Kayıt tutarsız: bitmiş kalınlık, başlangıç + kaplama toplamına eşit değil.',
    }
  }

  return {
    record: {
      schema: THICKNESS_SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      id: recordId(name),
      name,
      source: obj.source,
      unit: obj.unit,
      value: obj.value,
      layer: obj.layer,
      plating: obj.plating,
      starting: obj.starting,
      finished: obj.finished,
    },
  }
}

// --- Saklama ---
//
// Depolama bir bağımlılık olarak dışarıdan verilir (`lib/storage.js` sözleşmesi).
// Bu modül `localStorage`'ı hiç tanımaz; testte bellek içi depo geçilebilir.

export function createThicknessStore(storage) {
  if (!storage || typeof storage.read !== 'function') {
    throw new TypeError('createThicknessStore: storage portu gerekli (read/write/remove).')
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
    // Depodan okunan kayıt da doğrulanır: şema sürümü değişmişse ya da zarf
    // bozulmuşsa eski kayıt sessizce yanlış okunmaz, hiç yüklenmez.
    return parsed.map((rec) => validateRecord(rec).record).filter(Boolean)
  }

  function writeAll(list) {
    const w = storage.write(STORAGE_KEY, JSON.stringify(list))
    if (w.error) return { error: THICKNESS_ERR_STORAGE, message: w.message }
    return { ok: true }
  }

  return {
    list() {
      return readAll()
    },

    get(id) {
      return readAll().find((rec) => rec.id === id) ?? null
    },

    // Aynı adlı kayıt varsa üzerine yazar. Yeni kayıt sınırı aşıyorsa açık
    // hata döner; sessizce en eskiyi atmaz.
    save(record) {
      const check = validateRecord(record)
      if (check.error) return check

      const rest = readAll().filter((rec) => rec.id !== check.record.id)
      if (rest.length >= RECORD_MAX) {
        return {
          error: THICKNESS_ERR_LIMIT,
          message: `En fazla ${RECORD_MAX} kayıt saklanabilir. Yeni kayıt için önce bir kaydı silin.`,
        }
      }

      const w = writeAll([...rest, check.record])
      if (w.error) return w
      return { record: check.record }
    },

    remove(id) {
      return writeAll(readAll().filter((rec) => rec.id !== id))
    },

    clear() {
      return writeAll([])
    },
  }
}
