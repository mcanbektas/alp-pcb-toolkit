import { test, expect } from '@playwright/test'

// Giriş formunda Enter tuşu.
//
// Beklenen davranış: parola (ya da e-posta) alanındayken Enter, "Giriş yap"
// düğmesine basmakla aynı şeyi yapar. Tarayıcı bunu çoğu durumda kendiliğinden
// yapar, ama yapmadığı durumlar var — parola yöneticisinin öneri listesi
// açıkken ilk Enter listeyi kapatır ve form gitmez — ve kullanıcıya bu
// "hiçbir şey olmadı" gibi görünür. `AuthField` bu yüzden Enter'ı açıkça
// `form.requestSubmit()`e bağlar.
//
// Testin SINIRI ölçüldü, mutasyonla: `AuthField`'daki Enter bağı tümüyle
// kaldırıldığında bu dosyadaki üç test de YEŞİL kalıyor — Chromium implicit
// submission'ı zaten yapıyor, `preventDefault` düşürüldüğünde bile ikinci bir
// istek çıkmıyor (HTML form gönderimi sırasındaki bayrak ikinciyi yutuyor).
// Yani bu testler açık bağın KENDİSİNİ kanıtlamaz; kanıtladıkları şey formun
// bütün olarak çalışır kaldığıdır — `onSubmit` kopar, düğmenin `type`ı bozulur
// ya da alanlar formun dışına çıkarsa kırmızıya dönerler. Açık bağın asıl
// hedefi olan durum (parola yöneticisi listesi açıkken ilk Enter) otomatik
// tarayıcıda üretilemiyor.
//
// Oturumlu akış burada da SINANMAZ (bkz. rapor-anonim.spec.js): sınanan şey
// isteğin gidip gitmediği, girişin başarısı değil. Bilerek yanlış parola
// kullanılır ve sunucunun 401'i beklenen sonuçtur.

const EPOSTA = 'e2e-enter@ornek.test'
const YANLIS_PAROLA = 'BuParolaKasitliYanlis123!'

/** Giriş isteklerini sayan bir dinleyici kurar. */
async function loginIsteklerini(page) {
  const istekler = []
  page.on('request', (r) => {
    if (r.url().includes('/api/auth/login')) istekler.push(r.method())
  })
  return istekler
}

test.beforeEach(async ({ page }) => {
  await page.goto('/giris')
})

test('parola alanında Enter formu gönderir', async ({ page }) => {
  const istekler = await loginIsteklerini(page)

  await page.locator('input[type="email"]').fill(EPOSTA)
  await page.locator('input[autocomplete="current-password"]').fill(YANLIS_PAROLA)
  await page.locator('input[autocomplete="current-password"]').press('Enter')

  // Sunucu bilerek hangi alanın hatalı olduğunu söylemez; görünen tek şey
  // isteğin GİTTİĞİ ve cevabın ekrana bağlandığıdır.
  await expect(page.locator('.field-hint.danger')).toBeVisible()
  expect(istekler).toHaveLength(1)
})

test('e-posta alanında Enter da formu gönderir', async ({ page }) => {
  const istekler = await loginIsteklerini(page)

  await page.locator('input[autocomplete="current-password"]').fill(YANLIS_PAROLA)
  await page.locator('input[type="email"]').fill(EPOSTA)
  await page.locator('input[type="email"]').press('Enter')

  await expect(page.locator('.field-hint.danger')).toBeVisible()
  expect(istekler).toHaveLength(1)
})

test('parola görünürlük düğmesi formu göndermez', async ({ page }) => {
  // `AuthField` içindeki göz düğmesi `type="button"` taşır. Düşerse varsayılan
  // `submit` olur ve göz simgesine basmak — dahası Enter — formu gönderir.
  const istekler = await loginIsteklerini(page)
  const parola = page.locator('input[autocomplete="current-password"]')

  await parola.fill(YANLIS_PAROLA)
  await page.locator('button.pw-toggle').click()

  await expect(parola).toHaveAttribute('type', 'text')
  expect(istekler).toHaveLength(0)
})
