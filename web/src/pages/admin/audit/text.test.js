// Günlük ekranının metin sözlüğü. Bileşen testi DEĞİL: sözlük saf bir
// fonksiyondur (../text.test.js ile aynı desen, gerekçe orada).

import { describe, expect, it } from 'vitest'
import { getText } from './text'

const LANGS = ['tr', 'en']

const PLAIN = [
  'title', 'intro',
  'loginRequired', 'loginLink', 'forbidden', 'homeLink',
  'searchLabel', 'searchHint',
  'eventFilterLabel',
  'loading', 'empty',
  'detailView', 'detailTitle', 'detailClose',
  'pagePrev', 'pageNext',
]

const COLUMNS = ['time', 'event', 'actor', 'target', 'detail']

// Alp.Api/Auth/AuditLog.cs → AuditEventCodes ile birebir. Biri eksik kalırsa
// filtre menüsünde ham kod görünür ve olay hücresi çevrilmez.
const EVENT_CODES = [
  'account.registered',
  'account.email-confirmed',
  'auth.password-changed',
  'auth.password-reset',
  'auth.lockout',
  'auth.lockout-cleared',
  'admin.user-deleted',
  'admin.role-granted',
  'admin.role-revoked',
  'admin.plan-changed',
  'admin.lockout-cleared',
]

// AuditLog.Write*Async çağrılarına GERÇEKTEN geçirilen detail alanları
// (JsonSerializerDefaults.Web → camelCase). Biri eksik kalırsa ayrıntı
// kartında ham alan adı görünür:
//   failedCount               → AuthEndpoints.cs Login (auth.lockout)
//   projectCount, reportCount → AccountDeletion.cs DeleteAsync (admin.user-deleted)
//   fromPlan, toPlan          → AdminEndpoints.cs ChangePlan (admin.plan-changed)
//   previousLockoutEnd       → AdminEndpoints.cs UnlockUser (admin.lockout-cleared)
const DETAIL_KEYS = [
  'failedCount', 'projectCount', 'reportCount', 'fromPlan', 'toPlan', 'previousLockoutEnd', 'via',
]

