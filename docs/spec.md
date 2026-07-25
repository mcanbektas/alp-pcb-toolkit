# ALP PCB Toolkit

##

---

# 1. Ürün Tanımı

ALP PCB Toolkit; PCB tasarımı sırasında ihtiyaç duyulan elektriksel, termal, elektromanyetik ve üretim hesaplarını çevrim içi olarak gerçekleştiren bir mühendislik araç setidir.

Uygulamanın amacı yalnızca sayısal sonuç üretmek değildir. Her sonuç ekranında şu bilgiler birlikte sunulmalıdır:

* Hesaplanan ana sonuç
* Kullanılan denklem veya çözüm yöntemi
* Giriş değerleri ve birimleri
* Ara hesaplamalar
* Sonucun geçerlilik sınırı
* Üretim toleransı etkisi
* Güvenlik marjı
* Standart veya kaynak bilgisi
* Yaklaşık sonuç uyarısı
* Kısa mühendislik yorumu

Uygulama, bir EDA yazılımının yerine geçmeyecek; PCB tasarımından önce veya tasarım sırasında kullanılacak bir **mühendislik karar destek aracı** olacaktır.

---

# 2. Ana Sayfa Kategori Kartları

Ana sayfada aşağıdaki yedi ana kategori kart şeklinde gösterilecektir.

| Kart                                 | İçerik                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| **1. PCB Akım, Güç ve Bakır**        | Yol genişliği, akım kapasitesi, direnç, gerilim düşümü, güç kaybı, bakır kalınlığı |
| **2. Via ve Padstack**               | Via direnci, akım kapasitesi, via sayısı, endüktans, annular ring, aspect ratio    |
| **3. Kontrollü Empedans**            | Microstrip, stripline, coplanar waveguide ve diferansiyel çift                     |
| **4. Sinyal Bütünlüğü**              | Yayılma gecikmesi, kritik hat uzunluğu, skew, crosstalk ve terminasyon             |
| **5. Güç Bütünlüğü ve Termal**       | PDN hedef empedansı, decoupling, junction sıcaklığı, soğutucu ve termal via        |
| **6. Komponent ve Devre Hesapları**  | Direnç renkleri, SMD kodları, bölücüler, LED, RLC ve kristal kondansatörleri       |
| **7. PCB Üretim, DFM ve Dönüşümler** | Clearance, creepage, BGA breakout, stack-up, thermal relief ve birim dönüşümleri   |

Kullanıcı kategori kartına tıkladığında ilgili hesap araçlarını görmelidir. Her araç bağımsız bir hesap ekranı olmalı; ancak ilişkili hesaplar aynı araç altında birleştirilmelidir.

---

# 3. Ortak Hesaplama Motoru Kuralları

## 3.1 İç hesaplama birimleri

Tüm hesaplamalar dahili olarak SI birimleriyle yapılmalıdır:

* Uzunluk: metre
* Alan: metrekare
* Akım: amper
* Gerilim: volt
* Direnç: ohm
* Kapasite: farad
* Endüktans: henry
* Frekans: hertz
* Güç: watt
* Sıcaklık: santigrat derece veya kelvin farkı
* Termal direnç: °C/W

Kullanıcı arayüzünde şu birimler desteklenebilir:

* mm
* µm
* mil
* inch
* oz/ft²
* mA
* A
* mΩ
* Ω
* pF
* nF
* µF
* nH
* µH
* MHz
* GHz

Ara değerlerde yuvarlama yapılmamalıdır. Yuvarlama yalnızca kullanıcıya sonuç gösterilirken uygulanmalıdır.

---

## 3.2 Ondalık ayracı

Aşağıdaki girişlerin ikisi de kabul edilmelidir:

* `0.25`
* `0,25`

Uygulama bunları aynı sayı olarak değerlendirmelidir.

Binlik ayırıcı otomatik yorumlanmamalıdır. Örneğin `1.000`, kullanıcının yerel ayarına göre belirsiz olabileceğinden doğrulanmalıdır.

---

## 3.3 Doğrudan ve ters hesaplama

Hesap araçlarının çoğu iki modda çalışmalıdır.

### Analiz modu

Kullanıcı fiziksel geometriyi girer, araç sonucu hesaplar.

Örnek:

* Hat genişliği girilir.
* Empedans hesaplanır.

### Sentez modu

Kullanıcı hedef sonucu girer, araç gerekli fiziksel geometriyi hesaplar.

Örnek:

* Hedef empedans 50 Ω girilir.
* Gerekli hat genişliği hesaplanır.

Ters hesaplarda analitik çözüm bulunmuyorsa aşağıdaki sayısal yöntemlerden biri kullanılmalıdır:

1. Brent yöntemi
2. Bisection yöntemi
3. Güvenli sınırlandırılmış kök arama

Newton–Raphson tek başına kullanılmamalıdır. Çünkü başlangıç noktasına bağlı olarak negatif yol genişliği, negatif aralık veya fiziksel olmayan sonuç üretebilir.

Genel kök problemi:

[
F(x)=Y_{\text{hesaplanan}}(x)-Y_{\text{hedef}}
]

Çözüm:

[
F(x)=0
]

Örneğin hedef empedans hesabında:

[
F(W)=Z_0(W)-Z_{\text{hedef}}
]

---

## 3.4 Tolerans hesabı

Her kritik araçta isteğe bağlı tolerans analizi bulunmalıdır.

Örnek parametreler:

* Hat genişliği toleransı
* Bakır kalınlığı toleransı
* Dielektrik kalınlığı toleransı
* Dielektrik sabiti toleransı
* Via kaplama kalınlığı toleransı
* Direnç toleransı

Üç sonuç gösterilmelidir:

* Minimum sonuç
* Nominal sonuç
* Maksimum sonuç

Basit worst-case yaklaşımında girişlerin tüm sınır kombinasyonları değerlendirilebilir.

Örneğin:

[
W \in [W_{\min},W_{\max}]
]

[
H \in [H_{\min},H_{\max}]
]

[
\varepsilon_r \in [\varepsilon_{r,\min},\varepsilon_{r,\max}]
]

Empedans için tüm kritik köşeler hesaplanarak:

[
Z_{\min}=\min(Z_1,Z_2,\ldots,Z_n)
]

[
Z_{\max}=\max(Z_1,Z_2,\ldots,Z_n)
]

bulunmalıdır.

İlerleyen sürümlerde Monte Carlo analizi eklenebilir.

---

# 4. PCB Akım, Güç ve Bakır

## 4.1 Trace Width and Current Capacity

Bu araç, aşağıdaki hesapları tek ekran içinde yapmalıdır:

* Verilen akım için minimum yol genişliği
* Verilen yol genişliği için maksimum sürekli akım
* Hat kesit alanı
* Hat direnci
* Gerilim düşümü
* Güç kaybı
* Akım yoğunluğu
* Ortalama ve maksimum hat sıcaklığı
* İç katman ve dış katman karşılaştırması

IPC-2152; bitmiş PCB üzerindeki iletken boyutunu, akım ihtiyacını ve kabul edilebilir sıcaklık artışını ilişkilendiren standarttır. Standart yalnızca basit bir güç kanunu değildir; bakır düzlemler, PCB malzemesi, kart kalınlığı, vias, termal iletkenlik ve çevresel şartlar gibi unsurları da ele alır.

---

## 4.1.1 Girdiler

Temel girdiler:

* Akım (I)
* Yol genişliği (W)
* Yol uzunluğu (L)
* Bakır kalınlığı (t)
* Ortam sıcaklığı (T_a)
* İzin verilen sıcaklık artışı (\Delta T)
* Dış katman veya iç katman
* Başlangıç veya bitmiş bakır kalınlığı
* Dikdörtgen veya trapez hat kesiti

Gelişmiş girdiler:

* Üst yüzey hat genişliği
* Alt yüzey hat genişliği
* Referans bakır düzlem bulunması
* Düzleme olan mesafe
* Kart kalınlığı
* PCB malzemesi
* Hava akışı
* Paralel hat sayısı
* Hat genişliği toleransı
* Bakır kalınlığı toleransı

---

## 4.1.2 Bakır ağırlığından kalınlık hesabı

Bakır yoğunluğu yaklaşık olarak:

[
\rho_m=8960\ \text{kg/m}^3
]

Bakır ağırlığı (m_A), birim alan başına kütledir.

Kalınlık:

[
t=\frac{m_A}{\rho_m}
]

Bir ons bakırın bir square foot alana yayılması durumunda:

[
m=28.3495\ \text{g}
]

[
A=1\ \text{ft}^2=0.092903\ \text{m}^2
]

Birim alan başına kütle:

[
m_A=\frac{0.0283495}{0.092903}
]

[
m_A\approx0.30515\ \text{kg/m}^2
]

Kalınlık:

[
t=\frac{0.30515}{8960}
]

[
t\approx34.06\ \mu\text{m}
]

Üretici ve endüstri nominal tablolarında 1 oz bakır çoğunlukla yaklaşık 34.8–35 µm olarak ifade edilir. Aradaki küçük fark; nominal folyo tanımları, yuvarlama ve üretim süreçlerinden kaynaklanabilir.

Araç varsayılan olarak şu nominal değerleri kullanabilir:

| Bakır ağırlığı | Nominal kalınlık |
| -------------- | ---------------- |
| 0.5 oz         | 17.5 µm          |
| 1 oz           | 35 µm            |
| 1.5 oz         | 52.5 µm          |
| 2 oz           | 70 µm            |
| 3 oz           | 105 µm           |
| 4 oz           | 140 µm           |

Kullanıcı mutlaka özel kalınlık girebilmelidir.

---

## 4.1.3 Yol kesit alanı

### Dikdörtgen kesit

[
A_{\text{Cu}}=W t
]

Burada:

* (W): hat genişliği
* (t): bitmiş bakır kalınlığı
* (A_{\text{Cu}}): bakır kesit alanı

### Trapez kesit

