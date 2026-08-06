# REV2 Üretimi — İlerleme Takibi

> **`/clear` sonrası okuma sırası:** (1) bu dosya, (2) `brif-rev2-kararlar.md`,
> (3) REV2 dosyasının son yazılan bölümü, (4) kaynak dokümanın sıradaki satır aralığı.

## Dosyalar

| Rol | Yol |
|---|---|
| Bozuk kaynak | `ALP PCB Toolkit – Birinci ve İkinci Paket Araçlarının Geliştirilmesi.md` (3975 satır) |
| Bağlayıcı kararlar | `brif-rev2-kararlar.md` |
| İlk inceleme raporu (arşiv) | `brif-duzeltme-notlari.md` |
| **Üretilen çıktı** | `ALP PCB Toolkit – Birinci ve İkinci Paket – REV2.md` |

Kaynak dosya **değiştirilmez**. REV2 ayrı dosyaya yazılır, parça parça eklenir.

## Yöntem

Her parça için: kaynağın ilgili satır aralığı okunur → formül blokları temiz LaTeX'e
çevrilir (`\[ ... \]`, kısa ifadelerde `\( ... \)`) → `brif-rev2-kararlar.md`'deki adlar,
semboller, yollar ve politikalar uygulanır → REV2 dosyasına eklenir → bu tablo güncellenir.

**Ekleme yöntemi:** REV2 dosyasının sonuna Edit ile ekle (son satırı `old_string` yapıp
altına yaz). Write ile tüm dosyayı yeniden yazma — önceki parçalar kaybolur.

## Parça planı

| Parça | İçerik | Kaynak satır | Durum |
|---|---|---|---|
| A | Başlık + giriş + §1 Mimari uyum + §2 Sabitler + §3 Sonuç sınıflandırması | 1–184 | **TAMAM** |
| B | §4 Dönüş Yolu ve Stitching Via + §5 Via Stub ve Backdrill | 186–670 | **TAMAM** |
| C | §6 MOSFET Gate Sürücü + §7 ADC Giriş Yerleşme | 672–1289 | **TAMAM** |
| D | §8 CAN ve RS-485 + §9 Shunt ve Kelvin | 1291–1953 | **TAMAM** |
| E | §10 PDN Rezonans + §11 Düzlem Kavite Rezonansı | 1955–2475 | **TAMAM** |
| F | §12 EMC Filtre + §13 Buck | 2477–3142 | **TAMAM** |
| G | §14 TVS ve ESD + §15 Flex PCB | 3144–3712 | **TAMAM** |
| H | §16 Tolerans + §17 Grafik + §18 Validasyon + §19 Yorum + §20 Rapor + §21 Test + §22 Kaynak etiketleri + §23 Tamamlanma + **Kesinleştirilmiş Uygulama Politikaları** | 3714–3975 | **TAMAM** |

## Parça bazlı özel işler

- **A** — §1'e: `web/src/...` yolları, altı dosyalı klasör şablonu (`report.test.js` dahil),
  12 aracın resmî ad/anahtar/URL tablosu, araç no ↔ bölüm no eşlemesi, kebab-case anahtar notu.
  §2'ye: `L_via,eq` sembol tanımı, kompleks motor gereksinimi.
- **B** — §5.8'de `l_nominal,target` ÇIKARMA. §4.7'de `ESL_total` içinde `L_via,eq`.
- **C** — §6.7'de `R_g,ext,on` ve `R_g,ext,off` ÇIKARMA. §7.5'te `R_source,max` ÇIKARMA.
- **D** — §8.4/8.5'e `t_fixed` tanımı + `L_max` ÇIKARMA + `BUS_FIXED_DELAY_EXCEEDS_SAMPLE_POINT`.
- **E** — §10.4'te `L_via,eq`. §10.9'a **prominence politikası** (dB, 3 dB varsayılan, plato,
  uç nokta kuralı). §10.10'a **worst-case droop istisna metni** + `engineering-rule` /
  `worst-case-time-domain-estimate` etiketi. §11 başlığı ve adı: **Düzlem Kavite Rezonansı ve
  Kapasitansı**, `power-plane` ile karıştırılmama notu.
- **F** — §12.8'e **damping politikası** (üç metrik + iki yardımcı, uygun bölge koşulları,
  Pareto, tek skor yok). §13.5'te `I_L,min` ÇIKARMA.
- **G** — §14.5'e **TVS çözücü politikası** (analitik öncelik, bisection, 16 genişletme,
  1e−9 / 1e−6, 100 iterasyon, `TVS_SOLVER_NO_CONVERGENCE`).
