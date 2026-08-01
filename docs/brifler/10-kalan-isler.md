# Brif 10 — Kalan işler (giriş noktası)

**Bu dosya taze bir oturumun tek başlangıç noktasıdır.** Önce burayı oku,
sonra sıradaki bölüme geç. Her bölüm kendi model/effort satırını taşır;
oturumu o modelle aç ya da `/model` ile geç.

Genel kural (bu turda defalarca doğrulandı): **spec net + iş mekanikse Sonnet
yeter; tasarım kararı ve sayısal doğruluk pahalı modelde kalır.** Oturum pahalı
modeldeyse uygulamayı `Agent` çağrılarında `model: "sonnet"` ile dağıt.

Her bölümün sonunda **commit + push** vardır; sonraki bölüme temiz ağaçla
geçilir. Commit mesajları İngilizce ve nesir (bkz. git log).

## Önce oku

Bunlar bugünkü kararların gerekçesini taşır; okumadan aynı tartışmalar
sıfırdan açılır:

- `CLAUDE.md` — mimari, dil kuralları, prerender/PWA, test kapsamı
- `docs/en-url-karari.md` — iki dilli URL ağacı (Brif 07, bitti)
- `docs/prerender-karari.md`, `docs/pwa-karari.md`
- `docs/uyelik-ve-rapor-plani.md` §27 — rapor künyesindeki firma alanı
- `docs/brifler/README.md` — sıra, bitmiş işler, açık bulgular

## Yığını kaldırma

```bash
cd web && npm run stack        # API 5289 + web 3000 → http://localhost:3000
```

Test hesabı: `alptest@example.com` / `Alptest1234!` (yerel veritabanında,
e-postası doğrulanmış). Doğrulama postaları SMTP'siz ortamda `npm run stack`
terminaline düşer.

Docker yığını (8080) günlük iş için gerekmez; yalnız derlenmiş çıktıyı
(prerender, hreflang, service worker) doğrularken `npm run stack:docker`.

---

# A. `Segmented` ekran okuyucuya ADSIZ duyuruluyor — ✓ BİTTİ (2026-07-31)

**Model/effort:** Sonnet 5, medium. Spec net, iş mekanik ama geniş.

31 çağrının hepsi kendi `text.js`inden iki dilli ad aldı; bekçi:
`components/segmentedLabel.guard.test.js`. Aşağısı yapılan işin kaydıdır.

## Sorun

`components/Segmented.jsx` bir `label` prop'u alıyor ve onu `aria-label`a
koyuyor — ama **hiçbir ekran bu prop'u geçmiyor**. 24 dosyadaki 31 örneğin
tamamı adsız. Ekran okuyucu "radio group" diye duyuruyor, hangi grup olduğu
belli değil; bir araçta iki grup varsa (mod + alt mod) ikisi ayırt edilemiyor.

Build'den, tip denetiminden ve birim testlerinden kaçar: prop isteğe bağlı,
eksikliği `aria-label={undefined}` olarak sessizce geçer.

## Yapılacak

1. `grep -rn "<Segmented" web/src` ile 31 çağrı yerini çıkar.
2. Her çağrıya `label={…}` ekle. Metin ekranın kendi `text.js`'inden gelir ve
   **iki dilli** olmak zorunda (`t({ tr, en })`) — çıplak dize eksik iş sayılır
   (CLAUDE.md → Dil).
3. Ad grubun NE seçtiğini söylemeli, ekranın adını tekrarlamamalı:
   `"Hesap modu"` / `"Calculation mode"` iyi; `"Yol genişliği"` kötü —
   ekran başlığı zaten okundu.
4. Aynı ekranda iki grup varsa adları birbirinden ayrılmalı.

## Doğrulama

- `npm test` yeşil (metin bekçileri yeni yolları da yürütür).
- Bir bekçi test ekle: `<Segmented` çağrılarının hepsinin `label=` taşıdığını
  kaynak metni üzerinden denetle. Desen hazır: `pages/langLink.guard.test.js`
  ve `pages/tools/toolKeys.test.js` aynı tekniği kullanıyor (dosyaları metin
  olarak okur, bileşen render etmez). **Bu testi yazmadan bitmiş sayma** —
  yoksa kural bir sonraki ekranda sessizce bozulur.
