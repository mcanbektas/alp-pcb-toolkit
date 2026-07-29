// Clearance ve creepage karar motoru (spec §10.1).
//
// Bu bir denklem hesaplayıcısı DEĞİLDİR. Hava üzerinden en kısa mesafe ve
// yalıtkan yüzey boyunca en kısa mesafe için sürekli, evrensel bir fiziksel
// bağıntı yoktur; karar tablo tabanlıdır. Motor yalnızca kullanıcının
// yüklediği karar profilinden okur, eşleşen kuralların en konservatifini
// seçer ve üretici/kullanıcı kurallarıyla birlikte değerlendirir.
//
// Hiçbir yerde formül uydurulmaz, eğri uydurulmaz, aralık dışına taşınmaz:
//   * Profil yoksa tablo tabanlı uygunluk hiç değerlendirilmez.
//   * Profil var ama eşleşen kural yoksa tahmini değer üretilmez.
//   * Rakım profilin kapsadığı bandın dışındaysa dışdeğerleme yapılmaz.
//   * Kaplanmış yüzey için sabit bir çarpan yoktur; etkisi profil kuralından
//     gelir (kural anahtarı olarak).
//
// Girişler SI: m, V, metre (rakım). Profil mm ile yazılır, burada çevrilir.
//
// Modül saftır: React, DOM, depolama ve kullanıcıya görünen metin bilmez.

import { LENGTH } from './units'
import {
  checkLimit, decidingMinimum,
  DIRECTION_MIN,
  SOURCE_FAB_PROFILE, SOURCE_USER_RULE, SOURCE_STANDARD_PROFILE,
} from './dfmCheck'

export const CC_ERR_NOT_FINITE = 'not-finite'
export const CC_ERR_NEGATIVE = 'negative'
export const CC_ERR_NO_LIMIT = 'no-limit'

// Tablo tabanlı değerlendirmenin durumu. `ok` dışındaki her durumda profil
// sonucu karara katılmaz.
export const TABLE_OK = 'ok'
export const TABLE_NO_PROFILE = 'no-profile'
export const TABLE_NO_MATCHING_RULE = 'no-matching-rule'
export const TABLE_RANGE_EXCEEDED = 'profile-range-exceeded'

export const CC_WARN_NO_PROFILE = 'no-profile'
export const CC_WARN_NO_MATCHING_RULE = 'no-matching-rule'
export const CC_WARN_RANGE_EXCEEDED = 'profile-range-exceeded'
export const CC_WARN_NO_ALTITUDE_DATA = 'no-altitude-data'
export const CC_WARN_ALTITUDE_DOUBLE_COUNT = 'altitude-double-count'
export const CC_WARN_NO_CTI_MATCH = 'no-cti-match'
export const CC_WARN_ONLY_FAB_USER = 'only-fab-user'

export const CHECK_CLEARANCE = 'clearance'
export const CHECK_CREEPAGE = 'creepage'

// Yöntem etiketleri — sonucun neye dayandığı sonuçla birlikte taşınır.
export const METHOD_TABLE_PROFILE = 'table-profile'
export const METHOD_FAB_USER_ONLY = 'fab-user-only'
export const METHOD_NO_LIMIT = 'no-limit'

export const ASSUMPTION_CONSERVATIVE_MAX = 'conservative-max'
export const ASSUMPTION_NO_EXTRAPOLATION = 'no-extrapolation'
export const ASSUMPTION_ALTITUDE_CLEARANCE_ONLY = 'altitude-clearance-only'
export const ASSUMPTION_COATING_FROM_PROFILE = 'coating-from-profile'

function isNum(x) {
  return typeof x === 'number' && Number.isFinite(x)
}

function optionalNonNegative(value, field) {
  if (value === null || value === undefined || value === '') return { value: null }
  if (!isNum(value)) return { error: CC_ERR_NOT_FINITE, field }
  if (value < 0) return { error: CC_ERR_NEGATIVE, field }
  return { value }
}

