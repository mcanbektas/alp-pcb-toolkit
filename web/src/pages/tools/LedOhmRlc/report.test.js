import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  TOOL_OHM, TOOL_LED, TOOL_RLC, TOOL_COMBO,
  MODE_ANALYSIS, MODE_SYNTHESIS, COMBO_PARALLEL, COMBO_SERIES,
} from './model'
import { getText } from './text'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

function buildFor(tool, mode, overrides = {}) {
  const f = { ...INITIAL_FORM, tool, ...overrides }
  const r = compute(tool, mode, f, text.fieldLabels)
  const s = buildSweep(r)
  return { f, r, s, section: buildReportSection({ mode, f, r, s, text }) }
}

describe('LedOhmRlc report.js', () => {
  it('Ohm kanunu — geçerli girdide dolu bir bölüm döner', () => {
    const { section } = buildFor(TOOL_OHM, MODE_ANALYSIS)

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.toolLabel[TOOL_OHM])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results.some((row) => row.label === text.table.voltage)).toBe(true)
  })

  it('Ohm kanunu — üç değer birden girilince tutarsızlık satırı eklenir', () => {
    const { section } = buildFor(TOOL_OHM, MODE_ANALYSIS, { I: '30', Iu: 'mA' })
    expect(section.results.some((row) => row.label === text.table.inconsistency)).toBe(true)
  })

  it('Ohm kanunu — yetersiz girdide compute() başarısız olur, null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, tool: TOOL_OHM, V: '', I: '', R: '', P: '' }
    const r = compute(TOOL_OHM, MODE_ANALYSIS, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_ANALYSIS, f, r, text })).toBeNull()
  })

  it('LED — geçerli girdide E24/E96 ve nominal güç satırları görünür', () => {
    const { section } = buildFor(TOOL_LED, MODE_ANALYSIS)

    expect(section).not.toBeNull()
    expect(section.mode).toBe(text.toolLabel[TOOL_LED])
    expect(section.results.some((row) => row.label === 'E24')).toBe(true)
    expect(section.results.some((row) => row.label === 'E96')).toBe(true)
    expect(section.results.some((row) => row.label === text.table.ratedPower)).toBe(true)
  })

  it('LED — n alanının birimi dile göre çevrilir ("adet" model.js sabiti değil)', () => {
    const { section: tr } = buildFor(TOOL_LED, MODE_ANALYSIS)
    expect(tr.inputs.find((i) => i.label === text.fieldLabels.n).unit).toBe('adet')

    const en = getText('en')
    const f = { ...INITIAL_FORM, tool: TOOL_LED }
    const r = compute(TOOL_LED, MODE_ANALYSIS, f, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text: en })
    expect(section.inputs.find((i) => i.label === en.fieldLabels.n).unit).toBe('pcs')
  })

  it('LED — seri gerilim beslemeyi aşınca compute() başarısız olur, null döner', () => {
    const f = { ...INITIAL_FORM, tool: TOOL_LED, Vf: '10', n: '1', Vs: '5' }
    const r = compute(TOOL_LED, MODE_ANALYSIS, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_ANALYSIS, f, r, text })).toBeNull()
  })

  it('RLC analiz — nearestC satırı YOK, empedans büyüklüğü büyük sonuçtur', () => {
    const { section } = buildFor(TOOL_RLC, MODE_ANALYSIS)

    expect(section).not.toBeNull()
    expect(section.mode).toBe(text.toolLabel[TOOL_RLC])
    expect(section.results.some((row) => row.label === text.table.nearestC)).toBe(false)
    expect(section.results[0].unit).toBe('Ω')
  })

  it('RLC sentez — nearestC satırı eklenir, büyük sonuç kapasitedir', () => {
    const { section } = buildFor(TOOL_RLC, MODE_SYNTHESIS)

    expect(section).not.toBeNull()
    expect(section.results.some((row) => row.label === text.table.nearestC)).toBe(true)
    expect(section.results[0].unit).not.toBe('Ω')
  })

  it('Seri/paralel birleşim — direnç sayısı kadar pay satırı döner, grafik yoktur', () => {
    const { section } = buildFor(TOOL_COMBO, MODE_ANALYSIS, { combo: COMBO_PARALLEL, values: '10k 22k 47k' })

    expect(section).not.toBeNull()
    expect(section.mode).toBe(text.toolLabel[TOOL_COMBO])
    // büyük sonuç + başlık satırı + 3 direnç
    expect(section.results).toHaveLength(5)
    expect(section.chart).toBeNull()
  })

  it('Seri/paralel birleşim (seri) — pay satırı başlığı text.table.shareSeries olur', () => {
    const { section } = buildFor(TOOL_COMBO, MODE_ANALYSIS, { combo: COMBO_SERIES, values: '10k 22k 47k' })

    expect(section).not.toBeNull()
    expect(section.results[1].value).toBe(text.table.shareSeries)
  })

  it('Seri/paralel birleşim — okunamayan değer listesinde null döner', () => {
    const f = { ...INITIAL_FORM, tool: TOOL_COMBO, values: '' }
    const r = compute(TOOL_COMBO, MODE_ANALYSIS, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_ANALYSIS, f, r, text })).toBeNull()
  })

  it('sweep (s) verilince Ohm/LED/RLC için chart.table dolu döner, svg alanı boş bırakılır', () => {
    for (const tool of [TOOL_OHM, TOOL_LED, TOOL_RLC]) {
      const { section } = buildFor(tool, MODE_ANALYSIS)
      expect(section.chart, tool).not.toBeNull()
      expect(section.chart.svg).toBeNull()
      expect(section.chart.table.columns).toHaveLength(2)
      expect(section.chart.table.rows.length).toBeGreaterThan(0)
    }
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = { ...INITIAL_FORM, tool: TOOL_OHM }
    const r = compute(TOOL_OHM, MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.chart).toBeNull()
  })

  it('hiçbir sonuç satırı, tüm dallarda, boş etiket ya da undefined değer taşımaz', () => {
    const cases = [
      buildFor(TOOL_OHM, MODE_ANALYSIS),
      buildFor(TOOL_OHM, MODE_ANALYSIS, { I: '30', Iu: 'mA' }),
      buildFor(TOOL_LED, MODE_ANALYSIS),
      buildFor(TOOL_RLC, MODE_ANALYSIS),
      buildFor(TOOL_RLC, MODE_SYNTHESIS),
      buildFor(TOOL_COMBO, MODE_ANALYSIS, { combo: COMBO_PARALLEL, values: '10k 22k 47k' }),
    ]
    for (const { section } of cases) {
      for (const row of [...section.inputs, ...section.results]) {
        expect(row.label, JSON.stringify(row)).toBeTruthy()
        expect(row.value, JSON.stringify(row)).not.toBe('undefined')
        expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      }
    }
  })

  it('schematicCaption — ekrandaki <figcaption> ile aynı metni taşır (ohm/led/rlc/combo)', () => {
    expect(buildFor(TOOL_OHM, MODE_ANALYSIS).section.schematicCaption).toBe(text.schematic.caption[TOOL_OHM])
    expect(buildFor(TOOL_LED, MODE_ANALYSIS).section.schematicCaption).toBe(text.schematic.caption[TOOL_LED])
    expect(buildFor(TOOL_RLC, MODE_ANALYSIS).section.schematicCaption).toBe(text.schematic.caption[TOOL_RLC])

    const { section: seriesSection } = buildFor(
      TOOL_COMBO, MODE_ANALYSIS, { combo: COMBO_SERIES, values: '10k 22k 47k' },
    )
    expect(seriesSection.schematicCaption).toBe(text.schematic.captionSeries)

    const { section: parallelSection } = buildFor(
      TOOL_COMBO, MODE_ANALYSIS, { combo: COMBO_PARALLEL, values: '10k 22k 47k' },
    )
    expect(parallelSection.schematicCaption).toBe(text.schematic.captionParallel)
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = { ...INITIAL_FORM, tool: TOOL_OHM }
    const r = compute(TOOL_OHM, MODE_ANALYSIS, f, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.toolLabel[TOOL_OHM])
  })
})
