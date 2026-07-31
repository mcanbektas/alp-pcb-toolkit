# Brif 05 — Playwright e2e (yalnız anonim akışlar)

**Model/effort:** Sonnet 5, medium.

## Kapsam ve BİLİNÇLİ sınır

1932 birim testi var, sıfır tarayıcı testi. Buraya YALNIZ anonim akışlar
girer — auth'lu akışlar (kayıt/doğrulama/kaydet) sunucu gününe ertelendi
çünkü e-posta doğrulama akışı ConsoleEmailSender loguna gömülü, e2e'den
temiz okunamıyor; test-only uç AÇILMAZ (güvenlik yüzeyi).

CLAUDE.md "yeni test aracı eklemeden önce sor" diyor — kullanıcı bu
brifi onaylayarak sordu/onayladı sayılır; CLAUDE.md'ye Playwright'ın
varlığını ve dar kapsamını yazan 3-4 satır ekle.

## Kurulum

- `web/` altına `@playwright/test` (devDependency) + `playwright.config.js`:
  baseURL http://localhost:3000, `webServer: npm run dev` (vite,
  strictPort 3000). Testler `web/e2e/` dizininde (src dışında — vitest
  bunları görmesin; vitest config include'una dikkat).
- CI: ci.yml'e ayrı job EKLEME şimdilik — süreyi şişirir; package.json'a
  `test:e2e` script'i yeter, CI entegrasyonu sunucu günü.

## Akışlar (5 test dosyası)

1. **Hesap:** /arac/trace-width aç → varsayılan girdilerle `.big-result
   .value` dolu ve sayısal; bir girdiyi boz → `.empty-note` görünür.
2. **Dil:** EN düğmesi → `<html lang="en">` + h1 İngilizce; yenile →
   seçim kalıcı (localStorage).
3. **404:** /olmayan-yol → "Sayfa bulunamadı" + ana sayfa bağlantısı
   çalışır.
4. **Mod/klavye:** Segmented'e odaklan, ok tuşu → mod değişir (radiogroup
   davranışı), sonuç etiketi değişir.
5. **Rapor diyaloğu (anonim):** rapor düğmesi → giriş beklentisi/diyalog
   davranışı ne ise onu doğrula (önce elle bak, sonra yaz — davranışı
   koddan UYDURMA).

Seçiciler: role/label öncelikli (`getByRole`), sınıf seçicisi son çare.
Metinler dil değişkeni — TR varsayılanıyla test et, metni text.js'ten
kopyala.

## Doğrulama

```bash
cd web && npx playwright install chromium && npx playwright test  # 5 yeşil
npm test && npm run build                                          # değişmedi
```
Commit: `test: add anonymous-flow e2e coverage with Playwright`. Push,
README tablosunu işaretle.
