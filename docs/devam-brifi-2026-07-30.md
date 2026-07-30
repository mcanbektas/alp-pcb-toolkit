# Devam brifi — ALP PCB Toolkit (2026-07-30, akşam)

Bu dosyayı yeni bir sohbetin başına yapıştır. Kendine yeten: repo, ortam, kurallar, bugün ne
yapıldı, kalan iş. Ayrıntı dosya yollarıyla işaret edildi — **hafızadan iş yapma, o dosyaları
oku.**

## Repo ve ortam

- Kök: `/Users/canbektas/Projects/alp-pcb-toolkit`
- Üç parça: `web/` (Vite + React 18), `api/` (ASP.NET Core 9, Identity+JWT, EF Core,
  QuestPDF/ClosedXML), `deploy/` (nginx + api + postgres, Docker Compose).
- Dal: **`main`.** `feat/uretim-dfm-araclari` fast-forward ile main'e alındı ve push edildi
  (CI + imaj yayını yeşil); dal yerelde duruyor, silinmedi. Akşam turunun son üç commit'i
  (`ccbb18e`, `de1ef2c`, `689b256`) push EDİLMEDİ — onay bekliyor.
- Tek-kaynak dokümanlar, her işten önce ilgilisini oku:
  - `CLAUDE.md` — katman kuralları, dil (tr/en), sonuç sunumu, "ipc yasağı", statusChip, kayıt bağı
  - `docs/spec.md` — formüller, sabitler, sınırlar
  - `docs/uyelik-ve-rapor-plani.md` — fazlar; **§19 rapor turu, §20 proje detayı, §21 Faz 7 +
    profil uçları, §22 fontlar** bugünün kararları
  - `docs/kod-incelemesi-2026-07-29.md` — ilk derin inceleme + durum tablosu
  - `docs/kod-incelemesi-2026-07-30.md` — bugünün kodunun incelemesi; **"Açık kalanlar"**
    bölümü sıradaki işleri sayar

## Komutlar

```bash
cd web && npm test                         # vitest — 1957/1957 yeşil
cd web && npm run build                    # dist/, temiz
cd api && dotnet build Alp.Api.sln         # 0 uyarı, 0 hata
cd api && dotnet test Alp.Api.sln          # xunit — 70/70 yeşil (bellek içi SQLite)
cd deploy && docker compose up -d --build  # http://localhost:8080
```

