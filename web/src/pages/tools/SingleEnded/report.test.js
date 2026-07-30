import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS,
  STRUCT_MICROSTRIP, STRUCT_STRIPLINE, STRUCT_CPW,
} from './model'
import { getText } from './text'
import { fmt, fmtRes } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('SingleEnded report.js', () => {
  it('geçerli girdide dolu bir bölüm döner (analiz modu)', () => {
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
    expect(buildReportSection({ mode: MODE_ANALYSIS, f, r, text })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu (analiz modunda karakteristik empedans)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigResultZ0)
    expect(section.results[0].unit).toBe('Ω')
  })

  it('sentez modunda ilk sonuç satırı gereken hat genişliği olur', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigResultWidth)
  })

  it('analiz modunda genişlik girdisi listelenir, hedef listelenmez', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.W)
    expect(labels).not.toContain(text.fieldLabels.target)
  })

  it('sentez modunda hedef girdisi listelenir, genişlik listelenmez', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.target)
    expect(labels).not.toContain(text.fieldLabels.W)
  })

  it('microstrip yapısında W/H oranı (u) satırı görünür, eliptik modül (k) görünmez', () => {
    const f = { ...INITIAL_FORM, structure: STRUCT_MICROSTRIP }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain(text.table.u)
    expect(labels).not.toContain(text.table.k)
  })

  it('stripline yapısında eliptik modül (k) satırı görünür, u görünmez; b girdisi listelenir', () => {
    const f = { ...INITIAL_FORM, structure: STRUCT_STRIPLINE }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    const resultLabels = section.results.map((row) => row.label)
    expect(resultLabels).toContain(text.table.k)
    expect(resultLabels).not.toContain(text.table.u)
    expect(section.inputs.map((i) => i.label)).toContain(text.fieldLabels.b)
  })

  it('coplanar waveguide yapısında S girdisi listelenir, tolerans işaretlense de tolerans satırı üretilmez', () => {
    const f = { ...INITIAL_FORM, structure: STRUCT_CPW, tol: true }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.inputs.map((i) => i.label)).toContain(text.fieldLabels.S)
    expect(section.results.map((row) => row.label)).not.toContain(text.table.tolWindow)
  })

  it('coplanar waveguide yapısında tolerans işaretlense de dört tolerans girdisi listelenmez (ekran bu alanları hiç göstermez)', () => {
    const f = { ...INITIAL_FORM, structure: STRUCT_CPW, tol: true }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).not.toContain(text.fieldLabels.tolW)
    expect(labels).not.toContain(text.fieldLabels.tolH)
    expect(labels).not.toContain(text.fieldLabels.tolT)
    expect(labels).not.toContain(text.fieldLabels.tolEps)
  })

  it('tolerans işaretliyse (microstrip/stripline) tolerans penceresi satırı eklenir', () => {
    const f = { ...INITIAL_FORM, structure: STRUCT_MICROSTRIP, tol: true }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.results.some((row) => row.label === text.table.tolWindow)).toBe(true)
  })

  it('hiçbir sonuç satırı boş etiket ya da undefined değer taşımaz', () => {
    for (const structure of [STRUCT_MICROSTRIP, STRUCT_STRIPLINE, STRUCT_CPW]) {
      for (const mode of [MODE_ANALYSIS, MODE_SYNTHESIS]) {
        const f = { ...INITIAL_FORM, structure, tol: structure !== STRUCT_CPW }
        const r = compute(mode, f, text.fieldLabels)
        const section = buildReportSection({ mode, f, r, text })
        expect(section, `${structure}/${mode} hesap başarısız oldu`).not.toBeNull()
        for (const row of [...section.inputs, ...section.results]) {
          expect(row.label, JSON.stringify(row)).toBeTruthy()
          expect(row.value, JSON.stringify(row)).not.toBe('undefined')
          expect(row.value, JSON.stringify(row)).not.toBeUndefined()
        }
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
    expect(rows[rows.length - 1]).toEqual([fmt(last.x, 4), fmtRes(last.y, 4)])
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
