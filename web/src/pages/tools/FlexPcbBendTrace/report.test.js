import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM, BEND_DYNAMIC, SWEEP_STRAIN, SWEEP_THICKNESS,
} from './model'
import { getText } from './text'
import { dfmText } from '../../../data/dfmText'
import { fmt } from '../../../lib/num'

// docs/uyelik-ve-rapor-plani.md §8 risk R6: rapor bölümü ekrandaki sonuçla
// aynı `r`/`s`/`text`/`dfm` kaynağından üretilir; bu test her sürümde yapının
// bozulup bozulmadığını (boş etiket, sayıya çevrilemeyen değer, kod sızması)
// denetler — VoltageDivider/ReturnPathStitchingVia report.test.js ile aynı
// gerekçe.
const text = getText('tr')
const dfm = dfmText('tr')

describe('FlexPcbBendTrace report.js', () => {
  it('REV2 §15.13 referans senaryosunda (varsayılan form) dolu bir bölüm döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.vendorMinRadius * 1e3).toBeCloseTo(2.4, 9)
    expect(r.strainPercent).toBeCloseTo(4.17, 2)

    const section = buildReportSection({ f, r, text, dfm })
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
    expect(section.inputs.length).toBeGreaterThan(0)
    expect(section.results.length).toBeGreaterThan(0)
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('hesap başarısızsa null döner (ekranla aynı kural)', () => {
    const f = { ...INITIAL_FORM, tTotal: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, text, dfm })).toBeNull()
  })

  it('ilk sonuç satırı vurgulu ve büyük sonuçtaki strain değeriyle aynı', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, dfm })
    expect(section.results[0].emphasis).toBe(true)
    expect(section.results[0].label).toBe(text.bigResultLabel)
    expect(section.results[0].value).toBe(fmt(r.strainPercent, 4))
    expect(section.results[0].unit).toBe('%')
  })

  it('epsilonAllow girilmezse strainMinRadius satırı görünmez, girilirse eklenir', () => {
    const without = compute(INITIAL_FORM, text.fieldLabels)
    const sectionWithout = buildReportSection({ f: INITIAL_FORM, r: without, text, dfm })
    expect(sectionWithout.results.some((row) => row.label === text.table.strainMinRadius)).toBe(false)

    const f = { ...INITIAL_FORM, epsilonAllow: '5' }
    const r = compute(f, text.fieldLabels)
    expect(r.strainMinRadius).not.toBeNull()
    const section = buildReportSection({ f, r, text, dfm })
    expect(section.results.some((row) => row.label === text.table.strainMinRadius)).toBe(true)
  })

  it('y girilmezse dış/iç yüzey ve uzama satırları görünmez, arc length yine de görünür', () => {
    const f = INITIAL_FORM // y boş, thetaDeg varsayılan '90' dolu
    const r = compute(f, text.fieldLabels)
    expect(r.arcLength).not.toBeNull()
    expect(r.surfaceLengths).toBeNull()
    const section = buildReportSection({ f, r, text, dfm })
    expect(section.results.some((row) => row.label === text.table.arcLength)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.outerLength)).toBe(false)
    expect(section.results.some((row) => row.label === text.table.innerLength)).toBe(false)
    expect(section.results.some((row) => row.label === text.table.elongation)).toBe(false)
  })

  it('y girilirse dış/iç yüzey ve uzama satırları eklenir', () => {
    const f = { ...INITIAL_FORM, y: '0.05' }
    const r = compute(f, text.fieldLabels)
    expect(r.surfaceLengths).not.toBeNull()
    const section = buildReportSection({ f, r, text, dfm })
    expect(section.results.some((row) => row.label === text.table.outerLength)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.innerLength)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.elongation)).toBe(true)
  })

  it('y > R iken iç yüzey negatif çıkar; rapor satırı negatif değeri taşır, notlara danger eklenir', () => {
    const f = { ...INITIAL_FORM, y: '3' } // y=3mm > R=2.4mm
    const r = compute(f, text.fieldLabels)
    expect(r.surfaceLengths.inner).toBeLessThan(0)
    const section = buildReportSection({ f, r, text, dfm })
    const innerRow = section.results.find((row) => row.label === text.table.innerLength)
    expect(innerRow).toBeTruthy()
    expect(Number(innerRow.value)).toBeLessThan(0)
    expect(section.notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('l/w/t verilmezse iz direnci satırları görünmez, verilirse (akımla birlikte) eklenir', () => {
    const without = compute(INITIAL_FORM, text.fieldLabels)
    expect(without.traceResistance).toBeNull()
    const sectionWithout = buildReportSection({ f: INITIAL_FORM, r: without, text, dfm })
    expect(sectionWithout.results.some((row) => row.label === text.table.traceResistanceSingle)).toBe(false)
    expect(sectionWithout.results.some((row) => row.label === text.table.voltageDrop)).toBe(false)

    const f = {
      ...INITIAL_FORM, l: '10', w: '0.3', t: '0.035', n: '2', current: '500', currentu: 'mA',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.traceResistance).not.toBeNull()
    expect(r.voltageDrop).not.toBeNull()
    const section = buildReportSection({ f, r, text, dfm })
    expect(section.results.some((row) => row.label === text.table.traceResistanceSingle)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.traceResistance(r.n))).toBe(true)
    expect(section.results.some((row) => row.label === text.table.voltageDrop)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.powerLoss)).toBe(true)
  })

  it('via/pad/stiffener kontrolleri notlara üçü de ayrı birer cümle olarak eklenir, hiçbiri sessizce düşmez', () => {
    const f = INITIAL_FORM // hepsi boş → üçü de 'unknown'
    const r = compute(f, text.fieldLabels)
    expect(r.clearance.via.status).toBe('unknown')
    expect(r.clearance.pad.status).toBe('unknown')
    expect(r.clearance.stiffener.status).toBe('unknown')

    const section = buildReportSection({ f, r, text, dfm })
    const viaLabel = text.checkLabel('via-bend-clearance')
    const padLabel = text.checkLabel('pad-bend-clearance')
    const stiffenerLabel = text.checkLabel('stiffener-bend-clearance')
    expect(section.notes.some((n) => n.text.includes(viaLabel))).toBe(true)
    expect(section.notes.some((n) => n.text.includes(padLabel))).toBe(true)
    expect(section.notes.some((n) => n.text.includes(stiffenerLabel))).toBe(true)
    expect(section.notes.filter((n) => n.level === 'unknown').length).toBeGreaterThanOrEqual(3)
  })

  it('mesafe eşiği sağlanmayan kontrol notlara danger seviyesiyle girer', () => {
    const f = {
      ...INITIAL_FORM,
      padDistance: '0.2', padDistanceu: 'mm', padMinDistance: '0.5', padMinDistanceu: 'mm',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.clearance.pad.status).toBe('danger')
    const section = buildReportSection({ f, r, text, dfm })
    const padLabel = text.checkLabel('pad-bend-clearance')
    const padNote = section.notes.find((n) => n.text.includes(padLabel))
    expect(padNote.level).toBe('danger')
  })

  it('bulgular notlara aynı seviye ve metinle taşınır (ekrandaki commentary ile aynı)', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, dfm })
    const commentary = text.commentary(r, dfm)
    expect(section.notes.length).toBe(commentary.length)
    commentary.forEach((n, i) => {
      expect(section.notes[i].level).toBe(n.level)
      expect(section.notes[i].text).toBe(n.text)
    })
  })

  it('dinamik bükülmede cycle life notu ve sonuç satırı eklenir', () => {
    const f = {
      ...INITIAL_FORM, bendMode: BEND_DYNAMIC, y: '0.05', cycleA: '1000', cycleB: '2',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.cycleLife).not.toBeNull()
    const section = buildReportSection({ f, r, text, dfm })
    expect(section.results.some((row) => row.label === text.table.cycleLife)).toBe(true)
    expect(section.notes.some((n) => n.text.includes(fmt(r.cycleLife, 4)))).toBe(true)
  })

  it('dinamik bükülmede A/b katsayıları girilmezse cycle life üretilmez ama bilgilendirme notu eklenir', () => {
    const f = { ...INITIAL_FORM, bendMode: BEND_DYNAMIC }
    const r = compute(f, text.fieldLabels)
    expect(r.cycleLife).toBeNull()
    const section = buildReportSection({ f, r, text, dfm })
    expect(section.results.some((row) => row.label === text.table.cycleLife)).toBe(false)
    expect(section.notes.some((n) => n.level === 'unknown')).toBe(true)
  })

  it('paralel iz sayısı (n) alanı İngilizce raporda dahili "adet" anahtarını sızdırmaz', () => {
    const en = getText('en')
    const enDfm = dfmText('en')
    const f = { ...INITIAL_FORM, l: '10', w: '0.3', t: '0.035', n: '4' }
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en, dfm: enDfm })
    const nRow = section.inputs.find((row) => row.label === en.fieldLabels.n)
    expect(nRow).toBeTruthy()
    expect(nRow.unit).toBe(en.countUnit)
    expect(nRow.unit).not.toBe('adet')
  })

  it('hiçbir sonuç/girdi satırı boş etiket ya da undefined değer taşımaz (trace + clearance + tam girdi)', () => {
    const f = {
      ...INITIAL_FORM,
      y: '0.05',
      epsilonAllow: '5',
      l: '10',
      w: '0.3',
      t: '0.035',
      n: '2',
      current: '500',
      currentu: 'mA',
      viaDistance: '1', viaMinDistance: '0.5',
      padDistance: '1', padMinDistance: '0.5',
      stiffenerDistance: '2', stiffenerMinDistance: '1',
      bendMode: BEND_DYNAMIC,
      cycleA: '1000',
      cycleB: '2',
      targetCycles: '1000',
    }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    const section = buildReportSection({ f, r, text, dfm })
    for (const row of [...section.inputs, ...section.results]) {
      expect(row.label, JSON.stringify(row)).toBeTruthy()
      expect(row.value, JSON.stringify(row)).not.toBeUndefined()
      expect(row.value, JSON.stringify(row)).not.toBe('undefined')
    }
    for (const note of section.notes) {
      expect(note.text, JSON.stringify(note)).toBeTruthy()
    }
  })

  it('İngilizce metinle çağrıldığında araç adı da İngilizce', () => {
    const en = getText('en')
    const enDfm = dfmText('en')
    const f = INITIAL_FORM
    const r = compute(f, en.fieldLabels)
    const section = buildReportSection({ f, r, text: en, dfm: enDfm })
    expect(section.toolName).toBe(en.title)
  })

  it('SWEEP_STRAIN taraması verilince chart.table dolu döner, svg alanı boş bırakılır', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_STRAIN)
    const section = buildReportSection({ f, r, s, text, dfm })
    expect(section.chart).not.toBeNull()
    expect(section.chart.svg).toBeNull()
    expect(section.chart.table.columns).toHaveLength(2)
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
  })

  it('SWEEP_THICKNESS: yalnız K_b girilmişse tek sütun, K_b ve ε_allow birlikte girilmişse iki sütun döner', () => {
    const f1 = INITIAL_FORM // Kb='12' dolu, epsilonAllow boş
    const r1 = compute(f1, text.fieldLabels)
    const s1 = buildSweep(r1, SWEEP_THICKNESS)
    const section1 = buildReportSection({ f: f1, r: r1, s: s1, text, dfm })
    expect(section1.chart.table.columns).toHaveLength(2) // x + üretici kuralı

    const f2 = { ...INITIAL_FORM, epsilonAllow: '5' }
    const r2 = compute(f2, text.fieldLabels)
    const s2 = buildSweep(r2, SWEEP_THICKNESS)
    const section2 = buildReportSection({ f: f2, r: r2, s: s2, text, dfm })
    expect(section2.chart.table.columns).toHaveLength(3) // x + üretici + strain kuralı
  })

  it('SWEEP_THICKNESS: ne K_b ne ε_allow girilmemişse grafik null döner', () => {
    const f = { ...INITIAL_FORM, Kb: '' }
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_THICKNESS)
    expect(s).toBeNull()
    const section = buildReportSection({ f, r, s, text, dfm })
    expect(section.chart).toBeNull()
  })

  it('s verilmezse chart null döner', () => {
    const f = INITIAL_FORM
    const r = compute(f, text.fieldLabels)
    const section = buildReportSection({ f, r, text, dfm })
    expect(section.chart).toBeNull()
  })
})

