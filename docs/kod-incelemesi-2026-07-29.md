# Kod incelemesi — SOLID, clean architecture, performans, güvenlik

**Tarih:** 2026-07-29 · **Kapsam:** `web/` + `api/`, commit `ce6a6b8`
**Yöntem:** iddia edilen her şey ölçüldü ya da çalışan yığına karşı denendi. Ölçüm
yapılmayan yerde "ölçülmedi" yazar. Ortam: yerel Docker yığını (nginx + api + postgres 16),
`test@alp.local` hesabı.

**İkinci tur (derinlemesine):** güvenlik yüzeyi baştan sona tarandı — SVG işleme (SSRF/XXE),
path traversal, XSS, JWT, DoS — ve her biri **çalışan sunucuya karşı ampirik olarak** test
edildi, kod okumasıyla bırakılmadı. Kayıt döngüsü kodu (bu oturumun işi) gerçek araç
şemalarıyla round-trip ve tarayıcıda kenar-durum testinden geçirildi. Bu turda bir yeni
sağlamlık hatası çıktı (PDF 500), güvenlik açığı **çıkmadı**.

---

## Uygulama durumu (2026-07-30)

Rapor üretimiyle ilgili maddeler kullanıcı kararıyla ayrı bir tura bırakıldı; gerisi
uygulandı ve her biri çalışan yığına / gerçek tarayıcıya karşı doğrulandı.

