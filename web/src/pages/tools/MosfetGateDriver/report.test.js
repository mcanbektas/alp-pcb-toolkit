import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  SWEEP_RESISTANCE, SWEEP_FSW,
  REASON_COUNT, GD_ERR_INVALID, GD_ERR_DRIVER_CURRENT,
} from './model'
import { getText } from './text'
import { fmt, fmtEng } from '../../../lib/num'

// Ekranla rapor arasındaki kayma riski, aynı `r`/`s`/`text` kaynağından aynı
// satırların üretilip üretilmediğini denetleyerek en aza indirilir — bkz.
// ReturnPathStitchingVia/report.test.js ile aynı gerekçe.
const text = getText('tr')

describe('MosfetGateDriver report.js', () => {
  it('varsayılan girdide REV2 §6.12 referans sonucuyla eşleşir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.averageCurrent * 1e3).toBeCloseTo(4, 9)
    expect(r.gatePower * 1e3).toBeCloseTo(40, 9)
    expect(r.on.current).toBeCloseTo(0.5, 9)
    expect(r.on.millerTime * 1e9).toBeCloseTo(20, 9)

    const section = buildReportSection({ f, r, text })
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, qg: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('MOSFET sayısı tam sayı değilse count nedeniyle başarısız olur', () => {
    const f = { ...INITIAL_FORM, count: '1.5' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe(REASON_COUNT)
  })

  it('gerilim sıralaması bozuksa GD_ERR_INVALID döner', () => {
    const f = { ...INITIAL_FORM, vPlateau: '12' } // vDrive(10) > vPlateau ihlali
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe(GD_ERR_INVALID)
  })

  it('sürücü tepe akım limiti turn-on akımını kırpar ve tehlike notu eklenir', () => {
    const f = { ...INITIAL_FORM, driverPeakSource: '0.2' } // 0.5 A yerine 0.2 A ile sınırlı
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.on.driverLimited).toBe(true)
    expect(r.on.current).toBeCloseTo(0.2, 9)
    expect(r.on.error).toBe(GD_ERR_DRIVER_CURRENT)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('hedef turn-on süresi ulaşılabilirse önerilen direnç raporlanır', () => {
    const f = { ...INITIAL_FORM, hasTarget: true, targetOnTime: '20' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.targetOn.error).toBeUndefined()
    expect(r.targetOn.external).toBeCloseTo(10, 9)

    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label.includes(text.table.targetExternal))).toBe(true)
  })

  it('iç dirençler hedeften yavaşsa negatif direnç hatası ve tehlike notu gelir', () => {
    const f = {
      ...INITIAL_FORM, hasTarget: true, targetOnTime: '1', rDriverSource: '2',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.targetOn.error).toBeDefined()
    expect(r.targetOn.external).toBeLessThan(0)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('switching kaybı tüm girdiler verilince hesaplanır', () => {
    const f = {
      ...INITIAL_FORM, hasLoss: true, vds: '400', id: '10', tr: '20', tf: '30',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.switchingLoss).toBeGreaterThan(0)

    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.switchingLoss)).toBe(true)
  })

  it('C_oss kaybı yalnızca C_oss verilince yaklaşık yöntemle hesaplanır', () => {
    const f = { ...INITIAL_FORM, hasLoss: true, vds: '400', coss: '1000', cossu: 'pF' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.cossSource).toBe('coss')
    expect(r.cossLoss).toBeGreaterThan(0)
  })

  it('E_oss verilmişse C_oss yerine o kullanılır (öncelik)', () => {
    const f = {
      ...INITIAL_FORM, hasLoss: true, vds: '400', coss: '1000', cossu: 'pF', eoss: '5', eossu: 'µJ',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.cossSource).toBe('eoss')
    // E_oss·f_sw = 5 µJ × 100 kHz = 0.5 W — ½·C·V² ile aynı DEĞİL, önceliğin
    // gerçekten E_oss'a geçtiğini gösterir.
    expect(r.cossLoss).toBeCloseTo(0.5, 9)
  })

  it('ilk sonuç satırı vurgulu ve büyük sonuçtaki değerle aynı', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigResultLabel)
    expect(`${section.results[0].value} ${section.results[0].unit}`).toBe(fmtEng(r.on.current, 'A', 4))
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

  it('direnç taraması üç sütun döner (turn-on / turn-off)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_RESISTANCE)
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart.table.columns).toHaveLength(3)
    const lastRow = s.rows[s.rows.length - 1]
    const lastExported = section.chart.table.rows[section.chart.table.rows.length - 1]
    expect(lastExported).toEqual([fmt(lastRow.x, 3), fmt(lastRow.y, 4), fmt(lastRow.yOff, 4)])
  })

  it('frekans taraması iki sütun döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_FSW)
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz (hedef + kayıp, tam girdi)', () => {
    const f = {
      ...INITIAL_FORM,
      driverPeakSource: '2', driverPeakSink: '2',
      hasTarget: true, targetOnTime: '20', targetOffTime: '20',
      hasLoss: true, vds: '400', id: '10', tr: '20', tf: '30', coss: '1000', eoss: '5', eossu: 'µJ',
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
