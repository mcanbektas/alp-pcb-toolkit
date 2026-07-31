# E-posta dili kararı — 2026-07-31

Brif: `docs/brifler/10-kalan-isler.md` → C. Önkoşulu Brif 07 bitti;
`docs/en-url-karari.md` §8 bu işi adıyla erteliyordu.

## Sorun

`api/Alp.Api/Auth/AuthEndpoints.cs` üç posta gönderir: kayıt denemesi
bildirimi, e-posta doğrulama ve parola sıfırlama. Üçünün de konusu ve gövdesi
çakılı Türkçeydi; ürettikleri bağlantılar da Türkçe yollara gidiyordu
(`{FrontendBaseUrl}/e-posta-dogrula`, `/parola-sifirla`).

İngilizce arayüzden kayıt olan kullanıcı Türkçe posta alıyor ve Türkçe sayfaya
düşüyordu. Kırık değil, **tek dilli** — arayüzün geri kalanı iki dilli olduğu
için tutarsız.

## 1. Dil sunucuya nasıl taşınır — istek gövdesinde `lang`

Üç istek sözleşmesi isteğe bağlı bir `Lang` alanı taşır: `RegisterRequest`,
`ForgotPasswordRequest`, `ResendConfirmationRequest`. Alan **isteğe bağlıdır ve
varsayılanı yoktur** (`null`); sunucu tanımadığı ya da verilmeyen değeri
Türkçeye düşürür (§4). Eski istemci gövdesi bu yüzden kırılmaz.

Elenenler:

- **`Accept-Language` başlığı.** Tarayıcının dili ile kullanıcının SEÇTİĞİ
  arayüz dili aynı şey değil: İngilizce Chrome'da Türkçe arayüz kullanan biri
  İngilizce posta alırdı. Site zaten dili URL'den okuyor
  (`docs/en-url-karari.md` §3); ikinci bir kaynak eklemek o kararı deler.
- **Kullanıcı kaydında kalıcı tercih.** "Hesabın dili" diye YENİ bir kavram
  doğururdu: nerede değiştirilir, arayüz diliyle çeliştiğinde hangisi kazanır,
  profil ekranına bir alan gerekir mi. İstenmedi, yazılmadı. Postayı tetikleyen
  isteğin dili zaten o anda kullanıcının gördüğü dildir.

İstemci tarafında dil ekrandan tek tek geçirilmez: `hooks/useAuth.jsx` bağın
tek yeridir ve `useLang()`ten okuyup gövdeye kendisi koyar (sağlayıcı sırası
buna elverir — `AuthProvider`, `LangProvider`ın İÇİNDEDİR). Ekran başına
geçirilseydi bir ekranın unutması sessizce Türkçe postaya düşerdi.

## 2. Metin sunucuda durur — kural bilinçli olarak deliniyor

`CLAUDE.md`'nin kuralı net: *sunucu kullanıcı metni tanımaz*. Rapor çerçevesi
bu yüzden yükle birlikte gidiyor (`reportLabels`).

**Postalarda bu kural uygulanmıyor ve bu bilinçli bir istisnadır.** Gerekçe
güvenliktir: posta gövdesini istemci belirlerse, kayıt/parola-sıfırlama uçları
seçilen herhangi bir adrese seçilen herhangi bir metni gönderen bir yüzeye
dönüşür — kendi alan adımızdan çıkan, bizim markamızı taşıyan kimlik avı
postası. Rapor çerçevesinde böyle bir risk yok: o metin yalnızca isteği yapanın
kendi indirdiği dosyaya giriyor, üçüncü bir tarafa POSTALANMIYOR.

Bu yüzden metin sunucuda, iki dilli tek bir sözlükte durur:
`api/Alp.Api/Auth/AuthEmailText.cs`. İstemciden gelen tek şey **dil kodudur**,
metnin kendisi değil.