PCB aşındırma işlemi nedeniyle yolun üst genişliği ve alt genişliği farklı olabilir.

[
A_{\text{Cu}}=
t\frac{W_{\text{top}}+W_{\text{bottom}}}{2}
]

Bu model, özellikle dar RF hatlarında ve ince üretim geometrilerinde dikdörtgen modelden daha gerçekçidir.

Etch factor yüzdesi girilecekse:

[
W_{\text{top}}=W_{\text{bottom}}(1-E)
]

Burada (E), 0 ile 1 arasında aşındırma oranıdır.

Ancak üreticinin gerçek üst-alt genişlik verisi mevcutsa doğrudan bu değerler tercih edilmelidir.

---

## 4.1.4 IPC-2152 hesaplama motoru

IPC-2152 için tek bir evrensel kapalı formül kullanılmamalıdır.

Hesap motoru şu şekilde kurulmalıdır:

1. Standarttan alınmış lisanslı veri noktaları yüklenir.
2. Kullanıcının katman türüne uygun veri grubu seçilir.
3. Kesit alanı, akım ve sıcaklık artışı arasında interpolasyon yapılır.
4. Uygulanabilir düzlem, kart kalınlığı veya malzeme düzeltmesi varsa eklenir.
5. Hedef genişlik, sayısal kök çözümüyle bulunur.

Örnek veri yapısı:

```text
layerType
copperThickness
crossSectionArea
current
temperatureRise
planeConfiguration
boardThickness
material
```

Logaritmik interpolasyon tercih edilebilir.

İki nokta arasında:

[
x=\ln X
]

[
y=\ln Y
]

[
y(x)=y_1+
\frac{x-x_1}{x_2-x_1}
(y_2-y_1)
]

Sonuç:

[
Y=e^{y(x)}
]

Akım ve kesit alanı ilişkisi doğrusal olmadığı için logaritmik interpolasyon, düz lineer interpolasyondan daha uygun olabilir.

Daha fazla veri noktası varsa monoton PCHIP interpolasyonu kullanılabilir. Monoton interpolasyon, veri noktaları arasında yapay tepe veya çukurlar oluşmasını engeller.

### Ters genişlik çözümü

Hedef:

[
\Delta T_{\text{model}}(A,I)=\Delta T_{\text{hedef}}
]

Fonksiyon:

\Delta T_{\text{hedef}}
]

Brent veya bisection yöntemi ile:

[
F(A)=0
]

çözülür.

Daha sonra:

[
W=\frac{A}{t}
]

bulunur.

### Veri aralığı dışı durum

Varsayılan olarak extrapolation yapılmamalıdır.

Kullanıcı veri aralığının dışına çıktığında:

> Seçilen geometri IPC-2152 veri aralığının dışındadır. Sonuç standart tabanlı olarak doğrulanamaz.

uyarısı gösterilmelidir.

---

## 4.1.5 Legacy IPC-2221 yaklaşımı

Karşılaştırma ve eski araçlarla uyumluluk için aşağıdaki yaygın ampirik denklem opsiyonel olarak eklenebilir:

[
I=k(\Delta T)^{0.44}A^{0.725}
]

Burada:

* (I): amper
* (\Delta T): °C
* (A): mil² cinsinden kesit alanı
* (k): katman katsayısı

Yaygın kullanılan katsayılar:

[
k_{\text{external}}=0.048
]

[
k_{\text{internal}}=0.024
]

Kesit alanını çözmek için:

[
A=
\left[
\frac{I}
{k(\Delta T)^{0.44}}
\right]^{1/0.725}
]

Yol genişliği:

[
W_{\text{mil}}=
\frac{A_{\text{mil}^2}}
{t_{\text{mil}}}
]

Bu sonuç mutlaka şu şekilde etiketlenmelidir:

> Legacy ampirik yaklaşım. IPC-2152 veri tabanlı hesapla eşdeğer değildir.

Bu formülün sonucu, modern IPC-2152 sonucu olarak sunulmamalıdır.

---

## 4.1.6 Bakır özdirenci ve sıcaklık düzeltmesi

20 °C'de bakır özdirenci:

[
\rho_{20}=1.724\times10^{-8}\ \Omega\cdot\text{m}
]

Basit sıcaklık modeli:

[
\rho_T=
\rho_{20}
\left[
1+\alpha(T-20)
\right]
]

Bakır sıcaklık katsayısı:

[
\alpha\approx0.00393/^\circ\text{C}
]

Hat direnci:

[
R_T=\rho_T\frac{L}{A_{\text{Cu}}}
]

Uygulama üç direnç değeri gösterebilir:

### 20 °C direnci

[
R_{20}=\rho_{20}\frac{L}{A_{\text{Cu}}}
]

### Ortalama sıcaklıktaki direnç

Yaklaşık ortalama sıcaklık:

[
T_{\text{avg}}=T_a+\frac{\Delta T}{2}
]

[
R_{\text{avg}}=
R_{20}
\left[
1+\alpha(T_{\text{avg}}-20)
\right]
]

### Maksimum sıcaklıktaki direnç

[
T_{\max}=T_a+\Delta T
]

[
R_{\max}=
R_{20}
\left[
1+\alpha(T_{\max}-20)
\right]
]

Normal çalışma kayıplarında (R_{\text{avg}}), worst-case gerilim düşümünde ise (R_{\max}) kullanılabilir.

---

## 4.1.7 Gerilim düşümü

[
V_{\text{drop}}=IR
]

Besleme gerilimi de girilmişse yüzdesel düşüm:

[
V_{\text{drop,%}}=
100\frac{V_{\text{drop}}}{V_{\text{supply}}}
]

Yükte kalan gerilim:

[
V_{\text{load}}=
V_{\text{supply}}-V_{\text{drop}}
]

---

## 4.1.8 Güç kaybı

[
P_{\text{loss}}=I^2R
]

Alternatif olarak:

[
P_{\text{loss}}=
IV_{\text{drop}}
]

Birim uzunluk başına kayıp:

[
P'=\frac{P_{\text{loss}}}{L}
]

Sonuçlar şu birimlerle gösterilebilir:

* mW
* W
* mW/mm
* W/m

---

## 4.1.9 Akım yoğunluğu

[
J=\frac{I}{A_{\text{Cu}}}
]

Sonuç:

* A/mm²
* A/m²
* A/mil²

olarak gösterilebilir.

Akım yoğunluğu tek başına "güvenli" veya "güvensiz" olarak sınıflandırılmamalıdır. Çünkü sıcaklık; PCB yapısı, çevre, düzlemler ve ısı yayılımından da etkilenir.

---

## 4.1.10 Sonuç ekranı

Sonuç ekranında:

* Minimum hesaplanan yol genişliği
* Önerilen üretim yol genişliği
* Gerçek yolun akım kapasitesi
* Kesit alanı
* 20 °C direnci
* Ortalama sıcaklık direnci
* Gerilim düşümü
* Güç kaybı
* Akım yoğunluğu
* Maksimum tahmini sıcaklık
* Kullanılan hesap yöntemi
* Standart revizyonu
* Veri aralığı uyarısı

gösterilmelidir.

Önerilen üretim genişliği:

[
W_{\text{recommended}}=
W_{\text{required}}(1+M)
]

Burada (M), kullanıcı tarafından seçilen güvenlik marjıdır.

Örneğin yüzde 20 marj için:

[
M=0.20
]

---

## 4.2 Power Plane and Parallel Trace

Bu bölüm ayrı bir hesap motoru yerine aynı elektriksel direnç motorunu kullanabilir.

### Güç düzlemi direnci

Düzlemde akımın yaklaşık olarak düzgün bir genişlik üzerinden aktığı kabul edilirse:

[
R=\rho_T\frac{L}{Wt}
]

Ancak geniş bir bakır poligonunda akım dağılımı her zaman düzgün değildir. Dar boyun bölgeleri, pad girişleri ve via kümeleri akımı yoğunlaştırabilir.

Bu nedenle kullanıcı şu değerleri girmelidir:

* Akım yolu uzunluğu
* Minimum boyun genişliği
* Ortalama düzlem genişliği
* Bakır kalınlığı

Araç hem minimum boyun hem ortalama geometri için direnç göstermelidir.

---

### Paralel yollar

Her yolun direnci:

[
R_i=\rho\frac{L_i}{A_i}
]

Paralel eşdeğer:

\sum_{i=1}^{n}\frac{1}{R_i}
]

\left(
\sum_{i=1}^{n}\frac{1}{R_i}
\right)^{-1}
]

Toplam akımın yollara dağılımı:

[
I_i=
I_{\text{total}}
\frac{1/R_i}
{\sum_{j=1}^{n}1/R_j}
]

Eşit geometri ve eşit uzunlukta:

[
I_i=\frac{I_{\text{total}}}{n}
]

Ancak termal olarak birbirine çok yakın paralel yolların akım kapasitesi, birbirinden bağımsız (n) yolun tam toplamı gibi değerlendirilmemelidir. Isıl etkileşim nedeniyle IPC tabanlı kapasite ayrıca değerlendirilmelidir.

---

## 4.3 Copper Thickness Converter

Desteklenecek dönüşümler:

[
t_{\mu m}\approx35\times\text{oz}
]

[
t_{\text{mm}}=
\frac{t_{\mu m}}{1000}
]

[
t_{\text{mil}}=
\frac{t_{\text{mm}}}{0.0254}
]

[
t_{\mu m}=25.4t_{\text{mil}}
]

Kullanıcı hem nominal hem bitmiş kalınlık saklayabilmelidir.

---

# 5. Via ve Padstack

## 5.1 Via Properties and Current Capacity

Bu araçta şu sonuçlar birlikte gösterilmelidir:

* Via barrel kesit alanı
* DC direnci
* Akım yoğunluğu
* Gerilim düşümü
* Güç kaybı
* Gerekli paralel via sayısı
* Annular ring
* Aspect ratio
* Yaklaşık via endüktansı
* Yaklaşık via kapasitesi
* Termal iletim direnci

