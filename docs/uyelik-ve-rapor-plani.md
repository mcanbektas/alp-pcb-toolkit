# Üyelik ve Rapor Altyapısı — Uygulama Planı

**Durum:** taslak, onay bekliyor
**Tarih:** 2026-07-29
**Kapsam:** kullanıcı hesabı, proje kaydı, PDF rapor, Excel dışa aktarma

---

## 1. Kapsam

### Yapılacak

- Kullanıcı hesabı: kayıt, giriş, çıkış, parola sıfırlama, e-posta doğrulama
- Proje kavramı: kullanıcı hesapları altında adlandırılmış proje, her projede birden çok hesap
- Hesap kaydı: bir araç ekranındaki girdi + sonuç bir projeye kaydedilir
- PDF rapor üretimi (sunucu tarafında)
- Excel (`.xlsx`) dışa aktarma
- `localStorage`'daki bakır kalınlığı kayıtlarının hesaba taşınması
- GitHub Pages'ten kendi sunucusuna taşınma

### Kapsam dışı (şimdilik)

- **Ödeme, abonelik, ücretli katman.** Karar: tamamen dışarıda. Veri modeli ileride
  eklenebilecek şekilde bırakılır (`users` tablosunda `plan` alanı `free` sabitiyle durur),
  ama ne API'de ne arayüzde karşılığı olur.
- Ekip / kurumsal hesap, rol yönetimi, paylaşılan proje
- Hesap motorlarının C#'a taşınması — gerekmiyor, bkz. §5.1

---

## 2. Hedef mimari

```
Tarayıcı
  React 18 + Vite                      hesaplar burada, aynen kalıyor
     │
     │  HTTPS / JSON  +  JWT
     ▼
nginx                                  ters vekil + statik dosya sunumu
     │
     ▼
.NET 9 Minimal API
  ├─ ASP.NET Core Identity             kayıt, giriş, parola özeti, e-posta doğrulama
  ├─ Entity Framework Core             veritabanı erişimi, migration
  ├─ QuestPDF                          PDF rapor dizimi
  └─ ClosedXML                         .xlsx üretimi
     │
     ▼
PostgreSQL
```

**Temel ilke değişmiyor:** hesap tarayıcıda yapılır. Sunucu hesap yapmaz; kimlik doğrular,
veri saklar, belge dizer. `src/lib/` altındaki 30 saf motor olduğu yerde kalır, C#'a
taşınmaz.

---

## 3. Depo yapısı

Tek depo. Frontend kök dizinden aşağı iner, API kardeşi olur.

```
alp-pcb-toolkit/
├── web/                    ← mevcut kök içeriği buraya taşınır
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── api/
│   ├── Alp.Api/            Minimal API, uç noktalar
│   ├── Alp.Domain/         varlıklar, sözleşmeler
│   ├── Alp.Data/           EF Core DbContext, migration
│   ├── Alp.Reports/        QuestPDF + ClosedXML üreticileri
│   └── Alp.Api.sln
├── deploy/
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── README.md
├── docs/
├── CLAUDE.md
└── README.md
```

Taşıma tek commit'te yapılır ve `git mv` ile — geçmiş korunur.

---

## 4. Backend

### 4.1 Kimlik doğrulama

ASP.NET Core Identity + JWT taşıyıcı token.

- Parola özeti, kilitlenme, e-posta doğrulama, parola sıfırlama Identity'den gelir.
  **Elle auth yazılmaz** — güvenlik açığının en sık doğduğu yer burasıdır.
- Erişim token'ı kısa ömürlü (15 dk), yenileme token'ı uzun ömürlü (30 gün) ve
  **`HttpOnly` + `Secure` + `SameSite=Strict` çerezde** tutulur. Erişim token'ı bellekte
  durur, `localStorage`'a yazılmaz — XSS ile çalınmasın diye.
- Yenileme token'ı döndürmeli (rotating): her yenilemede eskisi geçersizleşir, veritabanında
  tutulur, çıkışta silinir.
- E-posta gönderimi için SMTP. Sağlayıcı seçimi dağıtım aşamasında (Resend / Postmark /
  kendi SMTP).

### 4.2 Veri modeli

```
AspNetUsers                  Identity standart tablosu
  + DisplayName              rapordaki "Hazırlayan" alanına ön değer
  + Company                  rapor üst bandındaki firma adı (isteğe bağlı)
  + LogoBlob                 kullanıcının kendi logosu (isteğe bağlı, yoksa ALP logosu)
  + Plan                     'free' — ileride abonelik için ayrılmış, şimdilik sabit
  + CreatedAt

RefreshTokens
  Id, UserId, TokenHash, ExpiresAt, RevokedAt, ReplacedByHash, CreatedIp

Projects
  Id, UserId, Name, Description, CreatedAt, UpdatedAt

Calculations
  Id, ProjectId, ToolKey, ToolMode, SortOrder
  InputsJson                 form state'i, olduğu gibi
  ResultJson                 hesap çıktısı, SI değerler
  ReportJson                 §5.1'deki rapor bölümü sözleşmesi
  EngineVersion              hesabın hangi motor sürümüyle yapıldığı
  SchemaVersion              ReportJson sözleşme sürümü
  CreatedAt, UpdatedAt

Reports
  Id, ProjectId, UserId, Title, PreparedBy, Revision
  Format                     'pdf' | 'xlsx'
  FilePath, FileSize, GeneratedAt

ThicknessRecords
  Id, UserId, Name, SchemaVersion, DataJson, CreatedAt
  (localStorage'daki mevcut kayıtların hesaba taşınmış hâli)
```

**`EngineVersion` neden var:** bir hesap motorunda hata bulunup düzeltilirse, eski raporun
hangi sürümle üretildiği bilinir. Girdiler de saklandığı için gerekirse yeniden hesaplanır.
Mühendislik belgesinde izlenebilirlik şart; sadece sonucu saklamak bunu imkânsız kılar.

### 4.3 API uçları

```
POST   /api/auth/register              e-posta, parola, ad
POST   /api/auth/login                 → erişim token'ı + yenileme çerezi
POST   /api/auth/refresh               çerezden yeniler
POST   /api/auth/logout                yenileme token'ını iptal eder
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/confirm-email

GET    /api/me                         profil
PATCH  /api/me                         ad, firma
PUT    /api/me/logo                    logo yükleme
DELETE /api/me/logo

GET    /api/projects                   liste
POST   /api/projects                   oluştur
GET    /api/projects/{id}              proje + hesapları
PATCH  /api/projects/{id}
DELETE /api/projects/{id}

POST   /api/projects/{id}/calculations         hesap ekle
PATCH  /api/calculations/{id}
DELETE /api/calculations/{id}
POST   /api/projects/{id}/calculations/reorder

POST   /api/reports/pdf                → application/pdf
POST   /api/reports/xlsx               → .xlsx
GET    /api/reports                     geçmiş
GET    /api/reports/{id}/download

GET    /api/thickness-records          bakır kalınlığı kayıtları
POST   /api/thickness-records
DELETE /api/thickness-records/{id}
POST   /api/thickness-records/import   localStorage'dan toplu içe aktarma
```

Bütün uçlar kimlik ister; `/api/auth/*` hariç.

### 4.4 Güvenlik notları

- Hız sınırı: giriş ve parola sıfırlama uçlarında IP + hesap başına
- CORS: yalnızca kendi alan adı
- Logo yüklemede tür ve boyut denetimi (PNG/SVG, 512 KB üst sınır); SVG yükleniyorsa
  temizlenir — SVG içine script gömülebilir
- Rapor yükü boyut sınırı (varsayılan 5 MB); SVG dizeleri şişebilir
- Parola en az 10 karakter, Identity'nin varsayılan karmaşıklık kuralları açık

---

## 5. Rapor üretimi

### 5.1 Rapor yükü sözleşmesi — planın en kritik parçası

