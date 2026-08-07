# Brif 13 — Yönetim sayfaları geniş düzen (rapor + uygulama planı)

Durum (2026-08-08): **TAMAM, commit `de548c3`.** Kullanıcı gözlemi:
`/yonetim/loglar` tablosu sığmıyor, içerik üst üste/scroll altında. Kullanıcı
kararı: yalnız adminlere görünen sayfalar (`/yonetim`, `/yonetim/gunluk`,
`/yonetim/loglar`) sitenin genel tasarım sözleşmesine uymak zorunda değil —
bütün sayfa genişliği kullanılabilir. Rapor Fable ile çıkarıldı, uygulama
Sonnet 5 · medium ile aynı oturumda (F1+F2 tek commit'te — dosyalar iç içe).
Review (Opus) 5 bulgu buldu: `isAdminPath`in testi yoktu (routes.test.js'e
13 örnek eklendi), CLAUDE.md'deki istisna notu var olmayan `/gunluk`/`/loglar`
yollarını sayıyordu VE tutarlılık kuralının TAMAMINI (yalnız genişlik değil)
admin ailesine açıyormuş gibi okunuyordu, guard testi yalnız seçici VARLIĞINA
bakıyordu (kaynak sırası/gerçek px değeri değil) — hepsi kapatıldı. Canlı
turda (Playwright, gerçek admin) doğrulandı: ≥1900px'te belirgin geniş,
~1440px'te mesaj sarıyor (asıl düzeltme buydu), ~390px mobilde 9cf34fc
regresyonu yok, ayrıntı kartı 720px. npm test 3111/3111, build temiz.

Sunucu BEKLEMEZ — tamamı yerelde yazılır ve `npm run stack` ile doğrulanır.

## 0. Bugün ne var — ölçülmüş durum

Bütün sayfalar tek merkezden sınırlanır: `App.jsx` içindeki `Layout`
(`<main className="container">`). `.container` tema başına tanımlı:
graphite `max-width: 1400px; padding: 0 22px`, diğer üç tema 1360px.
Admin ekranları araç ekranlarının aynı parçalarını kullanır: `.tool-header`,
`.panel` (18px yan dolgu), Günlük/Loglar'da `.audit-layout` (≥720px'te
`190px 1fr` grid, 20px gap), tablolar `.table-scroll` + `.result-table`.

Kritik kural (`themes/*.css`, 4 temada özdeş):

```css
.table-scroll { overflow-x: auto; }
.table-scroll .result-table th,
.table-scroll .result-table td { white-space: nowrap; }
```

Bu `nowrap` 9cf34fc'te mobil için bilinçli eklendi (e-posta hücreleri üst
üste biniyordu) — ama İSTİSNASIZ: log MESAJI da tek satıra zorlanıyor.

Kullanılabilir tablo genişliği (graphite, border-box; Günlük/Loglar):

```
min(viewport, 1400) − 44 (container pad) − 36 (panel pad) − 190 (facet) − 20 (gap)
≥1444px ekranda  →  1110px
1440px ekranda   →  aynı (container zaten viewport'a çarpmış)
```

Buna karşılık tipik bir log satırı: 180 karakterlik mesaj × ~7 px
(0.85rem) ≈ 1260px — TEK HÜCRE mevcut alanın tamamından geniş. Zaman
(~150) + Seviye (~90) + Kaynak (~200) + Ayrıntı (~80) eklenince tablo
~1900-2000px; 1110px pencerede satırın yarısından fazlası scroll altında.

## 1. Teşhis — sorun iki katmanlı, genişlik tek başına ÇÖZMEZ

1. **Genişlik tavanı (ikincil):** 1400/1360px konteyner geniş monitörde
   alanı israf ediyor. Ama ölçüm net: ≤1444px viewport'ta (yaygın laptop)
   tavanı kaldırmak HİÇBİR ŞEY değiştirmez — konteyner zaten ekrana çarpıyor.
2. **`nowrap` (asıl):** Mesaj kolonu sarmadığı sürece 180+ karakterlik satır
   1720px'e de 2560px'e de sığmaz. Yükü taşıyan düzeltme mesaj hücresini
   sarmaya açmak; genişlik bunu destekleyen ikinci kol.