Via parazitiklerinin yüksek hızlı devrelerde endüktans ve kapasite şeklinde davranabileceği, gerçek sonucun dönüş yolu ve antipad geometrisine güçlü biçimde bağlı olduğu üretici uygulama notlarında da vurgulanmaktadır.

---

## 5.1.1 Via geometrisi

Tanımlar:

* (D_f): bitmiş delik çapı
* (t_p): kaplama kalınlığı
* (D_o): barrel dış çapı
* (H): via uzunluğu veya PCB kalınlığı
* (D_{\text{pad}}): pad çapı
* (D_{\text{antipad}}): antipad çapı

Barrel dış çapı:

[
D_o=D_f+2t_p
]

---

## 5.1.2 Barrel kesit alanı

Tam halka alanı:

\frac{\pi}{4}
\left(
D_o^2-D_f^2
\right)
]

Yerine koyarsak:

\frac{\pi}{4}
\left[
(D_f+2t_p)^2-D_f^2
\right]
]

İnce kaplama yaklaşımı:

[
A_{\text{barrel}}
\approx
\pi D_f t_p
]

İnce yaklaşım yalnızca:

[
t_p\ll D_f
]

olduğunda kullanılmalıdır.

---

## 5.1.3 Via direnci

[
R_{\text{via}}=
\rho_T
\frac{H}
{A_{\text{barrel}}}
]

Sıcaklık düzeltmesi:

[
\rho_T=
\rho_{20}
[1+\alpha(T-20)]
]

---

## 5.1.4 Via gerilim düşümü

[
V_{\text{via}}=
I_{\text{via}}R_{\text{via}}
]

---

## 5.1.5 Via güç kaybı

[
P_{\text{via}}=
I_{\text{via}}^2R_{\text{via}}
]

---

## 5.1.6 Paralel via sayısı

Akım kapasitesine göre:

[
N_I=
\left\lceil
\frac{I_{\text{total}}}
{I_{\text{single,max}}}
\right\rceil
]

Gerilim düşümü sınırına göre:

Paralel (N) via için:

[
R_{\text{parallel}}=
\frac{R_{\text{via}}}{N}
]

[
V_{\text{drop}}=
I_{\text{total}}
\frac{R_{\text{via}}}{N}
]

Buradan:

[
N_V\ge
\frac{I_{\text{total}}R_{\text{via}}}
{V_{\text{drop,max}}}
]

[
N_V=
\left\lceil
\frac{I_{\text{total}}R_{\text{via}}}
{V_{\text{drop,max}}}
\right\rceil
]

Gerekli via sayısı:

\max(N_I,N_V,N_{\text{user-min}})
]

Via akım kapasitesi IPC-2152 veri tabanlı bir modele dayanacaksa, trace hesaplayıcısında olduğu gibi veri-interpolasyon yöntemi kullanılmalıdır. Barrel kesitini sıradan yatay bir hat gibi değerlendirmek yalnızca yaklaşık sonuç verir.

---

## 5.1.7 Via akım yoğunluğu

[
J_{\text{via}}=
\frac{I_{\text{via}}}
{A_{\text{barrel}}}
]

Paralel via durumunda:

[
I_{\text{via}}=
\frac{I_{\text{total}}}{N}
]

yalnızca via dirençleri ve bağlantıları eşitse geçerlidir.

---

## 5.1.8 Annular ring

Nominal annular ring:

[
A_R=
\frac{D_{\text{pad}}-D_{\text{hole}}}{2}
]

Üretim toleransı dahil minimum ring:

## \frac{D_{\text{pad}}-D_{\text{drill}}}{2}

## T_{\text{position}}

T_{\text{etch}}
]

Burada:

* (T_{\text{position}}): delik konum toleransı
* (T_{\text{etch}}): pad aşındırma toleransı

Araç nominal ve worst-case ring değerlerini ayrı göstermelidir.

---

## 5.1.9 Via aspect ratio

[
AR=
\frac{H_{\text{board}}}
{D_{\text{hole}}}
]

Bazı üreticiler bitmiş delik çapını, bazıları matkap çapını kullanabilir. Araç iki seçeneği de desteklemeli ve kullanılan tanımı göstermelidir.

Üretilebilirlik sınırı sabit şekilde kodlanmamalıdır. Kullanıcı veya üretici profili üzerinden maksimum aspect ratio seçilmelidir.

---

## 5.1.10 Via endüktansı

Basit tek-via yaklaşımı:

[
L_{\text{via}}[\text{nH}]
\approx
0.2H_{\text{mm}}
\left[
\ln\left(
\frac{4H_{\text{mm}}}
{D_{\text{mm}}}
\right)+1
\right]
]

Bu denklem izole bir via gövdesi için yaklaşık sonuç verir.

Gerçek sinyal via endüktansı şunlardan etkilenir:

* Dönüş via mesafesi
* Referans düzlemler
* Antipad
* Pad çapı
* Via çifti
* Via stub
* Katman geçiş uzunluğu

Bu nedenle sonuç:

> Yaklaşık tek iletken self-endüktansı

olarak etiketlenmelidir.

Asıl önemli değer çoğu zaman tek via endüktansı değil, sinyal ve dönüş yolunun oluşturduğu **loop endüktansıdır**.

---

## 5.1.11 Via kapasitesi

Bir padin iki referans düzlem arasındaki yaklaşık kapasitesi için düşük mertebeli form:

[
C_{\text{via}}[\text{pF}]
\approx
0.0555
\varepsilon_r
\frac{
H_{\text{mm}}D_{\text{pad,mm}}
}{
D_{\text{antipad,mm}}-D_{\text{pad,mm}}
}
]

Bu denklem yalnızca basit dairesel pad-antipad yapısı için yaklaşık sonuç verir.

Şu durumlarda kullanılmamalıdır:

* Birden fazla farklı antipad
* Bölünmüş referans düzlemi
* Blind veya buried via
* Via-in-pad ve bakır dolgulu via
* Çok yüksek frekans
* Yakın komşu via alanları

---

## 5.2 Thermal Via Array

Termal via hesaplayıcısında amaç, via barrel üzerinden katmanlar arasında gerçekleşen iletimi tahmin etmektir.

Bakırın termal iletkenliği yaklaşık:

[
k_{\text{Cu}}\approx385\text{–}400\ \text{W/(m·K)}
]

Barrel üzerinden termal direnç:

\frac{H}
{k_{\text{Cu}}A_{\text{barrel}}}
]

(N) aynı via paralel ise ideal yaklaşım:

\frac{R_{\theta,\text{via}}}{N}
]

Vialar farklıysa:

\sum_{i=1}^{N}
\frac{1}{R_{\theta,i}}
]

Bakır dolgulu via varsa:

A_{\text{barrel}}+A_{\text{fill}}
]

[
A_{\text{fill}}=
\frac{\pi D_f^2}{4}
]

Ancak pratikte toplam termal direnç yalnızca via barrel direnci değildir:

R_{\theta,\text{top-spreading}}
+
R_{\theta,\text{vias}}
+
R_{\theta,\text{bottom-spreading}}
+
R_{\theta,\text{ambient}}
]

Bu nedenle araç kesin junction sıcaklığı yerine:

* Via barrel termal direnci
* İdeal paralel via direnci
* Via sayıları arası göreceli iyileşme
* Tahmini iletilen ısı

göstermelidir.

İletilen güç:

[
Q=
\frac{\Delta T}
{R_{\theta}}
]

---

# 6. Kontrollü Empedans

## 6.1 Temel tasarım kararı

Kontrollü empedans aracında iki hesap yöntemi bulunmalıdır.

### Hızlı denklem modu

* Hammerstad–Jensen
* Wheeler veya Wadell tabanlı yardımcı denklemler
* Basit geometri
* Hızlı sonuç

### Alan çözücü modu

* İki boyutlu elektrostatik çözüm
* Gerçek bakır kalınlığı
* Trapez kesit
* Solder mask
* Birden fazla dielektrik
* Asimetrik yapı
* Coplanar ground
* Diferansiyel çift

Üretim için önerilen ana sonuç alan çözücüden gelmelidir.

Hammerstad ve Jensen'in modeli tek ve bağlı microstrip hatların empedansı, efektif dielektrik sabiti ve bazı kayıp etkileri için geliştirilmiştir. Modelin temel denklemleri hem orijinal IEEE çalışmasında hem de Qucs teknik uygulamasında tanımlanmıştır.

---

## 6.2 İki boyutlu elektrostatik alan çözücü

Alan çözücü aşağıdaki diferansiyel denklemi çözmelidir:

[
\nabla\cdot
\left(
\varepsilon\nabla V
\right)=0
]

Burada:

* (V): elektriksel potansiyel
* (\varepsilon): bölgesel dielektrik geçirgenlik

Elektrik alan:

[
\mathbf E=-\nabla V
]

Birim uzunluk başına elektrik alan enerjisi:

[
U'=
\frac{1}{2}
\int_A
\varepsilon|\mathbf E|^2dA
]

Kapasite:

[
C'=
\frac{2U'}{V^2}
]

Aynı geometri, tüm dielektrikler hava veya vakum kabul edilerek tekrar çözülür:

[
C'_0
]

Efektif dielektrik sabiti:

\frac{C'}{C'_0}
]

Yayılma hızı:

[
v_p=
\frac{c}
{\sqrt{\varepsilon_{\text{eff}}}}
]

Karakteristik empedans:

