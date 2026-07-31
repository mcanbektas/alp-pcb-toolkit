# Prerender (SSG) kararı — 2026-07-31

Brif: `docs/brifler/03-prerender.md`. Bu belge brifin "uygulamadan ÖNCE
karar verilecekler" listesinin karşılığıdır; kararlar uygulanmadan önce
yazıldı, ölçümler uygulandıktan sonra eklendi.

## Sorun

Site saf SPA'dır: `BrowserRouter` + 32 tembel chunk. JS koşturmayan bir bot
her sayfada boş `<div id="root">` görür. 29 hesap aracının hiçbirinin
indekslenebilir içeriği yoktu ve sekme başlığı da yalnız tarayıcıda
düzeliyordu (`App.jsx` → `TitleSync`), yani botun gördüğü 38 sayfanın
başlığı da birebir aynıydı ("ALP PCB Toolkit"). Bu ürün kategorisi organik
aramayla yaşar.

## 1. Yöntem — (a) `react-dom/server` ile derleme sonrası render

Seçilen: brifin (a) şıkkı. `vite build` çıktısının üzerine, `dist/<yol>/
index.html` dosyaları üretilir.

Gerekçe:

- **Sıfır yeni runtime bağımlılığı.** `react-dom` zaten var; `react-dom/
  server` ve `react-router-dom/server` (StaticRouter) aynı paketlerden gelir.
  Elenen (b) puppeteer bir headless Chrome indirir — CI'da onlarca MB ve
  ayrı bir arıza yüzeyi, tek kazancı "gerçek tarayıcı" olması ki bizim
  ekranlarımız tarayıcı API'sine ilk render'da zaten dokunmuyor.
- **Elenen (c) Vite SSG framework'üne geçiş** kapsam dışı: yönlendirme,
  giriş noktası ve dağıtım biçimi baştan yazılırdı.

### `renderToString` değil `renderToPipeableStream`

Brif "rota başına ilgili ekranın eager import'u" öneriyordu. Gerekmedi ve
yapılmadı: `renderToString` bir Suspense sınırına geldiğinde fallback'i
basıp durur, yani 29 aracın gövdesi çıktıya hiç girmezdi — ve eager import
için `App.jsx`'in rota tablosunun İKİNCİ bir kopyası tutulurdu.

`renderToPipeableStream`'in `onAllReady` geri çağrısı bütün lazy chunk'lar
çözüldükten sonra tetiklenir, yani tam gövde elde edilir ve `App.jsx`'teki
`lazy()` yapısına hiç dokunulmaz. Rota listesi tek kaynakta kalır.

`App.jsx` yalnızca yönlendirici bakımından bölündü: `AppProviders` (Lang +
Notice, router'ın ÜSTÜ) ve `AppRoutes` (router'ın İÇİ). Tarayıcı
`BrowserRouter`, prerender `StaticRouter` sarar. Sağlayıcı sırası tek
yerde tanımlı kaldığı için iki yol aynı ağacı kurar.

### Ölçüm

38 sayfa **0,2 sn**'de üretiliyor (brifin bütçesi 1-2 dk). SSR paketinin
derlenmesi (`vite build --ssr`) ~0,7 sn. Toplam ek build maliyeti 1 sn'nin
altında.

## 2. Hydration — `hydrateRoot`, iki koruma ile

Seçilen: `hydrateRoot`. Elenen "React mount'ta üzerine yazsın" (createRoot)
seçeneği prerender'lı DOM'u atıp yeniden kurar — ilk boyamadan sonra gözle
görülür bir sıçrama demektir ve prerender'ın hız kazancını da harcar.

`hydrateRoot`'un şartı ilk client render'ının prerender'lı HTML ile birebir
aynı olmasıdır. İki yerde ayrışıyordu, ikisi de kapatıldı:

1. **Dil.** Prerender sunucuda koşar ve `localStorage`'ı göremez, yani
   varsayılan dille (tr) çizer. Tarayıcıda `LangProvider` ilk render'da
   depodaki seçimi okuyordu — EN seçmiş kullanıcıda ağaç ayrışırdı.
   Düzeltme PORT katmanına değil sağlayıcıya gitti: ilk render artık her
   zaman `DEFAULT_LANG`, depodaki seçim mount'tan SONRA uygulanır.
   Karşılığı EN kullanıcısında bir karelik TR görüntüsüdür — ama o kare
   prerender'la zaten kaçınılmazdı (sunucu ziyaretçinin dilini bilmiyor),
   bu değişiklik yalnızca React'e "beklenen" diyor.
