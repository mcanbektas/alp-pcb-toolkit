# Üyelik ve Rapor Altyapısı — Uygulama Planı

**Durum:** uygulandı — fazlar üretim kodunda; belge tarihsel referans olarak durur (2026-07-31)
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

**Ek (30.07.2026) — `labels` alanı.** Kural yazıldığı hâliyle yalnızca *bölümleri* kapsıyordu;
belgenin çerçevesi (`Özet`, `Hazırlayan`, `Girdiler`, `Sonuçlar`, Excel sayfa adları, dizgi
başarısızlığında basılan iki cümle) `Alp.Reports` içinde çakılı Türkçeydi. Sonuç: İngilizce
arayüzde **karışık dilli belge** — bölümler İngilizce, başlıklar Türkçe. Çerçeve metni de yüke
alındı (`ReportLabels`, karşılığı `web/src/data/reportText.js` → `reportLabels(lang)`), böylece
sunucuda hiçbir kullanıcı metni kalmadı ve üçüncü bir dil eklendiğinde yine tek satır değişmez.
Yan sonuç: `GET /api/reports/{id}/download` **POST'a döndü** — kayıttan yeniden üretim de
etiketlere ihtiyaç duyuyor ve GET gövde taşımıyor.

**Belge dili arayüz dilinden ayrıdır.** Rapor panelinde ayrı bir seçici var (`docLang`); Türkçe
çalışıp İngilizce rapor indirmek olağan bir istek ve seçim `useLang()`'e dokunmaz.

**Bölümler de seçimi izler.** Bölüm `report.js`'ten ekranın `getText(lang)`'iyle kurulur ve
şema/grafik SVG'si canlı DOM'dan okunur — ikisi de "ekranda hangi dil varsa" o dilde. Çözüm,
29 araç ekranını değiştirmek yerine `hooks/useLangCapture.js`: dil `flushSync` ile çevrilir,
bölüm ve SVG okunur, yine `flushSync` ile geri alınır. İki eşzamanlı commit arasında tarayıcı
boyama yapamadığı için kullanıcı çevrilmeyi görmez.

Aynı kanca kaydetmede de kullanılır: `ReportJson` artık dil haritasıdır
(`{"tr": {...}, "en": {...}}`), yani proje raporu yıllar sonra da istenen dilde üretilebilir.
Bedeli kayıt boyutu — iki SVG kümesi, hesap başına ~12 KB yerine ~25 KB. Eski tek bölümlü
kayıtlar okunmaya devam eder: `Alp.Api/Projects/StoredSection.cs` kökte bölüm alanı görürse
kaydı eski şekil sayar, istenen dil yoksa eldekine düşer. Proje paneli bunu yazar.

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

> **İSTİSNA — yıkıcı eylem onayı (`components/ConfirmDialog.jsx`):** native `<dialog>` +
> `showModal()` kullanılır; örtü, odak hapsi, Escape ve inert arka plan tarayıcıdan geldiği
> için yukarıdaki "elle kurma" gerekçesi bu tek yerde geçerli değildir.

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

## 18. Kayıt döngüsü tamamlandı — kaydet / gör / aç / güncelle

**Tarih:** 2026-07-29 · **Sonuç:** kaydetme tek yönlü bir yazma olmaktan çıktı; kaydedilen
hesap geri açılabiliyor, üzerine yazılabiliyor ve proje listesinde okunabilir hâlde
görünüyor. Gerçek tarayıcıda ve canlı yığında doğrulandı.

### Kapatılan dört açık

1. **`InputsJson` yazılıyordu, hiç okunmuyordu.** Alan doluyor ama kaydı araca geri
   yükleyecek bir yol yoktu. Artık `?hesap=<id>` sorgu parametresi kaydı ekrana geri kurar.
2. **Aynı hesap iki kez kaydedilince kopya satır oluşuyordu.** `PATCH
   /api/calculations/{id}` backend'de yazılıydı ama arayüz onu hiç çağırmıyordu. Ekran artık
   ilk kayıttan sonra o kayda **bağlanır** ve ikinci kaydetme üzerine yazar.
3. **`EngineVersion` saklanıyor, hiç kullanılmıyordu.** Kayıt uygulamanın güncel motor
   sürümünden geriyse proje listesinde "eski sürüm" çipi, araç ekranında da bir not çıkar.
4. **Önizleme ham JSON anahtarı gösteriyordu** (`wMm 0.3605`). Önizleme artık `ReportJson`
   içindeki **etiketlenmiş ve birimlenmiş** sonuç satırlarından kurulur; vurgulanan satır
   başa alınır.

### Yol boyunca çıkan bir hata

`categories.js`'teki üç DFM aracının `id` alanı, ekranın kaydettiği `toolKey` ile
ayrışmıştı (`bga` ↔ `bga-breakout`, `stackup` ↔ `stackup-planner`, `clearance` ↔
`clearance-creepage-padstack`). Proje listesinde bu üç aracın adı yerine ham anahtar
görünüyordu ve "Aç" yolu da bulunamazdı. `id` alanları **kaydedilen anahtara** hizalandı —
kalıcı olan taraf odur.

### Backend

- `GET /api/calculations/{id}` eklendi (`CalculationDetailResponse`: hesap + üst projenin
  kimliği ve adı). Araç ekranı yalnızca kaydın kimliğini bilir, üst projeyi bilmez; proje
  detayı üzerinden okuma bu yüzden yetmiyordu. Sahiplik yine `Calculation.Project.UserId`
  üzerinden doğrulanır, yok/başkasının kaydı **aynı 404** şeklini döner.

### Frontend

- **`src/lib/savedCalculation.js`** (saf, 21 test): `restoreForm` kaydı aracın **mevcut**
  form şemasına süzer — tanınmayan alan atılır, eksik alan başlangıç değerinde kalır, satır
  listelerinde fazlalık anahtar temizlenir, tek bozuk satır bütün alanı düşürür (yarısı
  yüklenmez). `engineStatus` sürüm sayısal değilse `stale` demez, `unknown` der.
  `previewRows` **yalnızca** `results` dizisini okur; `reportJson` içindeki satır içi SVG
  alanlarına hiç dokunmaz, dolayısıyla ekrana geri yazılabilecek bir işaretleme üretmez.
