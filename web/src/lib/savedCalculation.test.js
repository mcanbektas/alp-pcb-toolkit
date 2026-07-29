import { describe, it, expect } from 'vitest'
import {
  restoreForm, engineStatus, previewRows, previewMode,
  CALC_ERR_PARSE, CALC_ERR_SHAPE,
  ENGINE_CURRENT, ENGINE_STALE, ENGINE_UNKNOWN,
} from './savedCalculation'

// Geri yükleme sözleşmesi: kayıt aracın MEVCUT şemasına süzülür. Tanınmayan
// alan form state'ine sokulmaz, eksik alan başlangıç değerinde bırakılır.
// Buradaki iddialar araç şeması değiştiğinde eski kaydın ekranı bozmayacağını
// güvenceye alır.

const FORM = {
  I: '1',
  Iu: 'A',
  dT: '10',
  caps: [{ C: '10', Cu: 'µF' }],
}

describe('restoreForm', () => {
  it('tam eşleşen kaydı olduğu gibi yükler', () => {
    const json = JSON.stringify({ I: '3', Iu: 'mA', dT: '20', caps: [{ C: '4.7', Cu: 'nF' }] })
    const r = restoreForm(json, FORM)

    expect(r.ok).toBe(true)
    expect(r.form).toEqual({ I: '3', Iu: 'mA', dT: '20', caps: [{ C: '4.7', Cu: 'nF' }] })
    expect(r.dropped).toEqual([])
    expect(r.added).toEqual([])
  })

  it('başlangıç formunu değiştirmez', () => {
    const before = JSON.parse(JSON.stringify(FORM))
    restoreForm(JSON.stringify({ I: '9' }), FORM)
    expect(FORM).toEqual(before)
  })

  it('şemada olmayan alanı atar ve dropped içinde bildirir', () => {
    const r = restoreForm(JSON.stringify({ I: '3', eskiAlan: '7' }), FORM)

    expect(r.ok).toBe(true)
    expect(r.form.I).toBe('3')
    expect(r.form).not.toHaveProperty('eskiAlan')
    expect(r.dropped).toContain('eskiAlan')
  })

  it('kayıtta bulunmayan alanı başlangıç değerinde bırakır ve added içinde bildirir', () => {
    const r = restoreForm(JSON.stringify({ I: '3' }), FORM)

    expect(r.form.dT).toBe('10')
    expect(r.form.Iu).toBe('A')
    expect(r.added).toEqual(expect.arrayContaining(['Iu', 'dT', 'caps']))
  })

  it('sayı ve boolean gelen alanı dizeye çevirir — form state dize tutar', () => {
    const r = restoreForm(JSON.stringify({ I: 3, dT: true }), FORM)

    expect(r.form.I).toBe('3')
    expect(r.form.dT).toBe('true')
  })

  it('null gelen dize alanını boş alan sayar', () => {
    const r = restoreForm(JSON.stringify({ I: null }), FORM)
    expect(r.form.I).toBe('')
  })

  it('dizi beklenen alanda dizi olmayan değeri düşürür', () => {
    const r = restoreForm(JSON.stringify({ caps: '10' }), FORM)

    expect(r.form.caps).toEqual(FORM.caps)
    expect(r.dropped).toContain('caps')
  })

  it('satır listesinde fazlalık anahtarı atar, eksiği şablondan tamamlar', () => {
    const json = JSON.stringify({ caps: [{ C: '22', fazlalik: 'x' }] })
    const r = restoreForm(json, FORM)

    expect(r.form.caps).toEqual([{ C: '22', Cu: 'µF' }])
  })

  it('tek bozuk satır bütün alanı düşürür — yarısı yüklenmez', () => {
    const json = JSON.stringify({ caps: [{ C: '22', Cu: 'nF' }, 'bozuk'] })
    const r = restoreForm(json, FORM)

    expect(r.form.caps).toEqual(FORM.caps)
    expect(r.dropped).toContain('caps')
  })

  it('satır sayısı üst sınırı aşan diziyi düşürür', () => {
    const rows = Array.from({ length: 501 }, () => ({ C: '1', Cu: 'µF' }))
    const r = restoreForm(JSON.stringify({ caps: rows }), FORM)

    expect(r.form.caps).toEqual(FORM.caps)
    expect(r.dropped).toContain('caps')
  })

  it('ilkel beklenen alanda nesne/dizi değeri düşürür', () => {
    const r = restoreForm(JSON.stringify({ I: { x: 1 }, dT: ['a'] }), FORM)

    expect(r.form.I).toBe('1')
    expect(r.form.dT).toBe('10')
    expect(r.dropped).toEqual(expect.arrayContaining(['I', 'dT']))
  })

  it('bozuk JSON ve boş dize için ayrıştırma hatası döner', () => {
    expect(restoreForm('{bozuk', FORM)).toEqual({ ok: false, error: CALC_ERR_PARSE })
    expect(restoreForm('', FORM)).toEqual({ ok: false, error: CALC_ERR_PARSE })
    expect(restoreForm(null, FORM)).toEqual({ ok: false, error: CALC_ERR_PARSE })
  })

  it('nesne olmayan JSON için şekil hatası döner', () => {
    expect(restoreForm('[1,2]', FORM)).toEqual({ ok: false, error: CALC_ERR_SHAPE })
    expect(restoreForm('"metin"', FORM)).toEqual({ ok: false, error: CALC_ERR_SHAPE })
    expect(restoreForm('null', FORM)).toEqual({ ok: false, error: CALC_ERR_SHAPE })
  })
})

