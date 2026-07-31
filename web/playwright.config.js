import { defineConfig, devices } from '@playwright/test'

// Tarayıcı testleri — KAPSAM BİLİNÇLİ OLARAK DAR: yalnız anonim akışlar.
// Oturum gerektiren akışlar (kayıt, e-posta doğrulama, projeye kaydetme)
// buraya girmez; doğrulama postası `ConsoleEmailSender` günlüğüne düşüyor ve
// oradan temiz okunamıyor, teste özel bir uç ise açılmaz (güvenlik yüzeyi).
// Gerekçe ve sınır: docs/brifler/05-playwright-e2e.md.
//
// Birim testleriyle karışmaz: vitest yalnız `src/**/*.test.{js,jsx}` toplar
// (bkz. vite.config.js → test.include), Playwright yalnız `e2e/` okur.
export default defineConfig({
  testDir: './e2e',
  // Testler aynı dev sunucusunu paylaşıyor ve hiçbiri sunucu durumu
  // değiştirmiyor (anonim, salt okunur) — paralel koşabilirler.
  fullyParallel: true,
  // Yerelde `.only` bırakmak serbest; CI'da o test dosyasının geri kalanı
  // sessizce koşmamış olurdu.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    // İlk denemede iz tutulmaz (yavaş); yalnız yeniden denenen testte.
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // `npm run dev` — vite `strictPort: true` ile 3000'de açılır, yani port
  // doluysa sessizce başka porta kaçmaz ve test yanlış siteye bağlanmaz.
  // `reuseExistingServer`: geliştirirken zaten açık olan sunucuyu kullanır.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
