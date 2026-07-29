import { describe, it, expect } from 'vitest'
import {
  validateStackup, createStackupStore, parseStackupJson, stackupToJson,
  stackupId, normalizeName,
  STACKUP_SCHEMA, SCHEMA_VERSION, NAME_MAX, LAYER_MAX, STACKUP_MAX,
  SP_ERR_SCHEMA, SP_ERR_VERSION, SP_ERR_NAME, SP_ERR_LAYERS, SP_ERR_LAYER_FIELD,
  SP_ERR_METADATA, SP_ERR_STORAGE, SP_ERR_LIMIT, SP_ERR_PARSE, SP_ERR_NOT_FOUND,
  SP_VARIANT_NOT_OBJECT, SP_VARIANT_NOT_ARRAY, SP_VARIANT_SCHEMA_NAME,
  SP_VARIANT_EMPTY, SP_VARIANT_TOO_LONG, SP_VARIANT_NOT_NUMBER,
  SP_VARIANT_NOT_POSITIVE, SP_VARIANT_UNKNOWN_VALUE, SP_VARIANT_NOT_STRING,
} from './stackupProfiles'
import {
  LAYER_COPPER, LAYER_CORE, LAYER_SOLDERMASK, LAYER_TYPES, LAYER_ROLES,
  ROLE_SIGNAL, ROLE_GROUND, ROLE_COATING, TOL_PERCENT, TOL_MODES,
} from './stackup'
import { memoryStorage, nullStorage, STORAGE_ERR_UNAVAILABLE } from './storage'
import { expectErrorShape } from './errorShape.testkit'

// Zarf mm saklar; hesap SI ile yapılır ve dönüşüm ekran modelindedir.
function stackup(overrides = {}) {
  return {
    schema: STACKUP_SCHEMA,
    schemaVersion: SCHEMA_VERSION,
    name: 'Dört katman',
    layers: [
      { type: LAYER_SOLDERMASK, role: ROLE_COATING, thickness: 0.02 },
      {
        type: LAYER_COPPER, role: ROLE_SIGNAL, name: 'L1', thickness: 0.035,
        copperCoveragePercent: 60,
      },
      {
        type: LAYER_CORE, role: null, material: 'FR-4', thickness: 1,
        toleranceMode: TOL_PERCENT, tolerancePlus: 10, toleranceMinus: 10,
        dielectricConstant: 4.5, lossTangent: 0.02,
      },
      { type: LAYER_COPPER, role: ROLE_GROUND, name: 'L2', thickness: 0.035 },
      { type: LAYER_SOLDERMASK, role: ROLE_COATING, thickness: 0.02 },
    ],
    metadata: { createdAt: '2026-07-29', updatedAt: '2026-07-29' },
    ...overrides,
  }
}

describe('validateStackup — geçerli zarf', () => {
  const { stackup: s, error } = validateStackup(stackup())

  it('yığını normalleştirip döner', () => {
    expect(error).toBeUndefined()
    expect(s.id).toBe(stackupId('Dört katman'))
    expect(s.layers).toHaveLength(5)
    expect(s.layers[2].dielectricConstant).toBe(4.5)
    expect(s.metadata.createdAt).toBe('2026-07-29')
  })

  it('verilmeyen sayısal alanlar null kalır', () => {
    expect(s.layers[0].dielectricConstant).toBeNull()
    expect(s.layers[3].copperCoveragePercent).toBeNull()
  })

  it('verilmeyen metin alanları boş dizeye düşer', () => {
    expect(s.layers[0].name).toBe('')
    expect(s.layers[0].material).toBe('')
  })

  it('tolerans kipi verilmezse mutlak kabul edilir', () => {
    expect(s.layers[0].toleranceMode).toBe(TOL_MODES[0])
    expect(s.layers[2].toleranceMode).toBe(TOL_PERCENT)
  })

  it('kimlik addan türer', () => {
    expect(normalizeName('  Dört   katman ')).toBe('Dört katman')
    expect(stackupId('  DÖRT KATMAN ')).toBe('dört katman')
  })

  it('zaman damgası dışarıdan gelir, motor üretmez', () => {
    const noMeta = validateStackup(stackup({ metadata: undefined }))
    expect(noMeta.stackup.metadata.createdAt).toBe('')
    expect(noMeta.stackup.metadata.updatedAt).toBe('')
  })
})

