import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import { compute, INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS, KIND_CAP } from './model'
import { getText } from './text'

const text = getText('tr')

describe('ResistorCode report.js', () => {
  it('renk bandı analizinde dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })

    expect(section).not.toBeNull()
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
  })

  it('bant girdileri renk adlarıyla listelenir (kod değil)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    // INITIAL_FORM.b0 = 'yellow' -> ekrandaki gibi çevrilmiş renk adı beklenir
    expect(section.inputs.some((i) => i.value === text.colorName.yellow)).toBe(true)
  })

  it('kondansatör modunda pF/nF/µF satırları görünür, E24/E96 görünmez', () => {
    const f = { ...INITIAL_FORM, kind: KIND_CAP, cap: '104K' }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain('pF')
    expect(labels).toContain('nF')
    expect(labels).not.toContain(text.table.nearestE24)
  })

  it('sentez modunda istenen değer satırı eklenir', () => {
    const f = { ...INITIAL_FORM, target: '4.7', targetUnit: 'kΩ' }
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    expect(section.results.some((row) => row.label === text.table.requested)).toBe(true)
  })

  it('hesap başarısızsa null döner', () => {
    const f = { ...INITIAL_FORM, kind: KIND_CAP, cap: 'gecersiz-kod' }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    expect(buildReportSection({ mode: MODE_ANALYSIS, f, r, text })).toBeNull()
  })

  it('hiçbir satır boş etiket ya da undefined değer taşımaz', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  // Öbür ekranların rapor testleri İngilizce yolu da yürütür — bu dosya
  // yalnız Türkçe koşuyordu; en tarafında eksik bir anahtar sessizce
  // `undefined` basar ve build yakalamaz.
  it('İngilizce metinle bölüm İngilizce kurulur', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text: en })
    expect(section.toolName).toBe(en.title)
    // `section.mode` bu ekranda tür etiketi taşır (modeAnalysis değil) —
    // İngilizce kurulduğunu adın kendisi doğruluyor, dolu olması yeter.
    expect(section.mode).toBeTruthy()
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })
})