[
Z_0=
\frac{1}{v_pC'}
]

Aynı denklemin alternatif biçimi:

[
Z_0=
\frac{1}
{c\sqrt{C'C'_0}}
]

Bu yöntem microstrip, stripline, asymmetric stripline, embedded microstrip ve grounded coplanar waveguide gibi yapıların aynı motorla çözülmesini sağlar.

---

## 6.3 Mesh ve yakınsama

Alan çözücü aşağıdaki alanlarda daha ince mesh kullanmalıdır:

* Hat köşeleri
* Hat ile referans düzlem arasındaki dar alanlar
* Coplanar boşluklar
* Diferansiyel çift aralığı
* Solder mask sınırları
* Trapez bakır köşeleri

Sonuç, iki farklı mesh yoğunluğunda karşılaştırılmalıdır.

Yakınsama farkı:

[
E_Z=
100
\frac{
|Z_{0,\text{fine}}-Z_{0,\text{coarse}}|
}{
Z_{0,\text{fine}}
}
]

Örneğin:

* (E_Z<0.2%): yüksek yakınsama
* (0.2%\le E_Z<1%): kabul edilebilir
* (E_Z\ge1%): mesh yetersiz

Bu sınırlar kullanıcı tarafından değiştirilebilir.

---

## 6.4 Surface Microstrip – Hammerstad–Jensen

Tanımlar:

[
u=\frac{W}{H}
]

[
\eta_0\approx376.7303\ \Omega
]

Efektif dielektrik yardımcı katsayıları:

[
a(u)=
1+
\frac{1}{49}
\ln
\left[
\frac{
u^4+(u/52)^2
}{
u^4+0.432
}
\right]
+
\frac{1}{18.7}
\ln
\left[
1+\left(\frac{u}{18.1}\right)^3
\right]
]

[
b(\varepsilon_r)=
0.564
\left(
\frac{\varepsilon_r-0.9}
{\varepsilon_r+3}
\right)^{0.053}
]

Efektif dielektrik sabiti:

[
\varepsilon_{\text{eff}}=
\frac{\varepsilon_r+1}{2}
+
\frac{\varepsilon_r-1}{2}
\left(
1+\frac{10}{u}
\right)^{-a(u)b(\varepsilon_r)}
]

Empedans yardımcı fonksiyonu:

[
f_u=
6+
(2\pi-6)
\exp
\left[
-\left(
\frac{30.666}{u}
\right)^{0.7528}
\right]
]

Havadaki eşdeğer empedans:

[
Z_{\text{air}}=
\frac{\eta_0}{2\pi}
\ln
\left[
\frac{f_u}{u}
+
\sqrt{
1+
\left(
\frac{2}{u}
\right)^2
}
\right]
]

Microstrip empedansı:

[
Z_0=
\frac{Z_{\text{air}}}
{\sqrt{\varepsilon_{\text{eff}}}}
]

Bu formül sıfır kalınlıklı iletken için temel sonuçtur.

---

## 6.5 Microstrip bakır kalınlığı düzeltmesi

Normalize bakır kalınlığı:

[
\tau=\frac{t}{H}
]

Homojen ortam genişlik düzeltmesi:

[
\Delta u_1=
\frac{\tau}{\pi}
\ln
\left[
1+
\frac{
4e
}{
\tau
\coth^2
\left(
\sqrt{6.517u}
\right)
}
\right]
]

Karışık dielektrik ortam düzeltmesi:

[
\Delta u_r=
\frac{\Delta u_1}{2}
\left[
1+
\operatorname{sech}
\left(
\sqrt{\varepsilon_r-1}
\right)
\right]
]

Burada:

[
\operatorname{sech}(x)=\frac{1}{\cosh(x)}
]

Düzeltilmiş normalize genişlikler:

[
u_1=u+\Delta u_1
]

[
u_r=u+\Delta u_r
]

Düzeltilmiş empedans:

[
Z_0=
\frac{
Z_{\text{air}}(u_r)
}{
\sqrt{
\varepsilon_{\text{eff}}(u_r)
}
}
]

Düzeltilmiş efektif dielektrik sabiti:

\varepsilon_{\text{eff}}(u_r)
\left[
\frac{
Z_{\text{air}}(u_1)
}{
Z_{\text{air}}(u_r)
}
\right]^2
]

Trapez kesit, solder mask ve çoklu dielektrik durumlarında alan çözücü tercih edilmelidir.

---

## 6.6 Stripline

Stripline homojen bir dielektrik içinde bulunduğu için temel olarak:

[
\varepsilon_{\text{eff}}\approx\varepsilon_r
]

Yayılma hızı:

[
v_p=
\frac{c}{\sqrt{\varepsilon_r}}
]

Karakteristik empedans, hat genişliği, bakır kalınlığı ve iki referans düzlem arasındaki mesafeye bağlıdır.

Symmetric ve asymmetric stripline için tek basit denklem yerine alan çözücü kullanılmalıdır. Çünkü özellikle asimetrik yapıda:

* Üst düzlem mesafesi
* Alt düzlem mesafesi
* Bakır kalınlığı
* Farklı prepreg ve core dielektrikleri

sonucu belirgin biçimde değiştirir.

Analiz ekranında şu değerler ayrı girilmelidir:

* (H_1): üst düzleme mesafe
* (H_2): alt düzleme mesafe
* (W): hat genişliği
* (t): bakır kalınlığı
* (\varepsilon_{r1})
* (\varepsilon_{r2})

---

## 6.7 Coplanar Waveguide

İdeal, sonsuz kalınlıklı substrat ve sıfır bakır kalınlığı için:

[
k=
\frac{W}
{W+2S}
]

[
k'=\sqrt{1-k^2}
]

Burada:

* (W): orta hat genişliği
* (S): hat ile coplanar ground arası boşluk

Tam eliptik integral:

[
K(k)=
\int_0^{\pi/2}
\frac{d\theta}
{\sqrt{1-k^2\sin^2\theta}}
]

İdeal CPW empedansı:

[
Z_0=
\frac{30\pi}
{\sqrt{\varepsilon_{\text{eff}}}}
\frac{K(k')}{K(k)}
]

Kalın substrat için ilk yaklaşım:

[
\varepsilon_{\text{eff}}
\approx
\frac{\varepsilon_r+1}{2}
]

Ancak grounded coplanar waveguide için:

* Alt referans düzlemi
* Substrat kalınlığı
* Coplanar ground genişliği
* Stitching via yapısı
* Bakır kalınlığı

etkili olduğundan alan çözücü kullanılmalıdır.

İdeal CPW denklemi, grounded CPW sonucu olarak sunulmamalıdır.

---

## 6.8 Diferansiyel çift

Diferansiyel hesaplamada aşağıdaki yapılar bulunmalıdır:

* Edge-coupled microstrip
* Edge-coupled stripline
* Asymmetric differential stripline
* Coplanar differential pair

Temel girdiler:

* Hat genişliği (W)
* Hatlar arası edge-to-edge boşluk (S)
* Bakır kalınlığı (t)
* Referans düzlem mesafesi (H)
* Dielektrik sabiti
* Hedef diferansiyel empedans

---

## 6.8.1 Kapasitans matrisi

İki iletken için Maxwell kapasite matrisi:

\begin{bmatrix}
C_{11}&C_{12}\
C_{21}&C_{22}
\end{bmatrix}
\begin{bmatrix}
V_1\
V_2
\end{bmatrix}
]

Simetrik çift için:

[
C_{11}=C_{22}
]

[
C_{12}=C_{21}
]

Odd-mode kapasite:

[
C_{\text{odd}}=
C_{11}-C_{12}
]

Even-mode kapasite:

[
C_{\text{even}}=
C_{11}+C_{12}
]

Aynı hesap dielektrikler vakuma çevrilerek tekrarlanır:

[
C_{0,\text{odd}}
]

[
C_{0,\text{even}}
]

Odd-mode empedans:

[
Z_{\text{odd}}=
\frac{1}
{c\sqrt{
C_{\text{odd}}C_{0,\text{odd}}
}}
]

Even-mode empedans:

[
Z_{\text{even}}=
\frac{1}
{c\sqrt{
C_{\text{even}}C_{0,\text{even}}
}}
]

Diferansiyel empedans:

[
Z_{\text{diff}}=
2Z_{\text{odd}}
]

Çiftin common-mode empedansı:

[
Z_{\text{common}}=
\frac{Z_{\text{even}}}{2}
]

---

## 6.8.2 Hedef diferansiyel empedans çözümü

### Hat genişliğini çözme

[
F(W)=Z_{\text{diff}}(W,S)-Z_{\text{target}}
]

### Hat aralığını çözme

[
F(S)=Z_{\text{diff}}(W,S)-Z_{\text{target}}
]

Tek değişken çözümünde Brent yöntemi kullanılabilir.

Hem (W) hem (S) bilinmiyorsa tek bir hedef empedans sonsuz sayıda çözüm üretir. Bu nedenle kullanıcı aşağıdakilerden birini sabitlemelidir:

* Minimum üretim aralığı
* Tercih edilen yol genişliği
* Maksimum çift genişliği
* W/S oranı

---

## 6.8.3 Protokol presetleri

Protokol presetleri yalnızca form alanlarını otomatik doldurmalıdır.

Her profil şunları saklamalıdır:

* Profil adı
* Hedef empedans
* Tolerans
* Tek uçlu veya diferansiyel
* Kaynak doküman revizyonu
* Profil notu

Preset sonucu "protokole uygundur" şeklinde kesin ifade kullanılmamalıdır. Kullanıcı ilgili komponent ve protokol dokümanını doğrulamalıdır.

---

# 7. Sinyal Bütünlüğü

## 7.1 Propagation Delay

Birim uzunluk başına yayılma gecikmesi:

[
t'*{pd}=*
*\frac{\sqrt{\varepsilon*{\text{eff}}}}{c}
]

Toplam gecikme:

[
t_{pd}=
L\frac{\sqrt{\varepsilon_{\text{eff}}}}{c}
]

Pratik olarak:

[
t'*{pd}*
*\approx*
*3.33564*
*\sqrt{\varepsilon*{\text{eff}}}
\quad
\text{ps/mm}
]

Stripline için:

[
\varepsilon_{\text{eff}}\approx\varepsilon_r
]

Microstrip için kontrollü empedans aracından hesaplanan (\varepsilon_{\text{eff}}) kullanılmalıdır.

---

## 7.2 Wavelength and Electrical Length

Havadaki dalga boyu:

[
\lambda_0=\frac{c}{f}
]

PCB üzerindeki dalga boyu:

[
\lambda_g=
\frac{c}
{f\sqrt{\varepsilon_{\text{eff}}}}
]

Çeyrek dalga:

[
L_{\lambda/4}=
\frac{\lambda_g}{4}
]

Yarım dalga:

[
L_{\lambda/2}=
\frac{\lambda_g}{2}
]

Elektriksel uzunluk, derece:

360^\circ
\frac{L}{\lambda_g}
]

