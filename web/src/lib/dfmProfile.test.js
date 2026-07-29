import { describe, it, expect } from 'vitest'
import {
  validateProfile, createDfmProfileStore, parseProfileJson, profileToJson,
  emptyProfile, emptyLimits, limitsToSI, noProfileLimits,
  normalizeName, profileId,
  DFM_SCHEMA, SCHEMA_VERSION, PROFILE_UNIT, PROFILE_UNITS,
  NAME_MAX, NOTES_MAX, PROFILE_MAX, LIMIT_KEYS,
  DFM_ERR_SCHEMA, DFM_ERR_VERSION, DFM_ERR_NAME, DFM_ERR_NOTES, DFM_ERR_UNITS,
  DFM_ERR_LIMITS, DFM_ERR_FIELD, DFM_ERR_UNKNOWN_FIELD, DFM_ERR_ORDER,
  DFM_ERR_STORAGE, DFM_ERR_LIMIT, DFM_ERR_PARSE,
  DFM_VARIANT_NOT_OBJECT, DFM_VARIANT_SCHEMA_NAME, DFM_VARIANT_EMPTY,
  DFM_VARIANT_TOO_LONG, DFM_VARIANT_NOT_NUMBER, DFM_VARIANT_POSITIVE,
  DFM_VARIANT_NON_NEGATIVE, DFM_VARIANT_NOT_INTEGER, DFM_VARIANT_NOT_BOOLEAN,
  DFM_VARIANT_PERCENT_RANGE,
} from './dfmProfile'
import { memoryStorage, nullStorage, STORAGE_ERR_UNAVAILABLE } from './storage'
import { expectErrorShape } from './errorShape.testkit'

// Zarf birimi mm'dir; hesap motorları SI görür. Elle doğrulanan dönüşüm:
//   0.15 mm → 0.00015 m
//   0.075 mm → 0.000075 m
// Oran, yüzde, sayı ve bayrak alanları dönüşüme girmez.

function profile(overrides = {}) {
  return {
    schema: DFM_SCHEMA,
    schemaVersion: SCHEMA_VERSION,
    name: 'Örnek profil',
    notes: 'Temsili veri — gerçek bir üreticinin yetenekleri değildir.',
    units: PROFILE_UNIT,
    limits: {
      minTraceWidth: 0.1,
      minAnnularRing: 0.05,
      maxPthAspectRatio: 8,
      minLayerCount: 2,
      maxLayerCount: 8,
      viaInPadSupported: true,
    },
    ...overrides,
  }
}

describe('validateProfile — geçerli zarf', () => {
  it('geçerli profili normalleştirip döner', () => {
    const { profile: p, error } = validateProfile(profile())
    expect(error).toBeUndefined()
    expect(p.id).toBe('örnek profil')
    expect(p.name).toBe('Örnek profil')
    expect(p.units).toBe(PROFILE_UNIT)
    expect(p.limits.minTraceWidth).toBe(0.1)
    expect(p.limits.maxPthAspectRatio).toBe(8)
    expect(p.limits.viaInPadSupported).toBe(true)
  })

  it('verilmeyen sınırlar null kalır — sıfıra ya da varsayılana dönüşmez', () => {
    const { profile: p } = validateProfile(profile())
    expect(p.limits.minThermalGap).toBeNull()
    expect(p.limits.minFinishedHole).toBeNull()
    expect(p.limits.microviaSupported).toBeNull()
    // Zarf her zaman tam alan kümesini taşır
    expect(Object.keys(p.limits).sort()).toEqual([...LIMIT_KEYS].sort())
  })

  it('açıkça null verilen sınır tanımsız sayılır', () => {
    const { profile: p } = validateProfile(profile({
      limits: { minTraceWidth: null, minAnnularRing: 0.05 },
    }))
    expect(p.limits.minTraceWidth).toBeNull()
    expect(p.limits.minAnnularRing).toBe(0.05)
  })

  it('notes alanı isteğe bağlıdır', () => {
    const { profile: p } = validateProfile(profile({ notes: undefined }))
    expect(p.notes).toBe('')
  })

  it('ad içindeki fazla boşluk tekleşir, kimlik ondan türer', () => {
    expect(normalizeName('  A   B ')).toBe('A B')
    expect(profileId('  Üst   Kat ')).toBe('üst kat')
  })

  it('sıfır tolerans geçerlidir — tanımsız değil, sıfır demektir', () => {
    const { profile: p } = validateProfile(profile({
      limits: { drillTolerancePlus: 0, registrationTolerance: 0 },
    }))
    expect(p.limits.drillTolerancePlus).toBe(0)
    expect(p.limits.registrationTolerance).toBe(0)
  })

  it('solder mask genişlemesi negatif olabilir (mask ile tanımlı pad)', () => {
    const { profile: p, error } = validateProfile(profile({
      limits: { solderMaskExpansion: -0.025 },
    }))
    expect(error).toBeUndefined()
    expect(p.limits.solderMaskExpansion).toBe(-0.025)
  })
})