- `npm run test:e2e` yeşil (`mod-klavye.spec.js` grup davranışını sınıyor).

---

# B. Auth ekranlarında `h1` yok — ✓ BİTTİ (2026-07-31)

**Model/effort:** Haiku 4.5, low. Beş dosya, tek kural.

On dalın hepsi `h1` oldu, görünüm dört temada korundu; bekçi:
`pages/auth/authHeading.guard.test.js`.

## Sorun

`pages/auth/*.jsx` başlıklarını `h2` ile kuruyor (`Login`, `Register`,
`ForgotPassword`, `ResetPassword`, `ConfirmEmail` — bazılarında iki dal, yani
toplam 10 yer). Araç ekranları `h1` kullanıyor. "Sayfa başına tek `h1`"
beklentisi bozuk. Auth sayfaları indekslenmediği için SEO etkisi yok,
erişilebilirlik etkisi var: ekran okuyucunun başlık gezintisi sayfanın adını
bulamıyor.

## Yapılacak

- Her auth ekranının sayfa başlığını `h1` yap. `.panel` içindeki İKİNCİL
  başlıklar `h2` kalır (`<h2 className="section">` deseni — CLAUDE.md).
- Görsel değişmemeli: gerekiyorsa tema dosyalarında `.auth-panel h1` kuralı
  mevcut `h2` görünümünü birebir taşısın. **Dördüne de** eklenir (CLAUDE.md →
  Renkler/temalar kuralı: yeni kural dört temada da tanımlanır).
- Aynı dalda iki başlık kalmasın: koşullu dalların her biri tek `h1` basmalı.

## Doğrulama

- `npm test`, `npm run test:e2e` yeşil.
- Tarayıcıda beş ekranın her birinde tek `h1` olduğunu doğrula.

---

# C. E-posta akışı tek dilli — ✓ BİTTİ (2026-07-31)

**Model/effort:** Opus 5, medium. Sözleşme değişikliği + iki taraf.

Karar `docs/eposta-dili-karari.md`'de; dil istek gövdesinde `lang` alanıyla
taşınıyor, metin sunucuda iki dilli sözlükte (bilinçli kural istisnası).
Bekçiler: `lib/authMailPaths.guard.test.js` + `AuthEmailLanguageTests.cs`.

## Sorun

`api/Alp.Api/Auth/AuthEndpoints.cs` üç posta gönderiyor (satır ~98, ~125,
~357: kayıt denemesi, e-posta doğrulama, parola sıfırlama). Üçünün de konusu
ve gövdesi **çakılı Türkçe**, ürettikleri bağlantılar da Türkçe yollara
gidiyor (`{FrontendBaseUrl}/e-posta-dogrula`, `/parola-sifirla`).

İngilizce arayüzden kayıt olan kullanıcı Türkçe posta alır ve Türkçe sayfaya
düşer. Kırık değil, tek dilli — ama arayüzün geri kalanı iki dilli olduğu için
tutarsız. Brif 07 bunu kapsam dışı bırakıp buraya yazdı
(`docs/en-url-karari.md` §8).

## Karara bağlanacaklar

1. **Dil sunucuya nasıl taşınır?** Seçenekler: istek gövdesinde `lang` alanı
   (`RegisterRequest`, `ForgotPasswordRequest`, `ResendConfirmationRequest`),
   `Accept-Language` başlığı, ya da kullanıcı kaydında kalıcı tercih.
   Gövde alanı en açık olanı; kalıcı tercih ise "hesabın dili" diye YENİ bir
   kavram doğurur — istenmiyorsa yazılmasın.
2. **Metin nerede durur?** CLAUDE.md'nin kuralı net: *sunucu kullanıcı metni
   tanımaz*, rapor çerçevesi bu yüzden yükle birlikte gidiyor
   (`reportLabels`). Aynı kural postalara uygulanırsa metin istemciden
   gelmeli — ama kayıt isteği postanın gövdesini taşıyamaz (güvenlik: gövdeyi
   istemci belirlerse spam/kimlik avı yüzeyi açılır). Yani burada kural
   **bilinçli olarak deliniyor**: postalar sunucuda, iki dilli bir sözlükte
   durur. Bu istisna gerekçesiyle birlikte yazılmalı.
