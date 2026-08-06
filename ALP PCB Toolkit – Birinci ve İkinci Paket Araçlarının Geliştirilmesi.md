# **ALP PCB Toolkit – Birinci ve İkinci Paket Araçlarının Geliştirilmesi**

Sen; sinyal bütünlüğü, güç bütünlüğü, güç elektroniği, haberleşme fiziksel katmanları, EMC, analog ölçüm devreleri ve PCB üretimi konularında deneyimli bir elektronik mühendisi ve aynı zamanda kıdemli React geliştiricisisin.

Görevin, mevcut **ALP PCB Toolkit** projesine aşağıdaki 12 mühendislik aracını eklemektir:

## **Birinci Paket**

1. Return Path ve Stitching Via Planlayıcı  
2. Via Stub ve Backdrill Hesaplayıcı  
3. MOSFET Gate Driver ve Gate Direnci Hesaplayıcı  
4. ADC Giriş Yerleşme Süresi ve RC Filtre Aracı  
5. CAN ve RS-485 Fiziksel Katman Hesaplayıcı  
6. Shunt Direnci ve Kelvin Bağlantı Hesaplayıcı

## **İkinci Paket**

7. PDN Rezonans ve Antirezonans Analizörü  
8. Power Plane Rezonans ve Düzlem Kapasitansı  
9. EMC LC / π Filtre Tasarım Aracı  
10. Buck Dönüştürücü PCB Ön Tasarım Aracı  
11. TVS ve ESD Koruma Boyutlandırıcısı  
12. Flex PCB Hesaplayıcı

Bu araçlar basit birer hesap makinesi olmayacaktır. Her araç kullanıcıya:

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

birlikte sunmalıdır.

Araçlar bir EDA, SPICE, 2D/3D elektromanyetik çözücü veya sertifikasyon laboratuvarının yerine geçiyormuş gibi sunulmamalıdır. Sonuçlar açık biçimde “ön tasarım”, “yaklaşık mühendislik tahmini”, “kapalı form yaklaşımı” veya “üretici doğrulaması gerekli” şeklinde etiketlenmelidir.

---

# **1\. Mevcut Proje Mimarisine Uyum**

Öncelikle repoyu ve özellikle aşağıdaki dosyaları incele:

* `README.md`  
* `CLAUDE.md`  
* `docs/spec.md`  
* `src/data/categories.js`  
* `src/App.jsx`  
* `src/lib/`  
* `src/pages/tools/VoltageDivider/`  
* `src/pages/tools/Decoupling/`  
* `src/pages/tools/Termination/`  
* `src/pages/tools/ViaProperties/`  
* `src/pages/tools/StackUpPlanner/`

Mevcut mimariyi değiştirme. Yeni araçları mevcut yapıya ekle.

Bağımlılık yönü şu şekilde kalmalıdır:

`pages → components → hooks → lib`

Her araç için şu yapı kullanılmalıdır:

src/pages/tools/\<ToolName\>/  
├── model.js  
├── text.js  
├── schematic.jsx  
├── index.jsx  
└── report.js

Hesap fonksiyonları gerektiğinde ayrıca:

src/lib/\<calculationEngine\>.js

altına eklenmelidir.

## **Mimari kurallar**

* `src/lib/` içindeki hesap fonksiyonları saf olmalıdır.  
* React, DOM, localStorage, grafik bileşeni veya kullanıcıya gösterilen metin hesap motoruna girmemelidir.  
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
* Tüm SVG metinleri `text` prop’undan gelmelidir.  
* Inline CSS veya araca özel renk sabitlemesi yapılmamalıdır.  
* Mevcut tema değişkenleri kullanılmalıdır.  
* Yeni araçlar `lazy()` ile yüklenmelidir.  
* `categories.js`, `App.jsx`, araç anahtarı, rota, rapor anahtarı ve proje kayıt anahtarı birbirleriyle birebir uyumlu olmalıdır.

---

# **2\. Ortak Fiziksel Sabitler**

Tek bir ortak sabit dosyası kullan veya mevcut sabit dosyasını genişlet:

\[  
c=299,792,458\\ \\text{m/s}  
\]

\[  
\\varepsilon\_0=8.8541878128\\times10^{-12}\\ \\text{F/m}  
\]

\[  
\\mu\_0=4\\pi\\times10^{-7}\\ \\text{H/m}  
\]

\[  
k\_B=1.380649\\times10^{-23}\\ \\text{J/K}  
\]

20 °C’de bakır özdirenci:

\[  
\\rho\_{\\text{Cu},20}=1.724\\times10^{-8}\\ \\Omega\\cdot\\text{m}  
\]

Bakır sıcaklık katsayısı:

\[  
\\alpha\_{\\text{Cu}}\\approx0.00393/^\\circ\\text{C}  
\]

Frekans:

\[  
\\omega=2\\pi f  
\]

Kompleks empedans hesaplarının tamamı gerçek ve sanal bileşenlerle yapılmalıdır. Yalnızca empedans büyüklüklerini toplayarak paralel kondansatör veya PDN hesabı yapılmamalıdır.

Kompleks sayı için mevcut motor varsa yeniden kullanılmalıdır. Yoksa şu temel işlemleri destekleyen saf bir yardımcı motor oluştur:

* Toplama  
* Çıkarma  
* Çarpma  
* Bölme  
* Ters alma  
* Büyüklük  
* Faz  
* Paralel empedans  
* Seri empedans

---

# **3\. Ortak Sonuç Sınıflandırması**

Sonuçlar doğrudan “güvenli” veya “güvensiz” olarak verilmemelidir. Şu sınıflandırma kullanılabilir:

* Uygun  
* Marjinal  
* Dikkat gerekli  
* Model sınırı dışında  
* Veri eksik  
* Üretici doğrulaması gerekli  
* Simülasyon gerekli  
* Ölçüm gerekli

Standart veya üretici tablosu kullanılmıyorsa sonuç standart tabanlıymış gibi gösterilmemelidir.

Kullanıcıya sunulan her kural şu tiplerden biriyle etiketlenmelidir:

* Fiziksel bağıntı  
* Kapalı form yaklaşık model  
* Birinci mertebe eşdeğer devre  
* Mühendislik sezgisi  
* Muhafazakâr tasarım kuralı  
* Üretici önerisi  
* Kullanıcı tarafından tanımlanan sınır

---

# **BİRİNCİ PAKET**

# **4\. Return Path ve Stitching Via Planlayıcı**

## **4.1 Amaç**

Bu araç, yüksek hızlı bir sinyalin:

* Katman değiştirmesi  
* Referans düzlemi değiştirmesi  
* Bölünmüş düzlem üzerinden geçmesi  
* Kart kenarına yaklaşması  
* Konnektöre veya kabloya bağlanması

durumlarında dönüş akımının izleyeceği yolu değerlendirmelidir.

Araç kullanıcıya yalnızca “GND via ekle” dememeli; via endüktansı, frekansa bağlı via reaktansı, via sayısı, stitching kondansatörü empedansı, dalga boyu ve önerilen geometrik aralıkları göstermelidir.

Yüksek frekanslı dönüş akımı, en düşük DC dirençli yolu değil, döngü endüktansını en aza indiren ve sinyal izine yakın olan referans yolunu izleme eğilimindedir. Katman değişimlerinde dönüş yolunun devamlılığı stitching via veya uygun bir düzlemler arası kondansatörle sağlanabilir.

## **4.2 Girdiler**

Temel girdiler:

* Sinyal türü: tek uçlu / diferansiyel  
* Clock veya temel sinyal frekansı  
* Sinyal yükselme süresi (t\_r)  
* Kullanıcı tarafından seçilen bant genişliği yöntemi  
* Dielektrik sabiti (\\varepsilon\_r)  
* Etkin dielektrik sabiti (\\varepsilon\_{\\text{eff}})  
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
* Kondansatörün sinyal via’ya uzaklığı

## **4.3 Kenar bant genişliği**

İki model sun:

### **Tek kutuplu yaklaşık bant genişliği**

\[  
f\_{3\\text{dB}}\\approx\\frac{0.35}{t\_r}  
\]

### **Muhafazakâr kenar bant genişliği**

\[  
f\_{\\text{edge}}\\approx\\frac{0.5}{t\_r}  
\]

Varsayılan olarak ikinci model kullanılabilir; ancak bunun kesin bir spektrum sınırı değil, tasarım amaçlı yaklaşık değer olduğu açıkça belirtilmelidir.

Saat frekansı düşük olsa bile yükselme süresi kısa olduğunda analiz frekansının saat frekansından çok daha yüksek olabileceğini göster.

## **4.4 Yayılma hızı ve dalga boyu**

Homojen dielektrik yaklaşımı:

\[  
v\_p=\\frac{c}{\\sqrt{\\varepsilon\_r}}  
\]

Yüzey hattı için etkin dielektrik sabiti girilmişse:

\[  
v\_p=\\frac{c}{\\sqrt{\\varepsilon\_{\\text{eff}}}}  
\]

Dalga boyu:

\[  
\\lambda=\\frac{v\_p}{f}  
\]

Stitching aralığı için kullanıcıya seçenek ver:

\[  
s\_{\\max}=\\frac{\\lambda}{N}  
\]

Burada (N), kullanıcı tarafından 10, 20 veya 40 seçilebilen muhafazakârlık katsayısıdır.

* (\\lambda/10): gevşek yaklaşım  
* (\\lambda/20): muhafazakâr başlangıç  
* (\\lambda/40): yüksek marjlı başlangıç

Bunları standart zorunluluğu gibi değil, mühendislik kuralı olarak etiketle.

## **4.5 Via endüktansı**

Silindirik via için birinci mertebe yaklaşık model:

\[  
L\_{\\text{via,nH}}  
\\approx  
0.2h\_{\\text{mm}}  
\\left\[  
\\ln\\left(\\frac{4h\_{\\text{mm}}}{d\_{\\text{mm}}}\\right)+1  
\\right\]  
\]

Burada:

* (h): via’nın elektriksel uzunluğu  
* (d): bitmiş delik veya iletken gövde çapı

Bu denklemin pad, antipad, yakın GND via, düzlem bağlantısı ve karşılıklı endüktansı tam olarak modellemediğini belirt.

Via reaktansı:

\[  
X\_L=2\\pi fL  
\]

Birbirine yeterince uzak ve ideal paralel kabul edilen (N) eş via için:

\[  
L\_{\\text{eq}}\\approx\\frac{L\_{\\text{via}}}{N}  
\]

Ancak gerçek yapıda karşılıklı endüktans bulunduğundan bu sonucun iyimser olabileceğini belirt.

## **4.6 Dönüş yolu gerilim bozulması**

Dönüş akımı yaklaşık biliniyorsa:

\[  
V\_L=L\\frac{di}{dt}  
\]

Sinüzoidal yaklaşımda:

\[  
V\_L=I\_{\\text{pk}}X\_L  
\]

Bu sonuç doğrudan ground bounce veya EMI sonucu değildir; yalnızca dönüş bağlantısının endüktif gerilim büyüklüğünü gösterir.

## **4.7 Stitching kondansatörü**

Kondansatör eşdeğer empedansı:

\[  
Z\_C=  
ESR+j\\omega ESL+\\frac{1}{j\\omega C}  
\]

Büyüklük:

\[  
|Z\_C|=  
\\sqrt{  
ESR^2+  
\\left(  
\\omega ESL-\\frac{1}{\\omega C}  
\\right)^2  
}  
\]

Self-resonant frequency:

\[  
f\_{\\text{SRF}}=  
\\frac{1}{2\\pi\\sqrt{ESL\\cdot C}}  
\]

Bağlantı viasının endüktansı ayrıca eklenmelidir:

# **\[**

# **ESL\_{\\text{total}}**

ESL\_{\\text{component}}  
\+  
L\_{\\text{mount}}  
\+  
L\_{\\text{vias}}  
\]

Kondansatör yalnızca hedef frekans bandında düşük empedans sağlıyorsa uygun kabul edilmelidir.

## **4.8 Hesap akışı**

1. Yükselme süresinden analiz frekansını hesapla.  
2. Kullanıcı clock frekansı da girdiyse clock ile edge bandwidth’i karşılaştır.  
3. Yayılma hızını ve dalga boyunu hesapla.  
4. Via endüktansını hesapla.  
5. Via reaktansını hesapla.  
6. Paralel dönüş vialarının ideal eşdeğerini hesapla.  
7. Via aralığını (\\lambda/N) yaklaşımıyla karşılaştır.  
8. Stitching kondansatörü varsa kompleks empedansını hesapla.  
9. Via ile kondansatör seçeneklerini aynı frekanslarda karşılaştır.  
10. Kullanıcıya dönüş yolunun geometrik ve elektriksel durumunu açıkla.

## **4.9 Sonuçlar**

* Edge bandwidth  
* Yayılma hızı  
* Dalga boyu  
* (\\lambda/10), (\\lambda/20), (\\lambda/40)  
* Tek via endüktansı  
* Paralel via ideal endüktansı  
* Hedef frekansta via reaktansı  
* Stitching kondansatörü SRF değeri  
* Hedef frekansta kondansatör empedansı  
* Gerçek via aralığının seçilen sınıra oranı  
* Sinyal via–dönüş via mesafesi  
* Önerilen dönüş yolu yöntemi  
* Kullanılan yaklaşım ve model sınırlamaları

## **4.10 Grafikler**

* Frekansa karşı tek via ve paralel via (X\_L)  
* Frekansa karşı stitching kondansatörü (|Z|)  
* Frekansa karşı (\\lambda/20) mesafesi  
* Via sayısına karşı eşdeğer ideal endüktans

## **4.11 SVG**

Şunları gösteren parametrik kesit çizimi oluştur:

* Üst sinyal izi  
* Sinyal via  
* Referans düzlemi  
* Alt katman izi  
* Bir veya iki GND stitching via  
* Alternatif power–GND referans geçişinde stitching kondansatörü  
* Kritik mesafeler

## **4.12 Test örneği**

Girdiler:

* (t\_r=1\\text{ ns})  
* (\\varepsilon\_{\\text{eff}}=4)  
* (h=1.6\\text{ mm})  
* (d=0.3\\text{ mm})

Beklenen yaklaşık sonuçlar:

\[  
f\_{\\text{edge}}=500\\text{ MHz}  
\]

\[  
\\lambda\\approx0.2998\\text{ m}  
\]

\[  
\\lambda/20\\approx14.99\\text{ mm}  
\]

\[  
L\_{\\text{via}}\\approx1.30\\text{ nH}  
\]

\[  
X\_L(500\\text{ MHz})\\approx4.08\\ \\Omega  
\]

---

# **5\. Via Stub ve Backdrill Hesaplayıcı**

## **5.1 Amaç**

Through-hole bir via iç katmanda sona erdiğinde, kullanılmayan via bölümü açık uçlu bir iletim hattı stub’ı oluşturur. Via stub etkisi özellikle stub’ın elektriksel uzunluğu çeyrek dalga mertebesine yaklaştığında ciddi hâle gelir. Backdrill işlemi bu kullanılmayan bölümü mekanik olarak kaldırır; ancak üretim toleransı nedeniyle bir residual stub kalır.

## **5.2 Girdiler**

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

## **5.3 Stub uzunluğu**

Doğrudan girilmemişse:

# **\[**

# **l\_{\\text{stub}}**

l\_{\\text{via,total}}-l\_{\\text{used}}  
\]

Backdrill sonrası:

# **\[**

# **l\_{\\text{residual}}**

l\_{\\text{stub}}-l\_{\\text{removed}}  
\]

Sonuç negatif olmamalıdır.

Worst-case residual stub:

# **\[**

# **l\_{\\text{residual,max}}**

l\_{\\text{nominal}}  
\+  
\\Delta l\_{\\text{depth}}  
\+  
l\_{\\text{safety}}  
\]

Minimum sonuç da ayrıca hesaplanmalıdır.

## **5.4 Via içindeki yayılma hızı**

Birinci mertebe homojen ortam yaklaşımı:

\[  
v\_{\\text{via}}  
\\approx  
\\frac{c}{\\sqrt{\\varepsilon\_r}}  
\]

PCB’nin z ekseni dielektrik özelliğinin x-y değerinden farklı olabileceğini ve gerçek via geçişinin anisotropik olabileceğini belirt.

## **5.5 Çeyrek dalga rezonansı**

Açık uçlu stub için temel yaklaşık rezonans:

# **\[**

# **f\_{\\lambda/4}**

# **\\frac{v\_{\\text{via}}}{4l\_{\\text{stub}}}**

\\frac{c}  
{4l\_{\\text{stub}}\\sqrt{\\varepsilon\_r}}  
\]

Residual stub için aynı formülü yeniden hesapla.

İkinci ve üçüncü tek harmonikler opsiyonel gösterilebilir:

\[  
f\_n=(2n-1)f\_{\\lambda/4}  
\]

Burada (n=1,2,3,\\ldots)

## **5.6 Gidiş-dönüş gecikmesi**

# **\[**

# **t\_{\\text{round-trip}}**

\\frac{2l\_{\\text{stub}}}{v\_{\\text{via}}}  
\]

Bunu yükselme süresiyle karşılaştır:

\[  
K\_t=  
\\frac{t\_{\\text{round-trip}}}{t\_r}  
\]

Sınıflandırma doğrudan fizik kuralı olarak verilmemelidir. Kullanıcıya seçilebilir eşikler sun:

* (K\_t\<0.1): genellikle küçük zaman alanı etkisi  
* (0.1\\leq K\_t\<0.25): dikkate alınmalı  
* (K\_t\\geq0.25): elektromanyetik doğrulama öner

Bu eşikleri “mühendislik sezgisi” olarak etiketle.

## **5.7 Frekans marjı**

\[  
M\_f=  
\\frac{f\_{\\lambda/4}}  
{f\_{\\text{analysis,max}}}  
\]

* (M\_f) yüksekse rezonans çalışma bandının uzağındadır.  
* Rezonansın çalışma bandının dışında bulunması stub etkisinin tamamen yok olduğu anlamına gelmez.  
* Stub kapasitif bir süreksizlik olarak rezonansın çok altında da return loss’u bozabilir.

## **5.8 Backdrill hedefi**

Kullanıcı hedef rezonans frekansı girerse gerekli maksimum residual stub:

# **\[**

# **l\_{\\text{residual,max}}**

\\frac{c}  
{4f\_{\\text{target}}\\sqrt{\\varepsilon\_r}}  
\]

Üretim toleransı çıkarıldıktan sonra nominal üretim hedefi:

# **\[**

# **l\_{\\text{nominal,target}}**

## **l\_{\\text{residual,max}}**

## **\\Delta l\_{\\text{fabrication}}**

l\_{\\text{safety}}  
\]

Negatif veya üretilemez sonuçlarda açık hata ver.

## **5.9 Sonuçlar**

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

## **5.10 Grafikler**

* Stub uzunluğuna karşı çeyrek dalga rezonansı  
* Backdrill derinliğine karşı residual stub  
* Backdrill derinliğine karşı rezonans frekansı  
* Dielektrik sabitine karşı rezonans frekansı

## **5.11 Test**

\[  
l\_{\\text{stub}}=5\\text{ mm}  
\]

\[  
\\varepsilon\_r=4  
\]

için:

\[  
f\_{\\lambda/4}\\approx7.495\\text{ GHz}  
\]

Stub 2.5 mm’ye düşürüldüğünde:

\[  
f\_{\\lambda/4}\\approx14.99\\text{ GHz}  
\]

---

# **6\. MOSFET Gate Driver ve Gate Direnci Hesaplayıcı**

## **6.1 Amaç**

Bu araç:

* Gerekli ortalama gate akımını  
* Yaklaşık peak source/sink akımını  
* Turn-on ve turn-off gate direncini  
* Miller plateau süresini  
* Gate sürme gücünü  
* Yaklaşık switching kaybını  
* Driver güç kaybını  
* Gate dirençlerinin tahmini enerji yükünü

hesaplamalıdır.

MOSFET gate’i sabit lineer bir kondansatör olarak modellenmemelidir. Ana hesaplarda datasheet’teki toplam gate charge (Q\_g), Miller charge (Q\_{gd}) ve gate plateau gerilimi kullanılmalıdır. Gate charge eğrisi çalışma gerilimi ve akımına bağlıdır.

## **6.2 Girdiler**

* Driver besleme gerilimi  
* Negatif turn-off gerilimi  
* Driver source çıkış direnci  
* Driver sink çıkış direnci  
* Driver peak source akımı  
* Driver peak sink akımı  
* MOSFET dahili gate direnci  
* Harici turn-on gate direnci  
* Harici turn-off gate direnci  
* Toplam gate charge (Q\_g)  
* Gate-to-drain charge (Q\_{gd})  
* Gate plateau gerilimi (V\_{\\text{plateau}})  
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
* (C\_{oss}), opsiyonel  
* Dead time, opsiyonel

## **6.3 Ortalama gate akımı**

Bir MOSFET için:

\[  
I\_{g,\\text{avg}}=Q\_gf\_{sw}  
\]

(N) adet MOSFET için:

\[  
I\_{g,\\text{avg,total}}=NQ\_gf\_{sw}  
\]

Bu değer peak driver akımı değildir.

## **6.4 Gate sürme gücü**

# **\[**

# **P\_{\\text{gate}}**

NQ\_gV\_{\\text{drive}}f\_{sw}  
\]

Negatif gate gerilimi kullanılıyorsa yaklaşık çevrim gerilim salınımı:

\[  
\\Delta V\_g=  
V\_{\\text{on}}-V\_{\\text{off}}  
\]

\[  
P\_{\\text{gate}}  
\\approx  
NQ\_g\\Delta V\_gf\_{sw}  
\]

Bu enerji driver, MOSFET iç gate direnci ve harici dirençler arasında dağılır.

## **6.5 Peak gate akımı**

Turn-on toplam direnci:

# **\[**

# **R\_{\\text{total,on}}**

R\_{\\text{drv,src}}  
\+  
R\_{g,\\text{int}}  
\+  
R\_{g,\\text{ext,on}}  
\+  
R\_{\\text{trace}}  
\]

Miller bölgesi yaklaşık gate akımı:

\[  
I\_{g,\\text{Miller,on}}  
\\approx  
\\frac{V\_{\\text{drive}}-V\_{\\text{plateau}}}  
{R\_{\\text{total,on}}}  
\]

Turn-off:

# **\[**

# **R\_{\\text{total,off}}**

