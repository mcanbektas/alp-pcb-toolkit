# ALP PCB Toolkit

PCB tasarımı için çevrim içi mühendislik karar destek araçları. Tüm hesaplar tarayıcıda
(client-side) çalışır; backend, veritabanı veya API çağrısı yoktur.

Sonuçlar yaklaşık mühendislik tahminleridir. Her ekran kullandığı denklemi, ara değerleri,
geçerlilik sınırını ve yöntemin nereden geldiğini birlikte gösterir — bir sonuç kapalı
formdan mı yoksa kaynağı belirsiz bir yaklaşımdan mı geliyor, ekranda yazar.

## Geliştirme

```bash
npm install
npm run dev         # http://localhost:3000  (vite.config.js: port 3000, strictPort)
npm run build       # dist/
npm run preview

npm test            # vitest run — yalnızca src/lib/ altındaki saf hesap fonksiyonları
npm run test:watch
```

Linter kurulu değildir. Test kapsamı bilinçli olarak dardır: **yalnızca `src/lib/` altındaki
saf hesap fonksiyonları test edilir, React bileşeni testi yazılmaz.** Arayüz doğrulaması
`npm run build` + tarayıcıda elle kontrol ile yapılır.

`docs/spec.md` §13'ün altı referans testi (microstrip, via direnci, PDN hedef empedansı,
junction sıcaklığı, direnç kodu, yüklü gerilim bölücü) ilgili motor eklendiğinde teste
dönüşür; motor testsiz merge edilmez.

## Mimari

Bağımlılık yönü tek yönlüdür ve asla tersine çevrilmez:

```
pages → components → hooks → lib
```

Araç ekranları `src/App.jsx` içinde `lazy` ile yüklenir: ilk boyamada yalnızca ana sayfa ve
kategori sayfası gelir, her araç kendi paketini açıldığında çeker.

**`src/lib/`** — saf hesap fonksiyonları. React, DOM, tarayıcı API'si ve kullanıcıya görünen
metin bilmez. Hata durumunda `{ error: <kod> }` döner; kodu metne çeviren taraf ekranın
`text.js` dosyasıdır. Girişler SI birimindedir.

**`src/pages/tools/<Ad>/`** — her araç ekranı dört dosyadır:

| dosya | sorumluluk |
| --- | --- |
| `model.js` | alan tanımları + `compute()` + `buildSweep()`. Saf, test edilebilir; gösterim bilmez. |
| `text.js` | bulgu ve hata kodlarının Türkçe karşılıkları. İkinci dil gerekirse değişecek tek dosya. |
| `schematic.jsx` | devre/geometri SVG'si. |
| `index.jsx` | düzen ve state. Hesap yapmaz, metin üretmez. |

Ekran düzeni tüm araçlarda aynıdır: `.tool-header` → üç panel (*Girdiler* / *Sonuç* /
*Teknik detay + Geçerlilik ve varsayımlar*) → parametrik grafik → kategoriye dönen bağlantı.
Renkler ve fontlar yalnızca `src/theme.css` değişkenlerinden gelir; ekrana özel CSS ve inline
style yazılmaz.

Sayı akışı: form state **string** tutar, ayrıştırma yalnızca `compute()` içinde `lib/fields.js`
üzerinden yapılır (ondalık için hem nokta hem virgül geçerlidir; belirsiz binlik ayırıcı
sessizce yorumlanmaz, açık hata döner). **Ara değerlerde yuvarlama yapılmaz** — `fmt*` yalnızca
JSX içinde çağrılır.

Ayrıntılı kurallar ve bilinen sapmalar: [`CLAUDE.md`](CLAUDE.md). Formüllerin kaynağı:
[`docs/spec.md`](docs/spec.md).

## Araçlar

7 kategori, 29 ekran — 25'i aktif, 4'ü planlanmış. `src/data/categories.js` tek kaynaktır:
`path` alanı olan araç aktif, olmayan "yakında" olarak gösterilir.

### PCB Akım, Güç ve Bakır

| ekran | yol |
| --- | --- |
| Trace Width & Current Capacity | `/arac/trace-width` |
| Power Plane & Parallel Trace | `/arac/guc-duzlemi` |
| Copper Thickness Converter | `/arac/bakir-donusturucu` |

### Via ve Padstack

| ekran | yol |
| --- | --- |
| Via Properties & Current Capacity | `/arac/via-ozellikleri` |
| Thermal Via Array | `/arac/termal-via` |

### Kontrollü Empedans

| ekran | yol |
| --- | --- |
| Single-Ended Impedance | `/arac/tek-uclu-empedans` |
| Differential Pair Impedance | `/arac/diferansiyel-cift` |

### Sinyal Bütünlüğü

| ekran | yol |
| --- | --- |
| Propagation Delay & Wavelength | `/arac/yayilma-gecikmesi` |
| Critical Trace Length | `/arac/kritik-hat-uzunlugu` |
| Differential Skew & Length Matching | `/arac/skew` |
| Crosstalk Estimator | `/arac/crosstalk` |
| Termination Calculator | `/arac/terminasyon` |