2. **Sorgu dizesi.** Prerender çıktısı sorgusuz üretilir; `?hesap=<id>` ile
   açılan araç ekranı ise ilk render'da `LINK_LOADING` durumundadır
   (`useSavedCalculation`). Sorgu taşıyan istekte `hydrateRoot` yerine
   `createRoot` kullanılır — o sayfa zaten kullanıcıya özeldir, SEO
   konusu değildir.

Kök düğüm boşsa (prerender'lanmamış rota, aşağıya bkz.) yine `createRoot`
kullanılır.

## 3. Dil — yalnız varsayılan (tr)

Brifin kararı korundu: yalnız `tr` prerender'lanır. EN sürümü ayrı URL'ler
ister ve `hreflang` ile birlikte **Brif 07**'nin (EN URL'ler) işidir. Tek
URL'e iki dil basmak, botun hangisini indeksleyeceğini belirsiz bırakırdı.

## 4. Kapsam — hangi rotalar

Prerender'lanan: `/`, 8 kategori sayfası, `path`i olan 29 araç = **38 sayfa**.
Kaynak `src/data/categories.js` — `build-sitemap.mjs` ile AYNI kaynak, yani
sitemap ile prerender listesi ayrışamaz.

Prerender'lanmayan: `/giris`, `/kayit`, `/parola-unuttum`, `/parola-sifirla`,
`/e-posta-dogrula`, `/projelerim`, `/hesabim`, `/proje/:id`. Gerekçe:
indekslenmeleri istenmez ve içerikleri kullanıcıya özeldir.

## 5. Meta — başlık rota başına, açıklama olduğu kadar

- **`<title>` rota başına yazılır**, `TitleSync` ile birebir aynı kalıpla
  (`<ad> — ALP PCB Toolkit`) ve aynı kaynaktan (`categories.js`). Prerender'ın
  en büyük tek kazancı budur: 38 sayfa artık aynı başlıkla indekslenmiyor.
- **`<meta name="description">` yalnız kategori sayfalarında** rota başına
  yazılır — açıklama katalogda ZATEN var (`category.desc`). Araç sayfaları
  için katalogda karşılığı yok ve uydurulmadı; kabuktaki genel açıklama
  korunur. Araç sayfasının kendi tanıtım paragrafı gövdede prerender'lı
  olarak duruyor, yani arama motorunun kendi özetini çıkaracağı metin var.

## 6. nginx — iki değişiklik

Brifin öngördüğü gibi `try_files` kuralı prerender'lı dosyaları kendiliğinden
buluyor, ama iki nokta düzeltilmeden bırakılamazdı.

Nihai kural (iki dosyada da aynı — `nginx.conf` ve `nginx.prod.conf.template`):

```nginx
location /fonts/ { …immutable… }
location / {
    add_header Cache-Control "no-store, must-revalidate" always;
    …güvenlik başlıkları…
    try_files $uri $uri.html $uri/index.html /spa-fallback.html /index.html;
}
```

Buraya üç ölçümden geçilerek gelindi; üçü de brifin öngörmediği ama gerçek
sorunlardı.

### (a) SPA geri düşüşü ayrı dosyaya alındı

`dist/index.html` artık BOŞ kabuk değil, prerender'lı ANA SAYFA. Geri düşüş
onu göstermeye devam etseydi `/giris` isteği ana sayfanın HTML'ini alır ve
her giriş sayfası açılışında hydration ayrışırdı — kenar durum değil, her
kullanıcının gördüğü yol. Prerender boş kabuğu `dist/spa-fallback.html`
olarak ayırır.

Zincirin sonundaki `/index.html` bilinçli emniyettir: prerender adımı hiç
koşmamış bir `dist/` ile de site açılır, yalnız prerender kazancı olmaz.

### (b) Çıktı `<yol>/index.html` değil `<yol>.html`

