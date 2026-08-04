import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  CHART_GAIN, CHART_ZOUT, CHART_COMPARE, CHART_TOLERANCE,
} from './model'
import { getText } from './text'
import { fmt, fmtEng } from '../../../lib/num'

// Ekranla rapor arasındaki kayma riski, aynı `r`/`s`/`text` kaynağından aynı
// satırların üretilip üretilmediğini denetleyerek en aza indirilir — bkz.
// VoltageDivider/ReturnPathStitchingVia report.test.js ile aynı gerekçe.
const text = getText('tr')
const fmtHz = (x) => fmtEng(x, 'Hz', 4)

describe('EmcFilterDesigner model.js compute()', () => {
  it('varsayılan LC girdisinde REV2 §12.12 referans sonucuyla eşleşir (f0≈15915.49 Hz, Z0=1Ω)', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.idealPairs).toHaveLength(1)
    expect(r.idealPairs[0].f0).toBeCloseTo(15915.49, 1)
    expect(r.idealPairs[0].z0).toBeCloseTo(1, 6)
  })

  it('converter giriş empedansı emcFilter.test.js referansıyla aynı girdide aynı sonucu verir', () => {
    // vIn=12, pOut=10, efficiency=90% → pIn≈11.1111 W, rInNeg≈12.96 Ω
    // (emcFilter.js'in kendi test dosyasındaki referans senaryoyla birebir).
    const r = compute(INITIAL_FORM, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.zIn.pIn).toBeCloseTo(11.1111, 3)
    expect(r.zIn.rInNeg).toBeCloseTo(12.96, 2)
  })

  it('candidates[0] her zaman sönümsüz (damping:null) taban durumudur', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.candidates[0].damping).toBeNull()
    expect(r.candidates[0].pRD).toBe(0)
    expect(r.candidates).toHaveLength(1 + INITIAL_FORM.candidates.length)
  })

  it('dominated tam olarak meetsAll ile eşleşen null deseni taşır — false ile karıştırılmaz', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    expect(r.ok).toBe(true)
    r.candidates.forEach((c) => {
      if (c.meetsAll) expect(typeof c.dominated).toBe('boolean')
      else expect(c.dominated).toBeNull()
    })
  })

  it('iki özdeş damping adayı birbirini domine edemez (dominans kesin iyileşme ister)', () => {
    const f = {
      ...INITIAL_FORM,
      candidates: [
        { rD: '1', rDu: 'Ω', cD: '0', cDu: 'µF' },
        { rD: '1', rDu: 'Ω', cD: '0', cDu: 'µF' },
      ],
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.candidates[1].gPeakDb).toBeCloseTo(r.candidates[2].gPeakDb, 9)
    expect(r.candidates[1].aTargetDb).toBeCloseTo(r.candidates[2].aTargetDb, 9)
    expect(r.candidates[1].pRD).toBeCloseTo(r.candidates[2].pRD, 9)
    expect(r.candidates[1].dominated).toBe(r.candidates[2].dominated)
    expect(r.candidates[1].dominated).not.toBe(true)
  })

  it('π topolojisinde iki ideal L-C çifti (L,C1) ve (L,C2) ayrı ayrı döner', () => {
    const r = compute({ ...INITIAL_FORM, topology: 'pi' }, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.idealPairs.map((p) => p.key)).toEqual(['c1', 'c2'])
  })

  it('ortak mod topolojisinde CM ve DM empedansı hesaplanır, π/lc alanları yok sayılır', () => {
    const r = compute({ ...INITIAL_FORM, topology: 'cm-choke' }, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.cm).not.toBeNull()
    expect(r.dm).not.toBeNull()
    expect(r.idealPairs).toHaveLength(1)
    expect(r.idealPairs[0].key).toBe('dm')
  })

  it('lc/pi topolojisinde cm/dm alanları null kalır', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.cm).toBeNull()
    expect(r.dm).toBeNull()
  })

  it('zorunlu alan boşsa incomplete nedeniyle başarısız olur', () => {
    const r = compute({ ...INITIAL_FORM, rLoad: '' }, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('incomplete')
  })

  it('hiç damping adayı yoksa incomplete nedeniyle başarısız olur (en az 1 aday şart)', () => {
    const r = compute({ ...INITIAL_FORM, candidates: [] }, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('incomplete')
  })

  it('belirsiz binlik ayırıcı ana alanda ambiguous olarak işaretlenir', () => {
    const r = compute({ ...INITIAL_FORM, rLoad: '1.000' }, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.ambiguous).toBeDefined()
    expect(r.ambiguous.length).toBeGreaterThan(0)
  })

  it('belirsiz binlik ayırıcı aday satırında da ambiguous listesine eklenir', () => {
    const f = { ...INITIAL_FORM, candidates: [{ rD: '1.000', rDu: 'Ω', cD: '0', cDu: 'µF' }] }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.ambiguous.length).toBeGreaterThan(0)
  })
})