// Anahtar karşılaştırması profil tarafındaki normalleştirmeyle aynı olmalı.
function normalizeKey(value) {
  if (typeof value !== 'string') return null
  const t = value.trim().replace(/\s+/g, ' ')
  return t === '' ? null : t.toLocaleLowerCase('tr')
}

/**
 * Bir sayısal aralık kısıtı sağlanıyor mu?
 *
 * Aralık uçları **iki tarafta da dâhildir**. Bitişik bantlar (0–150, 150–300)
 * uçta iki kuralı birden eşleştirir; sonuç en büyük mesafe seçilerek
 * konservatif tarafta kalır. Uç dışlansaydı bantlar arasında sessiz bir
 * boşluk kalır ve o değerde hiçbir kural eşleşmezdi.
 *
 * Kısıtın kendisi tanımsızsa (null) kural o boyutta serbesttir.
 */
function inRange(value, min, max) {
  if (min === null && max === null) return true
  // Kural bir aralık şart koşuyorsa ve kullanıcı o büyüklüğü girmemişse
  // kural eşleşmez: eksik veriyle karar verilmez.
  if (!isNum(value)) return false
  if (min !== null && value < min) return false
  if (max !== null && value > max) return false
  return true
}

// Anahtar kısıtı: kural bir anahtar şart koşuyorsa girdi birebir eşleşmeli.
// Kural anahtar belirtmiyorsa o boyutta serbesttir.
function keyMatches(value, ruleValue) {
  if (ruleValue === null || ruleValue === undefined) return true
  return normalizeKey(value) === ruleValue
}

/**
 * Girdilerle eşleşen clearance kurallarını döner.
 * Eşleşme kısıtları: çalışma / tepe / darbe gerilimi, rakım, kirlilik
 * derecesi, izolasyon türü, kaplama durumu.
 */
export function matchClearanceRules(rules, input = {}) {
  return (rules ?? []).filter((r) => (
    inRange(input.workingVoltage, r.minWorkingVoltage, r.maxWorkingVoltage)
    && inRange(input.peakVoltage, r.minPeakVoltage, r.maxPeakVoltage)
    && inRange(input.impulseVoltage, r.minImpulseVoltage, r.maxImpulseVoltage)
    && inRange(input.altitudeM, r.minAltitudeM, r.maxAltitudeM)
    && keyMatches(input.pollutionDegree, r.pollutionDegree)
    && keyMatches(input.insulationType, r.insulationType)
    && keyMatches(input.coating, r.coating)
  ))
}

/** Girdilerle eşleşen creepage kurallarını döner. */
export function matchCreepageRules(rules, input = {}) {
  return (rules ?? []).filter((r) => (
    inRange(input.workingVoltage, r.minWorkingVoltage, r.maxWorkingVoltage)
    && keyMatches(input.pollutionDegree, r.pollutionDegree)
    && keyMatches(input.insulationType, r.insulationType)
    && keyMatches(input.coating, r.coating)
    && keyMatches(input.materialGroup, r.materialGroup)
  ))
}

/**
 * CTI değerinden malzeme grubu. Bantlar profilden gelir; kaynak kodda sabit
 * sınır yoktur. Hiçbir bant eşleşmezse null döner — en yakın banda yuvarlanmaz.
 */
export function materialGroupForCti(groups, cti) {
  if (!isNum(cti)) return null
  const hit = (groups ?? []).find((g) => (
    (g.minCti === null || cti >= g.minCti) && (g.maxCti === null || cti <= g.maxCti)
  ))
  return hit ? hit.id : null
}

