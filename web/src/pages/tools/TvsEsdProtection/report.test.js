import { describe, it, expect } from 'vitest'
import { buildReportSection } from './report'
import {
  compute, buildSweep, INITIAL_FORM,
  RDYN_MODE_DATASHEET, SWEEP_RSOURCE, SWEEP_CAPACITANCE,
} from './model'
import { getText } from './text'
import { fmtAmp } from '../../../lib/num'

const text = getText('tr')

// REV2 §14.12 referans testi: V_surge=100V, R_source=2Ω, V_BR=33V, R_dyn=0,
// I_T=0 → I_PP=33.5A, P_peak=1105.5W (kararlar §1 "değiştirilmeyecekler"
// tablosuyla birebir aynı, lib/tvsEsd.test.js'te motor seviyesinde zaten
// doğrulanmış). Bu form INITIAL_FORM'un ta kendisidir.
describe('TvsEsdProtection rapor bölümü — REV2 §14.12 referans örneği', () => {
  const f = { ...INITIAL_FORM }
  const r = compute(f, text.fieldLabels)
  const s = buildSweep(r, SWEEP_RSOURCE)
  const section = buildReportSection({ f, r, s, text })

  it('referans girdilerle geçerli bir sonuç üretir', () => {
    expect(r.ok).toBe(true)
    expect(r.solver.current).toBeCloseTo(33.5, 9)
    expect(r.solver.method).toBe('analytic')
    expect(r.vClamp).toBeCloseTo(33, 9)
    expect(r.peakPower).toBeCloseTo(1105.5, 9)
  })

  it('bölüm oluşur ve başlığı ekran başlığıyla aynıdır', () => {
    expect(section).not.toBeNull()
    expect(section.toolName).toBe(text.title)
  })

  it('ilk sonuç satırı vurgulu ve büyük sonuçla aynı değeri taşır', () => {
    expect(section.results[0].emphasis).toBe(true)
    expect(`${section.results[0].value} ${section.results[0].unit}`).toBe(fmtAmp(r.solver.current))
  })

  it('çözüm yolu satırı "Analitik" gösterir, iterasyon satırı yoktur', () => {
    const methodRow = section.results.find((row) => row.label === text.table.method)
    expect(methodRow.value).toBe(text.methodLabel.analytic)
    expect(section.results.some((row) => row.label === text.table.iterations)).toBe(false)
  })

  it('opsiyonel bloklar (enerji/overshoot/capacitance) girilmediyse satırları yoktur', () => {
    expect(section.results.some((row) => row.label === text.table.energy)).toBe(false)
    expect(section.results.some((row) => row.label === text.table.overshootVL)).toBe(false)
    expect(section.results.some((row) => row.label === text.table.capCutoff)).toBe(false)
  })

  it('formül bloğu boş değildir', () => {
    expect(section.formula.length).toBeGreaterThan(0)
  })

  it('notlar text.commentary(r) ile birebir aynıdır', () => {
    const expected = text.commentary(r)
    expect(section.notes).toEqual(expected)
  })

  it('R_dyn kaynağı girdi satırı eklenir (formFields dışı, elle)', () => {
    expect(section.inputs.some((row) => row.label === text.table.rDynMode)).toBe(true)
  })

  it('grafik verilmezse null, verilirse tablo doludur', () => {
    const noChart = buildReportSection({ f, r, s: null, text })
    expect(noChart.chart).toBeNull()
    expect(section.chart).not.toBeNull()
    expect(section.chart.table.rows.length).toBeGreaterThan(0)
  })
})

