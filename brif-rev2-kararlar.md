# REV2 Bağlayıcı Kararlar (talimatnameden)

> Bu dosya, kullanıcının ilettiği **düzeltme talimatnamesinin** bağlayıcı içeriğidir.
> REV2 dokümanı üretilirken tek kaynak budur. `/clear` sonrası önce bu dosya okunur.
>
> Girdi dosyaları:
> - Bozuk kaynak: `ALP PCB Toolkit – Birinci ve İkinci Paket Araçlarının Geliştirilmesi.md` (3975 satır)
> - Üretilen çıktı: `ALP PCB Toolkit – Birinci ve İkinci Paket – REV2.md`
> - İlerleme: `brif-rev2-ilerleme.md`

---

## 0. Görevin tanımı

Yeni teknik içerik yazmak veya kod yazmak YOK. Bozuk brifi, aşağıdaki kurallarla
**tek parça temiz Markdown** hâline getirmek. Çıktı yalnızca revize dokümandır:
eleştiri raporu yok, "şunu düzelttim" özeti yok, diff yok, eski/yeni yan yana yok.

---

## 1. Değiştirilmeyecekler

Fiziksel modeller, mühendislik yaklaşımları, denklem anlamları, sayısal test örnekleri
ve beklenen sonuçlar, saf hesap motoru yaklaşımı, SI zorunluluğu, iki dil, kompleks
empedans zorunluluğu, lazy loading, paket geliştirme sırası.

**Doğrulanmış 10 test sonucu — aynen korunacak:**

| Araç | Beklenen |
|---|---|
| Return Path | ~1.30 nH, 4.08 Ω |
| Via Stub | ~7.495 GHz, 14.99 GHz |
| MOSFET Gate Driver | 4 mA, 40 mW, 0.5 A, 20 ns |
| ADC Settling | ~5.55 kΩ |
| Shunt | ~0.5 W, 3.22 mA |
| Plane Cavity | ~3.54 nF, 749.5 MHz |
| EMC Filter | ~15.915 kHz, 1 Ω |
| Buck | D=0.5, 20 µH, 5.75 A, 2.5 A, 18.75 µF |
| TVS | 33.5 A, 1105.5 W |
| Flex PCB | 2.4 mm, ~%4.17 |

---

## 2. Formül biçimi

Tüm matematik blokları standart LaTeX olarak yeniden yazılır:

```
\[
x=y
\]
```

kısa ifadelerde `\(x=y\)`.

Şu bozuk biçimlerin **hiçbiri** kalmayacak: `# **\[**`, başlığa dönüşmüş sol taraf,
`**\[**`, setext başlık (`===`) hâline gelmiş `=`, `##` satırına dönüşmüş eksi terimler.
Word equation nesnesi, görsel formül, özel Unicode matematik, HTML denklem YOK.

### 2.1 Yedi formül — hepsinde ÇIKARMA

```
l_nominal,target = l_residual,max − Δl_fabrication − l_safety
R_g,ext,on       = R_total,on,target − R_drv,src − R_g,int − R_trace
R_g,ext,off      = R_total,off,target − R_drv,sink − R_g,int − R_trace
R_source,max     = R_eq,max − R_switch − R_series − R_driver
L_max            = (t_sample − t_fixed) / (2 · t_pd,per meter)
I_L,min          = I_out − ΔI_L/2
I                = (V_surge − V_clamp(I)) / (R_source + R_series)
f_k              = 10^{ log10(f_min) + (k/(N−1))·[ log10(f_max) − log10(f_min) ] }
```

Log dizisi için ek şart: `k = 0,1,…,N−1`; `f_0 = f_min` ve `f_{N−1} = f_max` kesin.

---

## 3. Kesinleştirilen beş politika

### 3.1 PDN prominence — dB tabanlı, varsayılan 3 dB

Tepe/çukur tespiti **doğrusal empedansta değil**, dB gösteriminde:

```
Z_dB(f) = 20·log10|Z(f)|
```

- Lokal maksimum adayı: iki komşusundan büyük nokta.
- Lokal maksimum prominence: `P_max = Z_peak,dB − max(Z_left valley,dB , Z_right valley,dB)`
- Lokal minimum adayı: iki komşusundan küçük nokta.
- Lokal minimum prominence: `P_min = min(Z_left peak,dB , Z_right peak,dB) − Z_valley,dB`
- Sol/sağ valley (veya peak) = tepenin iki yanındaki en yakın **doğrulanmış** lokal min (veya max).