/**
 * Rakım (ya da profil tarafından creepage için ayrıca tanımlanmış) düzeltme
 * katsayısı.
 *
 * Döner: { factor, status }
 *   status TABLE_OK             → bandı bulundu
 *   status TABLE_NO_PROFILE     → profil bu düzeltmeyi hiç tanımlamamış
 *   status TABLE_RANGE_EXCEEDED → tanımlı ama girilen değer bantların dışında
 *
 * Bantların dışında **dışdeğerleme yapılmaz**: son bandın katsayısı ileriye
 * taşınmaz, doğrusal uzatılmaz.
 */
export function altitudeFactorFor(factors, altitudeM) {
  const list = factors ?? []
  if (list.length === 0) return { factor: 1, status: TABLE_NO_PROFILE }
  if (!isNum(altitudeM)) return { factor: 1, status: TABLE_NO_PROFILE }
  const hit = list.find((f) => (
    (f.minAltitudeM === null || altitudeM >= f.minAltitudeM)
    && (f.maxAltitudeM === null || altitudeM <= f.maxAltitudeM)
  ))
  if (!hit) return { factor: null, status: TABLE_RANGE_EXCEEDED }
  return { factor: hit.factor, status: TABLE_OK }
}

// Eşleşen kuralların en büyüğü seçilir: birden çok kural aynı girdiye
// uyuyorsa konservatif olan kazanır.
function conservativeDistance(matched) {
  let best = null
  for (const r of matched) {
    const d = r.minimumDistanceMm * LENGTH.mm
    if (best === null || d > best.distance) best = { distance: d, rule: r }
  }
  return best
}

// Clearance ve creepage aynı iskeleti paylaşır; tek fark eşleştirme işlevi ve
// düzeltme katsayısının hangi listeden geldiğidir.
function computeDistance({
  checkId,
  rules,
  matcher,
  matchInput,
  factors,
  factorInput,
  applyFactor,
  fabMinimum,
  userMinimum,
  actual,
  warnPercent,
  hasProfile,
  extraWarnings = [],
}) {
  const fab = optionalNonNegative(fabMinimum, 'fabMinimum')
  if (fab.error) return fab
  const user = optionalNonNegative(userMinimum, 'userMinimum')
  if (user.error) return user
  const act = optionalNonNegative(actual, 'actual')
  if (act.error) return act

  const warnings = [...extraWarnings]
  let tableStatus = TABLE_NO_PROFILE
  let baseDistance = null
  let factor = null
  let correctedDistance = null
  let decidingRule = null

  const matched = hasProfile ? matcher(rules, matchInput) : []

  if (!hasProfile) {
    warnings.push({ code: CC_WARN_NO_PROFILE })
  } else {
    if (matched.length === 0) {
      tableStatus = TABLE_NO_MATCHING_RULE
      warnings.push({ code: CC_WARN_NO_MATCHING_RULE })
    } else {
      const best = conservativeDistance(matched)
      baseDistance = best.distance
      decidingRule = best.rule

      if (!applyFactor) {
        // Düzeltme bu büyüklüğe uygulanmaz (creepage'a rakım katsayısı
        // otomatik uygulanmaz).
        factor = 1
        correctedDistance = baseDistance
        tableStatus = TABLE_OK
      } else {
        const f = altitudeFactorFor(factors, factorInput)
        if (f.status === TABLE_RANGE_EXCEEDED) {
          // Dışdeğerleme yok: profil sonucu karara katılmaz.
          tableStatus = TABLE_RANGE_EXCEEDED
          warnings.push({ code: CC_WARN_RANGE_EXCEEDED })
        } else {
          factor = f.factor
          correctedDistance = baseDistance * factor
          tableStatus = TABLE_OK
          if (f.status === TABLE_NO_PROFILE && isNum(factorInput)) {
            // Rakım girildi ama profil bir düzeltme tanımlamamış: katsayı 1
            // kabul edildi, bu bir varsayımdır.
            warnings.push({ code: CC_WARN_NO_ALTITUDE_DATA })
          }
          // Kuralın kendisi rakımı zaten kısıtlıyorken ayrıca katsayı
          // uygulanırsa düzeltme iki kez sayılır.
          const ruleConstrainsAltitude = decidingRule.minAltitudeM !== null
            || decidingRule.maxAltitudeM !== null
          if (ruleConstrainsAltitude && factor !== 1) {
            warnings.push({ code: CC_WARN_ALTITUDE_DOUBLE_COUNT })
          }
        }
      }
    }
  }

  const standardValue = tableStatus === TABLE_OK ? correctedDistance : null

  const deciding = decidingMinimum([
    { value: standardValue, source: SOURCE_STANDARD_PROFILE },
    { value: fab.value, source: SOURCE_FAB_PROFILE },
    { value: user.value, source: SOURCE_USER_RULE },
  ])

  if (deciding.value !== null && standardValue === null) {
    warnings.push({ code: CC_WARN_ONLY_FAB_USER })
  }

  let method = METHOD_NO_LIMIT
  if (standardValue !== null) method = METHOD_TABLE_PROFILE
  else if (deciding.value !== null) method = METHOD_FAB_USER_ONLY

  const check = checkLimit({
    id: checkId,
    actual: act.value,
    required: deciding.value,
    direction: DIRECTION_MIN,
    source: deciding.source,
    warnPercent,
  })

  return {
    valid: true,
    tableStatus,
    baseDistance,
    factor,
    correctedDistance,
    standardValue,
    fabMinimum: fab.value,
    userMinimum: user.value,
    required: deciding.value,
    decidingSource: deciding.source,
    actual: act.value,
    margin: check.margin,
    marginPercent: check.marginPercent,
    matchedRuleCount: matched.length,
    decidingRule,
    check,
    warnings,
    method,
  }
}

