# İngilizce URL'ler + hreflang kararı — 2026-07-31

Brif: `docs/brifler/07-en-urller.md`. O brif spec değil, karar çerçevesiydi;
bu belge onun "o gün karara bağlanacaklar" listesinin karşılığıdır.
Önkoşulu olan Brif 03 bitti — `docs/prerender-karari.md` ile birlikte okunur,
özellikle §2 (hydration) ve §3 (dil: yalnız `tr`).

## Sorun

Arayüz iki dilliydi ama **URL tek dilliydi**. `/arac/gerilim-bolucu` hem TR
hem EN içeriği gösteriyordu ve hangisinin gösterileceğini `localStorage`
belirliyordu. Sonuçları:

- Bot yalnızca TR sürümü görür. İngilizce çevirinin tamamı — 29 ekranın
  metni, formülleri, yorumları — indekslenemez içerikti.
- Aynı URL'e iki dil basmak `hreflang`i imkânsız kılar: alternatif sürümün
  ayrı bir adresi yok ki bildirilebilsin.
- Paylaşılan bir bağlantı alıcının diline göre farklı sayfa gösteriyordu.
- Prerender yalnız `tr` üretiyordu (`prerender-karari.md` §3) ve EN kullanıcı
  ilk karede TR görüyordu; bu, hydration uğruna bilerek kabul edilmiş bir
  takastı.

## 1. URL şeması — `/en/tool/<en-slug>`

Seçilen: brifin 1. şıkkı, tam İngilizce yol.

```
/                          →  /en
/kategori/empedans         →  /en/category/controlled-impedance
/arac/gerilim-bolucu       →  /en/tool/voltage-divider
/giris                     →  /en/login
/proje/42                  →  /en/project/42
```

Elenen **`/en/arac/<tr-slug>`** (yalnız dil öneki): ucuzdu ama İngilizce
ziyaretçiye karma dilli bir adres gösterirdi ve URL'deki anahtar sözcük
kazancı — bu ürün kategorisinde aramanın taşıyıcısı — hiç oluşmazdı.

Elenen **tek URL + `hreflang`siz**: brifin kendi notu doğru, SEO'da zayıf.
Bugünkü hâlin devamı demekti.

**Dil öneki BÜTÜN rotaları kapsar**, yalnız indekslenenleri değil. Auth ve
hesap sayfaları prerender'lanmıyor ve indekslenmesi istenmiyor, ama EN
ağacındaki kullanıcı "Sign in"e bastığında dilinden düşmemeli. Önek
kapsamasaydı `/en/tool/...` → `/giris` geçişi sessizce TR'ye dönerdi.

### Slug'lar `categories.js`'te, tek kaynak

Kategoriye `slugEn`, araca `slugEn` alanı eklendi. Araç kaydının `path`
alanı (TR, tam yol) **değişmedi** — "path varsa aktif" kuralı 38 yerde
okunuyor ve o kural bozulmadan kalmalıydı. EN yolu `slugEn`den türetilir:

```js
toolPath(tool, 'tr') === tool.path                 // '/arac/gerilim-bolucu'
toolPath(tool, 'en') === `/en/tool/${tool.slugEn}` // '/en/tool/voltage-divider'
```

`path` varken `slugEn` eksik olamaz; `pages/tools/toolKeys.test.js` bunu
denetler. Eksik kalsaydı o aracın EN sayfası sessizce üretilmez, TR sayfası
da var olmayan bir alternatife `hreflang` verirdi.

## 2. Yönlendirme matrisi — eski TR yolları KANONİK, 301 yok

Brif "eski TR yolları 301 mi kalır mı" diye soruyordu. Cevap: **kalır ve
kanoniktir.** TR sürüm taşınmadı, yanına ikinci bir dil ağacı kondu.
Yönlendirme yazılmadı çünkü yönlendirilecek bir şey yok — hiçbir TR adresi
adres değiştirmedi.

