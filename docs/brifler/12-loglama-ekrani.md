# Brif 12 — Operasyonel log ekranı (canlı kuyruk paneli)

Durum (2026-08-07): **F1, F2 ve F3 TAMAM ve commitli** (`bd751b9`, `8f68a5d`,
`5a8abcc`). **Brif 12 TÜMÜYLE BİTTİ.**

**F1/F2 sırasında bulunan ve düzeltilen kritik güvenlik regresyonu:**
`ConsoleEmailSender` dev'de e-posta gövdesini (doğrulama/parola sıfırlama
TOKEN'ı dahil) stdout'a yazar — bilinçli, `IEmailSender.cs`teki gerekçe:
"log'u okuyabilen herkese hesap devralma yolu". LogBufferSink eklenince bu
satır otomatik olarak panele de düştü: token artık SSH/terminal değil, web
admin girişiyle görülebiliyordu. `Program.cs`te bu kaynak sink'e giden
Serilog dalında filtrelendi (`Filter.ByExcluding` +
`Matching.FromSource<ConsoleEmailSender>()`), stdout'ta aynen kalıyor.
Regresyon testi: `LogBufferTests.cs` →
`console_email_sender_kaynakli_satirlar_tampona_hic_girmez`. **Ders — yeni
bir log kaynağı eklenirse ya da mevcut bir `logger.LogInformation` çağrısı
değişirse önce sorulmalı: bu satır hassas veri (token, parola, kimlik
doğrulama sırrı) taşıyabilir mi? Taşıyorsa aynı filtre deseni genişletilir.**

Sunucu BEKLEMEZ — tamamı yerelde yazılır ve `npm run stack` ile doğrulanır.

Zemin: `docs/brifler/11-loglama.md` §7 (F5) bu işi "YAPILMAZ, gerçek ihtiyaç
doğarsa ayrı brifle açılır" diye kayda geçirmişti. İhtiyaç doğdu (kullanıcı
isteği, 2026-08-07): yönetim panelinde uygulamanın o anki operasyonel akışını
gösteren bir ekran. `docs/loglama-karari.md` §3 (Serilog, yalnız stdout) bu
brifle de DEĞİŞMİYOR; buffer stdout'un yerine değil YANINA gelir.

Numara notu: depoda iki "Brif 11" var (`11-arac-bolunmesi.md`,
`11-loglama.md`) — bu dosya 12'den devam eder, üçüncü bir çakışma yok.

---

## 0. Bugün ne var

- Denetim izi (kim ne yaptı): `AuditEvents` tablosu + `/yonetim/gunluk`
  ekranı — kalıcı, KVKK'ya konu, TAMAM. Bu brif ona DOKUNMAZ.
- Operasyonel günlük (ne oluyor): Serilog → yalnız stdout
  (`Program.cs:24,32-48`; dev'de metin, üretimde `CompactJsonFormatter`).
  Panelden görünmüyor; okumak `docker logs` / stack konsolu istiyor.
- `UseSerilogRequestLogging` (`Program.cs:531+`): `ClientIp` + `UserId`
  zenginleştirmesi; sağlık uçları Verbose (yazılmaz), 5xx/istisna Error.
- Yönetim panelinde iki sekme: Kullanıcılar | Günlük (`AdminTabs.jsx`);
  Günlük ekranı facet + arama + `.result-table` + ayrıntı kartı deseniyle
  hazır şablon (`web/src/pages/admin/audit/`).

## 1. İş — tek cümle

Uygulamanın son N log satırını bellekte tutan bir Serilog sink'i, onu okuyan
admin-yalnız bir uç ve Günlük ekranı desenine oturan üçüncü bir yönetim
sekmesi ("Loglar").

## 2. Mimari karar — bellek içi halka tampon

**Seçilen:** `ILogEventSink` uygulayan sabit kapasiteli halka tampon
(varsayılan 500 kayıt, `App:LogBufferSize`). Süreç belleğinde yaşar,
yeniden başlatmada uçar — bu bir ÖZELLİKTİR: kalıcı olması gereken kayıt
denetim izinde zaten var; bu ekran "şu an ne oluyor" sorusuna bakar.

Elenenler (gerekçeyle, geri açılmasın):

| Seçenek | Neden elendi |
|---|---|
| DB sink'i | Operasyonel log hacimli/uçucu; DB'ye yazmak denetim iziyle kavramı karıştırır (brif 11 §2), disk büyütür, stdout-tek-hedef kararını deler |
| Docker API / `docker logs` okumak | Konteynerin kendi loguna erişimi `docker.sock` mount ister — güvenlik deliği; dev'de (docker'sız stack) hiç çalışmaz |
| Dosya sink'i + tail | `loglama-karari.md` §3'ün açıkça yasakladığı yol |
| Seq/Loki | Dördüncü servis, erken (aynı karar §3) |

