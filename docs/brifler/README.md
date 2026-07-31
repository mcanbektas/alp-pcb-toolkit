# İş brifleri — sıra ve model planı

Bu dizin, 2026-07-31 tarihli büyük inceleme/sertleştirme turundan sonra
planlanan işlerin briflerini taşır. Her brif TAZE bir oturum için kendi
kendine yeterlidir: bağlam, kapsam, dokunulacak dosyalar, doğrulama.

## Kullanım

1. Sıradaki brifin model/effort satırına bak, oturumu o modelle aç
   (ya da `/model` ile geç).
2. Claude'a brif dosyasını ver: "docs/brifler/01-onizleme-kolonu.md'yi
   oku, uygula."
3. İş bitince commit + push zaten brifin doğrulama adımında; sonraki
   brife geç.

**Taze oturum buradan başlar: `10-kalan-isler.md`.** 1-5 ve 7 bitti; kalan
her şey (erişilebilirlik kusurları, e-posta dili, sunucu günü, iki büyük
tasarım brifi) orada sıralı ve kendi model/effort satırıyla duruyor.

Genel kural (bu turda doğrulandı): **spec net + iş mekanikse Sonnet
yeter; tasarım kararı ve denetim pahalı modelde kalır.** Oturum pahalı
modeldeyse uygulamayı `Agent` çağrılarında `model: "sonnet"` ile dağıt.

## Sıra ve atama

| # | Brif | Oturum modeli | Effort | Not |
|---|------|--------------|--------|-----|
| 1 | 01-onizleme-kolonu.md | Sonnet 5 | high | ✓ bitti (2026-07-31) |
| 2 | 02-sitemap-robots.md | Haiku 4.5 | low | ✓ bitti (2026-07-31) |
| 3 | 03-prerender.md | Opus 5 | medium | ✓ bitti (2026-07-31) — karar: `docs/prerender-karari.md` |
| 4 | 04-pwa-offline.md | Opus 5 | medium | ✓ bitti (2026-07-31) — karar: `docs/pwa-karari.md` |
| 5 | 05-playwright-e2e.md | Sonnet 5 | medium | ✓ bitti (2026-07-31) — 16 e2e + 4 çevrimdışı |
| 6 | 06-sunucu-gunu.md | Sonnet 5 | medium | Sunucu ALINDIĞINDA |
| 7 | 07-en-urller.md | Opus 5 | high | ✓ bitti (2026-07-31) — karar: `docs/en-url-karari.md` |
| 8 | 08-rapor-snapshot.md | Opus 5 | medium | Saklama kararını yeniden açar |
| 9 | 09-alan-cozucu.md | Fable/Opus 5 | high/max | Sayısal doğruluk — ucuzlatılamaz |
| 10 | **10-kalan-isler.md** | bölüm başına | bölüm başına | **TAZE OTURUMUN GİRİŞ NOKTASI** — kalan her şey burada sıralı |

1-5 ve 7 sunucusuz yapıldı. 6 sunucu gününe bağlı. 8-9 büyük/ertelenmiş —
briflerinde yalnız karar çerçevesi var, ayrıntılı spec o gün yazılır.

## Açık bulgular — hepsi artık `10-kalan-isler.md`'de spec'li

Aşağıdakiler kayıt olarak duruyor; yapılacak iş hâline getirilmiş biçimleri
`10-kalan-isler.md` bölüm A (Segmented), B (auth `h1`) ve C (e-posta dili).

Kapsamı kendi briflerini aşan bulgular. Hepsi build'den, birim testlerinden
ve tip denetiminden kaçar — yani kırıldıklarında hiçbir kapı ötmez.

- **`Segmented`e hiçbir ekranda `label` geçilmiyor** — 24 dosyadaki 31
  örneğin hepsi (sayım 2026-07-31'de yeniden yapıldı). Bileşen `label`ı `aria-label`a koyuyor ama prop hiç
  kullanılmamış, yani mod seçici grubu ekran okuyucuya ADSIZ duyuruluyor
  ("radio group", hangi grup belli değil). Düzeltmesi 24 dosya + `text.js`
  başına yeni iki dilli metin demek. Spec: `10-kalan-isler.md` bölüm A.
- **E-posta akışı tek dilli** (Brif 07'de çıktı, kapsamı aşıyordu).
  `api/Alp.Api/Auth/AuthEndpoints.cs` doğrulama ve parola sıfırlama bağlantılarını
  `{FrontendBaseUrl}/e-posta-dogrula` ve `/parola-sifirla` olarak üretir; postanın
  gövdesi de Türkçedir. İngilizce arayüzden kayıt olan kullanıcı Türkçe posta alır
  ve Türkçe sayfaya düşer. Kırık değil, tek dilli. Düzeltmesi yalnız yol çevirisi
  değil: kullanıcının dili kayıt isteğiyle sunucuya taşınmalı ve `IEmailSender`
  tarafı iki dilli olmalı — ayrı bir iş olarak planlanmalı.
- **Auth ekranlarında `h1` yok** (`pages/auth/*`), başlık `h2` ile kuruluyor.
  Araç ekranları `h1` kullanıyor. Sayfa başına tek `h1` beklentisi bozuk;
  auth sayfaları indekslenmediği için SEO etkisi yok, erişilebilirlik
  etkisi var.

Düzeltilen bir kusur ise brif 05 kapsamında kaldı: başlıktaki "Giriş yap"
bağlantısına `role="group"` konmuştu ve tek bağlantının `link` rolünü
eziyordu (oturumlu daldan kopyalanmış). `App.jsx`te kaldırıldı.

## Bitmiş işler (tekrar açma)

İnceleme turunun tamamı uygulandı (auth sertleştirme, girdi sınırları,
rate limit, CSP, ErrorBoundary, ToolShell/ResultPanel/Commentary
refactor'ü 28/29 ekran, CI kapıları, backup düzeltmeleri). Ayrıntı:
git log 2026-07-31, `fe67d4a`..`9ee84b6`.

Brif 07'den sonra aynı gün yapılanlar (git log `b48dcd7`..):

- İki dilli URL ağacı + `hreflang`/`canonical`, prerender 38 → 76 sayfa
  (`docs/en-url-karari.md`)
- `VITE_SITE_URL` web imajının derlemesine geçiriliyor — eskiden ulaşmıyordu
- İngilizce hesap etiketlerinden iyelik kalktı (`Projects` / `Account`)
- Tek geliştirme adresi: `npm run stack` → `http://localhost:3000`; API portu
  5289'a sabitlendi (`launchSettings` 5031'e bağlıyordu, proxy tutmuyordu)
- Başlık motifi ve dil düğmeleri ölçümle hizalandı; rampa artık dinamik
- Rapor künyesindeki firma alanı görünür ve tek seferlik düzenlenebilir
  (`docs/uyelik-ve-rapor-plani.md` §27)

Güncel test sayısı: **111 sunucu + 1966 web + 18 tarayıcı + 5 çevrimdışı.**
Bilinçli yapılmayanlar: Termination'ın sonuç paneli (hata dalı ekstra
içerik çiziyor), RequireAuth yönlendirmesi (mevcut anonim mesajlar
bilinçli tasarım), ohm.js induktans çifti (API simetrisi).
