import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, MODE_ABS, MODE_DELTA, SWEEP_F, SWEEP_K,
  UNIT_C, UNIT_F,
} from './model'
import { getText } from './text'
import { fmt } from '../../../lib/num'

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

describe('TemperatureConverter report.js', () => {
  it('geçerli girdide (mutlak mod) dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeLabel[MODE_ABS])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.schematicCaption).toBe(text.schematic.captionAbs)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural — mutlak sıfır altı)', () => {
    const f = { ...INITIAL_FORM, T: '-300', Tu: UNIT_C }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('hesap başarısızsa null döner (ekranla aynı kural — boş giriş)', () => {
    const f = { ...INITIAL_FORM, T: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('hiçbir satır boş etiket ya da undefined değer taşımaz (mutlak mod)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    assertNoEmptyRows(section)
  })

  describe('compute() dallarının tamamı', () => {
    it('mutlak mod: üç ölçek satırı ve referans tablosu görünür, yükselme bloğu görünmez', () => {
      const f = INITIAL_FORM
      const r = compute(f, text.fieldLabels)
      const section = buildReportSection({ f, r, text })

      expect(section.mode).toBe(text.modeLabel[MODE_ABS])
      expect(section.results.some((row) => row.label === text.scaleLabel[UNIT_C])).toBe(true)
      expect(section.results.some((row) => row.label === text.scaleLabel[UNIT_F])).toBe(true)
      expect(section.results.some((row) => row.label === text.scaleLabel.K)).toBe(true)
      expect(section.results.some((row) => row.label === text.table.margin)).toBe(true)
      expect(section.results.some((row) => row.label === text.refPointLabel.absZero)).toBe(true)
      expect(section.results.some((row) => row.label === text.rise.final)).toBe(false)
      assertNoEmptyRows(section)
    })

    it('fark modu, ortam boş: ΔT satırları görünür, yükselme/referans blokları görünmez', () => {
      const f = { ...INITIAL_FORM, mode: MODE_DELTA, T: '10', Tu: UNIT_C, amb: '' }
      const r = compute(f, text.fieldLabels)
      const section = buildReportSection({ f, r, text })

      expect(section).not.toBeNull()
      expect(section.mode).toBe(text.modeLabel[MODE_DELTA])
      expect(section.schematicCaption).toBe(text.schematic.captionDelta)
      expect(section.results.some((row) => row.label === text.deltaScaleLabel[UNIT_C])).toBe(true)
      expect(section.results.some((row) => row.label === text.rise.final)).toBe(false)
      expect(section.results.some((row) => row.label === text.refPointLabel.absZero)).toBe(false)
      expect(section.results.some((row) => row.label === text.table.margin)).toBe(false)
      assertNoEmptyRows(section)
    })

    it('fark modu, ortam dolu: yükselme bloğu (ortam/fark/sonuç) görünür', () => {
      const f = { ...INITIAL_FORM, mode: MODE_DELTA, T: '10', Tu: UNIT_C, amb: '25', ambu: UNIT_C }
      const r = compute(f, text.fieldLabels)
      const section = buildReportSection({ f, r, text })

      expect(section).not.toBeNull()
      expect(section.results.some((row) => row.label === text.rise.ambient)).toBe(true)
      expect(section.results.some((row) => row.label === text.rise.delta)).toBe(true)
      expect(section.results.some((row) => row.label === text.rise.final)).toBe(true)
      assertNoEmptyRows(section)
    })

    it('fark modu, ortam dolu: ΔT satırı değeri C · F · K sırasını korur (ekranla aynı, transpozisyon regresyonu)', () => {
      // dC=10, dK=10, dF=18 — dK ve dF sayısal olarak farklı olduğundan bir
      // C·K·F ↔ C·F·K karışıklığı burada sessizce geçmez.
      const f = { ...INITIAL_FORM, mode: MODE_DELTA, T: '10', Tu: UNIT_C, amb: '25', ambu: UNIT_C }
      const r = compute(f, text.fieldLabels)
      const section = buildReportSection({ f, r, text })

      const deltaRow = section.results.find((row) => row.label === text.rise.delta)
      expect(deltaRow).toBeTruthy()
      expect(deltaRow.value).toBe(
        `${fmt(r.delta.dC, 6)} · ${fmt(r.delta.dF, 6)} · ${fmt(r.delta.dK, 6)} ${text.rise.deltaSub}`,
      )
    })
  })

  it('giriş satırları ekrandaki birim seçiciyle aynı birimi taşır', () => {
    const f = { ...INITIAL_FORM, T: '77', Tu: UNIT_F }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const tRow = section.inputs.find((i) => i.label === text.fieldLabels.absT)
    expect(tRow).toBeTruthy()
    expect(tRow.value).toBe('77')
    expect(tRow.unit).toBe(UNIT_F)
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_F)
    const section = buildReportSection({ f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
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
    expect(section.mode).toBe(en.modeLabel[MODE_ABS])
  })
})
