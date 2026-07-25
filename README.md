# ALP PCB Toolkit

PCB tasarımı için çevrim içi mühendislik karar destek araçları. Tüm hesaplar tarayıcıda
(client-side) çalışır; backend gerektirmez.

## Geliştirme

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # dist/ klasörüne üretir
```

## GitHub Pages'e yayınlama

1. GitHub'da yeni bir repo oluşturun ve bu projeyi push edin (`main` branch).
2. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions** seçin.
3. `main`'e yapılan her push, `.github/workflows/deploy.yml` ile otomatik build alıp yayınlar.

`vite.config.js` içindeki `base: './'` ve HashRouter sayesinde repo adından bağımsız çalışır;
ek ayar gerekmez.

## Yapı

```
src/
  data/categories.js      # 7 ana kategori ve araç listesi
  lib/num.js              # sayı ayrıştırma (0.25 = 0,25) ve biçimlendirme
  lib/traceCalc.js        # trace hesap motoru (SI iç birimler)
  components/             # NumberField, SelectField, Segmented
  pages/Home.jsx          # kategori kartları
  pages/CategoryPage.jsx  # kategori altındaki araçlar
  pages/tools/TraceWidth.jsx  # ilk aktif araç (3 panelli düzen)
```

Yeni araç eklemek için: `pages/tools/` altına bileşen yaz, `App.jsx`'e route ekle,
`data/categories.js`'te ilgili araca `path` ver.

## Notlar

- Sonuçlar yaklaşık mühendislik tahminleridir; kritik tasarımlarda üretici verisiyle doğrulayın.
- Ara hesaplarda yuvarlama yapılmaz; yalnızca gösterimde uygulanır.
