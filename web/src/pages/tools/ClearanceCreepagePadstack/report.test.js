import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  TAB_CLEARANCE, TAB_CREEPAGE, TAB_PADSTACK,
  MODE_SYNTHESIS, MODE_ANALYSIS, SWEEP_REGISTRATION,
} from './model'
import { getText } from './text'
import { dfmText } from '../../../data/dfmText'
import { STATUS_UNKNOWN } from '../../../lib/dfmCheck'

// Rapor bölümü ekrandaki sonuçla aynı `r`/`text` kaynağından üretilir; bu test
// yapının bozulup bozulmadığını (boş etiket, kod sızması, eksik kontrol satırı)
// denetler.
const text = getText('tr')
const textEn = getText('en')
const dfm = dfmText('tr')

// Ekrandaki `displayRows` ile aynı biçim; rapor bunları satır olarak basar.
function rowsFor(r) {
  if (!r.ok) return []
  const checks = r.tab === TAB_PADSTACK ? r.checks : [r.check]
  return checks.map((c) => ({
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

describe('ClearanceCreepagePadstack report.js — padstack', () => {
  const f = INITIAL_FORM
  const r = compute(TAB_PADSTACK, MODE_SYNTHESIS, f, {}, text.fieldLabels)
  const s = buildSweep(r, SWEEP_REGISTRATION)
  const section = buildReportSection({
    tab: TAB_PADSTACK, mode: MODE_SYNTHESIS, f, r, s, text, dfm, rows: rowsFor(r),
  })

  it('geçerli girdide dolu bir bölüm döner', () => {
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
  })

  it('mod etiketi sekme ve modu birlikte yazar', () => {
    expect(section.mode).toContain(text.tabs.padstack)
    expect(section.mode).toContain(text.modeSynthesis)
  })

  it('sonuç satırlarında ham kod sızmaz', () => {
    for (const row of section.results) {
      expect(typeof row.label).toBe('string')
      expect(row.label.length).toBeGreaterThan(0)
      expect(row.value).not.toBeUndefined()
      expect(String(row.value)).not.toContain('undefined')
      expect(String(row.value)).not.toContain('NaN')
      expect(String(row.value)).not.toContain('Infinity')
    }
  })

  it('değerlendirilemeyen kontroller de rapora girer', () => {
    const rows = rowsFor(r)
    expect(rows.some((row) => row.status === STATUS_UNKNOWN)).toBe(true)
    const labels = section.results.map((row) => row.label)
    expect(labels.some((l) => l.includes(dfm.statusLabel(STATUS_UNKNOWN)))).toBe(true)
  })

  it('grafik bölümü tolerans süpürmesini taşır', () => {
    expect(section.chart).not.toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('analiz modunda pad ve matkap girdileri listelenir', () => {
    const ra = compute(TAB_PADSTACK, MODE_ANALYSIS, f, {}, text.fieldLabels)
    const sec = buildReportSection({
      tab: TAB_PADSTACK, mode: MODE_ANALYSIS, f, r: ra, s: null, text, dfm, rows: rowsFor(ra),
    })
    const labels = sec.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.Ddrill)
    expect(labels).toContain(text.fieldLabels.Dpad)
    expect(labels).not.toContain(text.fieldLabels.targetRing)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const bad = { ...INITIAL_FORM, Dfinished: '' }
    const rb = compute(TAB_PADSTACK, MODE_SYNTHESIS, bad, {}, text.fieldLabels)
    expect(buildReportSection({
      tab: TAB_PADSTACK, mode: MODE_SYNTHESIS, f: bad, r: rb, s: null, text, dfm, rows: [],
    })).toBeNull()
  })
})

describe('ClearanceCreepagePadstack report.js — mesafe sekmeleri', () => {
  const f = { ...INITIAL_FORM, clearUser: '1.5', clearActual: '1.65' }
  const r = compute(TAB_CLEARANCE, MODE_SYNTHESIS, f, {}, text.fieldLabels)

  it('profil olmadan da rapor üretir ve tablo sonucu boş kalır', () => {
    const section = buildReportSection({
      tab: TAB_CLEARANCE, mode: MODE_SYNTHESIS, f, r, s: null, text, dfm, rows: rowsFor(r),
    })
    expect(section).not.toBeNull()
    expect(section.mode).toBe(text.tabs.clearance)
    const base = section.results.find((row) => row.label === text.table.base)
    expect(base.value).toBe('—')
  })

  it('creepage sekmesi kendi formülünü taşır', () => {
    const rc = compute(TAB_CREEPAGE, MODE_SYNTHESIS, f, {}, text.fieldLabels)
    const section = buildReportSection({
      tab: TAB_CREEPAGE, mode: MODE_SYNTHESIS, f, r: rc, s: null, text, dfm, rows: rowsFor(rc),
    })
    expect(section.formula[0]).toBe(text.formulas.creepage.title)
  })
})

describe('ClearanceCreepagePadstack report.js — iki dillilik', () => {
  it('İngilizce metinle üretilen raporda Türkçe dize kalmaz', () => {
    const dfmEn = dfmText('en')
    const f = INITIAL_FORM
    const r = compute(TAB_PADSTACK, MODE_SYNTHESIS, f, {}, textEn.fieldLabels)
    const section = buildReportSection({
      tab: TAB_PADSTACK, mode: MODE_SYNTHESIS, f, r, s: null, text: textEn, dfm: dfmEn, rows: [],
    })
    const blob = JSON.stringify(section)
    expect(blob).not.toMatch(/[ğışçöüİĞŞÇÖÜ]/)
  })
})
