# 2B alan çözücüsü kararı — 2026-08-01 (F1)

Brif 09'un F1 oturumu. Kapsam: çekirdek elektrostatik çözücü (`web/src/lib/fieldSolver.js`),
tek uçlu microstrip (gerçek bakır kalınlığıyla) ve simetrik/asimetrik stripline;
doğrulama rejiminin F1 kalemleri; `SingleEnded` ekranına worker üzerinden bağ.
Diferansiyel (even/odd) rota F2'de, sinyal bütünlüğü beslemesi F3'te.

Bu dosya brifle verilen ön kararları, oturumda yapılan ölçümleri ve ölçümün
DEVİRDİĞİ tek kararı (doğrusal çözücü: SOR → PCG) kaydeder.

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
  rotasına geçtiği için rapor sözleşmesi zaten açılacak.
- **CPW / grounded CPW yok** (F2 — §6.7 kuralı: grounded CPW yalnız çözücüyle sunulur).
- **Sentez döngüsünde çözücü yok** (karar #10; F3'te ölçümle).
- **Yük integrali iç tutarlılık testi yazılmadı** (karar #4 izin veriyor ama
  gerektirmiyor; enerji rotası çapalarla doğrulandı).
