# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje

ALP PCB Toolkit — PCB tasarımı için çevrim içi donanım mühendisliği hesap araçları.

İki parça: **`web/`** (Vite + React 18 + react-router-dom) ve **`api/`** (ASP.NET Core,
Identity + JWT, EF Core, PDF/Excel rapor üretimi). Hesap motorlarının tamamı hâlâ
tarayıcıda çalışır — hiçbir hesap sunucuya gitmez. Backend yalnızca üyelik, proje/hesap
kaydı ve rapor indirme için vardır; oturum açılmamışken bütün araçlar tam çalışır.

**Arayüz iki dillidir (tr / en), varsayılan Türkçe. Kod yorumları Türkçedir ve çevrilmez.**
Ayrıntı: aşağıdaki "Dil (tr / en)" bölümü.

## Komutlar

```bash
npm install
npm run dev      # http://localhost:3000  (vite.config.js: port 3000, strictPort)
npm run build    # dist/
npm run preview
npm test         # vitest run — yalnızca src/lib/ altındaki saf hesap fonksiyonları
npm run test:watch
```

Linter kurulu değil. Test kapsamı bilinçli olarak dar: **saf fonksiyonlar test edilir,
React bileşeni testi yazılmaz** — arayüz doğrulaması `npm run build` + tarayıcıda elle
kontrol ile yapılır. Yeni bir test/lint aracı eklemek istersen önce sor.

Saf sayılan ve bu yüzden test edilen üç yer: `src/lib/`, ekranların `report.js` dosyaları
ve ekranların `text.js` sözlükleri. Sonuncusu `dfmTextPaths.test.js`'te kaynak dosyaları
metin olarak okuyup metin yollarını yürüterek denetlenir — bileşen render edilmez.

**Yeni bir hesap motoru eklendiğinde `docs/spec.md` §13'te karşılığı varsa, testi de aynı
commit'te yazılır.** §13'ün altı referans testi (microstrip, via direnci, PDN hedef empedansı,
junction sıcaklığı, direnç kodu, yüklü gerilim bölücü) ilgili motor eklendiğinde teste dönüşür;
motor testsiz merge edilmez.

**Dağıtım kendi sunucumuza yapılacak, GitHub Pages'e değil.** Uygulama kökten (`/`)
servis edilir: `vite.config.js` içinde `base: '/'` ve `App.jsx` içinde `BrowserRouter`
kullanılır. `main.jsx` eski `#/arac/...` bağlantılarını yeni yollara çeviren bir yönlendirme
taşır — kullanıcıların kayıtlı bağlantıları kırılmasın diye duruyor, silinmemeli.

`BrowserRouter` derin bağlantıda sunucudan SPA geri dönüşü ister: `/arac/...` isteğine
`index.html` dönmeyen bir yapılandırmada sayfa yenilendiğinde 404 alınır. Dağıtım
yapılandırması yazılırken ilk doğrulanacak şey budur.

`.github/workflows/deploy.yml` hâlâ GitHub Pages'e bakan eski akıştır ve bu yapıyla
uyumlu değildir; dağıtım fazında (Faz 8) ele alınacak.

## Mimari

Bağımlılık yönü tek yönlüdür ve asla tersine çevrilmez:

```
pages → components → hooks → lib
```

Somut bağımlılık (tarayıcı depolaması gibi) `hooks/` katmanında bağlanır; `lib/` yalnızca
soyut portu bilir.

