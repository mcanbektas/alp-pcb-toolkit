import { test, expect } from '@playwright/test'

// Hesabın uçtan uca çalıştığı: ekran açılır, varsayılan girdilerle sonuç
// üretir, girdi bozulunca sonuç yerine gerekçe gösterir.
//
// Birim testleri motoru (`lib/traceCalc.js`) zaten kapsıyor; buradaki soru
// motorun doğruluğu DEĞİL, form → hesap → panel zincirinin gerçek tarayıcıda
// kurulup kurulmadığı. O zincir hiçbir birim testinde yok.

// Sonuç paneli `aria-live` taşıyan tek bölümdür (bkz. components/ResultPanel.jsx),
// seçici olarak da en dayanıklı işaret o.
const resultPanel = (page) => page.locator('section.panel[aria-live]')

test.beforeEach(async ({ page }) => {
  await page.goto('/arac/trace-width')
})

test('varsayılan girdilerle sayısal bir sonuç üretir', async ({ page }) => {
  const value = resultPanel(page).locator('.big-result .value')
  await expect(value).toBeVisible()

  // Sayı biçimi dile göre değişmez, ondalık ayırıcı daima noktadır
  // (CLAUDE.md → "Birim ve sayı akışı"). Değerin kendisi motorun işi;
  // burada aranan, panelin gerçekten bir SAYI basmış olması.
  await expect(value).toHaveText(/^\d+(\.\d+)?\s+mm$/)

  // Durum çipi de sonucun parçasıdır — tek kurallı eşleme (lib/statusChip.js).
  await expect(resultPanel(page).locator('.status')).toBeVisible()
})

test('zorunlu alan boşaltılınca sonuç yerine gerekçe gösterilir', async ({ page }) => {
  const panel = resultPanel(page)
  await expect(panel.locator('.big-result')).toBeVisible()

  // Girdiler panelindeki ilk sayı alanı (akım). Alanın kendi etiketi ekrana
  // özgü olduğu için konumla seçiliyor; aranan davranış alana değil kapıya ait.
  await page.locator('.panel').first().locator('input')
    .first()
    .fill('')

  await expect(panel.locator('.big-result')).toHaveCount(0)
  await expect(panel.locator('.empty-note')).toBeVisible()
})

test('sayı olmayan girdi de aynı kapıya takılır', async ({ page }) => {
  const panel = resultPanel(page)
  await page.locator('.panel').first().locator('input')
    .first()
    .fill('abc')

  await expect(panel.locator('.big-result')).toHaveCount(0)
  await expect(panel.locator('.empty-note')).toBeVisible()

  // Geçerli değere dönünce sonuç geri gelmeli: kapı tek yönlü değil.
  await page.locator('.panel').first().locator('input')
    .first()
    .fill('1')
  await expect(panel.locator('.big-result .value')).toBeVisible()
})
