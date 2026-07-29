import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS,
} from './model'
import { getText } from './text'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('ThermalVia report.js', () => {
  it('analiz modunda geçerli girdide dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeAnalysis)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].unit).toBe('°C/W')
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, Df: '' }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    expect(buildReportSection({ mode: MODE_ANALYSIS, f, r, text })).toBeNull()
  })

  it('analiz modunda via sayısı girdisi listelenir, iletilecek ısı listelenmez', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.N)
    expect(labels).not.toContain(text.fieldLabels.Q)
  })

  it('sentez modunda ilk sonuç satırı çıplak via sayısı, gereken direnç satırı eklenir', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })

    expect(section).not.toBeNull()
    expect(section.mode).toBe(text.modeSynthesis)
    expect(section.results[0].value).toBe(r.N)
    expect(section.results[0].emphasis).toBe(true)

    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.Q)
    expect(labels).not.toContain(text.fieldLabels.N)

    expect(section.results.some((row) => row.label === text.table.Rneeded)).toBe(true)
  })

  it('analiz modunda gereken direnç satırı görünmez', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.results.some((row) => row.label === text.table.Rneeded)).toBe(false)
  })

  it('bakır dolgulu viada dolgu alanı satırı eklenir, dolgusuzda eklenmez', () => {
    const filled = { ...INITIAL_FORM, filled: true }
    const rFilled = compute(MODE_ANALYSIS, filled, text.fieldLabels)
    const sectionFilled = buildReportSection({ mode: MODE_ANALYSIS, f: filled, r: rFilled, text })
    expect(sectionFilled.results.some((row) => row.label === text.table.fillArea)).toBe(true)

    const unfilled = { ...INITIAL_FORM, filled: false }
    const rUnfilled = compute(MODE_ANALYSIS, unfilled, text.fieldLabels)
    const sectionUnfilled = buildReportSection({ mode: MODE_ANALYSIS, f: unfilled, r: rUnfilled, text })
    expect(sectionUnfilled.results.some((row) => row.label === text.table.fillArea)).toBe(false)
  })

  it('hiçbir sonuç satırı boş etiket ya da undefined değer taşımaz', () => {
    const f = INITIAL_FORM
    for (const mode of [MODE_ANALYSIS, MODE_SYNTHESIS]) {
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
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.chart).toBeNull()
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.modeSynthesis)
  })
})