describe('validateStackup — reddedilen zarflar', () => {
  const cases = [
    ['nesne değil', null, SP_ERR_SCHEMA, SP_VARIANT_NOT_OBJECT],
    ['şema adı yanlış', stackup({ schema: 'x' }), SP_ERR_SCHEMA, SP_VARIANT_SCHEMA_NAME],
    ['sürüm yanlış', stackup({ schemaVersion: 9 }), SP_ERR_VERSION, undefined],
    ['ad boş', stackup({ name: '  ' }), SP_ERR_NAME, SP_VARIANT_EMPTY],
    ['ad uzun', stackup({ name: 'a'.repeat(NAME_MAX + 1) }), SP_ERR_NAME, SP_VARIANT_TOO_LONG],
    ['katman listesi dizi değil', stackup({ layers: {} }), SP_ERR_LAYERS, SP_VARIANT_NOT_ARRAY],
    ['katman listesi boş', stackup({ layers: [] }), SP_ERR_LAYERS, SP_VARIANT_EMPTY],
    ['metadata nesne değil', stackup({ metadata: [] }), SP_ERR_METADATA, SP_VARIANT_NOT_OBJECT],
    ['metadata alanı dize değil', stackup({ metadata: { createdAt: 5 } }), SP_ERR_METADATA, SP_VARIANT_NOT_STRING],
  ]

  it.each(cases)('%s reddedilir', (_label, input, code, variant) => {
    const r = validateStackup(input)
    expect(r.error).toBe(code)
    if (variant !== undefined) expect(r.variant).toBe(variant)
    expect(r.stackup).toBeUndefined()
    expectErrorShape(r, _label)
  })

  it('çok uzun katman listesi reddedilir', () => {
    const many = Array.from({ length: LAYER_MAX + 1 }, () => ({
      type: LAYER_CORE, thickness: 0.1,
    }))
    const r = validateStackup(stackup({ layers: many }))
    expect(r.error).toBe(SP_ERR_LAYERS)
    expect(r.variant).toBe(SP_VARIANT_TOO_LONG)
  })
})

describe('validateStackup — katman doğrulaması', () => {
  const withLayer = (layer) => validateStackup(stackup({ layers: [layer] }))

  it('tanınmayan tür reddedilir ve izinli liste bildirilir', () => {
    const r = withLayer({ type: 'resin', thickness: 0.1 })
    expect(r.error).toBe(SP_ERR_LAYER_FIELD)
    expect(r.field).toBe('type')
    expect(r.allowed).toEqual(LAYER_TYPES)
    expectErrorShape(r, 'type')
  })

  it('tanınmayan rol reddedilir', () => {
    const r = withLayer({ type: LAYER_COPPER, role: 'shield', thickness: 0.035 })
    expect(r.field).toBe('role')
    expect(r.allowed).toEqual(LAYER_ROLES)
  })

  it('kalınlık zorunludur ve pozitif olmalı', () => {
    expect(withLayer({ type: LAYER_CORE }).variant).toBe(SP_VARIANT_NOT_NUMBER)
    expect(withLayer({ type: LAYER_CORE, thickness: 0 }).variant).toBe(SP_VARIANT_NOT_POSITIVE)
    expect(withLayer({ type: LAYER_CORE, thickness: -1 }).variant).toBe(SP_VARIANT_NOT_POSITIVE)
    expect(withLayer({ type: LAYER_CORE, thickness: NaN }).variant).toBe(SP_VARIANT_NOT_NUMBER)
  })

  it('doluluk yüzdesi 100 üstünde olamaz', () => {
    const r = withLayer({ type: LAYER_COPPER, thickness: 0.035, copperCoveragePercent: 120 })
    expect(r.error).toBe(SP_ERR_LAYER_FIELD)
    expect(r.field).toBe('copperCoveragePercent')
  })

  it('tanınmayan tolerans kipi reddedilir', () => {
    const r = withLayer({ type: LAYER_CORE, thickness: 1, toleranceMode: 'sigma' })
    expect(r.field).toBe('toleranceMode')
    expect(r.variant).toBe(SP_VARIANT_UNKNOWN_VALUE)
  })

  it('hata yükü katman sırasını bildirir, kullanıcı metnini taşımaz', () => {
    const r = validateStackup(stackup({
      layers: [
        { type: LAYER_CORE, thickness: 1 },
        { type: LAYER_CORE, name: 'Üst çekirdek katman', thickness: -1 },
      ],
    }))
    expect(r.index).toBe(1)
    expectErrorShape(r, 'no-user-text')
  })
})