Sunucu 25 aracın hiçbirini tanımaz. Tanısaydı, her yeni araç eklendiğinde 25 `text.js`
sözlüğünün C#'a kopyalanması gerekirdi — sürdürülemez.

Bunun yerine **tarayıcı biçimlenmiş rapor yükünü üretir, sunucu yalnızca dizer.** Yeni araç
eklendiğinde sunucuda tek satır değişmez.

```jsonc
{
  "schemaVersion": 1,
  "title": "DONANIM RAPORU",
  "preparedBy": "Ad Soyad",          // kullanıcı girer, profilden ön dolu gelir
  "company": "Firma adı",            // isteğe bağlı
  "date": "2026-07-29",
  "lang": "tr",
  "sections": [
    {
      "toolKey": "trace-width",
      "toolName": "Trace Genişliği",
      "mode": "Sentez",
      "inputs":  [ { "label": "Akım", "value": "1", "unit": "A" } ],
      "formula": [ "I = k·ΔT^0.44·A^0.725" ],
      "results": [
        { "label": "Önerilen genişlik", "value": "0.62", "unit": "mm", "emphasis": true },
        { "label": "Direnç (20°C)",     "value": "12.4", "unit": "mΩ" }
      ],
      "notes": [
        { "level": "warn", "text": "Klasik ampirik yöntem — veri tabanlı hesapla eşdeğer değildir." }
      ],
      "schematicSvg": "<svg …>",     // react-dom/server ile dizeye çevrilmiş
      "chart": {
        "title": "Genişliğe göre akım kapasitesi",
        "svg": "<svg …>",            // aynı yöntemle
        "table": {                    // Excel için ham veri
          "columns": ["Genişlik (mm)", "Akım (A)"],
          "rows": [[0.05, 0.31], [0.06, 0.35]]
        }
      }
    }
  ]
}
```

### 5.1.1 SVG'ler nasıl dizeye çevrilir

Şematik ve grafik zaten ekranda çizili duruyor. **Canlı DOM düğümünün `outerHTML`'i alınır** —
`react-dom/server` pakete girmez (~20 KB gzip tasarruf) ve çıktı kullanıcının gördüğüyle
birebir aynı olur. `Schematic.jsx` ile `LineChart.jsx`'e yalnızca `ref` iletimi eklenir;
görsel değişiklik yoktur.

Alınan dize ham hâliyle işe yaramaz: renkler CSS sınıflarından geliyor, dizede CSS yok.
`src/lib/svgInline.js` bunu çözer — saf fonksiyon, iki iş yapar:

1. **Sınıf → öznitelik.** Yaklaşık 30 sınıfın (`sch-*`, `chart-*`, `series-*`, `band-*`)
   bildirimlerini satır içi özniteliğe çevirir.
   ```css
   .sch-copper     { fill: var(--accent);  stroke: var(--accent); stroke-width: 1; }
   .sch-dielectric { fill: var(--raised);  stroke: var(--line);   stroke-width: 1; }
   .sch-label      { fill: var(--text);    font-family: var(--font-mono); font-size: 11px; }
   ```
2. **`var(--x)` → literal.** Sadece sınıflardan gelenler değil, **öznitelik içine doğrudan
   yazılmış olanlar da.** `Schematic.jsx`'teki `Terminal` bileşeni
   `fill="var(--bg)" stroke="var(--accent)"` diye yazıyor — sınıf taraması bunu kaçırır.

**Palet, sitenin kendi paletidir.** Aktif tema `src/themes/solder-light.css`: zemin beyaz,
renkler beyaza karşı kontrast doğrulanmış (dosyada oranlar yazılı — `--accent: #007937`
→ 5.54:1, `--text: #1c261e` → 15.61:1). Rapora ayrı bir "kâğıt paleti" tasarlamaya gerek
yok; ekranda doğru olan kâğıtta da doğru. Marka tutarlılığı bedava gelir.

Sözlük elle yazılır ve testlenir — tema dosyası değişse bile rapor çıktısı deterministik
kalır. Bkz. §8 risk R1.

### 5.2 Her araç için `report.js`

Sonuç satırları şu an her aracın `index.jsx` dosyasında JSX olarak diziliyor; yapısal
karşılıkları yok. Her araca yeni bir dosya eklenir:

```
src/pages/tools/<Ad>/report.js
  export function buildReport({ mode, f, r, s, text, ui }) → section
```

Saf fonksiyon: React bilmez, sadece `text.js`'ten gelen etiketleri ve `num.js`'in
biçimleyicilerini kullanır. Testi yazılır — `src/lib/` kuralının kapsamına girer, çünkü saf.

Bu, işin en hacimli parçası: **25 dosya.** Faz 4'te aşamalı yapılır.

### 5.3 PDF düzeni

Kapak sayfası yok. Belge doğrudan başlıkla açılır.

```
┌───────────────────────────────────────────────────────┐
│  [ALP logosu]                            29.07.2026   │  ← her sayfada
│───────────────────────────────────────────────────────│
│                                                       │
│              DONANIM RAPORU                           │  ← yeşil, #007937
│                                                       │
│  Hazırlayan: Ad Soyad                                 │
│  Firma: …                            (varsa)          │
│                                                       │
│  ═══ 1. Trace Genişliği — Sentez ═══                  │
│                                                       │
│  Girdiler                                             │
│  ┌─────────────────────┬──────────┐                   │
│  │ Akım                │  1 A     │                   │
│  │ Sıcaklık artışı     │ 10 °C    │                   │
│  └─────────────────────┴──────────┘                   │
│                                                       │
│  [şematik SVG]                                        │
│                                                       │
│  Formül:  I = k·ΔT^0.44·A^0.725                       │
│                                                       │
│  Sonuçlar                                             │
│  ┌─────────────────────┬──────────┐                   │
│  │ Önerilen genişlik   │ 0.62 mm  │  ← vurgulu        │
│  └─────────────────────┴──────────┘                   │
│                                                       │
│  [grafik SVG]                                         │
│                                                       │
│  ⚠ Klasik ampirik yöntem — veri tabanlı hesapla       │
│    eşdeğer değildir.                                  │
│                                                       │
│  ═══ 2. …                                             │
│───────────────────────────────────────────────────────│
│                                        Sayfa 1 / 4    │
└───────────────────────────────────────────────────────┘
```

- **Üst bant her sayfada tekrar eder:** solda logo, sağda tarih. QuestPDF'in `Header()`
  bileşeni ile.
- **Ana başlık `DONANIM RAPORU`**, yeşil. Renk `#007937` — sitenin kendi `--accent`
  değişkeni, beyaz üzerinde 5.54:1 kontrastla zaten doğrulanmış. Ayrı bir ton uydurulmaz.
- **Hazırlayan** kullanıcının girdiği metin. Rapor indirme panelinde alan olarak sorulur,
  profildeki addan ön dolu gelir.
- Alt bantta sayfa numarası.
- Sayfa: A4, dikey. Yazı tipi gömülü — `Chakra Petch` (başlık), `IBM Plex Sans` (gövde),
  `IBM Plex Mono` (sayı ve etiket). Projenin kendi tipografisi korunur. Font dosyaları
  §6.3'te sunucuya taşınıyor; PDF de aynı dosyaları gömer, tek kaynak olur.
- Her hesap yeni bölüm; bölüm ortasında sayfa kırılmaz (`.ShowEntire()` mümkün olduğunca).

### 5.4 Excel düzeni

`ClosedXML` ile. Her hesap bir sayfa (worksheet):

```
Sayfa "Özet"            rapor başlığı, hazırlayan, tarih, hesap listesi
Sayfa "1 Trace Gen."    Girdiler bloğu / Sonuçlar bloğu / Notlar bloğu
                        + grafik ham verisi sütun olarak (chart.table)
Sayfa "2 …"
```

