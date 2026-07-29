import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, MODE_JUNCTION, MODE_HEATSINK, MODE_SURFACE, COPPER_ON,
} from './model'
import { getText } from './text'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`s`/`text` kaynağından üretilir; bu test her sürümde yapının
// bozulup bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması)
// denetler.
const text = getText('tr')

describe('Junction report.js', () => {
  it('geçerli girdide (junction modu) dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_JUNCTION, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_JUNCTION, f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeLabel[MODE_JUNCTION])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigLabel.junction)
    expect(section.results[0].unit).toBe('°C')
  })

  it('hesap başarısızsa (eksik zorunlu alan) null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, Ta: '' }
    const r = compute(MODE_JUNCTION, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_JUNCTION, f, r, text })).toBeNull()
  })

  it('soğutucu modunda θ_SA girilmediyse büyük sonuç "gereken θ_SA,max" etiketiyle döner', () => {
    const f = INITIAL_FORM // thetaSA: ''
    const r = compute(MODE_HEATSINK, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_HEATSINK, f, r, text })

    expect(r.hasSink).toBe(false)
    expect(section.results[0].label).toBe(text.bigLabel.sinkNeeded)
    expect(section.results[0].unit).toBe('°C/W')
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain(text.table.thetaSAmax)
    expect(labels).not.toContain(text.table.shareHead)
  })

  it('soğutucu modunda θ_SA girilince toplam yol ve pay satırları eklenir', () => {
    const f = { ...INITIAL_FORM, thetaSA: '10' }
    const r = compute(MODE_HEATSINK, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_HEATSINK, f, r, text })

    expect(r.hasSink).toBe(true)
    expect(section.results[0].label).toBe(text.bigLabel.junction)
    expect(section.results[0].unit).toBe('°C')
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain(text.table.thetaTotal)
    expect(labels).toContain(text.table.shareHead)
    expect(labels).toContain(text.table.shareRow)
  })

  it('yüzey ölçümü modunda tahmini junction sıcaklığı satırları döner', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SURFACE, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SURFACE, f, r, text })

    expect(section.results[0].label).toBe(text.bigLabel.surface)
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain(text.table.metricUsed)
    expect(labels).toContain(text.table.TjEstimate)
  })

  it('bakır termal ağı açıksa satırlar ve ikinci formül bloğu eklenir', () => {
    const f = { ...INITIAL_FORM, copper: COPPER_ON }
    const r = compute(MODE_JUNCTION, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_JUNCTION, f, r, text })

    expect(r.copperOn).toBe(true)
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain(text.table.copperHead)
    expect(labels).toContain(text.table.copperStrip)
    expect(labels).toContain(text.table.copperRise)
    // Bakır kapalıyken görünmeyen ikinci formül bloğu artık dizide olmalı
    const withoutCopper = buildReportSection({
      mode: MODE_JUNCTION, f: INITIAL_FORM, r: compute(MODE_JUNCTION, INITIAL_FORM, text.fieldLabels), text,
    })
    expect(section.formula.length).toBeGreaterThan(withoutCopper.formula.length)
  })

  it('hiçbir sonuç satırı boş etiket ya da undefined değer taşımaz (üç mod + bakır)', () => {
    const cases = [
      { mode: MODE_JUNCTION, f: INITIAL_FORM },
      { mode: MODE_HEATSINK, f: INITIAL_FORM },
      { mode: MODE_HEATSINK, f: { ...INITIAL_FORM, thetaSA: '10' } },
      { mode: MODE_SURFACE, f: INITIAL_FORM },
      { mode: MODE_JUNCTION, f: { ...INITIAL_FORM, copper: COPPER_ON } },
      { mode: MODE_HEATSINK, f: { ...INITIAL_FORM, copper: COPPER_ON, thetaSA: '10' } },
      { mode: MODE_SURFACE, f: { ...INITIAL_FORM, copper: COPPER_ON } },
    ]
    for (const { mode, f } of cases) {
      const r = compute(mode, f, text.fieldLabels)
      const section = buildReportSection({ mode, f, r, text })
      for (const row of [...section.inputs, ...section.results]) {
        expect(row.label, JSON.stringify(row)).toBeTruthy()
        expect(row.value, JSON.stringify(row)).not.toBe('undefined')
        expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      }
    }
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_JUNCTION, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({
      mode: MODE_JUNCTION, f, r, s, text,
    })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_JUNCTION, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_JUNCTION, f, r, text })
    expect(section.chart).toBeNull()
  })

  it('θ_SA,max ≤ 0 iken (hiçbir soğutucu yetmez) sweep kurulamaz, chart null döner', () => {
    const f = { ...INITIAL_FORM, thetaJC: '50', thetaCS: '50' }
    const r = compute(MODE_HEATSINK, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({
      mode: MODE_HEATSINK, f, r, s, text,
    })

    expect(r.negativeSink).toBe(true)
    expect(s).toBeNull()
    expect(section).not.toBeNull()
    expect(section.chart).toBeNull()
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(MODE_JUNCTION, f, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_JUNCTION, f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.modeLabel[MODE_JUNCTION])
  })
})
