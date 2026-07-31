# Brif 02 — sitemap.xml + robots.txt + statik meta

**Model/effort:** Haiku 4.5, low. Şablon işi; tek dikkat noktası alan
adının henüz olmaması.

## Kapsam

1. **`web/public/robots.txt`:** her şeye izin + sitemap satırı.
   `/api/` disallow ekle (nginx zaten vekilliyor ama tarayıcı botu
   oraya girmesin).
2. **Sitemap üretimi:** elle XML YAZMA — rotalar tek kaynaktan gelsin.
   `web/scripts/build-sitemap.mjs`: `src/data/categories.js`'i import
   eder (ESM), `path` alanı olan araçlar + `/kategori/<slug>` sayfaları
   + `/` için `<url>` girdileri üretir, `dist/sitemap.xml`'e yazar.
   package.json: `"build": "vite build && node scripts/build-sitemap.mjs"`.
   Alan adı: `VITE_SITE_URL` ortam değişkeni; yoksa
   `https://alp-pcb-toolkit.example` placeholder yaz ve script uyarı
   bassın — alan adı alınınca deploy .env'ine girer (deploy/README'ye
   bir satır not ekle).
3. **robots.txt'deki Sitemap satırı** da aynı değişkenden gelemez
   (statik dosya) — robots.txt'ye göreli değil TAM url gerekir; şimdilik
   Sitemap satırını YAZMA, alan adı gününde eklenir (nota düş).

## Kurallar

- categories.js'e dokunma; yalnız oku.
- Yeni kullanıcı metni yok — i18n derdi yok.
- CLAUDE.md: linter yok, test kapsamı dar — script için test yazma,
  build çıktısını doğrula.

## Doğrulama ve bitiş

```bash
cd web && npm run build
cat dist/sitemap.xml | head -20     # 29 araç + 8 kategori + / görünmeli
cat dist/robots.txt
cd ../deploy && docker compose build web && docker compose up -d web
curl -s http://localhost:8080/robots.txt
curl -s http://localhost:8080/sitemap.xml | head -5
```
nginx'te ek kural GEREKMEZ (kökteki statik dosyalar `try_files`'la
zaten servis edilir) — yine de yukarıdaki iki curl ile kanıtla.
Commit: `feat: generate sitemap.xml from the tool catalogue`. Push.
README tablosunu işaretle.
