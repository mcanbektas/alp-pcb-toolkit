import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS,
} from './model'
import { getText } from './text'
import { fmt, fmtVolt } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`s`/`text` kaynağından üretilir; bu test her sürümde yapının
// bozulup bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması)
// denetler.
const text = getText('tr')

describe('ViaProperties report.js', () => {
  it('analiz modunda geçerli girdide dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeAnalysis)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, Df: '' }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_ANALYSIS, f, r, text })).toBeNull()
  })

  it('padstack geometrisi tutarsızsa (pad ≤ matkap) null döner', () => {
    const f = { ...INITIAL_FORM, Dpad: '0.3', Ddrill: '0.35' }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: MODE_ANALYSIS, f, r, text })).toBeNull()
  })

  it('analiz modunda ilk sonuç satırı vurgulu direnç değeri', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.results[0].label).toBe(text.bigResult.analysis)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].unit).toBeTruthy()
  })

  it('sentez modunda ilk sonuç satırı vurgulu via sayısı (birimsiz, ham tam sayı)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    expect(section.results[0].label).toBe(text.bigResult.synthesis)
    expect(section.results[0].value).toBe(r.N)
    expect(section.results[0].emphasis).toBe(true)
  })

  it('sentez modunda paralel via bölüm satırları görünür, analiz modunda görünmez', () => {
    const f = INITIAL_FORM
    const rSyn = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const synSection = buildReportSection({ mode: MODE_SYNTHESIS, f, r: rSyn, text })
    const labels = synSection.results.map((row) => row.label)
    expect(labels).toContain(text.table.deciding)
    expect(labels).toContain(text.table.parallelR)

    const rAna = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const anaSection = buildReportSection({ mode: MODE_ANALYSIS, f, r: rAna, text })
    expect(anaSection.results.map((row) => row.label)).not.toContain(text.table.deciding)
  })

  it('worst-case annular ring kırılınca değere " !" bayrağı eklenir', () => {
    const f = {
      ...INITIAL_FORM, Dpad: '0.4', Ddrill: '0.35', posTol: '0.05', etchTol: '0.05',
    }
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.ring.breakout).toBe(true)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    const row = section.results.find((row2) => row2.label === text.table.worstRing)
    expect(row.value.endsWith(' !')).toBe(true)
  })

  it('via parazitik süreksizliği (disc) geçerli girdide sonuçlara girer', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    expect(r.disc).toBeTruthy()
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain(text.table.discZ)
    expect(labels).toContain(text.table.discDelay)
  })

  it('formül bloğu dört başlığı da (geometri, paralel, ring, parazitik) içerir', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.formula).toContain(text.formulas.geometry.title)
    expect(section.formula).toContain(text.formulas.parallel.title)
    expect(section.formula).toContain(text.formulas.ring.title)
    expect(section.formula).toContain(text.formulas.parasitics.title)
  })

  it('şematik yakalama alanları doğru kurulur', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text })
    expect(section.schematicSvg).toBeNull()
    expect(section.schematicCaption).toBe(text.schematic.caption)
  })

  it('hiçbir sonuç satırı boş etiket ya da undefined değer taşımaz (her iki mod)', () => {
    const f = INITIAL_FORM
    for (const mode of [MODE_ANALYSIS, MODE_SYNTHESIS]) {
      const r = compute(mode, f, text.fieldLabels)
      const section = buildReportSection({ mode, f, r, text })
      for (const row of [...section.inputs, ...section.results]) {
        expect(row.label, JSON.stringify(row)).toBeTruthy()
        expect(row.value, JSON.stringify(row)).not.toBe('undefined')
        expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      }
    }
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text })
    expect(section.chart).toBeNull()
  })

  it('rapor tablosunun son satırı sweep\'in son noktasıyla eşleşir (ChartDataTable ile aynı garanti)', () => {
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, s, text })

    // buildSweep: maxN = max(20, N*2) her zaman çift, dolayısıyla satır sayısı
    // her zaman çift ve gerçek son index her zaman tek — every=2'lik modulo
    // örneklemesi bu son noktayı asla kendiliğinden yakalamaz; "son nokta
    // her zaman dahil" kuralı olmadan sessizce kaybolur (bkz. report.js).
    const lastSweepRow = s.rows[s.rows.length - 1]
    const lastReportRow = section.chart.table.rows[section.chart.table.rows.length - 1]
    expect(lastReportRow[0]).toBe(`${fmt(lastSweepRow.x, 2)} ${text.countUnit}`)
    expect(lastReportRow[1]).toBe(fmtVolt(lastSweepRow.y))
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(MODE_ANALYSIS, f, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_ANALYSIS, f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.modeAnalysis)
  })

  it('İngilizce sentez raporunda "En az via sayısı" biriminde çıplak Türkçe "adet" görünmez', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(MODE_SYNTHESIS, f, en.fieldLabels)
    const section = buildReportSection({ mode: MODE_SYNTHESIS, f, r, text: en })
    const row = section.inputs.find((row2) => row2.label === en.fieldLabels.Nmin)
    expect(row).toBeTruthy()
    expect(row.unit).toBe('pcs')
    expect(row.unit).not.toBe('adet')
  })
})