- **H** — §16'ya **mulberry32 + seed politikası**. §17'ye log dizisi formülü (ÇIKARMA) +
  `f_0=f_min`, `f_{N−1}=f_max` + `LOG_AXIS_NONPOSITIVE`. §18'e dört yeni hata kodu.
  Sonuna **Kesinleştirilmiş Uygulama Politikaları** bölümü (kararlar §11'deki 13 madde).

## Kalıcı biçim kuralları

- Bozuk desenlerin hiçbiri kalmayacak: `# **\[**`, başlığa dönmüş sol taraf, `**\[**`,
  setext `===`, `##` satırına dönmüş eksi terim.
- Blok formül: `\[` … `\]` ayrı satırlarda, tek ters bölü (kaynaktaki `\\[` çift kaçışı düzeltilir).
- Alt indisler `\text{}` ile: `l_{\text{residual,max}}`.
- Sayısal test sonuçları **aynen** korunur (kararlar §1 tablosu).
- Araç adları/anahtarları/URL'leri **yalnız** kararlar §6 ve §12 tablolarından.

## Bölüm numaralandırma kararı

Kaynak, giriş listesinde araçları 1–12, gövdede §4–§15 olarak numaralıyor. Doküman içi
çapraz atıflar gövde numaralarına dayandığı için **gövde numaraları (§4–§15) korunur**;
giriş bölümüne "Araç no ↔ bölüm no" eşleme tablosu eklenir. Talimatname yeniden
numaralandırma istemiyor.

## Durum

**REV2 TAMAM (2026-08-04).** Sekiz parçanın tamamı yazıldı, dosya 3952 satır, 24 bölüm.

### Otomatik denetim sonucu

- Bozuk desen kalıntısı: **0** (`# **\[**`, `**\[**`, setext `===`/`---`, çift kaçış `\\[`)
- Blok formül `\[` / `\]` dengesi: 319 / 319 — dengeli
- Inline `\(` / `\)` dengesi: 108 / 108 — dengeli
- Yedi kritik ÇIKARMA formülü + TVS analitik çözümü + log sweep: hepsi birebir yerinde
- `L_vias` / `L_via` eski sembolleri: 0 kalıntı; tek sembol `L_{\text{via,eq}}`
- 10 sayısal test değerinin tamamı korunmuş
- 12 aracın 12'sinde de resmî ad + araç anahtarı + URL kimliği + klasör satırı var
- Yasaklı ifade (`ipc`) taraması: 0 satır

### REV2'de bilinçli olarak yapılan iki ek düzeltme

Talimatnamede yer almayan ama uygulamada hataya yol açacak iki nokta çözüldü ve dokümanda
açıkça not edildi:

1. **`l_residual,max` sembol çakışması (§5.3 ↔ §5.8).** Kaynakta aynı ad iki farklı
   büyüklüğü taşıyordu: §5.3'te *gerçekleşen* worst-case residual stub, §5.8'de hedef
   rezonanstan gelen *izin verilen üst sınır*. §5.3'teki büyüklük `l_residual,wc` olarak
   ayrıldı; §5.8 talimatnamedeki adı (`l_residual,max`) birebir korudu. §5.3'e sembol
   notu eklendi.
2. **`IPC` ifadesi.** §22'deki "Lisanslı IPC veya IEC tablo verilerini repoya kopyalama"
   cümlesi, projenin mutlak kuralı gereği (`CLAUDE.md`: sitede hiçbir yerde `ipc`
   geçmeyecek) anlamı korunarak "Lisanslı standart veya kurum tablolarının verisi repoya
   kopyalanmaz" biçiminde yazıldı.

---

# UYGULAMA — REV2 §23.1 sırası

REV2 onaylandı (kullanıcı, 2026-08-04). Kod yazımı başladı.

## Adım durumu

| Adım | İş | Durum |
|---|---|---|
| 1 | Ortak kompleks sayı ve sweep motorları | **TAMAM** |
| 2 | Birinci paket hesap motorları | **TAMAM** (6/6) |
| 3 | Birinci paket ekranları ve testleri | **TAMAM** (6/6) |
| 4 | İkinci paket hesap motorları | **TAMAM** (6/6) |
| 5 | İkinci paket ekranları ve testleri | **TAMAM** (6/6) |
| 6 | Rapor ve proje kayıt entegrasyonu | **TAMAM** (ek iş yok) |
| 7 | Build, test ve regresyon kontrolü | **TAMAM** |

## Adım 1 — ortak altyapı (TAMAM)

Yeni dosyalar, hepsi `web/src/lib/`:

- **`complex.js`** — kompleks aritmetik: `add/sub/mul/div/inv/abs/arg/scale`,
  `series(list)`, `parallel(list)` (admitans toplamı, REV2 §10.8). Bölme Smith
  algoritmasıyla — naif formül PDN'in büyüklük aralığında taşıyor. Gösterim `{re, im}`,
  hata durumunda NaN bileşeni (hata kodu değil; sweep içinde binlerce çağrı var).
  DEVRE modelleri bilinçli olarak dışarıda.
- **`sweep.js`** — `logspace(fMin, fMax, n)`; ilk/son nokta TAM `fMin`/`fMax` (uçlar
  doğrudan atanır, formülden gelmez — REV2 §17 sözleşmesi). `pointsPerDecade`, `toDb`.
  Hata kodları: `log-axis-nonpositive`, `frequency-range-invalid`, `points-invalid`.
- **`peaks.js`** — `findResonances(freqs, mags, {threshold})`; dB tabanlı prominence,
  varsayılan 3 dB, aralık 0.5–20 dB, plato geometrik merkezi, uç noktalar
  sınıflandırma dışı (REV2 §10.9). Karşı tipte komşusu olmayan uçta prominence `null`
  döner ve doğrulanmaz — uydurma referans konmaz.
- **`units.js`** → `K_B = 1.380649e-23` eklendi.

Değişen mevcut dosya:

- **`components/LineChart.jsx`** — `yScale` prop'u eklendi, **varsayılan `'linear'`**
  (32 mevcut ekranın davranışı değişmez). `'log'` verildiğinde: y ekseni dolgusu log
  uzayında (`padRangeLog` — doğrusal dolgu alt sınırı sıfırın altına indirip ölçeği
  sessizce doğrusala düşürüyordu), tikler `logTicks`, sıfır/negatif y değerleri eksene
  alınmaz. `pathFrom` artık ÖLÇEKLENMİŞ değerin sonluluğunu da kontrol ediyor —
  log eksende negatif girdi ham hâliyle sonlu ama `log10` sonrası NaN, path'e "NaN"
  yazılırdı.

Testler: `complex.test.js`, `sweep.test.js`, `peaks.test.js` — 48 test.
Süit 2048 → **2096 yeşil**, `npm run build` temiz (82 sayfa prerender).

## Adım 2 — birinci paket hesap motorları (TAMAM)

Altısı da `web/src/lib/` altında, hepsi saf, hepsinin testi aynı commit'te.

| # | Motor | Bölüm | Referans testi |
|---|---|---|---|
| 1 | `returnPath.js` | §4 | §4.12 geçti — 500 MHz, 0.2998 m, 14.99 mm, 1.30 nH, 4.08 Ω |
| 2 | `viaStub.js` | §5 | §5.11 geçti — 7.495 GHz, 14.99 GHz |
| 3 | `gateDriver.js` | §6 | §6.12 geçti — 4 mA, 40 mW, 0.5 A, 20 ns |
| 4 | `adcSettling.js` | §7 | §7.12 geçti — 5.55 kΩ |
| 5 | `busPhysical.js` | §8 | CAN + RS-485; `t_fixed` çıkarması ve `BUS_FIXED_DELAY_EXCEEDS_SAMPLE_POINT` testli |
| 6 | `shuntKelvin.js` | §9 | §9.11 geçti — 5 mΩ, 0.5 W, 3.22 mA |

Süit **2096 → 2243 yeşil** (+147 test). Yedi kritik ÇIKARMA formülünün beşi bu adımda
koda girdi ve her biri ayrı testle korunuyor:

- §5.8 `l_nominal,target` → `viaStub.nominalBackdrillTarget`
- §6.7 `R_g,ext,on` / `R_g,ext,off` → `gateDriver.externalResistorForTarget`
- §7.5 `R_source,max` → `adcSettling.maxSourceResistance`
- §8.5 `L_max` → `busPhysical.maxBusLength`
- §13.5 `I_L,min` ve §14.5 TVS → Adım 4'te (ikinci paket)

### Yeniden kullanılanlar (kopya yazılmadı)

- `via.js → viaInductance({H, D})` — REV2 §4.5 ile birebir aynı formül
- `ohm.js → twoInParallel` — CAN/RS-485 terminasyon eşdeğerleri
- `eseries.js → nearestValue` — RS-485 bias direnci E24 yuvarlaması
- `units.js → K_B` — ADC kT/C gürültüsü

### Motor tasarım kararları

- Blok döndüren fonksiyonlar `{ error: KOD }`, skaler döndürenler `NaN`.
- Negatif sonuçlar **sıfıra kırpılmaz**: negatif gate direnci, negatif
  `R_source,max` ve negatif backdrill hedefi ayrı hata kodlarıyla bildirilir —
  kırpma, kullanıcıya çözülebilir bir problem varmış izlenimi verirdi.
- Opsiyonel bloklar (stitching kondansatörü, backdrill hedefi, hedef switching
  süresi, filtre, bias) girdi verilmezse `null` döner; uydurma varsayılan kurulmaz.

### Uygulama kararları (motorlar arası tutarlılık için)

- **Via endüktansı `via.js`'teki `viaInductance({H, D})`'den gelir**, kopyası yazılmaz.
  Formülü REV2 §4.5 ile birebir aynı (`0.2·H_mm·[ln(4H/D)+1]`, henry döner).
- Hata kodu deseni mevcut motorlarla aynı: `export const XX_ERR_YY = 'kebab-case'`.
- Fonksiyonlar destructure edilmiş tek nesne alır (`via.js` deseni).
- Sayısal olmayan başarısızlıkta `NaN` (skaler döndüren yardımcılar) veya
  `{ error: KOD }` (blok döndüren fonksiyonlar).
- Her motorun REV2'deki referans testi aynı commit'te yazılır.

## Adım 3 — birinci paket ekranları (SIRADAKİ İŞ)

**Buradan başla.** Altı araç, her biri altı dosya. Referans ekran:
`web/src/pages/tools/VoltageDivider/` — panel düzeni, terminoloji, tablo yoğunluğu ve
`getText(lang)` deseni oradan **birebir** kopyalanır.

### Önerilen sıra

Önce **1 numaralı aracı (Dönüş Yolu) baştan sona bitir**, deseni kullanıcıya göster,
onay al. Kalan beşi ondan sonra seri yazılır. Altısını birden yazıp desen yanlış çıkarsa
altı ekran birden düzeltilir — geri dönüş riski bu yüzden bölündü.

### Araç başına yapılacaklar

| # | Klasör | Motor | `id` / `slugEn` | `path` |
|---|---|---|---|---|
| 1 | `ReturnPathStitchingVia` | `returnPath.js` | `return-path-stitching-via` | `/arac/donus-yolu-stitching-via` |
| 2 | `ViaStubBackdrill` | `viaStub.js` | `via-stub-backdrill` | `/arac/via-stub-backdrill` |
| 3 | `MosfetGateDriver` | `gateDriver.js` | `mosfet-gate-driver` | `/arac/mosfet-gate-surucu` |
| 4 | `AdcSettlingRcFilter` | `adcSettling.js` | `adc-settling-rc-filter` | `/arac/adc-giris-yerlesme-rc-filtre` |
| 5 | `CanRs485PhysicalLayer` | `busPhysical.js` | `can-rs485-physical-layer` | `/arac/can-rs485-fiziksel-katman` |
| 6 | `ShuntKelvin` | `shuntKelvin.js` | `shunt-kelvin` | `/arac/shunt-kelvin` |

Adlar ve anahtarlar **yalnız** `brif-rev2-kararlar.md` §6 ve §12 tablolarından alınır.

Her araç için, `CLAUDE.md`'deki "Yeni araç ekleme" adımlarıyla birlikte:

1. `web/src/pages/tools/<Klasör>/model.js` — alan tanımları + `compute()` + `buildSweep()`.
   Saf; hesabı `lib/` motoruna devreder, kendi formülünü yazmaz. Alan etiketlerini
   `labels` parametresiyle dışarıdan alır, dil bilmez.
2. `text.js` — **doğduğu anda iki dilli**, tek dış yüz `getText(lang)`. Hata kodlarının
   TR/EN karşılıkları burada (REV2 §18 listesi + motorun kendi kodları).
3. `schematic.jsx` — parametrik SVG, bütün yazılar `text` prop'undan.
4. `index.jsx` — üç panelli düzen (`ToolHeader` → Girdiler / `ResultPanel` /
   `.panel-detail`), `Commentary`, `LineChart`, `ReportDialog`, `SaveToProject`,
   `useSavedCalculation`. Ekranda hesap YOK.
5. `report.js` + `report.test.js` — ekranla **aynı** `r`/`s`/`text` kaynağından aynı satırlar.
6. `App.jsx` → `lazy()` importu + `TOOL_SCREENS` kaydı (rota yolu YAZILMAZ, katalogdan üretilir).
7. `data/categories.js` → `path` + `slugEn` + `{tr,en}` ad. `name` ekranın `h1`'i ile birebir.

### Kategori yerleşimi (öneri, kullanıcıya doğrulatılacak)

- 1, 2 → `via-padstack`
- 3 → `komponent` (veya `guc-termal`)
- 4 → `komponent`
- 5 → `sinyal-butunlugu`
- 6 → `akim-guc-bakir`

### Bu adımda dikkat

- `toolKey === categories.js id` — ayrışırsa proje listesinde ham anahtar görünür ve
  kayıt geri açılmaz. `pages/tools/toolKeys.test.js` bunu denetliyor.
- Düz `Link` kullanma, `LangLink`. `langLink.guard.test.js` yakalar.
- Çıplak Türkçe dize bırakma; `aria-label`, `title`, `<summary>` ve **isteğe bağlı prop
  varsayılanları** dahil. Saf ASCII Türkçe sözcükler ("Veri tablosu", "birimi", "adet")
  grep'e takılmaz — iki kez gözden kaçmış.
- Yeni ekranlar `sweep.js → logspace` kullanır; mevcut ~10 `model.js` kopyası dokunulmaz.
- Log-log grafik gereken yerde `LineChart`'a `yScale="log"` verilir (Adım 1'de eklendi).
- Renk sabiti ve inline style yasak; `tone-1..4` ve tema değişkenleri.
- Her ekran `docs/spec.md` ile çelişirse dur ve sor — REV2 §23.1 son maddesi.

