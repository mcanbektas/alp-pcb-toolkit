// Loglar ekranının metin sözlüğü. Bileşen testi DEĞİL: sözlük saf bir
// fonksiyondur (../audit/text.test.js ile aynı desen, gerekçe orada).

import { describe, expect, it } from 'vitest'
import { getText } from './text'

const LANGS = ['tr', 'en']

const PLAIN = [
  'title', 'intro',
  'loginRequired', 'loginLink', 'forbidden', 'homeLink',
  'searchLabel', 'searchHint',
  'levelFilterLabel',
  'refresh', 'autoRefreshLabel',
  'loading', 'empty',
  'detailView', 'detailTitle', 'detailClose',
  'propertiesTitle', 'exceptionTitle',
  'copyDetail', 'copyDetailDone', 'copyFailed', 'copyVisible', 'copyVisibleDone',
]

const COLUMNS = ['time', 'level', 'source', 'message', 'detail']

describe.each(LANGS)('loglar metni (%s)', (lang) => {
  const t = getText(lang)

  it('düz metin yollarının hepsi dolu', () => {
    for (const key of PLAIN) {
      expect(typeof t[key], `${key} bir dize olmalı`).toBe('string')
      expect(t[key].length, `${key} boş`).toBeGreaterThan(0)
    }
  })

  it('sütun başlıklarının hepsi dolu', () => {
    for (const key of COLUMNS) {
      expect(typeof t.columns[key], `columns.${key} bir dize olmalı`).toBe('string')
      expect(t.columns[key].length).toBeGreaterThan(0)
    }
  })

  it('levelGroups (hepsi) + uyarı + hata seçeneklerini taşır, etiketler dolu', () => {
    const flat = t.levelGroups.flatMap((g) => g.options)
    const values = flat.map((o) => o.value)
    expect(values).toEqual(['', 'warning', 'error'])
    for (const opt of flat) {
      expect(typeof opt.label).toBe('string')
      expect(opt.label.length).toBeGreaterThan(0)
    }
  })

  // Sunucudan (LogBufferSink) HAM gelen seviye adı — sabit bir kod listesi
  // yok, bilinmeyen bir değer de sessizce "iyi" görünmemeli (unknown/nötr).
  it('levelMarkClass bilinen seviyeleri doğru sınıfa düşürür, bilinmeyeni unknown yapar', () => {
    expect(t.levelMarkClass('Error')).toBe('danger')
    expect(t.levelMarkClass('Fatal')).toBe('danger')
    expect(t.levelMarkClass('Warning')).toBe('warning')
    expect(t.levelMarkClass('Information')).toBe('unknown')
    expect(t.levelMarkClass('BeklenmedikSeviye')).toBe('unknown')
  })

  it('sourceShort son bileşeni verir, tire için nokta yoksa oldugu gibi doner', () => {
    expect(t.sourceShort('Microsoft.AspNetCore.HttpsPolicy.HttpsRedirectionMiddleware'))
      .toBe('HttpsRedirectionMiddleware')
    expect(t.sourceShort('Alp.Api.Auth.AuditLog')).toBe('AuditLog')
    expect(t.sourceShort('TekKelime')).toBe('TekKelime')
    expect(t.sourceShort(null)).toBe('—')
  })

  it('detailViewAria ve capacityNote dolu cümle üretir', () => {
    expect(t.detailViewAria('mesaj').length).toBeGreaterThan(0)
    expect(t.capacityNote(500)).toContain('500')
  })

  it('formatDateSeconds geçerli ISO tarihi biçimler, geçersizde tire döner', () => {
    expect(t.formatDateSeconds('2026-01-01T00:00:00Z')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(t.formatDateSeconds(null)).toBe('—')
    expect(t.formatDateSeconds('geçersiz')).toBe('—')
  })

  it('errorText bilinen/bilinmeyen hata kodlarında dolu cümle döner, ok=true iken null', () => {
    expect(t.errorText({ ok: true })).toBeNull()
    expect(t.errorText({ ok: false, error: 'network' }).length).toBeGreaterThan(0)
    expect(t.errorText({ ok: false, error: 'FORBIDDEN' }).length).toBeGreaterThan(0)
    expect(t.errorText({ ok: false, error: 'SERVER_ERROR' }).length).toBeGreaterThan(0)
  })

  // F2'den beri istisna ARTIK recordRows'ta değil — kendi bölümü var
  // (index.jsx `detailRow.exception` doğrudan okur), tek `.result-table`
  // uzun bir yığın iziyle okunmaz hâle gelmesin diye.
  it('recordRows tüm alanları taşır, exception hiç dahil değildir', () => {
    const row = t.recordRows({
      occurredAt: '2026-01-01T00:00:00Z', level: 'Error', message: 'mesaj',
      sourceContext: 'Kaynak', requestPath: '/api/x', userId: 'u1',
      requestId: '0123456789abcdef0123456789abcdef', exception: 'boom',
    })
    expect(row.map((r) => r.key))
      .toEqual(['time', 'level', 'source', 'path', 'user', 'requestId', 'message'])
    const requestIdRow = row.find((r) => r.key === 'requestId')
    expect(requestIdRow?.value).toBe('0123456789abcdef0123456789abcdef')
  })

  it('recordRows boş alanlarda tire döner', () => {
    const row = t.recordRows({
      occurredAt: '2026-01-01T00:00:00Z', level: 'Information', message: 'mesaj',
      sourceContext: null, requestPath: null, userId: null, requestId: null, exception: null,
    })
    expect(row.find((r) => r.key === 'source')?.value).toBe('—')
    expect(row.find((r) => r.key === 'requestId')?.value).toBe('—')
  })

  it('propertyRows bilinen adları çevirir, bilinmeyeni ham bırakır', () => {
    const rows = t.propertyRows({
      properties: { StatusCode: '500', Elapsed: '830.5', GaripOzellik: 'deger' },
    })
    expect(rows).toHaveLength(3)
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
    expect(byKey.StatusCode.value).toBe('500')
    expect(byKey.StatusCode.label).not.toBe('StatusCode') // çevrildi
    expect(byKey.GaripOzellik.label).toBe('GaripOzellik') // ham kaldı
  })

  it('propertyRows properties yoksa/boşsa boş dizi döner', () => {
    expect(t.propertyRows({})).toEqual([])
    expect(t.propertyRows({ properties: {} })).toEqual([])
  })

  it('truncatedPropertyNote sayıyı içerir', () => {
    expect(t.truncatedPropertyNote(6)).toContain('6')
  })

  // Yapısal iddialar (yalnız `toContain` değil): satır sayısı, çift boş
  // satır yok, sondaki satır sonu yok, bölüm sınırları tam yerinde —
  // review'da "tek satıra mıhlanmış metin de toContain'i geçer" diye
  // yakalandı.
  it('copyableText üst blok + özellikler + istisnayı tek metinde birleştirir', () => {
    const withAll = t.copyableText({
      occurredAt: '2026-01-01T00:00:00Z', level: 'Error', message: 'patladi',
      sourceContext: 'Kaynak', requestPath: '/api/x', userId: 'u1',
      requestId: '0123456789abcdef0123456789abcdef',
      properties: { StatusCode: '500' },
      exception: 'System.Exception: boom\n   at Foo()',
    })
    const [statusRow] = t.propertyRows({ properties: { StatusCode: '500' } })
    const lines = withAll.split('\n')
    // Üst blok 7 satır (indeks 0-6: zaman/seviye/kaynak/yol/kullanıcı/
    // istekKimliği/mesaj), sonra boş ayraç.
    expect(lines[7]).toBe('')
    expect(lines[8]).toBe(`${t.propertiesTitle}:`)
    expect(lines[9]).toBe(`${statusRow.label}: ${statusRow.value}`)
    expect(lines[10]).toBe('') // özelliklerden sonra boş ayraç
    expect(lines[11]).toBe(`${t.exceptionTitle}:`)
    expect(lines.slice(12).join('\n')).toBe('System.Exception: boom\n   at Foo()')

    // Kart kırpma notunu gösteriyorsa kopya da göstermeli — "sessiz kırpma
    // YOK" sözü panele özel değil (F3'ün kendi review bulgusu).
    const truncated = t.copyableText({
      occurredAt: '2026-01-01T00:00:00Z', level: 'Information', message: 'mesaj',
      sourceContext: null, requestPath: null, userId: null, requestId: null,
      properties: { A: '1' }, truncatedPropertyCount: 3, exception: null,
    })
    expect(truncated).toContain(t.truncatedPropertyNote(3))

    // Özellik/istisna yoksa o bölümler hiç eklenmez — boş başlıklı bölüm yok,
    // çift boş satır yok, sondaki satır sonu yok.
    const bare = t.copyableText({
      occurredAt: '2026-01-01T00:00:00Z', level: 'Information', message: 'mesaj',
      sourceContext: null, requestPath: null, userId: null, requestId: null,
      properties: {}, exception: null,
    })
    expect(bare.split('\n')).toHaveLength(7)
    expect(bare).not.toMatch(/\n\n/)
    expect(bare.endsWith('\n')).toBe(false)
    expect(bare).not.toContain(`${t.propertiesTitle}:`)
    expect(bare).not.toContain(`${t.exceptionTitle}:`)
  })

  it('rowsToTsv satır başına 4 sekme-ayrılı alan üretir, sekme/satır sonunu boşluğa indirger', () => {
    const tsv = t.rowsToTsv([
      { occurredAt: '2026-01-01T00:00:00Z', level: 'Information', sourceContext: 'Kaynak.Tam', message: 'ilk satır' },
      { occurredAt: '2026-01-01T00:00:05Z', level: 'Error', sourceContext: null, message: 'sekme\tiçeren\nmesaj' },
    ])
    const lines = tsv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0].split('\t')).toEqual(['2026-01-01T00:00:00Z', 'Information', 'Kaynak.Tam', 'ilk satır'])
    // Sanitize gerçekten DEĞER'i düzeltiyor mu (yalnız sütun sayısı değil) —
    // sekme/satır sonu SİLİNMİYOR, boşluğa dönüyor; silinseydi sütun sayısı
    // yine 4 kalırdı ama değer "sekmeiçerenmesaj" olurdu, bu da bir regresyon.
    const secondLine = lines[1].split('\t')
    expect(secondLine).toHaveLength(4)
    expect(secondLine[2]).toBe('') // null sourceContext → boş hücre (tire DEĞİL — tablo hücresi değil)
    expect(secondLine[3]).toBe('sekme içeren mesaj')
  })

  it('rowsToTsv boş listede boş dize döner', () => {
    expect(t.rowsToTsv([])).toBe('')
  })
})