describe.each(LANGS)('günlük metni (%s)', (lang) => {
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
      expect(t.columns[key].length, `columns.${key} boş`).toBeGreaterThan(0)
    }
  })

  it('her olay kodunun kendi cümlesi var', () => {
    for (const code of EVENT_CODES) {
      expect(t.eventText(code), `${code} çevrilmemiş`).not.toBe(code)
    }
  })

  it('facet grupları tüm kodları kapsar, "hepsi" başlıksız ilk grupta', () => {
    const [all, ...families] = t.eventGroups
    expect(all.heading).toBeNull()
    expect(all.options).toEqual([{ value: '', label: expect.any(String) }])

    const values = families.flatMap((g) => g.options.map((o) => o.value))
    expect(values.slice().sort()).toEqual([...EVENT_CODES].sort())
    for (const group of families) {
      expect(group.heading.length, `${group.key} başlığı boş`).toBeGreaterThan(0)
      for (const opt of group.options) {
        expect(opt.label.length, `${opt.value} etiketi boş`).toBeGreaterThan(0)
        expect(opt.dotClass, `${opt.value} nokta rengi yok`).toBeTruthy()
      }
    }
  })

  // Renk ÖNEKTEN değil olayın niteliğinden gelir — aynı ailede (`auth.*`,
  // `admin.*`) hem olumlu hem yıkıcı olay olabilir, bu yüzden bir grubun
  // renklerinin tek tip olması BEKLENMEZ (eski önek-bazlı tasarımın tersi).
  it('olay renk sınıfı niteliğe göre belirlenir, öneke göre değil', () => {
    // Aynı `auth.` önekinde zıt iki renk: kilitlenmek tehlike, açılmak olumlu.
    expect(t.eventMarkClass('auth.lockout')).toBe('danger')
    expect(t.eventMarkClass('auth.lockout-cleared')).toBe('ok')
    // Aynı `admin.` önekinde de zıt iki renk: silmek yıkıcı, kilit açmak olumlu.
    expect(t.eventMarkClass('admin.user-deleted')).toBe('danger')
    expect(t.eventMarkClass('admin.lockout-cleared')).toBe('ok')
    expect(t.eventMarkClass('admin.role-granted')).toBe('warning')
    expect(t.eventMarkClass('account.registered')).toBe('ok')
    expect(t.eventMarkClass('bilinmeyen.kod')).toBe('unknown')
  })

  // Her bilinen kod ÜÇ renkten birine düşmeli — `unknown`, sözlüğe işlenmemiş
  // bir kodun sessizce "nötr" görünmesidir ve bu ekranda hiçbir EVENT_CODE
  // için olmamalı.
  it('bilinen hiçbir olay kodu "unknown" renk almaz', () => {
    for (const code of EVENT_CODES) {
      expect(t.eventMarkClass(code), `${code} sınıflandırılmamış`).not.toBe('unknown')
    }
  })

  // Sessiz boşluk yerine teşhis edilebilir değer — sözlükte olmayan bir kod
  // ham hâliyle görünür, boş hücre değil.
  it('bilinmeyen kod ham hâliyle döner', () => {
    expect(t.eventText('bilinmeyen.kod')).toBe('bilinmeyen.kod')
  })

  it('zaman biçimi sayısal (dakika dahil), geçersiz girdide tire', () => {
    expect(t.formatDate('2026-08-06T11:23:33.656879+00:00')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    expect(t.formatDate(null)).toBe('—')
    expect(t.formatDate('anlamsız')).toBe('—')
  })

  // Olay kodu bekçisiyle aynı desen: DetailJson'a yazılan her bilinen alanın
  // bu dilde bir etiketi olmalı — yoksa kartta ham anahtar görünür.
  it('DetailJson alanlarının hepsinin etiketi var', () => {
    for (const key of DETAIL_KEYS) {
      const rows = t.detailRows(`{"${key}":1}`)
      expect(rows, `${key} satıra dönüşmedi`).toHaveLength(1)
      expect(rows[0].label, `${key} çevrilmemiş`).not.toBe(key)
      expect(rows[0].label.length, `${key} etiketi boş`).toBeGreaterThan(0)
    }
  })

  it('ayrıntı satırları etiket–değer verir, değer cümleye kurulmaz', () => {
    const rows = t.detailRows('{"projectCount":1,"reportCount":2}')
    expect(rows.map((r) => r.key)).toEqual(['projectCount', 'reportCount'])
    expect(rows.map((r) => r.value)).toEqual(['1', '2'])
  })

  // Sessiz boşluk yerine teşhis edilebilir değer — sözlükte olmayan alan ham
  // adıyla ama yine satır olarak düşer (bilinmeyen olay koduyla aynı kural).
  it('bilinmeyen alan ham adıyla düşer, sessizce kaybolmaz', () => {
    expect(t.detailRows('{"bilinmeyenAlan":7}')).toEqual([
      { key: 'bilinmeyenAlan', label: 'bilinmeyenAlan', value: '7' },
    ])
  })

  it('boş, alansız ya da bozuk ayrıntı boş liste döner (hücre boş kalır)', () => {
    expect(t.detailRows(null)).toEqual([])
    expect(t.detailRows('{}')).toEqual([])
    expect(t.detailRows('bozuk-json')).toEqual([])
    expect(t.detailRows('[1,2]')).toEqual([])
  })

  // Kart artık her satırda dolu: `recordRows` DetailJson'suz bir olayda bile
  // beş satır döner (zaman/olay/yapan/hedef/kayıt no) — "Görüntüle" düğmesi
  // bu yüzden koşulsuz çizilir (index.jsx).
  it('DetailJson\'suz olayda bile yapısal kayıt satırları dolu gelir', () => {
    const rows = t.recordRows({
      id: 42,
      occurredAt: '2026-08-06T11:23:33.656879+00:00',
      event: 'auth.password-changed',
      actorEmail: 'kisi@ornek.test',
      targetEmail: null,
      detailJson: null,
    })
    expect(rows).toHaveLength(5)
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]))
    expect(byKey.time.value).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(byKey.event.value).toContain('auth.password-changed')
    expect(byKey.actor.value).toBe('kisi@ornek.test')
    expect(byKey.target.value).toBe('—')
    expect(byKey.id.value).toBe('42')
  })

  // DetailJson doluysa `recordRows` beş yapısal satırın ARDINDAN onu ekler —
  // `detailRows` tek başına da hâlâ çalışır (yukarıdaki testler), burada
  // ikisinin birleştiği sıra sınanıyor.
  it('DetailJson\'lu olayda yapısal satırların ardından ayrıntı satırları gelir', () => {
    const rows = t.recordRows({
      id: 7,
      occurredAt: '2026-08-06T11:23:33.656879+00:00',
      event: 'admin.plan-changed',
      actorEmail: 'yonetici@ornek.test',
      targetEmail: 'kullanici@ornek.test',
      detailJson: '{"fromPlan":"free","toPlan":"pro"}',
    })
    expect(rows.map((r) => r.key)).toEqual(['time', 'event', 'actor', 'target', 'id', 'fromPlan', 'toPlan'])
  })

  it('görüntüle düğmesinin erişilebilir adı olay adını taşır', () => {
    expect(t.detailViewAria('X')).toContain('X')
  })

  it('sayfa durumu sayıları içerir', () => {
    const status = t.pageStatus(1, 25, 132)
    expect(status).toContain('132')
    expect(status).toContain('25')
  })

  it('sunucu hata kodlarının cümlesi var', () => {
    expect(t.errorText({ ok: false, error: 'FORBIDDEN' })).toBeTruthy()
    expect(t.errorText({ ok: false, error: 'network' })).toBeTruthy()
    expect(t.errorText({ ok: true })).toBeNull()
    expect(t.errorText(null)).toBeNull()
  })
})

// Çeviri eksikse büyük olasılıkla İngilizce Türkçenin kopyasıdır — `pick`in
// sessiz Türkçeye düşüşü burada açıkça sınanır (../text.test.js ile aynı gerekçe).
it('İngilizce metin Türkçenin kopyası değil', () => {
  const tr = getText('tr')
  const en = getText('en')
  const same = PLAIN.filter((k) => tr[k] === en[k])
  expect(same, `çevrilmemiş olabilir: ${same.join(', ')}`).toEqual([])
})

it('ayrıntı etiketlerinin İngilizcesi Türkçenin kopyası değil', () => {
  const tr = getText('tr')
  const en = getText('en')
  const same = DETAIL_KEYS.filter(
    (key) => tr.detailRows(`{"${key}":1}`)[0].label === en.detailRows(`{"${key}":1}`)[0].label,
  )
  expect(same, `çevrilmemiş olabilir: ${same.join(', ')}`).toEqual([])
})
