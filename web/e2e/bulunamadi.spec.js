import { test, expect } from '@playwright/test'

// Bilinmeyen yol. `path="*"` rotası eklenmeden önce kırık bir bağlantı,
// başlıkla altbilgi arasında sessiz BOŞ bir ana alan bırakıyordu (App.jsx →
// NotFound notu). Bu, build'den ve birim testlerinden kaçan bir durumdu.

test('bilinmeyen yol "sayfa bulunamadı" ekranını gösterir', async ({ page }) => {
  await page.goto('/olmayan-yol')

  await expect(page.locator('h1')).toHaveText(/sayfa bulunamadı/i)
  // Ana alan boş kalmamalı — asıl gerileme buydu.
  await expect(page.locator('main')).not.toBeEmpty()
})

test('bulunamadı ekranındaki bağlantı ana sayfaya götürür', async ({ page }) => {
  await page.goto('/olmayan-yol/derin/bir/yol')

  await page.locator('main a.backlink').click()

  await expect(page).toHaveURL('http://localhost:3000/')
  await expect(page.locator('h1')).toBeVisible()
})

test('derin bağlantı yenilendiğinde de araç ekranı gelir', async ({ page }) => {
  // BrowserRouter kullanılıyor: `/arac/skew` diye bir DOSYA yok. Sunucu SPA
  // geri düşüşü vermezse sayfa YENİLENDİĞİNDE 404 alınır — dağıtımın ilk
  // doğrulanacak maddesi (CLAUDE.md → dağıtım). Burada karşılığı vite dev
  // sunucusudur; üretimdeki karşılığı nginx `try_files` zinciridir.
  await page.goto('/arac/skew')
  await expect(page.locator('h1')).toBeVisible()

  await page.reload()

  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('h1')).not.toHaveText(/sayfa bulunamadı/i)
})
