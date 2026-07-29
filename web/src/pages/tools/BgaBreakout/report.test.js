import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import { compute, buildSweep, INITIAL_FORM, SWEEP_PITCH } from './model'
import { getText } from './text'
import { dfmText } from '../../../data/dfmText'
import { STATUS_UNKNOWN } from '../../../lib/dfmCheck'

const text = getText('tr')
const dfm = dfmText('tr')

function rowsFor(r) {
  if (!r.ok) return []
  return r.checks.map((c) => ({
    id: c.id,
    label: text.checkLabel(c.id),
    status: c.status,
    actual: '—',
    required: '—',
    margin: '—',
    source: dfm.sourceLabel(c.source),
    reason: dfm.unknownReason(c.variant),
  }))
}

describe('BgaBreakout report.js', () => {
  const f = INITIAL_FORM
  const r = compute(f, {}, text.fieldLabels)
  const s = buildSweep(r, SWEEP_PITCH)
  const section = buildReportSection({
    f, r, s, text, dfm, rows: rowsFor(r), verdict: text.verdict.undecided,
  })

  it('geçerli girdide dolu bir bölüm döner', () => {
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('ana sonuç maksimum iz sayısıdır', () => {
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].value).toBe(String(r.results.nMax))
    expect(section.results[0].unit).toBe(text.countUnit)
  })

  // model.js'in adet alanları SI tablosunun anahtarı olarak sabit 'adet'
  // taşır. Türkçede çeviri de 'adet' olduğu için sızıntı ancak İngilizce
  // tarafta görünür — kontrol orada yapılır.
  it('adet birimi çevrilir, dahili anahtar İngilizce raporda sızmaz', () => {
    const countInput = section.inputs.find((i) => i.label === text.fieldLabels.traceCount)
    expect(countInput.unit).toBe(text.countUnit)

    const textEn = getText('en')
    const rEn = compute(INITIAL_FORM, {}, textEn.fieldLabels)
    const sectionEn = buildReportSection({
      f: INITIAL_FORM, r: rEn, s: null, text: textEn, dfm: dfmText('en'), rows: [],
    })
    expect(JSON.stringify(sectionEn)).not.toContain('"adet"')
    const countEn = sectionEn.inputs.find((i) => i.label === textEn.fieldLabels.traceCount)
    expect(countEn.unit).toBe(textEn.countUnit)
  })

  it('sonuç satırlarında ham kod ya da sayısal bozukluk sızmaz', () => {
    for (const row of section.results) {
      expect(String(row.label).length).toBeGreaterThan(0)
      expect(String(row.value)).not.toContain('undefined')
      expect(String(row.value)).not.toContain('NaN')
      expect(String(row.value)).not.toContain('Infinity')
    }
  })

  it('değerlendirilemeyen kontroller rapora girer', () => {
    const rows = rowsFor(r)
    expect(rows.some((row) => row.status === STATUS_UNKNOWN)).toBe(true)
    const labels = section.results.map((row) => row.label)
    expect(labels.some((l) => l.includes(dfm.statusLabel(STATUS_UNKNOWN)))).toBe(true)
  })

  it('ihtiyatlı karar cümlesi notlara eklenir ve kesinlik iddiası taşımaz', () => {
    const texts = section.notes.map((n) => n.text)
    expect(texts).toContain(text.verdict.undecided)
    const blob = texts.join(' ').toLocaleLowerCase('tr')
    expect(blob).not.toContain('route edilir')
    expect(blob).not.toContain('kesinlikle')
  })

  it('grafik bölümü iki kanalı da taşır', () => {
    expect(section.chart.table.columns).toHaveLength(3)
    expect(section.chart.table.rows[0]).toHaveLength(3)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const bad = { ...INITIAL_FORM, pitch: '' }
    const rb = compute(bad, {}, text.fieldLabels)
    expect(buildReportSection({ f: bad, r: rb, s: null, text, dfm, rows: [] })).toBeNull()
  })

  it('land adımı aşınca hesap durur ve rapor üretilmez', () => {
    const bad = { ...INITIAL_FORM, landDiameter: '1.2' }
    const rb = compute(bad, {}, text.fieldLabels)
    expect(rb.ok).toBe(false)
    expect(buildReportSection({ f: bad, r: rb, s: null, text, dfm, rows: [] })).toBeNull()
  })
})

describe('BgaBreakout report.js — iki dillilik', () => {
  it('İngilizce metinle üretilen raporda Türkçe dize kalmaz', () => {
    const textEn = getText('en')
    const dfmEn = dfmText('en')
    const f = INITIAL_FORM
    const r = compute(f, {}, textEn.fieldLabels)
    const section = buildReportSection({
      f, r, s: null, text: textEn, dfm: dfmEn, rows: [], verdict: textEn.verdict.feasible,
    })
    expect(JSON.stringify(section)).not.toMatch(/[ğışçöüİĞŞÇÖÜ]/)
  })
})
