import { describe, it, expect } from 'vitest'
import {
  computeClearance, computeCreepage,
  matchClearanceRules, matchCreepageRules,
  materialGroupForCti, altitudeFactorFor,
  buildClearanceAltitudeSweep, buildVoltageSweep,
  TABLE_OK, TABLE_NO_PROFILE, TABLE_NO_MATCHING_RULE, TABLE_RANGE_EXCEEDED,
  CC_WARN_NO_PROFILE, CC_WARN_NO_MATCHING_RULE, CC_WARN_RANGE_EXCEEDED,
  CC_WARN_NO_ALTITUDE_DATA, CC_WARN_ALTITUDE_DOUBLE_COUNT, CC_WARN_NO_CTI_MATCH,
  CC_WARN_ONLY_FAB_USER,
  CC_ERR_NEGATIVE, CC_ERR_NOT_FINITE,
  METHOD_TABLE_PROFILE, METHOD_FAB_USER_ONLY, METHOD_NO_LIMIT,
} from './clearanceCreepage'
import { validateClearanceProfile, CLEARANCE_PROFILE_SCHEMA, SCHEMA_VERSION } from './clearanceProfile'
import {
  STATUS_OK, STATUS_UNKNOWN, STATUS_DANGER,
  SOURCE_USER_RULE, SOURCE_FAB_PROFILE, SOURCE_STANDARD_PROFILE,
  UNKNOWN_NO_LIMIT,
} from './dfmCheck'
import { expectErrorShape } from './errorShape.testkit'

// Bütün profil sayıları TEMSİLİDİR — hiçbir yayınlanmış karar tablosundan
// alınmamıştır. Amaç motorun karar mantığını sınamaktır.
const mm = (x) => x * 1e-3

function makeProfile(overrides = {}) {
  const raw = {
    schema: CLEARANCE_PROFILE_SCHEMA,
    schemaVersion: SCHEMA_VERSION,
    name: 'Temsili profil',
    source: { title: 'Kullanici notu', revision: 'r1' },
    materialGroups: [
      { id: 'grup-a', minCti: 600, maxCti: 1000 },
      { id: 'grup-b', minCti: 400, maxCti: 599 },
    ],
    clearanceRules: [
      {
        minWorkingVoltage: 0,
        maxWorkingVoltage: 300,
        pollutionDegree: '2',
        insulationType: 'temel',
        minimumDistanceMm: 1,
      },
      {
        minWorkingVoltage: 300,
        maxWorkingVoltage: 600,
        pollutionDegree: '2',
        insulationType: 'temel',
        minimumDistanceMm: 2,
      },
    ],
    creepageRules: [
      {
        minWorkingVoltage: 0,
        maxWorkingVoltage: 300,
        pollutionDegree: '2',
        materialGroup: 'grup-a',
        minimumDistanceMm: 2,
      },
    ],
    altitudeFactors: [
      { minAltitudeM: 0, maxAltitudeM: 2000, factor: 1 },
      { minAltitudeM: 2000, maxAltitudeM: 3000, factor: 1.25 },
    ],
    ...overrides,
  }
  const r = validateClearanceProfile(raw)
  if (r.error) throw new Error(`test profili geçersiz: ${r.error}`)
  return r.profile
}

// Brief §12.1 — elle doğrulanan örnek:
//
//   Profil temel clearance = 1.00 mm  (0–300 V, kirlilik 2, temel izolasyon)
//   Rakım 2500 m → katsayı 1.25
//   Rakım düzeltilmiş profil sonucu = 1.00 × 1.25 = 1.25 mm
//   Üretici minimumu = 0.20 mm
//   Kullanıcı minimumu = 1.50 mm
//   Nihai gerekli = max(1.25, 0.20, 1.50) = 1.50 mm  → belirleyici: kullanıcı
//   Gerçek mesafe = 1.65 mm
//   Mutlak marj = 0.15 mm,  yüzdesel marj = %10

