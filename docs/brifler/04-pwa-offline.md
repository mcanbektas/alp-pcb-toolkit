# Brif 04 — PWA / offline

**Model/effort:** Opus 5, medium. Cache stratejisi kararı kritik; kurulum
mekanik (Sonnet ajanına verilebilir).

## Gerekçe

Bütün hesap motorları tarayıcıda; sunucu yalnız üyelik/rapor. Service
worker ile site internetsiz TAM çalışır — lab/saha senaryosu gerçek
kullanım, "offline çalışan PCB hesaplayıcı" pazarlama değeri.

## Karar verilecekler

1. **Araç:** `vite-plugin-pwa` (Workbox) önerilir — elle SW yazma.
   CLAUDE.md "yeni araç eklemeden önce sor" kuralı test/lint için;
   build eklentisi için de kısa gerekçe yaz.
2. **Cache stratejisi — buradaki tuzaklar bu depoda daha önce yaşandı:**
   - Navigasyon istekleri (`index.html` ve prerender'lı sayfalar):
     **network-first, cache fallback.** Cache-first OLMAZ: bayat kabuk
     silinmiş hash'li chunk ister, sayfa boş kalır (ErrorBoundary tam
     bu yüzden var; nginx no-store kuralı da).
   - `/assets/` (hash'li): cache-first/immutable — güvenli.
   - `/api/`: SW HİÇ dokunmaz (NetworkOnly) — auth çerezi ve rate
     limit akışına cache girmesin.
   - Fontlar (`/fonts/`): cache-first.
3. **Güncelleme akışı:** yeni SW `skipWaiting` mi, "yeni sürüm var"
   bildirimi mi? Öneri: autoUpdate + mevcut Toast ile bilgilendirme
   (metin iki dilli, uiText.js'e girer — CLAUDE.md i18n kuralı).
4. **Manifest:** ad "ALP PCB Toolkit", ikonlar mevcut favicon'dan
   üretilir (192/512 png gerekir — sips ile üret), theme_color mevcut
   `#070c08` (index.html'deki değer).

## Kısıtlar

- Offline'ken oturum/kaydetme çalışmaz — SaveToProject zaten
  networkError ayrımı yapıyor (saveToProjectText.networkError);
  ek "offline" durumu eklemek İSTEĞE bağlı, kapsamı şişirme.
- nginx: `sw.js` no-store servis edilmeli (iki config'e de kural) —
  yoksa SW güncellemesi 1 yıl cache'e takılır.
- Prerender (Brif 03) ile sıra: hangisi önce olursa olsun çakışmaz ama
  navigasyon stratejisi prerender'lı yolları da kapsamalı.

## Doğrulama

- `npm run build` + docker web tazele; tarayıcıda: sayfayı aç, DevTools
  → offline işaretle, sayfa yenile → araç açılmalı ve hesap yapmalı.
- Yeni deploy sonrası: eski sekme yenilenince YENİ sürümü almalı
  (network-first kanıtı).
- `npm test` 1932 yeşil.
Commit: `feat: offline-capable PWA with a network-first shell`. Push,
README tablosunu işaretle.
