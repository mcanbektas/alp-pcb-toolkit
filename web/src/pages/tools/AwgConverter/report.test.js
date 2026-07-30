import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, DIR_AWG, DIR_DIAMETER, SWEEP_D, SWEEP_AREA,
} from './model'
import { getText } from './text'
import { fmt } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('AwgConverter report.js', () => {
  it('geçerli girdide (numaradan çapa) dolu bir bölüm döner', () => {
    const f = INITIAL_FORM // dir: DIR_AWG, awg: '24'
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.dirLabel[DIR_AWG])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('ilk sonuç satırı vurgulu (büyük sonuç) ve doğru birimde', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].unit).toBe('mm')
  })

  it('hesap başarısızsa null döner (aralık dışı AWG)', () => {
    const f = { ...INITIAL_FORM, awg: '999' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('hesap başarısızsa null döner (boş girdi)', () => {
    const f = { ...INITIAL_FORM, awg: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('yön: numaradan çapa — girdi AWG numarasıdır, birimi "AWG"dir', () => {
    const f = { ...INITIAL_FORM, dir: DIR_AWG, awg: '24' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.inputs.some((i) => i.label === text.fieldLabels.awg && i.unit === 'AWG')).toBe(true)
    // Büyük sonuç "AWG ..." önekiyle değil, çap + mm birimiyle gösterilir
    expect(section.results[0].label).toBe(text.bigFromAwg)
  })

  it('yön: çaptan numaraya — girdi çap alanıdır, büyük sonuç "AWG ..." dizesidir', () => {
    const f = { ...INITIAL_FORM, dir: DIR_DIAMETER, d: '0.5', du: 'mm' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.mode).toBe(text.dirLabel[DIR_DIAMETER])
    expect(section.inputs.some((i) => i.label === text.fieldLabels.d && i.unit === 'mm')).toBe(true)
    expect(section.results[0].label).toBe(text.bigFromDiameter)
    expect(section.results[0].unit).toBeNull()
    expect(section.results[0].value).toMatch(/^AWG /)
  })

  it('çekme toleransı girilip geçerliyse tolerans bandı satırları eklenir', () => {
    const f = { ...INITIAL_FORM, tolD: '5' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.inputs.some((i) => i.label === text.fieldLabels.tolD && i.unit === '± %')).toBe(true)
    expect(section.results.some((row) => row.label === text.tolTable.dMm)).toBe(true)
    expect(section.results.some((row) => row.label === text.tolTable.band)).toBe(true)
  })

  it('çekme toleransı boşsa tolerans satırları eklenmez', () => {
    const f = { ...INITIAL_FORM, tolD: '' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.tolTable.dMm)).toBe(false)
  })

  it('çekme toleransı geçersizse (>= %100) uyarı notlara eklenir, hesap iptal edilmez', () => {
    const f = { ...INITIAL_FORM, tolD: '100' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    const section = buildReportSection({ f, r, text })
    expect(section).not.toBeNull()
    expect(section.notes.some((n) => n.level === 'warn' && n.text === text.toleranceReason(r.tolerance.error))).toBe(true)
  })

  it('en yakın standart numara ve komşu numaralar satırları dolu döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.nearest.d)).toBe(true)
    expect(section.results.some((row) => row.label === text.nearest.dDelta)).toBe(true)
    expect(section.results.filter((row) => row.label.startsWith('AWG ')).length).toBeGreaterThan(0)
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_D)
    const section = buildReportSection({ f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('chart tablosu serinin son satırını (en ince tel) hiç atlamaz', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_D)
    // Seri AWG 40…−3 arası 44 satır taşır; son indeks (43) 5'in katı DEĞİLDİR:
    // eski `i % 5 === 0` filtresi tam da bu yüzden son satırı düşürüyordu,
    // ekran ise <ChartDataTable every={5} .../> ile onu her zaman gösteriyordu.
    expect((s.rows.length - 1) % 5).not.toBe(0)

    const section = buildReportSection({ f, r, s, text })
    const rows = section.chart.table.rows
    const last = s.rows[s.rows.length - 1]
    expect(rows[rows.length - 1]).toEqual([fmt(last.x, 4), `AWG ${text.awgLabel(last.y)}`])
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.chart).toBeNull()
  })

  it('sweep parametresi kesit alanına çevrilince grafik başlığı da değişir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_AREA)
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart.title).toBe(text.sweepCaption[SWEEP_AREA])
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz', () => {
    const f = { ...INITIAL_FORM, tolD: '5' }
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_D)
    const section = buildReportSection({ f, r, s, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  it('İngilizce metinle çağrıldığında araç adı ve yön etiketi de İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.dirLabel[DIR_AWG])
  })
})
