import { describe, it, expect } from 'vitest'
import {
  validateProfile, parseProfile, createProfileStore, profileId,
  PROFILE_SCHEMA, SCHEMA_VERSION,
  PROFILE_ERR_JSON, PROFILE_ERR_SCHEMA, PROFILE_ERR_VERSION,
  PROFILE_ERR_KIND, PROFILE_ERR_FIELD, PROFILE_ERR_DATA, PROFILE_ERR_STORAGE,
} from './dataProfiles'
import { memoryStorage, nullStorage } from './storage'

const valid = {
  schema: PROFILE_SCHEMA,
  schemaVersion: SCHEMA_VERSION,
  kind: 'trace-current',
  name: 'Ölçüm seti A',
  source: 'İç ölçüm, 2026-03',
  data: {
    rows: [
      { areaMm2: 0.1, currentA: 1.2, tempRiseC: 10 },
      { areaMm2: 0.2, currentA: 2.0, tempRiseC: 10 },
    ],
  },
}

describe('profil doğrulama', () => {
  it('geçerli profili kabul eder ve id üretir', () => {
    const r = validateProfile(valid)
    expect(r.error).toBeUndefined()
    expect(r.profile.id).toBe(profileId('trace-current', 'Ölçüm seti A'))
  })

  it('yanlış şema adını reddeder', () => {
    expect(validateProfile({ ...valid, schema: 'baska' }).error).toBe(PROFILE_ERR_SCHEMA)
  })

  it('şema sürümü uyuşmazsa sessizce okumaz', () => {
    const r = validateProfile({ ...valid, schemaVersion: SCHEMA_VERSION + 1 })
    expect(r.error).toBe(PROFILE_ERR_VERSION)
    expect(r.profile).toBeUndefined()
  })

  it('bilinmeyen türü reddeder', () => {
    expect(validateProfile({ ...valid, kind: 'yok' }).error).toBe(PROFILE_ERR_KIND)
  })

  it('source alanı boş olamaz', () => {
    expect(validateProfile({ ...valid, source: '  ' }).error).toBe(PROFILE_ERR_FIELD)
  })

  it('eksik veri alanını satır numarasıyla bildirir', () => {
    const bad = { ...valid, data: { rows: [{ areaMm2: 1, currentA: 2 }] } }
    const r = validateProfile(bad)
    expect(r.error).toBe(PROFILE_ERR_DATA)
    expect(r.message).toMatch(/satır 1/)
    expect(r.message).toMatch(/tempRiseC/)
  })

  it('bozuk JSON metnini reddeder', () => {
    expect(parseProfile('{ bozuk').error).toBe(PROFILE_ERR_JSON)
  })

  it('JSON metninden profil üretir', () => {
    expect(parseProfile(JSON.stringify(valid)).profile.name).toBe('Ölçüm seti A')
  })
})

describe('profil deposu — enjekte edilen port', () => {
  it('kaydeder, listeler, okur, siler', () => {
    const store = createProfileStore(memoryStorage())
    expect(store.list()).toEqual([])

    const saved = store.save(valid)
    expect(saved.error).toBeUndefined()
    expect(store.list('trace-current')).toHaveLength(1)
    expect(store.get(saved.profile.id).name).toBe('Ölçüm seti A')

    store.remove(saved.profile.id)
    expect(store.list()).toEqual([])
  })

  it('aynı isim tekrar aktarılırsa üzerine yazar, çoğaltmaz', () => {
    const store = createProfileStore(memoryStorage())
    store.save(valid)
    store.save({ ...valid, source: 'İç ölçüm, 2026-05' })
    const all = store.list()
    expect(all).toHaveLength(1)
    expect(all[0].source).toBe('İç ölçüm, 2026-05')
  })

  it('türe göre filtreler', () => {
    const store = createProfileStore(memoryStorage())
    store.save(valid)
    store.save({
      ...valid, kind: 'fab', name: 'Üretici X', data: { minTraceWidthMm: 0.1 },
    })
    expect(store.list('fab')).toHaveLength(1)
    expect(store.list()).toHaveLength(2)
  })

  it('geçersiz profili kaydetmez', () => {
    const store = createProfileStore(memoryStorage())
    expect(store.save({ ...valid, source: '' }).error).toBe(PROFILE_ERR_FIELD)
    expect(store.list()).toEqual([])
  })

  it('depoda bozuk kayıt varsa uygulama düşmez', () => {
    const store = createProfileStore(memoryStorage({ 'alp-pcb.profiles.v1': '{ bozuk' }))
    expect(store.list()).toEqual([])
  })

  it('eski şema sürümlü kayıt yüklenmez', () => {
    const old = JSON.stringify([{ ...valid, schemaVersion: 0 }])
    const store = createProfileStore(memoryStorage({ 'alp-pcb.profiles.v1': old }))
    expect(store.list()).toEqual([])
  })

  it('depolama yoksa kaydetme açık hata döner', () => {
    const store = createProfileStore(nullStorage)
    expect(store.save(valid).error).toBe(PROFILE_ERR_STORAGE)
    expect(store.list()).toEqual([])
  })

  it('port verilmezse kurulmaz', () => {
    expect(() => createProfileStore(null)).toThrow(TypeError)
  })
})