const briefCase = {
  workingVoltage: 100,
  pollutionDegree: '2',
  insulationType: 'temel',
  altitudeM: 2500,
  fabMinimum: mm(0.2),
  userMinimum: mm(1.5),
  actual: mm(1.65),
  warnPercent: 10,
}

describe('computeClearance — referans örnek', () => {
  const r = computeClearance({ ...briefCase, profile: makeProfile() })

  it('profil temel mesafesini bulur', () => {
    expect(r.tableStatus).toBe(TABLE_OK)
    expect(r.baseDistance).toBeCloseTo(mm(1), 15)
  })

  it('rakım katsayısını yalnızca profil sonucuna uygular', () => {
    expect(r.factor).toBe(1.25)
    expect(r.correctedDistance).toBeCloseTo(mm(1.25), 15)
    // Üretici minimumu ölçeklenmez
    expect(r.fabMinimum).toBeCloseTo(mm(0.2), 15)
  })

  it('nihai gerekli mesafe en büyük kaynaktır', () => {
    expect(r.required).toBeCloseTo(mm(1.5), 15)
    expect(r.decidingSource).toBe(SOURCE_USER_RULE)
  })

  it('mutlak ve yüzdesel marjı verir', () => {
    expect(r.margin).toBeCloseTo(mm(0.15), 15)
    expect(r.marginPercent).toBeCloseTo(10, 9)
  })

  it('tam %10 marj uyarıya düşmez', () => {
    expect(r.check.status).toBe(STATUS_OK)
  })

  it('yöntem tablo tabanlı olarak etiketlenir', () => {
    expect(r.method).toBe(METHOD_TABLE_PROFILE)
    expect(r.profileName).toBe('Temsili profil')
    expect(r.profileSource.revision).toBe('r1')
  })
})

describe('computeClearance — profil yokken', () => {
  it('tablo tabanlı uygunluk değerlendirilmez', () => {
    const r = computeClearance({ ...briefCase, profile: null })
    expect(r.tableStatus).toBe(TABLE_NO_PROFILE)
    expect(r.standardValue).toBeNull()
    expect(r.baseDistance).toBeNull()
    expect(r.warnings.map((w) => w.code)).toContain(CC_WARN_NO_PROFILE)
  })

  it('üretici ve kullanıcı kuralları yine değerlendirilir', () => {
    const r = computeClearance({ ...briefCase, profile: null })
    expect(r.required).toBeCloseTo(mm(1.5), 15)
    expect(r.decidingSource).toBe(SOURCE_USER_RULE)
    expect(r.method).toBe(METHOD_FAB_USER_ONLY)
    expect(r.warnings.map((w) => w.code)).toContain(CC_WARN_ONLY_FAB_USER)
  })

  it('hiçbir sınır yoksa kontrol ok dönmez', () => {
    const r = computeClearance({ profile: null, actual: mm(5), warnPercent: 10 })
    expect(r.required).toBeNull()
    expect(r.check.status).toBe(STATUS_UNKNOWN)
    expect(r.check.variant).toBe(UNKNOWN_NO_LIMIT)
    expect(r.method).toBe(METHOD_NO_LIMIT)
  })

  it('profil yokken bile büyük bir gerçek mesafe standart uygunluğu üretmez', () => {
    const r = computeClearance({ profile: null, actual: mm(50), fabMinimum: mm(0.2) })
    expect(r.check.status).toBe(STATUS_OK)
    // ama karar kaynağı üretici sınırıdır, tablo değil
    expect(r.decidingSource).toBe(SOURCE_FAB_PROFILE)
    expect(r.standardValue).toBeNull()
  })
})