### Sonraki adımlarda beklenen ön iş

- Katalogda "yakında" placeholder kaydı sıfır — 12 aracın 12'si de sıfırdan kayıt ister.
- Heatmap bileşeni yok (REV2 §11.10 mode heatmap); dikey (x) referans çizgisi
  `LineChart`'ta render edilmiyor.
- `CLAUDE.md` sayımları bayat ("29 araç", "25 ekran"); güncel 32, yeni araçlarla artacak.
- Ortak log-sweep yardımcısı yalnız YENİ araçlarda kullanılır; mevcut ~10 `model.js`
  kopyası bilinçli olarak dokunulmadan bırakıldı (regresyon riski, ayrı iş).

### Araç 1 — Dönüş Yolu ve Stitching Via Planlayıcı (TAMAM, kullanıcı onayı bekliyor)

`web/src/pages/tools/ReturnPathStitchingVia/` — altı dosya + `categories.js`
(`via-padstack` kategorisi) + `App.jsx` kaydı. Süit 2266 yeşil, `npm run build` temiz,
84 sayfa prerender (82→84). Commit ATILDI (bkz. "Adım 3 sonrası review + commit").

**Referans artık VoltageDivider'a EK OLARAK bu ekran da** — özellikle motoru findings
üretmeyen araçlarda (`returnPath.js` ve Adım 2'nin diğer beş motoru — hiçbirinde
`divider.js`-tipi bir `findings()` yok): `commentary(r)` doğrudan ekranın `text.js`'inde
kurulur, `ThermalVia` deseniyle aynı (`worstLevel`/`statusChip`/`countAtLevel` +
`<Commentary items={notes} />`). Kalan beş ekranda da bu yol izlenir, motor dosyalarına
findings fonksiyonu eklenmez.