İlk uygulama dizin biçimindeydi (brifin varsaydığı gibi). Ölçüldüğünde
nginx `/arac/trace-width` isteğine **301 → `/arac/trace-width/`** dönüyordu:
dizin isteğine eğik çizgi ekleme davranışı. Sitemap'teki URL eğik çizgisiz
olduğu için bot her sayfada önce bir yönlendirme görürdü ve kullanıcının
adres çubuğu değişirdi. Düz `.html` dosyası `try_files $uri $uri.html` ile
yönlendirmesiz servis edilir.

### (c) `no-store` ayrı blokta değil, `location /` içinde

Önce `location ~ …\.html$` biçiminde ayrı bir dosya-adı bloğu denendi.
Ölçüm: `/giris` **Cache-Control başlıksız** dönüyordu — `try_files` iç
yönlendirmesi location'ı YENİDEN SEÇMEZ, yani geri düşüşle gelen istekler o
bloğa hiç uğramıyordu. Bayat kabuk sorunu tam da orada duruyordu. Kural
isteğin gerçekten düştüğü bloğa taşındı.

Karşılığında `/fonts/` kendi bloğunu aldı: no-store oraya uygulansaydı her
sayfa açılışında 26 `woff2` yeniden inerdi. `robots.txt`, `sitemap.xml` ve
`favicon.png` no-store alır — küçük dosyalar, zararsız.

`$uri/index.html` zincirde ŞART: kök isteğinde (`/`) ne `$uri` ne `$uri.html`
eşleşir ve prerender'lı ana sayfa atlanıp geri düşüşe inilirdi (ölçüldü).
`$uri/` yazılmadı — var olmayan bir dizin isteğinde 403'e düşerdi.

## 7. SSR'da patlayan yer çıktı mı

Render sırasında hiçbir yer patlamadı. Tarama (`window.`/`document.`/
`navigator.`) tüm tarayıcı erişimlerinin `useEffect` ya da olay işleyicisi
içinde olduğunu gösterdi; ikisi de sunucuda koşmaz. `lib/storage.js`
`browserStorage()` zaten `typeof localStorage === 'undefined'` durumunda
`nullStorage`'a düşüyor — port katmanı SSR'ı baştan öngörmüş.

Ama **hydration'da dört ekran ayrıştı** ve bu ancak ölçünce görüldü:
`clearance-creepage-padstack`, `bga-breakout`, `stack-up-planlayici`,
`thermal-relief`. Ortak kök: profil hook'ları (`useDfmProfiles`,
`useClearanceProfiles`, `useSavedStackups`) depoyu **ilk render'da**
okuyordu — `useState(() => store.list())` ve `available = storage !==
nullStorage`. Sunucuda depo yok, tarayıcıda var; ağaç ayrışıyordu.

Düzeltme brifin kısıtı gereği ekrana değil hook katmanına gitti (port
katmanı zaten doğruydu): üç hook da artık boş liste + `available: true` ile
başlar, depoyu mount'tan sonra okur. `LangProvider` ile aynı takas — kayıtlı
profili olan kullanıcı bir kare "profil yok" görür.

## 8. Doğrulama

Tarayıcı otomasyonu (Playwright/puppeteer) projede yok ve brif için kalıcı
bağımlılık eklenmedi. Hydration bunun yerine geçici bir `jsdom` kurulumuyla
(`npm install --no-save`, sonra kaldırıldı) **38 rotanın hepsinde** ölçüldü:
prerender'lı HTML jsdom'a yüklendi, `main.jsx`'in kurduğu ağacın aynısı
`hydrateRoot` ile bağlandı ve `console.error`/`console.warn` toplandı.

| Koşum | Sonuç |
|---|---|
| Depoda dil seçimi yok | 38/38 rota temiz |
| Depoda `lang=en` | 38/38 rota temiz |
| (düzeltme öncesi) | 4 DFM ekranı: 8-13 hydration hatası |

nginx üzerinden (docker yığını ayakta) ayrıca doğrulandı: araç/kategori
sayfaları 200 + rota başına `<title>` + gövdede `<h1>`, yönlendirme yok;
`/giris` ve bilinmeyen yol geri düşüş kabuğunu alıyor; HTML'de `no-store`,
`/fonts/` altında `immutable`.