describe('computeClearance — eşleşme bulunamayan durumlar', () => {
  it('hiçbir kural eşleşmiyorsa tahmini değer üretilmez', () => {
    const r = computeClearance({
      ...briefCase, workingVoltage: 5000, profile: makeProfile(),
    })
    expect(r.tableStatus).toBe(TABLE_NO_MATCHING_RULE)
    expect(r.standardValue).toBeNull()
    expect(r.matchedRuleCount).toBe(0)
    expect(r.warnings.map((w) => w.code)).toContain(CC_WARN_NO_MATCHING_RULE)
  })

  it('rakım profil aralığının üzerindeyse dışdeğerleme yapılmaz', () => {
    const r = computeClearance({ ...briefCase, altitudeM: 5000, profile: makeProfile() })
    expect(r.tableStatus).toBe(TABLE_RANGE_EXCEEDED)
    expect(r.standardValue).toBeNull()
    // Son bandın katsayısı ileri taşınmaz
    expect(r.correctedDistance).toBeNull()
    expect(r.warnings.map((w) => w.code)).toContain(CC_WARN_RANGE_EXCEEDED)
    // Üretici/kullanıcı kuralı yine değerlendirilir
    expect(r.required).toBeCloseTo(mm(1.5), 15)
  })

  it('kural bir kısıt şart koşuyorsa ve girdi eksikse eşleşmez', () => {
    const r = computeClearance({
      profile: makeProfile(), pollutionDegree: '2', insulationType: 'temel',
    })
    expect(r.tableStatus).toBe(TABLE_NO_MATCHING_RULE)
  })

  it('anahtar uyuşmazsa eşleşmez', () => {
    const r = computeClearance({ ...briefCase, pollutionDegree: '3', profile: makeProfile() })
    expect(r.tableStatus).toBe(TABLE_NO_MATCHING_RULE)
  })
})

describe('computeClearance — konservatif seçim', () => {
  it('bitişik bantların ucunda iki kural eşleşir, büyük mesafe seçilir', () => {
    // 300 V hem 0–300 hem 300–600 bandına girer → 2 mm seçilir
    const r = computeClearance({
      profile: makeProfile(),
      workingVoltage: 300,
      pollutionDegree: '2',
      insulationType: 'temel',
      altitudeM: 0,
    })
    expect(r.matchedRuleCount).toBe(2)
    expect(r.baseDistance).toBeCloseTo(mm(2), 15)
  })

  it('bant içinde tek kural eşleşir', () => {
    const r = computeClearance({
      profile: makeProfile(),
      workingVoltage: 299,
      pollutionDegree: '2',
      insulationType: 'temel',
      altitudeM: 0,
    })
    expect(r.matchedRuleCount).toBe(1)
    expect(r.baseDistance).toBeCloseTo(mm(1), 15)
  })
})

describe('computeClearance — rakım düzeltmesi', () => {
  it('profil düzeltme tanımlamamışsa katsayı 1 kabul edilir ve bildirilir', () => {
    const p = makeProfile({ altitudeFactors: [] })
    const r = computeClearance({ ...briefCase, profile: p })
    expect(r.factor).toBe(1)
    expect(r.correctedDistance).toBeCloseTo(mm(1), 15)
    expect(r.warnings.map((w) => w.code)).toContain(CC_WARN_NO_ALTITUDE_DATA)
  })

  it('kural rakımı zaten kısıtlıyorken ayrıca katsayı uygulanırsa uyarı verilir', () => {
    const p = makeProfile({
      clearanceRules: [{
        minWorkingVoltage: 0,
        maxWorkingVoltage: 300,
        minAltitudeM: 0,
        maxAltitudeM: 3000,
        minimumDistanceMm: 1,
      }],
    })
    const r = computeClearance({
      profile: p, workingVoltage: 100, altitudeM: 2500,
    })
    expect(r.warnings.map((w) => w.code)).toContain(CC_WARN_ALTITUDE_DOUBLE_COUNT)
  })

  it('katsayı 1 iken çift sayım uyarısı verilmez', () => {
    const p = makeProfile({
      clearanceRules: [{
        minAltitudeM: 0, maxAltitudeM: 3000, minimumDistanceMm: 1,
      }],
    })
    const r = computeClearance({ profile: p, altitudeM: 500 })
    expect(r.warnings.map((w) => w.code)).not.toContain(CC_WARN_ALTITUDE_DOUBLE_COUNT)
  })
})

