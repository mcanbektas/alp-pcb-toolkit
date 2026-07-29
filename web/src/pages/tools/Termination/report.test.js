import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, TERM_SERIES, TERM_PARALLEL, TERM_THEVENIN,
} from './model'
import { getText } from './text'
import { fmt, fmtRes, fmtWatt } from '../../../lib/num'

// index.jsx'teki <ChartDataTable every={6} .../> ile birebir aynı seçim
// (her 6 noktada bir + son nokta) ve biçimlendirme kuralını burada
// bağımsız olarak yeniden üretip report.js'in ürettiği tabloyla karşılaştırıyoruz.
// Böylece sampling adımı ya da birim/format sürüklenmesi sessizce geçmez.
function expectedChartRows(points, formatY) {
  const indices = []
  for (let i = 0; i < points.length; i += 6) indices.push(i)
  if (indices[indices.length - 1] !== points.length - 1) indices.push(points.length - 1)
  return indices.map((i) => [
    `${fmt(points[i][0], 4)} Ω`,
    formatY(points[i][1]),
  ])
}

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('Termination report.js', () => {
  it('seri modda geçerli girdide dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(TERM_SERIES, f, text.fieldLabels)
    const section = buildReportSection({ type: TERM_SERIES, f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.typeLabel[TERM_SERIES])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, Z0: '' }
    const r = compute(TERM_SERIES, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ type: TERM_SERIES, f, r, text })).toBeNull()
  })

  it('seri terminasyon negatif çıktığında (ekranda özel yorum var) rapor yine null döner', () => {
    // Sürücü direnci hat empedansından büyük — REASON_NEGATIVE_SERIES.
    const f = { ...INITIAL_FORM, Z0: '50', Rdriver: '80' }
    const r = compute(TERM_SERIES, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ type: TERM_SERIES, f, r, text })).toBeNull()
  })

  it('seri modda R_driver girdisi listelenir, V ve Vcc listelenmez', () => {
    const f = INITIAL_FORM
    const r = compute(TERM_SERIES, f, text.fieldLabels)
    const section = buildReportSection({ type: TERM_SERIES, f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.Rdriver)
    expect(labels).not.toContain(text.fieldLabels.V)
    expect(labels).not.toContain(text.fieldLabels.Vcc)
  })

  it('paralel modda V ve duty girdisi listelenir, R_driver listelenmez', () => {
    const f = { ...INITIAL_FORM, V: '3.3', duty: '50' }
    const r = compute(TERM_PARALLEL, f, text.fieldLabels)
    const section = buildReportSection({ type: TERM_PARALLEL, f, r, text })

    expect(section).not.toBeNull()
    expect(section.results[0].emphasis).toBe(true)
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.V)
    expect(labels).toContain(text.fieldLabels.duty)
    expect(labels).not.toContain(text.fieldLabels.Rdriver)
  })

  it('Thevenin modda Vcc/Vbias ve E serisi girdisi listelenir, R_driver listelenmez', () => {
    const f = { ...INITIAL_FORM, eseries: 'E96' }
    const r = compute(TERM_THEVENIN, f, text.fieldLabels)
    const section = buildReportSection({ type: TERM_THEVENIN, f, r, text })

    expect(section).not.toBeNull()
    expect(section.results[0].emphasis).toBe(true)
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.Vcc)
    expect(labels).toContain(text.fieldLabels.Vbias)
    expect(labels).toContain(text.fields.eseries.label)
    expect(section.inputs.some((i) => i.value === 'E96')).toBe(true)
    expect(labels).not.toContain(text.fieldLabels.Rdriver)
  })

  it('Thevenin hedef bias besleme geriliminden büyükse null döner', () => {
    const f = { ...INITIAL_FORM, Vcc: '1.65', Vbias: '3.3' }
    const r = compute(TERM_THEVENIN, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ type: TERM_THEVENIN, f, r, text })).toBeNull()
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır (seri)', () => {
    const f = INITIAL_FORM
    const r = compute(TERM_SERIES, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ type: TERM_SERIES, f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('chart.table hücreleri ekrandaki ChartDataTable (every=6, "Ω" birimi, fmtRes) ile birebir aynı (seri)', () => {
    const f = INITIAL_FORM
    const r = compute(TERM_SERIES, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ type: TERM_SERIES, f, r, s, text })

    const expected = expectedChartRows(s.series[0].points, (v) => fmtRes(v, 4))
    expect(section.chart.table.rows).toEqual(expected)
  })

  it('chart.table hücreleri ekrandaki ChartDataTable (every=6, fmtWatt) ile birebir aynı (paralel)', () => {
    const f = { ...INITIAL_FORM, V: '3.3', duty: '50' }
    const r = compute(TERM_PARALLEL, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ type: TERM_PARALLEL, f, r, s, text })

    const expected = expectedChartRows(s.series[0].points, (v) => fmtWatt(v))
    expect(section.chart.table.rows).toEqual(expected)
    // Ekranın kullandığı güç birimi (mW/W) rapor satırında da görünmeli —
    // bare sayı, birimsiz kalmamalı.
    expect(section.chart.table.rows.every((row) => /[mM]?W$/.test(row[1]))).toBe(true)
  })

  it('Thevenin modda grafik iki seri (R_top, R_bottom) taşır', () => {
    const f = INITIAL_FORM
    const r = compute(TERM_THEVENIN, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ type: TERM_THEVENIN, f, r, s, text })

    expect(section.chart.table.columns).toHaveLength(3)
    expect(section.chart.table.rows[0]).toHaveLength(3)
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(TERM_SERIES, f, text.fieldLabels)
    const section = buildReportSection({ type: TERM_SERIES, f, r, text })
    expect(section.chart).toBeNull()
  })

  it('hiçbir sonuç satırı boş etiket ya da undefined değer taşımaz (üç tip için)', () => {
    for (const type of [TERM_SERIES, TERM_PARALLEL, TERM_THEVENIN]) {
      const f = INITIAL_FORM
      const r = compute(type, f, text.fieldLabels)
      const s = buildSweep(r)
      const section = buildReportSection({ type, f, r, s, text })
      for (const row of [...section.inputs, ...section.results]) {
        expect(row.label, JSON.stringify(row)).toBeTruthy()
        expect(row.value, JSON.stringify(row)).not.toBe('undefined')
        expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      }
    }
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(TERM_SERIES, f, en.fieldLabels)
    const section = buildReportSection({ type: TERM_SERIES, f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.typeLabel[TERM_SERIES])
  })
})
