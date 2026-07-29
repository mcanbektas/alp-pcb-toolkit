import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, TOOL_PLANE, TOOL_PARALLEL,
} from './model'
import { getText } from './text'
import { fmt, fmtOhm } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`s`/`text` kaynağından üretilir; bu test her sürümde yapının
// bozulup bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması)
// denetler.
const text = getText('tr')

describe('PowerPlane report.js', () => {
  it('güç düzlemi hesabında dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(f.tool, f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.toolLabel[TOOL_PLANE])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (boyun ortalamadan geniş)', () => {
    const f = { ...INITIAL_FORM, Wneck: '30', Wavg: '20' }
    const r = compute(f.tool, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('eksik girdide de null döner', () => {
    const f = { ...INITIAL_FORM, I: '' }
    const r = compute(f.tool, f, text.fieldLabels)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu (boyun bölgesi direnci)', () => {
    const f = INITIAL_FORM
    const r = compute(f.tool, f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results[0].label).toBe(text.bigResultPlane)
    expect(section.results[0].emphasis).toBe(true)
  })

  it('besleme gerilimi girilince beslemeye oranı satırı görünür', () => {
    const f = INITIAL_FORM // Vs = '5' varsayılan
    const r = compute(f.tool, f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.planeTable.supplyShare)).toBe(true)
  })

  it('besleme gerilimi boşken beslemeye oranı satırı görünmez', () => {
    const f = { ...INITIAL_FORM, Vs: '' }
    const r = compute(f.tool, f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.neck.pct).toBeNull()
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.planeTable.supplyShare)).toBe(false)
  })

  it('paralel yollar hesabında her kol için ayrı satır üretilir', () => {
    const f = { ...INITIAL_FORM, tool: TOOL_PARALLEL }
    const r = compute(f.tool, f, text.fieldLabels)
    expect(r.ok).toBe(true)
    const section = buildReportSection({ f, r, text })

    expect(section.mode).toBe(text.toolLabel[TOOL_PARALLEL])
    expect(section.results[0].label).toBe(text.bigResultParallel)
    expect(section.results[0].emphasis).toBe(true)
    // 2 varsayılan kol × 5 sütun = 10 kol satırı + toplam kayıp + eşit pay +
    // eşdeğer genişlik + toplam genişlik = 14 satır (büyük sonuç hariç)
    const branchLabels = section.results.map((row) => row.label).filter((l) => l.startsWith(text.fieldLabels.rowLabel))
    expect(branchLabels.length).toBe(f.traces.length * 5)
    expect(section.results.some((row) => row.label === text.parallelTable.totalLoss)).toBe(true)
    expect(section.results.some((row) => row.label === text.parallelTable.equivalentW)).toBe(true)
  })

  it('paralel yol satır listesi (Yol N — Uzunluk/Genişlik) girdilerde görünür', () => {
    const f = { ...INITIAL_FORM, tool: TOOL_PARALLEL }
    const r = compute(f.tool, f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.inputs.some((i) => i.label === `${text.fieldLabels.rowLabel} 1 — ${text.fieldLabels.rowL}`)).toBe(true)
    expect(section.inputs.some((i) => i.label === `${text.fieldLabels.rowLabel} 2 — ${text.fieldLabels.rowW}`)).toBe(true)
  })

  it('paralel yollarda geçersiz satır varsa null döner', () => {
    const f = {
      ...INITIAL_FORM,
      tool: TOOL_PARALLEL,
      traces: [{ L: '', Lu: 'mm', W: '1', Wu: 'mm' }, { L: '50', Lu: 'mm', W: '1', Wu: 'mm' }],
    }
    const r = compute(f.tool, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('hiçbir sonuç ya da girdi satırı boş etiket ya da undefined değer taşımaz (düzlem)', () => {
    const f = INITIAL_FORM
    const r = compute(f.tool, f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  it('hiçbir sonuç ya da girdi satırı boş etiket ya da undefined değer taşımaz (paralel)', () => {
    const f = { ...INITIAL_FORM, tool: TOOL_PARALLEL }
    const r = compute(f.tool, f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır (düzlem)', () => {
    const f = INITIAL_FORM
    const r = compute(f.tool, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  // ChartDataTable (components/LineChart.jsx) her `every`. adımı örnekler ve
  // son index listede yoksa zorla ekler — eğrinin sağ ucu (asimptot) hiç
  // düşmesin diye. chartSection aynı garantiyi vermeli, aksi halde indirilen
  // rapor ekrandaki tablonun son satırını sessizce kaybeder.
  it('düzlem modunda rapor tablosunun son satırı sweep\'in son noktasıyla eşleşir (ChartDataTable ile aynı garanti)', () => {
    const f = INITIAL_FORM
    const r = compute(f.tool, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text })

    const lastSweepRow = s.rows[s.rows.length - 1]
    const lastReportRow = section.chart.table.rows[section.chart.table.rows.length - 1]
    expect(lastReportRow[0]).toBe(`${fmt(lastSweepRow.x, 3)} mm`)
    expect(lastReportRow[1]).toBe(fmtOhm(lastSweepRow.y))
    // 70 noktalık taramada 6'da bir örnekleme 12 satır verir (0,6,...,66);
    // son nokta (index 69) ayrıca zorla eklendiği için 13 satır olmalı.
    expect(section.chart.table.rows.length).toBe(13)
  })

  it('sweep (s) verilince chart.table dolu döner (paralel)', () => {
    const f = { ...INITIAL_FORM, tool: TOOL_PARALLEL }
    const r = compute(f.tool, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f.tool, f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.chart).toBeNull()
  })

  it('şematik başlığı hesap türüne göre değişir', () => {
    const fPlane = INITIAL_FORM
    const rPlane = compute(fPlane.tool, fPlane, text.fieldLabels)
    expect(buildReportSection({ f: fPlane, r: rPlane, text }).schematicCaption).toBe(text.schematic.captionPlane)

    const fParallel = { ...INITIAL_FORM, tool: TOOL_PARALLEL }
    const rParallel = compute(fParallel.tool, fParallel, text.fieldLabels)
    expect(buildReportSection({ f: fParallel, r: rParallel, text }).schematicCaption).toBe(text.schematic.captionParallel)
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f.tool, f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.toolLabel[TOOL_PLANE])
  })
})