Excel'de SVG yok — şematik ve grafik yerine grafik verisi ham sütun olarak girer, kullanıcı
kendi grafiğini çizebilir. `chart.table` alanı tam bunun için var.

Sayısal değerler **sayı olarak** yazılır, metin olarak değil — kullanıcı formül
yazabilsin diye. Birim ayrı sütunda durur.

---

## 6. Frontend değişiklikleri

### 6.1 Yeni katmanlar

```
src/hooks/useAuth.jsx           oturum durumu, token yenileme, context
src/lib/api.js                  fetch sarmalayıcı — token ekleme, 401'de yenileme
src/lib/reportPayload.js        §5.1 yükünü kuran saf fonksiyon
src/lib/svgInline.js            §5.1.1 — sınıf ve var(--x) değerlerini satır içine çevirir
src/pages/auth/Login.jsx
src/pages/auth/Register.jsx
src/pages/auth/ForgotPassword.jsx
src/pages/auth/ResetPassword.jsx
src/pages/account/Profile.jsx    ad, firma, logo
src/pages/account/Projects.jsx   proje listesi
src/pages/account/Project.jsx    proje detayı, hesap sıralama, rapor indirme
src/components/SaveToProject.jsx her araç ekranında "projeye kaydet"
src/components/ReportDialog.jsx  hazırlayan alanı + PDF/Excel indirme
src/data/authText.js             yeni ekranların iki dilli metni
```

`src/data/uiText.js` ve mevcut mimari kuralları korunur: `lib/` dil bilmez, somut bağ
`hooks/` katmanında kalır.

### 6.2 Mevcut kodda değişecekler

| Dosya | Değişiklik |
|---|---|
| `vite.config.js` | `base: './'` → `'/'`; geliştirmede `/api` için vekil |
| `src/App.jsx` | `HashRouter` → `BrowserRouter`; auth rotaları; `AuthProvider`; başlıkta hesap düğmesi |
| `index.html` | Google Fonts bağlantıları kaldırılır (§6.3) |
| `src/components/Schematic.jsx` | `ref` iletimi — görsel değişiklik yok |
| `src/components/LineChart.jsx` | `ref` iletimi — görsel değişiklik yok |
| `src/hooks/useSavedThickness.js` | giriş yapılmışsa API, yapılmamışsa `localStorage` |
| `src/pages/tools/*/index.jsx` | 25 ekranın sonuç paneline eylem satırı |
| `src/pages/tools/*/report.js` | 25 yeni dosya (§5.2) |
| `.github/workflows/deploy.yml` | Pages yerine sunucuya dağıtım |

`HashRouter` → `BrowserRouter` geçişi nginx'te `try_files $uri /index.html` gerektirir;
`deploy/nginx.conf` içinde olacak.

### 6.3 Yazı tipleri kendi sunucusuna taşınır

`index.html` şu an fontları Google Fonts'tan çekiyor: iki `preconnect` ve render'ı bloklayan
bir dış stil dosyası. Kendi sunucumuzda barındırınca:

- Üçüncü taraf bağlantısı ve gidiş-dönüş gecikmesi gider — ilk boyama hızlanır
- Dış istek kalmaz, gizlilik iyileşir
- **PDF'in gömeceği font dosyaları ile sitenin kullandığı dosyalar aynı olur.** QuestPDF
  fontu dosya olarak istiyor; nasılsa indirilecekti, tek kaynağa indirmiş oluruz.

`web/public/fonts/` altına `woff2` (site) ve `ttf` (PDF gömme) konur, `@font-face`
bildirimleri `theme.css` yanına eklenir. `font-display: swap` korunur.

### 6.4 Tasarım korunur — yeni görsel dil eklenmiyor

Kısıt: mevcut arayüz bozulmayacak. Bunun yolu yeni bileşen icat etmemek, var olan
deyimleri yeniden kullanmaktır.

| Yeni ekran / öğe | Neyi yeniden kullanır | Yeni tasarım |
|---|---|---|
| Giriş, kayıt, parola sıfırlama, profil | `.panel` + mevcut `TextField` | yok |
| "Projeye kaydet" / "Rapor al" | `.row-add` düğme biçimi | yok |
| Proje ve hesap listeleri | `Home` / `CategoryPage` kart ızgarası | yok |
| Rapor seçenekleri paneli | sonuç panelinin altında açılan `.panel` | yok |
| Başlıktaki hesap girişi | `LangSwitch` ile aynı düğme biçimi | **tek yeni öğe** |

**Modal kullanılmaz.** Projede modal yok; eklemek örtü katmanı, odak hapsi, kaydırma kilidi
ve erişilebilirlik işi demek — hem yeni görsel dil hem fazladan yüzey. Rapor seçenekleri
sonuçların altında açılan panel olarak durur.

`report.js` ayrı dosya olarak eklendiği için **25 `index.jsx`'in düzeni değişmez** — sadece
sonuç panelinin altına eylem satırı iner. Sonuç satırlarını veri güdümlü hâle getirip tek
kaynağa indirmek daha temiz olurdu ama 25 ekranı derinden değiştirirdi; araçların satır
yapısı tekdüze değil (vurgu, işaret, alt tablo) ve zorlamak arayüzü düzleştirirdi. Karar:
**tasarım kopyadan önce gelir.** Bedeli §8 R6'da.

### 6.5 Giriş yapmadan ne çalışır

Ödeme ve ücretli katman olmadığı için **bütün hesap araçları girişsiz çalışmaya devam
eder.** Giriş yalnızca kaydetme ve rapor alma için gerekir. Mevcut kullanıcı deneyimi
bozulmaz.

---

## 7. Barındırma ve dağıtım

- **Sunucu:** Linux VPS. Docker Compose ile üç servis: `nginx`, `api`, `postgres`.
- **nginx:** `/` → statik `web/dist`, `/api` → .NET konteynerine ters vekil,
  Let's Encrypt ile TLS.
- **Veritabanı yedeği:** günlük `pg_dump`, sunucu dışına kopya.
- **Dağıtım:** `main`'e push → GitHub Actions → imaj derle → sunucuda çek ve yeniden başlat.
  Frontend ayrı adımda derlenip statik dizine kopyalanır.
- **Gizli değerler:** bağlantı dizesi, JWT imza anahtarı, SMTP bilgileri ortam
  değişkeninde. Depoya girmez.

---

## 8. Riskler

**~~R1 — QuestPDF'in SVG çözümleyicisi her özelliği karşılamayabilir.~~ KAPANDI.**
Faz 1 denemesi yapıldı, bkz. §12. Şematik ve grafikte fiilen kullanılan bütün SVG yapıları
sorunsuz basıldı. Yedek PNG yoluna gerek kalmadı.

**R6 — ekrandaki sonuç satırı ile rapordaki satır zamanla ayrışabilir.**
`report.js` ayrı dosya olduğu için (§6.4 kararı) satırlar iki yerde yazılı. Ekranda bir
etiket düzeltilip raporda unutulabilir.
*Önlem:* Her araç için `report.js` testi yazılır ve `INITIAL_FORM` üzerinden çalıştırılır;
üretilen bölüm sözleşmeye uyuyor mu, sonuç satırı boş mu, etiket araç anahtarına mı düşmüş
— denetlenir. Ayrıca `report.js` dosyası olmayan araç, rapor arayüzünde kilitli görünür.
Bu, kaymayı tümüyle engellemez; bilinçli kabul edilen bedeldir.

**R2 — 25 araç için `report.js` yazımı hacimli.**
*Önlem:* Faz 4'e ayrılır, aşamalı yapılır. Altyapı 3 pilot araçla doğrulanır, kalan 22'si
kalıp oturduktan sonra yazılır. Rapor arayüzü, `report.js`'i olmayan aracı listede kilitli
gösterir — yarım iş kullanıcıya sızmaz.

