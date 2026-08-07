# Brif 14 — Loglama altyapısı: korelasyon + ayrıntı + kopyalama (rapor + plan)

Durum (2026-08-08): **TÜMÜYLE TAMAM (F1+F2+F3), commit `7853913`.** Kullanıcı
isteği (2026-08-07): "detaylı bir loglama sistemi kur, en azından altyapı
olsun, sonra detaylandırıp büyütürüz; kolayca kopyalama falan yapabiliriz."
Ek istek (2026-08-08): "Görüntüle kısmı da detaylı olsun — loglama gerçekten
detaylı olsun." Rapor Fable ile, uygulama Sonnet 5 (aynı oturumda, üç faz tek
commit'te — dosyalar iç içe). Üç ayrı review turu (faz başına, Opus) toplam
3 gerçek üretim hatası buldu: `nginx.prod.conf.template` (GERÇEK üretim)
unutulmuştu, ilk düzeltme yalnız `nginx.conf`a girmişti; 5xx'te
`UseExceptionHandler`in `Response.Clear()`'ı hem yanıt başlığını hem
`LogContext`teki RequestId'yi siliyordu (en değerli satır — istisna —
kimliksiz kalıyordu); regex `$` (Multiline kapalıyken bile) sondaki `\n`den
önce eşleşiyordu. Güvenlik sorusu ayrıca soruldu ve kapatıldı: özellik
sözlüğüne izin listesi GEREKMEDİ (sink zaten `RenderMessage()` ile şablon
özelliklerinin tamamını saklıyordu, F2 aynı verinin tavanlı kopyası — net
azalma). Canlı turda yakalanan tek kozmetik bulgu (Süre alanının 6 basamaklı
gürültüsü) `double/float/decimal` için genel `"0.###"` kuralıyla kapatıldı.
dotnet test 251/251, npm test 3125/3125. Playwright ile gerçek admin
oturumunda uçtan uca doğrulandı (14 kontrol kalemi — geniş düzen, istek
kimliği + arama, Özellikler/İstisna bölümleri, iki kopyalama düğmesi,
`/en/admin/logs`; hepsi geçti).

Brif 13 (yönetim geniş düzen) ile İLİŞKİSİ: bağımsız işler, ikisi de tek
başına koşabilir. Önerilen sıra 13 → 14 — okunmayan bir tabloya kolon/veri
eklemek tersine yürümek olur.

Sunucu BEKLEMEZ — nginx maddesi hariç tamamı yerelde yazılır ve doğrulanır;
nginx maddesi `npm run stack:docker` ile yerel Docker yığınında doğrulanır.

## 0. "Detaylı loglama" envanteri — neyin ZATEN var olduğu

Bu bölüm sigortadır: aşağıdakiler kurulu ve ÇALIŞIYOR, yeniden kurulmaz.

- **Denetim izi (kalıcı):** `AuditEvents` tablosu (8 olay kodu, `DetailJson`
  serbest-biçim kolonu DAHİL), `/yonetim/gunluk` paneli (facet + arama +
  sayfalama), 365 gün saklama + otomatik temizlik, KVKK metinleri. Brif 11.
- **Operasyonel akış:** Serilog → stdout (dev metin, üretim
  `CompactJsonFormatter`); `UseSerilogRequestLogging` `ClientIp`/`UserId`
  zenginleştirmeli; sağlık uçları ve `/api/admin/logs` Verbose (geri besleme
  kapısı); `LogBufferSink` (500 kayıt, Information+) + `/yonetim/loglar`
  paneli (seviye/arama, elle + otomatik yenile, ayrıntı kartı). Brif 12.
- **İşletme:** Docker `local` log sürücüsü (20m×5 rotasyon), nginx
  access/error → stdout, `deploy/README.md` runbook'u (jq tarifleri).
  Brif 11 F4.

**Bilinçli KAPALI kararlar (yeniden açılmaz** — `docs/loglama-karari.md` §3):
dosya sink'i / volume / uygulama içi rotasyon YOK ("dosyaya yazılmaz, volume
bağlanmaz, rotasyon kurulmaz"); operasyonel log için DB sink'i YOK; **Seq /
Loki / merkezi toplama sunucu gününe (brif 06) ertelendi** — karar dosyasının
kendi sözüyle: "sunucu günü geldiğinde stdout'tan bir log driver'a
yönlendirmek tek satırlık iştir; şimdi kurmak erken." Kullanıcının "sonra
büyütürüz" beklentisinin karşılığı TAM OLARAK budur: stdout-tek-hedef mimarisi
sayesinde büyütme günü geldiğinde uygulamaya dokunmadan toplayıcı bağlanır.

