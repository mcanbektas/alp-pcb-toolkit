# ALP PCB Toolkit – Birinci ve İkinci Paket Araçlarının Geliştirilmesi

**Sürüm:** REV2 — kesinleştirilmiş uygulama dokümanı
**Kapsam:** 12 yeni mühendislik aracı, iki paket hâlinde

Sen; sinyal bütünlüğü, güç bütünlüğü, güç elektroniği, haberleşme fiziksel katmanları,
EMC, analog ölçüm devreleri ve PCB üretimi konularında deneyimli bir elektronik mühendisi
ve aynı zamanda kıdemli React geliştiricisisin.

Görevin, mevcut **ALP PCB Toolkit** projesine aşağıdaki 12 mühendislik aracını eklemektir.

---

## Araç listesi ve bölüm eşlemesi

Araçlar giriş listesinde 1–12 olarak numaralanır; dokümanın gövdesinde her araç kendi
bölümünde tarif edilir. Doküman içi çapraz atıflar **bölüm numarasına** yapılır.

### Birinci Paket

| Araç | Ad | Bölüm |
|---|---|---|
| 1 | Dönüş Yolu ve Stitching Via Planlayıcı | §4 |
| 2 | Via Stub ve Backdrill Hesaplayıcı | §5 |
| 3 | MOSFET Gate Sürücü ve Gate Direnci Hesaplayıcı | §6 |
| 4 | ADC Giriş Yerleşme ve RC Filtre Hesaplayıcı | §7 |
| 5 | CAN ve RS-485 Fiziksel Katman Hesaplayıcı | §8 |
| 6 | Shunt Direnci ve Kelvin Bağlantı Hesaplayıcı | §9 |

### İkinci Paket

| Araç | Ad | Bölüm |
|---|---|---|
| 7 | PDN Rezonans ve Antirezonans Analizörü | §10 |
| 8 | Düzlem Kavite Rezonansı ve Kapasitansı | §11 |
| 9 | EMC LC, Pi ve Ortak Mod Filtre Tasarım Aracı | §12 |
| 10 | Buck Dönüştürücü PCB Ön Tasarım Aracı | §13 |
| 11 | TVS ve ESD Koruma Boyutlandırıcısı | §14 |
| 12 | Flex PCB Bükülme ve İz Hesaplayıcı | §15 |

---

## Araçların niteliği

Bu araçlar basit birer hesap makinesi değildir. Her araç kullanıcıya:

* Ana sonucu
* Kullanılan denklemleri
* Ara hesaplamaları
* Yaklaşımın teorik temelini
* Varsayımları
* Geçerlilik sınırlarını
* Tolerans etkilerini
* Parametrik grafikleri
* Mühendislik yorumlarını
* Kritik tasarım uyarılarını
* Kaynak bilgisini

birlikte sunar.

Araçlar bir EDA, SPICE, 2D/3D elektromanyetik çözücü veya sertifikasyon laboratuvarının
yerine geçiyormuş gibi sunulmaz. Sonuçlar açık biçimde "ön tasarım", "yaklaşık mühendislik
tahmini", "kapalı form yaklaşımı" veya "üretici doğrulaması gerekli" şeklinde etiketlenir.

---

# 1. Mevcut Proje Mimarisine Uyum

Öncelikle repoyu ve özellikle aşağıdaki dosyaları incele:

```text
README.md
CLAUDE.md
docs/spec.md
web/src/data/categories.js
web/src/App.jsx
web/src/lib/
web/src/pages/tools/VoltageDivider/
web/src/pages/tools/Decoupling/
web/src/pages/tools/Termination/
web/src/pages/tools/ViaProperties/
web/src/pages/tools/StackUpPlanner/
```

Depo, web arayüzü ve API olmak üzere ikiye ayrılmıştır. Bu dokümandaki bütün arayüz
yolları `web/src/...` önekiyle yazılır.

Mevcut mimariyi değiştirme. Yeni araçları mevcut yapıya ekle.

Bağımlılık yönü şu şekilde kalır:

```text
pages → components → hooks → lib
```

## 1.1 Araç klasörü yapısı

Her araç için **altı zorunlu dosya** bulunur:

```text
web/src/pages/tools/<ToolName>/
├── model.js
├── text.js
├── schematic.jsx
├── index.jsx
├── report.js
└── report.test.js
```

Hesap fonksiyonları gerektiğinde ayrıca:

```text
web/src/lib/<calculationEngine>.js
```

altına eklenir. Hesap motorunun kendi testleri:

```text
web/src/lib/<calculationEngine>.test.js
```

olarak veya repo mevcut test yerleşim kuralı farklıysa mevcut örneklerle aynı düzende
konumlandırılır. Yeni bağımsız bir klasör standardı icat etme.

## 1.2 Mimari kurallar

* `web/src/lib/` içindeki hesap fonksiyonları saf olmalıdır.
* React, DOM, localStorage, grafik bileşeni veya kullanıcıya gösterilen metin hesap
  motoruna girmemelidir.
* Hesap fonksiyonları hata metni değil, hata kodu döndürmelidir.
* Bütün kullanıcı metinleri doğduğu anda Türkçe ve İngilizce yazılmalıdır.
* `model.js` dil bilmemelidir.
* Bütün iç hesaplamalar SI birimleriyle yapılmalıdır.
* Ara değerlerde yuvarlama yapılmamalıdır.
* Yuvarlama yalnızca kullanıcıya gösterim sırasında yapılmalıdır.
* Girişlerde hem virgül hem nokta ondalık ayracı kabul edilmelidir.
* Belirsiz binlik ayırıcılar sessizce yorumlanmamalıdır.
* Ekran üzerinde hesap yapılmamalı; bütün hesaplar saf fonksiyonlara aktarılmalıdır.
* Her araç rapor üretimine ve proje kaydına bağlanmalıdır.
* Her hesap motoru için Vitest testleri yazılmalıdır.
* Tüm SVG metinleri `text` prop'undan gelmelidir.
* Inline CSS veya araca özel renk sabitlemesi yapılmamalıdır.
* Mevcut tema değişkenleri kullanılmalıdır.
* Yeni araçlar `lazy()` ile yüklenmelidir.
* `categories.js`, `App.jsx`, araç anahtarı, rota, rapor anahtarı ve proje kayıt anahtarı
  birbirleriyle birebir uyumlu olmalıdır.

## 1.3 Araçların resmî adları, anahtarları ve URL kimlikleri

Aşağıdaki adlar; dokümanın girişinde, bölüm başlıklarında, `categories.js` kayıtlarında,
route tanımlarında, proje kayıtlarında ve rapor anahtarlarında **birebir** kullanılır.
Alternatif varyasyon kullanılmaz.

| # | Türkçe ad | İngilizce ad | Araç anahtarı | URL kimliği | Klasör |
|---|---|---|---|---|---|
| 1 | Dönüş Yolu ve Stitching Via Planlayıcı | Return Path and Stitching Via Planner | `returnPathStitchingVia` | `return-path-stitching-via` | `ReturnPathStitchingVia` |
| 2 | Via Stub ve Backdrill Hesaplayıcı | Via Stub and Backdrill Calculator | `viaStubBackdrill` | `via-stub-backdrill` | `ViaStubBackdrill` |
| 3 | MOSFET Gate Sürücü ve Gate Direnci Hesaplayıcı | MOSFET Gate Driver and Gate Resistor Calculator | `mosfetGateDriver` | `mosfet-gate-driver` | `MosfetGateDriver` |
| 4 | ADC Giriş Yerleşme ve RC Filtre Hesaplayıcı | ADC Input Settling and RC Filter Calculator | `adcSettlingRcFilter` | `adc-settling-rc-filter` | `AdcSettlingRcFilter` |
| 5 | CAN ve RS-485 Fiziksel Katman Hesaplayıcı | CAN and RS-485 Physical Layer Calculator | `canRs485PhysicalLayer` | `can-rs485-physical-layer` | `CanRs485PhysicalLayer` |
| 6 | Shunt Direnci ve Kelvin Bağlantı Hesaplayıcı | Shunt Resistor and Kelvin Connection Calculator | `shuntKelvin` | `shunt-kelvin` | `ShuntKelvin` |
| 7 | PDN Rezonans ve Antirezonans Analizörü | PDN Resonance and Antiresonance Analyzer | `pdnResonanceAnalyzer` | `pdn-resonance-analyzer` | `PdnResonanceAnalyzer` |
| 8 | Düzlem Kavite Rezonansı ve Kapasitansı | Plane Cavity Resonance and Capacitance | `planeCavityResonance` | `plane-cavity-resonance` | `PlaneCavityResonance` |
| 9 | EMC LC, Pi ve Ortak Mod Filtre Tasarım Aracı | EMC LC, Pi, and Common-Mode Filter Designer | `emcFilterDesigner` | `emc-filter-designer` | `EmcFilterDesigner` |
| 10 | Buck Dönüştürücü PCB Ön Tasarım Aracı | Buck Converter PCB Pre-Design Tool | `buckPcbPreDesign` | `buck-pcb-pre-design` | `BuckPcbPreDesign` |
| 11 | TVS ve ESD Koruma Boyutlandırıcısı | TVS and ESD Protection Sizing Tool | `tvsEsdProtection` | `tvs-esd-protection` | `TvsEsdProtection` |
| 12 | Flex PCB Bükülme ve İz Hesaplayıcı | Flex PCB Bend and Trace Calculator | `flexPcbBendTrace` | `flex-pcb-bend-trace` | `FlexPcbBendTrace` |

9 numaralı aracın arayüz metninde Yunan harfi `π` gösterilebilir; ancak araç anahtarı,
klasör adı ve URL içinde yalnızca ASCII `pi` kullanılır.

8 numaralı araç, mevcut **Güç Düzlemi ve Paralel Yol** (`power-plane`) aracından farklıdır.
Ayrıntı için bkz. §1.5.

## 1.4 Araç anahtarının kod içindeki biçimi

Yukarıdaki tablonun "araç anahtarı" sütunu aracın insan-okur resmî tanımlayıcısıdır ve
klasör adının türediği biçimdir. Kod içinde ise mevcut katalog kuralı geçerlidir:

* `categories.js` içindeki `id` alanı **kebab-case**'dir ve değeri "URL kimliği" sütununa
  eşittir.
* Repo kuralı gereği `toolKey === categories.js id` olmalıdır; dolayısıyla
  `SaveToProject`, rapor anahtarı ve proje kayıt anahtarı da aynı kebab-case değeri taşır.

Örnek: 1 numaralı araç için `id: 'return-path-stitching-via'`, klasör
`ReturnPathStitchingVia`, resmî anahtar adı `returnPathStitchingVia`.

Rota tarafında arayüz iki dillidir. Türkçe yol kanoniktir, İngilizce yol `slugEn`den türer:

| # | `path` (kanonik, Türkçe) | `slugEn` |
|---|---|---|
| 1 | `/arac/donus-yolu-stitching-via` | `return-path-stitching-via` |
| 2 | `/arac/via-stub-backdrill` | `via-stub-backdrill` |
| 3 | `/arac/mosfet-gate-surucu` | `mosfet-gate-driver` |
| 4 | `/arac/adc-giris-yerlesme-rc-filtre` | `adc-settling-rc-filter` |
| 5 | `/arac/can-rs485-fiziksel-katman` | `can-rs485-physical-layer` |
| 6 | `/arac/shunt-kelvin` | `shunt-kelvin` |
| 7 | `/arac/pdn-rezonans-analizoru` | `pdn-resonance-analyzer` |
| 8 | `/arac/duzlem-kavite-rezonansi` | `plane-cavity-resonance` |
| 9 | `/arac/emc-filtre-tasarim` | `emc-filter-designer` |
| 10 | `/arac/buck-pcb-on-tasarim` | `buck-pcb-pre-design` |
| 11 | `/arac/tvs-esd-koruma` | `tvs-esd-protection` |
| 12 | `/arac/flex-pcb-bukulme-iz` | `flex-pcb-bend-trace` |

`path` varken `slugEn` eksik olamaz.

## 1.5 Mevcut araçlar korunur

Aşağıdaki mevcut araçlar aktiftir ve korunur:

* PDN Target Impedance
* Decoupling
* Güç Düzlemi ve Paralel Yol (`power-plane`)
* Mevcut empedans araçları
* Mevcut terminasyon araçları
* Mevcut via araçları

**PDN Rezonans ve Antirezonans Analizörü (§10):**

* Mevcut PDN Target Impedance aracını silmez.
* Mevcut Decoupling aracını silmez.
* Bu araçların route veya proje anahtarlarını değiştirmez.
* Gerekirse ortak saf hesap yardımcılarını yeniden kullanır.
* Mevcut proje kayıtlarını geçersiz hâle getirmez.

**Düzlem Kavite Rezonansı ve Kapasitansı (§11):**

* Mevcut `power-plane` aracını silmez.
* Mevcut `power-plane` route'unu kullanmaz.
* DC akım taşıma ve paralel yol hesabıyla karıştırılmaz.

---

# 2. Ortak Fiziksel Sabitler ve Kompleks Motor

## 2.1 Sabitler

Tek bir ortak sabit dosyası kullan veya mevcut sabit dosyasını genişlet. Yeni sabit araç
dosyasına gömülmez.

Işık hızı:

\[
c=299\,792\,458\ \text{m/s}
\]

Boşluğun elektriksel geçirgenliği:

\[
\varepsilon_0=8.8541878128\times10^{-12}\ \text{F/m}
\]

Boşluğun manyetik geçirgenliği:

\[
\mu_0=4\pi\times10^{-7}\ \text{H/m}
\]

Boltzmann sabiti:

\[
k_B=1.380649\times10^{-23}\ \text{J/K}
\]

20 °C'de bakır özdirenci:

\[
\rho_{\text{Cu},20}=1.724\times10^{-8}\ \Omega\cdot\text{m}
\]

Bakır sıcaklık katsayısı:

\[
\alpha_{\text{Cu}}\approx0.00393\ /^\circ\text{C}
\]

Açısal frekans:

\[
\omega=2\pi f
\]

## 2.2 Kompleks empedans zorunluluğu

Kompleks empedans hesaplarının tamamı gerçek ve sanal bileşenlerle yapılır. Yalnızca
empedans büyüklüklerini toplayarak paralel kondansatör veya PDN hesabı yapılmaz.

Bu kuralın tek bilinçli istisnası §10.10'daki muhafazakâr zaman alanı droop tahminidir;
orada gerekçesi ve etiketi açıkça yazılıdır.

Kompleks sayı için mevcut motor varsa yeniden kullanılır. Yoksa şu temel işlemleri
destekleyen saf bir yardımcı motor oluşturulur:

* Toplama
* Çıkarma
* Çarpma
* Bölme
* Ters alma
* Büyüklük
* Faz
* Paralel empedans
* Seri empedans

Bu motor React, DOM ve kullanıcı metni bilmez; girdi ve çıktısı sayısal çiftlerdir.

## 2.3 Ortak endüktans sembolü