**R3 — `BrowserRouter` geçişi mevcut bağlantıları kırar.**
Paylaşılmış `#/arac/...` adresleri ölür.
*Önlem:* `App.jsx` içinde tek seferlik yönlendirme — `#/` ile gelen adresi `/`'a çevirir.

**R4 — Depo taşıması (`web/` altına inme) her şeyi bozabilir.**
*Önlem:* Ayrı commit, `git mv`, hemen ardından `npm run build` + `npm test` doğrulaması.
Başka hiçbir değişiklikle karışmaz.

**R5 — QuestPDF lisansı.**
Yıllık ciro 1 milyon dolar altında ücretsiz. Şimdilik sorun yok, aşılırsa ücretli lisans
alınır. Alternatif gerekirse `PdfSharp` + `MigraDoc` (MIT) — daha zahmetli API.

---

## 9. Fazlar

| Faz | İş | Çıktı | Model |
|---|---|---|---|
| **0** | Depo taşıması: kök → `web/`, `api/` ve `deploy/` iskeletleri | Derleme ve testler geçiyor | Haiku 4.5 |
| **1** | **Risk denemesi:** `svgInline.js` + tek şematik + tek grafik → QuestPDF → PDF | R1 kapanır veya yedek yola geçilir | Opus 5 |
| **2** | .NET iskeleti: solution, EF Core, Identity, JWT, migration, auth uçları | Kayıt/giriş çalışıyor | Sonnet 5 |
| **3** | Frontend auth: `useAuth`, `api.js`, giriş/kayıt/profil ekranları, `BrowserRouter` | Uçtan uca giriş | Sonnet 5 |
| **3b** | Yazı tiplerinin sunucuya taşınması (§6.3) | Dış font bağlantısı yok | Haiku 4.5 |
| **4a** | Rapor sözleşmesi + `reportPayload.js` + `svgInline.js` + 3 pilot araç `report.js` | Pilot araçlar PDF veriyor | Opus 5 |
| **4b** | QuestPDF rapor düzeni (§5.3) | Belge son hâlinde | Opus 5 |
| **4c** | ClosedXML Excel üreticisi (§5.4) | `.xlsx` çıkıyor | Haiku 4.5 |
| **5** | Proje/hesap uçları + `SaveToProject` + proje ekranları | Kaydet-raporla döngüsü tam | Sonnet 5 |
| **6** | Kalan 22 aracın `report.js` dosyaları + testleri | 25 araç raporlanabilir | Sonnet 5, paralel |
| **7** | `useSavedThickness` hesaba taşıma + içe aktarma akışı | localStorage kaydı hesaba geçiyor | Sonnet 5 |
| **8** | Docker Compose, nginx, TLS, dağıtım iş akışı, yedekleme | Canlı | Sonnet 5 |
| **9** | `CLAUDE.md` ve `README.md` yeniden yazımı | Belgeler mimariyle uyumlu | Sonnet 5 |

Faz 1 bilinçli olarak öne alındı: en büyük teknik belirsizlik orada, ucuz bir denemeyle
kapanıyor. Sonuç olumsuzsa rapor tasarımı baştan değişir — 40 saatlik iş yapıldıktan sonra
öğrenmek istenmez.

---

## 10. `CLAUDE.md` güncellemeleri

Şu kurallar geçersizleşiyor, yerine yenisi yazılacak:

- *"Tamamen client-side; backend, veritabanı, API çağrısı yok"* → yeni mimari bölümü
- *"`base: './'` + `HashRouter` kombinasyonunu değiştirme"* → kendi sunucusunda geçersiz
- *"`main`'e her push → GitHub Pages"* → yeni dağıtım hattı
- Bağımlılık yönü kuralı **korunuyor** ve genişliyor:
  `pages → components → hooks → lib` yanına `web → api` tek yönlü sözleşmesi eklenir.
  `lib/` hâlâ ağ bilmez; API çağrısı yalnızca `hooks/` katmanında görünür.
- İki dillilik kuralı **korunuyor** — yeni auth ve rapor ekranları da doğduğu anda iki dilli
  yazılır.
- Test kuralı **genişliyor:** `report.js` dosyaları saf olduğu için test kapsamına girer.
  Backend tarafında rapor üreticileri ve auth akışı için ayrı test projesi açılır.

---

## 11. Verilen kararlar

| Konu | Karar |
|---|---|
| Backend | .NET 9 Minimal API + ASP.NET Core Identity |
| Veritabanı | PostgreSQL |
| Depo | Tek depo — `web/` + `api/` |
| Ödeme / abonelik | Kapsam dışı |
| PDF üretimi | Sunucuda, QuestPDF |
| Excel | ClosedXML |
| Rapor satırları | Araç başına ayrı `report.js` — mevcut ekranlara dokunulmaz |
| SVG dizeye çevirme | Canlı DOM `outerHTML` + `svgInline.js`; `react-dom/server` yok |
| Rapor paleti | Sitenin kendi paleti (`solder-light.css`), ayrı kâğıt paleti yok |
| Başlık rengi | `#007937` (`--accent`) |
| Yazı tipleri | Kendi sunucumuzda barındırılır |
| Modal | Kullanılmaz — açılır panel |

## 12. Faz 1 sonucu — risk denemesi tamamlandı

**Tarih:** 2026-07-29 · **Sonuç:** başarılı, R1 kapandı, plan değişmiyor.

Deneme `scratchpad/faz1/` altında yapıldı, depoya hiçbir şey eklenmedi. Kurulum:
`svgInline` prototipi + gerçek `TraceWidth` şematiği + gerçek sweep verisinden üretilmiş
grafik + QuestPDF 2026.7.1 ile üç sayfalık rapor.

### Doğrulananlar

| Sınanan | Sonuç |
|---|---|
| Sınıf → satır içi öznitelik çevirimi | çalışıyor, `class=` kalmıyor |
| İki kademeli değişken (`--tone` → `--series-1` → `#22914e`) | çözülüyor |
| Öznitelik içine yazılmış `var(--bg)` (`Terminal` bileşeni) | çözülüyor |
| `<g>` üzerinden `stroke` mirası | basılıyor |
| `polygon` (ok başı), `rx`'li `rect`, `circle`, `path` M/L/Z | basılıyor |
| `text-anchor` (start / middle / end) | doğru hizalanıyor |
| `stroke-dasharray` — hem öznitelikten hem CSS sınıfından | ikisi de basılıyor |
| `opacity` (tolerans bandı, 0.16) | basılıyor |
| Her sayfada tekrar eden üst bant (logo + tarih) | çalışıyor |
| Sayfa numarası (`Sayfa n / N`) | çalışıyor |
| Türkçe karakterler (ı, ğ, ş, Ç) ve `µ`, `Ω`, `Δ`, `²` | doğru |
| Özel yazı tipi gömme (`FontManager.RegisterFont`) | çalışıyor |

**Site paleti kâğıtta doğru okunuyor.** Ayrı rapor paleti gerekmedi — §5.1.1'deki karar
doğrulandı.

### Denemede öğrenilen iki düzen kuralı

Bunlar QuestPDF sınırı değil, doğru kullanım biçimi. Faz 4b'de baştan böyle yazılacak:

1. **`Background()` dolgudan ÖNCE gelir.** `Cell().Element(Stil).Background(x)` arka planı
   yalnızca yazının kutusuna basar, hücre yamalı görünür. Doğrusu
   `Cell().Background(x).Element(Stil)`.
2. **Sayfa kırılması blok sınırında olmalı, blok ortasında değil.** Her mantıksal blok
   `ShowEntire()` ile sarılır: bölüm başlığı girdi tablosundan, şekil kendi açıklamasından,
   tablo kendi başlığından ayrılmaz. Bütün bölümü tek `ShowEntire()`'a almak yanlış olur —
   bir bölüm sayfadan uzun olabilir.

### Yeniden çalıştırma

```bash
cd scratchpad/faz1 && node gen-svg.mjs && cd SpikePdf && dotnet run
```