Konu satırı da çevrilir. Çevrilmeyenler: adresler, token'lar ve marka adı
(*ALP PCB Toolkit*).

## 3. Bağlantı yolu — sunucuda küçük bir tablo + istemcide bekçi test

`en` dilinde bağlantılar `{FrontendBaseUrl}/en/confirm-email` ve
`/en/reset-password` olur. Yol sözlüğünün asıl kaynağı istemcidedir
(`web/src/lib/routes.js` → `STATIC_ROUTES`); sunucuda ikinci bir kopya doğuyor
ve **kopyanın ayrışması kırık bağlantı demek** — postadaki bağlantı 404'e
gider, kullanıcı hesabını doğrulayamaz.

Seçilen yol: sunucuda dört satırlık sabit bir tablo (`AuthEmailText.Paths`) ve
istemci tarafında bir bekçi test (`web/src/lib/authMailPaths.guard.test.js`)
— test C# dosyasını METİN olarak okur, yolları çıkarır ve `staticPath` ile
karşılaştırır. Ayrışan gün derleme değil, test düşer.

Elenenler: yolu istemcinin göndermesi (§2'deki kimlik avı yüzeyinin aynısı —
bağlantı hedefini istemci belirlerdi), sunucunun `routes.js`i derleme anında
okuyup üretmesi (iki yığın arasında derleme bağı; dört satır için ağır), ve
tek bir yolun iki dile de hizmet etmesi (İngilizce kullanıcı Türkçe sayfaya
düşmeye devam ederdi — düzeltilmek istenen şeyin ta kendisi).

## 4. Dil bilinmiyorsa Türkçe

`AuthEmailText.Normalize` yalnızca `tr` ve `en` tanır; boş, null ya da
tanınmayan değer `tr`ye düşer — `lib/i18n.js`'teki `DEFAULT_LANG` ile aynı
kural. Büyük/küçük harf ve `en-US` gibi bölge ekleri de kabul edilir
(`en-US` → `en`): postayı tetikleyen istek bir tarayıcıdan geliyor ve dil kodu
oradan geçerken biçim değiştirebilir.

## 5. `IEmailSender` sözleşmesi değişmedi

Gönderici hâlâ `(toEmail, subject, htmlBody)` alır: dil, gönderilecek metne
ÇÖZÜLDÜKTEN sonra çağrılır. `ConsoleEmailSender` ve `SmtpEmailSender` bu yüzden
tek satır bile değişmedi — dil bilmeleri gerekmiyor, gövdeyi taşıyorlar.

## 6. Doğrulama

- Sunucu testi: `api/Alp.Api.Tests/AuthEmailLanguageTests.cs` — doğrulama ve
  parola sıfırlama postası için iki dil, tanınmayan dilin Türkçeye düşmesi ve
  bağlantı yolunun dile göre değişmesi.
- İstemci bekçisi: `web/src/lib/authMailPaths.guard.test.js` — sunucudaki yol
  tablosu ile `routes.js` ayrışamaz.
- Yerelde uçtan uca: İngilizce arayüzden (`/en/register`) kayıt ol,
  `npm run stack` terminaline düşen postanın İngilizce olduğunu ve bağlantının
  `/en/confirm-email` taşıdığını gör.

## 7. Kapsam dışı

- **Kayıt denemesi bildirimi** (`Register` içindeki "bu adresle hesap açılmaya
  çalışıldı") de çevrildi; postayı tetikleyen isteğin dili kullanılır. Bu
  postanın alıcısı hesabın gerçek sahibidir ve onun dili bilinmiyor — istek
  bir saldırgandan da geliyor olabilir. Dil seçimi burada bir tahmindir ve
  içeriği güvenlik açısından zararsızdır (token taşımaz); daha iyisi kalıcı
  hesap dili olurdu, o da §1'de elendi.
- Rapor ve arayüz metinleri bu kararın dışında; onların yeri değişmedi.