describe('engineStatus', () => {
  it('eski sürümü stale, aynı/yeni sürümü current sayar', () => {
    expect(engineStatus('1', '2')).toBe(ENGINE_STALE)
    expect(engineStatus('2', '2')).toBe(ENGINE_CURRENT)
    expect(engineStatus('3', '2')).toBe(ENGINE_CURRENT)
  })

  it('sayısal olmayan sürümde karar vermez', () => {
    expect(engineStatus('', '1')).toBe(ENGINE_UNKNOWN)
    expect(engineStatus(undefined, '1')).toBe(ENGINE_UNKNOWN)
    expect(engineStatus('1', 'x')).toBe(ENGINE_UNKNOWN)
  })
})

describe('previewRows', () => {
  const section = JSON.stringify({
    toolName: 'Yol Genişliği',
    mode: 'Sentez',
    schematicSvg: '<svg><script>x</script></svg>',
    chart: { svg: '<svg/>', table: null },
    results: [
      { label: 'Direnç', value: '68.32', unit: 'mΩ' },
      { label: 'Önerilen genişlik', value: '0.3605', unit: 'mm', emphasis: true },
      { label: 'Güç kaybı', value: '71.01', unit: 'mW' },
    ],
  })

  it('vurgulanan satırı başa alır ve sınıra kadar döner', () => {
    expect(previewRows(section, 2)).toEqual([
      { label: 'Önerilen genişlik', value: '0.3605', unit: 'mm', emphasis: true },
      { label: 'Direnç', value: '68.32', unit: 'mΩ', emphasis: false },
    ])
  })

  it('SVG alanlarını hiç okumaz — çıktıda işaretleme bulunmaz', () => {
    const out = JSON.stringify(previewRows(section, 10))
    expect(out).not.toContain('<svg')
    expect(out).not.toContain('script')
  })

  it('etiketi ya da değeri olmayan satırı atar', () => {
    const json = JSON.stringify({
      results: [
        { label: 'Var', value: '1' },
        { label: '', value: '2' },
        { label: 'Değersiz', value: null },
        { label: 'Nesne', value: { x: 1 } },
      ],
    })
    expect(previewRows(json, 10)).toEqual([{ label: 'Var', value: '1', unit: null, emphasis: false }])
  })

  it('uzun metni kısaltır', () => {
    const json = JSON.stringify({ results: [{ label: 'x'.repeat(200), value: '1' }] })
    const [row] = previewRows(json, 1)
    expect(row.label).toHaveLength(81) // 80 karakter + kısaltma işareti
    expect(row.label.endsWith('…')).toBe(true)
  })

  it('eksik/bozuk rapor bölümünde boş dizi döner', () => {
    expect(previewRows(null)).toEqual([])
    expect(previewRows('')).toEqual([])
    expect(previewRows('{bozuk')).toEqual([])
    expect(previewRows('{}')).toEqual([])
    expect(previewRows(JSON.stringify({ results: 'yok' }))).toEqual([])
  })
})

describe('previewMode', () => {
  it('mod etiketini döner, yoksa null', () => {
    expect(previewMode(JSON.stringify({ mode: 'Analiz' }))).toBe('Analiz')
    expect(previewMode(JSON.stringify({ mode: null }))).toBe(null)
    expect(previewMode('{bozuk')).toBe(null)
    expect(previewMode(null)).toBe(null)
  })
})
