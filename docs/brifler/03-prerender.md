# Brif 03 — Prerender/SSG: araç sayfalarını tarayıcısız indekslenebilir yap

**Model/effort:** Opus 5, medium. Tek gerçek iş TASARIM KARARI; uygulama
Sonnet ajanlarına dağıtılabilir (`Agent`, `model: "sonnet"`).

## Sorun

Site saf SPA (BrowserRouter, tembel chunk'lar). Bot JS koşturmazsa her
sayfa boş `<div id="root">`. 29 hesap aracının hiçbirinin indekslenebilir
içeriği yok — bu ürün kategorisi organik aramayla yaşar.

## Karar verilecekler (uygulamadan ÖNCE, kısa yazılı gerekçeyle)

1. **Yöntem:** (a) `react-dom/server` ile post-build render script'i —
   rotaları categories.js'ten alır, her rota için `dist/<yol>/index.html`
   üretir (kabuk index.html'e SSR çıktısını gömer); (b) headless-chrome
   tabanlı prerender (puppeteer) — bağımlılık ağır; (c) Vite SSG
   framework'üne geçiş — kapsam dışı büyük. Öneri (a) — sıfır yeni
   runtime bağımlılık, mevcut lazy yapıyla uyum için rota başına
   `ReactDOMServer.renderToString` + ilgili ekranın eager import'u.
2. **Hydration:** `main.jsx` `createRoot` → prerender'lı sayfada
   `hydrateRoot` mı, yoksa içerik SEO-amaçlı olup React mount'ta
   ÜZERİNE mi yazsın (basit ama flash)? Karar + gerekçe.
3. **Dil:** varsayılan tr prerender'lanır. en sürümü Brif 07 (EN
   URL'ler) gelene dek prerender'lanmaz — hreflang o brifin işi.
4. **nginx:** `try_files $uri $uri/ /index.html` prerender'lı
   `<yol>/index.html` dosyalarını kendiliğinden bulur — kural değişmez;
   yine de `curl`la kanıtla. `location = /index.html` no-store kuralının
   yeni dosyaları KAPSAMADIĞINA dikkat: prerender'lı sayfalara da
   no-store gerekir (bayat kabuk sorunu aynen geçerli) — nginx'e
   `location ~ /index\.html$` benzeri güncelleme gerekebilir, iki
   config birden.

## Kısıtlar

- Hesap motorları ve ekranlar tarayıcı API'sine dokunmaz (lib/ saf) —
  SSR çoğunlukla sorunsuz; `localStorage` erişimi hook'larda ve
  `storage.js` `nullStorage`'a düşebiliyor. SSR'da patlayan yer çıkarsa
  düzeltme ekrana değil PORT katmanına gider.
- `index.html`'deki meta/description ve TitleSync (App.jsx) korunur.
- Build süresi: 29 rota render'ı CI'da koşacak — 1-2 dk kabul, üstü
  değil.

## Doğrulama

```bash
cd web && npm run build
curl -s http://localhost:8080/arac/trace-width | grep -c "<h1"  # ≥1, JS'siz
npm test && npm run build      # 1932 yeşil
```
+ tarayıcıda 2-3 araç elle: hydration hatası konsolda OLMAMALI.
Commit: `feat: prerender tool and category pages for crawlers`. Push,
docker web tazele, README tablosunu işaretle.
