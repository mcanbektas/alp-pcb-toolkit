// Yasal sayfaların iki dilli metni — `src/pages/tools/*/text.js` ile aynı desen:
// tek dış yüz `legalText(lang)`, mantık tek kopya, yalnız dizeler dile göre seçilir.
//
// ---------------------------------------------------------------------------
// BU METİN KOD TABANINDAN DOĞRULANARAK YAZILDI, HUKUKÇU ONAYINDAN GEÇMEDİ.
//
// Anlatılan her teknik olgu (hangi alan saklanıyor, ne kadar tutuluyor, neyin
// silindiği, IP'nin nereye yazıldığı) kaynak koddan çıkarıldı. Ama hangi
// olgunun hangi hukuki dayanağa oturduğu ve metnin KVKK m.10 karşısında
// yeterliliği HUKUKÇU İŞİDİR. Yayın öncesi okutulmalıdır.
// ---------------------------------------------------------------------------
//
// Metin çevrilirken de mantık tek kopya kalır: `if (lang === 'en')` ile ikinci
// bir dal açılmaz, yalnız `t({ tr, en })` çağrılır.

import { pick } from '../lib/i18n'

// ---------------------------------------------------------------------------
// DOLDURULMASI ZORUNLU — sayfalar bu değerler yer tutucu iken YAYINA ALINMAMALI.
//
// Ticari unvan, adres ve başvuru kanalı metnin hukuken bağlayıcı kısmıdır;
// uydurulamaz. Değerler girilene kadar sayfa üstünde görünür bir uyarı çizilir
// (`isControllerPlaceholder`), böylece eksik metin sessizce yayına giremez.
// ---------------------------------------------------------------------------
const PLACEHOLDER = '[DOLDURULACAK]'

export const CONTROLLER = {
  legalName: PLACEHOLDER, // Ticari unvan (ör. "... Mühendislik Sanayi ve Ticaret A.Ş.")
  address: PLACEHOLDER, // Açık adres
  taxOffice: PLACEHOLDER, // Vergi dairesi
  taxNumber: PLACEHOLDER, // VKN
  mersis: PLACEHOLDER, // MERSİS numarası (varsa)
  kep: PLACEHOLDER, // KEP adresi (varsa)
  contactEmail: PLACEHOLDER, // KVKK başvurularının geleceği adres
}

/** Kimlik bloğu hâlâ yer tutucu mu — sayfa buna bakıp uyarı çizer. */
export function isControllerPlaceholder() {
  return Object.values(CONTROLLER).some((v) => v === PLACEHOLDER)
}

// Metnin yürürlük tarihi. Metin değiştiğinde ELLE güncellenir — otomatik
// `new Date()` yazılmaz: "son güncelleme" tarihinin her açılışta bugünü
// göstermesi, hiç değişmemiş bir metni değişmiş gibi sunardı.
export const LEGAL_UPDATED = '2026-08-06'

