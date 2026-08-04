import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  MODE_RS485, BUS_ERR_FIXED_DELAY, BUS_ERR_BIAS_UNREACHABLE,
} from './model'
import { getText } from './text'
import { fmt, fmtEng, fmtRes } from '../../../lib/num'

// Ekranla rapor arasındaki kayma riski, aynı `r`/`s`/`text` kaynağından aynı
// satırların üretilip üretilmediğini denetleyerek en aza indirilir — bkz.
// ReturnPathStitchingVia/report.test.js ile aynı gerekçe.
const text = getText('tr')
const RS485_FORM = { ...INITIAL_FORM, mode: MODE_RS485 }

describe('CanRs485PhysicalLayer report.js — CAN', () => {
  it('varsayılan girdide busPhysical.test.js referansıyla eşleşir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.fixedDelay).toBeCloseTo(130e-9, 15)
    expect(r.roundTrip).toBeCloseTo(400e-9, 15)
    expect(r.loopDelay).toBeCloseTo(530e-9, 15)
    expect(r.margin).toBeCloseTo(345e-9, 15)
    expect(r.budgetExceeded).toBe(false)
    expect(r.maxLength).toBeCloseTo(74.5, 6)

    const section = buildReportSection({ f, r, text })
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, bitrate: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('bus çok uzunsa bütçe aşılır ve tehlike notu eklenir', () => {
    const f = { ...INITIAL_FORM, busLength: '200' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.budgetExceeded).toBe(true)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('sabit gecikme sample point’i aşarsa maxLength null ve tehlike notu gelir', () => {
    const f = { ...INITIAL_FORM, controllerDelay: '2000', controllerDelayu: 'ns' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.maxLength).toBeNull()
    expect(r.maxLengthError).toBe(BUS_ERR_FIXED_DELAY)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('split terminasyon common-mode kolu ve kesim frekansı hesaplanır', () => {
    const f = { ...INITIAL_FORM, hasSplit: true, r1: '60', r2: '60', cSplit: '4.7', cSplitu: 'nF' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.split.commonMode).toBeCloseTo(30, 9)
    expect(r.split.cutoff).toBeGreaterThan(0)

    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.splitCutoff)).toBe(true)
  })

  it('stub gecikmesi ve oranı hesaplanır', () => {
    const f = { ...INITIAL_FORM, hasStub: true, stubLength: '0.3', riseTime: '20' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.stub.roundTrip).toBeCloseTo(3e-9, 15)
    expect(r.stub.ratio).toBeCloseTo(0.15, 9)
  })

  it('ilk sonuç satırı vurgulu ve büyük sonuçtaki değerle aynı', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigResultLabelCan)
    expect(`${section.results[0].value} ${section.results[0].unit}`).toBe(fmtEng(r.margin, 's', 4))
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

  it('grafik iki sütun döner ve son nokta örneklemede yer alır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart.table.columns).toHaveLength(2)
    const lastRow = s.rows[s.rows.length - 1]
    const lastExported = section.chart.table.rows[section.chart.table.rows.length - 1]
    expect(lastExported).toEqual([fmt(lastRow.x, 3), fmt(lastRow.y, 4)])
  })

  it('İngilizce metinle çağrıldığında araç adı da İngilizce', () => {
    const en = getText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en })
    expect(section.toolName).toBe(en.title)
  })
})