3. **Bağlantı yolu.** `en` dilinde `{FrontendBaseUrl}/en/confirm-email` ve
   `/en/reset-password` üretilmeli. Yol sözlüğü istemcide
   (`web/src/lib/routes.js`); sunucuda ikinci bir kopya doğuyor — kopyanın
   ayrışması kırık bağlantı demek. Nasıl bağlanacağı karara bağlanır
   (sunucuda küçük bir sabit tablo + istemci tarafında bir bekçi test en ucuz
   yol gibi görünüyor).
4. **Dil bilinmiyorsa** varsayılan Türkçedir (`DEFAULT_LANG`).

## Yapılacak

- Kararı önce `docs/eposta-dili-karari.md` olarak yaz (Brif 07'nin
  `docs/en-url-karari.md`si gibi), sonra uygula.
- `IEmailSender` sözleşmesi değişirse `ConsoleEmailSender` ve
  `SmtpEmailSender` birlikte güncellenir.
- Konu satırı da çevrilir; adresler ve marka adı çevrilmez.

## Doğrulama

- Sunucu testi ZORUNLU (CLAUDE.md: "yeni bir uç yazarken kuralını da test
  et"). `ResendConfirmationTests.cs` deseni hazır: gönderilen postanın
  gövdesinde beklenen yolu arıyor. İki dil için karşılığını yaz.
- Yerelde uçtan uca: İngilizce arayüzden kayıt ol, `npm run stack`
  terminalindeki bağlantının `/en/confirm-email` olduğunu ve postanın
  İngilizce olduğunu gör.

---

# D. Brif 06 — Sunucu günü (ENGELLİ)

**Model/effort:** Sonnet 5, medium. Sunucu ALINDIĞINDA.

`docs/brifler/06-sunucu-gunu.md`. Sunucu henüz yok; TLS, alan adı, `deploy/.env`
ve CI'ın dağıtım adımı o gün bağlanır. **Bu brif açılmadan `VITE_SITE_URL`
gerçek alan adına çekilmelidir** — bugün placeholder ve sitemap ile 76 sayfanın
`canonical`/`hreflang` etiketleri onu taşıyor (`docs/en-url-karari.md` §6).

---

# E. Brif 08 — Rapor anlık görüntüsü — ✓ BİTTİ (2026-08-01)

**Model/effort:** Opus 5, medium. `docs/brifler/08-rapor-snapshot.md`.

Karar `docs/rapor-snapshot-karari.md`'de: belge baytları değil, üretimdeki
bölümlerin içerik-adresli kopyası donuyor. Künyedeki firma da donuyor (§27
boşluğu kapandı). Sunucu tarafı bitti; **istemcide rapor geçmişi ekranı yok**,
ayrım `GET /api/reports` → `hasSnapshot` ile yayımlandı.

Mevcut "saklamama" kararının gerekçesi güçlü; onu deviren gerekçe de yazılı
olmalı. Karar yazılmadan kod yazılmaz.

Bugün eklenen bir bağlam: rapor künyesindeki firma artık tek seferlik
düzenlenebiliyor ve **kütükte saklanmıyor** — geçmişten indirme bugünkü
profili yazıyor (`docs/uyelik-ve-rapor-plani.md` §27). Snapshot kararı bunu
doğrudan etkiler: künye de saklanacak mı, yoksa yalnız bölümler mi?

---

# F. Brif 09 — 2B alan çözücü (en büyük iş)

**Model/effort:** Fable/Opus 5, high-max. `docs/brifler/09-alan-cozucu.md`.

UCUZLATILAMAZ — yanlış sayısal sonuç sessizce yanlış mühendislik kararı
üretir. Diğer brifler bitmeden açma.

---

## Sıra önerisi

`A` → `B` → `C` sunucusuz yapıldı ve tek oturumda bitti (2026-07-31); üçü de
kendi bekçi testiyle kapandı. `E` ertesi gün bitti (2026-08-01).
**Kalan: `D` sunucuya bağlı, `F` ayrı ve en büyük iş.**
