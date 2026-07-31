import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import { compute, INITIAL_FORM } from './model'
import { getText } from './text'

const text = getText('tr')

describe('LengthConverter report.js', () => {
  it('geçerli girdide 6 birimlik tam tabloyu döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })

    expect(section).not.toBeNull()
    expect(section.results).toHaveLength(7) // büyük sonuç + 6 birim
    expect(section.results[0].emphasis).toBe(true)
  })

  it('hedef birim girdi listesinde görünür', () => {
    const f = { ...INITIAL_FORM, target: 'inch' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.inputs.some((i) => i.label === text.fields.target.label && i.value === text.unitRow.inch)).toBe(true)
  })

  it('hesap başarısızsa (uzunluk sıfır/negatif) null döner', () => {
    const f = { ...INITIAL_FORM, L: '0' }
    const r = compute(f, text.fieldLabels)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('hiçbir satır boş etiket ya da undefined değer taşımaz', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  // Bkz. ResistorCode'daki aynı test — İngilizce yol da yürünmeli.
  it('İngilizce metinle bölüm İngilizce kurulur', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en })
    expect(section.toolName).toBe(en.title)
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })
})
