# Loglama kararı — Serilog (2026-08-06)

Bu dosya `docs/alan-cozucu-karari.md` ve `docs/rapor-snapshot-karari.md` ile
aynı işi görür: seçilenin yanında **elenenler ve gerekçeleri** de burada durur,
böylece bir sonraki değişiklik kararı yeniden tartışmak zorunda kalmaz.

## 0. Durum tespiti (ölçüldü, tahmin değil)

Bugünkü hâl:

- Serilog **yok**; `Microsoft.Extensions.Logging` varsayılanı konsola yazıyor.
- 6 dosyada 17 log çağrısı var ve **neredeyse hepsi zaten yapılandırılmış
  şablon kullanıyor** (`{Count}`, `{ReportId}`, `{To}`, `{Bytes}`). Yani
  Serilog'a geçiş, çağrı yerlerini yeniden yazmayı gerektirmiyor — fayda ilk
  günden geliyor.
- Testler `Program.cs`'i **kullanmıyor**: `Alp.Api.Tests/TestHost.cs` kendi
  konağını kuruyor ve uçlar işleyici seviyesinde çağrılıyor. Loglama kurulumu
  test koşumunu etkilemez.
- API konteyneri `HEALTHCHECK --interval=15s` ile `/api/health` çağırıyor
  (`api/Dockerfile:55`). Bu **günde 5760 istek** demek ve aşağıdaki 6. kararın
  tek gerekçesi budur.
- `App:KnownProxyNetworks` / `App:KnownProxies` zaten yapılandırılıyor
  (`Program.cs:440-457`), yani `UseForwardedHeaders` sonrası
  `RemoteIpAddress` gerçek istemci IP'sidir. Log'a IP yazmanın ön şartı hazır.

## 1. Tek paket: `Serilog.AspNetCore` 10.0.0

Ek sink paketi **eklenmez**. NuGet'ten doğrulandı — 10.0.0'ın `net9.0` grubu
şunları zaten getiriyor:

```
Serilog 4.3.0
Serilog.Extensions.Hosting 10.0.0
Serilog.Formatting.Compact 3.0.0   ← JSON formatter, 3. karar
Serilog.Settings.Configuration 10.0.0
Serilog.Sinks.Console 6.1.1        ← stdout, 3. karar
Serilog.Sinks.Debug 3.0.0
Serilog.Sinks.File 7.0.0           ← kullanılmıyor, bkz. 10. bölüm
```

`Serilog.Sinks.Console` ve `Serilog.Formatting.Compact` ayrıca eklenirse
sürümleri bu grafikle ayrışabilir; eklenmiyor.

## 2. İki aşamalı kurulum (bootstrap logger)

`Log.Logger` DI kurulmadan **önce** bir bootstrap logger'la ayağa kaldırılır,
konak kurulduktan sonra gerçek yapılandırmayla değiştirilir.

Gerekçe kozmetik değil: `Program.cs` açılışta bilerek `throw` ediyor —
`App:KnownProxyNetworks` içindeki bozuk bir CIDR (satır 443) ve
`App:KnownProxies` içindeki bozuk IP (satır 451) uygulamayı durduruyor.
Bootstrap logger olmadan bu iki hata yapılandırılmış log'a **hiç girmez**,
çıplak stderr'e düşer; konteyner açılışta ölür ve `docker logs` çıktısında
diğer kayıtlardan farklı biçimde görünür.

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);
    builder.Services.AddSerilog((services, cfg) => cfg
        .ReadFrom.Configuration(builder.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console(/* 3. karar */));
    // … mevcut Program.cs gövdesi …
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Uygulama açılışta durdu.");
    throw;   // yutulmaz: konteyner yine ölmeli, exit kodu korunur
}
finally
{
    Log.CloseAndFlush();   // stdout'a yazılmamış kayıt kalmasın
}
```

`throw;` bilinçlidir: hata loglanır ama **yutulmaz**. Yutulsaydı konteyner 0
ile çıkar, Docker "başarıyla bitti" sanar ve yeniden başlatma politikası
devreye girmezdi.

## 3. Hedef: yalnız stdout — geliştirmede metin, üretimde JSON

Karar: **dosyaya yazılmaz, volume bağlanmaz, rotasyon kurulmaz.** Konteyner
stdout'a yazar, toplama işi Docker log driver'ınındır.

```csharp
.WriteTo.Console(formatter: builder.Environment.IsDevelopment()
    ? null                              // okunabilir metin şablonu
    : new CompactJsonFormatter())       // tek satır JSON
