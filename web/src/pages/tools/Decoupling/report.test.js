import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, MODE_MIN, MODE_NETWORK,
} from './model'
import { getText } from './text'
import { fmt } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('Decoupling report.js', () => {
  it('minimum kapasite modunda geçerli girdide dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_MIN, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_MIN, f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeLabel[MODE_MIN])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigMin.label)
  })

  it('kapasitör ağı modunda geçerli girdide dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_NETWORK, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_NETWORK, f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeLabel[MODE_NETWORK])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigNet.label(r.f))
  })

  it('minimum kapasite modunda girdilerde kapasitör satırı listelenmez', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_MIN, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_MIN, f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels.some((l) => l.startsWith(text.rowList.rowLabel))).toBe(false)
  })

  it('kapasitör ağı modunda her satırın her sütunu girdi listesinde görünür', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_NETWORK, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_NETWORK, f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(`${text.rowList.rowLabel} 1 — ${text.capCols.C}`)
    expect(labels).toContain(`${text.rowList.rowLabel} 2 — ${text.capCols.ESR}`)
    expect(labels).toContain(`${text.rowList.rowLabel} 2 — ${text.capCols.ESL}`)
    expect(labels).toContain(`${text.rowList.rowLabel} 1 — ${text.capCols.n}`)
  })

  it('minimum kapasite modunda ESR/ESL dahil mi satırı motorun bildirdiği alanı yansıtır', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_MIN, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_MIN, f, r, text })
    const row = section.results.find((x) => x.label === text.tableMin.includesEsrEsl)
    expect(row.value).toBe(text.words.yesNo(r.includesEsrEsl))
  })

  it('kapasitör ağı modunda satır sayısı ve reaktans yönü sonuç satırlarında görünür', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_NETWORK, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_NETWORK, f, r, text })
    const count = section.results.find((x) => x.label === text.tableNet.count)
    expect(count.value).toBe(fmt(r.count, 4))
    const im = section.results.find((x) => x.label === text.tableNet.im)
    expect(im.value).toContain(text.words.reactive(r.inductive))
  })

  it('minimum kapasite modunda hesap başarısızsa (ΔV boş) null döner', () => {
    const f = { ...INITIAL_FORM, dV: '' }
    const r = compute(MODE_MIN, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_MIN, f, r, text })).toBeNull()
  })

  it('kapasitör ağı modunda hesap başarısızsa (ESR = 0) null döner', () => {
    const f = {
      ...INITIAL_FORM,
      caps: [{ ...INITIAL_FORM.caps[0], ESR: '0' }, INITIAL_FORM.caps[1]],
    }
    const r = compute(MODE_NETWORK, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_NETWORK, f, r, text })).toBeNull()
  })

  it('minimum kapasite modunda hiçbir satır boş etiket ya da undefined değer taşımaz', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_MIN, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_MIN, f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
    // Skaler girdi satırının etiketi çevrilmiş alan adı olmalı, alanın kendi
    // ham değeri değil (formFields çağrısının yanlış argümana bağlanması bu
    // ayrımı bozar — bkz. inputRows).
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fields.dI.label)
    expect(labels).toContain(text.fields.dT.label)
    expect(labels).toContain(text.fields.dV.label)
    expect(labels).not.toContain(f.dI)
    expect(labels).not.toContain(f.dT)
    expect(labels).not.toContain(f.dV)
  })

  it('kapasitör ağı modunda hiçbir satır boş etiket ya da undefined değer taşımaz', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_NETWORK, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_NETWORK, f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
    // fEval girdi satırının etiketi çevrilmiş alan adı olmalı, ham değeri değil.
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fields.fEval.label)
    expect(labels).not.toContain(f.fEval)
  })

  it('minimum kapasite modunda sweep (s) verilince chart.table dolu döner, svg alanı boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_MIN, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ mode: MODE_MIN, f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('kapasitör ağı modunda sweep (s) verilince chart.table satır sayısı kapasitör satırı sayısına uyar', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_NETWORK, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ mode: MODE_NETWORK, f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    // sütunlar: x + ağ toplamı + gösterilen satır sayısı (en fazla MAX_SERIES)
    expect(section.chart.table.columns).toHaveLength(2 + s.series.length)
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_MIN, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_MIN, f, r, text })
    expect(section.chart).toBeNull()
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(MODE_MIN, f, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_MIN, f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.modeLabel[MODE_MIN])
  })
})