Varsayılan eşik: `P_threshold = 3 dB`. Kullanıcı değiştirebilir.
İzin verilen aralık: `0.5 dB ≤ P_threshold ≤ 20 dB`.

Eşik altındakiler grafikte gösterilebilir ama "doğrulanmış rezonans/antirezonans"
listesine **alınmaz**. Sweep'in ilk ve son noktaları tek taraflı karşılaştırma nedeniyle
tepe/çukur olarak sınıflandırılmaz.

Plato (aynı fiziksel tepe birden fazla noktada):
- Plato başlangıç/bitiş indisleri belirlenir.
- Tepe frekansı = geometrik merkez: `f_center = √(f_start · f_end)`
- Empedans = plato üzerindeki maksimum değer.

Politika hesap motorunda ve testlerde aynı biçimde kullanılır.

### 3.2 TVS clamp çözücü

Residual fonksiyon:
```
F(I) = I − (V_surge − V_clamp(I)) / (R_source + R_series)
```

Lineer dynamic resistance modeli:
```
V_clamp(I) = V_BR + R_dyn·(I − I_T)
```

**Öncelik: analitik.** Model tamamen lineerse ve sonuç sonluysa analitik çözüm kullanılır:
```
I = (V_surge − V_BR + R_dyn·I_T) / (R_source + R_series + R_dyn)
```
Sonuç negatifse `I = 0` olarak sınırlandırılır.

**Sayısal yol:** kullanıcı doğrusal olmayan clamp tablosu/fonksiyonu verirse
sınırlandırılmış bisection.
- Alt sınır: `I_min = 0`
- Üst sınır başlangıcı: `I_max = max[ 0 , (V_surge − V_BR)/(R_source + R_series) ]`
- Üst sınır kökü kapsamıyorsa her adımda iki katına çıkar, **en fazla 16 genişletme**.

Yakınsama: `|F(I)| < 1e−9 A` **veya** `|I_n − I_{n−1}| / max(1,|I_n|) < 1e−6`.
Maksimum iterasyon: `N_max = 100`.

`TVS_SOLVER_NO_CONVERGENCE` döndürülecek durumlar: 100 iterasyonda yakınsamama,
sonlu aralık kurulamaması, residual'in NaN/Infinity üretmesi, geçerli kök aralığı yok.

Analitik ve sayısal çözümün aynı lineer örnekte tanımlı tolerans içinde eşit çıktığı
test edilir.

### 3.3 EMC damping — tek skor YOK

Yapay ağırlıklı puan veya tek "en iyi" değer üretilmez.

Üç ana metrik ayrı ayrı gösterilir:
1. Maksimum gain peaking — `G_peak,dB = max_f 20·log10|H(f)|`
2. Hedef gürültü frekansında attenuation — `A_target,dB = −20·log10|H(f_noise)|`
3. Damping direnci güç kaybı — `P_R_D`

İki yardımcı metrik:
4. `K_Z = max_f |Z_out,filter(f)| / |Z_in,converter(f)|`
5. Gerçekleşen −3 dB frekansı

**Uygun bölge koşulları (hepsi sağlanmalı):**
```
G_peak,dB   ≤ 0 dB
A_target,dB ≥ A_required,dB
K_Z         ≤ 1/3
P_R_D       ≤ P_R_D,allowed
```
Dördü de kullanıcı tarafından değiştirilebilir.

Birden fazla uygun aday varsa **tek puanla sıralanmaz**: tabloda gösterilir, Pareto
bakımından baskın olmayan adaylar işaretlenir, üç ana grafik **ayrı** gösterilir
(yan yana değil), nihai seçim kullanıcıya bırakılır.

Dominans tanımı: bir aday diğerine göre daha düşük peaking, daha yüksek attenuation ve
daha düşük direnç kaybının **tamamında eşit veya daha iyi** ve **en az birinde daha iyi**
ise diğerini domine eder.

### 3.4 CAN sabit gecikme

```
t_fixed      = t_controller + t_TX + t_isolator,TX + t_RX + t_isolator,RX
t_loop       = t_fixed + t_round trip
t_round trip = 2·L_bus·t_pd,per meter
L_max        = (t_sample − t_fixed) / (2·t_pd,per meter)
```

`t_sample ≤ t_fixed` durumunda açık hata: **`BUS_FIXED_DELAY_EXCEEDS_SAMPLE_POINT`**
— kablo uzunluğu sıfır olsa bile bütçe yetersiz demektir.

### 3.5 Monte Carlo — mulberry32

`Math.random()` hesap motorunda **hiçbir koşulda** kullanılmaz. Saf, seed'li mulberry32:

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

