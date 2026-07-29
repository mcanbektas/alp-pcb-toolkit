import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, SWEEP_LAYER, SWEEP_TOLERANCE,
  layersToRecord, recordToRows, buildTransferPayload,
} from './model'
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

describe('StackupPlanner report.js', () => {
  const f = INITIAL_FORM
  const r = compute(f, {}, text.fieldLabels)
  const s = buildSweep(r, SWEEP_LAYER, 4)
  const section = buildReportSection({ f, r, s, text, dfm, rows: rowsFor(r) })

  it('geçerli girdide dolu bir bölüm döner', () => {
    expect(r.ok).toBe(true)
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('ana sonuç bitmiş toplam kalınlıktır', () => {
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.table.finishedTotal)
    // Varsayılan dizilim brief §12.4 ile aynı: 1.58 mm
    expect(section.results[0].value).toContain('1.58')
  })

  it('katmanlar rapora satır satır girer', () => {
    const layerRows = section.inputs.filter((i) => i.label.startsWith(text.layers.rowLabel))
    expect(layerRows).toHaveLength(INITIAL_FORM.layers.length)
    expect(layerRows[0].unit).toBe('mm')
  })

  it('sinyal katmanı referans mesafeleri rapora girer', () => {
    const labels = section.results.map((row) => row.label)
    expect(labels.some((l) => l.includes('L1'))).toBe(true)
    const l1 = section.results.find((row) => row.label.startsWith('L1'))
    expect(l1.value).toContain(text.signals.H)
  })

  it('değerlendirilemeyen kontroller rapora girer', () => {
    const rows = rowsFor(r)
    expect(rows.some((row) => row.status === STATUS_UNKNOWN)).toBe(true)
    const labels = section.results.map((row) => row.label)
    expect(labels.some((l) => l.includes(dfm.statusLabel(STATUS_UNKNOWN)))).toBe(true)
  })

  it('sonuç satırlarında sayısal bozukluk sızmaz', () => {
    for (const row of section.results) {
      expect(String(row.value)).not.toContain('undefined')
      expect(String(row.value)).not.toContain('NaN')
      expect(String(row.value)).not.toContain('Infinity')
    }
  })

  it('tolerans süpürmesi üç sütunlu tablo verir', () => {
    const st = buildSweep(r, SWEEP_TOLERANCE)
    const sec = buildReportSection({ f, r, s: st, text, dfm, rows: [] })
    expect(sec.chart.table.columns).toHaveLength(3)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const bad = {
      ...INITIAL_FORM,
      layers: INITIAL_FORM.layers.map((l, i) => (i === 0 ? { ...l, thickness: '' } : l)),
    }
    const rb = compute(bad, {}, text.fieldLabels)
    expect(rb.ok).toBe(false)
    expect(buildReportSection({ f: bad, r: rb, s: null, text, dfm, rows: [] })).toBeNull()
  })
})

describe('StackupPlanner — kayıt gidiş dönüşü', () => {
  it('katmanlar mm zarfına çevrilir ve geri yüklenince aynı hesabı verir', () => {
    const r = compute(INITIAL_FORM, {}, text.fieldLabels)
    const record = { layers: layersToRecord(r.engineInput.layers) }
    const back = recordToRows(record)

    expect(back).toHaveLength(INITIAL_FORM.layers.length)
    // Zarf mm saklar; geri yüklemede birim seçici mm'ye sabitlenir
    expect(back[0].thicknessU).toBe('mm')

    const r2 = compute({ ...INITIAL_FORM, layers: back }, {}, text.fieldLabels)
    expect(r2.ok).toBe(true)
    expect(r2.results.finishedTotal).toBeCloseTo(r.results.finishedTotal, 15)
    expect(r2.results.totalMin).toBeCloseTo(r.results.totalMin, 15)
    expect(r2.results.totalMax).toBeCloseTo(r.results.totalMax, 15)
  })

  it('yüzdesel tolerans kipi gidiş dönüşte boyutsuz kalır', () => {
    const layers = INITIAL_FORM.layers.map((l, i) => (
      i === 4 ? { ...l, toleranceMode: 'percent', tolA: '10', tolB: '10' } : l
    ))
    const r = compute({ ...INITIAL_FORM, layers }, {}, text.fieldLabels)
    const back = recordToRows({ layers: layersToRecord(r.engineInput.layers) })
    expect(back[4].tolA).toBe('10')
    expect(back[4].tolB).toBe('10')

    const r2 = compute({ ...INITIAL_FORM, layers: back }, {}, text.fieldLabels)
    expect(r2.results.totalMin).toBeCloseTo(r.results.totalMin, 15)
  })
})

describe('StackupPlanner — empedans aktarımı', () => {
  it('seçili sinyal katmanının parametrelerini SI olarak taşır', () => {
    const r = compute(INITIAL_FORM, {}, text.fieldLabels)
    const signal = r.signals[0]
    const payload = buildTransferPayload(r, signal.index, 'Dört katman')

    expect(payload.schema).toBe('alp-stackup-transfer')
    expect(payload.unit).toBe('m')
    expect(payload.stackup).toBe('Dört katman')
    expect(payload.copperThickness).toBeCloseTo(35e-6, 15)
    expect(payload.H).toBeCloseTo(0.2e-3, 15)
    expect(payload.outer).toBe(true)
  })

  it('olmayan katman için yük üretilmez', () => {
    const r = compute(INITIAL_FORM, {}, text.fieldLabels)
    expect(buildTransferPayload(r, 999)).toBeNull()
  })

  it('hesap başarısızsa yük üretilmez', () => {
    const bad = {
      ...INITIAL_FORM,
      layers: INITIAL_FORM.layers.map((l, i) => (i === 0 ? { ...l, thickness: '' } : l)),
    }
    expect(buildTransferPayload(compute(bad, {}, text.fieldLabels), 1)).toBeNull()
  })
})

describe('StackupPlanner report.js — iki dillilik', () => {
  it('İngilizce metinle üretilen raporda Türkçe dize kalmaz', () => {
    const textEn = getText('en')
    const dfmEn = dfmText('en')
    // Katman adları kullanıcı verisidir ve çevrilmez; varsayılan adlar ASCII.
    const r = compute(INITIAL_FORM, {}, textEn.fieldLabels)
    const section = buildReportSection({
      f: INITIAL_FORM, r, s: null, text: textEn, dfm: dfmEn, rows: [],
    })
    expect(JSON.stringify(section)).not.toMatch(/[ğışçöüİĞŞÇÖÜ]/)
  })
})