R\_{\\text{drv,sink}}  
\+  
R\_{g,\\text{int}}  
\+  
R\_{g,\\text{ext,off}}  
\+  
R\_{\\text{trace}}  
\]

\[  
I\_{g,\\text{Miller,off}}  
\\approx  
\\frac{V\_{\\text{plateau}}-V\_{\\text{off}}}  
{R\_{\\text{total,off}}}  
\]

Driver datasheet peak akım limitini ayrıca uygula:

# **\[**

# **I\_{g,\\text{actual}}**

\\min\\left(  
I\_{g,\\text{resistive}},  
I\_{g,\\text{driver limit}}  
\\right)  
\]

## **6.6 Miller süresi**

\[  
t\_{\\text{Miller,on}}  
\\approx  
\\frac{Q\_{gd}}  
{I\_{g,\\text{Miller,on}}}  
\]

\[  
t\_{\\text{Miller,off}}  
\\approx  
\\frac{Q\_{gd}}  
{I\_{g,\\text{Miller,off}}}  
\]

Toplam gate şarj süresi için kaba yaklaşım:

\[  
t\_g\\approx\\frac{Q\_g}{I\_g}  
\]

Ancak switching transition tahmini için öncelikli olarak (Q\_{gd}) kullanılmalıdır.

## **6.7 Hedef switching süresinden gate direnci**

Hedef Miller süresi (t\_M) için:

# **\[**

# **I\_{g,\\text{target}}**

\\frac{Q\_{gd}}{t\_M}  
\]

Turn-on için gerekli toplam direnç:

# **\[**

# **R\_{\\text{total,on,target}}**

\\frac{V\_{\\text{drive}}-V\_{\\text{plateau}}}  
{I\_{g,\\text{target}}}  
\]

Harici direnç:

# **\[**

# **R\_{g,\\text{ext,on}}**

## **R\_{\\text{total,on,target}}**

## **R\_{\\text{drv,src}}**

## **R\_{g,\\text{int}}**

R\_{\\text{trace}}  
\]

Aynı işlem turn-off için ayrı yapılmalıdır.

Negatif direnç sonucu, driver’ın hedef süreden daha yavaş kaldığını veya giriş verilerinin tutarsız olduğunu gösterir.

## **6.8 Yaklaşık switching kaybı**

Basit lineer drain gerilimi ve akımı geçişi kabulüyle:

\[  
P\_{\\text{sw}}  
\\approx  
\\frac{1}{2}  
V\_{DS}I\_D  
(t\_r+t\_f)  
f\_{sw}  
\]

Bu model:

* Reverse recovery  
* Common-source inductance  
* Parazitik ringing  
* Nonlineer (C\_{oss})  
* Drain akımının zamanla değişimi  
* Miller plateau varyasyonu

gibi etkileri içermez.

(C\_{oss}) kaybı için isteğe bağlı kaba yaklaşım:

\[  
P\_{Coss}  
\\approx  
\\frac{1}{2}  
C\_{oss}V\_{DS}^{2}f\_{sw}  
\]

Datasheet’te (E\_{oss}) veriliyorsa:

\[  
P\_{Coss}=E\_{oss}f\_{sw}  
\]

tercih edilmelidir.

## **6.9 Harici gate direnci gücü**

Toplam gate enerjisinin direnç oranına göre yaklaşık dağılımı:

\[  
P\_{R\_g,\\text{ext}}  
\\approx  
P\_{\\text{gate}}  
\\frac{R\_{g,\\text{ext}}}  
{R\_{\\text{total}}}  
\]

Turn-on ve turn-off dirençleri ayrılmışsa enerji yaklaşık iki yarım çevrime paylaştırılabilir. Bunun birinci mertebe yaklaşım olduğu belirtilmelidir.

## **6.10 Sonuçlar**

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
* (C\_{oss}) kaybı  
* Gate direnci tahmini kaybı  
* Hedef süre için önerilen gate direnci  
* Çok hızlı switching uyarısı  
* Çok yavaş switching uyarısı  
* Driver peak akım yetersizliği

## **6.11 Grafikler**

* Gate direncine karşı Miller süresi  
* Gate direncine karşı peak gate akımı  
* Gate direncine karşı yaklaşık switching kaybı  
* Switching frequency’ye karşı gate sürme gücü

## **6.12 Test**

\[  
Q\_g=40\\text{ nC}  
\]

\[  
Q\_{gd}=10\\text{ nC}  
\]

\[  
V\_{\\text{drive}}=10\\text{ V}  
\]

\[  
V\_{\\text{plateau}}=5\\text{ V}  
\]

\[  
R\_{\\text{total}}=10\\ \\Omega  
\]

\[  
f\_{sw}=100\\text{ kHz}  
\]

Beklenen:

\[  
I\_{g,\\text{avg}}=4\\text{ mA}  
\]

\[  
P\_{\\text{gate}}=40\\text{ mW}  
\]

\[  
I\_{g,\\text{Miller}}=0.5\\text{ A}  
\]

\[  
t\_{\\text{Miller}}=20\\text{ ns}  
\]

---

# **7\. ADC Giriş Yerleşme Süresi ve RC Filtre Aracı**

## **7.1 Amaç**

Araç, özellikle SAR ADC girişlerinde:

* Kaynak empedansı  
* ADC sampling capacitor  
* Acquisition time  
* Seri direnç  
* Harici filtre kondansatörü  
* ADC çözünürlüğü

arasındaki ilişkiyi analiz etmelidir.

SAR ADC girişlerinin switched-capacitor yapısı örnekleme anında akım darbeleri oluşturabilir. Yüksek kaynak empedansı, girişin acquisition süresi içinde gerekli doğruluğa yerleşememesine neden olabilir. ADC sürücüsü, filtre ve sampling ağı birlikte değerlendirilmelidir.

## **7.2 Girdiler**

* ADC çözünürlüğü (N)  
* ADC referans gerilimi  
* Tam ölçek giriş aralığı  
* ADC clock  
* Sampling cycles  
* Acquisition time  
* Sampling capacitor (C\_s)  
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

## **7.3 Acquisition time**

ADC clock ve sampling cycle sayısı verilirse:

# **\[**

# **t\_{\\text{acq}}**

\\frac{N\_{\\text{sampling cycles}}}  
{f\_{\\text{ADC clock}}}  
\]

ADC mimarisine göre ilave sabit süre gerekiyorsa kullanıcı tarafından girilmelidir.

## **7.4 RC yerleşmesi**

Birinci mertebe RC step cevabı:

\[  
V\_C(t)=V\_{\\text{final}}  
\\left(1-e^{-t/\\tau}\\right)  
\]

\[  
\\tau=R\_{\\text{eq}}C\_{\\text{eq}}  
\]

Kalan bağıl hata:

# **\[**

# **\\epsilon\_{\\text{rel}}**

e^{-t\_{\\text{acq}}/\\tau}  
\]

Tam ölçek step için yarım LSB hata sınırı:

# **\[**

# **\\epsilon\_{\\text{0.5 LSB}}**

\\frac{1}{2^{N+1}}  
\]

Yerleşme koşulu:

\[  
e^{-t\_{\\text{acq}}/\\tau}  
\\leq  
\\frac{1}{2^{N+1}}  
\]

Gerekli minimum süre:

\[  
t\_{\\text{settle,min}}  
\\geq  
(N+1)\\ln(2),R\_{\\text{eq}}C\_{\\text{eq}}  
\]

## **7.5 Maksimum kaynak direnci**

Harici filtre kondansatörü bulunmayan basitleştirilmiş model:

# **\[**

# **R\_{\\text{eq}}**

R\_{\\text{source}}  
\+  
R\_{\\text{series}}  
\+  
R\_{\\text{switch}}  
\+  
R\_{\\text{driver}}  
\]

# **\[**

# **R\_{\\text{eq,max}}**

\\frac{t\_{\\text{acq}}}  
{C\_s(N+1)\\ln2}  
\]

İzin verilen dış kaynak direnci:

# **\[**

# **R\_{\\text{source,max}}**

## **R\_{\\text{eq,max}}**

## **R\_{\\text{switch}}**

## **R\_{\\text{series}}**

R\_{\\text{driver}}  
\]

Negatif sonuç buffer veya daha uzun acquisition time gerektiğini gösterir.

## **7.6 RC filtre kesim frekansı**

\[  
f\_c=  
\\frac{1}{2\\pi R\_fC\_f}  
\]

Birinci dereceden filtre genliği:

# **\[**

# **|H(f)|**

\\frac{1}  
{\\sqrt{1+(f/f\_c)^2}}  
\]

Attenuation:

# **\[**

# **A\_{\\text{dB}}**

20\\log\_{10}|H(f)|  
\]

## **7.7 Charge sharing**

Harici kondansatör (C\_f), sampling capacitor (C\_s) ile ani charge sharing yapıyorsa yaklaşık başlangıç droop’u:

\[  
\\Delta V\_{\\text{droop}}  
\\approx  
\\Delta V\_{\\text{step}}  
\\frac{C\_s}{C\_f+C\_s}  
\]

Bu model, ADC switch direnci ve driver dinamiğini ihmal eder.

Kondansatör oranı:

\[  
K\_C=\\frac{C\_f}{C\_s}  
\]

Kullanıcıya (C\_f\\gg C\_s) olduğunda sampling kickback’in azaldığını; ancak büyük (C\_f)’nin driver stabilitesini ve yerleşme süresini zorlaştırabileceğini açıkla.

## **7.8 LSB ve mutlak hata**

# **\[**

# **V\_{\\text{LSB}}**

\\frac{V\_{\\text{FS}}}{2^N}  
\]

Yerleşme hatası:

# **\[**

# **V\_{\\text{error}}**

\\Delta V\_{\\text{step}}  
e^{-t\_{\\text{acq}}/\\tau}  
\]

LSB cinsinden:

# **\[**

# **E\_{\\text{LSB}}**

\\frac{V\_{\\text{error}}}  
{V\_{\\text{LSB}}}  
\]

## **7.9 Termal gürültü**

Kondansatör üzerindeki yaklaşık (kT/C) gürültüsü:

# **\[**

# **V\_{n,\\text{rms}}**

\\sqrt{\\frac{k\_BT\_K}{C}}  
\]

Bu hesap toplam ADC gürültüsü değildir; yalnızca teorik sampling capacitor termal gürültü bileşenidir.

## **7.10 Sonuçlar**

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

## **7.11 Grafikler**

* Acquisition time’a karşı LSB hatası  
* Kaynak direncine karşı LSB hatası  
* Frekansa karşı RC attenuation  
* Harici kondansatör / sampling capacitor oranına karşı droop

## **7.12 Test**

\[  
N=12  
\]

\[  
C\_s=20\\text{ pF}  
\]

\[  
t\_{\\text{acq}}=1\\text{ µs}  
\]

İç dirençler ihmal edilirse:

\[  
R\_{\\text{eq,max}}  
\\approx  
\\frac{1\\times10^{-6}}  
{20\\times10^{-12}\\cdot13\\ln2}  
\\approx5.55\\text{ k}\\Omega  
\]

---

# **8\. CAN ve RS-485 Fiziksel Katman Hesaplayıcı**

Bu ekran iki ayrı mod içermelidir:

* CAN / CAN FD  
* RS-485