```

Elenenler:

- **Dosya sink + volume.** Konteynerde log dosyası iki yeni sorumluluk doğurur:
  volume yönetimi ve disk dolduğunda API'nin durması. Kazancı — konteyner
  silinse de geçmişin kalması — sunucu alınana kadar teoriktir, çünkü şu an
  kalıcı bir sunucu yok.
- ~~**Seq / merkezi hedef.** Yığına dördüncü bir servis ekler ve bakım yükü
  getirir. Sunucu günü (brif 06) geldiğinde stdout'tan bir log driver'a
  yönlendirmek tek satırlık iştir; şimdi kurmak erken.~~ **2026-08-08'de geri
  alındı, bkz. §12.** Gerekçe değişmedi (bakım yükü hâlâ gerçek), ama uygulama
  büyüdükçe stdout'u elle okumanın maliyeti bakım yükünü geçti. stdout hedefi
  KALKMADI — Seq stdout'un yanına eklendi, yerine geçmedi.

Bu kararın bedeli — konteyner silinince stdout log geçmişi gider — hâlâ
geçerli, ama artık tek kopya değil: Seq ayrı bir volume'da kalıcı tutuyor
(§12). Dosya sink + volume kararı (yukarıdaki madde) değişmedi.

## 4. İstek özeti: `UseSerilogRequestLogging`

Her istek için ASP.NET'in ürettiği 2-3 satır yerine **tek özet satır** yazılır
(yol, durum kodu, süre). Pipeline'daki yeri:

```
app.UseForwardedHeaders(forwardedOptions);
app.UseSerilogRequestLogging(opt => { /* 5. ve 6. karar */ });   ← BURAYA
if (…) app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
```

`UseForwardedHeaders`'dan **sonra** olmalı: önce konsa `RemoteIpAddress`
nginx'in IP'si olur ve loglanan IP hep aynı çıkar. `UseAuthentication`'dan
**önce** olması sorun değil — middleware isteği sarar, özet satırı istek
biterken yazılır, o an `HttpContext.User` çoktan doludur (5. karar bunu
kullanır).

## 5. Zenginleştirme: UserId + istemci IP

Ayrı bir middleware **yazılmaz**; `EnrichDiagnosticContext` yeter ve istek
tamamlandığında çalıştığı için kimlik bilgisi hazırdır:

```csharp
opt.EnrichDiagnosticContext = (diag, http) =>
{
    diag.Set("ClientIp", http.Connection.RemoteIpAddress?.ToString());
    var userId = http.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userId is not null) diag.Set("UserId", userId);
};
```

`UserId` yalnız varsa yazılır — anonim isteklerde alanın `null` olarak
durması JSON'u şişirir ve "oturum açık ama kimlik boş" gibi okunur.

## 6. Sağlık uçları özet satırı üretmez

Tek gerekçe ölçüm: `/api/health` günde **5760 kez** çağrılıyor. Varsayılan
ayarla bu, günde 5760 satırlık ve tamamı `GET /api/health 200` diyen bir
gürültüdür; gerçek kayıtları içinde kaybeder.

```csharp
opt.GetLevel = (http, elapsed, ex) =>
    ex is not null || http.Response.StatusCode >= 500 ? LogEventLevel.Error
    : http.Request.Path.StartsWithSegments("/api/health") ? LogEventLevel.Verbose
    : LogEventLevel.Information;
