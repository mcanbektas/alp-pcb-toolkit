# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje

ALP PCB Toolkit — PCB tasarımı için çevrim içi mühendislik hesap araçları. Vite + React 18 +
react-router-dom. Tamamen client-side; backend, veritabanı, API çağrısı yok. Arayüz ve kod
yorumları Türkçe.

## Komutlar

```bash
npm install
npm run dev      # http://localhost:3000  (vite.config.js: port 3000, strictPort)
npm run build    # dist/
npm run preview
```

Test altyapısı ve linter kurulu değil. Doğrulama `npm run build` + tarayıcıda elle kontrol ile
yapılır. Yeni bir test/lint aracı eklemek istersen önce sor.

`main`'e her push → `.github/workflows/deploy.yml` → GitHub Pages. `base: './'` + `HashRouter`
kombinasyonu repo adından bağımsız çalışmayı sağlar; ikisini de değiştirme.

## Mimari

Üç katman, sıkı ayrım:

1. **`src/lib/`** — saf hesap fonksiyonları. React'e, DOM'a, birim string'lerine bağımlı değil.
   - `num.js` — `parseNum` / `parseNumResult` (giriş ayrıştırma),
     `fmt`/`fmtOhm`/`fmtVolt`/`fmtWatt` (gösterim).
   - `traceCalc.js` — trace hesap motoru; sabitler (`RHO20`, `ALPHA`, `OZ_TABLE`, `MIL`) burada.
2. **`src/components/`** — sunum bileşenleri (`NumberField`, `SelectField`, `Segmented`). State
   tutmaz, hesap yapmaz.
3. **`src/pages/tools/*.jsx`** — araç sayfaları. Form state'i + `compute()` çağrısı + düzen.

`src/data/categories.js` tek kaynak: 7 kategori ve araç listesi. Bir aracın `path` alanı varsa
aktif, yoksa "yakında" olarak gösterilir — `Home.jsx` ve `CategoryPage.jsx` bu alana bakar.

**Bilinçli sapma:** `categories.js` 24 araç kaydı içerir, `docs/spec.md` §15 ise 21 ekran
sayar. Fark kasıtlıdır, düzeltilmemeli: spec'in 2. ekranı (*Trace Resistance, Voltage Drop
and Power Loss*) ayrı araç değil, `TraceWidth.jsx` içinde birleşik; spec'in 21. ekranı
(*BGA, Stack-Up and Thermal Relief*) `bga`, `stackup` ve `thermal-relief` olarak üçe
bölünmüştür.

### Yeni araç ekleme

Formüller ve gereksinimler için kaynak: **`docs/spec.md`**. Yeni bir araç yazmadan önce o
dosyanın ilgili bölümünü oku; denklemleri, sabitleri veya geçerlilik sınırlarını hafızadan
veya başka kaynaktan uydurma. Spec ile mevcut kod çelişirse dur ve sor.

Uyarı: spec'teki bazı formül blokları markdown dönüşümünde bozulmuş — açılış köşeli parantezi
düşmüş, araya `##` girmiş veya `*` işaretleri ifadeyi yemiş durumda. Bozuk bir bloğu tahminle
tamamlama; eksik olduğunu söyle ve sor.

1. `src/pages/tools/<Ad>.jsx` yaz (aşağıdaki 3 panelli deseni izle).
2. `src/App.jsx` içine `<Route path="/arac/<slug>" element={<Ad />} />` ekle.
3. `src/data/categories.js` içindeki ilgili araca `path: '/arac/<slug>'` ver.
4. Hesap mantığını `src/lib/` altına ayrı bir modül olarak koy, JSX içine gömme.

### Birim ve sayı akışı

- Form state'i **string** tutar; ayrıştırma yalnızca `compute()` içinde `parseNum` ile yapılır.
- Birimler ayrı state alanında tutulur (`L` + `Lu`, `I` + `Iu`) ve çarpan tablolarıyla
  (`LEN_TO_M`, `W_TO_MM`) SI'ye çevrilir. Hesap içinde SI kullanılır.
- İstisna: ampirik ısınma denklemi tanımı gereği mil²/A/°C ile çalışır. Bu tür birim
  istisnaları kodda yorumla açıkça belirtilmeli.
- **Ara değerlerde asla yuvarlama yapılmaz.** `fmt*` yalnızca JSX içinde, ekrana yazarken
  çağrılır.
- **Binlik ayırıcı yorumlanmaz.** `"1.000"` bin mi 1.0 mı belirsizdir; `parseNumResult`
  bunu `NUM_ERR_THOUSANDS` ile geçersiz sayar, sessizce `1` döndürmez. Araç sayfası bu
  durumda hesap yerine `THOUSANDS_MESSAGE` uyarısını ve etkilenen alan adlarını gösterir
  (`TraceWidth.jsx` → `thousandsFields`).
- Geçersiz giriş `{ invalid: true }` döner; sayfa hesap yerine `.empty-note` gösterir.

### Trace hesap motoru — mevcut durum ve planlanan yol