describe('validateProfile — reddedilen zarflar', () => {
  const cases = [
    ['nesne değil', null, DFM_ERR_SCHEMA, DFM_VARIANT_NOT_OBJECT],
    ['dizi', [], DFM_ERR_SCHEMA, DFM_VARIANT_NOT_OBJECT],
    ['şema adı yanlış', profile({ schema: 'baska-sema' }), DFM_ERR_SCHEMA, DFM_VARIANT_SCHEMA_NAME],
    ['şema sürümü yanlış', profile({ schemaVersion: 2 }), DFM_ERR_VERSION, undefined],
    ['ad boş', profile({ name: '   ' }), DFM_ERR_NAME, DFM_VARIANT_EMPTY],
    ['ad uzun', profile({ name: 'a'.repeat(NAME_MAX + 1) }), DFM_ERR_NAME, DFM_VARIANT_TOO_LONG],
    ['not uzun', profile({ notes: 'a'.repeat(NOTES_MAX + 1) }), DFM_ERR_NOTES, DFM_VARIANT_TOO_LONG],
    ['not dize değil', profile({ notes: 5 }), DFM_ERR_NOTES, DFM_VARIANT_NOT_OBJECT],
    ['birim yanlış', profile({ units: 'mil' }), DFM_ERR_UNITS, undefined],
    ['birim eksik', profile({ units: undefined }), DFM_ERR_UNITS, undefined],
    ['limits nesne değil', profile({ limits: null }), DFM_ERR_LIMITS, DFM_VARIANT_NOT_OBJECT],
  ]

  it.each(cases)('%s reddedilir', (_label, input, code, variant) => {
    const r = validateProfile(input)
    expect(r.error).toBe(code)
    if (variant !== undefined) expect(r.variant).toBe(variant)
    expect(r.profile).toBeUndefined()
    expectErrorShape(r, _label)
  })

  it('eski sürüm sessizce okunmaz, beklenen/bulunan sürümü bildirir', () => {
    const r = validateProfile(profile({ schemaVersion: 0 }))
    expect(r.error).toBe(DFM_ERR_VERSION)
    expect(r.expected).toBe(SCHEMA_VERSION)
    expect(r.found).toBe(0)
  })
})

