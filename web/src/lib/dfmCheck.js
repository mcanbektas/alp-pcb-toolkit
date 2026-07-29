// Ortak DFM kontrol sonucu — dört üretim/DFM aracının paylaştığı marj ve
// durum mantığı. Her araç kendi "gerçek değer minimumu sağlıyor mu" kodunu
// yazmaz; kontrolü burada kurar, ekran aynı tabloyu aynı biçimde basar.
//
// Modül saftır: React, DOM, depolama ve kullanıcıya görünen metin bilmez.
// Kontrol nesnesi yalnızca kod, sayı ve simgesel alan taşır; cümleyi ekranın
// text.js dosyası kurar.
//
// Sonuç sözleşmesi:
//   { id, status, direction, actual, required, margin, marginPercent,
//     source, detail }
//
// Marj tanımı yöne bağlıdır ve **her iki yönde de artı marj = iyi** demektir:
//   direction 'min' (gerçek değer en az X olmalı):  margin = actual - required
//   direction 'max' (gerçek değer en çok X olmalı): margin = required - actual
// Yüzdesel marj: marginPercent = 100 × margin / required
// `required` sıfır ya da tanımsızsa yüzdesel marj hesaplanmaz (null kalır) —
// sıfıra bölme yerine "ölçülemez" döner.

export const STATUS_OK = 'ok'
export const STATUS_WARNING = 'warning'
export const STATUS_DANGER = 'danger'
export const STATUS_UNKNOWN = 'unknown'

// En kötüden en iyiye. `worstStatus` bu sıraya bakar.
export const STATUS_ORDER = [STATUS_DANGER, STATUS_WARNING, STATUS_UNKNOWN, STATUS_OK]

// Sınırın nereden geldiği. Sonuçta hangi kaynağın belirleyici olduğu
// gösterilir; "üretici profilindeki minimumu sağlıyor" ile "standart tabanlı
// doğrulandı" aynı iddia değildir.
export const SOURCE_GEOMETRY = 'geometry'
export const SOURCE_FAB_PROFILE = 'fab-profile'
export const SOURCE_USER_RULE = 'user-rule'
export const SOURCE_STANDARD_PROFILE = 'standard-profile'

export const DIRECTION_MIN = 'min'
export const DIRECTION_MAX = 'max'

// Kontrolün neden değerlendirilemediği. `unknown` tek başına "veri yok"tan
// fazlasını söylemez; ayrımı bu alan taşır.
export const UNKNOWN_NO_LIMIT = 'no-limit'
export const UNKNOWN_NO_ACTUAL = 'no-actual'
export const UNKNOWN_NOT_FINITE = 'not-finite'
export const UNKNOWN_NO_CAPABILITY = 'no-capability'

/**
 * Uyarı marjının başlangıç değeri. **Gizli bir güvenlik eşiği değildir** —
 * kullanıcı tercihi olarak ekranda düzenlenebilir bir alanla gösterilir ve
 * hangi değerin kullanıldığı sonuçta yazılır. Motor bu sabiti kendiliğinden
 * uygulamaz; çağıran açıkça geçirir.
 */
export const DEFAULT_WARN_PERCENT = 10

// Kayan nokta gürültüsü mühendislik marjı değildir: 0.8 - 0.45 - 0.35 gibi bir
// çıkarım -5.5e-17 verir ve bu, sınırın altına düşmek anlamına gelmez. Marjın
// işareti `required`e göre bağıl bir payla değerlendirilir.
const REL_EPS = 1e-9

function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x)
}

function unknown(id, source, variant, detail) {
  return {
    id,
    status: STATUS_UNKNOWN,
    direction: null,
    actual: null,
    required: null,
    margin: null,
    marginPercent: null,
    source: source ?? null,
    variant,
    detail: detail ?? null,
  }
}

/**
 * Tek bir sayısal DFM kontrolü kurar.
 *
 * @param {object}  arg
 * @param {string}  arg.id            kontrol anahtarı (ekran metnini bununla seçer)
 * @param {number}  arg.actual        tasarımdaki gerçek değer
 * @param {number}  arg.required      sağlanması gereken sınır; null = sınır yok
 * @param {string}  [arg.direction]   DIRECTION_MIN (varsayılan) | DIRECTION_MAX
 * @param {string}  [arg.source]      sınırın kaynağı
 * @param {number}  [arg.warnPercent] uyarı marjı yüzdesi; null = uyarı bandı yok
 * @param {object}  [arg.detail]      ekranın göstereceği ek simgesel veri
 * @returns {object} kontrol sonucu
 */