1. **`src/lib/`** — saf hesap fonksiyonları. React, DOM, tarayıcı API'si ve kullanıcıya
   görünen metin bilmez. Hata durumunda `{ error: <kod> }` döner; kodu metne çeviren taraf
   ekranın `text.js` dosyasıdır.
   **Hata yükünde cümle taşınmaz.** Kod tek başına yetmiyorsa — hangi bant, hangi harf,
   hangi sınır, beklenen/bulunan sürüm — bunlar `detail` alanında **yapısal ve dilsiz** veri
   olarak döner (`{ error: CODE_ERR_DIGIT, detail: { band: 1, role: 'digit', color: 'gold' } }`).
   Biçimlenmiş cümle, birleştirilmiş metin ya da tarayıcının kendi istisna dizesi hata yüküne
   sayılabilir alan olarak konmaz; sızarsa İngilizce arayüzde Türkçe cümle olarak görünür.
   `storage.js` tarayıcı istisnasını yalnızca sayılamayan (`enumerable: false`) `_cause`
   alanında taşır — `Object.keys`, spread ve `JSON.stringify` onu görmez.
   - `num.js` — giriş ayrıştırma (`parseNum`, `parseNumResult`) ve gösterim
     (`fmt`, `fmtEng`, `fmtRes`, `fmtAmp`, `fmtPow`, `fmtPct`, `fmtOhm`, `fmtVolt`, `fmtWatt`).
     `fmtPct` **yüzde işareti basmaz**, yalnızca işaretli sayıyı biçimler; işaretin yeri dile
     bağlı olduğu için `commonText(lang).pct` ile konur (`pct(fmtPct(x))`).
     Araç ekranları tembel yüklenir (`src/App.jsx` içinde `lazy`), bu yüzden her ekran yalnızca
     kendi motorunu paketine çeker.
   - `units.js` — fiziksel sabitler (`C0`, `EPS0`, `MU0`, `ETA0`, `RHO_CU_20`, `K_CU`,
     `K_CU_HIGH`) ve
     birim → SI çarpan tabloları (`LENGTH`, `CAPACITANCE`, `FREQUENCY`, …) + `toSI`/`fromSI`.
     Yeni sabit buraya eklenir, araç dosyasına gömülmez.
   - `fields.js` — form alanı okuma: birim çevirme, belirsiz binlik ayırıcı yakalama,
     eksik/geçersiz alanı ada göre bildirme. Her ekran bunu kullanır, kendi ayrıştırmasını
     yazmaz.
   - `solve.js` — sınırlandırılmış kök arama (`brent`, `bisection`, `expandBracket`,
     `solveBounded`). Tüm ters (sentez) hesaplar buradan geçer.
     İki sınır durumu sözleşmenin parçasıdır, bozulmamalı: **(a)** tohum tam kökteyse
     `expandBracket` dejenere `[x0, x0]` aralığını döner ve bu geçerlidir — kök zaten elde
     demektir, hata değil. Sentez ekranları çözücüyü kapalı form sonucuyla tohumladığı için
     bu durum istisna değil, olağan yoldur. **(b)** Kök tam arama sınırındaysa `bisection`
     onu döndürür; sınırı atlayıp karşı uca kaymaz. İkisi de yalnızca `F(x) === 0` iken
     çalışır — aralıkta kök yoksa çözücü yine hata döner, asla tahmin üretmez.
   - `storage.js` — kalıcı depolama **portu** (`read`/`write`/`remove`). `browserStorage`,
     `memoryStorage`, `nullStorage` uygulamaları burada.
   - `thicknessRecords.js` — bakır kalınlığı kayıtları: şema adı, `schemaVersion`, doğrulama,
     liste/kaydet/sil. `localStorage`'ı tanımaz, portu parametre olarak alır.
   - Hesap motorları: `traceCalc.js`, `ohm.js`, `divider.js`, `led.js`, `reactance.js`,
     `timing.js`, `crystal.js`, `codes.js`, `eseries.js`.
   - Üretim/DFM motorları: `dfmProfile.js`, `dfmCheck.js`, `dfmSummary.js`, `padstack.js`,
     `clearanceProfile.js`, `clearanceCreepage.js`, `bgaBreakout.js`, `stackup.js`,
     `stackupProfiles.js`, `thermalRelief.js` — ayrıntı: "Üretim/DFM ekranlarının ortak
     yapısı".
   - Dönüşüm motorları (`docs/spec.md` §11): `convertLength.js`, `convertAwg.js`,
     `convertFrequency.js`, `convertDecibel.js`, `convertTemperature.js`, `convertComplex.js`.
     Bunlar tanım gereği tam bağıntılardır; ampirik yaklaşım içermezler, kök çözücüye
     ihtiyaç duymazlar ve uç girdide `Infinity` döndürmek yerine aralık hata kodu verirler.
2. **`src/components/`** — sunum bileşenleri (`NumberField`, `SelectField`, `Segmented`,
   `TextField`, `RowList`, `Schematic`, `LineChart`, `Formula`, `ProfilePanel`, `DfmChecks`,
   `DfmSummaryBox`). State tutmaz, hesap yapmaz.
   - `RowList` sütunları isteğe bağlı `options` (satır içi seçici) ve `text` (serbest metin)
     alabilir; verilmeyen sütun eskisi gibi sayı girişi olur. Izgara genişliği `cols-N`
     sınıfıyla seçilir çünkü satır içi stil kullanılmaz.
   - `Formula` — formül bloğunu `<sup>`/`<sub>` ile dizer (`A^2`, `D_o`, `10^(G/10)`,
     `N_{I,V}`; `\^` ve `\_` kaçış). KaTeX gibi bir kütüphane yerine bu seçildi: bağımlılık
     ve paket boyutu eklemiyor, mono font korunuyor. Ayrıştırıcı saf ve testli
     (`parseFormulaLine`) — bileşen testi değil, saf fonksiyon testidir, o yüzden kural dışı
     sayılmaz.
   - **Dili doğrudan `useLang()`'den okuyan istisnalar** — `EpsEffFields`, `RowList`,
     `LineChart`, `NumberField`, `ProfilePanel`, `DfmChecks`, `DfmSummaryBox`. Ortak kural: bileşenin **kendi çerçeve metni** her ekranda
     birebir aynıysa (εeff blok etiketleri, "… birimi" / "… sil" ekran okuyucu adları,
     "Veri tablosu", boş grafik notu) o metin `commonText(lang)`'ten okunur; prop olarak
     geçirmek aynı iki dilli sözlüğü yirmi beş ekrana kopyalamak olurdu. **Ekrana özgü olan**
     her şey — alan etiketi, ipucu, eksen başlığı, grafik açıklaması, satır listesi başlığı —
     yine prop olarak gelir. Yeni bir bileşen bu istisnaya ancak aynı gerekçeyle katılır ve
     buraya yazılır.
     Sonuç satırlarını üreten `epsEffRows(eps, fmt, lang)` saf kalır ve dili parametre alır;
     varsayılanı **yoktur** — atlanan argüman sessizce Türkçeye düşmesin diye zorunludur.