Via bağlantı endüktansı için doküman genelinde **tek** sembol kullanılır:

\[
L_{\text{via,eq}}
\]

Toplam eşdeğer seri endüktans:

\[
ESL_{\text{total}}=ESL_{\text{component}}+L_{\text{mount}}+L_{\text{via,eq}}
\]

Burada:

* \(ESL_{\text{component}}\): komponentin kendi eşdeğer seri endüktansı
* \(L_{\text{mount}}\): pad, neck ve yüzey bağlantısı endüktansı
* \(L_{\text{via,eq}}\): kullanılan via ağının eşdeğer bağlantı endüktansı

Birden fazla ideal ve bağımsız via için:

\[
L_{\text{via,eq}}\approx\frac{L_{\text{via,single}}}{N}
\]

yaklaşımı kullanılabilir. Ancak ortak akım yolu, mutual inductance veya ortak via neck
alanı varsa bu bölmenin **iyimser** olabileceği kullanıcıya açıkça yazılır.

---

# 3. Ortak Sonuç Sınıflandırması

Sonuçlar doğrudan "güvenli" veya "güvensiz" olarak verilmez. Şu sınıflandırma kullanılır:

* Uygun
* Marjinal
* Dikkat gerekli
* Model sınırı dışında
* Veri eksik
* Üretici doğrulaması gerekli
* Simülasyon gerekli
* Ölçüm gerekli

Standart veya üretici tablosu kullanılmıyorsa sonuç standart tabanlıymış gibi gösterilmez.

Kullanıcıya sunulan her kural şu tiplerden biriyle etiketlenir:

* Fiziksel bağıntı
* Kapalı form yaklaşık model
* Birinci mertebe eşdeğer devre
* Mühendislik sezgisi
* Muhafazakâr tasarım kuralı
* Üretici önerisi
* Kullanıcı tarafından tanımlanan sınır

Bu etiketlerin makine tarafındaki `sourceType` karşılıkları §22'de tanımlıdır.

---

# BİRİNCİ PAKET

---

# 4. Dönüş Yolu ve Stitching Via Planlayıcı

**Araç anahtarı:** `returnPathStitchingVia` · **URL kimliği:** `return-path-stitching-via`
· **Klasör:** `web/src/pages/tools/ReturnPathStitchingVia/`

## 4.1 Amaç

Bu araç, yüksek hızlı bir sinyalin:

* Katman değiştirmesi
* Referans düzlemi değiştirmesi
* Bölünmüş düzlem üzerinden geçmesi
* Kart kenarına yaklaşması
* Konnektöre veya kabloya bağlanması

durumlarında dönüş akımının izleyeceği yolu değerlendirir.

Araç kullanıcıya yalnızca "GND via ekle" demez; via endüktansı, frekansa bağlı via
reaktansı, via sayısı, stitching kondansatörü empedansı, dalga boyu ve önerilen geometrik
aralıkları gösterir.

Yüksek frekanslı dönüş akımı, en düşük DC dirençli yolu değil, döngü endüktansını en aza
indiren ve sinyal izine yakın olan referans yolunu izleme eğilimindedir. Katman
değişimlerinde dönüş yolunun devamlılığı stitching via veya uygun bir düzlemler arası
kondansatörle sağlanabilir.

## 4.2 Girdiler

Temel girdiler:

* Sinyal türü: tek uçlu / diferansiyel
* Clock veya temel sinyal frekansı
* Sinyal yükselme süresi \(t_r\)
* Kullanıcı tarafından seçilen bant genişliği yöntemi
* Dielektrik sabiti \(\varepsilon_r\)
* Etkin dielektrik sabiti \(\varepsilon_{\text{eff}}\)
* Başlangıç katmanı
* Hedef katman
* Başlangıç referans düzlemi
* Hedef referans düzlemi
* Düzlem türü: GND / power / split plane
* Referans düzlemleri arasındaki mesafe
* Via uzunluğu
* Via bitmiş delik çapı
* Stitching via sayısı
* Sinyal via ile en yakın dönüş viasının merkezden merkeze mesafesi
* Stitching via aralığı
* Maksimum analiz frekansı

Stitching kondansatörü seçeneği:

* Kapasitans
* ESR
* ESL
* Via ve bağlantı endüktansı
* Kondansatörün sinyal via'ya uzaklığı

## 4.3 Kenar bant genişliği

İki model sunulur.

**Tek kutuplu yaklaşık bant genişliği:**

\[
f_{3\text{dB}}\approx\frac{0.35}{t_r}
\]

**Muhafazakâr kenar bant genişliği:**

\[
f_{\text{edge}}\approx\frac{0.5}{t_r}
\]

Varsayılan olarak ikinci model kullanılabilir; ancak bunun kesin bir spektrum sınırı değil,
tasarım amaçlı yaklaşık değer olduğu açıkça belirtilir.

Saat frekansı düşük olsa bile yükselme süresi kısa olduğunda analiz frekansının saat
frekansından çok daha yüksek olabileceği gösterilir.

## 4.4 Yayılma hızı ve dalga boyu

Homojen dielektrik yaklaşımı:

\[
v_p=\frac{c}{\sqrt{\varepsilon_r}}
\]

Yüzey hattı için etkin dielektrik sabiti girilmişse:

\[
v_p=\frac{c}{\sqrt{\varepsilon_{\text{eff}}}}
\]

Dalga boyu:

\[
\lambda=\frac{v_p}{f}
\]

Stitching aralığı için kullanıcıya seçenek verilir:

\[
s_{\max}=\frac{\lambda}{N}
\]

Burada \(N\), kullanıcı tarafından 10, 20 veya 40 seçilebilen muhafazakârlık katsayısıdır:

* \(\lambda/10\): gevşek yaklaşım
* \(\lambda/20\): muhafazakâr başlangıç
* \(\lambda/40\): yüksek marjlı başlangıç

Bunlar standart zorunluluğu gibi değil, **mühendislik kuralı** olarak etiketlenir.

## 4.5 Via endüktansı

Silindirik via için birinci mertebe yaklaşık model:

\[
L_{\text{via,nH}}\approx0.2\,h_{\text{mm}}\left[\ln\left(\frac{4h_{\text{mm}}}{d_{\text{mm}}}\right)+1\right]
\]

Burada:

* \(h\): via'nın elektriksel uzunluğu
* \(d\): bitmiş delik veya iletken gövde çapı

Bu denklemin pad, antipad, yakın GND via, düzlem bağlantısı ve karşılıklı endüktansı tam
olarak modellemediği belirtilir.

Via reaktansı:

\[
X_L=2\pi fL
\]

Birbirine yeterince uzak ve ideal paralel kabul edilen \(N\) eş via için (§2.3'teki ortak
sembolle):

\[
L_{\text{via,eq}}\approx\frac{L_{\text{via,single}}}{N}
\]

Ancak gerçek yapıda karşılıklı endüktans bulunduğundan bu sonucun iyimser olabileceği
belirtilir.

## 4.6 Dönüş yolu gerilim bozulması

Dönüş akımı yaklaşık biliniyorsa:

\[
V_L=L\frac{di}{dt}
\]

Sinüzoidal yaklaşımda:

\[
V_L=I_{\text{pk}}X_L
\]

Bu sonuç doğrudan ground bounce veya EMI sonucu değildir; yalnızca dönüş bağlantısının
endüktif gerilim büyüklüğünü gösterir.

## 4.7 Stitching kondansatörü

Kondansatör eşdeğer empedansı:

\[
Z_C=ESR+j\omega ESL+\frac{1}{j\omega C}
\]

Büyüklük:

\[
|Z_C|=\sqrt{ESR^2+\left(\omega ESL-\frac{1}{\omega C}\right)^2}
\]

Self-resonant frequency:

\[
f_{\text{SRF}}=\frac{1}{2\pi\sqrt{ESL\cdot C}}
\]

