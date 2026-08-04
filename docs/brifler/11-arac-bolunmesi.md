# Brif 11 — Araç bölünmesi: SMD sökümü + iki birleşik ekranın ayrılması

**Model/effort:** Sonnet 5, ultracode (kullanılamıyorsa max)

Motorlar `src/lib/`de zaten ayrı dosyalarda (`timing.js`, `crystal.js`, `ohm.js`,
`led.js`, `reactance.js`, `codes.js`) — bu brif motor YAZDIRMAZ. İş, ekran/katalog/
rapor/test katmanının yeniden dağıtımıdır: mekanik ama çok dosyalı ve birbirine bağlı.

## Sorun

Üç ekran kapsam olarak yanlış kesilmiş:

1. **`pages/tools/ResistorCode/`** — direnç renk koduyla birlikte SMD kod çözücü de
   taşıyor (`model.js` → `KIND_SMD`, `CODE_VARIANT_SMD_SHAPE`; `index.jsx` 22/131/230
   civarı SMD dalları; başlık "Direnç ve SMD Kod Çözücü"). SMD bölümü İSTENMİYOR,
   tamamen silinecek.
2. **`pages/tools/TimingCrystal/`** (id `rc-crystal`) — RC/RL zaman sabiti ile kristal
   yük kapasitansı tek ekranda (`model.js` → `TOOL_RC` / `TOOL_CRYSTAL` alt-araç
   anahtarı). İkiye ayrılacak: **RC/RL ayrı araç, kristal ayrı araç.**
3. **`pages/tools/LedOhmRlc/`** (id `led-ohm-rlc`) — üç alt araç tek ekranda
   (`TOOL_OHM` / `TOOL_LED` / `TOOL_RLC`). Üçe ayrılacak:
   - **Ohm kanunu + seri/paralel direnç birleşimi** tek araç (`ohm.js`:
     `ohmsLaw`, `seriesResistance`, `parallelResistance`)
   - **LED** tek araç — LED seri direnci + parlaklık/akım grafiği dahil mevcut LED
     alt-aracının NE VARSA hepsi taşınır; yeni özellik eklenmez (`led.js`)
   - **RLC** tek araç — rezonans/reaktans (`reactance.js`)

Sonuç: 29 araç → 32 araç (2 birleşik ekran gider, 5 ayrı ekran gelir).

## Kararlar (burada verildi, oturumda yeniden tartışılmaz)

- **Kimlikler ve yollar** — mevcut `categories.js` adlandırma düzenine uy; önerilen:

  | id (`toolKey`) | path (tr, kanonik) | slugEn | name.tr |
  |---|---|---|---|
  | `resistor-code` (değişmez) | mevcut path değişmez | mevcut değişmez | "Direnç Renk Kodu" |
  | `rc-rl` | `/arac/rc-rl-zaman-sabiti` | `rc-rl-time-constant` | "RC / RL Zaman Sabiti" |
  | `crystal-load` | `/arac/kristal-yuk-kapasitansi` | `crystal-load-capacitance` | "Kristal Yük Kapasitansı" |
  | `ohm-law` | `/arac/ohm-kanunu` | `ohms-law` | "Ohm Kanunu ve Seri/Paralel Direnç" |
  | `led-resistor` | `/arac/led-direnci` | `led-resistor` | "LED Seri Direnci" |
  | `rlc-resonance` | `/arac/rlc-rezonans` | `rlc-resonance` | "RLC Rezonans" |

  `name.en` karşılıkları ekranın `h1`'iyle birebir aynı yazılır (katalog kuralı).
  Yeni araçlar eski birleşik araçların kategorisinde, aynı sırada durur.
- **Eski slug'lara yönlendirme EKLENMEZ.** Site henüz yayında değil (sunucu günü =
  Brif 06 bekliyor); `rc-crystal` ve `led-ohm-rlc` yolları tamamen kalkar.
  `main.jsx`teki eski `#/arac/...` yönlendiricisine dokunulmaz.
- **Kayıt göçü YOK.** `toolKey` değiştiği için eski `rc-crystal` / `led-ohm-rlc`
  kayıtları proje listesinde ham anahtar gösterir — yalnız yerel geliştirme verisi,
  kabul; istenirse yerel DB'den elle silinir. Sunucu tarafına dokunulmaz.
