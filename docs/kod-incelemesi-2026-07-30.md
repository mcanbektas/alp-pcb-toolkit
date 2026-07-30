# Kod incelemesi — 2026-07-30 turunun işi

**Tarih:** 2026-07-30 · **Kapsam:** `f65cd1c`'ten sonra giren 11 commit — rapor saklama ve
yeniden üretim, proje detayı projeksiyonu, hesap yüzeyi (profil/logo/kalınlık kayıtları),
boyutsuz SVG kapısı, yazı tipleri.
**Yöntem:** 2026-07-29 incelemesiyle aynı — her iddia ölçüldü ya da çalışan yığına karşı
denendi. Ölçüm yapılmayan yerde "ölçülmedi" yazar. Ortam: yerel Docker yığını
(nginx + api + postgres 16), `test@alp.local`.

---

## Özet

Üç bulgu çıktı, üçü de bu turda kapatıldı. İkisi bu turun kendi kodundan, biri (SVG)
daha eski bir yolda duruyordu ve yeni testler ortaya çıkardı.

| Öncelik | Bulgu | Kanıt | Durum |
|---|---|---|---|
| P1 | Boyutsuz SVG dizgiyi asıyor: istek yanıtsız, süreç %248 CPU / 7 GB | canlı sunucuda tekrar üretildi | **Kapatıldı** — `HasIntrinsicSize` kapısı |
| P1 | Kalınlık kaydında ad tekliği yarış altında bozuluyor | aynı adla 5 eşzamanlı istek → **5 satır** | **Kapatıldı** — `(UserId, NameKey)` benzersiz dizini |
| P2 | Yeni yazma uçlarında hız sınırı yok (profil, logo, kayıtlar) | kod; logo gövdesi 512 KB | **Kapatıldı** — `writes` politikası, 120/5 dk |
| P3 | `SaveRecord` tekliği ararken bütün zarfları belleğe çekiyordu | kod | **Kapatıldı** — projeksiyon + `CountAsync` |

Ölçülen ve sorun ÇIKMAYAN yerler aşağıda ayrıca yazılı: bir incelemenin işi yalnız kusur
listelemek değil, nerenin sağlam olduğunu da kayda geçirmek.

---

## P1 — Kalınlık kaydında ad tekliği yarış altında bozuluyordu

`SaveRecord` "önce ara, yoksa ekle" yapıyordu ve teklik yalnızca uygulama kodundaydı.
Eşzamanlı istekler aynı anda "yok" cevabını alıp hepsi ekliyordu:

```
aynı adla 5 eşzamanlı POST  ->  5 satır (beklenen 1)
```

Gerçekçi tetikleyici uzak değil: kaydet düğmesine çift tıklama, ya da ilk girişte yerel
kayıtların taşınmasıyla ekrandan kaydetmenin çakışması. Aynı açık 50 kayıt sınırını da
delerdi — sayım da yarışın içindeydi.

**Düzeltme.** Teklik veritabanına indi:

- `ThicknessRecord.NameKey` — adın kimlik hâli (boşluklar sadeleştirilmiş, Türkçe kurallarıyla
  küçük harf), `(UserId, NameKey)` üzerinde **benzersiz dizin**.
- `SaveRecord` çakışmayı (`DbUpdateException`) yakalayıp o satırın üzerine yazıyor: "aynı ad =
  aynı kayıt" kuralının kendisi bu, hata değil.
- Migration var olan satırların anahtarını dolduruyor ve dizini kurmadan önce kopyaları
  temizliyor (aynı adda en yenisi kalır).

**Doğrulama (aynı testler, düzeltmeden sonra):**

```
8 eşzamanlı aynı ad     -> 1 satır, sekiz yanıt da 200
"ÜST KATMAN" + "üst katman" -> 1 satır, son değer kazandı
50 sınırında 6 eşzamanlı yeni ad -> 50'de kaldı, altısı da 409 RECORD_LIMIT
migration                -> testte açılan 5 kopyayı 1'e indirdi
```

---