Radyan:

2\pi
\frac{L}{\lambda_g}
]

---

## 7.3 Rise-Time Bandwidth

Birinci dereceden eşdeğer sistem için yaklaşık bant genişliği:

[
f_{\text{BW}}\approx
\frac{0.35}{t_r}
]

Daha geniş spektral içerik tahmini için kullanıcı katsayı seçebilir:

[
f_{\text{edge}}=
\frac{K}{t_r}
]

[
K\in[0.35,0.5]
]

Bu değer veri hızı değildir. Sinyal bütünlüğü açısından önemli olan çoğunlukla clock frekansından ziyade sürücünün yükselme ve düşme süresidir.

---

## 7.4 Critical Trace Length

Hat üzerindeki tek yönlü gecikme:

[
t_d=
L\frac{\sqrt{\varepsilon_{\text{eff}}}}{c}
]

Konservatif (1/6) yükselme süresi kriteri:

[
t_d\ge\frac{t_r}{6}
]

Kritik uzunluk:

\frac{
ct_r
}{
6\sqrt{\varepsilon_{\text{eff}}}
}
]

Hat bundan uzunsa transmission line etkileri değerlendirilmelidir.

Bu kriter mutlak fiziksel sınır değildir; tasarım eşiğidir. Uygulamada 1/6, 1/4 ve 1/2 gibi farklı kriterler kullanılmaktadır. Araç kriter seçimini göstermelidir. Bir uygulama dokümanında da hat gecikmesinin yükselme süresinin yaklaşık altıda birine ulaşması transmission line değerlendirmesi için eşik olarak kullanılmaktadır.

Saturn, maksimum hat uzunluğu için IPC-2251 ve frekans alanı yöntemlerini kullanmaktadır; ancak IPC'nin güncel revizyon tablosunda IPC-2251 artık aktif olarak sürdürülmeyen bir doküman olarak listelenmektedir. Bu nedenle araçta IPC-2251 sonucu varsa "legacy guide" şeklinde gösterilmelidir.

---

## 7.5 Differential Skew and Length Matching

Aynı geometrili iki hat için gecikme farkı:

[
\Delta t=
|\Delta L|
\frac{\sqrt{\varepsilon_{\text{eff}}}}{c}
]

Uzunluk farkı:

[
\Delta L=
|L_P-L_N|
]

Skew:

\frac{
|L_P-L_N|
\sqrt{\varepsilon_{\text{eff}}}
}{
c
}
]

İzin verilen skew biliniyorsa maksimum uzunluk farkı:

\frac{
ct_{\text{skew,max}}
}{
\sqrt{\varepsilon_{\text{eff}}}
}
]

Eklenmesi gereken hat uzunluğu:

|L_P-L_N|
]

Hatların farklı katman veya farklı empedans yapısında olması durumunda:

\frac{L_N\sqrt{\varepsilon_{\text{eff},N}}}{c}
\right|
]

Bu durumda yalnızca fiziksel uzunluk eşitlemek yeterli olmayabilir.

---

## 7.6 Crosstalk Estimator

3W kuralı yalnızca görsel bir tasarım kontrolü olarak kullanılmalıdır. Gerçek crosstalk hesabı için çok iletkenli transmission line modeli gereklidir.

Gerilim ve akım denklemleri:

## -\mathbf R\mathbf I

\mathbf L
\frac{\partial\mathbf I}{\partial t}
]

## -\mathbf G\mathbf V

\mathbf C
\frac{\partial\mathbf V}{\partial t}
]

Frekans alanında:

*

(\mathbf R+j\omega\mathbf L)
\mathbf I
]

*

(\mathbf G+j\omega\mathbf C)
\mathbf V
]

Tanımlar:

[
\mathbf Z=
\mathbf R+j\omega\mathbf L
]

[
\mathbf Y=
\mathbf G+j\omega\mathbf C
]

Durum denklemi:

*

\begin{bmatrix}
0&\mathbf Z\
\mathbf Y&0
\end{bmatrix}
\begin{bmatrix}
\mathbf V\
\mathbf I
\end{bmatrix}
]

Uzunluk (\ell) boyunca çözüm:

e^{-\mathbf M\ell}
\mathbf X(0)
]

Burada:

[
\mathbf M=
\begin{bmatrix}
0&\mathbf Z\
\mathbf Y&0
\end{bmatrix}
]

Kapasitans matrisi iki boyutlu alan çözücüden elde edilir.

Vakum kapasite matrisinden endüktans matrisi:

[
\mathbf L=
\mu_0\varepsilon_0
\mathbf C_0^{-1}
]

Homojen dielektrik için yaklaşık iletkenlik matrisi:

[
\mathbf G
\approx
\omega\tan\delta\ \mathbf C
]

Araç, aggressor giriş sinyalini FFT ile frekans alanına dönüştürmeli, her frekansta çok iletkenli hattı çözmeli ve IFFT ile zaman alanında NEXT ve FEXT sonuçlarını üretmelidir.

Girdiler:

* Hat genişliği
* Hat aralığı
* Paralel uzunluk
* Katman geometrisi
* Dielektrik sabiti
* Loss tangent
* Yükselme süresi
* Aggressor gerilimi
* Kaynak empedansı
* Yük empedansı
* Victim terminasyonu

Çıktılar:

* Near-end crosstalk tepe gerilimi
* Far-end crosstalk tepe gerilimi
* Aggressor gerilimine oran
* Crosstalk yüzdesi
* Hat aralığı duyarlılık grafiği
* 3W kuralı durumu

3W kontrolü:

[
S\ge3W
]

sağlanıyorsa "3W geometrik kuralı sağlandı" denebilir. Ancak "crosstalk yoktur" denmemelidir.

---

## 7.7 Termination Calculator

### Seri terminasyon

Z_0-R_{\text{driver}}
]

Sonucun negatif olması durumunda seri terminasyon önerilmemelidir.

### Paralel terminasyon

[
R_T=Z_0
]

DC güç kaybı:

[
P_T=
\frac{V^2}{R_T}
]

Duty cycle (D) için ortalama:

D\frac{V^2}{R_T}
]

### Thevenin terminasyon

İstenen eşdeğer:

Z_0
]

Bias gerilimi:

V_{CC}
\frac{
R_{\text{bottom}}
}{
R_{\text{top}}+R_{\text{bottom}}
}
]

[
a=
\frac{V_{\text{bias}}}{V_{CC}}
]

Çözüm:

# \frac{Z_0}{a}

Z_0
\frac{V_{CC}}{V_{\text{bias}}}
]

# \frac{Z_0}{1-a}

Z_0
\frac{V_{CC}}
{V_{CC}-V_{\text{bias}}}
]

Araç, en yakın E24 veya E96 çiftini bulmalı ve gerçek bias ile gerçek paralel direnci tekrar hesaplamalıdır.

---

# 8. Güç Bütünlüğü ve Termal

## 8.1 PDN Target Impedance

İzin verilen gerilim değişimi:

[
\Delta V_{\text{allowed}}
]

Ani yük değişimi:

[
\Delta I_{\text{step}}
]

Hedef empedans:

\frac{
\Delta V_{\text{allowed}}
}{
\Delta I_{\text{step}}
}
]

Gerilim toleransı yüzde olarak verilmişse:

V_{\text{rail}}
\frac{T_{%}}{100}
]

Böylece:

\frac{
V_{\text{rail}}T_{%}/100
}{
\Delta I_{\text{step}}
}
]

Bu yalnızca sabit yatay target impedance yaklaşımıdır. Gelişmiş tasarımda frekansa bağlı hedef profil kullanılabilir.

TI ve Intel'in PDN metodolojileri; VRM, PCB düzlemleri, kapasitörler, loop endüktansı ve hedef empedansın birlikte değerlendirilmesini önermektedir.

---

## 8.2 Decoupling Capacitor Estimator

Kondansatörden çekilen yük:

[
\Delta Q=
\Delta I\Delta t
]

Kapasitör bağıntısı:

[
\Delta Q=C\Delta V
]

Minimum ideal kapasite:

\frac{
\Delta I\Delta t
}{
\Delta V
}
]

Bu formül ESR ve ESL etkisini içermez.

---

## 8.2.1 Gerçek kapasitör empedansı

Bir kapasitörün seri RLC modeli:

ESR+
j\omega ESL+
\frac{1}{j\omega C}
]

Açık biçimi:

ESR+
j
\left(
\omega ESL-
\frac{1}{\omega C}
\right)
]

Büyüklük:

[
|Z_C|=
\sqrt{
ESR^2+
\left(
\omega ESL-
\frac{1}{\omega C}
\right)^2
}
]

Self-resonant frequency:

\frac{1}
{2\pi\sqrt{ESL\cdot C}}
]

SRF'de ideal olarak endüktif ve kapasitif reaktans birbirini götürür:

[
|Z_C|\approx ESR
]

---

## 8.2.2 Paralel kapasitör ağı

Her kapasitörün empedansı:

[
Z_i(\omega)
]

Toplam:

\left[
\sum_{i=1}^{N}
\frac{1}{Z_i(\omega)}
\right]^{-1}
]

Bu yaklaşım anti-rezonans tepelerini doğal olarak gösterir.

Aynı nominal değerde (N) ideal kapasitör:

[
C_{\text{eq}}=NC
]