describe('validateProfile — sınır alanı doğrulaması', () => {
  const bad = [
    ['tanınmayan alan', { minTraceWidht: 0.1 }, DFM_ERR_UNKNOWN_FIELD, undefined],
    ['sayı değil', { minTraceWidth: '0.1' }, DFM_ERR_FIELD, DFM_VARIANT_NOT_NUMBER],
    ['NaN', { minTraceWidth: NaN }, DFM_ERR_FIELD, DFM_VARIANT_NOT_NUMBER],
    ['Infinity', { minTraceWidth: Infinity }, DFM_ERR_FIELD, DFM_VARIANT_NOT_NUMBER],
    ['sıfır olamaz', { minTraceWidth: 0 }, DFM_ERR_FIELD, DFM_VARIANT_POSITIVE],
    ['negatif olamaz', { minTraceWidth: -0.1 }, DFM_ERR_FIELD, DFM_VARIANT_POSITIVE],
    ['tolerans negatif olamaz', { drillTolerancePlus: -0.01 }, DFM_ERR_FIELD, DFM_VARIANT_NON_NEGATIVE],
    ['oran sıfır olamaz', { maxPthAspectRatio: 0 }, DFM_ERR_FIELD, DFM_VARIANT_POSITIVE],
    ['katman sayısı tam sayı olmalı', { minLayerCount: 2.5 }, DFM_ERR_FIELD, DFM_VARIANT_NOT_INTEGER],
    ['yüzde 100 üstü olamaz', { boardThicknessTolerancePercent: 120 }, DFM_ERR_FIELD, DFM_VARIANT_PERCENT_RANGE],
    ['yüzde negatif olamaz', { boardThicknessTolerancePercent: -1 }, DFM_ERR_FIELD, DFM_VARIANT_PERCENT_RANGE],
    ['bayrak boolean olmalı', { viaInPadSupported: 'yes' }, DFM_ERR_FIELD, DFM_VARIANT_NOT_BOOLEAN],
    ['bayrak sayı olamaz', { viaInPadSupported: 1 }, DFM_ERR_FIELD, DFM_VARIANT_NOT_BOOLEAN],
  ]

  it.each(bad)('%s reddedilir', (_label, limits, code, variant) => {
    const r = validateProfile(profile({ limits }))
    expect(r.error).toBe(code)
    if (variant !== undefined) expect(r.variant).toBe(variant)
    expectErrorShape(r, _label)
  })

  it('tanınmayan alan, hangi anahtarın geçersiz olduğunu bildirir', () => {
    const r = validateProfile(profile({ limits: { minTraceWidht: 0.1 } }))
    expect(r.field).toBe('minTraceWidht')
    expect(r.valid).toEqual(LIMIT_KEYS)
  })

  it('tutarsız min/max çifti reddedilir', () => {
    const r = validateProfile(profile({
      limits: { minBoardThickness: 2, maxBoardThickness: 1 },
    }))
    expect(r.error).toBe(DFM_ERR_ORDER)
    expect(r.low).toBe('minBoardThickness')
    expect(r.high).toBe('maxBoardThickness')
    expectErrorShape(r, 'order')
  })

  it('tutarsız katman sayısı çifti reddedilir', () => {
    const r = validateProfile(profile({ limits: { minLayerCount: 8, maxLayerCount: 4 } }))
    expect(r.error).toBe(DFM_ERR_ORDER)
  })

  it('eşit min/max çifti geçerlidir', () => {
    const r = validateProfile(profile({ limits: { minLayerCount: 4, maxLayerCount: 4 } }))
    expect(r.error).toBeUndefined()
  })
})

describe('limitsToSI', () => {
  it('uzunlukları metreye çevirir, diğer türleri olduğu gibi bırakır', () => {
    const si = limitsToSI({
      minTraceWidth: 0.15,
      minAnnularRing: 0.075,
      solderMaskExpansion: -0.025,
      maxPthAspectRatio: 10,
      boardThicknessTolerancePercent: 10,
      minLayerCount: 4,
      viaInPadSupported: false,
    })
    expect(si.minTraceWidth).toBeCloseTo(0.00015, 15)
    expect(si.minAnnularRing).toBeCloseTo(0.000075, 15)
    expect(si.solderMaskExpansion).toBeCloseTo(-0.000025, 15)
    expect(si.maxPthAspectRatio).toBe(10)
    expect(si.boardThicknessTolerancePercent).toBe(10)
    expect(si.minLayerCount).toBe(4)
    expect(si.viaInPadSupported).toBe(false)
  })

  it('tanımsız sınır null kalır — sıfıra dönüşmez', () => {
    const si = limitsToSI({ minTraceWidth: 0.1 })
    expect(si.minThermalGap).toBeNull()
    expect(si.maxPthAspectRatio).toBeNull()
  })

  it('profil yokken bütün sınırlar null döner', () => {
    const si = noProfileLimits()
    expect(Object.keys(si).sort()).toEqual([...LIMIT_KEYS].sort())
    expect(Object.values(si).every((v) => v === null)).toBe(true)
  })

  it('boş girdi çökmez', () => {
    expect(limitsToSI(null).minTraceWidth).toBeNull()
    expect(limitsToSI(undefined).minTraceWidth).toBeNull()
  })
})

