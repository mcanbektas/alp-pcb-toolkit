# ALP PCB Toolkit

PCB tasarımı için çevrim içi donanım mühendisliği karar destek araçları.

**Hesapların tamamı tarayıcıda çalışır.** Hiçbir hesap sunucuya gitmez ve oturum açılmamışken
bütün araçlar tam çalışır. Backend yalnızca üyelik, proje/hesap kaydı ve PDF/Excel rapor
üretimi için vardır.

Depo iki parçadır:

| dizin | ne | yığın |
| --- | --- | --- |
| `web/` | arayüz ve bütün hesap motorları | Vite + React 18 + react-router-dom |
| `api/` | üyelik, proje/hesap kaydı, rapor üretimi | ASP.NET Core 9, Identity + JWT, EF Core, QuestPDF/ClosedXML |
| `deploy/` | kendi sunucumuza dağıtım yığını | nginx + api + postgres, Docker Compose |

Arayüz iki dillidir — **Türkçe / English** — ve dil başlıktaki düğmeden değiştirilir. Varsayılan
Türkçedir: araç adlarının ve mühendislik terimlerinin karşılığı önce Türkçe yazıldı, İngilizce
onun çevirisidir. Seçim tarayıcıda saklanır.

Sonuçlar yaklaşık mühendislik tahminleridir. Her ekran kullandığı denklemi, ara değerleri,
geçerlilik sınırını ve yöntemin nereden geldiğini birlikte gösterir — bir sonuç kapalı
formdan mı yoksa kaynağı belirsiz bir yaklaşımdan mı geliyor, ekranda yazar.

## Geliştirme

```bash
cd web
npm install
npm run dev         # http://localhost:3000  (vite.config.js: port 3000, strictPort)
npm run build       # dist/
npm run preview

npm test            # vitest run — saf hesap fonksiyonları + rapor bölümleri + metin bekçileri
npm run test:watch
npm run fonts       # src/fonts.css'i yeniden üretir (bkz. "Yazı tipleri")
```

```bash
cd api
dotnet build Alp.Api.sln
dotnet test Alp.Api.sln               # xunit — sunucu kuralları, bkz. aşağıdaki not
dotnet run --project Alp.Api          # http://localhost:5000, uçlar /api altında
```

```bash
cd deploy
cp .env.example .env                  # en az POSTGRES_PASSWORD ve JWT_KEY doldurulur
docker compose up -d --build          # http://localhost:8080 (nginx + api + postgres)
```

Linter kurulu değildir. Test kapsamı bilinçli olarak dardır: **saf fonksiyonlar test edilir,
React bileşeni testi yazılmaz.** Arayüz doğrulaması `npm run build` + tarayıcıda elle kontrol
ile yapılır. Saf sayılan üç yer: `src/lib/`, ekranların `report.js` dosyaları ve ekranların
`text.js` sözlükleri.

Son ikisi bileşen render etmeden denetlenir: `dfmTextPaths.test.js` kaynak dosyaları metin
olarak okuyup her `text.…` yolunu iki dilde yürütür, `toolKeys.test.js` ise araç anahtarı ↔
katalog eşleşmesini ve her ekranın kayıt bağını denetler. Bu iki kural build'den ve tip
denetiminden kaçar.

`docs/spec.md` §13'ün altı referans testi (microstrip, via direnci, PDN hedef empedansı,
junction sıcaklığı, direnç kodu, yüklü gerilim bölücü) ilgili motor eklendiğinde teste
dönüşür; motor testsiz merge edilmez.

Sunucu tarafında `api/Alp.Api.Tests` (xunit) var ve kapsamı orada da kural bazlıdır: rapor
önizlemesi süzmesi, boyutsuz SVG kapısı, logo tür tespiti, kalınlık kayıtlarında ad tekliği ve
50 kayıt sınırı, proje-hesap sahipliği. Uçlar HTTP üzerinden değil, işleyicileri doğrudan
çağırarak sınanır; veritabanı bellek içi SQLite'tır ve şema modelden kurulur, çünkü `InMemory`
sağlayıcısı benzersiz dizin zorlamaz. CI ayrı bir adımda koşturur, veritabanı servisi
gerekmez. Kapsam dışı bırakılanlar ve gerekçeleri: `docs/uyelik-ve-rapor-plani.md` §25.