/**
 * Clearance — hava üzerinden en kısa mesafe.
 *
 *   S_standard_altitude = S_standard_base × k_altitude
 *   S_required = max(S_standard_altitude, S_fab, S_user)
 *
 * Rakım katsayısı **yalnızca profil sonucuna** uygulanır. Üreticinin minimum
 * üretim mesafesi bir üretim sınırıdır, rakımla ölçeklenmez.
 */
export function computeClearance(input = {}) {
  const {
    profile = null,
    workingVoltage = null,
    peakVoltage = null,
    impulseVoltage = null,
    altitudeM = null,
    pollutionDegree = null,
    insulationType = null,
    coating = null,
    fabMinimum = null,
    userMinimum = null,
    actual = null,
    warnPercent = null,
  } = input

  const r = computeDistance({
    checkId: CHECK_CLEARANCE,
    rules: profile?.clearanceRules ?? [],
    matcher: matchClearanceRules,
    matchInput: {
      workingVoltage, peakVoltage, impulseVoltage, altitudeM,
      pollutionDegree, insulationType, coating,
    },
    factors: profile?.altitudeFactors ?? [],
    factorInput: altitudeM,
    applyFactor: true,
    fabMinimum,
    userMinimum,
    actual,
    warnPercent,
    hasProfile: profile !== null && (profile.clearanceRules ?? []).length > 0,
  })
  if (r.error) return r

  return {
    ...r,
    kind: CHECK_CLEARANCE,
    altitudeM,
    profileName: profile?.name ?? null,
    profileSource: profile?.source ?? null,
    assumptions: [
      ASSUMPTION_CONSERVATIVE_MAX,
      ASSUMPTION_NO_EXTRAPOLATION,
      ASSUMPTION_COATING_FROM_PROFILE,
    ],
  }
}

/**
 * Creepage — yalıtkan yüzey boyunca en kısa mesafe.
 *
 *   S_required = max(S_standard_profile, S_fab, S_user)
 *
 * Rakım katsayısı creepage'a **otomatik uygulanmaz**. Profil creepage için
 * ayrıca bir düzeltme tanımlamışsa (`creepageFactors`) yalnızca o kullanılır.
 */