export function legalText(lang) {
  const t = (dict) => pick(dict, lang)

  const controllerLine = t({
    tr: 'Veri sorumlusu',
    en: 'Data controller',
  })

  return {
    updated: LEGAL_UPDATED,
    updatedLabel: t({ tr: 'Son güncelleme', en: 'Last updated' }),
    controllerLine,

    placeholderWarning: t({
      tr: 'Bu metin henüz tamamlanmadı: veri sorumlusuna ait kimlik ve başvuru bilgileri doldurulmadı. Sayfa bu hâliyle yayına alınmamalıdır.',
      en: 'This text is incomplete: the data controller’s identity and contact details have not been filled in. The page must not go live in this state.',
    }),

    controllerLabels: {
      legalName: t({ tr: 'Ticari unvan', en: 'Legal name' }),
      address: t({ tr: 'Adres', en: 'Address' }),
      taxOffice: t({ tr: 'Vergi dairesi', en: 'Tax office' }),
      taxNumber: t({ tr: 'Vergi kimlik no', en: 'Tax number' }),
      mersis: t({ tr: 'MERSİS no', en: 'MERSIS no' }),
      kep: t({ tr: 'KEP adresi', en: 'Registered e-mail (KEP)' }),
      contactEmail: t({ tr: 'Başvuru adresi', en: 'Contact address' }),
    },

    docs: {
      // ---------------------------------------------------------------
      privacy: {
        lead: t({
          tr: 'Bu sayfa, ALP PCB Toolkit’i kullandığınızda hangi verilerin toplandığını, neden toplandığını, nerede saklandığını ve ne kadar süreyle tutulduğunu anlatır. Kanuni çerçeve için ayrıca KVKK Aydınlatma Metni’ne bakın.',
          en: 'This page explains what data is collected when you use ALP PCB Toolkit, why, where it is stored and for how long. For the statutory framework, see the Data Protection Notice as well.',
        }),
        sections: [
          {
            heading: t({ tr: 'Kısa özet', en: 'In short' }),
            list: [
              t({
                tr: 'Hesap açmadan bütün hesap araçları tam olarak çalışır; bu durumda sunucuya hiçbir hesap verisi gitmez.',
                en: 'Every calculation tool works fully without an account; in that case no calculation data reaches the server.',
              }),
              t({
                tr: 'Hesaplar tarayıcınızda yapılır. Hesap verisi sunucuya yalnızca iki açık eylemde gider: bir hesabı projeye kaydettiğinizde ve rapor (PDF/Excel) indirdiğinizde.',
                en: 'Calculations run in your browser. Calculation data reaches the server only on two explicit actions: saving a calculation to a project, and downloading a report (PDF/Excel).',
              }),
              t({
                tr: 'Site üçüncü taraf izleme, analitik ya da reklam betiği içermez. Dış yazı tipi, dış CDN ve çerez izni bandı yoktur, çünkü izleme çerezi kullanılmıyor.',
                en: 'The site contains no third-party tracking, analytics or advertising scripts. There are no external fonts, no external CDN and no cookie consent banner, because no tracking cookies are used.',
              }),
              t({
                tr: 'Hesabınızı kendiniz silebileceğiniz bir düğme henüz yok. Silme talebinizi aşağıdaki başvuru adresine yazarsanız hesabınız ve verileriniz silinir.',
                en: 'There is not yet a self-service button to delete your account. If you send a deletion request to the contact address below, your account and data will be deleted.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Hesap açtığınızda saklananlar', en: 'What is stored when you create an account' }),
            body: [
              t({
                tr: 'Kayıt için e-posta adresi, görünen ad ve parola istenir. Firma adı isteğe bağlıdır ve rapor künyesinde kullanılır. Parolanın kendisi saklanmaz; yalnızca geri döndürülemeyen özeti (hash) tutulur.',
                en: 'Registration requires an email address, a display name and a password. Company name is optional and is used on the report title block. The password itself is not stored; only an irreversible hash is kept.',
              }),
              t({
                tr: 'Bunların yanında hesabın güvenliği için kimlik altyapısının kendi alanları tutulur: e-posta doğrulanma durumu, başarısız giriş sayacı ve hesap kilidi bilgisi, oturum geçerlilik damgası. E-posta adresi kayıttan sonra değiştirilemez.',
                en: 'Alongside these, the identity framework keeps its own fields for account security: email confirmation status, failed sign-in counter and lockout state, and a session validity stamp. The email address cannot be changed after registration.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Kendi girdiğiniz içerik', en: 'Content you enter yourself' }),
            body: [
              t({
                tr: 'Proje adı ve açıklaması, kaydettiğiniz hesapların girdi ve sonuç verisi, ürettiğiniz raporların başlığı, hazırlayan adı ve firma bilgisi hesabınıza bağlı olarak saklanır. Sunucu hesap içeriğini yorumlamaz; onu opak bir veri bloğu olarak taşır.',
                en: 'Project name and description, the input and result data of calculations you save, and the title, preparer name and company on reports you generate are stored against your account. The server does not interpret calculation content; it carries it as an opaque block.',
              }),
              t({
                tr: 'Rapor indirdiğinizde belgenin bölüm içeriği üretim anında dondurulur ve saklanır. Bunun nedeni, geçmiş bir raporu tekrar indirdiğinizde projenin bugünkü hâlinin değil, raporun üretildiği andaki hâlinin basılmasıdır. Üretilen PDF/Excel dosyasının kendisi diske hiç yazılmaz.',
                en: 'When you download a report, the document’s section content is frozen at generation time and stored. The reason is that re-downloading a past report must reproduce the project as it was when the report was made, not as it is today. The generated PDF/Excel file itself is never written to disk.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Oturum, çerez ve IP adresi', en: 'Session, cookies and IP address' }),
            body: [
              t({
                tr: 'Oturumunuz açıkken tek bir çerez kullanılır: oturum yenileme çerezi. JavaScript’ten okunamaz, yalnızca kimlik uçlarına gönderilir, siteler arası isteklerde taşınmaz ve üretimde yalnızca HTTPS üzerinden iletilir. “Beni hatırla” seçiliyse en çok 30 gün yaşar, seçili değilse tarayıcı kapanınca silinir. Bu çerez oturumun sürmesi için teknik olarak zorunludur; izleme amacı taşımaz.',
                en: 'While you are signed in, a single cookie is used: the session refresh cookie. It cannot be read from JavaScript, is sent only to the authentication endpoints, is not carried on cross-site requests, and in production travels only over HTTPS. With “remember me” it lives at most 30 days; otherwise it is deleted when the browser closes. This cookie is technically required for the session to continue; it serves no tracking purpose.',
              }),
              t({
                tr: 'Oturum yenileme kaydına, o oturumun açıldığı IP adresi de yazılır. Amacı çalınmış bir oturumun tespiti ve kötüye kullanımın izlenmesidir. Yenileme anahtarının kendisi saklanmaz, yalnızca özeti tutulur.',
                en: 'The session refresh record also stores the IP address the session was opened from. Its purpose is detecting a stolen session and tracing abuse. The refresh key itself is not stored; only its hash is kept.',
              }),
              t({
                tr: 'Sunucu günlüklerine her isteğin IP adresi, istenen adres, tarayıcı tanıtıcısı ve yönlendiren adres yazılır; oturum açıksa kullanıcı kimliği de eklenir. Parola sıfırlama ve e-posta doğrulama bağlantılarındaki anahtarların günlüğe düşmemesi için adresin sorgu kısmı bilerek kırpılır.',
                en: 'Server logs record each request’s IP address, requested path, browser identifier and referring address; if a session is open, the user id is added. The query part of the address is deliberately stripped so that keys in password-reset and email-confirmation links never reach the logs.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Tarayıcınızda kalanlar', en: 'What stays in your browser' }),
            body: [
              t({
                tr: 'Bazı veriler sunucuya hiç gitmez, yalnızca tarayıcınızın yerel deposunda durur: kaydettiğiniz üretici (DFM) profilleri, clearance profilleri ve stack-up kayıtları. Bunlar cihazınızda kalır ve tarayıcı verisini temizlediğinizde silinir.',
                en: 'Some data never reaches the server and stays only in your browser’s local storage: manufacturer (DFM) profiles, clearance profiles and saved stack-ups. These remain on your device and are removed when you clear browser data.',
              }),
              t({
                tr: 'Giriş ekranında e-posta adresiniz, bir sonraki girişte hazır gelsin diye yerel depoya yazılır. Parola hiçbir koşulda yerel depoya yazılmaz. Oturum erişim anahtarı da diske yazılmaz; yalnızca sekme açıkken bellekte tutulur ve sayfa yenilendiğinde yeniden alınır.',
                en: 'On the sign-in screen your email address is written to local storage so it is prefilled next time. The password is never written to local storage under any circumstances. The session access key is not written to disk either; it is held in memory only while the tab is open and re-obtained on reload.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Üçüncü taraflar', en: 'Third parties' }),
            body: [
              t({
                tr: 'Sitede analitik, reklam, hata izleme ya da sosyal medya betiği yoktur. Yazı tipleri kendi sunucumuzdan verilir, dış bir yazı tipi servisine bağlanılmaz. Tarayıcının izlediği güvenlik politikası dış kaynak yüklenmesini zaten engeller.',
                en: 'The site contains no analytics, advertising, error-tracking or social media scripts. Fonts are served from our own server; no external font service is contacted. The browser security policy in force already blocks loading external resources.',
              }),
              t({
                tr: 'Verinin sunucumuzdan çıktığı tek olağan yol e-posta gönderimidir: hesap doğrulama ve parola sıfırlama iletileri bir e-posta servisi üzerinden gönderilir ve bu serviste alıcı adresiniz işlenir.',
                en: 'The only routine path by which data leaves our server is email delivery: account confirmation and password reset messages are sent through an email service, which processes your recipient address.',
              }),
            ],
            // Sağlayıcı seçilmediği için burası bilerek eksik — bkz. KVKK metni.
            note: t({
              tr: 'E-posta servisinin kim olduğu ve sunucularının nerede bulunduğu, sağlayıcı seçimi tamamlandığında bu metne eklenecektir.',
              en: 'The identity of the email service and the location of its servers will be added here once the provider has been selected.',
            }),
          },
          {
            heading: t({ tr: 'Saklama süreleri', en: 'Retention' }),
            list: [
              t({
                tr: 'Süresi dolmuş oturum yenileme kayıtları düzenli olarak silinir. İptal edilmiş ama süresi dolmamış kayıtlar, tekrar kullanım denemesini yakalayabilmek için süresi dolana kadar tutulur.',
                en: 'Expired session refresh records are deleted regularly. Revoked but unexpired records are kept until expiry so that a replay attempt can be detected.',
              }),
              t({
                tr: 'Hiçbir rapora bağlı olmayan dondurulmuş bölüm içerikleri düzenli olarak toplanır. Kullanıcı başına ayrılan alan aşıldığında en eski rapor içerikleri düşürülür; raporun kütük kaydı kalır, içeriği gider.',
                en: 'Frozen section contents no longer referenced by any report are collected regularly. When the per-user storage allowance is exceeded, the oldest report contents are dropped; the report’s log entry remains, its content does not.',
              }),
              t({
                tr: 'Rapor kütüğü (başlık, hazırlayan, firma, tarih) siz silmediğiniz sürece süresiz saklanır.',
                en: 'The report log (title, preparer, company, date) is kept indefinitely unless you delete it.',
              }),
              t({
                tr: 'Sunucu günlükleri için sabit bir süre tanımlı değildir; günlükler belirli bir hacme ulaşınca en eskisi silinir. Yoğunluğa göre bu genelde birkaç günlük bir pencereye denk gelir.',
                en: 'No fixed period is defined for server logs; once they reach a certain volume the oldest is discarded. Depending on traffic this usually amounts to a window of a few days.',
              }),
              t({
                tr: 'Veritabanı yedekleri sınırlı bir süre saklanır ve süresi dolanlar otomatik silinir.',
                en: 'Database backups are kept for a limited period and expired ones are deleted automatically.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Güvenlik', en: 'Security' }),
            body: [
              t({
                tr: 'Parolalar geri döndürülemez biçimde özetlenir. Oturum yenileme anahtarı veritabanında ham hâliyle değil özet olarak tutulur ve her yenilemede değişir. Parolanızı değiştirdiğinizde ya da sıfırladığınızda, o ana kadar verilmiş bütün oturum anahtarları geçersizleşir. Kimlik uçlarında hız sınırı ve arka arkaya hatalı denemede geçici hesap kilidi uygulanır.',
                en: 'Passwords are hashed irreversibly. The session refresh key is stored as a hash rather than in raw form and rotates on every renewal. When you change or reset your password, every session key issued until that moment is invalidated. Rate limiting applies on authentication endpoints, and repeated failed attempts temporarily lock the account.',
              }),
              t({
                tr: 'Hiçbir önlem mutlak değildir. Hesabınıza yalnız o siteye özgü, başka yerde kullanmadığınız bir parola koyun.',
                en: 'No measure is absolute. Use a password unique to this site and not reused anywhere else.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Haklarınız ve iletişim', en: 'Your rights and contact' }),
            body: [
              t({
                tr: 'Verilerinize erişme, düzeltme, silinmesini isteme ve işlemeye itiraz etme haklarınız vardır. Hakların tam listesi ve kanuni dayanağı KVKK Aydınlatma Metni’ndedir. Talepleriniz için aşağıdaki adrese yazabilirsiniz.',
                en: 'You have the right to access, correct and request deletion of your data, and to object to its processing. The full list of rights and their statutory basis is in the Data Protection Notice. You may write to the address below for any request.',
              }),
            ],
          },
        ],
      },

      // ---------------------------------------------------------------
      kvkk: {
        lead: t({
          tr: '6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 10. maddesi uyarınca, veri sorumlusu sıfatıyla aydınlatma yükümlülüğümüzü yerine getirmek üzere hazırlanmıştır.',
          en: 'Prepared to fulfil our disclosure obligation as data controller under Article 10 of Turkish Personal Data Protection Law no. 6698 (KVKK).',
        }),
        sections: [
          {
            heading: t({ tr: 'İşlenen kişisel veriler', en: 'Personal data processed' }),
            list: [
              t({
                tr: 'Kimlik ve iletişim verisi: e-posta adresi, görünen ad, isteğe bağlı firma adı.',
                en: 'Identity and contact data: email address, display name, optional company name.',
              }),
              t({
                tr: 'İşlem güvenliği verisi: parola özeti, e-posta doğrulama durumu, başarısız giriş sayacı ve hesap kilidi bilgisi, oturum geçerlilik damgası, oturum yenileme kaydı ve bu kayda yazılan IP adresi.',
                en: 'Transaction security data: password hash, email confirmation status, failed sign-in counter and lockout state, session validity stamp, session refresh record and the IP address written to it.',
              }),
              t({
                tr: 'Kullanıcı içeriği: proje adı ve açıklaması, kaydedilen hesapların girdi ve sonuç verisi, rapor başlığı, hazırlayan adı, rapor künyesindeki firma bilgisi ve raporun üretim anında dondurulan bölüm içeriği.',
                en: 'User content: project name and description, input and result data of saved calculations, report title, preparer name, the company on the report title block, and the section content frozen at report generation time.',
              }),
              t({
                tr: 'Günlük kayıtları: istek anındaki IP adresi, istenen adres, tarayıcı tanıtıcısı, yönlendiren adres ve oturum açıksa kullanıcı kimliği.',
                en: 'Log records: IP address at request time, requested path, browser identifier, referring address, and the user id if a session is open.',
              }),
            ],
          },
          {
            heading: t({ tr: 'İşleme amaçları', en: 'Purposes of processing' }),
            list: [
              t({
                tr: 'Üyelik kaydının oluşturulması ve sürdürülmesi, kimlik doğrulama, oturum yönetimi.',
                en: 'Creating and maintaining membership records, authentication, session management.',
              }),
              t({
                tr: 'Kullanıcının kendi projelerini, hesaplarını ve raporlarını saklaması ve tekrar erişmesi.',
                en: 'Enabling the user to store and re-access their own projects, calculations and reports.',
              }),
              t({
                tr: 'Bilgi güvenliğinin sağlanması: yetkisiz erişimin tespiti, kötüye kullanımın ve otomatik saldırının engellenmesi, arıza tespiti.',
                en: 'Ensuring information security: detecting unauthorised access, preventing abuse and automated attacks, fault diagnosis.',
              }),
              t({
                tr: 'Hesap doğrulama ve parola sıfırlama iletilerinin gönderilmesi.',
                en: 'Sending account confirmation and password reset messages.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Toplama yöntemi ve hukuki sebep', en: 'Method of collection and legal basis' }),
            body: [
              t({
                tr: 'Kişisel veriler, siteyi kullanmanız sırasında elektronik ortamda, doğrudan sizin girdiğiniz bilgiler ve isteklerinizin teknik kayıtları yoluyla toplanır.',
                en: 'Personal data is collected electronically while you use the site, through information you enter directly and through technical records of your requests.',
              }),
            ],
            list: [
              t({
                tr: 'Üyelik ve içerik verisi: sözleşmenin kurulması ve ifası için gerekli olması (m. 5/2-c).',
                en: 'Membership and content data: necessity for the conclusion and performance of a contract (Art. 5/2-c).',
              }),
              t({
                tr: 'İşlem güvenliği ve günlük kayıtları: veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi (m. 5/2-ç) ve ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaat (m. 5/2-f).',
                en: 'Transaction security and log records: compliance with a legal obligation of the controller (Art. 5/2-ç) and legitimate interest, provided it does not harm the data subject’s fundamental rights and freedoms (Art. 5/2-f).',
              }),
            ],
          },
          {
            heading: t({ tr: 'Aktarım', en: 'Transfers' }),
            body: [
              t({
                tr: 'Kişisel verileriniz satılmaz, pazarlama amacıyla paylaşılmaz. Yurt içinde, hizmetin sürdürülmesi için sunucu barındırma sağlayıcısı ile sınırlı olarak işlenir.',
                en: 'Your personal data is not sold and is not shared for marketing purposes. Domestically it is processed on a limited basis with the hosting provider in order to keep the service running.',
              }),
              t({
                tr: 'Hesap doğrulama ve parola sıfırlama iletilerinin gönderilebilmesi için e-posta adresiniz bir e-posta gönderim servisine aktarılır.',
                en: 'To deliver account confirmation and password reset messages, your email address is transferred to an email delivery service.',
              }),
            ],
            note: t({
              tr: 'Bu servisin kimliği ve sunucularının bulunduğu ülke henüz belirlenmemiştir. Sağlayıcı yurt dışındaysa aktarım Kanun’un 9. maddesine tabi olacak ve bu bölüm buna göre güncellenecektir.',
              en: 'The identity of this service and the country where its servers are located have not yet been determined. If the provider is abroad, the transfer will be subject to Article 9 of the Law and this section will be updated accordingly.',
            }),
          },
          {
            heading: t({ tr: 'İlgili kişinin hakları (m. 11)', en: 'Rights of the data subject (Art. 11)' }),
            body: [
              t({
                tr: 'Veri sorumlusuna başvurarak şu haklara sahipsiniz:',
                en: 'By applying to the data controller you have the following rights:',
              }),
            ],
            list: [
              t({
                tr: 'Kişisel verinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme.',
                en: 'To learn whether your personal data is being processed and, if so, to request information about it.',
              }),
              t({
                tr: 'İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.',
                en: 'To learn the purpose of processing and whether the data is used in accordance with that purpose.',
              }),
              t({
                tr: 'Yurt içinde veya yurt dışında verinin aktarıldığı üçüncü kişileri bilme.',
                en: 'To know the third parties to whom the data is transferred, domestically or abroad.',
              }),
              t({
                tr: 'Eksik veya yanlış işlenmişse düzeltilmesini isteme.',
                en: 'To request rectification if the data is incomplete or inaccurate.',
              }),
              t({
                tr: 'Kanun’un 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme.',
                en: 'To request erasure or destruction within the conditions of Article 7 of the Law.',
              }),
              t({
                tr: 'Düzeltme, silme ve yok etme işlemlerinin verinin aktarıldığı üçüncü kişilere bildirilmesini isteme.',
                en: 'To request that rectification, erasure and destruction be notified to third parties to whom the data was transferred.',
              }),
              t({
                tr: 'Münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonuç doğmasına itiraz etme.',
                en: 'To object to a result against you arising from analysis solely by automated systems.',
              }),
              t({
                tr: 'Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme.',
                en: 'To claim compensation for damage arising from unlawful processing.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Başvuru yolu', en: 'How to apply' }),
            body: [
              t({
                tr: 'Taleplerinizi aşağıdaki başvuru adresine, hesabınızda kayıtlı e-posta adresinden iletebilirsiniz. Başvurular en geç otuz gün içinde sonuçlandırılır.',
                en: 'You may send your requests to the contact address below, from the email address registered to your account. Applications are concluded within thirty days at the latest.',
              }),
              t({
                tr: 'Hesabınızı arayüzden kendiniz silmenizi sağlayan bir özellik henüz bulunmamaktadır. Silme talebiniz üzerine hesabınız ve ona bağlı proje, hesap ve rapor kayıtları silinir; mevzuat gereği saklanması gereken kayıtlar varsa süresi dolana kadar saklanır.',
                en: 'A feature allowing you to delete your account yourself from the interface is not yet available. Upon your deletion request, your account and the projects, calculations and reports attached to it are deleted; any records that must be retained by law are kept until their retention period ends.',
              }),
            ],
          },
        ],
      },

      // ---------------------------------------------------------------
      terms: {
        lead: t({
          tr: 'ALP PCB Toolkit’i kullanarak aşağıdaki şartları kabul etmiş olursunuz.',
          en: 'By using ALP PCB Toolkit you accept the following terms.',
        }),
        sections: [
          {
            heading: t({ tr: 'Hizmetin tanımı', en: 'The service' }),
            body: [
              t({
                tr: 'ALP PCB Toolkit, baskı devre tasarımı için çevrim içi mühendislik hesap araçları sunar. Araçların tamamı hesap açmadan kullanılabilir. Hesap açmak, hesaplarınızı projelere kaydetmenizi ve rapor üretmenizi sağlar.',
                en: 'ALP PCB Toolkit provides online engineering calculation tools for printed circuit board design. All tools can be used without an account. An account lets you save calculations to projects and generate reports.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Mühendislik sorumluluk sınırı', en: 'Engineering liability limit' }),
            body: [
              t({
                tr: 'Bu sitedeki sonuçlar yaklaşık mühendislik tahminleridir. Doğrulanmış tasarım, üretim onayı ya da uygunluk beyanı yerine geçmez. Kullanılan denklemler, geçerlilik sınırları ve yöntemin sınırlamaları her aracın kendi sayfasında belirtilir; kullanmadan önce okunması beklenir.',
                en: 'Results on this site are approximate engineering estimates. They do not substitute for verified design, manufacturing approval or a declaration of conformity. The equations used, their validity limits and the method’s limitations are stated on each tool’s own page and are expected to be read before use.',
              }),
              t({
                tr: 'Nihai tasarım kararının doğrulanması kullanıcının sorumluluğundadır. Bu araçların çıktısına dayanılarak alınan kararlardan, üretim hatalarından veya doğabilecek zararlardan sorumluluk kabul edilmez.',
                en: 'Verifying the final design decision is the user’s responsibility. No liability is accepted for decisions taken in reliance on the output of these tools, for manufacturing defects, or for any damages that may arise.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Hesap kuralları', en: 'Account rules' }),
            list: [
              t({
                tr: 'Kayıt sırasında doğru bilgi vermeniz ve erişebildiğiniz bir e-posta adresi kullanmanız gerekir; hesap doğrulaması zorunludur.',
                en: 'You must provide accurate information at registration and use an email address you can access; account confirmation is required.',
              }),
              t({
                tr: 'Hesabınızın ve parolanızın güvenliğinden siz sorumlusunuz. Hesabınızı başkasıyla paylaşmayın.',
                en: 'You are responsible for the security of your account and password. Do not share your account with others.',
              }),
              t({
                tr: 'Servisi otomatik araçlarla aşırı yüklemek, güvenlik önlemlerini aşmaya çalışmak ya da başkalarının verisine erişmeye teşebbüs etmek yasaktır.',
                en: 'Overloading the service with automated tools, attempting to bypass security measures, or attempting to access other users’ data is prohibited.',
              }),
              t({
                tr: 'Bu kuralların ihlali hâlinde hesap askıya alınabilir veya kapatılabilir.',
                en: 'In case of breach of these rules, the account may be suspended or closed.',
              }),
            ],
          },
          {
            heading: t({ tr: 'İçeriğiniz', en: 'Your content' }),
            body: [
              t({
                tr: 'Girdiğiniz proje, hesap ve rapor verisi size aittir. Bu veriyi yalnızca hizmeti sunmak için işleriz; içeriğinizi kullanmaz, üçüncü kişilere satmaz ve pazarlama amacıyla paylaşmayız.',
                en: 'The project, calculation and report data you enter belongs to you. We process it solely to provide the service; we do not use your content, sell it to third parties or share it for marketing purposes.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Erişilebilirlik ve değişiklikler', en: 'Availability and changes' }),
            body: [
              t({
                tr: 'Hizmet kesintisiz sunulacağı taahhüdüyle verilmez; bakım, arıza veya teknik zorunluluklar nedeniyle geçici olarak erişilemeyebilir. Araçlar, hesap yöntemleri ve bu şartlar zaman içinde değişebilir. Önemli değişikliklerde bu sayfadaki tarih güncellenir.',
                en: 'The service is not offered with a guarantee of uninterrupted availability; it may be temporarily unreachable due to maintenance, faults or technical necessity. Tools, calculation methods and these terms may change over time. On significant changes, the date on this page is updated.',
              }),
            ],
          },
          {
            heading: t({ tr: 'Uygulanacak hukuk', en: 'Governing law' }),
            body: [
              t({
                tr: 'Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda veri sorumlusunun bulunduğu yer mahkemeleri ve icra daireleri yetkilidir.',
                en: 'These terms are governed by the laws of the Republic of Türkiye. In disputes, the courts and enforcement offices of the data controller’s location have jurisdiction.',
              }),
            ],
          },
        ],
      },
    },
  }
}