describe('EmcFilterDesigner model.js buildSweep()', () => {
  it('dört grafik parametresinin hepsi frekans dizisi ve seri üretir', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    for (const param of [CHART_GAIN, CHART_ZOUT, CHART_COMPARE, CHART_TOLERANCE]) {
      const s = buildSweep(r, param)
      expect(s, param).not.toBeNull()
      expect(s.freqs.length).toBeGreaterThan(1)
      // §17 sözleşmesi: sweep'in ilk ve son noktası tam olarak fMin/fMax'tır.
      expect(s.freqs[0]).toBeCloseTo(r.shared.fMin, 6)
      expect(s.freqs[s.freqs.length - 1]).toBeCloseTo(r.shared.fMax, 6)
    }
  })

  it('CHART_COMPARE her damping adayı (sönümsüz dahil) için ayrı bir seri döner', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    const s = buildSweep(r, CHART_COMPARE)
    expect(s.rows).toHaveLength(r.candidates.length)
    expect(s.rows[0].damping).toBeNull()
  })

  it('hesap başarısızsa buildSweep null döner', () => {
    const r = compute({ ...INITIAL_FORM, rLoad: '' }, text.fieldLabels)
    expect(buildSweep(r, CHART_GAIN)).toBeNull()
  })
})

describe('EmcFilterDesigner report.js', () => {
  it('geçerli girdide dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.mode).toBeNull()
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, rLoad: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu ve ideal f0 değeriyle (fmtHz) aynı', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.table.idealPair[r.idealPairs[0].key])
    expect(`${section.results[0].value} ${section.results[0].unit}`).toBe(fmtHz(r.idealPairs[0].f0))
  })

  it('her damping adayı için G_peak/A_target/P_R_D/K_Z/uygunluk satırları vardır (tek skor sütunu yok)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const labels = section.results.map((row) => row.label)
    r.candidates.forEach((c, i) => {
      const name = i === 0 ? text.candidates.undamped : text.candidates.candidateLabel(i)
      expect(labels).toContain(`${name} — G_peak,dB`)
      expect(labels).toContain(`${name} — A_target,dB`)
      expect(labels).toContain(`${name} — P_R_D`)
      expect(labels).toContain(`${name} — K_Z`)
    })
    // Kararlar §3.3: hiçbir satır adayları tek bir sayıyla sıralamaz — ne bir
    // "skor" ne de "sıra" etiketi taşınır.
    expect(labels.some((l) => /skor|score|sıra|rank/i.test(l))).toBe(false)
  })

  it('topoloji ve damping adayları girdi satırları arasında listelenir', () => {
    // inputRows() formFields(f, text.fieldLabels) kullanır — rapor satırları
    // NumberField'ın UZUN ekran etiketini değil (text.fields.X.label), hata
    // mesajlarıyla aynı KISA `text.fieldLabels` sözlüğünü taşır (ReturnPath-
    // StitchingVia'nın report.js'iyle aynı kural).
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fields.topology.label)
    expect(labels.some((l) => l.includes(text.fieldLabels.rD))).toBe(true)
  })

  it('ortak mod topolojisinde girdi satırlarında CM/DM alanları görünür, π/lc alanları görünmez', () => {
    const f = { ...INITIAL_FORM, topology: 'cm-choke' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.lLeak)
    expect(labels).toContain(text.fieldLabels.lCm)
    expect(labels).not.toContain(text.fieldLabels.C2)
  })

  it('π topolojisinde C2/ESR2/ESL2 girdi satırları görünür', () => {
    const f = { ...INITIAL_FORM, topology: 'pi' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const labels = section.inputs.map((i) => i.label)
    expect(labels).toContain(text.fieldLabels.C2)
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

  it.each([CHART_GAIN, CHART_ZOUT, CHART_COMPARE, CHART_TOLERANCE])(
    '%s grafiği için chart.table dolu döner ve son nokta fMax ile eşleşir',
    (param) => {
      const f = INITIAL_FORM
      const r = compute(f, text.fieldLabels)
      const s = buildSweep(r, param)
      const section = buildReportSection({ f, r, s, text })
      expect(section.chart).not.toBeNull()
      expect(section.chart.svg).toBeNull()
      expect(section.chart.table.rows.length).toBeGreaterThan(0)
      const lastRow = section.chart.table.rows[section.chart.table.rows.length - 1]
      // §17 sözleşmesi: sweep'in son noktası tam olarak fMax'tır (ChartDataTable
      // ile aynı `sampleIndices`, son nokta her zaman dahil edilir).
      expect(lastRow[0]).toBe(fmt(r.shared.fMax, 3))
      expect(section.chart.table.columns.length).toBe(lastRow.length)
    },
  )

  it('CHART_COMPARE tablosu sönümsüz + her aday için bir sütun döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, CHART_COMPARE)
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart.table.columns).toHaveLength(1 + r.candidates.length)
  })

  it('s verilmezse chart null döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.chart).toBeNull()
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
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
    expect(section.results.some((row) => row.label.includes(en.candidates.undamped))).toBe(true)
  })
})