Protokol frame çözümleme yapma. Yalnızca fiziksel katman, terminasyon, bias, kablo gecikmesi, stub ve yük hesabı yap.

## **8.1 CAN teorisi**

CAN omurgasının iki fiziksel ucunda yaklaşık karakteristik empedansa eş terminasyon bulunur. İki adet 120 Ω terminasyon, sürücü tarafından yaklaşık 60 Ω diferansiyel yük olarak görülür. Stub uzunluğu ve toplam gecikme, veri hızı ile transceiver gecikme bütçesine göre değerlendirilmelidir. Klasik 1 Mbps CAN için sık kullanılan fiziksel sınırlar arasında 40 m omurga ve 0.3 m unterminated stub bulunur; fakat araç bunları her sistem için değişmez fizik kanunu olarak kullanmamalıdır.

## **8.2 CAN girdileri**

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

## **8.3 Bit süresi**

\[  
t\_{\\text{bit}}=  
\\frac{1}{R\_b}  
\]

Sample point anı:

# **\[**

# **t\_{\\text{sample}}**

S\_pt\_{\\text{bit}}  
\]

Burada (S\_p), 0 ile 1 arasında sample point oranıdır.

## **8.4 Kablo gecikmesi**

Tek yön:

# **\[**

# **t\_{\\text{cable}}**

L\_{\\text{bus}}t\_{pd,\\text{per meter}}  
\]

Gidiş-dönüş:

# **\[**

# **t\_{\\text{round trip}}**

2L\_{\\text{bus}}t\_{pd,\\text{per meter}}  
\]

Toplam gecikme bütçesi:

# **\[**

# **t\_{\\text{loop}}**

t\_{\\text{controller}}  
\+t\_{\\text{TX}}  
\+t\_{\\text{isolator,TX}}  
\+t\_{\\text{round trip}}  
\+t\_{\\text{RX}}  
\+t\_{\\text{isolator,RX}}  
\]

Marj:

# **\[**

# **t\_{\\text{margin}}**

t\_{\\text{sample}}-t\_{\\text{loop}}  
\]

Negatif marj açık hata veya ciddi uyarı üretmelidir.

## **8.5 Maksimum teorik bus uzunluğu**

# **\[**

# **L\_{\\max}**

## **\\frac{**

## **t\_{\\text{sample}}**

t\_{\\text{fixed delays}}  
}  
{2t\_{pd,\\text{per meter}}}  
\]

Bu değer attenuation, kablo kaybı, transceiver slew rate, jitter ve oscillator tolerance içermez.

## **8.6 CAN terminasyonu**

İki terminasyonun eşdeğeri:

# **\[**

# **R\_{\\text{diff,eq}}**

R\_{T1}\\parallel R\_{T2}  
\]

İdeal 120 Ω \+ 120 Ω:

\[  
R\_{\\text{diff,eq}}=60\\ \\Omega  
\]

Split termination’da:

# **\[**

# **R\_{T,\\text{total}}**

R\_1+R\_2  
\]

Genellikle:

\[  
R\_1=R\_2=\\frac{Z\_0}{2}  
\]

Orta noktanın common-mode eşdeğer direnci yaklaşık:

# **\[**

# **R\_{\\text{CM}}**

R\_1\\parallel R\_2  
\]

Split kondansatörü yaklaşık kesim frekansı:

\[  
f\_{\\text{split}}  
\\approx  
\\frac{1}  
{2\\pi R\_{\\text{CM}}C\_{\\text{split}}}  
\]

Bu yalnızca common-mode birinci mertebe yaklaşımıdır.

## **8.7 Stub gecikmesi**

# **\[**

# **t\_{\\text{stub,RT}}**

\\frac{2l\_{\\text{stub}}}{v\_p}  
\]

Yükselme süresi girilmişse:

# **\[**

# **K\_{\\text{stub}}**

\\frac{t\_{\\text{stub,RT}}}{t\_r}  
\]

Kullanıcı seçilebilir muhafazakârlık sınırlarıyla değerlendirme yapmalıdır.

---

## **8.8 RS-485 teorisi**

RS-485 hattında terminasyonlar kablonun fiziksel uçlarında yer alır. Eski veya dahili failsafe özelliği bulunmayan alıcılarda, idle bus durumunu tanımlamak için harici bias dirençleri kullanılabilir. Modern transceiver’larda dahili failsafe bulunduğundan harici bias her zaman gerekli değildir.

## **8.9 RS-485 girdileri**

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

## **8.10 Terminasyon eşdeğeri**

# **\[**

# **R\_{T,\\text{eq}}**

\\left(  
\\sum\_i\\frac{1}{R\_{T,i}}  
\\right)^{-1}  
\]

Receiver yükleri diferansiyel eşdeğer olarak girilmişse:

# **\[**

# **R\_{AB}**

R\_{T,\\text{eq}}  
\\parallel  
R\_{\\text{receivers,eq}}  
\]

## **8.11 Simetrik failsafe bias**

A hattı (R\_{PU}) ile (V\_{CC})’ye, B hattı (R\_{PD}) ile GND’ye bağlı kabul edilsin:

# **\[**

# **I\_{\\text{bias}}**

\\frac{V\_{CC}}  
{R\_{PU}+R\_{AB}+R\_{PD}}  
\]

Idle differential voltage:

# **\[**

# **V\_{AB,\\text{idle}}**

I\_{\\text{bias}}R\_{AB}  
\]

Simetrik dirençler için:

\[  
R\_{PU}=R\_{PD}=R\_B  
\]

Hedef idle voltage’dan:

# **\[**

# **R\_B**

\\frac{  
R\_{AB}  
\\left(  
\\frac{V\_{CC}}{V\_{AB,\\text{target}}}-1  
\\right)  
}{2}  
\]

Sonuç E24/E48/E96 serisine yuvarlanabilmelidir. Seçilen gerçek dirençlerle hesap yeniden yapılmalıdır.

## **8.12 Bias direnç güçleri**

\[  
P\_{PU}=I\_{\\text{bias}}^2R\_{PU}  
\]

\[  
P\_{PD}=I\_{\\text{bias}}^2R\_{PD}  
\]

Aktif sürüşte bias ağı üzerinden oluşabilecek worst-case akım ayrıca gösterilmelidir.

## **8.13 Unit load**

Kullanıcı transceiver unit load değerini girerse:

# **\[**

# **N\_{\\max,\\text{ideal}}**

\\frac{32}{UL}  
\]

Örnek:

* 1 UL → 32 node  
* 1/2 UL → 64 node  
* 1/4 UL → 128 node  
* 1/8 UL → 256 node

Bu hesabın kablo kapasitansı, konnektörler ve gerçek transceiver limitlerini içermediğini belirt.

## **8.14 Ortak sonuçlar**

* Bit time  
* Tek yön kablo gecikmesi  
* Round-trip gecikme  
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

## **8.15 Grafikler**

* Bitrate’e karşı maksimum bus uzunluğu  
* Stub uzunluğuna karşı round-trip delay  
* Bias direncine karşı idle differential voltage  
* Node sayısına karşı eşdeğer yük

---

# **9\. Shunt Direnci ve Kelvin Bağlantı Hesaplayıcı**

## **9.1 Amaç**

Araç:

* Shunt direnci  
* Ölçüm gerilimi  
* Güç kaybı  
* ADC kazancı  
* Ölçüm çözünürlüğü  
* Tolerans  
* TCR  
* Amplifikatör offset’i  
* Kelvin kullanılmadığında ortak yol direnci hatası

hesaplamalıdır.

Yüksek akım ölçümünde Kelvin bağlantısı, akım taşıyan pad ve bakır yolların (I\\cdot R) düşümünün sense ölçümüne dahil olmasını azaltır.

## **9.2 Girdiler**

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

## **9.3 Shunt seçimi**

Hedef sense voltage’dan:

# **\[**

# **R\_{\\text{shunt}}**

\\frac{V\_{\\text{sense,FS}}}  
{I\_{\\max}}  
\]

Gerçek sense voltage:

# **\[**

# **V\_{\\text{sense}}**

IR\_{\\text{shunt}}  
\]

## **9.4 Güç**

# **\[**

# **P\_{\\text{shunt}}**

I\_{\\text{RMS}}^2R\_{\\text{shunt}}  
\]

Peak kısa süreli güç:

# **\[**

# **P\_{\\text{peak}}**

I\_{\\text{peak}}^2R\_{\\text{shunt}}  
\]

Sürekli güç marjı:

\[  
M\_P=  
\\frac{P\_{\\text{rated,derated}}}  
{P\_{\\text{shunt}}}  
\]

## **9.5 Sıcaklık**

Thermal resistance girilmişse:

# **\[**

# **\\Delta T**

P\_{\\text{shunt}}\\theta  
\]

# **\[**

# **T\_{\\text{shunt}}**

T\_{\\text{ambient}}+\\Delta T  
\]

TCR etkisi:

# **\[**

# **R(T)**

R\_0  
\\left\[  
1+\\alpha\_R(T-T\_0)  
\\right\]  
\]

TCR kaynaklı bağıl hata:

# **\[**

# **E\_{\\text{TCR}}**

\\alpha\_R(T-T\_0)  
\]

ppm/°C girilmişse:

\[  
\\alpha\_R=  
TCR\_{\\text{ppm}}\\times10^{-6}  
\]

## **9.6 Amplifier çıkışı**

# **\[**

# **V\_{\\text{out}}**

GIR\_{\\text{shunt}}+V\_{\\text{offset,out}}  
\]

Input-referred offset’in akım hatası:

# **\[**

# **I\_{\\text{error,offset}}**

\\frac{V\_{OS}}  
{R\_{\\text{shunt}}}  
\]

Çıkışa referanslı:

# **\[**

# **V\_{\\text{error,out}}**

GV\_{OS}  
\]

## **9.7 ADC çözünürlüğü**

# **\[**

# **V\_{\\text{LSB}}**

\\frac{V\_{\\text{ref}}}{2^N}  
\]

İdeal akım çözünürlüğü:

# **\[**

# **I\_{\\text{LSB}}**

\\frac{V\_{\\text{LSB}}}  
{GR\_{\\text{shunt}}}  
\]

Gerçek sistem ENOB değeri girilebiliyorsa (N) yerine ENOB ile ikinci sonuç göster.

## **9.8 Kelvin kullanılmayan yapı**

Sense ölçümüne ortak bakır direnci (R\_{\\text{shared}}) dahil oluyorsa:

# **\[**

# **V\_{\\text{measured}}**

I(R\_{\\text{shunt}}+R\_{\\text{shared}})  
\]

Akım hatası:

# **\[**

# **E\_{\\text{shared}}**

\\frac{R\_{\\text{shared}}}  
{R\_{\\text{shunt}}}  
\]

Yüzde:

# **\[**

# **E\_{\\text{shared,%}}**

100  
\\frac{R\_{\\text{shared}}}  
{R\_{\\text{shunt}}}  
\]

Kelvin bağlantısında sense hatlarında ihmal edilebilir akım aktığı varsayılır; ancak amplifier input bias current ve asimetrik filtre dirençleri yine hata oluşturabilir.

## **9.9 Toplam hata**

Worst-case toplam:

# **\[**

# **E\_{\\text{WC}}**

|E\_{\\text{shunt tol}}|  
\+  
|E\_{\\text{TCR}}|  
\+  
|E\_{\\text{gain}}|  
\+  
|E\_{\\text{offset}}|  
\+  
|E\_{\\text{shared}}|  
\]