3. **`src/hooks/`** — `useToolForm` yalnızca React state'ini yönetir; hesap bilgisi taşımaz.
   Somut depolama portunu bağlayan hook'lar: `useSavedThickness`, `useDfmProfiles`,
   `useClearanceProfiles`, `useSavedStackups`. Pano erişimi `useClipboard`'dadır.
   Tarayıcı API'si yalnızca bu beşinde görünür.
4. **`src/pages/tools/<Ad>/`** — araç ekranı, altı dosya:
   - `index.jsx` — düzen ve state. Hesap yapmaz, metin üretmez; metni `getText(lang)`'ten alır.
   - `model.js` — alan tanımları + `compute()` + `buildSweep()`. Saf, test edilebilir.
     Kullanıcı metni içermez; alan etiketlerini `labels` parametresiyle dışarıdan alır.
   - `schematic.jsx` — devre/geometri SVG'si. Yazılarını `text` prop'undan alır.
   - `text.js` — ekranın tüm kullanıcı metni, iki dilli. Tek dış yüzü
     `export function getText(lang)`.
   - `report.js` + `report.test.js` — rapor bölümü. Ekranla **aynı** `r`/`s`/`text`
     kaynağından aynı satırları üretir; ekranla rapor arasındaki kayma riski böylece en
     aza iner. Saf: React, DOM ve ağ bilmez.

`src/data/categories.js` tek kaynak: 8 kategori ve araç listesi. Bir aracın `path` alanı varsa
aktif, yoksa "yakında" olarak gösterilir — `Home.jsx` ve `CategoryPage.jsx` bu alana bakar.
`title` / `desc` / `name` alanları `{ tr, en }` sözlüğüdür; ekran tarafı `pick()` ile çözer.

### Dil (tr / en)

**Geçiş tamamlandı: 25 araç ekranının tamamı iki dilli.** Yeni ekran doğduğu anda iki dilli
yazılır; tek dille yazıp sonra çevirmek eksik iş sayılır. Katman ayrımı burada da geçerlidir:
saf katman dil bilmez, somut bağ tek yerdedir.

Değişikliğin doğruluğunu gözle kontrol etme — hiçbir şey tip denetiminden geçmiyor ve
`text.foo.bar` yoksa React sessizce boş ya da `undefined` basar, **build hata vermez**.
Bu sınıftan bir hata (`text.table.pctOfSupply is not a function`) bir ekranı tümüyle
çökertmişti. Doğru kontrol, `text.js`'i `esbuild --bundle` ile paketleyip `getText('tr')` ve
`getText('en')` nesnelerini gerçekten kurmak, sonra `index.jsx`/`schematic.jsx` içindeki her
`text.…` / `ui.…` yolunu üzerinde yürütmektir — arity dahil: `text.foo(x)` biçiminde
çağrılan yol fonksiyon **olmalı**, `{text.foo}` biçiminde basılan yol fonksiyon **olmamalı**.
`schematic.jsx` içindeki `text` prop'unun kök nesne değil, `index.jsx`'in geçirdiği alt nesne
(genelde `text.schematic`) olduğunu unutma.

- **`src/lib/i18n.js`** — saf: `LANGS`, `DEFAULT_LANG` (`'tr'`), `readLang`/`writeLang`
  (depolama portu üzerinden) ve `pick(dict, lang)`. Çeviri eksikse İngilizceye değil
  **Türkçeye** düşer; eksik çeviri boş kutu değil, okunabilir metin olarak görünür.
- **`src/hooks/useLang.jsx`** — `LangProvider` + `useLang()`. Somut depolama yalnızca burada
  bağlanır. Seçim `localStorage`'da tutulur; erişilemezse `nullStorage`'a düşer — dil o oturum
  boyunca çalışır, yalnızca kalıcı olmaz.
- **`<html lang>` dille birlikte değişir ve bu şart.** `text-transform: uppercase` sayfanın
  dilini kullanır: `lang="tr"` altında "i" harfi "İ" olur, İngilizce metin büyütülünce "VIA"
  yerine "VİA" çıkar. Dil düğmelerinin kendi adı da kendi dilinde yazılır (`lang={code}`),
  kullanıcı anlamadığı bir dile düştüğünde çıkışı bulabilsin.
- **`src/data/uiText.js`** — `commonText(lang)`: ekranlar arası ortak metin. Panel başlıkları
  (`inputs`, `result`, `technicalDetail`, `validity`, `commentary`, `equations`, `chart`,
  `sources`), durum çipi kalıpları (`statusOk` / `statusWarn(n)` / `statusDanger(n)`),
  boş/hata notları (`chartNeedsInput`, `thousandsNote(fields)`, `loadingTool`), yüzde kalıbı
  (`pct(v)`), satır listesi ve bileşen etiketleri (`rowAdd`, `rowLabel`, `rowUnitAria`,
  `rowRemoveAria`, `unitAria(label)`, `chartDataTable`) ve gezinme metinleri.
  **Durum çipi metni ekran başına yazılmaz** — kalıp tek yerdedir, yoksa ekranlar arası
  tutarlılık kuralı sessizce bozulur. Aynı gerekçe yüzde işareti için de geçerlidir:
  Türkçe `%5`, İngilizce `5%` yazar ve bu kalıp **yalnızca `pct`'tedir**. Ekran başına
  yazıldığında ekranlar birbiriyle çelişmişti (bir ekran `5 %`, diğeri `5%`). Ekran kendi
  `text.js`'inde `const { pct } = commonText(lang)` ile alır; sayının kendisi yine
  `fmt`/`fmtPct` ile biçimlenir. `pct` sonlu olmayan değerde gelen uzun tireye (`—`) yüzde
  işareti takmaz.
