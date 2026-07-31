# Brif 01 — Hesap önizlemesini yazma anında kolona taşı

**Model/effort:** Sonnet 5, high. Spec aşağıda hazır; iş mekanik ama
doğruluk hassas — testler kapıdır.

## Sorun

`GetProject` (api/Alp.Api/Projects/ProjectEndpoints.cs, ~95-130. satır)
projedeki HER hesabın tam `ReportJson`'ını (satır içi SVG dahil, ~16 KB/
satır, 2 MB'a dek) veritabanından okuyor — sırf ≤2 önizleme satırı ve
mod etiketi türetmek için (`ReportPreview.From(reportJson, lang)`).
Yanıt zaten küçük; pahalı olan DB okuması ve sunucudaki ayrıştırma.
60 hesaplı projede her açılış ~1 MB gereksiz okuma.

## Çözüm

Önizleme, hesap YAZILIRKEN türetilip kolona konur; okuma yolu yalnızca
kolonu okur.

1. **Şema:** `Calculation`'a `PreviewJson` (string?, HasMaxLength yok —
   küçük JSON) kolonu. İçerik: `{"tr": {"rows": [...], "mode": "..."},
   "en": {...}}` — dil haritası, StoredSection'daki iki dilli kayıt
   deseninin küçüğü. `HasReport` ayrı kolona GEREKMEZ (ReportJson null
   kontrolü projection'da kalabilir). Migration adı: `CalculationPreview`.
2. **Yazma:** `CreateCalculation` ve `UpdateCalculation`'da (yalnız
   `ReportJson` sağlanmışsa) her iki dil için `ReportPreview.From` koş,
   sonucu `PreviewJson`'a serialize et. `ReportPreview` Alp.Api içinde —
   erişim sorunu yok.
3. **Okuma:** `GetProject` projection'ı `ReportJson` yerine
   `PreviewJson` + `ReportJson != null` (hasReport skaleri) seçer.
   `PreviewJson` null ise (eski kayıt) ESKİ yol devrede kalır: o satır
   için `ReportJson` ikinci bir sorguyla değil — pragmatik geri düşüş:
   projection her iki kolonu da seçmek yerine, `PreviewJson ?? eski yol`
   kararını TEK sorguda ver: `PreviewJson == null ? c.ReportJson : null`
   şeklinde koşullu seç; bellek maliyeti yalnız göç etmemiş satırlar
   için ödenir. Backfill migration'ı YAZILMAZ (SQL içinde JSON türetmek
   riskli); kayıtlar güncellendikçe kendiliğinden göçer.
4. **Dil:** `GetProject`'in `lang` parametresi artık PreviewJson dil
   haritasından seçer; istenen dil yoksa eldekine düş (StoredSection
   kuralıyla aynı gerekçe: yanlış dil, boş listeden iyi).

## Dokunulacak dosyalar

- api/Alp.Domain/Calculation.cs (kolon)
- api/Alp.Data/AppDbContext.cs (gerekirse config) + yeni migration
  (`dotnet ef migrations add CalculationPreview --project Alp.Data
  --startup-project Alp.Api`)
- api/Alp.Api/Projects/ProjectEndpoints.cs (yazma + okuma)
- api/Alp.Api/Projects/ReportPreview.cs (gerekirse serialize yardımcısı)
- api/Alp.Api.Tests/ — YENİ testler: yazma anında iki dilli önizleme
  üretimi; PreviewJson'lu satırın ReportJson okumadan listelenmesi
  (projection'da ReportJson null seçildiğini doğrula); eski kayıt geri
  düşüşü; dil seçimi/düşüşü.

## Kurallar (CLAUDE.md özetle)

- Kod yorumları Türkçe, gerekçeli. Hata yükünde cümle taşınmaz.
- Ownership deseni değişmez (`LoadOwnedProject`). 404 şekli aynı kalır.
- SQLite testlerinde `DateTimeOffset.UtcNow` sorgu İÇİNDE kullanılamaz
  (ExecuteUpdate) — önce değişkene al. `dotnet ef` 10.0.7 kurulu.

## Doğrulama ve bitiş

```bash
cd api && dotnet test Alp.Api.sln          # 89 + yeniler, hepsi yeşil
cd ../web && npm test && npm run build      # 1932, değişmemeli
cd ../deploy && docker compose build api && docker compose up -d api
curl -s http://localhost:8080/api/health    # ok
```
Commit (İngilizce, conventional): `feat: persist calculation previews
at write time`. Push. `docs/brifler/README.md` tablosunda bu satırı
"✓ bitti (tarih)" olarak işaretle.
