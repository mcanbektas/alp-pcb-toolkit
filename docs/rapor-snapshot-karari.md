# Rapor anlık görüntüsü (snapshot) kararı — 2026-08-01

Brif: `docs/brifler/08-rapor-snapshot.md` (tasarım brifi, spec değil) ve
`docs/brifler/10-kalan-isler.md` → E. Bu belge o brifin "o gün karara
bağlanacaklar" listesinin karşılığıdır.

Önce okunacak: `docs/kod-incelemesi-2026-07-29.md` → "Üretilen rapor
dosyalarında saklama sınırı yok" (devrilen kararın gerekçesi) ve
`docs/uyelik-ve-rapor-plani.md` §27 (künyedeki firma alanı).

## Devrilen karar ve neden deviriliyor

2026-07-30'da verilen karar: **üretilen belge sunucuda tutulmaz.** Gerekçesi
güçlüydü ve hâlâ geçerli: dosya tutan her seçenek temizlik görevi ya da kota
istiyordu; ölçüm tek kullanıcının hız sınırının izin verdiği tempoda günde
~290 MB üretebildiğini gösteriyordu. Rapor türetilmiş veridir, kaynağı
(`Calculation.ReportJson`) zaten veritabanındadır — bu yüzden "tekrar indir"
kayıttan **yeniden üretim** oldu.

Devrilen şey o kararın tamamı değil, tek bir sonucu: **yeniden üretim, geçmişi
değil BUGÜNÜ basar.**

Somut kusur. 12 Mart'ta yol genişliği 0.8 mm ile rapor basılır ve üreticiye
gider. 20 Mart'ta hesap 1.2 mm'ye güncellenir. 25 Mart'ta kütükteki **12 Mart**
raporu indirilir: belgenin tarihi 12 Mart'tır (`GeneratedAt`), içeriği
1.2 mm'dir. Elde iki nüsha vardır, aynı tarihi taşırlar, farklı sayı yazarlar
ve hangisinin doğru olduğunu belge söylemez. Mühendislik kütüğünde bu, kırık
bir bağlantıdan daha tehlikelidir — çünkü hata mesajı vermez.

Aynı sınıftan iki kusur daha:

- **Künyedeki firma** kütükte saklanmıyor; geçmişten indirme bugünkü profili
  yazıyor (§27, `ReportEndpoints.Download` içinde açıkça yazılı). Firma adı
  değişince eski rapor da değişmiş görünür.
- **Projesi silinmiş ya da bölümü kalmamış rapor geri alınamıyor**:
  `REPORT_NOT_REPRODUCIBLE`. Kütükte adı durur, belgesi yoktur.

## 1. Ne saklanır — bölümlerin İÇERİK-ADRESLİ kopyası

Saklanan şey: rapor üretilirken kullanılan bölümlerin **ham `ReportJson`
dizeleri**, SHA-256 özetiyle adreslenmiş ve rapor başına bir manifest ile
sıralanmış. Künyeden eksik olan tek alan (`Company`) `Reports` tablosuna bir
kolon olarak eklenir; `Title`, `PreparedBy`, `GeneratedAt` zaten oradadır.

```
SectionBlobs        (UserId, Hash) PK · Content · Length · CreatedAt
ReportSnapshotSections   ReportId FK→Reports (Cascade) · Hash · SortOrder
Reports             + Company (nullable)
```

Yazma yolu: her bölümün ham dizesi hash'lenir; blob **yoksa** yazılır, varsa
yalnız manifest satırı eklenir.

### Elenen: PDF/XLSX baytlarını saklamak

Basit görünür, üç şeyi birden bozar:

1. **290 MB/gün sorunu aynen geri gelir** — devrilen kararın asıl gerekçesi.
2. **Dili dondurur.** İndirme bugün dil seçiyor (`req.Lang`) ve kayıtlı bölüm
   bir dil HARİTASIDIR (`{"tr": …, "en": …}`). Bayt saklamak, aynı raporun
   İngilizce nüshasını üretme yeteneğini öldürür.
3. **Dizgi düzeltmelerini geçmişe kapatır.** Boyutsuz SVG kapısı
   (`TryRenderSvg`, §27) gibi bir düzeltme, donmuş baytlara uygulanamaz.

Mühendislik kaydında değerli olan **sayılardır**, kerning değil. Kodun kendi
standardı da bu: "bölümler istemcinin gönderdiği hâlleriyle duruyor, yani belge
içerik olarak aynı çıkar" (`ReportEndpoints` indirme notu).

### Elenen: rapor başına düz `ReportJson` kopyası

Brifin önerdiği ham yön. Çalışır ama israftır: proje raporları küçük
düzenlemelerle evrilir. On hesaplı bir projede tek hesap değişip yeni rapor
basıldığında on bölümün dokuzu öncekiyle **bayt bayt aynıdır** ve yine tam
kopya yazılır. PDF ve XLSX'i art arda indirmek de aynı içeriği iki kez yazar.

İçerik adresleme bu iki deseni de sıfır ek baytla geçer. Maliyeti bölüm başına
bir SHA-256'dır (25 KB'lık bir bölümde mikrosaniyeler; belge dizgisinin yanında
ölçülemez). Kalıcı boyut, rapor sayısı × boyut değil, **farklı bölüm
sürümlerinin** toplamıdır.

Sıkıştırma elle yapılmaz: Postgres TOAST metni kendiliğinden sıkıştırır ve SVG
metni iyi sıkışır. Hash `bytea` değil `char(64)` hex — `RefreshToken.TokenHash`
ile aynı desen, aynı okunabilirlik.

