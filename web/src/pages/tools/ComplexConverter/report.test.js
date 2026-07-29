import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, MODE_RECT, MODE_POLAR, SWEEP_MAG, SWEEP_PHASE,
} from './model'
import { getText } from './text'
import { fmtOhm } from '../../../lib/num'
import { KIND_INDUCTIVE, KIND_RESISTIVE } from '../../../lib/convertComplex'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('ComplexConverter report.js', () => {
  it('geçerli girdide (dikdörtgensel) dolu bir bölüm döner', () => {
    const f = INITIAL_FORM // mode: rect, R=50, X=-30
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ mode: f.mode, f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.modeLabel[MODE_RECT])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural — R = X = 0)', () => {
    const f = { ...INITIAL_FORM, R: '0', X: '0' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: f.mode, f, r, text })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu (büyük sonuç kutusu)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ mode: f.mode, f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigLabel[MODE_RECT])
  })

  it('dikdörtgensel modda R + jX girdileri listelenir, |Z|/φ listelenmez', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ mode: f.mode, f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.R)
    expect(labels).toContain(text.fieldLabels.X)
    expect(labels).not.toContain(text.fieldLabels.mag)
    expect(labels).not.toContain(text.fieldLabels.phase)
  })

  it('polar modda |Z| + φ girdileri listelenir, R/X listelenmez, mod etiketi değişir', () => {
    const f = { ...INITIAL_FORM, mode: MODE_POLAR, mag: '58.31', magu: 'Ω', phase: '-30.96', phaseu: '°' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.mode).toBe(MODE_POLAR)
    const section = buildReportSection({ mode: f.mode, f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.mag)
    expect(labels).toContain(text.fieldLabels.phase)
    expect(labels).not.toContain(text.fieldLabels.R)
    expect(section.mode).toBe(text.modeLabel[MODE_POLAR])
    // Polar modda büyük sonuç kutusu dikdörtgensel biçimi üretir (ekranla aynı)
    expect(section.results[0].label).toBe(text.bigLabel[MODE_POLAR])
  })

  it('negatif |Z| girildiğinde null döner (negatif büyüklük nedeni)', () => {
    const f = { ...INITIAL_FORM, mode: MODE_POLAR, mag: '-5', phase: '10' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ mode: f.mode, f, r, text })).toBeNull()
  })

  it('ana değer dışına sarılan açıda "Girilen açı" satırı eklenir', () => {
    const f = { ...INITIAL_FORM, mode: MODE_POLAR, mag: '10', magu: 'Ω', phase: '270', phaseu: '°' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.wrapped).toBe(true)
    const section = buildReportSection({ mode: f.mode, f, r, text })
    expect(section.results.some((row) => row.label === text.table.entered)).toBe(true)
  })

  it('sarılmayan açıda "Girilen açı" satırı eklenmez', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.wrapped).toBe(false)
    const section = buildReportSection({ mode: f.mode, f, r, text })
    expect(section.results.some((row) => row.label === text.table.entered)).toBe(false)
  })

  it('ters dönüşüm kontrolü satırları eklenir (r.check dolu)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.check).not.toBeNull()
    const section = buildReportSection({ mode: f.mode, f, r, text })
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain('R = |Z|·cos φ')
    expect(labels).toContain('φ = atan2(X, R)')
  })

  it('|Z| taraması verilince chart.table dolu döner, svg alanı boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_MAG)
    const section = buildReportSection({ mode: f.mode, f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('φ taraması verilince chart başlığı ve sütunu φ taramasına döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_PHASE)
    const section = buildReportSection({ mode: f.mode, f, r, s, text })

    expect(section.chart.title).toBe(text.chart.caption[SWEEP_PHASE])
    expect(section.chart.table.columns[1]).toBe(text.chart.series[SWEEP_PHASE])
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ mode: f.mode, f, r, text })
    expect(section.chart).toBeNull()
  })

  it('hiçbir sonuç satırı boş etiket ya da undefined değer taşımaz', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_MAG)
    const section = buildReportSection({ mode: f.mode, f, r, s, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  it('endüktif girdide (X > 0) kind endüktiftir ve "sanal bileşen" satırında görünür', () => {
    const f = { ...INITIAL_FORM, R: '50', X: '30' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.kind).toBe(KIND_INDUCTIVE)
    const section = buildReportSection({ mode: f.mode, f, r, text })
    expect(section).not.toBeNull()
    const imagRow = section.results.find((row) => row.label === text.table.imag)
    expect(imagRow.value).toContain(text.kindLabel[KIND_INDUCTIVE])
  })

  it('saf dirençli girdide (X = 0) kind saf dirençlidir', () => {
    const f = { ...INITIAL_FORM, R: '50', X: '0' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.kind).toBe(KIND_RESISTIVE)
    const section = buildReportSection({ mode: f.mode, f, r, text })
    expect(section).not.toBeNull()
  })

  it('negatif R girdisinde negativeReal bayrağı doğrudur ve bölüm yine üretilir', () => {
    const f = { ...INITIAL_FORM, R: '-50', X: '30' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.flags.negativeReal).toBe(true)
    const section = buildReportSection({ mode: f.mode, f, r, text })
    expect(section).not.toBeNull()
    const quadrantRow = section.results.find((row) => row.label === text.table.quadrant)
    expect(quadrantRow.value).toBe(text.quadrantLabel[r.quadrant])
  })

  it('R=0 taramasında chart tablosu sağ uç noktayı hiç atlamaz (mod 10 kırılsa bile)', () => {
    const f = { ...INITIAL_FORM, R: '0', X: '30' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    const s = buildSweep(r, SWEEP_MAG)
    // R=0/X=0 tekilliği taramadan bir satır düşürür, bu yüzden son geçerli
    // indeks 10'un katı olmayabilir — eski `i % 10 === 0` filtresi tam da bu
    // durumda sağ uç noktayı atlıyordu (asıl regresyon senaryosu budur).
    expect((s.rows.length - 1) % 10).not.toBe(0)
    const section = buildReportSection({ mode: f.mode, f, r, s, text })
    const rows = section.chart.table.rows
    const trueLast = s.rows[s.rows.length - 1]
    expect(rows[rows.length - 1]).toEqual([fmtOhm(trueLast.x), fmtOhm(trueLast.y)])
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ mode: f.mode, f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.modeLabel[MODE_RECT])
  })
})
