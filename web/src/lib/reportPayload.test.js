import { describe, it, expect } from 'vitest'
import {
  buildReportPayload, REPORT_SCHEMA_VERSION,
  REPORT_ERR_MISSING_PREPARED_BY, REPORT_ERR_NO_SECTIONS,
  splitFormatted,
} from './reportPayload'

const SECTION = {
  toolName: 'Trace Genişliği',
  mode: 'Sentez',
  inputs: [{ label: 'Akım', value: '1', unit: 'A' }],
  formula: ['I = k · ΔT^0.44 · A^0.725'],
  results: [{ label: 'Önerilen genişlik', value: '0.62', unit: 'mm', emphasis: true }],
  notes: [{ level: 'warn', text: 'Klasik ampirik yöntem.' }],
  schematicSvg: '<svg></svg>',
  schematicCaption: 'Yol kesiti',
  chart: { title: 'Grafik', svg: '<svg></svg>', table: { columns: ['x'], rows: [['1']] } },
}

describe('buildReportPayload', () => {
  it('hazırlayan boşsa kod döner, cümle değil', () => {
    const res = buildReportPayload({ preparedBy: '', sections: [SECTION] })
    expect(res).toEqual({ ok: false, error: REPORT_ERR_MISSING_PREPARED_BY })
  })

  it('hazırlayan yalnızca boşluksa da reddedilir', () => {
    const res = buildReportPayload({ preparedBy: '   ', sections: [SECTION] })
    expect(res.ok).toBe(false)
    expect(res.error).toBe(REPORT_ERR_MISSING_PREPARED_BY)
  })

  it('bölüm yoksa kod döner', () => {
    const res = buildReportPayload({ preparedBy: 'Can', sections: [] })
    expect(res).toEqual({ ok: false, error: REPORT_ERR_NO_SECTIONS })
  })

  it('geçerli girdide şema sürümü ve normalize edilmiş bölümlerle yük kurar', () => {
    const res = buildReportPayload({
      title: 'DONANIM RAPORU', preparedBy: '  Can Bektaş  ', company: '  ALP  ',
      date: '29.07.2026', sections: [SECTION],
    })
    expect(res.ok).toBe(true)
    expect(res.payload.schemaVersion).toBe(REPORT_SCHEMA_VERSION)
    expect(res.payload.preparedBy).toBe('Can Bektaş')
    expect(res.payload.company).toBe('ALP')
    expect(res.payload.sections).toHaveLength(1)
    expect(res.payload.sections[0].results[0]).toEqual({
      label: 'Önerilen genişlik', value: '0.62', unit: 'mm', emphasis: true,
    })
  })

  it('firma verilmezse null olur, boş dize olarak sızmaz', () => {
    const res = buildReportPayload({ preparedBy: 'Can', sections: [SECTION] })
    expect(res.payload.company).toBeNull()
  })

  it('eksik isteğe bağlı alanlar için sessizce güvenli varsayılana düşer', () => {
    const bare = { toolName: 'Uzunluk Dönüştürücü', inputs: [], results: [{ label: 'x', value: '1' }] }
    const res = buildReportPayload({ preparedBy: 'Can', sections: [bare] })
    const s = res.payload.sections[0]
    expect(s.mode).toBeNull()
    expect(s.formula).toEqual([])
    expect(s.notes).toEqual([])
    expect(s.schematicSvg).toBeNull()
    expect(s.chart).toBeNull()
    expect(s.results[0]).toEqual({ label: 'x', value: '1', unit: null, emphasis: false })
  })
})

describe('splitFormatted', () => {
  it('num.js biçimli dizeyi değer ve birime ayırır', () => {
    expect(splitFormatted('39.7 mΩ')).toEqual({ value: '39.7', unit: 'mΩ' })
    expect(splitFormatted('1.2 kΩ')).toEqual({ value: '1.2', unit: 'kΩ' })
    expect(splitFormatted('0.62 mm')).toEqual({ value: '0.62', unit: 'mm' })
  })

  it('sonsuz olmayan değerde (uzun tire) birim vermez', () => {
    expect(splitFormatted('—')).toEqual({ value: '—', unit: null })
  })

  it('birimsiz sayıda tamamı değere gider', () => {
    expect(splitFormatted('42')).toEqual({ value: '42', unit: null })
  })
})