- **SMD sökümü yalnızca UI'dır, `lib/codes.js`'e İNMEZ.** `decodeSmd`,
  `EIA96_MULTIPLIERS`, `CODE_VARIANT_SMD_SHAPE`, `CODE_VARIANT_EIA96_*` ve
  `codes.test.js`'teki tamamı (SMD describe bloğu dahil) **DOKUNULMADAN kalır**.
  Doğrulandı: `docs/spec.md` §13 Test 5'in birebir kaynağı `codes.test.js`
  satır 11-18'deki `decodeSmd('472') → 4700 Ω, kind '3-digit'` testidir — spec'in
  "direnç kodu" referans testi renk bandı değil, SMD sayısal kod çözücüdür.
  CLAUDE.md'nin "motor testsiz merge edilmez" kuralı bu testi ekrandan bağımsız
  kılar; UI'dan kaldırmak testi de motoru da silme gerekçesi DEĞİLDİR.
  Silinecek olan yalnız `ResistorCode/model.js`'teki `KIND_SMD` dalı ve
  `index.jsx`/`schematic.jsx`/`text.js`/`report.js`teki ona bağlı JSX/metin/rapor
  satırlarıdır — `codes.js`den import ettikleri kalan `KIND_COLOR`/`KIND_CAP`
  dallarını etkilemez.
- **Yeni ampirik formül / yeni özellik yok.** Bölünme davranış korur: her alt aracın
  bugünkü alanları, grafikleri, yorumları ve rapor satırları kendi yeni ekranına
  birebir taşınır.

## Çözüm

### A — ResistorCode'dan SMD sökümü (yalnız UI katmanı, küçük)

`lib/codes.js` ve `lib/codes.test.js`'e DOKUNULMAZ (yukarıdaki karara bkz.).

1. `model.js`: `KIND_SMD` ve `KINDS` dizisindeki karşılığı gider (`KIND_COLOR`,
   `KIND_CAP` kalır — iki seçenekli seçici olarak devam eder, TEK seçenekli
   düşmez). `INITIAL_FORM`'daki `smd`/`smdProfile` alanları gider. `codes.js`den
   `decodeSmd` importu kalkar (`decodeColorBands`, `decodeCapacitor` vb. kalır).
2. `index.jsx`: `KIND_SMD` render dalı (TextField `smd` + SelectField
   `smdProfile`), sonuç panelindeki SMD satırları (`table.smdKind`,
   `table.baseTimesMultiplier`) silinir.
3. `schematic.jsx`: `SmdBody` bileşeni ve `KIND_SMD` render dalı silinir; kalan
   dallanma `kind === KIND_COLOR ? … : …` (yalnız renk/kondansatör) olur.
4. `text.js`: `kindLabel[KIND_SMD]`, `smdKindLabel`, `fields.smd`/`fields.smdProfile`,
   `table.smdKind`/`table.baseTimesMultiplier`, `schematic.captionSmd`,
   SMD'ye özgü `codeErrorText` dalları (`CODE_VARIANT_SMD_SHAPE`,
   `CODE_VARIANT_EIA96_*` case'leri — import da kalkar), `commentary()`'deki
   `r.kind === KIND_SMD && r.aliasUsed` bloğu silinir. Başlık iki dilde
   güncellenir: "Direnç Renk Kodu" / "Resistor Color Code" (SMD ibaresi çıkar);
   `intro` metninden "SMD kodlarını" ifadesi çıkar.
5. `report.js`: `kindInputs()`'teki `KIND_SMD` dalı, `coreResults()`'teki
   `r.kind === KIND_SMD` bloğu silinir.
6. `report.test.js`: "SMD modunda kod türü sonuçlarda görünür" testi silinir.
7. `categories.js`: `resistor-code` kaydının `name.tr`/`name.en` "Direnç Renk
   Kodu" / "Resistor Color Code" olur (SMD ibaresi çıkar), `path`/`slugEn`
   AYNEN kalır (kimlik değişmiyor). Kategori `desc`'indeki "SMD kodları" ibaresi
   kalabilir (kategori genel açıklaması, tek araca bağlı değil) — dokunulmasa
   da olur.
8. Kontrol: `grep -rin "smd" web/src/pages/tools/ResistorCode` boş dönmeli;
   `grep -rin "smd" web/src/lib/codes.js web/src/lib/codes.test.js` DEĞİŞMEMİŞ
   olmalı (adım 8 bunu bozmamak için, silmek için değil).

### B — TimingCrystal → iki araç

Kaynak: `pages/tools/TimingCrystal/{model,index,schematic,text,report}.js(x)`.
`TOOLS = [TOOL_RC, TOOL_RL, TOOL_CRYSTAL]`; kullanıcının kararı "RC/RL bir arada,
kristal ayrı" — TOOL_RC ile TOOL_RL AYRILMAZ, ikisi birlikte RcRl ekranına gider.

