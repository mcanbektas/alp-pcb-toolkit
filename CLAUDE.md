# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje

ALP PCB Toolkit — PCB tasarımı için çevrim içi mühendislik hesap araçları. Vite + React 18 +
react-router-dom. Tamamen client-side; backend, veritabanı, API çağrısı yok. Arayüz ve kod
yorumları Türkçe.

## Komutlar

```bash
npm install
npm run dev      # http://localhost:3000  (vite.config.js: port 3000, strictPort)
npm run build    # dist/
npm run preview
npm test         # vitest run — yalnızca src/lib/ altındaki saf hesap fonksiyonları
npm run test:watch
```

Linter kurulu değil. Test kapsamı bilinçli olarak dar: **yalnızca `src/lib/` altındaki saf
hesap fonksiyonları test edilir. React bileşeni testi yazılmaz** — arayüz doğrulaması
`npm run build` + tarayıcıda elle kontrol ile yapılır. Yeni bir test/lint aracı eklemek
istersen önce sor.

**Yeni bir hesap motoru eklendiğinde `docs/spec.md` §13'te karşılığı varsa, testi de aynı
commit'te yazılır.** §13'ün altı referans testi (microstrip, via direnci, PDN hedef empedansı,
junction sıcaklığı, direnç kodu, yüklü gerilim bölücü) ilgili motor eklendiğinde teste dönüşür;
motor testsiz merge edilmez.

`main`'e her push → `.github/workflows/deploy.yml` → GitHub Pages. `base: './'` + `HashRouter`
kombinasyonu repo adından bağımsız çalışmayı sağlar; ikisini de değiştirme.

## Mimari

Bağımlılık yönü tek yönlüdür ve asla tersine çevrilmez:

```
pages → components → hooks → lib
                              ↑
                        services (bileşim kökü)
```

1. **`src/lib/`** — saf hesap fonksiyonları. React, DOM, tarayıcı API'si ve kullanıcıya
   görünen metin bilmez. Hata durumunda `{ error: <kod> }` döner; kodu metne çeviren taraf
   ekranın `text.js` dosyasıdır.
   - `num.js` — giriş ayrıştırma (`parseNum`, `parseNumResult`) ve gösterim
     (`fmt`, `fmtEng`, `fmtRes`, `fmtAmp`, `fmtPow`, `fmtPct`, `fmtOhm`, `fmtVolt`, `fmtWatt`).
   - `units.js` — fiziksel sabitler (`C0`, `EPS0`, `MU0`, `ETA0`, `RHO_CU_20`, `K_CU`) ve
     birim → SI çarpan tabloları (`LENGTH`, `CAPACITANCE`, `FREQUENCY`, …) + `toSI`/`fromSI`.
     Yeni sabit buraya eklenir, araç dosyasına gömülmez.
   - `fields.js` — form alanı okuma: birim çevirme, belirsiz binlik ayırıcı yakalama,
     eksik/geçersiz alanı ada göre bildirme. Her ekran bunu kullanır, kendi ayrıştırmasını
     yazmaz.
   - `solve.js` — sınırlandırılmış kök arama (`brent`, `bisection`, `expandBracket`,
     `solveBounded`). Tüm ters (sentez) hesaplar buradan geçer.
   - `storage.js` — kalıcı depolama **portu** (`read`/`write`/`remove`). `browserStorage`,
     `memoryStorage`, `nullStorage` uygulamaları burada.
   - `dataProfiles.js` — profil şeması ve doğrulaması + `createProfileStore(storage)`.
     `localStorage`'ı tanımaz, portu parametre olarak alır.
   - Hesap motorları: `traceCalc.js`, `ohm.js`, `divider.js`, `led.js`, `reactance.js`,
     `timing.js`, `crystal.js`, `codes.js`, `eseries.js`.
   - Dönüşüm motorları (`docs/spec.md` §11): `convertLength.js`, `convertAwg.js`,
     `convertFrequency.js`, `convertDecibel.js`, `convertTemperature.js`, `convertComplex.js`.
     Bunlar tanım gereği tam bağıntılardır; ampirik yaklaşım içermezler, kök çözücüye
     ihtiyaç duymazlar ve uç girdide `Infinity` döndürmek yerine aralık hata kodu verirler.
2. **`src/components/`** — sunum bileşenleri (`NumberField`, `SelectField`, `Segmented`,
   `Schematic`, `LineChart`). State tutmaz, hesap yapmaz.
3. **`src/hooks/`** — `useToolForm` yalnızca React state'ini yönetir; hesap bilgisi taşımaz.
4. **`src/services/`** — bileşim kökü. Somut bağımlılıklar (örn. `browserStorage`) yalnızca
   burada birbirine bağlanır.
5. **`src/pages/tools/<Ad>/`** — araç ekranı, dört dosya:
   - `index.jsx` — düzen ve state. Hesap yapmaz, metin üretmez.
   - `model.js` — alan tanımları + `compute()` + `buildSweep()`. Saf, test edilebilir.
   - `schematic.jsx` — devre/geometri SVG'si.
   - `text.js` — bulgu ve hata kodlarının Türkçe karşılıkları. İkinci dil gerekirse
     değişecek tek dosya budur.

`src/data/categories.js` tek kaynak: 7 kategori ve araç listesi. Bir aracın `path` alanı varsa
aktif, yoksa "yakında" olarak gösterilir — `Home.jsx` ve `CategoryPage.jsx` bu alana bakar.