Rapor bu yüzden iki kol öneriyor; yalnız genişlik uygulanırsa kullanıcı
laptopta aynı şikayeti yeniden yapar.

## 2. Mimari karar

**Seçilen:** (a) admin rotalarında `<main>`'e `container-wide` eki
(tavan 1720px), (b) içerik kolonlarına seçimli sarma sınıfı `cell-wrap`,
(c) ayrıntı kartına `wide` varyantı. Görsel dil DEĞİŞMİYOR — panel, tablo,
mark, facet aynı; değişen yalnız genişlik sözleşmesi ve hücre davranışı.

Elenenler (gerekçeyle, geri açılmasın):

| Seçenek | Neden elendi |
|---|---|
| `max-width: none` | 2560px monitörde 2500px satır; okunabilirlik tavansız kalır, 1720 tavanı aynı pratik kazancı verir |
| `calc(50% − 50vw)` full-bleed hack | Layout'a dokunmamak uğruna scrollbar-genişliği taşması ve kırılganlık; genişlik kararı zaten tek merkezde (`Layout`) verilmeli |
| Ayrı admin görsel dili / tema | 4 tema × ikinci katman bakım; istek "sığsın", yeni marka değil |
| Tablo sanallaştırma / yeni kütüphane | Bağımlılık kuralı; tampon tavanı 500 kayıt, sayfalama zaten var — gerek yok |
| Yalnız genişletme (sarmasız) | §1'deki ölçüm: laptopta sıfır etki, uzun mesaj yine taşar |

**Tutarlılık kuralına bilinçli istisna (kayda geçir):** CLAUDE.md'nin
"Ekranlar arası tutarlılık zorunlu" kuralı araç ekranları içindir. Admin
ailesi (üç sekme) kendi içinde birebir tutarlı kalır ama araç ekranlarından
genişlikte ayrışır. Gerekçe: bu sayfalar `indexablePages()` dışı (prerender/
SEO/marka yüzeyi değil — `routes.js:45-53` yorumu), veri-yoğun ve yalnız
Admin rolüne görünür. F1, CLAUDE.md'ye bu istisnayı 2-3 satırla ekler.

## 3. F1 — Genişlik altyapısı (öneri: Sonnet 5 · medium)

- `lib/routes.js` → yeni saf yardımcı:

  ```js
  export function isAdminPath(pathname) {
    for (const p of [STATIC_ROUTES.admin.tr, STATIC_ROUTES.admin.en]) {
      if (pathname === p || pathname.startsWith(p + '/')) return true
    }
    return false
  }
  ```

  Alt rotalar (`/yonetim/gunluk`, `/en/admin/logs`) iki kök önekin altında —
  ayrı listeleme gerekmez. `startsWith(p + '/')` şart: çıplak `startsWith`
  varsayımsal `/yonetimx` yolunu da yakalar. Birim testi: tr/en kökler, alt
  yollar, `/giris` ve `/yonetimx` false.
- `App.jsx` → `Layout`: yalnız `<main>`:
  `className={isAdminPath(pathname) ? 'container container-wide' : 'container'}`.
  Header/footer `.container`'ları DOKUNULMAZ — üst bar ve altbilgi site
  geneliyle aynı hizada kalır, içerik onların altında genişler (`Layout`
  zaten `useLocation` okuyor, yeni bağ yok).
- 4 tema dosyasına birden: `.container-wide { max-width: 1720px; }`
  (tek satır; temaların 1400/1360 farkına DOKUNULMUYOR, bkz. §7 yan bulgu).
- Bekçi testi (desen hazır: `pages/auth/authHeading.guard.test.js` dört
  temayı metin olarak yürüyor): `container-wide`, `cell-wrap`, `dialog-wide`
  selektörleri 4 temanın 4'ünde de var mı. Tema dosyasına elle eklenen kural
  bir temada unutulursa build de test de yakalamıyor — bu bekçi onun için.
