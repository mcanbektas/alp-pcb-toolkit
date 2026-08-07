// Yönetim panelinin metin sözlüğü. Bileşen testi DEĞİL: sözlük saf bir
// fonksiyondur ve CLAUDE.md'nin "test edilen üç yer"inden biridir.
//
// Sınanan şey şu sınıftan hataları yakalamaktır: `text.foo.bar` yoksa React
// sessizce boş ya da `undefined` basar ve **build hata vermez**. Ekranda
// kullanılan her yol burada iki dilde de yürütülür — arity dahil: fonksiyon
// olarak çağrılan yol fonksiyon OLMALI, basılan yol fonksiyon OLMAMALI.

import { describe, expect, it } from 'vitest'
import { getText } from './text'

const LANGS = ['tr', 'en']

// `index.jsx`in okuduğu düz (fonksiyon olmayan) yollar.
const PLAIN = [
  'title', 'intro',
  'loginRequired', 'loginLink', 'forbidden', 'homeLink',
  'searchLabel', 'searchHint',
  'loading', 'empty',
  'confirmedYes', 'confirmedNo', 'lockedBadge', 'adminBadge', 'adminNotDeletable',
  'plan', 'planMakeFree', 'planMakePro',
  'deleteLabel', 'deleting', 'deleteTitle',
  'deletePasswordLabel', 'deletePasswordHint', 'deletePasswordMissing',
  'pagePrev', 'pageNext',
]

const COLUMNS = ['status', 'account', 'usage', 'createdAt', 'actions']

// Sunucunun döndürebildiği kodlar — AdminEndpoints.cs ile birebir. Biri
// çevrilmeden kalırsa kullanıcı genel "işlem tamamlanamadı" görür ve neyin
// yanlış olduğunu öğrenemez.
const ERROR_CODES = [
  'INVALID_CREDENTIALS', 'MISSING_FIELDS', 'FORBIDDEN',
  'SELF_DELETE', 'ADMIN_TARGET', 'NOT_FOUND', 'INVALID_PLAN',
]

describe.each(LANGS)('yönetim metni (%s)', (lang) => {
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

  it('metin üreten yollar fonksiyon ve argümanı metne katıyor', () => {
    expect(t.deleteConfirm('kim@ornek.test')).toContain('kim@ornek.test')
    expect(t.deleted('kim@ornek.test')).toContain('kim@ornek.test')
    const status = t.pageStatus(1, 25, 132)
    expect(status).toContain('132')
    expect(status).toContain('25')
  })

  // Hücre içi iki satırlı gösterim: firma yoksa ayırıcı da düşmeli, yoksa
  // satır "Alp Test · " diye asılı biter.
  it('silme düğmesinin erişilebilir adı hesabı söylüyor', () => {
    expect(t.deleteAria('kim@ornek.test')).toContain('kim@ornek.test')
  })

  // Plan değiştirme düğmelerinin erişilebilir adları hesabı söylüyor —
  // silme düğmesindeki gerekçenin aynısı: ekran okuyucu hangi satırda
  // olduğunu göremez.
  it('plan düğmelerinin erişilebilir adı hesabı söylüyor', () => {
    expect(t.planMakeFreeAria('kim@ornek.test')).toContain('kim@ornek.test')
    expect(t.planMakeProAria('kim@ornek.test')).toContain('kim@ornek.test')
  })

  // Bildirim hem hesabı hem YENİ plan değerini taşır; plan değeri kendisi
  // çevrilmez (row.plan ile aynı gerekçe), olduğu gibi geçer.
  it('plan değişim bildirimi hesabı ve yeni planı taşır', () => {
    expect(t.planChanged('kim@ornek.test', 'pro')).toContain('kim@ornek.test')
    expect(t.planChanged('kim@ornek.test', 'pro')).toContain('pro')
    expect(t.planChanged('kim@ornek.test', 'free')).toContain('free')
  })

  it('hesap alt satırı firmasız da düzgün', () => {
    expect(t.accountMeta('Alp Test', 'ALP PCB Ltd.')).toBe('Alp Test · ALP PCB Ltd.')
    expect(t.accountMeta('Alp Test', null)).toBe('Alp Test')
    expect(t.accountMeta('Alp Test', '')).toBe('Alp Test')
  })

  // Sıfır da yazılır: boş hücre "veri yok" gibi okunurdu.
  it('kullanım sayıları sıfırken de basılır', () => {
    const zero = t.usageText(0, 0)
    expect(zero).toMatch(/0/)
    expect(t.usageText(2, 5)).toMatch(/2/)
    expect(t.usageText(2, 5)).toMatch(/5/)
  })

  // Tarih biçimi iki dilde de AYNI (sayısal): sütun genişliği dile göre
  // oynamasın diye seçildi, num.js'in "ondalık ayırıcı dile göre değişmez"
  // kuralıyla aynı gerekçe.
  it('tarih sayısal biçimde, geçersiz girdide tire', () => {
    expect(t.formatDate('2026-08-06T11:23:33.656879+00:00')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(t.formatDate(null)).toBe('—')
    expect(t.formatDate('anlamsız')).toBe('—')
  })

  // Kilit tooltip'i tarih+saat taşır — yalnız tarih değil, "ne zaman açılacak"
  // sorusuna cevap vermesi gerekiyor (formatDate'in aksine).
  it('kilit tooltip metni tarih ve saat içeriyor', () => {
    const msg = t.lockedUntil('2026-08-06T11:23:33.656879+00:00')
    expect(msg).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)
  })

  it('her sunucu hata kodunun kendi cümlesi var', () => {
    const generic = t.errorText({ ok: false, error: 'BILINMEYEN_KOD' })
    for (const code of ERROR_CODES) {
      const message = t.errorText({ ok: false, error: code })
      expect(message, `${code} çevrilmemiş`).toBeTruthy()
      expect(message, `${code} genel cümleye düşüyor`).not.toBe(generic)
    }
    expect(t.errorText({ ok: false, error: 'network' })).toBeTruthy()
    expect(t.errorText({ ok: true })).toBeNull()
    expect(t.errorText(null)).toBeNull()
  })
})

// Çeviri eksikse `pick` Türkçeye düşer (lib/i18n.js). O düşüş sessiz olduğu
// için burada AÇIKÇA sınanır: İngilizce metin Türkçesiyle birebir aynıysa
// büyük olasılıkla çevrilmemiştir. Ortak olması beklenen kısa etiketler dışarıda.
it('İngilizce metin Türkçenin kopyası değil', () => {
  const tr = getText('tr')
  const en = getText('en')
  const shared = new Set(['plan'])
  const same = PLAIN.filter((k) => !shared.has(k) && tr[k] === en[k])
  expect(same, `çevrilmemiş olabilir: ${same.join(', ')}`).toEqual([])
})
