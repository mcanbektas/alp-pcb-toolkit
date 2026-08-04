import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  SWEEP_STUB, SWEEP_REMOVED,
  VS_ERR_RESIDUAL_NEGATIVE, VS_ERR_EXCEEDS_BOARD, VS_ERR_TARGET_UNREACHABLE,
} from './model'
import { getText } from './text'
import { fmt, fmtEng } from '../../../lib/num'

// Ekranla rapor arasındaki kayma riski, aynı `r`/`s`/`text` kaynağından aynı
// satırların üretilip üretilmediğini denetleyerek en aza indirilir — bkz.
// ReturnPathStitchingVia/report.test.js ile aynı gerekçe.
const text = getText('tr')

describe('ViaStubBackdrill report.js', () => {
  it('varsayılan girdide REV2 §5.11 referans sonucuyla eşleşir (5 mm stub → 7.495 GHz)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.stub * 1e3).toBeCloseTo(5, 6)
    expect(r.resonance / 1e9).toBeCloseTo(7.495, 3)

    const section = buildReportSection({ f, r, text })
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('stub yarıya inince rezonans REV2 §5.11 ikinci referansına ulaşır (2.5 mm → 14.99 GHz)', () => {
    const f = { ...INITIAL_FORM, used: '3.1' } // 5.6 − 3.1 = 2.5 mm
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.stub * 1e3).toBeCloseTo(2.5, 6)
    expect(r.resonance / 1e9).toBeCloseTo(14.99, 2)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, epsR: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text })).toBeNull()
  })

  it('backdrill stub’dan büyükse residual negatif hatası döner', () => {
    // Kart kalınlığı kontrolü devre dışı (boş) — burada yalnız stub/residual
    // ilişkisi izole edilir, EXCEEDS_BOARD ile karışmaz.
    const f = {
      ...INITIAL_FORM, hasBackdrill: true, removed: '6', boardThickness: '',
    } // stub 5 mm
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe(VS_ERR_RESIDUAL_NEGATIVE)
  })

  it('kaldırılan derinlik kart kalınlığını aşarsa hata döner', () => {
    const f = {
      ...INITIAL_FORM, hasBackdrill: true, removed: '2', boardThickness: '1',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe(VS_ERR_EXCEEDS_BOARD)
  })

  it('backdrill geçerliyse residual bloğu ve rezonans yükselmesi hesaplanır', () => {
    const f = { ...INITIAL_FORM, hasBackdrill: true, removed: '4' } // residual nominal 1 mm
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.residual.nominal * 1e3).toBeCloseTo(1, 6)
    expect(r.residual.resonanceNominal).toBeGreaterThan(r.resonance)
    expect(r.residual.resonanceGain).toBeCloseTo(5, 6) // 5 mm → 1 mm

    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.resonanceGain)).toBe(true)
  })

  it('hedef rezonans ulaşılamazsa ok kalır ama backdrillTarget hata taşır', () => {
    const f = { ...INITIAL_FORM, hasTarget: true, fTarget: '300' } // GHz — çok agresif hedef
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.backdrillTarget.error).toBe(VS_ERR_TARGET_UNREACHABLE)

    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)

    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.targetNominal)).toBe(false)
  })

  it('hedef ulaşılabilirse nominal hedef ve gereken kaldırma raporlanır', () => {
    const f = { ...INITIAL_FORM, hasTarget: true, fTarget: '10' } // GHz
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.backdrillTarget.error).toBeUndefined()
    expect(r.backdrillTarget.nominalTarget).toBeGreaterThan(0)

    const section = buildReportSection({ f, r, text })
    expect(section.results.some((row) => row.label === text.table.targetNominal)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.targetRemoval)).toBe(true)
  })

  it('ilk sonuç satırı vurgulu ve büyük sonuçtaki değerle aynı', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigResultLabel)
    expect(`${section.results[0].value} ${section.results[0].unit}`).toBe(fmtEng(r.resonance, 'Hz', 4))
  })

  it('varsayılan girdide yalnızca temel bilgi ve zorunlu stub-uyarısı notu vardır', () => {
    const r = compute(INITIAL_FORM, text.fieldLabels)
    const notes = text.commentary(r)
    expect(notes).toHaveLength(2)
    expect(notes.filter((n) => n.level === 'danger')).toHaveLength(0)
  })

  it('analiz frekansı rezonansı aşarsa tehlike seviyeli not eklenir', () => {
    // Rezonans ≈ 7.495 GHz; 10 GHz analiz frekansı bunu aşar.
    const f = { ...INITIAL_FORM, fMax: '10', fMaxu: 'GHz' }
    const r = compute(f, text.fieldLabels)
    const notes = text.commentary(r)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('bulgular notlara aynı seviye ve metinle taşınır (ekrandaki commentary ile aynı)', () => {
    const f = { ...INITIAL_FORM, hasBackdrill: true, removed: '4' }
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text })
    const commentary = text.commentary(r)
    expect(section.notes.length).toBe(commentary.length)
    commentary.forEach((n, i) => {
      expect(section.notes[i].level).toBe(n.level)
      expect(section.notes[i].text).toBe(n.text)
    })
  })

  it('stub taraması log-log iki sütun döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_STUB)
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart).not.toBeNull()
    expect(section.chart.table.columns).toHaveLength(2)
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
  })

  it('backdrill uygulanmadan removed taraması null döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_REMOVED)
    expect(s).toBeNull()
    const section = buildReportSection({ f, r, s, text })
    expect(section.chart).toBeNull()
  })

  it('backdrill uygulanınca removed taraması veri döner ve son nokta örneklemede yer alır', () => {
    const f = { ...INITIAL_FORM, hasBackdrill: true, removed: '4' }
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_REMOVED)
    expect(s).not.toBeNull()
    const section = buildReportSection({ f, r, s, text })
    const lastRow = s.rows[s.rows.length - 1]
    const lastExported = section.chart.table.rows[section.chart.table.rows.length - 1]
    expect(lastExported).toEqual([fmt(lastRow.x, 3), fmt(lastRow.y, 4)])
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz (backdrill + hedef, tam girdi)', () => {
    const f = {
      ...INITIAL_FORM,
      tr: '100', tru: 'ps',
      fMax: '500', fMaxu: 'MHz',
      hasBackdrill: true, removed: '4',
      hasTarget: true, fTarget: '10',
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