İstatistiksel bağımsızlık varsayımıyla RSS:

# **\[**

# **E\_{\\text{RSS}}**

\\sqrt{  
E\_1^2+E\_2^2+\\cdots+E\_n^2  
}  
\]

Offset hatası önce bağıl akım hatasına dönüştürülmelidir:

# **\[**

# **E\_{\\text{offset}}**

\\frac{V\_{OS}}  
{IR\_{\\text{shunt}}}  
\]

Düşük akımlarda offset yüzdesinin büyüdüğünü grafikte göster.

## **9.10 Sonuçlar**

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

## **9.11 Test**

\[  
I\_{\\max}=10\\text{ A}  
\]

\[  
V\_{\\text{sense,FS}}=50\\text{ mV}  
\]

\[  
R\_{\\text{shunt}}=5\\text{ m}\\Omega  
\]

\[  
P=10^2\\cdot0.005=0.5\\text{ W}  
\]

ADC:

\[  
V\_{\\text{ref}}=3.3\\text{ V}  
\]

\[  
N=12  
\]

\[  
G=50  
\]

İdeal çözünürlük:

\[  
I\_{\\text{LSB}}  
\\approx3.22\\text{ mA}  
\]

---

# **İKİNCİ PAKET**

# **10\. PDN Rezonans ve Antirezonans Analizörü**

## **10.1 Amaç**

Mevcut PDN Target Impedance ve Decoupling araçlarını silme. Yeni araç bunların ileri seviye devamı olmalıdır.

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

Farklı kapasitör değerleri ve parazitikleri paralel bağlandığında yalnızca toplam kapasite değil, rezonans ve antirezonans tepeleri de oluşabilir.

## **10.2 Girdiler**

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

## **10.3 Hedef empedans**

# **\[**

# **Z\_{\\text{target}}**

\\frac{\\Delta V\_{\\text{allowed}}}  
{\\Delta I\_{\\text{step}}}  
\]

Ripple yüzdeyle verilirse:

# **\[**

# **\\Delta V\_{\\text{allowed}}**

V\_{\\text{rail}}r  
\]

Bu hedefin bütün frekanslarda gerçek sistem stabilitesini garanti etmediğini belirt.

## **10.4 Kondansatör modeli**

Bir kondansatör kolu:

# **\[**

# **Z\_C(f)**

ESR  
\+j\\omega ESL\_{\\text{total}}  
\+\\frac{1}{j\\omega C\_{\\text{effective}}}  
\]

# **\[**

# **ESL\_{\\text{total}}**

ESL\_{\\text{component}}  
\+  
L\_{\\text{mount}}  
\+  
L\_{\\text{via}}  
\]

Aynı ideal kolun (N) adedi:

# **\[**

# **Z\_{C,N}**

\\frac{Z\_C}{N}  
\]

Bu yaklaşım tüm bağlantı endüktanslarının bağımsız olduğu varsayımına dayanır. Ortak via veya ortak boyun kullanılıyorsa endüktansın tamamı (N)’ye bölünmemelidir.

Daha gerçekçi model:

# **\[**

# **Z\_{group}**

Z\_{\\text{shared}}  
\+  
\\frac{Z\_{\\text{individual}}}{N}  
\]

## **10.5 Self resonance**

# **\[**

# **f\_{\\text{SRF}}**

\\frac{1}  
{2\\pi\\sqrt{ESL\_{\\text{total}}C}}  
\]

SRF altında kapasitif, üstünde endüktif davranış beklenir.

## **10.6 VRM modeli**

Basit seri model:

# **\[**

# **Z\_{\\text{VRM}}**

R\_{\\text{VRM}}  
\+j\\omega L\_{\\text{VRM}}  
\]

İsteğe bağlı çıkış kondansatörü eklenirse bu kol kompleks olarak oluşturulmalıdır.

## **10.7 Plane modeli**

# **\[**

# **Z\_{\\text{plane}}**

R\_{\\text{plane}}  
\+j\\omega L\_{\\text{plane}}  
\+\\frac{1}{j\\omega C\_{\\text{plane}}}  
\]

Bu, gerçek cavity modes içermeyen lumped modeldir.

## **10.8 Toplam empedans**

Bütün kolların admitansları:

# **\[**

# **Y\_{\\text{total}}**

\\sum\_k\\frac{1}{Z\_k}  
\]

# **\[**

# **Z\_{\\text{total}}**

\\frac{1}{Y\_{\\text{total}}}  
\]

Bütün frekans noktalarında kompleks hesap yapılmalıdır.

## **10.9 Rezonans ve antirezonans tespiti**

Logaritmik frekans sweep’inde lokal minimum ve maksimumları bul:

* Lokal minimum → rezonans çukuru  
* Lokal maksimum → antirezonans tepesi

Basit üç noktalı karşılaştırma yapılabilir; ancak gürültülü veya sık örnekli veride yanlış tepe oluşmaması için minimum prominence eşiği kullanılmalıdır.

Her tepe için:

* Frekans  
* Empedans  
* Target impedance oranı  
* Komşu minimumlara göre prominence

hesaplanmalıdır.

## **10.10 Düşük frekans kapasite ihtiyacı**

Load step süresi (\\Delta t) için:

\[  
C\_{\\min}  
\\geq  
\\frac{\\Delta I\\Delta t}  
{\\Delta V}  
\]

Bu denklem ESR, ESL ve VRM cevabını içermez.

ESR kaynaklı ani droop:

# **\[**

# **\\Delta V\_{\\text{ESR}}**

\\Delta I\\cdot ESR\_{\\text{eq}}  
\]

ESL kaynaklı droop:

# **\[**

# **\\Delta V\_{\\text{ESL}}**

L\_{\\text{eq}}\\frac{di}{dt}  
\]

Toplamı doğrudan cebirsel toplama seçeneğiyle tahmini göster:

\[  
\\Delta V\_{\\text{approx}}  
\\approx  
\\Delta V\_C+  
\\Delta V\_{\\text{ESR}}+  
\\Delta V\_{\\text{ESL}}  
\]

Bunun worst-case yaklaşık model olduğunu belirt.

## **10.11 Tolerans**

Minimum, nominal ve maksimum kapasitans sweep’i yap.

Etkin kapasite:

# **\[**

# **C\_{\\text{effective}}**

C\_{\\text{nominal}}  
K\_{\\text{DC bias}}  
K\_{\\text{temperature}}  
K\_{\\text{aging}}  
\]

Katsayılar 0–1 arasında doğrulanmalıdır.

## **10.12 Sonuçlar**

* Target impedance  
* Maksimum PDN empedansı  
* Target’ın aşıldığı frekans aralıkları  
* En kötü antirezonans frekansı  
* Her kondansatör grubunun SRF’si  
* Düşük frekans minimum kapasite  
* Tahmini ESR droop  
* Tahmini ESL droop  
* Target altında kalan toplam bant yüzdesi  
* Kondansatör grubu ekleme/çıkarma karşılaştırması

## **10.13 Grafik**

Log-log grafik:

* Toplam PDN (|Z|)  
* Target impedance yatay çizgisi  
* VRM kolu  
* Her kondansatör grubu  
* Plane kolu  
* Minimum/nominal/maksimum tolerans eğrileri

---

# **11\. Power Plane Rezonansı ve Düzlem Kapasitansı**

## **11.1 Amaç**

Dikdörtgen power–ground plane çiftinin:

* Yaklaşık düzlem kapasitansını  
* İlk cavity mode frekanslarını  
* Dielektrik kalınlığının etkisini  
* Dielektrik sabitinin etkisini  
* Düzlem boyutlarının etkisini  
* Dielektrik kayıp kaynaklı yaklaşık Q değerini

hesapla.

Solid power plane yapılarında geometrik rezonanslar oluşabilir; dolayısıyla yalnızca lumped plane capacitance hesabı yeterli değildir.

## **11.2 Girdiler**

* Plane X boyutu (a)  
* Plane Y boyutu (b)  
* Örtüşen etkin alan  
* Power–ground mesafesi (d)  
* Dielektrik sabiti  
* Loss tangent  
* Bakır kalınlığı  
* Frekans aralığı  
* Maksimum mode index (m,n)  
* Kondansatör sayısı  
* Stitching via aralığı  
* Kenar koşulu seçeneği

## **11.3 Düzlem kapasitansı**

İdeal paralel plaka:

# **\[**

# **C\_{\\text{plane}}**

\\varepsilon\_0\\varepsilon\_r  
\\frac{A}{d}  
\]

Saçak alanlar ve düzlem boşlukları bu modelde bulunmaz.

Alan dikdörtgense:

\[  
A=ab  
\]

## **11.4 Alan başına kapasitans**

# **\[**

# **C'=**

# **\\frac{C}{A}**

\\frac{\\varepsilon\_0\\varepsilon\_r}{d}  
\]

Sonuç:

* pF/cm²  
* nF/in²  
* F/m²

birimleriyle gösterilebilir.

## **11.5 Cavity mode frekansları**

Dikdörtgen cavity için yaklaşık:

# **\[**

# **f\_{mn}**

\\frac{c}  
{2\\sqrt{\\varepsilon\_r}}  
\\sqrt{  
\\left(\\frac{m}{a}\\right)^2+  
\\left(\\frac{n}{b}\\right)^2  
}  
\]

Burada:

* (m,n=0,1,2,\\ldots)  
* (m=n=0) geçersizdir.

İlk modlar:

# **\[**

# **f\_{10}**

\\frac{c}{2a\\sqrt{\\varepsilon\_r}}  
\]

# **\[**

# **f\_{01}**

\\frac{c}{2b\\sqrt{\\varepsilon\_r}}  
\]

# **\[**

# **f\_{11}**

\\frac{c}{2\\sqrt{\\varepsilon\_r}}  
\\sqrt{  
\\frac{1}{a^2}+\\frac{1}{b^2}  
}  
\]

Bu model gerçek kart kenarları, kesikler, via yapıları, decoupling kondansatörleri ve kayıpları tam içermez.

## **11.6 Dielektrik Q**

Yalnızca dielektrik kaybı dikkate alınırsa:

\[  
Q\_d\\approx\\frac{1}{\\tan\\delta}  
\]

Gerçek toplam Q:

# **\[**

# **\\frac{1}{Q\_{\\text{total}}}**

\\frac{1}{Q\_d}  
\+  
\\frac{1}{Q\_c}  
\+  
\\frac{1}{Q\_r}  
\+  
\\frac{1}{Q\_{\\text{loading}}}  
\]

(Q\_c), (Q\_r) veya yükleme değerleri bilinmiyorsa toplam Q hesaplanmış gibi gösterilmemelidir.

## **11.7 Etkin enerji**

Plane’de depolanan yaklaşık enerji:

\[  
E\_C=  
\\frac{1}{2}C\_{\\text{plane}}V^2  
\]

Bu değer load step sağlama kapasitesinin tek başına ölçüsü değildir.

## **11.8 Stitching aralığı karşılaştırması**

Hedef frekansta:

\[  
\\lambda\_d=  
\\frac{c}  
{f\\sqrt{\\varepsilon\_r}}  
\]

# **\[**

# **s\_{\\max}**

\\frac{\\lambda\_d}{N}  
\]