### Yazı tipleri

Üç aile (IBM Plex Sans, IBM Plex Mono, Chakra Petch) depoda durur ve siteyle birlikte
servis edilir; sayfa hiçbir dış kaynağa istek atmaz. İki dizin, iki tüketici:

- `web/public/fonts/` — sitenin indirdiği `woff2` alt kümeleri (`latin`, `latin-ext`, `greek`
  ve bizim kestiğimiz `symbols`). Yalnız bunlar `dist/`e ve web imajına girer.
- `assets/report-fonts/` — PDF raporuna gömülen tam kapsamlı `ttf`ler. api imajı bunları
  `/app/fonts` altına alır (`api/Dockerfile`), `Reports__FontsPath` oraya bakar. Site bu
  dosyaları hiç indirmez; `public/` altında dururlarken yine de `dist/`e ve web imajına
  giriyorlardı.

Lisans: SIL Open Font License 1.1; metin her iki dizinde `OFL-*.txt` olarak durur.

**`web/src/fonts.css` üretilmiş bir dosyadır, elle düzenlenmez.** Üreteci
`web/scripts/build-fonts.mjs`; aile, ağırlık ve alt küme listesi orada tek tablodadır:

```bash
cd web
npm run fonts                 # yalnız src/fonts.css'i yeniden üretir
npm run fonts -- --fetch      # font dosyalarını da indirir (ağ gerekir)
npm run fonts -- --symbols    # sembol alt kümesini tam ttf'den keser (ağ + fonttools)
npm run fonts -- --check      # üretilmiş dosya güncel mi (çıkış kodu 0/1)
npm run fonts -- --coverage   # sitedeki karakterler alt kümelerde var mı
```

Yeni ağırlık ya da alt küme gerektiğinde betikteki `FAMILIES` tablosuna eklenir, `--fetch`
ile koşturulur, inen dosyalar ve `fonts.css` aynı commit'e girer. Ağırlık dosyası inmeden
CSS'e yazılırsa tarayıcı var olanı sentetik kalınlaştırır ve harfler bozulur; üreteç bu yüzden
CSS'i yazmadan önce çağırdığı her dosyayı diskte arar ve bulamazsa durur.

Kaynaklar betikte sabitlenmiştir — sürüm yükseltmek bilinçli bir adımdır: `woff2` dosyaları ve
`unicode-range` değerleri `@fontsource` paketlerinden, PDF'e gömülen tam kapsamlı `ttf`ler ile
lisans metinleri `google/fonts` deposunun sabit bir commit'inden gelir. `--fetch` her dosyayı
diskteki ile karşılaştırıp yalnız değişenleri bildirir, yani beklenmedik bir değişiklik
commit'ten önce görünür.

**Dördüncü alt küme bizimdir: `symbols`.** Mühendislik metninin kullandığı `→`, `←`, `≈`, `≤`,
`≥`, `√`, `∞`, `✓` ve alt/üst simgeler Google'ın yayınladığı `latin` / `latin-ext` / `greek`
alt kümelerinin hiçbirinde yok — glif ailenin tam `ttf`sinde duruyor, alt küme dosyasına
girmemiş. Aralığı genişletmek işe yaramaz; `--symbols` alt kümeyi tam `ttf`den keser
(`web/scripts/subset-symbols.py`, `fontTools`). Aralık dosyanın **içindeki** kod noktalarıdır
ve aile başına ayrıdır — kayıt `web/scripts/font-symbols.json`, o da üretilmiş bir dosyadır.
Kesme kaynağı olan tam `ttf`ler depoya girmez; geçici dizine inip kesildikten sonra silinir.

`--symbols` için makinede `fontTools` + `brotli` gerekir
(`python3 -m pip install --user fonttools brotli`). Depoya yalnız çıkan `woff2` girdiği için
font kümesini değiştirmeyen biri bu araçlara hiç ihtiyaç duymaz. Üretim tekrarlanabilir:
kesilen dosyanın `head.modified` damgası sabitlenir, yoksa her koşu farklı bayt üretirdi.

Kalan sınırlar — üçü de fontlar Google'dan gelirken de böyleydi:

- IBM Plex Mono'nun `greek` alt kümesi yayınlanmıyor; mono metindeki Ω sistem yazı tipinden
  çizilir.
- Sembol listesindeki 38 karakterin **12'si üç ailenin tam `ttf`sinde de yok**
  (`⁻ ₐ ₙ ∈ ∝ ∠ ∥ ≪ ⌈ ⌉ □ ✗`) — kesilecek glif olmadığı için bunlar sistem yüzünden çizilir.
  `--coverage` hem bunları hem aile başına eksikleri sayar.
- Chakra Petch'in charset'i dar: `✓`, `↔` ve `─` başlıkta sistem yüzünden gelir, gövdede
  (IBM Plex Sans/Mono) kendi fontumuzdan.

PDF tam `ttf` kullandığı için alt küme sınırlarından etkilenmez.

## Mimari

Bağımlılık yönü tek yönlüdür ve asla tersine çevrilmez:

```
pages → components → hooks → lib
```

Araç ekranları `src/App.jsx` içinde `lazy` ile yüklenir: ilk boyamada yalnızca ana sayfa ve
kategori sayfası gelir, her araç kendi paketini açıldığında çeker.

**`src/lib/`** — saf hesap fonksiyonları. React, DOM, tarayıcı API'si ve kullanıcıya görünen
metin bilmez. Hata durumunda `{ error: <kod> }` döner; kodu metne çeviren taraf ekranın
`text.js` dosyasıdır. Girişler SI birimindedir. Somut bağımlılıklar (tarayıcı depolaması, ağ)
`hooks/` katmanında bağlanır; `lib/` yalnızca soyut portu bilir.

**`src/pages/tools/<Ad>/`** — her araç ekranı beş dosyadır:

| dosya | sorumluluk |
| --- | --- |
| `model.js` | alan tanımları + `compute()` + `buildSweep()`. Saf, test edilebilir; gösterim ve dil bilmez. |
| `text.js` | ekranın tüm kullanıcı metni, iki dilli. Tek dış yüzü `getText(lang)`. |
| `schematic.jsx` | devre/geometri SVG'si. Yazılarını `text` prop'undan alır. |
| `index.jsx` | düzen ve state. Hesap yapmaz, metin üretmez. |
| `report.js` | raporun o araca ait bölümü. Ekranla **aynı** kaynaktan aynı satırları üretir. |

Ekran düzeni tüm araçlarda aynıdır: `.tool-header` → üç panel (*Girdiler* / *Sonuç* /
*Teknik detay + Geçerlilik ve varsayımlar*) → parametrik grafik → kategoriye dönen bağlantı.
Renkler ve fontlar yalnızca tema değişkenlerinden gelir (`src/themes/*.css`); ekrana özel CSS
ve inline style yazılmaz.

Grafiğin altındaki veri tablosu seyreltilerek gösterilir ve **örnekleme kuralı tek yerdedir**:
`LineChart.jsx` içindeki `sampleIndices(length, every)`. Ekran da rapor da onu çağırır —
kuralın ikinci bir kopyası yazıldığında rapor tablosu ekrandakinden sessizce ayrışıyordu
(eğrinin sağ ucundaki asimptot satırı düşüyordu).

### Dil katmanı

| katman | dosya | sorumluluk |
| --- | --- | --- |
| saf | `src/lib/i18n.js` | `LANGS`, `DEFAULT_LANG` (`tr`), `pick(dict, lang)`, depolama portu üzerinden oku/yaz |
| bağ | `src/hooks/useLang.jsx` | `LangProvider` + `useLang()`; `localStorage`'a yalnızca burada dokunulur |
| ortak metin | `src/data/uiText.js` | `commonText(lang)` — panel başlıkları, durum çipi kalıpları, boş/hata notları |
| ekran metni | `src/pages/tools/<Ad>/text.js` | `getText(lang)` — o ekrana özgü her dize |

`model.js` dil bilmez: hata mesajında gösterilecek alan adlarını `compute(…, labels)` ile
dışarıdan alır, ekran da `text.fieldLabels`'ı geçirir. Böylece hesap katmanı saf kalır.

