import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS,
} from './model'
import { getText } from './text'
import { fmt } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

function build(mode, overrides = {}) {
  const f = { ...INITIAL_FORM, ...overrides }
  const r = compute(mode, f, text.fieldLabels)
  const s = buildSweep(r)
  return { f, r, s, section: buildReportSection({ mode, f, r, s, text }) }
}

describe('CrystalLoad report.js', () => {
  it('analiz modunda dolu bir bölüm döner (varsayılan girdiler)', () => {
    const { section } = build(MODE_ANALYSIS)

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeAnalysis)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    // C1=C2=18 pF, Cstray=3 pF → C_L = 18·18/36 + 3 = 12 pF
    expect(section.results[0].label).toBe(text.big.loadCap)
    expect(section.results[0].value).toBe('12')
    expect(section.results[0].unit).toBe('pF')
  })

  it('hesap başarısızsa (zorunlu alan boş) null döner', () => {
    const { section } = build(MODE_ANALYSIS, { C1: '' })
    expect(section).toBeNull()
  })

  it('analiz modunda C1/C2 ve gerçekleşen C_L satırları görünür', () => {
    const { section } = build(MODE_ANALYSIS)
    expect(section.results.some((row) => row.label === 'C1')).toBe(true)
    expect(section.results.some((row) => row.label === 'C2')).toBe(true)
    expect(section.results.some((row) => row.label === text.table.achieved)).toBe(true)
  })

  it('sentez modunda hedef C_L ve standart değer satırları görünür', () => {
    const { section } = build(MODE_SYNTHESIS)
    // CL=12 pF, Cstray=3 pF, Cin=Cout=0 → hedef C = 2·(12−3) = 18 pF
    expect(section.results[0].label).toBe(text.big.requiredCaps)
    expect(section.results[0].value).toBe('18')
    expect(section.results[0].unit).toBe('pF')
    expect(section.results.some((row) => row.label === text.table.targetCL)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.e24)).toBe(true)
    expect(section.mode).toBe(text.modeSynthesis)
  })

  it('parazitik kapasite hedefi aşarsa null döner', () => {
    const { section } = build(MODE_SYNTHESIS, { CL: '2', Cstray: '5' })
    expect(section).toBeNull()
  })

  it('grafik varsa chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const { section } = build(MODE_ANALYSIS)
    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    // Kristal grafiğinde tek seri vardır → 2 sütun (harici kapasitör, C_L)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('grafik harici kapasitör eksenindedir', () => {
    const { section } = build(MODE_ANALYSIS)
    expect(section.chart).not.toBeNull()
    expect(section.chart.table.columns[1]).toBe('C_L')
  })

  it('hiçbir satır (girdi ya da sonuç) boş etiket ya da undefined değer taşımaz — iki modda da', () => {
    const cases = [
      [MODE_ANALYSIS, {}],
      [MODE_SYNTHESIS, {}],
    ]

    for (const [mode, overrides] of cases) {
      const { section } = build(mode, overrides)
      expect(section, mode).not.toBeNull()
      for (const row of [...section.inputs, ...section.results]) {
        expect(row.label, JSON.stringify({ mode, row })).toBeTruthy()
        expect(row.value, JSON.stringify({ mode, row })).not.toBe('undefined')
        expect(row.value, JSON.stringify({ mode, row })).not.toBeUndefined()
      }
    }
  })

  // Bkz. ResistorCode'daki aynı test — İngilizce yol da yürünmeli.
  it('İngilizce metinle bölüm İngilizce kurulur', () => {
    const en = getText('en')
    const f = { ...INITIAL_FORM }
    const r = compute(MODE_ANALYSIS, f, en.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, s, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.modeAnalysis)
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })
})
