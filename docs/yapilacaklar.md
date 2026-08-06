# Yapılacaklar — yayına çıkmadan önce (2026-08-06)

Bu dosya **kod işi değildir**. Beşi de dışarıdan bilgi bekliyor: alan adı, şirket
bilgileri, e-posta servisi hesabı, hukukçu görüşü, yönetici e-postası. Kod tarafı
hazır ve yeşil; her maddede "nereye yazılacak" tek satırla gösterildi.

Kod tarafındaki kalan iş `docs/kalan.md`tedir (sunucu günü = `docs/brifler/06-sunucu-gunu.md`).

Sıra: **2, 4 ve 5 şimdi yapılabilir** (sunucu gerekmez; hukukçu boş kimlik bloğunu
okuyamaz, o yüzden önce 2 sonra 4). **1 ve 3 alan adı/sunucu alınınca**, sunucu
gününün içinde.

---

## 1. Alan adı → `VITE_SITE_URL`

**Ne:** Sitenin mutlak kök adresi. Alan adı henüz alınmadı.

**Nerede:** `web/scripts/site-url.mjs` — değişken yoksa `https://alp-pcb-toolkit.example`
basar ve konsola uyarı yazar. Yazılacak yer: `deploy/.env` (`VITE_SITE_URL=https://…`).
Şu an `deploy/.env:54` yerel değeri (`http://localhost:8080`) tutuyor, `.env.example:32` boş.

**Neden bekliyor:** Alan adı satın alınmadı.

**Yapılmazsa:** Adres yalnız `sitemap.xml`e değil, 76 sayfanın `<head>`indeki **canonical ve
hreflang** etiketlerine de yazılır. Yayına çıkan site kendini var olmayan bir alan adına
canonical'lar; arama motoru sayfaları kendi adresinde saymaz.

**Bağlı olduğu iş:** Sunucu günü (Brif 06). Aynı gün robots.txt'ye `Sitemap:` satırı ve
`APP_DOMAIN` için A kaydı da giriyor (`deploy/README.md:70`).

---

## 2. Veri sorumlusu kimlik bloğu (`CONTROLLER`)

**Ne:** Yasal metinlerin tepesinde çıkan kimlik/başvuru bilgileri. Yedi alanın hepsi hâlâ
yer tutucu.

**Nerede:** `web/src/data/legalText.js:27-35`

| Alan | Karşılığı |
|---|---|
| `legalName` | Ticari unvan |
| `address` | Açık adres |
| `taxOffice` | Vergi dairesi |
| `taxNumber` | VKN |
| `mersis` | MERSİS numarası (varsa) |
| `kep` | KEP adresi (varsa) |
| `contactEmail` | KVKK başvurularının geleceği adres |

**Neden bekliyor:** Şirket bilgileri verilmedi.

**Yapılmazsa:** `isControllerPlaceholder()` (aynı dosya, satır 38) yer tutucuyu görüp üç
yasal sayfanın tepesine uyarı çizer: *"Bu metin henüz tamamlanmadı… Sayfa bu hâliyle yayına
alınmamalıdır."* KVKK Aydınlatma Metni, veri sorumlusunun kimliği olmadan aydınlatma
yükümlülüğünü karşılamaz.

**Dikkat:** Şahıs firmasıysa `mersis`/`kep` gerçekten yok olabilir — o zaman alanı
`PLACEHOLDER` bırakma, "—" ya da "yok" yaz. `PLACEHOLDER` kaldığı sürece uyarı sönmez
(fonksiyon `some()` ile bakıyor, biri bile kalsa uyarı çıkar).

**Metin değişirse:** `LEGAL_UPDATED` (satır 45) **elle** güncellenir. Otomatik tarih
bilerek yazılmadı.

---

## 3. SMTP hesabı + gönderici DNS kayıtları

**Ne:** E-posta doğrulama ve parola sıfırlama iletilerinin gerçekten gitmesi.

**Nerede:** `deploy/docker-compose.yml` → `Smtp__Host`, `Smtp__Port`, `Smtp__User`,
`Smtp__Password`, `Smtp__FromAddress`, `Smtp__FromName`, `Smtp__Security`. Değerler
`deploy/.env`ten okunuyor.

**Neden bekliyor:** E-posta servisi hesabı açılmadı.

**Yapılmazsa:** `Smtp__Host` boşken uygulama `ConsoleEmailSender`a düşer — postalar yalnız
günlüğe yazılır, kimseye ulaşmaz. Üretimde bunun anlamı: **kayıt akışı çalışmaz**
(kullanıcı e-postasını doğrulayamaz, parola sıfırlayamaz). Hata da vermez; sessizce
günlüğe düşer.

