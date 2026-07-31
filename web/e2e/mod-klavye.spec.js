import { test, expect } from '@playwright/test'

// Mod seçicinin klavye modeli (`components/Segmented.jsx`).
//
// Bileşen eskiden `tablist`/`tab` ilan ediyordu ama rolün vaat ettiği klavye
// desenini yerine getirmiyordu; `radiogroup`/`radio`ya çevrildi ve ok tuşu
// modeli yazıldı. Rol ile davranışın uyumu ancak gerçek tarayıcıda sınanır:
// tabIndex yönetimi, odak taşıma ve seçim tek bir DOM'da birlikte çalışır.

const resultPanel = (page) => page.locator('section.panel[aria-live]')

test('ok tuşu modu değiştirir ve odağı birlikte taşır', async ({ page }) => {
  await page.goto('/arac/trace-width')

  const radios = page.getByRole('radio')
  await expect(radios).toHaveCount(2)
  await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'true')

  const before = await resultPanel(page).locator('.big-result .label').innerText()

  await radios.nth(0).focus()
  await page.keyboard.press('ArrowRight')

  await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'false')
  await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true')
  // Odak seçimle birlikte gitmeli — radiogroup deseninin şartı.
  await expect(radios.nth(1)).toBeFocused()

  // Mod gerçekten değişti mi: sonucun kendi etiketi de değişmeli
  // (sentez genişlik verir, analiz akım).
  await expect(resultPanel(page).locator('.big-result .label')).not.toHaveText(before)
})

test('grup tek durakla gezilir', async ({ page }) => {
  await page.goto('/arac/trace-width')
  const radios = page.getByRole('radio')

  // Yalnızca seçili düğme sekme sırasındadır; diğeri -1 taşır. Aksi hâlde
  // iki seçenekli bir grup, sekme tuşuyla iki durak yerdi.
  await expect(radios.nth(0)).toHaveAttribute('tabindex', '0')
  await expect(radios.nth(1)).toHaveAttribute('tabindex', '-1')

  await radios.nth(0).focus()
  await page.keyboard.press('ArrowRight')

  await expect(radios.nth(0)).toHaveAttribute('tabindex', '-1')
  await expect(radios.nth(1)).toHaveAttribute('tabindex', '0')
})

test('ok tuşu grubun başında ve sonunda dönerek dolaşır', async ({ page }) => {
  await page.goto('/arac/trace-width')
  const radios = page.getByRole('radio')

  await radios.nth(0).focus()
  // İlk öğede sola gitmek son öğeye sarmalı.
  await page.keyboard.press('ArrowLeft')
  await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true')

  await page.keyboard.press('ArrowRight')
  await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'true')
})