Bağımsız ve eşit bağlantı yolları için yaklaşık:

[
ESR_{\text{eq}}=
\frac{ESR}{N}
]

[
ESL_{\text{eq}}=
\frac{ESL}{N}
]

Ancak ortak via veya ortak dar bağlantı bulunuyorsa ESL tam olarak (1/N) azalmaz.

---

## 8.2.3 Plane capacitance

İki bakır düzlem arasındaki kapasite:

\varepsilon_0\varepsilon_r
\frac{A}{d}
]

Burada:

* (A): örtüşen düzlem alanı
* (d): dielektrik kalınlığı

Düzlem kapasitansı yaklaşık olarak düşük ESL'ye sahiptir; ancak kenar saçılması bu basit denklemde bulunmaz.

---

## 8.2.4 Toplam PDN empedansı

Basit model:

\left[
\frac{1}{Z_{\text{VRM}}}
+
\frac{1}{Z_{\text{caps}}}
+
j\omega C_{\text{plane}}
\right]^{-1}
]

Kapasitör bağlantı loop endüktansı ayrı eklenmelidir:

ESL_{\text{component}}
+
L_{\text{mount}}
+
L_{\text{via}}
+
L_{\text{plane-spread}}
]

Araç, PDN eğrisini hedef empedans çizgisiyle aynı grafikte göstermelidir.

---

## 8.3 Junction Temperature

Basit junction-to-ambient modeli:

[
T_J=
T_A+
P\theta_{JA}
]

Burada:

* (T_J): junction sıcaklığı
* (T_A): ortam sıcaklığı
* (P): komponent güç kaybı
* (\theta_{JA}): junction-to-ambient termal direnç

Maksimum izin verilen güç:

\frac{
T_{J,\max}-T_A
}{
\theta_{JA}
}
]

Ancak (\theta_{JA}), paketin değişmez fiziksel özelliği değildir. Test PCB'si, bakır alanı, hava akışı ve montaj şartlarından etkilenir. TI'nin termal tasarım dokümanları termal yolu elektriksel direnç ağına benzetmekte ve junction sıcaklık hesaplarında kullanılan termal metriklerin sınırlarını açıklamaktadır.

---

## 8.4 Heatsink Calculator

Junction'dan soğutucu üzerinden ortama termal yol:

[
T_J=
T_A+
P
(
\theta_{JC}
+
\theta_{CS}
+
\theta_{SA}
)
]

Burada:

* (\theta_{JC}): junction-to-case
* (\theta_{CS}): case-to-sink, termal arayüz malzemesi
* (\theta_{SA}): sink-to-ambient

Gerekli maksimum heatsink direnci:

## \theta_{JC}

\theta_{CS}
]

Sonuç negatifse yalnızca seçilen soğutucu yeterli olmayacaktır. Güç azaltılmalı, hava akışı artırılmalı veya farklı paket seçilmelidir.

---

## 8.5 Ölçülen üst yüzey sıcaklığından junction tahmini

Paket üst sıcaklığı ölçülmüşse (\theta_{JC}) doğrudan kullanılmamalıdır. Uygun üretici metriği mevcutsa:

[
T_J
\approx
T_{\text{top}}
+
\Psi_{JT}P
]

PCB yakınında ölçüm varsa:

[
T_J
\approx
T_{\text{board}}
+
\Psi_{JB}P
]

Araç, (\theta) ve (\Psi) değerlerinin aynı olmadığını açıklamalıdır.

---

## 8.6 PCB Copper Thermal Estimator

Bakır şerit boyunca termal iletim:

\frac{L}
{k_{\text{Cu}}Wt}
]

FR-4 üzerinden dikey termal iletim:

\frac{H}
{k_{\text{FR4}}A}
]

Paralel ısı yolları:

\sum_i
\frac{1}{R_{\theta,i}}
]

Toplam sıcaklık artışı:

[
\Delta T=
PR_{\theta,\text{eq}}
]

Bu hesap sadece iletim yolunu modeller. Aşağıdaki etkiler bulunmaz:

* Konveksiyon
* Radyasyon
* Karmaşık ısı yayılımı
* Komponent iç paket yapısı
* Yakındaki sıcak komponentler
* Bakır poligonun iki boyutlu spreading etkisi

Bu nedenle sonuç "ilk derece termal ağ tahmini" olarak sunulmalıdır.

---

# 9. Komponent ve Devre Hesapları

## 9.1 Resistor Color Code

### Renk-rakam tablosu

| Renk       | Rakam | Çarpan    |
| ---------- | ----- | --------- |
| Siyah      | 0     | (10^0)    |
| Kahverengi | 1     | (10^1)    |
| Kırmızı    | 2     | (10^2)    |
| Turuncu    | 3     | (10^3)    |
| Sarı       | 4     | (10^4)    |
| Yeşil      | 5     | (10^5)    |
| Mavi       | 6     | (10^6)    |
| Mor        | 7     | (10^7)    |
| Gri        | 8     | (10^8)    |
| Beyaz      | 9     | (10^9)    |
| Altın      | —     | (10^{-1}) |
| Gümüş      | —     | (10^{-2}) |

Vishay'ın komponent işaretleme dokümanında dört, beş ve altı bantlı dirençler için rakam, çarpan, tolerans ve sıcaklık katsayısı düzenleri tanımlanmaktadır.

---

### Dört bant direnç

[
R=
(10D_1+D_2)10^M
]

Bantlar:

1. İlk rakam
2. İkinci rakam
3. Çarpan
4. Tolerans

---

### Beş bant direnç

[
R=
(100D_1+10D_2+D_3)10^M
]

---

### Altı bant direnç

İlk beş bant, beş bantlı dirençle aynıdır.

Altıncı bant sıcaklık katsayısıdır:

[
R(T)=
R_{25}
[
1+TCR\times10^{-6}(T-25)
]
]

---

### Tolerans sınırları

[
R_{\min}=
R_{\text{nom}}
\left(
1-\frac{Tol}{100}
\right)
]

[
R_{\max}=
R_{\text{nom}}
\left(
1+\frac{Tol}{100}
\right)
]

Araç hem renkten değere hem değerden renge çalışmalıdır.

---

## 9.2 SMD Resistor Decoder

### Üç haneli kod

[
R=
(10D_1+D_2)10^{D_3}
]

Örnek:

[
472=47\times10^2=4700\ \Omega
]

### Dört haneli kod

[
R=
(100D_1+10D_2+D_3)10^{D_4}
]

### R işareti

`4R7`:

[
R=4.7\ \Omega
]

`R22`:

[
R=0.22\ \Omega
]

### Sıfır ohm

* `0`
* `00`
* `000`
* `0000`

sıfır ohm jumper olarak tanınmalıdır.

### EIA-96

[
R=
E96[\text{code}]
\times
M[\text{letter}]
]

İki rakam, E96 tablosundaki temel değeri seçer. Harf, çarpanı belirler.

Yaygın çarpan seti:

| Harf | Çarpan  |
| ---- | ------- |
| Z    | 0.001   |
| Y    | 0.01    |
| X    | 0.1     |
| A    | 1       |
| B    | 10      |
| C    | 100     |
| D    | 1 000   |
| E    | 10 000  |
| F    | 100 000 |

Bazı üreticiler alternatif harf aliasları kullanabilir. Bu nedenle araçta "standart profil" ve "üretici profili" ayrımı bulunmalıdır.

---

## 9.3 Capacitor Code Decoder

Üç haneli seramik kod için sonuç pF cinsindedir:

(10D_1+D_2)10^{D_3}
]

Örnek:

[
104=
10\times10^4\ \text{pF}
]

[
104=100000\ \text{pF}=100\ \text{nF}
]

Dönüşüm:

[
C_{\text{nF}}=
\frac{C_{\text{pF}}}{1000}
]

[
C_{\mu\text{F}}=
\frac{C_{\text{pF}}}{10^6}
]

Yaygın tolerans harfleri:

| Harf | Tolerans |
| ---- | -------- |
| J    | ±5%      |
| K    | ±10%     |
| M    | ±20%     |

Tantal ve polimer kondansatör işaretleri üreticiye göre değişebileceğinden, kesin olmayan kodlar "üretici bağımlı" olarak gösterilmelidir.

---

## 9.4 Ohm's Law and Power

Temel denklemler:

[
V=IR
]

[
I=\frac{V}{R}
]

[
R=\frac{V}{I}
]

[
P=VI
]

[
P=I^2R
]

[
P=\frac{V^2}{R}
]

Kullanıcı herhangi iki bağımsız değeri girdiğinde diğerleri hesaplanmalıdır.

Geçersiz kombinasyonlar kontrol edilmelidir. Örneğin kullanıcı hem (V), hem (I), hem (R) girerse:

[
E=
\frac{|V-IR|}{|V|}
]

tutarsızlık oranı gösterilebilir.

---

## 9.5 Series and Parallel Components

### Seri direnç

[
R_{\text{eq}}=
\sum_iR_i
]

### Paralel direnç

\left(
\sum_i\frac{1}{R_i}
\right)^{-1}
]

İki direnç için:

\frac{R_1R_2}{R_1+R_2}
]

### Paralel kondansatör

[
C_{\text{eq}}=
\sum_iC_i
]

### Seri kondansatör

\left(
\sum_i\frac{1}{C_i}
\right)^{-1}
]

### Seri endüktör

Karşılıklı kuplaj yoksa:

[
L_{\text{eq}}=
\sum_iL_i
]

### Paralel endüktör

Kuplaj yoksa:

\left(
\sum_i\frac{1}{L_i}
\right)^{-1}
]

---

## 9.6 E-Series Value Finder

İdeal geometrik E serisi:

[
R_n=
10^{n/N}
]

Burada:

* (N=12): E12
* (N=24): E24
* (N=48): E48
* (N=96): E96

[
n=0,1,\ldots,N-1
]

