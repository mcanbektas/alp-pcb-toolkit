import { describe, it, expect } from 'vitest'
import {
  epsFields, resolveEpsEff, INITIAL_EPS_FORM,
  EPS_MANUAL, EPS_GEOMETRY, EPS_STRUCT_MICROSTRIP, EPS_STRUCT_STRIPLINE,
  delayPerLength, psPerMm, phaseVelocity, propagationDelay, lengthForDelay,
  PRACTICAL_PS_PER_MM,
} from './epsEff'
import { readForm } from './fields'
import { METHOD_CLOSED_FORM } from './impedance'
import { C0 } from './units'

describe('alan tanımları', () => {
  it('elle girişte yalnızca εeff sorulur', () => {
    const keys = epsFields({ ...INITIAL_EPS_FORM, epsSource: EPS_MANUAL }).map((s) => s.key)
    expect(keys).toEqual(['epsEffManual'])
  })

  it('microstrip geometrisinde W, H, t ve εr sorulur', () => {
    const keys = epsFields({
      ...INITIAL_EPS_FORM, epsSource: EPS_GEOMETRY, epsStructure: EPS_STRUCT_MICROSTRIP,
    }).map((s) => s.key)
    expect(keys).toEqual(['epsR', 'epsW', 'epsH', 'epsT'])
  })

  it('stripline geometrisinde yalnızca εr sorulur', () => {
    const keys = epsFields({
      ...INITIAL_EPS_FORM, epsSource: EPS_GEOMETRY, epsStructure: EPS_STRUCT_STRIPLINE,
    }).map((s) => s.key)
    expect(keys).toEqual(['epsR'])
  })

  // Saf katman dil taşımaz: etiket alan anahtarıdır, cümle değil.
  it('her alanın etiketi kendi anahtarıdır', () => {
    const forms = [
      { ...INITIAL_EPS_FORM, epsSource: EPS_MANUAL },
      { ...INITIAL_EPS_FORM, epsSource: EPS_GEOMETRY, epsStructure: EPS_STRUCT_MICROSTRIP },
      { ...INITIAL_EPS_FORM, epsSource: EPS_GEOMETRY, epsStructure: EPS_STRUCT_STRIPLINE },
    ]
    for (const f of forms) {
      for (const spec of epsFields(f)) {
        expect(spec.label).toBe(spec.key)
        // Anahtar biçimi: tek sözcük, boşluksuz, Türkçe harf içermez
        expect(spec.label).toMatch(/^[A-Za-z][A-Za-z0-9]*$/)
      }
    }
  })
})

describe('etiket enjeksiyonu', () => {
  const microstripForm = {
    ...INITIAL_EPS_FORM,
    epsSource: EPS_GEOMETRY,
    epsStructure: EPS_STRUCT_MICROSTRIP,
    epsW: '', epsH: '0.2', epsHu: 'mm', epsT: '35', epsTu: 'µm', epsR: '4.2',
  }

  it('etiket verilmezse hata mesajında anahtar görünür, Türkçe cümle değil', () => {
    const r = readForm(microstripForm, epsFields(microstripForm))
    expect(r.ok).toBe(false)
    expect(r.invalid).toEqual(['epsW'])
  })

  it('ekran etiketi geçince onun metni görünür', () => {
    const labels = { epsW: 'Trace width (W)' }
    const specs = epsFields(microstripForm).map((s) => ({ ...s, label: labels[s.key] ?? s.label }))
    expect(readForm(microstripForm, specs).invalid).toEqual(['Trace width (W)'])
  })
})

describe('εeff çözümleme', () => {
  const read = (f) => readForm(f, epsFields(f))

  it('elle girilen değer olduğu gibi döner ve yöntem iddiası taşımaz', () => {
    const f = { ...INITIAL_EPS_FORM, epsSource: EPS_MANUAL, epsEffManual: '3.5' }
    const r = resolveEpsEff(read(f).values, f)
    expect(r.epsEff).toBeCloseTo(3.5, 12)
    expect(r.source).toBe(EPS_MANUAL)
    expect(r.method).toBeNull()
  })

  it('microstrip geometrisi spec §13 Test 1 değerini üretir', () => {
    const f = {
      ...INITIAL_EPS_FORM,
      epsSource: EPS_GEOMETRY,
      epsStructure: EPS_STRUCT_MICROSTRIP,
      epsW: '0.4', epsWu: 'mm',
      epsH: '0.2', epsHu: 'mm',
      epsT: '0', epsTu: 'um',
      epsR: '4.2',
    }
    const r = resolveEpsEff(read(f).values, f)
    expect(r.epsEff).toBeCloseTo(3.21, 2)
    expect(r.Z0).toBeCloseTo(49.7, 1)
    expect(r.method).toBe(METHOD_CLOSED_FORM)
  })

  it('stripline\'da εeff = εr, geometri istemez', () => {
    const f = {
      ...INITIAL_EPS_FORM,
      epsSource: EPS_GEOMETRY,
      epsStructure: EPS_STRUCT_STRIPLINE,
      epsR: '4.2',
    }
    const r = resolveEpsEff(read(f).values, f)
    expect(r.epsEff).toBeCloseTo(4.2, 12)
    expect(r.model).toBe('homogeneous-dielectric')
    expect(r.Z0).toBeNull()
  })

  it('yöntem etiketi aşağı taşınabilsin diye her zaman döner', () => {
    const f = { ...INITIAL_EPS_FORM, epsSource: EPS_GEOMETRY }
    const r = resolveEpsEff(read(f).values, f)
    expect(r).toHaveProperty('method')
    expect(r).toHaveProperty('inRange')
  })

  it('geçersiz εeff reddedilir', () => {
    const f = { ...INITIAL_EPS_FORM, epsSource: EPS_MANUAL, epsEffManual: '0.5' }
    expect(resolveEpsEff(read(f).values, f).error).toBeDefined()
  })
})

describe('yayılma yardımcıları', () => {
  it('gecikme = √εeff / c', () => {
    expect(delayPerLength(4)).toBeCloseTo(2 / C0, 18)
  })

  it('pratik yaklaşım 3.33564·√εeff ps/mm ile uyuşur', () => {
    // Spec'teki 3.33564 katsayısı 1e9/c = 3.3356409… değerinin yuvarlanmışıdır;
    // motor tam değeri kullandığı için milyonda bir mertebesinde fark kalır.
    const epsEff = 3.2071
    expect(psPerMm(delayPerLength(epsEff))).toBeCloseTo(PRACTICAL_PS_PER_MM * Math.sqrt(epsEff), 4)
  })

  it('sabit gerçekten 1e9/c değerinin yuvarlanmışıdır', () => {
    expect(PRACTICAL_PS_PER_MM).toBeCloseTo(1e9 / C0, 5)
  })

  it('yayılma hızı gecikmenin tersidir', () => {
    const epsEff = 4.2
    expect(phaseVelocity(epsEff)).toBeCloseTo(1 / delayPerLength(epsEff), 3)
  })

  it('uzunluk ↔ gecikme dönüşümü tersinirdir', () => {
    const epsEff = 3.2
    const L = 0.05
    expect(lengthForDelay(propagationDelay(L, epsEff), epsEff)).toBeCloseTo(L, 12)
  })

  it('εeff büyüdükçe sinyal yavaşlar', () => {
    expect(phaseVelocity(9)).toBeLessThan(phaseVelocity(4))
  })
})