REV2 §4.2'nin dört alanı (başlangıç/hedef katman adı, başlangıç/hedef referans düzlemi
adı) bilinçli atlandı — motor hiçbirini kullanmıyor, salt dekoratif olurdu ve referans
ekranda serbest metin alanı deseni yok. `signalType` ve `planeType` kaldı çünkü gerçek
bulgu üretiyorlar (güç düzlemine kondansatörsüz geçiş → uyarı, bölünmüş düzlem →
tehlike — REV2 §4.1'in kendi senaryo listesinden). Kalan araçlarda da aynı elek
uygulanır: motora girmeyen "dekoratif" REV2 alanı, ancak gerçek bir bulgu/dal
üretiyorsa tutulur.

**Yan bulgu, düzeltildi:** react-dom 18.3.1'in `renderToPipeableStream`'i bazı
derlemelerde (deterministik DEĞİL, derlemeden derlemeye farklı sayfaları vuruyor,
mevcut 32 aracın hepsi risk altında) HTML metnine tekil `\0` bayt karıştırıyor. Kök
neden bulunamadı (izole küçük tekrarla üretilemedi). `scripts/build-prerender.mjs`'e
savunma amaçlı süzme eklendi (`renderRoute()` sonrası, kabuğa yazmadan önce
`html.replaceAll('\0', '')` + konsol uyarısı). Bu araca özgü değil — tekrar
görülürse ya da tuhaf bir karakter bozulması fark edilirse önce burada aranır,
yeniden keşfedilmez.

### Araç 2–6 — kalan beş ekran (TAMAM, kullanıcı onayı bekliyor)

Onaylanan Araç 1 deseni (VoltageDivider temel düzen + ReturnPathStitchingVia'nın
`commentary(r)` kurulumu) birebir tekrarlanarak seri yazıldı. Altısı da
`via-padstack`/`komponent`/`sinyal-butunlugu`/`akim-guc-bakir` kategorilerine
(ilerleme tablosundaki öneriyle) kaydedildi, `App.jsx` → `TOOL_SCREENS`e eklendi.
Commit ATILDI (bkz. "Adım 3 sonrası review + commit"). MosfetGateDriver kategorisi
kullanıcı tarafından `komponent`te bırakıldı (`guc-termal`'a taşınmadı).

| # | Klasör | Kategori | Motor | Not |
|---|---|---|---|---|
| 2 | `ViaStubBackdrill` | `via-padstack` | `viaStub.js` | Varsayılan girdi REV2 §5.11 referansını (5 mm stub → 7.495 GHz) birebir üretir. |
| 3 | `MosfetGateDriver` | `komponent` | `gateDriver.js` | Kategori iki seçenekliydi (`komponent`/`guc-termal`); ilk sıradaki `komponent` seçildi, kullanıcı isterse taşınabilir. |
| 4 | `AdcSettlingRcFilter` | `komponent` | `adcSettling.js` | — |
| 5 | `CanRs485PhysicalLayer` | `sinyal-butunlugu` | `busPhysical.js` | Tek ekran, CAN/RS-485 arası `Segmented` mod anahtarı; iki motor da ayrı ayrı bağlı, ortak alanlar (terminasyon) paylaşılıyor. |
| 6 | `ShuntKelvin` | `akim-guc-bakir` | `shuntKelvin.js` | Varsayılan girdi REV2 §9.11 referansını (5 mΩ, 0.5 W, ≈3.22 mA) birebir üretir. |

**Ortak yeni birim tabloları** (`lib/units.js`, testli): `CHARGE` (gate charge, nC —
MosfetGateDriver), `ENERGY` (E_oss, µJ — MosfetGateDriver). İkisi de tek satırlık,
çarpımsal (offsetsiz) tablolar; mevcut `toSI`/`fromSI` mekanizmasına ek dosya
gerektirmeden oturdu.

**Motor hata kodlarının ekran katmanına yansıması — tutarlı bulgu:** beşinin de
`lib/` motoru, "hedeften geriye doğru direnç/backdrill/bias öner" tipi alt
hesaplarda (`nominalBackdrillTarget`, `externalResistorForTarget`,
`biasResistorForTarget`) hatayı ÜST DÜZEYDE değil, ilgili alt bloğun kendi
`.error` alanında taşıyor — yani `r.ok` true kalıyor, yalnız o alt blok
ulaşılamaz olduğunu bildiriyor. Ekranlar bunu ReturnPathStitchingVia'da
olmayan yeni bir desen olarak öğrendi: `commentary(r)` bu alt hataları ayrı
`danger` notlarıyla gösteriyor, hesabın tamamını bloklamıyor.

Testler: beş `report.test.js` + `units.test.js` genişlemesi. Süit 2266 → **2375
yeşil** (+109 test, 106 dosya). `npm run build` temiz — 94 sayfa prerender
(84→94, 5 araç × 2 dil). NUL-bayt süzücüsü bu derlemede de tetiklendi
(`/arac/shunt-kelvin` dahil, beklenen/deterministik-olmayan davranış — bkz.
yukarıdaki not), sessizce temizlendi.

### Adım 3 sonrası review + commit (TAMAM, 2026-08-04)

Commit öncesi 3 paralel agent ile review yapıldı (motorlar / ekranlar / entegrasyon).
Bulunan gerçek hatalar (en ciddisi: `CanRs485PhysicalLayer`'ın RS-485 modunda
kullanıcıya hiç görünmeyen CAN varsayılanlarını — 40 m, 5 ns/m, 1 Mbps — sessizce
hesaba ve rapora sızdırması) 6 paralel düzeltme agent'ıyla kapatıldı:

- **viaStub.js** — best-case residual kırpmasına açıklayıcı yorum; backdrill target
  hata durumunda artık ham `target` değerini de döndürüyor (kardeş motorlarla tutarlı).
- **gateDriver.js** — `GD_ERR_DRIVER_CURRENT` artık gerçekten bağlı (REV2 §6.10),
  önceden export edilip hiç kullanılmıyordu. MosfetGateDriver ekranı bunu danger
  notu olarak gösteriyor.
- **MosfetGateDriver** — `unit="adet"` sızıntısı (ekran+rapor) düzeltildi; `model.js`
  artık `totalResistance()`'ı yeniden yazmak yerine çağırıyor (bir NaN tuzağı vardı:
  varsayılan girdide taban dirençler 0 olduğu için doğrudan çağrı sweep'i NaN'a
  düşürürdü — `resistanceSweep` her noktada doğru parametrelerle çağıracak şekilde
  çözüldü); `yScale="log"` eklendi.
- **ReturnPathStitchingVia** — `yScale="log"` eklendi (text log-log diyordu, grafik
  lineer kalmıştı); `model.js`'te `Number()` → `parseNum`; `λ/d` etiketi text.js'teki
  `spacing()`'e bağlandı.
- **AdcSettlingRcFilter** — `schematic.jsx`'teki sabit `'R_series'` artık `text`
  prop'undan geliyor (tr: R_seri / en: R_series).
- **CanRs485PhysicalLayer** — RS-485 moduna kendi state alanları eklendi
  (`rs485Bitrate`/`rs485BusLength`/`rs485DelayPerMeter`), CAN'dan artık hiçbir
  değer sızmıyor; terminasyon alanları (bilinçli olarak) paylaşımlı kaldı.
- **ShuntKelvin** — yüzde işareti artık `text.pct(fmtPct(...))` ile (tr `%5`,
  en `5%`), önceden sabit sondaydı.
- 4 ekranda (`ViaStubBackdrill`, `MosfetGateDriver`, `AdcSettlingRcFilter`,
  `ShuntKelvin`) status `useMemo` bağımlılığı `[r, notes, ui]`'ye tamamlandı.

**Bilinen, bilinçli olarak bırakılan iki küçük DRY notu:** `ReturnPathStitchingVia/
report.js:39` ve `AdcSettlingRcFilter/schematic.jsx`'teki `'R_source'` aynı sınıftan
(satır içi sabit yerine hazır fonksiyon/text kullanılabilirdi) ama işlevsel hata
değil, bulgu kapsamı dışında bırakıldı.

**Final doğrulama:** süit 106 dosya / **2378 yeşil** (0 başarısız — önceki turdaki
`fieldSolver.test.js` timing-flaky testi de bu koşuda geçti, REV2 işiyle ilgisi yok).
`npm run build` temiz, 94 sayfa prerender, sitemap 94 url.

**3 commit atıldı** (adım başına, kullanıcı onayıyla):
- `4b08381` — feat: add complex arithmetic, log-sweep and peak-detection primitives (Adım 1)
- `89d61dc` — feat: add return path, via stub, gate driver, ADC settling, bus physical layer and shunt engines (Adım 2)
- `1a463cb` — feat: add six REV2 first-package tool screens (Adım 3, review düzeltmeleri dahil)

Brif/REV2 markdown dosyaları (bu dosya dahil) bilinçli olarak commit'e dahil edilmedi —
yalnız kod. `docs/kalan.md` ayrı bir iş hattı (Brif 06, sunucu günü), REV2 ile ilgisiz.

## Adım 4 — ikinci paket hesap motorları (TAMAM, 2026-08-04)

Altısı da `web/src/lib/` altında, 6 paralel agent ile yazıldı, hepsi saf, testleri
aynı commit'te. Motor dosya adları mevcut `pdn.js` (PDN Target Impedance) ve
`plane.js` (Güç Düzlemi / power-plane) ile ÇAKIŞMAZ — REV2'nin yeni araçları
`pdnResonance.js`/`planeCavity.js` adını aldı, ikisi de eski araçlara dokunmadı.

| # | Motor | Bölüm | Referans testi |
|---|---|---|---|
| 7 | `pdnResonance.js` | §10 | Kararlar §1'de ayrı satırı yok (araç yeni); 48 test, elle/Node doğrulanmış değerlerle |
| 8 | `planeCavity.js` | §11 | 3.5417 nF, f10=f01≈749.48 MHz — REV2 §11.11 |
| 9 | `emcFilter.js` | §12 | 15915.49 Hz, 1 Ω tam eşleşme |
| 10 | `buck.js` | §13 | D=0.5, 20 µH, 5.75 A, C_out=18.75 µF (I_L,min gerçek değeri 4.25 A — kararlar §1'in "2.5 A" kolonu I_CIN,RMS'e ait, REV2 kaynağına göre düzeltildi) |
| 11 | `tvsEsd.js` | §14 | 33.5 A, 1105.5 W |
| 12 | `flexPcb.js` | §15 | 2.4 mm, ε%≈4.17 |

Süit 2378 → **2597 yeşil** (+219 test, 112 dosya). `npm run build` temiz, 94 sayfa
(ekran yok bu adımda, sayfa sayısı Adım 3'ten değişmedi — beklenen).

### Motor başına dikkat çeken kararlar

- **`pdnResonance.js`** — `Y_total = Σ1/Z_k` için `complex.js.parallel()`, rezonans/
  antirezonans tespiti için `peaks.js.findResonances()` (kendi prominence mantığı
  YOK). §10.10 worst-case droop tahmini `engineeringRule:
  'worst-case-time-domain-estimate'` etiketiyle döner — açıklama CÜMLESİ motorda
  değil, Adım 5'in `text.js`'inde yazılacak (motor dil bilmez kuralı).
- **`planeCavity.js`** — `firstCavityModes` gelecekteki mode heatmap'i (REV2 §11.10)
  besleyecek şekilde tasarlandı. Kullanılmayan girdiler (bakır kalınlığı, kondansatör
  sayısı, frekans aralığı, kenar koşulu) REV2 §11.3–§11.8 formüllerinde hiç geçmiyor —
  Adım 5 ekran/rapor katmanının konusu, motora uydurma bağlanmadı.
- **`emcFilter.js`** — üç topoloji (`lc`/`pi`/`cm-choke`) genel bir ABCD (2-port
  zincir) modeliyle temsil edildi, repoda ilk kez kullanılan bir desen (PDN'in
  paralel-dal modelinden farklı, EMC filtresi bir merdiven ağı). Damping politikası
  (kararlar §3.3) TEK SKOR üretmiyor: `evaluateDampingCandidate` ham metrik + `suitable`
  bayrakları döner, `evaluateDampingCandidates` `meetsAll` adaylar arasında Pareto
  `dominated` bayrağı hesaplar (uygun olmayan adayda `dominated: null` — uygulanamaz,
  false değil). **Review'da bulunup düzeltildi:** her iki fonksiyon da başarı
  durumunda `ok: true` DÖNDÜRMÜYORDU (diğer 5 motorun toplayıcı fonksiyonlarının
  hepsi döner) — `ResultPanel`'in `{r.ok && (…)}` kapısı Adım 5'te sessizce boş
  render ederdi. İki dönüşe de `ok: true` eklendi, 45/45 yeşil kaldı.
- **`buck.js`** — `switchingLoss`/`gateDrivePower` `gateDriver.js`'ten import
  edildi (kopya yazılmadı, formül şekli birebir aynı doğrulanarak). `I_L,min`
  negatif çıkması (DCM sınırı aşımı) KIRPILMAZ ve hata değildir — REV2 §13.1 aracın
  kapsamını CCM ile sınırlıyor, negatif değer + `classifyConductionMode()` durum
  etiketi (`viaStub.js`'teki `classifyKt` deseniyle aynı: durum, hata değil) döner.
  Worst-case droop istisnası (kararlar §5) BU motora değil `pdnResonance.js`'e ait
  (§10.10) — Buck'ın kendi §13.6 droop toplamı REV2'nin ayrı, daha basit "kaba
  yaklaşım" ifadesi, complex-impedance kuralından istisna değil çünkü zaten kompleks
  bir PDN hesabı yok.
- **`tvsEsd.js`** — **`solve.js`'i BİLİNÇLİ OLARAK kullanmıyor**, kendi bounded
  bisection'ını yazdı (`solveTvsPulseCurrentBisection`). Gerekçe (dosya içinde
  yorumla belgeli): `expandBracket` simetrik genişliyor ve `x0 > min` şart koşuyor —
  kararlar §3.2 `I_min` sabit 0 ister ve `I_max=0` (V_surge≤V_BR) geçerli bir uç
  durumdur, `expandBracket` bunu `INVALID` sanır. `bisection()`'ın tek yakınsama
  ölçütü aralık yarı-genişliği — §3.2 mutlak residual (1e-9 A) VEYA bağıl adım
  (1e-6) ikili kriterini istiyor, `solveBounded` seçenekleriyle ifade edilemiyor.
  Analitik (lineer model) ve sayısal (bisection) yolun aynı örnekte tutarlı
  sonuç verdiği ayrıca test edildi. **Not: mulberry32/Monte Carlo (kararlar §3.5)
  bu motorda YOK** — o REV2 §16.1'e ait, opsiyonel/ayrı bir alt sistem, Adım 4
  kapsamında değil.
- **`flexPcb.js`** — `rhoCuAt` (units.js), `degToRad` (convertComplex.js),
  `checkLimit` (dfmCheck.js) yeniden kullanıldı. REV2 §15.9'un 10 clearance
  kontrolünden yalnız 3'ü (via/pad/stiffener mesafesi) sayısal — kalan 7'si
  (keskin açı, keskin köşe, katman geçişi, vb.) formülsüz/layout-geometri
  gerektiriyor, motora uydurma bağlanmadı, bilinçli olarak atlandı.

units.js'e HİÇBİR motor dokunmadı (hepsi mevcut tablolarla karşılandı, `git diff`
ile teyit edildi) — Adım 3'teki gibi paralel-yazım çakışma riski bu adımda hiç
gerçekleşmedi.

**Final doğrulama + review:** tam süit 2597/2597, build temiz. Bağımsız 1 review
agent 6 motoru tarattı (Adım 3'ün 3-agent'lık ağır turundan daha hafif — bu adım
yalnız motor, ekran/UI riski yok), yukarıdaki `ok:true` dışında bulgu çıkmadı.

**Commit atıldı:** `5d12f5a` — feat: add PDN resonance, plane cavity, EMC filter,
buck, TVS/ESD and flex PCB engines (Adım 4).

## Adım 5 — ikinci paket ekranları ve testleri (TAMAM, 2026-08-04)

6 yeni ekran: PdnResonanceAnalyzer, PlaneCavityResonance, EmcFilterDesigner,
BuckPcbPreDesign, TvsEsdProtection, FlexPcbBendTrace. Adlar/anahtarlar/URL'ler
kararlar §6 ve §12'den, birebir. Desen Adım 3 ile aynı (VoltageDivider temel
düzen + ReturnPathStitchingVia'nın `commentary(r)` kurulumu — bu 6 motorun da
`findings()`'i yok).

### Kategori yerleşimi (öneri → onay)

Adım 3'teki gibi öneri çıkarılıp kullanıcıya sunuldu, onaylandı:

| # | Araç | Kategori | Gerekçe |
|---|---|---|---|
| 7 | PDN Rezonans Analizörü | `guc-termal` | pdn/decoupling'in frekans-domain uzantısı |
| 8 | Düzlem Kavite Rezonansı | `guc-termal` | power-plane'den ayrı (kararlar §8), rezonans konusu guc-termal'e yakın |
| 9 | EMC Filtre Tasarım | `guc-termal` | converter gürültü filtresi, buck/PDN yanı |
| 10 | Buck PCB Ön Tasarım | `guc-termal` | converter tasarımı |
| 11 | TVS/ESD Koruma | `komponent` | gate-driver/adc-settling gibi uygulama-özel devre hesaplayıcı |
| 12 | Flex PCB Bükülme/İz | `uretim-dfm` | mekanik/üretim kısıtı, stack-up/BGA/thermal-relief yanı |

Sonuç: `guc-termal` 3→7 araç, `komponent` 9→10, `uretim-dfm` 4→5. Toplam araç
sayısı 32→44 (`CLAUDE.md`'deki "29 araç"/"32 araç" sayımları artık daha bayat —
bilinen teknik borç, dokunulmadı).

### Yazım yöntemi — Adım 3'ten sapma (bilinçli)

Adım 3'te desen henüz kanıtsız olduğu için ilk araç bitirilip onay alındıktan
sonra kalan beşi **seri** yazılmıştı. Adım 5'te desen zaten 11 ekranda kanıtlı
olduğu için 6 ekranın **6'sı da paralel agent'la, birbirini görmeden** yazıldı
(App.jsx/categories.js kaydı hariç tutuldu — o iki dosyaya hiçbir builder agent
dokunmadı, hepsi bitince tek elden ben ekledim, çakışma sıfır). Süreçte bir kez
oturum limiti dolup 6 agent da yarıda kaldı (PlaneCavityResonance 6/6 dosyayı
bitirmişti, PdnResonanceAnalyzer/FlexPcbBendTrace kısmi, EmcFilterDesigner/
BuckPcbPreDesign/TvsEsdProtection sıfır dosya) — limit yenilenince her agent
`SendMessage` ile kendi transcript'inden resume edildi, hiçbiri sıfırdan
başlamadı.

### Motor başına dikkat çeken kararlar

- **PdnResonanceAnalyzer** — REV2 §10.2'nin listelemediği ama motorun gerçekten
  okuduğu bir alan (`deltaT`, "Load step duration") eklendi; `ESR_eq`/`L_eq`
  `capGroups`'tan türetilmek yerine bağımsız opsiyonel alan olarak bırakıldı
  (motorda böyle bir türetme yardımcı fonksiyonu yok). §10.10 worst-case droop
  istisna cümlesi REV2'den birebir kopyalanıp `engineering-rule`/
  `worst-case-time-domain-estimate` etiketiyle gösteriliyor. `LineChart`'ın tek
  `marker` prop'u olduğu (çoğul yok) keşfedildi — bileşene dokunulmadı, worst
  antirezonans tek marker'a, tam doğrulanmış tepe/çukur listesi ayrı tabloya
  kondu.
- **PlaneCavityResonance** — `firstCavityModes` gelecekteki heatmap için
  (henüz yok, uydurulmadı); §11.10'un 5 grafiğinden 3'ü var, kalan ikisi
  (heatmap, dikey frekans işareti) gerçek teknik sınır (`LineChart.refLines`
  yalnız `y` işliyor, `x` işlemiyor) yüzünden yok. Bakır kalınlığı/kondansatör
  sayısı/frekans aralığı/kenar koşulu forma girmedi (motor okumuyor).
- **EmcFilterDesigner** — kararlar §3.3 "tek skor YOK" politikası tam
  uygulandı: `evaluateDampingCandidates(candidates=[null, ...rows])` deseni
  (motorun kendi "undamped baseline" sözleşmesi), 3 ana + 2 yardımcı metrik
  ayrı sütun, `dominated` true/false/null doğru ayrıştırılmış, 3 ana grafik
  gerçekten ayrı. Review'da bulgu ÇIKMADI — 6 ekran arasında tek istisna.
- **BuckPcbPreDesign** — `I_L,min` negatif kırpılmadan, `classifyConductionMode()`
  ile `warn` seviyede gösteriliyor. **Review'da gerçek mühendislik hatası
  bulundu**: verim-düzeltmeli `duty.approx` (`Vout/(η·Vin)`) motorda hiç
  sınırlanmıyor, düşük verimde %100'ü kolayca aşıyor (örn. η=%30 → ≈278%) ve
  ekran bunu uyarısız basıyordu — düzeltildi, artık aralık dışında `danger`
  seviyeli commentary notu var (motor DEĞİŞMEDİ, düzeltme ekran katmanında).
- **TvsEsdProtection** — motorun gerçek hata kodu `TVS_ERR_NO_CONVERGENCE`
  (üst düzey `r.error`, alt-blok değil). Monte Carlo bilinçli olarak YOK.
  `TVS_CLAMP_EXCEEDS_LIMIT` (REV2 §18.1'de listeli ama tetikleme koşulu
  hiçbir kaynakta tanımsız, motor da üretmiyor) icat edilmedi; yerine REV2
  §14.3'ün gerilim sıralama kontrolü (V_normal,max<V_RWM<V_BR<V_C) opsiyonel
  yorum notu olarak kuruldu.
- **FlexPcbBendTrace** — REV2 §15.9'un 10 clearance kontrolünden yalnız 3'ü
  (via/pad/stiffener) sayısal, `DfmChecks` bileşeni yeniden kullanıldı; kalan
  7'si uydurulmadı, tek satır bilgi notuyla bırakıldı.

### Review + düzeltme (TAMAM)

Adım 3'ün 3-agent deseni tekrarlandı (motorlar Adım 4'te zaten incelendiği için
yalnız ekranlar/entegrasyon): **ekran pattern/i18n**, **REV2/motor sadakat +
belirsizlik-karar denetimi**, **entegrasyon/tutarlılık** — 3 paralel salt-okunur
review agent. Entegrasyon 8/8 madde temiz çıktı (id/path/slugEn/name kararlar
tablosuyla birebir, çakışma yok, 12 sayfa+12 sitemap URL doğru, mevcut 44
araçtan hiçbiri bozulmadı). Pattern + sadakat review'ları toplam **8 gerçek
bulgu** çıkardı, 4 ekranda:

| Ekran | Bulgu | Önem |
|---|---|---|
| BuckPcbPreDesign | `duty.approx` sınırlanmıyor, %100 üstü uyarısız | **yüksek** (mühendislik) |
| BuckPcbPreDesign | `powerViaCount` birimi ('adet') İngilizce rapora sızıyor | orta (i18n) |
| BuckPcbPreDesign | `sectionInOut` başlığı tanımlı ama render edilmemiş | düşük |
| TvsEsdProtection | `yScale` sabit `linear`, log-şekilli 2 sweep'te yanlış | orta (görsel) |
| TvsEsdProtection | standart "yuvarlama yok" notu eksik (39/44 ekranda var) | düşük |
| FlexPcbBendTrace | 4 sweep lineer örnekleniyor, `logspace()` kullanılmamış | orta (görsel) |
| PlaneCavityResonance | `λ/${n}` iki dosyada elle tekrarlanmış (DRY) | düşük |
| PlaneCavityResonance | `refLabel: {}` ölü kod | kozmetik |

4 paralel düzeltme agent'ı (ekran başına, Adım 3'teki "6 paralel düzeltme
agent'ı" deseniyle aynı) hepsini kapattı. FlexPcbBendTrace agent'ı ayrıca
kendiliğinden bir kenar-durum hatası buldu ve düzeltti: `vendorFactorSweepRows`
çok küçük `K_b` için `from>to` üretebiliyordu, `logspace()` bunu hata olarak
döndürüyor — `values ?? []` koruması eklendi.