(N) kullanıcı tarafından 10, 20 veya 40 seçilebilmelidir.

## **11.9 Sonuçlar**

* Plane capacitance  
* Alan başına kapasitans  
* Depolanan enerji  
* İlk 10 veya 20 cavity mode  
* En düşük cavity resonance  
* Loss tangent kaynaklı yaklaşık (Q\_d)  
* Hedef frekansta dielektrik dalga boyu  
* Stitching via aralığı karşılaştırması  
* Plane boyutunu küçültmenin etkisi  
* Dielektrik kalınlığını azaltmanın kapasitans etkisi

## **11.10 Grafikler**

* Plane spacing’e karşı capacitance  
* Plane X/Y boyutuna karşı ilk mode  
* Mode index heatmap  
* Dielektrik sabitine karşı ilk rezonans  
* Frekans ekseni üzerinde mode işaretleri

## **11.11 Test**

\[  
a=b=100\\text{ mm}  
\]

\[  
d=0.1\\text{ mm}  
\]

\[  
\\varepsilon\_r=4  
\]

\[  
A=0.01\\text{ m}^2  
\]

Beklenen:

\[  
C\_{\\text{plane}}  
\\approx3.54\\text{ nF}  
\]

\[  
f\_{10}=f\_{01}  
\\approx749.5\\text{ MHz}  
\]

---

# **12\. EMC LC / π Filtre Tasarım Aracı**

## **12.1 Amaç**

Araç üç mod sunmalıdır:

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

etkilerini de göstermelidir.

İdeal LC filtrenin yüksek frekanstaki eğimi yaklaşık −40 dB/decade olabilir; fakat yetersiz damping filtre peaking’ine ve DC/DC converter kararlılık sorununa yol açabilir.

## **12.2 Girdiler**

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

## **12.3 İdeal cutoff**

\[  
f\_0=  
\\frac{1}  
{2\\pi\\sqrt{LC}}  
\]

Karakteristik empedans:

\[  
Z\_0=  
\\sqrt{\\frac{L}{C}}  
\]

## **12.4 Seri RLC damping**

Basitleştirilmiş seri RLC için:

# **\[**

# **\\zeta**

\\frac{R}{2}  
\\sqrt{\\frac{C}{L}}  
\]

# **\[**

# **Q=**

# **\\frac{1}{2\\zeta}**

\\frac{1}{R}\\sqrt{\\frac{L}{C}}  
\]

Gerçek filtre topolojisinde source ve load empedansları farklı olduğundan nihai sonuç kompleks nodal çözümden alınmalıdır.

## **12.5 Kompleks komponent modelleri**

İndüktör:

\[  
Z\_L=  
DCR+j\\omega L  
\]

Parazitik paralel kapasite varsa:

# **\[**

# **Z\_{L,\\text{real}}**

Z\_L  
\\parallel  
\\frac{1}{j\\omega C\_p}  
\]

Kondansatör:

\[  
Z\_C=  
ESR+j\\omega ESL+\\frac{1}{j\\omega C}  
\]

Damping kolu:

\[  
Z\_D=  
R\_D+\\frac{1}{j\\omega C\_D}  
\]

## **12.6 Transfer fonksiyonu**

Her topoloji için devre düğüm denklemleriyle:

\[  
H(f)=\\frac{V\_{\\text{out}}}{V\_{\\text{source}}}  
\]

hesaplanmalıdır.

Insertion loss:

# **\[**

# **IL\_{\\text{dB}}**

20\\log\_{10}  
\\left|  
\\frac{V\_{\\text{out,no filter}}}  
{V\_{\\text{out,filter}}}  
\\right|  
\]

Kaynak ve yük empedansı olmadan yalnızca ideal (1/\\sqrt{LC}) sonucuyla insertion loss verilmemelidir.

## **12.7 Converter negatif giriş direnci**

Sabit güç yükü için küçük sinyal yaklaşık giriş direnci:

\[  
R\_{\\text{in,neg}}  
\\approx  
\-\\frac{V\_{\\text{in}}^2}  
{P\_{\\text{in}}}  
\]

# **\[**

# **P\_{\\text{in}}**

\\frac{P\_{\\text{out}}}{\\eta}  
\]

Büyüklük:

# **\[**

# **|R\_{\\text{in,neg}}|**

\\frac{V\_{\\text{in}}^2}  
{P\_{\\text{in}}}  
\]

Filter output impedance ile karşılaştır.

Muhafazakâr tasarım göstergesi:

\[  
|Z\_{\\text{out,filter}}|  
\<  
K|Z\_{\\text{in,converter}}|  
\]

Varsayılan (K=1/3) seçilebilir; bunun Middlebrook yaklaşımından türetilen tasarım marjı olduğu, mutlak stabilite garantisi olmadığı belirtilmelidir.

## **12.8 Damping ilk tahmini**

Başlangıç tahmini:

\[  
R\_D\\approx\\sqrt{\\frac{L}{C}}  
\]

Damping capacitance için sabit tek formül kullanma. Kullanıcı değer girebilmeli; araç parametrik sweep ile:

* Peak empedansı  
* Attenuation  
* Power loss

arasında en iyi bölgeyi göstermelidir.

## **12.9 Common-mode choke**

Common-mode:

\[  
Z\_{\\text{CM}}  
\\approx  
R\_{\\text{DCR}}  
\+j\\omega L\_{\\text{CM}}  
\]

Differential-mode etkisi esas olarak leakage inductance ile:

\[  
Z\_{\\text{DM}}  
\\approx  
R\_{\\text{DCR}}  
\+j\\omega L\_{\\text{leak}}  
\]

olarak modellenebilir.

Parazitik kapasitans üst frekansta empedansı sınırlar.

## **12.10 Sonuçlar**

* İdeal cutoff  
* Gerçek −3 dB frekansı  
* Rezonans frekansı  
* Peak gain  
* Peak frequency  
* Hedef gürültü frekansında attenuation  
* Filter output impedance  
* Converter input impedance  
* Empedans oranı  
* Damping yeterliliği  
* İndüktör RMS/peak akımı  
* Kondansatör ripple akımı  
* DCR kaybı  
* Damping resistor kaybı  
* Common-mode ve differential-mode sonuçları

## **12.11 Grafikler**

* Gain / insertion loss  
* Filter output impedance  
* Converter input impedance  
* Dampingli ve dampingsiz karşılaştırma  
* Nominal/min/max komponent toleransı

## **12.12 Test**

\[  
L=10\\text{ µH}  
\]

\[  
C=10\\text{ µF}  
\]

\[  
f\_0\\approx15.915\\text{ kHz}  
\]

\[  
Z\_0=1\\ \\Omega  
\]

---

# **13\. Buck Dönüştürücü PCB Ön Tasarım Aracı**

## **13.1 Kapsam**

Araç, continuous conduction mode çalışan temel buck power stage ön tasarımını yapmalıdır.

Şunları kapsamalıdır:

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

Şunları kapsadığını iddia etmemelidir:

* Kontrol döngüsü kompanzasyonu  
* Subharmonic oscillation  
* Current-mode slope compensation  
* Bootstrap ayrıntıları  
* Minimum on/off time doğrulaması  
* Magnetik core loss’un ayrıntılı Steinmetz modeli  
* EMI compliance

Temel buck power-stage denklemleri üretici uygulama notlarıyla uyumlu kurulmalıdır.

## **13.2 Girdiler**

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
* MOSFET (R\_{DS(on)})  
* High-side ve low-side gate charge  
* Rise/fall time  
* Diode forward voltage  
* Diode reverse recovery charge  
* Dead time  
* Thermal resistance  
* Maximum junction temperature  
* Ambient temperature

## **13.3 Duty cycle**

İdeal:

\[  
D=\\frac{V\_{\\text{out}}}{V\_{\\text{in}}}  
\]

Verim tahminli kaba yaklaşım:

\[  
D\\approx  
\\frac{V\_{\\text{out}}}  
{\\eta V\_{\\text{in}}}  
\]

Bu yaklaşım düşük gerilim ve yüksek akım sistemlerinde MOSFET/diode düşümlerini tam karşılamaz.

## **13.4 İndüktör ripple akımı**

# **\[**

# **\\Delta I\_L**

\\frac{(V\_{\\text{in}}-V\_{\\text{out}})D}  
{Lf\_{sw}}  
\]

Eşdeğer:

# **\[**

# **\\Delta I\_L**

\\frac{V\_{\\text{out}}(1-D)}  
{Lf\_{sw}}  
\]

Hedef ripple’dan gerekli endüktans:

# **\[**

# **L**

\\frac{V\_{\\text{out}}(V\_{\\text{in}}-V\_{\\text{out}})}  
{\\Delta I\_Lf\_{sw}V\_{\\text{in}}}  
\]

Ripple oranı:

\[  
r\_I=  
\\frac{\\Delta I\_L}{I\_{\\text{out}}}  
\]

## **13.5 Peak ve RMS indüktör akımı**

# **\[**

# **I\_{L,\\text{peak}}**

I\_{\\text{out}}  
\+  
\\frac{\\Delta I\_L}{2}  
\]

# **\[**

# **I\_{L,\\text{min}}**

## **I\_{\\text{out}}**

\\frac{\\Delta I\_L}{2}  
\]

# **\[**

# **I\_{L,\\text{RMS}}**

\\sqrt{  
I\_{\\text{out}}^2+  
\\frac{\\Delta I\_L^2}{12}  
}  
\]

CCM sınırı:

# **\[**

# **I\_{\\text{out,boundary}}**

\\frac{\\Delta I\_L}{2}  
\]

## **13.6 Output ripple**

Kapasitif üçgen ripple yaklaşımı:

\[  
\\Delta V\_C  
\\approx  
\\frac{\\Delta I\_L}  
{8f\_{sw}C\_{\\text{out}}}  
\]

ESR ripple:

\[  
\\Delta V\_{\\text{ESR}}  
\\approx  
\\Delta I\_L\\cdot ESR  
\]

Toplam kaba yaklaşım:

\[  
\\Delta V\_{\\text{out}}  
\\approx  
\\Delta V\_C+\\Delta V\_{\\text{ESR}}  
\]

Hedef ripple’dan minimum capacitance:

\[  
C\_{\\text{out,min}}  
\\geq  
\\frac{\\Delta I\_L}  
{8f\_{sw}\\Delta V\_C}  
\]

## **13.7 Input capacitor RMS akımı**

İdeal sabit output current yaklaşımı:

\[  
I\_{CIN,\\text{RMS}}  
\\approx  
I\_{\\text{out}}  
\\sqrt{D(1-D)}  
\]

Maksimum yaklaşık (D=0.5)’te:

\[  
I\_{CIN,\\text{RMS,max}}  
\\approx  
\\frac{I\_{\\text{out}}}{2}  
\]

Ripple terimi dahil gelişmiş model opsiyonel eklenebilir.

## **13.8 MOSFET iletim kaybı**

High-side:

\[  
P\_{\\text{HS,cond}}  
\\approx  
I\_{L,\\text{RMS}}^2  
R\_{DS(on),HS}  
D  
\]

Low-side senkron:

\[  
P\_{\\text{LS,cond}}  
\\approx  
I\_{L,\\text{RMS}}^2  
R\_{DS(on),LS}  
(1-D)  
\]

Sıcak (R\_{DS(on)}) değeri kullanılmalı veya sıcaklık çarpanı girilmelidir.