## P1 — Boyutsuz SVG dizgiyi asıyordu

Ayrıntı ve ölçüm `uyelik-ve-rapor-plani.md` §20'de. Özet: `viewBox` ve `width`/`height`
taşımayan bir SVG çizime verildiğinde QuestPDF/Skia çözüm bulamıyor, hata da fırlatmıyor;
istek yanıtsız kalırken süreç bir çekirdeği dolduruyor ve belleği gigabaytlara çıkarıyordu.
Kullanıcı kendi rapor bölümünü kaydedebildiği için tek istekle sunucuyu düşürmeye yeterdi.

Kapatıldı: `TryRenderSvg` çizimden önce `HasIntrinsicSize` kapısından geçiriyor. Boyutsuz
SVG çizilmiyor, `onSvgError` ile günlüğe yazılıyor, rapor notla üretiliyor.

```
boyutsuz SVG        -> 200, 13 ms   (eskiden: yanıt yok, 7 GB)
viewBox / width+height -> normal çiziliyor
önceden asan proje  -> 200, 29 ms
```

---

## P2 — Yeni yazma uçlarında hız sınırı yoktu

`PATCH /api/me`, logo yükleme/kaldırma ve kalınlık kaydı uçları hiçbir politikaya bağlı
değildi. Rapor kadar pahalı değiller ama hepsi veritabanına yazıyor ve logo yüklemesi yarım
megabaytlık gövde taşıyor.

**Düzeltme.** `writes` politikası (kullanıcı başına 5 dakikada 120) ve bu üç yüzeye bağlandı.
Kullanıcı bazlı bölümleme, `reports` ile aynı gerekçe: bir hesabın gürültüsü diğerlerini
etkilemesin.

**Doğrulama:** 130 ardışık `PATCH /api/me` → ilk 120'si 200, kalan 10'u 429; aynı anda
`GET /api/me` ve `GET /api/reports` **200** — okuma yolu etkilenmiyor.

---

## P3 — `SaveRecord` gereksiz veri çekiyordu

Teklik araması kullanıcının bütün kayıtlarını `DataJson` zarflarıyla belleğe alıyordu (50
kayıt × zarf). Tek soru "bu ad duruyor mu" idi. `FirstOrDefaultAsync(NameKey)` + sınır için
ayrı `CountAsync`'e indirildi.

---

## Ölçülen ve sağlam çıkanlar

- **Proje detayı projeksiyonu.** 60 hesaplı projede yanıt 26,5 KB / 22–27 ms (önce ~906 KB).
  Yanıtta `<svg` ve `reportJson` geçmiyor; `inputsJson`/`resultJson` de listede yok.
  Sunucunun rapor bölümlerini okuması sürüyor (önizleme oradan türetiliyor) ama ölçülen
  süre bu ölçekte sorun değil.
- **Rapor yeniden üretimi.** Aynı proje iki kez indirildiğinde **birebir aynı bayt** (57 897 →
  57 897; tarayıcıdan 52 801 → 52 801, fark 0). Kaynağı olmayan raporda 409
  `REPORT_NOT_REPRODUCIBLE` + yapısal `detail.reason`.
- **Kaynak sahipliği.** Yok olan ve başkasına ait kaynak aynı 404'ü veriyor (rapor, kayıt,
  proje). Tokensiz istek 401. Logo yalnız sahibine dönüyor.
- **Logo yükleme.** Tür dosyanın baytlarından okunuyor: "image/png" diye gönderilen metin
  dosyası 400 `UNSUPPORTED_IMAGE`, 600 KB dosya 400 `FILE_TOO_LARGE`, gerçek PNG 200 ve
  `GET /api/me/logo` `image/png` dönüyor. Logolu ve logosuz PDF farklı bayt üretiyor.
- **Önizleme sızıntısı yok.** `ReportPreview` yalnız `results` satırlarını okuyor; yanıtta
  `<svg` ya da `<script` bulunmuyor (uzun etiket 80 karakterde kırpılıyor, vurgulanan satır
  başa alınıyor).