**Final doğrulama:** süit 118 dosya / **2752/2752 yeşil**, `npm run build`
temiz, prerender 94→106 sayfa (12 yeni: 6 araç × 2 dil), sitemap 106 url.
NUL-bayt süzücüsü yine tetiklendi (bilinen, deterministik olmayan davranış,
Adım 3'ten beri belgeli).

**Commit atıldı:** `383b518` — feat: add PDN resonance, plane cavity, EMC
filter, buck, TVS/ESD and flex PCB tool screens (Adım 5, review düzeltmeleri
dahil, 38 dosya). Brif/REV2 markdown dosyaları yine bilinçli olarak dışarıda.

## Adım 6 — rapor ve proje kayıt entegrasyonu (TAMAM, ek iş yok)

Araştırıldı: ayrı bir iş kalemi yok. `api/Alp.Reports/ReportPayload.cs` bilinçli
olarak araç-bağımsız (dosya başı yorumu: "sunucu araçların hiçbirini tanımaz,
yeni araç eklendiğinde bu dosyada hiçbir şey değişmez") — `ReportSection`/
`ReportField`/`ReportTable` tamamen jenerik, `PdfReportBuilder.cs`/
`XlsxReportBuilder.cs`'de araç bazlı case/whitelist yok, yalnız `note.Level`
switch'i var. REV2 §20 de araç-özel değil, 13 genel rapor alanı listeliyor.
Bu adım fiilen Adım 3/5'te her ekranla birlikte (`report.js`+`report.test.js`+
`SaveToProject`+`useSavedCalculation`) zaten tamamlandı, entegrasyon review'u
da doğruladı. Pareto/çok-metrikli EMC tablosu dahil yeni hiçbir rapor deseni
dizgi motorunda özel işlem gerektirmiyor (`ReportChart.Table` zaten jenerik
Columns/Rows).

## Adım 7 — build, test ve regresyon kontrolü (TAMAM, 2026-08-04)

Bu REV2 sürecinde (Adım 1-6) yalnız `web/`'in vitest süiti ve `npm run build`
her adımda koşmuştu; `api/` testi ve e2e hiç koşmamıştı — ilk kez burada koştu:

| Katman | Komut | Sonuç |
|---|---|---|
| web (saf fonksiyonlar) | `npm test` (vitest) | **2752/2752 yeşil**, 118 dosya |
| web (build+prerender+sitemap) | `npm run build` | temiz, 106 sayfa, sitemap 106 url |
| api | `dotnet test Alp.Api.sln` | **136/136 yeşil**, build hatasız |
| web (e2e, anonim akışlar) | `npm run test:e2e` | **25/25 yeşil** |

Regresyon YOK. `api/` tarafına REV2 boyunca hiç dokunulmadığı (Adım 6'nın
bulgusuyla tutarlı, rapor mimarisi araç-bağımsız) ve Adım 1'de değişen paylaşılan
`LineChart.jsx`'in (`yScale` prop'u eklendi) mevcut akışları bozmadığı
doğrulandı. e2e süiti yeni 12 aracı doğrudan kapsamıyor (dar/anonim akış
odaklı, beklenen) ama routing/dil altyapısını ve paylaşılan bileşeni
doğruluyor.

