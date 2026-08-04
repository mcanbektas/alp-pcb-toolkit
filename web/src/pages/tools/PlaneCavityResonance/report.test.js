import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, SWEEP_D,
} from './model'
import { getText } from './text'
import { fmt, fmtEng } from '../../../lib/num'

// Ekranla rapor arasındaki kayma riski, aynı `r`/`s`/`text` kaynağından aynı
// satırların üretilip üretilmediğini denetleyerek en aza indirilir — bkz.
// ReturnPathStitchingVia/VoltageDivider report.test.js ile aynı gerekçe.
const text = getText('tr')

describe('PlaneCavityResonance report.js', () => {
  it('varsayılan girdide REV2 §11.11 referans sonuçlarıyla birebir eşleşir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.capacitance * 1e9).toBeCloseTo(3.5417, 4)
    expect(r.lowestResonance / 1e6).toBeCloseTo(749.48, 2)

    const section = buildReportSection({ f, r, text })
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, a: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('kesirli mod indeksi REASON_MODE_INDEX nedeniyle başarısız olur', () => {
    const f = { ...INITIAL_FORM, mMax: '1.5' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('mode-index')
  })

  it('mod indeksi sıfır olabilir — yalnızca n ekseninde mod aranır', () => {
    const f = { ...INITIAL_FORM, mMax: '0' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.modes.length).toBe(2) // (0,1) ve (0,2), nMax varsayılan 2
    expect(r.modes.every((mo) => mo.m === 0)).toBe(true)
  })

  it('ilk sonuç satırı vurgulu ve büyük sonuçtaki değerle (fmtEng) aynı', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.table.capacitance)
    expect(`${section.results[0].value} ${section.results[0].unit}`).toBe(fmtEng(r.capacitance, 'F', 4))
  })

  it('Q bileşenleri girilmezse toplam Q sonuçlarda görünmez', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.totalQ).toBeNull()
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.totalQ)).toBe(false)
  })

  it('üç Q bileşeni de girilirse toplam Q sonuçlara eklenir', () => {
    const f = {
      ...INITIAL_FORM, qc: '100', qr: '200', qLoading: '300',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.totalQ).not.toBeNull()
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.totalQ)).toBe(true)
  })

  it('besleme gerilimi girilmezse enerji satırı yok, girilirse eklenir', () => {
    const rNoV = compute(INITIAL_FORM, text.fieldLabels)
    expect(rNoV.energy).toBeNull()
    const sectionNoV = buildReportSection({ f: INITIAL_FORM, r: rNoV, text })
    expect(sectionNoV.results.some((row) => row.label === text.table.energy)).toBe(false)

    const f = { ...INITIAL_FORM, voltage: '3.3', voltageu: 'V' }
    const r = compute(f, text.fieldLabels)
    expect(r.energy).not.toBeNull()
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.energy)).toBe(true)
  })

  it('stitching işaretli değilse stitching girdileri ve sonuçları görünmez', () => {
    const f = INITIAL_FORM // hasStitching: false
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.inputs.some((row) => row.label === text.fields.targetFrequency.label)).toBe(false)
    expect(section.results.some((row) => row.label === text.table.stitchingSMax)).toBe(false)
  })

  it('stitching işaretliyse ve aralık verilmezse sınır bilgisi eklenir, karşılaştırma eklenmez', () => {
    const f = {
      ...INITIAL_FORM, hasStitching: true, targetFrequency: '1000', targetFrequencyu: 'MHz', stitchingN: '20',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.stitching.error).toBeUndefined()
    expect(r.stitching.withinLimit).toBeNull()
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.stitchingSMax)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.stitchingActual)).toBe(false)
    expect(section.inputs.some((row) => row.label === text.fields.stitchingN.label)).toBe(true)
  })

  it('gerçek stitching aralığı da verilirse karşılaştırma sonuçlara ve yorumlara eklenir', () => {
    const f = {
      ...INITIAL_FORM,
      hasStitching: true,
      targetFrequency: '1000',
      targetFrequencyu: 'MHz',
      stitchingN: '20',
      actualStitchingSpacing: '1',
      actualStitchingSpacingu: 'mm',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.stitching.withinLimit).toBe(true)
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.stitchingActual)).toBe(true)
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

  it('güç düzlemi karıştırılmama notu her zaman commentary içinde bulunur', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    const notes = text.commentary(r)
    expect(notes.some((n) => n.text.includes('Güç Düzlemi ve Paralel Yol'))).toBe(true)
  })

  it('d taraması verilince chart.table iki sütun döner ve son nokta örneklemeye dahildir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_D)
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.columns).toHaveLength(2)
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    const lastRow = s.rows[s.rows.length - 1]
    const lastExported = section.chart.table.rows[section.chart.table.rows.length - 1]
    expect(lastExported).toEqual([fmt(lastRow.x, 3), fmt(lastRow.y, 4)])
  })

  it('s verilmezse chart null döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.chart).toBeNull()
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz (tam girdi)', () => {
    const f = {
      ...INITIAL_FORM,
      areaOverride: '120', areaOverrideu: 'cm²',
      voltage: '3.3', voltageu: 'V',
      qc: '150', qr: '400', qLoading: '250',
      hasStitching: true,
      targetFrequency: '900', targetFrequencyu: 'MHz',
      stitchingN: '10',
      actualStitchingSpacing: '2', actualStitchingSpacingu: 'mm',
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
})