## 1. Gerçek boşluklar — ölçülmüş

Depo genelinde grep (bin/obj hariç): `TraceIdentifier`, `X-Request-Id`,
`RequestId`, `Activity`, `traceparent` → **0 kullanım**. nginx.conf'ta
`$request_id` yok, `log_format sorgusuz`ta korelasyon alanı yok.

1. **Korelasyon kimliği yok (brif 11 risk tablosu E6, "opsiyonel, F4" diye
   iki kez ertelendi).** Bir isteğin nginx satırı, request-completion satırı
   ve aynı istek içindeki uygulama satırları (uyarılar, denetim yazımları)
   ancak zaman damgası tahminiyle eşleştirilebiliyor. Panelde bir hata satırı
   görüp "bu isteğin öteki satırları hangileri" sorusu cevapsız.
2. **Ayrıntı kartı sığ — tampon zengin veriyi kapıda atıyor.** İstek-tamamlama
   olayının property'lerinde `RequestMethod`, `StatusCode`, `Elapsed`,
   `ClientIp` ZATEN var (`UseSerilogRequestLogging` üretiyor, üretim JSON'una
   düşüyor) ama `LogBufferSink` yalnız `SourceContext`/`RequestPath`/`UserId`
   çekiyor — kart "GET /api/x → 500, 830 ms" DİYEMİYOR, diyebilecekken.
   İstisnanın da yalnız İLK satırı saklanıyor; kart teşhis için yetmiyor.
3. **Kopyalama yok.** Loglar panelinden satır dışarı çıkarmak elle seçim
   istiyor; `useClipboard` hook'u ve kopyala-düğmesi deseni depoda hazır
   (DfmSummaryBox) ama admin ekranlarına hiç bağlanmadı.

Bu üçü "altyapı + detay" isteğinin dürüst karşılığı. Dördüncüsü yok: kalanı
ya var (§0) ya bilinçli kapalı ya sunucu gününe ait.

## 2. F1 — İstek korelasyonu, uçtan uca (öneri: Sonnet 5 · high)

### Kimlik zinciri

```
nginx: proxy_set_header X-Request-Id $request_id;   (üretimde kaynak)
  ↓
API middleware: gelen X-Request-Id GEÇERLİYSE al, değilse ÜRET
  ↓
LogContext.PushProperty("RequestId", id)  →  istek içindeki HER satıra akar
  ↓
yanıt başlığı: X-Request-Id: <id>          →  istemci/destek görür
```

Dev'de nginx yok (vite proxy) — üretme dalı istisna değil, dev'in olağan
yoludur.

**Güvenlik — gelen başlık saldırgan kontrolündedir ve doğrulanmadan
kullanılmaz.** Kabul kuralı: yalnızca `[0-9a-fA-F-]`, uzunluk 8–64; aksi
hâlde yok sayılıp yeni kimlik üretilir. CLEF JSON kaçışlar, ama kimlik admin
panelinde ham gösterilecek ve nginx log satırına yazılacak — serbest metin
kabul edilmez. Üretilen kimlik: `Guid.NewGuid().ToString("n")` (32 hex,
nginx `$request_id` ile aynı biçim).

### Dokunulan yerler