**`pages/tools/RcRl/`** (id `rc-rl`) — TOOL_RC + TOOL_RL kalır, TOOL_CRYSTAL
tamamen gider:
- `model.js`: `TOOLS = [TOOL_RC, TOOL_RL]`; `formFields`/`compute`/`buildSweep`
  içindeki `TOOL_CRYSTAL` dalları (crystal alanları, `computeCrystal`) silinir.
  `INITIAL_FORM`den `CL, C1, C2, Cin, Cout, Cstray, fXtal, fXtalu` gider.
  **"Hesap" SelectField KALIR** (iki seçenek: RC / RL) — tek seçeneğe düşmüyor.
  Segmented mod (Analiz/Sentez) aynen kalır.
- `index.jsx`: `f.tool === TOOL_CRYSTAL` dalı ve crystal alan grubu (CL/C1/C2/
  Cstray/Cin/Cout/fXtal `NumberField`leri) silinir; `isTiming` değişkeni gereksiz
  hale gelir (her zaman true) — kaldırılıp doğrudan timing JSX'i basılır.
- `schematic.jsx`: `CrystalCircuit` fonksiyonu ve `isCrystal` dallanması silinir;
  `TimingSchematic` doğrudan `TimingCircuit`'i basar, viewBox sabit `0 0 260 132`.
