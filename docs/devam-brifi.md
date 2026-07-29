# Devam brifi

Proje: `/Users/canbektas/Projects/alp-pcb-toolkit` — ALP PCB Toolkit.
Plan/durum tek kaynak: `docs/uyelik-ve-rapor-plani.md` (§9 faz tablosu, §12/14/15/16/17
tamamlanan fazların durumu, §13 kalan noktalar). Mimari kurallar: `CLAUDE.md`.
Dağıtım runbook'u: `deploy/README.md`.

## Şu anki durum

Dal: **`feat/uretim-dfm-araclari`**. `main` üzerindeki son commit `d511487` (Faz 0–6).

> **Commit'siz iş var.** Faz 8 + arayüz işleri + hata düzeltmeleri ve bunların üstüne
> kayıt döngüsü (§18) henüz commit'lenmedi — kullanıcı commit istemedi. İlk iş bunu
> sormak olabilir.

```
cd web && npm test                        → 1887/1887 yeşil
cd api && dotnet build Alp.Api.sln        → temiz
cd deploy && docker compose up -d --build → yığın ayakta
```

**Uygulama şu an çalışıyor: <http://localhost:8080>**
Test hesabı: `test@alp.local` / `1234567`
(Parola politikası en az 10 karakter ister; bu hesabın özeti veritabanında elle
değiştirildi, uygulama politikasına dokunulmadı. Bu parolayla YENİ kayıt açılamaz.)

## Biten fazlar

**Faz 0–6** (`d511487`): repo `web/` + `api/`; .NET backend (Identity+JWT, EF Core,
Projects/Calculations CRUD); frontend auth ekranları; PDF/Excel rapor üretimi; 25 aracın
tamamına `report.js` + testleri + `SaveToProject`. `BrowserRouter`, `base: '/'`.

**PCB Üretim ve DFM kategorisi** (bu dalda): dört araç yazıldı, kategoride "yakında" yok.

**Faz 8 — dağıtım** (bu oturumda): yığın yazıldı ve **yerelde gerçekten koşturuldu**.

- `deploy/`: `docker-compose.yml`, `docker-compose.prod.yml` (ghcr.io imajları + TLS +
  certbot), `nginx.conf`, `nginx.prod.conf.template`, `.env.example`, `backup.sh`,
  sunucu runbook'lu `README.md`.
- `api/Dockerfile`, `web/Dockerfile`, kök `.dockerignore`.
- `.github/workflows/`: GitHub Pages akışı gitti. `ci.yml` her dalda test/derleme,
  `deploy.yml` yalnızca `main`'de imaj derleyip `ghcr.io`'ya iter.
- Backend: yapılandırmadan gelen `KnownProxyNetworks`, kapatılabilir HTTPS yönlendirmesi,
  açılışta migration, `/api/health` + `/api/health/ready`, kalıcı Data Protection
  anahtarları, gerçek `SmtpEmailSender` (MailKit) + yapılandırılmamışsa konsola düşüş.

Doğrulananlar: yedi derin bağlantı 200, migration + 13 tablo, kayıt→doğrulama→giriş→
`/api/me`→yenileme→proje, ters vekil IP'si gerçek istemci, PDF gözle denetlendi.

## Kayıt döngüsü — kaydet / gör / aç / güncelle (§18)

Kaydetme tek yönlü bir yazmaydı: `InputsJson` doluyor ama hiç okunmuyordu, aynı hesabı
ikinci kez kaydetmek kopya satır açıyordu, `EngineVersion` hiç kullanılmıyordu ve proje
listesindeki önizleme ham JSON anahtarı gösteriyordu (`wMm 0.3605`). Dördü de kapatıldı.

- **Bağ kavramı**: ekran `?hesap=<id>` ile kayda bağlanır. Bağsızken "Kaydet" yeni satır
  açar ve hemen ardından bağlanır; bağlıyken "Kaydı güncelle" üzerine yazar. Kopya isteyen
  "Yeni kayıt olarak ekle" ile bağı koparır.
- Yeni: `GET /api/calculations/{id}`, `lib/savedCalculation.js` (saf, 21 test),
  `hooks/useSavedCalculation.js`. 29 araç ekranının tamamı bağlandı.
- Yeni bekçi testi `pages/tools/toolKeys.test.js` (90 iddia): `toolKey` ↔
  `categories.js` eşleşmesi, her aktif katalog kaydının ekranı, her ekranın kayıt
  bağını geçirmesi. Yukarıdaki ayrışma bir daha sessizce geri gelmesin diye.
