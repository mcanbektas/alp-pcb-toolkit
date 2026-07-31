# PWA / offline kararı — 2026-07-31

Brif: `docs/brifler/04-pwa-offline.md`. Prerender kararıyla birlikte okunur:
`docs/prerender-karari.md` (aynı gün, bir önceki brif).

## Gerekçe

Bütün hesap motorları tarayıcıda çalışır; sunucu yalnız üyelik ve rapor
içindir. Yani site internetsiz **tam** çalışabilir — lab ve saha kullanımı
gerçek senaryo. Eksik olan tek şey, ağ yokken kabuğun ve JS'in nereden
geleceğiydi.

## 1. Araç — `vite-plugin-pwa` (Workbox), `generateSW` kipi

Elle service worker yazılmadı. Gerekçe: precache manifest'i her derlemede
değişen 55 hash'li chunk'ı içeriyor; onu elle tutmak, `fonts.css`i elle
tutmakla aynı hata sınıfı olurdu (bkz. `scripts/build-fonts.mjs` başlığı).
Workbox manifest'i derlemeden türetir.

`CLAUDE.md`'deki "yeni test/lint aracı eklemeden önce sor" kuralı test
araçları içindir; bu bir derleme eklentisidir ve brif onu açıkça öneriyor.
Çalışma zamanına bağımlılık **eklemez** — üretilen `sw.js` + `workbox-*.js`
kendi kendine yeter, uygulama paketine hiçbir şey girmez.

## 2. Önbellek stratejisi

| İstek | Strateji | Neden |
|---|---|---|
| Navigasyon (sayfa kabukları) | **NetworkFirst** (4 sn zaman aşımı) | Cache-first bayat kabuk demek: silinmiş hash'li chunk istenir, sayfa boş açılır. nginx'teki `no-store` ve `ErrorBoundary` tam bu yüzden var. |
| Ağ yok + önbellekte de yok | `precacheFallback: /spa-fallback.html` | Boş kabuk döner; **JS precache'te olduğu için React doğru rotayı çizer ve araç çevrimdışı hesap yapar.** |
| `assets/*.js`, `*.css` | **Precache** | Hash'li ve değişmez. Çevrimdışı çalışmanın şartı bu. |
| `/fonts/` | **CacheFirst**, runtime | Dosya adı içeriğiyle sabit. Precache'e alınmadı: `unicode-range` sayesinde tarayıcı 37 alt kümenin yalnız gerekenini indiriyor, hepsini önden çekmek 388 KB israf olurdu. |
| `/api/` | **NetworkOnly** | Oturum çerezi ve hız sınırı akışına önbellek girmemeli. |

**Prerender'lı 38 HTML precache'e GİRMEZ** — hepsi `NetworkFirst` ile runtime
önbelleğine alınır (`alp-html-shells`, en çok 60 girdi). Precache'e girselerdi
her deploy 646 KB'lık HTML'i yeniden indirtirdi ve bayat kabuk riski geri
gelirdi.

`spa-fallback.html` precache'e **elle** eklenir (`additionalManifestEntries`):
o dosyayı `vite build` değil, ondan sonra koşan prerender adımı üretir, yani
glob'a yakalanamaz. Revizyon derleme zaman damgasıdır — sabit bir değer
verilseydi yeni kabuk eskisiyle aynı sayılıp hiç güncellenmezdi.

Precache toplamı: **~1,7 MB ham** (55 JS + CSS + logo + favicon), nginx gzip'i
altında yaklaşık üçte biri. Bu, "çevrimdışı **tam** çalışsın" hedefinin
karşılığıdır: 29 aracın hepsi ilk ziyaretten sonra ağsız açılır. Yalnız
ziyaret edilen aracı önbelleğe alan daha ucuz bir kurgu mümkündü ama brifin
hedefini karşılamazdı.

## 3. Güncelleme akışı — `autoUpdate`, ek UI yok

Brif "autoUpdate + Toast ile bilgilendirme" öneriyordu; bildirim kısmı
**yapılmadı**. Üç gerekçe:

1. Navigasyon zaten network-first: kullanıcı her yenilemede güncel HTML'i
   alıyor. "Yeni sürüm var, yenileyin" kartı, zaten otomatik olan bir şeyi
   kullanıcıdan istemek olurdu.
2. Bildirim `virtual:pwa-register/react`'i React ağacına sokardı. O ağaç
   prerender'da Node'da da kuruluyor (`vite build --ssr`) ve sanal modül
   orada çözülmez — prerender'ı kırardı ya da koşullu import gerektirirdi.
3. Açık sekmede eski chunk riski PWA'dan bağımsız olarak zaten var
   (nginx `no-store` + yeni deploy) ve karşılığı `ErrorBoundary`'dir.
   PWA bu durumu kötüleştirmiyor.

Kayıt React ağacının dışında, `src/main.jsx` sonunda yapılır — aynı sebeple.

## 4. Manifest ve ikonlar

`name` / `short_name` / `theme_color` (`#070c08`, `index.html`teki değerle
aynı) / `display: standalone` / `start_url: /`.

Manifest tek dil taşır (`lang: 'tr'`, `DEFAULT_LANG`) — arayüz iki dilli ama
manifest çalışma zamanında dile göre değişmez. Açıklama metni `index.html`in
`description` etiketiyle aynı cümledir.

Brif 07 İngilizce URL ağacını açtıktan sonra da böyle kaldı (`start_url: '/'`):
ayrı bir EN manifest'i ikinci bir YÜKLENEBİLİR UYGULAMA KİMLİĞİ demek olurdu ve
istenmiyor. Karar: `docs/en-url-karari.md` §7.

**İkonlar teknik borçtur.** Depodaki tek kaynak 64 px `favicon.png`; 192 ve
512 px sürümler ondan `sips` ile büyütüldü, yani kenarları yumuşak. Brif bu
yolu öngörüyordu ve başka kaynak yok (SVG ya da yüksek çözünürlüklü kare
işaret depoda bulunmuyor). Gerçek marka varlığı geldiğinde
`web/public/icon-{192,512}.png` değiştirilmeli; `maskable` sürüm de aynı
dosyayı kullanıyor, o zaman ayrı kenar boşluklu bir dosya üretilmeli.

## 5. nginx — ek kural gerekmedi

Brif `sw.js` için ayrı bir `no-store` kuralı öngörüyordu. Gerekmedi: bir
önceki brifte `location /` bloğu zaten `no-store` veriyor ve `sw.js` kökte
duruyor (`/assets/` ve `/fonts/` dışında kalan her şey gibi). Ölçülerek
doğrulandı.

CSP'de ek direktif de gerekmedi: `worker-src` yazılmadığı için tarayıcı
`script-src 'self'`e düşer ve service worker aynı kökenden gelir;
`manifest-src` de `default-src 'self'`e düşer.

## 6. Doğrulama

Gerçek çevrimdışı testi (DevTools → Offline) tarayıcı gerektirir ve bu
ortamda yapılamadı — **elle doğrulanması gereken tek madde budur.**
Otomatik olarak doğrulananlar:

- Üretilen `sw.js`: `skipWaiting` + `clientsClaim`, üç runtime kuralı
  (`NetworkFirst`/`CacheFirst`/`NetworkOnly`), cache adları,
  `networkTimeoutSeconds`, `precacheFallback`.
- Precache manifest'i: 62 girdi — 55 JS, CSS, logo, favicon, webmanifest ve
  `/spa-fallback.html`. Prerender'lı HTML **yok**, `woff2` **yok**, yüklü
  uygulama ikonları **yok** (istendiği gibi).
- **Precache'teki her URL nginx üzerinden 200 dönüyor** — tek eksik dosya
  service worker kurulumunu tümüyle düşürürdü, yani PWA sessizce hiç
  çalışmazdı.
- `sw.js` ve `manifest.webmanifest` `no-store` ile, `/fonts/` `immutable`
  ile servis ediliyor.
- Prerender'ın Node paketinde (`.prerender/`) service worker üretilmiyor.
- 1932 web testi yeşil.