**Gizlilik ödünü (bilinçli, kayda geçir):** brif 11 F5'in eleme gerekçesi
"IP/kimlik içeren satırlar ikinci yüzeye taşınır" idi. Kabul ediliyor çünkü
yüzey yalnız Admin rolü (JWT + SecurityStamp; admin zaten kullanıcı listesini
ve denetim izini görüyor) ve tampon uçucu (saklama SÜRESİ artmıyor — gizlilik
metnindeki "birkaç günlük pencere" beyanının ALTINDA kalır, metin değişikliği
GEREKMEZ). Token sızıntısı yok: sink stdout'a giden event'lerin aynısını
görür, tokenlı yol zaten loglanmıyor (nginx `sorgusuz` + API token'sız yol).

## 3. F1 — Sink + uç (öneri: Sonnet 5 · high)

### `Alp.Api/Logging/LogBufferSink.cs` (yeni)

- `ILogEventSink`; kilitli halka tampon (`Queue<T>` + `lock` yeter — event
  başına maliyet zaten formatter'la kıyaslanabilir, lock çekişmesi yok
  denecek kadar az; lock-free yapı KURMA).
- Kapasite `App:LogBufferSize` (varsayılan **500**, `.env` →
  `LOG_BUFFER_SIZE`). Dolunca en eski düşer.
- Kayıt başına saklanan (küçük, RENDER EDİLMİŞ — LogEvent'in kendisi
  tutulmaz, property sözlüğü bellekte şişer): `OccurredAt` (UTC), `Level`,
  `Message` (render), `Exception?.ToString()` İLK SATIRI (tam stack trace
  tutulmaz — stdout'ta zaten var), `SourceContext` kısa adı, varsa
  `RequestPath` ve `UserId`.
- **Seviye eşiği: Information ve üstü.** Verbose/Debug tampona girmez —
  sağlık uçları böylece kendiliğinden dışarıda.
- DI: `AddSerilog` bloğunda `cfg.WriteTo.Sink(buffer)` — hem dev hem üretim
  dalında (iki daldan ÖNCE ortak satır olarak; tek dala koyup ötekini
  unutma). Sink nesnesi ayrıca `builder.Services.AddSingleton` ile uca
  verilir.

### Geri besleme kapısı (F1'in incelikli kısmı)

Panel açıkken her yenileme isteği `UseSerilogRequestLogging`ten bir
Information satırı üretir → tampon kendi okunma kayıtlarıyla dolar.
Çözüm sağlık ucu deseninin aynısı: `GetLevel` içinde `/api/admin/logs`
yolu da Verbose'a düşürülür (`Program.cs:516-531` civarındaki mevcut
fonksiyona bir koşul). 5xx/istisna istisnası aynen korunur — uç patlarsa
Error olarak görünür.

### Uç: `GET /api/admin/logs` (`AdminEndpoints.cs`e eklenir)

- Yetki: mevcut admin grubunun aynısı (rol + SecurityStamp).
- Parametreler: `level` (boş | `warning` | `error` — error=Error+Fatal,
  warning=Warning ve üstü), `q` (mesaj + kaynak + yol içinde, ILIKE değil —
  bellekte `Contains`, kültür-bağımsız küçük harf), `take` (varsayılan 200,
  tavan = tampon kapasitesi).
- Dönüş: yeni→eski sıralı dizi + `bufferSize`/`capacity` alanları (ekran
  "son 500'ün penceresi" notunu bununla basar). DB'ye HİÇ dokunmaz.

### Testler (`Alp.Api.Tests/LogBufferTests.cs`, yeni)

- Kapasite: 501. event ilkini düşürür.
- Eşik: Debug event tampona girmez.
- Süzme: level/q/take davranışı (sink'e sentetik event basarak — uç
  işleyicisi doğrudan çağrılır, `InternalsVisibleTo` deseni hazır).
- İstisna satırı: yalnız ilk satır saklanıyor.

## 4. F2 — Panel: Loglar sekmesi (öneri: Sonnet 5 · medium)

Şablon: `web/src/pages/admin/audit/` BİREBİR kopyalanıp uyarlanır — düzen,
facet, arama, `.result-table`, `.table-scroll` sarmalı, ayrıntı kartı,
`getText(lang)` deseni aynen.

- Rota: `routes.js` → `adminLogs: { tr: '/yonetim/loglar', en: '/en/admin/logs' }`.
  Yönetim rotaları `indexablePages()` DIŞINDA — yeni rota da öyle kalır,
  prerender/sitemap işi YOK.
- `AdminTabs.jsx`e üçüncü sekme: Kullanıcılar | Günlük | **Loglar**.
- Tablo kolonları: Zaman (`formatDateSeconds` — operasyonel akışta saniye
  HEP açık, günlükteki aynı-dakika mantığına gerek yok) / Seviye / Kaynak
  (`SourceContext` kısa adı) / Mesaj. Ayrıntı kartı: tam mesaj + yol +
  UserId + istisna satırı.
- Seviye ↔ renk: `Error|Fatal → danger`, `Warning → warning`,
  `Information → unknown` (nötr gri — "bilgi" olumlu sonuç değildir,
  yeşile BOYANMAZ; `mark` sınıfları hazır).
- Seviye adları (`Information`, `Warning`…) teknik terimdir, ÇEVRİLMEZ —
  `text.js`te kolon başlıkları/açıklamalar iki dilli, seviye değeri ham.
- Yenileme: **elle "Yenile" düğmesi** (`btn-ghost`). Otomatik poll F3'e —
  ilk fazda karmaşıklık alma. Üstte kalıcı not: "Bellekteki son N kayıt;
  uygulama yeniden başlayınca sıfırlanır. Kalıcı iz: Günlük sekmesi."
  (iki dilli, `text.js`).
- Boş durum: "Tamponda kayıt yok" + yükleniyor/hata durumları audit
  ekranındaki desenle.
- Testler: `text.test.js` (audit'inkiyle aynı bekçi deseni — PLAIN/columns
  listeleri) + `langLink.guard` zaten genel taramada yakalar.

## 5. F3 — Opsiyonel cilalar (öneri: Sonnet 5 · medium; İSTENİRSE)

- Otomatik yenile anahtarı: 5 sn poll, sekme görünür değilken durur
  (`document.visibilityState`), varsayılan KAPALI.
- Korelasyon: brif 11 E6/F4'ün opsiyonel `X-Request-Id` maddesi yapılırsa
  kolona `RequestId` eklenir — bu brif ONU AÇMAZ, yalnız yer bırakır.

## 6. Sıra, doğrulama, commit

```
F1 (sink + uç, api) ──► F2 (panel, web) ──► [F3 istenirse]
```

- Her faz kendi commit'ini atar; faz bitmeden sonrakine geçilmez.
- Doğrulama F1: `dotnet test Alp.Api.sln` yeşil + `npm run stack` altında
  `curl`la uç (admin token'lı) gerçek satır döndürüyor.
- Doğrulama F2: `cd web && npm test` yeşil + **ekran gerçekten açılır**
  (tarayıcıda `/yonetim/loglar`: satırlar görünür, seviye süzer, arama
  süzer, Yenile çalışır, mobil genişlikte `.table-scroll` kayar, `/en`
  ağacında tam İngilizce). Yeşil test yetmez — ekran turu şart.
- Commit öncesi tek review turu (Adım 3/5 dersi): `/code-review` ya da
  Opus · high tek oturum; bulgular kapatılmadan commit atılmaz.

## 7. Bu brifle DEĞİŞMEYEN şeyler

- Stdout-tek-hedef (`loglama-karari.md` §3): dosya sink'i, volume, uygulama
  içi rotasyon yine YOK. Buffer stdout'un yanına eklenir, yerine geçmez.
- Denetim izi (`AuditEvents`, Günlük ekranı, saklama süresi, KVKK metni) —
  bu brifin kapsamı dışında, dokunulmaz.
- Gizlilik/KVKK metinleri — değişiklik gerekmez (bkz. §2 gizlilik ödünü).
- nginx/Docker log yapılandırması (brif 11 F4) — aynen kalır.
