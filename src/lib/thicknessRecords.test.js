import { describe, it, expect } from 'vitest'
import {
  validateRecord, createThicknessStore, recordId, normalizeName, unitForSource,
  THICKNESS_SCHEMA, SCHEMA_VERSION, NAME_MAX, RECORD_MAX,
  RECORD_UNIT_WEIGHT, RECORD_UNIT_LENGTH,
  THICKNESS_ERR_SCHEMA, THICKNESS_ERR_VERSION, THICKNESS_ERR_NAME,
  THICKNESS_ERR_SOURCE, THICKNESS_ERR_LAYER, THICKNESS_ERR_UNIT,
  THICKNESS_ERR_FIELD, THICKNESS_ERR_CONSISTENCY, THICKNESS_ERR_STORAGE,
  THICKNESS_ERR_LIMIT,
} from './thicknessRecords'
import { memoryStorage, nullStorage } from './storage'

// Elle doğrulanan üç sayısal örnek:
//
// 1) 1 oz/ft² folyo, dış katman, 25 µm kaplama
//    nominal tablo: t_folyo = 35 µm  →  bitmiş = 35 + 25 = 60 µm
// 2) Ölçülen bitmiş 60 µm, folyo 35 µm, dış katman
//    kaplama geriye çözülür: 60 − 35 = 25 µm  →  35 + 25 = 60 µm ✓
// 3) 2 oz/ft² folyo, iç katman
//    t = 70 µm, kaplama iç katmanda 0  →  bitmiş = 70 + 0 = 70 µm

const weightRec = {
  schema: THICKNESS_SCHEMA,
  schemaVersion: SCHEMA_VERSION,
  name: '1 oz dış katman',
  source: 'weight',
  unit: RECORD_UNIT_WEIGHT,
  value: 1,
  layer: 'external',
  plating: 25,
  starting: 35,
  finished: 60,
}

const measuredRec = {
  schema: THICKNESS_SCHEMA,
  schemaVersion: SCHEMA_VERSION,
  name: 'Ölçülen kupon',
  source: 'finished',
  unit: RECORD_UNIT_LENGTH,
  value: 60,
  layer: 'external',
  plating: 25,
  starting: 35,
  finished: 60,
}

const internalRec = {
  schema: THICKNESS_SCHEMA,
  schemaVersion: SCHEMA_VERSION,
  name: '2 oz iç katman',
  source: 'thickness',
  unit: RECORD_UNIT_LENGTH,
  value: 70,
  layer: 'internal',
  plating: 0,
  starting: 70,
  finished: 70,
}

describe('kalınlık kaydı doğrulama', () => {
  it('ağırlık kaydını kabul eder: 1 oz → 35 + 25 = 60 µm', () => {
    const r = validateRecord(weightRec)
    expect(r.error).toBeUndefined()
    expect(r.record.id).toBe(recordId('1 oz dış katman'))
    expect(r.record.starting + r.record.plating).toBe(60)
    expect(r.record.unit).toBe('oz/ft²')
  })

  it('ölçülen bitmiş kalınlık kaydını kabul eder: 60 − 35 = 25 µm kaplama', () => {
    const r = validateRecord(measuredRec)
    expect(r.error).toBeUndefined()
    expect(r.record.value).toBe(60)
    expect(r.record.finished - r.record.starting).toBe(25)
    expect(r.record.unit).toBe('µm')
  })

  it('iç katman kaydını kabul eder: 70 µm folyo, kaplama 0', () => {
    const r = validateRecord(internalRec)
    expect(r.error).toBeUndefined()
    expect(r.record.finished).toBe(70)
    expect(r.record.plating).toBe(0)
  })

  it('adı kırpar ve boşlukları teker teker sayar', () => {
    expect(normalizeName('  1 oz   dış  ')).toBe('1 oz dış')
    expect(validateRecord({ ...weightRec, name: '  1 oz dış katman ' }).record.name)
      .toBe('1 oz dış katman')
  })

  it('aynı ad büyük/küçük harften bağımsız aynı kimliği verir', () => {
    expect(recordId('1 OZ DIŞ')).toBe(recordId('1 oz dış'))
    // Kimlik ASCII'ye indirgenmez: farklı harf, farklı kayıt
    expect(recordId('Üst katman')).not.toBe(recordId('Ust katman'))
  })

  it('kaynağa göre birim seçer', () => {
    expect(unitForSource('weight')).toBe('oz/ft²')
    expect(unitForSource('thickness')).toBe('µm')
    expect(unitForSource('finished')).toBe('µm')
  })

  it('yanlış şema adını reddeder', () => {
    expect(validateRecord({ ...weightRec, schema: 'baska' }).error).toBe(THICKNESS_ERR_SCHEMA)
  })

  it('şema sürümü uyuşmazsa sessizce okumaz', () => {
    const r = validateRecord({ ...weightRec, schemaVersion: SCHEMA_VERSION + 1 })
    expect(r.error).toBe(THICKNESS_ERR_VERSION)
    expect(r.record).toBeUndefined()
  })

  it('boş ve çok uzun adı reddeder', () => {
    expect(validateRecord({ ...weightRec, name: '   ' }).error).toBe(THICKNESS_ERR_NAME)
    expect(validateRecord({ ...weightRec, name: 'a'.repeat(NAME_MAX + 1) }).error)
      .toBe(THICKNESS_ERR_NAME)
  })

  it('bilinmeyen kaynağı ve katmanı reddeder', () => {
    expect(validateRecord({ ...weightRec, source: 'yok' }).error).toBe(THICKNESS_ERR_SOURCE)
    expect(validateRecord({ ...weightRec, layer: 'orta' }).error).toBe(THICKNESS_ERR_LAYER)
  })

  it('kaynağa uymayan birimi reddeder', () => {
    expect(validateRecord({ ...weightRec, unit: 'µm' }).error).toBe(THICKNESS_ERR_UNIT)
    expect(validateRecord({ ...measuredRec, unit: 'oz/ft²' }).error).toBe(THICKNESS_ERR_UNIT)
  })

  it('sayısal olmayan ve negatif alanları reddeder', () => {
    expect(validateRecord({ ...weightRec, value: '1' }).error).toBe(THICKNESS_ERR_FIELD)
    expect(validateRecord({ ...weightRec, starting: 0 }).error).toBe(THICKNESS_ERR_FIELD)
    expect(validateRecord({ ...weightRec, plating: -1 }).error).toBe(THICKNESS_ERR_FIELD)
    expect(validateRecord({ ...weightRec, finished: NaN }).error).toBe(THICKNESS_ERR_FIELD)
  })

  it('bitmiş ≠ başlangıç + kaplama olan kaydı reddeder', () => {
    // 35 + 25 = 60, kayıtta 65 yazıyor
    expect(validateRecord({ ...weightRec, finished: 65 }).error).toBe(THICKNESS_ERR_CONSISTENCY)
  })

  it('iç katmanda sıfırdan farklı kaplamayı reddeder', () => {
    const bad = { ...internalRec, plating: 25, finished: 95 }
    expect(validateRecord(bad).error).toBe(THICKNESS_ERR_CONSISTENCY)
  })

  it('kayan nokta gürültüsünü tutarsızlık saymaz', () => {
    // 35e-6 + 25e-6 metreden µm'ye çevrilince toplam son bitte kayabilir
    const noisy = { ...weightRec, finished: 60 + 6e-14 }
    expect(validateRecord(noisy).error).toBeUndefined()
  })
})