export function computeCreepage(input = {}) {
  const {
    profile = null,
    workingVoltage = null,
    pollutionDegree = null,
    insulationType = null,
    coating = null,
    materialGroup = null,
    cti = null,
    altitudeM = null,
    fabMinimum = null,
    userMinimum = null,
    actual = null,
    warnPercent = null,
  } = input

  const extraWarnings = []

  // Malzeme grubu doğrudan seçilebilir; seçilmemişse CTI'dan türetilir.
  // Hiçbir bant eşleşmezse grup boş kalır ve o boyutta kural eşleşmesi
  // yapılamaz — en yakın gruba yuvarlanmaz.
  let group = normalizeKey(materialGroup)
  let groupFromCti = null
  if (group === null && isNum(cti)) {
    groupFromCti = materialGroupForCti(profile?.materialGroups ?? [], cti)
    group = groupFromCti
    if (group === null) extraWarnings.push({ code: CC_WARN_NO_CTI_MATCH })
  }

  // Profil creepage için ayrı bir düzeltme tanımlamışsa uygulanır; yoksa
  // hiçbir düzeltme uygulanmaz.
  const creepageFactors = profile?.creepageFactors ?? []
  const applyFactor = creepageFactors.length > 0

  const r = computeDistance({
    checkId: CHECK_CREEPAGE,
    rules: profile?.creepageRules ?? [],
    matcher: matchCreepageRules,
    matchInput: {
      workingVoltage, pollutionDegree, insulationType, coating, materialGroup: group,
    },
    factors: creepageFactors,
    factorInput: altitudeM,
    applyFactor,
    fabMinimum,
    userMinimum,
    actual,
    warnPercent,
    hasProfile: profile !== null && (profile.creepageRules ?? []).length > 0,
    extraWarnings,
  })
  if (r.error) return r

  return {
    ...r,
    kind: CHECK_CREEPAGE,
    materialGroup: group,
    groupFromCti,
    cti: isNum(cti) ? cti : null,
    profileName: profile?.name ?? null,
    profileSource: profile?.source ?? null,
    assumptions: [
      ASSUMPTION_CONSERVATIVE_MAX,
      ASSUMPTION_NO_EXTRAPOLATION,
      ASSUMPTION_ALTITUDE_CLEARANCE_ONLY,
      ASSUMPTION_COATING_FROM_PROFILE,
    ],
  }
}

/**
 * Sweep: gerekli clearance'ın rakıma göre değişimi. Profil basamaklı olduğu
 * için sonuç da basamaklıdır — sürekli fiziksel bir eğri gibi sunulmamalıdır.
 *
 * Profilin kapsamadığı rakımda nokta üretilmez; grafik boşluk gösterir,
 * uydurulmuş bir değerle doldurulmaz.
 */
export function buildClearanceAltitudeSweep(base, from, to, steps = 40) {
  if (!isNum(from) || !isNum(to) || !Number.isInteger(steps) || steps < 2) return []
  const points = []
  for (let i = 0; i < steps; i += 1) {
    const x = from + ((to - from) * i) / (steps - 1)
    if (x < 0) continue
    const r = computeClearance({ ...base, altitudeM: x })
    if (r.error || r.required === null) continue
    points.push({ x, y: r.required })
  }
  return points
}

/** Sweep: gerekli mesafenin çalışma gerilimine göre değişimi. */
export function buildVoltageSweep(base, from, to, steps = 40, kind = CHECK_CLEARANCE) {
  if (!isNum(from) || !isNum(to) || !Number.isInteger(steps) || steps < 2) return []
  const compute = kind === CHECK_CREEPAGE ? computeCreepage : computeClearance
  const points = []
  for (let i = 0; i < steps; i += 1) {
    const x = from + ((to - from) * i) / (steps - 1)
    if (x < 0) continue
    const r = compute({ ...base, workingVoltage: x })
    if (r.error || r.required === null) continue
    points.push({ x, y: r.required })
  }
  return points
}
