import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS, FIX_WIDTH, FIX_SPACING,
  STRUCT_MICROSTRIP, STRUCT_STRIPLINE,
} from './model'
import { getText } from './text'
import { fmt } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`s`/`text` kaynağından üretilir; bu test her sürümde yapının
// bozulup bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması)
// denetler.
const text = getText('tr')

describe('DiffPair report.js', () => {
  it('analiz modunda dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeAnalysis)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, epsR: '' }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_ANALYSIS, f, r, text })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu (analiz: Z_diff)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.results[0].label).toBe(text.bigResultZdiff)
    expect(section.results[0].emphasis).toBe(true)
  })

  it('sentez modunda genişlik sabitken aralık bulunur ve büyük sonuç etiketi ona göre değişir', () => {
    const f = { ...INITIAL_FORM, fixed: FIX_WIDTH }
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.solvedFor).toBe('S')
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    expect(section.mode).toBe(text.modeSynthesis)
    expect(section.results[0].label).toBe(text.bigResultSpacing)
    expect(section.results[0].emphasis).toBe(true)
  })

  it('sentez modunda aralık sabitken genişlik bulunur ve büyük sonuç etiketi ona göre değişir', () => {
    const f = { ...INITIAL_FORM, fixed: FIX_SPACING }
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.solvedFor).toBe('W')
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    expect(section.results[0].label).toBe(text.bigResultWidth)
    expect(section.results[0].emphasis).toBe(true)
  })

  it('sonuç tablosu ekrandaki tüm satırları taşır (Z_diff/odd/even/common/Z0/2×Z0/kuplaj/oran/εeff/tpd/geometri)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    const labels = section.results.map((row) => row.label)
    expect(labels).toEqual([
      text.bigResultZdiff,
      text.table.zdiff,
      text.table.zodd,
      text.table.zeven,
      text.table.zcommon,
      text.table.z0,
      text.table.twiceZ0,
      text.table.coupling,
      text.table.ratio,
      text.table.epsEff,
      text.table.tpd,
      text.table.geometry,
    ])
  })

  it('H girdisinin etiketi yapıya göre değişir (ekranla aynı: microstrip → HMicrostrip, stripline → HStripline)', () => {
    const fMicrostrip = { ...INITIAL_FORM, structure: STRUCT_MICROSTRIP }
    const rMicrostrip = compute(MODE_ANALYSIS, fMicrostrip, text.fieldLabels)
    const sectionMicrostrip = buildReportSection({ mode: MODE_ANALYSIS, f: fMicrostrip, r: rMicrostrip, text })
    const hRowMicrostrip = sectionMicrostrip.inputs.find((row) => row.value === fMicrostrip.H)
    expect(hRowMicrostrip.label).toBe(text.fields.HMicrostrip)
    expect(hRowMicrostrip.label).not.toBe(text.fieldLabels.H)

    const fStripline = { ...INITIAL_FORM, structure: STRUCT_STRIPLINE }
    const rStripline = compute(MODE_ANALYSIS, fStripline, text.fieldLabels)
    const sectionStripline = buildReportSection({ mode: MODE_ANALYSIS, f: fStripline, r: rStripline, text })
    const hRowStripline = sectionStripline.inputs.find((row) => row.value === fStripline.H)
    expect(hRowStripline.label).toBe(text.fields.HStripline)
    expect(hRowStripline.label).not.toBe(text.fieldLabels.H)
  })

  it('sentez modunda sabitlenen W/S girdisinin etiketi "Sabit ..." metnidir (ekranla aynı: WFixed/SFixed)', () => {
    // W ve H varsayılanda aynı sayısal değeri taşır ('0.2'); satırı değere göre
    // değil, ayırt edici bir değere göre bulmak için W'ye farklı bir değer verilir.
    const fWidth = { ...INITIAL_FORM, fixed: FIX_WIDTH, W: '0.33' }
    const rWidth = compute(MODE_SYNTHESIS, fWidth, text.fieldLabels)
    const sectionWidth = buildReportSection({ mode: MODE_SYNTHESIS, f: fWidth, r: rWidth, text })
    const wRow = sectionWidth.inputs.find((row) => row.value === '0.33')
    expect(wRow.label).toBe(text.fields.WFixed.label)
    expect(wRow.label).not.toBe(text.fieldLabels.W)

    const fSpacing = { ...INITIAL_FORM, fixed: FIX_SPACING, S: '0.44' }
    const rSpacing = compute(MODE_SYNTHESIS, fSpacing, text.fieldLabels)
    const sectionSpacing = buildReportSection({ mode: MODE_SYNTHESIS, f: fSpacing, r: rSpacing, text })
    const sRow = sectionSpacing.inputs.find((row) => row.value === '0.44')
    expect(sRow.label).toBe(text.fields.SFixed.label)
    expect(sRow.label).not.toBe(text.fieldLabels.S)
  })

  it('hiçbir sonuç satırı boş etiket ya da undefined değer taşımaz', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
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
    expect(section.chart.table.columns).toHaveLength(3)
    expect(section.chart.table.columns[1]).toBe('Z_diff')
    expect(section.chart.table.columns[2]).toBe('Z_odd')
  })

  it('chart tablosu taramanın son satırını hiç atlamaz (ekrandaki kuralla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const s = buildSweep(r)
    // 70 noktalı taramada son indeks (69) 6'nın katı DEĞİLDİR: eski
    // `i % 6 === 0` filtresi tam da bu yüzden son satırı düşürüyordu, ekran ise
    // <ChartDataTable every={6} .../> ile onu her zaman gösteriyordu.
    expect((s.rows.length - 1) % 6).not.toBe(0)

    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, s, text })
    const rows = section.chart.table.rows
    const last = s.rows[s.rows.length - 1]
    expect(rows[rows.length - 1]).toEqual([fmt(last.x, 3), fmt(last.y, 3), fmt(last.odd, 3)])
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
    const r = compute(MODE_ANALYSIS, f, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.modeAnalysis)
  })
})