`traceCalc.js` şu an tek motor kullanıyor: klasik ampirik ısınma denklemi
`I = k·ΔT^0.44·A^0.725`. `docs/spec.md` §4.1.4 bunun yerine veri-interpolasyon + sayısal kök
çözümü istiyor ve ampirik denklemi legacy sayıyor (§4.1.5). Tek motorla devam kararı
bilinçlidir — spec'in istediği veri seti lisanslıdır ve repoya giremez.

Bu yüzden sonuç panelinde `.method-note` etiketi zorunludur: *"Klasik ampirik yöntem — veri
tabanlı hesapla eşdeğer değildir."* Ampirik sonucu veri tabanlı yöntemin sonucuymuş gibi
sunma.

Planlanan yol: kullanıcı kendi veri setini JSON olarak içe aktarabilecek, veri `localStorage`
içinde tutulacak, **repoya hiç girmeyecek**. Veri seti yüklendiğinde interpolasyon motoru
devreye girecek ve `.method-note` metni buna göre değişecek.

## Kurallar

- **Sitede hiçbir yerde "ipc" ifadesi geçmeyecek.** Bu yasak `src/` ve kullanıcıya görünen
  tüm metinler için geçerli — arayüz metni, kod yorumu, değişken/dosya adı, README dahil.
  `docs/` altındaki dahili referans dosyaları kapsam dışıdır. Standart adı gerektiğinde
  yöntem tarif edilerek anılır — örn. `traceCalc.js`'te "klasik ampirik iletken ısınma
  denklemi". Yeni metin yazdıktan sonra kontrol et:
  ```bash
  # kuralın kendi metni sayılmasın diye CLAUDE.md hariç; çıktı boşsa temiz
  grep -rin "ipc" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs \
    --exclude=CLAUDE.md .
  ```
  Sonuç: `docs/spec.md` bazı sonuç etiketlerini ve uyarı metinlerini standart adıyla birebir
  şart koşar (örn. veri aralığı dışı uyarısı, legacy yöntem etiketi). Bu metinler UI'da
  standart adı olmadan, yöntemi tarif ederek yazılır.
- **Yeni araçlar `src/pages/tools/TraceWidth.jsx`'teki 3 panelli deseni takip edecek:**
  `.tool-header` (başlık + açıklama) → `.tool-grid` içinde üç `.panel` (sol: *Girdiler*,
  orta: *Sonuç*, sağ: `.panel-detail` → *Teknik detay* + *Geçerlilik ve varsayımlar*) →
  kategoriye dönen `.backlink`. Orta panel bir `.big-result`, bir `.status` çipi ve bir
  `.result-table` içerir; sağ panel kullanılan denklemleri `.formula` bloğunda gösterir.
  Düzen kırılımları `theme.css` içindeki `.tool-grid` media query'lerinde tanımlı — yeni
  araç için grid yazmaya gerek yok.
- **Renkler her zaman `src/theme.css`'teki CSS değişkenlerinden gelecek.** JSX veya CSS içine
  literal renk (`#4ade80`, `rgb(...)`, `green`) yazma; `var(--accent)`, `var(--muted)`,
  `var(--warn)`, `var(--danger)` vb. kullan. Yeni bir renk gerekiyorsa önce `theme.css`
  `:root` bloğuna değişken ekle. Aynı kural fontlar için de geçerli: `var(--font-mono)`,
  `var(--font-display)`, `var(--font-body)`.
- **Ondalık girişlerde hem nokta hem virgül kabul edilecek.** Her sayısal giriş
  `src/lib/num.js` içindeki `parseNum` ile ayrıştırılır (`0.25` == `0,25`); hata nedeni
  gerekiyorsa `parseNumResult`. `parseFloat` veya `Number()` doğrudan kullanılmaz.
- **Ters hesaplarda Newton–Raphson tek başına kullanılmaz.** Brent veya bisection ile
  sınırlandırılmış kök arama yapılır. Newton–Raphson başlangıç noktasına bağlı olarak negatif
  genişlik, negatif aralık gibi fiziksel olmayan sonuçlara yakınsayabilir (`docs/spec.md`
  §3.3). Arama aralığı fiziksel olarak geçerli sınırlarla kapatılmalıdır.
- **Lisanslı standart tabloları repoya kopyalanmaz.** Karar tabloları, eğri verisi ve
  benzeri lisanslı içerik `src/` veya `docs/` altına gömülmez. Bunun yerine kullanıcının
  içe aktardığı profil/veri seti kullanılır ve `localStorage`'da tutulur. Böyle bir veri
  yokken sonuç, standart tabanlı doğrulanmış gibi sunulmaz.

## Sonuç sunumu

Her sonuç; kullanılan denklem, ara değerler, geçerlilik sınırı ve mühendislik yorumuyla
birlikte verilir. Bir hesap eklerken geçerlilik aralığı uyarısını da ekle
(`validityWarnings` deseni) ve `.status` çipiyle güvenli / sınıra yakın / yetersiz durumunu
göster. Sonuçlar yaklaşık mühendislik tahminidir — bu uyarı footer'da sabit durur, araç
sayfalarında da tekrarlanır.