- Proje detayında her satırda "Aç" bağlantısı, etiketli önizleme, mod ve "eski sürüm" çipi.
- **Yol boyunca çıkan hata**: `categories.js`'teki üç DFM aracının `id`'si kaydedilen
  `toolKey` ile ayrışmıştı (`bga` ↔ `bga-breakout`, `stackup` ↔ `stackup-planner`,
  `clearance` ↔ `clearance-creepage-padstack`) — listede ham anahtar görünüyordu. `id`
  kaydedilen anahtara hizalandı.
- Doğrulama: `scratchpad/pw/verify-kayit.mjs` (17 kontrol, gerçek tarayıcı) ve
  `sweep-kayit.mjs` (29 ekran). **Sweep hız sınırına takılır**: her tam sayfa yüklemesi bir
  `/api/auth/refresh` çağırır ve o ucun sınırı IP başına 5 dakikada 30 — betik yüklemeleri
  bu yüzden tempoya sokar. 429 görürsen ürün hatası değil, otomasyonun hızıdır.

## Bu oturumda yapılan arayüz işleri

- **Giriş ekranı**: `.btn-primary` (dolu vurgu, tam genişlik) dört temaya eklendi ve dört
  auth ekranına uygulandı; "Beni kaydet" + "Parolamı unuttum" tek satırda.
- **Beni kaydet**: hem e-postayı hatırlar (`lib/rememberedEmail.js` + `useRememberedEmail`)
  hem oturumu kalıcı tutar. Sunucu tarafı: `RefreshToken.Persistent` sütunu + migration;
  tik yoksa çerez **oturum çerezi** olur. Döndürmede seçim korunur.
- **Çıkışta ana sayfaya dönüş** + ekranın ortasında bildirim kartı (`components/Toast.jsx`,
  `hooks/useNotice.jsx`). Modal değil: arkayı karartmaz, tıklamayı yutmaz. 3 sn, × ile ve
  Esc ile kapanır, altında süre notu. Süre `NOTICE_TIMEOUT_MS` tek yerde.
- **DFM özeti kopyalama**: geniş düğme yerine kutunun sağ üstünde simge düğmesi (kod bloğu
  deseni), basınca onay işaretine döner.
- **Şematik düzeltmeleri**: ThermalRelief `viewBox` 300→340, BgaBreakout 300→330, Padstack
  300→340 + değer sütunu sağa yaslı, StackupPlanner 300→380 + değerler sağa yaslı.
  Etiketler taşıyor/çakışıyordu. `.schematic`'e dar ekran kaydırması (`min-width: 300px`).