## 13. Kalan noktalar

1. **VPS sağlayıcısı ve alan adı** — Faz 8'e kadar gerekmiyor, ama şimdiden bilinirse iyi.
2. **E-posta gönderimi** — doğrulama ve parola sıfırlama e-postaları hangi SMTP üzerinden?
   Şimdilik `ConsoleEmailSender` konsola yazıyor (bkz. §14), gerçek sağlayıcı seçilince
   `IEmailSender`'ın yeni bir uygulaması bunun yerini alır — arayüz değişmez.
3. **Rapor dili** — rapor arayüzün o anki dilinde mi üretilsin, yoksa indirirken ayrıca mı
   seçilsin? (Öneri: seçilebilsin, varsayılan arayüz dili.)
4. **Pilot 3 araç** — Faz 4a'da hangileri? (Öneri: `TraceWidth` — grafik, şematik ve uyarı
   notu hepsi var; `ResistorCode` — şematik ağırlıklı, grafiği yok, renkli bant sınıfları
   `svgInline.js`'i ayrıca sınar; `LengthConverter` — en yalın. Üçü birlikte bütün rapor
   biçimlerini kapsıyor.)

## 14. Faz 0 / 2 / 3 durumu — çalışıyor

**Tarih:** 2026-07-29 · **Sonuç:** temel iskelet uçtan uca çalışıyor, build ve 892 test yeşil.

### Faz 0 — depo taşıması

`git mv` ile geçmiş korunarak kök içerik `web/` altına indi, `api/` (.NET çözümü) ve
`deploy/` (Faz 8'e kadar yalnızca README) iskeletleri kuruldu. `.gitignore` `.NET` derleme
çıktısı ve gizli `appsettings.*.json` için genişletildi.

### Faz 2 — .NET iskeleti

`Alp.Domain` / `Alp.Data` / `Alp.Reports` / `Alp.Api` dört proje, tek çözüm, bağımlılık
yönü `Api → {Domain, Data, Reports}`, `Data → Domain`. Paketler net9.0'a sabitlendi (NuGet
varsayılanı net10.0 istiyordu, kurulu SDK 9.0.117).

- Varlıklar: `ApplicationUser : IdentityUser`, `RefreshToken`, `Project`, `Calculation`
  (`EngineVersion` + `SchemaVersion` alanlarıyla — §4.2'deki izlenebilirlik kararı),
  `Report`, `ThicknessRecord`.
- Kimlik: `AddIdentityCore` + JWT (erişim 15 dk, HMAC-SHA256) + döner (rotating) yenileme
  token'ı — ham değer yalnızca `HttpOnly+Secure+SameSite=Strict` çerezde, veritabanında
  yalnızca SHA-256 özeti duruyor.
  Uçlar: `register`, `login`, `refresh`, `logout`, `forgot-password`, `reset-password`,
  `confirm-email`, `GET /api/me`. Hız sınırı (10/5dk, IP başına) dört uçta.
- `dotnet ef migrations add InitialCreate` başarıyla üretildi (12 tablo — 7 Identity + 5
  kendi varlığımız). **Canlı Postgres'e karşı çalıştırılamadı** — bu ortamda docker/Postgres
  yok. Migration üretiminin başarılı olması modelin Npgsql sağlayıcısına karşı geçerli
  olduğunu gösteriyor, ama gerçek `database update` denenmedi.
- Uygulama `dotnet run` ile temiz açılıyor, tüm DI kaydı (Identity, JWT, DbContext, hız
  sınırı, CORS) hatasız çözülüyor.
- E-posta gönderimi `ConsoleEmailSender` ile konsola yazıyor — bkz. §13 madde 2.

**Güvenlik incelemesi:** auth alt sistemi 4 bağımsız mercekten (token yaşam döngüsü,
kimlik/parola politikası, taşıma/enjeksiyon/gizli değer, yetkilendirme yüzeyi) geçirildi,
her bulgu 3 bağımsız çürütme denemesiyle doğrulandı — 58 ajan, 18 bulgu hayatta kaldı (2
kritik, 5 yüksek, 5 orta, 6 düşük). Hepsi aynı oturumda düzeltildi:

- **Kritik — giriş uç noktası numaralandırma sızdırıyordu.** `SignInManager.CheckPasswordSignInAsync`
  parolayı hiç kontrol etmeden önce e-posta doğrulama durumunu reddediyordu (`PreSignInCheck`);
  saldırgan rastgele bir parolayla bile "bu hesap var ve doğrulanmamış" bilgisini tek istekte
  öğrenebiliyordu. Düzeltme: `Login` artık `UserManager` ile elle, sıralı bir akış kuruyor —
  hesap yok / parola yanlış / e-posta doğrulanmamış hepsi parola ispatlanana kadar AYNI 401
  yanıtını verir; kilit ve doğrulama durumu yalnızca doğru parola girildiğinde açığa çıkar.
  Bulunmayan hesap için de sahte bir özet hesabı yapılır (zamanlama farkını daraltmak için).
- **Kritik — hız sınırı IP başına değil, TEK global kovaydı.** `AddFixedWindowLimiter("auth", …)`
  literal "auth" dizesini bölüm anahtarı olarak kullanıyor, yani tüm internetin ortak bir
  sayacı vardı — tek bir istemci 10 istek atınca herkes 5 dakika kilitleniyordu (kimlik
  doğrulama yüzeyinin tamamına karşı bilinçsizce açılmış bir DoS). Düzeltme:
  `AddPolicy` + `RateLimitPartition.GetFixedWindowLimiter` ile IP başına ayrı kova.
- **Yüksek — yenileme token'ı döndürmede TOCTOU yarışı + tekrar oynatma tespiti yoktu.**
  Aktiflik kontrolü (SELECT) ile iptal+ekleme (SaveChanges) ayrı adımlardı; eşzamanlı iki
  istek aynı token'ı sunarsa ikisi de kazanıp tek token'ı iki bağımsız zincire çatallıyordu.
  `ReplacedByHash` alanı bu ihtimale karşı vardı ama hiçbir yerde okunmuyordu. Düzeltme:
  döndürme artık `ExecuteUpdateAsync` ile `WHERE RevokedAt IS NULL` koşullu tek bir atomik
  UPDATE — yarış burada kapanıyor. Zaten iptal edilmiş bir token AYRI bir istekte tekrar
  sunulursa (gerçek çalıntı-tekrar imzası) zincirin ucu bulunup iptal ediliyor. Bilinçli
  ayrım: eşzamanlı çakışmayı kaybeden taraf yalnızca 401 alır, kazananın zinciri iptal
  EDİLMEZ — aksi hâlde sıradan bir tarayıcı yeniden denemesi kullanıcıyı oturumdan atardı.
- **Yüksek — parola sıfırlama eski oturumları geçersiz kılmıyordu.** Artık başarılı
  `ResetPassword` o kullanıcının tüm aktif yenileme token'larını iptal ediyor.
- **Yüksek — kayıt ve parola sıfırlama e-posta numaralandırmasına açıktı.** `Register`
  `DuplicateUserName`/`DuplicateEmail` kodunu olduğu gibi döndürüyordu; `ResetPassword`
  "hesap yok" ile "token geçersiz" için farklı gövde şekli veriyordu. İkisi de artık
  `ForgotPassword`'deki ilkeyle aynı: hesap var/yok ayrımı dışarı sızmaz (kayıtta var olan
  hesap sahibine "biri e-postanla kayıt olmaya çalıştı" bildirimi gider, yeni hesap açılmaz).
- **Yüksek — `/refresh`, `/logout`, `/confirm-email` hiç hız sınırlı değildi.** `refresh`
  için ayrı, daha gevşek bir politika (30/5dk — sekme başına sayfa yüklemesinde sessizce
  çağrılıyor), diğer ikisi `auth` politikasına eklendi.
