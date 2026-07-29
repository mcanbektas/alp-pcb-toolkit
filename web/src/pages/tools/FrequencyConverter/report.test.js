import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, SOURCE_FREQUENCY, SOURCE_PERIOD,
} from './model'
import { getText } from './text'
import { fmtEng } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('FrequencyConverter report.js', () => {
  it('geçerli girdide (frekanstan) dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBeNull()
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa (frekans sıfır) null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, freq: '0' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu ve frekanstan modda periyodun dinamik SI birimini taşır (ekranla aynı fmtEng)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    // Ekranda .big-result .value: fmtEng(r.period, 's', 4) — 100 MHz -> 10 ns
    const [expectedValue, expectedUnit] = fmtEng(r.period, 's', 4).split(' ')
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.mainLabel[SOURCE_FREQUENCY])
    expect(section.results[0].value).toBe(expectedValue)
    expect(section.results[0].unit).toBe(expectedUnit)
  })

  it('periyottan modda ilk sonuç satırı frekansın dinamik SI birimini taşır ve periyot girdisi listelenir', () => {
    const f = { ...INITIAL_FORM, source: SOURCE_PERIOD }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })

    // Ekranda .big-result .value: fmtEng(r.frequency, 'Hz', 4) — 10 ns -> 100 MHz
    const [expectedValue, expectedUnit] = fmtEng(r.frequency, 'Hz', 4).split(' ')
    expect(r.source).toBe(SOURCE_PERIOD)
    expect(section.results[0].label).toBe(text.mainLabel[SOURCE_PERIOD])
    expect(section.results[0].value).toBe(expectedValue)
    expect(section.results[0].unit).toBe(expectedUnit)

    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.period)
    expect(labels).not.toContain(text.fieldLabels.freq)
  })

  it('birim karşılıkları tabloları (Hz…GHz, s…ps) sonuç satırlarında yer alır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const labels = section.results.map((row) => row.label)
    for (const unit of ['Hz', 'kHz', 'MHz', 'GHz', 's', 'ms', 'µs', 'ns', 'ps']) {
      expect(labels).toContain(unit)
    }
  })

  it('hiçbir sonuç satırı boş etiket ya da undefined değer taşımaz', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  it('yüksek frekansta geçerlilik uyarısı notlarda "warn" seviyesi olarak görünür', () => {
    const f = { ...INITIAL_FORM, freq: '2', frequ: 'GHz' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.notes.some((n) => n.level === 'warn')).toBe(true)
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.chart).toBeNull()
  })

  it('İngilizce metinle çağrıldığında araç adı ve ana etiket de İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.results[0].label).toBe(en.mainLabel[SOURCE_FREQUENCY])
  })
})
