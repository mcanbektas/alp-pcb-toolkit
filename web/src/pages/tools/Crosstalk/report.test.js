import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, FEXT_ON, REASON_COUPLING,
} from './model'
import { getText } from './text'
import { fmt, fmtEng } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')
const lang = 'tr'

describe('Crosstalk report.js', () => {
  it('geçerli girdide (FEXT kapalı) dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBeNull()
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.schematicCaption).toBe(text.schematic.caption)
  })

  it('FEXT hesaplanmadıysa sonuçlarda "neden" satırı görünür, FEXT tepe gerilimi görünmez', () => {
    const f = INITIAL_FORM // fextMode varsayılan FEXT_OFF
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang })
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain(text.table.reason)
    expect(labels).not.toContain(text.table.Vfext)
  })

  it('FEXT açıkken modal εeff girilirse FEXT satırları sonuçlarda görünür', () => {
    const f = {
      ...INITIAL_FORM, fextMode: FEXT_ON, epsOdd: '2.6', epsEven: '3.0',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.fext.available).toBe(true)
    const section = buildReportSection({ f, r, text, lang })
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain(text.table.Vfext)
    expect(labels).toContain(text.table.fextPct)
    expect(labels).not.toContain(text.table.reason)
  })

  it('FEXT açıkken odd/even εeff eşitse homojen "evet" satırı görünür', () => {
    const f = {
      ...INITIAL_FORM, fextMode: FEXT_ON, epsOdd: '3.0', epsEven: '3.0',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.fext.homogeneous).toBe(true)
    const section = buildReportSection({ f, r, text, lang })
    const row = section.results.find((it_) => it_.label === text.table.homogeneous)
    expect(row.value).toBe(text.table.homogeneousYes)
  })

  it('hesap başarısızsa (Z_even <= Z_odd) null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, Zeven: '30', Zodd: '45' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe(REASON_COUPLING)
    expect(buildReportSection({ f, r, text, lang })).toBeNull()
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text, lang })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)

    // ChartDataTable (LineChart.jsx, every=6) her 6 noktada bir satır gösterir
    // ve son noktayı (dizinde yoksa) zorla ekler — s.rows 70 satırlık bir
    // süpürme olduğunda bu 13 satıra (0,6,…,66 + zorla eklenen 69) karşılık
    // gelir. Rapor tablosu ekrandakiyle birebir aynı satır sayısını ve son
    // (en yüksek x, doyma platosuna en yakın) noktayı taşımalı.
    expect(s.rows.length).toBe(70)
    expect(section.chart.table.rows.length).toBe(13)
    const lastRow = s.rows[s.rows.length - 1]
    expect(section.chart.table.rows.at(-1)).toEqual([
      `${fmt(lastRow.x, 4)} mm`, fmtEng(lastRow.y, 'V', 4),
    ])
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang })
    expect(section.chart).toBeNull()
  })

  it('İngilizce metinle çağrıldığında araç adı da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en, lang: 'en' })
    expect(section.toolName).toBe(en.title)
  })

  it('hiçbir satır boş etiket ya da undefined değer taşımaz (FEXT açık)', () => {
    const f = {
      ...INITIAL_FORM, fextMode: FEXT_ON, epsOdd: '2.6', epsEven: '3.0',
    }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  it('hiçbir satır boş etiket ya da undefined değer taşımaz (FEXT kapalı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })
})