## **13.9 Switching kaybı**

\[  
P\_{\\text{sw}}  
\\approx  
\\frac{1}{2}  
V\_{\\text{in}}I\_{\\text{out}}  
(t\_r+t\_f)  
f\_{sw}  
\]

Gate loss:

\[  
P\_g=Q\_gV\_gf\_{sw}  
\]

## **13.10 Asenkron diode kaybı**

\[  
I\_{D,\\text{avg}}  
\\approx  
I\_{\\text{out}}(1-D)  
\]

\[  
P\_D  
\\approx  
V\_FI\_{\\text{out}}(1-D)  
\]

Reverse recovery:

\[  
P\_{rr}  
\\approx  
Q\_{rr}V\_{\\text{in}}f\_{sw}  
\]

## **13.11 Dead-time body diode kaybı**

Senkron yapıda:

\[  
P\_{\\text{dead}}  
\\approx  
V\_{F,\\text{body}}  
I\_{\\text{out}}  
t\_{\\text{dead}}  
f\_{sw}  
N\_{\\text{edges}}  
\]

## **13.12 İndüktör kaybı**

Bakır kaybı:

# **\[**

# **P\_{L,\\text{Cu}}**

I\_{L,\\text{RMS}}^2DCR  
\]

Core loss için üretici eğrisi veya Steinmetz katsayıları girilmedikçe kesin hesap yapma.

## **13.13 Termal**

# **\[**

# **T\_J**

T\_A+  
P\_{\\text{device}}\\theta\_{JA}  
\]

Bu basit model PCB bakır alanı, airflow ve çoklu ısı yolu etkilerini tek başına çözmez.

## **13.14 Yerleşim değerlendirmesi**

Kullanıcıdan yaklaşık şu değerleri al:

* Input hot-loop çevresi  
* Switch-node alanı  
* Input capacitor–MOSFET mesafesi  
* Gate-loop uzunluğu  
* Power GND ile signal GND birleşim şekli  
* Feedback hattının switch-node’a mesafesi  
* Güç via sayısı

Geometrik eşiklerin üreticiye bağlı olduğunu belirt. Sonuçta:

* Input capacitor’ı switching pair’e yaklaştır  
* Hot-loop alanını küçült  
* Switch-node copper alanını gereksiz büyütme  
* Feedback hattını switch node’dan uzak tut  
* Gate loop’u kısa tut  
* High di/dt dönüş yolunu bölme

şeklinde bağlama duyarlı öneriler üret.

## **13.15 Grafikler**

* Input voltage’a karşı duty cycle  
* Input voltage’a karşı ripple current  
* İndüktansa karşı peak current  
* Switching frequency’ye karşı switching loss  
* Output current’a karşı toplam yaklaşık kayıp

## **13.16 Test**

\[  
V\_{in}=24\\text{ V}  
\]

\[  
V\_{out}=12\\text{ V}  
\]

\[  
I\_{out}=5\\text{ A}  
\]

\[  
f\_{sw}=200\\text{ kHz}  
\]

\[  
\\Delta I\_L=1.5\\text{ A}  
\]

Beklenen:

\[  
D=0.5  
\]

\[  
L=20\\text{ µH}  
\]

\[  
I\_{L,\\text{peak}}=5.75\\text{ A}  
\]

\[  
I\_{CIN,\\text{RMS}}\\approx2.5\\text{ A}  
\]

50 mV kapasitif ripple için:

\[  
C\_{\\text{out,min}}  
\\approx18.75\\text{ µF}  
\]

---

# **14\. TVS ve ESD Koruma Boyutlandırıcısı**

## **14.1 Amaç**

Araç kullanıcıya parça numarası seçmek yerine gerekli elektriksel sınırları üretmelidir:

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

TVS seçiminde (V\_{RWM}), (V\_{BR}) ve (V\_C) birbirinden ayrılmalı; clamping voltage korunan IC’nin dayanım sınırının altında olmalıdır.

## **14.2 Girdiler**

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
* TVS (V\_{RWM})  
* (V\_{BR})  
* Test current (I\_T)  
* Clamping voltage (V\_C)  
* Clamping current (I\_{PP,\\text{datasheet}})  
* Dynamic resistance  
* Junction capacitance  
* Hat source impedance  
* Sinyal bandwidth  
* PCB bağlantı endüktansı  
* Tahmini (di/dt)  
* Uni-directional / bidirectional

## **14.3 Gerilim sıralaması**

Normal tasarım koşulu:

\[  
V\_{\\text{normal,max}}  
\<  
V\_{RWM}  
\<  
V\_{BR}  
\<  
V\_C  
\]

Ancak (V\_C):

\[  
V\_C\<V\_{\\text{protected,max}}  
\]

koşulunu sağlayabilmelidir.

Bu sıralama tüm transient sistemlerinde tek başına yeterli değildir.

## **14.4 Kaynak sınırlı pulse akımı**

Thevenin surge modeli:

\[  
I\_{PP}  
\\approx  
\\frac{  
V\_{\\text{surge}}-V\_{\\text{clamp}}  
}{  
R\_{\\text{source}}+R\_{\\text{series}}  
}  
\]

Clamping voltage akıma bağlı olduğundan iteratif çözüm uygulanmalıdır.

## **14.5 Dynamic resistance**

Datasheet iki noktası kullanılarak:

\[  
R\_{\\text{dyn}}  
\\approx  
\\frac{  
V\_C-V\_{BR}  
}{  
I\_{PP}-I\_T  
}  
\]

Gerçek akımdaki yaklaşık clamp:

\[  
V\_{\\text{clamp}}  
\\approx  
V\_{BR}  
\+  
R\_{\\text{dyn}}  
(I-I\_T)  
\]

Bu denklem kullanılarak fixed-point veya sınırlandırılmış kök çözümü yap:

## **\[**

## **I=**

## **\\frac{**

## **V\_{\\text{surge}}**

V\_{\\text{clamp}}(I)  
}{  
R\_{\\text{source}}+R\_{\\text{series}}  
}  
\]

## **14.6 Peak pulse power**

# **\[**

# **P\_{\\text{peak}}**

V\_{\\text{clamp}}I\_{PP}  
\]

Pulse energy:

\[  
E=  
\\int v(t)i(t),dt  
\]

Dalga şekli tam verilmemişse kullanıcıya şu seçenekleri sun:

* Dikdörtgen:

\[  
E\\approx V\_CI\_{PP}t\_p  
\]

* Üçgen:

\[  
E\\approx  
\\frac{1}{2}  
V\_CI\_{PP}t\_p  
\]

* Kullanıcı tanımlı waveform katsayısı:

\[  
E\\approx  
K\_wV\_CI\_{PP}t\_p  
\]

## **14.7 Parazitik endüktans**

TVS’nin kendisi uygun olsa bile PCB bağlantısı ek overshoot üretir:

\[  
V\_L=L\_{\\text{path}}\\frac{di}{dt}  
\]

IC üzerinde görülebilecek yaklaşık peak:

\[  
V\_{\\text{IC,peak}}  
\\approx  
V\_{\\text{clamp}}+V\_L  
\]

TVS’nin konnektöre yakın, dönüş yolunun kısa ve geniş olması gerektiğini açıklayan SVG göster.

## **14.8 Veri hattı capacitance etkisi**

TVS junction capacitance ve source impedance için yaklaşık kutup:

\[  
f\_{-3\\text{dB}}  
\\approx  
\\frac{1}  
{2\\pi R\_{\\text{source}}C\_{\\text{TVS}}}  
\]

Differential hatlarda common-mode ve differential capacitance ayrımının gerçek S-parametre analizi gerektirebileceğini belirt.

## **14.9 Uni-directional / bidirectional**

Karar desteği:

* Tek polariteli DC power hattı: unidirectional çoğunlukla avantajlı olabilir.  
* Bipolar analog veya AC sinyal: bidirectional gerekebilir.  
* Diferansiyel bus: bus çalışma common-mode aralığı ve transceiver sınırlarına göre seçilmelidir.  
* Bu seçim otomatik kesin karar olarak verilmemelidir.

## **14.10 Sonuçlar**

* Minimum önerilen (V\_{RWM})  
* Uygun breakdown aralığı  
* İzin verilen maksimum clamp  
* Tahmini pulse current  
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

## **14.11 Grafikler**

* Surge source resistance’a karşı pulse current  
* Pulse current’a karşı clamp voltage  
* Path inductance’a karşı overshoot  
* TVS capacitance’a karşı bandwidth

## **14.12 Test**

\[  
V\_{\\text{surge}}=100\\text{ V}  
\]

\[  
V\_{\\text{clamp}}=33\\text{ V}  
\]

\[  
R\_{\\text{source}}=2\\ \\Omega  
\]

\[  
I\_{PP}=33.5\\text{ A}  
\]

\[  
P\_{\\text{peak}}\\approx1105.5\\text{ W}  
\]

Bu değerin pulse süresinden bağımsız sürekli güç olmadığı açıkça gösterilmelidir.

---

# **15\. Flex PCB Hesaplayıcı**

## **15.1 Amaç**

Araç:

* Flex toplam kalınlığı  
* Copper layer konumu  
* Neutral axis  
* Bend radius  
* Tahmini yüzey strain’i  
* Statik ve dinamik bend ayrımı  
* Trace resistance  
* Voltage drop  
* Güç kaybı  
* Katman sayısına göre üretici bend-radius önerisi  
* Coverlay ve stiffener sınırları

konularında karar desteği vermelidir.

Flex PCB bend radius için tek evrensel sayı kullanılmamalıdır. Örneğin bir üretici kılavuzunda çift katmanlı flex için yaklaşık toplam kalınlığın 12 katı, multilayer flex için 24 katı minimum başlangıç değerleri verilmektedir; dinamik uygulamalar ayrıca değerlendirilmelidir. Bu değerler üretici profili olarak etiketlenmelidir.

## **15.2 Girdiler**

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
* Copper layer’ın neutral axis’e uzaklığı  
* Trace width  
* Trace length  
* Trace sayısı  
* Paralel trace sayısı  
* Current  
* Copper resistivity  
* Sıcaklık  
* Stiffener başlangıç mesafesi  
* Via’nın bend alanına uzaklığı  
* Pad’ın bend alanına uzaklığı  
* Üretici profil seçimi  
* İzin verilen strain  
* Hedef cycle sayısı, yalnız bilgi amaçlı

## **15.3 Bend strain**

Neutral axis biliniyorsa copper strain:

\[  
\\epsilon  
\\approx  
\\frac{y}{R}  
\]

Burada:

* (y): copper’ın neutral axis’e uzaklığı  
* (R): neutral axis bend radius

Neutral axis bilinmiyor ve simetrik yapı varsayılıyorsa dış yüzey:

\[  
\\epsilon\_{\\text{outer}}  
\\approx  
\\frac{t\_{\\text{total}}}{2R}  
\]

Yüzde:

\[  
\\epsilon\_{%}=100\\epsilon  
\]

Bu model:

* Plastik deformasyon  
* Work hardening  
* Adhesive viscoelasticity  
* Copper grain structure  
* Rolled-annealed / electrodeposited copper farkı  
* Tekrarlı fatigue

etkilerini tam olarak modellemez.

## **15.4 İzin verilen strain’den bend radius**

# **\[**

# **R\_{\\min}**