// Regresyon: varsayılan girdi TAM SINIRDADIR — R = 2.4 mm, K_b = 12,
// t_total = 0.2 mm → R_min,vendor = 12 × 0.2 mm = 2.4 mm. İkisi ikili tabanda
// birbirine eşit DEĞİLDİR (2.4·1e-3 = 2.39999999999999978e-3 iken
// 12·(0.2·1e-3) = 2.40000000000000022e-3; fark ≈ 4.3e-19), bu yüzden ham `<`
// karşılaştırması ekranda ikisi de "2.4 mm" görünen bir tasarımı danger'a
// düşürüp "üretici kuralının (2.4 mm) ALTINDA" diye raporluyordu. Kural
// CLAUDE.md → dfmCheck maddesinde zaten yazılı: kayan nokta gürültüsü tam
// sınırdaki bir tasarımı uyarıya düşürmemeli. Rapor bölümü notları
// commentary()'den birebir aldığı için bu hata rapora da geçiyordu.
describe('FlexPcbBendTrace — bend radius tam üretici sınırındayken (R = K_b · t_total)', () => {
  const BELOW = { tr: /ALTINDA/, en: /BELOW/ }

  for (const lang of ['tr', 'en']) {
    it(`${lang}: radius notu danger olmaz ve "sınırın altında" demez`, () => {
      const localText = getText(lang)
      const f = INITIAL_FORM
      const r = compute(f, localText.fieldLabels)
      expect(r.ok).toBe(true)
      // Ekranda ikisi de 2.4 mm olarak görünür; iddia da bu olmalı.
      expect(r.R * 1e3).toBeCloseTo(2.4, 9)
      expect(r.vendorMinRadius * 1e3).toBeCloseTo(2.4, 9)

      const notes = localText.commentary(r, dfmText(lang))
      const radiusNote = notes.find((n) => n.text.includes('strain') && n.text.includes('R='))
      expect(radiusNote).toBeTruthy()
      expect(radiusNote.level).not.toBe('danger')
      expect(radiusNote.text).not.toMatch(BELOW[lang])
    })
  }

  it('gerçekten sınırın altındaki bir R hâlâ danger üretir (düzeltme kontrolü körleştirmedi)', () => {
    const f = { ...INITIAL_FORM, R: '2.0' } // 2.0 mm < 2.4 mm
    const r = compute(f, text.fieldLabels)
    const notes = text.commentary(r, dfm)
    const radiusNote = notes.find((n) => n.text.includes('strain') && n.text.includes('R='))
    expect(radiusNote.level).toBe('danger')
    expect(radiusNote.text).toMatch(/ALTINDA/)
  })

  it('strain kuralı da aynı toleranslı karşılaştırmadan geçer (ε_allow tam sınırda)', () => {
    // R = 2.4 mm, t_total = 0.2 mm → simetrik strain = 0.1/2.4 = %4.1666…
    // ε_allow tam bu değere eşitlendiğinde R_min,strain = R çıkar.
    const base = compute(INITIAL_FORM, text.fieldLabels)
    const f = { ...INITIAL_FORM, epsilonAllow: String(base.strainPercent) }
    const r = compute(f, text.fieldLabels)
    expect(r.strainMinRadius).not.toBeNull()
    const notes = text.commentary(r, dfm)
    const radiusNote = notes.find((n) => n.text.includes('strain') && n.text.includes('R='))
    expect(radiusNote.level).not.toBe('danger')
    expect(radiusNote.text).not.toMatch(/ALTINDA/)
  })
})
