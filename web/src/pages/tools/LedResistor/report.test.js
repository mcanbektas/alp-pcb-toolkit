import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import { compute, buildSweep, INITIAL_FORM } from './model'
import { getText } from './text'
import { fmt, fmtEng } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
// Brif 11 §C: LedOhmRlc'nin TOOL_LED test case'lerinden bölündü.
const text = getText('tr')

function buildFor(overrides = {}) {
  const f = { ...INITIAL_FORM, ...overrides }
  const r = compute(f, text.fieldLabels)
  const s = buildSweep(r)
  return { f, r, s, section: buildReportSection({ f, r, s, text }) }
}

describe('LedResistor report.js', () => {
  it('geçerli girdide E24/E96 ve nominal güç satırları görünür', () => {
    const { section } = buildFor()

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results.some((row) => row.label === 'E24')).toBe(true)
    expect(section.results.some((row) => row.label === 'E96')).toBe(true)
    expect(section.results.some((row) => row.label === text.table.ratedPower)).toBe(true)
  })

  it('n alanının birimi dile göre çevrilir ("adet" model.js sabiti değil)', () => {
    const { section: tr } = buildFor()
    expect(tr.inputs.find((i) => i.label === text.fieldLabels.n).unit).toBe('adet')

    const en = getText('en')
    const f = { ...INITIAL_FORM }
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en })
    expect(section.inputs.find((i) => i.label === en.fieldLabels.n).unit).toBe('pcs')
  })

  it('seri gerilim beslemeyi aşınca compute() başarısız olur, null döner', () => {
    const f = { ...INITIAL_FORM, Vf: '10', n: '1', Vs: '5' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı boş bırakılır', () => {
    const { section } = buildFor()
    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.columns).toHaveLength(2)
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
  })

  it('chart tablosu taramanın son satırını hiç atlamaz (ekrandaki kuralla aynı)', () => {
    const { s, section } = buildFor()
    // 70 noktalı taramada son indeks 6'nın katı DEĞİLDİR: eski `i % 6 === 0`
    // filtresi tam da bu yüzden son satırı düşürüyordu, ekran ise
    // <ChartDataTable every={6} .../> ile onu her zaman gösteriyordu.
    expect((s.rows.length - 1) % 6).not.toBe(0)

    const rows = section.chart.table.rows
    const last = s.rows[s.rows.length - 1]
    expect(rows[rows.length - 1]).toEqual([fmtEng(last.x, '', 4), fmt(last.y, 4)])
  })

  it('hiçbir sonuç satırı boş etiket ya da undefined değer taşımaz', () => {
    const cases = [buildFor(), buildFor({ n: '3', Vs: '9' })]
    for (const { section } of cases) {
      for (const row of [...section.inputs, ...section.results]) {
        expect(row.label, JSON.stringify(row)).toBeTruthy()
        expect(row.value, JSON.stringify(row)).not.toBe('undefined')
        expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      }
    }
  })

  it('schematicCaption — ekrandaki <figcaption> ile aynı metni taşır', () => {
    expect(buildFor().section.schematicCaption).toBe(text.schematic.caption)
  })

  it('İngilizce metinle çağrıldığında araç adı da İngilizce', () => {
    const en = getText('en')
    const f = { ...INITIAL_FORM }
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en })
    expect(section.toolName).toBe(en.title)
  })
})
