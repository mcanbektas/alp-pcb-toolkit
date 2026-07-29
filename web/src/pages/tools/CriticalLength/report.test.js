import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import { compute, buildSweep, INITIAL_FORM } from './model'
import { getText } from './text'
import { epsEffRows } from '../../../components/EpsEffFields'
import { fmt } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('CriticalLength report.js', () => {
  it('geçerli girdide dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })

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
    expect(buildReportSection({ f, r, text, lang: 'tr' })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu (kritik hat uzunluğu) ve büyük sonuçla aynı hassasiyette', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigLabel)
    expect(section.results[0].unit).not.toBeNull()
  })

  it('kriter girdisi ham bölen sayısı değil, ekrandaki açıklamalı etiketle listelenir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    const divisorRow = section.inputs.find((i) => i.label === text.fields.divisor.label)
    expect(divisorRow).toBeTruthy()
    expect(divisorRow.value).toBe(text.divisorLabel[f.divisor])
    expect(divisorRow.value).not.toBe(f.divisor)
  })

  it('hat uzunluğu girilmediğinde uzunluk/gecikme/oran satırları listede yok', () => {
    const f = { ...INITIAL_FORM, length: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.hasLength).toBe(false)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    const labels = section.results.map((row) => row.label)
    expect(labels).not.toContain(text.table.length)
    expect(labels).not.toContain(text.table.delay)
    expect(labels).not.toContain(text.table.ratio)
    expect(labels).not.toContain(text.table.transmissionLine)
  })

  it('hat uzunluğu girildiğinde uzunluk, gecikme, oran ve iletim hattı satırları listede', () => {
    const f = { ...INITIAL_FORM, length: '50', lengthu: 'mm' }
    const r = compute(f, text.fieldLabels)
    expect(r.hasLength).toBe(true)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain(text.table.length)
    expect(labels).toContain(text.table.delay)
    expect(labels).toContain(text.table.delayFraction)
    expect(labels).toContain(text.table.ratio)
    expect(labels).toContain(text.table.transmissionLine)

    const tlRow = section.results.find((row) => row.label === text.table.transmissionLine)
    expect([text.table.transmissionLineYes, text.table.transmissionLineNo]).toContain(tlRow.value)
  })

  it('εeff satırları ekrandaki epsEffRows çıktısıyla birebir aynı (manuel kaynak)', () => {
    const f = INITIAL_FORM // INITIAL_EPS_FORM varsayılanı epsSource: 'manual'
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    const expectedRows = epsEffRows(r.eps, fmt, 'tr')
    expect(expectedRows.length).toBeGreaterThan(0)
    for (const row of expectedRows) {
      expect(
        section.results.some((res) => res.label === row.label && res.value === row.value),
      ).toBe(true)
    }
  })

  it('εeff satırları ekrandaki epsEffRows çıktısıyla birebir aynı (geometriden kaynak)', () => {
    const f = { ...INITIAL_FORM, epsSource: 'geometry' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    const expectedRows = epsEffRows(r.eps, fmt, 'tr')
    // Geometri kaynağı ek Z0 satırı taşır — manuel kaynaktan bir satır daha çok
    expect(expectedRows.length).toBeGreaterThanOrEqual(2)
    for (const row of expectedRows) {
      expect(
        section.results.some((res) => res.label === row.label && res.value === row.value),
      ).toBe(true)
    }
  })

  it('schematicCaption yalnızca eşik gösteriliyor metnini taşır (hat uzunluğu girilmediğinde)', () => {
    const f = { ...INITIAL_FORM, length: '' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    expect(section.schematicCaption).toBe(text.schematic.captionThresholdOnly)
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text, lang: 'tr' })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    // x sütunu + 3 kriter (1/6, 1/4, 1/2)
    expect(section.chart.table.columns).toHaveLength(4)
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    expect(section.chart).toBeNull()
  })

  it('hiçbir sonuç ya da girdi satırı boş etiket ya da undefined değer taşımaz', () => {
    const f = { ...INITIAL_FORM, length: '50', lengthu: 'mm', epsSource: 'geometry' }
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text, lang: 'tr' })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  it('İngilizce metinle çağrıldığında araç adı ve εeff satırları da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en, lang: 'en' })
    expect(section.toolName).toBe(en.title)
    const expectedRows = epsEffRows(r.eps, fmt, 'en')
    for (const row of expectedRows) {
      expect(
        section.results.some((res) => res.label === row.label && res.value === row.value),
      ).toBe(true)
    }
  })
})