`<html lang>` seçilen dille birlikte değişir. Bu yalnızca semantik değil, görünür bir gerekliliktir:
`text-transform: uppercase` sayfanın dilini kullanır ve `lang="tr"` altında "i" harfi "İ" olur —
İngilizce metin Türkçe etiketle büyütülünce "VIA" yerine "VİA" çıkardı.

Çevrilmeyenler: kod yorumları, değişken/dosya adları, birim sembolleri, E serisi adları ve
kullanıcının kendi girdiği veri. Sayı biçimi de dile göre değişmez — ondalık ayırıcı gösterimde
her zaman noktadır, çünkü çıktı kopyalanıp başka araca yapıştırılır. (Girişte hem nokta hem
virgül kabul edilir.) Yüzde işareti bu kuralın dışındadır: Türkçe `%5`, İngilizce `5%` yazar ve
kalıp yalnızca `commonText(lang).pct` içindedir.

Sayı akışı: form state **string** tutar, ayrıştırma yalnızca `compute()` içinde `lib/fields.js`
üzerinden yapılır (belirsiz binlik ayırıcı sessizce yorumlanmaz, açık hata döner).
**Ara değerlerde yuvarlama yapılmaz** — `fmt*` yalnızca JSX içinde çağrılır.

Ayrıntılı kurallar ve bilinen sapmalar: [`CLAUDE.md`](CLAUDE.md). Formüllerin kaynağı:
[`docs/spec.md`](docs/spec.md).

### Backend (`api/`)

Dört proje: `Alp.Api` (uçlar), `Alp.Data` (EF Core bağlamı + migration), `Alp.Domain`
(varlıklar), `Alp.Reports` (PDF/Excel dizgisi). Repository/service katmanı **yoktur** ve bu
bilinçli bir karardır — bu ölçekte eklemek gereksiz dolaylılık olurdu.

Bütün uçlar `/api` önekiyle çalışır (sağlık uçları dahil: `/api/health`, `/api/health/ready`),
çünkü nginx yalnızca `/api/` konumunu vekile geçirir; önek dışına yazılan bir uç dışarıdan
istendiğinde `index.html` döner.

