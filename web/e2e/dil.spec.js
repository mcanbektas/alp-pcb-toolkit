import { test, expect } from '@playwright/test'

// Dil ağacı ve URL.
//
// Dil artık `localStorage`ta değil URL'DE durur: `/arac/trace-width` Türkçe,
// `/en/tool/trace-width` İngilizce sayfadır (docs/en-url-karari.md §1, §3).
// Dil değiştirmek bu yüzden gezinmedir — düğme değil bağlantı.
//
// `<html lang>`in dille birlikte değişmesi kozmetik değil şarttır:
// `text-transform: uppercase` sayfanın dilini kullanır ve `lang="tr"` altında
// İngilizce "via" sözcüğü büyütülünce "VİA" çıkar (CLAUDE.md → Dil).
// Bunu hiçbir birim testi göremez — kural tarayıcının kendisinde.

test('EN bağlantısı aynı sayfanın İngilizce adresine götürür', async ({ page }) => {
  await page.goto('/arac/trace-width')
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  await expect(page.locator('h1')).toHaveText(/yol genişliği/i)

  await page.getByRole('link', { name: 'EN', exact: true }).click()

  // Kritik olan: adres değişti. Değişmeseydi aynı URL iki dil gösterirdi ve
  // hreflang/canonical anlamsız kalırdı.
  await expect(page).toHaveURL('http://localhost:3000/en/tool/trace-width')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  // Başlık `data/categories.js`teki `name.en` ile birebir aynı kalmalı.
  // Büyük/küçük duyarsız aranıyor: metni CSS büyütüyor, kaynak metin değil.
  await expect(page.locator('h1')).toHaveText(/trace width/i)
})

test('İngilizce adres doğrudan açıldığında İngilizce gelir', async ({ page }) => {
  await page.goto('/en/tool/trace-width')

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('h1')).toHaveText(/trace width/i)

  // Kalıcılık artık depoda değil ADRESTE: yenileme aynı adresi ister, yani
  // dil de aynı kalır.
  await page.reload()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('h1')).toHaveText(/trace width/i)
})

test('İngilizce ağaçta gezinirken dil korunur', async ({ page }) => {
  await page.goto('/en/tool/trace-width')

  // Araç ekranının kategoriye dönen bağlantısı — `LangLink` çevirisi burada
  // sınanıyor. Kaynakta kanonik Türkçe yol yazılı, çıktının İngilizce olması
  // gerekiyor.
  await page.locator('main a.backlink').click()

  await expect(page).toHaveURL('http://localhost:3000/en/category/current-power-copper')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('dil bağlantısı seçili durumunu duyurur', async ({ page }) => {
  await page.goto('/')
  const tr = page.getByRole('link', { name: 'TR', exact: true })
  const en = page.getByRole('link', { name: 'EN', exact: true })

  // Seçili dilin bağlantısı SAYFANIN KENDİSİNİ gösterir; `aria-current="page"`
  // tam da bunu söyler. Eski `aria-pressed` düğme sözlüğüne aitti.
  await expect(tr).toHaveAttribute('aria-current', 'page')
  await expect(en).not.toHaveAttribute('aria-current', 'page')

  await en.click()

  await expect(page).toHaveURL('http://localhost:3000/en')
  await expect(en).toHaveAttribute('aria-current', 'page')
  await expect(tr).not.toHaveAttribute('aria-current', 'page')
})

test('dil değişince ?hesap= bağı kaybolmaz', async ({ page }) => {
  // Kayıt bağı paylaşılabilir olmak zorunda (CLAUDE.md → Kaydedilmiş hesap
  // bağı). Parametre adı iki ağaçta da Türkçedir ve dil geçişinde taşınır;
  // taşınmasaydı dil değiştiren kullanıcı kaydından sessizce kopardı.
  await page.goto('/arac/trace-width?hesap=deneme')

  await page.getByRole('link', { name: 'EN', exact: true }).click()

  await expect(page).toHaveURL('http://localhost:3000/en/tool/trace-width?hesap=deneme')
})
