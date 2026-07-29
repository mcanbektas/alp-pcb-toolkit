import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, SRC_DIRECT, OFF, ON,
} from './model'
import { getText } from './text'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('Pdn report.js', () => {
  it('geçerli girdide dolu bir bölüm döner', () => {
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

  it('hesap başarısızsa (ΔI boş) null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, deltaI: '' }
    const r = compute(f, text.fieldLabels)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('kapasitör satırında ESR sıfırsa hesap başarısız olur ve null döner', () => {
    const f = {
      ...INITIAL_FORM,
      caps: [{ ...INITIAL_FORM.caps[0], ESR: '0' }, INITIAL_FORM.caps[1], INITIAL_FORM.caps[2]],
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu (hedef empedans)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigResultLabel)
    // Referans (spec §13 Test 3): 1.0 V, %3, 5 A → 6 mΩ — dinamik SI öneki.
    expect(section.results[0].value).toBe('6')
    expect(section.results[0].unit).toBe('mΩ')
  })

  it('varsayılan girdide kapasitör satırları satır adı + sütun etiketiyle görünür', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(`${text.rowList.rowLabel} 1 — ${text.capCols.C}`)
    expect(labels).toContain(`${text.rowList.rowLabel} 2 — ${text.capCols.ESR}`)
    expect(labels).toContain(`${text.rowList.rowLabel} 3 — ${text.capCols.n}`)
  })

  it('doğrudan ΔV modunda deltaVSource satırı "doğrudan girildi" değerini taşır', () => {
    const f = { ...INITIAL_FORM, source: SRC_DIRECT, deltaV: '25', deltaVu: 'mV' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const row = section.results.find((x) => x.label === text.table.deltaVSource)
    expect(row.value).toBe(text.table.deltaVDirect)
  })

  it('ray + tolerans modunda deltaVSource satırı "ray × tolerans" değerini taşır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const row = section.results.find((x) => x.label === text.table.deltaVSource)
    expect(row.value).toBe(text.table.deltaVFromTol)
  })

  it('eğri kapalıyken girdide kapasitör satırı, sonuçta eğri satırları görünmez ve grafik null döner', () => {
    const f = { ...INITIAL_FORM, curve: OFF }
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text })

    const labels = section.inputs.map((i) => i.label)
    expect(labels.some((l) => l.startsWith(text.rowList.rowLabel))).toBe(false)
    expect(section.results.some((row) => row.label === text.table.fOp)).toBe(false)
    expect(section.chart).toBeNull()
  })

  it('düzlem açıkken düzlem sonuç satırları görünür', () => {
    const f = { ...INITIAL_FORM, plane: ON }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.planeC)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.planeArea)).toBe(true)
  })

  it('düzlem kapalıyken düzlem sonuç satırları görünmez', () => {
    const f = INITIAL_FORM // varsayılan plane: OFF
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.planeC)).toBe(false)
  })

  it('loop açıkken loop sonuç satırları görünür', () => {
    const f = INITIAL_FORM // varsayılan loop: ON
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.loopTotal)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.loopDominant)).toBe(true)
  })

  it('loop kapalıyken loop sonuç satırları görünmez', () => {
    const f = { ...INITIAL_FORM, loop: OFF }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.loopTotal)).toBe(false)
  })

  it('eğri açıkken sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns[0]).toBe(text.chart.x)
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.chart).toBeNull()
  })

  it('hiçbir sonuç ya da girdi satırı boş etiket ya da undefined değer taşımaz (tüm bölümler açık)', () => {
    const f = { ...INITIAL_FORM, plane: ON }
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  it('İngilizce metinle çağrıldığında araç adı da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en })
    expect(section.toolName).toBe(en.title)
  })
})
