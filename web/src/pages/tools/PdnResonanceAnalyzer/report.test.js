import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import { compute, buildChartData, INITIAL_FORM } from './model'
import { getText } from './text'
import { fmtRes, fmtEng } from '../../../lib/num'

// Ekranla rapor arasındaki kayma riski, aynı `r`/`chartData`/`text`
// kaynağından aynı satırların üretilip üretilmediğini denetleyerek en aza
// indirilir — bkz. VoltageDivider/ReturnPathStitchingVia report.test.js ile
// aynı gerekçe.
const text = getText('tr')

describe('PdnResonanceAnalyzer report.js', () => {
  it('varsayılan girdi motorun kendi referans testiyle (pdnResonance.test.js) eşleşir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    // Varsayılan form (bulk/mlcc, V_rail=1V, ripple=%5, ΔI=5A) motorun kendi
    // testindeki pdnResonanceAnalysis referansıyla birebir aynı girdi.
    expect(r.target.Ztarget).toBeCloseTo(0.05 / 5, 9)
    expect(r.maxImpedance).toBeGreaterThan(0)
    expect(r.worstAntiresonance).not.toBeNull()
    expect(r.groupSrf).toHaveLength(2)

    const chartData = buildChartData(r)
    const section = buildReportSection({
      f, r, chartData, text,
    })
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, deltaI: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({
      f, r, chartData: null, text,
    })).toBeNull()
  })

  it('kondansatör grubu adedi tam sayı değilse count nedeniyle başarısız olur', () => {
    const f = {
      ...INITIAL_FORM,
      capGroups: [{ ...INITIAL_FORM.capGroups[0], count: '1.5' }, INITIAL_FORM.capGroups[1]],
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('count')
  })

  it('ilk sonuç satırı hedef empedans, vurgulu ve fmtRes ile aynı', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, chartData: buildChartData(r), text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.table.target)
    expect(`${section.results[0].value} ${section.results[0].unit}`).toBe(fmtRes(r.target.Ztarget))
  })

  it('VRM işaretli değilse VRM girdi satırları görünmez, işaretliyse görünür', () => {
    const rOff = compute(INITIAL_FORM, text.fieldLabels)
    const sectionOff = buildReportSection({
      f: INITIAL_FORM, r: rOff, chartData: buildChartData(rOff), text,
    })
    expect(sectionOff.inputs.some((row) => row.label === text.fieldLabels.vrmR)).toBe(false)

    const fOn = {
      ...INITIAL_FORM, hasVrm: true, vrmR: '10', vrmRu: 'mΩ', vrmL: '50', vrmLu: 'nH',
    }
    const rOn = compute(fOn, text.fieldLabels)
    expect(rOn.ok).toBe(true)
    const sectionOn = buildReportSection({ f: fOn, r: rOn, chartData: buildChartData(rOn), text })
    expect(sectionOn.inputs.some((row) => row.label === text.fieldLabels.vrmR)).toBe(true)
  })

  it('plane işaretliyse plane girdi satırları eklenir', () => {
    const fOn = {
      ...INITIAL_FORM,
      hasPlane: true,
      planeR: '1',
      planeRu: 'mΩ',
      planeL: '50',
      planeLu: 'pH',
      planeC: '1',
      planeCu: 'nF',
    }
    const r = compute(fOn, text.fieldLabels)
    expect(r.ok).toBe(true)
    const section = buildReportSection({ f: fOn, r, chartData: buildChartData(r), text })
    expect(section.inputs.some((row) => row.label === text.fieldLabels.planeC)).toBe(true)
  })

  it('kondansatör grubu satırları rowList.rowLabel ile numaralanır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, chartData: buildChartData(r), text })
    const label1 = `${text.rowList.rowLabel} 1 — ${text.capCols.Ceffective}`
    const label2 = `${text.rowList.rowLabel} 2 — ${text.capCols.Ceffective}`
    expect(section.inputs.some((row) => row.label === label1)).toBe(true)
    expect(section.inputs.some((row) => row.label === label2)).toBe(true)
  })

  it('tolerans işaretli değilse tolerans girdi/sonuç satırları görünmez', () => {
    const f = INITIAL_FORM // hasTolerance: false
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, chartData: buildChartData(r), text })
    const toleranceLabel = `${text.rowList.rowLabel} 1 — ${text.capCols.tolerancePct}`
    expect(section.inputs.some((row) => row.label === toleranceLabel)).toBe(false)
    expect(section.results.some((row) => row.label === text.table.toleranceMinLabel)).toBe(false)
  })

  it('tolerans işaretliyse min/nominal/maks sonuç satırları eklenir', () => {
    const f = { ...INITIAL_FORM, hasTolerance: true }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.toleranceSweep.error).toBeUndefined()
    const section = buildReportSection({ f, r, chartData: buildChartData(r), text })
    expect(section.results.some((row) => row.label === text.table.toleranceMinLabel)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.toleranceNominalLabel)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.toleranceMaxLabel)).toBe(true)
  })

  it('tolerans yüzdesi nominal kapasitansı sıfırın altına düşürürse sweep kendi hatasında kalır, hesap bloklanmaz', () => {
    const f = {
      ...INITIAL_FORM,
      hasTolerance: true,
      capGroups: [
        { ...INITIAL_FORM.capGroups[0], tolerancePct: '150' },
        INITIAL_FORM.capGroups[1],
      ],
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.toleranceSweep.error).toBeTruthy()
    const section = buildReportSection({ f, r, chartData: buildChartData(r), text })
    expect(section).not.toBeNull()
    expect(section.results.some((row) => row.label === text.table.toleranceMinLabel)).toBe(false)
    const dangerNote = section.notes.find((n) => n.level === 'danger')
    expect(dangerNote).toBeTruthy()
  })

  it('worst-case droop girdileri boşsa droop sonuç satırları eklenmez', () => {
    const f = INITIAL_FORM // deltaT, dropC boş
    const r = compute(f, text.fieldLabels)
    expect(r.droop).toBeNull()
    const section = buildReportSection({ f, r, chartData: buildChartData(r), text })
    expect(section.results.some((row) => row.label === text.table.droopTotal)).toBe(false)
  })

  it('worst-case droop girdileri verilince engineering-rule etiketli, REV2 §10.10 cümlesini birebir taşıyan not eklenir', () => {
    const f = {
      ...INITIAL_FORM,
      deltaT: '1',
      deltaTu: 'µs',
      tRise: '100',
      tRiseu: 'ns',
      dropC: '100',
      dropCu: 'µF',
      dropESReq: '10',
      dropESRequ: 'mΩ',
      dropLeq: '1',
      dropLequ: 'nH',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.droop).not.toBeNull()
    expect(r.droop.error).toBeUndefined()
    expect(r.droop.engineeringRule).toBe('worst-case-time-domain-estimate')
    expect(r.droop.total).toBeCloseTo(0.05 + 0.05 + 0.05, 9)

    const section = buildReportSection({ f, r, chartData: buildChartData(r), text })
    expect(section.results.some((row) => row.label === text.table.droopTotal)).toBe(true)
    const droopNote = section.notes.find((n) => n.text.includes('worst-case-time-domain-estimate'))
    expect(droopNote).toBeTruthy()
    // REV2 §10.10 / kararlar §5'teki istisna cümlesi burada BİREBİR görünmeli.
    expect(droopNote.text).toContain(
      'Bu cebirsel toplam, ana PDN kompleks empedans hesabının yerine kullanılmaz.',
    )
    expect(droopNote.text).toContain('worst-case-time-domain-estimate')
  })

  it('doğrulanmış rezonans/antirezonans satırları peaks+valleys sayısıyla eşleşir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, chartData: buildChartData(r), text })
    const total = r.sweep.peaks.length + r.sweep.valleys.length
    const peakRows = section.results.filter((row) => row.label.startsWith(text.peakTable.kindPeak)
      || row.label.startsWith(text.peakTable.kindValley))
    expect(peakRows).toHaveLength(total)
  })

  it('her kondansatör grubu için bir SRF sonuç satırı eklenir', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, chartData: buildChartData(r), text })
    const srfRows = section.results.filter((row) => row.label.startsWith(text.srfTable.heading))
    expect(srfRows).toHaveLength(r.groupSrf.length)
  })

  it('bulgular notlara aynı seviye ve metinle taşınır (ekrandaki commentary ile aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, chartData: buildChartData(r), text })
    const commentary = text.commentary(r)
    expect(section.notes.length).toBe(commentary.length)
    commentary.forEach((n, i) => {
      expect(section.notes[i].level).toBe(n.level)
      expect(section.notes[i].text).toBe(n.text)
    })
  })

  it('grafik verisi verilince chart.table sütunları seri sayısıyla eşleşir (varsayılanda toplam + 2 grup)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const chartData = buildChartData(r)
    const section = buildReportSection({ f, r, chartData, text })
    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.columns).toHaveLength(4) // frekans + toplam + Bulk + MLCC
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
    // Ekrandaki <ChartDataTable> ile aynı sampleIndices kuralı: son nokta dahil.
    const lastRow = section.chart.table.rows[section.chart.table.rows.length - 1]
    expect(lastRow[0]).toBe(fmtEng(r.sweep.freqs[r.sweep.freqs.length - 1], 'Hz', 4))
  })

  it('chartData verilmezse chart null döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, chartData: null, text })
    expect(section.chart).toBeNull()
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz (tüm dallar açık)', () => {
    const f = {
      ...INITIAL_FORM,
      hasVrm: true,
      vrmR: '10',
      vrmRu: 'mΩ',
      vrmL: '50',
      vrmLu: 'nH',
      vrmC: '100',
      vrmCu: 'µF',
      hasPlane: true,
      planeR: '1',
      planeRu: 'mΩ',
      planeL: '50',
      planeLu: 'pH',
      planeC: '1',
      planeCu: 'nF',
      hasTolerance: true,
      deltaT: '1',
      deltaTu: 'µs',
      dropC: '100',
      dropCu: 'µF',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    const section = buildReportSection({ f, r, chartData: buildChartData(r), text })
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
    const section = buildReportSection({ f, r, chartData: buildChartData(r), text: en })
    expect(section.toolName).toBe(en.title)
  })
})