\\frac{y}  
{\\epsilon\_{\\text{allow}}}  
\]

Simetrik dış yüzey yaklaşımı:

# **\[**

# **R\_{\\min}**

\\frac{t\_{\\text{total}}}  
{2\\epsilon\_{\\text{allow}}}  
\]

İzin verilen strain değeri varsayılan sabit olarak gizlice verilmemelidir. Kullanıcı üretici verisi girmeli veya değer “kullanıcı varsayımı” olarak işaretlenmelidir.

## **15.5 Üretici çarpanı**

# **\[**

# **R\_{\\min,\\text{vendor}}**

K\_bt\_{\\text{total}}  
\]

Örnek profil:

* Double-layer static başlangıç: (K\_b=12)  
* Multilayer static başlangıç: (K\_b=24)

Dynamic flex için sabit bir (K\_b) varsayma. Kullanıcının üretici değerini girmesini iste veya model sınırı uyarısı ver.

## **15.6 Bend uzunluğu**

Bend açısı radyan cinsinden:

# **\[**

# **\\theta\_{\\text{rad}}**

\\theta\_{\\deg}  
\\frac{\\pi}{180}  
\]

Neutral-axis arc length:

# **\[**

# **l\_{\\text{bend}}**

R\\theta\_{\\text{rad}}  
\]

Dış ve iç yüzey uzunlukları:

# **\[**

# **l\_{\\text{outer}}**

(R+y)\\theta  
\]

# **\[**

# **l\_{\\text{inner}}**

(R-y)\\theta  
\]

Uzama farkı:

# **\[**

# **\\Delta l**

2y\\theta  
\]

## **15.7 Trace direnci**

Copper area:

\[  
A\_{\\text{Cu}}=wt  
\]

Sıcaklık düzeltilmiş özdirenç:

# **\[**

# **\\rho\_T**

\\rho\_{20}  
\\left\[  
1+\\alpha(T-20)  
\\right\]  
\]

Direnç:

# **\[**

# **R\_{\\text{trace}}**

\\rho\_T  
\\frac{l}{wt}  
\]

Paralel eş trace:

# **\[**

# **R\_{\\text{eq}}**

\\frac{R\_{\\text{trace}}}{N}  
\]

## **15.8 Gerilim düşümü ve güç**

\[  
V\_{\\text{drop}}=IR  
\]

\[  
P\_{\\text{loss}}=I^2R  
\]

Flex trace sıcaklığı yalnızca (I^2R) ile tahmin edilmemelidir. Isı yayılımı, coverlay, hava, rigid bölge ve bonding yapısına bağlıdır.

## **15.9 Tasarım kontrolleri**

Araç şu kontrolleri yapsın:

* Via bend bölgesinin içinde mi?  
* Pad bend bölgesine çok yakın mı?  
* Stiffener bitişi bend başlangıcına çok yakın mı?  
* Trace bend eksenini keskin açıyla mı geçiyor?  
* Keskin trace corner var mı?  
* Copper pour solid mi, hatched mi?  
* Katman geçişi bend alanında mı?  
* Trace genişliği bend bölgesinde ani değişiyor mu?  
* Birden fazla katmandaki trace’ler üst üste mi?  
* Teardrop önerisi gerekli mi?

Üretici eşiği bilinmiyorsa “unknown” sonucu ver; gizli varsayılan üretici limiti oluşturma.

## **15.10 Dynamic flex**

Cycle life için evrensel kapalı form kullanma.

Kullanıcı üreticiden alınmış ampirik model katsayıları girebiliyorsa opsiyonel model:

\[  
N\_f=A\\epsilon^{-b}  
\]

kullanılabilir.

Ancak (A) ve (b) girilmemişse cycle life tahmini üretme.

## **15.11 Sonuçlar**

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

## **15.12 Grafikler**

* Bend radius’a karşı strain  
* Total thickness’a karşı minimum radius  
* Trace width’e karşı resistance  
* Sıcaklığa karşı resistance  
* Vendor factor’a karşı minimum bend radius

## **15.13 Test**

Double-layer flex:

\[  
t=0.2\\text{ mm}  
\]

\[  
K\_b=12  
\]

\[  
R\_{\\min}=2.4\\text{ mm}  
\]

Simetrik neutral-axis kabulüyle ve (R=2.4\\text{ mm}):

# **\[**

# **\\epsilon**

\\frac{0.2}{2\\cdot2.4}  
\\approx0.04167  
\]

\[  
\\epsilon\_{%}\\approx4.17%  
\]

Bu yüksek strain’in gerçek kullanım uygunluğunun copper türü, stack-up ve üretici verisi olmadan belirlenemeyeceğini açıkça göster.

---

# **16\. Ortak Tolerans Sistemi**

Kritik araçlarda üç analiz sun:

* Nominal  
* Worst-case minimum  
* Worst-case maksimum

Tolerans kombinasyonları azsa tüm corner kombinasyonlarını hesapla.

Örneğin:

\[  
C\\in\[C\_{\\min},C\_{\\max}\]  
\]

\[  
ESR\\in\[ESR\_{\\min},ESR\_{\\max}\]  
\]

\[  
ESL\\in\[ESL\_{\\min},ESL\_{\\max}\]  
\]

PDN gibi kombinasyon sayısının hızla arttığı araçlarda:

* Nominal  
* Tüm minimumlar  
* Tüm maksimumlar  
* Seçilmiş kritik corner’lar

hesaplanabilir.

İleri seçenek olarak deterministik seed kullanan Monte Carlo eklenebilir; ancak aynı giriş aynı sonucu üretmelidir.

---

# **17\. Grafik Motoru Kuralları**

Bütün frekans sweep’leri logaritmik olmalıdır:

# **\[**

# **f\_k**

## **10^{**

## **\\log\_{10}(f\_{\\min})**

## **\+**

## **\\frac{k}{N-1}**

## **\\left\[**

## **\\log\_{10}(f\_{\\max})**

\\log\_{10}(f\_{\\min})  
\\right\]  
}  
\]

* İlk ve son nokta mutlaka dahil edilmelidir.  
* NaN ve Infinity grafik verisine gönderilmemelidir.  
* Sweep hesapları saf fonksiyon olmalıdır.  
* Grafik ve rapor aynı sweep kaynağını kullanmalıdır.  
* Veri tablosu mevcut `sampleIndices()` kuralıyla seyreltilmelidir.  
* Logaritmik grafikte sıfır ve negatif değerler açık hata veya “gösterilemez” sonucu üretmelidir.

PDN ve filtre grafiklerinde:

* Frekans ekseni log  
* Empedans ekseni log  
* Faz ayrı grafik veya ikincil görünüm

kullanılabilir.

---

# **18\. Validasyon ve Hata Yönetimi**

Her giriş için:

* Sonlu sayı  
* Fiziksel olarak pozitif değer  
* Mantıklı üst ve alt sınır  
* Birim doğrulaması  
* Birbirleriyle tutarlılık

kontrolü yap.

Örnek hata kodları:

INVALID\_INPUT  
NON\_POSITIVE\_VALUE  
FREQUENCY\_RANGE\_INVALID  
TARGET\_NOT\_REACHABLE  
NEGATIVE\_RESISTANCE\_RESULT  
ACQUISITION\_TIME\_TOO\_SHORT  
BACKDRILL\_EXCEEDS\_BOARD  
RESIDUAL\_STUB\_NEGATIVE  
DRIVER\_CURRENT\_INSUFFICIENT  
ADC\_SETTLING\_FAILED  
BUS\_DELAY\_BUDGET\_EXCEEDED  
BIAS\_TARGET\_NOT\_REACHABLE  
SHUNT\_POWER\_EXCEEDED  
PDN\_SWEEP\_FAILED  
NO\_VALID\_RESONANCE  
FILTER\_UNSTABLE\_RISK  
BUCK\_DUTY\_OUT\_OF\_RANGE  
TVS\_CLAMP\_EXCEEDS\_LIMIT  
FLEX\_VENDOR\_DATA\_REQUIRED  
MODEL\_OUT\_OF\_RANGE

Hata kodlarının Türkçe ve İngilizce karşılığı `text.js` içinde bulunmalıdır.

---

# **19\. Mühendislik Yorum Motoru**

Yorumlar rastgele veya yalnızca sayısal eşiklere bağlı sert hükümler olmamalıdır.

Örnek:

Yanlış:

> Tasarım güvenlidir.

Doğru:

> Hesaplanan via-stub çeyrek dalga rezonansı, seçilen maksimum analiz frekansının 4.2 katıdır. Rezonans çalışma bandının dışında görünmektedir; ancak via geçişinin kapasitif süreksizliği ve pad/antipad geometrisi bu modelde bulunmadığından yüksek hızlı bağlantı için 3D elektromanyetik doğrulama önerilir.

Yanlış:

> 10 nF kondansatör kullan.

Doğru:

> Girilen ESR, ESL ve mounting inductance değerleriyle 10 nF kolunun minimum empedansı yaklaşık 72 MHz civarında oluşmaktadır. Hedef gürültü frekansı 180 MHz olduğundan bu kol o bölgede endüktif davranmaktadır.

Her yorum:

* Hesap sonucuna bağlı  
* Ölçülebilir gerekçeli  
* Model sınırını belirten  
* Kesinlik düzeyini açıklayan

bir yapıda olmalıdır.

---

# **20\. Raporlama**

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

bulunmalıdır.

Ekran ve rapor farklı hesap yapmamalıdır. Aynı `compute()` ve `buildSweep()` sonuçları kullanılmalıdır.

---

# **21\. Test Gereksinimleri**

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

yaz.

Floating-point karşılaştırmalarında sabit string yerine uygun tolerans kullan:

expect(result.value).toBeCloseTo(expected, precision)

Kompleks sweep’lerde birkaç referans frekans noktası doğrulanmalıdır.

---

# **22\. Kaynak ve Model Etiketleri**

Araçlarda kaynak bilgisi şu şekilde sınıflandırılmalıdır:

sourceType:  
\- physical-law  
\- closed-form  
\- first-order-equivalent  
\- manufacturer-guideline  
\- engineering-rule  
\- user-supplied-data  
\- numerical-sweep

Her sonuç grubunda kullanılan kaynak tipi açıkça gösterilmelidir.

Lisanslı IPC veya IEC tablo verilerini repoya kopyalama. Böyle bir veri gerekiyorsa:

* Kullanıcının veri yüklemesini sağla  
* Tarayıcıda sakla  
* Veri yoksa “standart tabanlı doğrulama yapılamadı” sonucu ver  
* Ürün uyumluluğu veya sertifikasyon iddiasında bulunma

---

# **23\. Tamamlanma Kriterleri**

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

Önce repoyu analiz et. Daha sonra her araç için kısa bir uygulama planı çıkar. Uygulamayı paket paket yap:

1. Ortak kompleks sayı ve sweep motorları  
2. Birinci paket hesap motorları  
3. Birinci paket ekranları ve testleri  
4. İkinci paket hesap motorları  
5. İkinci paket ekranları ve testleri  
6. Rapor ve proje kayıt entegrasyonu  
7. Build, test ve regresyon kontrolü

Herhangi bir formül ile mevcut `docs/spec.md` arasında çelişki bulunursa formülü sessizce değiştirme. Çelişkiyi açıkça belirt ve mevcut proje spesifikasyonunu kaynak kabul et.