### Güç Bütünlüğü ve Termal

| ekran | yol |
| --- | --- |
| PDN Target Impedance | `/arac/pdn-hedef-empedans` |
| Decoupling Network | `/arac/decoupling` |
| Junction Temperature & Heatsink | `/arac/junction-sicakligi` |

### Komponent ve Devre Hesapları

| ekran | yol |
| --- | --- |
| Resistor & SMD Code Decoder | `/arac/direnc-kodu` |
| Voltage Divider & E-Series Finder | `/arac/gerilim-bolucu` |
| LED, Ohm Kanunu & RLC | `/arac/led-ohm-rlc` |
| RC/RL Zaman Sabiti & Kristal | `/arac/rc-kristal` |

### PCB Üretim, DFM ve Dönüşümler

| ekran | yol |
| --- | --- |
| Length Converter | `/arac/uzunluk-donusturucu` |
| AWG Wire Gauge Converter | `/arac/awg-donusturucu` |
| Frequency & Period Converter | `/arac/frekans-periyot` |
| Decibel, Gain & dBm Converter | `/arac/db-kazanc` |
| Temperature Converter | `/arac/sicaklik-donusturucu` |
| Complex Number Converter | `/arac/kompleks-sayi` |

Dönüştürücülerin kaynağı `docs/spec.md` §11; bakır kalınlığı dönüştürücüsü §4.3'tedir ve
*PCB Akım, Güç ve Bakır* kategorisinde durur.

Dördü planlandı, henüz yayında değil: Clearance, Creepage & Padstack · BGA Breakout ·
Stack-Up Planner · Thermal Relief.

## Tarayıcıda saklama

Lisanslı standart tabloları, karar tabloları ve eğri verisi **repoya kopyalanmaz**. Böyle bir
veri gerektiğinde kullanıcının kendi veri seti kullanılır ve tarayıcıda tutulur; repoya hiç
girmez. Bugün böyle bir içe aktarma ekranı yoktur — gerektiğinde eklenecektir.

Saklama deseni tek yerde tanımlıdır ve bakır kalınlığı kayıtlarında uygulanır:

| katman | dosya | sorumluluk |
| --- | --- | --- |
| port | `src/lib/storage.js` | `read`/`write`/`remove` sözleşmesi + `browserStorage`, `memoryStorage`, `nullStorage` |
| saf depo | `src/lib/thicknessRecords.js` | şema adı, `schemaVersion`, doğrulama, liste/kaydet/sil — portu parametre alır |
| bağ | `src/hooks/useSavedThickness.js` | somut portu bağlar, React durumunu yönetir |

Ekran ne `localStorage`'ı ne `JSON.parse`'ı görür. Kayıt zarfında `schemaVersion` vardır; format
değişirse eski kayıt sessizce yanlış okunmaz, açık hata döner. Depolamaya erişilemediğinde
(gizli sekme, kapalı site verisi) port `nullStorage`'a düşer ve hesap çalışmaya devam eder.

Standart tabanlı bir veri yüklü değilken sonuç, standart tabanlı doğrulanmış gibi sunulmaz. Örneğin
`traceCalc.js` şu an klasik ampirik iletken ısınma denklemini kullanır ve sonuç panelinde bunun
veri tabanlı hesapla eşdeğer olmadığı etiketle belirtilir.

## Yeni araç ekleme

1. Hesap motorunu `src/lib/<konu>.js` olarak yaz — kod döner, metin döndürmez.
2. `src/pages/tools/<Ad>/` klasörünü dört dosyayla kur.
3. `src/App.jsx` içine `const Ad = lazy(() => import('./pages/tools/Ad'))` ve
   `<Route path="/arac/<slug>" element={<Ad />} />` ekle.
4. `src/data/categories.js` içindeki ilgili araca `path: '/arac/<slug>'` ver.
5. `docs/spec.md` §13'te karşılığı varsa testi aynı commit'te yaz.

Referans ekran: `src/pages/tools/VoltageDivider/`. Formüller için önce `docs/spec.md`'nin ilgili
bölümünü oku; denklemleri, sabitleri veya geçerlilik sınırlarını hafızadan uydurma. Spec ile
mevcut kod çelişirse dur ve sor.

## GitHub Pages'e yayınlama

1. GitHub'da repo oluşturup projeyi push edin (`main` branch).
2. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. `main`'e yapılan her push `.github/workflows/deploy.yml` ile otomatik build alıp yayınlar.

`vite.config.js` içindeki `base: './'` ve `HashRouter` kombinasyonu repo adından bağımsız
çalışmayı sağlar; ikisi de değiştirilmemelidir.

## Notlar

- Sonuçlar yaklaşık mühendislik tahminleridir; kritik tasarımlarda üretici verisi ve ölçümle
  doğrulayın.
- Ara hesaplarda yuvarlama yapılmaz; yalnızca gösterimde uygulanır.
- Kapalı form empedans sonuçları üretime hazır gibi sunulmaz; alan çözücü fazına kadar
  "hızlı denklem modu" etiketiyle ve geçerlilik sınırlarıyla birlikte gösterilir.
