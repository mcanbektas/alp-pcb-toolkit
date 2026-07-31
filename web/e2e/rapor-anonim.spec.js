import { test, expect } from '@playwright/test'

// Anonim ziyaretçinin rapor ve kaydetme yüzeyinde ne gördüğü.
//
// Ürünün sözü şu: oturum açılmamışken bütün araçlar TAM çalışır, yalnız
// kaydetme ve rapor indirme üyeliğe bağlıdır (CLAUDE.md → Proje). Bu testin
// koruduğu şey o sınır: hesap görünür kalmalı, kapalı olan iki yüzey ise
// bozuk bir düğme değil, nedenini söyleyen bir not ve giriş yolu göstermeli.
//
// Not: burada oturumlu akış SINANMAZ — kayıt/e-posta doğrulama akışı
// `ConsoleEmailSender` günlüğüne düşüyor ve e2e'den temiz okunamıyor, teste
// özel bir uç ise açılmıyor (docs/brifler/05-playwright-e2e.md).

test.beforeEach(async ({ page }) => {
  await page.goto('/arac/trace-width')
})

test('anonim kullanıcı hesabı görebilir', async ({ page }) => {
  // Sınırın asıl tarafı bu: kapalı olan kaydetmedir, hesap değil.
  await expect(page.locator('section.panel[aria-live] .big-result .value')).toBeVisible()
})

test('rapor ve kaydetme yüzeyleri gerekçesiyle kapalı', async ({ page }) => {
  await expect(page.getByText(/rapor almak için giriş yapmalısın/i)).toBeVisible()
  await expect(page.getByText(/projeye kaydetmek için giriş yapmalısın/i)).toBeVisible()
})

test('nottaki bağlantı giriş ekranına götürür', async ({ page }) => {
  // Ekranda birden fazla "Giriş yap" bağlantısı var (başlıkta da bir tane);
  // aranan, notun İÇİNDEKİ bağlantı.
  const note = page.locator('.empty-note').filter({ hasText: /rapor almak için giriş yapmalısın/i })
  await note.getByRole('link').click()

  await expect(page).toHaveURL(/\/giris$/)
  // Giriş ekranı başlığını `h2` ile kuruyor (pages/auth/Login.jsx); araç
  // ekranlarındaki `h1` deseni auth sayfalarında kullanılmıyor. Altbilgide de
  // `h2` başlıklar var, o yüzden ana alanla sınırlanıyor.
  await expect(page.locator('main').getByRole('heading', { name: /giriş yap/i })).toBeVisible()
})

test('başlıkta oturum açma yolu var, hesap alanı yok', async ({ page }) => {
  await expect(page.locator('header').getByRole('link', { name: /giriş yap/i })).toBeVisible()
  // Oturum gerektiren gezinme başlıkta anonimken görünmemeli.
  await expect(page.locator('header').getByRole('link', { name: /projelerim/i })).toHaveCount(0)
})
