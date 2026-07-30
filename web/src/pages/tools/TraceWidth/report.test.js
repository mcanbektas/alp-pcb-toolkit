import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import { compute, buildSweep, INITIAL_FORM, MODE_SYNTHESIS, MODE_ANALYSIS } from './model'
import { getText } from './text'
import { fmt } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('TraceWidth report.js', () => {
  it('geçerli girdide dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeSynthesis)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, I: '' }
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    expect(buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu (önerilen genişlik)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].unit).toBe('mm')
  })

  it('hiçbir sonuç satırı boş etiket ya da undefined değer taşımaz', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  it('analiz modunda genişlik girdisi listelenir, marj listelenmez', () => {
    const f = { ...INITIAL_FORM, W: '0.5', Wu: 'mm' }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.W)
    expect(labels).not.toContain(text.fieldLabels.margin)
  })

  it('geçerlilik uyarısı varsa notlarda "danger" seviyesi görünür', () => {
    // Akım tipik geçerlilik üst sınırının (≈35 A) üzerinde
    const f = { ...INITIAL_FORM, I: '40', Iu: 'A' }
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    expect(section.notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(3)
  })

  it('chart tablosu taramanın son satırını hiç atlamaz (ekrandaki kuralla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const s = buildSweep(r)
    // 70 noktalı taramada son indeks (69) 5'in katı DEĞİLDİR: eski
    // `i % 5 === 0` filtresi tam da bu yüzden son satırı düşürüyordu, ekran ise
    // <ChartDataTable every={5} .../> ile onu her zaman gösteriyordu.
    expect((s.rows.length - 1) % 5).not.toBe(0)

    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, s, text })
    const rows = section.chart.table.rows
    const last = s.rows[s.rows.length - 1]
    expect(rows[rows.length - 1]).toEqual([fmt(last.x, 3), fmt(last.y, 3), fmt(last.other, 3)])
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    expect(section.chart).toBeNull()
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.modeSynthesis)
  })
})