describe('emptyProfile / emptyLimits', () => {
  it('boş profil hiçbir sayı taşımaz — hazır üretici değeri yoktur', () => {
    const p = emptyProfile('Yeni')
    expect(p.schema).toBe(DFM_SCHEMA)
    expect(p.schemaVersion).toBe(SCHEMA_VERSION)
    expect(p.units).toBe(PROFILE_UNIT)
    expect(Object.values(p.limits).every((v) => v === null)).toBe(true)
    expect(Object.keys(emptyLimits())).toHaveLength(LIMIT_KEYS.length)
  })

  it('adlandırılmış boş profil doğrulamayı geçer', () => {
    expect(validateProfile(emptyProfile('Yeni')).error).toBeUndefined()
  })

  it('adsız boş profil doğrulamayı geçmez', () => {
    expect(validateProfile(emptyProfile()).error).toBe(DFM_ERR_NAME)
  })
})

describe('JSON içe / dışa aktarma', () => {
  it('geçerli JSON okunur', () => {
    const r = parseProfileJson(JSON.stringify(profile()))
    expect(r.error).toBeUndefined()
    expect(r.profile.name).toBe('Örnek profil')
  })

  it('bozuk JSON tarayıcı istisnasının metnini taşımaz', () => {
    const r = parseProfileJson('{ bozuk')
    expect(r.error).toBe(DFM_ERR_PARSE)
    expectErrorShape(r, 'parse')
  })

  it('geçersiz şema içeren JSON reddedilir', () => {
    const r = parseProfileJson(JSON.stringify({ schema: 'x', schemaVersion: 1 }))
    expect(r.error).toBe(DFM_ERR_SCHEMA)
  })

  it('dışa aktarılan zarf geri okunduğunda aynı profili verir', () => {
    const { json } = profileToJson(profile())
    const back = parseProfileJson(json)
    expect(back.profile).toEqual(validateProfile(profile()).profile)
  })

  it('dışa aktarılan zarfta türetilmiş kimlik bulunmaz', () => {
    const { json } = profileToJson(profile())
    expect(JSON.parse(json)).not.toHaveProperty('id')
    expect(JSON.parse(json).schema).toBe(DFM_SCHEMA)
  })

  it('geçersiz profil dışa aktarılmaz', () => {
    const r = profileToJson(profile({ units: 'mil' }))
    expect(r.error).toBe(DFM_ERR_UNITS)
    expect(r.json).toBeUndefined()
  })
})

