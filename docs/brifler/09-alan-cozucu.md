# Brif 09 — 2B alan çözücü fazı (ERTELENDİ — en büyük iş)

**Model/effort:** Fable/Opus 5, high-max. UCUZLATILAMAZ — yanlış sayısal
sonuç sessizce yanlış mühendislik kararı üretir. BU BRİF SPEC DEĞİL.

## Bağlam

docs/spec.md üretim için önerilen empedansın alan çözücüden gelmesini
istiyor (§6.1); bugün kapalı form + "hızlı denklem modu" etiketi.
Kod bu güne hazırlandı: empedans fonksiyonları `{ Z0, epsEff, method }`
döner, arayüz `method`'a bakar — çözücü aynı arayüzün arkasına girince
UI değişmez (CLAUDE.md kuralı).

## Kapsam (o gün ayrıştırılır)

1. Yöntem: 2B FDM/FEM Laplace çözücü (mikrostrip/stripline kesiti),
   kapasitans matrisi → Z0/epsEff; diferansiyel için C11/C12 → §6.8.1
   rotası (bugünkü ampirik kuplaj TAMAMEN değişir, `capacitanceMatrix:
   false` bayrağı kalkar).
2. Nerede koşar: tarayıcıda (WASM/JS, "hesaplar sunucuya gitmez" kuralı
   korunur — güçlü tercih) vs sunucuda (kural kırılır, istenmez).
3. Doğrulama: spec §13 referans değerleri + yayınlanmış benchmark
   kesitleri; tolerans tablosu test olarak yazılır — motor testsiz
   merge edilmez (CLAUDE.md).
4. Crosstalk çok iletkenli model (§7.6) ve FEXT (SI_ERR_NO_FEXT bugün
   sonuç vermeyi reddediyor) aynı altyapıdan beslenir — faz 2.

## Ön koşul

Yok — ama süre olarak en büyük kalem; diğer brifler bitmeden açma.