describe('TvsEsdProtection rapor bölümü — opsiyonel bloklar (motor referans testiyle çapraz doğrulama)', () => {
  // lib/tvsEsd.test.js'teki "bütün opsiyonel bloklar verildiğinde referans
  // örneğiyle tutarlı sonuç üretir" testiyle AYNI SI değerleri
  // (tp=1e-6 s, lPath=5e-9 H, didt=1e9 A/s, cTvs=300e-12 F), burada ekranın
  // birim dönüşüm katmanından geçirilerek.
  const f = {
    ...INITIAL_FORM,
    hasEnergy: true, tp: '1', tpu: 'µs',
    hasOvershoot: true, lPath: '5', lPathu: 'nH', didt: '1', didtu: 'A/ns',
    hasCapacitance: true, cTvs: '300', cTvsu: 'pF',
  }
  const r = compute(f, text.fieldLabels)
  const section = buildReportSection({ f, r, s: null, text })

  it('motorun referans testiyle aynı sayıları üretir', () => {
    expect(r.ok).toBe(true)
    expect(r.energy).toBeCloseTo(1105.5e-6, 9)
    expect(r.overshoot.vL).toBeCloseTo(5, 9)
    expect(r.overshoot.icPeak).toBeCloseTo(38, 9)
    expect(r.capacitanceCutoffHz).toBeGreaterThan(0)
  })

  it('rapor satırları üç opsiyonel bloğu da içerir', () => {
    expect(section.results.some((row) => row.label === text.table.energy)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.overshootVL)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.icPeak)).toBe(true)
    expect(section.results.some((row) => row.label === text.table.capCutoff)).toBe(true)
  })

  it('dalga şekli girdi satırı yalnızca enerji bloğu etkinken eklenir', () => {
    expect(section.inputs.some((row) => row.label === text.table.waveform)).toBe(true)
  })

  it('overshoot bulgusu yorumlarda yer alır', () => {
    expect(section.notes.some((n) => n.text.includes('overshoot') || n.text.toLowerCase().includes('ic peak'))).toBe(true)
  })
})