export function checkLimit({
  id,
  actual,
  required,
  direction = DIRECTION_MIN,
  source = null,
  warnPercent = null,
  detail = null,
}) {
  // Sınır tanımlı değilse karar verilmez. Sessiz bir varsayılan sınır
  // uydurmak, üretilebilirlik hakkında dayanaksız bir iddia üretir.
  if (required === null || required === undefined) {
    return unknown(id, source, UNKNOWN_NO_LIMIT, detail)
  }
  if (actual === null || actual === undefined) {
    return unknown(id, source, UNKNOWN_NO_ACTUAL, detail)
  }
  if (!isNum(actual) || !isNum(required)) {
    return unknown(id, source, UNKNOWN_NOT_FINITE, detail)
  }

  const margin = direction === DIRECTION_MAX ? required - actual : actual - required
  // required = 0 iken yüzde tanımsızdır; sıfıra bölüp Infinity üretmez.
  const marginPercent = required === 0 ? null : (100 * margin) / required

  const tolerance = Math.abs(required) * REL_EPS
  let status
  if (margin < -tolerance) {
    status = STATUS_DANGER
  } else if (
    warnPercent !== null && warnPercent !== undefined
    // Uyarı bandının kenarı da paylıdır: 1.65 − 1.50 kayan noktada
    // 0.14999999999999991 verir, yüzdesi 9.999999999999994 çıkar ve paysız
    // karşılaştırmada tam %10 marjlı bir tasarım uyarıya düşerdi.
    && marginPercent !== null && marginPercent < warnPercent - Math.abs(warnPercent) * REL_EPS
  ) {
    // Sınırı sağlıyor ama kullanıcının istediği paya ulaşmıyor.
    status = STATUS_WARNING
  } else {
    status = STATUS_OK
  }

  return {
    id,
    status,
    direction,
    actual,
    required,
    margin,
    marginPercent,
    source,
    variant: null,
    detail,
  }
}

/**
 * Üretici yeteneği kontrolü (via-in-pad, blind via gibi). Profilde bayrak
 * tanımlı değilse (`null`) karar verilmez — `false` ile aynı şey değildir.
 *
 * @param {object}   arg
 * @param {string}   arg.id
 * @param {boolean}  arg.required   tasarımın bu yeteneğe ihtiyacı var mı
 * @param {boolean}  arg.supported  profildeki bayrak; null = bilinmiyor
 * @param {object}   [arg.detail]
 */
export function checkCapability({ id, required, supported, detail = null }) {
  if (!required) {
    // Tasarım bu yeteneği istemiyorsa kontrol konu dışıdır; geçmiş sayılır.
    return {
      id,
      status: STATUS_OK,
      direction: null,
      actual: false,
      required: false,
      margin: null,
      marginPercent: null,
      source: SOURCE_FAB_PROFILE,
      variant: null,
      detail,
    }
  }
  if (supported === null || supported === undefined) {
    return unknown(id, SOURCE_FAB_PROFILE, UNKNOWN_NO_CAPABILITY, detail)
  }
  return {
    id,
    status: supported ? STATUS_OK : STATUS_DANGER,
    direction: null,
    actual: supported,
    required: true,
    margin: null,
    marginPercent: null,
    source: SOURCE_FAB_PROFILE,
    variant: null,
    detail,
  }
}

/**
 * Birden çok kaynaktan gelen minimumların en büyüğünü seçer (konservatif
 * sonuç) ve hangi kaynağın belirleyici olduğunu birlikte döner.
 *
 * Tanımsız kaynak seçime hiç katılmaz. Hiçbiri tanımlı değilse
 * `{ value: null, source: null }` döner — sıfır değil, "sınır yok".
 *
 * @param {Array<{ value: number|null, source: string }>} candidates
 */
export function decidingMinimum(candidates) {
  let best = null
  for (const c of candidates) {
    if (!c || !isNum(c.value)) continue
    if (best === null || c.value > best.value) best = { value: c.value, source: c.source }
  }
  return best ?? { value: null, source: null }
}

/** Kontrol listesindeki en kötü durumu döner. Liste boşsa `unknown`. */
export function worstStatus(checks) {
  const present = new Set((checks ?? []).map((c) => c?.status))
  return STATUS_ORDER.find((s) => present.has(s)) ?? STATUS_UNKNOWN
}

/** Duruma göre sayım — durum çipi ve DFM özeti bu sayıları kullanır. */
export function summarizeChecks(checks) {
  const counts = {
    [STATUS_OK]: 0, [STATUS_WARNING]: 0, [STATUS_DANGER]: 0, [STATUS_UNKNOWN]: 0,
  }
  for (const c of checks ?? []) {
    if (c && counts[c.status] !== undefined) counts[c.status] += 1
  }
  return { ...counts, worst: worstStatus(checks), total: (checks ?? []).length }
}
