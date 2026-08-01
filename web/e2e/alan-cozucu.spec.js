import { test, expect } from '@playwright/test'

// Alan çözücüsünün Web Worker zinciri: ekran → useFieldSolver → worker →
// lib/fieldSolver → sonuç satırı. Birim testleri motoru kapsıyor; buradaki
// soru worker'ın gerçek tarayıcıda kurulup sonucun panele DÜŞMESİ — o zincir
// hiçbir birim testinde yok (vitest'te Worker yok).
//
// Çözücü mount'tan sonra ve ~yarım saniyelik hesapla gelir; beklemeler bu
// yüzden cömert tutuldu.

const resultPanel = (page) => page.locator('section.panel[aria-live]')

test('tek uçlu ekranda çözücü satırı worker üzerinden gelir', async ({ page }) => {
  await page.goto('/arac/tek-uclu-empedans')

  // Kapalı form sonucu hemen gelir
  await expect(resultPanel(page).locator('.big-result .value')).toBeVisible()

  // Çözücü satırı mount sonrası worker'dan düşer; Z₀ hücresi Ω taşır
  const solverRow = resultPanel(page).getByText('Alan çözücü — Z₀')
  await expect(solverRow).toBeVisible({ timeout: 15000 })
  const solverCell = solverRow.locator('xpath=following-sibling::td')
  await expect(solverCell).toHaveText(/\d+(\.\d+)?\s+Ω$/)

  // Yakınsama farkı sayı olarak basılır (E_Z sözleşmesi, spec §6.3).
  // exact: yorum listesindeki cümle de aynı ifadeyi içerir, satır hücresi aranıyor
  await expect(resultPanel(page).getByText('Yakınsama farkı E_Z', { exact: true })).toBeVisible()
})

test('coplanar yapıda çözücü satırı sunulmaz (F1 kapsamı)', async ({ page }) => {
  await page.goto('/arac/tek-uclu-empedans')
  await expect(resultPanel(page).locator('.big-result .value')).toBeVisible()

  // Yapıyı CPW'ye çevir; çözücü satırı ve "hesaplıyor" notu görünmemeli
  await page.getByLabel('Yapı').selectOption({ index: 2 })
  await expect(resultPanel(page).locator('.big-result .value')).toBeVisible()
  await expect(resultPanel(page).getByText('Alan çözücü — Z₀')).toHaveCount(0)
  await expect(resultPanel(page).getByText('Alan çözücü hesaplıyor')).toHaveCount(0)
})

// F2: grounded CPW yalnız çözücüyle çözülür — ana sayı worker'dan düşer.
test('grounded CPW yapısında ana sonuç çözücüden gelir', async ({ page }) => {
  await page.goto('/arac/tek-uclu-empedans')
  await expect(resultPanel(page).locator('.big-result .value')).toBeVisible()

  await page.getByLabel('Yapı').selectOption({ index: 3 })
  // Kapalı form yok: değer "hesaplanıyor…" ile başlar, sonra Ω taşır
  await expect(resultPanel(page).locator('.big-result .value')).toHaveText(/\d+(\.\d+)?\s+Ω$/, {
    timeout: 15000,
  })
  await expect(resultPanel(page).getByText('Yakınsama farkı E_Z', { exact: true })).toBeVisible()
})

// F2: diferansiyel çiftin sayıları çözücüden gelir (kapasitans matrisi rotası)
test('diferansiyel çift ekranında Z_diff worker üzerinden gelir', async ({ page }) => {
  await page.goto('/arac/diferansiyel-cift')

  // Kapalı form tek uçlu taban hemen; çiftin ana sayısı çözücüden düşer
  await expect(resultPanel(page).locator('.big-result .value')).toBeVisible()
  await expect(resultPanel(page).locator('.big-result .value')).toHaveText(/\d+(\.\d+)?\s+Ω$/, {
    timeout: 15000,
  })

  const zoddRow = resultPanel(page).getByText('Odd mod (Z_odd)', { exact: true })
  await expect(zoddRow).toBeVisible()
  const zoddCell = zoddRow.locator('xpath=following-sibling::td')
  await expect(zoddCell).toHaveText(/\d+(\.\d+)?\s+Ω$/)
  await expect(resultPanel(page).getByText('Yakınsama farkı E_Z', { exact: true })).toBeVisible()
})