describe('JSON içe / dışa aktarma', () => {
  it('bozuk JSON tarayıcı istisnasının metnini taşımaz', () => {
    const r = parseStackupJson(']]')
    expect(r.error).toBe(SP_ERR_PARSE)
    expectErrorShape(r, 'parse')
  })

  it('dışa aktarılan zarf geri okunduğunda aynı yığını verir', () => {
    const { json } = stackupToJson(stackup())
    expect(parseStackupJson(json).stackup).toEqual(validateStackup(stackup()).stackup)
    expect(JSON.parse(json)).not.toHaveProperty('id')
  })

  it('geçersiz yığın dışa aktarılmaz', () => {
    const r = stackupToJson(stackup({ name: '' }))
    expect(r.error).toBe(SP_ERR_NAME)
    expect(r.json).toBeUndefined()
  })
})

describe('createStackupStore', () => {
  it('depolama portu olmadan kurulmaz', () => {
    expect(() => createStackupStore(null)).toThrow(TypeError)
  })

  it('kaydeder, okur, siler', () => {
    const store = createStackupStore(memoryStorage())
    expect(store.save(stackup()).error).toBeUndefined()
    expect(store.list()).toHaveLength(1)
    expect(store.get(stackupId('Dört katman')).layers).toHaveLength(5)
    expect(store.remove(stackupId('Dört katman')).ok).toBe(true)
    expect(store.list()).toEqual([])
  })

  it('aynı ad üzerine yazar, çoğaltmaz', () => {
    const store = createStackupStore(memoryStorage())
    store.save(stackup())
    store.save(stackup({ layers: [{ type: LAYER_CORE, thickness: 1.5 }] }))
    expect(store.list()).toHaveLength(1)
    expect(store.get(stackupId('Dört katman')).layers).toHaveLength(1)
  })

  it('yeniden adlandırma kimliği de taşır, eski kayıt kalmaz', () => {
    const store = createStackupStore(memoryStorage())
    store.save(stackup())
    const r = store.rename(stackupId('Dört katman'), 'Altı katman', '2026-07-30')
    expect(r.error).toBeUndefined()
    expect(store.get(stackupId('Dört katman'))).toBeNull()
    expect(store.get(stackupId('Altı katman')).metadata.updatedAt).toBe('2026-07-30')
    expect(store.list()).toHaveLength(1)
  })

  it('olmayan kaydı yeniden adlandırmak hata döner', () => {
    const store = createStackupStore(memoryStorage())
    const r = store.rename('yok', 'Yeni')
    expect(r.error).toBe(SP_ERR_NOT_FOUND)
    expectErrorShape(r, 'not-found')
  })

  it('kayıt sınırı aşılınca açık hata döner', () => {
    const store = createStackupStore(memoryStorage())
    for (let i = 0; i < STACKUP_MAX; i += 1) store.save(stackup({ name: `S${i}` }))
    const r = store.save(stackup({ name: 'Fazladan' }))
    expect(r.error).toBe(SP_ERR_LIMIT)
    expectErrorShape(r, 'limit')
  })

  it('depoya yazılamıyorsa açık hata döner', () => {
    const store = createStackupStore(nullStorage)
    const r = store.save(stackup())
    expect(r.error).toBe(SP_ERR_STORAGE)
    expect(r.cause).toBe(STORAGE_ERR_UNAVAILABLE)
    expectErrorShape(r, 'storage')
  })

  it('bozuk depo içeriği çökmez', () => {
    const store = createStackupStore(memoryStorage({ 'alp-pcb.stackups.v1': '{{' }))
    expect(store.list()).toEqual([])
  })

  it('şema sürümü uymayan kayıt listeye alınmaz', () => {
    const stale = JSON.stringify([{ ...stackup(), schemaVersion: 0 }])
    const store = createStackupStore(memoryStorage({ 'alp-pcb.stackups.v1': stale }))
    expect(store.list()).toEqual([])
  })
})
