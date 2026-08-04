import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  PLANE_POWER, PLANE_SPLIT, SWEEP_REACTANCE, SWEEP_CAPACITOR, SWEEP_VIA_COUNT,
} from './model'
import { getText } from './text'
import { fmt, fmtRes } from '../../../lib/num'

// Ekranla rapor arasındaki kayma riski, aynı `r`/`s`/`text` kaynağından aynı
// satırların üretilip üretilmediğini denetleyerek en aza indirilir — bkz.
// VoltageDivider/ThermalVia report.test.js ile aynı gerekçe.
const text = getText('tr')

describe('ReturnPathStitchingVia report.js', () => {
  it('geçerli girdide dolu bir bölüm döner ve REV2 §4.12 referans sonuçlarıyla eşleşir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.fEdge).toBeCloseTo(500e6, 0)
    expect(r.lambda).toBeCloseTo(0.2998, 4)
    expect(r.spacingLimit * 1e3).toBeCloseTo(14.99, 1) // varsayılan λ/20
    expect(r.viaInductanceSingle * 1e9).toBeCloseTo(1.3, 2)
    expect(r.reactanceSingle).toBeCloseTo(4.08, 2)

    const section = buildReportSection({ f, r, text })
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, tr: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('stitching via sayısı tam sayı değilse count nedeniyle başarısız olur', () => {
    const f = { ...INITIAL_FORM, stitchingViaCount: '1.5' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('count')
  })

  it('ilk sonuç satırı vurgulu ve büyük sonuçtaki değerle (fmtRes) aynı', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigResultLabel)
    expect(`${section.results[0].value} ${section.results[0].unit}`).toBe(fmtRes(r.reactanceParallel))
  })

  it('kondansatör işaretli değilse kondansatör satırları ve girdileri görünmez', () => {
    const f = INITIAL_FORM // hasCapacitor: false
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.capImpedance)).toBe(false)
    expect(section.inputs.some((row) => row.label === text.fieldLabels.capC)).toBe(false)
  })

  it('kondansatör işaretliyse kondansatör satırları ve girdileri eklenir', () => {
    const f = { ...INITIAL_FORM, hasCapacitor: true }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.capacitor).not.toBeNull()
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.capImpedance)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.capEslTotal)).toBe(true)
    expect(section.inputs.some((row) => row.label === text.fieldLabels.capC)).toBe(true)
  })

  it('düzlem türü ve diğer kapalı seçenekli alanlar girdi olarak listelenir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fields.planeType.label)
    expect(labels).toContain(text.fields.signalType.label)
    expect(labels).toContain(text.fields.bandwidthMethod.label)
    expect(labels).toContain(text.fields.spacingDivisor.label)
  })

  it('GND düzleminde yalnız zorunlu model kısıtı uyarısı vardır, tehlike yoktur', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    const notes = text.commentary(r)
    expect(notes.filter((n) => n.level === 'warn')).toHaveLength(1)
    expect(notes.filter((n) => n.level === 'danger')).toHaveLength(0)
  })

  it('güç düzlemine kondansatörsüz geçişte ekstra bir uyarı eklenir', () => {
    const r = compute({ ...INITIAL_FORM, planeType: PLANE_POWER }, text.fieldLabels)
    const notes = text.commentary(r)
    expect(notes.filter((n) => n.level === 'warn')).toHaveLength(2)
  })

  it('güç düzlemine kondansatörle geçişte ekstra uyarı eklenmez', () => {
    const r = compute({ ...INITIAL_FORM, planeType: PLANE_POWER, hasCapacitor: true }, text.fieldLabels)
    const notes = text.commentary(r)
    expect(notes.filter((n) => n.level === 'warn')).toHaveLength(1)
  })

  it('bölünmüş düzlemde tehlike seviyeli tek bir not eklenir', () => {
    const r = compute({ ...INITIAL_FORM, planeType: PLANE_SPLIT }, text.fieldLabels)
    const notes = text.commentary(r)
    expect(notes.filter((n) => n.level === 'danger')).toHaveLength(1)
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

  it('via reaktansı taraması verilince chart.table üç sütun döner (tek via / N via eşdeğeri)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_REACTANCE)
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.columns).toHaveLength(3)
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    // Ekrandaki <ChartDataTable every={8} .../> son noktayı her zaman dahil
    // eder; dışa aktarılan tablo da aynı son satırı taşımalı.
    const lastRow = s.rows[s.rows.length - 1]
    const lastExported = section.chart.table.rows[section.chart.table.rows.length - 1]
    expect(lastExported).toEqual([fmt(lastRow.x, 3), fmt(lastRow.y, 4), fmt(lastRow.yParallel, 4)])
  })

  it('via sayısı taraması iki sütun döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_VIA_COUNT)
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('kondansatör olmadan kondansatör taraması null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_CAPACITOR)
    expect(s).toBeNull()
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart).toBeNull()
  })

  it('s verilmezse chart null döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.chart).toBeNull()
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz (kondansatörlü, tam girdi)', () => {
    const f = {
      ...INITIAL_FORM,
      clockFreq: '100', clockFrequ: 'MHz',
      actualSpacing: '10', actualSpacingu: 'mm',
      signalToReturnViaDistance: '2', signalToReturnViaDistanceu: 'mm',
      returnCurrentPeak: '50', returnCurrentPeaku: 'mA',
      hasCapacitor: true,
      capDistance: '5', capDistanceu: 'mm',
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
