import { describe, it, expect } from 'vitest'
import {
  buildDfmSummary, SUMMARY_ERR_MISSING_LABELS, SUMMARY_ERR_MISSING_TOOL,
} from './dfmSummary'
import { STATUS_OK, STATUS_WARNING, STATUS_DANGER, STATUS_UNKNOWN } from './dfmCheck'
import { expectErrorShape } from './errorShape.testkit'

// Etiketler çağıran taraftan, çözülmüş dilde gelir. Testte İngilizce kullanmak
// motorun dil bilmediğini de gösterir: aynı çağrı Türkçe etiketlerle Türkçe
// çıktı verir, motorda hiçbir dal değişmez.
const labels = {
  tool: 'Tool',
  profile: 'Profile',
  decisionProfile: 'Decision profile',
  date: 'Date',
  method: 'Method',
  inputs: 'Inputs',
  results: 'Main results',
  passed: 'Passed checks',
  warnings: 'Warnings',
  failed: 'Failed checks',
  unevaluated: 'Checks not evaluated',
  assumptions: 'Assumptions',
  actual: 'design',
  required: 'limit',
  margin: 'margin',
  source: 'source',
  none: 'none',
  notSelected: 'not selected',
  disclaimer: 'This summary is an approximate engineering evaluation.',
}

const base = {
  labels,
  tool: 'Padstack',
  date: '2026-07-29',
  profile: 'Sample profile',
  inputs: [{ label: 'Finished hole', value: '0.30', unit: 'mm' }],
  results: [{ label: 'Drill', value: '0.40', unit: 'mm' }],
  checks: [
    { label: 'Drill minimum', status: STATUS_OK, actual: '0.40 mm', required: '0.20 mm', margin: '0.20 mm', source: 'fabricator profile' },
    { label: 'Worst-case ring', status: STATUS_DANGER, actual: '0.075 mm', required: '0.10 mm', margin: '-0.025 mm' },
    { label: 'Aspect ratio', status: STATUS_UNKNOWN, reason: 'no limit entered' },
  ],
  assumptions: ['Worst-case tolerance stack.'],
  method: 'Exact geometric relation.',
}

describe('buildDfmSummary', () => {
  const { text } = buildDfmSummary(base)

  it('başlık satırlarını basar', () => {
    expect(text).toContain('Tool: Padstack')
    expect(text).toContain('Profile: Sample profile')
    expect(text).toContain('Date: 2026-07-29')
    expect(text).toContain('Method: Exact geometric relation.')
  })

  it('girdileri ve sonuçları birimleriyle basar', () => {
    expect(text).toContain('- Finished hole: 0.30 mm')
    expect(text).toContain('- Drill: 0.40 mm')
  })

  it('kontrolleri duruma göre ayırır', () => {
    expect(text).toContain('Passed checks:\n- Drill minimum — design 0.40 mm, limit 0.20 mm, margin 0.20 mm, source fabricator profile')
    expect(text).toContain('Failed checks:\n- Worst-case ring — design 0.075 mm, limit 0.10 mm, margin -0.025 mm')
    expect(text).toContain('Checks not evaluated:\n- Aspect ratio — no limit entered')
  })

  it('boş bölümde "yok" yazar, bölümü atlamaz', () => {
    expect(text).toContain('Warnings:\n- none')
  })

  it('kapanış uyarısı her zaman basılır', () => {
    expect(text.trimEnd().endsWith(labels.disclaimer)).toBe(true)
  })

  it('kesin üretilebilirlik ya da uygunluk iddiası taşımaz', () => {
    expect(text.toLowerCase()).not.toContain('guaranteed')
    expect(text.toLowerCase()).not.toContain('compliant')
  })

  it('düz metindir — biçimlendirme işareti taşımaz', () => {
    expect(text).not.toMatch(/[<>|]/)
    expect(text).not.toContain('**')
  })
})

describe('buildDfmSummary — seçimlik alanlar', () => {
  it('profil seçilmemişse açıkça yazar', () => {
    const { text } = buildDfmSummary({ ...base, profile: null })
    expect(text).toContain('Profile: not selected')
  })

  it('karar profili kavramı olmayan araçta o satır hiç basılmaz', () => {
    const { text } = buildDfmSummary(base)
    expect(text).not.toContain('Decision profile')
  })

  it('karar profili kavramı olan araçta boşken de satır basılır', () => {
    const { text } = buildDfmSummary({ ...base, decisionProfile: '' })
    expect(text).toContain('Decision profile: not selected')
  })

  it('tarih verilmezse satır atlanır', () => {
    const { text } = buildDfmSummary({ ...base, date: null })
    expect(text).not.toContain('Date:')
  })

  it('birimsiz değer tek başına basılır', () => {
    const { text } = buildDfmSummary({
      ...base, results: [{ label: 'Trace count', value: '2' }],
    })
    expect(text).toContain('- Trace count: 2')
  })

  it('hiç kontrol yoksa dört bölüm de "yok" der', () => {
    const { text } = buildDfmSummary({ ...base, checks: [] })
    expect(text).toContain('Passed checks:\n- none')
    expect(text).toContain('Failed checks:\n- none')
    expect(text).toContain('Checks not evaluated:\n- none')
  })

  it('alansız kontrol yalnızca adıyla basılır', () => {
    const { text } = buildDfmSummary({
      ...base, checks: [{ label: 'Bare check', status: STATUS_WARNING }],
    })
    expect(text).toContain('Warnings:\n- Bare check\n')
  })
})

describe('buildDfmSummary — geçersiz girdi', () => {
  it('etiket kümesi yoksa hata döner', () => {
    const r = buildDfmSummary({ tool: 'X' })
    expect(r.error).toBe(SUMMARY_ERR_MISSING_LABELS)
    expectErrorShape(r, 'labels')
  })

  it('araç adı yoksa hata döner', () => {
    const r = buildDfmSummary({ labels, tool: '  ' })
    expect(r.error).toBe(SUMMARY_ERR_MISSING_TOOL)
    expectErrorShape(r, 'tool')
  })
})