Gerçek standart değerler yuvarlatılmış preferred-number tablolarıdır. Bu nedenle uygulamada formülden anlık üretmek yerine doğrulanmış E-serisi dizileri saklanmalıdır.

Hedefe göre hata:

[
E_{%}=
100
\frac{
R_{\text{selected}}-R_{\text{target}}
}{
R_{\text{target}}
}
]

---

## 9.7 Voltage Divider

Temel bölücü:

V_{\text{in}}
\frac{R_2}{R_1+R_2}
]

Bölücü akımı:

\frac{V_{\text{in}}}{R_1+R_2}
]

Güçler:

[
P_1=
I_{\text{divider}}^2R_1
]

[
P_2=
I_{\text{divider}}^2R_2
]

---

### Yüklü gerilim bölücü

R_2\parallel R_L
]

\frac{R_2R_L}{R_2+R_L}
]

V_{\text{in}}
\frac{
R_{2,\text{eff}}
}{
R_1+R_{2,\text{eff}}
}
]

---

### Hedef gerilime göre oran

[
k=
\frac{V_{\text{out}}}{V_{\text{in}}}
]

\frac{1-k}{k}
]

Bir (R_2) değeri seçilirse:

[
R_1=
R_2
\frac{V_{\text{in}}-V_{\text{out}}}
{V_{\text{out}}}
]

Araç E12, E24 ve E96 serilerindeki çiftleri taramalıdır.

Her çift için skor:

[
Score=
w_V|E_V|
+
w_I|E_I|
+
w_P|E_P|
]

En düşük skorlu uygun çiftler gösterilebilir.

---

## 9.8 LED Series Resistor

Seri bağlanan (N) LED için:

[
V_{LED,\text{total}}=
\sum_{i=1}^{N}V_{F,i}
]

Direnç:

[
R=
\frac{
V_S-V_{LED,\text{total}}
}{
I_{LED}
}
]

Direnç gücü:

[
P_R=
I_{LED}^2R
]

Alternatif:

[
P_R=
(V_S-V_{LED,\text{total}})I_{LED}
]

Güvenli güç seçimi:

[
P_{\text{rated}}
\ge
\frac{P_R}{D}
]

Burada (D), 0 ile 1 arasındaki derating oranıdır.

Örneğin komponent yalnızca nominal gücünün yüzde 50'sinde çalıştırılacaksa:

[
D=0.5
]

Paralel LED'lerde tek ortak direnç varsayılan olarak önerilmemelidir. Her paralel kola ayrı direnç önerilmelidir.

---

## 9.9 Reactance and RLC

Kapasitif reaktans:

[
X_C=
\frac{1}{2\pi fC}
]

Endüktif reaktans:

[
X_L=
2\pi fL
]

Seri RLC empedansı:

[
Z=
R+j
\left(
\omega L-\frac{1}{\omega C}
\right)
]

Büyüklük:

[
|Z|=
\sqrt{
R^2+
\left(
\omega L-\frac{1}{\omega C}
\right)^2
}
]

Faz:

[
\phi=
\tan^{-1}
\left[
\frac{
\omega L-\frac{1}{\omega C}
}{R}
\right]
]

Rezonans:

[
f_0=
\frac{1}{2\pi\sqrt{LC}}
]

Seri RLC kalite faktörü:

[
Q=
\frac{\omega_0L}{R}
]

Aynı değer:

[
Q=
\frac{1}{\omega_0CR}
]

Bant genişliği:

[
BW=
\frac{f_0}{Q}
]

---

## 9.10 RC and RL Time Constant

RC zaman sabiti:

[
\tau=RC
]

Kapasitör şarjı:

[
V_C(t)=
V_S
\left(
1-e^{-t/RC}
\right)
]

Deşarj:

[
V_C(t)=
V_0e^{-t/RC}
]

RL zaman sabiti:

[
\tau=
\frac{L}{R}
]

Akım yükselmesi:

[
I(t)=
\frac{V}{R}
\left(
1-e^{-tR/L}
\right)
]

---

## 9.11 Crystal Load Capacitor

Genel kristal yük kapasitesi:

[
C_L=
\frac{
(C_{IN}+C_1)(C_{OUT}+C_2)
}{
C_{IN}+C_1+C_{OUT}+C_2
}
+
C_{\text{stray}}
]

Basitleştirilmiş modelde:

[
C_1=C_2=C
]

ve giriş kapasiteleri ihmal edilirse:

[
C_L=
\frac{C}{2}
+
C_{\text{stray}}
]

Buradan:

[
C=
2
(
C_L-C_{\text{stray}}
)
]

MCU pin kapasiteleri dahil edilecekse genel denklem kullanılmalıdır. Microchip dokümanlarında da giriş kapasiteleri, harici kapasitörler ve PCB parazitik kapasitesinin birlikte değerlendirilmesi önerilmektedir.

---

# 10. PCB Üretim, DFM ve Dönüşümler

## 10.1 Clearance and Creepage

Bu araç bir denklem hesaplayıcısı olarak değil, **standart tabanlı karar motoru** olarak geliştirilmelidir.

### Clearance

Hava üzerinden en kısa mesafedir.

Girdiler:

* RMS çalışma gerilimi
* Tepe gerilimi
* Rated impulse voltage
* Rakım
* İzolasyon tipi
* Pollution degree
* Ürün standardı
* Kaplanmış veya kaplanmamış yüzey

### Creepage

Yalıtkan yüzey boyunca en kısa mesafedir.

Ek girdiler:

* CTI
* Malzeme grubu
* Pollution degree
* Yüzey kaplaması
* Çalışma gerilimi

IPC-2221C, genel PCB tasarım standardının güncel C revizyonudur. Elektriksel güvenlik ve insulation coordination için IEC 60664-1'in güncel konsolide sürümü 2020 temel baskısı ile 2025 değişikliğini içermektedir. IEC dokümanı 2.000 metreye kadar uygulama ve daha yüksek rakımlar için düzeltme yaklaşımı tanımlar.

Güvenli hesap mimarisi:

\max
(
S_{\text{standard}},
S_{\text{fab}},
S_{\text{user}}
)
]

Burada:

* (S_{\text{standard}}): seçilen standardın tablosundan gelen değer
* (S_{\text{fab}}): üreticinin minimum üretim mesafesi
* (S_{\text{user}}): kullanıcı tarafından belirlenen şirket kuralı

Standart tablolar lisanssız şekilde kopyalanmamalıdır. Uygulama ya lisanslı veri kullanmalı ya da kullanıcı tarafından sağlanan standart profilini içe aktarmalıdır.

"IPC uyumlu" veya "IEC uyumlu" ifadesi yalnızca doğru revizyonun lisanslı karar tabloları kullanılıyorsa gösterilmelidir.

---

## 10.2 Padstack

### Finished hole ve drill çapı

Basit yaklaşım:

D_{\text{finished}}
+
2t_{\text{plating}}
+
A_{\text{process}}
]

Burada (A_{\text{process}}), üretici proses payıdır.

Bu değer üreticiye göre değişeceği için sabit alınmamalıdır.

### Pad çapı

D_{\text{drill}}
+
2A_R
]

### Antipad çapı

D_{\text{pad}}
+
2C_{\text{plane}}
]

Burada (C_{\text{plane}}), pad ile plane arasında istenen radial clearance değeridir.

---

## 10.3 BGA Breakout

Tanımlar:

* (P): BGA pitch
* (D_L): land çapı
* (W): trace genişliği
* (C): trace-to-land clearance

İki pad arasındaki boş alan:

[
G=P-D_L
]

Tek yol geçişi için maksimum yol genişliği:

P-D_L-2C
]

(n) adet yol geçirilecekse:

[
nW+(n+1)C\le G
]

Buradan:

[
n(W+C)\le G-C
]

\left\lfloor
\frac{
G-C
}{
W+C
}
\right\rfloor
]

Diyagonal padler arası merkez mesafesi:

[
P_{\text{diag}}=
P\sqrt{2}
]

Diyagonal boşluk:

P\sqrt{2}-D_L
]

Diyagonal maksimum yol:

## P\sqrt{2}

## D_L

2C
]

Bu yalnızca geometrik açıklık hesabıdır. Solder mask web, drill toleransı ve dog-bone via padleri ayrıca kontrol edilmelidir.

---

## 10.4 PCB Stack-Up Planner

Toplam kart kalınlığı:

\sum H_{\text{core}}
+
\sum H_{\text{prepreg}}
+
\sum t_{\text{copper}}
+
\sum t_{\text{coating}}
]

Üretici toplam kalınlığı bakır dahil veya hariç tanımlayabilir. Araç kullanıcıya bu seçimi göstermelidir.

Empedans hesabındaki dielektrik yüksekliği, kartın toplam kalınlığı değildir.

Microstrip için (H):

> Sinyal bakırının referans yüzeyi ile referans düzleminin uygun elektriksel yüzeyi arasındaki dielektrik mesafedir.

Stripline için üst ve alt mesafeler ayrı tutulmalıdır:

[
H_1
]

[
H_2
]

Stack-up ekranındaki değerler kontrollü empedans aracına doğrudan aktarılmalıdır.

---

## 10.5 Thermal Relief

Her spoke için:

* Uzunluk (L_s)
* Genişlik (W_s)
* Bakır kalınlığı (t)

Bir spoke direnci:

[
R_s=
\rho
\frac{L_s}{W_st}
]

(N) aynı spoke paralel:

\frac{R_s}{N}
]

\rho
\frac{L_s}
{NW_st}
]

Gerilim düşümü:

IR_{\text{relief}}
]

Güç:

[
P=
I^2R_{\text{relief}}
]

Termal iletim direnci:

\frac{L_s}
{k_{\text{Cu}}NW_st}
]

Elektriksel açıdan spoke genişliği artırıldıkça direnç azalır; lehimleme açısından pad ile plane arasındaki termal izolasyon azalır.

Araç şu iki sonucu birlikte göstermelidir:

