import { describe, it, expect } from 'vitest'
import {
  validateClearanceProfile, createClearanceProfileStore,
  parseClearanceProfileJson, clearanceProfileToJson,
  rulesToSI, profileKeyOptions, normalizeKey, profileId,
  CLEARANCE_PROFILE_SCHEMA, SCHEMA_VERSION, NAME_MAX, KEY_MAX, PROFILE_MAX,
  CLEAR_ERR_SCHEMA, CLEAR_ERR_VERSION, CLEAR_ERR_NAME, CLEAR_ERR_SOURCE,
  CLEAR_ERR_RULES, CLEAR_ERR_RULE_FIELD, CLEAR_ERR_RANGE, CLEAR_ERR_GROUPS,
  CLEAR_ERR_FACTORS, CLEAR_ERR_STORAGE, CLEAR_ERR_LIMIT, CLEAR_ERR_PARSE,
  CLEAR_ERR_NOT_FOUND,
  CLEAR_VARIANT_NOT_OBJECT, CLEAR_VARIANT_NOT_ARRAY, CLEAR_VARIANT_SCHEMA_NAME,
  CLEAR_VARIANT_EMPTY, CLEAR_VARIANT_TOO_LONG, CLEAR_VARIANT_NOT_NUMBER,
  CLEAR_VARIANT_NEGATIVE, CLEAR_VARIANT_NOT_POSITIVE, CLEAR_VARIANT_NOT_STRING,
  CLEAR_VARIANT_MIN_OVER_MAX,
} from './clearanceProfile'
import { memoryStorage, nullStorage, STORAGE_ERR_UNAVAILABLE } from './storage'
import { expectErrorShape } from './errorShape.testkit'

// Testlerdeki bütün sayılar TEMSİLİDİR. Hiçbir yayınlanmış karar tablosundan
// alınmamıştır; yalnızca zarfın biçimini ve doğrulamayı sınarlar.