**Bilinçli sapma:** `categories.js` 29 araç kaydı içerir, `docs/spec.md` §15 ise 21 ekran
sayar. Fark kasıtlıdır, düzeltilmemeli: spec'in 2. ekranı (*Trace Resistance, Voltage Drop
and Power Loss*) ayrı araç değil, `TraceWidth.jsx` içinde birleşik; spec'in 21. ekranı
(*BGA, Stack-Up and Thermal Relief*) `bga`, `stackup` ve `thermal-relief` olarak üçe
bölünmüştür; §11'in altı dönüşüm başlığı ise §15'te hiç sayılmadığı hâlde altı ayrı ekran
olarak uygulanmıştır (uzunluk, AWG, frekans/periyot, dB, sıcaklık, kompleks sayı) ve
*PCB Üretim, DFM ve Dönüşümler* kategorisinde durur.

### Yeni araç ekleme

Formüller ve gereksinimler için kaynak: **`docs/spec.md`**. Yeni bir araç yazmadan önce o
dosyanın ilgili bölümünü oku; denklemleri, sabitleri veya geçerlilik sınırlarını hafızadan
veya başka kaynaktan uydurma. Spec ile mevcut kod çelişirse dur ve sor.

Uyarı: spec'teki bazı formül blokları markdown dönüşümünde bozulmuş — açılış köşeli parantezi
düşmüş, araya `##` girmiş veya `*` işaretleri ifadeyi yemiş durumda. Bozuk bir bloğu tahminle
tamamlama; eksik olduğunu söyle ve sor.

1. Hesap motorunu `src/lib/<konu>.js` olarak yaz. Motor kod döner, metin döndürmez.
2. `src/pages/tools/<Ad>/` klasörünü dört dosyayla kur: `model.js`, `text.js`,
   `schematic.jsx`, `index.jsx`.
3. `src/App.jsx` içine `<Route path="/arac/<slug>" element={<Ad />} />` ekle.
4. `src/data/categories.js` içindeki ilgili araca `path: '/arac/<slug>'` ver.
5. `docs/spec.md` §13'te karşılığı varsa testi aynı commit'te yaz.

Referans ekran: `src/pages/tools/VoltageDivider/`. Yeni ekran yazarken panel düzenini,
terminolojiyi ve tablo yoğunluğunu oradan birebir kopyala.

### Birim ve sayı akışı

- Form state'i **string** tutar; ayrıştırma yalnızca `compute()` içinde `parseNum` ile yapılır.
- Birimler ayrı state alanında tutulur (`L` + `Lu`, `I` + `Iu`) ve çarpan tablolarıyla
  (`LEN_TO_M`, `W_TO_MM`) SI'ye çevrilir. Hesap içinde SI kullanılır.
- İstisna: ampirik ısınma denklemi tanımı gereği mil²/A/°C ile çalışır. Bu tür birim
  istisnaları kodda yorumla açıkça belirtilmeli.
- **Ara değerlerde asla yuvarlama yapılmaz.** `fmt*` yalnızca JSX içinde, ekrana yazarken
  çağrılır.
- **Binlik ayırıcı yorumlanmaz.** `"1.000"` bin mi 1.0 mı belirsizdir; `parseNumResult`
  bunu `NUM_ERR_THOUSANDS` ile geçersiz sayar, sessizce `1` döndürmez. Araç sayfası bu
  durumda hesap yerine `THOUSANDS_MESSAGE` uyarısını ve etkilenen alan adlarını gösterir
  (`TraceWidth.jsx` → `thousandsFields`).
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
  standart adı olmadan, yöntemi tarif ederek yazılır.
- **Yeni araçlar `src/pages/tools/TraceWidth.jsx`'teki 3 panelli deseni takip edecek:**
  `.tool-header` (başlık + açıklama) → `.tool-grid` içinde üç `.panel` (sol: *Girdiler*,
  orta: *Sonuç*, sağ: `.panel-detail` → *Teknik detay* + *Geçerlilik ve varsayımlar*) →
  kategoriye dönen `.backlink`. Orta panel bir `.big-result`, bir `.status` çipi ve bir
  `.result-table` içerir; sağ panel kullanılan denklemleri `.formula` bloğunda gösterir.
  Düzen kırılımları `theme.css` içindeki `.tool-grid` media query'lerinde tanımlı — yeni
  araç için grid yazmaya gerek yok.
- **Renkler her zaman `src/theme.css`'teki CSS değişkenlerinden gelecek.** JSX veya CSS içine
  literal renk (`#4ade80`, `rgb(...)`, `green`) yazma; `var(--accent)`, `var(--muted)`,
  `var(--warn)`, `var(--danger)` vb. kullan. Yeni bir renk gerekiyorsa önce `theme.css`
  `:root` bloğuna değişken ekle. Aynı kural fontlar için de geçerli: `var(--font-mono)`,
  `var(--font-display)`, `var(--font-body)`.
  Grafik serileri renk stringi taşımaz: eleman `tone-1`…`tone-4` / `tone-muted` sınıfını alır,
  çizim kuralları `var(--tone)` kullanır. `toneClass(i)` yardımcısı `LineChart`'tan gelir.

- **Ekrana özel CSS yazma ve inline style kullanma.** Tüm görsel kararlar `theme.css`
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
  İçe aktarma tek yerden geçer: **`src/lib/dataProfiles.js`** — şema doğrulaması, okuma/yazma
  ve silme orada. Ekran kendi `JSON.parse`/`localStorage` kodunu yazmaz. Profil zarfında
  `schemaVersion` alanı vardır; format değişirse eski profil sessizce yanlış okunmaz, açık
  hata döner. Kullanıcıya yönelik şema dokümanı: `docs/veri-profili-semasi.md` (boş iskelet +
  alan açıklamaları, gerçek veri içermez).

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