- `text.js`: `toolLabel`/`modeLabel`/`fields`/`fieldLabels`/`formula`/`validity`/
  `chart`/`schematic.caption`/`detail` içindeki `TOOL_CRYSTAL` girdileri,
  `reasonText`'teki `REASON_STRAY`/`REASON_PIN` case'leri (crystal'a özgü),
  `commentary()`'nin `r.tool === TOOL_CRYSTAL` dalı silinir. Başlık: "RC/RL Zaman
  Sabiti" / "RC/RL Time Constant"; `intro`'dan kristal cümlesi çıkar.
- `report.js`: `bigResult`/`crystalResults` crystal dalları, `chartSection`
  crystal-özel kısmı gider (yalnız `timingResults` kalır, doğrudan çağrılır).
- `report.test.js`: crystal test case'leri (5 adet: analiz/sentez/parazitik aşımı)
  silinir; RC/RL testleri kalır.
- `SaveToProject`/`useSavedCalculation` `toolKey="rc-rl"`.

**`pages/tools/CrystalLoad/`** (id `crystal-load`) — yalnız TOOL_CRYSTAL:
- `model.js`: `TOOLS` dizisi ve `TOOL_RC`/`TOOL_RL` dalları (`computeRc`,
  `computeRl`, `timingResult`) gider. **"Hesap" SelectField'in KENDİSİ gider**
  (tek seçenek kalıyor — VoltageDivider/TraceWidth deseninde olduğu gibi
  vestigial tek-seçenekli seçici bırakılmaz); `f.tool` state alanı ve
  `INITIAL_FORM.tool` silinir, `compute()`/`formFields()` imzasından `tool`
  parametresi düşer (yalnız `mode` kalır). `buildSweep` sonucundaki
  `kind: TOOL_CRYSTAL` etiketi iç raporlama için kalabilir (`text.chart[kind]`
  anahtarlaması için) ama dışa seçici olarak sunulmaz. Segmented mod
  (Analiz/Sentez) aynen kalır.
- `index.jsx`: `SelectField` (Hesap) JSX'i kalkar; `isTiming` her zaman false
  olduğundan crystal JSX doğrudan basılır, `f.tool === TOOL_CRYSTAL` koşulları
  düşer.
- `schematic.jsx`: `TimingCircuit` fonksiyonu ve `isCrystal` dallanması gider;
  `CrystalSchematic` doğrudan `CrystalCircuit`'i basar, viewBox sabit
  `0 0 260 162`.
- `text.js`: RC/RL'ye özgü tüm anahtarlar (`toolLabel[TOOL_RC/TOOL_RL]`,
  `modeLabel[TOOL_RC/TOOL_RL]`, `fields.R/C/L/targetTau`, `fieldLabels.R/C/L/
  targetTau`, `formula[TOOL_RC/TOOL_RL]`, `validity[TOOL_RC/TOOL_RL]`,
  `chart[TOOL_RC/TOOL_RL]`, `schematic.caption[TOOL_RC/TOOL_RL]`,
  `commentary()`'nin RC/RL dalı, `detail.tauSource/supply/solved/
  seriesEquivalent/slope` — yalnız crystal'a ait kalanlar) silinir. `toolLabel`
  ve `modeGroup` gibi artık kullanılmayan üst-seviye anahtarlar (tool seçicisi
  kalktığı için) da kaldırılır. Başlık: "Kristal Yük Kapasitesi" /
  "Crystal Load Capacitance"; `intro` yalnız kristali anlatır.
- `report.js`: yalnız `crystalResults` + crystal `chartSection` kalır,
  `bigResult`'taki RC/RL dalı gider.
- `report.test.js`: RC/RL test case'leri (5 adet) silinir; crystal testleri kalır.
- `SaveToProject`/`useSavedCalculation` `toolKey="crystal-load"`.

**Ortak adımlar:**
1. `App.jsx`: `TimingCrystal` lazy import + `TOOL_SCREENS['rc-crystal']` satırı
   gider; `RcRl`/`CrystalLoad` lazy import + `TOOL_SCREENS['rc-rl']` /
   `['crystal-load']` girer.
2. `categories.js`: `rc-crystal` kaydı yerine iki yeni kayıt (id/path/slugEn/name
   — brifin başındaki tablo).
3. `pages/tools/TimingCrystal/` klasörü tamamen silinir.

### C — LedOhmRlc → üç araç

Kaynak: `pages/tools/LedOhmRlc/{model,index,schematic,text,report}.js(x)`.
`TOOLS = [TOOL_OHM, TOOL_LED, TOOL_RLC, TOOL_COMBO]`, `HAS_MODES = {[TOOL_RLC]:
true}`. Kullanıcının kararı: Ohm kanunu + seri/paralel birleşim (TOOL_OHM +
TOOL_COMBO) bir arada, LED (TOOL_LED) ayrı, RLC (TOOL_RLC) ayrı.

**`pages/tools/OhmLaw/`** (id `ohm-law`) — TOOL_OHM + TOOL_COMBO kalır, TOOL_LED
ve TOOL_RLC gider:
- `model.js`: `TOOLS = [TOOL_OHM, TOOL_COMBO]`; `HAS_MODES` gider (RLC gittiği
  için hiçbir alt-araçta mod yok — Segmented mod bloğu da UI'dan kalkar).
  `formFields`/`compute`/`buildSweep` içindeki `TOOL_LED`/`TOOL_RLC` dalları
  (`computeLed`, `computeRlc`) silinir. `INITIAL_FORM`den LED alanları
  (`Vs,Vf,n,Iled,derating`) ve RLC alanları (`Rr,L,C,freq,targetF0` — dikkat:
  Ohm'un kendi `V/I/R/P` alanlarıyla RLC'nin `R`/`L`/`C` alan adları
  ÇAKIŞMAZ, RLC dalı tamamen gittiği için isim çakışması sorun değil) gider.
  **"Hesap" SelectField KALIR** (Ohm kanunu / Seri-paralel birleşim).
- `index.jsx`: `TOOL_LED`/`TOOL_RLC` render dalları, Segmented mod bloğu
  (`HAS_MODES[f.tool] &&`) silinir.
- `schematic.jsx`: `LedCircuit`/`RlcCircuit` fonksiyonları silinir; `height`
  hesaplaması `isParallel ? 160 : 140` olarak kalır (LED'in 150'si gitti);
  caption fallback mantığı (`text.caption[tool] ?? seri/paralel`) AYNEN kalır
  (Ohm'un kendi caption'ı var, Combo'nunki yok).
- `text.js`: LED/RLC'ye ait `toolLabel`, `fields`, `fieldLabels`, `table`,
  `formula`, `detail.rlc/led`, `validity[TOOL_LED/TOOL_RLC]`, `chart[TOOL_LED/
  TOOL_RLC]`, `schematic.caption[TOOL_LED/TOOL_RLC]`, `reasonText`'teki
  `REASON_LED_HEADROOM`/`REASON_NO_SOLUTION` case'leri (RLC sentezine özgüyse),
  `commentary()`'nin LED ve RLC dalları silinir. Başlık: "Ohm Kanunu ve Seri/
  Paralel Direnç" / "Ohm's Law and Series/Parallel Resistance"; `intro`
  güncellenir.
- `report.js`: `ledResults`/`rlcResults` fonksiyonları ve çağrı noktaları gider.
- `report.test.js`: LED ve RLC test case'leri silinir; Ohm ve Combo testleri
  kalır (Combo testleri zaten `TOOL_COMBO` üzerinden, etkilenmez).
- `SaveToProject`/`useSavedCalculation` `toolKey="ohm-law"`.

**`pages/tools/LedResistor/`** (id `led-resistor`) — yalnız TOOL_LED:
- `model.js`: `TOOLS`/`HAS_MODES` gider, `f.tool`/`INITIAL_FORM.tool` silinir,
  `compute()`/`formFields()` `tool` parametresi düşer. Yalnız `computeLed` +
  LED alanları kalır. **"Hesap" SelectField'in KENDİSİ gider** (tek seçenek).
  Mod (Analiz/Sentez) zaten LED'de yoktu, UI'da hiç görünmez.
- `index.jsx`: LED JSX'i doğrudan basılır, `f.tool === TOOL_LED` koşulları düşer.
- `schematic.jsx`: yalnız `LedCircuit` kalır, viewBox sabit `0 0 260 150`.
- `text.js`: yalnız LED'e ait anahtarlar kalır (yukarıdaki OHM listesinin
  simetriği); `toolLabel`/`modeGroup` gibi seçici artığı anahtarlar gider.
  Başlık: "LED Seri Direnci" / "LED Series Resistor".
- `report.js`: yalnız `ledResults` kalır.
- `report.test.js`: yalnız LED test case'leri kalır.
- `SaveToProject`/`useSavedCalculation` `toolKey="led-resistor"`.

**`pages/tools/RlcResonance/`** (id `rlc-resonance`) — yalnız TOOL_RLC:
- `model.js`: `TOOLS` gider, `f.tool`/`INITIAL_FORM.tool` silinir, `compute()`/
  `formFields()`'ten `tool` parametresi düşer (yalnız `mode` kalır — RLC'nin
  ana/syn modu VAR, bu kalır). **"Hesap" SelectField'in KENDİSİ gider**;
  Segmented mod (Analiz/Sentez) AYNEN kalır (`HAS_MODES` mantığı gereksizleşir
  çünkü artık koşulsuz gösterilir).
- `index.jsx`: RLC JSX'i doğrudan basılır, `f.tool === TOOL_RLC` koşulları düşer,
  Segmented her zaman render edilir (`HAS_MODES[f.tool] &&` koşulu kalkar).
- `schematic.jsx`: yalnız `RlcCircuit` kalır, viewBox sabit `0 0 260 140`.
- `text.js`: yalnız RLC'ye ait anahtarlar kalır. Başlık: "RLC Rezonans" /
  "RLC Resonance".
- `report.js`: yalnız `rlcResults` kalır.
- `report.test.js`: yalnız RLC test case'leri (analiz + sentez) kalır.
- `SaveToProject`/`useSavedCalculation` `toolKey="rlc-resonance"`.

**Ortak adımlar:**
1. `App.jsx`: `LedOhmRlc` lazy import + `TOOL_SCREENS['led-ohm-rlc']` gider;
   `OhmLaw`/`LedResistor`/`RlcResonance` girer.
2. `categories.js`: `led-ohm-rlc` kaydı yerine üç yeni kayıt (yukarıdaki tablo).
3. `pages/tools/LedOhmRlc/` klasörü tamamen silinir.

### Ortak bitirme

- Her yeni ekranda `SaveToProject` `toolKey` = katalog `id` (tabloya bak);
  `useSavedCalculation` bağlanır; `ReportDialog` durur.
- `report.js`ler ekranla aynı `r`/`s`/`text` kaynağından üretir; `report.test.js`ler
  taşınan davranışı yeni araç sınırlarında doğrular.
- E2E (`web/e2e/`): eski slug'lara dokunan senaryolar yeni slug'lara güncellenir.
- CLAUDE.md'deki araç sayıları (29) ve test sayıları güncellenir; prerender sayfa
  sayısı 76 → 82 olmalı (32 araç + 8 kategori + kök, ×2 dil) — build çıktısından
  doğrulanır, tutmuyorsa nedeni bulunur.

## Doğrulama

1. `npm test` yeşil; `toolKeys.test.js` (id/ekran/katalog eşleşmesi) ve
   `langLink.guard.test.js` geçiyor.
2. `text.js` yürüme kontrolü: yeni beş ekranın `index.jsx`/`schematic.jsx`/`report.js`
   içindeki her `text.…` yolu iki dilde gerçekten kuruluyor (CLAUDE.md "Dil" bölümündeki
   esbuild yöntemi), arity dahil.
3. Çıplak Türkçe grep'i (CLAUDE.md "Kurallar") yeni ekranlarda temiz; ASCII-Türkçe
   tuzağına dikkat.
4. `npm run build` hatasız; prerender/sitemap yeni yolları içeriyor, `rc-crystal` ve
   `led-ohm-rlc` yolları çıktıda YOK.
5. `npm run test:e2e` yeşil.
6. Elle: 6 aracın (ResistorCode dahil) tr ve en sayfaları açılıyor, hesap → sonuç →
   rapor akıyor; SMD'ye dair hiçbir iz yok.
7. Commit + push.