### Saklanmayan: etiketler

Belgenin çerçeve metni (`ReportLabels`) snapshot'a girmez; indirme isteğinin
gövdesiyle gelmeye devam eder. "Sunucu kullanıcı metni tanımaz" kuralı burada
**delinmez** — dilin geçmişe göre değil, indirme anındaki isteğe göre
seçilmesi zaten istenen davranıştır.

## 2. Kota — reddetmez, geriletir

Kullanıcı başına toplam blob boyutu sınırlıdır (`App:SnapshotQuotaBytes`,
varsayılan 100 MB). Sınır aşıldığında **yeni rapor reddedilmez**: en eski
snapshot'lı raporların manifestleri düşürülür ve o raporlar bugünkü
"güncelden üret" davranışına **gerilerler**. Kütük satırı hiç silinmez.

Gerekçe: raporu reddetmek, kullanıcının bugünkü işini geçmişi korumak için
engellemek olurdu. Geriletme, en eski kaydın donmuşluğunu kaybettirir ve bunu
listede görünür kılar (§3) — kayıp sessiz değildir.

Temizlik `ReportSnapshotCleanupService`tedir ve iki iş yapar: kota geriletmesi
ve **sahipsiz blob toplama** (hiçbir manifestin göstermediği blob silinir).
Desen `RefreshTokenCleanupService`ten alındı: `BackgroundService`, açılışta
kısa gecikme, periyodik tur, düşerse uygulamayı düşürmez ama sessiz de kalmaz.

Manifest gerçek bir join tablosu olduğu için toplama tek anti-join `DELETE`tir;
referans sayacı tutulmaz — sayaç, ikinci bir doğruluk kaynağı ve sessizce
kayabilecek bir sayı olurdu.

## 3. UI — geçmiş DAİMA donuk, ikili seçim yok

Kütükteki bir rapor snapshot taşıyorsa indirme onu basar; taşımıyorsa (göç
öncesi kayıtlar ve kotayla geriletilenler) bugünkü davranış sürer. Liste satırı
bu farkı iki dilli olarak söyler: *"o günkü içerik"* / *"güncel içerikten
üretilir"*.

"Aynı rapordan hem donmuş hem güncel indirme" seçeneği **elendi**: kâğıt
dünyasının semantiği burada doğru olandır — basılmış belge güncellenmez, yeni
revizyon basılır. Güncel içerik isteyen kullanıcı proje ekranından yeni rapor
alır; bu zaten yeni bir kütük satırı ve yeni bir snapshot üretir.

**Uygulama notu (2026-08-01, aynı gün kapandı):** karar yazıldığında istemcide
rapor geçmişi ekranı yoktu — `GET /api/reports` hiçbir ekrandan çağrılmıyordu;
Brif 08 var olmayan bir listeyi varsayıyordu. Ekran ayrı iş olarak yazıldı:
`web/src/pages/account/Reports.jsx` (`/raporlarim` · `/en/reports`). Etiketi
`ReportSummary.HasSnapshot` alanından okur; indirme, seçilen belge diliyle
`POST /api/reports/{id}/download` çağırır. Sayfa indekslenmez
(`indexablePages` yalnız ana sayfa + katalog üretir, prerender 76 sayfada
kaldı).

## 4. Silinen proje ve göç

`Report.ProjectId` üzerindeki `SetNull` davranışı **değişmez**. Değişen şey
sonucudur: snapshot taşıyan bir rapor, projesi silinmiş olsa bile indirilebilir
— bölümler artık projeye değil rapora bağlıdır. Bugünkü
`REPORT_NOT_REPRODUCIBLE(no-project)` deliği böylece kapanır.

Snapshot'sız eski kayıtlarda davranış aynen korunur; geriye dönük snapshot
ÜRETİLMEZ (bugünün verisinden geçmiş uydurmak, düzeltilmek istenen kusurun ta
kendisi olurdu).

Blob'lar kullanıcıya bağlıdır (`SectionBlobs.UserId` + FK Cascade): hesap
silindiğinde snapshot'lar da gider ve dedup **kullanıcı sınırında** kalır —
iki kullanıcının içeriği asla aynı satırı paylaşmaz.

## 5. Yan kazanç — projesiz raporlar da geri gelir

Tek araçlık (projeye kaydedilmemiş) raporlar bugün hiç geri alınamıyor; bu,
saklama kararının "kabul edilen sınırı" olarak yazılıydı. Üretim ucu yükü zaten
elinde tuttuğu için aynı manifest oraya da yazılır ve o raporlar da donmuş
olarak indirilebilir. Tek fark: tek araç yükü istemciden **tek dilde** gelir,
dolayısıyla o raporlar kaydedildikleri dilde döner (`StoredSection` eski
şekli zaten okuyor). Sınır maddesi bu kararla kalkar.

## 6. Doğrulama

- `api/Alp.Api.Tests/ReportSnapshotTests.cs`: donmuş içerik (hesap değişse de
  eski rapor eski sayıyı basar), dedup (aynı bölüm iki raporda tek blob),
  silinmiş projede indirme, snapshot'sız eski kayıtta eski davranış, kota
  geriletmesi ve sahipsiz blob toplama.
- Mevcut testler değişmeden geçer: `ProjectReportCompanyTests`,
  `ReportPreviewTests`, `StoredSectionTests`, `SvgSizeGateTests`.
- Yerelde: proje raporu bas → hesabı değiştir → geçmişten indir → **eski**
  sayı; yeni rapor bas → yeni sayı.