- **Orta — `Jwt:Key` boşken sessizce açılıyordu, ilk korumalı istekte patlardı.** Artık
  açılışta anahtar uzunluğu doğrulanıyor, eksikse uygulama hiç ayağa kalkmıyor (canlı
  doğrulandı: `Development` ortamı verilmeden çalıştırıldığında beklenen hatayla duruyor).
- **Orta — CORS "boş dize" varsayılanı hiç devreye girmiyordu.** `appsettings.json`
  anahtarı `null` değil `""` commit ediyor; `??` bunu yakalamıyordu. Hem CORS hem
  `Register`/`ForgotPassword`'deki bağlantı üretimi aynı `IsNullOrWhiteSpace` kontrolüne
  taşındı.
- **Orta — yenileme çerezi yerel http geliştirmede sessizce hiç kaydolmuyordu.**
  `Secure=true` sabitti; `SetRefreshCookie` artık `IWebHostEnvironment` alıyor ve yalnızca
  geliştirme dışında `Secure` zorluyor.
- **Düşük — vekil arkasında gerçek istemci IP'si görünmüyordu.** `ForwardedHeaders`
  ara katmanı eklendi (üretimde `KnownProxies` Faz 8'de doldurulacak).
- **Düşük — auth uçlarında gövde boyutu sınırı yoktu.** 16 KB'lık bir `RouteHandlerBuilder`
  uzantısıyla `register`/`login`/`forgot-password`/`reset-password`'a uygulandı.
- **Düşük — `Project → Calculation/Report` zincirinde `Cascade` silme.** İncelendi ve
  **bilinçli olarak korundu** — hesap silindiğinde gerçek/tam silme (KVKK/GDPR "unutulma
  hakkı") burada doğru davranış; `Restrict`e çevirmek daha güvenli görünüp aslında hesap
  silmeyi FK ihlaliyle kilitlerdi. `AppDbContext.cs`'e gerekçe yorum olarak eklendi.

Tüm düzeltmeler sonrası: `dotnet build` 0 uyarı/0 hata, `dotnet ef migrations
has-pending-model-changes` "değişiklik yok" (şema sürüklenmedi), uygulama `Development`
ortamında temiz açılıyor.

### Faz 3 — frontend auth

`src/lib/api.js` (fetch istemcisi — `storage.js` ile aynı port+adaptör deseni, hiçbir
zaman istisna fırlatmaz, 401'de tek seferlik sessiz yenileme, eşzamanlı 401'ler tek
yenileme isteğini paylaşır), `src/hooks/useAuth.jsx` (oturum durumu; erişim token'ı yalnızca
bellekte — `localStorage`'a hiç yazılmaz), `src/data/authText.js` (iki dilli metin +
sunucu hata kodundan cümle kuran `authErrorText`), `src/components/AuthField.jsx`,
beş ekran (`Login`, `Register`, `ForgotPassword`, `ResetPassword`, `ConfirmEmail`).

`HashRouter` → `BrowserRouter`, `vite.config.js`'te `base: '/'` + dev sunucusunda `/api`
vekili. Eski `#/...` bağlantıları `main.jsx`'teki tek satırlık geçmiş düzeltmesiyle
kırılmıyor (risk R3, plan §8). Başlığa `AccountArea` eklendi — `LangSwitch` ile aynı
`.lang-switch` görsel dilini kullanıyor (§6.4 kararı: yeni görsel desen yok); bunun için
tema dosyalarına `.lang-switch a` ve `.field-hint.danger` / `.auth-panel` kuralları eklendi
(dördüne de, CLAUDE.md kuralı gereği).

**Doğrulama:** `npm run build` ve `npm test` (892/892) yeşil. Vite geliştirme sunucusu her
yeni dosyayı hatasız dönüştürdü, yeni rotaların hepsi (`/giris`, `/kayit`, …) 200 döndü.
**Gerçek bir tarayıcıda görsel/etkileşim doğrulaması yapılmadı** — bu ortamda headless
tarayıcı aracı yok. Ayrıca uçtan uca giriş akışı canlı bir API'ye karşı denenmedi (Faz 2'nin
Postgres kısıtıyla aynı sebep).

### Not tamamlanan

Faz 3b (yazı tiplerini sunucuya taşıma) bu ortamda engellendi — dış ikili dosya indirme
`curl`/`fetch` her iki yoldan da ağ erişimine kapalı. Normal ağ erişimi olan bir ortamda
tamamlanmalı.

## 15. Faz 4 durumu — rapor üretimi çalışıyor

**Tarih:** 2026-07-29 · **Sonuç:** PDF ve Excel uçtan uca çalışıyor, 3 pilot araç raporluyor.

Faz 5 (proje kaydı) yerine önce Faz 4 seçildi: rapor, kaydedilmiş bir projeye ihtiyaç
duymadan doğrudan o anki hesap durumundan üretiliyor (§5, kasıtlı tasarım), bu yüzden
Faz 5'e bağımlı değil ve üyeliğin asıl değerini (PDF/Excel) daha erken teslim ediyor.

### Backend — `Alp.Reports` + rapor uçları

- `ReportPayload.cs`: §5.1 sözleşmesinin C# DTO'ları. Faz 1'in JSON taslağından TEK sapma
  bilinçli: `value`/`unit` ayrı alanlar (plan zaten böyle tarif ediyordu), `ReportNote.Level`
  ekranla aynı üç seviyeyi (`ok`/`warn`/`danger`) taşıyor — ilk yazımda yalnızca `warn`/
  `danger` desteklenmiş, `commentary()`'nin ürettiği `ok` seviyeli satırlar yanlış amber
  simgeyle basılırdı; düzeltildi.
- `PdfReportBuilder.cs`: Faz 1 spike'ının doğrulanmış düzeni (yeşil başlık, her sayfada
  logo+tarih, `ShowEntire()` blokları, `Background()` sırası) artık gerçek, çok bölümlü
  `ReportPayload`'a genellenmiş hâliyle çalışıyor — spike'la aynı görsel kalite, ayrı bir
  smoke test'te doğrulandı (bkz. aşağı).
- `XlsxReportBuilder.cs` (ClosedXML): "Özet" + araç başına sayfa. Sayısal değerler
  `double.TryParse` ile gerçek sayı hücresine yazılıyor (kullanıcı formülde kullanabilsin
  diye, §5.4), yalnızca sayıya çevrilemeyenler metin kalıyor — gerçek `.xlsx` içinde
  `<c t="s">` (metin) / işaretsiz (sayı) ayrımı elle doğrulandı.
