# Brif 09 — 2B alan çözücü fazı (EN BÜYÜK İŞ)

**Model/effort:** Fable/Opus 5, high–max. UCUZLATILAMAZ — yanlış sayısal sonuç
sessizce yanlış mühendislik kararı üretir; bir imalat kuponu bu sayıyla basılır.

**Tek oturuma sığmaz.** Üç oturuma bölünmüştür (aşağıda F1/F2/F3); her oturum
kendi doğrulamasıyla kapanır ve `docs/alan-cozucu-karari.md`'yi yazar/genişletir
(desen: `docs/rapor-snapshot-karari.md` — karar, gerekçe, elenen seçenekler).
Karar yazılmadan çözücü kodu yazılmaz.

## Önce oku (sırayla)

1. `CLAUDE.md` — mimari (`pages → components → hooks → lib`), test kuralları,
   hydration kuralı, iki dillilik, "yasak ifade" kuralı.
2. `docs/spec.md` **§6.1–§6.3** (çözücünün tanımı: ∇·(ε∇V)=0, enerji →
   kapasite, mesh/yakınsama), **§6.8.1–6.8.2** (kapasitans matrisi rotası),
   **§6.7** (grounded CPW — kapalı form fazında sunulmaz), **§7.6** (crosstalk
   çok iletkenli model), **§13 Test 1** (microstrip referansı ~49.7 Ω).
3. `web/src/lib/impedance.js` — bugünkü motor. Önemli semboller:
   `METHOD_CLOSED_FORM`, `METHOD_FIELD_SOLVER` (sabit HAZIR, hiç kullanılmadı),
   `METHOD_EMPIRICAL`, `differentialPair()` (satır ~249, `capacitanceMatrix:
   false` bayrağı), `solveWidthForZ0`, `impedanceTolerance`.
4. `web/src/lib/signalIntegrity.js` — `SI_ERR_NO_FEXT`, `SI_METHOD_EMPIRICAL`.
5. `web/src/lib/solve.js` — sınırlandırılmış kök arama; sentez buradan geçer.
6. Ekranlar: `pages/tools/SingleEnded`, `DiffPair`, `Crosstalk`, `Skew` —
   `method` alanına bakan etiketler (`METHOD_NOTE`, `COUPLING_SOURCE_NOTE`).

Kod bu güne HAZIRLANDI: empedans fonksiyonları `{ Z0, epsEff, method }` döner,
arayüz `method`a bakarak etiket basar. Çözücü aynı sözleşmenin arkasına girer;
ekran sözleşmesi değişmez.

## Ön kararlar (bu brifle VERİLDİ — oturum bunları tartışmaz, uygular)

Aşağıdakiler 2026-08-01'de karara bağlandı. Gerekçeler karar dosyasına da
yazılır; oturum içinde yeniden açılmaz, ancak ölçüm bir kararı ÇÜRÜTÜRSE
(bkz. her maddenin ölçüm şartı) karar dosyasına gerekçesiyle yazılıp değişir.

1. **Nerede koşar: TARAYICIDA.** "Hiçbir hesap sunucuya gitmez" kuralı
   (CLAUDE.md) korunur. Sunucu seçeneği ELENDİ: kural kırılır, çevrimdışı
   çalışma (PWA) kırılır, API'ye hesap yüzeyi açılır.
2. **Önce saf JS, WASM değil.** `src/lib/fieldSolver.js` saf, senkron,
   bağımlılıksız. WASM ancak ölçüm gerektirirse (aşağıdaki bütçe aşılıyorsa)
   ve AYRI bir kararla gelir — "yeni bağımlılık eklemeden önce sor" kuralı.
3. **Ayrıklaştırma: düzgün-olmayan (kademeli) dikdörtgen ızgarada FDM,
   5 noktalı şablon**; dielektrik arayüzünde harmonik ortalama. FEM ELENDİ:
   JS'te mesh üreteci ya bağımlılık ya büyük kod demek; §6.3'ün "ince mesh"
   istekleri kademeli ızgarayla karşılanır (iletken köşeleri, dar aralıklar ve
   çift aralığı çevresinde sıklaştırma).
4. **Kapasite çıkarımı spec §6.2 rotası**: enerji integrali `C' = 2U'/V²`;
   aynı geometri vakumla yeniden çözülüp `C'₀`; `εeff = C'/C'₀`,
   `Z₀ = 1/(c·√(C'C'₀))`. İkinci bir yöntem (yük integrali) yalnız İÇ TUTARLILIK
   testi olarak yazılabilir, kullanıcıya giden sayı enerji rotasından.