---

# REV2 TAMAMLANDI (2026-08-04)

7 adımın 7'si de TAMAM. 12 araç (2 paket), 6 commit, tüm katmanlarda (web
birim, web e2e, web build/prerender/sitemap, api) yeşil, regresyon yok.

| Adım | Commit |
|---|---|
| 1 — ortak motorlar | `4b08381` |
| 2 — birinci paket motorları | `89d61dc` |
| 3 — birinci paket ekranları | `1a463cb` |
| 4 — ikinci paket motorları | `5d12f5a` |
| 5 — ikinci paket ekranları | `383b518` |
| 6 — rapor/proje kaydı | (ayrı commit yok — mimari zaten araç-bağımsız) |
| 7 — build/test/regresyon | (ayrı commit yok — yalnız doğrulama) |

Katalog 32→44 araç. Kalan iş bu REV2 kapsamının dışında: `docs/kalan.md`
(Brif 06, sunucu günü) ayrı bir iş hattı.

## Sonradan: siteyi ayağa kaldırıp elle bakma (2026-08-05, commit `9f2bfd8`)

`npm run build` + `npm run stack` ile site açıldı ve 12 yeni araç tarayıcıda
TR+EN gezildi (Playwright ile: h1, durum çipi, `undefined`/`NaN` taraması,
kategori sayımları — hepsi temiz; kategori sayıları guc-termal 7, komponent 10,
uretim-dfm 5 olarak doğrulandı).