**DNS tarafı:** Sunucu IP'si için A kaydı `deploy/README.md:70`de yazılı. Gönderici alan
adı için ayrıca **SPF ve DKIM** gerekir (DMARC isteğe bağlı) — bunlar seçilen e-posta
servisinin verdiği kayıtlardır, repoda dokümante değil, sunucu gününde `deploy/README.md`e
eklenecek.

**Bağlı olduğu iş:** Sunucu günü (Brif 06).

---

## 4. Yasal metinlerin hukukçu okuması

**Ne:** Üç metnin bir hukukçu tarafından doğrulanması.

**Nerede:** `web/src/data/legalText.js` (TR + EN, tek dosya). Sayfalar:

- `/gizlilik` · `/en/privacy` — Gizlilik Politikası
- `/kvkk-aydinlatma-metni` · `/en/data-protection-notice` — KVKK Aydınlatma Metni
- `/kullanim-sartlari` · `/en/terms-of-use` — Kullanım Şartları

**Neden bekliyor:** Metinler teknik gerçeğe göre yazıldı — hangi veri toplanıyor, nerede
duruyor, ne kadar tutuluyor, hangi hukuki sebeple — ama hukukçu okumadı.

**Özellikle baktırılacak:**

- Hukuki sebep eşleşmeleri (KVKK 5/2-ç hukuki yükümlülük, 5/2-f meşru menfaat)
- Saklama süreleri ve kanunen tutulması gereken kayıtların silmeden istisna edilmesi
- Mühendislik sorumluluk sınırı maddesi (Kullanım Şartları)
- Yetkili mahkeme/icra dairesi maddesi
- Sunucu günlüğü kapsamı: IP, istenen adres, tarayıcı tanıtıcısı, yönlendiren, oturum
  açıksa kullanıcı kimliği (sorgu kısmı token sızmasın diye bilerek kırpılıyor)

**Sıra notu:** Madde 2'den sonra yapılmalı. Hukukçuya kimlik bloğu boş metin gönderilirse
zaten "eksik" diye geri döner.

**Metin değişirse:** `LEGAL_UPDATED` elle güncellenir (bkz. madde 2).

---

## 5. Yönetici e-postası (`ADMIN_EMAILS`)

**Ne:** Yönetim panelini (`/yonetim`, `/en/admin`) görebilecek hesabın e-postası.

**Nerede:** `deploy/.env` → `ADMIN_EMAILS=...` (virgülle birden fazla yazılabilir).
Compose değişkeni `App__AdminEmails`. Yerelde denemek için:
`App__AdminEmails='sen@ornek.test' npm run stack`.

**Neden bekliyor:** Hangi hesabın yönetici olacağı belli değil.

**Yapılmazsa:** Panel kimseye açılmaz — `/yonetim` adresi "bu sayfa yönetim yetkisi
ister" notu gösterir, uçlar 403 döner. Kayıt silme yolu kapalı kalır.

**Bilinmesi gerekenler:**

- Yetkinin **tek kaynağı** bu değişkendir. Panelden, kayıttan ya da başka bir uçtan
  admin olunamaz; ele geçirilmiş bir yönetici oturumu kalıcı ikinci bir admin açamaz.
- Listeden çıkarılan hesabın yetkisi bir sonraki açılışta **geri alınır**.
- Adres henüz kayıtlı değilse günlüğe uyarı düşer; o hesap kayıt olduğu anda yetkiyi
  alır (yeniden başlatma beklenmez).
- Yönetici kendi hesabını da başka bir yöneticiyi de silemez. Bir yöneticiyi silmek
  gerekirse önce bu listeden çıkarılır, `api` yeniden başlatılır, sonra sıradan
  kullanıcı olarak silinir.

---

## Bugüne kadar yapılanlar (tekrar önerme)

- `866661c` — gizlilik, KVKK ve kullanım şartları sayfaları (TR/EN, prerender'a dahil)
- `27ec4a3` — kullanıcının kendi hesabını silmesi (hesap ekranı, parola onayı arkasında)
- `158e7da` — yasal metinler artık var olan silme özelliğini tarif ediyor; KVKK sayfasında
  e-posta kanalı tek yol değil, alternatif olarak duruyor
- **Kullanıcının kendi hesabını silmesi KALDIRILDI** (ekran + uç). Silme yalnızca
  yönetim panelinden yapılır; kullanıcı talebini başvuru adresine iletir. Yasal
  metinler bu yeni duruma göre düzeltildi (`legalText.js`), yani KVKK metnindeki
  silme hakkı artık başvuru kanalı üzerinden anlatılıyor.
- **Yönetim paneli eklendi**: rol altyapısı (`AddRoles`), `App:AdminEmails` ile
  açılışta yetki eşitleme (`AdminSeeder`), `GET /api/admin/users` (sayfalama +
  arama) ve `POST /api/admin/users/{id}/delete` (isteyenin parolasıyla).
