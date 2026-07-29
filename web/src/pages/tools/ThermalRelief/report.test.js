import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  SWEEP_WIDTH, SWEEP_COUNT, METRIC_RESISTANCE, METRIC_THERMAL,
  SPOKE_CUSTOM, SPOKE_TAPER,
} from './model'
import { getText } from './text'
import { dfmText } from '../../../data/dfmText'
import { STATUS_UNKNOWN } from '../../../lib/dfmCheck'
import { K_CU, K_CU_HIGH } from '../../../lib/units'

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

describe('ThermalRelief report.js', () => {
  const f = INITIAL_FORM
  const r = compute(f, {}, text.fieldLabels)
  const s = buildSweep(r, SWEEP_WIDTH)
  const section = buildReportSection({
    f, r, s, metric: METRIC_RESISTANCE, text, dfm, rows: rowsFor(r),
  })

  it('geçerli girdide dolu bir bölüm döner', () => {
    expect(r.ok).toBe(true)
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('ana sonuç paralel eşdeğer dirençtir', () => {
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.table.parallelResistance)
    // Referans örnek: 184.7 µΩ
    expect(section.results[0].value).toContain('184.7')
  })

  it('spoke başına satırlar rapora girer', () => {
    // Kontrol etiketleri de aynı sözcükle başlıyor ("Spoke genişliği"), o
    // yüzden yalnızca numaralı satırlar sayılır.
    const numbered = new RegExp(`^${text.spokeTable.index} \\d`)
    const spokeLines = section.results.filter((row) => numbered.test(row.label))
    expect(spokeLines).toHaveLength(4)
  })

  it('adet birimi çevrilir, dahili anahtar İngilizce raporda sızmaz', () => {
    const textEn = getText('en')
    const rEn = compute(INITIAL_FORM, {}, textEn.fieldLabels)
    const sectionEn = buildReportSection({
      f: INITIAL_FORM, r: rEn, s: null, text: textEn, dfm: dfmText('en'), rows: [],
    })
    expect(JSON.stringify(sectionEn)).not.toContain('"adet"')
    const countEn = sectionEn.inputs.find((i) => i.label === textEn.fieldLabels.spokeCount)
    expect(countEn.unit).toBe(textEn.countUnit)
  })

  it('değerlendirilemeyen kontroller rapora girer', () => {
    const rows = rowsFor(r)
    expect(rows.some((row) => row.status === STATUS_UNKNOWN)).toBe(true)
    const labels = section.results.map((row) => row.label)
    expect(labels.some((l) => l.includes(dfm.statusLabel(STATUS_UNKNOWN)))).toBe(true)
  })

  it('güç çapraz kontrolü iki yoldan da rapora yazılır', () => {
    const total = section.results.find((row) => row.label === text.table.powerTotal)
    const cross = section.results.find((row) => row.label === text.table.powerCheck)
    expect(total.value).toBe(cross.value)
  })

  it('sonuç satırlarında sayısal bozukluk sızmaz', () => {
    for (const row of section.results) {
      expect(String(row.value)).not.toContain('undefined')
      expect(String(row.value)).not.toContain('NaN')
      expect(String(row.value)).not.toContain('Infinity')
    }
  })

  it('grafik bölümü seçilen ölçüyü taşır', () => {
    expect(section.chart.table.columns[1]).toBe(text.chart.yAxis[METRIC_RESISTANCE])
    const thermal = buildReportSection({
      f, r, s, metric: METRIC_THERMAL, text, dfm, rows: [],
    })
    expect(thermal.chart.table.columns[1]).toBe(text.chart.yAxis[METRIC_THERMAL])
  })

  it('spoke sayısı süpürmesinde x sütunu tam sayı basar', () => {
    const sc = buildSweep(r, SWEEP_COUNT)
    const sec = buildReportSection({ f, r, s: sc, metric: METRIC_RESISTANCE, text, dfm, rows: [] })
    for (const row of sec.chart.table.rows) {
      expect(row[0]).not.toContain('.')
    }
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const bad = { ...INITIAL_FORM, current: '' }
    const rb = compute(bad, {}, text.fieldLabels)
    expect(rb.ok).toBe(false)
    expect(buildReportSection({ f: bad, r: rb, s: null, text, dfm, rows: [] })).toBeNull()
  })
})

describe('ThermalRelief — kip etiketleri', () => {
  it('taper kipi rapora yazılır ve dış genişlik girdisi listelenir', () => {
    const f = { ...INITIAL_FORM, spokeMode: SPOKE_TAPER }
    const r = compute(f, {}, text.fieldLabels)
    const section = buildReportSection({ f, r, s: null, text, dfm, rows: [] })
    expect(section.mode).toBe(text.spokeMode[SPOKE_TAPER])
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.outerWidth)
  })

  it('özel spoke kipinde spoke sayısı girdisi listelenmez', () => {
    const f = { ...INITIAL_FORM, spokeMode: SPOKE_CUSTOM }
    const r = compute(f, {}, text.fieldLabels)
    expect(r.ok).toBe(true)
    const section = buildReportSection({ f, r, s: null, text, dfm, rows: [] })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).not.toContain(text.fieldLabels.spokeCount)
    expect(section.mode).toBe(text.spokeMode[SPOKE_CUSTOM])
    // Listedeki iki spoke rapora girer
    const numbered = new RegExp(`^${text.spokeTable.index} \\d`)
    expect(section.results.filter((row) => numbered.test(row.label))).toHaveLength(2)
  })
})

describe('ThermalRelief — termal iletkenlik seçimi', () => {
  it('seçilen iletkenlik rapora yazılır ve termal direnci değiştirir', () => {
    const low = compute(INITIAL_FORM, {}, text.fieldLabels)
    const high = compute({ ...INITIAL_FORM, k: String(K_CU_HIGH) }, {}, text.fieldLabels)

    expect(low.results.k).toBe(K_CU)
    expect(high.results.k).toBe(K_CU_HIGH)
    expect(high.results.thermalResistance).toBeLessThan(low.results.thermalResistance)

    const section = buildReportSection({
      f: { ...INITIAL_FORM, k: String(K_CU_HIGH) }, r: high, s: null, text, dfm, rows: [],
    })
    const kRow = section.results.find((row) => row.label === text.table.k)
    expect(kRow.value).toContain('400')
  })
})

describe('ThermalRelief report.js — iki dillilik', () => {
  it('İngilizce metinle üretilen raporda Türkçe dize kalmaz', () => {
    const textEn = getText('en')
    const dfmEn = dfmText('en')
    const r = compute(INITIAL_FORM, {}, textEn.fieldLabels)
    const section = buildReportSection({
      f: INITIAL_FORM, r, s: null, text: textEn, dfm: dfmEn, rows: [],
    })
    expect(JSON.stringify(section)).not.toMatch(/[ğışçöüİĞŞÇÖÜ]/)
  })
})