- **`text.js` deseni** — ekran metninin tamamı tek fonksiyonda toplanır:

  ```js
  export function getText(lang) {
    const t = (dict) => pick(dict, lang)
    return {
      title: t({ tr: '…', en: '…' }),
      fieldLabels: { Vin: t({ tr: '…', en: '…' }) },   // model.js'e verilir
      findingText: (fd) => { /* tek kopya mantık, dizeler t({tr,en}) */ },
    }
  }
  ```

  Koşullu metin üreten yerlerde **mantık tek kopya kalır**, yalnızca dizeler dile göre seçilir;
  `if (lang === 'en')` ile ikinci bir dal açılmaz.
- **Etiket enjeksiyonu** — `model.js` hata mesajında alan adı gösterir ama dil bilmez:
  `formFields(…, labels = {})` içinde `const L = (key) => labels[key] ?? key`, `compute` son
  parametre olarak `labels` alır, ekran `text.fieldLabels`'ı geçirir. Etiket verilmezse alan
  anahtarı görünür — sessiz boşluk yerine teşhis edilebilir bir ad.
- **Formüller de çevrilir.** Matematik aynen kalır, içindeki sözcükler çevrilir:
  "Yük altında:" → "Under load:", `V_maks` → `V_max`, `D_matkap` → `D_drill`,
  `N_kullanıcı` → `N_user`. Alt simgede Türkçe sözcük bırakılmaz.
- **Çevrilmeyenler:** kod yorumları, değişken/dosya adları, birim sembolleri, E serisi adları
  ve kullanıcının kendi girdiği veri (örn. kaydedilmiş bakır kalınlığı kaydının adı).

**Bilinçli sapma:** `categories.js` 29 araç kaydı içerir, `docs/spec.md` §15 ise 21 ekran
sayar. Fark kasıtlıdır, düzeltilmemeli: spec'in 2. ekranı (*Trace Resistance, Voltage Drop
and Power Loss*) ayrı araç değil, `TraceWidth.jsx` içinde birleşik; spec'in 21. ekranı
(*BGA, Stack-Up and Thermal Relief*) `bga`, `stackup` ve `thermal-relief` olarak üçe
bölünmüştür; §11'in altı dönüşüm başlığı ise §15'te hiç sayılmadığı hâlde altı ayrı ekran
olarak uygulanmıştır (uzunluk, AWG, frekans/periyot, dB, sıcaklık, kompleks sayı) ve
kendi *Dönüştürücüler* kategorisinde toplanmıştır.

**Dönüştürücüler ayrı kategoridir** ve *PCB Üretim ve DFM* ile karıştırılmamalı. §11'in altı
dönüşümü tanım gereği tam bağıntılardır: ampirik katsayı, eğri uydurma ya da tablo içermezler,
kök çözücüye ihtiyaç duymazlar. Üretim/DFM hesapları ise tolerans, süreç ve üretici verisi
taşır. İkisi aynı kartta dururken bu ayrım görünmüyordu.
`cu-converter` (*Bakır Kalınlığı Dönüştürücü*) adına rağmen bu kategoride **değildir** ve
taşınmamalı: yalnızca oz ↔ µm çevirmez, kaplama payı ve aşındırma faktörü gibi üretim
parametrelerini hesaplar; yeri *PCB Akım, Güç ve Bakır* kategorisidir.

*PCB Üretim ve DFM* kategorisinin dört aracı yazıldı ve kategoride "yakında" kalan
kayıt yok: `clearance-creepage-padstack`, `bga-breakout`, `stack-up-planlayici`,
`thermal-relief`.

### Üretim/DFM ekranlarının ortak yapısı

Dört ekran birbirinden bağımsız üretici limitleri sormaz; ortak bir profil ve ortak bir
kontrol sözleşmesi paylaşır:

- **`src/lib/dfmProfile.js`** — üretici yetenek profili zarfı (şema adı, `schemaVersion`,
  doğrulama, mm → SI dönüşümü, içe/dışa aktarma, depolama portu). Girilmeyen sınır `null`
  kalır ve ona bağlı kontrol `unknown` döner; **sessiz varsayılan üretici değeri yoktur**.
  Zarfa gerçek bir üreticinin verisi konmaz.
- **`src/lib/dfmCheck.js`** — ortak marj ve durum sözleşmesi. Marj yönlüdür (`min`/`max`)
  ve **her iki yönde de artı marj iyi** demektir. `required` sıfırsa yüzdesel marj
  hesaplanmaz. Hem sınır hem uyarı bandı karşılaştırması bağıl paylıdır: kayan nokta
  gürültüsü tam sınırdaki bir tasarımı uyarıya düşürmemeli.
- **`src/lib/dfmSummary.js`** — kopyalanabilir düz metin DFM özeti. Saf: dil bilmez,
  bütün başlıkları çağırandan alır, tarihi bile dışarıdan ister. Eksik etiket sessizce
  `undefined` basmaz; `SUMMARY_LABEL_KEYS` eksikse hata döner (bir kez basmıştı).
