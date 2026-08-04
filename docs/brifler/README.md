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

**Taze oturum buradan başlar: `10-kalan-isler.md`.** 1-5, 7 ve 8 bitti; o brifin
A (Segmented adları), B (auth `h1`), C (e-posta dili) ve E (rapor snapshot)
bölümleri de bitti. Kalan: D (sunucu günü — engelli) ve F (2B alan çözücü).

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
| 8 | 08-rapor-snapshot.md | Opus 5 | medium | ✓ bitti (2026-08-01) — karar: `docs/rapor-snapshot-karari.md` |
| 9 | 09-alan-cozucu.md | Fable/Opus 5 | high/max | BRİF HAZIR (2026-08-01) — üç oturum: F1/F2/F3, yöntem kararları verildi |
| 10 | **10-kalan-isler.md** | bölüm başına | bölüm başına | **TAZE OTURUMUN GİRİŞ NOKTASI** — kalan her şey burada sıralı |
| 11 | 11-arac-bolunmesi.md | Sonnet 5 | ultracode (yoksa max) | BRİF HAZIR (2026-08-04) — SMD sökümü + rc-crystal ve led-ohm-rlc'nin 5 araca ayrılması; kararlar brifte verildi |

1-5, 7 ve 8 sunucusuz yapıldı. 6 sunucu gününe bağlı. 9 hazır bekliyor:
brifi artık karar çerçevesi değil, uygulanabilir spec — taze oturum
`09-alan-cozucu.md`'yi okuyup F1'den başlar.

## Açık bulgular — A, B ve C KAPANDI (2026-07-31)

Üçü de `10-kalan-isler.md`'de spec'liydi; üçü de aynı gün yapıldı. Hepsi
build'den, tip denetiminden ve birim testlerinden kaçan kusurlardı — bu yüzden
her biri kendi **bekçi testiyle** kapandı, yoksa bir sonraki ekranda sessizce
geri gelirlerdi.

- ✓ **`Segmented`e hiçbir ekranda `label` geçilmiyordu** — 31 çağrının hepsi
  ekran okuyucuya adsız duyuruluyordu. Hepsine kendi `text.js`inden iki dilli
  ad verildi. Bekçi: `components/segmentedLabel.guard.test.js` (eksik `label`,
  çıplak dize ve aynı dosyada tekrarlanan ad).
- ✓ **Auth ekranlarında `h1` yoktu** (`pages/auth/*`), başlık `h2` ile
  kuruluyordu. Beş ekranın on dalı da `h1` oldu; görünüm dört temada
  `.auth-panel h1` ile birebir korundu. Bekçi:
  `pages/auth/authHeading.guard.test.js` (panel sayısı = `h1` sayısı, dört
  temada kural var).
- ✓ **E-posta akışı tek dilliydi** (Brif 07'de çıkmıştı). Dil istek gövdesinde
  `lang` alanıyla taşınıyor; konu, gövde ve bağlantı yolu iki dilli
  (`api/Alp.Api/Auth/AuthEmailText.cs`). Metin bilinçli olarak SUNUCUDA
  bırakıldı — gövdeyi istemci belirlerse kimlik avı yüzeyi açılır. Karar:
  `docs/eposta-dili-karari.md`. Bekçi: `lib/authMailPaths.guard.test.js`
  (sunucudaki yol tablosu `routes.js` ile ayrışamaz) + sunucu tarafında
  `AuthEmailLanguageTests.cs`.

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

Güncel test sayısı: **136 sunucu + 1977 web + 18 tarayıcı + 5 çevrimdışı.**
Bilinçli yapılmayanlar: Termination'ın sonuç paneli (hata dalı ekstra
içerik çiziyor), RequireAuth yönlendirmesi (mevcut anonim mesajlar
bilinçli tasarım), ohm.js induktans çifti (API simetrisi).