describe('createDfmProfileStore', () => {
  it('depolama portu olmadan kurulmaz', () => {
    expect(() => createDfmProfileStore(null)).toThrow(TypeError)
  })

  it('kaydeder, listeler ve okur', () => {
    const store = createDfmProfileStore(memoryStorage())
    const r = store.save(profile())
    expect(r.error).toBeUndefined()
    expect(store.list()).toHaveLength(1)
    expect(store.get('örnek profil').limits.minTraceWidth).toBe(0.1)
    expect(store.get('yok')).toBeNull()
  })

  it('aynı ad üzerine yazar, çoğaltmaz', () => {
    const store = createDfmProfileStore(memoryStorage())
    store.save(profile())
    store.save(profile({ limits: { minTraceWidth: 0.2 } }))
    expect(store.list()).toHaveLength(1)
    expect(store.get('örnek profil').limits.minTraceWidth).toBe(0.2)
  })

  it('geçersiz profil kaydedilmez', () => {
    const store = createDfmProfileStore(memoryStorage())
    const r = store.save(profile({ units: 'mil' }))
    expect(r.error).toBe(DFM_ERR_UNITS)
    expect(store.list()).toHaveLength(0)
  })

  it('siler', () => {
    const store = createDfmProfileStore(memoryStorage())
    store.save(profile())
    expect(store.remove('örnek profil').ok).toBe(true)
    expect(store.list()).toHaveLength(0)
  })

  it('kayıt sınırı aşılınca açık hata döner, en eskiyi atmaz', () => {
    const store = createDfmProfileStore(memoryStorage())
    for (let i = 0; i < PROFILE_MAX; i += 1) store.save(profile({ name: `Profil ${i}` }))
    const r = store.save(profile({ name: 'Fazladan' }))
    expect(r.error).toBe(DFM_ERR_LIMIT)
    expect(r.limit).toBe(PROFILE_MAX)
    expect(store.list()).toHaveLength(PROFILE_MAX)
    expectErrorShape(r, 'limit')
  })

  it('sınırdaki profilin üzerine yazmak engellenmez', () => {
    const store = createDfmProfileStore(memoryStorage())
    for (let i = 0; i < PROFILE_MAX; i += 1) store.save(profile({ name: `Profil ${i}` }))
    const r = store.save(profile({ name: 'Profil 0', limits: { minTraceWidth: 0.3 } }))
    expect(r.error).toBeUndefined()
    expect(store.get('profil 0').limits.minTraceWidth).toBe(0.3)
  })

  it('depoya yazılamıyorsa açık hata döner ve tarayıcı metni sızmaz', () => {
    const store = createDfmProfileStore(nullStorage)
    const r = store.save(profile())
    expect(r.error).toBe(DFM_ERR_STORAGE)
    expect(r.cause).toBe(STORAGE_ERR_UNAVAILABLE)
    expectErrorShape(r, 'storage')
  })

  it('bozuk depo içeriği çökmez, kayıt yokmuş gibi davranır', () => {
    const store = createDfmProfileStore(memoryStorage({ 'alp-pcb.dfm-profiles.v1': '{ bozuk' }))
    expect(store.list()).toEqual([])
  })

  it('şema sürümü uymayan kayıt listeye alınmaz', () => {
    const stale = JSON.stringify([{ ...profile(), schemaVersion: 0 }])
    const store = createDfmProfileStore(memoryStorage({ 'alp-pcb.dfm-profiles.v1': stale }))
    expect(store.list()).toEqual([])
  })
})

describe('aktif profil', () => {
  it('başlangıçta aktif profil yoktur', () => {
    const store = createDfmProfileStore(memoryStorage())
    expect(store.activeId()).toBeNull()
    expect(store.active()).toBeNull()
  })

  it('var olan profil aktif seçilebilir', () => {
    const store = createDfmProfileStore(memoryStorage())
    store.save(profile())
    expect(store.setActive('örnek profil').ok).toBe(true)
    expect(store.activeId()).toBe('örnek profil')
    expect(store.active().name).toBe('Örnek profil')
  })

  it('olmayan profil aktif seçilemez', () => {
    const store = createDfmProfileStore(memoryStorage())
    const r = store.setActive('yok')
    expect(r.error).toBe(DFM_ERR_FIELD)
    expectErrorShape(r, 'set-active')
  })

  it('aktif profil silinince aktiflik düşer', () => {
    const store = createDfmProfileStore(memoryStorage())
    store.save(profile())
    store.setActive('örnek profil')
    store.remove('örnek profil')
    expect(store.activeId()).toBeNull()
    expect(store.active()).toBeNull()
  })

  it('aktiflik null ile kaldırılabilir', () => {
    const store = createDfmProfileStore(memoryStorage())
    store.save(profile())
    store.setActive('örnek profil')
    expect(store.setActive(null).ok).toBe(true)
    expect(store.activeId()).toBeNull()
  })

  it('clear hem listeyi hem aktifliği temizler', () => {
    const store = createDfmProfileStore(memoryStorage())
    store.save(profile())
    store.setActive('örnek profil')
    expect(store.clear().ok).toBe(true)
    expect(store.list()).toEqual([])
    expect(store.activeId()).toBeNull()
  })
})

describe('birim sözleşmesi', () => {
  it('bu sürümde tek geçerli zarf birimi mm', () => {
    expect(PROFILE_UNITS).toEqual(['mm'])
  })
})