- `POST /api/reports/pdf`, `POST /api/reports/xlsx`, `GET /api/reports`,
  `GET /api/reports/{id}/download` — hepsi `[Authorize]`. `Report.ProjectId` **nullable**
  yapıldı (ilk yazımda zorunluydu — "rapor projesiz de üretilebilir" kararıyla çelişiyordu,
  migration regenerate edildi). İndirmede sahiplik kontrolü var-olmayan/başkasına-ait raporu
  aynı 404 ile karşılıyor (numaralandırmaya kapalı, auth'taki ilkeyle aynı).
- Font gömme: `web/public/fonts/` henüz yok (Faz 3b engellendiği için); `ReportFonts.
  RegisterIfAvailable` dizin yoksa sessizce atlıyor, SkiaSharp bilinmeyen aile adında
  platform yazı tipine düşüyor — QuestPDF hiç patlamadı, gerçek smoke test'te doğrulandı.

**İkinci bir güvenlik bulgusu (öz-inceleme, ayrı workflow değil):** rapor uçlarına hiç hız
sınırı uygulanmamıştı — QuestPDF/ClosedXML CPU/disk yoğun olduğu için kimlik doğrulamalı
tek bir hesap bile tekrar tekrar çağırarak kaynak tüketebilirdi. `reports` adlı, **kullanıcı
kimliğine göre bölümlenen** (IP değil — aynı ofisteki farklı kullanıcılar aynı kotayı
paylaşmasın) yeni bir hız sınırı politikası eklendi. Bunu eklerken ikinci, daha ciddi bir
sıralama hatası ortaya çıktı: `app.UseRateLimiter()` `app.UseAuthentication()`'dan ÖNCE
çalışıyordu, yani kullanıcı bazlı bölüm anahtarı çalıştığı anda `ctx.User` henüz
doldurulmamış oluyordu — sessizce IP'ye düşüp istenen ayrımı hiç yapmıyordu. Middleware
sırası düzeltildi: `UseAuthentication → UseAuthorization → UseRateLimiter`.

### Frontend — `svgInline.js`, `reportPayload.js`, 3 pilot

- `svgInline.js`: Faz 1'in string tabanlı, görsel olarak doğrulanmış dönüşümü taşındı
  (DOM/`getComputedStyle` tabanlı bir yeniden tasarım daha "doğru" olurdu ama bu ortamda
  tarayıcı yok, test edilemezdi — bilinçli tercih). Tek gerçek risk olan "tema değişirse
  palet bayatlar" sorunu bir testle kapatıldı: `svgInline.test.js` aktif tema dosyasını
  (`theme.css`'in `@import` satırından) okuyup `RULES`'daki her `var(--x)` adının orada
  gerçekten tanımlı olduğunu doğruluyor — elle senkron tutmaya değil, teste dayanıyor.
- `reportPayload.js`: yük kurma + doğrulama (`buildReportPayload`) ve `num.js`'in
  `fmtOhm`/`fmtVolt` gibi dinamik-SI-önekli dize döndüren fonksiyonlarını Excel için
  value/unit'e ayıran `splitFormatted`.
- `Schematic.jsx`/`LineChart.jsx`: `forwardRef` ile canlı SVG düğümüne erişim — görsel
  değişiklik yok, LineChart'ın imleç konumlandırması için zaten var olan iç `svgRef` ile
  birleştirildi.
- Pilot 3 araç (`TraceWidth`, `ResistorCode`, `LengthConverter`) her biri `report.js` +
  `report.test.js` aldı. Girdiler mümkün olduğunca `formFields()`'ten türetiliyor (elle
  kopya değil — model değişirse rapor otomatik takip eder). **Yazarken üç kez ekran-rapor
  kayması (§8 R6) yakalandı ve düzeltildi:** `vdropAvg`/`vdropMax`/`ploss`/`perLength`
  satırları önce sabit birimle (mV/mW) yazılmıştı, ekran `fmtVolt`/`fmtWatt`/`fmtEng`'in
  DİNAMİK SI öneki seçimini kullanıyor — `splitFormatted` ile düzeltildi. Bu, testlerin
  "yapı bozulmadı mı" denetlediği ama "ekranla aynı sayıyı mı üretiyor" diye ayrıca
  doğrulanmadığı bir sınıf hatasıydı; ileride her pilotun testine bu tür bir çapraz kontrol
  eklenmesi düşünülebilir.
- `ReportDialog.jsx`: sonuç panelinin altında (modal değil, §6.4). Girişsiz kullanıcıya
  yalnızca giriş bağlantısı gösterir. İndirme anında `schematicRef`/`chartRef`'ten canlı SVG
  yakalanıp rapora enjekte edilir — `report.js` dosyaları SVG'siz, saf kalır.
- `api.js` genişletildi: rapor uçları ikili (PDF/Excel) gövde döndürüyor, mevcut istemci
  yalnızca JSON ayrıştırıyordu. Auth/yenileme mantığını JSON ve ikili yol arasında
  paylaşan ortak bir sarmalayıcıya (`withRefresh`) çıkarıldı — kopya yok.

### Doğrulama

Auth/DB katmanı olmadan, gerçek `Alp.Reports` projesine karşı bir smoke test yazıldı
(`scratchpad/faz4smoke`) — Faz 1'in SVG çıktılarını gerçek, parametrize `PdfReportBuilder`/
`XlsxReportBuilder`'a besleyip çıktıyı görsel olarak inceledi: iki bölümlü rapor doğru
sayfalanıyor, vurgulu satırlar her iki bölümde çalışıyor, notlar yalnızca ilgili bölümde,
`.xlsx` içindeki sayısal hücreler gerçekten sayı (metin değil). Frontend: `npm run build` +
`npm test` (934/934) yeşil, yeni tüm dosyalar CLAUDE.md'nin `ipc` yasağı ve çıplak dize
taramasından geçti. **Gerçek bir tarayıcıda uçtan uca indirme denenmedi** (headless tarayıcı
yok, canlı Postgres yok) — bu, Faz 2/3'ten devralınan aynı ortam kısıtı.

### Kalan

Faz 5 (proje/hesap uçları, çok bölümlü rapor), Faz 6 (kalan 22 araç), Faz 3b (fontlar,
ağ erişimi olan ortamda), Faz 7/8/9.

## 16. Faz 5 durumu — proje/hesap uçları çalışıyor

**Tarih:** 2026-07-29 · **Sonuç:** Projects/Calculations CRUD uçtan uca çalışıyor,
SaveToProject ve proje ekranları eklendi; backend build + frontend build/test yeşil.

### Backend — `Alp.Api/Projects/`

- `ProjectEndpoints.cs` + `Contracts.cs`: §4.3'teki tam uç listesi (`GET/POST /api/projects`,
  `GET/PATCH/DELETE /api/projects/{id}`, `POST .../calculations`,
  `PATCH/DELETE /api/calculations/{id}`, `POST .../calculations/reorder`). `Program.cs`'e
  `app.MapProjectEndpoints()` eklendi. Yeni migration gerekmedi — `Project`/`Calculation`
  varlıkları ve `DbSet`'ler zaten Faz 2'nin ilk migration'ındaydı.