5. **Diferansiyel: even/odd uyarımla iki çözüm.** Simetri düzlemi even'de
   Neumann, odd'da Dirichlet(0) duvarıdır — alan yarıya iner ve §6.8.1'in
   `C_odd`/`C_even`'i doğrudan çıkar. `C₁₁ = (C_even+C_odd)/2`,
   `C₁₂ = (C_even−C_odd)/2` yalnız raporlama içindir.
6. **Doğrusal sistem çözümü: SOR ile başla, ölç.** Bütçe tutmazsa
   ön-koşullu eşlenik gradyan (yine saf JS) denenir; hangisinin kaldığı ve
   ölçümü karar dosyasına yazılır.
7. **Sınır koşulu: topraklı kutu.** Duvarlar en yakın ilgili boyutun ≥5 katı
   uzakta; duvar mesafesi duyarlılık testiyle doğrulanır (duvarı 2× uzaklaştır,
   Z₀ değişimi yakınsama eşiğinin altında kalmalı).
8. **Yakınsama kapısı §6.3 sözleşmedir**: her sonuç iki ızgara yoğunluğuyla
   üretilir ve `convergence: { coarsePct }` benzeri yapısal alan taşır
   (dilsiz — cümle değil, sayı; metin ekranın `text.js`'inde). `E_Z ≥ %1` ise
   sonuç `warn` durumuyla gösterilir, asla sessizce basılmaz.
9. **Worker bağı hooks katmanında.** `lib/fieldSolver.js` saf ve senkron
   kalır; uzun hesabı ana iş parçacığından çıkaran Web Worker sarmalayıcısı
   `hooks/useFieldSolver.js`'te yaşar (tarayıcı API'si yalnız hooks'ta
   kuralı). İlk render'da çalışmaz — hydration kuralı: sonuç mount'tan sonra
   gelir, kapalı form sonucu o ana kadar ekranda kalır ve etiketi bunu söyler.
10. **Sentez çözücü-döngüsüne SOKULMAZ (F1–F2).** `solveWidthForZ0` kapalı
    formla çözmeye devam eder; alan çözücü bulunan geometriyi TEK SEFER analiz
    edip sonucu ayrıca gösterir ("çözücü doğrulaması" satırı). Her kök adımında
    tam alan çözümü koşturmak bütçeyi patlatır; solver-in-loop ancak F3'te,
    ölçümle açılır.

## Performans bütçesi

Tek analiz (iki ızgara yoğunluğu dahil, vakum çözümüyle birlikte toplam dört
çözüm) orta sınıf bir makinede **< 300 ms** hedefler, 1 s tavandır. Bütçe ve
gerçek ölçüm karar dosyasına yazılır. Aşılıyorsa sıra: ızgara bütçesini gözden
geçir → CG'ye geç → ancak ondan sonra WASM tartışması.

## Doğrulama rejimi (motor testsiz merge edilmez — CLAUDE.md)

Lisanslı tablo/veri REPOYA GİREMEZ; bütün referanslar ya analitik ya spec'ten.

- **Analitik çapa 1 — paralel plaka:** yan duvarlar Neumann yapılıp saçak alanı
  bastırıldığında `C = ε·W/d` makine hassasiyetine yakın çıkmalı (ızgara
  yakınsamasıyla). Çözücünün aritmetiğini tek başına sınar.
