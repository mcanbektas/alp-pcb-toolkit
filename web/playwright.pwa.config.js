import { defineConfig, devices } from '@playwright/test'

// Çevrimdışı (service worker) testleri — ANA e2e KOŞUMUNDAN AYRI.
//
// Ayrı olmalarının nedeni sunucu: `npm run dev` service worker üretmez
// (vite-plugin-pwa yalnız derlemede çalışır), yani bu testler `dist/`i servis
// eden `vite preview` ister ve önce `npm run build` koşmuş olmalı. Ana koşum
// bu maliyeti her seferinde ödemesin diye ikiye ayrıldı:
//
//   npm run test:e2e        dev sunucusu, saniyeler
//   npm run test:e2e:pwa    build + preview, çevrimdışı davranış
//
// Kararlar: docs/pwa-karari.md
export default defineConfig({
  testDir: './e2e-pwa',
  // Service worker tarayıcı bağlamı başına tekildir ve testler onu kurup
  // çevrimdışına alıyor — paralel koşarlarsa birbirinin ağ durumunu görürler.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // `vite preview` derlenmiş `dist/`i servis eder — service worker, precache
  // manifest'i ve prerender'lı sayfalar ancak burada gerçektir.
  // `reuseExistingServer` yok: bayat bir `dist/` üzerinde koşmak, testin
  // doğruladığı şeyin az önce derlenen sürüm olmadığı anlamına gelir.
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