- Karar profilleri: **`clearanceProfile.js`** (clearance/creepage tabloları),
  **`stackupProfiles.js`** (kaydedilmiş stack-up'lar). İkisi de `thicknessRecords.js`
  desenini izler.
- Hesap motorları: `padstack.js`, `clearanceCreepage.js`, `bgaBreakout.js`, `stackup.js`,
  `thermalRelief.js`.
- Somut bağlar: `useDfmProfiles`, `useClearanceProfiles`, `useSavedStackups`,
  `useClipboard`. Tarayıcı API'si yalnızca bu dördünde görünür.
- Ortak sunum: `ProfilePanel`, `DfmChecks`, `DfmSummaryBox` bileşenleri ve
  `src/data/dfmText.js` sözlüğü. Üçü de dili doğrudan `useLang()`'den okuyan istisna
  kümesine katıldı — gerekçe aynı: panelin kendi çerçeve metni dört ekranda birebir aynı,
  prop olarak geçirmek aynı sözlüğü dört kez kopyalamak olurdu.

**Padstack annular ring ve aspect ratio `via.js`'ten gelir**, `padstack.js` kendi kopyasını
yazmaz. Aynı bağıntının ikinci kopyası, biri düzeltilip diğeri unutulduğunda ViaProperties
ile Padstack'in farklı sonuç vermesi demektir.

**Dördüncü durum çipi.** `uiText.js` artık `statusUnknown(n)` de taşıyor. Karar verecek
sınır yokken kontrolü `warn` göstermek "sınıra yakın" demek olurdu ve veri yokluğunu
ölçülmüş bir yakınlık gibi sunardı. Tema dosyalarında karşılığı `.status.unknown` ve
`.commentary li.unknown` — dördüne de eklendi.

**`src/pages/tools/dfmTextPaths.test.js`** dört ekranın `index.jsx` / `schematic.jsx` /
`report.js` dosyalarını metin olarak okur, içindeki `text.…` / `ui.…` / `dfm.…` yollarını
çıkarır ve iki dilde gerçekten yürür — arity dahil. Bu bir bileşen testi değildir; aşağıda
"Dil" bölümünde tarif edilen elle kontrolün otomatik hâlidir. Yeni bir üretim/DFM ekranı
eklendiğinde listesine yazılır.

### Yeni araç ekleme

Formüller ve gereksinimler için kaynak: **`docs/spec.md`**. Yeni bir araç yazmadan önce o
dosyanın ilgili bölümünü oku; denklemleri, sabitleri veya geçerlilik sınırlarını hafızadan
veya başka kaynaktan uydurma. Spec ile mevcut kod çelişirse dur ve sor.

Uyarı: spec'teki bazı formül blokları markdown dönüşümünde bozulmuş — açılış köşeli parantezi
düşmüş, araya `##` girmiş veya `*` işaretleri ifadeyi yemiş durumda. Bozuk bir bloğu tahminle
tamamlama; eksik olduğunu söyle ve sor.

1. Hesap motorunu `src/lib/<konu>.js` olarak yaz. Motor kod döner, metin döndürmez.
2. `src/pages/tools/<Ad>/` klasörünü dört dosyayla kur: `model.js`, `text.js`,
   `schematic.jsx`, `index.jsx`. `text.js` doğduğu anda iki dillidir — tek dille yazılıp
   sonra çevrilmez.
3. `src/App.jsx` içine `const Ad = lazy(() => import('./pages/tools/Ad'))` ve
   `<Route path="/arac/<slug>" element={<Ad />} />` ekle — ekranlar tembel yüklenir.
4. `src/data/categories.js` içindeki ilgili araca `path: '/arac/<slug>'` ver; `name` alanı
   `{ tr, en }` sözlüğüdür ve ekranın `h1` başlığıyla birebir aynı kalır.
5. `docs/spec.md` §13'te karşılığı varsa testi aynı commit'te yaz.

Referans ekran: `src/pages/tools/VoltageDivider/`. Yeni ekran yazarken panel düzenini,
terminolojiyi, tablo yoğunluğunu ve `getText(lang)` desenini oradan birebir kopyala.

### Birim ve sayı akışı

- Form state'i **string** tutar; ayrıştırma yalnızca `compute()` içinde `parseNum` ile yapılır.
- Birimler ayrı state alanında tutulur (`L` + `Lu`, `I` + `Iu`) ve çarpan tablolarıyla
  (`LEN_TO_M`, `W_TO_MM`) SI'ye çevrilir. Hesap içinde SI kullanılır.
- İstisna: ampirik ısınma denklemi tanımı gereği mil²/A/°C ile çalışır. Bu tür birim
  istisnaları kodda yorumla açıkça belirtilmeli.
- **Ara değerlerde asla yuvarlama yapılmaz.** `fmt*` yalnızca JSX içinde, ekrana yazarken
  çağrılır.
- **Binlik ayırıcı yorumlanmaz.** `"1.000"` bin mi 1.0 mı belirsizdir; `parseNumResult`
  bunu `NUM_ERR_THOUSANDS` ile geçersiz sayar, sessizce `1` döndürmez. Motor etkilenen alan
  adlarını `r.ambiguous` dizisinde döndürür; ekran hesap yerine
  `commonText(lang).thousandsNote(r.ambiguous)` uyarısını gösterir. Uyarı metni tek dilli
  bir sabit değildir — ekran başına yazılmaz, `uiText.js`'ten gelir.
- Geçersiz giriş `{ invalid: true }` döner; sayfa hesap yerine `.empty-note` gösterir.

### Trace hesap motoru — mevcut durum ve planlanan yol

`traceCalc.js` şu an tek motor kullanıyor: klasik ampirik ısınma denklemi
`I = k·ΔT^0.44·A^0.725`. `docs/spec.md` §4.1.4 bunun yerine veri-interpolasyon + sayısal kök
çözümü istiyor ve ampirik denklemi legacy sayıyor (§4.1.5). Tek motorla devam kararı
bilinçlidir — spec'in istediği veri seti lisanslıdır ve repoya giremez.

Bu yüzden sonuç panelinde `.method-note` etiketi zorunludur: *"Klasik ampirik yöntem — veri
tabanlı hesapla eşdeğer değildir."* Ampirik sonucu veri tabanlı yöntemin sonucuymuş gibi
sunma.

Planlanan yol: kullanıcı kendi veri setini JSON olarak içe aktarabilecek, veri `localStorage`
içinde tutulacak, **repoya hiç girmeyecek**. Veri seti yüklendiğinde interpolasyon motoru
devreye girecek ve `.method-note` metni buna göre değişecek.

## Kurallar

- **Sitede hiçbir yerde "ipc" ifadesi geçmeyecek.** Bu yasak `src/` ve kullanıcıya görünen
  tüm metinler için geçerli — arayüz metni, kod yorumu, değişken/dosya adı, README dahil.
  `docs/` altındaki dahili referans dosyaları kapsam dışıdır. Standart adı gerektiğinde
  yöntem tarif edilerek anılır — örn. `traceCalc.js`'te "klasik ampirik iletken ısınma
  denklemi". Yeni metin yazdıktan sonra kontrol et:
  ```bash
  # kuralın kendi metni sayılmasın diye CLAUDE.md hariç; çıktı boşsa temiz
  grep -rin "ipc" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs \
    --exclude=CLAUDE.md .
  ```
  Sonuç: `docs/spec.md` bazı sonuç etiketlerini ve uyarı metinlerini standart adıyla birebir
  şart koşar (örn. veri aralığı dışı uyarısı, legacy yöntem etiketi). Bu metinler UI'da
  standart adı olmadan, yöntemi tarif ederek yazılır. **Yasak İngilizce çeviri için de
  geçerlidir** — `text.js`'in `en` tarafında da standart adı anılmaz, yöntem tarif edilir
  (örn. "classic empirical conductor heating equation").
- **Kullanıcıya görünen her metin iki dilli olacak.** `index.jsx`, `model.js` ve
  `schematic.jsx` içinde çıplak Türkçe (ya da İngilizce) dize bulunmaz; hepsi `text.js`
  ya da `uiText.js` üzerinden gelir. Bir dizeyi tek dille eklemek eksik iş sayılır —
  `t({ tr, en })` çağrısında iki anahtar da doldurulur. Kontrol:
  ```bash
  # yorum dışında Türkçe karakter kalmamalı
  grep -n "[ğİışĞŞÇÖÜöçü]" src/pages/tools/<Ad>/{index.jsx,model.js,schematic.jsx} \
    | grep -v '{/\*' | grep -v '^\s*[0-9]*:\s*//'
  ```
  **Bu grep tek başına yetmez ve iki kez yanılttı.** Türkçe sözcüklerin bir kısmı saf ASCII'dir
  — "Veri tablosu", "birimi", "sil", "adet", "oran", "Yol", "Nokta" — ve yukarıdaki desene
  hiç takılmaz. `LineChart` içindeki `<summary>Veri tablosu</summary>` ile `NumberField`
  içindeki `aria-label={\`${label} birimi\`}` tam olarak böyle gözden kaçmıştı. Ayrıca metin
  yalnızca çocuk düğümde değil **öznitelikte** de bulunur (`aria-label`, `title`, `alt`,
  `placeholder`, `<summary>`, SVG `<title>`) ve en sinsisi **isteğe bağlı prop'un Türkçe
  varsayılanıdır** — ekran prop'u geçtiği sürece görünmez, geçmediği gün İngilizce arayüzde
  Türkçe basar. Yalnızca `src/pages/` değil, `src/components/`, `src/hooks/`, `src/data/`,
  `src/lib/`, `src/App.jsx` ve `index.html` de taranır.

  Dil değiştirmek hesabı etkilemez: `compute()` yalnızca `labels` alır, dil kodunu değil.
  Sayı biçimlendirmesi (`num.js`) her iki dilde de aynıdır — ondalık ayırıcı noktadır,
  dile göre değişmez, çünkü mühendislik çıktısı kopyalanıp başka araca yapıştırılır.
  **Yüzde işaretinin yeri bu kuralın dışındadır**: sayı değil, dil kuralıdır (Türkçe `%5`,
  İngilizce `5%`) ve `commonText(lang).pct` ile konur — bkz. yukarıdaki `uiText.js` maddesi.

- **Yeni araçlar `src/pages/tools/TraceWidth.jsx`'teki 3 panelli deseni takip edecek:**
  `.tool-header` (başlık + açıklama) → `.tool-grid` içinde üç `.panel` (sol: *Girdiler*,
  orta: *Sonuç*, sağ: `.panel-detail` → *Teknik detay* + *Geçerlilik ve varsayımlar*) →
  kategoriye dönen `.backlink`. Orta panel bir `.big-result`, bir `.status` çipi ve bir
  `.result-table` içerir; sağ panel kullanılan denklemleri `.formula` bloğunda gösterir.
  Düzen kırılımları `src/themes/*.css` içindeki `.tool-grid` media query'lerinde tanımlı — yeni
  araç için grid yazmaya gerek yok.
- **Renkler her zaman tema değişkenlerinden gelecek.** JSX veya CSS içine
  literal renk (`#4ade80`, `rgb(...)`, `green`) yazma; `var(--accent)`, `var(--muted)`,
  `var(--warn)`, `var(--danger)` vb. kullan. Yeni bir renk gerekiyorsa önce ilgili tema dosyasının
  `:root` bloğuna değişken ekle — `src/theme.css` yalnızca aktif temayı seçen tek satırlık
  anahtardır, değişkenler `src/themes/*.css` içindedir ve yeni değişken **dördüne de** eklenir,
  yoksa tema değiştirildiğinde kural tanımsız kalır. Aynı kural fontlar için de geçerli:
  `var(--font-mono)`, `var(--font-display)`, `var(--font-body)`.
  Grafik serileri renk stringi taşımaz: eleman `tone-1`…`tone-4` / `tone-muted` sınıfını alır,
  çizim kuralları `var(--tone)` kullanır. `toneClass(i)` yardımcısı `LineChart`'tan gelir.

- **Ekrana özel CSS yazma ve inline style kullanma.** Tüm görsel kararlar tema
  değişkenleri ve mevcut ortak sınıflar üzerinden verilir. Yeni bir görsel desen gerekiyorsa
  önce ortak bileşen olarak yazılır, tek ekrana gömülmez. Panel içinde ikinci başlık için
  `<h2 className="section">` kullanılır.

- **Ekranlar arası tutarlılık zorunlu.** Panel düzeni (Girdiler / Sonuç / Teknik detay + alt
  parametrik grafik), terminoloji (Analiz/Sentez, Nominal, Önerilen, worst-case), durum çipi
  eşikleri ve tablo yoğunluğu tüm ekranlarda birebir aynı kalır.

- **Durum çipi tek kurala bağlıdır:** ekranın ürettiği bulguların en kötü seviyesi gösterilir
  (`ok` → "Tüm kontroller geçti", `warn` → "Sınıra yakın — N uyarı", `danger` →
  "N kontrol sınırın dışında").
- **Ondalık girişlerde hem nokta hem virgül kabul edilecek.** Her sayısal giriş
  `src/lib/num.js` içindeki `parseNum` ile ayrıştırılır (`0.25` == `0,25`); hata nedeni
  gerekiyorsa `parseNumResult`. `parseFloat` veya `Number()` doğrudan kullanılmaz.
- **Ters hesaplarda Newton–Raphson tek başına kullanılmaz.** `src/lib/solve.js` içindeki
  `solveBounded` kullanılır (Brent, tökezlerse bisection'a düşer). Newton–Raphson başlangıç
  noktasına bağlı olarak negatif genişlik, negatif aralık gibi fiziksel olmayan sonuçlara
  yakınsayabilir (`docs/spec.md` §3.3). Arama aralığı `min`/`max` ile fiziksel olarak geçerli
  sınırlara kapatılır; sınırlar içinde kök yoksa çözücü hata döner — tahmin üretmez.
- **Lisanslı standart tabloları repoya kopyalanmaz.** Karar tabloları, eğri verisi ve
  benzeri lisanslı içerik `src/` veya `docs/` altına gömülmez. Bunun yerine kullanıcının
  içe aktardığı profil/veri seti kullanılır ve `localStorage`'da tutulur. Böyle bir veri
  yokken sonuç, standart tabanlı doğrulanmış gibi sunulmaz.
  Böyle bir veri saklanacaksa desen hazırdır ve bakır kalınlığı kayıtlarında uygulanıyor:
  port `src/lib/storage.js`, saf depo `src/lib/thicknessRecords.js` (şema adı, `schemaVersion`,
  doğrulama; portu parametre alır), somut bağ `src/hooks/useSavedThickness.js`. Ekran kendi
  `JSON.parse`/`localStorage` kodunu yazmaz. Format değişirse eski kayıt sessizce yanlış
  okunmaz, açık hata döner.

- **Kapalı form empedans sonuçları üretime hazır gibi sunulmaz.** `docs/spec.md` §6.1 üretim
  için önerilen sonucun alan çözücüden gelmesini istiyor; çözücü henüz yok. Bu yüzden empedans
  fonksiyonları `{ Z0, epsEff, method }` döndürür ve `method` alanı `'closed-form'` |
  `'field-solver'` değerini taşır. Arayüz `method`'a bakarak etiketi yazar; çözücü sonradan
  aynı arayüzün arkasına girdiğinde UI değişmez. Kapalı form sonucu daima **"hızlı denklem
  modu"** etiketiyle ve geçerlilik sınırlarıyla birlikte gösterilir.

- **İdeal CPW denklemi grounded CPW sonucu olarak sunulmaz** (`docs/spec.md` §6.7). Grounded
  CPW alan çözücü fazına bırakılmıştır; kapalı form fazında bu yapı hiç sunulmaz.

- **Bilinen sapma — diferansiyel çift kuplaj katsayısı.** `impedance.js` içindeki
  `differentialPair()`, spec §6.8.1'in istediği Maxwell kapasitans matrisi rotasını
  (`C_odd = C₁₁ − C₁₂`, `C_even = C₁₁ + C₁₂`, `Z = 1/(c·√(C·C₀))`) **uygulamıyor**. `C₁₁` ve
  `C₁₂` için kapalı form yoktur; kapasitans matrisi alan çözücüden çıkar. Yerine ampirik bir
  kuplaj katsayısı kullanılıyor:

  ```
  microstrip: k_c = 0.48·exp(−0.96·S/H)
  stripline:  k_c = 0.347·exp(−2.9·S/b)
  Z_odd = Z₀·(1 − k_c),  Z_even = Z₀·(1 + k_c)
  ```

  **Bu iki ifadenin kaynağı `docs/spec.md`'de yok** — sayısal katsayıları ve geçerlilik
  aralıkları spec'ten doğrulanamıyor. Kod bunu şu şekilde görünür kılar, üçü de zorunludur:
  1. Sonuç `method: METHOD_EMPIRICAL` (`'empirical-coupling'`) taşır, `'closed-form'` değil.
     Tek uçlu formun kendi etiketi ayrıca `singleMethod` alanında döner. Yeni bir kod
     `method === METHOD_CLOSED_FORM` kontrolü yazarken bu ayrımı bozmamalı.
  2. `capacitanceMatrix: false` alanı §6.8.1 rotasının uygulanmadığını açıkça bildirir.
  3. Diferansiyel ekranda hem `METHOD_NOTE` hem `COUPLING_SOURCE_NOTE` gösterilir; sonuç
     üretim kararı verilecekmiş gibi sunulmaz (yığın onayı / panel çıkışı / empedans kuponu
     için alan çözücü ya da üretici ölçümü şart).

  Silinmiyor çünkü çift için çalışan tek motor bu. Alan çözücü fazında §6.8.1 rotasıyla
  bütünüyle değiştirilecek. Bu arada **aynı gerekçeyle yeni ampirik formül eklenmez** —
  kaynağı spec'te olmayan bir denklem, kapalı formdan gelmiş gibi sunulamaz.

- **Bilinen sapma — crosstalk kestirimi.** `signalIntegrity.js` `crosstalk()` de spec'i
  uygulamıyor. Spec §7.6 çok iletkenli iletim hattı çözümü istiyor (kapasitans matrisi 2B alan
  çözücüden, `L = μ₀ε₀·C₀⁻¹`, `G ≈ ω·tanδ·C`, aggressor sinyali FFT → her frekansta `e^(−Mℓ)`
  → IFFT). Alan çözücü olmadan hiçbir adımı yapılamıyor. Yerine kullanılan
  `K_b = (Z_even − Z_odd)/(2·(Z_even + Z_odd))`, `L_sat = t_r/(2·t_pd)` ve
  `V_FEXT ≈ (Δt/t_r)·V_agg/2` ifadelerinin **kaynağı spec'te yok**. Sonuç bu yüzden
  `method: SI_METHOD_EMPIRICAL` ve `multiconductorModel: false` taşır; arayüz bunu kapalı form
  sonuçlarıyla aynı kefeye koymaz. Spec'te birebir tanımlı tek şey 3W kontrolüdür (`S ≥ 3W`) ve
  o da yalnızca geometrik bir kontroldür — sağlandığında **"crosstalk yoktur" denmez**.

- **Türetilemeyen büyüklük uydurulmaz.** Far-end crosstalk (FEXT) modal hız farkına bağlıdır.
  Diferansiyel çift motoru tek bir εeff kullanır; bu, iki modun hızını özdeş varsaymak
  demektir ve o varsayım altında FEXT katsayısı `K_f = −½·t_pd·(C_m/C − L_m/L)` özdeş olarak
  **sıfır** çıkar. Microstrip'te FEXT genelde baskın crosstalk olduğu için bu sıfır yanlıştır.
  Bu yüzden `signalIntegrity.js` FEXT'i `Z_odd`/`Z_even`'den türetmez: kullanıcı odd ve even
  mod εeff değerlerini elle girerse hesaplar, girmezse `SI_ERR_NO_FEXT` döndürür. Kapalı
  formdan geliyormuş gibi sunulan yanlış bir sayı, sonuç vermemekten kötüdür.

## Sonuç sunumu

Her sonuç; kullanılan denklem, ara değerler, geçerlilik sınırı ve mühendislik yorumuyla
birlikte verilir. Bir hesap eklerken geçerlilik aralığı uyarısını da ekle
(`validityWarnings` deseni) ve `.status` çipiyle güvenli / sınıra yakın / yetersiz durumunu
göster. Sonuçlar yaklaşık mühendislik tahminidir — bu uyarı footer'da sabit durur, araç
sayfalarında da tekrarlanır.