describe('computeCreepage', () => {
  it('CTI değerinden malzeme grubunu türetir', () => {
    const r = computeCreepage({
      profile: makeProfile(),
      workingVoltage: 100,
      pollutionDegree: '2',
      cti: 650,
      warnPercent: 10,
    })
    expect(r.materialGroup).toBe('grup-a')
    expect(r.groupFromCti).toBe('grup-a')
    expect(r.baseDistance).toBeCloseTo(mm(2), 15)
    expect(r.required).toBeCloseTo(mm(2), 15)
    expect(r.decidingSource).toBe(SOURCE_STANDARD_PROFILE)
  })

  it('hiçbir CTI bandı eşleşmezse gruba yuvarlanmaz', () => {
    const r = computeCreepage({
      profile: makeProfile(), workingVoltage: 100, pollutionDegree: '2', cti: 100,
    })
    expect(r.materialGroup).toBeNull()
    expect(r.warnings.map((w) => w.code)).toContain(CC_WARN_NO_CTI_MATCH)
    expect(r.tableStatus).toBe(TABLE_NO_MATCHING_RULE)
  })

  it('malzeme grubu doğrudan seçilebilir', () => {
    const r = computeCreepage({
      profile: makeProfile(), workingVoltage: 100, pollutionDegree: '2',
      materialGroup: 'GRUP-A', cti: 100,
    })
    expect(r.materialGroup).toBe('grup-a')
    expect(r.groupFromCti).toBeNull()
    expect(r.baseDistance).toBeCloseTo(mm(2), 15)
  })

  it('rakım katsayısı creepage değerine otomatik uygulanmaz', () => {
    const r = computeCreepage({
      profile: makeProfile(), workingVoltage: 100, pollutionDegree: '2',
      cti: 650, altitudeM: 2500,
    })
    expect(r.factor).toBe(1)
    expect(r.correctedDistance).toBeCloseTo(mm(2), 15)
  })

  it('profil creepage için ayrı düzeltme tanımlamışsa uygulanır', () => {
    const p = makeProfile({
      creepageFactors: [{ minAltitudeM: 2000, maxAltitudeM: 3000, factor: 1.1 }],
    })
    const r = computeCreepage({
      profile: p, workingVoltage: 100, pollutionDegree: '2', cti: 650, altitudeM: 2500,
    })
    expect(r.factor).toBe(1.1)
    expect(r.correctedDistance).toBeCloseTo(mm(2.2), 15)
  })

  it('creepage kuralı olmayan profil tablo sonucu üretmez', () => {
    const p = makeProfile({ creepageRules: [] })
    const r = computeCreepage({ profile: p, workingVoltage: 100 })
    expect(r.tableStatus).toBe(TABLE_NO_PROFILE)
    expect(r.standardValue).toBeNull()
  })

  it('gerçek mesafe gerekli mesafenin altındaysa danger döner', () => {
    const r = computeCreepage({
      profile: makeProfile(), workingVoltage: 100, pollutionDegree: '2',
      cti: 650, actual: mm(1.5), warnPercent: 10,
    })
    expect(r.check.status).toBe(STATUS_DANGER)
    expect(r.margin).toBeCloseTo(mm(-0.5), 15)
  })
})

