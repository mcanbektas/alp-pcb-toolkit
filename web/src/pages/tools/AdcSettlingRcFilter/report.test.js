import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  ACQ_CYCLES, SWEEP_SETTLING, SWEEP_FILTER,
  REASON_BITS,
} from './model'
import { getText } from './text'
import { fmt, fmtRes } from '../../../lib/num'

// Ekranla rapor arasındaki kayma riski, aynı `r`/`s`/`text` kaynağından aynı
// satırların üretilip üretilmediğini denetleyerek en aza indirilir — bkz.
// ReturnPathStitchingVia/report.test.js ile aynı gerekçe.
const text = getText('tr')

describe('AdcSettlingRcFilter report.js', () => {
  it('varsayılan girdide REV2 §7.12 referans sonucuyla eşleşir (≈5.55 kΩ)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.maxEquivalentResistance / 1e3).toBeCloseTo(5.55, 2)
    expect(r.settles).toBe(true)

    const section = buildReportSection({ f, r, text })
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, cs: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('çözünürlük tam sayı değilse bits nedeniyle başarısız olur', () => {
    const f = { ...INITIAL_FORM, bits: '12.5' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe(REASON_BITS)
  })

  it('çevrim sayısından acquisition süresi doğrudan süreyle aynı sonucu verir', () => {
    const direct = compute(INITIAL_FORM, text.fieldLabels)
    const viaCycles = compute({
      ...INITIAL_FORM, acqMode: ACQ_CYCLES, cycles: '16', clock: '16', clocku: 'MHz',
    }, text.fieldLabels)
    expect(viaCycles.ok).toBe(true)
    expect(viaCycles.acquisitionTime).toBeCloseTo(1e-6, 12)
    expect(viaCycles.maxEquivalentResistance).toBeCloseTo(direct.maxEquivalentResistance, 6)
  })

  it('kaynak direnci büyürse yerleşme başarısız olur ve tehlike notu eklenir', () => {
    const f = { ...INITIAL_FORM, rSource: '100', rSourceu: 'kΩ' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.settles).toBe(false)
    expect(r.settlingMargin).toBeLessThan(0)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('anahtar direnci tek başına bütçeyi yerse buffer gerekir', () => {
    const f = { ...INITIAL_FORM, rSwitch: '10', rSwitchu: 'kΩ' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.bufferRequired).toBe(true)
    expect(r.maxSourceResistance).toBeNull()

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)

    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.maxSourceResistance)).toBe(false)
  })

  it('kaynak direnci küçükse önerilen maksimum kaynak direnci raporlanır', () => {
    const f = { ...INITIAL_FORM, rSwitch: '500', rSeries: '100', rDriver: '50' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.maxSourceResistance).toBeGreaterThan(0)

    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.maxSourceResistance)).toBe(true)
  })

  it('filtre direnci ve kondansatörü verilince kesim frekansı ve zayıflatma hesaplanır', () => {
    const f = {
      ...INITIAL_FORM, cFilter: '1', cFilteru: 'nF', rFilter: '1000', noiseFreq: '1', noiseFrequ: 'MHz',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.cutoffFrequency).toBeGreaterThan(0)
    expect(r.filter.attenuationDb).toBeLessThan(0)

    const s = buildSweep(r, SWEEP_FILTER)
    expect(s).not.toBeNull()
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('filtre direnci verilmezse filtre taraması null döner', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    expect(buildSweep(r, SWEEP_FILTER)).toBeNull()
  })

  it('adım gerilimi verilince droop hesaplanır ve uyarı notu eklenir', () => {
    const f = { ...INITIAL_FORM, vStep: '1' } // cFilter = 0 → droop = vStep aynen
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.droop).toBeCloseTo(1, 9)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'warn')).toBe(true)
  })

  it('adım gerilimi verilmezse droop null kalır', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    expect(r.droop).toBeNull()
  })

  it('ilk sonuç satırı vurgulu ve büyük sonuçtaki değerle aynı', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigResultLabel)
    expect(`${section.results[0].value} ${section.results[0].unit}`).toBe(fmtRes(r.maxEquivalentResistance))
  })

  it('bulgular notlara aynı seviye ve metinle taşınır (ekrandaki commentary ile aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const commentary = text.commentary(r)
    expect(section.notes.length).toBe(commentary.length)
    commentary.forEach((n, i) => {
      expect(section.notes[i].level).toBe(n.level)
      expect(section.notes[i].text).toBe(n.text)
    })
  })

  it('yerleşme taraması iki sütun döner ve son nokta örneklemede yer alır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_SETTLING)
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart.table.columns).toHaveLength(2)
    const lastRow = s.rows[s.rows.length - 1]
    const lastExported = section.chart.table.rows[section.chart.table.rows.length - 1]
    expect(lastExported).toEqual([fmt(lastRow.x, 3), fmt(lastRow.y, 6)])
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz (filtre + droop, tam girdi)', () => {
    const f = {
      ...INITIAL_FORM,
      rSource: '200', rSeries: '50', rSwitch: '100', rDriver: '20',
      cFilter: '1', cFilteru: 'nF', rFilter: '1000', noiseFreq: '1', noiseFrequ: 'MHz',
      vStep: '1', tempC: '40',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    const section = buildReportSection({ f, r, text })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
    }
  })

  it('İngilizce metinle çağrıldığında araç adı da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en })
    expect(section.toolName).toBe(en.title)
  })
})