* Elektriksel bağlantı yeterliliği
* Lehimlenebilirlik açısından termal bağlantı seviyesi

Akım kapasitesi yalnızca toplam spoke kesitini tek bir geniş yol kabul ederek verilmemelidir. Her spoke üzerindeki akım dağılımı ve geometrik yoğunlaşma dikkate alınmalıdır.

---

# 11. Dönüşüm Araçları

## 11.1 Uzunluk

[
1\ \text{inch}=25.4\ \text{mm}
]

[
1\ \text{mil}=0.001\ \text{inch}
]

[
1\ \text{mil}=0.0254\ \text{mm}
]

[
1\ \text{mm}=39.3701\ \text{mil}
]

[
1\ \mu\text{m}=0.001\ \text{mm}
]

---

## 11.2 AWG

AWG çapı:

0.005
\times
92^{(36-AWG)/39}
]

Milimetre:

0.127
\times
92^{(36-AWG)/39}
]

Kesit alanı:

[
A=
\frac{\pi d^2}{4}
]

Bu yalnızca çıplak iletken çapıdır. İzolasyon dış çapı ayrıca veri tabanından alınmalıdır.

---

## 11.3 Frekans ve periyot

[
f=\frac{1}{T}
]

[
T=\frac{1}{f}
]

---

## 11.4 dB ve kazanç

Güç oranı:

10\log_{10}
\left(
\frac{P_2}{P_1}
\right)
]

Gerilim oranı, empedanslar eşitse:

20\log_{10}
\left(
\frac{V_2}{V_1}
\right)
]

Ters dönüşüm:

10^{G_{\text{dB}}/10}
]

10^{G_{\text{dB}}/20}
]

dBm:

10\log_{10}
(P_{\text{mW}})
]

10^{P_{\text{dBm}}/10}
]

10^{(P_{\text{dBm}}-30)/10}
]

---

## 11.5 Sıcaklık

[
T_F=
\frac{9}{5}T_C+32
]

[
T_C=
\frac{5}{9}(T_F-32)
]

[
T_K=T_C+273.15
]

---

## 11.6 Kompleks sayı

Dikdörtgensel:

[
Z=R+jX
]

Büyüklük:

[
|Z|=\sqrt{R^2+X^2}
]

Faz:

[
\phi=\tan^{-1}\left(\frac{X}{R}\right)
]

Polar biçim:

[
Z=|Z|\angle\phi
]

Dikdörtgensel dönüş:

[
R=|Z|\cos\phi
]

[
X=|Z|\sin\phi
]

---

# 12. Araçların Ortak Ekran Özellikleri

Her hesap ekranı şu düzende olmalıdır:

## Sol panel — Girdiler

* Geometri çizimi
* Parametre alanları
* Birim seçiciler
* Malzeme seçimi
* Standart veya yöntem seçimi
* Tolerans alanları
* Güvenlik marjı
* Analiz veya sentez modu

## Orta panel — Ana sonuç

* Büyük ana sonuç
* Nominal değer
* Minimum ve maksimum değer
* Durum göstergesi
* Üretim için önerilen değer
* Kısa mühendislik yorumu

## Sağ veya alt panel — Teknik detay

* Kullanılan formül
* Ara değerler
* Kullanılan standart
* Geçerlilik aralığı
* Yaklaşım ve varsayımlar
* Uyarılar
* Parametrik grafik

---

# 13. Doğrulama İçin Referans Testleri

Yazılım geliştirilirken aşağıdaki testler sabit unit test olarak kullanılabilir.

## Test 1 — Microstrip

Girdiler:

[
W=0.4\ \text{mm}
]

[
H=0.2\ \text{mm}
]

[
\varepsilon_r=4.2
]

Bakır kalınlığı ihmal edildiğinde Hammerstad–Jensen sonucu yaklaşık:

[
Z_0\approx49.7\ \Omega
]

[
\varepsilon_{\text{eff}}\approx3.21
]

Yayılma gecikmesi:

3.33564\sqrt{3.21}
]

[
t'_{pd}\approx5.98\ \text{ps/mm}
]

---

## Test 2 — Via direnci

Girdiler:

[
D_f=0.30\ \text{mm}
]

[
t_p=0.025\ \text{mm}
]

[
H=1.60\ \text{mm}
]

Dış çap:

[
D_o=0.35\ \text{mm}
]

Barrel kesit alanı:

\frac{\pi}{4}
(0.35^2-0.30^2)
]

[
A_{\text{barrel}}
\approx0.0255\ \text{mm}^2
]

20 °C via direnci yaklaşık:

[
R_{\text{via}}\approx1.08\ \text{m}\Omega
]

Bu değer pad ve plane spreading direncini içermez.

---

## Test 3 — PDN hedef empedansı

[
V_{\text{rail}}=1.0\ \text{V}
]

[
T=3%
]

[
\Delta I=5\ \text{A}
]

[
\Delta V=1.0\times0.03=0.03\ \text{V}
]

\frac{0.03}{5}
]

[
Z_{\text{target}}=6\ \text{m}\Omega
]

---

## Test 4 — Junction sıcaklığı

[
T_A=40^\circ\text{C}
]

[
P=2\ \text{W}
]

[
\theta_{JA}=30^\circ\text{C/W}
]

[
T_J=
40+2\times30
]

[
T_J=100^\circ\text{C}
]

---

## Test 5 — Direnç kodu

Kod:

[
472
]

[
R=
47\times10^2
]

[
R=4700\ \Omega
]

[
R=4.7\ \text{k}\Omega
]

---

## Test 6 — Yüklü gerilim bölücü

[
V_{\text{in}}=12\ \text{V}
]

[
R_1=27\ \text{k}\Omega
]

[
R_2=10\ \text{k}\Omega
]

Yüksüz:

12\frac{10}{27+10}
]

[
V_{\text{out}}
\approx3.243\ \text{V}
]

Yük:

[
R_L=100\ \text{k}\Omega
]

10\parallel100
]

[
R_{2,\text{eff}}
\approx9.091\ \text{k}\Omega
]

12
\frac{9.091}{27+9.091}
]

[
V_{\text{out,loaded}}
\approx3.023\ \text{V}
]

Bu test loaded divider hesabının doğru çalıştığını kontrol eder.

---

# 14. İlk Sürümde Yer Almayacak Araçlar

İlk sürümü gereksiz yere büyütmemek için aşağıdaki araçlar başlangıçta eklenmemelidir:

* Smith Chart
* Anten tasarım hesapları
* RF Pi ve T matching network
* Planar PCB indüktör tasarımı
* Full-wave üç boyutlu EM çözüm
* Via stub rezonans simülasyonu
* Via step-response simülasyonu
* MOSFET switching loss tasarım aracı
* Buck ve boost dönüştürücü tasarımı
* Aktif filtre sentezi
* EMI filtre sentezi
* Panelizasyon
* Mouse-bite hesapları
* Otomatik IPC footprint generator
* CFD veya detaylı termal simülasyon
* Otomatik PCB dosyası analizi

Bunlar daha sonra "Advanced Tools" bölümü olarak eklenebilir.

---

# 15. İlk Sürümde Bulunacak Ana Hesap Ekranları

Toplam yaklaşık 21 ana hesap ekranı yeterlidir:

1. Trace Width and Current Capacity
2. Trace Resistance, Voltage Drop and Power Loss
3. Power Plane and Parallel Trace
4. Copper Thickness Converter
5. Via Properties
6. Thermal Via Array
7. Single-Ended Impedance
8. Differential Pair Impedance
9. Propagation Delay and Wavelength
10. Critical Trace Length
11. Differential Skew and Length Matching
12. Crosstalk Estimator
13. Termination Calculator
14. PDN Target Impedance
15. Decoupling Network
16. Junction Temperature and Heatsink
17. Resistor and SMD Code Decoder
18. Voltage Divider and Standard Value Finder
19. LED, Ohm's Law and RLC Tools
20. Clearance, Creepage and Padstack
21. BGA, Stack-Up and Thermal Relief

Bu yapı, yüzlerce dağınık mini hesap yerine birbirine bağlı yaklaşık 21 güçlü mühendislik ekranı oluşturur.

---

# 16. En Kritik Teknik Uyarılar

1. **IPC-2152 tek formül değildir.** Lisanslı veri veya doğrulanmış deneysel veri olmadan "IPC-2152 uyumlu" sonucu verilmemelidir.

2. **Toplam PCB kalınlığı hat kesit alanına eklenmez.** Elektriksel kesit yalnızca bakır geometrisidir. PCB kalınlığı termal davranışı ve empedans geometrisini etkileyebilir.

3. **Empedans sonucu üreticiyle doğrulanmalıdır.** Gerçek Dk, prepreg preslenmiş kalınlığı, etch compensation ve bakır pürüzlülüğü sonucu değiştirebilir.

4. **Diferansiyel empedans iki tek uçlu empedansın basit toplamı değildir.**

[
Z_{\text{diff}}=2Z_{\text{odd}}
]

kullanılmalıdır.

5. **Decoupling değeri işlemci clock frekansından tek başına seçilmez.** Ani akım, izin verilen ripple, ESR, ESL ve bağlantı endüktansı değerlendirilmelidir.

6. **Creepage ve clearance aynı şey değildir.** Güvenlik hesabında ürün standardı, pollution degree, CTI, impulse voltage ve rakım gerekir.

7. **Via akımı yalnızca barrel DC direnciyle belirlenemez.** Termal yapı ve bağlı bakır katmanlar sonucu önemli ölçüde etkiler.

8. **Termal via direnci, sistemin toplam termal direnci değildir.** Bakır spreading ve ortam termal direnci ayrıca bulunur.

9. **3W kuralı crosstalk hesabı değildir.** Yalnızca geometrik bir tasarım kontrolüdür.

10. **Kapalı formül empedans hesapları saha çözücü değildir.** Üretim toleransları ve karmaşık geometri için iki boyutlu veya üç boyutlu alan çözümü gerekir.