describe('yardımcı işlevler', () => {
  it('materialGroupForCti bant dışında null döner', () => {
    const groups = [{ id: 'a', minCti: 600, maxCti: 1000 }]
    expect(materialGroupForCti(groups, 700)).toBe('a')
    expect(materialGroupForCti(groups, 599)).toBeNull()
    expect(materialGroupForCti(groups, NaN)).toBeNull()
    expect(materialGroupForCti([], 700)).toBeNull()
  })

  it('altitudeFactorFor bant dışında dışdeğerleme yapmaz', () => {
    const f = [{ minAltitudeM: 0, maxAltitudeM: 2000, factor: 1 }]
    expect(altitudeFactorFor(f, 1000).factor).toBe(1)
    expect(altitudeFactorFor(f, 3000).status).toBe(TABLE_RANGE_EXCEEDED)
    expect(altitudeFactorFor(f, 3000).factor).toBeNull()
    expect(altitudeFactorFor([], 3000).status).toBe(TABLE_NO_PROFILE)
  })

  it('matchClearanceRules kısıtsız kuralı her girdiyle eşleştirir', () => {
    const rules = [{
      minWorkingVoltage: null, maxWorkingVoltage: null,
      minPeakVoltage: null, maxPeakVoltage: null,
      minImpulseVoltage: null, maxImpulseVoltage: null,
      minAltitudeM: null, maxAltitudeM: null,
      pollutionDegree: null, insulationType: null, coating: null,
      minimumDistanceMm: 1,
    }]
    expect(matchClearanceRules(rules, {})).toHaveLength(1)
    expect(matchCreepageRules(rules, {})).toHaveLength(1)
  })

  it('boş kural listesi çökmez', () => {
    expect(matchClearanceRules(null, {})).toEqual([])
    expect(matchCreepageRules(undefined, {})).toEqual([])
  })
})

describe('geçersiz girdiler', () => {
  const bad = [
    ['negatif üretici minimumu', { fabMinimum: mm(-1) }, CC_ERR_NEGATIVE],
    ['negatif kullanıcı minimumu', { userMinimum: mm(-1) }, CC_ERR_NEGATIVE],
    ['negatif gerçek mesafe', { actual: mm(-1) }, CC_ERR_NEGATIVE],
    ['sonsuz gerçek mesafe', { actual: Infinity }, CC_ERR_NOT_FINITE],
    ['NaN üretici minimumu', { fabMinimum: NaN }, CC_ERR_NOT_FINITE],
  ]

  it.each(bad)('clearance: %s reddedilir', (_label, patch, code) => {
    const r = computeClearance({ profile: null, ...patch })
    expect(r.error).toBe(code)
    expectErrorShape(r, _label)
  })

  it.each(bad)('creepage: %s reddedilir', (_label, patch, code) => {
    const r = computeCreepage({ profile: null, ...patch })
    expect(r.error).toBe(code)
    expectErrorShape(r, _label)
  })

  it('sonuçlarda NaN ya da Infinity bulunmaz', () => {
    const r = computeClearance({ ...briefCase, profile: makeProfile() })
    for (const v of Object.values(r)) {
      if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true)
    }
  })
})

describe('sweep', () => {
  it('rakım süpürmesi profilin kapsadığı bandı verir, dışını doldurmaz', () => {
    const base = {
      profile: makeProfile(),
      workingVoltage: 100,
      pollutionDegree: '2',
      insulationType: 'temel',
    }
    const pts = buildClearanceAltitudeSweep(base, 0, 4000, 41)
    // 3000 m üstünde kural kapsamı biter ve başka sınır da yok → nokta yok
    expect(pts.length).toBeGreaterThan(0)
    expect(pts.every((p) => p.x <= 3000)).toBe(true)
    // Basamaklı: 2000 m altı 1.00 mm, üstü 1.25 mm
    expect(pts[0].y).toBeCloseTo(mm(1), 15)
    expect(pts[pts.length - 1].y).toBeCloseTo(mm(1.25), 15)
  })

  it('gerilim süpürmesi basamaklı sonuç verir', () => {
    const base = {
      profile: makeProfile(), pollutionDegree: '2', insulationType: 'temel', altitudeM: 0,
    }
    const pts = buildVoltageSweep(base, 0, 600, 61)
    expect(pts[0].y).toBeCloseTo(mm(1), 15)
    expect(pts[pts.length - 1].y).toBeCloseTo(mm(2), 15)
    // Yalnızca iki farklı seviye — sürekli bir eğri değil
    const levels = new Set(pts.map((p) => p.y))
    expect(levels.size).toBe(2)
  })

  it('geçersiz sweep parametreleri boş dizi döner', () => {
    expect(buildClearanceAltitudeSweep({}, NaN, 1, 10)).toEqual([])
    expect(buildVoltageSweep({}, 0, 1, 1)).toEqual([])
  })
})
