import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS,
} from './model'
import { getText } from './text'
import { fmt, fmtVolt } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`s`/`text` kaynağından üretilir; bu test her sürümde yapının
// bozulup bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması)
// denetler.
const text = getText('tr')

describe('VoltageDivider report.js', () => {
  it('analiz modunda geçerli girdide dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeAnalysis)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    // rMax <= rMin → REASON_RANGE, sentez modunda derhal başarısız
    const f = { ...INITIAL_FORM, rMin: '1', rMinu: 'MΩ', rMax: '1', rMaxu: 'kΩ' }
    const r = compute(MODE_SYNTHESIS, f, 0, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })).toBeNull()
  })

  it('eksik zorunlu alanda da null döner', () => {
    const f = { ...INITIAL_FORM, Vin: '' }
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_ANALYSIS, f, r, text })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu ve büyük sonuçtaki değerle (fmtVolt) aynı', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigResultUnloaded)
    expect(`${section.results[0].value} ${section.results[0].unit}`).toBe(fmtVolt(r.Vout))
  })

  it('yük girilmemişse büyük sonuç etiketi yüksüz metnini kullanır', () => {
    const f = INITIAL_FORM // RL boş
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(r.RL).toBeNull()
    expect(section.results[0].label).toBe(text.bigResultUnloaded)
    // Yüksüz durumda R2∥R_L ve yük akımı satırları hiç görünmez
    expect(section.results.some((row) => row.label === text.table.r2ParRL)).toBe(false)
    expect(section.results.some((row) => row.label === text.table.loadCurrent)).toBe(false)
  })

  it('yük girilmişse R2∥R_L ve yük akımı satırları eklenir', () => {
    const f = { ...INITIAL_FORM, RL: '10', RLu: 'kΩ' }
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.RL).not.toBeNull()
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.results.some((row) => row.label === text.table.r2ParRL)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.loadCurrent)).toBe(true)
  })

  it('yük girilmişse büyük sonuç etiketi bigResultLoaded metnini kullanır', () => {
    const f = { ...INITIAL_FORM, RL: '10', RLu: 'kΩ' }
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.results[0].label).toBe(text.bigResultLoaded(r.RL))
  })

  it('analiz modunda R1/R2 girdi olarak listelenir, E serisi listelenmez', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.R1)
    expect(labels).toContain(text.fieldLabels.R2)
    expect(labels).not.toContain(text.fields.series.label)
    // Analiz modunda hedef çıkış yok — sonuçlarda hedef/sapma satırı da görünmez
    expect(section.results.some((row) => row.label === text.table.targetDeviation)).toBe(false)
  })

  it('sentez modunda E serisi girdi olarak listelenir ve hedef/sapma satırı eklenir', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, 0, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.pairs).not.toBeNull()
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fields.series.label)
    expect(section.inputs.find((i) => i.label === text.fields.series.label).value).toBe('E24')
    // Sonuçlardaki hedef/sapma satırı girdi bloğundaki hedef alanıyla aynı
    // etiketi paylaşmaz (kendi etiketi vardır, bkz. text.table.targetDeviation).
    expect(section.results.some((row) => row.label === text.table.targetDeviation)).toBe(true)
    expect(labels).toContain(text.fields.Vout.label)
    expect(
      section.results.filter((row) => row.label === text.fields.Vout.label).length,
    ).toBe(0)
  })

  it('tolerans işaretliyse tolerans satırı ve tolR1/tolR2/tolVin girdileri eklenir', () => {
    const f = { ...INITIAL_FORM, tol: true }
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    expect(r.tolerance).not.toBeNull()
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.results.some((row) => row.label === text.table.tolWindow)).toBe(true)
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.tolR1)
    expect(labels).toContain(text.fieldLabels.tolR2)
    expect(labels).toContain(text.fieldLabels.tolVin)
  })

  it('tolerans işaretli değilse tolerans satırı görünmez', () => {
    const f = INITIAL_FORM // tol: false
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    expect(r.tolerance).toBeNull()
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.results.some((row) => row.label === text.table.tolWindow)).toBe(false)
  })

  it('bulgular notlara aynı seviye ve metinle taşınır (ekrandaki commentary ile aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.notes.length).toBe(r.findings.length)
    r.findings.forEach((fd, i) => {
      expect(section.notes[i].level).toBe(fd.level)
      expect(section.notes[i].text).toBe(text.findingText(fd))
    })
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    const s = buildSweep(r, 'RL')
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
    expect(section.chart.title).toBe(text.sweepCaption.RL)
    // Ekrandaki <ChartDataTable every={5} .../> son noktayı her zaman dahil
    // eder (asimptot); dışa aktarılan tablo da aynı son satırı taşımalı.
    const lastRow = s.rows[s.rows.length - 1]
    const lastExported = section.chart.table.rows[section.chart.table.rows.length - 1]
    expect(lastExported).toEqual([fmt(lastRow.x, 3), fmt(lastRow.y, 3)])
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.chart).toBeNull()
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz (analiz, yüklü, toleranslı)', () => {
    const f = { ...INITIAL_FORM, RL: '10', RLu: 'kΩ', tol: true }
    const r = compute(MODE_ANALYSIS, f, 0, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
    }
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz (sentez)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, 0, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
    }
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, 0, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.modeAnalysis)
  })
})
