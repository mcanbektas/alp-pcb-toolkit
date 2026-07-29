import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  MODE_POWER, MODE_VOLTAGE, MODE_DBM,
  DIR_FORWARD, DIR_REVERSE,
} from './model'
import { getText } from './text'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

function assertNoEmptyRows(section) {
  for (const row of [...section.inputs, ...section.results]) {
    expect(row.label, JSON.stringify(row)).toBeTruthy()
    expect(row.value, JSON.stringify(row)).not.toBe('undefined')
    expect(row.value, JSON.stringify(row)).not.toBeUndefined()
  }
}

describe('DecibelConverter report.js', () => {
  it('geçerli girdide (güç oranı, ileri yön) dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeLabel[MODE_POWER])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].unit).toBe('dB')
    expect(section.schematicCaption).toBe(text.schematic.captionRatio)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, P1: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('hiçbir satır boş etiket ya da undefined değer taşımaz', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    assertNoEmptyRows(section)
  })

  describe('compute() dallarının tamamı', () => {
    it('güç oranı — ileri yön: P1/P2 satırları görünür', () => {
      const f = { ...INITIAL_FORM, mode: MODE_POWER, dir: DIR_FORWARD, P1: '1', P1u: 'mW', P2: '100', P2u: 'mW' }
      const r = compute(f, text.fieldLabels)
      const section = buildReportSection({ f, r, text })

      expect(section).not.toBeNull()
      expect(section.mode).toBe(text.modeLabel[MODE_POWER])
      expect(section.results.some((row) => row.label === text.gainTable.P1)).toBe(true)
      expect(section.results.some((row) => row.label === text.gainTable.P2)).toBe(true)
      assertNoEmptyRows(section)
    })

    it('güç oranı — ters yön, isteğe bağlı P1 boş: P1/P2 satırları görünmez', () => {
      const f = { ...INITIAL_FORM, mode: MODE_POWER, dir: DIR_REVERSE, dB: '20', P1: '' }
      const r = compute(f, text.fieldLabels)
      const section = buildReportSection({ f, r, text })

      expect(section).not.toBeNull()
      expect(section.results.some((row) => row.label === text.gainTable.P1)).toBe(false)
      expect(section.results.some((row) => row.label === text.gainTable.P2)).toBe(false)
      expect(section.results.some((row) => row.label === text.gainTable.gain)).toBe(true)
      assertNoEmptyRows(section)
    })

    it('güç oranı — ters yön, isteğe bağlı P1 dolu: P1/P2 satırları görünür', () => {
      const f = { ...INITIAL_FORM, mode: MODE_POWER, dir: DIR_REVERSE, dB: '20', P1: '2', P1u: 'W' }
      const r = compute(f, text.fieldLabels)
      const section = buildReportSection({ f, r, text })

      expect(section).not.toBeNull()
      expect(section.results.some((row) => row.label === text.gainTable.P1)).toBe(true)
      expect(section.results.some((row) => row.label === text.gainTable.P2)).toBe(true)
      assertNoEmptyRows(section)
    })

    it('gerilim oranı — ileri yön: V1/V2 satırları görünür', () => {
      const f = { ...INITIAL_FORM, mode: MODE_VOLTAGE, dir: DIR_FORWARD, V1: '1', V1u: 'V', V2: '10', V2u: 'V' }
      const r = compute(f, text.fieldLabels)
      const section = buildReportSection({ f, r, text })

      expect(section).not.toBeNull()
      expect(section.mode).toBe(text.modeLabel[MODE_VOLTAGE])
      expect(section.results.some((row) => row.label === text.gainTable.V1)).toBe(true)
      expect(section.results.some((row) => row.label === text.gainTable.V2)).toBe(true)
      assertNoEmptyRows(section)
    })

    it('gerilim oranı — ters yön, isteğe bağlı V1 boş: V1/V2 satırları görünmez', () => {
      const f = { ...INITIAL_FORM, mode: MODE_VOLTAGE, dir: DIR_REVERSE, dB: '20', V1: '' }
      const r = compute(f, text.fieldLabels)
      const section = buildReportSection({ f, r, text })

      expect(section).not.toBeNull()
      expect(section.results.some((row) => row.label === text.gainTable.V1)).toBe(false)
      expect(section.results.some((row) => row.label === text.gainTable.V2)).toBe(false)
      assertNoEmptyRows(section)
    })

    it('gerilim oranı — ters yön, isteğe bağlı V1 dolu: V1/V2 satırları görünür', () => {
      const f = { ...INITIAL_FORM, mode: MODE_VOLTAGE, dir: DIR_REVERSE, dB: '20', V1: '2', V1u: 'V' }
      const r = compute(f, text.fieldLabels)
      const section = buildReportSection({ f, r, text })

      expect(section).not.toBeNull()
      expect(section.results.some((row) => row.label === text.gainTable.V1)).toBe(true)
      expect(section.results.some((row) => row.label === text.gainTable.V2)).toBe(true)
      assertNoEmptyRows(section)
    })

    it('dBm — ileri yön (güçten): dBm ve referans empedans satırları görünür', () => {
      const f = { ...INITIAL_FORM, mode: MODE_DBM, dir: DIR_FORWARD, P: '1', Pu: 'mW', Z: '50' }
      const r = compute(f, text.fieldLabels)
      const section = buildReportSection({ f, r, text })

      expect(section).not.toBeNull()
      expect(section.mode).toBe(text.modeLabel[MODE_DBM])
      expect(section.results[0].unit).toBe('dBm')
      expect(section.results.some((row) => row.label === text.dbmTable.refZ)).toBe(true)
      expect(section.schematicCaption).toBe(text.schematic.captionDbm)
      assertNoEmptyRows(section)
    })

    it('dBm — ters yön (dBm değerinden): dBm ve referans empedans satırları görünür', () => {
      const f = { ...INITIAL_FORM, mode: MODE_DBM, dir: DIR_REVERSE, dBm: '0', Z: '50' }
      const r = compute(f, text.fieldLabels)
      const section = buildReportSection({ f, r, text })

      expect(section).not.toBeNull()
      expect(section.mode).toBe(text.modeLabel[MODE_DBM])
      expect(section.results.some((row) => row.label === text.dbmTable.vrms)).toBe(true)
      assertNoEmptyRows(section)
    })
  })

  it('sweep (s) verilince chart.table dolu döner (oran dalı — iki seri)', () => {
    const f = { ...INITIAL_FORM, mode: MODE_POWER, dir: DIR_FORWARD }
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.columns).toHaveLength(3)
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
  })

  it('sweep (s) verilince chart.table dolu döner (dBm dalı — tek seri)', () => {
    const f = { ...INITIAL_FORM, mode: MODE_DBM, dir: DIR_FORWARD, P: '1', Pu: 'mW', Z: '50' }
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.table.columns).toHaveLength(2)
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.chart).toBeNull()
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.modeLabel[MODE_POWER])
  })
})