Bağlantı viasının endüktansı ayrıca eklenir (§2.3'teki ortak tanım):

\[
ESL_{\text{total}}=ESL_{\text{component}}+L_{\text{mount}}+L_{\text{via,eq}}
\]

Kondansatör yalnızca hedef frekans bandında düşük empedans sağlıyorsa uygun kabul edilir.

## 4.8 Hesap akışı

1. Yükselme süresinden analiz frekansını hesapla.
2. Kullanıcı clock frekansı da girdiyse clock ile edge bandwidth'i karşılaştır.
3. Yayılma hızını ve dalga boyunu hesapla.
4. Via endüktansını hesapla.
5. Via reaktansını hesapla.
6. Paralel dönüş vialarının ideal eşdeğerini hesapla.
7. Via aralığını \(\lambda/N\) yaklaşımıyla karşılaştır.
8. Stitching kondansatörü varsa kompleks empedansını hesapla.
9. Via ile kondansatör seçeneklerini aynı frekanslarda karşılaştır.
10. Kullanıcıya dönüş yolunun geometrik ve elektriksel durumunu açıkla.

## 4.9 Sonuçlar

* Edge bandwidth
* Yayılma hızı
* Dalga boyu
* \(\lambda/10\), \(\lambda/20\), \(\lambda/40\)
* Tek via endüktansı
* Paralel via ideal endüktansı \(L_{\text{via,eq}}\)
* Hedef frekansta via reaktansı
* Stitching kondansatörü SRF değeri
* Hedef frekansta kondansatör empedansı
* Gerçek via aralığının seçilen sınıra oranı
* Sinyal via–dönüş via mesafesi
* Önerilen dönüş yolu yöntemi
* Kullanılan yaklaşım ve model sınırlamaları

## 4.10 Grafikler

* Frekansa karşı tek via ve paralel via \(X_L\)
* Frekansa karşı stitching kondansatörü \(|Z|\)
* Frekansa karşı \(\lambda/20\) mesafesi
* Via sayısına karşı eşdeğer ideal endüktans

## 4.11 SVG

Şunları gösteren parametrik kesit çizimi oluşturulur:

* Üst sinyal izi
* Sinyal via
* Referans düzlemi
* Alt katman izi
* Bir veya iki GND stitching via
* Alternatif power–GND referans geçişinde stitching kondansatörü
* Kritik mesafeler

## 4.12 Test örneği

Girdiler:

\[
t_r=1\ \text{ns}
\]

\[
\varepsilon_{\text{eff}}=4
\]

\[
h=1.6\ \text{mm}
\]

\[
d=0.3\ \text{mm}
\]

Beklenen yaklaşık sonuçlar:

\[
f_{\text{edge}}=500\ \text{MHz}
\]

\[
\lambda\approx0.2998\ \text{m}
\]

\[
\lambda/20\approx14.99\ \text{mm}
\]

\[
L_{\text{via}}\approx1.30\ \text{nH}
\]

\[
X_L(500\ \text{MHz})\approx4.08\ \Omega
\]

---

# 5. Via Stub ve Backdrill Hesaplayıcı

**Araç anahtarı:** `viaStubBackdrill` · **URL kimliği:** `via-stub-backdrill`
· **Klasör:** `web/src/pages/tools/ViaStubBackdrill/`

## 5.1 Amaç

Through-hole bir via iç katmanda sona erdiğinde, kullanılmayan via bölümü açık uçlu bir
iletim hattı stub'ı oluşturur. Via stub etkisi özellikle stub'ın elektriksel uzunluğu
çeyrek dalga mertebesine yaklaştığında ciddi hâle gelir. Backdrill işlemi bu kullanılmayan
bölümü mekanik olarak kaldırır; ancak üretim toleransı nedeniyle bir residual stub kalır.

## 5.2 Girdiler

* Toplam PCB kalınlığı
* Sinyalin başladığı katman derinliği
* Sinyalin çıktığı katman derinliği
* Via türü
* Via toplam uzunluğu
* Kullanılan via uzunluğu
* Nominal stub uzunluğu
* Backdrill derinliği
* Hedef katmana kalan güvenlik payı
* Backdrill derinlik toleransı
* Dielektrik sabiti
* Yükselme süresi
* Temel veri hızı
* Maksimum Nyquist frekansı
* Kullanıcı tanımlı maksimum çalışma frekansı
* İzin verilen maksimum residual stub

## 5.3 Stub uzunluğu

Doğrudan girilmemişse:

\[
l_{\text{stub}}=l_{\text{via,total}}-l_{\text{used}}
\]

Backdrill sonrası:

\[
l_{\text{residual}}=l_{\text{stub}}-l_{\text{removed}}
\]

Sonuç negatif olmamalıdır.

Üretim toleransı ve güvenlik payı dâhil **worst-case gerçekleşen** residual stub:

\[
l_{\text{residual,wc}}=l_{\text{nominal}}+\Delta l_{\text{depth}}+l_{\text{safety}}
\]

Minimum sonuç da ayrıca hesaplanır.

> **Sembol notu.** Bu bölümdeki \(l_{\text{residual,wc}}\), üretimde *gerçekleşmesi
> beklenen* en kötü residual stub'dır. §5.8'deki \(l_{\text{residual,max}}\) ise hedef
> rezonans frekansından türeyen *izin verilen üst sınır*dır. İkisi farklı büyüklüktür ve
> kodda ayrı alan adlarıyla taşınır.

## 5.4 Via içindeki yayılma hızı

Birinci mertebe homojen ortam yaklaşımı:

\[
v_{\text{via}}\approx\frac{c}{\sqrt{\varepsilon_r}}
\]

PCB'nin z ekseni dielektrik özelliğinin x-y değerinden farklı olabileceği ve gerçek via
geçişinin anisotropik olabileceği belirtilir.

## 5.5 Çeyrek dalga rezonansı

Açık uçlu stub için temel yaklaşık rezonans:

\[
f_{\lambda/4}=\frac{v_{\text{via}}}{4l_{\text{stub}}}=\frac{c}{4l_{\text{stub}}\sqrt{\varepsilon_r}}
\]

Residual stub için aynı formül yeniden hesaplanır.

İkinci ve üçüncü tek harmonikler opsiyonel gösterilebilir:

\[
f_n=(2n-1)f_{\lambda/4}
\]

Burada \(n=1,2,3,\ldots\)

## 5.6 Gidiş-dönüş gecikmesi

\[
t_{\text{round-trip}}=\frac{2l_{\text{stub}}}{v_{\text{via}}}
\]

Bu, yükselme süresiyle karşılaştırılır:

\[
K_t=\frac{t_{\text{round-trip}}}{t_r}
\]

Sınıflandırma doğrudan fizik kuralı olarak verilmez. Kullanıcıya seçilebilir eşikler sunulur:

* \(K_t<0.1\): genellikle küçük zaman alanı etkisi
* \(0.1\leq K_t<0.25\): dikkate alınmalı
* \(K_t\geq0.25\): elektromanyetik doğrulama öner

Bu eşikler **mühendislik sezgisi** olarak etiketlenir.

## 5.7 Frekans marjı

\[
M_f=\frac{f_{\lambda/4}}{f_{\text{analysis,max}}}
\]

* \(M_f\) yüksekse rezonans çalışma bandının uzağındadır.
* Rezonansın çalışma bandının dışında bulunması stub etkisinin tamamen yok olduğu anlamına
  gelmez.
* Stub kapasitif bir süreksizlik olarak rezonansın çok altında da return loss'u bozabilir.

## 5.8 Backdrill hedefi

Kullanıcı hedef rezonans frekansı girerse **izin verilen** maksimum residual stub:

\[
l_{\text{residual,max}}=\frac{c}{4f_{\text{target}}\sqrt{\varepsilon_r}}
\]

Üretim toleransı ve güvenlik payı çıkarıldıktan sonra nominal üretim hedefi:

\[
l_{\text{nominal,target}}=l_{\text{residual,max}}-\Delta l_{\text{fabrication}}-l_{\text{safety}}
\]

Negatif veya üretilemez sonuçlarda açık hata verilir.

## 5.9 Sonuçlar

* Nominal stub
* Minimum ve maksimum stub
* Residual stub
* Nominal ve worst-case rezonans
* Gidiş-dönüş gecikmesi
* Edge bandwidth
* Rezonans / çalışma frekansı oranı
* Backdrill ile rezonans artış oranı
* Gerekli minimum backdrill derinliği
* Hedef katmana yaklaşma riski
* Üretici toleransı gereksinimi
* 3D elektromanyetik çözüm önerisi

## 5.10 Grafikler

* Stub uzunluğuna karşı çeyrek dalga rezonansı
* Backdrill derinliğine karşı residual stub
* Backdrill derinliğine karşı rezonans frekansı
* Dielektrik sabitine karşı rezonans frekansı

## 5.11 Test

\[
l_{\text{stub}}=5\ \text{mm}
\]

\[
\varepsilon_r=4
\]

için:

\[
f_{\lambda/4}\approx7.495\ \text{GHz}
\]

Stub 2.5 mm'ye düşürüldüğünde:

\[
f_{\lambda/4}\approx14.99\ \text{GHz}
\]

---

# 6. MOSFET Gate Sürücü ve Gate Direnci Hesaplayıcı

**Araç anahtarı:** `mosfetGateDriver` · **URL kimliği:** `mosfet-gate-driver`
· **Klasör:** `web/src/pages/tools/MosfetGateDriver/`

## 6.1 Amaç

Bu araç:

* Gerekli ortalama gate akımını
* Yaklaşık peak source/sink akımını
* Turn-on ve turn-off gate direncini
* Miller plateau süresini
* Gate sürme gücünü
* Yaklaşık switching kaybını
* Driver güç kaybını
* Gate dirençlerinin tahmini enerji yükünü

hesaplar.

MOSFET gate'i sabit lineer bir kondansatör olarak modellenmez. Ana hesaplarda datasheet'teki
toplam gate charge \(Q_g\), Miller charge \(Q_{gd}\) ve gate plateau gerilimi kullanılır.
Gate charge eğrisi çalışma gerilimi ve akımına bağlıdır.

## 6.2 Girdiler

* Driver besleme gerilimi
* Negatif turn-off gerilimi
* Driver source çıkış direnci
* Driver sink çıkış direnci
* Driver peak source akımı
* Driver peak sink akımı
* MOSFET dahili gate direnci
* Harici turn-on gate direnci
* Harici turn-off gate direnci
* Toplam gate charge \(Q_g\)
* Gate-to-drain charge \(Q_{gd}\)
* Gate plateau gerilimi \(V_{\text{plateau}}\)
* Datasheet test drain gerilimi
* Gerçek drain gerilimi
* Drain akımı
* Switching frequency
* MOSFET sayısı
* Paralel MOSFET sayısı
* Hedef turn-on süresi
* Hedef turn-off süresi
* Rise time
* Fall time
* \(C_{oss}\), opsiyonel
* Dead time, opsiyonel

## 6.3 Ortalama gate akımı

Bir MOSFET için:

\[
I_{g,\text{avg}}=Q_gf_{sw}
\]

\(N\) adet MOSFET için:

\[
I_{g,\text{avg,total}}=NQ_gf_{sw}
\]

Bu değer peak driver akımı değildir.

## 6.4 Gate sürme gücü

\[
P_{\text{gate}}=NQ_gV_{\text{drive}}f_{sw}
\]

Negatif gate gerilimi kullanılıyorsa yaklaşık çevrim gerilim salınımı:

\[
\Delta V_g=V_{\text{on}}-V_{\text{off}}
\]

\[
P_{\text{gate}}\approx NQ_g\Delta V_gf_{sw}
\]

Bu enerji driver, MOSFET iç gate direnci ve harici dirençler arasında dağılır.

## 6.5 Peak gate akımı

Turn-on toplam direnci:

\[
R_{\text{total,on}}=R_{\text{drv,src}}+R_{g,\text{int}}+R_{g,\text{ext,on}}+R_{\text{trace}}
\]

Miller bölgesi yaklaşık gate akımı:

\[
I_{g,\text{Miller,on}}\approx\frac{V_{\text{drive}}-V_{\text{plateau}}}{R_{\text{total,on}}}
\]

Turn-off toplam direnci:

\[
R_{\text{total,off}}=R_{\text{drv,sink}}+R_{g,\text{int}}+R_{g,\text{ext,off}}+R_{\text{trace}}
\]

\[
I_{g,\text{Miller,off}}\approx\frac{V_{\text{plateau}}-V_{\text{off}}}{R_{\text{total,off}}}
\]

Driver datasheet peak akım limiti ayrıca uygulanır:

\[
I_{g,\text{actual}}=\min\left(I_{g,\text{resistive}},\ I_{g,\text{driver limit}}\right)
\]

## 6.6 Miller süresi

\[
t_{\text{Miller,on}}\approx\frac{Q_{gd}}{I_{g,\text{Miller,on}}}
\]

\[
t_{\text{Miller,off}}\approx\frac{Q_{gd}}{I_{g,\text{Miller,off}}}
\]

Toplam gate şarj süresi için kaba yaklaşım:

\[
t_g\approx\frac{Q_g}{I_g}
\]

Ancak switching transition tahmini için öncelikli olarak \(Q_{gd}\) kullanılır.

## 6.7 Hedef switching süresinden gate direnci

Hedef Miller süresi \(t_M\) için gerekli gate akımı:

\[
I_{g,\text{target}}=\frac{Q_{gd}}{t_M}
\]

**Turn-on.** Gerekli toplam direnç:

\[
R_{\text{total,on,target}}=\frac{V_{\text{drive}}-V_{\text{plateau}}}{I_{g,\text{target}}}
\]

Harici direnç:

\[
R_{g,\text{ext,on}}=R_{\text{total,on,target}}-R_{\text{drv,src}}-R_{g,\text{int}}-R_{\text{trace}}
\]

**Turn-off.** Aynı çözüm mantığı ayrı uygulanır:

\[
R_{\text{total,off,target}}=\frac{V_{\text{plateau}}-V_{\text{off}}}{I_{g,\text{target}}}
\]

\[
R_{g,\text{ext,off}}=R_{\text{total,off,target}}-R_{\text{drv,sink}}-R_{g,\text{int}}-R_{\text{trace}}
\]

Negatif direnç sonucu, driver'ın hedef süreden daha yavaş kaldığını veya giriş verilerinin
tutarsız olduğunu gösterir ve `NEGATIVE_RESISTANCE_RESULT` ile bildirilir.

## 6.8 Yaklaşık switching kaybı

Basit lineer drain gerilimi ve akımı geçişi kabulüyle:

\[
P_{\text{sw}}\approx\frac{1}{2}V_{DS}I_D(t_r+t_f)f_{sw}
\]

Bu model:

* Reverse recovery
* Common-source inductance
* Parazitik ringing
* Nonlineer \(C_{oss}\)
* Drain akımının zamanla değişimi
* Miller plateau varyasyonu

gibi etkileri içermez.

\(C_{oss}\) kaybı için isteğe bağlı kaba yaklaşım:

\[
P_{Coss}\approx\frac{1}{2}C_{oss}V_{DS}^{2}f_{sw}
\]

Datasheet'te \(E_{oss}\) veriliyorsa:

\[
P_{Coss}=E_{oss}f_{sw}
\]

tercih edilir.

## 6.9 Harici gate direnci gücü

Toplam gate enerjisinin direnç oranına göre yaklaşık dağılımı:

\[
P_{R_g,\text{ext}}\approx P_{\text{gate}}\frac{R_{g,\text{ext}}}{R_{\text{total}}}
\]

Turn-on ve turn-off dirençleri ayrılmışsa enerji yaklaşık iki yarım çevrime paylaştırılabilir.
Bunun birinci mertebe yaklaşım olduğu belirtilir.

## 6.10 Sonuçlar

* Ortalama gate akımı
* Peak source akımı
* Peak sink akımı
* Turn-on toplam gate direnci
* Turn-off toplam gate direnci
* Miller turn-on süresi
* Miller turn-off süresi
* Gate sürme gücü
* Driver akım marjı
* Tahmini switching kaybı
* \(C_{oss}\) kaybı
* Gate direnci tahmini kaybı
* Hedef süre için önerilen gate direnci
* Çok hızlı switching uyarısı
* Çok yavaş switching uyarısı
* Driver peak akım yetersizliği

## 6.11 Grafikler

* Gate direncine karşı Miller süresi
* Gate direncine karşı peak gate akımı
* Gate direncine karşı yaklaşık switching kaybı
* Switching frequency'ye karşı gate sürme gücü

## 6.12 Test

\[
Q_g=40\ \text{nC}
\]

\[
Q_{gd}=10\ \text{nC}
\]

\[
V_{\text{drive}}=10\ \text{V}
\]

\[
V_{\text{plateau}}=5\ \text{V}
\]

\[
R_{\text{total}}=10\ \Omega
\]

\[
f_{sw}=100\ \text{kHz}
\]

Beklenen:

\[
I_{g,\text{avg}}=4\ \text{mA}
\]

\[
P_{\text{gate}}=40\ \text{mW}
\]

\[
I_{g,\text{Miller}}=0.5\ \text{A}
\]

\[
t_{\text{Miller}}=20\ \text{ns}
\]

---

# 7. ADC Giriş Yerleşme ve RC Filtre Hesaplayıcı

**Araç anahtarı:** `adcSettlingRcFilter` · **URL kimliği:** `adc-settling-rc-filter`
· **Klasör:** `web/src/pages/tools/AdcSettlingRcFilter/`

## 7.1 Amaç

Araç, özellikle SAR ADC girişlerinde:

* Kaynak empedansı
* ADC sampling capacitor
* Acquisition time
* Seri direnç
* Harici filtre kondansatörü
* ADC çözünürlüğü

arasındaki ilişkiyi analiz eder.

SAR ADC girişlerinin switched-capacitor yapısı örnekleme anında akım darbeleri
oluşturabilir. Yüksek kaynak empedansı, girişin acquisition süresi içinde gerekli
doğruluğa yerleşememesine neden olabilir. ADC sürücüsü, filtre ve sampling ağı birlikte
değerlendirilir.

## 7.2 Girdiler

* ADC çözünürlüğü \(N\)
* ADC referans gerilimi
* Tam ölçek giriş aralığı
* ADC clock
* Sampling cycles
* Acquisition time
* Sampling capacitor \(C_s\)
* ADC iç switch direnci
* Kaynak direnci
* Sensör çıkış direnci
* Harici seri direnç
* Harici filtre kondansatörü
* Op-amp çıkış direnci
* Op-amp settling time
* Op-amp GBW
* Sampling frequency
* Giriş step büyüklüğü
* İzin verilen hata: 0.5 LSB / 1 LSB / kullanıcı tanımlı
* Sıcaklık

## 7.3 Acquisition time

ADC clock ve sampling cycle sayısı verilirse:

\[
t_{\text{acq}}=\frac{N_{\text{sampling cycles}}}{f_{\text{ADC clock}}}
\]

ADC mimarisine göre ilave sabit süre gerekiyorsa kullanıcı tarafından girilir.

## 7.4 RC yerleşmesi

Birinci mertebe RC step cevabı:

\[
V_C(t)=V_{\text{final}}\left(1-e^{-t/\tau}\right)
\]

\[
\tau=R_{\text{eq}}C_{\text{eq}}
\]

Kalan bağıl hata:

\[
\epsilon_{\text{rel}}=e^{-t_{\text{acq}}/\tau}
\]

Tam ölçek step için yarım LSB hata sınırı:

\[
\epsilon_{0.5\ \text{LSB}}=\frac{1}{2^{N+1}}
\]

Yerleşme koşulu:

\[
e^{-t_{\text{acq}}/\tau}\leq\frac{1}{2^{N+1}}
\]

Gerekli minimum süre:

\[
t_{\text{settle,min}}\geq(N+1)\ln(2)\,R_{\text{eq}}C_{\text{eq}}
\]

## 7.5 Maksimum kaynak direnci

Harici filtre kondansatörü bulunmayan basitleştirilmiş model:

\[
R_{\text{eq}}=R_{\text{source}}+R_{\text{series}}+R_{\text{switch}}+R_{\text{driver}}
\]

\[
R_{\text{eq,max}}=\frac{t_{\text{acq}}}{C_s(N+1)\ln 2}
\]

İzin verilen dış kaynak direnci:

\[
R_{\text{source,max}}=R_{\text{eq,max}}-R_{\text{switch}}-R_{\text{series}}-R_{\text{driver}}
\]

Negatif sonuç buffer veya daha uzun acquisition time gerektiğini gösterir.

## 7.6 RC filtre kesim frekansı

\[
f_c=\frac{1}{2\pi R_fC_f}
\]

Birinci dereceden filtre genliği:

\[
|H(f)|=\frac{1}{\sqrt{1+(f/f_c)^2}}
\]

Attenuation:

\[
A_{\text{dB}}=20\log_{10}|H(f)|
\]

## 7.7 Charge sharing

Harici kondansatör \(C_f\), sampling capacitor \(C_s\) ile ani charge sharing yapıyorsa
yaklaşık başlangıç droop'u:

\[
\Delta V_{\text{droop}}\approx\Delta V_{\text{step}}\frac{C_s}{C_f+C_s}
\]

Bu model, ADC switch direnci ve driver dinamiğini ihmal eder.

Kondansatör oranı:

\[
K_C=\frac{C_f}{C_s}
\]

Kullanıcıya \(C_f\gg C_s\) olduğunda sampling kickback'in azaldığı; ancak büyük \(C_f\)'nin
driver stabilitesini ve yerleşme süresini zorlaştırabileceği açıklanır.

## 7.8 LSB ve mutlak hata

\[
V_{\text{LSB}}=\frac{V_{\text{FS}}}{2^N}
\]

Yerleşme hatası:

\[
V_{\text{error}}=\Delta V_{\text{step}}e^{-t_{\text{acq}}/\tau}
\]

LSB cinsinden:

\[
E_{\text{LSB}}=\frac{V_{\text{error}}}{V_{\text{LSB}}}
\]

## 7.9 Termal gürültü

Kondansatör üzerindeki yaklaşık \(k_BT/C\) gürültüsü:

\[
V_{n,\text{rms}}=\sqrt{\frac{k_BT_K}{C}}
\]

Bu hesap toplam ADC gürültüsü değildir; yalnızca teorik sampling capacitor termal gürültü
bileşenidir.

## 7.10 Sonuçlar

* Acquisition time
* Toplam kaynak direnci
* Toplam sampling kapasitansı
* RC time constant
* Gerekli minimum yerleşme süresi
* Gerçek yerleşme süresi marjı
* Maksimum izin verilen kaynak direnci
* Kalan voltaj hatası
* LSB cinsinden hata
* RC filter cutoff
* Seçilen frekanstaki attenuation
* Charge-sharing droop
* Buffer gereksinimi
* Op-amp stabilite uyarısı
* Anti-alias uyarısı

## 7.11 Grafikler

* Acquisition time'a karşı LSB hatası
* Kaynak direncine karşı LSB hatası
* Frekansa karşı RC attenuation
* Harici kondansatör / sampling capacitor oranına karşı droop

## 7.12 Test

\[
N=12
\]

\[
C_s=20\ \text{pF}
\]

\[
t_{\text{acq}}=1\ \text{µs}
\]

İç dirençler ihmal edilirse:

\[
R_{\text{eq,max}}\approx\frac{1\times10^{-6}}{20\times10^{-12}\cdot13\ln 2}\approx5.55\ \text{k}\Omega
\]

---

# 8. CAN ve RS-485 Fiziksel Katman Hesaplayıcı

**Araç anahtarı:** `canRs485PhysicalLayer` · **URL kimliği:** `can-rs485-physical-layer`
· **Klasör:** `web/src/pages/tools/CanRs485PhysicalLayer/`

Bu ekran iki ayrı mod içerir:

* CAN / CAN FD
* RS-485

Protokol frame çözümleme yapılmaz. Yalnızca fiziksel katman, terminasyon, bias, kablo
gecikmesi, stub ve yük hesabı yapılır.

## 8.1 CAN teorisi

CAN omurgasının iki fiziksel ucunda yaklaşık karakteristik empedansa eş terminasyon
bulunur. İki adet 120 Ω terminasyon, sürücü tarafından yaklaşık 60 Ω diferansiyel yük
olarak görülür. Stub uzunluğu ve toplam gecikme, veri hızı ile transceiver gecikme
bütçesine göre değerlendirilir. Klasik 1 Mbps CAN için sık kullanılan fiziksel sınırlar
arasında 40 m omurga ve 0.3 m unterminated stub bulunur; fakat araç bunları her sistem için
değişmez fizik kanunu olarak kullanmaz.

## 8.2 CAN girdileri

* Nominal bitrate
* Data-phase bitrate
* CAN / CAN FD
* Sample point yüzdesi
* Kablo propagation delay, ns/m
* Toplam bus uzunluğu
* En uzun stub
* Stub sayısı
* Node sayısı
* Transceiver TX→bus delay
* Transceiver bus→RX delay
* İzolatör gecikmesi
* Controller gecikmesi
* Terminasyon değerleri
* Split termination değerleri
* Split kondansatörü
* Kablo karakteristik empedansı
* Kablo kapasitansı
* Transceiver giriş kapasitansı

## 8.3 Bit süresi

\[
t_{\text{bit}}=\frac{1}{R_b}
\]

Sample point anı:

\[
t_{\text{sample}}=S_pt_{\text{bit}}
\]

Burada \(S_p\), 0 ile 1 arasında sample point oranıdır.

## 8.4 Gecikme bütçesi

Tek yön kablo gecikmesi:

\[
t_{\text{cable}}=L_{\text{bus}}t_{pd,\text{per meter}}
\]

Gidiş-dönüş:

\[
t_{\text{round trip}}=2L_{\text{bus}}t_{pd,\text{per meter}}
\]

**Sabit gecikme** — kablo uzunluğundan bağımsız bileşenlerin toplamı:

\[
t_{\text{fixed}}=t_{\text{controller}}+t_{\text{TX}}+t_{\text{isolator,TX}}+t_{\text{RX}}+t_{\text{isolator,RX}}
\]

Toplam gecikme bütçesi:

\[
t_{\text{loop}}=t_{\text{fixed}}+t_{\text{round trip}}
\]

Marj:

\[
t_{\text{margin}}=t_{\text{sample}}-t_{\text{loop}}
\]

Negatif marj açık hata veya ciddi uyarı üretir.

## 8.5 Maksimum teorik bus uzunluğu

\[
L_{\max}=\frac{t_{\text{sample}}-t_{\text{fixed}}}{2t_{pd,\text{per meter}}}
\]

Burada \(t_{\text{fixed}}\), §8.4'te tanımlandığı gibi controller, TX, RX ve izolatör
gecikmelerinin toplamıdır.

Şu durumda açık hata döndürülür:

\[
t_{\text{sample}}\leq t_{\text{fixed}}
\]

Hata kodu:

```text
BUS_FIXED_DELAY_EXCEEDS_SAMPLE_POINT
```

Bu sonuç, kablo uzunluğu sıfır olsa bile gecikme bütçesinin yetersiz olduğunu ifade eder.

\(L_{\max}\) değeri attenuation, kablo kaybı, transceiver slew rate, jitter ve oscillator
tolerance içermez.

## 8.6 CAN terminasyonu

İki terminasyonun eşdeğeri:

\[
R_{\text{diff,eq}}=R_{T1}\parallel R_{T2}
\]

İdeal 120 Ω + 120 Ω:

\[
R_{\text{diff,eq}}=60\ \Omega
\]

Split termination'da:

\[
R_{T,\text{total}}=R_1+R_2
\]

Genellikle:

\[
R_1=R_2=\frac{Z_0}{2}
\]

Orta noktanın common-mode eşdeğer direnci yaklaşık:

\[
R_{\text{CM}}=R_1\parallel R_2
\]

Split kondansatörü yaklaşık kesim frekansı:

\[
f_{\text{split}}\approx\frac{1}{2\pi R_{\text{CM}}C_{\text{split}}}
\]

Bu yalnızca common-mode birinci mertebe yaklaşımıdır.

## 8.7 Stub gecikmesi

\[
t_{\text{stub,RT}}=\frac{2l_{\text{stub}}}{v_p}
\]

Yükselme süresi girilmişse:

\[
K_{\text{stub}}=\frac{t_{\text{stub,RT}}}{t_r}
\]

Kullanıcı seçilebilir muhafazakârlık sınırlarıyla değerlendirme yapılır.

## 8.8 RS-485 teorisi

RS-485 hattında terminasyonlar kablonun fiziksel uçlarında yer alır. Eski veya dahili
failsafe özelliği bulunmayan alıcılarda, idle bus durumunu tanımlamak için harici bias
dirençleri kullanılabilir. Modern transceiver'larda dahili failsafe bulunduğundan harici
bias her zaman gerekli değildir.

## 8.9 RS-485 girdileri

* Besleme gerilimi
* Kablo karakteristik empedansı
* Bir veya iki terminasyon
* Pull-up bias direnci
* Pull-down bias direnci
* Hedef idle differential voltage
* Minimum receiver threshold
* Noise margin
* Receiver unit load değeri
* Node sayısı
* Transceiver drive differential voltage
* Kablo uzunluğu
* Propagation delay
* Bitrate
* Rise time
* Stub uzunlukları
* Dahili failsafe var/yok
* Receiver giriş eşdeğer yükü

## 8.10 Terminasyon eşdeğeri

\[
R_{T,\text{eq}}=\left(\sum_i\frac{1}{R_{T,i}}\right)^{-1}
\]

Receiver yükleri diferansiyel eşdeğer olarak girilmişse:

\[
R_{AB}=R_{T,\text{eq}}\parallel R_{\text{receivers,eq}}
\]

## 8.11 Simetrik failsafe bias

A hattı \(R_{PU}\) ile \(V_{CC}\)'ye, B hattı \(R_{PD}\) ile GND'ye bağlı kabul edilsin:

\[
I_{\text{bias}}=\frac{V_{CC}}{R_{PU}+R_{AB}+R_{PD}}
\]

Idle differential voltage:

\[
V_{AB,\text{idle}}=I_{\text{bias}}R_{AB}
\]

Simetrik dirençler için:

\[
R_{PU}=R_{PD}=R_B
\]

Hedef idle voltage'dan:

\[
R_B=\frac{R_{AB}\left(\dfrac{V_{CC}}{V_{AB,\text{target}}}-1\right)}{2}
\]

Sonuç E24/E48/E96 serisine yuvarlanabilmelidir. Seçilen gerçek dirençlerle hesap yeniden
yapılır.

## 8.12 Bias direnç güçleri

\[
P_{PU}=I_{\text{bias}}^2R_{PU}
\]

\[
P_{PD}=I_{\text{bias}}^2R_{PD}
\]

Aktif sürüşte bias ağı üzerinden oluşabilecek worst-case akım ayrıca gösterilir.

## 8.13 Unit load

Kullanıcı transceiver unit load değerini girerse:

\[
N_{\max,\text{ideal}}=\frac{32}{UL}
\]

Örnek:

* 1 UL → 32 node
* 1/2 UL → 64 node
* 1/4 UL → 128 node
* 1/8 UL → 256 node

Bu hesabın kablo kapasitansı, konnektörler ve gerçek transceiver limitlerini içermediği
belirtilir.

## 8.14 Ortak sonuçlar

* Bit time
* Tek yön kablo gecikmesi
* Round-trip gecikme
* Sabit gecikme \(t_{\text{fixed}}\)
* Gecikme marjı
* Tahmini maksimum bus uzunluğu
* En uzun stub gecikmesi
* Terminasyon eşdeğeri
* Sürücü diferansiyel akımı
* Terminasyon gücü
* Node yükü
* Bias akımı
* Idle differential voltage
* Receiver threshold marjı
* Split termination cutoff
* CAN veya RS-485 bağlantı önerisi

## 8.15 Grafikler

* Bitrate'e karşı maksimum bus uzunluğu
* Stub uzunluğuna karşı round-trip delay
* Bias direncine karşı idle differential voltage
* Node sayısına karşı eşdeğer yük

---

# 9. Shunt Direnci ve Kelvin Bağlantı Hesaplayıcı

**Araç anahtarı:** `shuntKelvin` · **URL kimliği:** `shunt-kelvin`
· **Klasör:** `web/src/pages/tools/ShuntKelvin/`

## 9.1 Amaç

Araç:

* Shunt direnci
* Ölçüm gerilimi
* Güç kaybı
* ADC kazancı
* Ölçüm çözünürlüğü
* Tolerans
* TCR
* Amplifikatör offset'i
* Kelvin kullanılmadığında ortak yol direnci hatası

hesaplar.

Yüksek akım ölçümünde Kelvin bağlantısı, akım taşıyan pad ve bakır yolların \(I\cdot R\)
düşümünün sense ölçümüne dahil olmasını azaltır.

## 9.2 Girdiler

* Maksimum akım
* Nominal akım
* RMS akım
* Peak akım
* Hedef full-scale sense voltage
* Shunt nominal değeri
* Shunt toleransı
* TCR
* Nominal sıcaklık
* Tahmini shunt sıcaklığı
* Shunt thermal resistance
* Shunt güç derecesi
* Derating yüzdesi
* Amplifier gain
* Gain tolerance
* Input offset voltage
* Offset drift
* CMRR
* Common-mode voltage
* ADC çözünürlüğü
* ADC referans gerilimi
* ADC giriş aralığı
* Ortak bakır yol direnci
* Sense trace direnci
* Kelvin var/yok
* High-side / low-side
* Çift yönlü / tek yönlü

## 9.3 Shunt seçimi

Hedef sense voltage'dan:

\[
R_{\text{shunt}}=\frac{V_{\text{sense,FS}}}{I_{\max}}
\]

Gerçek sense voltage:

\[
V_{\text{sense}}=IR_{\text{shunt}}
\]

## 9.4 Güç

\[
P_{\text{shunt}}=I_{\text{RMS}}^2R_{\text{shunt}}
\]

Peak kısa süreli güç:

\[
P_{\text{peak}}=I_{\text{peak}}^2R_{\text{shunt}}
\]

Sürekli güç marjı:

\[
M_P=\frac{P_{\text{rated,derated}}}{P_{\text{shunt}}}
\]

## 9.5 Sıcaklık

Thermal resistance girilmişse:

\[
\Delta T=P_{\text{shunt}}\theta
\]

\[
T_{\text{shunt}}=T_{\text{ambient}}+\Delta T
\]

TCR etkisi:

\[
R(T)=R_0\left[1+\alpha_R(T-T_0)\right]
\]

TCR kaynaklı bağıl hata:

\[
E_{\text{TCR}}=\alpha_R(T-T_0)
\]

ppm/°C girilmişse:

\[
\alpha_R=TCR_{\text{ppm}}\times10^{-6}
\]

## 9.6 Amplifier çıkışı

\[
V_{\text{out}}=GIR_{\text{shunt}}+V_{\text{offset,out}}
\]

Input-referred offset'in akım hatası:

\[
I_{\text{error,offset}}=\frac{V_{OS}}{R_{\text{shunt}}}
\]

Çıkışa referanslı:

\[
V_{\text{error,out}}=GV_{OS}
\]

## 9.7 ADC çözünürlüğü

\[
V_{\text{LSB}}=\frac{V_{\text{ref}}}{2^N}
\]

İdeal akım çözünürlüğü:

\[
I_{\text{LSB}}=\frac{V_{\text{LSB}}}{GR_{\text{shunt}}}
\]

Gerçek sistem ENOB değeri girilebiliyorsa \(N\) yerine ENOB ile ikinci sonuç gösterilir.

## 9.8 Kelvin kullanılmayan yapı

Sense ölçümüne ortak bakır direnci \(R_{\text{shared}}\) dahil oluyorsa:

\[
V_{\text{measured}}=I(R_{\text{shunt}}+R_{\text{shared}})
\]

Akım hatası:

\[
E_{\text{shared}}=\frac{R_{\text{shared}}}{R_{\text{shunt}}}
\]

Yüzde:

\[
E_{\text{shared},\%}=100\frac{R_{\text{shared}}}{R_{\text{shunt}}}
\]

Kelvin bağlantısında sense hatlarında ihmal edilebilir akım aktığı varsayılır; ancak
amplifier input bias current ve asimetrik filtre dirençleri yine hata oluşturabilir.

## 9.9 Toplam hata

Worst-case toplam:

\[
E_{\text{WC}}=|E_{\text{shunt tol}}|+|E_{\text{TCR}}|+|E_{\text{gain}}|+|E_{\text{offset}}|+|E_{\text{shared}}|
\]

İstatistiksel bağımsızlık varsayımıyla RSS:

\[
E_{\text{RSS}}=\sqrt{E_1^2+E_2^2+\cdots+E_n^2}
\]

Offset hatası önce bağıl akım hatasına dönüştürülür:

\[
E_{\text{offset}}=\frac{V_{OS}}{IR_{\text{shunt}}}
\]

Düşük akımlarda offset yüzdesinin büyüdüğü grafikte gösterilir.

## 9.10 Sonuçlar

* Önerilen shunt
* Full-scale sense voltage
* Nominal güç
* Peak güç
* Güç marjı
* Tahmini sıcaklık
* Sıcak shunt direnci
* TCR hatası
* Amplifier çıkış aralığı
* ADC çözünürlüğü
* Offset kaynaklı minimum ölçülebilir akım
* Kelvin kullanılmayan hata
* Worst-case toplam hata
* RSS toplam hata

## 9.11 Test

\[
I_{\max}=10\ \text{A}
\]

\[
V_{\text{sense,FS}}=50\ \text{mV}
\]

\[
R_{\text{shunt}}=5\ \text{m}\Omega
\]

\[
P=10^2\cdot0.005=0.5\ \text{W}
\]

ADC:

\[
V_{\text{ref}}=3.3\ \text{V}
\]

\[
N=12
\]

\[
G=50
\]

İdeal çözünürlük:

\[
I_{\text{LSB}}\approx3.22\ \text{mA}
\]

---

# İKİNCİ PAKET

---

# 10. PDN Rezonans ve Antirezonans Analizörü

**Araç anahtarı:** `pdnResonanceAnalyzer` · **URL kimliği:** `pdn-resonance-analyzer`
· **Klasör:** `web/src/pages/tools/PdnResonanceAnalyzer/`

## 10.1 Amaç

Mevcut PDN Target Impedance ve Decoupling araçları **silinmez**. Yeni araç bunların ileri
seviye devamıdır; mevcut route ve proje anahtarlarına dokunmaz (bkz. §1.5).

Kullanıcı:

* VRM modeli
* Bulk kondansatörler
* MLCC grupları
* Her grubun C, ESR, ESL değerleri
* Bağlantı endüktansı
* Via sayısı
* Plane capacitance
* Hedef empedans

değerlerini girerek toplam kompleks PDN empedansını frekansa göre görebilmelidir.

Farklı kapasitör değerleri ve parazitikleri paralel bağlandığında yalnızca toplam kapasite
değil, rezonans ve antirezonans tepeleri de oluşabilir.

## 10.2 Girdiler

Sistem:

* Nominal rail voltage
* İzin verilen ripple yüzdesi
* İzin verilen mutlak ripple
* Load step
* Load step rise time
* Minimum analiz frekansı
* Maksimum analiz frekansı
* Nokta sayısı

VRM:

* Çıkış direnci
* Çıkış endüktansı
* Çıkış kapasitansı
* Kontrol bant genişliği, bilgi amaçlı
* Kullanıcı tanımlı empedans tablosu, opsiyonel

Her kondansatör grubu:

* Nominal capacitance
* Etkin capacitance
* Adet
* ESR
* ESL
* Mounting inductance
* Via inductance
* Tolerans
* DC bias derating
* Temperature derating

Plane:

* Plane capacitance
* Plane spreading inductance veya bağlantı endüktansı
* Plane ESR / loss

## 10.3 Hedef empedans

\[
Z_{\text{target}}=\frac{\Delta V_{\text{allowed}}}{\Delta I_{\text{step}}}
\]

Ripple yüzdeyle verilirse:

\[
\Delta V_{\text{allowed}}=V_{\text{rail}}r
\]

Bu hedefin bütün frekanslarda gerçek sistem stabilitesini garanti etmediği belirtilir.

## 10.4 Kondansatör modeli

Bir kondansatör kolu:

\[
Z_C(f)=ESR+j\omega ESL_{\text{total}}+\frac{1}{j\omega C_{\text{effective}}}
\]

Toplam eşdeğer seri endüktans (§2.3'teki ortak tanım):

\[
ESL_{\text{total}}=ESL_{\text{component}}+L_{\text{mount}}+L_{\text{via,eq}}
\]

Aynı ideal kolun \(N\) adedi:

\[
Z_{C,N}=\frac{Z_C}{N}
\]

Bu yaklaşım tüm bağlantı endüktanslarının bağımsız olduğu varsayımına dayanır. Ortak via
veya ortak boyun kullanılıyorsa endüktansın tamamı \(N\)'ye bölünmemelidir.

Daha gerçekçi model:

\[
Z_{group}=Z_{\text{shared}}+\frac{Z_{\text{individual}}}{N}
\]

## 10.5 Self resonance

\[
f_{\text{SRF}}=\frac{1}{2\pi\sqrt{ESL_{\text{total}}C}}
\]

SRF altında kapasitif, üstünde endüktif davranış beklenir.

## 10.6 VRM modeli

Basit seri model:

\[
Z_{\text{VRM}}=R_{\text{VRM}}+j\omega L_{\text{VRM}}
\]

İsteğe bağlı çıkış kondansatörü eklenirse bu kol kompleks olarak oluşturulur.

## 10.7 Plane modeli

\[
Z_{\text{plane}}=R_{\text{plane}}+j\omega L_{\text{plane}}+\frac{1}{j\omega C_{\text{plane}}}
\]

Bu, gerçek cavity modes içermeyen lumped modeldir.

## 10.8 Toplam empedans

Bütün kolların admitansları:

\[
Y_{\text{total}}=\sum_k\frac{1}{Z_k}
\]

\[
Z_{\text{total}}=\frac{1}{Y_{\text{total}}}
\]

Bütün frekans noktalarında kompleks hesap yapılır.

## 10.9 Rezonans ve antirezonans tespiti

Tepe ve çukur tespiti doğrusal empedans üzerinde değil, **dB gösterimi** üzerinde yapılır:

\[
Z_{\text{dB}}(f)=20\log_{10}|Z(f)|
\]

Frekans sweep'i logaritmiktir (§17).

### 10.9.1 Lokal maksimum

Bir nokta, iki komşusundan büyükse lokal maksimum adayıdır. Prominence:

\[
P_{\max}=Z_{\text{peak,dB}}-\max\left(Z_{\text{left valley,dB}},\ Z_{\text{right valley,dB}}\right)
\]

Burada sol ve sağ valley, tepenin iki tarafındaki en yakın **doğrulanmış** lokal
minimumlardır.

### 10.9.2 Lokal minimum

Bir nokta, iki komşusundan küçükse lokal minimum adayıdır. Prominence:

\[
P_{\min}=\min\left(Z_{\text{left peak,dB}},\ Z_{\text{right peak,dB}}\right)-Z_{\text{valley,dB}}
\]

### 10.9.3 Eşik

Varsayılan prominence eşiği:

\[
P_{\text{threshold}}=3\ \text{dB}
\]

Kullanıcı bu değeri değiştirebilir. İzin verilen aralık:

\[
0.5\ \text{dB}\leq P_{\text{threshold}}\leq20\ \text{dB}
\]

Eşik altında kalan lokal maksimum ve minimumlar grafik üzerinde gösterilebilir; ancak
"doğrulanmış rezonans" veya "doğrulanmış antirezonans" listesine **alınmaz**.

Sweep'in ilk ve son noktaları tek taraflı karşılaştırma nedeniyle tepe veya çukur olarak
sınıflandırılmaz.

### 10.9.4 Plato

Aynı fiziksel tepe birden fazla örnek noktasında plato oluşturuyorsa:

* Platonun başlangıç ve bitiş indisleri belirlenir.
* Tepe frekansı olarak geometrik merkez frekansı kullanılır.
* Empedans olarak plato üzerindeki maksimum değer kullanılır.

Geometrik merkez:

\[
f_{\text{center}}=\sqrt{f_{\text{start}}f_{\text{end}}}
\]

Bu politika hesap motorunda ve testlerde aynı biçimde kullanılır.

### 10.9.5 Her tepe için raporlanan büyüklükler

* Frekans
* Empedans
* Target impedance oranı
* Komşu minimumlara göre prominence

## 10.10 Düşük frekans kapasite ihtiyacı

Load step süresi \(\Delta t\) için:

\[
C_{\min}\geq\frac{\Delta I\Delta t}{\Delta V}
\]

Bu denklem ESR, ESL ve VRM cevabını içermez.

ESR kaynaklı ani droop:

\[
\Delta V_{\text{ESR}}=\Delta I\cdot ESR_{\text{eq}}
\]

ESL kaynaklı droop:

\[
\Delta V_{\text{ESL}}=L_{\text{eq}}\frac{di}{dt}
\]

Toplamı cebirsel toplama seçeneğiyle tahmini gösterilir:

\[
\Delta V_{\text{approx}}\approx\Delta V_C+\Delta V_{\text{ESR}}+\Delta V_{\text{ESL}}
\]

> Bu cebirsel toplam, ana PDN kompleks empedans hesabının yerine kullanılmaz. Kapasitif
> droop, ESR step'i ve ESL kaynaklı gerilim sıçramasının aynı yönde oluştuğu muhafazakâr
> bir zaman alanı worst-case tahminidir. Bu nedenle ortak kompleks empedans kuralının
> bilinçli ve yalnızca bu tahmin için kullanılan bir istisnasıdır.

Kaynak etiketi:

```text
engineering-rule
```

Alt etiket:

```text
worst-case-time-domain-estimate
```

## 10.11 Tolerans

Minimum, nominal ve maksimum kapasitans sweep'i yapılır.

Etkin kapasite:

\[
C_{\text{effective}}=C_{\text{nominal}}K_{\text{DC bias}}K_{\text{temperature}}K_{\text{aging}}
\]

Katsayılar 0–1 arasında doğrulanır.

## 10.12 Sonuçlar

* Target impedance
* Maksimum PDN empedansı
* Target'ın aşıldığı frekans aralıkları
* En kötü antirezonans frekansı
* Her kondansatör grubunun SRF'si
* Düşük frekans minimum kapasite
* Tahmini ESR droop
* Tahmini ESL droop
* Target altında kalan toplam bant yüzdesi
* Kondansatör grubu ekleme/çıkarma karşılaştırması
* Kullanılan prominence eşiği

## 10.13 Grafik

Log-log grafik:

* Toplam PDN \(|Z|\)
* Target impedance yatay çizgisi
* VRM kolu
* Her kondansatör grubu
* Plane kolu
* Minimum/nominal/maksimum tolerans eğrileri

---

# 11. Düzlem Kavite Rezonansı ve Kapasitansı

**Araç anahtarı:** `planeCavityResonance` · **URL kimliği:** `plane-cavity-resonance`
· **Klasör:** `web/src/pages/tools/PlaneCavityResonance/`

> Bu araç, mevcut **Güç Düzlemi ve Paralel Yol** (`power-plane`) aracından farklıdır.
> Mevcut araç DC akım taşıma ve paralel yol hesabı yapar; bu araç geometrik kavite
> rezonansı ve düzlem kapasitansı hesaplar. Mevcut araç silinmez, yeniden adlandırılmaz,
> bu araçla birleştirilmez ve route'u kullanılmaz.

## 11.1 Amaç

Dikdörtgen power–ground plane çiftinin:

* Yaklaşık düzlem kapasitansını
* İlk cavity mode frekanslarını
* Dielektrik kalınlığının etkisini
* Dielektrik sabitinin etkisini
* Düzlem boyutlarının etkisini
* Dielektrik kayıp kaynaklı yaklaşık Q değerini

hesapla.

Solid power plane yapılarında geometrik rezonanslar oluşabilir; dolayısıyla yalnızca lumped
plane capacitance hesabı yeterli değildir.

## 11.2 Girdiler

* Plane X boyutu \(a\)
* Plane Y boyutu \(b\)
* Örtüşen etkin alan
* Power–ground mesafesi \(d\)
* Dielektrik sabiti
* Loss tangent
* Bakır kalınlığı
* Frekans aralığı
* Maksimum mode index \((m,n)\)
* Kondansatör sayısı
* Stitching via aralığı
* Kenar koşulu seçeneği

## 11.3 Düzlem kapasitansı

İdeal paralel plaka:

\[
C_{\text{plane}}=\varepsilon_0\varepsilon_r\frac{A}{d}
\]

Saçak alanlar ve düzlem boşlukları bu modelde bulunmaz.

Alan dikdörtgense:

\[
A=ab
\]

## 11.4 Alan başına kapasitans

\[
C'=\frac{C}{A}=\frac{\varepsilon_0\varepsilon_r}{d}
\]

Sonuç pF/cm², nF/in² ve F/m² birimleriyle gösterilebilir.

## 11.5 Cavity mode frekansları

Dikdörtgen cavity için yaklaşık:

\[
f_{mn}=\frac{c}{2\sqrt{\varepsilon_r}}\sqrt{\left(\frac{m}{a}\right)^2+\left(\frac{n}{b}\right)^2}
\]

Burada \(m,n=0,1,2,\ldots\) ve \(m=n=0\) geçersizdir.

İlk modlar:

\[
f_{10}=\frac{c}{2a\sqrt{\varepsilon_r}}
\]

\[
f_{01}=\frac{c}{2b\sqrt{\varepsilon_r}}
\]

\[
f_{11}=\frac{c}{2\sqrt{\varepsilon_r}}\sqrt{\frac{1}{a^2}+\frac{1}{b^2}}
\]

Bu model gerçek kart kenarları, kesikler, via yapıları, decoupling kondansatörleri ve
kayıpları tam içermez.

## 11.6 Dielektrik Q

Yalnızca dielektrik kaybı dikkate alınırsa:

\[
Q_d\approx\frac{1}{\tan\delta}
\]

Gerçek toplam Q:

\[
\frac{1}{Q_{\text{total}}}=\frac{1}{Q_d}+\frac{1}{Q_c}+\frac{1}{Q_r}+\frac{1}{Q_{\text{loading}}}
\]

\(Q_c\), \(Q_r\) veya yükleme değerleri bilinmiyorsa toplam Q hesaplanmış gibi gösterilmez.

## 11.7 Etkin enerji

Plane'de depolanan yaklaşık enerji:

\[
E_C=\frac{1}{2}C_{\text{plane}}V^2
\]

Bu değer load step sağlama kapasitesinin tek başına ölçüsü değildir.

## 11.8 Stitching aralığı karşılaştırması

Hedef frekansta:

\[
\lambda_d=\frac{c}{f\sqrt{\varepsilon_r}}
\]

\[
s_{\max}=\frac{\lambda_d}{N}
\]

\(N\) kullanıcı tarafından 10, 20 veya 40 seçilebilmelidir.

## 11.9 Sonuçlar

* Plane capacitance
* Alan başına kapasitans
* Depolanan enerji
* İlk 10 veya 20 cavity mode
* En düşük cavity resonance
* Loss tangent kaynaklı yaklaşık \(Q_d\)
* Hedef frekansta dielektrik dalga boyu
* Stitching via aralığı karşılaştırması
* Plane boyutunu küçültmenin etkisi
* Dielektrik kalınlığını azaltmanın kapasitans etkisi

## 11.10 Grafikler

* Plane spacing'e karşı capacitance
* Plane X/Y boyutuna karşı ilk mode
* Mode index heatmap
* Dielektrik sabitine karşı ilk rezonans
* Frekans ekseni üzerinde mode işaretleri

## 11.11 Test

\[
a=b=100\ \text{mm}
\]

\[
d=0.1\ \text{mm}
\]

\[
\varepsilon_r=4
\]

\[
A=0.01\ \text{m}^2
\]

Beklenen:

\[
C_{\text{plane}}\approx3.54\ \text{nF}
\]

\[
f_{10}=f_{01}\approx749.5\ \text{MHz}
\]

---

# 12. EMC LC, Pi ve Ortak Mod Filtre Tasarım Aracı

**Araç anahtarı:** `emcFilterDesigner` · **URL kimliği:** `emc-filter-designer`
· **Klasör:** `web/src/pages/tools/EmcFilterDesigner/`

Arayüz metninde Yunan harfi `π` gösterilebilir; anahtar, klasör ve URL'de yalnızca ASCII
`pi` kullanılır.

## 12.1 Amaç

Araç üç mod sunar:

* LC filtre
* π filtre
* Common-mode choke tabanlı filtre

Filtrenin yalnızca ideal cutoff frekansını değil:

* Source impedance
* Load impedance
* Kondansatör ESR/ESL
* İndüktör DCR ve parazitik capacitance
* Filter peaking
* Damping
* Converter negative input impedance
* Tahmini insertion loss

etkilerini de gösterir.

İdeal LC filtrenin yüksek frekanstaki eğimi yaklaşık −40 dB/decade olabilir; fakat yetersiz
damping filtre peaking'ine ve DC/DC converter kararlılık sorununa yol açabilir.

## 12.2 Girdiler

* Filtre topolojisi
* Kaynak gerilimi
* Kaynak direnci
* Kaynak endüktansı
* Load direnci
* Converter giriş gücü
* Converter verimi
* Giriş voltajı
* L
* L DCR
* L paralel capacitance
* C1, ESR1, ESL1
* C2, ESR2, ESL2
* Damping resistor
* Damping capacitor
* Common-mode choke inductance
* Leakage inductance
* Choke DCR
* Line-to-line capacitance
* Line-to-ground capacitance
* Analiz frekans aralığı
* Gürültü frekansı
* Hedef attenuation
* İzin verilen damping direnci gücü
* Gain peaking sınırı
* Empedans oranı sınırı

## 12.3 İdeal cutoff

\[
f_0=\frac{1}{2\pi\sqrt{LC}}
\]

Karakteristik empedans:

\[
Z_0=\sqrt{\frac{L}{C}}
\]

## 12.4 Seri RLC damping

Basitleştirilmiş seri RLC için:

\[
\zeta=\frac{R}{2}\sqrt{\frac{C}{L}}
\]

\[
Q=\frac{1}{2\zeta}=\frac{1}{R}\sqrt{\frac{L}{C}}
\]

Gerçek filtre topolojisinde source ve load empedansları farklı olduğundan nihai sonuç
kompleks nodal çözümden alınır.

## 12.5 Kompleks komponent modelleri

İndüktör:

\[
Z_L=DCR+j\omega L
\]

Parazitik paralel kapasite varsa:

\[
Z_{L,\text{real}}=Z_L\parallel\frac{1}{j\omega C_p}
\]

Kondansatör:

\[
Z_C=ESR+j\omega ESL+\frac{1}{j\omega C}
\]

Damping kolu:

\[
Z_D=R_D+\frac{1}{j\omega C_D}
\]

## 12.6 Transfer fonksiyonu

Her topoloji için devre düğüm denklemleriyle:

\[
H(f)=\frac{V_{\text{out}}}{V_{\text{source}}}
\]

hesaplanır.

Insertion loss:

\[
IL_{\text{dB}}=20\log_{10}\left|\frac{V_{\text{out,no filter}}}{V_{\text{out,filter}}}\right|
\]

Kaynak ve yük empedansı olmadan yalnızca ideal \(1/\sqrt{LC}\) sonucuyla insertion loss
verilmez.

## 12.7 Converter negatif giriş direnci

Sabit güç yükü için küçük sinyal yaklaşık giriş direnci:

\[
R_{\text{in,neg}}\approx-\frac{V_{\text{in}}^2}{P_{\text{in}}}
\]

\[
P_{\text{in}}=\frac{P_{\text{out}}}{\eta}
\]

Büyüklük:

\[
|R_{\text{in,neg}}|=\frac{V_{\text{in}}^2}{P_{\text{in}}}
\]

Filter output impedance ile karşılaştırılır. Muhafazakâr tasarım göstergesi:

\[
|Z_{\text{out,filter}}|<K|Z_{\text{in,converter}}|
\]

Varsayılan \(K=1/3\) seçilebilir; bunun Middlebrook yaklaşımından türetilen tasarım marjı
olduğu, mutlak stabilite garantisi olmadığı belirtilir.

## 12.8 Damping değerlendirmesi

Başlangıç tahmini:

\[
R_D\approx\sqrt{\frac{L}{C}}
\]

Damping capacitance için sabit tek formül kullanılmaz. Kullanıcı değer girebilmelidir.

**Yapay ağırlıklı puan veya tek bir "en iyi" komponent değeri üretilmez.**

### 12.8.1 Üç ana metrik

Her damping adayı için ayrı ayrı hesaplanır ve ayrı ayrı gösterilir:

1. Maksimum gain peaking:

\[
G_{\text{peak,dB}}=\max_f 20\log_{10}|H(f)|
\]

2. Hedef gürültü frekansındaki attenuation:

\[
A_{\text{target,dB}}=-20\log_{10}|H(f_{\text{noise}})|
\]

3. Damping direnci üzerindeki güç kaybı \(P_{R_D}\)

### 12.8.2 İki yardımcı metrik

4. Filtre çıkış empedansı / converter giriş empedansı oranı:

\[
K_Z=\max_f\frac{|Z_{\text{out,filter}}(f)|}{|Z_{\text{in,converter}}(f)|}
\]

5. Gerçekleşen \(-3\ \text{dB}\) frekansı

### 12.8.3 Varsayılan uygun bölge koşulları

Bir damping kombinasyonu, aşağıdaki koşulların **tamamını** sağlıyorsa "uygun bölge"
içinde gösterilebilir:

\[
G_{\text{peak,dB}}\leq0\ \text{dB}
\]

\[
A_{\text{target,dB}}\geq A_{\text{required,dB}}
\]

\[
K_Z\leq\frac{1}{3}
\]

\[
P_{R_D}\leq P_{R_D,\text{allowed}}
\]

Kullanıcı gain peaking sınırını, gerekli attenuation değerini, empedans oranını ve izin
verilen direnç gücünü değiştirebilmelidir.

### 12.8.4 Pareto sıralaması

Koşulları sağlayan birden fazla aday varsa bunlar **tek bir puanla sıralanmaz**. Bunun
yerine:

* Uygun adaylar tabloda gösterilir.
* Pareto bakımından baskın olmayan adaylar işaretlenir.
* Üç ana grafik yan yana değil, **ayrı grafikler** hâlinde gösterilir.
* Nihai komponent seçimi kullanıcıya bırakılır.

Dominans tanımı: bir aday diğerine göre daha düşük peaking, daha yüksek attenuation ve
daha düşük direnç kaybı değerlerinin **tamamında eşit veya daha iyi** ve **en az birinde
daha iyi** ise diğer adayı domine eder. Bu kurala göre Pareto adayı belirlenir.

## 12.9 Common-mode choke

Common-mode:

\[
Z_{\text{CM}}\approx R_{\text{DCR}}+j\omega L_{\text{CM}}
\]

Differential-mode etkisi esas olarak leakage inductance ile:

\[
Z_{\text{DM}}\approx R_{\text{DCR}}+j\omega L_{\text{leak}}
\]

olarak modellenebilir.

Parazitik kapasitans üst frekansta empedansı sınırlar.

## 12.10 Sonuçlar

* İdeal cutoff
* Gerçek −3 dB frekansı
* Rezonans frekansı
* Peak gain
* Peak frequency
* Hedef gürültü frekansında attenuation
* Filter output impedance
* Converter input impedance
* Empedans oranı \(K_Z\)
* Damping yeterliliği ve uygun bölge durumu
* Pareto adayları
* İndüktör RMS/peak akımı
* Kondansatör ripple akımı
* DCR kaybı
* Damping resistor kaybı
* Common-mode ve differential-mode sonuçları

## 12.11 Grafikler

* Gain / insertion loss
* Filter output impedance
* Converter input impedance
* Dampingli ve dampingsiz karşılaştırma
* Nominal/min/max komponent toleransı

## 12.12 Test

\[
L=10\ \text{µH}
\]

\[
C=10\ \text{µF}
\]

\[
f_0\approx15.915\ \text{kHz}
\]

\[
Z_0=1\ \Omega
\]

---

# 13. Buck Dönüştürücü PCB Ön Tasarım Aracı

**Araç anahtarı:** `buckPcbPreDesign` · **URL kimliği:** `buck-pcb-pre-design`
· **Klasör:** `web/src/pages/tools/BuckPcbPreDesign/`

## 13.1 Kapsam

Araç, continuous conduction mode çalışan temel buck power stage ön tasarımını yapar.

Şunları kapsar:

* Asenkron buck
* Senkron buck
* Duty cycle
* İndüktör
* Input capacitor
* Output capacitor
* Ripple
* Peak akım
* RMS akım
* Yaklaşık kayıplar
* Hot-loop yerleşim uyarıları

Şunları kapsadığını iddia etmez:

* Kontrol döngüsü kompanzasyonu
* Subharmonic oscillation
* Current-mode slope compensation
* Bootstrap ayrıntıları
* Minimum on/off time doğrulaması
* Magnetik core loss'un ayrıntılı Steinmetz modeli
* EMI compliance

Temel buck power-stage denklemleri üretici uygulama notlarıyla uyumlu kurulur.

## 13.2 Girdiler

* Minimum, nominal ve maksimum input voltage
* Output voltage
* Maximum output current
* Nominal output current
* Switching frequency
* Efficiency estimate
* İstenen ripple yüzdesi
* İndüktans
* İndüktör DCR
* Saturation current
* RMS current rating
* Input capacitance
* Input capacitor ESR
* Input capacitor RMS current rating
* Output capacitance
* Output capacitor ESR
* MOSFET \(R_{DS(on)}\)
* High-side ve low-side gate charge
* Rise/fall time
* Diode forward voltage
* Diode reverse recovery charge
* Dead time
* Thermal resistance
* Maximum junction temperature
* Ambient temperature

## 13.3 Duty cycle

İdeal:

\[
D=\frac{V_{\text{out}}}{V_{\text{in}}}
\]

Verim tahminli kaba yaklaşım:

\[
D\approx\frac{V_{\text{out}}}{\eta V_{\text{in}}}
\]

Bu yaklaşım düşük gerilim ve yüksek akım sistemlerinde MOSFET/diode düşümlerini tam
karşılamaz.

## 13.4 İndüktör ripple akımı

\[
\Delta I_L=\frac{(V_{\text{in}}-V_{\text{out}})D}{Lf_{sw}}
\]

Eşdeğer:

\[
\Delta I_L=\frac{V_{\text{out}}(1-D)}{Lf_{sw}}
\]

Hedef ripple'dan gerekli endüktans:

\[
L=\frac{V_{\text{out}}(V_{\text{in}}-V_{\text{out}})}{\Delta I_Lf_{sw}V_{\text{in}}}
\]

Ripple oranı:

\[
r_I=\frac{\Delta I_L}{I_{\text{out}}}
\]

## 13.5 Peak ve RMS indüktör akımı

\[
I_{L,\text{peak}}=I_{\text{out}}+\frac{\Delta I_L}{2}
\]

\[
I_{L,\min}=I_{\text{out}}-\frac{\Delta I_L}{2}
\]

\[
I_{L,\text{RMS}}=\sqrt{I_{\text{out}}^2+\frac{\Delta I_L^2}{12}}
\]

CCM sınırı:

\[
I_{\text{out,boundary}}=\frac{\Delta I_L}{2}
\]

## 13.6 Output ripple

Kapasitif üçgen ripple yaklaşımı:

\[
\Delta V_C\approx\frac{\Delta I_L}{8f_{sw}C_{\text{out}}}
\]

ESR ripple:

\[
\Delta V_{\text{ESR}}\approx\Delta I_L\cdot ESR
\]

Toplam kaba yaklaşım:

\[
\Delta V_{\text{out}}\approx\Delta V_C+\Delta V_{\text{ESR}}
\]

Hedef ripple'dan minimum capacitance:

\[
C_{\text{out,min}}\geq\frac{\Delta I_L}{8f_{sw}\Delta V_C}
\]

## 13.7 Input capacitor RMS akımı

İdeal sabit output current yaklaşımı:

\[
I_{CIN,\text{RMS}}\approx I_{\text{out}}\sqrt{D(1-D)}
\]

Maksimum yaklaşık \(D=0.5\)'te:

\[
I_{CIN,\text{RMS,max}}\approx\frac{I_{\text{out}}}{2}
\]

Ripple terimi dahil gelişmiş model opsiyonel eklenebilir.

## 13.8 MOSFET iletim kaybı

High-side:

\[
P_{\text{HS,cond}}\approx I_{L,\text{RMS}}^2R_{DS(on),HS}D
\]

Low-side senkron:

\[
P_{\text{LS,cond}}\approx I_{L,\text{RMS}}^2R_{DS(on),LS}(1-D)
\]

Sıcak \(R_{DS(on)}\) değeri kullanılmalı veya sıcaklık çarpanı girilmelidir.

## 13.9 Switching kaybı

\[
P_{\text{sw}}\approx\frac{1}{2}V_{\text{in}}I_{\text{out}}(t_r+t_f)f_{sw}
\]

Gate loss:

\[
P_g=Q_gV_gf_{sw}
\]

## 13.10 Asenkron diode kaybı

\[
I_{D,\text{avg}}\approx I_{\text{out}}(1-D)
\]

\[
P_D\approx V_FI_{\text{out}}(1-D)
\]

Reverse recovery:

\[
P_{rr}\approx Q_{rr}V_{\text{in}}f_{sw}
\]

## 13.11 Dead-time body diode kaybı

Senkron yapıda:

\[
P_{\text{dead}}\approx V_{F,\text{body}}I_{\text{out}}t_{\text{dead}}f_{sw}N_{\text{edges}}
\]

## 13.12 İndüktör kaybı

Bakır kaybı:

\[
P_{L,\text{Cu}}=I_{L,\text{RMS}}^2DCR
\]

Core loss için üretici eğrisi veya Steinmetz katsayıları girilmedikçe kesin hesap yapılmaz.

## 13.13 Termal

\[
T_J=T_A+P_{\text{device}}\theta_{JA}
\]

Bu basit model PCB bakır alanı, airflow ve çoklu ısı yolu etkilerini tek başına çözmez.

## 13.14 Yerleşim değerlendirmesi

Kullanıcıdan yaklaşık şu değerler alınır:

* Input hot-loop çevresi
* Switch-node alanı
* Input capacitor–MOSFET mesafesi
* Gate-loop uzunluğu
* Power GND ile signal GND birleşim şekli
* Feedback hattının switch-node'a mesafesi
* Güç via sayısı

Geometrik eşiklerin üreticiye bağlı olduğu belirtilir. Sonuçta:

* Input capacitor'ı switching pair'e yaklaştır
* Hot-loop alanını küçült
* Switch-node copper alanını gereksiz büyütme
* Feedback hattını switch node'dan uzak tut
* Gate loop'u kısa tut
* High di/dt dönüş yolunu bölme

şeklinde bağlama duyarlı öneriler üretilir.

## 13.15 Grafikler

* Input voltage'a karşı duty cycle
* Input voltage'a karşı ripple current
* İndüktansa karşı peak current
* Switching frequency'ye karşı switching loss
* Output current'a karşı toplam yaklaşık kayıp

## 13.16 Test

\[
V_{in}=24\ \text{V}
\]

\[
V_{out}=12\ \text{V}
\]

\[
I_{out}=5\ \text{A}
\]

\[
f_{sw}=200\ \text{kHz}
\]

\[
\Delta I_L=1.5\ \text{A}
\]

Beklenen:

\[
D=0.5
\]

\[
L=20\ \text{µH}
\]

\[
I_{L,\text{peak}}=5.75\ \text{A}
\]

\[
I_{CIN,\text{RMS}}\approx2.5\ \text{A}
\]

50 mV kapasitif ripple için:

\[
C_{\text{out,min}}\approx18.75\ \text{µF}
\]

---

# 14. TVS ve ESD Koruma Boyutlandırıcısı

**Araç anahtarı:** `tvsEsdProtection` · **URL kimliği:** `tvs-esd-protection`
· **Klasör:** `web/src/pages/tools/TvsEsdProtection/`

## 14.1 Amaç

Araç kullanıcıya parça numarası seçmek yerine gerekli elektriksel sınırları üretir:

* Minimum reverse working voltage
* Breakdown voltage aralığı
* Maksimum clamping voltage
* Tahmini pulse current
* Peak pulse power
* Pulse energy
* Dynamic resistance
* Hat capacitance sınırı
* Uni-directional / bidirectional seçimi
* Yerleşim endüktansı etkisi

TVS seçiminde \(V_{RWM}\), \(V_{BR}\) ve \(V_C\) birbirinden ayrılır; clamping voltage
korunan IC'nin dayanım sınırının altında olmalıdır.

## 14.2 Girdiler

* Hat türü: power / analog / GPIO / CAN / RS-485 / USB / Ethernet / özel
* Nominal hat gerilimi
* Maksimum normal çalışma gerilimi
* İzin verilen leakage current
* Korunan IC recommended operating maximum
* Korunan IC absolute maximum
* Pozitif ve negatif sınırlar
* Surge open-circuit voltage
* Surge source resistance
* İlave seri resistance
* Pulse waveform
* Pulse süresi
* Tekrarlama sayısı
* TVS \(V_{RWM}\)
* \(V_{BR}\)
* Test current \(I_T\)
* Clamping voltage \(V_C\)
* Clamping current \(I_{PP,\text{datasheet}}\)
* Dynamic resistance
* Junction capacitance
* Hat source impedance
* Sinyal bandwidth
* PCB bağlantı endüktansı
* Tahmini \(di/dt\)
* Uni-directional / bidirectional

## 14.3 Gerilim sıralaması

Normal tasarım koşulu:

\[
V_{\text{normal,max}}<V_{RWM}<V_{BR}<V_C
\]

Ancak \(V_C\) şu koşulu sağlayabilmelidir:

\[
V_C<V_{\text{protected,max}}
\]

Bu sıralama tüm transient sistemlerinde tek başına yeterli değildir.

## 14.4 Kaynak sınırlı pulse akımı

Thevenin surge modeli:

\[
I_{PP}\approx\frac{V_{\text{surge}}-V_{\text{clamp}}}{R_{\text{source}}+R_{\text{series}}}
\]

Clamping voltage akıma bağlı olduğundan iteratif çözüm uygulanır (§14.5).

## 14.5 Dynamic resistance ve clamp çözücü politikası

Datasheet iki noktası kullanılarak:

\[
R_{\text{dyn}}\approx\frac{V_C-V_{BR}}{I_{PP}-I_T}
\]

Gerçek akımdaki yaklaşık clamp — lineer dynamic resistance modeli:

\[
V_{\text{clamp}}(I)=V_{BR}+R_{\text{dyn}}(I-I_T)
\]

Çözülecek residual fonksiyon:

\[
F(I)=I-\frac{V_{\text{surge}}-V_{\text{clamp}}(I)}{R_{\text{source}}+R_{\text{series}}}
\]

Çözüm test edilebilir ve deterministik olmalıdır.

### 14.5.1 Öncelikli çözüm: analitik

Model tamamen lineerse çözüm analitik olarak hesaplanabilir. Analitik çözüm mümkün ve
sonluysa **öncelikle bu çözüm kullanılır**:

\[
I=\frac{V_{\text{surge}}-V_{BR}+R_{\text{dyn}}I_T}{R_{\text{source}}+R_{\text{series}}+R_{\text{dyn}}}
\]

Sonuç negatifse fiziksel pulse akımı şu şekilde sınırlandırılır:

\[
I=0
\]

### 14.5.2 Sayısal çözüm

Kullanıcı tarafından doğrusal olmayan clamp tablosu veya farklı bir clamp fonksiyonu
verilirse **sınırlandırılmış bisection** çözümü kullanılır.

Alt sınır:

\[
I_{\min}=0
\]

Üst sınır başlangıcı:

\[
I_{\max}=\max\left[0,\ \frac{V_{\text{surge}}-V_{BR}}{R_{\text{source}}+R_{\text{series}}}\right]
\]

Başlangıç üst sınırı kökü kapsamıyorsa, üst sınır her adımda iki katına çıkarılabilir.
En fazla **16 genişletme** yapılır.

### 14.5.3 Yakınsama ve hata

Yakınsama kriterleri:

\[
|F(I)|<10^{-9}\ \text{A}
\]

veya

\[
\frac{|I_n-I_{n-1}|}{\max(1,|I_n|)}<10^{-6}
\]

Maksimum iterasyon:

\[
N_{\max}=100
\]

Aşağıdaki durumlarda hata döndürülür:

```text
TVS_SOLVER_NO_CONVERGENCE
```

* 100 iterasyonda yakınsama sağlanamaması
* Sonlu bir aralık oluşturulamaması
* Residual fonksiyonunun NaN veya Infinity üretmesi
* Geçerli kök aralığı bulunamaması

Analitik ve sayısal çözüm aynı lineer örneğe uygulandığında sonuçların tanımlı tolerans
içinde aynı olduğu test edilir.

## 14.6 Peak pulse power

\[
P_{\text{peak}}=V_{\text{clamp}}I_{PP}
\]

Pulse energy:

\[
E=\int v(t)i(t)\,dt
\]

Dalga şekli tam verilmemişse kullanıcıya şu seçenekler sunulur.

Dikdörtgen:

\[
E\approx V_CI_{PP}t_p
\]

Üçgen:

\[
E\approx\frac{1}{2}V_CI_{PP}t_p
\]

Kullanıcı tanımlı waveform katsayısı:

\[
E\approx K_wV_CI_{PP}t_p
\]

## 14.7 Parazitik endüktans

TVS'nin kendisi uygun olsa bile PCB bağlantısı ek overshoot üretir:

\[
V_L=L_{\text{path}}\frac{di}{dt}
\]

IC üzerinde görülebilecek yaklaşık peak:

\[
V_{\text{IC,peak}}\approx V_{\text{clamp}}+V_L
\]

TVS'nin konnektöre yakın, dönüş yolunun kısa ve geniş olması gerektiğini açıklayan SVG
gösterilir.

## 14.8 Veri hattı capacitance etkisi

TVS junction capacitance ve source impedance için yaklaşık kutup:

\[
f_{-3\text{dB}}\approx\frac{1}{2\pi R_{\text{source}}C_{\text{TVS}}}
\]

Differential hatlarda common-mode ve differential capacitance ayrımının gerçek S-parametre
analizi gerektirebileceği belirtilir.

## 14.9 Uni-directional / bidirectional

Karar desteği:

* Tek polariteli DC power hattı: unidirectional çoğunlukla avantajlı olabilir.
* Bipolar analog veya AC sinyal: bidirectional gerekebilir.
* Diferansiyel bus: bus çalışma common-mode aralığı ve transceiver sınırlarına göre
  seçilmelidir.
* Bu seçim otomatik kesin karar olarak verilmez.

## 14.10 Sonuçlar

* Minimum önerilen \(V_{RWM}\)
* Uygun breakdown aralığı
* İzin verilen maksimum clamp
* Tahmini pulse current
* Kullanılan çözüm yolu (analitik / sayısal)
* Peak pulse power
* Pulse energy
* Dynamic resistance
* PCB overshoot
* IC üzerinde tahmini peak
* TVS capacitance cutoff
* Leakage değerlendirmesi
* Polarity önerisi
* Layout uyarısı
* Test standardı seçimi için bilgi notu

## 14.11 Grafikler

* Surge source resistance'a karşı pulse current
* Pulse current'a karşı clamp voltage
* Path inductance'a karşı overshoot
* TVS capacitance'a karşı bandwidth

## 14.12 Test

\[
V_{\text{surge}}=100\ \text{V}
\]

\[
V_{\text{clamp}}=33\ \text{V}
\]

\[
R_{\text{source}}=2\ \Omega
\]

\[
I_{PP}=33.5\ \text{A}
\]

\[
P_{\text{peak}}\approx1105.5\ \text{W}
\]

Bu değerin pulse süresinden bağımsız sürekli güç olmadığı açıkça gösterilir.

---

# 15. Flex PCB Bükülme ve İz Hesaplayıcı

**Araç anahtarı:** `flexPcbBendTrace` · **URL kimliği:** `flex-pcb-bend-trace`
· **Klasör:** `web/src/pages/tools/FlexPcbBendTrace/`

## 15.1 Amaç

Araç:

* Flex toplam kalınlığı
* Copper layer konumu
* Neutral axis
* Bend radius
* Tahmini yüzey strain'i
* Statik ve dinamik bend ayrımı
* Trace resistance
* Voltage drop
* Güç kaybı
* Katman sayısına göre üretici bend-radius önerisi
* Coverlay ve stiffener sınırları

konularında karar desteği verir.

Flex PCB bend radius için tek evrensel sayı kullanılmaz. Örneğin bir üretici kılavuzunda
çift katmanlı flex için yaklaşık toplam kalınlığın 12 katı, multilayer flex için 24 katı
minimum başlangıç değerleri verilmektedir; dinamik uygulamalar ayrıca değerlendirilmelidir.
Bu değerler üretici profili olarak etiketlenir.

## 15.2 Girdiler

* Flex türü: single-layer / double-layer / multilayer / rigid-flex
* Statik bend / dynamic bend
* Toplam flex kalınlığı
* Copper thickness
* Polyimide thickness
* Adhesive thickness
* Coverlay thickness
* Layer sayısı
* Bend radius
* Bend angle
* Bend length
* Copper layer'ın neutral axis'e uzaklığı
* Trace width
* Trace length
* Trace sayısı
* Paralel trace sayısı
* Current
* Copper resistivity
* Sıcaklık
* Stiffener başlangıç mesafesi
* Via'nın bend alanına uzaklığı
* Pad'ın bend alanına uzaklığı
* Üretici profil seçimi
* İzin verilen strain
* Hedef cycle sayısı, yalnız bilgi amaçlı

## 15.3 Bend strain

Neutral axis biliniyorsa copper strain:

\[
\epsilon\approx\frac{y}{R}
\]

Burada:

* \(y\): copper'ın neutral axis'e uzaklığı
* \(R\): neutral axis bend radius

Neutral axis bilinmiyor ve simetrik yapı varsayılıyorsa dış yüzey:

\[
\epsilon_{\text{outer}}\approx\frac{t_{\text{total}}}{2R}
\]

Yüzde:

\[
\epsilon_{\%}=100\epsilon
\]

Bu model:

* Plastik deformasyon
* Work hardening
* Adhesive viscoelasticity
* Copper grain structure
* Rolled-annealed / electrodeposited copper farkı
* Tekrarlı fatigue

etkilerini tam olarak modellemez.

## 15.4 İzin verilen strain'den bend radius

\[
R_{\min}=\frac{y}{\epsilon_{\text{allow}}}
\]

Simetrik dış yüzey yaklaşımı:

\[
R_{\min}=\frac{t_{\text{total}}}{2\epsilon_{\text{allow}}}
\]

İzin verilen strain değeri varsayılan sabit olarak gizlice verilmez. Kullanıcı üretici
verisi girmeli veya değer "kullanıcı varsayımı" olarak işaretlenmelidir.

## 15.5 Üretici çarpanı

\[
R_{\min,\text{vendor}}=K_bt_{\text{total}}
\]

Örnek profil:

* Double-layer static başlangıç: \(K_b=12\)
* Multilayer static başlangıç: \(K_b=24\)

Dynamic flex için sabit bir \(K_b\) varsayılmaz. Kullanıcının üretici değerini girmesi
istenir veya model sınırı uyarısı verilir.

## 15.6 Bend uzunluğu

Bend açısı radyan cinsinden:

\[
\theta_{\text{rad}}=\theta_{\deg}\frac{\pi}{180}
\]

Neutral-axis arc length:

\[
l_{\text{bend}}=R\theta_{\text{rad}}
\]

Dış ve iç yüzey uzunlukları:

\[
l_{\text{outer}}=(R+y)\theta
\]

\[
l_{\text{inner}}=(R-y)\theta
\]

Uzama farkı:

\[
\Delta l=2y\theta
\]

## 15.7 Trace direnci

Copper area:

\[
A_{\text{Cu}}=wt
\]

Sıcaklık düzeltilmiş özdirenç:

\[
\rho_T=\rho_{20}\left[1+\alpha(T-20)\right]
\]

Direnç:

\[
R_{\text{trace}}=\rho_T\frac{l}{wt}
\]

Paralel eş trace:

\[
R_{\text{eq}}=\frac{R_{\text{trace}}}{N}
\]

## 15.8 Gerilim düşümü ve güç

\[
V_{\text{drop}}=IR
\]

\[
P_{\text{loss}}=I^2R
\]

Flex trace sıcaklığı yalnızca \(I^2R\) ile tahmin edilmez. Isı yayılımı, coverlay, hava,
rigid bölge ve bonding yapısına bağlıdır.

## 15.9 Tasarım kontrolleri

Araç şu kontrolleri yapar:

* Via bend bölgesinin içinde mi?
* Pad bend bölgesine çok yakın mı?
* Stiffener bitişi bend başlangıcına çok yakın mı?
* Trace bend eksenini keskin açıyla mı geçiyor?
* Keskin trace corner var mı?
* Copper pour solid mi, hatched mi?
* Katman geçişi bend alanında mı?
* Trace genişliği bend bölgesinde ani değişiyor mu?
* Birden fazla katmandaki trace'ler üst üste mi?
* Teardrop önerisi gerekli mi?

Üretici eşiği bilinmiyorsa "unknown" sonucu verilir; gizli varsayılan üretici limiti
oluşturulmaz.

## 15.10 Dynamic flex

Cycle life için evrensel kapalı form kullanılmaz.

Kullanıcı üreticiden alınmış ampirik model katsayıları girebiliyorsa opsiyonel model:

\[
N_f=A\epsilon^{-b}
\]

kullanılabilir.

Ancak \(A\) ve \(b\) girilmemişse cycle life tahmini üretilmez.

## 15.11 Sonuçlar

* Üretici kuralına göre minimum bend radius
* Strain kuralına göre minimum bend radius
* Kullanılan gerçek bend radius
* Tahmini copper strain
* Bend arc length
* İç ve dış yüzey uzunluğu
* Trace direnci
* Gerilim düşümü
* Güç kaybı
* Via/pad/stiffener kontrolleri
* Statik veya dinamik uygunluk notu
* Üretici doğrulaması gereksinimi

## 15.12 Grafikler

* Bend radius'a karşı strain
* Total thickness'a karşı minimum radius
* Trace width'e karşı resistance
* Sıcaklığa karşı resistance
* Vendor factor'a karşı minimum bend radius

## 15.13 Test

Double-layer flex:

\[
t=0.2\ \text{mm}
\]

\[
K_b=12
\]

\[
R_{\min}=2.4\ \text{mm}
\]

Simetrik neutral-axis kabulüyle ve \(R=2.4\ \text{mm}\):

\[
\epsilon=\frac{0.2}{2\cdot2.4}\approx0.04167
\]

\[
\epsilon_{\%}\approx4.17\ \%
\]

Bu yüksek strain'in gerçek kullanım uygunluğunun copper türü, stack-up ve üretici verisi
olmadan belirlenemeyeceği açıkça gösterilir.

---

# ORTAK BÖLÜMLER

---

# 16. Ortak Tolerans Sistemi

Kritik araçlarda üç analiz sunulur:

* Nominal
* Worst-case minimum
* Worst-case maksimum

Tolerans kombinasyonları azsa tüm corner kombinasyonları hesaplanır. Örneğin:

\[
C\in[C_{\min},C_{\max}]
\]

\[
ESR\in[ESR_{\min},ESR_{\max}]
\]

\[
ESL\in[ESL_{\min},ESL_{\max}]
\]

PDN gibi kombinasyon sayısının hızla arttığı araçlarda:

* Nominal
* Tüm minimumlar
* Tüm maksimumlar
* Seçilmiş kritik corner'lar

hesaplanabilir.

## 16.1 Monte Carlo — PRNG ve seed politikası

İleri seçenek olarak deterministik seed kullanan Monte Carlo eklenebilir. Aynı giriş aynı
sonucu üretmelidir.

Hesap motorunda **hiçbir koşulda** doğrudan şu kullanılmaz:

```js
Math.random()
```

Monte Carlo analizinde saf ve seed'li `mulberry32` PRNG kullanılır. Referans algoritma:

```js
export function createMulberry32(seed) {
  let state = seed >>> 0;

  return function nextRandom() {
    state += 0x6D2B79F5;

    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
```

Seed:

* 32-bit unsigned integer olmalıdır.
* Kullanıcı tarafından değiştirilebilir olmalıdır.
* Proje kaydına eklenmelidir.
* Rapor üzerinde gösterilmelidir.
* Aynı seed ve aynı girişler aynı sonuçları üretmelidir.

Varsayılan seed:

```text
2712847316
```

Bu değer hexadecimal olarak `0xA1B2C3D4` karşılığına sahiptir.

Kullanıcı boş seed girerse varsayılan seed kullanılır.

Negatif veya 32-bit aralığı dışındaki girişler unsigned 32-bit değere **sessizce
dönüştürülmez**. Bunun yerine doğrulama hatası verilir:

```text
INVALID_MONTE_CARLO_SEED
```

Monte Carlo örnek sayısı da proje ve rapor verisine dahil edilir.

---

# 17. Grafik Motoru Kuralları

Bütün frekans sweep'leri logaritmik olmalıdır:

\[
f_k=10^{\log_{10}(f_{\min})+\frac{k}{N-1}\left[\log_{10}(f_{\max})-\log_{10}(f_{\min})\right]}
\]

Burada:

\[
k=0,1,2,\ldots,N-1
\]

İlk ve son frekans noktaları kesin olarak şu sonucu vermelidir:

\[
f_0=f_{\min}
\]

\[
f_{N-1}=f_{\max}
\]

Kurallar:

* İlk ve son nokta mutlaka dahil edilmelidir.
* NaN ve Infinity grafik verisine gönderilmemelidir.
* Sweep hesapları saf fonksiyon olmalıdır.
* Grafik ve rapor aynı sweep kaynağını kullanmalıdır.
* Veri tablosu mevcut `sampleIndices()` kuralıyla seyreltilmelidir.
* Logaritmik grafikte sıfır ve negatif değerler açık hata veya "gösterilemez" sonucu
  üretmelidir (bkz. `LOG_AXIS_NONPOSITIVE`, §18).

PDN ve filtre grafiklerinde:

* Frekans ekseni log
* Empedans ekseni log
* Faz ayrı grafik veya ikincil görünüm

kullanılabilir.

---

# 18. Validasyon ve Hata Yönetimi

Her giriş için:

* Sonlu sayı
* Fiziksel olarak pozitif değer
* Mantıklı üst ve alt sınır
* Birim doğrulaması
* Birbirleriyle tutarlılık

kontrolü yapılır.

## 18.1 Hata kodları

```text
INVALID_INPUT
NON_POSITIVE_VALUE
FREQUENCY_RANGE_INVALID
TARGET_NOT_REACHABLE
NEGATIVE_RESISTANCE_RESULT
ACQUISITION_TIME_TOO_SHORT
BACKDRILL_EXCEEDS_BOARD
RESIDUAL_STUB_NEGATIVE
DRIVER_CURRENT_INSUFFICIENT
ADC_SETTLING_FAILED
BUS_DELAY_BUDGET_EXCEEDED
BIAS_TARGET_NOT_REACHABLE
SHUNT_POWER_EXCEEDED
PDN_SWEEP_FAILED
NO_VALID_RESONANCE
FILTER_UNSTABLE_RISK
BUCK_DUTY_OUT_OF_RANGE
TVS_CLAMP_EXCEEDS_LIMIT
FLEX_VENDOR_DATA_REQUIRED
MODEL_OUT_OF_RANGE
TVS_SOLVER_NO_CONVERGENCE
BUS_FIXED_DELAY_EXCEEDS_SAMPLE_POINT
INVALID_MONTE_CARLO_SEED
LOG_AXIS_NONPOSITIVE
```

## 18.2 `LOG_AXIS_NONPOSITIVE` kullanımı

Bu kod şu durumlarda kullanılır:

* Logaritmik frekans ekseninde \(f\leq0\)
* Logaritmik empedans ekseninde gösterilecek \(|Z|\leq0\)
* Logaritmik grafik sınırlarında sıfır veya negatif değer
* Logaritmik interpolasyona gönderilen sıfır veya negatif giriş

Çok küçük ama pozitif değerler sıfıra yuvarlanmaz. Grafik katmanına NaN, Infinity veya
negatif log değeri gönderilmez.

Hata kodlarının Türkçe ve İngilizce karşılığı ilgili `text.js` dosyasında veya ortak hata
metni yapısında bulunur.

---

# 19. Mühendislik Yorum Motoru

Yorumlar rastgele veya yalnızca sayısal eşiklere bağlı sert hükümler olmamalıdır.

Yanlış:

> Tasarım güvenlidir.

Doğru:

> Hesaplanan via-stub çeyrek dalga rezonansı, seçilen maksimum analiz frekansının 4.2
> katıdır. Rezonans çalışma bandının dışında görünmektedir; ancak via geçişinin kapasitif
> süreksizliği ve pad/antipad geometrisi bu modelde bulunmadığından yüksek hızlı bağlantı
> için 3D elektromanyetik doğrulama önerilir.

Yanlış:

> 10 nF kondansatör kullan.

Doğru:

> Girilen ESR, ESL ve mounting inductance değerleriyle 10 nF kolunun minimum empedansı
> yaklaşık 72 MHz civarında oluşmaktadır. Hedef gürültü frekansı 180 MHz olduğundan bu kol
> o bölgede endüktif davranmaktadır.

Her yorum:

* Hesap sonucuna bağlı
* Ölçülebilir gerekçeli
* Model sınırını belirten
* Kesinlik düzeyini açıklayan

bir yapıda olmalıdır.

---

# 20. Raporlama

Her araç raporunda:

1. Araç adı
2. Tarih
3. Girdiler
4. Ana sonuçlar
5. Ara sonuçlar
6. Kullanılan denklemler
7. Grafik
8. Tolerans sonuçları
9. Uyarılar
10. Varsayımlar
11. Geçerlilik sınırı
12. Kaynak sınıfı
13. Mühendislik yorumu

bulunur.

Monte Carlo kullanılan araçlarda seed ve örnek sayısı da rapora yazılır (§16.1).

Ekran ve rapor farklı hesap yapmaz. Aynı `compute()` ve `buildSweep()` sonuçları kullanılır.

---

# 21. Test Gereksinimleri

Her saf motor için:

* Nominal test
* Sınır testleri
* Hatalı giriş testleri
* SI conversion testleri
* Ters hesap testi
* Tolerans testi
* Grafik ilk/son nokta testi
* NaN/Infinity koruma testi
* Türkçe ve İngilizce metin yolu testi
* Rapor satır testi

yazılır.

Floating-point karşılaştırmalarında sabit string yerine uygun tolerans kullanılır:

```js
expect(result.value).toBeCloseTo(expected, precision)
```

Kompleks sweep'lerde birkaç referans frekans noktası doğrulanır.

Ayrıca kesinleştirilmiş politikalar için:

* PDN prominence eşiğinin altında kalan tepenin listeye girmediği test edilir (§10.9).
* Plato durumunda geometrik merkez frekansının kullanıldığı test edilir (§10.9.4).
* TVS analitik ve sayısal çözümünün aynı lineer örnekte eşleştiği test edilir (§14.5).
* Aynı Monte Carlo seed'inin aynı sonucu ürettiği test edilir (§16.1).
* Log sweep'in ilk ve son noktasının tam olarak \(f_{\min}\) ve \(f_{\max}\) olduğu test
  edilir (§17).

---

# 22. Kaynak ve Model Etiketleri

Araçlarda kaynak bilgisi şu şekilde sınıflandırılır:

```text
sourceType:
- physical-law
- closed-form
- first-order-equivalent
- manufacturer-guideline
- engineering-rule
- user-supplied-data
- numerical-sweep
```

Her sonuç grubunda kullanılan kaynak tipi açıkça gösterilir.

§10.10'daki worst-case droop toplamı `engineering-rule` ve alt etiket
`worst-case-time-domain-estimate` ile işaretlenir.

## 22.1 Lisanslı veri

Lisanslı standart veya kurum tablolarının verisi repoya kopyalanmaz. Böyle bir veri
gerekiyorsa:

* Kullanıcının veri yüklemesi sağlanır
* Tarayıcıda saklanır
* Veri yoksa "standart tabanlı doğrulama yapılamadı" sonucu verilir
* Ürün uyumluluğu veya sertifikasyon iddiasında bulunulmaz

---

# 23. Tamamlanma Kriterleri

Görev şu şartların tamamı sağlandığında bitmiş sayılır:

* 12 araç çalışıyor.
* Tüm araçlar iki dilli.
* Hesap motorları saf.
* Bütün hesaplar SI biriminde.
* Ara değerlerde yuvarlama yok.
* Her araçta teknik detay ve varsayımlar var.
* Kritik araçlarda tolerans analizi var.
* Her araçta en az bir parametrik grafik var.
* Her araçta parametrik SVG var.
* Proje kayıt sistemi çalışıyor.
* PDF ve Excel raporları çalışıyor.
* Rotalar lazy-loaded.
* Bütün testler geçiyor.
* Production build geçiyor.
* Konsolda hata yok.
* Mobil görünüm bozulmuyor.
* Mevcut araçlar etkilenmiyor.
* Standart veya üretici kuralı olmayan sonuçlar standart sonucu gibi gösterilmiyor.
* Yaklaşık modellerin geçerlilik sınırı açıkça yazıyor.
* Sayısal sonuçlar en az bir bağımsız örnekle doğrulanıyor.

## 23.1 Uygulama sırası

Önce repoyu analiz et. Daha sonra her araç için kısa bir uygulama planı çıkar. Uygulamayı
paket paket yap:

1. Ortak kompleks sayı ve sweep motorları
2. Birinci paket hesap motorları
3. Birinci paket ekranları ve testleri
4. İkinci paket hesap motorları
5. İkinci paket ekranları ve testleri
6. Rapor ve proje kayıt entegrasyonu
7. Build, test ve regresyon kontrolü

Herhangi bir formül ile mevcut `docs/spec.md` arasında çelişki bulunursa formülü sessizce
değiştirme. Çelişkiyi açıkça belirt ve mevcut proje spesifikasyonunu kaynak kabul et.

---

# 24. Kesinleştirilmiş Uygulama Politikaları

Bu bölüm, uygulamaya başlamadan önce sabitlenmiş kararların özetidir.

| Konu | Karar | Bölüm |
|---|---|---|
| PDN prominence | dB tabanlı; varsayılan eşik 3 dB, aralık 0.5–20 dB | §10.9 |
| TVS çözümü | Lineerde analitik; doğrusal olmayanda sınırlandırılmış bisection | §14.5 |
| TVS yakınsama | \(10^{-9}\) A residual **veya** \(10^{-6}\) bağıl değişim; en fazla 100 iterasyon | §14.5.3 |
| Damping | Tek skor yok; uygun bölge koşulları ve Pareto adayları | §12.8 |
| CAN \(t_{\text{fixed}}\) | Controller, TX, RX ve izolatör gecikmelerinin toplamı | §8.4 |
| Monte Carlo | `mulberry32`, kullanıcı seed'i, varsayılan `0xA1B2C3D4` | §16.1 |
| Via endüktansı sembolü | Ortak sembol \(L_{\text{via,eq}}\) | §2.3 |
| Ana PDN hesabı | Her zaman kompleks | §10.8 |
| Droop toplamı | Yalnızca muhafazakâr zaman alanı istisnası | §10.10 |
| Repo yolu | `web/src/...` | §1 |
| Araç klasörü | `report.test.js` zorunlu (altı dosya) | §1.1 |
| Yeni düzlem aracı | `plane-cavity-resonance` | §11 |
| Korunan mevcut araçlar | `power-plane`, PDN Target Impedance, Decoupling | §1.5 |