| Yol | Durum |
|---|---|
| `/arac/<tr-slug>` | Değişmedi. Kayıtlı bağlantılar, sitemap girdileri, e-posta bağlantıları aynen çalışır. |
| `/en/tool/<en-slug>` | Yeni. |
| `#/arac/...` (eski hash) | `main.jsx`teki yönlendirme duruyor, dokunulmadı. |
| API'nin ürettiği bağlantılar | TR kalır (aşağıda §8). |

### `?hesap=<id>` — parametre adı İKİ AĞAÇTA DA Türkçe

`/arac/gerilim-bolucu?hesap=7` ve `/en/tool/voltage-divider?hesap=7` aynı
kaydı açar. Sorgu parametresinin adı çevrilmedi ve bu bilinçlidir:

- Paylaşılmış bağlantı kırılmaz. Parametre adı çevrilseydi bugüne kadar
  paylaşılan her kayıt bağlantısı EN ağacında sessizce **bağsız** açılırdı —
  hata vermeden, boş formla.
- Parametre adı kullanıcıya görünen metin değil; iki dilli metin kuralı
  (CLAUDE.md → Dil) arayüz metnini kapsar, protokol alanlarını değil.
- `useSavedCalculation` tek `CALC_PARAM` sabitini okur; ikinci ad ikinci kod
  yolu demekti.

Aynı gerekçeyle `?token=`, `?email=` gibi auth parametreleri de tek adlıdır.

## 3. Dil kaynağı — YALNIZ URL, `localStorage` kaldırıldı

Brifin 4. sorusu: URL mi kazanır, `localStorage` mı. Cevap: **URL, tek
başına.** `i18n.js`ten `readLang`/`writeLang`/depolama anahtarı silindi.

Gerekçe zincir hâlinde:

1. **İki kaynak = belirsiz kanonik.** `/arac/gerilim-bolucu` TR sayfadır ve
   `hreflang` ile öyle bildirilir. Depodaki seçim onu mount'tan sonra EN'e
   çevirebilseydi, kanonik olarak TR bildirilen bir adres kullanıcıya EN
   içerik gösterirdi.
2. **Hydration deterministik oldu.** Dil artık URL'den okunuyor; prerender
   ve tarayıcı aynı girdiden aynı ağacı kuruyor.
   `prerender-karari.md` §2'de "EN kullanıcısında bir karelik TR görüntüsü"
   diye kabul edilen takas **ortadan kalktı** — EN kullanıcı EN adresteyse
   ilk kareden itibaren EN görür. `LangProvider`daki "ilk render her zaman
   `DEFAULT_LANG`" kuralı da gereksizleşti ve kaldırıldı.
3. **Kalıcılık kayboluyor değil, yer değiştiriyor.** Bağlantı ve yer imi
   öneki taşır; EN ağacındaki her iç bağlantı EN kalır. Kaybedilen tek
   senaryo: çıplak alan adına gelen EN kullanıcı TR ana sayfa görür ve bir
   tık atar.
4. **Otomatik yönlendirme elendi.** Depoya bakıp `/`yi `/en`e çevirmek,
   Google'ın algılanan dile göre otomatik yönlendirmeye karşı tavsiyesine
   aykırı ve bot ile kullanıcıya farklı sayfa gösteriyor.

Karşılığında `LangProvider` sadeleşti: depo portu almıyor, `setLang`
taşımıyor, yalnız `useLocation()` okuyor. `<html lang>` yine dille birlikte
değişiyor — `text-transform: uppercase` kuralı için hâlâ şart.

### Tek istisna: rapor yakalama