describe('CanRs485PhysicalLayer report.js — RS-485', () => {
  it('varsayılan girdide (bias yok) diferansiyel yük hesaplanır, bias null kalır', () => {
    const f = RS485_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.differentialLoad).toBeCloseTo(60, 9)
    expect(r.bias).toBeNull()

    const section = buildReportSection({ f, r, text })
    expect(section).not.toBeNull()
    expect(section.results[0].label).toBe(text.bigResultLabelRs485)
  })

  it('busPhysical.test.js bias referansıyla eşleşir', () => {
    const f = { ...RS485_FORM, rPullUp: '470', rPullDown: '470' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.bias.current).toBeCloseTo(5e-3, 9)
    expect(r.bias.idleVoltage).toBeCloseTo(0.3, 9)
    expect(r.bias.thresholdMargin).toBeCloseTo(0.1, 9)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(false)
  })

  it('idle gerilim eşiğin altındaysa tehlike notu eklenir', () => {
    const f = { ...RS485_FORM, rPullUp: '10000', rPullDown: '10000' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.bias.thresholdMargin).toBeLessThan(0)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('hedef idle gerilimden E24 standart direnç önerilir', () => {
    const f = { ...RS485_FORM, hasTarget: true, targetIdle: '0.3' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.biasTarget.standard).toBe(470)

    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.targetStandard)).toBe(true)
  })

  it('hedef besleme gerilimine eşit ya da büyükse ulaşılamaz hatası döner', () => {
    const f = { ...RS485_FORM, hasTarget: true, targetIdle: '5' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.biasTarget.error).toBe(BUS_ERR_BIAS_UNREACHABLE)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('unit load verilince maksimum düğüm sayısı hesaplanır', () => {
    const f = { ...RS485_FORM, unitLoad: '1' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.maxNodes).toBe(32)
  })

  it('grafik bias taraması işaretçisiz de üretilir (bias yokken)', () => {
    const f = RS485_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r)
    expect(s).not.toBeNull()
    expect(s.marker).toBeNull()
    expect(s.rows.length).toBeGreaterThan(0)
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz (bias + hedef + unit load)', () => {
    const f = {
      ...RS485_FORM,
      receiverEq: '12', receiverEqu: 'kΩ',
      rPullUp: '470', rPullDown: '470',
      hasTarget: true, targetIdle: '0.3',
      unitLoad: '0.5',
      rs485BusLength: '10', rs485DelayPerMeter: '5', rs485Bitrate: '1', rs485Bitrateu: 'Mbps',
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

  it('CAN’ın bus uzunluğu/gecikme/bit hızı varsayılanları RS-485 hesabına sızmaz; kendi girdisi kullanılır', () => {
    // RS485_FORM, INITIAL_FORM'un CAN alanlarını (busLength 40 m, delayPerMeter 5 ns/m,
    // bitrate 1 Mbps) hâlâ taşır — ekranda RS-485 modunda bu alanlar hiç gösterilmez.
    // RS-485'in kendi rs485BusLength/rs485DelayPerMeter/rs485Bitrate alanları boşken bu
    // CAN değerleri hesaba hiç girmemeli.
    const leaked = compute(RS485_FORM, text.fieldLabels)
    expect(leaked.ok).toBe(true)
    expect(leaked.cableDelay).toBeNull()
    expect(leaked.bitTime).toBeNull()

    // Kullanıcı RS-485'e özgü alanları CAN'dan FARKLI değerlerle doldurur.
    const f = {
      ...RS485_FORM,
      rs485BusLength: '10', rs485BusLengthu: 'm',
      rs485DelayPerMeter: '4', rs485DelayPerMeteru: 'ns/m',
      rs485Bitrate: '2', rs485Bitrateu: 'Mbps',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    // Kendi girdisinden doğru hesaplanır: 10 m × 4 ns/m = 40 ns; 1 / 2 Mbps = 500 ns.
    expect(r.cableDelay).toBeCloseTo(40e-9, 15)
    expect(r.bitTime).toBeCloseTo(500e-9, 15)
    // CAN'ın varsayılanlarından (40 m × 5 ns/m = 200 ns; 1 / 1 Mbps = 1 µs) SIZINTI yok.
    expect(r.cableDelay).not.toBeCloseTo(200e-9, 15)
    expect(r.bitTime).not.toBeCloseTo(1e-6, 15)

    const section = buildReportSection({ f, r, text })
    const cableRow = section.results.find((row) => row.label === text.table.rs485CableDelay)
    const bitRow = section.results.find((row) => row.label === text.table.rs485BitTime)
    expect(`${cableRow.value} ${cableRow.unit}`).toBe(fmtEng(40e-9, 's', 4))
    expect(`${bitRow.value} ${bitRow.unit}`).toBe(fmtEng(500e-9, 's', 4))

    // Rapor girdi satırları RS-485'in kendi 10 m / 4 ns/m / 2 Mbps değerlerini taşır;
    // CAN'ın 40 m / 5 ns/m / 1 Mbps değerleri girdi satırlarında hiç görünmez (o alanlar
    // RS-485 formFields()'ında artık hiç referans edilmiyor).
    const busLengthRow = section.inputs.find((row) => row.label === text.fieldLabels.rs485BusLength)
    const delayRow = section.inputs.find((row) => row.label === text.fieldLabels.rs485DelayPerMeter)
    const bitrateRow = section.inputs.find((row) => row.label === text.fieldLabels.rs485Bitrate)
    expect(busLengthRow.value).toBe('10')
    expect(delayRow.value).toBe('4')
    expect(bitrateRow.value).toBe('2')
  })
})