| Madde | Durum | Doğrulama |
|---|---|---|
| `refresh`/`logout` hız sınırı kovası | **Yapıldı** | 40 ardışık refresh 429 almadı (eski 30 limitte alırdı) |
| `PATCH /api/projects/{id}` over-fetch | **Yapıldı** | PATCH 200, `Count`=5 doğru, `Include` kalktı |
| `reorder` over-fetch | **Yapıldı** | SQL yalnız `SET SortOrder`; reportJson+inputsJson korundu |
| `Project.jsx` memoizasyonu | **Yapıldı**, sonra gereksizleşti | `useMemo` 2026-07-30'da kalktı: satır başına iki `JSON.parse` yapan iş artık yok |
| Sahiplik yardımcıları (10 uç) | **Yapıldı** | `LoadOwnedProject`/`LoadOwnedCalculation`; curl ile own 200 / yok 404 / tokensiz 401 |
| `lib/statusChip.js` + severity köprüsü | **Yapıldı** | 29 ekran taşındı, bekçi testi; tarayıcıda ok/warn/unknown çipleri doğru |
| `SaveToProject`/`Project.jsx` ayrıştırma | **Yapıldı** | `useProjectSaver` hook + `CalculationList` bileşeni; tarayıcı 17/17 |
| Proje detayı over-fetch (reportJson) | **Yapıldı** (2026-07-30) | 60 hesapta 906 KB → 26,5 KB (%97); yeni proje raporu ucu — bkz. plan §20 |
| Boyutsuz SVG dizgiyi asıyor (bu turda çıktı) | **Yapıldı** (2026-07-30) | tek istekle %248 CPU + 7 GB; `HasIntrinsicSize` kapısı, boyutsuz SVG 13 ms/200 |
| Rapor dosyası saklama politikası | **Yapıldı** (2026-07-30) | dosya yazma kalktı; indirme kayıttan yeniden üretiyor — bkz. plan §19 |
| PDF `Build` try/catch + exception handler | **Yapıldı** (2026-07-30) | `ReportLayoutException` → 422 `REPORT_TOO_LARGE`; üretim `UseExceptionHandler` |
| `Results.File` akışa çevirme | **Düştü** (2026-07-30) | diskten okuma yolu tümüyle kalktı; akışa çevrilecek dosya yok |
| Grafik son satırı (§17'den devreden) | **Yapıldı** (2026-07-30) | 19 dosya `sampleIndices`'e taşındı, 6 gerçek ayrışmaya regresyon testi |

Test sayısı 1887 → **1953** → **1963** (statusChip 7 + guard + roundtrip, sonra 7 grafik
son-satır regresyonu + 3 rapor hata metni). `npm run build` temiz, `dotnet build` 0 uyarı.
Aşağıdaki maddelerin ayrıntısı olduğu gibi bırakıldı (tarih kaydı).

**Not — `refresh` düzeltmesinde yöntem değişti:** aşağıdaki öneri çerez-özeti anahtarıydı;
daha derin bakınca kusurlu çıktı (token her yenilemede rotate ettiği için meşru oturum hiç
sınırlanmaz, çöp-çerez saldırganı da her denemede taze kova alır = DoS deliği). Token 256-bit
CSPRNG olduğundan bu uçta kaba kuvvet zaten imkânsız; sınır yalnız kaynak koruması. Uygulanan:
IP kovası korundu, limit 30 → 120 yükseltildi, `logout` kendi cömert kovasına alındı.

---

## Güvenlik — hepsi çalışan sunucuya karşı test edildi

| Vektör | Sonuç | Nasıl test edildi |
|---|---|---|
| SVG → SSRF | **Güvenli** | 5 vektör (`<image href>`, `xlink:href`, `feImage`, XXE entity, `file://`), yerel dinleyici — **sıfır** dış istek |
| SVG → XXE | **Güvenli** | DOCTYPE + harici entity, hiçbir genişletme/çekme olmadı |
| Rapor indirme → path traversal | **Güvenli** | `FilePath` sunucu tarafında GUID; kullanıcı hiç dokunamıyor |
| Depolanan SVG → XSS | **Güvenli** | SVG asla DOM'a yazılmıyor; `outerHTML` yalnızca uygulamanın kendi düğümünden okunuyor |
| JWT | **Sağlam** | HS256, anahtar ≥32 bayt açılışta zorunlu, issuer/audience/lifetime doğrulanıyor, `MapInboundClaims=false` |
| Kaynak numaralandırma | **Kapalı** | yok/başkasının kaynağı hep aynı 404 |
| PDF üretimi → 500 | **Bulgu (P2)** | 5000 satırlık geçerli yük `DocumentLayoutException` → işlenmemiş 500 |

Önemli negatif: **QuestPDF'in Skia SVG işleyicisi dış kaynak çekmiyor ve XML dış varlık
genişletmiyor.** Bu, kullanıcıdan gelen SVG'yi sunucuda işlemenin en büyük riskiydi;
ampirik olarak kapalı çıktı. İstemci `svgInline.js` yalnızca öznitelik üretir, script
enjekte edecek bir yol bırakmaz.

---

## Özet

Mimari **iyi durumda**. Katman ayrımı gerçekten uygulanmış, kâğıt üzerinde kalmamış:
`src/lib/` içinde tek bir React/DOM erişimi yok (yalnızca yorumlarda geçiyor) ve
`lib → hooks → components → pages` yönünde tek bir ters bağımlılık bulunamadı. Backend
2.515 satır ve okunur; **repository/service katmanı yok ve bu doğru karar** — bu ölçekte
eklemek over-engineering olurdu.

Bulunanların çoğu **performans**, mimari değil. En ağır üçü veri taşıma ve kaynak
sınırlarıyla ilgili; hiçbiri doğruluk hatası değil, ama ikisi üretimde ısırır.

| Öncelik | Bulgu | Kanıt |
|---|---|---|
| P1 | Proje detayı %92 gereksiz bayt taşıyor | 60 hesapta 955 KB |
| P1 | Rapor dosyalarında saklama sınırı yok | 56 dosya / 2,8 MB, temizlik yok |
| P1 | `refresh` hız sınırı IP başına — NAT arkasında herkesi kilitler | otomasyon ampirik olarak 429 aldı |
| P2 | `PATCH /api/projects/{id}` sırf `Count` için tüm hesapları yüklüyor | kod + ölçüm |
| P2 | `reorder` tek `int` için tam varlıkları yüklüyor | 60 hesapta ~950 KB DB→bellek |
| P2 | `Project.jsx` memoize edilmiyor — her tuşta 2×N `JSON.parse` | 20 satırda 0,6 ms |
| P2 | Rapor indirme dosyayı tamamen belleğe alıyor | `File.ReadAllBytesAsync` |
| P2 | PDF üretimi try/catch'siz — layout hatası işlenmemiş 500 | canlı sunucuda + log |
| P3 | Durum çipi mantığı 29 ekranda kopya, 4 varyanta ayrışmış | ölçüldü |
| P3 | İki paralel severity sözlüğü (`'warn'` ↔ `STATUS_WARNING`) | kod |
| P3 | Sahiplik kontrolü 10 uçta kopya | kod |
| P3 | `SaveToProject` ve `Project.jsx` çok sorumluluklu | kod |

---

## İyi olan — bozmayın

Rapor "sorun listesi" olmasın diye önce bunlar. Hepsi doğrulandı:

- **Katman saflığı gerçek.** `lib/*.js` içinde `document.`, `window.`, `localStorage`,
  `from 'react'` araması yorum dışında **sıfır** sonuç verdi. İki bilinçli istisna
  (`storage.js` port uygulamaları, `api.js` içindeki `downloadBlob`) zaten CLAUDE.md'de
  belgeli. `svgInline.js` bile DOM'a değmiyor — elemanı parametre alıyor.
- **Bağımlılık yönü ihlali yok.** `lib → hooks/components/pages/data`, `components → pages`,
  `hooks → components/pages` aramalarının hepsi boş.
- **Hata sözleşmesi tutarlı.** Saf katman kod döner, cümle döndürmez; yapısal `detail`
  taşır. Bu, iki dilli arayüzde çeviri sızıntısını yapısal olarak imkânsız kılıyor.
- **Port/adapter doğru uygulanmış.** `storage.js` portu, `thicknessRecords`/`dfmProfile`/
  `clearanceProfile`/`stackupProfiles` portu parametre alıyor — DIP kitabına uygun.
- **Test kapsamı ciddi.** 1887 test, 79 dosya. Kaynak dosyaları metin olarak okuyup
  denetleyen iki bekçi (`dfmTextPaths`, `toolKeys`) tip denetiminden kaçan hata sınıflarını
  yakalıyor.
- **Paketleme sağlıklı.** 52 chunk, araç ekranları tembel yükleniyor, ortak kod
  paylaşılıyor — `savedCalculation` 29 chunk'a kopyalanmamış, 2 chunk'ta.
- **Sahiplik modeli doğru.** Yok/başkasının kaynağı **aynı 404** şeklini döndürüyor;
  numaralandırmaya kapalı.

---

## P1 — Proje detayı %92 gereksiz bayt taşıyor

`GET /api/projects/{id}` her hesabın `ReportJson`'ını olduğu gibi döndürüyor. O alanın
içinde **satır içi SVG** var (şema + grafik). Ekran ise yalnızca `results` satırlarını ve
`mode`'u gösteriyor.

Ölçüm — gerçek bir `trace-width` rapor bölümü (14.007 bayt) ile:

```
bölüm içi dağılım        chart 9.020 B · schematicSvg 2.064 B · results 1.217 B
20 hesaplı proje         319,5 KB yanıt · %86'sı reportJson · önizleme için gereken 24,9 KB (%8)
60 hesaplı proje         955   KB yanıt
```

Yani 60 hesaplı bir projede liste ekranını çizmek için **~880 KB gereksiz** taşınıyor.
Yerelde 6,6 ms; 5 Mbit/s bir bağlantıda ~1,5 saniye.

**Düzeltme.** Detay ucu liste için `ReportJson`'ı hiç göndermesin; sunucu tarafında
projeksiyon yapılsın:

```csharp
.Select(c => new CalculationSummaryDto(
    c.Id, c.ToolKey, c.ToolMode, c.SortOrder,
    c.EngineVersion, c.SchemaVersion, c.CreatedAt, c.UpdatedAt,
    c.ReportJson != null))     // yalnızca "raporu var mı"
```

Önizleme satırları için iki seçenek var:

- **(a)** Kayıt yazılırken önizlemeyi ayrı, küçük bir sütuna çıkar (`PreviewJson`, ~1 KB).
  Ekstra sütun; ama okuma tarafı bir daha hiç büyük alan görmez.
- **(b)** Rapor indirmede zaten hesap hesap `ReportJson` gerekiyor — onu ayrı bir uca al
  (`GET /api/projects/{id}/report-sections`) ve yalnızca indirme anında çek.

**(a) + (b) birlikte** en temizi: liste ucu küçük kalır, indirme ucu ağır veriyi yalnızca
gerçekten gerekince taşır. Şu anki `?projectId=` rapor akışı zaten sunucuda bölümleri
birleştirebilir; o zaman ağır veri istemciye hiç gitmez.

---

## P1 — Üretilen rapor dosyalarında saklama sınırı yok

Her PDF/Excel indirmesi diske kalıcı dosya yazıyor ve `Reports` tablosuna satır ekliyor.
Silme, süre sınırı, kota ya da temizlik görevi **yok** — `BackgroundService`,
`IHostedService`, `Reports.Remove` aramaları boş döndü.

Çalışan konteynerde şu an:

```
/app/App_Data/reports    56 dosya · 2,8 MB
```

Rapor ucunun hız sınırı kullanıcı başına 5 dakikada 20. Tek kullanıcı teorik olarak günde
~5.760 rapor üretebilir; 50 KB ortalamayla **~290 MB/gün/kullanıcı**. Disk dolduğunda
Postgres ve API aynı hacimdeyse yığın komple durur.

**Düzeltme.** Üçünden biri, tercihen ilk ikisi birlikte:

1. Saklama süresi (ör. 30 gün) + gece koşan bir temizlik `BackgroundService`.
2. Kullanıcı başına dosya/bayt kotası; aşınca en eskisini sil.
3. Dosyayı hiç saklama — üret, gönder, unut. `Reports` tablosu yalnızca kütük olarak kalır.
   "Geçmişten indirme" ucu zaten arayüzden çağrılmıyor (kodda öyle yazıyor).

Karar (3) ise en ucuzu ve mevcut kullanımı hiç bozmaz.

---

## P1 — `refresh` hız sınırı IP başına, NAT arkasında meşru kullanıcıları kilitler

`Program.cs`'te `refresh` politikası `ClientKey(ctx)` ile bölümleniyor — yani **istemci
IP'si başına 5 dakikada 30**. Ama:

- Her **tam sayfa yüklemesi** `AuthProvider` açılışında bir `/api/auth/refresh` çağırıyor.
- `api.js` başarısız yenilemeyi 350 ms sonra **bir kez daha** deniyor → başarısız her
  yenileme kotadan 2 hak yiyor.
- Ofis NAT'ı, kurumsal proxy ya da operatör CGNAT'ı arkasındaki **bütün kullanıcılar aynı
  kovayı paylaşıyor**.

Bu teorik değil: bu incelemenin tarayıcı taraması tam olarak buna takıldı ve uygulama
sessizce oturumu düşürdü (panel "giriş yapmalısın"a döndü).

Kodun kendisi bu tuzağın farkında — `reports` politikası için yazılmış yorum aynen şunu
diyor: *"Kullanıcı bazlı: aynı ofisteki farklı kullanıcılar birbirinin kotasını
paylaşmaz."* Aynı gerekçe `refresh` için geçerli ama uygulanmamış.

Aynı sorun **`/api/auth/logout`** için daha dar: o uç `"auth"` politikasında, yani IP başına
5 dakikada **10**. Ofisteki onbirinci çıkış isteği 429 alır.

**Düzeltme.** `refresh` bölümünü **yenileme çerezinin özetiyle** anahtarla, çerez yoksa
IP'ye düş:

```csharp
static string RefreshKey(HttpContext ctx) =>
    ctx.Request.Cookies.TryGetValue("alp_rt", out var c) && c.Length > 0
        ? "rt:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(c)))[..32]
        : ClientKey(ctx);
```

Çerez adı şu an `AuthEndpoints` içinde `private const` — paylaşılan bir sabite taşınmalı,
`Program.cs` içine ikinci kez yazılmamalı. Böylece kova oturum başına olur; kimliksiz kaba
kuvvet yine IP kovasına düşer. Yan fayda: tek kullanıcının çok sekmesi de birbirini
kilitlemez. `logout` da aynı anahtarı kullanabilir.

---

## P2 — `PATCH /api/projects/{id}` sırf sayı için tüm hesapları yüklüyor

`ProjectEndpoints.cs:109`:

```csharp
var project = await db.Projects.Include(p => p.Calculations).FirstOrDefaultAsync(p => p.Id == id);
```

`Include` yalnızca sondaki `project.Calculations.Count` için var. Sonuç: proje adını
değiştirmek, o projedeki **bütün hesapları `ReportJson`'larıyla birlikte** veritabanından
belleğe çeker. 60 hesaplı projede ~950 KB, tek bir `UPDATE` için.

**Düzeltme.** `Include`'u kaldır, sayıyı ayrı skaler sorgudan al:

```csharp
var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id);
// … güncelleme …
var count = await db.Calculations.CountAsync(c => c.ProjectId == id);
```

## P2 — `reorder` tek `int` için tam varlıkları yüklüyor

`ProjectEndpoints.cs:292` `ToListAsync()` ile tam `Calculation` varlıklarını çekiyor;
değişen tek şey `SortOrder`. Kimlik doğrulaması için yalnızca `Id` yeterli:

```csharp
var ids = await db.Calculations.Where(c => c.ProjectId == id).Select(c => c.Id).ToListAsync();
// küme denetimi ids üzerinde
await db.Calculations.Where(c => c.ProjectId == id)
    .ExecuteUpdateAsync(...);   // ya da yalnız Id+SortOrder taşıyan hafif projeksiyon
```

Ölçüm: reorder 20 hesapta 2,7 ms, 60 hesapta 4,1 ms. Yerelde küçük; uzak veritabanında
taşınan bayt doğrusal büyür.

## P2 — `Project.jsx` memoize edilmiyor

Dosyada **sıfır** `useMemo` var (karşılaştırma: araç ekranlarında 8'er tane). Her satır
için `previewRows(calc.reportJson)` ve `previewMode(calc.reportJson)` çağrılıyor — yani
satır başına **iki kez 14 KB JSON.parse**, her render'da.

Ölçüm: 20 satırlık projede tek render için **0,6 ms**. "Hazırlayan" alanına yazılan her
harf bir render tetikliyor, dolayısıyla her tuş vuruşunda tekrarlanıyor. 60 satırda ~1,8 ms.

Kullanıcıyı donduran bir rakam değil — ama tamamen gereksiz ve P1'deki düzeltme
yapıldığında zaten ortadan kalkar. Ara çözüm tek satır:

```js
const rows = useMemo(() => calcs.map((c) => ({
  calc: c,
  preview: previewRows(c.reportJson, 2),
  mode: previewMode(c.reportJson),
  stale: engineStatus(c.engineVersion, ENGINE_VERSION) === ENGINE_STALE,
})), [calcs])
```

`previewRows` + `previewMode` aynı JSON'u iki kez ayrıştırıyor; tek geçişte ikisini
döndüren bir fonksiyon da eklenebilir.

## P2 — Rapor indirme dosyayı tamamen belleğe alıyor

`ReportEndpoints.cs:133`: `Results.File(await File.ReadAllBytesAsync(path), …)`.
Dosya ne kadarsa o kadar bayt heap'e (ve Gen2/LOH'a) çıkıyor. `Results.File(path, …)`
ya da bir `FileStream` akış olarak gönderir, bellek sabit kalır.

## P2 — PDF üretimi korumasız: layout hatası işlenmemiş 500 döndürüyor

`ReportEndpoints.cs` `GeneratePdf` içinde `builder.Build(payload)` **try/catch'siz**
çağrılıyor. QuestPDF içeriği sayfaya sığdıramadığında `DocumentLayoutException` fırlatıyor
ve bu işlenmeden 500'e düşüyor. Çalışan sunucuda doğrulandı:

```
5000 satırlık geçerli yük (1,35 MB, 5 MB sınırının altında)
  pdf  -> HTTP 500 (DocumentLayoutException: conflicting size constraints)
  xlsx -> HTTP 200, 224 KB, 867 ms
```

Sunucu logu tam olarak şunu gösterdi:
`QuestPDF.Drawing.Exceptions.DocumentLayoutException: … conflicting size constraints`.

Tek uzun dize tetiklemiyor (QuestPDF metni sarıyor — 2000 karakter denendi, sorun yok).
**Gerçekçi tetikleyici proje raporu:** proje raporu bütün hesapların bölümlerini birleştirir;
çok hesaplı, grafikli bir proje QuestPDF'in sayfa kısıtlarını aşabilir ve **kullanıcının
kendi projesi** 500 alır. XLSX aynı yükü kaldırıyor, yani veri değil düzen sınırı.

**Düzeltme.** SVG yolundaki desenin aynısı — `Build` çağrısını sar, çözülemezse temiz bir
hata kodu döndür:

```csharp
byte[] bytes;
try { bytes = builder.Build(payload); }
catch (QuestPDF.Drawing.Exceptions.DocumentLayoutException)
{
    return Results.UnprocessableEntity(new ApiError("REPORT_TOO_LARGE"));
}
```

Arayüz bu kodu "rapor bu araç setiyle tek sayfaya sığmadı" gibi bir mesaja çevirir.
İkincil not: üretimde `app.UseExceptionHandler` yok — işlenmemiş exception çıplak 500
döndürür (üretim ortamı `Development` olmadığı için **stack sızmaz**, bunu doğruladım), ama
yapılandırılmış hata yanıtı ve garantili loglama için bir üretim exception handler'ı
eklenmeli.

---

## Kayıt döngüsü kodu (bu oturumun işi) — derin doğrulama

Yeni yazılan `savedCalculation.js` + `useSavedCalculation.js` + `SaveToProject` ayrıca
incelendi. **Doğruluk hatası bulunamadı**; şunlar test edildi:

- **Gerçek şemalarla round-trip.** 5 dizi-ağırlıklı aracın (`Decoupling`, `StackupPlanner`,
  `PowerPlane`, `Pdn`, `ThermalRelief`) gerçek `INITIAL_FORM`'u `JSON.stringify` → `restoreForm`
  → derin karşılaştırma ile birebir döndü; bir satır eklenip değiştirilen düzenleme de.
  Dizi yolu `restoreForm`'un en riskli kısmıydı, hepsi temiz.
- **Boş-dizi başlangıcı riski yok.** Beş dizi alanının hepsi dolu başlangıçlı, yani
  `restoreArray` her zaman bir şablon bulur; boş-başlangıçlı bir araçta satırların sessizce
  düşme durumu gerçekte oluşmuyor (yine de birim testle sınırı çizildi).
- **Kenar durumlar tarayıcıda.** Eski-sürüm çipi, eski-sürüm notu, düşen-alan notu (tam alan
  adıyla: "…yüklenmedi: eskiKaldirilmis") ve fazlalık alan düşerken geçerli alanların
  yüklenmesi — dördü de gerçek tarayıcıda doğrulandı.
- **Sonsuz döngü riski yok.** `api` `useMemo` ile kararlı, `isAuthenticated` kimlik
  değiştirmiyor; ayrıca `handledIdRef` aynı kaydı iki kez yüklemeyi engelliyor — iki katman
  koruma. Düzenleme sonrası yeniden render geri yüklemeyi tekrarlamıyor.
- **Yarış temiz.** Efektin `cancelled` bayrağı her çalıştırmada ayrı; URL A→B→A hızlı
  değişse bile önceki fetch iptal ediliyor, geç gelen yanıt yutuluyor.

Küçük kozmetik: proje satırında birim ile "eski sürüm" çipi bitişik görünüyor
(`0.5 mmeski sürüm` — `.chip`'in `inline-block` dolgusu ayırıyor ama metin akışında boşluk
yok). Tek `margin-left` ile çözülür, işlevsel değil.

## P3 — Mimari ve bakım

### Durum çipi mantığı 29 ekranda kopya, 4 varyanta ayrışmış

`const status = useMemo(…)` bloğu 29 ekranda tekrar ediyor ve **artık aynı değil**:

```
23 ekran   kanonik hâli
 4 ekran   DFM — dördüncü durum (`unknown`) eklenmiş
 1 ekran   Termination — `!r.ok` koruması bilinçli olarak yok
 1 ekran   VoltageDivider — `r.findings` + yerel `worstLevel()` yardımcısı
```

Üç sapmanın üçü de meşru (Termination'ınki kodda gerekçesiyle yazılı: geçersiz sonuçta
nedeni `danger` seviyesinde bildiriyor). **Sorun sapma değil, paylaşılmayan ortak kısım.**
Çip eşlemesi (`ok/warn/danger → sınıf + metin`) 29 yerde duruyor; kural değişirse 29 dosya
birlikte değişmek zorunda. CLAUDE.md "durum çipi tek kurala bağlıdır" diyor ama kural 29
kopya hâlinde yaşıyor.

**Düzeltme.** `lib/statusChip.js` — saf, testli:

```js
export function statusChip(worst, count, ui) { … }   // eşleme tek yerde
export function worstLevel(items, rank) { … }        // sıralama tek yerde
```

Ekran kendi veri kaynağını (`notes` / `r.findings` / `summary`) ve kendi guard'ını
korur; yalnızca ortak eşleme paylaşılır. Sapmalar bozulmaz, tekrar biter.

### İki paralel severity sözlüğü

25 ekran `'ok' | 'warn' | 'danger'` kullanıyor; `lib/dfmCheck.js` ise
`STATUS_OK | STATUS_WARNING | STATUS_DANGER | STATUS_UNKNOWN`. **`'warn'` ile `'warning'`
farklı dizeler.** Dört DFM ekranı ikisi arasında elle çeviri yapıyor. Bir gün biri
`'warning'` yazıp `'warn'` beklenen yere koyacak ve hiçbir şey uyarı vermeyecek —
karşılaştırma sessizce `false` döner.

**Düzeltme.** Tek sözlük; `dfmCheck.js`'in dört değerli kümesi üst küme olduğu için o
kazanır, `'warn'` ona hizalanır (ya da tam tersi — önemli olan tek olması).

### Sahiplik kontrolü 10 uçta kopya

`ProjectEndpoints.cs` içinde `CurrentUserId(http)` + `Results.Unauthorized()` çifti 10 kez
tekrar ediyor; ardından her uç kendi 404 kontrolünü yazıyor. Doğru yazılmışlar — ama 11.
uç eklendiğinde biri unutulursa test yakalamaz.

**Düzeltme.** İki yardımcı yeter, yeni katman gerekmez:

```csharp
static async Task<(Project? project, IResult? error)> LoadOwnedProject(AppDbContext db, HttpContext http, Guid id)
static async Task<(Calculation? calc, IResult? error)> LoadOwnedCalculation(AppDbContext db, HttpContext http, Guid id)
```

### `SaveToProject` ve `Project.jsx` çok sorumluluklu

- `SaveToProject` (270 satır): proje listesi çekme, proje oluşturma, hesap oluşturma,
  hesap güncelleme, iki farklı UI hâli, bağ durumu → metin çevirisi. **6 sorumluluk.**
  Ağ işleri `hooks/useCalculationStore.js` gibi bir hook'a çıkarılırsa bileşen yalnızca
  sunuma kalır ve o hook test edilebilir olur.
- `Project.jsx` (372 satır): yükleme, meta düzenleme, hesap listesi, sıralama, rapor
  indirme. **5 sorumluluk**, `useMemo` yok. En az hesap listesi kendi bileşenine çıkmalı.

İkisi de "şu an bozuk" değil; büyüdükçe pahalılaşan tür.

### Sözlük memoizasyonu — ölçüldü, sorun değil

8 bileşen (`RowList`, `ReportDialog`, `SaveToProject`, `DfmChecks`, `DfmSummaryBox`,
`ProfilePanel`, `Projects.jsx`, `Project.jsx`) iki dilli sözlüğünü her render'da yeniden
kuruyor; araç ekranları ise `useMemo` ile kuruyor.

Ölçüm: `commonText('tr')` **0,4 µs**, `getText('tr')` **0,6 µs**. Yani maliyeti yok.
Bu bir **tutarlılık** notu, performans bulgusu değil — düzeltilirse okuyan kişi "acaba
neden burada memo yok" diye durmaz, o kadar.

### Veritabanı indeksleri

`Calculations(ProjectId)` ve `Projects(UserId)` indeksli. İki sorgu bileşik indeksten
faydalanır ama bu hacimde ölçülebilir fark vermez, **şimdilik gerekmez**:

- `Calculations(ProjectId, SortOrder)` — detay sorgusu `ProjectId` filtreleyip `SortOrder`
  sıralıyor.
- `Projects(UserId, UpdatedAt DESC)` — liste sorgusu `UserId` filtreleyip `UpdatedAt`
  sıralıyor.

Proje başına hesap sayısı üç haneye çıkarsa gündeme alın.

---

## Önerilen sıra

1. **`refresh` kovasını oturum başına al** — küçük değişiklik, üretimde gerçek kullanıcı
   kaybettirir. (P1)
2. **Rapor dosyalarına saklama politikası** — "üret, gönder, unut" seçilirse yarım saat.
   (P1)
3. **Proje detayını hafifleten projeksiyon + rapor bölümleri için ayrı uç** — en büyük
   kazanç; `Project.jsx` memoizasyonunu da gereksiz kılar. (P1 + P2)
4. **PDF `Build`'i sar + üretim exception handler'ı** — kullanıcının kendi projesi 500
   almasın. (P2)
5. **`Include` ve `reorder` aşırı yüklemeleri** — ikisi birkaç satır. (P2)
6. **`Results.File` akışa çevir** — tek satır. (P2)
7. **`lib/statusChip.js` + tek severity sözlüğü** — 29 ekranda mekanik değişiklik,
   `toolKeys.test.js` desenine benzer bir bekçi testiyle kilitlenir. (P3)
8. **Sahiplik yardımcıları, `SaveToProject`/`Project.jsx` ayrıştırması** — bakım borcu,
   acele yok. (P3)

## Sonuç

İki tur, hepsi kanıtlı. **Güvenlik açığı bulunamadı** — en riskli yüzey (kullanıcı SVG'sinin
sunucuda işlenmesi) beş vektörle test edildi, kapalı çıktı. **Doğruluk hatası bulunamadı** —
kayıt döngüsü kodu gerçek şemalarla ve tarayıcıda kenar durumlarıyla doğrulandı, 1887 test
yeşil, katman kuralları gerçekten uygulanıyor. Tek yeni sağlamlık hatası PDF'in büyük geçerli
yükte 500 vermesi (P2), gerisi performans ve bakım. Doğru okuma: mimari sağlam, iş kaba
kuvvetle değil ölçüyle iyileştirilecek.
