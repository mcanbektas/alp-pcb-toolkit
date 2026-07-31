import { test, expect } from '@playwright/test'

// Dil geçişi ve kalıcılığı.
//
// `<html lang>`in dille birlikte değişmesi kozmetik değil şarttır:
// `text-transform: uppercase` sayfanın dilini kullanır ve `lang="tr"` altında
// İngilizce "via" sözcüğü büyütülünce "VİA" çıkar (CLAUDE.md → Dil).
// Bunu hiçbir birim testi göremez — kural tarayıcının kendisinde.

test('EN seçilince belge dili ve başlık İngilizceye döner', async ({ page }) => {
  await page.goto('/arac/trace-width')
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  await expect(page.locator('h1')).toHaveText(/yol genişliği/i)

  await page.getByRole('button', { name: 'EN', exact: true }).click()

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  // Başlık `data/categories.js`teki `name.en` ile birebir aynı kalmalı.
  // Büyük/küçük duyarsız aranıyor: metni CSS büyütüyor, kaynak metin değil.
  await expect(page.locator('h1')).toHaveText(/trace width/i)
})

test('dil seçimi sayfa yenilendikten sonra da geçerli', async ({ page }) => {
  await page.goto('/arac/trace-width')
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.reload()

  // Seçim `localStorage`ta durur. İlk render VARSAYILAN dille çizilir ve
  // depodaki seçim mount'tan sonra uygulanır (prerender'lı HTML ile hydration
  // eşleşsin diye — docs/prerender-karari.md §2), bu yüzden burada beklemek
  // gerekir; `toHaveAttribute` zaten yeniden dener.
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('h1')).toHaveText(/trace width/i)
})

test('dil düğmesi seçili durumunu duyurur', async ({ page }) => {
  await page.goto('/')
  const tr = page.getByRole('button', { name: 'TR', exact: true })
  const en = page.getByRole('button', { name: 'EN', exact: true })

  await expect(tr).toHaveAttribute('aria-pressed', 'true')
  await expect(en).toHaveAttribute('aria-pressed', 'false')

  await en.click()

  await expect(en).toHaveAttribute('aria-pressed', 'true')
  await expect(tr).toHaveAttribute('aria-pressed', 'false')
})
