# ALP PCB Toolkit

PCB tasarımı için çevrim içi donanım mühendisliği karar destek araçları. Tüm hesaplar tarayıcıda
(client-side) çalışır; backend, veritabanı veya API çağrısı yoktur.

Arayüz iki dillidir — **Türkçe / English** — ve dil başlıktaki düğmeden değiştirilir. Varsayılan
Türkçedir: araç adlarının ve mühendislik terimlerinin karşılığı önce Türkçe yazıldı, İngilizce
onun çevirisidir. Seçim tarayıcıda saklanır.

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
| `model.js` | alan tanımları + `compute()` + `buildSweep()`. Saf, test edilebilir; gösterim ve dil bilmez. |
| `text.js` | ekranın tüm kullanıcı metni, iki dilli. Tek dış yüzü `getText(lang)`. |
| `schematic.jsx` | devre/geometri SVG'si. Yazılarını `text` prop'undan alır. |
| `index.jsx` | düzen ve state. Hesap yapmaz, metin üretmez. |

Ekran düzeni tüm araçlarda aynıdır: `.tool-header` → üç panel (*Girdiler* / *Sonuç* /
*Teknik detay + Geçerlilik ve varsayımlar*) → parametrik grafik → kategoriye dönen bağlantı.
Renkler ve fontlar yalnızca `src/theme.css` değişkenlerinden gelir; ekrana özel CSS ve inline
style yazılmaz.

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
virgül kabul edilir.)

Sayı akışı: form state **string** tutar, ayrıştırma yalnızca `compute()` içinde `lib/fields.js`
üzerinden yapılır (ondalık için hem nokta hem virgül geçerlidir; belirsiz binlik ayırıcı
sessizce yorumlanmaz, açık hata döner). **Ara değerlerde yuvarlama yapılmaz** — `fmt*` yalnızca
JSX içinde çağrılır.

Ayrıntılı kurallar ve bilinen sapmalar: [`CLAUDE.md`](CLAUDE.md). Formüllerin kaynağı:
[`docs/spec.md`](docs/spec.md).

## Araçlar

7 kategori, 29 ekran — 25'i aktif, 4'ü planlanmış. `src/data/categories.js` tek kaynaktır:
`path` alanı olan araç aktif, olmayan "yakında" olarak gösterilir. Adların iki dildeki
karşılığı da orada durur; tablolardaki adlar o dosyayla birebir aynıdır.

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

### PCB Üretim, DFM ve Dönüşümler · PCB Manufacturing, DFM and Conversions

| ekran | screen | yol |
| --- | --- | --- |
| Uzunluk Dönüştürücü | Length Converter | `/arac/uzunluk-donusturucu` |
| AWG Tel Çapı Dönüştürücü | AWG Wire Gauge Converter | `/arac/awg-donusturucu` |
| Frekans ve Periyot Dönüştürücü | Frequency & Period Converter | `/arac/frekans-periyot` |
| Desibel, Kazanç ve dBm Dönüştürücü | Decibel, Gain & dBm Converter | `/arac/db-kazanc` |
| Sıcaklık Dönüştürücü | Temperature Converter | `/arac/sicaklik-donusturucu` |
| Kompleks Sayı Dönüştürücü | Complex Number Converter | `/arac/kompleks-sayi` |

Dönüştürücülerin kaynağı `docs/spec.md` §11; bakır kalınlığı dönüştürücüsü §4.3'tedir ve
*PCB Akım, Güç ve Bakır* kategorisinde durur.

Dördü planlandı, henüz yayında değil: Clearance, Creepage ve Padstack · BGA Breakout ·
Stack-Up Planlayıcı · Thermal Relief.

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
2. `src/pages/tools/<Ad>/` klasörünü dört dosyayla kur. `text.js` doğduğu anda iki dillidir;
   tek dille yazılıp sonra çevrilmez.
3. `src/App.jsx` içine `const Ad = lazy(() => import('./pages/tools/Ad'))` ve
   `<Route path="/arac/<slug>" element={<Ad />} />` ekle.
4. `src/data/categories.js` içindeki ilgili araca `path: '/arac/<slug>'` ver; `name` alanı
   `{ tr, en }` sözlüğüdür ve ekranın `h1` başlığıyla birebir aynı kalır.
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
