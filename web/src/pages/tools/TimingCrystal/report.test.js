import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  TOOL_RC, TOOL_RL, TOOL_CRYSTAL,
  MODE_ANALYSIS, MODE_SYNTHESIS,
} from './model'
import { getText } from './text'
import { fmt, fmtEng } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
// Bu araçta iki bağımsız eksen var — `f.tool` (rc/rl/crystal) ve `mode`
// (ana/syn) — bu yüzden altı ayrı dal test edilir.
const text = getText('tr')

function build(tool, mode, overrides = {}) {
  const f = { ...INITIAL_FORM, tool, ...overrides }
  const r = compute(tool, mode, f, text.fieldLabels)
  const s = buildSweep(r)
  return { f, r, s, section: buildReportSection({ mode, f, r, s, text }) }
}

describe('TimingCrystal report.js', () => {
  it('RC analiz modunda dolu bir bölüm döner (varsayılan girdiler)', () => {
    const { section } = build(TOOL_RC, MODE_ANALYSIS)

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.toolLabel[TOOL_RC])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    // R=10kΩ, C=100nF → τ = R·C = 1 ms
    expect(section.results[0].label).toBe(text.big.tau)
    expect(section.results[0].value).toBe('1')
    expect(section.results[0].unit).toBe('ms')
  })

  it('hesap başarısızsa (zorunlu alan boş) null döner', () => {
    const { section } = build(TOOL_RC, MODE_ANALYSIS, { R: '' })
    expect(section).toBeNull()
  })

  it('RC sentez modunda gerekli kapasite ve en yakın E24 satırı görünür', () => {
    const { section } = build(TOOL_RC, MODE_SYNTHESIS)
    expect(section.results[0].label).toBe(text.big.requiredC)
    expect(section.results.some((row) => row.label === text.table.nearestE24)).toBe(true)
  })

  it('RL analiz modunda sürekli rejim akımı satırı görünür, gerekli endüktans görünmez', () => {
    const { section } = build(TOOL_RL, MODE_ANALYSIS)
    expect(section.results[0].label).toBe(text.big.tau)
    expect(section.results.some((row) => row.label === text.table.steadyCurrent)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.peakCurrent)).toBe(false)
  })

  it('RL sentez modunda gerekli endüktans satırı görünür', () => {
    const { section } = build(TOOL_RL, MODE_SYNTHESIS)
    expect(section.results[0].label).toBe(text.big.requiredL)
    expect(section.results.some((row) => row.label === text.table.nearestE24)).toBe(true)
  })

  it('kristal analiz modunda C1/C2 ve gerçekleşen C_L satırları görünür', () => {
    const { section } = build(TOOL_CRYSTAL, MODE_ANALYSIS)
    // C1=C2=18 pF, Cstray=3 pF → C_L = 18·18/36 + 3 = 12 pF
    expect(section.results[0].label).toBe(text.big.loadCap)
    expect(section.results[0].value).toBe('12')
    expect(section.results[0].unit).toBe('pF')
    expect(section.results.some((row) => row.label === 'C1')).toBe(true)
    expect(section.results.some((row) => row.label === 'C2')).toBe(true)
    expect(section.results.some((row) => row.label === text.table.achieved)).toBe(true)
  })

  it('kristal sentez modunda hedef C_L ve standart değer satırları görünür', () => {
    const { section } = build(TOOL_CRYSTAL, MODE_SYNTHESIS)
    // CL=12 pF, Cstray=3 pF, Cin=Cout=0 → hedef C = 2·(12−3) = 18 pF
    expect(section.results[0].label).toBe(text.big.requiredCaps)
    expect(section.results[0].value).toBe('18')
    expect(section.results[0].unit).toBe('pF')
    expect(section.results.some((row) => row.label === text.table.targetCL)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.e24)).toBe(true)
  })

  it('kristalde parazitik kapasite hedefi aşarsa null döner', () => {
    const { section } = build(TOOL_CRYSTAL, MODE_SYNTHESIS, { CL: '2', Cstray: '5' })
    expect(section).toBeNull()
  })

  it('RC/RL grafiği varsa chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const { section } = build(TOOL_RC, MODE_ANALYSIS)
    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    // RC grafiğinde şarj + deşarj serisi vardır → 3 sütun (zaman, şarj, deşarj)
    expect(section.chart.table.columns).toHaveLength(3)
  })

  it('chart tablosu taramanın son satırını hiç atlamaz (ekrandaki kuralla aynı)', () => {
    const { s, section } = build(TOOL_RC, MODE_ANALYSIS)
    // 80 noktalı RC taramasında son indeks (79) 6'nın katı DEĞİLDİR: eski
    // `i % 6 === 0` filtresi tam da bu yüzden son satırı düşürüyordu, ekran ise
    // <ChartDataTable every={6} .../> ile onu her zaman gösteriyordu.
    expect((s.rows.length - 1) % 6).not.toBe(0)

    const rows = section.chart.table.rows
    const last = s.rows[s.rows.length - 1]
    expect(rows[rows.length - 1][0]).toBe(fmtEng(last.x, 's', 4))
    expect(rows[rows.length - 1][1]).toBe(fmt(last.y, 4))
  })

  it('RL grafiğinde deşarj sütunu yoktur (yalnızca 2 sütun)', () => {
    const { section } = build(TOOL_RL, MODE_ANALYSIS)
    expect(section.chart).not.toBeNull()
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('kristal grafiği harici kapasitör eksenindedir', () => {
    const { section } = build(TOOL_CRYSTAL, MODE_ANALYSIS)
    expect(section.chart).not.toBeNull()
    expect(section.chart.table.columns[1]).toBe('C_L')
  })

  it('hiçbir satır (girdi ya da sonuç) boş etiket ya da undefined değer taşımaz — altı dalın tamamında', () => {
    const cases = [
      [TOOL_RC, MODE_ANALYSIS, {}],
      [TOOL_RC, MODE_SYNTHESIS, {}],
      [TOOL_RL, MODE_ANALYSIS, {}],
      [TOOL_RL, MODE_SYNTHESIS, {}],
      [TOOL_CRYSTAL, MODE_ANALYSIS, {}],
      [TOOL_CRYSTAL, MODE_SYNTHESIS, {}],
    ]

    for (const [tool, mode, overrides] of cases) {
      const { section } = build(tool, mode, overrides)
      expect(section, `${tool}/${mode}`).not.toBeNull()
      for (const row of [...section.inputs, ...section.results]) {
        expect(row.label, JSON.stringify({ tool, mode, row })).toBeTruthy()
        expect(row.value, JSON.stringify({ tool, mode, row })).not.toBe('undefined')
        expect(row.value, JSON.stringify({ tool, mode, row })).not.toBeUndefined()
      }
    }
  })

  // Bkz. ResistorCode'daki aynı test — İngilizce yol da yürünmeli.
  it('İngilizce metinle bölüm İngilizce kurulur', () => {
    const en = getText('en')
    const f = { ...INITIAL_FORM, tool: TOOL_RC }
    const r = compute(TOOL_RC, MODE_ANALYSIS, f, en.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, s, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.toolLabel[TOOL_RC])
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })
})