Seed: 32-bit unsigned; kullanıcı değiştirebilir; proje kaydına eklenir; raporda gösterilir;
aynı seed + aynı giriş = aynı sonuç. Varsayılan seed: **`2712847316`** (= `0xA1B2C3D4`).
Boş seed → varsayılan. Negatif veya 32-bit dışı giriş **sessizce dönüştürülmez**,
doğrulama hatası verir: **`INVALID_MONTE_CARLO_SEED`**.
Monte Carlo örnek sayısı da proje ve rapor verisine dahil edilir.

---

## 4. Sembol tutarlılığı

`L_vias` ve `L_via` sembolleri kaldırılır. Tek resmî sembol: **`L_via,eq`**.

```
ESL_total = ESL_component + L_mount + L_via,eq
```

- `ESL_component`: komponentin kendi eşdeğer seri endüktansı
- `L_mount`: pad, neck ve yüzey bağlantısı endüktansı
- `L_via,eq`: kullanılan via ağının eşdeğer bağlantı endüktansı

Birden fazla ideal ve bağımsız via için `L_via,eq ≈ L_via,single / N` kullanılabilir;
ortak akım yolu, mutual inductance veya ortak via neck varsa bu bölmenin **iyimser**
olabileceği açıkça yazılır. Doküman genelinde aynı sembol.

---

## 5. Kompleks kural + worst-case droop istisnası

"Empedans büyüklükleri doğrudan toplanarak PDN hesabı yapılmamalıdır" kuralı korunur.
Ana PDN hesabı her frekansta kompleks: `Y_total = Σ 1/Z_k`, `Z_total = 1/Y_total`.

`ΔV_approx ≈ ΔV_C + ΔV_ESR + ΔV_ESL` ifadesinin altına **aynen** şu açıklama eklenir:

> Bu cebirsel toplam, ana PDN kompleks empedans hesabının yerine kullanılmaz. Kapasitif
> droop, ESR step'i ve ESL kaynaklı gerilim sıçramasının aynı yönde oluştuğu muhafazakâr
> bir zaman alanı worst-case tahminidir. Bu nedenle ortak kompleks empedans kuralının
> bilinçli ve yalnızca bu tahmin için kullanılan bir istisnasıdır.

Etiket: `engineering-rule` + alt etiket `worst-case-time-domain-estimate`.

---

## 6. Araçların resmî adları / anahtarları / URL kimlikleri

Girişte, bölüm başlıklarında, `categories.js`, route, proje kaydı ve rapor anahtarlarında
**birebir** bu adlar. Alternatif varyasyon kullanılmaz.

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

9 numaralı araçta arayüzde `π` gösterilebilir; anahtar, klasör ve URL'de yalnızca ASCII `pi`.

8 numaralı araç mevcut **Güç Düzlemi ve Paralel Yol** / `power-plane` aracından farklıdır;
o araç değiştirilmez, yeniden adlandırılmaz, yeni araçla birleştirilmez.

---

## 7. Repo yolları

`src/...` → **`web/src/...`** (web arayüzüne aitse). İnceleme yolları:

```
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

Hesap motorları: `web/src/lib/<calculationEngine>.js`

Her araç klasörü **altı** zorunlu dosya:

```
web/src/pages/tools/<ToolName>/
├── model.js
├── text.js
├── schematic.jsx
├── index.jsx
├── report.js
└── report.test.js
```

Motor testi: `web/src/lib/<calculationEngine>.test.js` — veya repo mevcut kuralı farklıysa
mevcut örneklerle aynı düzende. **Yeni bağımsız klasör standardı icat edilmez.**

---

## 8. Korunacak mevcut araçlar

Aktif ve korunacak: PDN Target Impedance, Decoupling, Güç Düzlemi ve Paralel Yol,
mevcut empedans araçları, mevcut terminasyon araçları, mevcut via araçları.

Yeni **PDN Rezonans ve Antirezonans Analizörü**: PDN Target Impedance'ı ve Decoupling'i
silmez, route/proje anahtarlarını değiştirmez, gerekirse ortak saf yardımcıları yeniden
kullanır, mevcut proje kayıtlarını geçersizleştirmez.

Yeni **Düzlem Kavite Rezonansı ve Kapasitansı**: `power-plane` aracını silmez, onun
route'unu kullanmaz, DC akım taşıma ve paralel yol hesabıyla karıştırılmaz.

---

## 9. Eklenecek hata kodları

```
TVS_SOLVER_NO_CONVERGENCE
BUS_FIXED_DELAY_EXCEEDS_SAMPLE_POINT
INVALID_MONTE_CARLO_SEED
LOG_AXIS_NONPOSITIVE
```

`LOG_AXIS_NONPOSITIVE` kullanım yerleri: logaritmik frekans ekseninde `f ≤ 0`;
logaritmik empedans ekseninde `|Z| ≤ 0`; log grafik sınırlarında sıfır/negatif değer;
logaritmik interpolasyona giden sıfır/negatif giriş.

Çok küçük ama pozitif değerler sıfıra yuvarlanmaz. Grafik katmanına NaN, Infinity veya
negatif log değeri gönderilmez. Hata kodlarının TR/EN metinleri `text.js` veya ortak
hata metni yapısında tanımlanır.

---

## 10. Yalnızca biçimsel onarım görecekler

**Mimari:** saf hesap motorları; React/DOM ayrımı; iki dilli metin; `model.js` dil bilmez;
SI iç hesap; ara değerde yuvarlama yok; yuvarlama yalnız gösterimde; virgül+nokta ondalık;
belirsiz binlik ayırıcı sessizce yorumlanmaz; ekran ve rapor aynı hesabı kullanır;
`lazy()`; Vitest; SVG metinleri `text` prop'undan; tema değişkenleri korunur.

**Fizik:** kompleks empedans modelleri, via endüktansı, via-stub çeyrek dalga, MOSFET
gate-charge, ADC RC settling, CAN/RS-485 fiziksel katman, shunt/Kelvin hata modelleri,
PDN rezonans, plane cavity, EMC filtre eşdeğer devreleri, buck CCM, TVS güç/overshoot,
flex strain ve trace direnci.

**Testler:** bütün girdi ve beklenen sonuçlar aynı.

**Geliştirme sırası (değiştirilmez):**
1. Ortak kompleks sayı ve sweep motorları
2. Birinci paket hesap motorları
3. Birinci paket ekranları ve testleri
4. İkinci paket hesap motorları
5. İkinci paket ekranları ve testleri
6. Rapor ve proje kayıt entegrasyonu
7. Build, test ve regresyon kontrolü

---

## 11. Çıktının sonunda zorunlu bölüm

**"Kesinleştirilmiş Uygulama Politikaları"** — yalnızca şu kararların özeti:

- PDN prominence: dB tabanlı, varsayılan 3 dB
- TVS çözümü: lineerde analitik, doğrusal olmayanda sınırlandırılmış bisection
- TVS yakınsama: 1e−9 A residual veya 1e−6 bağıl değişim, en fazla 100 iterasyon
- Damping: tek skor yok, uygun bölge ve Pareto adayları
- CAN `t_fixed`: controller, TX, RX ve izolatör gecikmelerinin toplamı
- Monte Carlo: mulberry32, kullanıcı seed'i, varsayılan `0xA1B2C3D4`
- Via endüktansı ortak sembolü: `L_via,eq`
- Ana PDN hesabı: her zaman kompleks
- Droop toplamı: yalnızca muhafazakâr zaman alanı istisnası
- Repo yolu: `web/src/...`
- Araç klasöründe `report.test.js` zorunlu
- Yeni düzlem aracı: `plane-cavity-resonance`
- Mevcut `power-plane`, PDN Target Impedance ve Decoupling araçları korunacak

Son çıktı, başka bir geliştiricinin önceki konuşmayı görmeden doğrudan uygulamaya
başlayabileceği kadar açık ve kendi başına anlaşılır olmalıdır.

---

## 12. Talimatnamede boş kalan iki nokta — repo konvansiyonuyla çözüldü

Talimatname "eksik kararları tekrar kullanıcıya sorma" dediği için bu ikisi mevcut repo
kuralından türetildi ve REV2'de not olarak yazıldı:

1. **Türkçe slug.** Tablo tek "URL kimliği" veriyor (İngilizce). Repo iki slug ister:
   Türkçe kanonik `path` (`/arac/<tr-slug>`) + `slugEn` (`/en/tool/<en-slug>`).
   Türkçe slug'lar resmî Türkçe adlardan türetildi:

   | # | `path` (kanonik TR) | `slugEn` |
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

2. **Araç anahtarı biçimi.** Talimatname camelCase veriyor (`returnPathStitchingVia`),
   ama katalogdaki mevcut 32 aracın `id` alanı istisnasız kebab-case ve repo kuralı
   `toolKey === categories.js id` diyor. Bu yüzden **kod içinde kebab-case kullanılır**
   (değeri URL kimliğiyle aynı); camelCase ad yalnızca insan-okur referans ve klasör
   adının türediği biçim olarak durur. REV2 §1'de bu eşleme açıkça yazılı.
