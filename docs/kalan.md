# Kalan işler — 2026-08-04

Durum: Brif 01–05, 07, 08, 10 (A/B/C/E) ve **Brif 09'un üç fazı (F1–F3) BİTTİ**
(son commit `ccb1644`, main'e push'lu; testler 2017 birim + 25 e2e yeşil).
Bunları yeniden önerme/yapma. Kararlar ve ölçümler: `docs/alan-cozucu-karari.md`.

## Zorunlu kalan işler

### Brif 06 — sunucu günü (`docs/brifler/06-sunucu-gunu.md`)

Sunucu SATIN ALININCA yapılır; öncesinde başlanamaz. Kapsamında ayrıca:

- CI'a e2e job'ı eklenmesi (bilerek sunucu gününe bırakıldı — CLAUDE.md "Komutlar").
- `VITE_SITE_URL`'in `deploy/.env`'e girmesi (şu an sitemap/canonical/hreflang
  placeholder alan adı basıyor; `scripts/site-url.mjs` uyarısı).
- Dağıtım runbook'u: `deploy/README.md`.

Oturum açarken: brifi + `deploy/README.md` oku. Öneri: sonnet · high.

### Brif 11 — loglama yapısı (`docs/brifler/11-loglama.md`)

Yapı çıkarıldı (2026-08-06), uygulama BAŞLAMADI. Sunucu beklemez — dört fazın
tamamı yerelde yazılıp doğrulanır: F1 denetim izi tablosu (`AuditEvents` +
`AuditLog`), F2 panel Günlük sekmesi (`/yonetim/gunluk`), F3 saklama süresi +
yasal metin uyumu, F4 Docker log sınırları + nginx stdout doğrulaması. En
kritik boşluk: yönetici hesap silmesi bugün İZ BIRAKMIYOR (E1) ve compose'da
log rotasyon sınırı yok — disk dolabilir (E3). Fazların model önerileri
brifte; oturum açarken brifi + `docs/loglama-karari.md` oku.

## İsteğe bağlı küçük ekler (istenirse ayrı iş; kayıt: alan-cozucu-karari.md §18)

Hiçbiri zorunlu değil. Her biri için karar dosyasına ölçüm/gerekçe yazılır.

1. **Çözücü tabanlı parametrik tarama grafiği** (DiffPair'in F2'de sökülen
   grafiğinin çözücülü karşılığı). Kaba yoğunlukta ~15 nokta worker taraması;
   bütçe ölçümü şart. Öneri: opus · high.
2. **§7.6 TAM çok iletkenli crosstalk rotası** (FFT'li dalga biçimi). Brif 09
   bile kapsam dışı bıraktı — ÖNCE ayrı brif yazılır. Büyük iş.
3. **Skew farklı-katman εeff,N için çözücü kaynağı** — ikinci worker bağı;
   küçük ek. Öneri: sonnet · medium.
4. **Trapez/mask/gömülü seçeneklerinin çifte ve gcpw'ye taşınması** — motor
   kurulumuna parametre geçirmek yeter, iş ekran/metin tarafında. Öneri:
   sonnet · high.
5. **Mask/gömülü için ayrı örtü εr'si** (şimdi substrat εr varsayılıyor,
   gömülüde) — küçük ek.
6. **Geometri ayrıntılarının sentezle etkileşimi** — sentez kök araması şimdi
   dikdörtgen varsayar; solver-in-loop genişlik sentezine seçenek geçirmek
   küçük ek (aynı kurulum fonksiyonu).

## Bilinen teknik borç (brif dışı, CLAUDE.md'de kayıtlı)

- PWA ikonları 64 px favicon'dan büyütülmüş — gerçek marka varlığı gelince
  değiştirilecek.
- Trace hesabında kullanıcı veri seti içe aktarma planı (lisanslı veri repoya
  giremez; desen DFM profillerinde hazır) — spec §4.1.4 rotası.

## Oturum başlatma notu

Yeni oturumda önce bu dosyayı + ilgili brifi oku; alan çözücü işine dokunacaksan
`docs/alan-cozucu-karari.md` §1–§18 karar kaydıdır, kararlar oturum içinde
yeniden tartışılmaz (ölçüm devirirse dosyaya yazılıp değişir).
