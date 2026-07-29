// Kopyalanabilir DFM özeti — düz metin üreteci.
//
// Modül saftır: React, DOM, pano ve dil bilmez. Bütün başlıklar ve satır
// metinleri **çağıran tarafından, çözülmüş dilde** verilir; burada tek bir
// kullanıcı cümlesi yoktur. Panoya yazma işi ekran katmanındadır.
//
// Tarih de dışarıdan gelir: saf katman `new Date()` çağırmaz, yoksa aynı
// girdi iki farklı çıktı üretir ve fonksiyon test edilebilir olmaktan çıkar.
//
// Özet hiçbir yerde "kesin üretilebilir" ya da "standarda uygun" demez;
// bunu söyleyecek metni çağıran da veremez, çünkü kapanış cümlesi (uyarı)
// zorunlu alandır ve her zaman basılır.

import { STATUS_OK, STATUS_WARNING, STATUS_DANGER, STATUS_UNKNOWN } from './dfmCheck'

export const SUMMARY_ERR_MISSING_LABELS = 'missing-labels'
export const SUMMARY_ERR_MISSING_TOOL = 'missing-tool'

/**
 * Özetin basabilmesi için gereken etiket anahtarları.
 *
 * Eksik bir anahtar sessizce `undefined` basardı ve düz metin özette
 * "undefined 0.35 mm" gibi bir satır oluşurdu — kullanıcıya gidecek bir
 * belgede en kötü hata türü. Bu yüzden eksik etiket bir hata koduyla
 * reddedilir; hangi anahtarın eksik olduğu yükte döner.
 */
export const SUMMARY_LABEL_KEYS = [
  'tool', 'profile', 'decisionProfile', 'date', 'method',
  'inputs', 'results', 'passed', 'warnings', 'failed', 'unevaluated', 'assumptions',
  'actual', 'required', 'margin', 'source',
  'none', 'notSelected', 'disclaimer',
]

const BULLET = '- '

function isText(x) {
  return typeof x === 'string' && x.trim() !== ''
}

// "Etiket: değer birim" — birim yoksa yalnızca değer.
function pairLine(label, value, unit) {
  const v = [value, unit].filter(isText).join(' ')
  return `${BULLET}${label}: ${v}`.trimEnd()
}

function block(title, lines, noneWord) {
  if (lines.length === 0) return [`${title}:`, `${BULLET}${noneWord}`]
  return [`${title}:`, ...lines]
}

/**
 * Tek bir kontrol satırı. Sayılar çağıran tarafından biçimlenmiş dize olarak
 * gelir — burada yuvarlama yapılmaz.
 */
function checkLine(c, labels) {
  const parts = []
  if (isText(c.actual)) parts.push(`${labels.actual} ${c.actual}`)
  if (isText(c.required)) parts.push(`${labels.required} ${c.required}`)
  if (isText(c.margin)) parts.push(`${labels.margin} ${c.margin}`)
  if (isText(c.source)) parts.push(`${labels.source} ${c.source}`)
  if (isText(c.reason)) parts.push(c.reason)
  return parts.length === 0
    ? `${BULLET}${c.label}`
    : `${BULLET}${c.label} — ${parts.join(', ')}`
}

/**
 * Düz metin DFM özeti üretir.
 *
 * @param {object}   arg
 * @param {object}   arg.labels   çözülmüş dilde başlıklar (dfmText().summary)
 * @param {string}   arg.tool     araç adı
 * @param {string}   [arg.date]   tarih dizesi; ekran verir
 * @param {string}   [arg.profile] aktif üretici profili adı
 * @param {string}   [arg.decisionProfile] aktif karar profili adı
 * @param {Array}    [arg.inputs]  [{ label, value, unit }]
 * @param {Array}    [arg.results] [{ label, value, unit }]
 * @param {Array}    [arg.checks]  [{ label, status, actual, required, margin, source, reason }]
 * @param {string[]} [arg.assumptions] çözülmüş cümleler
 * @param {string}   [arg.method]  yöntem cümlesi
 * @returns {{ text: string }} veya { error }
 */
export function buildDfmSummary({
  labels,
  tool,
  date = null,
  profile = null,
  decisionProfile = null,
  inputs = [],
  results = [],
  checks = [],
  assumptions = [],
  method = null,
}) {
  if (!labels || typeof labels !== 'object') return { error: SUMMARY_ERR_MISSING_LABELS }
  const missing = SUMMARY_LABEL_KEYS.filter((key) => !isText(labels[key]))
  if (missing.length > 0) return { error: SUMMARY_ERR_MISSING_LABELS, fields: missing }
  if (!isText(tool)) return { error: SUMMARY_ERR_MISSING_TOOL }

  const none = labels.none ?? ''
  const notSelected = labels.notSelected ?? none

  const lines = []
  lines.push(`${labels.tool}: ${tool}`)
  lines.push(`${labels.profile}: ${isText(profile) ? profile : notSelected}`)
  // Karar profili yalnızca o kavramı kullanan araçlarda basılır; diğerlerinde
  // satır hiç görünmez, "yok" yazıp varmış gibi durmaz.
  if (decisionProfile !== null) {
    lines.push(`${labels.decisionProfile}: ${isText(decisionProfile) ? decisionProfile : notSelected}`)
  }
  if (isText(date)) lines.push(`${labels.date}: ${date}`)
  if (isText(method)) lines.push(`${labels.method}: ${method}`)

  lines.push('')
  lines.push(...block(labels.inputs, inputs.map((i) => pairLine(i.label, i.value, i.unit)), none))
  lines.push('')
  lines.push(...block(labels.results, results.map((i) => pairLine(i.label, i.value, i.unit)), none))

  const byStatus = (status) => checks
    .filter((c) => c.status === status)
    .map((c) => checkLine(c, labels))

  lines.push('')
  lines.push(...block(labels.passed, byStatus(STATUS_OK), none))
  lines.push('')
  lines.push(...block(labels.warnings, byStatus(STATUS_WARNING), none))
  lines.push('')
  lines.push(...block(labels.failed, byStatus(STATUS_DANGER), none))
  lines.push('')
  lines.push(...block(labels.unevaluated, byStatus(STATUS_UNKNOWN), none))

  lines.push('')
  lines.push(...block(labels.assumptions, assumptions.filter(isText).map((a) => `${BULLET}${a}`), none))

  // Kapanış uyarısı seçimlik değildir.
  lines.push('')
  lines.push(labels.disclaimer)

  return { text: lines.join('\n') }
}