- CLAUDE.md istisna notu (§2'nin son maddesi).

Kazanç (graphite): Günlük/Loglar ana sütunu ≥1764px ekranda 1110 → 1430px
(+%29); Kullanıcılar (facet yok) 1320 → 1640px. ≤1444px ekranda değişim yok —
o aralığı F2 taşıyor.

## 4. F2 — İçerik sığdırma (öneri: Sonnet 5 · medium)

- 4 temaya: sarmaya açılan hücre —

  ```css
  .table-scroll .result-table td.cell-wrap {
    white-space: normal;
    overflow-wrap: anywhere;
    min-width: 280px;
  }
  ```

  `min-width` şart: dar ekranda sarılan kolon 50px'e ezilip harf harf
  kırılmasın; onun yerine `.table-scroll` yine yatay kaydırır — 9cf34fc'nin
  mobil düzeltmesi AYNEN korunur, sarma yalnız yer varken devreye girer.
- `pages/admin/logs/index.jsx`: Mesaj hücresi `<td className="cell-wrap">`.
  (Mesaj sondan ikinci kolon — `td:last-child` mono/sağa-yasla kuralına
  değmiyor, çakışma yok.)
- `components/InfoDialog.jsx`: opsiyonel `wide` prop →
  `dialog.confirm-dialog.dialog-wide { max-width: 720px; }` (4 temaya).
  Loglar ayrıntı kartı `wide` alır: tam nitelikli kaynak adı (~60+ karakter),
  mesaj ve istisna satırı 420px'e sıkışmasın. `ConfirmDialog` ve mevcut
  420px kullanımlar DEĞİŞMEZ; `.confirm-dialog-body .result-table` scoped
  override'ı (graphite.css:1023) olduğu gibi çalışmaya devam eder.
- Tarayıcı turunda karar: Günlük'te Yapan/Hedef (uzun e-posta) sıkışıyorsa
  `cell-wrap` oraya da uygulanır; Kullanıcılar tablosu 5 kolon, büyük
  ihtimalle dokunmadan sığar. Turda görülmeden genişletme YAPILMAZ.

## 5. Sıra, doğrulama, commit

```
F1 (genişlik: routes + Layout + CSS + bekçi) ──► F2 (cell-wrap + dialog-wide)
```

- Her faz kendi commit'ini atar; ikisi tek oturumda yapılabilir.
- Doğrulama (ikisi için ortak): `cd web && npm test` yeşil + `npm run build`
  temiz + **ekran gerçekten açılır** (gerçek admin ile): ≥1900px pencerede üç
  sekme (tablo genişlemiş, mesaj sarıyor, scroll yalnız gerektiğinde),
  ~1440px (sarma tek başına yetiyor mu), ~390px mobil (9cf34fc regresyonu:
  e-posta/mesaj hücreleri üst üste binmiyor, `.table-scroll` kayıyor),
  `/en/admin/*` ağacı, Loglar'da otomatik yenile açıkken sarılmış satırların
  zıplamadığı, ayrıntı kartının 720px açıldığı. Yeşil test yetmez — tur şart.
- Commit öncesi tek review turu (brif 12 §6 deseni); bulgular kapatılmadan
  commit atılmaz.

## 6. Bu brifle DEĞİŞMEYEN şeyler

- Araç ekranları, ana sayfa, kategori/auth sayfaları — genişlik sözleşmesi
  aynen 1400/1360. `container-wide` YALNIZ admin rotalarında.
- Prerender/sitemap — admin rotaları zaten `indexablePages()` dışı, yeni iş yok.
- Header/footer hizası — site geneli `.container`'da kalır.
- `.table-scroll`'un mobil `nowrap` varsayılanı — `cell-wrap` opt-in istisna.
- API, iki dillilik, tema değişken sözleşmesi.

## 7. Yan bulgular (bu briften bağımsız, kayda geçirildi)

- **`.panel-wide` ölü sınıf:** `EmcFilterDesigner/index.jsx:383`
  `className="panel panel-wide"` yazıyor ama 4 temanın HİÇBİRİNDE kural yok —
  ya unutulmuş CSS ya silinecek artık. Ayrı küçük iş.
- **`.audit-main` kuralsız:** yalnız semantik tutamaç, 4 temada da CSS yok.
  Zararsız; F1/F2 dokunmaz.
- **Temalar arası konteyner farkı:** graphite 1400px, diğer üçü 1360px
  (`.panel`/`.mini-head` dolgu-punto farklarıyla birlikte). Önceden var,
  bilinçli DOKUNULMUYOR — eşitlemek ayrı karar ister.