`hooks/useLangCapture.js` ekranı iki `flushSync` arasında başka bir dile
çevirip çıktısını okur (Türkçe ekrandan İngilizce rapor). Bu **gezinme
değildir** — kullanıcı bir düğmeye basmıştır, form durumu ve `?hesap=` bağı
yerinde kalmalıdır, yani adres çubuğu değiştirilemez. Sağlayıcı bu yüzden
GEÇİCİ bir geçersiz kılma taşır (`setLangOverride`); başlangıcı `null`dır
(ilk render her zaman URL'in dili — hydration ayrışmaz) ve geri alma da
`null` yazar, yani "doğru dil" ikinci bir yerde saklanmaz.
`setLang` bu değildir: kalıcı bir seçim yazmaz, kullanıcıya hiç görünmez.

### Dil düğmeleri artık `<Link>`

`LangSwitch` düğme değil bağlantı basar. İki kazanç:

- **Bot EN sürümü keşfeder.** `hreflang` bir ipucudur; taranabilir bir
  bağlantı ise doğrudan yoldur. Düğme, JS koşturmayan bot için hiçbir yere
  gitmez.
- Semantik doğru: dil değiştirmek artık gezinmedir. Seçili dilin bağlantısı
  o anki sayfanın kendisini gösterir, `aria-current="page"` ile işaretlenir
  (`aria-pressed` kalktı — o, düğme sözlüğüne aitti).

Karşılık gelen adres `translatePath` ile bulunur; eşi olmayan bir yolda
(bilinmeyen rota) dilin ana sayfası hedeflenir, kullanıcı dilsiz kalmaz.

## 4. Yol sözlüğü — `src/lib/routes.js`

Yeni saf modül. React, DOM, tarayıcı bilmez; `categories.js` ile statik bir
rota tablosundan iki dilli yol sözlüğü kurar.

```js
langFromPath('/en/tool/voltage-divider')  // 'en'
staticPath('login', 'en')                 // '/en/login'
categoryPath(cat, 'en')                   // '/en/category/controlled-impedance'
toolPath(tool, 'en')                      // '/en/tool/voltage-divider'
translatePath('/arac/gerilim-bolucu?hesap=7', 'en')
//   → '/en/tool/voltage-divider?hesap=7'
```

Kural: **kaynak kodda her zaman KANONİK (TR) yol yazılır**, çeviri render
anında yapılır. İkinci bir yol sözlüğü ekranlara dağılmaz, `lang === 'en' ?
… : …` koşulu hiçbir bileşene girmez.

Bunu taşıyan bileşen `components/LangLink.jsx`: `react-router`ın `Link`ini
sarar, `to`yu geçerli dile çevirir. 38 dosyadaki `<Link to="/kategori/…">`
çağrıları birebir `<LangLink>`e çevrildi — `to` değerleri değişmedi.
`LangLink` sorgu ve `#` parçasını korur; tanımadığı bir yolu dil önekiyle
geçirir (dil korunur, bilinmeyen yol yine `NotFound`a düşer).

Düz `Link` yalnız katalog kaydını ZATEN elinde tutan beş yerde kaldı
(`Home`, `CategoryPage`, `App.jsx` altbilgisi, `CalculationList`): oralarda
yol `categoryPath`/`toolPath` ile doğrudan geçerli dilde üretiliyor, çevrilecek
kanonik bir yol yok.

## 5. Rota tablosu katalogdan üretilir

`App.jsx` 29 aracı elle `<Route>` olarak sayıyordu. İki dille bu 58 satır
demekti ve ikinci kopya ilk gün ayrışırdı. Rota listesi artık
`categories.js`ten `LANGS.flatMap(...)` ile üretiliyor; elle tutulan tek
şey `TOOL_SCREENS` — araç `id`'sinden tembel bileşene eşleme.

`toolKeys.test.js` bu eşlemenin katalogla tam örtüştüğünü denetler:
katalogda aktif olup `TOOL_SCREENS`te olmayan bir araç, elle yazılan rota
tablosunda olduğu gibi sessizce **rotasız** kalırdı — 404, build hatası yok.

`TitleSync` de iki dili tanır. Bu arada bir kusur düzeldi: kategori
sayfalarında prerender başlığı doğru yazılıyor ama tarayıcıda `TitleSync`
onu jenerik "ALP PCB Toolkit"e **geri çeviriyordu** (yalnız araçlara
bakıyordu). Artık kategori başlığı da rota başına yazılır.

## 6. Prerender, sitemap, hreflang

Üçü aynı kaynağa bağlandı: `src/lib/routes.js` → `indexablePages()` iki dilli
sayfa listesini üretir, `build-prerender.mjs` ve `build-sitemap.mjs` onu okur.
Üreteçler için ayrı bir kopya YAZILMADI — uygulamanın kendi yol sözlüğü zaten
saf ve React'siz, Node'dan doğrudan içe aktarılıyor. Ayrı liste tutulsaydı
sitemap'te olup prerender'lanmamış (ya da tersi) sayfalar oluşurdu;
`prerender-karari.md` §4'teki "iki liste ayrışamaz" değişmezi korunuyor,
artık dil boyutuyla.

**Sayfa sayısı 38 → 76.** Ölçüm: prerender 0,2 sn → 0,3 sn. Bütçe (1-2 dk)
hâlâ uzakta.

Rota başına yazılanlar:

| Etiket | Değer |
|---|---|
| `<html lang>` | Rotanın dili. Kabuk `tr` doğar, EN sayfalarda değiştirilir. |
| `<title>` | Rotanın dilinde, `TitleSync` ile aynı kalıp. |
| `<meta name="description">` | Kategori sayfalarında, rotanın dilinde (`category.desc`). Araçlarda yok — katalogda karşılığı yok ve uydurulmaz (§5, prerender kararı). |
| `<link rel="canonical">` | Sayfanın kendi mutlak adresi. |
| `<link rel="alternate" hreflang="tr\|en">` | Her iki sürüm, **karşılıklı** — TR sayfa da kendini listeler, aksi hâlde küme geçersizdir. |
| `<link rel="alternate" hreflang="x-default">` | TR sürüm. Varsayılan dil odur. |

`hreflang` ve `canonical` mutlak adres ister (göreli yazılamaz), yani
`VITE_SITE_URL`e bağlıdır. Değişken yoksa sitemap'in bugünkü davranışı
korunur: placeholder alan adı + konsola uyarı. Ortak hâle getirildi
(`scripts/site-url.mjs`) ve uyarı artık hreflang'i de anıyor — alan adı
alınmadan üretilen bir `dist/` yalnız sitemap'te değil, 76 sayfanın
`<head>`inde de placeholder taşır.

Sitemap 38 → **76 URL**; her `<url>` kendi `xhtml:link` alternatiflerini
taşır (`xmlns:xhtml` eklendi).

Prerender'lanmayanlar değişmedi ve dil önekli sürümleri de
prerender'lanmaz: `/giris`, `/kayit`, `/parola-unuttum`, `/parola-sifirla`,
`/e-posta-dogrula`, `/projelerim`, `/hesabim`, `/proje/:id` ve `/en/…`
karşılıkları.

## 7. Değişmeyenler

- **nginx.** `try_files $uri $uri.html $uri/index.html /spa-fallback.html
  /index.html` zinciri EN yollarını olduğu gibi buluyor: `/en/tool/x` →
  `dist/en/tool/x.html`, `/en` → `dist/en.html`. Yeni kural gerekmedi,
  ölçülerek doğrulandı.
- **PWA.** Prerender'lı HTML zaten precache'e girmiyor (`pwa-karari.md`
  §2), yani 38 sayfa daha eklenmesi precache'i büyütmüyor. Ağsız açılan
  bilinmeyen EN rotası `spa-fallback.html`i alır ve React doğru ekranı
  çizer — dil URL'den okunduğu için **çevrimdışında da doğru dilde**.
- **Manifest.** `lang: 'tr'`, `start_url: '/'` (`pwa-karari.md` §4).
  Manifest çalışma zamanında dile göre değişmez; ayrı bir EN manifest'i
  ikinci bir yüklenebilir uygulama kimliği demek olurdu ve istenmiyor.
- **`robots.txt`.** `Allow: /` zaten `/en/`yi kapsıyor.
- **Hesap motorları, `text.js` sözlükleri, rapor üretimi.** Bu iş yalnız
  adresleme katmanına dokundu; çeviri zaten tamamdı.

## 8. Bilinen sınır — e-posta bağlantıları TR (KAPANDI)

Bu brif bittiğinde `api/Alp.Api/Auth/AuthEndpoints.cs` doğrulama ve parola
sıfırlama bağlantılarını `{FrontendBaseUrl}/e-posta-dogrula` ve
`/parola-sifirla` olarak üretiyordu; EN arayüzden kayıt olan kullanıcı TR
sayfaya düşüyordu. Burada düzeltilmedi çünkü doğru düzeltme yalnız yol
çevirisi değildi: postanın gövdesi de tek dilliydi, yani kullanıcının dilinin
istekle birlikte sunucuya taşınması gerekiyordu.

**Ayrı bir iş olarak yapıldı ve kapandı: `docs/eposta-dili-karari.md`.** Dil
istek gövdesinde `lang` alanıyla taşınır, metin sunucuda iki dilli bir
sözlükte durur (kimlik avı yüzeyi açmamak için bilinçli kural istisnası) ve
yol tablosunun istemciyle ayrışmasını bir bekçi test engeller.

## 9. Doğrulama

- Birim: `src/lib/routes.test.js` — çeviri gidiş-dönüşü (her rota `tr → en →
  tr` ile kendine dönmeli), sorgu/hash korunması, bilinmeyen yol, `/en`
  sınırı (`/energy` EN sayılmamalı).
- `toolKeys.test.js`: `path` varsa `slugEn` var; `slugEn`ler benzersiz ve URL
  güvenli; `TOOL_SCREENS` katalogla örtüşüyor.
- `pages/langLink.guard.test.js` — bağlantı katmanı bekçisi: düz `Link` yalnız
  izinli beş dosyada, ekran/bileşen kaynağında çıplak `/en/...` yolu yok. Bu
  kural kırıldığında tek belirti dil ağacından düşmüş bir kullanıcıdır; build
  de tip denetimi de sessiz kalır.
- Tarayıcı: `e2e/dil.spec.js` yeniden yazıldı (5 test) — dil bağlantısı
  karşılık gelen URL'e gidiyor, `/en/tool/trace-width` doğrudan açıldığında
  `<html lang="en">` ve İngilizce `h1`, yenilemede korunuyor, İngilizce
  ağaçta gezinirken `LangLink` çevirisi tutuyor, `?hesap=` dil geçişinde
  taşınıyor. Çevrimdışı koşuma da bir test eklendi (`e2e-pwa/offline.spec.js`):
  ağsız açılan İngilizce rota tek geri düşüş kabuğuyla yine İngilizce çiziliyor.
- Derleme: 76 sayfa 0,3 sn; sitemap 76 URL; `<head>` içinde canonical + üç
  `hreflang` satırı; `dist/en.html` + `dist/en/**` 38 dosya.
- **Hydration 76/76 temiz.** `prerender-karari.md` §8'in yöntemi tekrarlandı:
  geçici `jsdom` (`npm install --no-save`, sonra kaldırıldı), prerender'lı
  HTML yüklenip `hydrateRoot` ile bağlandı, `console.error`/`warn` toplandı.
  Ölçüm ortamının kendi gürültüsü (act uyarıları, React Router future flag,
  vitest'in `logo.png`'yi derlenmiş yol yerine kaynak yoldan çözmesi) elendi;
  geriye HİÇBİR ayrışma kalmadı. Dil kaynaklı ayrışma sınıfı zaten ortadan
  kalkmıştı (§3), ölçüm bunu doğruladı.
- 1966 birim testi + 18 tarayıcı + 5 çevrimdışı testi yeşil.
- nginx üzerinden (docker yığını ayakta, `http://localhost:8080`) ayrıca
  doğrulandı: TR ve EN araç/kategori sayfaları 200 ve **yönlendirmesiz**,
  `/en` → `dist/en.html`, rota başına `<title>` + `<html lang>` + canonical +
  üç `hreflang` satırı, sitemap 76 url, `no-store` ve CSP başlıkları yerinde.
- **Elle doğrulanan tek madde — rapor dili yakalama.** `useLangCapture`
  oturum gerektirdiği için e2e kapsamı dışında (tarayıcı testleri bilerek
  yalnız anonim akışları kapsıyor). Giriş yapılıp aynı araçtan iki dilde
  rapor indirildi: biri Türkçe, biri İngilizce çıktı ve ekran kendi dilinde
  kaldı — yani geçici geçersiz kılma da geri alma da çalışıyor (§3).