- Test hesabı: `test@alp.local` / `1234567` (bu parolayla YENİ kayıt açılamaz).
- Playwright betikleri depoya EKLENMEDİ:
  `/private/tmp/claude-501/-Users-canbektas/279c3a22-e185-4306-8100-f1c6346da662/scratchpad/pw/`
  → `verify-rapor-turu.mjs`, `verify-proje-raporu.mjs`, `verify-hesap.mjs`,
  `verify-fontlar.mjs`, `verify-kayit.mjs`, `tani.mjs`; akşam turunda eklenenler
  `verify-fontlar2.mjs` (9 kontrol, üretilen CSS'in blok sayısı dahil),
  `verify-kalinlik-boyama.mjs` (ilk boyama, üç durum), `olc-kalinlik-boyama.mjs` (ölçüm),
  `tani-kalinlik.mjs`. Yeni oturumda VAR OLMAYABİLİR; gerekirse yeniden yaz.
  Tuzak: araç yolu `/arac/bakir-donusturucu`, katalog `id`'si `cu-converter` — ikisi aynı
  değil. Ve `MutationObserver` init betiğinde `document`'e bağlanır, `documentElement`'e
  değil (belge başında o henüz yok).
- Değişiklikten sonra: test + build + docker + gerçek tarayıcı, sonra **kullanıcı onayıyla**
  commit.

## Ortam tuzakları (hepsi bu oturumda yaşandı)

- **`curl` engelli:** kabuk hook'u curl/wget'i kesiyor. Ağ için `ctx_execute` (JS `fetch`) ya
  da `python3 urllib` kullan.
- **Hız sınırı:** rapor uçları kullanıcı başına 5 dk'da 20; yazma uçları (profil/logo/kayıt)
  120; `refresh` IP başına 120. Betikle 429 alırsan ürün hatası değil. Pencere bellek içi —
  `docker compose restart api` sıfırlar.
- **Migration:** `Database__MigrateOnStartup=true`, şema api açılışında uygulanır. Konteynerde
  `dotnet ef` yok; migration yerelde üretilir (`dotnet ef migrations add … --project Alp.Data
  --startup-project Alp.Api`), sonra imaj yeniden kurulur.
- **`document.fonts.check()` glif kapsamını ÖLÇMEZ**, yüklenme durumunu ölçer: hiçbir yüzün
  kapsamadığı karakterde `true` döner (sistem yüzü daima "yüklü"), indirilmemiş bir yüzde
  `false`. Kapsama sorusu `document.fonts.load(font, text)`a sorulur — boş dizi "kapsanmıyor"
  demektir. `check()` kullanılacaksa **sayfanın kullandığı ağırlıkla** sorulmalı.

## Sağlam kurallar (ihlal etme)

Katman yönü `pages → components → hooks → lib` (asla tersi); `lib/` React/DOM bilmez. Her metin
iki dilli `t({tr,en})`. Saf katman kod döner, cümle değil. Renkler `var(--x)`, ekrana özel CSS
yok — yeni görsel kural **dört tema dosyasına birden** girer. Sitede "ipc" geçmez (docs hariç).
Ters hesap `solveBounded`. Kararlar sorulur. Yeni test/lint aracı sormadan eklenmez.

---

## Bugün ne yapıldı (12 commit)

1. **Grafik son satırı** — örnekleme kuralı 19 `report.js` dosyasından kalktı, tek kopya
   `LineChart.jsx`'teki `sampleIndices`. 6 araçta rapor ekrandan bir satır eksik çıkıyordu;
   regresyon testleri yazıldı.
2. **Rapor dosyası saklanmıyor** — üretilen belge diske yazılmıyor, `Reports` tablosu kütük.
   "Tekrar indir" = kaydedilmiş hesaplardan **yeniden üretim**. `Report.FilePath` düştü.
3. **PDF layout koruması** — `ReportLayoutException` → 422 `REPORT_TOO_LARGE`; üretimde
   `UseExceptionHandler`.
4. **Boyutsuz SVG asılması kapatıldı** — `viewBox`/`width` taşımayan SVG dizgiyi döndürüp
   süreci %248 CPU / 7 GB'a çıkarıyordu (tek istekle DoS). `HasIntrinsicSize` kapısı.
5. **Proje detayı projeksiyonu** — `GET /api/projects/{id}` artık rapor bölümü göndermiyor;
   60 hesapta 906 KB → **26,5 KB**. Önizleme sunucuda türetiliyor (`ReportPreview.cs`).
   Yeni uç: `POST /api/projects/{id}/report/{pdf,xlsx}`.
6. **Faz 7 + profil uçları** — kalınlık kayıtları hesapta (girişsizken tarayıcıda, ilk girişte
   bir kez taşınıyor), `PATCH /api/me`, logo yükleme (DB'de bayt, tür sihirli baytlardan
   doğrulanıyor), raporda kullanıcının logosu, yeni `/hesabim` ekranı.
7. **Faz 3b fontlar** — üç aile depoda (26 woff2 + 5 ttf, SIL OFL). `index.html` fontları
   Google'dan çekiyormuş; o bağımlılık kalktı, PDF de aynı dosyaları kullanıyor.
8. **İnceleme turu** — kalınlık kaydında ad tekliği yarış altında bozuluyordu (5 eşzamanlı
   istek → 5 satır); `(UserId, NameKey)` benzersiz dizini + kopya temizleyen migration.
   Yazma uçlarına `writes` hız sınırı (120/5 dk).

Faz 9 da bu turda kapandı: README artık backend'li gerçeği anlatıyor, GitHub Pages bölümü yok.

---

## KALAN İŞ — en basitten en kompleke

1. ~~**`fonts.css` üreteci**~~ · **BİTTİ** (`94353cd`). `web/scripts/build-fonts.mjs`,
   `npm run fonts` (+ `--fetch` / `--check` / `--coverage`). Kaynaklar sabit: `@fontsource
   5.3.0` ve `google/fonts@7ff85c87`. `--fetch` var olan 35 dosyayı bayt bayt aynı indiriyor.

2. ~~**`ttf`'leri `public/` dışına al**~~ · **BİTTİ** (`1b507f2`). Yeni yer
   `assets/report-fonts/`; `api/Dockerfile` oradan kopyalıyor, `Reports__FontsPath=/app/fonts`
   bağı duruyor. `dist/fonts` 1,4 MB → 424 KB.

3. ~~**Kalınlık listesinde ilk boyama**~~ · **BİTTİ** (`550d180`). Ölçüldü: yanıp sönme
   gerçekti, yerel liste 46 ms görünüyordu. `alp-pcb.thickness.serverbacked.v1` ipucu ile
   girişli tarayıcı ilk boyamada yerel listeyi basmıyor; girişsiz yol aynı hızda (30 ms).

Ayrıntı: `docs/uyelik-ve-rapor-plani.md` §23. Docs kaydı `a345198`. Dal `main`'e fast-forward
ile alındı ve push edildi (CI + imaj yayını yeşil).

3b. ~~**Alt kümelerin dışındaki 38 karakter**~~ · **BİTTİ** (`0505fbc`, docs `2e848ed`).
   Kendi kestiğimiz `symbols` alt kümesi: 26 karakter artık bizim fontumuzdan
   (`npm run fonts -- --symbols`, `subset-symbols.py`, fontTools + brotli gerekir).
   Kalan 12 (`⁻ ₐ ₙ ∈ ∝ ∠ ∥ ≪ ⌈ ⌉ □ ✗`) üç ailenin tam ttf'sinde de yok — kayıt, iş değil.
   Ayrıntı §24. **Yöntem tuzağı:** `document.fonts.check()` glif kapsamını ölçmez, yüklenme
   durumunu ölçer — kapsanmayan karakterde `true` döner. Kapsama sorusu
   `document.fonts.load()`a sorulur (boş dizi = kapsanmıyor).

4. ~~**Backend testleri**~~ · **BİTTİ** (`ccbb18e`, kapı düzeltmesi `de1ef2c`, docs `689b256`).
   `api/Alp.Api.Tests`, xunit + bellek içi SQLite, **70 test**: rapor önizlemesi süzmesi,
   boyutsuz SVG kapısı, logo tür tespiti, ad tekliği + 50 sınırı, proje-hesap sahipliği.
   `dotnet test Alp.Api.sln`, CI'da ayrı adım. Uçlar HTTP üzerinden değil, işleyicileri
   doğrudan çağırarak sınanıyor (`internal` + `InternalsVisibleTo`). Ayrıntı ve kapsam dışı
   bırakılanlar §25.
   **Testlerin bulduğu hata:** SVG kapısı öznitelikleri harf duyarsız arıyordu, istemciden gelen
   `<svg VIEWBOX=…>` kapıdan geçip bütün raporu 422'ye düşürüyordu — `Ordinal` oldu (§25.2).
   **Tuzak:** çözüme test projesi eklemek `api/Dockerfile`'daki `dotnet restore Alp.Api.sln`'i
   kırıyor; artık uygulama projesi geri yükleniyor ve testler `.dockerignore`'da.

5. **Faz 8 sunucu adımı** · BÜYÜK — **BLOKE.** Sunucu, alan adı ve SMTP yok. SMTP zorunlu
   (e-posta doğrulaması açık; postası gitmeyen kullanıcı giriş yapamaz). Altyapı gelince
   `deploy/README.md` runbook'u izlenir.

### Bilinen sınırlar (iş değil, kayıt)

- IBM Plex Mono'nun `greek` alt kümesi yayınlanmıyor → mono metindeki Ω sistem yazı tipinden
  çizilir. Fontlar Google'dan gelirken de böyleydi.
- Rapor yeniden üretimi projenin **güncel** hâlini basar; anlık görüntü saklanmıyor. Projeye
  kaydedilmemiş tek seferlik rapor geri getirilemez (409 `REPORT_NOT_REPRODUCIBLE`).
- `deploy/docker-compose.yml`'deki `reports` volume'unun adı tarihsel: artık yalnız Data
  Protection anahtarlarını taşıyor. Yeniden adlandırmak boş volume demek — dokunma.

## Öneri

1–3 tek oturumda biter, hepsi düşük risk. 4 için önce onay al. 5 bloke.
Commit sonu: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
