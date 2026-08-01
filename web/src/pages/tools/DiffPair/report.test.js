import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS,
  STRUCT_MICROSTRIP, STRUCT_STRIPLINE,
} from './model'
import { getText } from './text'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`fs`/`text` kaynağından üretilir; bu test her sürümde yapının
// bozulup bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması)
// denetler.
//
// F2: çiftin sayıları alan çözücüden gelir. Testte worker yok — çözücü saf
// motordan senkron çağrılır ve rapora `fs` olarak verilir; fs'siz çağrı,
// indirme anında çözümün bitmediği durumu temsil eder.
import { fieldDifferentialPair } from '../../../lib/fieldSolver'

const text = getText('tr')

function solveFor(r) {
  const p = r.solverParams
  const fs = fieldDifferentialPair({
    structure: p.structure, W: p.W, S: p.S, H: p.height, t: p.t, epsR: p.epsR,
  })
  expect(fs.error).toBeUndefined()
  return fs
}

describe('DiffPair report.js', () => {
  it('analiz modunda dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const fs = solveFor(r)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text, fs })

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
    expect(buildReportSection({ mode: MODE_ANALYSIS, f, r, text, fs: null })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu (analiz: Z_diff çözücüden)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const fs = solveFor(r)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text, fs })
    expect(section.results[0].label).toBe(text.bigResultZdiff)
    expect(section.results[0].emphasis).toBe(true)
    // Değer çözücünün Z_diff'i — kapalı formdan türetilmiş bir sayı değil
    expect(`${section.results[0].value}${section.results[0].unit ?? ''}`).toContain('Ω')
  })

  it('çözücü sonucu yokken (indirme anında hâlâ hesaplanıyor) çift satırları rapora girmez', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text, fs: null })
    const labels = section.results.map((row) => row.label)
    expect(labels).not.toContain(text.table.zodd)
    expect(labels).toContain(text.table.z0)
    // Büyük sonuç sayı uydurmaz
    expect(section.results[0].value).toBe(text.bigResultPending)
  })

  it('sentez modunda genişlik bulunur ve büyük sonuç etiketi ona göre değişir', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.solvedFor).toBe('W')
    const fs = solveFor(r)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text, fs })
    expect(section.mode).toBe(text.modeSynthesis)
    expect(section.results[0].label).toBe(text.bigResultWidth)
    expect(section.results[0].emphasis).toBe(true)
  })

  it('sonuç tablosu ekrandaki tüm satırları taşır (çözücü + kapalı form taban)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const fs = solveFor(r)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text, fs })
    const labels = section.results.map((row) => row.label)
    expect(labels).toEqual([
      text.bigResultZdiff,
      text.table.zdiff,
      text.table.zodd,
      text.table.zeven,
      text.table.zcommon,
      text.table.epsEffOdd,
      text.table.epsEffEven,
      text.table.tpdOdd,
      text.table.tpdEven,
      text.solver.rowConv,
      text.table.z0,
      text.table.twiceZ0,
      text.table.ratio,
      text.table.geometry,
      text.solver.rowMethod,
    ])
  })

  it('H girdisinin etiketi yapıya göre değişir (ekranla aynı: microstrip → HMicrostrip, stripline → HStripline)', () => {
    const fMicrostrip = { ...INITIAL_FORM, structure: STRUCT_MICROSTRIP }
    const rMicrostrip = compute(MODE_ANALYSIS, fMicrostrip, text.fieldLabels)
    const sectionMicrostrip = buildReportSection({ mode: MODE_ANALYSIS, f: fMicrostrip, r: rMicrostrip, text, fs: null })
    const hRowMicrostrip = sectionMicrostrip.inputs.find((row) => row.value === fMicrostrip.H)
    expect(hRowMicrostrip.label).toBe(text.fields.HMicrostrip)
    expect(hRowMicrostrip.label).not.toBe(text.fieldLabels.H)

    const fStripline = { ...INITIAL_FORM, structure: STRUCT_STRIPLINE }
    const rStripline = compute(MODE_ANALYSIS, fStripline, text.fieldLabels)
    const sectionStripline = buildReportSection({ mode: MODE_ANALYSIS, f: fStripline, r: rStripline, text, fs: null })
    const hRowStripline = sectionStripline.inputs.find((row) => row.value === fStripline.H)
    expect(hRowStripline.label).toBe(text.fields.HStripline)
    expect(hRowStripline.label).not.toBe(text.fieldLabels.H)
  })

  it('hiçbir sonuç satırı boş etiket ya da undefined değer taşımaz', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const fs = solveFor(r)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text, fs })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  it('chart her zaman null (F2: ampirik tarama söküldü, çözücü taraması F3)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const fs = solveFor(r)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text, fs })
    expect(section.chart).toBeNull()
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text: en, fs: null })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.modeAnalysis)
  })
})
