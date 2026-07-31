import { test, expect } from '@playwright/test'

// Sitenin ağsız çalıştığı — PWA'nın tek gerçek kanıtı.
//
// Ürünün sözü şu: bütün hesap motorları tarayıcıda koşuyor, sunucu yalnız
// üyelik ve rapor için. Service worker bu sözü ağ koptuğunda da tutmalı
// (lab/saha kullanımı). Kararlar: docs/pwa-karari.md.
//
// Bu dosya `dist/` üzerinde koşar (bkz. playwright.pwa.config.js) — dev
// sunucusunda service worker hiç üretilmez.

// Service worker'ın kurulup precache'i doldurması beklenir. `navigator
// .serviceWorker.ready` kaydın AKTİF olmasını bekler; precache'in gerçekten
// dolduğunu ayrıca cache API'sinden doğruluyoruz, yoksa "aktif ama boş" bir
// worker'la çevrimdışına geçip yanıltıcı bir başarısızlık alırdık.
async function serviceWorkerHazir(page) {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false
    const reg = await navigator.serviceWorker.ready.catch(() => null)
    if (!reg?.active) return false
    const names = await caches.keys()
    const precache = names.find((n) => n.includes('precache'))
    if (!precache) return false
    const keys = await (await caches.open(precache)).keys()
    return keys.length > 10
  }, null, { timeout: 60_000 })
}

test('araç ekranı ağ kesildikten sonra da açılır ve hesap yapar', async ({ page, context }) => {
  await page.goto('/arac/trace-width')
  await expect(page.locator('section.panel[aria-live] .big-result .value')).toBeVisible()
  await serviceWorkerHazir(page)

  await context.setOffline(true)
  await page.reload()

  // Kabuk önbellekten geldi; asıl soru hesabın hâlâ çalışıp çalışmadığı.
  const value = page.locator('section.panel[aria-live] .big-result .value')
  await expect(value).toBeVisible()
  await expect(value).toHaveText(/^\d+(\.\d+)?\s+mm$/)

  // Girdi değiştirince sonuç da değişmeli — motor gerçekten koşuyor demektir,
  // ekranda donmuş bir HTML durmuyor.
  const before = await value.innerText()
  await page.locator('.panel').first().locator('input')
    .first()
    .fill('5')
  await expect(value).not.toHaveText(before)
})

test('çevrimdışıyken hiç ziyaret edilmemiş araç da açılır', async ({ page, context }) => {
  // Bu, precache kararının sınavı: JS paketleri önden alındığı için ağ
  // yokken de rota çizilebilmeli. Sayfa kabuğu önbellekte olmadığından
  // `spa-fallback.html` devreye girer (precacheFallback).
  await page.goto('/')
  await serviceWorkerHazir(page)

  await context.setOffline(true)
  await page.goto('/arac/gerilim-bolucu')

  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('section.panel[aria-live] .big-result')).toBeVisible()
})

test('çevrimdışıyken İngilizce adres de doğru dilde açılır', async ({ page, context }) => {
  // Geri düşüş kabuğu (`spa-fallback.html`) TEK dosyadır ve `lang="tr"` doğar.
  // Dil URL'den okunduğu için (docs/en-url-karari.md §3) ağsız gelen bir
  // İngilizce rota yine İngilizce çizilmeli — ikinci bir kabuk üretmeye gerek
  // kalmamasının şartı budur.
  await page.goto('/')
  await serviceWorkerHazir(page)

  await context.setOffline(true)
  await page.goto('/en/tool/voltage-divider')

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('h1')).toHaveText(/voltage divider/i)
  await expect(page.locator('section.panel[aria-live] .big-result')).toBeVisible()
})

test('service worker API isteklerini önbelleğe almaz', async ({ page, context }) => {
  // Aynı zamanda bu dosyanın NEGATİF KONTROLÜ: `setOffline` gerçekten ağı
  // kesiyorsa, service worker'ın dokunmadığı bir istek çevrimdışında
  // BAŞARISIZ olmalı. Hepsi başarılı olsaydı testler yanlış-pozitif olurdu —
  // ağ hiç kesilmemiş, sayfa da ağdan gelmiş olurdu.
  await page.goto('/arac/trace-width')
  await serviceWorkerHazir(page)
  await context.setOffline(true)

  const istek = (url) => page.evaluate(async (u) => {
    try {
      const r = await fetch(u)
      return `ok:${r.status}`
    } catch {
      return 'hata'
    }
  }, url)

  // `/api/` NetworkOnly — oturum çerezi ve hız sınırı akışına önbellek
  // girmemeli (docs/pwa-karari.md §2).
  expect(await istek('/api/health')).toBe('hata')
  // Precache dışında bırakılan bir dosya da çevrimdışında gelmemeli.
  expect(await istek('/robots.txt')).toBe('hata')

  // Buna karşılık precache'teki bir paket gelmeli — kesilen şey ağ, önbellek değil.
  const chunk = await page.evaluate(async () => {
    const adlar = await caches.keys()
    const precache = adlar.find((n) => n.includes('precache'))
    const anahtarlar = await (await caches.open(precache)).keys()
    return anahtarlar.map((k) => k.url).find((u) => u.endsWith('.js'))
  })
  expect(await istek(chunk)).toBe('ok:200')
})

test('çevrimdışıyken uygulama içi gezinme çalışır', async ({ page, context }) => {
  await page.goto('/')
  await serviceWorkerHazir(page)

  await context.setOffline(true)
  // Tam sayfa yüklemesi değil, yönlendirici geçişi: chunk'lar precache'ten
  // gelmezse burada boş ekran ya da ErrorBoundary görünürdü.
  await page.getByRole('link', { name: /kontrollü empedans/i }).first().click()

  await expect(page.locator('h1')).toHaveText(/kontrollü empedans/i)
})
