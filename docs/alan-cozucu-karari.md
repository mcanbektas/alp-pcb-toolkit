# 2B alan çözücüsü kararı — 2026-08-01 (F1 + F2 + F3)

Brif 09'un üç oturumu. F1 kapsamı: çekirdek elektrostatik çözücü
(`web/src/lib/fieldSolver.js`), tek uçlu microstrip (gerçek bakır kalınlığıyla)
ve simetrik/asimetrik stripline; doğrulama rejiminin F1 kalemleri;
`SingleEnded` ekranına worker üzerinden bağ. F2 kapsamı (§8'den itibaren):
diferansiyel even/odd matris rotası, ampirik kuplajın sökümü, grounded CPW ve
raporlara çözücü satırları. F3 kapsamı (§15'ten itibaren): modal εeff'lerin
Crosstalk ve Skew'e akışı, solver-in-loop sentez.

Bu dosya brifle verilen ön kararları, oturumlarda yapılan ölçümleri ve ölçümün
DEVİRDİĞİ kararları (F1: doğrusal çözücü SOR → PCG; F2: grounded CPW tam alan
→ yarım alan; F3: sentez kök arama stratejisi iki kez) kaydeder.

## 1. Ön kararlar (brifle verildi, uygulandı)

1. **Tarayıcıda koşar.** "Hiçbir hesap sunucuya gitmez" kuralı korunur. Sunucu
   seçeneği elendi: kural kırılır, PWA/çevrimdışı kırılır, API'ye hesap yüzeyi açılır.
2. **Saf JS, WASM yok.** `lib/fieldSolver.js` saf, senkron, bağımlılıksız.
   Ölçülen bütçe (aşağıda) WASM tartışmasını gerektirmedi.
3. **Düzgün-olmayan dikdörtgen ızgarada FDM, 5 noktalı şablon (kutu
   entegrasyonu).** FEM elendi: JS'te mesh üreteci ya bağımlılık ya büyük kod.
   §6.3'ün ince mesh istekleri kademeli ızgarayla karşılanıyor (aşağıda §3).
4. **Kapasite enerji rotasından**: `C' = 2U'/V²`; aynı geometri vakumla yeniden
   çözülüp `εeff = C'/C'₀`, `Z₀ = 1/(c·√(C'C'₀))`. Enerji, ayrıklaştırmanın kendi
   bağ katsayılarıyla toplanır (`U' = ½·Σ g·ΔV²`) — ayrı gradyan kurulmaz, sayı
   çözülen sistemle bire bir tutarlıdır. Yük integrali rotası F1'de yazılmadı.
5. **Diferansiyel even/odd** — F2 kapsamı, bu oturumda dokunulmadı.
6. **Doğrusal çözüm: SOR ile başlandı, ölçüldü, ELENDİ — PCG'ye geçildi.**
   Ayrıntı §4. Brifin öngördüğü sıra buydu ("bütçe tutmazsa ön-koşullu eşlenik
   gradyan"); ölçüm sırayı işletti.
7. **Topraklı kutu.** Duvar mesafesi ölçümle kalibre edildi; stripline'da 5×,
   microstrip'te 15× (ayrıntı §5 — ölçüm 5×'in açık yapıya yetmediğini gösterdi).
8. **Yakınsama kapısı**: her sonuç iki ızgara yoğunluğuyla üretilir; `E_Z`
   `convergence: { coarsePct }` alanında sayı olarak taşınır. Eşik yorumu
   (%0.2 / %1) ekranın işidir; `lib` cümle döndürmez.
9. **Worker bağı hooks katmanında** (`hooks/useFieldSolver.js` +
   `hooks/fieldSolver.worker.js`). İlk render'da çalışmaz; kapalı form sonucu
   ekranda kalır, çözücü satırı mount'tan sonra gelir (hydration kuralı).
10. **Sentez çözücü döngüsüne sokulmadı.** `solveWidthForZ0` kapalı formla çözer;
    çözücü bulunan geometriyi tek sefer analiz edip ayrı satırda gösterir.

## 2. Harmonik ortalama maddesinin akıbeti

Brifin "dielektrik arayüzünde harmonik ortalama" maddesi, bir ızgara bağının iki
malzemeyi KESMESİ durumu içindir. Kurulumda bu durum hiç oluşmaz: bütün malzeme
sınırları (iletken kenarları, dielektrik katman geçişleri) ızgara çizgilerine
bire bir oturtulur. Kutu entegrasyonunda her akı yüzeyi tek malzemenin içinden
geçer; yüzeye paralel iki yarım hücre alan ağırlıklı (paralel yol fiziğine uygun)
toplanır. Harmonik ortalama kodu bu yüzden yazılmadı — karar devrilmedi,
sınırların çizgiye oturtulmasıyla kapsam dışı kaldı. F2'de çizgiye oturtulamayan
bir sınır çıkarsa (ör. eğik/trapez kenar) madde yeniden devreye girer.

## 3. Kademeli ızgara — iki ölçüm, iki düzeltme

### 3.1 Sabit büyüme oranı platoya sokuyor (ölçüldü, düzeltildi)

İlk kurulum komşu hücre oranını sabit (1.4) tutuyordu. Ölçüm: stripline
çapasında hata, yoğunluk 4→64 aralığında %−6.6'dan yalnız %−1.1'e indi ve
platoya girdi; tam eşlenik-dönüşüm çözümüne yakınsamadı. Neden: sabit oranla
kenardan `r` uzaklıktaki hücre boyu `~(oran−1)·r` olur ve yoğunluktan
BAĞIMSIZDIR — iletken kenarı tekilliğinin (E ~ r^(−1/2)) çevresindeki göreli
çözünürlük yoğunlukla hiç artmaz. Düzeltme: oran yoğunluğa bağlandı
(`grow = 1 + 1.2/d`). Aynı çapada hata yoğunlukla düzenli düşmeye başladı
(d=8'de %−0.32, d=16'da %−0.18, duvar etkisi dahil).

Kenar çizgilerinde hücre boyu ayrıca `hFine/8`'e indirilir (`EDGE_ZOOM`).
Ölçüldü: 8→32 büyütmek doğruluğu ancak logaritmik iyileştirip süreyi ~4×
şişiriyor; 8→4 küçültmek ise kapalı form çaprazını %2 sınırının dışına
(u=0.5'te %−2.2) atıyor. 8'de bırakıldı.

### 3.2 Duvar mesafesi: açık yapıda 5× yetmiyor (ölçüldü, karar güncellendi)

Brifin "≥5×" tabanı stripline için fazlasıyla yeter (alan duvara üstel söner;
duvar katkısı ~e^(−πx/b), ölçülemeyecek kadar küçük). AÇIK microstrip'te ise
alan ~1/r² ile söner ve 5× duvar Z₀'ı ölçülür biçimde aşağı çeker. Ölçüm
(u=0.5, t=0, εr=4.2, d=6): duvar çarpanı 5 → %−1.74 toplam hata; 10 → %−0.93;
20 → %−0.67. εeff hatası aynı taramada %−1.4'ten ~%0'a indi — duvar yakınlığı
C/C₀ oranını da bozuyor. Karar: `FS_WALL_FACTOR_OPEN = 15` (microstrip
varsayılanı), stripline 5'te kaldı. "≥5" tabanı korunuyor, açık yapı için
büyütüldü. Kademeli ızgarada ek maliyet küçük (dış hücreler marginle ölçeklenir).
Duvar duyarlılık testi sözleşmesi duruyor: çarpan 2×'e çıkınca Z₀ oynaması
yakınsama eşiğinin altında kalmalı (testte doğrulanıyor).

## 4. Doğrusal çözücü: SOR ELENDİ → Jacobi ön-koşullu CG

Ölçüm (varsayılan yoğunluk, microstrip W=0.4/H=0.2/t=0.035 mm, εr=4.2; kaba
123×81 + ince 177×117 ızgara, dört çözüm):

| Çözücü | Yineleme (kaba+ince) | Süre |
|---|---|---|
| SOR (ω = 2/(1+sin(π/N)) sezgiseli) | ~12 000 + ~8 800 | ~2.3 s |
| Jacobi ön-koşullu CG | ~2 200 + ~1 700 | ~0.29 s |

Neden: kademeli ızgara kenarda ~1 µm, dışta ~1 mm hücre üretir; bu en-boy/boy
oranları sistemi kötü koşullar. SOR'un yineleme sayısı koşul sayısıyla, CG'ninki
karekökÜyle ölçeklenir; tekdüze-ızgara ω sezgiseli de kademeli ızgarada
geçersizleşir. Sistem simetrik pozitif tanımlı (kutu entegrasyonu bakışımlı
katsayı verir), CG'nin şartı hazırdı. SOR kodu tutulmadı; karar #6'nın öngördüğü
yedek yol ana yol oldu. Ek hızlandırıcılar (ölçümle): kaba çözümün inceye
bilinear tohumlanması, vakum çözümünün kaba vakum çözümüyle tohumlanması,
yakınsama kontrolünün 4 yinelemede bir yapılması, durdurma eşiği 1e-7
(1e-9'la sonuç farkı ölçülemedi — enerji, çözümde duraağan olduğu için artık
hatası kapasiteye ikinci dereceden girer).

## 5. Doğrulama ölçümleri (F1 kapanışı, varsayılan yoğunluk d=6/9)

Kapalı form çaprazı (microstrip, t=0; Hammerstad–Jensen penceresi):

| Durum | ΔZ₀ | Δεeff | E_Z |
|---|---|---|---|
| u=2, εr=4.2 (spec §13 Test 1) | %−0.50 | %−0.04 | 0.28 |
| u=0.5, εr=4.2 | %−0.74 | %−0.08 | 0.41 |
| u=5, εr=4.2 | %−0.34 | %+0.15 | 0.15 |
| u=2, εr=2.2 | %−0.53 | %+0.02 | 0.28 |
| u=2, εr=10 | %−0.45 | %−0.14 | 0.28 |

Sözleşme %2 idi; en kötü durum %0.74. t=35 µm'de çözücü 47.45 Ω, kapalı formun
t düzeltmesi 47.51 Ω (fark %−0.14) — gerçek kalınlık geometrisi kapalı form
düzeltmesiyle uyumlu ve artık ondan bağımsız. Stripline eliptik-integral
çapası: d=6'da %−0.71, d=10'da %−0.42 (sözleşme ince ızgarada %1). Paralel
plaka çapası: bağıl hata < 1e-6 (SOR/CG artığı ölçeğinde; "makine hassasiyetine
yakın" kalemi sağlandı). Simetri: aynalanmış asimetrik stripline farkı < %0.05.

Çözücünün kalan sistematik eğilimi hep AŞAĞI yönlü (ayrık slit/köşe modeli
kapasiteyi hafif fazla sayar); işaret bilinir ve E_Z raporuyla birlikte okunur.

## 6. Performans bütçesi

Hedef < 300 ms, tavan 1 s (orta sınıf makine; tek analiz = iki yoğunluk × iki
çözüm = dört çözüm). Ölçüm (M-serisi macbook, Node/vitest): en pahalı F1 durumu
(t=35 µm microstrip, ince ızgara 177×117) **~285 ms**; t=0 microstrip durumları
50–100 ms; stripline durumları 10–50 ms. Tavana güvenlik payı ~3×. WASM
tartışması açılmadı (karar #2 duruyor).

Emniyetler: `NODE_CAP = 150 000` düğüm (aşımı `{ error: 'fs-grid-too-large' }`),
CG yineleme tavanı (aşımı `{ error: 'fs-no-convergence' }`). Çözücü hiçbir hata
durumunda tahmin üretmez.

## 7. F1'de bilerek dışarıda kalanlar

- **Rapor bölümüne çözücü satırı girmedi.** Rapor `r`'den (senkron kapalı form)
  kurulur; çözücü sonucu asenkron gelir. Rapora girmesi F2'de, diferansiyel
  rotayla birlikte ele alınacak — o fazda `differentialPair()`in kendisi çözücü
  rotasına geçtiği için rapor sözleşmesi zaten açılacak. *(F2'de kapandı — §12.)*
- **CPW / grounded CPW yok** (F2 — §6.7 kuralı: grounded CPW yalnız çözücüyle
  sunulur). *(F2'de kapandı — §10.)*
- **Sentez döngüsünde çözücü yok** (karar #10; F3'te ölçümle).
- **Yük integrali iç tutarlılık testi yazılmadı** (karar #4 izin veriyor ama
  gerektirmiyor; enerji rotası çapalarla doğrulandı).

---

# F2 — diferansiyel matris rotası, söküm, grounded CPW (2026-08-01)

## 8. Even/odd rotası: yarım alan, iki uyarım

Spec §6.8.1'in kapasitans matrisi rotası `fieldDifferentialPair()` olarak
yazıldı (karar #5 uygulandı). Çift, simetri düzlemi (x = 0) üzerinden YARIM
alanda çözülür: even uyarımda düzlem doğal Neumann duvarı, odd uyarımda
Dirichlet(0). Kilit gözlem — türetmesi kodda da yorumla duruyor: yarım alanın
bağ enerjisi toplamı (analyzeGrid'in `C`'si, `EPS0·Σg·ΔV²` = `2U_yarım/V²`)
tam yapının `U_full = 2U_yarım` enerjisine eşittir ve V = 1'de hat başına mod
kapasitesinin KENDİSİDİR:

    even: Q₁ = C₁₁ + C₁₂ = C_even = U_full
    odd:  Q₁ = C₁₁ − C₁₂ = C_odd  = U_full

Yani F1'in analyzeGrid'i hiç değişmeden even/odd için yeniden kullanılır;
yalnız `box.left` bayrağı değişir. §6.8.1'in dört formülü birebir:
`Z_odd = 1/(c·√(C_odd·C₀,odd))`, `Z_even = 1/(c·√(C_even·C₀,even))`,
`Z_diff = 2·Z_odd`, `Z_common = Z_even/2`. `C₁₁ = (C_even+C_odd)/2` ve
`C₁₂ = (C_even−C_odd)/2` (Maxwell işaretiyle negatif) yalnız raporlama alanı.

Izgara: x-ekseni simetri düzleminden başlar; düzlem işareti `min(S/2, H+t)/d`
hedef boyla, hat kenarları (S/2 ve S/2+W) kenar tekilliği boyuyla (hFine/8)
işaretlenir. `minFeature` kümesine S/2 eklendi — dar aralıkta alan aralıkta
yoğunlaşıyor (brifin "çift aralığı çevresinde sıklaştırma" maddesi). Duvar
çarpanı tek uçlu kararları izler: microstrip 15×, stripline 5×; ilgili boyut
`max(dikey ölçü, S/2+W)`.

E_Z sözleşmesi: `convergence.coarsePct` iki modun KÖTÜSÜDÜR — kullanıcıya
giden sayı Z_diff olsa da Z_even/Z_common da sunuluyor; eşiğin altındaki bir
mod ötekinin yetersizliğini maskelememeli. Mod başına E_Z `mesh.even/odd`
altında ayrıca taşınır.

Doğrulama (varsayılan yoğunluk, DiffPair varsayılan formu W=S=H=0.2 mm,
t=35 µm, εr=4.2):

- Sıra: Z_odd (55.35) < tek uçlu çözücü Z₀ (67.35) < Z_even (78.23);
  C_odd > C_even; C₁₂ < 0. Mod E_Z'leri: odd %0.16, even %0.11.
- Kuplaj sönmesi: S/H = 20'de Z_odd ≈ Z_even ≈ Z₀ (< %1) ve t=0'da Z_diff,
  kapalı form 2·Z₀'a %−0.78 (sözleşme %2.5).
- Stripline çifti: her iki mod εeff = εr (< 1e−6) — homojen dielektrik çapası.
- Modal ayrışma (FEXT girdisi, F3): microstrip çiftinde εeff_odd = 2.54,
  εeff_even = 3.14 — F1 motorunun veremediği modal hız farkı artık ölçülüyor.
- Duvar duyarlılığı: çarpan 2× → Z_diff oynaması eşiğin altında (testte).

## 9. Ampirik kuplajın sökümü — ekran ve sentez sonuçları

`couplingFactor`, `COUPLING`, `METHOD_EMPIRICAL`, `differentialPair()` ve
`solveSpacingForZdiff()` impedance.js'ten SİLİNDİ (brif F2.2 "çözücü rotası
doğrulandıktan sonra sökülür" — doğrulama §8'deki kalemler). Tarama sonucu:
tek kullanıcı DiffPair modeliydi; Crosstalk, Z_odd/Z_even'i zaten kullanıcıdan
alıyor, sinyal bütünlüğü motoruna bağımlılık yoktu. `COUPLING_SOURCE_NOTE`
çözücü sonuçlarında basılmıyor (brif F2.2); yerine E_Z ve üretici doğrulaması
uyarıları var.

Sökümün üç zorunlu sonucu (üçü de bilinçli, gerekçeli):

1. **DiffPair ana sonucu asenkron.** Çiftin sayıları yalnız çözücüden gelir;
   ilk render'da (hydration kuralı) "hesaplanıyor…" ve kapalı form TEK UÇLU
   taban (Z₀, kuplajsız 2·Z₀ referansı) görünür. `singleMethod` alanı brifin
   dediği gibi kapalı form olarak kalır.
2. **Parametrik grafik kaldırıldı.** Eğri ampirik motordan çiziliyordu;
   kaynağı olmayan bir eğri çözücü sonucunun yanında duramaz. Nokta başına
   alan çözümü (70 nokta × ~350 ms) bütçe dışıdır; kaba yoğunluklu çözücü
   taraması ölçümüyle birlikte F3 adayı. Rapordaki chart alanı null.
3. **Sentez daraldı: yalnız "aralık sabit → genişlik ara".** S'e bağlı senkron
   model kalmadı; W sentezi kuplajsız tohumla çözülür (hedef Z₀ = Z_diff/2,
   `solveWidthForZ0`), bulunan geometriyi çözücü TEK SEFER analiz eder ve
   hedeften gerçek sapma (errPct) çözücü sonucundan gösterilir — kabul sınırı
   dışındaysa danger. "Genişlik sabit → aralık ara" F2'de SUNULMUYOR: aralığı
   veren tek yol çözücünün kök döngüsüne girmesiydi ve karar #10 bunu F3'e,
   ölçüm şartına bağlıyor. Ekran bunu teknik detayda açıkça söylüyor;
   kullanıcı aralığı elle değiştirip çözücü satırını izleyebiliyor.

Eski davranışa göre kayıp değil kazanım: ampirik rota "S'i çözüyor" görünüyordu
ama çözdüğü sayı doğrulanamayan katsayılardan geliyordu. Şimdi sunulan her
sayı ya kapalı form (etiketli taban) ya çözücü.

## 10. Grounded CPW — yarım alan (ölçüm kararı devirdi)

`fieldGroundedCpw()`: orta hat V=1, iki yanda coplanar toprak (hat katmanında,
kalınlık t) ve altta referans düzlemi. Topraklar yanal olarak topraklı kutu
duvarına kadar uzanır — "geniş coplanar toprak" varsayımı; sonlu toprak
genişliği ve stitching via 2B kesitte modellenmez (ekran metni ve geçerlilik
listesi bunu söylüyor). SingleEnded'e dördüncü yapı seçeneği olarak girdi
(katalogda yeni ekran yok — brif F2.3); ideal CPW seçeneği ve onun "alt
düzlemsiz" uyarısı aynen duruyor.

Ölçüm kararı devirdi: tam alan kurulumu 537 ms ölçtü (hedef < 300 ms). Yapı
x = 0 çevresinde simetrik; yarım alan + Neumann duvarıyla çözülüp
`C = 2·C_yarım`, `Z₀ = Z₀,yarım/2` düzeltmesi uygulandı → 254 ms. εeff ve E_Z
oran oldukları için düzeltme gerektirmez.

Doğrulama (W=0.4, S=0.3, H=0.2 mm, εr=4.2): Z₀ = 46.02 Ω, εeff = 2.98,
E_Z %0.11. Limitler: S → 4 mm'de microstrip kapalı formuna %−0.50 yaklaşır
(sözleşme %2); S daraldıkça Z₀ tekdüze düşer; alt düzlem ideal CPW formülünün
Z₀'ını beklendiği gibi aşağı çeker (48.5 Ω vs 84.1 Ω — ideal form kalın
substrat + düzlemsiz varsayar, "ideal form grounded CPW yerine kullanılmaz"
kuralının sayısal gerekçesi). Duvar duyarlılığı testte.

Grounded CPW'de SENTEZ YOK (`REASON_SOLVER_ONLY`): kapalı form yok,
solver-in-loop F3. Ekran sentez modunda gerekçeli açıklama basıyor. Kapalı
form dalı YAZILMADI — §6.7 kuralı korunuyor; formül panelinde denklem değil
çözücü rotası anlatılıyor.

## 11. Worker sözleşmesi genişledi

`useFieldSolver` parametresi `{ kind: 'single'|'pair'|'gcpw', structure, W,
S, height, t, epsR }` oldu; iş anahtarına `kind` ve `S` eklendi. İş seçimi
worker'da (`fieldSolver.worker.js`), parametre üretimi modellerde
(`r.solverParams`) — ekranlar worker sözleşmesini bilmez. Debounce ve bayat
iş ayıklama F1'deki gibi.

## 12. Rapor sözleşmesi: çözücü satırları girdi (F1 §7 kapanışı)

`buildReportSection` iki ekranda da `fs` (çözücünün bitmiş, hatasız sonucu)
alır. İndirme anında çözüm sürüyorsa çözücü satırları rapora GİRMEZ; grounded
CPW'de ve DiffPair analizinde büyük sonuç o durumda "hesaplanıyor…" değeriyle
kalır — rapor sayı uydurmaz. Yorumlar (notes) ekranla aynı `commentary(r,
solver)` kaynağından, rapor anındaki çözücü durumu zarfa sarılarak üretilir.

## 13. Performans (F2 ölçümleri, M-serisi macbook, Node/vitest)

| İş | Süre | Izgara (ince) |
|---|---|---|
| fieldDifferentialPair, W=S=H=0.2 mm, t=35 µm (8 çözüm) | ~350 ms | 135×115 ×2 mod |
| fieldGroundedCpw, t=35 µm (4 çözüm, yarım alan) | ~254 ms | 148×117 |
| fieldGroundedCpw tam alan (ELENDİ) | ~537 ms | 297×117 |

Çift 300 ms hedefinin üstünde, 1 s tavanının altında; en pahalı durum bu
(t'li microstrip çifti, iki mod × iki yoğunluk × dielektrik+vakum = 8 çözüm).
Tavana pay ~3×. WASM tartışması yine açılmadı (karar #2 duruyor).

## 14. F2'de bilerek dışarıda kalanlar

- **Aralık (S) sentezi ve solver-in-loop** — F3, ölçümle (karar #10; §9.3).
  *(F3'te açıldı — §16.)*
- **Çözücü tabanlı parametrik tarama grafiği** — F3 adayı, bütçe ölçümüyle (§9.2).
- **Modal εeff'lerin Crosstalk/Skew'e otomatik akışı** — F3.1; çözücü değerleri
  veriyor, kullanıcı şimdilik elle taşıyor (ekran yorumu yol gösteriyor).
  *(F3'te kapandı — §15.)*
- **Asimetrik diferansiyel stripline, coplanar diferansiyel çift** — F3.2
  geometri genişletmeleri; çift F2'de simetrik (`(b−t)/2` yerleşimi) çözülür.
- **Yarım alan optimizasyonu tek uçlu yapılara uygulanmadı** — tek uçlu
  microstrip/stripline simetrik ama F1 ölçümleri bütçede; dokunulmadı.

---

# F3 — sinyal bütünlüğü beslemesi ve solver-in-loop sentez (2026-08-01)

## 15. Modal εeff'ler Crosstalk ve Skew'e akıyor (brif F3.1)

`SI_ERR_NO_FEXT` dalı gerçek girdisini buldu; kullanıcı modal εeff'i elle
girmek zorunda değil. İki ekran iki farklı noktadan bağlandı, ikisinde de
çözücü worker'da koşar ve sonuç gelene kadar ekran "hesaplanıyor" durumunu
gösterir — sayı uydurulmaz:

- **Crosstalk — FEXT kaynağı üç durumlu oldu** (`off` / `elle` / `çözücüden`).
  Çözücü seçeneği yeni geometri ekranı açmaz: W ve S zaten ekranda (3W
  kontrolünün girdileri — kestirim ile çözücü AYNI çifti görür), yalnız düşey
  yığın (yapı, H, t, εr) eklenir. `fieldDifferentialPair` zarfından
  `epsEffOdd/Even` FEXT'e akar; E_Z ve model etiketi tabloya/rapora girer.
  **Tutarlılık bekçisi:** çözücü aynı çift için Z_odd/Z_even de bulduğundan,
  kullanıcının K_b için elle girdiği Z'lerle karşılaştırılır; > %10 sapma
  uyarı üretir (varsayılan form değerleri kasıtlı olarak bu uyarıyı tetikler —
  58/45 girilmişken çözücü 72.6/62.0 ölçer, kullanıcı tutarsızlığı görür).
- **Skew — εeff kaynağına üçüncü seçenek: "alan çözücüden (çift)".**
  `lib/epsEff.js`'e `EPS_SOLVER` kaynağı eklendi; ortak bileşen
  (`EpsEffFields`) bu kaynağı yalnız `solver` prop'u geçen ekranda sunar —
  useFieldSolver bağını kurmayan ekran bu kaynağı gösteremez. Kullanılan
  değer ODD mod εeff'idir: diferansiyel işaret odd modda yayılır; even değeri,
  Z_odd/Z_even ve E_Z zarfta taşınır ve sonuç satırlarında görünür
  (`epsEffRows` EPS_SOLVER dalı). `resolveEpsEff` çözücü SONUCUNU parametre
  alır, kendisi çözmez (saf katman senkron kalır); sonuç yokken
  `{ pending: true }` döner ve ekran `REASON_EPS_PENDING` gösterir.
- **Bayat metinler düzeltildi.** F2 öncesinden kalan "bu değerler diferansiyel
  çift ekranından ALINAMAZ" ve "alan çözücü olmadığı için hiçbir adımı
  yapılamıyor" iddiaları artık yanlıştı; Crosstalk metinleri çözücünün var
  olduğu, uygulanmayan kısmın yalnız FFT'li çok iletkenli dalga biçimi rotası
  olduğu gerçeğine göre yeniden yazıldı. §7.6'nın TAM rotası F3.1'in de
  kapsamı değil — istenirse ayrı brif (brifin kendi sınırı).

## 16. Solver-in-loop sentez (brif F3.2; karar #10 ölçümle açıldı)

İki sentez, kök aramayı ÇÖZÜCÜNÜN İÇİNDE koşturur (worker'da):
`fieldSolveSpacingForZdiff` (DiffPair "genişliği sabitle → aralığı bul") ve
`fieldSolveGcpwWidthForZ0` (grounded CPW sentezi — F2'nin `REASON_SOLVER_ONLY`
reddi kalktı). İki kısaltma bütçeyi taşınır kıldı:

1. **Yalnız gereken uyarım, yalnız ince yoğunluk.** Z_diff = 2·Z_odd
   olduğundan aramada even mod hiç çözülmez; iki-yoğunluk yakınsaması da
   aranmaz. Arama İNCE yoğunlukta koşar: kök, kapanış analizinin kendi
   ızgarasında bulunur ve kapanış Z'si hedefe kök toleransı içinde oturur
   (ölçüldü: Zdiff = 100.00 / Z0 = 50.00 — sapma < %0.001).
2. **Ilık başlangıç:** her değerlendirme bir önceki adayın potansiyel
   alanıyla tohumlanır (`seedFromCoarse` farklı ızgaralar arasında bilinear
   aktarır); ardışık adaylar yakın olduğundan CG yinelemesi düşer.

**Ölçüm iki kez karar devirdi.** İlk kurulum `solveBounded`/`expandBracket`
idi: ulaşılamayan hedefte aralık, adımı ~yüzlerce ms'lik alan çözümü olan
F ile adım adım yürünüyordu — ~20 s (ELENDİ). İkinci kurulum aralığın iki
ucundan Brent'ti: en pahalı değerlendirmeler tam da uçlarda (çok ince ızgara /
çok büyük alan) yaşadığından mutlu yol bile ~8 s'ye çıktı (ELENDİ). Kalan yol
`directedRoot`: monotonluk fiziktir (Z_diff aralıkla artar, gcpw Z₀ genişlikle
düşer); x0'dan yalnız kökün olduğu yöne 1.8 çarpanıyla yürünür, köşeleme
bulununca Brent dar aralıkta koşar. Çift tarafında ayrıca ücretsiz ön kontrol:
Z_diff kuplajsız 2·Z₀ platosuna doyar ve kapalı form tek uçlu Z₀ platoyu ~%2
içinde verir — hedef 2·Z₀·1.08 üstündeyse tek alan çözümü koşmadan
`no-solution` (kod bilerek `IMP_ERR_NO_SOLUTION` ile aynı dize; ekranların
mevcut nedeni iki motor için de çalışır).

| İş | Süre | Değerlendirme |
|---|---|---|
| Aralık sentezi, hedef 100 Ω (varsayılan form) | ~1.1 s | 8 |
| gcpw genişlik sentezi, hedef 50 Ω | ~1.7 s | 7 |
| Ulaşılamayan Z_diff hedefi (ön kontrol) | ~0 ms | 0 |
| Ulaşılamayan gcpw hedefi (yönlü yürüyüş) | ~2.4 s | ~7 |

Arama aralıkları fiziksel bölgeye kapatıldı ve gerekçeleri kodda: çiftte
S ∈ [H/100, 20·H] (altı üretim dışı ve ızgarayı aşırı inceltiyor; üstü
kuplajsız plato — platoda kök yok), gcpw'de W ∈ [H/50, 30·H]. Kök toleransı
H·10⁻³ — ızgara çözünürlüğünün altı, µm-altı hassasiyet fiziksel olarak
anlamsız. Zarf `search: { evals, iterations, density }` taşır; ekran teknik
detayda gösterir, kapanış tam analizi E_Z ile birlikte tabloya gider.

Worker sözleşmesine iki iş türü eklendi: `pair-spacing` ve `gcpw-width`
(`target` parametresiyle). DiffPair sentezi yine iki dallıdır ve ikisi ayrı
rotadır: "aralığı sabitle → genişliği bul" F2'nin kuplajsız tohum + tek
seferlik doğrulama rotasında kaldı (hızlı, senkron tohum); "genişliği
sabitle → aralığı bul" çözücü içinde kök aramadır.

## 17. Geometri genişletmeleri: trapez, solder mask, gömülü microstrip (brif F3.2)

Üçü de `fieldMicrostrip`'e seçenek olarak girdi ve üçü de eksene hizalı
bölgelerle kurulur — malzeme sınırları yine ızgara çizgilerine oturur,
§2'deki harmonik ortalama maddesi F3'te de devreye girmedi:

- **Trapez kesit (`dTop`):** taban W, üst W−dTop. Yamuk, kalınlığı N basamağa
  bölünmüş eksene hizalı dikdörtgen iletkenler olarak çözülür; basamak
  kenarları ve katman sınırları ızgara işaretidir. N yoğunlukla ölçeklenir
  (kaba/ince farklı N) — basamaklama hatası böylece E_Z'ye GİRER, gizlenmez.
  Ölçüm: alan taban köşelerinde yoğunlaştığı için yamuk "ortalama genişlik"
  sezgisinden çok TABAN genişliğine yakın davranır (W=0.4, dTop=0.08 mm:
  yamuk 48.59 Ω; taban dikdörtgeni 47.45, ortalama-genişlik dikdörtgeni
  50.36). Test bu yüzden sezgisel eşdeğere değil, kesin kapsama sandviçine
  bağlandı: Z(taban-dikdörtgen) < Z(yamuk) < Z(üst-dikdörtgen).
- **Solder mask (`cover: { type:'mask', t, epsR }`):** yüzeyde tm kalınlığında
  şerit + hat zarfının tm payıyla kaplanması (kenar duvarlar ve üst); trapezde
  aşındırılmış köşeler de zarf içinde kaldığı için mask ile dolar — konformal
  kaplama yaklaşımı. Sınama çapası: εr=1 mask, maskesizle < %0.5 örtüşür.
  Yön testleri: mask Z₀'ı düşürür, kalınlaştıkça etki tekdüze büyür.
- **Gömülü microstrip (`cover: { type:'embedded', h }`):** dielektrik hat
  üstünde h'ye kadar devam eder (aynı εr — üretimde tipik laminasyon; ayrı
  örtü εr'si istenirse küçük ek), üstü hava. h > t şart (hat tümüyle gömülü).
  Limit testi: derin gömmede εeff homojen sınıra yaklaşır ama aşmaz
  (h = 10·H'de εeff > 0.9·εr, < εr).

**Ekran kapsamı (kayıtlı karar):** seçenekler yalnız `SingleEnded`
microstrip'te ("Bakır kesiti", "Üst dielektrik") ve yalnız ÇÖZÜCÜ rotasına
biner. Kapalı form ana sayı dikdörtgen/açık-yüzey varsayımıyla kalır; seçenek
aktifken ekran "kapalı formdan fark" sapmasının beklendiğini ve esas sonucun
çözücü satırı olduğunu söyler. Bayat geçerlilik maddesi ("solder mask ve
trapez modelde yoktur") kapalı forma daraltılarak düzeltildi. Çift ve gcpw'ye
taşınmaları istenirse ayrı iş — kuruluma seçenek geçirmek yeter, ekran/metin
işi baskın.

## 18. F3'te bilerek dışarıda kalanlar

- **Çözücü tabanlı parametrik tarama grafiği** — durum §14'teki gibi.
- **§7.6 TAM çok iletkenli rota (FFT'li dalga biçimi)** — brifin kendi
  sınırı: F3 kapsamı değil, istenirse ayrı brif.
- **Skew farklı-katman εeff,N için çözücü kaynağı** — N hattı ayrı bir
  geometri; ikinci bir çözücü bağı gerektirir. Elle giriş duruyor; istenirse
  küçük bir ek.
- **Geometri seçeneklerinin çifte/gcpw'ye taşınması ve mask/gömülü için ayrı
  örtü εr'si** — §17'deki kapsam kararı; istenirse küçük ekler.
- **Trapez/mask/gömülü sentez etkileşimi** — sentez kök araması kapalı form
  tohumuyla dikdörtgen varsayar; geometri ayrıntıları yalnız analiz
  rotasında. Solver-in-loop genişlik sentezine seçenek geçirmek istenirse
  küçük bir ek (aynı kurulum fonksiyonu).