- **Yeni middleware** (`Alp.Api/Logging/RequestIdMiddleware.cs` gibi):
  doğrula/üret + `LogContext.PushProperty` (dispose'lu) + yanıt başlığı.
  `UseSerilogRequestLogging`ten ÖNCE kaydedilir ki completion satırı da
  kimliği taşısın. `HttpContext.TraceIdentifier` da aynı değere çekilir
  (ASP.NET'in kendi hata sayfaları/istisna kayıtları aynı kimliği ansın).
- **`LogBufferSink`**: `LogBufferEntry`ye `RequestId` alanı (mevcut
  `PropertyString(logEvent, "RequestId")` deseniyle — `RequestPath`/`UserId`
  nasıl okunuyorsa aynen).
- **`AdminEndpoints.ListLogs` + `Contracts.LogEntryRow`**: alan eklenir;
  `q` araması mesaj+kaynak+yola EK requestId'de de arar (admin, kullanıcıdan
  gelen kimliği yapıştırıp o isteğin bütün satırlarını bulur — özelliğin asıl
  kullanım senaryosu budur).
- **Panel (`pages/admin/logs/`)**: kimlik AYRINTI KARTINA satır olarak girer,
  tabloya KOLON AÇILMAZ (brif 12 §5 "yalnız yer bırakır" sözü + brif 13'ün
  genişlik dersi — 32 hex'lik kolon tabloyu geri şişirir). Arama ipucu metni
  "istek kimliği" ifadesini de sayar (`text.js`, iki dilli).
- **nginx** (`deploy/nginx.conf`): `location /api/`ye `proxy_set_header
  X-Request-Id $request_id;` + `log_format sorgusuz`a `$request_id` alanı.
  Yalnız Docker yığınında görünür/test edilir. `deploy/README.md` runbook'una
  bir jq örneği: nginx satırı ↔ API satırı aynı kimlikle yan yana.
- **`.env.example` yan eksiği** (bu keşifte çıktı): brif 12 F1 "`.env` →
  `LOG_BUFFER_SIZE`" demişti ama `deploy/.env.example`a satır hiç girmemiş.
  F1 tek satırla kapatır (`LOG_BUFFER_SIZE=500` + yorum).

### Bilerek YAPILMAYANLAR (geri açılmasın)

| Fikir | Neden dışarıda |
|---|---|
| Denetim izine (`AuditEvents`) RequestId | Kalıcı/KVKK kaydını, restart'ta ölen uçucu bir kimliğe bağlamak değer üretmez; gerekirse `DetailJson` yolu migration'sız zaten açık — şema DEĞİŞMEZ |
| W3C `traceparent` / OpenTelemetry | nginx tarafı konuşmuyor, ikinci kimlik standardı karmaşa; Serilog 10 CLEF çıktısı `@tr/@sp`i kendiliğinden basıyorsa bonus olarak kalır (F1 turunda gerçek çıktıdan BAKILIR, sözleşme X-Request-Id'dir) |
| Kimliği yanıt gövdesine/hata sayfasına basmak | Başlık yeter; gövde sözleşmeleri değişmez |

### Testler

- Middleware: geçerli başlık aynen akar; geçersiz/eksik başlıkta üretilir ve
  yanıt başlığı döner; sahte `LogEvent` ile sink'e RequestId düştüğü
  (`LogBufferTests` deseni genişler).
- Uç: `q=<requestId>` eşleşmesi.
- Web: `text.test.js` bekçisi yeni anahtarlarla.

## 3. F2 — Ayrıntı zenginleştirme: "Görüntüle" gerçekten detaylı (öneri: Sonnet 5 · medium)

**Kayıtlı bir kararın bilinçli revizyonu.** Brif 12 §3 "LogEvent'in kendisi
tutulmaz, property sözlüğü bellekte şişer" diye kaydetmişti. O karar
SINIRSIZ saklamaya karşıydı ve doğruydu; burada açılan şey farklı: render
edilmiş, ADET ve UZUNLUK tavanlı küçük bir kopya. Revizyon bu cümleyle kayda
geçer, sessizce delinmez.

### Tampon: yapısal özellikler sözlüğü

`LogBufferEntry`ye `Properties` alanı — event'in property'lerinden render
edilmiş `ad → değer` sözlüğü, şu tavanlarla:

- Zaten özel alanı olanlar sözlüğe GİRMEZ (`SourceContext`, `RequestPath`,
  `UserId`, F1 sonrası `RequestId`) — çift gösterim olmaz.
- En çok **24 özellik**, değer başına en çok **256 karakter** (aşan kısım
  `…` ile kesilir), ad başına 64. Aşan özellik sayısı düşülür, sözlüğe
  `"…"` benzeri bir işaret satırı değil, sayı olarak `TruncatedCount` gider.
- Değerler `ScalarValue` ise `ToString`, değilse yapı `ToString()` çıktısı —
  derin serileştirme YOK (tavanın amacı bu).

Böylece istek satırları `RequestMethod`/`StatusCode`/`Elapsed`/`ClientIp`
taşır; F1'in `RequestId`'ı ve İLERİDE eklenecek her zenginleştirme
kendiliğinden akar — özellik başına kod değişikliği gerekmez ("sonra
detaylandırıp büyütürüz" isteğinin mekanik karşılığı budur).

### Tampon: tam istisna (tavanlı)

`Exception` alanı ilk satır yerine **ilk 4000 karakteri** saklar (kesilirse
sonuna `… (kısaltıldı)` işareti sunucu tarafında eklenir). Liste tablosunda
YİNE yalnız ilk satır gösterilir (mevcut davranış); tam metin ayrıntı
kartındadır. Tam yığın izi stdout'ta zaten var — bu, karta yetecek kopya.

### Bellek ve yük — ölçülü tavan

Tavanlarla en kötü kayıt ≈ 24×(64+256) + 4000 ≈ **12 KB**; 500 kayıtlık
tampon en kötü ~6 MB, tipik (istek satırı 4-6 özellik, istisna nadir)
**< 1 MB**. Uç yanıtı: varsayılan `take=200` ile tipik 100-300 KB — admin-
yalnız uç için kabul. `q` araması özellik sözlüğünde ARAMAZ: render edilmiş
mesaj değerleri zaten içeriyor, sözlükte ikinci tur arama maliyeti karşılıksız.

### Ekran: ayrıntı kartı yeniden düzenlenir

- Üst blok (mevcut satırlar): zaman, seviye, kaynak (tam ad), yol, kullanıcı,
  istek kimliği (F1), mesaj.
- Yeni **"Özellikler"** bölümü (`<h2 className="section">`): sözlük
  `ad → değer` tablo satırları; bilinen adlar iki dilli etikete çevrilir
  (`StatusCode` → "Durum kodu"/"Status code", `Elapsed` → "Süre (ms)",
  `RequestMethod` → "Yöntem"/"Method", `ClientIp` → "İstemci IP"), bilinmeyen
  ad HAM basılır (çevrilmeye çalışılmaz — teknik anahtar).
- Yeni **"İstisna"** bölümü (varsa): tam metin, mono/`pre` akışında,
  kart içinde kaydırılabilir.
- Kart brif 13 F2'nin `dialog-wide`'ına (720px) yaslanır — 13 önce yapılırsa
  hazır olur; yapılmadıysa 420px'te de çalışır, sadece sıkışık görünür.

### Bilerek YAPILMAYANLAR — güvenlik sınırı

Aşağıdakiler "detaylı olsun" kapsamına GİRMEZ ve eklenmez. Gerekçe brif 12'nin
kendi dersidir: bir log satırının panelde görünür olması, o satırın
İÇERİĞİNİN de güvenlik gözden geçirmesini gerektirir.

- **İstek/yanıt GÖVDESİ loglanmaz.** Giriş isteğinin gövdesi PAROLA taşır;
  kayıt/sıfırlama akışları token taşır. Gövde yakalama, ConsoleEmailSender
  vakasının (panele token sızması) büyük ölçekli tekrarı olur.
- **İstek başlıkları loglanmaz.** `Authorization` ve çerezler oturum
  kimliğidir; panele düşmeleri hesap devralma yoludur.
- **EF/SQL sorgu loglaması Information'a çekilmez.** Parametre değerleri
  kişisel veri taşıyabilir; gürültü ayrıca tamponu boğar.
- Verbose/Debug tampona alınmaz (eşik aynen), tampon varsayılanı 500 kalır
  (`LOG_BUFFER_SIZE` ile zaten ayarlanabilir).

### Testler

`LogBufferTests` genişler: özellik tavanları (25. özellik düşer + sayaç),
değer kesme (256+`…`), özel alanların sözlükten dışlanması, istisna 4000
tavanı + işaret, Debug eşiği regresyonu. Web: `text.test.js` bekçisine yeni
etiket anahtarları; bilinen-ad çeviri tablosu iki dilde yürünür.

## 4. F3 — Kopyalama (öneri: Sonnet 5 · medium)

İki yüzey, ikisi de mevcut `useClipboard` hook'uyla (`{ copy, state }`,
`COPY_DONE/FAILED`):

- **Ayrıntı kartına "Kopyala"**: kartın gösterdiği kaydı `Etiket: değer`
  satırlarıyla düz metin bloğu olarak panoya basar (zaman, seviye, kaynak
  [tam ad], yol, kullanıcı, istek kimliği, mesaj, F2'nin özellik sözlüğü
  satır satır, varsa TAM istisna bloğu). Düğme
  `btn-ghost` (kartta Kapat'ın yanı); başarıda etiket kısa süreli
  "Kopyalandı"ya döner, `COPY_FAILED`te `field-hint danger` notu.
- **Liste üstüne "Görünen satırları kopyala"**: o an süzülü/görünen satırları
  ekran sırasıyla, satır başına TSV olarak basar:
  `ISO-zaman <TAB> Seviye <TAB> Kaynak(tam) <TAB> Mesaj`. Sekmeli biçim
  bilinçli: editöre/e-tabloya yapıştırılabilir, grep'lenebilir. Özellik
  sözlüğü TSV'ye GİRMEZ — istek satırlarının mesajı yöntem/yol/durum/süreyi
  zaten render edilmiş taşıyor, satır başına düz metin bunun için yeter;
  tam zenginlik tekil kopyada. İkinci bir "JSON kopyala" düğmesi AÇILMAZ
  (kalabalık; istenirse ileride).

Etiketler `pages/admin/logs/text.js`e girer (iki dilli). `commonText`e
TAŞINMAZ: kopyala/kopyalandı sözlüğü bugün yalnız DFM ailesinde
(`dfmText.js`) ve şimdi bu ekranda — ÜÇÜNCÜ bir ekran isterse o gün
`commonText`e çıkarılır, tetik bu cümledir. Testler: `text.test.js` bekçisi;
TSV üretici saf fonksiyon olarak `text.js`/ayrı modülde tutulup birim test
edilir (satır sırası, sekme kaçışı — mesajda sekme varsa boşluğa indirgenir).

## 5. Sıra, doğrulama, commit

```
[brif 13 önerilir] ──► F1 (korelasyon) ──► F2 (ayrıntı) ──► F3 (kopyalama)
```

- Her faz kendi commit'i; commit öncesi tek review turu (brif 12 §6 deseni).
- Doğrulama F1: `dotnet test` yeşil; `npm run stack` altında curl ile —
  yanıtta `X-Request-Id` var, panel ayrıntı kartında görünüyor, `q`ya
  yapıştırınca satırlar süzülüyor; `npm run stack:docker` ile nginx
  access.log satırında kimlik + API satırıyla eşleşme (runbook jq örneği
  gerçek çıktıyla test edilir — brif 11 F4'te alan adları ilk taslakta yanlış
  çıkmıştı, aynı tuzak).
- Doğrulama F2: `dotnet test` + `npm test` yeşil + **ekran turu şart**:
  gerçek trafikte bir istek satırının kartında Yöntem/Durum kodu/Süre/IP
  görünüyor; bilerek patlatılan bir uçta (dev) tam istisna bloğu kartta
  kaydırılarak okunuyor; 200 satırlık liste yanıtının boyutuna bir kez
  bakılır (beklenen yüzler-KB bandı — MB'a taşıyorsa tavanlar yanlış
  uygulanmıştır).
- Doğrulama F3: `cd web && npm test` yeşil + **ekran turu şart**: iki düğme
  iki dilde, kopyalanan içerik gerçekten panodan yapıştırılıp bakılır
  (özellikler + tam istisna tekil kopyada), otomatik yenile açıkken
  kopyalama tutarlı (yenileme anına denk gelirse görünen liste neyse o
  kopyalanır — kabul).

## 6. Bu brifle DEĞİŞMEYEN şeyler

- Stdout-tek-hedef, tamponun uçuculuğu, seviye eşiği, geri besleme kapısı.
- **Gövde/başlık loglama yasağı** (§3'ün güvenlik sınırı) — "daha da
  detaylandırma" turlarında da geçerli kalır; bu sınırı esnetmek isteyen iş
  önce brif 12'nin token-sızıntısı dersini okur.
- `AuditEvents` şeması (migration YOK) ve denetim izi ekranı.
- Gizlilik/KVKK metinleri — istek kimliği teknik bir üretim kimliğidir,
  kişisel veri envanterini değiştirmez (IP/UserId zaten beyanlı).
- Seq/Loki/merkezi toplama — sunucu gününün işi olarak KALIR (§0'daki karar).
- Brif 13'ün kapsamı (genişlik/sarma) — ayrı iş, bu brif ona dokunmaz.
