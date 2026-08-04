import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  MODE_ANALYSIS, MODE_SYNTHESIS,
} from './model'
import { getText } from './text'
import { fmt, fmtEng } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

function buildFor(mode, overrides = {}) {
  const f = { ...INITIAL_FORM, ...overrides }
  const r = compute(mode, f, text.fieldLabels)
  const s = buildSweep(r)
  return { f, r, s, section: buildReportSection({ mode, f, r, s, text }) }
}

describe('RlcResonance report.js', () => {
  it('analiz — nearestC satırı YOK, empedans büyüklüğü büyük sonuçtur', () => {
    const { section } = buildFor(MODE_ANALYSIS)

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeLabel[MODE_ANALYSIS])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results.some((row) => row.label === text.table.nearestC)).toBe(false)
    expect(section.results[0].unit).toBe('Ω')
  })

  it('sentez — nearestC satırı eklenir, büyük sonuç kapasitedir', () => {
    const { section } = buildFor(MODE_SYNTHESIS)

    expect(section).not.toBeNull()
    expect(section.mode).toBe(text.modeLabel[MODE_SYNTHESIS])
    expect(section.results.some((row) => row.label === text.table.nearestC)).toBe(true)
    expect(section.results[0].unit).not.toBe('Ω')
  })

  it('yetersiz girdide compute() başarısız olur, null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, Rr: '', L: '', C: '', freq: '' }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_ANALYSIS, f, r, text })).toBeNull()
  })

  it('sentez — fiziksel olmayan hedefte compute() başarısız olur, null döner', () => {
    const f = { ...INITIAL_FORM, L: '1e12', Lu: 'H', targetF0: '1', targetF0u: 'GHz' }
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })).toBeNull()
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı boş bırakılır', () => {
    const { section } = buildFor(MODE_ANALYSIS)
    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.columns).toHaveLength(2)
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
  })

  it('chart tablosu taramanın son satırını hiç atlamaz (ekrandaki kuralla aynı)', () => {
    const { s, section } = buildFor(MODE_ANALYSIS)
    // 90 noktalı taramada son indeks 6'nın katı DEĞİLDİR: eski `i % 6 === 0`
    // filtresi tam da bu yüzden son satırı düşürüyordu, ekran ise
    // <ChartDataTable every={6} .../> ile onu her zaman gösteriyordu.
    expect((s.rows.length - 1) % 6).not.toBe(0)

    const rows = section.chart.table.rows
    const last = s.rows[s.rows.length - 1]
    expect(rows[rows.length - 1]).toEqual([fmtEng(last.x, '', 4), fmt(last.y, 4)])
  })

  it('hiçbir sonuç satırı, hiçbir modda, boş etiket ya da undefined değer taşımaz', () => {
    const cases = [
      buildFor(MODE_ANALYSIS),
      buildFor(MODE_SYNTHESIS),
    ]
    for (const { section } of cases) {
      for (const row of [...section.inputs, ...section.results]) {
        expect(row.label, JSON.stringify(row)).toBeTruthy()
        expect(row.value, JSON.stringify(row)).not.toBe('undefined')
        expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      }
    }
  })

  it('schematicCaption — ekrandaki <figcaption> ile aynı metni taşır', () => {
    expect(buildFor(MODE_ANALYSIS).section.schematicCaption).toBe(text.schematic.caption)
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = { ...INITIAL_FORM }
    const r = compute(MODE_ANALYSIS, f, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.modeLabel[MODE_ANALYSIS])
  })
})