**Testlerin ve üç review turunun kaçırdığı 2 gerçek hata elle bakınca çıktı.**
İkisi de VARSAYILAN girdide, yani aracı açan herkesin ilk gördüğü ekranda, ve
ikisi de REV2'nin kendi referans örneği:

1. **TvsEsdProtection** — `V_clamp` ile `V_BR` ikili (`>`) karşılaştırılıyordu,
   eşitlik "breakdown geriliminin ALTINDA" dalına düşüyordu. Oysa eşitlik
   belgelenmiş NORMAL yol: `R_dyn` girilmediğinde (alanın kendi ipucu "0
   bırakın") `V_C = V_BR + 0·(I−I_T) = V_BR`. Ekran 33 V ve 33 V gösterirken
   "altında" deyip `danger` basıyordu. Eksik üçüncü dal eklendi — aynı dosyadaki
   kardeş `V_RWM` kontrolü eşitliği zaten doğru anıyordu, bu biri atlanmıştı.
2. **FlexPcbBendTrace** — bend radius / üretici minimumu ham `<` ile
   karşılaştırılıyordu. `2.4 mm` ile `12 × 0.2 mm` ikili tabanda **4.3e-19**
   farklı; tam sınırdaki tasarım "sınırın ALTINDA" raporlanıyordu, ekranda ikisi
   de 2.4 mm görünürken. Karşılaştırma `lib/dfmCheck.js` → `checkLimit`'e
   bağlandı (bağıl tolerans zaten tam bu kural için orada, `CLAUDE.md` dfmCheck
   maddesi); ikinci bir tolerans sabiti tanımlanmadı, seviye kararı ve cümle
   seçimi artık aynı sonuçtan okunuyor.

**Neden kaçtılar:** iki ekranın `report.test.js`'i sonuç DEĞERLERİNİ test
ediyordu (33.5 A / 1105.5 W, %4.17 / 2.4 mm — hepsi doğruydu), `commentary()`'nin
ürettiği SEVİYEYİ değil. Statik review de kaçırdı çünkü ikisi de ancak ekran
gerçekten çalıştırılınca görünüyor. Süite 7 regresyon testi eklendi ve
düzeltme geri alınarak **gerçekten kırmızıya döndükleri doğrulandı** (sahte
bekçi değiller). Süit 2752 → **2759 yeşil**, build temiz.

**Ders:** birim testi + statik review, "varsayılan girdiyle ekranı bir kez aç"
adımının yerini tutmuyor. Bu repoda React bileşen testi bilinçli olarak
yazılmıyor (`CLAUDE.md`), dolayısıyla yeni ekranlarda bu elle/otomatik tarayıcı
turu atlanmamalı.
