import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  SOURCE_WEIGHT, SOURCE_THICKNESS, SOURCE_FINISHED, OZ_CUSTOM,
} from './model'
import { METHOD_NOMINAL } from '../../../lib/copper'
import { getText } from './text'
import { fmt, fmtOhm } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('CopperConverter report.js', () => {
  it('geçerli girdide dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBe(text.sourceLabel[SOURCE_WEIGHT])
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].unit).toBe('µm')
  })

  it('hesap başarısızsa (zorunlu alan boş) null döner', () => {
    const f = { ...INITIAL_FORM, W: '' }
    const r = compute(f, text.fieldLabels)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('bakır ağırlığı kaynağında nominal/türetilmiş tablosu satırları görünür', () => {
    const f = INITIAL_FORM // source: SOURCE_WEIGHT
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain(text.nominalTable.methodUsed)
    expect(labels).toContain(text.methodLabel[METHOD_NOMINAL])
  })

  it('özel bakır ağırlığı girildiğinde girdi listesinde görünür', () => {
    const f = { ...INITIAL_FORM, ozPick: OZ_CUSTOM, oz: '2.5' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.inputs.some((i) => i.label === text.fields.oz.label && i.value === '2.5')).toBe(true)
  })

  it('kalınlıktan kaynağında nominal tablosu görünmez, kesit/direnç tablosu görünür', () => {
    const f = { ...INITIAL_FORM, source: SOURCE_THICKNESS }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const labels = section.results.map((row) => row.label)
    expect(section.mode).toBe(text.sourceLabel[SOURCE_THICKNESS])
    expect(labels).not.toContain(text.nominalTable.methodUsed)
    expect(labels).toContain(text.sectionTable.rectArea)
  })

  it('ölçülen bitmiş kalınlık kaynağında geriye çözülen kaplama satırları görünür', () => {
    const f = { ...INITIAL_FORM, source: SOURCE_FINISHED }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.platingSolved).toBe(true)
    const section = buildReportSection({ f, r, text })
    const labels = section.results.map((row) => row.label)
    expect(section.mode).toBe(text.sourceLabel[SOURCE_FINISHED])
    expect(labels).toContain(text.platingTable.plating)
    expect(labels).toContain(text.platingTable.share)
  })

  it('iç katmanda ölçülen bitmiş kalınlıkta folyo alanı istenmez, kaplama sıfırdır', () => {
    const f = { ...INITIAL_FORM, source: SOURCE_FINISHED, layer: 'internal' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    const section = buildReportSection({ f, r, text })
    expect(section.inputs.some((i) => i.label === text.fields.thickness.label)).toBe(false)
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('chart tablosu taramanın son satırını hiç atlamaz (ekrandaki kuralla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    // `buildSweep` 60 örneğe çalışma noktasını da sokuşturur, yani satır sayısı
    // 61'e çıkar ve son indeks (60) tesadüfen 5'in katı olur — eski
    // `i % 5 === 0` filtresi bu araçta son satırı düşürmüyordu. Kural yine de
    // ekranla tek kaynaktan gelmeli: tarama adımı ya da imleç ekleme kuralı
    // değişirse bu test ayrışmayı yakalar.
    const section = buildReportSection({ f, r, s, text })
    const rows = section.chart.table.rows
    const last = s.rows[s.rows.length - 1]
    expect(rows[rows.length - 1]).toEqual([fmt(last.x, 3), `${fmtOhm(last.y)}/□`])
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.chart).toBeNull()
  })

  it('tolerans alanları doldurulunca üçlü tablo satırları görünür', () => {
    const f = { ...INITIAL_FORM, tolStart: '5', tolPlate: '10', tolEtch: '0' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    const section = buildReportSection({ f, r, text })
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain(text.toleranceTable.finished)
    expect(labels).toContain(text.toleranceTable.applied)
    expect(section.inputs.some((i) => i.label === text.fields.tolStart.label && i.value === '5')).toBe(true)
  })

  it('tolerans hesaplanamazsa (ör. aşındırma üst sınırı ≥100%) tek uyarı satırı görünür', () => {
    const f = { ...INITIAL_FORM, etch: '60', tolEtch: '90' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.tolerance.error).toBeTruthy()
    const section = buildReportSection({ f, r, text })
    const row = section.results.find((row) => row.label === text.toleranceTable.caption)
    expect(row).toEqual({ label: text.toleranceTable.caption, value: text.toleranceReason(r.tolerance.error) })
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en })
    expect(section.toolName).toBe(en.title)
    expect(section.mode).toBe(en.sourceLabel[SOURCE_WEIGHT])
  })

  it('hiçbir satır boş etiket ya da undefined değer taşımaz', () => {
    const cases = [
      INITIAL_FORM,
      { ...INITIAL_FORM, source: SOURCE_THICKNESS },
      { ...INITIAL_FORM, source: SOURCE_FINISHED },
      { ...INITIAL_FORM, source: SOURCE_FINISHED, layer: 'internal' },
      { ...INITIAL_FORM, ozPick: OZ_CUSTOM, oz: '2.5' },
      { ...INITIAL_FORM, tolStart: '5', tolPlate: '10', tolEtch: '2' },
    ]
    for (const f of cases) {
      const r = compute(f, text.fieldLabels)
      const s = buildSweep(r)
      const section = buildReportSection({ f, r, s, text })
      expect(section, JSON.stringify(f)).not.toBeNull()
      for (const row of [...section.inputs, ...section.results]) {
        expect(row.label, JSON.stringify(row)).toBeTruthy()
        expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      }
    }
  })
})
