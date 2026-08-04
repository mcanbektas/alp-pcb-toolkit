import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  TOPOLOGY_ASYNC, TOPOLOGY_SYNC, GND_JOIN_SPLIT, GND_JOIN_STAR,
  BUCK_MODE_DCM, BUCK_MODE_CCM, BUCK_ERR_STEP_UP, REASON_RIPPLE_METHOD,
  SWEEP_VIN_DUTY, SWEEP_VIN_RIPPLE, SWEEP_L_PEAK, SWEEP_FSW_LOSS, SWEEP_IOUT_LOSS,
} from './model'
import { getText } from './text'

const text = getText('tr')

function allRows(section) {
  return [...section.inputs, ...section.results]
}

describe('BuckPcbPreDesign report.js', () => {
  it('varsayılan form REV2 §13.16 referans sonuçlarını üretir', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.duty.ideal).toBeCloseTo(0.5, 12)
    expect(r.inductor.required * 1e6).toBeCloseTo(20, 9)
    expect(r.inductor.peak).toBeCloseTo(5.75, 12)
    expect(r.inputCapacitor.rmsCurrent).toBeCloseTo(2.5, 9)
    expect(r.outputCapacitance.min * 1e6).toBeCloseTo(18.75, 9)
    expect(r.inductor.mode).toBe(BUCK_MODE_CCM)

    const section = buildReportSection({ f: INITIAL_FORM, r, text })
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].value).toBe('0.5')
  })

  it('hesap başarısızsa (adım-yükseltme) null döner', () => {
    const f = { ...INITIAL_FORM, vInNom: '12', vOut: '24' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe(BUCK_ERR_STEP_UP)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('İndüktans ve ripple yüzdesi ikisi de boşsa REASON_RIPPLE_METHOD ile null döner', () => {
    const f = { ...INITIAL_FORM, lVal: '', ripplePct: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe(REASON_RIPPLE_METHOD)
    expect(buildReportSection({ f, r, text })).toBeNull()
    expect(text.reasonText(r.reason)).toBeTruthy()
  })

  it('eksik zorunlu alanda da null döner', () => {
    const f = { ...INITIAL_FORM, vInNom: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('DCM senaryosu: I_L,min negatif kalır (kırpılmaz), hesap yine de ok:true', () => {
    const f = { ...INITIAL_FORM, iOutNom: '1', iOutMax: '1', lVal: '10' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.inductor.min).toBeCloseTo(-0.5, 9)
    expect(r.inductor.mode).toBe(BUCK_MODE_DCM)

    const section = buildReportSection({ f, r, text })
    expect(section).not.toBeNull()
    const modeRow = section.results.find((row) => row.label === text.table.mode)
    expect(modeRow.value).toBe(text.modeLabel.dcm)
    const minRow = section.results.find((row) => row.label === text.table.iLMin)
    // Negatif işaret rapora da aynen taşınmalı — sıfıra kırpılmamalı.
    expect(minRow.value.startsWith('-')).toBe(true)

    // DCM durumu "nötr/warn" seviyesinde gösterilir, danger değil.
    const dcmNote = section.notes.find((n) => n.text.includes(text.table.iLMin) || n.level === 'warn')
    expect(section.notes.some((n) => n.level === 'warn')).toBe(true)
    expect(section.notes.some((n) => n.level === 'danger' && n.text.includes('DCM'))).toBe(false)
  })

  it('asenkron topolojide diode bloğu, senkron topolojide LS/dead-time bloğu dolar', () => {
    const asyncF = {
      ...INITIAL_FORM, topology: TOPOLOGY_ASYNC, vF: '0.5', qrr: '50',
    }
    const rAsync = compute(asyncF, text.fieldLabels)
    expect(rAsync.ok).toBe(true)
    expect(rAsync.diode).not.toBeNull()
    expect(rAsync.deadTime).toBeNull()
    const asyncSection = buildReportSection({ f: asyncF, r: rAsync, text })
    expect(asyncSection.results.some((row) => row.label === text.table.diodeCond)).toBe(true)
    expect(asyncSection.results.some((row) => row.label === text.table.deadTimeLoss)).toBe(false)

    const syncF = {
      ...INITIAL_FORM,
      topology: TOPOLOGY_SYNC, rdsOnHs: '0.02', rdsOnLs: '0.015', vFBody: '0.7', tDead: '20',
    }
    const rSync = compute(syncF, text.fieldLabels)
    expect(rSync.ok).toBe(true)
    expect(rSync.diode).toBeNull()
    expect(rSync.deadTime).not.toBeNull()
    const syncSection = buildReportSection({ f: syncF, r: rSync, text })
    expect(syncSection.results.some((row) => row.label === text.table.deadTimeLoss)).toBe(true)
    expect(syncSection.results.some((row) => row.label === text.table.diodeCond)).toBe(false)
    expect(syncSection.schematicCaption).toBe(text.schematic.captionSync)
  })

  it('rating karşılaştırmaları: aşan durumda danger, aşmayan durumda ok notu üretir', () => {
    const overF = { ...INITIAL_FORM, iSat: '5' } // I_L,peak=5.75 > 5
    const rOver = compute(overF, text.fieldLabels)
    const overSection = buildReportSection({ f: overF, r: rOver, text })
    expect(overSection.notes.some((n) => n.level === 'danger')).toBe(true)

    const underF = { ...INITIAL_FORM, iSat: '10' } // I_L,peak=5.75 < 10
    const rUnder = compute(underF, text.fieldLabels)
    const underSection = buildReportSection({ f: underF, r: rUnder, text })
    expect(underSection.notes.some((n) => n.level === 'danger')).toBe(false)
  })

  it('termal blok yalnız hasThermal ile açılır ve T_J,maks aşıldığında danger notu üretir', () => {
    const f = {
      ...INITIAL_FORM,
      hasThermal: true, thetaJaHs: '40', tAmbient: '25', tjMax: '30', rdsOnHs: '0.02',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.thermal.highSide).not.toBeNull()
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.tjHs)).toBe(true)
    expect(section.notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('GND birleşimi split seçilirse danger notu, star/plane seçilirse ok notu üretir', () => {
    const splitF = { ...INITIAL_FORM, gndJoin: GND_JOIN_SPLIT }
    const rSplit = compute(splitF, text.fieldLabels)
    const splitSection = buildReportSection({ f: splitF, r: rSplit, text })
    expect(splitSection.notes.some((n) => n.level === 'danger')).toBe(true)

    const starF = { ...INITIAL_FORM, gndJoin: GND_JOIN_STAR }
    const rStar = compute(starF, text.fieldLabels)
    const starSection = buildReportSection({ f: starF, r: rStar, text })
    expect(starSection.notes.every((n) => n.level !== 'danger')).toBe(true)
  })

  it('yerleşim alanları boşken raporda görünmez, doldurulunca özet satırları eklenir', () => {
    const rEmpty = compute(INITIAL_FORM, text.fieldLabels)
    const emptySection = buildReportSection({ f: INITIAL_FORM, r: rEmpty, text })
    expect(emptySection.results.some((row) => row.label === text.table.hotLoopPerimeter)).toBe(false)

    const f = { ...INITIAL_FORM, hotLoopPerimeter: '5', powerViaCount: '4' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.hotLoopPerimeter)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.powerViaCount)).toBe(true)
  })

  it('beş grafiğin tamamı (girdisi varsa) sweep verisi döner, switching kaybı grafiği t_r/t_f olmadan null döner', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    expect(buildSweep(r, SWEEP_VIN_DUTY)).not.toBeNull()
    expect(buildSweep(r, SWEEP_VIN_RIPPLE)).not.toBeNull()
    expect(buildSweep(r, SWEEP_L_PEAK)).not.toBeNull()
    expect(buildSweep(r, SWEEP_IOUT_LOSS)).not.toBeNull()
    // tr/tf verilmedi → switching bloğu null → fsw-loss grafiği de null
    expect(r.switching).toBeNull()
    expect(buildSweep(r, SWEEP_FSW_LOSS)).toBeNull()

    const f = { ...INITIAL_FORM, tr: '20', tf: '30' }
    const rWithSwitching = compute(f, text.fieldLabels)
    const s = buildSweep(rWithSwitching, SWEEP_FSW_LOSS)
    expect(s).not.toBeNull()
    expect(s.rows.length).toBeGreaterThan(0)

    const section = buildReportSection({ f, r: rWithSwitching, s, text })
    expect(section.chart).not.toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    expect(section.chart.table.columns).toHaveLength(2)
  })

  it('duty/Vin grafiği verim tahmini girildiğinde iki sütunlu (ideal + yaklaşık) rapor tablosu döner', () => {
    const f = { ...INITIAL_FORM, vInMin: '20', vInMax: '28', etaPct: '90' }
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_VIN_DUTY)
    expect(s.pointsApprox).not.toBeNull()
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart.table.columns).toHaveLength(3)
  })

  it('s verilmezse chart null döner', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    const section = buildReportSection({ f: INITIAL_FORM, r, text })
    expect(section.chart).toBeNull()
  })

  it('İngilizce metinle çağrıldığında araç adı ve mod etiketi de İngilizce', () => {
    const en = getText('en')
    const r = compute(INITIAL_FORM, en.fieldLabels)
    const section = buildReportSection({ f: INITIAL_FORM, r, text: en })
    expect(section.toolName).toBe(en.title)
    const modeRow = section.results.find((row) => row.label === en.table.mode)
    expect(modeRow.value).toBe(en.modeLabel.ccm)
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz (senkron + termal + yerleşim + tüm opsiyonel bloklar)', () => {
    const f = {
      ...INITIAL_FORM,
      topology: TOPOLOGY_SYNC,
      etaPct: '92',
      dcr: '5', iSat: '8', iRmsRating: '6',
      cOut: '20', esrCOut: '10', iCinRmsRating: '3',
      rdsOnHs: '0.02', rdsOnLs: '0.015', vFBody: '0.7', tDead: '20',
      tr: '20', tf: '30', vg: '5', qgHs: '20', qgLs: '15',
      hasThermal: true, thetaJaHs: '40', thetaJaLs: '35', thetaJaInductor: '20', tjMax: '125',
      hotLoopPerimeter: '5', switchNodeArea: '10', capToFetDistance: '2',
      gateLoopLength: '3', feedbackDistance: '8', powerViaCount: '6',
      gndJoin: GND_JOIN_SPLIT,
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    const s = buildSweep(r, SWEEP_IOUT_LOSS)
    const section = buildReportSection({ f, r, s, text })

    for (const row of allRows(section)) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
    }
    for (const note of section.notes) {
      expect(note.text, JSON.stringify(note)).toBeTruthy()
      expect(note.level, JSON.stringify(note)).toBeTruthy()
    }
  })

  it('bulgular notlara aynı seviye ve metinle taşınır (ekrandaki commentary ile aynı kaynak)', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    const section = buildReportSection({ f: INITIAL_FORM, r, text })
    const direct = text.commentary(r)
    expect(section.notes).toEqual(direct)
  })
})
