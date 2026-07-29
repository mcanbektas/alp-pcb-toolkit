import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import { compute, buildSweep, INITIAL_FORM, LAYER_DIFFERENT } from './model'
import { getText } from './text'
import { epsEffRows } from '../../../components/EpsEffFields'
import { fmt } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`text` kaynağından üretilir; bu test her sürümde yapının bozulup
// bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması) denetler.
const text = getText('tr')

describe('Skew report.js', () => {
  it('geçerli girdide (aynı katman) dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })

    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBeUndefined()
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, lengthP: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text, lang: 'tr' })).toBeNull()
  })

  it('efektif dielektrik sabiti geçersizse (< 1) null döner', () => {
    const f = { ...INITIAL_FORM, epsEffManual: '0.5' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text, lang: 'tr' })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu (diferansiyel skew) ve büyük sonuçla aynı etikette', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigLabel)
    expect(section.results[0].unit).not.toBeNull()
  })

  it('aynı katman seçildiğinde εeff,N ve aynı-εeff skew satırları listede yok', () => {
    const f = INITIAL_FORM // varsayılan layer: same
    const r = compute(f, text.fieldLabels)
    expect(r.differentLayer).toBe(false)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    const labels = section.results.map((row) => row.label)
    expect(labels).not.toContain(text.table.epsEffN)
    expect(labels).not.toContain(text.table.sameEpsSkew)
  })

  it('farklı katman ve farklı εeff,N seçildiğinde εeff,N ve aynı-εeff skew satırları listede', () => {
    const f = { ...INITIAL_FORM, layer: LAYER_DIFFERENT, epsEffN: '4.5' }
    const r = compute(f, text.fieldLabels)
    expect(r.differentLayer).toBe(true)
    expect(r.sameLayer).toBe(false)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    const labels = section.results.map((row) => row.label)
    expect(labels).toContain(text.table.epsEffN)
    expect(labels).toContain(text.table.sameEpsSkew)

    const sameLayerRow = section.results.find((row) => row.label === text.table.sameLayer)
    expect(sameLayerRow.value).toBe(text.no)
  })

  it('farklı katman seçilip εeff,N manuel değerle eşit girildiğinde motor aynı katman gibi ele alır', () => {
    // model.js'in kendi yorumu: kullanıcının seçimi (f.layer) motorun sameLayer
    // kararından ayrıdır — ikisi ayrı alanlarda tutulur.
    const f = { ...INITIAL_FORM, layer: LAYER_DIFFERENT, epsEffN: INITIAL_FORM.epsEffManual }
    const r = compute(f, text.fieldLabels)
    expect(r.differentLayer).toBe(true)
    expect(r.sameLayer).toBe(true)
    const section = buildReportSection({ f, r, text, lang: 'tr' })

    const sameLayerRow = section.results.find((row) => row.label === text.table.sameLayer)
    expect(sameLayerRow.value).toBe(text.yes)
    // εeff,N satırı yine de listelenir — bu, kullanıcının farklı katman
    // seçtiğini gösterir, motorun sameLayer kararını değil.
    expect(section.results.some((row) => row.label === text.table.epsEffN)).toBe(true)
  })

  it('gecikmesi küçük olan hatta eklenecek uzunluk satırı hedef hattı da taşır', () => {
    const f = INITIAL_FORM // lengthP=50mm > lengthN=48mm, aynı εeff → P daha gecikmeli
    const r = compute(f, text.fieldLabels)
    expect(r.addTo).toBe('N')
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    const addRow = section.results.find((row) => row.label === text.table.addLength)
    expect(addRow.value).toContain(text.table.addTarget('N'))
  })

  it('gecikmeler eşitse (r.addTo === null) eşitleme gerekmez metni ve hedefsiz uzunluk satırı döner', () => {
    const f = { ...INITIAL_FORM, lengthN: INITIAL_FORM.lengthP }
    const r = compute(f, text.fieldLabels)
    expect(r.addTo).toBeNull()
    const section = buildReportSection({ f, r, text, lang: 'tr' })

    expect(section.schematicCaption).toBe(text.schematic.captionEqual)

    const addRow = section.results.find((row) => row.label === text.table.addLength)
    expect(addRow.value).not.toContain('→')
    expect(addRow.value).not.toContain(text.table.addTarget('N'))
    expect(addRow.value).not.toContain(text.table.addTarget('P'))
  })

  it('εeff satırları ekrandaki epsEffRows çıktısıyla birebir aynı (manuel kaynak)', () => {
    const f = INITIAL_FORM
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

  it('sweep (s) verilince chart.table dolu döner, svg alanı yakalanmak üzere boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text, lang: 'tr' })

    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    // x sütunu + skew serisi (aynı katman → "aynı εeff varsayımı" serisi yok)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('farklı katmanda chart.table üçüncü sütunu da taşır ("aynı εeff varsayımı" serisi)', () => {
    const f = { ...INITIAL_FORM, layer: LAYER_DIFFERENT, epsEffN: '4.5' }
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text, lang: 'tr' })

    expect(section.chart.table.columns).toHaveLength(3)
    expect(section.chart.table.columns).toContain(text.chart.seriesSame)
  })

  it('s verilmezse chart null döner (ekrandaki boş-grafik durumuyla aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    expect(section.chart).toBeNull()
  })

  it('schematicCaption, ekranın şematik bileşeninde kullandığı metinle aynı', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, lang: 'tr' })
    expect(section.schematicCaption).toBe(
      r.addTo === null ? text.schematic.captionEqual : text.schematic.captionDefault,
    )
  })

  it('hiçbir sonuç ya da girdi satırı boş etiket ya da undefined değer taşımaz', () => {
    const f = { ...INITIAL_FORM, layer: LAYER_DIFFERENT, epsEffN: '4.5' }
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