- Sahiplik her uçta JWT'deki kullanıcı kimliğinden doğrulanır; var olmayan/başkasına ait
  kaynak aynı 404 şeklini döner (auth'taki ilkeyle aynı, numaralandırmaya kapalı).
- `reorder` ucu istemciden gelen kimlik kümesinin projenin mevcut hesap kümesiyle TAM
  eşleştiğini denetler (eksik/fazla/yabancı proje kimliği reddedilir).
- Rapor uçlarına (`/api/reports/pdf`\|`xlsx`) isteğe bağlı `?projectId=` sorgu parametresi
  eklendi — sağlanırsa sahiplik doğrulanır ve üretilen `Report.ProjectId` ona bağlanır;
  eksikse davranış birebir eskisi gibi (`null`), `ReportDialog.jsx`'in mevcut tek-araç akışı
  hiç değişmedi.
- Öz-inceleme workflow'unda 3 bulgu çıktı, üçü de düzeltildi: `reorder` ucu `orderedIds`
  null/eksikken 500 fırlatıyordu (400 `MISSING_FIELDS`'a çevrildi); `PATCH
  /api/calculations/{id}` `CreateCalculation`'ın zorunlu-alan/`schemaVersion` doğrulamasını
  uygulamıyordu (eklendi); boş gövdeli PATCH (hiçbir alan yokken) yine de `UpdatedAt`'i
  güncelleyip projeyi listenin başına sıçratıyordu (yalnızca gerçek değişiklikte güncellenecek
  şekilde düzeltildi).
- `dotnet build` temiz (0 uyarı, 0 hata).

### Frontend — SaveToProject + proje ekranları

- `src/lib/engineVersion.js`: tek, elle artırılan `ENGINE_VERSION` sabiti — motor/araç
  başına ayrı sürümleme yok (kasıtlı basitlik).
- `src/components/SaveToProject.jsx`: `ReportDialog`'un yanına oturan, aynı auth-gating ve
  `.panel`/`.row-add` deseni; mevcut projeye kaydeder ya da yeni proje açar. Dile bağlı metin
  `src/data/saveToProjectText.js`'te.
- `src/pages/account/Projects.jsx` (`/projelerim`) ve `Project.jsx` (`/proje/:id`): kart
  ızgarası (Home/CategoryPage deseni), hesap sıralama (yukarı/aşağı), proje bazlı çok
  bölümlü rapor indirme (`?projectId=` ile).
- 3 pilot araç (TraceWidth, ResistorCode, LengthConverter) `<SaveToProject>` aldı —
  `report.js`'i olmayan kalan 22 araca kasıtlı dokunulmadı (Faz 6'nın işi).
- Öz-inceleme workflow'unda 3 bulgu çıktı, üçü de düzeltildi: `SaveToProject.jsx` başlangıçta
  `components/` katmanından `pages/tools/*/report.js`'i doğrudan import ediyordu (mimarinin
  tek yönlü bağımlılık kuralını — `pages → components → hooks → lib` — tersine çeviriyordu)
  ve bu yüzden derlenen paylaşılan chunk üç aracın tüm report/model kodunu paketleyip her
  pilot sayfaya taşıyordu (28 KB → 3,3 KB gzip'e indi); bunun yerine `ReportDialog`'daki gibi
  sayfanın zaten kurduğu `section` nesnesini prop olarak alacak şekilde değiştirildi.
  `Projects.jsx`'te sil düğmesi kart `<Link>`'i içine iç içe konmuştu (geçersiz
  HTML/erişilebilirlik sorunu) — karttan çıkarılıp kardeş öğe yapıldı. Silme hatası mesajı
  sayfanın en üstündeki "yeni proje" panelinde gösteriliyordu, ilgili karttan kopuktu — karta
  taşındı.
- `npm run build` ve `npm test` (934/934) yeşil; CLAUDE.md'nin çıplak-Türkçe-dize taraması ve
  esbuild ile gerçek `getText('tr'|'en')` kurma kontrolü temiz.

### Kalan

Faz 6 (kalan 22 aracın `report.js`'i — tamamlandıkça her biri SaveToProject de alır), Faz 3b
(fontlar), Faz 7 (`useSavedThickness`→hesaba taşıma), Faz 8/9. `PATCH /api/me`, logo yükleme
ve `/api/thickness-records/*` uçları §4.3'te listeli ama Faz 5'in kapsamına kasıtlı
alınmadı (görev tanımı yalnızca "proje/hesap uçları" diyordu) — sıradaki bir faza bırakıldı,
henüz atanmadı.

**Gerçek tarayıcı/Postgres'e karşı hiç denenmedi** (Faz 2/3/4'ten devralınan aynı ortam
kısıtı — headless tarayıcı yok, canlı DB yok); doğrulama build+test ile sınırlı.

## 17. Faz 6 durumu — kalan 22 araç raporlanabilir

**Tarih:** 2026-07-29 · **Sonuç:** 25 araç ekranının tamamı artık `report.js` +
`report.test.js` + `ReportDialog`/`SaveToProject` kablolamasına sahip. `npm run build`
temiz, `npm test` 60 dosya / 1241 test yeşil, `ipc` yasağı ve çıplak-Türkçe-dize taraması
temiz.

İş, her araç için implement → review → fix üç aşamalı bir workflow ile paralel yürütüldü
(22 araç aynı anda, ~16 eşzamanlı üst sınırla). Oturum sınırına takılıp bir kez yarıda
kesildi (7 review + 12 fix + son doğrulama başarısız oldu — hepsi "session limit" hatası,
mantık hatası değil); aynı workflow `resumeFromRunId` ile devam ettirildi, tamamlanan 38
ajan önbellekten geldi, kalanlar yeniden çalıştı. Ara doğrulama sırasında, aynı rollout'un
bir parçası olarak `PropDelay/schematic.jsx`'in `forwardRef` kapanışı ve
`export default`'u eksik bırakılmış olduğu (bina tüm `npm run build`'u kırıyordu) ortaya
çıktı — resume'den önce elle düzeltildi.

### Review'da çıkan, düzeltilen sistemik bulgular

Tek bir araca özgü olmayan, tekrar eden desenler:

- **Grafik veri tablosunda son satır sessizce düşüyor.** `ChartDataTable`
  (`LineChart.jsx`) ekranda her zaman sweep'in son satırını zorla ekliyor ("son nokta her
  zaman gösterilir — eğrinin sağ ucu asimptotu taşır"); birçok yeni `report.js` dosyası
  bunun yerine düz `i % N === 0` filtresi kullanıp son satırı atlıyordu. `LineChart.jsx`'e
  paylaşılan bir `sampleIndices(length, every)` yardımcısı eklendi (ekranın kendisi de
  buradan besleniyor) ve etkilenen araçların çoğu buna geçirildi; birkaçı (Crosstalk,
  CriticalLength, Skew, SingleEnded, Termination, Decoupling) yerel eşdeğer bir düzeltmeyle
  bırakıldı — işlevsel olarak doğru ama tek kaynağa indirgenmemiş, ileride tutarlılık için
  bakılabilir. **Bu hatanın aynısı 3 pilot araçta da var** (TraceWidth/ResistorCode/
  LengthConverter, Faz 4) — review ajanları defalarca "bu desen zaten TraceWidth'in
  report.js'inde var" diye not düştü. Faz 6'nın kapsamı dışında bırakıldı, düzeltilmedi.
- **Şematik altyazısı (`schematicCaption`) unutuluyor** — birkaç araçta (AwgConverter,
  Crosstalk, LedOhmRlc) şematik altındaki `<figcaption>` metni rapora hiç taşınmıyordu
  (SVG yakalama yalnızca `<svg>` düğümünü kapsıyor, kardeş `<figcaption>`'ı değil).
  Hepsi düzeltildi.
- **Ekran/rapor etiket kayması** — DiffPair'de yapıya bağlı H/W/S alan etiketleri,
  Junction'da mod-bağlı "opsiyonel" eki, TemperatureConverter'da C/F/K sütun sırası
  transpozisyonu, VoltageDivider'da girdi ve sonuç bölümünün aynı etiketi paylaşması gibi
  — hepsi §15'in kendi tanımladığı "ekran ile rapor aynı sayıyı/etiketi göstermeli" risk
  sınıfından, hepsi düzeltildi.
- **Çevrilmeyen birim sızıntısı** — ThermalVia ve ViaProperties'te "adet" (Türkçe, dahili
  parser anahtarı) İngilizce raporlarda da öylece basılıyordu; `text.countUnit` üzerinden
  çözülecek şekilde düzeltildi. LedOhmRlc'de aynı desen var ama bu faz kapsamında
  dokunulmadı (kendi şematik-altyazı bulgusu düzeltildi, birim sızıntısı ayrı bir bulgu
  olarak açılmadı).
- **Decoupling'de kritik bir etiket hatası**: `report.js` `formFields(mode, f,
  text.fieldLabels)` diye 3 argümanla çağırıyordu ama bu aracın `formFields(mode, labels)`
  imzası yalnızca 2 argüman alıyor — üçüncü argüman sessizce yutuluyor ve ham form
  değerleri (`f`) `labels` parametresine bağlanıyordu; sonuç: her girdi satırının etiketi
  kendi değeriyle aynı sayı oluyordu. TraceWidth'in 3-argümanlı çağrısının (kendi
  `formFields`'ı gerçekten 3 argüman aldığı için) kör kopyalanmasından kaynaklanmış.
  Düzeltildi.

### Kalan

Faz 3b (fontlar), Faz 7 (`useSavedThickness`→hesaba taşıma), Faz 8/9. Ayrıca: 3 pilot
araçtaki grafik-son-satır hatası (yukarıda) düzeltilmedi — küçük, izole bir temizlik
fazı olarak ele alınabilir, henüz atanmadı. `PATCH /api/me`, logo yükleme,
`/api/thickness-records/*` de hâlâ açık (Faz 5'ten devreden, bkz. §16).
