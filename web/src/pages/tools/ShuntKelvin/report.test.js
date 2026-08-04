import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  SWEEP_CURRENT, SWEEP_TEMP, REASON_BITS, SK_ERR_POWER_EXCEEDED,
} from './model'
import { getText } from './text'
import { fmt, fmtRes } from '../../../lib/num'

// Ekranla rapor arasındaki kayma riski, aynı `r`/`s`/`text` kaynağından aynı
// satırların üretilip üretilmediğini denetleyerek en aza indirilir — bkz.
// ReturnPathStitchingVia/report.test.js ile aynı gerekçe.
const text = getText('tr')

describe('ShuntKelvin report.js', () => {
  it('varsayılan girdide REV2 §9.11 referans sonucuyla eşleşir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.shunt * 1e3).toBeCloseTo(5, 9)
    expect(r.power).toBeCloseTo(0.5, 9)
    expect(r.currentResolution * 1e3).toBeCloseTo(3.22, 2)

    const section = buildReportSection({ f, r, text })
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, iMax: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('ADC çözünürlüğü tam sayı değilse bits nedeniyle başarısız olur', () => {
    const f = { ...INITIAL_FORM, bits: '12.5' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe(REASON_BITS)
  })

  it('doğrudan direnç modu aynı referans gücü verir', () => {
    const f = { ...INITIAL_FORM, shuntMode: 'direct', shunt: '5', shuntu: 'mΩ' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.shunt * 1e3).toBeCloseTo(5, 9)
    expect(r.power).toBeCloseTo(0.5, 9)
  })

  it('nominal güç aşılınca bayrak ve tehlike notu gelir', () => {
    const f = {
      ...INITIAL_FORM, hasThermal: true, thermalResistance: '40', ratedPower: '0.25',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.powerExceeded).toBe(true)
    expect(r.powerError).toBe(SK_ERR_POWER_EXCEEDED)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('termal direnç verilince sıcaklık yükselmesi ve sıcak direnç hesaplanır', () => {
    const f = { ...INITIAL_FORM, hasThermal: true, thermalResistance: '40', tcrPpm: '50' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.temperatureRise).toBeCloseTo(20, 6)
    expect(r.temperature).toBeCloseTo(45, 6)
    expect(r.resistanceHot).toBeGreaterThan(r.shunt)

    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.temperatureRise)).toBe(true)
  })

  it('Kelvin yokken ortak yol direnci belirgin bir hata ve tehlike notu ekler', () => {
    const f = {
      ...INITIAL_FORM, kelvin: false, sharedResistance: '1', sharedResistanceu: 'mΩ',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.sharedError).toBeCloseTo(0.2, 9)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('Kelvin varken aynı ortak direnç sıfır hataya karşılık gelir', () => {
    const f = { ...INITIAL_FORM, kelvin: true, sharedResistance: '1', sharedResistanceu: 'mΩ' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.sharedError).toBe(0)
  })

  it('düşük işletme akımında offset uyarısı eklenir', () => {
    const f = { ...INITIAL_FORM, iNominal: '1' } // I_maks = 10 → oran 0.1
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'warn')).toBe(true)
  })

  it('ENOB verilirse ikinci çözünürlük de döner ve idealden büyüktür', () => {
    const f = { ...INITIAL_FORM, enob: '10.5' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.currentResolutionEnob).toBeGreaterThan(r.currentResolution)

    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.currentResolutionEnob)).toBe(true)
  })

  it('RSS toplam hatası worst-case ten küçüktür', () => {
    const f = { ...INITIAL_FORM, tolerance: '0.5', tcrPpm: '50', gainTolerance: '0.2' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.rssError).toBeLessThan(r.worstCaseError)
  })

  it('ilk sonuç satırı vurgulu ve büyük sonuçtaki değerle aynı', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigResultLabel)
    expect(`${section.results[0].value} ${section.results[0].unit}`).toBe(fmtRes(r.shunt))
  })

  it('bulgular notlara aynı seviye ve metinle taşınır (ekrandaki commentary ile aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const commentary = text.commentary(r)
    expect(section.notes.length).toBe(commentary.length)
    commentary.forEach((n, i) => {
      expect(section.notes[i].level).toBe(n.level)
      expect(section.notes[i].text).toBe(n.text)
    })
  })

  it('akım taraması iki sütun döner ve son nokta örneklemede yer alır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_CURRENT)
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart.table.columns).toHaveLength(2)
    const lastRow = s.rows[s.rows.length - 1]
    const lastExported = section.chart.table.rows[section.chart.table.rows.length - 1]
    expect(lastExported).toEqual([fmt(lastRow.x, 3), fmt(lastRow.y, 5)])
  })

  it('sıcaklık taraması iki sütun döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_TEMP)
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz (termal + ADC + Kelvin yok, tam girdi)', () => {
    const f = {
      ...INITIAL_FORM,
      iPeak: '15', iNominal: '8',
      tolerance: '1', tcrPpm: '50', gainTolerance: '0.5',
      hasThermal: true, thermalResistance: '40', ratedPower: '2', derating: '80',
      hasAdc: true, enob: '10.5',
      kelvin: false, sharedResistance: '0.5', sharedResistanceu: 'mΩ',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    const section = buildReportSection({ f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
    }
  })

  it('İngilizce metinle çağrıldığında araç adı da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en })
    expect(section.toolName).toBe(en.title)
  })

  it('yüzde satırlarında işaret dile göre doğru yerde durur (tr önde %, en sonda %)', () => {
    // CLAUDE.md: yüzde işaretinin yeri dil kuralıdır ve yalnızca `pct`'tedir —
    // tcrError/sharedError/offsetError/worstCaseError/rssError bu kurala tabidir.
    const f = {
      ...INITIAL_FORM,
      hasThermal: true, thermalResistance: '40', tcrPpm: '50',
      kelvin: false, sharedResistance: '1', sharedResistanceu: 'mΩ',
    }

    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    const section = buildReportSection({ f, r, text })
    const pctLabelsTr = [
      text.table.tcrErrorRow, text.table.sharedError, text.table.offsetError,
      text.table.worstCaseError, text.table.rssError,
    ]
    pctLabelsTr.forEach((label) => {
      const row = section.results.find((item) => item.label === label)
      expect(row.value.startsWith('%'), `${label}: "${row.value}" tr'de % önde olmalı`).toBe(true)
    })

    const en = getText('en')
    const rEn = compute(f, en.fieldLabels)
    expect(rEn.ok).toBe(true)
    const sectionEn = buildReportSection({ f, r: rEn, text: en })
    const pctLabelsEn = [
      en.table.tcrErrorRow, en.table.sharedError, en.table.offsetError,
      en.table.worstCaseError, en.table.rssError,
    ]
    pctLabelsEn.forEach((label) => {
      const row = sectionEn.results.find((item) => item.label === label)
      expect(row.value.endsWith('%'), `${label}: "${row.value}" en'de % sonda olmalı`).toBe(true)
    })
  })
})