```

Sağlık ucu **Verbose**'a düşer, yani varsayılan seviyede hiç yazılmaz — ama
sustur*ul*maz: o uç 500 dönerse ya da patlarsa `Error` dalı önce çalışır ve
kayıt yine düşer. Gürültü susturmanın bir arızayı da susturması bu sırayla
engellenir.

## 7. Gizlilik sınırı — yazılan ve yazılmayan

Kullanıcı kararı: **e-posta ve IP yazılır; token, parola ve bağlantılar
yazılmaz.**

| Yazılır | Yazılmaz |
|---|---|
| `UserId` (GUID) | parola, parola hash'i |
| e-posta adresi | erişim/yenileme token'ı |
| istemci IP | e-posta doğrulama / parola sıfırlama **bağlantısı** |
| yol, durum kodu, süre | `Authorization` başlığı |

Bu, projenin mevcut çizgisiyle uyumludur ama **ondan daha gevşektir** ve bu
bilinçlidir: sunucu "hangi alan hatalı" demiyor (`INVALID_CREDENTIALS`, tek
kod) çünkü orada muhatap saldırgan olabilir; log ise içeridedir ve kötüye
kullanım takibi (hangi IP bruteforce yapıyor) ancak IP yazılırsa mümkündür.

Bedeli kayda geçer: **loglar artık kişisel veri taşır.** Saklama süresi ve
erişim, sunucu gününde (brif 06) ele alınmalıdır; 3. karar gereği bugün log
yalnız konteynerin ömrü kadar yaşıyor, bu da geçici bir sınır olarak işe
yarıyor.

### 7.1 Açık risk — `ConsoleEmailSender` bağlantıyı logluyor

`Alp.Api/Auth/IEmailSender.cs:23` posta **gövdesini** logluyor:

```csharp
logger.LogInformation("[dev e-posta] Kime: {To} — Konu: {Subject}\n{Body}", …);
```

Gövde, doğrulama ve parola sıfırlama **bağlantısını** içerir. Geliştirmede
bu kasıtlıdır ve tek okuma yoludur (CLAUDE.md → e2e notu), korunmalı.

Risk şurada: `ConsoleEmailSender`'a düşme koşulu **ortam değil yapılandırma**
— `Smtp:Host` ya da `Smtp:FromAddress` boşsa düşülüyor. Yani üretimde SMTP
yapılandırılmadan açılırsa uygulama çalışmaya devam eder ve **parola sıfırlama
bağlantılarını loglara yazar.** CLAUDE.md bu düşüşü zaten "üretimde bir arıza"
sayıyor ve açılışta uyarı basılıyor, ama uyarı log'a yazmayı durdurmuyor.

**Karar: gövde yalnız `Development`'ta yazılır** (bu brifin kapsamında).
Değilse yalnız alıcı ve konu kalır. Geliştirmedeki sıfırlama akışı aynen
korunur — bağlantı yine konsolda görünür, e2e notundaki tek okuma yolu
bozulmaz; üretimdeki sızıntı yolu kapanır.

Ortam kontrolü **yapılandırmaya değil `IHostEnvironment`'a** bağlanır: sızıntıyı
doğuran şeyin kendisi zaten "yapılandırma boş kalınca sessizce düşme"ydi, aynı
kırılgan koşula ikinci kez yaslanılmaz.

## 8. Mevcut 17 çağrıya dokunulmaz

Serilog `ILogger<T>` sağlayıcısını devraldığı için hepsi çalışmaya devam eder
ve zaten yapılandırılmış şablon kullandıkları için (0. bölüm) JSON çıktıda
alanlar kendiliğinden ayrışır. Toplu yeniden yazım **kapsam dışıdır** — bu
brifi mekanik bir işten karar gerektiren bir işe çevirirdi.

## 9. Gürültü eşikleri

`appsettings.json` içindeki mevcut `Logging:LogLevel` bloğu Serilog'un
`ReadFrom.Configuration` yoluyla okuduğu `Serilog` bloğuyla **değiştirilir**;
ikisi birlikte durursa hangisinin kazandığı okunmaz olur.

```jsonc
"Serilog": {
  "MinimumLevel": {
    "Default": "Information",
    "Override": {
      "Microsoft.AspNetCore": "Warning",
      // EF Core Information seviyesinde her sorgunun SQL'ini basar.
      // İstek özeti (4. karar) zaten var; SQL gürültüsü onu gömer.
      "Microsoft.EntityFrameworkCore.Database.Command": "Warning"
    }
  }
}
```

## 10. Kapsam dışı (bilerek)

- **Dosya sink / log rotasyonu** — 3. karar. Paket grafiğinde `Sinks.File`
  var ama kullanılmıyor; bir sink'in gelmiş olması onu kurma gerekçesi değil.
- ~~**Seq, Loki, merkezi toplama** — sunucu günü (brif 06).~~ Seq artık
  kapsamda, bkz. §12. Loki hâlâ kapsam dışı (gerek yok, Seq karşılıyor).
- **17 çağrının şablon revizyonu** — 8. karar.
- **İstek/yanıt gövdesi loglama** — hiç yapılmayacak: parola ve token tam
  olarak orada akıyor.
- **Log saklama süresi ve erişim politikası** — 7. karar, sunucu gününe.

## 10.1 Uygulama sırası (şartname)

1. `Alp.Api.csproj` → `Serilog.AspNetCore` 10.0.0 (tek paket, 1. karar).
2. `Program.cs` → bootstrap logger + `AddSerilog` + `try/catch/finally`
   (2. karar). `throw;` ve `Log.CloseAndFlush()` düşmemeli.
3. `Program.cs` → `UseSerilogRequestLogging`, `UseForwardedHeaders`'ın hemen
   ardına (4. karar).
4. `EnrichDiagnosticContext` → `ClientIp` her istekte, `UserId` yalnız varsa
   (5. karar).
5. `GetLevel` → 5xx/exception `Error`, `/api/health` `Verbose`, geri kalanı
   `Information`. Sıra bu; `health` kontrolü hata kontrolünden ÖNCE gelirse
   bozuk sağlık ucu susar (6. karar).
6. `appsettings.json` → `Logging` bloğu `Serilog` bloğuyla **değiştirilir**
   (9. karar; ikisi bir arada bırakılmaz).
7. `Auth/IEmailSender.cs` → gövde yalnız `Development`'ta, kontrol
   `IHostEnvironment` üzerinden (7.1).
8. 11. bölümdeki sekiz doğrulama koşulur.

Kapsam bu sekiz maddedir. 17 mevcut çağrıya, testlere ve
`deploy/docker-compose.yml`e dokunulmaz.

## 11. Doğrulama (uygulama bittiğinde koşulacak)

1. `dotnet test Alp.Api.sln` — yeşil kalmalı (0. bölüm: testler etkilenmiyor).
2. `npm run stack` ile açılışta konsolda **okunabilir metin** görünmeli.
3. `npm run stack:docker` ile `docker compose logs api` çıktısı **tek satır
   JSON** olmalı.
4. Bir isteğe bak: `ClientIp` gerçek IP olmalı, nginx'inki değil.
5. Oturum açıp bir istek at: `UserId` alanı düşmeli; anonim istekte düşmemeli.
6. Bir dakika bekle: `/api/health` çağrıları log'a **girmemeli**.
7. `/api/health` bilerek 500'e zorlanırsa kayıt **girmeli** (6. karar).
8. Parola sıfırlama iste: geliştirmede bağlantı log'da görünmeli, `Production`
   ortamında görünmemeli (7.1).

## 12. Seq eklendi (2026-08-08) — sunucu gününü beklemeden

§3'teki "Seq erken, sunucu gününde" kararı geri alındı. Sunucu (brif 06) hâlâ
yok — bu değişmedi. Değişen şey: kategori sayısı ve log hacmi büyüdükçe
"stdout'u `docker compose logs` ile elle okumak" yönteminin kendisi darboğaz
oldu; sorgulanabilir bir hedefin maliyeti (tek ek konteyner, ~250 MB RAM)
bu darboğazdan daha ucuz hale geldi. §0'daki "hangi araç" sorusuna cevap:
**Seq**, çünkü Serilog'un yapılandırılmış alanlarını (`RequestId`, `UserId`,
`ClientIp`, kategori) hiç dönüştürmeden sorgulanabilir yapıyor — Loki gibi bir
etiketleme/parse katmanı gerekmiyor.

**Kapsam bilerek dar tutuldu, sunucu kararını önceden almaz:**

- Seq yalnız **local `docker-compose.yml`**'e eklendi (`npm run stack:docker`
  yolunda). `docker-compose.prod.yml`'e **dokunulmadı** — orada retention,
  erişim/kimlik doğrulama ve dışa açık port gibi kararlar gerekir ve bunlar
  hâlâ §7'nin belirttiği gibi sunucu gününe kalıyor. Sunucu geldiğinde aynı
  servis prod compose'a taşınırken bu kararlar o gün verilir.
- stdout hedefi **kalkmadı**, Seq onun yanına eklendi (Program.cs'te ikinci
  bir `WriteTo`). `docker logs` / `docker compose logs` yolu hâlâ çalışır.
- Bağlantı **koşullu**: `Seq:Url` config değeri boşsa sink hiç eklenmez.
  `appsettings.json`'daki varsayılan boş — yani düz `dotnet run` /
  `npm run stack` (Docker'sız günlük iş akışı) hiç etkilenmez, Seq'e
  bağlanmaya çalışıp hata basmaz. Yalnız `docker-compose.yml` ortam
  değişkeniyle (`Seq__Url=http://seq`) açılır.
- Seq container'ının portu yalnız `127.0.0.1`'e bağlı — dışarıya kapalı,
  yalnız geliştiricinin kendi makinesinden `localhost:5341` ile erişilir.
- **Retention politikası otomatik kurulmadı.** Seq açık kaynak sürümünde
  saklama süresi arayüzden (Settings → Retention) ayarlanır; env değişkeniyle
  güvenilir biçimde scriptlenemiyor. İlk açılışta elle 14 gün gibi bir sınır
  konmalı — konulmazsa Seq'in kendi volume'u sınırsız büyür. Bu adım burada
  bilerek otomatikleştirilmedi (ek init script = ek bakım yükü, kapsamı
  büyütür); sunucu gününde kalıcı bir volume'a taşınırken tekrar gözden
  geçirilmeli.