- **Analitik çapa 2 — sıfır kalınlıklı simetrik stripline:** konform dönüşümle
  tam çözümü var (eliptik integral; `ellipticK` zaten `impedance.js`'te).
  Çözücü ince ızgarada bu değere < %1 yaklaşmalı.
- **Kapalı form çaprazı:** spec §13 Test 1 (W=0.4, H=0.2, εr=4.2 →
  Z₀≈49.7 Ω, εeff≈3.21) ve Hammerstad–Jensen'in geçerlilik penceresinde birkaç
  nokta; çözücü ile kapalı form arasındaki fark < %2. Fark tablosu test olarak
  yazılır — tolerans SAYIYLA, "yaklaşık tutuyor" diye değil.
- **Yakınsama testi:** ızgara sıklaştıkça hata tekdüze düşer; `E_Z` alanı
  gerçekten hesaplanıyor ve eşiği aşınca `warn` üretiliyor.
- **Simetri/sıra testleri:** aynanın aynısı geometri aynı Z₀; her zaman
  `Z_odd ≤ Z₀ ≤ Z_even` ve `C_odd < C_even`; S → ∞ iken `Z_odd ≈ Z_even ≈ Z₀`
  (kuplajın sönmesi).
- **Duvar duyarlılığı:** kutu 2× büyütülünce sonuç eşiğin altında oynar.

## Oturum planı

### F1 — Çekirdek çözücü + tek uçlu (Fable/Opus 5, high)

1. `docs/alan-cozucu-karari.md`'yi başlat: ön kararları, ızgara stratejisini
   ve ölçüm sonuçlarını yaz.
2. `lib/fieldSolver.js`: geometri tanımı (dikdörtgen iletken, katmanlı
   dielektrik), kademeli ızgara üreteci, FDM kurulumu, SOR, enerji→kapasite,
   iki-yoğunluk yakınsaması. Saf; hata durumunda `{ error: <kod> }` döner,
   cümle döndürmez.
3. Tek uçlu microstrip (gerçek bakır kalınlığı DAHİL — kapalı formun t
   düzeltmesinden daha iyi olmak bu fazın var olma nedeni) ve simetrik/asimetrik
   stripline.
4. Doğrulama rejiminin F1 kalemleri + performans ölçümü.
5. `SingleEnded` ekran bağı: `useFieldSolver` worker kancası; sonuç panelinde
   çözücü satırı `method: METHOD_FIELD_SOLVER` etiketiyle, yakınsama durumu
   `warn` kuralıyla. "Hızlı denklem modu" etiketi kapalı form satırında kalır.
   Metinler iki dilli, `text.js` üzerinden.
6. Commit + push (İngilizce nesir mesaj, git log'daki desen).

### F2 — Diferansiyel matris rotası (Fable/Opus 5, high–max)

1. Even/odd çözümleri, `C_odd`/`C_even` → `Z_odd`/`Z_even`/`Z_diff`
   (§6.8.1'in dört formülü birebir).
2. `differentialPair()`'in çözücü rotası `method: METHOD_FIELD_SOLVER` ve
   `capacitanceMatrix: true` taşır. **Ampirik kuplaj (`couplingFactor`,
   `COUPLING`) çözücü rotası doğrulandıktan sonra sökülür** — spec'e göre
   "bugünkü ampirik kuplaj TAMAMEN değişir". Kapalı form tek uçlu taban
   (`singleMethod`) durur. `COUPLING_SOURCE_NOTE` çözücü sonuçlarında basılmaz.
3. **Grounded CPW açılır** (§6.7 kuralı: bu yapı yalnız çözücü fazında
   sunulur — kapalı form dalı YAZILMAZ). Katalogda yeni ekran değil,
   SingleEnded'e yapı seçeneği olarak; karar dosyasına yazılır.
4. F2 doğrulama kalemleri (sıra/simetri/kuplaj sönmesi) + `DiffPair` ekran bağı.

### F3 — Sinyal bütünlüğü beslemesi + genişletmeler (Opus 5, medium–high)

1. Even/odd `εeff`'ler `Crosstalk` ve `Skew`'e akar: `SI_ERR_NO_FEXT` dalı
   gerçek girdisini bulur — kullanıcı modal εeff'i elle girmek zorunda kalmaz,
   isterse çözücüden alır. §7.6'nın TAM rotası (FFT'li çok iletkenli çözüm)
   bu fazın DA kapsamı değil; istenirse ayrı brif.
2. Geometri genişletmeleri (trapez kesit, solder mask, embedded microstrip)
   ve solver-in-loop sentez — her biri ölçümle ve karar dosyasına yazılarak.

## Değişmez kurallar (oturum başına hatırlatma)

- **Yeni ampirik formül eklenmez.** Kaynağı spec'te olmayan bir denklem kapalı
  formdan gelmiş gibi sunulamaz — çözücünün amacı bu sınıfı SÖKMEK.
- **Türetilemeyen büyüklük uydurulmaz**; çözücü tahmin üretmez, aralıkta çözüm
  yoksa hata döner (`solve.js` sözleşmesiyle aynı ruh).
- Sonuç sunumu: yöntem etiketi, geçerlilik, yakınsama durumu ve mühendislik
  yorumu birlikte (CLAUDE.md "Sonuç sunumu").
- Yasak ifade kuralı çözücü metinlerinde de geçerli (İngilizce dahil).
- `npm test` + `npm run test:e2e` yeşil; yeni saf motorun testleri aynı
  commit'te. Ekran değişen fazlarda tarayıcıda uçtan uca bak (`npm run stack`).

## Ön koşul

Yok — D (sunucu günü) beklenmez. A/B/C/E bitti (2026-08-01); ağaç temiz
başlar.