- **Denklemler** dört DFM ekranında dar sağ sütundan çıkıp tam genişliğe taşındı
  (`.formula-wide`, `ViaProperties`'teki mevcut desen).
- **Rapor dosya adı**: GUID yerine `iz-genisligi-2026-07-29.pdf`. Ad sırayla proje adı →
  araç adı → başlık. **Başlık tek başına yetmez**: `payload.Title` bütün araçlarda aynı
  sabittir ("DONANIM RAPORU"). Türkçe harfler ASCII'ye katlanır.
- **İndirince bildirim kartı** ("Rapor indirildi — <dosya adı>"), iki indirme yüzeyinde de
  (`ReportDialog` ve proje detayı).

## Bu oturumda bulunan ve düzeltilen hatalar

1. **PDF hiç üretilemiyordu** — `Cannot decode the provided SVG image.` → 500 → arayüzde
   "Sunucudan beklenmeyen bir yanıt geldi." Sebep: `lib/svgInline.js` öznitelik değerlerini
   XML kaçışı yapmadan yazıyordu. Tarayıcı `--font-mono` değerini **çift tırnakla**
   döndürüyor, ortaya `font-family=""IBM Plex Mono", …"` çıkıyor, öznitelik erken kapanıyor.
   `escapeAttr` eklendi + 4 regresyon testi. **Test fikstürü de düzeltildi** — tırnaksız bir
   değer kullandığı için hata testlerden kaçmıştı.
2. **"Hazırlayan" alanı doğrudan sayfa yüklemesinde boştu** — `user` ilk render'da yok.
   Ad geldiğinde alan bir kez doldurulur.
3. **Grafik SVG'si sarmalanmamıştı** — şema korunmuştu, grafik değil. Artık ikisi de
   `TryRenderSvg` içinden geçiyor: çözülemeyen çizim raporu düşürmüyor, yerine not basılıyor
   ve **sunucu uyarı + bozuk dizenin ilk 600 karakterini** günlüğe yazıyor.
4. nginx `proxy_pass` sabit host — api yeniden yaratıldığında ölü IP'ye vekilliyordu;
   `resolver 127.0.0.11` + değişken ile düzeltildi.
5. nginx'te `add_header` miras alınmıyor — güvenlik başlıkları `/assets/` ve `index.html`
   konumlarında kayboluyordu.
6. nginx yalnızca IPv4 dinliyordu, konteyner içi sağlık kontrolü `::1`'e düşüp
   "connection refused" alıyordu.
7. `graphite`/`instrument` temalarında `--on-accent` zaten tanımlıymış — kopya tanım
   temizlendi.

## Excel çıktısı — iyileştirildi

`api/Alp.Reports/XlsxReportBuilder.cs`. Yapılanlar (A–E):

- **Sütun genişliğine tavan (46) ve taban (9)**, uzun metinlerde satır kaydırma.
  A sütunu **222 karakter** genişliyordu — `AdjustToContents()` en uzun *not cümlesine*
  göre ayarlıyor, değerler ekranın dışında kalıyordu. Asıl "kötü görünme" sebebi buydu.
- **Denklemler bloğu eklendi** — PDF'te vardı, Excel'de hiç yoktu.
- **Sayfa adı kelime sınırında kesiliyor**: `1 Yol Genişliği ve Akım Kapasit` →
  `1 Yol Genişliği ve Akım`.
- **Tarih gerçek tarih hücresi** (`dd.MM.yyyy` biçimli seri numarası), metin değil.
- Biçimlendirme: blok başlıklarında vurgu rengi + dolgu + alt çizgi, grafik verisi
  tablosunda kenarlık + otomatik filtre, başlık satırı donuk, grafik verisinin üstünde
  "aralığı seçip Ekle → Grafik" notu.

İkinci turda (kullanıcı üst üste **yalnızca `Özet` sayfasını** görüp "hâlâ böyle" dediği için):

- **Dosya artık içerikle açılıyor**: tek hesaplı raporda etkin sekme hesap sayfası
  (`activeTab=1`), çok hesaplıda `Özet`. Özet tek başına raporun tamamı sanılıyordu.
- Özet listesindeki araç adı **ilgili sayfaya köprü**.
- Özetin altına yönlendirme notu.
- Grafik bloğunun başlığı sabit ve kısa (`Grafik verisi`); `Chart.Title` bir başlık değil
  tam cümle, kalın başlık olarak tablonun çok ötesine taşıyordu — altta sönük satırda.
- Künyedeki boş `Firma` satırı kalkınca oluşan delik giderildi; tarih ve sıra numarası
  sola hizalandı (tarih sayı hücresi olduğu için sağa kaçıyordu).
- Formüller sardırılmıyor (sarınca ifade ortadan bölünüyordu); notlar sardırılıyor.

**Sayı biçimi bilinçli olarak verilmedi**: değerler ekrandaki anlamlı basamağıyla geliyor
(`0.01051`), sabit bir biçim onları yuvarlayıp gösterir ve görünen değer ile gerçek değer
ayrışırdı.

Kalan iki madde **karar bekliyor**:

- **F** — grafik verisi ayrı sayfaya alınsın mı? Şu an hesabın altında.
- **G** — gerçek gömülü Excel grafiği. **ClosedXML grafik oluşturamıyor** (kütüphane
  sınırı). OpenXML SDK ile elle chart XML yazmak ya da paket değiştirmek gerekir; büyük iş.

## Kendiliğinden çıkış — düzeltildi

Kullanıcı "Excel indir deyince çıkış yapıyor" dedi. İndirme değildi: günlükte indirme 200,
çıkış ~36 saniye sonra ayrı bir `POST /api/auth/refresh 401` ile geliyordu.

Sebep **iki ayrı kusurun birleşimiydi** ve ikisi de kod okunarak değil, canlı yığında
senaryo koşturularak bulundu:

1. `Refresh`, döndürülmüş bir jetonun tekrar sunulmasını **her zaman hırsızlık** sayıp
   `RevokeDescendantChain` ile zinciri iptal ediyordu. İki sekme aynı anda açıldığında
   bu kaçınılmaz — meşru kullanıcı **her sekmede** oturumdan atılıyordu.
2. Yarışı kaybeden 401 yanıtı `ClearRefreshCookie` çağırıyordu. **Çerez sekmeler arasında
   ortak**: kaybeden sekme, işini doğru yapan sekmenin çerezini de siliyordu.

Çözüm:

- `AuthEndpoints.RotationGrace = 30 sn`. Döndürmenin hemen ardından gelen tekrar **yarış**
  sayılır (zincir iptal edilmez, çerez silinmez); pencere dışında gelen tekrar hâlâ
  **hırsızlık** sayılır ve zincir iptal edilir.
- Yarışı kaybeden hiçbir dal artık çerezi silmiyor.
- `web/src/lib/api.js` → `callRefresh()`: yenileme 401 alırsa **350 ms sonra bir kez daha**
  dener; o sırada öteki sekme çerezi tazelemiştir. `useAuth` açılıştaki yenilemeyi artık
  `api.refreshSession()` üzerinden yapıyor (eskiden `api.post` idi, yeniden deneme yoktu).

Canlı yığında doğrulandı: eşzamanlı iki yenilemede kazananın jetonu yaşıyor, pencere içi
tekrar meşru jetonu öldürmüyor, 31 saniye sonraki tekrar hâlâ zinciri iptal ediyor.

## AÇIK İŞLER

### 1. Faz 8'in kalan parçası — sunucu

Kullanıcı kararı: **sunucu işleri sonraya bırakıldı.** Sunucu, alan adı ve SMTP hesabı yok.
Bilerek yazılmayanlar: `deploy.yml` içindeki SSH adımı, gerçek TLS sertifikası.
**SMTP zorunlu**: `RequireConfirmedEmail` açık, SMTP olmadan canlıda kimse giriş yapamaz.

### 2. Diğer fazlar

- **Faz 3b** — fontlar sunucuya. **Ağ erişimi var, engel kalktı.** `web/public/fonts/` boş;
  dolunca `api/Dockerfile`'a kopyalanıp `Reports__FontsPath=/app/fonts` ile PDF'e de girer.
- **Faz 7** — `useSavedThickness` → hesaba taşıma.
- **Faz 9** — kök `README.md` güncellemesi. `CLAUDE.md` güncel.
- Atanmamış: `PATCH /api/me`, logo yükleme, `/api/thickness-records/*`.
- Bağlı olunan kayıt başka bir sekmede silinirse ekran bunu ancak güncelleme denemesinde
  (404 → genel hata mesajı) fark eder; özel mesaj yazılmadı.
- Üç pilot araçta "grafik veri tablosunda son satır düşüyor" hatası (Faz 6'da bulundu).

## Ortam

- **Docker çalışıyor** (`/Applications/Docker.app`, `open -a Docker`). OrbStack linkleri kırık.
- **Postgres 16** Homebrew servisi olarak ayrıca çalışıyor ama yığın kendi konteynerindekini
  kullanıyor.
- **Ağ erişimi var** (NuGet, Docker Hub, ghcr.io denendi).
- Sırlar `deploy/.env` içinde, depoya girmiyor.
- **Playwright scratchpad'e kuruldu, DEPOYA EKLENMEDİ** (`CLAUDE.md`: yeni test aracı
  eklemeden önce sor). `scratchpad/pw/` altında `capture.mjs` (tarayıcının gönderdiği rapor
  yükünü yakalar) ve `verify.mjs` (gerçek tarayıcıda PDF/Excel indirmeyi doğrular) var.
  Bu oturumdaki SVG hatası bunlarla bulundu. Kalıcı eklenmesi kullanıcıya sorulacak.
- Rapor uçlarında hız sınırı: **kullanıcı başına 5 dakikada 20**. Art arda deneme 429 verir.

## Çalışma tercihleri

- Model **Opus**, effort **max/ultracode** (kullanıcı oturum içinde yükseltti).
- Kullanıcının kalıcı talimatı: **workflow / deep-research yalnızca açıkça istenirse.**
- Kararlar varsayılmıyor, soruluyor.
- Değişiklikten sonra: `npm test` + `npm run build` + `docker compose up -d --build`,
  sonra gerçek tarayıcıyla doğrula. Konteyner yeniden kurulmadan kullanıcı değişikliği
  görmez; sekmesi açıksa yenilemesi de gerekir.
