import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import { compute, buildSweep, INITIAL_FORM, REASON_EPS } from './model'
import { getText } from './text'
import { epsEffRows } from '../../../components/EpsEffFields'
import { fmt } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('PropDelay report.js', () => {
  it('geçerli girdide dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBeNull()
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, length: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text, lang: 'tr' })).toBeNull()
  })

  it('εeff geometriden çözülemezse (REASON_EPS) null döner', () => {
    // epsR = 1 alan doğrulamasını (min: 1) geçer ama microstrip() epsR > 1
    // ister — resolveEpsEff bu yüzden { error } döner.
    const f = { ...INITIAL_FORM, epsSource: 'geometry', epsStructure: 'microstrip', epsR: '1' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe(REASON_EPS)
    expect(buildReportSection({ f, r, text, lang: 'tr' })).toBeNull()
  })

  it('belirsiz binlik ayırıcı taşıyan girdide (ambiguous) null döner', () => {
    const f = { ...INITIAL_FORM, length: '1.000' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.ambiguous.length).toBeGreaterThan(0)
    expect(buildReportSection({ f, r, text, lang: 'tr' })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu (birim uzunluk gecikmesi) ve ekrandaki birimle aynı', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigResult)
    expect(section.results[0].value).toBe(fmt(r.tpdPsPerMm, 4))
    expect(section.results[0].unit).toBe('ps/mm')
  })

  it('εeff satırları ekrandaki epsEffRows çıktısıyla birebir aynı (manuel kaynak)', () => {
    const f = INITIAL_FORM // INITIAL_EPS_FORM varsayılanı epsSource: 'manual'
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    const expectedRows = epsEffRows(r.eps, fmt, 'tr')
    expect(expectedRows.length).toBeGreaterThan(0)
    for (const row of expectedRows) {
      expect(
        section.results.some((res) => res.label === row.label && res.value === row.value),
      ).toBe(true)
    }
  })

  it('εeff satırları ekrandaki epsEffRows çıktısıyla birebir aynı (geometriden — microstrip)', () => {
    const f = { ...INITIAL_FORM, epsSource: 'geometry' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    const expectedRows = epsEffRows(r.eps, fmt, 'tr')
    // Microstrip geometrisi ek Z0 satırı taşır — manuel kaynaktan bir satır daha çok
    expect(expectedRows.length).toBeGreaterThanOrEqual(3)
    for (const row of expectedRows) {
      expect(
        section.results.some((res) => res.label === row.label && res.value === row.value),
      ).toBe(true)
    }
  })

  it('εeff satırları ekrandaki epsEffRows çıktısıyla birebir aynı (geometriden — stripline)', () => {
    const f = { ...INITIAL_FORM, epsSource: 'geometry', epsStructure: 'stripline' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    const expectedRows = epsEffRows(r.eps, fmt, 'tr')
    // Stripline homojen dielektriktedir: Z0 satırı yok, microstrip'ten bir satır az
    expect(expectedRows.length).toBe(2)
    for (const row of expectedRows) {
      expect(
        section.results.some((res) => res.label === row.label && res.value === row.value),
      ).toBe(true)
    }
  })

  it('elektriksel uzunluk ve dalga boyu oranı satırları ekrandaki gibi biçimlenir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })

    const electrical = section.results.find((row) => row.label === text.table.electricalLength)
    expect(electrical.value).toBe(`${fmt(r.degrees, 5)}° · ${fmt(r.radians, 5)} rad`)

    const fraction = section.results.find((row) => row.label === text.table.fraction)
    expect(fraction.value).toBe(fmt(r.fraction, 5))
    expect(fraction.unit).toBe('λ')
  })

  it('schematicCaption kısa hatta captionShort taşır (varsayılan girdi)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.fraction).toBeLessThanOrEqual(4)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    expect(section.schematicCaption).toBe(text.schematic.captionShort)
  })

  it('schematicCaption dört dalga boyundan uzun hatta captionLong taşır', () => {
    const f = { ...INITIAL_FORM, length: '1000', lengthu: 'mm' }
    const r = compute(f, text.fieldLabels)
    expect(r.fraction).toBeGreaterThan(4)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    expect(section.schematicCaption).toBe(text.schematic.captionLong)
  })

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text, lang: 'tr' })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    expect(section.chart).toBeNull()
  })

  it('hiçbir sonuç ya da girdi satırı boş etiket ya da undefined değer taşımaz', () => {
    const f = { ...INITIAL_FORM, epsSource: 'geometry' }
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text, lang: 'tr' })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
    }
  })

  it('İngilizce metinle çağrıldığında araç adı ve εeff satırları da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en, lang: 'en' })
    expect(section.toolName).toBe(en.title)
    const expectedRows = epsEffRows(r.eps, fmt, 'en')
    for (const row of expectedRows) {
      expect(
        section.results.some((res) => res.label === row.label && res.value === row.value),
      ).toBe(true)
    }
  })
})