describe('kalınlık deposu — enjekte edilen port', () => {
  it('kaydeder, listeler, okur, siler', () => {
    const store = createThicknessStore(memoryStorage())
    expect(store.list()).toEqual([])

    const saved = store.save(weightRec)
    expect(saved.error).toBeUndefined()
    expect(store.list()).toHaveLength(1)
    expect(store.get(saved.record.id).finished).toBe(60)

    store.remove(saved.record.id)
    expect(store.list()).toEqual([])
  })

  it('aynı ad yeniden kaydedilirse üzerine yazar, çoğaltmaz', () => {
    const store = createThicknessStore(memoryStorage())
    store.save(weightRec)
    // 2 oz dış katman: 70 + 25 = 95 µm
    store.save({ ...weightRec, value: 2, starting: 70, finished: 95 })
    const all = store.list()
    expect(all).toHaveLength(1)
    expect(all[0].starting).toBe(70)
    expect(all[0].finished).toBe(95)
  })

  it('farklı kayıtları birlikte tutar', () => {
    const store = createThicknessStore(memoryStorage())
    store.save(weightRec)
    store.save(measuredRec)
    store.save(internalRec)
    expect(store.list().map((rec) => rec.name)).toEqual([
      '1 oz dış katman', 'Ölçülen kupon', '2 oz iç katman',
    ])
  })

  it('geçersiz kaydı yazmaz', () => {
    const store = createThicknessStore(memoryStorage())
    expect(store.save({ ...weightRec, name: '' }).error).toBe(THICKNESS_ERR_NAME)
    expect(store.list()).toEqual([])
  })

  it('depoda bozuk kayıt varsa uygulama düşmez', () => {
    const store = createThicknessStore(memoryStorage({ 'alp-pcb.thickness.v1': '{ bozuk' }))
    expect(store.list()).toEqual([])
  })

  it('eski şema sürümlü kayıt yüklenmez, yenisi yüklenir', () => {
    const raw = JSON.stringify([{ ...weightRec, schemaVersion: 0 }, measuredRec])
    const store = createThicknessStore(memoryStorage({ 'alp-pcb.thickness.v1': raw }))
    expect(store.list().map((rec) => rec.name)).toEqual(['Ölçülen kupon'])
  })

  it('depolama yoksa kaydetme açık hata döner, liste boş kalır', () => {
    const store = createThicknessStore(nullStorage)
    expect(store.save(weightRec).error).toBe(THICKNESS_ERR_STORAGE)
    expect(store.list()).toEqual([])
  })

  it('kayıt sınırı aşılırsa açık hata döner, eski kayıt atılmaz', () => {
    const store = createThicknessStore(memoryStorage())
    for (let i = 0; i < RECORD_MAX; i++) {
      expect(store.save({ ...weightRec, name: `kayit ${i}` }).error).toBeUndefined()
    }
    expect(store.save({ ...weightRec, name: 'bir fazla' }).error).toBe(THICKNESS_ERR_LIMIT)
    expect(store.list()).toHaveLength(RECORD_MAX)
    // Sınırdaki kaydın üzerine yazmak hâlâ mümkün
    expect(store.save({ ...weightRec, name: 'kayit 0', value: 2, starting: 70, finished: 95 }).error)
      .toBeUndefined()
    expect(store.list()).toHaveLength(RECORD_MAX)
  })

  it('port verilmezse kurulmaz', () => {
    expect(() => createThicknessStore(null)).toThrow(TypeError)
  })
})