describe('TvsEsdProtection rapor bölümü — geçersiz/eksik girdi', () => {
  it('zorunlu alan boşsa bölüm null döner', () => {
    const f = { ...INITIAL_FORM, vSurge: '' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(buildReportSection({ f, r, s: null, text })).toBeNull()
  })
})

// Bu iki senaryo REV2 §14.5.3'ün "R_source+R_series+R_dyn ≤ 0" durumunu
// datasheet iki-nokta modundan (negatif türetilmiş R_dyn) tetikler — motorun
// kendi kaynağından türetilmiş F(I) = I·(R_toplam+R_dyn)/R_toplam − sabit
// bağıntısıyla elle doğrulanmıştır: R_toplam+R_dyn=0 olduğunda F(I) girdiden
// bağımsız SABİTTİR, bu yüzden ya (sabit≥0) I=0'da anında biter ya da
// (sabit<0) hiçbir zaman yakınsamaz.
describe('TvsEsdProtection rapor bölümü — R_dyn datasheet modunda sınır durumlar', () => {
  const degenerateBase = {
    ...INITIAL_FORM,
    rDynMode: RDYN_MODE_DATASHEET,
    vCDatasheet: '13', vCDatasheetu: 'V', // → R_dyn = (13−33)/(10−0) = −2 Ω = −R_toplam
    iPPDatasheet: '10', iPPDatasheetu: 'A',
  }

  it('V_surge < V_BR ise bisection I=0 ile hemen biter (yakınsama sorunu değil)', () => {
    const f = { ...degenerateBase, vSurge: '20' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(true)
    expect(r.solver.method).toBe('bisection')
    expect(r.solver.current).toBe(0)
    expect(r.solver.clamped).toBe(true)
    expect(r.solver.iterations).toBe(0)
    expect(r.solver.expansions).toBe(0)

    const section = buildReportSection({ f, r, s: null, text })
    expect(section).not.toBeNull()
    const methodRow = section.results.find((row) => row.label === text.table.method)
    expect(methodRow.value).toBe(text.methodLabel.bisection)
    const iterRow = section.results.find((row) => row.label === text.table.iterations)
    expect(iterRow.value).toBe('0 / 0')
  })

  it('V_surge > V_BR ise sabit residual sıfırlanamaz ve TVS_SOLVER_NO_CONVERGENCE döner', () => {
    const f = { ...degenerateBase, vSurge: '100' }
    const r = compute(f, text.fieldLabels)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('no-convergence')
    expect(buildReportSection({ f, r, s: null, text })).toBeNull()
    // Ekran bu durumda genel "eksik alan" mesajını DEĞİL, yakınsama-özel
    // mesajını göstermeli.
    expect(text.reasonText(r.reason)).toMatch(/TVS_SOLVER_NO_CONVERGENCE/)
  })
})

describe('TvsEsdProtection — gerilim sıralaması yorumu (REV2 §14.3)', () => {
  // text.commentary yalnızca `r`in şeklini bilir; compute() üzerinden zor
  // kurulacak sınır durumları burada doğrudan kurulmuş `r` ile denenir.
  const okResult = {
    ok: true,
    vBR: 33, vClamp: 40, vNormalMax: 10, vRWM: 20, vProtectedMax: 50,
    solver: { current: 30, method: 'analytic', clamped: false },
    peakPower: 1200, energy: null, overshoot: null, capacitanceCutoffHz: null, rDyn: 1,
  }

  it('sıralama sağlanıyorsa tüm ilgili notlar ok seviyesindedir', () => {
    const notes = text.commentary(okResult)
    expect(notes.length).toBeGreaterThanOrEqual(4)
    expect(notes.every((n) => n.level === 'ok')).toBe(true)
  })

  it('clamp gerilimi korunan IC sınırını aşarsa danger notu üretir', () => {
    const over = { ...okResult, vProtectedMax: 35 } // vClamp(40) > 35
    const notes = text.commentary(over)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)
  })

  it('V_RWM breakdown gerilimine eşit ya da üzerindeyse danger notu üretir', () => {
    const bad = { ...okResult, vRWM: 33 }
    const notes = text.commentary(bad)
    expect(notes.some((n) => n.level === 'danger')).toBe(true)
  })
})

// Regresyon: R_dyn = 0 BELGELENMİŞ normal yoldur (alanın kendi ipucu:
// "Bilinmiyorsa 0 bırakın — clamp gerilimi sabit V_BR kabul edilir") ve
// varsayılan girdinin ta kendisidir. O yolda V_C = V_BR + 0·(I − I_T) = V_BR
// TAM OLARAK çıkar; sıralama kontrolü ikili (`>` / else) yazıldığı için
// eşitlik danger dalına düşüyor ve "Clamp gerilimi (33 V) breakdown
// geriliminin (33 V) ALTINDA" diyordu. Kardeş V_RWM kontrolü doğru deseni
// zaten kurmuştu: eşitliği açıkça anan bir metin + yalnız kesin ihlalde danger.
describe('TvsEsdProtection — V_C = V_BR eşitliği (R_dyn = 0) hata değildir', () => {
  const BELOW = { tr: /ALTINDA/, en: /BELOW/ }
  const CLAMP_NOTE = { tr: /^Clamp gerilimi/, en: /^The clamp voltage/ }

  for (const lang of ['tr', 'en']) {
    it(`${lang}: referans girdide clamp/breakdown notu ok'tur ve "altında" demez`, () => {
      const localText = getText(lang)
      const r = compute({ ...INITIAL_FORM }, localText.fieldLabels)
      expect(r.ok).toBe(true)
      expect(r.rDyn).toBe(0)
      expect(r.vClamp).toBe(r.vBR) // 33 V, tam eşit

      const notes = localText.commentary(r)
      const clampNote = notes.find((n) => CLAMP_NOTE[lang].test(n.text))
      expect(clampNote).toBeTruthy()
      expect(clampNote.level).toBe('ok')
      expect(clampNote.text).not.toMatch(BELOW[lang])
      expect(notes.some((n) => n.level === 'danger')).toBe(false)
    })
  }

  it('V_C gerçekten V_BR altındaysa hâlâ danger üretir (kontrol körleştirilmedi)', () => {
    const r = {
      ok: true,
      vBR: 33, vClamp: 30, vNormalMax: 10, vRWM: 20, vProtectedMax: 50,
      solver: { current: 30, method: 'analytic', clamped: false },
      peakPower: 900, energy: null, overshoot: null, capacitanceCutoffHz: null, rDyn: -1,
    }
    const notes = text.commentary(r)
    const clampNote = notes.find((n) => /^Clamp gerilimi/.test(n.text))
    expect(clampNote.level).toBe('danger')
    expect(clampNote.text).toMatch(/ALTINDA/)
  })
})

// Regresyon: yukarıdaki V_BR düzeltmesinin İKİZİ korunan-IC kontrolünde
// duruyordu. `vClamp < vProtectedMax ? ok : danger` yazıldığı için TAM SINIR
// (V_C = V_IC,maks) "AŞIYOR — IC bu TVS ile korunmuyor" diyordu. Üstelik aynı
// limiti ölçen kardeş kontrol (overshoot, `icPeak > vProtectedMax`) eşitliği
// geçer sayıyordu: aynı sayfa aynı sınır için iki zıt yargı veriyordu.
describe('TvsEsdProtection — V_C = V_IC,maks eşitliği aşmak değildir', () => {
  const EXCEEDS = { tr: /AŞIYOR/, en: /EXCEEDS/ }
  const CLAMP_IC = { tr: /korunan IC sınır/, en: /protected IC limit/ }

  // V_BR = V_C = 33 V (R_dyn = 0 yolu) ve korunan IC sınırı da tam 33 V.
  const sinirda = {
    ok: true,
    vBR: 33, vClamp: 33, vNormalMax: 10, vRWM: 20, vProtectedMax: 33,
    solver: { current: 33.5, method: 'analytic', clamped: false },
    peakPower: 1105.5, energy: null, overshoot: null, capacitanceCutoffHz: null, rDyn: 0,
  }

  for (const lang of ['tr', 'en']) {
    it(`${lang}: tam sınırdaki clamp notu ok'tur ve "aşıyor" demez`, () => {
      const localText = getText(lang)
      const notes = localText.commentary(sinirda)
      const icNote = notes.find((n) => CLAMP_IC[lang].test(n.text))
      expect(icNote).toBeTruthy()
      expect(icNote.level).toBe('ok')
      expect(icNote.text).not.toMatch(EXCEEDS[lang])
      expect(notes.some((n) => n.level === 'danger')).toBe(false)
    })
  }

  it('marjın sıfır olduğunu ayrıca söyler (eşitlik sessizce geçmez)', () => {
    const icNote = text.commentary(sinirda).find((n) => /korunan IC sınır/.test(n.text))
    expect(icNote.text).toMatch(/marj yok/)
  })

  it('V_C gerçekten sınırın üstündeyse hâlâ danger üretir (kontrol körleştirilmedi)', () => {
    const asan = { ...sinirda, vClamp: 34, vProtectedMax: 33 }
    const icNote = text.commentary(asan).find((n) => /korunan IC sınır/.test(n.text))
    expect(icNote.level).toBe('danger')
    expect(icNote.text).toMatch(/AŞIYOR/)
  })

  it('kardeş overshoot kontrolü aynı sınırda aynı yönde davranır', () => {
    // icPeak tam sınırda: bu da danger olmamalı — iki kontrol aynı limiti
    // ölçüyor, eşitlik ikisinde de aynı anlama gelmeli. V_BR de clamp ile
    // birlikte indirilir, yoksa danger'ı üreten şey V_C < V_BR kontrolü olur
    // ve test aslında overshoot'u hiç ölçmez.
    const esit = {
      ...sinirda,
      vBR: 30,
      vClamp: 30,
      overshoot: { vL: 3, icPeak: 33 },
    }
    const notes = text.commentary(esit)
    expect(notes.some((n) => n.level === 'danger')).toBe(false)

    const asan = { ...esit, overshoot: { vL: 4, icPeak: 34 } }
    expect(text.commentary(asan).some((n) => n.level === 'danger')).toBe(true)
  })
})

describe('TvsEsdProtection rapor bölümü — İngilizce', () => {
  it('İngilizce metinle bölüm kurulur ve başlık/yöntem İngilizcedir', () => {
    const textEn = getText('en')
    const f = { ...INITIAL_FORM }
    const r = compute(f, textEn.fieldLabels)
    const section = buildReportSection({ f, r, s: null, text: textEn })
    expect(section.toolName).toBe(textEn.title)
    const methodRow = section.results.find((row) => row.label === textEn.table.method)
    expect(methodRow.value).toBe('Analytic')
  })
})

describe('TvsEsdProtection — sweep parametreleri', () => {
  it('SWEEP_CAPACITANCE bloğu etkin değilse null döner (grafik için geçerli girdi gerekli)', () => {
    const f = { ...INITIAL_FORM }
    const r = compute(f, text.fieldLabels)
    expect(buildSweep(r, SWEEP_CAPACITANCE)).toBeNull()
  })

  it('SWEEP_CAPACITANCE bloğu etkinse veri döner ve işaretçi girilen değerdedir', () => {
    const f = { ...INITIAL_FORM, hasCapacitance: true, cTvs: '300', cTvsu: 'pF' }
    const r = compute(f, text.fieldLabels)
    const s = buildSweep(r, SWEEP_CAPACITANCE)
    expect(s).not.toBeNull()
    expect(s.rows.length).toBeGreaterThan(0)
    expect(s.marker.x).toBeCloseTo(300e-12, 20)
  })
})