- **`src/hooks/useSavedCalculation.js`**: URL parametresini okur, kaydı çeker, `toolKey`
  eşleşmesini denetler, formu geri yükler ve ekranın hangi kayda bağlı olduğunu tutar.
  `bind()` yeni kaydı bağlar (URL'yi `replace` ile günceller), `unbind()` bağı koparır.
  Aynı kimlik iki kez yüklenmez: kullanıcı formu düzenledikten sonra bir yeniden render
  geri yüklemeyi TEKRARLAMAZ, yoksa düzenleme sessizce geri alınırdı.
- **`SaveToProject`** iki hâlli oldu (bağsız → yeni kayıt, bağlı → üzerine yaz + "Yeni kayıt
  olarak ekle"). Kayıt gövdesi tek yerde kurulur; bölüm kurulamadıysa `reportJson` alanı
  **gönderilmez** (PATCH'te atlanan alan "değişmedi" demektir, eski bölüm korunur).
- **`Project.jsx`**: her satıra "Aç" bağlantısı, etiketli önizleme, mod etiketi ve eski
  sürüm çipi. Ham `reportJson`'ın DOM'a geri yazılmaması kuralı korunuyor.
- 29 araç ekranının tamamı hook'a bağlandı (`patch` + `saved` prop'u; modu ayrı state'te
  tutan 13 ekranda setter de geçirilir, modu form alanında tutanlarda gerek yok).
- Tema dosyalarının dördüne iki ortak kural eklendi: `.tool-row .sub` (kayıt satırındaki
  ikincil bilgi) ve `a.row-add` (düğme görünümlü gerçek bağlantı). Ekrana özel CSS yok.

### Doğrulama

- `npm test` 1887/1887 yeşil (111 yeni: 21 saf katman + 90 bekçi), `npm run build`
  temiz, `dotnet build` 0 uyarı.
- `pages/tools/toolKeys.test.js`: `toolKey` ↔ `categories.js` eşleşmesi, her aktif
  katalog kaydının ekranı ve her ekranın kayıt bağını geçirmesi kaynak dosyalar
  metin olarak okunarak denetlenir (`dfmTextPaths.test.js` ile aynı teknik).
- Canlı yığında curl ile: oluştur → oku → PATCH → proje detayında **tek satır**; yok olan
  kayıt 404, tokensiz istek 401.
- Gerçek tarayıcıda (Playwright, `scratchpad/pw/verify-kayit.mjs`) 17 kontrol: kaydetme,
  URL'ye bağlanma, üzerine yazma, kopya olmaması, proje satırındaki ad/mod/önizleme, "Aç"
  ile geri yükleme (girdi **ve** mod), bağ koparma, bulunamayan kayıt, başka aracın kaydı,
  oturumsuz kullanıcı, sıfır sayfa hatası.

### Kalan

Ekranın bağlı olduğu kayıt silinirse ekran bunu ancak bir sonraki yüklemede fark eder
(güncelleme 404 döner ve genel hata mesajı görünür) — özel bir mesaj yazılmadı.
Faz 3b (fontlar), Faz 7, Faz 8'in sunucu adımı ve Faz 9 hâlâ açık.

## 19. Rapor turu — saklama kararı, PDF koruması, grafik örneklemesi

**Tarih:** 2026-07-30 · **Kapsam:** `docs/kod-incelemesi-2026-07-29.md`'de "rapor turu" diye
ertelenen dört madde + §17'nin açık bıraktığı grafik-son-satır temizliği.

### Karar — üretilen rapor dosyası saklanmaz

Kullanıcı kararı: **belge diske yazılmaz, ama kullanıcı istediği zaman tekrar
indirebilmelidir.** İkisi çelişmiyor çünkü rapor türetilmiş veridir: kaynağı kaydedilmiş
hesapların `ReportJson` bölümleridir ve onlar veritabanında zaten duruyor.

- `Persist` → `LogReport`: dosya yazma kalktı, `Reports` tablosu **kütük** olarak kalıyor
  (kim, ne zaman, hangi biçim, kaç bayt). `Report.FilePath` alanı silindi
  (`20260730055157_DropReportFilePath`).
- `GET /api/reports/{id}/download` artık diskten okumuyor, **yeniden üretiyor**: projenin
  hesaplarını `SortOrder`'a göre okur, her `ReportJson`'ı `ReportSection` olarak ayrıştırır
  (bozuk bölüm sessizce atlanır — istemcideki `Project.jsx` ile aynı kural), belgeyi kaydın
  biçiminde (PDF/Excel) yeniden basar. Uç `reports` hız sınırı kovasına alındı: artık CPU
  harcıyor.
- Belgenin **tarihi ilk üretim günüdür** (`GeneratedAt`), yeniden basma günü değil.
- Yeniden üretilemeyen iki durum aynı koda düşer, ikisi de 409 +
  `REPORT_NOT_REPRODUCIBLE` (yapısal `detail.reason`): projeye kaydedilmemiş tek seferlik
  rapor (`no-project` — proje silinmişse FK `SetNull` yüzünden buraya düşer) ve projede
  hiç okunabilir bölüm kalmaması (`no-sections`). 404 **değil**: kayıt duruyor, eksik olan
  kaynak veri.
- Bunun kabul edilen sınırı: **kaydetmeden alınan rapor geri getirilemez.** O ekranın verisi
  hiçbir yerde durmuyor.
- `Storage:ReportsPath` ayarı, `StorageOptions` sınıfı ve compose'daki
  `Storage__ReportsPath` satırı kalktı. `deploy/docker-compose.yml`'deki `reports` volume'u
  **adı tarihsel kalmak üzere korundu**: artık yalnızca `/app/App_Data/keys` altındaki Data
  Protection anahtarlarını taşıyor ve yeniden adlandırmak boş bir volume demek olurdu — o an
  postası yolda olan doğrulama bağlantıları geçersizleşirdi.

Bu karar aynı zamanda "Rapor indirme dosyayı tamamen belleğe alıyor" (P2, `Results.File` +
`File.ReadAllBytesAsync`) maddesini de kapatır: diskten okuma yolu tümüyle kalktı, akışa
çevrilecek bir dosya yok.

### PDF layout hatası artık 500 değil

`builder.Build(payload)` korumasızdı; QuestPDF içeriği sayfaya sığdıramadığında
`DocumentLayoutException` işlenmeden 500'e düşüyordu (5000 satırlık geçerli yükle canlı
sunucuda doğrulanmıştı).

- `Alp.Reports/ReportLayoutException.cs` eklendi; `PdfReportBuilder.Build` dizgiyi sarıyor
  (`Compose` ayrı bir metoda alındı). **Uygulama katmanı QuestPDF'in istisna türünü
  tanımıyor** — dizgici değişirse uçtaki `catch` aynı kalır.
- `POST /api/reports/pdf` ve yeniden üretim yolu 422 + `REPORT_TOO_LARGE` döner.
- Arayüz mesajı çıkış yolunu da söylüyor ("daha az hesapla deneyin ya da Excel indirin") —
  "tekrar deneyin" burada yanlış tavsiye olurdu, tekrar denemek aynı sonucu verir.
- `Program.cs`'e **üretim** exception handler'ı eklendi: `{ error: 'SERVER_ERROR' }` gövdesi
  + garantili `LogError`. Geliştirmede bilinçli olarak kapalı (geliştirici istisna sayfası
  daha yararlı).

### Grafik son satırı — kural tek kaynağa indi

§17'nin "3 pilot araçta da var" notu eksik çıktı. Gerçek tablo:

- Ham `i % N === 0` filtresi **11** `report.js` dosyasındaydı. Bunlardan **6'sı** gerçekten
  son satırı düşürüyordu: `TraceWidth`, `SingleEnded`, `TimingCrystal`, `DiffPair`,
  `LedOhmRlc`, `AwgConverter`. Her birine regresyon testi yazıldı (önce
  `(rows.length - 1) % every !== 0` doğrulanır, sonra son satır eşitliği).
- `ResistorCode` ve `LengthConverter`'da **grafik taraması yok** — §17'nin saydığı iki pilot
  aracın düzeltilecek bir şeyi yoktu.
- `CopperConverter` bozuk sanılmıştı ama `buildSweep` çalışma noktasını ek örnek olarak
  soktuğu için satır sayısı 61'e çıkıyor ve son indeks 5'e tam bölünüyor — hata yoktu.
- Kalan 4 dosya (`TemperatureConverter`, `FrequencyConverter`, `Junction`,
  `DecibelConverter`) 61 noktalı taramada tesadüfen doğruydu; tarama adımı değişince
  sessizce ayrışacakları için onlar da taşındı.
- Ayrıca §17'nin "yerel eşdeğer düzeltmeyle bırakıldı" dediği **8** dosya kuralın satır içi
  kopyasını taşıyordu (`ComplexConverter`, `Crosstalk`, `PowerPlane`, `PropDelay`,
  `CriticalLength`, `Skew`, `Termination`, `Decoupling`). Hepsi `sampleIndices`'e çevrildi;
  yan fayda: kopyaların üçü boş dizide `-1` indeksine düşüyordu, paylaşılan fonksiyonun
  `length > 0` koruması bunu da kapattı.

Sonuç: örnekleme kuralı **19** dosyadan kalktı, tek kopya `LineChart.jsx`'teki
`sampleIndices`'te. Ekran ve rapor aynı fonksiyonu çağırıyor.

## 20. Proje detayı artık rapor bölümü taşımıyor

**Tarih:** 2026-07-30 · **Kapsam:** `docs/kod-incelemesi-2026-07-29.md`'nin en ağır P1'i
(proje detayı %92 gereksiz bayt) ve onu izleyen iki yan sonuç.

### Ölçüm

60 hesaplı bir projede (her hesabın rapor bölümü satır içi şema + grafik SVG'si taşıyor):

| | yanıt |
|---|---|
| önce (`reportJson` + `inputsJson` + `resultJson` dahil) | ~906 KB |
| sonra (yalnız önizleme satırları) | **26,5 KB** · 26 ms |

Düşüş **%97**. Satır içi SVG istemciye artık hiç ulaşmıyor: yanıtta `<svg` geçmiyor,
`reportJson` alanı yok.

### Sözleşme

- `CalculationDto`'dan `ReportJson` kalktı (**yazma yönünde hâlâ kabul ediliyor**, yalnız
  yanıtlarda dönmüyor). Proje detayı ayrıca ham `InputsJson`/`ResultJson` da taşımıyor:
  liste satırı için yeni ve dar bir tip var, `CalculationSummaryDto`.
- Yeni alanlar: `preview` (etiket/değer/birim/emphasis, vurgulanan başa alınmış, en fazla
  iki satır, 80 karakterde kırpılmış), `previewMode`, `hasReport`. Sonuncusu şart: bölümün
  kendisi dönmediği için "rapor bölümü yok" çipi başka türlü bilinemezdi.
- Türetme `Alp.Api/Projects/ReportPreview.cs`'te ve istemcideki `previewRows`/`previewMode`
  ile aynı kuralları uyguluyor. O iki saf fonksiyon (ve testleri) silindi — kuralın iki
  kopyası kalsaydı ekran ile sunucu zamanla ayrışırdı. `restoreForm`/`engineStatus` yerinde.
- **Yeni uç:** `POST /api/projects/{id}/report/{pdf,xlsx}`. İstemci rapor bölümlerini artık
  alamadığı için yükü sunucu kuruyor; gövdede yalnız `{title, preparedBy, date}` gidiyor,
  firma adı kullanıcı kaydından okunuyor. Bölüm toplama kodu `/api/reports/{id}/download`
  ile ortak (`ProjectPayload`) — iki yol aynı projeden farklı belge üretemez.
  Mevcut `POST /api/reports/{pdf,xlsx}` sözleşmesi ("yükü istemci kurar") değişmedi; araç
  ekranı canlı SVG'yi hâlâ o an yakalayıp gönderiyor.
- `Project.jsx`'teki `useMemo` kalktı: satır başına iki `JSON.parse` yapan iş artık yok.

### Yol boyunca çıkan iki hata

1. **"Hazırlayan" alanı boş kalıyordu.** `user` ilk render'da henüz yüklenmediği için proje
   sayfası doğrudan açıldığında (ya da F5'lendiğinde) alan boş kalıyor ve PDF'e basınca
   "Hazırlayan adı boş olamaz" çıkıyordu. `ReportDialog`'da çözülmüş olan tek seferlik
   doldurma deseni `Project.jsx`'e de uygulandı. Eski bir kusur, bu turda görünür oldu.
2. **Boyutsuz SVG sunucuyu asıyordu — dayanıklılık açığı.** `viewBox` ve `width`/`height`
   taşımayan bir SVG çizime verildiğinde QuestPDF/Skia çözüm bulamıyor ve hata fırlatmak
   yerine dönüyor: istek yanıtsız kalırken süreç %248 CPU ve **7 GB** bellek yiyor (yerel
   ölçüm; Kestrel "thread pool starvation" uyarısı bastı, konteyner elle kurtarıldı).
   Kullanıcı kendi rapor bölümünü kaydedebildiği için bu, kimlik doğrulamalı **tek istekle**
   sunucuyu düşürmeye yeterdi. `PdfReportBuilder.TryRenderSvg` artık çizimden önce
   `HasIntrinsicSize` kapısından geçiriyor: boyutsuz SVG çizilmez, `onSvgError` ile günlüğe
   yazılır, rapor notla üretilir. Uygulamanın kendi çizimleri `viewBox` taşıdığı için
   kaybedilen bir şey yok. Doğrulama: boyutsuz SVG 13 ms/200, önceden asan proje 29 ms/200.

### Doğrulama

- `npm test` 1957 yeşil (6 test silindi: kuralı sunucuya taşınan `previewRows`/`previewMode`),
  `npm run build` temiz, `dotnet build` 0 uyarı.
- Canlı yığın: proje raporu 200 + iki ardışık indirmede birebir aynı bayt, eksik alanda 400
  (`MISSING_FIELDS` + `detail.field`), başkasının/olmayan projede 404, tokensiz 401,
  bölümsüz projede 409 (`REPORT_NOT_REPRODUCIBLE` + `detail.reason`), tekil hesap ucunda
  `inputsJson` var / `reportJson` yok.
- Gerçek tarayıcı: proje ekranı 8/8 (önizleme satırları, "Aç" bağlantısı, iki kez indirme —
  52801 bayt, fark 0), araç ekranı 10/10.

## 21. Faz 7 ve atanmamış profil uçları — hesap yüzeyi tamamlandı

**Tarih:** 2026-07-30 · **Kapsam:** §16'dan devreden `PATCH /api/me`, logo yükleme ve
`/api/thickness-records/*`; ayrıca kalınlık kayıtlarının hesaba taşınması (Faz 7).

### Kalınlık kayıtları — iki kaynak, tek sözleşme

Karar: **girişsizken tarayıcıda, girişliyken hesapta; ilk girişte yerel kayıtlar hesaba bir
kez kopyalanır.** Böylece CLAUDE.md'nin "oturum açılmamışken bütün araçlar tam çalışır"
kuralı bozulmuyor ve kullanıcı bugüne kadar biriktirdiklerini kaybetmiyor.

- Yeni uçlar: `GET/POST /api/thickness-records`, `DELETE /api/thickness-records/{id}`.
  `DataJson` sunucu için opak dizedir — şemayı `web/src/lib/thicknessRecords.js` tanımlar ve
  doğrular. Sunucu yalnız ada göre tekliği, 50 kayıt sınırını ve sahipliği bilir.
- Ada göre teklik istemcideki `recordId` ile aynı kuralı izler: Türkçe küçük harfe indirgenmiş
  ad. "Üst Katman" ile "üst katman" aynı kayıt (üzerine yazar), "Ust katman" ayrı kayıt.
  Sınır aşıldığında sessizce en eski silinmez, 409 `RECORD_LIMIT` döner.
- `useSavedThickness` artık kaynağı oturuma göre seçiyor ve **hata sözleşmesini koruyor**:
  sunucu kodları saf katmanın şekline çevriliyor (`RECORD_LIMIT` → `THICKNESS_ERR_LIMIT`,
  gerisi `THICKNESS_ERR_STORAGE` + `cause`), böylece ekranın metin dosyası hiç değişmedi.
  Çağrılar async oldu; `CopperConverter` iki çağrısını `await`'e aldı.
- Taşıma tek sefer koşar ve hangi hesap için yapıldığı tarayıcıda tutulur
  (`alp-pcb.thickness.migrated.v1`, kullanıcı kimliği listesi). Hesapta aynı adlı kayıt varsa
  **hesaptaki korunur** — o, cihazdaki kopyadan daha güncel sayılır. Yerel kopya silinmez.

### Profil ve logo

- `PATCH /api/me`: `displayName` (boşa çekilemez — rapordaki "Hazırlayan" varsayılanı odur,
  en çok 80 karakter), `company` (en çok 120; boş dize GÖNDERİLİRSE alan temizlenir, alan
  atlanırsa değişmez — proje güncellemesindeki kuralın aynısı).
- Logo **veritabanında** durur (`LogoBytes` + `LogoContentType`; `LogoPath` alanı düştü,
  migration `UserLogoBytes`). Diskte ikinci bir dosya yüzeyi açmamak rapor kararıyla
  tutarlı: yedek veritabanı yedeğiyle gelir, kullanıcı silinince kaskatla gider.
- `POST /api/me/logo` multipart alır. Sınır çift katmanlı: gövde limiti 1 MB (zarf), dosya
  limiti 512 KB. **Tür dosyanın kendisinden okunur** (PNG/JPEG sihirli baytları); `Content-Type`
  başlığı ve uzantı istemcinin iddiasıdır ve serbestçe uydurulabilir — sahte bir "image/png"
  400 `UNSUPPORTED_IMAGE` alır, böylece logo alanı rastgele veri deposuna dönüşemez.
- `GET /api/me/logo` yetkilendirme ister; `<img src>` başlık gönderemediği için ekran görseli
  token'lı istekle blob olarak çeker. `MeResponse` logonun kendisini değil `hasLogo` bayrağını
  taşır — her sayfa yüklemesinde yüzlerce KB taşımanın anlamı yok.
- **Rapor logosu artık kullanıcınındır:** `PdfReportBuilder.Build(payload, logoOverride)`.
  Logosu olan kullanıcının belgesi kendi logosuyla, olmayanınki varsayılanla çıkar. Logo
  yükten değil sunucudan gelir — istemcinin gönderdiği görsel doğrulanmamış bayt olurdu.

### Yeni ekran

`/hesabim` (`pages/account/Account.jsx`): profil alanları, logo yükleme/kaldırma ve
kaydedilmiş kalınlıkların listesi/silinmesi. İki dilli, mevcut panel deseniyle; tek yeni
görsel kural `.logo-preview` ve **dört tema dosyasına birden** eklendi. Başlıkta "Hesabım"
bağlantısı var. `useAuth` artık `refreshUser` veriyor: profil değişince başlıktaki ad ve
rapor formundaki varsayılan da tazeleniyor, ekran kendi kopyasını tutmuyor.

### Doğrulama

- `npm test` 1957 yeşil, `npm run build` temiz, `dotnet build` 0 uyarı, `ipc` taraması temiz.
- Canlı yığın: profil 200 / boş ad 400 / uzun firma 400 · logo yükle 200, indir 200
  (`image/png`), sahte PNG 400, 600 KB 400 · kayıt kaydet 200, aynı ad üzerine yazdı (tek
  satır), ASCII farkı ayrı satır, boş ad 400, sil 204, olmayan 404, tokensiz 401, 51. kayıt
  409 · logolu ve logosuz PDF farklı bayt (22 504 ↔ 46 368).
- Gerçek tarayıcı 8/8: girişsiz kayıt tarayıcıda oluştu, giriş sonrası hesaba taşındı, yerel
  depo silinince de duruyor (yani sunucudan geliyor), firma kaydı yenilemede geri geldi,
  logo yüklenip önizlendi, kayıt silindi, konsol hatası yok.

## 22. Faz 3b — yazı tipleri depoda

**Tarih:** 2026-07-30 · **Sonuç:** üç aile (IBM Plex Sans, IBM Plex Mono, Chakra Petch) depoya
alındı; hem site hem PDF onları kullanıyor, dışarıya font isteği gitmiyor.

**Yol boyunca çıkan asıl bulgu:** `web/public/fonts/` boştu ama site fontsuz DEĞİLDİ —
`index.html` onları `fonts.googleapis.com`'dan çekiyordu. Yani her ziyaretçi üçüncü tarafa
istek gönderiyordu ve site o hizmete bağımlıydı. Bağlantılar kaldırıldı; fontlar artık kendi
sunucumuzdan geliyor.

- **Web:** 26 `woff2`, `latin` / `latin-ext` / `greek` alt kümeleri × temaların kullandığı
  ağırlıklar (400/500/600/700). `unicode-range` ile tarayıcı yalnız gerekeni indirir.
  `latin-ext` şart — Türkçe'nin ğ, ı, ş harfleri orada; `greek` Ω ve Δ için.
- **PDF:** 5 `ttf`. `api/Dockerfile` bunları `web/public/fonts`ten `/app/fonts`e kopyalar
  (`Reports__FontsPath` zaten oraya bakıyordu) — tek kaynak, ekran ile belge aynı aile.
  *(Kaynak dizin aynı gün `assets/report-fonts/` oldu — bkz. §23.)*
  IBM Plex Sans yalnız değişken (variable) `ttf` olarak yayınlandığı için o biçimde duruyor.
- `src/fonts.css` üretilmiş bir dosyadır ve `main.jsx`'te temadan ÖNCE yüklenir; yazı tipleri
  temaya bağlı değildir, dört tema da aynı üç aileyi kullanır.
- Lisans: SIL Open Font License 1.1, metinler `public/fonts/OFL-*.txt`.
- **Bilinen sınır:** IBM Plex Mono'nun `greek` alt kümesi yayınlanmıyor; mono metindeki Ω
  sistem yazı tipinden çizilir. Site fontları Google'dan çekerken de durum aynıydı.
- Depoya giren ikili: 1,4 MB.

**Doğrulama:** api günlüğündeki "rapor yazı tipi bulunamadı" uyarısı kalktı, üretilen PDF'te
`IBMPlexMono`, `IBMPlexSans` ve `ChakraPetch` adları gömülü (DejaVu düşüşü yok). Gerçek
tarayıcı 6/6: dosyalar siteden indi, Türkçe harfler ve sayı tablosu doğru aileden çiziliyor,
başlık Chakra Petch, **dış kaynağa tek istek yok**, site `ttf` indirmiyor.

## 23. Yazı tipi üreteci, `ttf` yerleşimi ve listenin ilk boyaması

**Tarih:** 2026-07-30 (akşam) · **Sonuç:** §22'nin bıraktığı iki açık iş kapandı, üçüncüsü
ölçülüp düzeltildi. Üç ayrı commit: `94353cd`, `1b507f2`, `550d180`.

### 23.1 `src/fonts.css` artık üretiliyor

Dosya §22'de de üretilmişti ama üreteci depoya girmemişti: yeni bir ağırlık ya da alt küme
yirmi satır elle kopyalamak ve her bloğun `unicode-range` satırının hâlâ doğru olduğuna
güvenmek demekti. Tek kaynak `web/scripts/build-fonts.mjs` içindeki `FAMILIES` tablosu;
dosyalar da CSS de oradan türetiliyor.

- `npm run fonts` CSS'i yazar · `--fetch` fontları da indirir · `--check` üretilmiş dosyanın
  güncel olup olmadığını çıkış koduyla söyler · `--coverage` sitedeki karakterlerin alt
  kümelerde olup olmadığını sayar.
- Kaynaklar **sabit**: `woff2` dosyaları ve `unicode-range` değerleri `@fontsource 5.3.0`,
  PDF'e gömülen `ttf`ler ile lisans metinleri `google/fonts` deposunun
  `7ff85c87f93ea6cca5f41c69f2e4edcb90240f26` commit'i. `--fetch`, §22'de elle konmuş 33
  dosyanın hepsini **bayt bayt aynı** indirdi — yani üreteç var olan durumu birebir üretiyor,
  yeni bir font sürümü getirmiyor.
- CSS yazılmadan önce çağrılacak her dosya diskte aranır. Eksik dosyayı çağıran bir
  `@font-face` tarayıcıyı sentetik kalınlaştırmaya düşürür; elle bakımın açık kapısı buydu.
- `--fetch` alt küme adlarını ve aralıkları paketin kendi `metadata.json` / `unicode.json`
  verisiyle karşılaştırır ve ayrışırsa durur. IBM Plex Mono'nun `greek` alt kümesinin
  yayınlanmadığı böylece folklor değil, denetlenen bir olgu.

**İki aralık değişti**, ikisi de yukarı akışın bugünkü değeri yönünde: `latin` artık `U+2074`
iddia etmiyor (alt küme dosyasında o glif yok — eski aralık olmayan bir kapsamı duyuruyordu)
ve `greek` `U+03A3-03E1` + `U+03F0-03FF` yerine `U+03A3-03FF`.

**Ölçülen sınır:** sitede kullanılan 38 karakter üç alt kümenin de dışında — `→`, `≈`, `≤`,
`≥`, `√`, `✓`, `□`, alt ve üst simgeler. Bunlar sistem yazı tipinden çizilir ve fontlar
Google'dan gelirken de öyleydi. Aralığı genişletmek çözmez: glifler alt küme dosyalarında yok,
kendi alt kümemizi kesmek gerekir. PDF tam `ttf` kullandığı için etkilenmez. `--coverage` bu
listeyi sayar. *(26'sı §24'te kesildi; 12'si fontlarda hiç yok, kayıt olarak duruyor.)*

### 23.2 `ttf`ler `public/` dışına alındı

Beş tam kapsamlı `ttf`nin tek tüketicisi QuestPDF. Tarayıcı onları hiç istemiyor (`fonts.css`
yalnız `woff2` çağırıyor) ama `web/public/` altında durdukları için Vite `dist/`e, oradan da
web imajına kopyalıyordu: hiç kimsenin indirmediği 970 KB. Yeni yerleri
`assets/report-fonts/`.

- `api/Dockerfile` `assets/report-fonts/*.ttf`yi `/app/fonts` altına alır —
  `Reports__FontsPath` zaten oraya bakıyor, bağ bozulmadı. Lisans metni de imaja girer:
  yeniden dağıtılan bayt lisansıyla birlikte taşınır.
- `Program.cs` `Reports:FontsPath` verilmediğinde `assets/report-fonts`e düşer (yerel
  `dotnet run` durumu).
- Lisans metni her iki font dizininde durur, çünkü iki küme artık farklı imajlara giriyor.
- **CRLF tuzağı:** yukarı akıştaki `OFL.txt` CRLF taşıyor, depo ise LF tutuyor
  (`core.autocrlf=input`). Üreteç metni LF'e çevirmeden yazsaydı `--fetch` her koşuda dosyayı
  "değişti" diye bildirir ve "yalnız değişeni söyler" çıktısı güvenilmez olurdu. Çevriliyor;
  iki ardışık `--fetch` 35 dosyanın hepsini "aynı" diyor.
- `dist/fonts` 1,4 MB → **424 KB**, içinde `ttf` yok.

### 23.3 Kalınlık listesinin ilk boyaması — ölçüldü ve düzeltildi

İnceleme notundaki "ölçülmedi, kozmetik" madde **gerçek çıktı**. Tarayıcıda ölçüm: yerel
kaydı olan girişli kullanıcıda liste önce yerel kaydı basıyor, **46 ms** sonra hesabın
kaydıyla değişiyor. O aralık kullanıcıya hesabının olmayan bir listesini gösteriyor ve
gecikmeyle büyüyor (aradaki iş: `refresh` + `/api/me` + kayıt listesi).

Hook oturumun varlığını ilk boyamada **soramıyor**: erişim token'ı yalnız bellekte, yenileme
çerezi HttpOnly, `useAuth` bir tur ağ gidip gelene kadar `isLoading`. Çözüm, hook'un zaten
sahip olduğu depoda bir ipucu: `alp-pcb.thickness.serverbacked.v1`.

- Oturum bir kez görüldüğünde bayrak yazılır; sonraki açılışlarda liste **boş** ve `loading`
  açık başlar, basılan tek içerik hesabın listesi olur.
- Hiç oturum açılmamış tarayıcıda bayrak yoktur ve yerel liste eskisi gibi anında görünür —
  girişsiz kullanım (her aracın varsayılanı) yavaşlamaz.
- Oturum yok diye çözülürse bayrak silinir. Bayat bayrağın bedeli tek yüklemede bir
  "Kayıtlar yükleniyor…" notu, sonra kendini düzeltir.
- Efekt artık oturum durumu belirsizken beklemiyor sayılmıyor: "henüz bilinmiyor" ile
  "oturum yok" ayrı ele alınıyor.
- `CopperConverter` o notu iki dilli basıyor; `Account` zaten basıyordu.

**Doğrulama (üç madde birlikte):** `npm test` 1957 yeşil, `npm run build` temiz,
`dotnet build` 0 uyarı, `ipc` taraması temiz. Docker yığını yeniden kuruldu; api
konteynerinde `/app/fonts` beş `ttf` + iki lisans metni taşıyor, günlükte yazı tipi uyarısı
yok, canlı yığından alınan PDF üç aileyi gömüyor (DejaVu 0). Gerçek tarayıcı: fontlar 9/9
(26 `@font-face`, Türkçe harfler `latin-ext`ten, Ω/Δ `greek`ten, dış kaynağa istek yok, site
`ttf` indirmiyor, nginx'te 404 yok), ilk boyama 10/10 (girişli: yerel liste hiç görünmüyor ·
girişsiz: 30 ms'de yerel liste, yükleniyor notu yok, bayrak yazılmıyor · bayat bayrak: 385 ms
not, sonra yerel liste ve bayrak silindi), §21'in hesap akışı 8/8 (ilk giriş taşıması dahil).

**Açık kalan:** backend testleri — kullanıcı kararı bekliyor, bu turda başlanmadı. Faz 8
sunucu adımı hâlâ bloke (sunucu, alan adı, SMTP yok).

## 24. Sembol alt kümesi — kendi kestiğimiz dördüncü alt küme

**Tarih:** 2026-07-30 (gece) · **Sonuç:** §23.1'in ölçtüğü 38 karakterin **26'sı** artık
kendi fontumuzdan çiziliyor. Commit `0505fbc`.

Google'ın yayınladığı üç alt küme (`latin`, `latin-ext`, `greek`) bu karakterleri taşımıyor
ve glifler alt küme dosyalarında da yok — yalnız ailenin tam `ttf`sinde var. Yani `unicode-range`
genişletmek işe yaramazdı: tarayıcı dosyayı indirir, glifi bulamaz, yine sistem yüzüne düşerdi.
Alt küme bu yüzden tam `ttf`den **kesiliyor**.

- `npm run fonts -- --symbols`: kaynak `ttf`ler geçici dizine iner, `web/scripts/subset-symbols.py`
  (fontTools) keser, yalnız çıkan `woff2` depoda kalır. Kaynak `ttf`ler depoya girmez —
  `assets/report-fonts/` zaten PDF için 970 KB taşıyor, ikinci kopyanın anlamı yok.
- IBM Plex Sans yukarı akışta yalnız değişken font: kesme sırasında istenen ağırlığa
  sabitleniyor (`wght`, `wdth=100`), çıktı statik.
- 11 dosya, ~37 KB. `dist/fonts` 424 KB → 484 KB. `unicode-range` gating sayesinde tipik bir
  araç ekranı bunlardan üç-dördünü indiriyor.
- **Aralık, dosyanın içindekidir ve aile başına ayrıdır.** Chakra Petch'in charset'i dar:
  `✓`, `↔`, `─` orada yok, IBM Plex'te var. Kayıt `web/scripts/font-symbols.json`de (üretilmiş
  dosya) ve CSS oradan yazılıyor — bir yüz, çizemediği kod noktası için asla ilan edilmiyor.
  Commit 1'de `latin`ten `U+2074`ü düşürmenin gerekçesiyle aynı gerekçe.
- **Üretim tekrarlanabilir:** `head.modified` damgası `head.created`e sabitlendi. Sabitlenmeden
  her koşu farklı bayt üretiyordu ve `--symbols` gerçek değişikliği taze zaman damgasından
  ayırt edemiyordu (ilk denemede 11 dosya boş yere "değişti" dedi).
- `--coverage` artık iki şeyi söylüyor: aile başına eksikler ve hiçbir ailede olmayanlar.
  Üretilen `fonts.css` taramadan çıkarıldı — başlığındaki eksik karakter listesi taramanın
  kendi çıktısıydı, sayılırsa her sembol sonsuza dek listede kalıyordu.

**Araç gereksinimi:** `--symbols` için makinede `fontTools` + `brotli` gerekir
(`python3 -m pip install --user fonttools brotli`). Depo bağımlılığı DEĞİL: `package.json`a
hiçbir şey eklenmedi, çıkan `woff2` commit'lendiği için font kümesini değiştirmeyen kimse bu
araçlara ihtiyaç duymaz.

**Kalan sınır (kullanıcı kararıyla kayıt olarak duruyor):** 12 karakter üç ailenin tam
`ttf`sinde de yok — `⁻ ₐ ₙ ∈ ∝ ∠ ∥ ≪ ⌈ ⌉ □ ✗`. Kesilecek glif olmadığı için sistem yüzünden
çizilirler. En sık geçenler `⁻` (20 dosya, `10⁻⁶` gösterimi), `□` (9 dosya, Ω/□) ve `∠`
(4 dosya). Kaynak metinde değiştirmek (örn. `Formula`nın `^` sözdizimi) düşünüldü ve
**bilinçle yapılmadı**: ~25 dosyada iki dilli metin değişikliği demek ve ekran görüntüsünde
mevcut hâli kabul edilebilir duruyor.

**Doğrulama:** `npm test` 1957 yeşil, `npm run build` temiz, `ipc` taraması temiz, iki ardışık
`--symbols` bayt bayt aynı, `--check` geçiyor, web imajı yeniden kuruldu. Gerçek tarayıcı 14/14.

**Yöntem notu — `document.fonts.check()` bu iş için yanlış araç.** Yüklenme durumunu söyler,
glif kapsamını söylemez: hiçbir yüzün kapsamadığı karakterde `true` döner (sistem yüzü daima
"yüklü" sayılır), indirilmemiş bir yüzde `false` döner. İlk doğrulama denemesi tam bu yüzden
dört yerde yanlış sonuç verdi. Doğru araç `document.fonts.load(font, text)`: eşleşen FontFace
listesini döndürür, boş dizi "bu karakteri hiçbir yüzümüz kapsamıyor" demektir. Bağımsız ikinci
kanıt olarak beş `→` bizim ailemizle 262 px, sistem yüzüyle 193 px genişlikte çizildi; panel
ekran görüntüsünde kayıp glif kutusu yok.

## 25. Sunucu testleri — dar kapsam

**Tarih:** 2026-07-30 (gece) · **Sonuç:** `api/` tarafındaki sıfır test 70 oldu. Commit'ler:
`ccbb18e` (test projesi), `de1ef2c` (testlerin bulduğu kapı hatası).

Kapsam kurallara göre seçildi — yalnız elle doğrulanmış ve elle doğrulanması pahalı olanlar:

| Ne | Kaç test |
|---|---|
| `ReportPreview` süzmesi (vurgulanan satır başa, iki satır sınırı, 80 karakterde kırpma, SVG'ye dokunmama) | 11 |
| Boyutsuz SVG kapısı | 9 + 4 (§25.2) |
| Logo tür tespiti (sihirli baytlar) | 9 |
| Kalınlık kayıtları: ad tekliği, 50 sınırı, sahiplik, alan doğrulaması | 25 |
| Proje ve hesap sahipliği (404 şekli, veri değişmedi kontrolü) | 12 |

Bunların altısı `savedCalculation.test.js`'ten silinen testlerin karşılığı: kural sunucuya
taşınmıştı, testi taşınmamıştı (§19'un açık bıraktığı iş).

### 25.1 Şekil kararları

- **Uçlar HTTP üzerinden değil, işleyicileri doğrudan çağırarak sınanıyor.** Korunmak istenen
  şey kuralın kendisi; yönlendirme, kimlik doğrulama ve hız sınırı her turda gerçek tarayıcıyla
  görülüyor. Test edilen 11 üye `private` → `internal` oldu ve `InternalsVisibleTo` eklendi;
  dışa açık yüzey yine yalnız rotalar. `WebApplicationFactory` yolu daha çok şey kapsardı ama
  JWT anahtarı, Postgres bağlantısı ve migration kapatması gerektiriyordu — kural başına düşen
  kurulum maliyeti buna değmiyor.
- **Veritabanı bellek içi SQLite, şema modelden kuruluyor** (`EnsureCreated`), yani
  `(UserId, NameKey)` benzersiz dizini gerçekten var. `InMemory` sağlayıcısı dizin ZORLAMAZ;
  ad tekliğini onunla sınamak, kuralı sağlayan şeyi atlamak olurdu. Veritabanı adlı ve
  paylaşımlı önbellekli, her bağlam kendi bağlantısını açıyor — yarış senaryosu ancak böyle
  kurulabiliyor. CI'da veritabanı servisi gerekmiyor.
- **Yarış dalı deterministik tetikleniyor:** bir `SaveChangesInterceptor` çakışan satırı ucun
  kendi kaydetmesinden hemen önce yazıyor. Satırı önceden koymak ucun kendi sorgusunda
  görünürdü ve sınanan dal hiç çalışmazdı — ilk deneme tam bu yüzden yanlıştı.
- **SVG kapısı özel yükleme (`private`) yordamına yansımayla değil, gerçek belge üretilerek
  sınanıyor:** `onSvgError` geri çağrısı dinleniyor. Korunan arıza canlıydı (%248 CPU, 7 GB).
- CI'ya `dotnet test` adımı eklendi; derlemeden sonra koşuyor.

**Yol boyunca imaj derlemesi kırıldı ve düzeltildi:** `api/Dockerfile` `dotnet restore
Alp.Api.sln` çağırıyordu ve çözüm artık test projesini de sayıyor — dosyası imaj bağlamına
kopyalanmadığı için restore patlıyordu. Artık uygulama projesi geri yükleniyor (referansları
geçişli geliyor), test projesi `.dockerignore`'da: xunit ve SQLite çalışma imajına girmiyor.

### 25.2 Testlerin bulduğu hata — kapıda harf duyarlılığı

SVG bir XML lehçesidir, öznitelik adları HARF DUYARLIDIR: `VIEWBOX` diye bir öznitelik yok.
`HasIntrinsicSize` ise `viewBox` / `width` / `height` aramasını harf duyarsız yapıyordu. Sonuç:
istemciden gelen `<svg VIEWBOX="0 0 100 40">` kapıdan geçiyor, çizim katmanı boyutsuz eleman
görüyor ve BÜTÜN belge düzen hatasına düşüyordu — kullanıcı 422 `REPORT_TOO_LARGE` alıyordu,
yani sebebi yanlış söyleyen bir hata, ve tek çizim yerine bütün raporu kaybediyordu.
`schematicSvg` istemciden geldiği için o dize uydurulabilir.

Öznitelik aramaları `Ordinal` oldu. Etiket araması harf duyarsız kaldı — işi etiketi BULMAK,
geçerliliğine karar vermek değil. Gerçek tarayıcı yakalaması `viewBox` yazdığı için mutlu yol
değişmedi.

Kapının eklendiği askıda kalma burada olmuyordu: aynı turda eklenen düzen koruması boyutsuz
elemanı yakalıyor. İki koruma üst üste biniyordu ve dıştaki yanlış hata kodunu veriyordu.

**Doğrulama:** `dotnet build` 0 uyarı, 70/70 test, `npm test` 1957 yeşil, `ipc` taraması temiz,
api imajı yeniden kuruldu ve sağlıklı. Canlı yığında dört SVG durumu ölçüldü: geçerli `viewBox`
çizimi basıyor (77 971 B); `VIEWBOX` ve gerçekten boyutsuz SVG artık ikisi de 200 dönüp çizimi
atlıyor (81 662 B) — `VIEWBOX` eskiden 422 veriyordu — ve ikisi de api günlüğüne "boyut bilgisi
taşımıyor" satırını bırakıyor. Gerçek tarayıcıda rapor turu 10/10.

**Kapsanmayanlar (bilinçli):** kimlik doğrulama akışı (kayıt, e-posta doğrulaması, parola
sıfırlama), hız sınırı kovaları, `XlsxReportBuilder`, rota bağlama ve nginx yolları. Bunlar
gerçek tarayıcı turunda ve canlı yığın denemelerinde görülüyor; teste taşınırlarsa ayrı bir
karar olur.

## 26. Firma logosu kaldırıldı, e-posta kalıcı

**Tarih:** 2026-07-30 (gece) · **Sonuç:** hesap ekranındaki logo yükleme özelliği tümden
kalktı; rapor başlığında daima uygulamanın kendi logosu duruyor ve firma yalnızca künyede
metin olarak görünüyor. Kullanıcı kararı: "company logoya ihtiyaç yok".

### 26.1 Kaldırılanlar

- **Ekran:** `/hesabim`'daki "Firma logosu" paneli (önizleme, dosya seçici, yükle/kaldır
  düğmeleri), `pages/account/text.js`'teki logo metinleri ve dört tema dosyasındaki
  `.logo-preview` kuralı.
- **Uçlar:** `GET/POST/DELETE /api/me/logo` üçü de düştü. Sihirli baytlardan tür tespiti
  (`DetectImageType`), 512 KB'lık dosya sınırı ve 1 MB'lık gövde sınırı onlarla gitti.
- **Rapor bağı:** `PdfReportBuilder.Build` artık `logoOverride` almıyor; `ReportEndpoints`
  kullanıcının logosunu çekmiyor (`UserLogo` düştü). Üç çağrı yeri de sadeleşti.
- **Sözleşme:** `MeResponse.HasLogo` kalktı. İstemcideki `api.postForm` ve `api.getBlob` de
  gitti — tek kullanıcıları logo yükleme ve önizlemeydi.
- **Test:** `LogoImageTypeTests` (9 test) silindi, süit 70 → 61.

**Sütunlar duruyor:** `ApplicationUser.LogoBytes` / `LogoContentType` şemada kaldı. Düşürmek
geri alınamaz bir migration; okuyucusu olmayan iki sütunun bedeli yok ve özellik geri
istenirse veri kaybı olmadan dönülür. Kalıcı silmeye karar verilirse tek migration yeter.
Yükleme yolu kapandığı için yeni bayt da yazılamıyor.

Yan kazanç: kullanıcı başına yarım megabaytlık, ürün karşılığı olmayan bir yazma yüzeyi
kapandı.

### 26.2 E-posta değiştirilemez — zaten öyleydi

Kullanıcı isteği "kayıttan sonra e-posta değiştirilemesin" idi; kod bunu baştan sağlıyordu ve
bu turda yalnız **kaydı** netleşti:

- `UpdateMeRequest` yalnız `DisplayName` ve `Company` taşıyor — e-posta diye bir alan yok, yani
  uç doğrudan çağrılsa bile değişmez. Canlı yığında doğrulandı: gövdeye `email` eklenmiş bir
  `PATCH /api/me` 200 dönüyor ve adres aynı kalıyor.
- Ekranda alan `readOnly` ve altında "E-posta adresi değiştirilemez." yazıyor. Alan yine
  gösteriliyor: kullanıcı hangi hesapta olduğunu görmeli.
- Gerekçe `Contracts.cs`'e yazıldı: kimlik doğrulaması ve parola sıfırlama o adrese bağlı.

Ad ve firma düzenlenebilir kaldı (ad boşa çekilemez — raporun "Hazırlayan" varsayılanı; firma
boş bırakılınca alan silinir).

**Doğrulama:** `dotnet build` 0 uyarı, 61/61 sunucu testi, `npm test` 1957 yeşil,
`npm run build` temiz, `ipc` taraması temiz, yığın yeniden kuruldu. Canlı: üç logo ucu da 404,
`GET /api/me` artık `hasLogo` göndermiyor, e-posta değiştirme denemesi yok sayılıyor. Gerçek
tarayıcıda `/hesabim` 10/10 — logo paneli yok, sayfada "logo" kelimesi geçmiyor, dosya girişi
yok, e-posta salt okunur, ad ve firma düzenlenebilir, firma kaydedilip yenilemede geri geldi,
kalınlık paneli yerinde, konsol hatası yok. İki rapor yolu da çalışıyor: tek seferlik PDF
239 KB, proje raporu 228 KB, ikisinde de logo 1372×314 (§24'teki tam çözünürlük).