| grup | uçlar |
| --- | --- |
| oturum | `POST /api/auth/{register,login,refresh,logout,forgot-password,reset-password}`, `GET /api/auth/confirm-email` |
| profil | `GET/PATCH /api/me`, `GET/POST/DELETE /api/me/logo` |
| kalınlık kaydı | `GET/POST /api/thickness-records`, `DELETE /api/thickness-records/{id}` |
| proje | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/{id}` |
| hesap | `POST /api/projects/{id}/calculations`, `POST /api/projects/{id}/calculations/reorder`, `GET/PATCH/DELETE /api/calculations/{id}` |
| rapor | `POST /api/reports/{pdf,xlsx}`, `POST /api/projects/{id}/report/{pdf,xlsx}`, `GET /api/reports`, `GET /api/reports/{id}/download` |

Sunucu 29 aracın hiçbirini tanımaz. Tarayıcı biçimlenmiş (zaten metne çevrilmiş) rapor yükünü
kurar, sunucu yalnızca dizer — yeni araç eklendiğinde backend'de hiçbir şey değişmez.

Kaynağı olmayan/başkasına ait her kaynak **aynı 404**'ü döndürür; numaralandırmaya kapalıdır.

### Üyelik, proje kaydı ve rapor

- Araçlar girişsiz tam çalışır. Giriş yalnızca kaydetmek ve rapor almak için gerekir.
  E-posta doğrulaması zorunludur.
- Bir hesap projeye kaydedilir; kayıt `?hesap=<id>` bağıyla ekrana geri yüklenir. Bağlıyken
  "Kaydet" yerine "Kaydı güncelle" çıkar, böylece kopya kayıt oluşmaz.
- Rapor PDF veya Excel olarak indirilir. **Üretilen belge sunucuda saklanmaz:** rapor
  türetilmiş veridir ve kaynağı kaydedilmiş hesapların rapor bölümleridir. "Tekrar indir"
  bu yüzden bir dosya kopyası değil, kayıttan yeniden üretimdir. `Reports` tablosu kütük
  olarak kalır (kim, ne zaman, hangi biçim, kaç bayt).
- Araç ekranının raporunda yükü tarayıcı kurar (canlı çizimi o an yakalar); proje raporunda
  ise sunucu kurar — kaydedilmiş bölümler zaten onda. Proje detayı bu yüzden ham rapor
  bölümü **göndermez**, yalnızca birkaç satırlık önizleme taşır: 60 hesaplı bir projede
  yanıt 906 KB yerine 26,5 KB.
- Kabul edilen sınır: projeye kaydedilmemiş tek seferlik bir rapor geri getirilemez —
  o ekranın verisi hiçbir yerde durmuyor. İndirme ucu bu durumda `REPORT_NOT_REPRODUCIBLE`
  döner, sessizce boş dosya vermez.
- Karar ve gerekçeler: [`docs/uyelik-ve-rapor-plani.md`](docs/uyelik-ve-rapor-plani.md) §19.

## Araçlar

8 kategori, **29 ekran, hepsi yayında**. `src/data/categories.js` tek kaynaktır: `path` alanı
olan araç aktif, olmayan "yakında" olarak gösterilir. Adların iki dildeki karşılığı da orada
durur; tablolardaki adlar o dosyayla birebir aynıdır.

### PCB Akım, Güç ve Bakır · PCB Current, Power and Copper

| ekran | screen | yol |
| --- | --- | --- |
| Yol Genişliği ve Akım Kapasitesi | Trace Width & Current Capacity | `/arac/trace-width` |
| Güç Düzlemi ve Paralel Yol | Power Plane & Parallel Trace | `/arac/guc-duzlemi` |
| Bakır Kalınlığı Dönüştürücü | Copper Thickness Converter | `/arac/bakir-donusturucu` |

### Via ve Padstack · Via and Padstack

| ekran | screen | yol |
| --- | --- | --- |
| Via Özellikleri ve Akım Kapasitesi | Via Properties & Current Capacity | `/arac/via-ozellikleri` |
| Termal Via Dizisi | Thermal Via Array | `/arac/termal-via` |

### Kontrollü Empedans · Controlled Impedance

| ekran | screen | yol |
| --- | --- | --- |
| Tek Uçlu Empedans | Single-Ended Impedance | `/arac/tek-uclu-empedans` |
| Diferansiyel Çift Empedansı | Differential Pair Impedance | `/arac/diferansiyel-cift` |

### Sinyal Bütünlüğü · Signal Integrity

| ekran | screen | yol |
| --- | --- | --- |
| Yayılma Gecikmesi ve Dalga Boyu | Propagation Delay & Wavelength | `/arac/yayilma-gecikmesi` |
| Kritik Hat Uzunluğu | Critical Trace Length | `/arac/kritik-hat-uzunlugu` |
| Diferansiyel Skew ve Uzunluk Eşleme | Differential Skew & Length Matching | `/arac/skew` |
| Crosstalk Kestirimi | Crosstalk Estimator | `/arac/crosstalk` |
| Terminasyon Hesaplayıcı | Termination Calculator | `/arac/terminasyon` |

### Güç Bütünlüğü ve Termal · Power Integrity and Thermal

| ekran | screen | yol |
| --- | --- | --- |
| PDN Hedef Empedansı | PDN Target Impedance | `/arac/pdn-hedef-empedans` |
| Decoupling Ağı | Decoupling Network | `/arac/decoupling` |
| Jonksiyon Sıcaklığı ve Soğutucu | Junction Temperature & Heatsink | `/arac/junction-sicakligi` |

### Komponent ve Devre Hesapları · Component and Circuit Calculators

| ekran | screen | yol |
| --- | --- | --- |
| Direnç ve SMD Kod Çözücü | Resistor & SMD Code Decoder | `/arac/direnc-kodu` |
| Gerilim Bölücü ve E Serisi Bulucu | Voltage Divider & E-Series Finder | `/arac/gerilim-bolucu` |
| LED, Ohm Kanunu ve RLC | LED, Ohm's Law & RLC | `/arac/led-ohm-rlc` |
| RC/RL Zaman Sabiti ve Kristal | RC/RL Time Constant & Crystal | `/arac/rc-kristal` |

### PCB Üretim ve DFM · PCB Manufacturing and DFM

| ekran | screen | yol |
| --- | --- | --- |
| Clearance, Creepage ve Padstack | Clearance, Creepage & Padstack | `/arac/clearance-creepage-padstack` |
| BGA Breakout | BGA Breakout | `/arac/bga-breakout` |
| Stack-Up Planlayıcı | Stack-Up Planner | `/arac/stack-up-planlayici` |
| Thermal Relief | Thermal Relief | `/arac/thermal-relief` |

Bu dört ekran ortak bir üretici yetenek profili ve ortak bir kontrol sözleşmesi paylaşır
(`lib/dfmProfile.js`, `lib/dfmCheck.js`, `lib/dfmSummary.js`). Girilmeyen sınır `null` kalır
ve ona bağlı kontrol `unknown` döner — **sessiz varsayılan üretici değeri yoktur.**

### Dönüştürücüler · Converters

| ekran | screen | yol |
| --- | --- | --- |
| Uzunluk Dönüştürücü | Length Converter | `/arac/uzunluk-donusturucu` |
| AWG Tel Çapı Dönüştürücü | AWG Wire Gauge Converter | `/arac/awg-donusturucu` |
| Frekans ve Periyot Dönüştürücü | Frequency & Period Converter | `/arac/frekans-periyot` |
| Desibel, Kazanç ve dBm Dönüştürücü | Decibel, Gain & dBm Converter | `/arac/db-kazanc` |
| Sıcaklık Dönüştürücü | Temperature Converter | `/arac/sicaklik-donusturucu` |
| Kompleks Sayı Dönüştürücü | Complex Number Converter | `/arac/kompleks-sayi` |

Dönüştürücüler ayrı bir kategoridir ve *PCB Üretim ve DFM* ile karıştırılmamalı: `docs/spec.md`
§11'in altı dönüşümü tanım gereği tam bağıntılardır (ampirik katsayı, eğri uydurma ya da tablo
içermezler). Bakır kalınlığı dönüştürücüsü ise adına rağmen buraya ait değildir — kaplama payı
ve aşındırma faktörü gibi üretim parametrelerini hesapladığı için *PCB Akım, Güç ve Bakır*
kategorisinde durur (§4.3).

## Tarayıcıda saklama

Lisanslı standart tabloları, karar tabloları ve eğri verisi **repoya kopyalanmaz**. Böyle bir
veri gerektiğinde kullanıcının kendi veri seti kullanılır ve tarayıcıda tutulur; repoya hiç
girmez. Standart tabanlı bir veri yüklü değilken sonuç, standart tabanlı doğrulanmış gibi
sunulmaz — örneğin `traceCalc.js` klasik ampirik iletken ısınma denklemini kullanır ve sonuç
panelinde bunun veri tabanlı hesapla eşdeğer olmadığı etiketle belirtilir.

Bakır kalınlığı kayıtları bunun istisnasıdır ve iki kaynaklıdır: **giriş yapılmamışken
tarayıcıda, giriş yapılmışken hesapta.** İlk girişte tarayıcıdaki kayıtlar hesaba bir kez
kopyalanır (hesapta aynı adlı kayıt varsa o korunur) ve yerel kopya silinmez — çıkış
yapıldığında kullanıcı yine kendi listesini görür. Hesap ekranı `/hesabim` bu kayıtları
listeler ve siler.

Saklama deseni tek yerde tanımlıdır ve bakır kalınlığı kayıtlarında uygulanır:

| katman | dosya | sorumluluk |
| --- | --- | --- |
| port | `src/lib/storage.js` | `read`/`write`/`remove` sözleşmesi + `browserStorage`, `memoryStorage`, `nullStorage` |
| saf depo | `src/lib/thicknessRecords.js` | şema adı, `schemaVersion`, doğrulama, liste/kaydet/sil — portu parametre alır |
| bağ | `src/hooks/useSavedThickness.js` | somut portu bağlar, React durumunu yönetir |

Aynı deseni DFM profilleri, clearance tabloları ve kaydedilmiş stack-up'lar da izler. Ekran ne
`localStorage`'ı ne `JSON.parse`'ı görür. Kayıt zarfında `schemaVersion` vardır; format
değişirse eski kayıt sessizce yanlış okunmaz, açık hata döner. Depolamaya erişilemediğinde
(gizli sekme, kapalı site verisi) port `nullStorage`'a düşer ve hesap çalışmaya devam eder.

## Yeni araç ekleme

1. Hesap motorunu `src/lib/<konu>.js` olarak yaz — kod döner, metin döndürmez.
2. `src/pages/tools/<Ad>/` klasörünü kur (`model.js`, `text.js`, `schematic.jsx`, `index.jsx`).
   `text.js` doğduğu anda iki dillidir; tek dille yazılıp sonra çevrilmez.
3. `src/App.jsx` içine `const Ad = lazy(() => import('./pages/tools/Ad'))` ve
   `<Route path="/arac/<slug>" element={<Ad />} />` ekle.
4. `src/data/categories.js` içindeki ilgili araca `path: '/arac/<slug>'` ver; `name` alanı
   `{ tr, en }` sözlüğüdür ve ekranın `h1` başlığıyla birebir aynı kalır.
5. `docs/spec.md` §13'te karşılığı varsa testi aynı commit'te yaz.
6. `report.js` + `report.test.js` yaz, ekrana `<ReportDialog>` ve `<SaveToProject>` ekle.
   `SaveToProject`'in `toolKey`'i 4. adımdaki `id` ile **birebir aynı** olmalı; kaydı geri
   yükleyebilmek için `useSavedCalculation` de bağlanır.

Referans ekran: `src/pages/tools/VoltageDivider/`. Formüller için önce `docs/spec.md`'nin ilgili
bölümünü oku; denklemleri, sabitleri veya geçerlilik sınırlarını hafızadan uydurma. Spec ile
mevcut kod çelişirse dur ve sor.

## Dağıtım

**Dağıtım kendi sunucumuza yapılır, GitHub Pages'e değil.** Uygulama kökten (`/`) servis
edilir: `vite.config.js` içinde `base: '/'`, `App.jsx` içinde `BrowserRouter`.

`BrowserRouter` derin bağlantıda sunucudan SPA geri dönüşü ister; karşılığı
`deploy/nginx.conf` içindeki `try_files $uri $uri/ /index.html` satırıdır. Düşerse site ilk
açılışta çalışır, **sayfa yenilendiğinde 404 verir** — her dağıtımda ilk kontrol budur.

Yığın, ayrıntılar ve sunucu runbook'u: [`deploy/README.md`](deploy/README.md).

- `deploy/docker-compose.yml` imajları yerelde derler; `deploy/docker-compose.prod.yml` onun
  üstüne binip `ghcr.io`'daki hazır imajları kullanır, TLS ve certbot ekler.
- Sırlar `deploy/.env`'dedir ve depoya girmez. Şablon `.env.example`.
- `.github/workflows/ci.yml` her dalda test/derleme koşar; `deploy.yml` yalnızca `main`'de
  imaj derleyip `ghcr.io`'ya iter. **Sunucuya bağlanan adım bilerek yoktur** — sunucu henüz
  yok, kullanılmayan bir SSH sırrı depoda durmaz.
- Şema açılışta uygulanır (`Database__MigrateOnStartup`); konteynerde `dotnet ef` yoktur.
  Ayar tek kopyalı dağıtım içindir.
- SMTP verilmezse postalar yalnızca günlüğe yazılır. **Üretimde bu bir arızadır:** e-posta
  doğrulaması zorunlu olduğu için doğrulama postası gitmezse hiçbir kullanıcı giriş yapamaz.

## Notlar

- Sonuçlar yaklaşık mühendislik tahminleridir; kritik tasarımlarda üretici verisi ve ölçümle
  doğrulayın.
- Ara hesaplarda yuvarlama yapılmaz; yalnızca gösterimde uygulanır.
- Kapalı form empedans sonuçları üretime hazır gibi sunulmaz; alan çözücü fazına kadar
  "hızlı denklem modu" etiketiyle ve geçerlilik sınırlarıyla birlikte gösterilir.
- Ters hesaplarda Newton–Raphson tek başına kullanılmaz; `lib/solve.js` içindeki `solveBounded`
  (Brent, tökezlerse bisection) kullanılır ve arama aralığı fiziksel sınırlara kapatılır.