- **Katman yönü.** `Account.jsx` (pages) → hooks/lib; `useSavedThickness` (hooks) → lib + ağ;
  `ReportPreview` uygulama katmanında ve yalnız rapor bölümü şemasını tanıyor, araç bilmiyor.
- **Yazı tipleri.** Site dış kaynağa tek istek atmıyor, PDF'e üç aile de gömülü.
- **Testler.** `npm test` 1957 yeşil, `npm run build` temiz, `dotnet build` 0 uyarı,
  `ipc` taraması temiz.

---

## Açık kalanlar (bu turda düzeltilmedi)

1. **Backend'de otomatik test yok.** `ReportPreview` süzme kuralları, ad tekliği, logo tür
   doğrulaması ve boyutsuz-SVG kapısı yalnız elle/curl ile doğrulandı — hepsi dar kapsamlı bir
   test projesiyle kalıcı korumaya alınabilir. `savedCalculation.test.js`'ten silinen 6 test
   tam olarak bu kuralları koruyordu; kural sunucuya taşındı, testi taşınmadı.
   CLAUDE.md yeni test aracı için onay istediğinden açıldı, yapılmadı.
2. **`src/fonts.css` üretilmiş dosya ama üreteci depoda yok.** Yeni bir ağırlık/alt küme
   gerektiğinde dosya elle genişletilecek. Küçük bir betik olarak eklenebilir.
3. **Depoya 1,4 MB ikili girdi** (fontlar). `ttf` sürümleri `public/` altında olduğu için
   `dist/` ve web imajı da onları taşıyor; tarayıcı indirmiyor (CSS yalnız `woff2` çağırıyor)
   ama imaj gereksiz büyüyor. Ayrı bir dizine alınıp api imajına oradan kopyalanabilir.
4. **`useSavedThickness` ilk boyamada yerel listeyi gösteriyor**, sunucu yanıtı gelince
   değişiyor. Girişli kullanıcıda kısa bir yanıp sönme olabilir; `loading` bayrağı var ama
   liste boş yerine yerel içerikle doluyor. Ölçülmedi, kozmetik.
5. **IBM Plex Mono'nun greek alt kümesi yok** — mono metindeki Ω sistem yazı tipinden çizilir
   (fontlar Google'dan gelirken de öyleydi).

**Sonradan kapananlar (aynı gün akşam, ayrıntı `docs/uyelik-ve-rapor-plani.md` §23):**

- **2 kapandı** — üreteç `web/scripts/build-fonts.mjs`, `npm run fonts`. `--fetch` var olan 33
  dosyayı bayt bayt aynı indiriyor, yani üreteç mevcut durumu birebir üretiyor.
- **3 kapandı** — `ttf`ler `assets/report-fonts/` altına alındı; `dist/fonts` 1,4 MB → 424 KB.
- **4 kapandı** — ölçüldü, gerçekti (yerel liste 46 ms görünüyordu). `useSavedThickness` artık
  oturum görülmüş bir tarayıcıda ilk boyamada yerel listeyi basmıyor; girişsiz yol aynı hızda.
- **5 kısmen kapandı** — §23'te ölçüldü (alt kümelerin dışında 38 karakter), §24'te 26'sı
  kendi kestiğimiz `symbols` alt kümesiyle kapandı. IBM Plex Mono'nun `greek` alt kümesi hâlâ
  yayınlanmıyor (Ω mono'da sistem yüzünden) ve 12 karakter üç ailenin tam `ttf`sinde de yok —
  ikisi de kayıt, iş değil.
- **1 kapandı** — `api/Alp.Api.Tests`, 70 test; kapsam ve şekil kararları §25'te. Testler
  yazılırken SVG kapısında harf duyarlılığı hatası bulundu ve düzeltildi (§25.2): istemciden
  gelen `<svg VIEWBOX=…>` kapıdan geçip bütün raporu 422'ye düşürüyordu.

Böylece bu incelemenin açık listesinde iş kalmadı; 5 kayıt olarak duruyor.