function profile(overrides = {}) {
  return {
    schema: CLEARANCE_PROFILE_SCHEMA,
    schemaVersion: SCHEMA_VERSION,
    name: 'Temsili profil',
    source: { title: 'Kullanici notu', revision: 'r1', note: '' },
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
        coating: 'kaplamasiz',
        minimumDistanceMm: 1,
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
}

describe('validateClearanceProfile — geçerli zarf', () => {
  const { profile: p, error } = validateClearanceProfile(profile())

  it('profili normalleştirip döner', () => {
    expect(error).toBeUndefined()
    expect(p.id).toBe(profileId('Temsili profil'))
    expect(p.clearanceRules).toHaveLength(1)
    expect(p.creepageRules).toHaveLength(1)
    expect(p.altitudeFactors).toHaveLength(2)
    expect(p.materialGroups).toHaveLength(2)
  })

  it('anahtar alanları normalleşir', () => {
    expect(p.clearanceRules[0].insulationType).toBe('temel')
    const upper = validateClearanceProfile(profile({
      clearanceRules: [{ insulationType: '  TEMEL  ', minimumDistanceMm: 1 }],
    }))
    expect(upper.profile.clearanceRules[0].insulationType).toBe('temel')
  })

  it('belirtilmeyen kısıtlar null kalır — serbest boyut demektir', () => {
    expect(p.clearanceRules[0].minImpulseVoltage).toBeNull()
    expect(p.clearanceRules[0].maxAltitudeM).toBeNull()
  })

  it('kaynak künyesi taşınır ama tablo içeriği taşınmaz', () => {
    expect(p.source.title).toBe('Kullanici notu')
    expect(p.source.revision).toBe('r1')
    expect(p.source.note).toBe('')
  })

  it('yalnızca clearance kuralı olan profil geçerlidir', () => {
    const r = validateClearanceProfile(profile({ creepageRules: [] }))
    expect(r.error).toBeUndefined()
    expect(r.profile.creepageRules).toEqual([])
  })

  it('sıfır mesafe geçerlidir', () => {
    const r = validateClearanceProfile(profile({
      clearanceRules: [{ minimumDistanceMm: 0 }], creepageRules: [],
    }))
    expect(r.error).toBeUndefined()
  })
})

describe('validateClearanceProfile — reddedilen zarflar', () => {
  const cases = [
    ['nesne değil', null, CLEAR_ERR_SCHEMA, CLEAR_VARIANT_NOT_OBJECT],
    ['şema adı yanlış', profile({ schema: 'x' }), CLEAR_ERR_SCHEMA, CLEAR_VARIANT_SCHEMA_NAME],
    ['sürüm yanlış', profile({ schemaVersion: 2 }), CLEAR_ERR_VERSION, undefined],
    ['ad boş', profile({ name: ' ' }), CLEAR_ERR_NAME, CLEAR_VARIANT_EMPTY],
    ['ad uzun', profile({ name: 'a'.repeat(NAME_MAX + 1) }), CLEAR_ERR_NAME, CLEAR_VARIANT_TOO_LONG],
    ['kaynak nesne değil', profile({ source: [] }), CLEAR_ERR_SOURCE, CLEAR_VARIANT_NOT_OBJECT],
    ['kaynak alanı dize değil', profile({ source: { title: 5 } }), CLEAR_ERR_SOURCE, CLEAR_VARIANT_NOT_STRING],
    ['kural listesi dizi değil', profile({ clearanceRules: {} }), CLEAR_ERR_RULES, CLEAR_VARIANT_NOT_ARRAY],
    ['iki liste de boş', profile({ clearanceRules: [], creepageRules: [] }), CLEAR_ERR_RULES, CLEAR_VARIANT_EMPTY],
  ]

  it.each(cases)('%s reddedilir', (_label, input, code, variant) => {
    const r = validateClearanceProfile(input)
    expect(r.error).toBe(code)
    if (variant !== undefined) expect(r.variant).toBe(variant)
    expect(r.profile).toBeUndefined()
    expectErrorShape(r, _label)
  })
})

describe('validateClearanceProfile — kural doğrulaması', () => {
  const badRule = (rule) => validateClearanceProfile(profile({ clearanceRules: [rule] }))

  it('mesafe eksikse reddedilir', () => {
    const r = badRule({ minWorkingVoltage: 0 })
    expect(r.error).toBe(CLEAR_ERR_RULE_FIELD)
    expect(r.field).toBe('minimumDistanceMm')
    expect(r.variant).toBe(CLEAR_VARIANT_NOT_NUMBER)
    expect(r.index).toBe(0)
    expectErrorShape(r, 'distance-missing')
  })

  it('negatif mesafe reddedilir', () => {
    const r = badRule({ minimumDistanceMm: -1 })
    expect(r.variant).toBe(CLEAR_VARIANT_NEGATIVE)
  })

  it('sonsuz mesafe reddedilir', () => {
    expect(badRule({ minimumDistanceMm: Infinity }).variant).toBe(CLEAR_VARIANT_NOT_NUMBER)
  })

  it('ters aralık reddedilir', () => {
    const r = badRule({ minWorkingVoltage: 300, maxWorkingVoltage: 100, minimumDistanceMm: 1 })
    expect(r.error).toBe(CLEAR_ERR_RANGE)
    expect(r.variant).toBe(CLEAR_VARIANT_MIN_OVER_MAX)
    expectErrorShape(r, 'range')
  })

  it('anahtar dize değilse reddedilir', () => {
    const r = badRule({ pollutionDegree: 2, minimumDistanceMm: 1 })
    expect(r.variant).toBe(CLEAR_VARIANT_NOT_STRING)
  })

  it('uzun anahtar reddedilir', () => {
    const r = badRule({ coating: 'a'.repeat(KEY_MAX + 1), minimumDistanceMm: 1 })
    expect(r.variant).toBe(CLEAR_VARIANT_TOO_LONG)
  })

  it('hata yükü kullanıcının profil metnini taşımaz', () => {
    const r = validateClearanceProfile(profile({
      clearanceRules: [{ pollutionDegree: 'çok kirli ortam koşulu', minimumDistanceMm: -1 }],
    }))
    expect(r.error).toBe(CLEAR_ERR_RULE_FIELD)
    // Yük yalnızca liste adı, sıra ve alan anahtarı taşır
    expectErrorShape(r, 'no-user-text')
  })

  it('kural sırası hatada bildirilir', () => {
    const r = validateClearanceProfile(profile({
      clearanceRules: [
        { minimumDistanceMm: 1 },
        { minimumDistanceMm: 1 },
        { minimumDistanceMm: 'x' },
      ],
    }))
    expect(r.index).toBe(2)
    expect(r.list).toBe('clearanceRules')
  })
})

describe('validateClearanceProfile — düzeltme katsayıları', () => {
  it('katsayı pozitif olmalı', () => {
    const r = validateClearanceProfile(profile({
      altitudeFactors: [{ minAltitudeM: 0, maxAltitudeM: 2000, factor: 0 }],
    }))
    expect(r.error).toBe(CLEAR_ERR_FACTORS)
    expect(r.variant).toBe(CLEAR_VARIANT_NOT_POSITIVE)
    expectErrorShape(r, 'factor')
  })

  it('katsayı eksikse reddedilir', () => {
    const r = validateClearanceProfile(profile({ altitudeFactors: [{ minAltitudeM: 0 }] }))
    expect(r.variant).toBe(CLEAR_VARIANT_NOT_NUMBER)
  })

  it('ters bant reddedilir', () => {
    const r = validateClearanceProfile(profile({
      altitudeFactors: [{ minAltitudeM: 3000, maxAltitudeM: 2000, factor: 1 }],
    }))
    expect(r.variant).toBe(CLEAR_VARIANT_MIN_OVER_MAX)
  })

  it('düzeltme listesi isteğe bağlıdır', () => {
    const r = validateClearanceProfile(profile({ altitudeFactors: undefined }))
    expect(r.error).toBeUndefined()
    expect(r.profile.altitudeFactors).toEqual([])
  })

  it('creepage düzeltmesi ayrı listedir', () => {
    const r = validateClearanceProfile(profile({
      creepageFactors: [{ minAltitudeM: 0, maxAltitudeM: 5000, factor: 1.1 }],
    }))
    expect(r.profile.creepageFactors).toHaveLength(1)
  })
})

describe('validateClearanceProfile — malzeme grupları', () => {
  it('grup kimliği zorunludur', () => {
    const r = validateClearanceProfile(profile({ materialGroups: [{ minCti: 600 }] }))
    expect(r.error).toBe(CLEAR_ERR_GROUPS)
    expect(r.variant).toBe(CLEAR_VARIANT_EMPTY)
    expectErrorShape(r, 'group-id')
  })

  it('ters CTI bandı reddedilir', () => {
    const r = validateClearanceProfile(profile({
      materialGroups: [{ id: 'g', minCti: 600, maxCti: 400 }],
    }))
    expect(r.variant).toBe(CLEAR_VARIANT_MIN_OVER_MAX)
  })

  it('grup listesi dizi değilse reddedilir', () => {
    const r = validateClearanceProfile(profile({ materialGroups: 'g' }))
    expect(r.variant).toBe(CLEAR_VARIANT_NOT_ARRAY)
  })

  it('grup listesi isteğe bağlıdır', () => {
    const r = validateClearanceProfile(profile({ materialGroups: undefined }))
    expect(r.profile.materialGroups).toEqual([])
  })
})

describe('rulesToSI ve anahtar seçenekleri', () => {
  it('mm mesafeleri metreye çevirir', () => {
    const { profile: p } = validateClearanceProfile(profile())
    const si = rulesToSI(p.clearanceRules)
    expect(si[0].minimumDistance).toBeCloseTo(1e-3, 15)
    // Zarf değeri değişmeden kalır
    expect(si[0].minimumDistanceMm).toBe(1)
  })

  it('profilde geçen anahtarları listeler', () => {
    const { profile: p } = validateClearanceProfile(profile({
      clearanceRules: [
        { pollutionDegree: '1', minimumDistanceMm: 1 },
        { pollutionDegree: '2', minimumDistanceMm: 2 },
        { pollutionDegree: '2', minimumDistanceMm: 3 },
        { minimumDistanceMm: 4 },
      ],
    }))
    expect(profileKeyOptions(p, 'clearanceRules', 'pollutionDegree')).toEqual(['1', '2'])
  })

  it('boş girdide çökmez', () => {
    expect(rulesToSI(null)).toEqual([])
    expect(profileKeyOptions(null, 'clearanceRules', 'coating')).toEqual([])
  })

  it('normalizeKey boş dizeyi null yapar', () => {
    expect(normalizeKey('  ')).toBeNull()
    expect(normalizeKey(5)).toBeNull()
    expect(normalizeKey(' İki  Kelime ')).toBe('iki kelime')
  })
})

describe('JSON içe / dışa aktarma', () => {
  it('bozuk JSON tarayıcı istisnasının metnini taşımaz', () => {
    const r = parseClearanceProfileJson('{{')
    expect(r.error).toBe(CLEAR_ERR_PARSE)
    expectErrorShape(r, 'parse')
  })

  it('dışa aktarılan zarf geri okunduğunda aynı profili verir', () => {
    const { json } = clearanceProfileToJson(profile())
    const back = parseClearanceProfileJson(json)
    expect(back.profile).toEqual(validateClearanceProfile(profile()).profile)
    expect(JSON.parse(json)).not.toHaveProperty('id')
  })

  it('geçersiz profil dışa aktarılmaz', () => {
    const r = clearanceProfileToJson(profile({ name: '' }))
    expect(r.error).toBe(CLEAR_ERR_NAME)
    expect(r.json).toBeUndefined()
  })
})

describe('createClearanceProfileStore', () => {
  it('depolama portu olmadan kurulmaz', () => {
    expect(() => createClearanceProfileStore(null)).toThrow(TypeError)
  })

  it('kaydeder, listeler, siler', () => {
    const store = createClearanceProfileStore(memoryStorage())
    expect(store.save(profile()).error).toBeUndefined()
    expect(store.list()).toHaveLength(1)
    expect(store.remove(profileId('Temsili profil')).ok).toBe(true)
    expect(store.list()).toEqual([])
  })

  it('kayıt sınırı aşılınca açık hata döner', () => {
    const store = createClearanceProfileStore(memoryStorage())
    for (let i = 0; i < PROFILE_MAX; i += 1) store.save(profile({ name: `P${i}` }))
    const r = store.save(profile({ name: 'Fazladan' }))
    expect(r.error).toBe(CLEAR_ERR_LIMIT)
    expectErrorShape(r, 'limit')
  })

  it('depoya yazılamıyorsa açık hata döner', () => {
    const store = createClearanceProfileStore(nullStorage)
    const r = store.save(profile())
    expect(r.error).toBe(CLEAR_ERR_STORAGE)
    expect(r.cause).toBe(STORAGE_ERR_UNAVAILABLE)
    expectErrorShape(r, 'storage')
  })

  it('şema sürümü uymayan kayıt listeye alınmaz', () => {
    const stale = JSON.stringify([{ ...profile(), schemaVersion: 0 }])
    const store = createClearanceProfileStore(
      memoryStorage({ 'alp-pcb.clearance-profiles.v1': stale }),
    )
    expect(store.list()).toEqual([])
  })

  it('aktif profil seçilir, silinince düşer', () => {
    const store = createClearanceProfileStore(memoryStorage())
    store.save(profile())
    const id = profileId('Temsili profil')
    expect(store.setActive(id).ok).toBe(true)
    expect(store.active().name).toBe('Temsili profil')
    store.remove(id)
    expect(store.activeId()).toBeNull()
  })

  it('olmayan profil aktif seçilemez', () => {
    const store = createClearanceProfileStore(memoryStorage())
    const r = store.setActive('yok')
    expect(r.error).toBe(CLEAR_ERR_NOT_FOUND)
    expectErrorShape(r, 'not-found')
  })
})
