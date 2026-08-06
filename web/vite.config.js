import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Service worker precache girdisi olarak eklenen `spa-fallback.html` derleme
// SIRASINDA henüz yoktur — onu prerender adımı üretir (scripts/build-prerender.mjs,
// `vite build`ten sonra koşar). Workbox'ın precache manifest'i yalnız URL ve
// revizyon ister; dosyanın kendisi service worker kurulurken indirilir, o an
// dosya diskte hazırdır. Revizyon her derlemede değişmeli, yoksa yeni kabuk
// eski revizyonla aynı sayılıp güncellenmez.
const buildId = new Date().toISOString()

// `isSsrBuild`: prerender'ın Node paketi de Vite ile derleniyor
// (`vite build --ssr`). PWA eklentisi orada koşarsa `.prerender/` altına ikinci
// bir service worker ve manifest yazar — o çıktı tarayıcıya hiç gitmez, yani
// üretilmesi anlamsız ve yanıltıcıdır.
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    react(),
    VitePWA({
      disable: isSsrBuild,
      // Güncelleme akışı: yeni service worker kendini kurar ve devralır; ek
      // "yeni sürüm var" kartı YOKTUR. Gerekçe: navigasyon zaten
      // network-first, yani kullanıcı her yenilemede güncel HTML'i alıyor —
      // kendisinden zaten otomatik olan bir şey istenmiş olurdu. Ayrıntı:
      // docs/pwa-karari.md §3.
      registerType: 'autoUpdate',
      // Kayıt `src/main.jsx`te elle yapılır: enjekte edilen satır index.html'e
      // girerdi ve o kabuk prerender'lı 38 sayfaya kopyalanıyor.
      injectRegister: null,
      manifest: {
        name: 'ALP PCB Toolkit',
        short_name: 'ALP PCB',
        description: 'PCB tasarımı için çevrim içi donanım mühendisliği hesap araçları.',
        // Arayüz iki dilli ama manifest tek dil taşır; varsayılan dil
        // (i18n.js → DEFAULT_LANG) yazılır.
        lang: 'tr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // index.html'deki `theme-color` ile aynı değer — ayrışırsa tarayıcı
        // çubuğu ile yüklü uygulama farklı renk gösterir.
        theme_color: '#070c08',
        background_color: '#070c08',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          // `maskable`: Android ikonu kendi maskesine kırpar. Ayrı bir dosya
          // üretilmedi, aynı kare kullanılıyor — işaretin kenar boşluğu zaten
          // geniş. İkonlar 64 px favicon'dan büyütüldü ve gerçek marka
          // varlığı geldiğinde değiştirilmeli (docs/pwa-karari.md §4).
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // HTML precache'e GİRMEZ: kabuk network-first okunur (aşağıya bkz.).
        // woff2 de girmez — `unicode-range` sayesinde tarayıcı 37 alt küme
        // dosyasının yalnız gerekenini indiriyor; hepsini önden çekmek 388 KB
        // israf olurdu. Onlar runtime'da, istendikçe önbelleğe alınır.
        globPatterns: ['**/*.{js,css,png,svg,ico}'],
        // Yüklü uygulamanın ikonlarını tarayıcı kendi çeker, sayfa onları hiç
        // istemez — precache'te 160 KB boşuna dururdu. `favicon.png` ve
        // `assets/` altındaki logo hariç: onları sayfanın kendisi kullanıyor.
        globIgnores: ['icon-*.png'],
        additionalManifestEntries: [{ url: '/spa-fallback.html', revision: buildId }],
        // Navigasyonun geri düşüşü aşağıdaki NetworkFirst kuralının
        // `precacheFallback`ıdır; Workbox'ın kendi `navigateFallback`ı
        // kapatılır, yoksa iki NavigationRoute kaydedilir.
        navigateFallback: null,
        runtimeCaching: [
          {
            // Sayfa kabukları: NETWORK-FIRST. Cache-first OLMAZ — bayat bir
            // kabuk, silinmiş hash'li chunk'ları ister ve sayfa boş açılır
            // (nginx'teki no-store kuralı ve ErrorBoundary tam bu yüzden var).
            // Ağ yoksa önbellekteki sayfa, o da yoksa boş kabuk döner: JS
            // precache'te olduğu için React doğru rotayı çizer ve araç
            // çevrimdışı da hesap yapar.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'alp-html-shells',
              // Ağ "var ama ölü" durumunda (uçak modu değil, kopuk bağlantı)
              // kullanıcı süresiz beklemesin.
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
              precacheFallback: { fallbackURL: '/spa-fallback.html' },
            },
          },
          {
            // Yazı tipleri: dosya adı içeriğiyle sabit, cache-first güvenli.
            urlPattern: ({ url }) => url.pathname.startsWith('/fonts/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'alp-fonts',
              expiration: { maxEntries: 40, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // API'ye service worker HİÇ dokunmaz. Kural eşleşmeyen isteği
            // Workbox zaten ağa bırakır; bu satır niyeti açık tutar — bir gün
            // genel bir cache kuralı eklenirse oturum çerezi ve hız sınırı
            // akışının önbelleğe girmesi burada engellenmiş olur.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  // Vitest yalnızca `src/` altındaki saf fonksiyon testlerini koşar. Sınır
  // AÇIKÇA yazılmalı: varsayılan desen `**/*.{test,spec}.*` olduğu için
  // `e2e/` altındaki Playwright dosyalarını da toplar ve onlar vitest içinde
  // koşturulunca `test.describe` bulunamadı diye patlar.
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    // Vitest'in varsayılan test zaman aşımı 5 sn'dir ve alan çözücü testleri
    // için ÇOK DAR: 2B FDM ızgarası bu makinede tek testte 2.5 sn'ye çıkıyor,
    // yüklü bir CI koşucusunda ise 5 sn'yi aşıp "Test timed out in 5000ms"
    // ile düşüyor. Testin kendisi kararsız değil — çözücü saf ve deterministik,
    // aynı girdiye aynı sayıyı veriyor; kararsız olan koşucunun hızı. Bu yüzden
    // her koşumda BAŞKA bir alan çözücü testi düşüyor ve arıza gerçek bir
    // regresyon gibi okunuyordu (ölçüldü: aynı commit'te bir iş akışında yeşil,
    // diğerinde kırmızı).
    //
    // Tavan yavaşlığı meşrulaştırmak için değil, hız dalgalanmasını gerçek
    // hatadan ayırmak için var: gözlenen en kötü CI süresinin ~4 katı. Gerçekten
    // ASILI bir test hâlâ yakalanır, yalnızca 30 sn sonra.
    testTimeout: 30_000,
  },

  // Kendi sunucumuzda barındırılır (GitHub Pages değil): kök '/'den servis
  // edilir, BrowserRouter kullanılır. docs/uyelik-ve-rapor-plani.md §6.2
  base: '/',
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5289',
        changeOrigin: true,
      },
    },
  },
}))
