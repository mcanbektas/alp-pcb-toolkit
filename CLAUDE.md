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
   - `num.js` — `parseNum` (giriş ayrıştırma), `fmt`/`fmtOhm`/`fmtVolt`/`fmtWatt` (gösterim).
   - `traceCalc.js` — trace hesap motoru; sabitler (`RHO20`, `ALPHA`, `OZ_TABLE`, `MIL`) burada.
2. **`src/components/`** — sunum bileşenleri (`NumberField`, `SelectField`, `Segmented`). State
   tutmaz, hesap yapmaz.
3. **`src/pages/tools/*.jsx`** — araç sayfaları. Form state'i + `compute()` çağrısı + düzen.

`src/data/categories.js` tek kaynak: 7 kategori ve araç listesi. Bir aracın `path` alanı varsa
aktif, yoksa "yakında" olarak gösterilir — `Home.jsx` ve `CategoryPage.jsx` bu alana bakar.

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
- Geçersiz giriş `{ invalid: true }` döner; sayfa hesap yerine `.empty-note` gösterir.

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
  `src/lib/num.js` içindeki `parseNum` ile ayrıştırılır (`0.25` == `0,25`); `parseFloat` veya
  `Number()` doğrudan kullanılmaz.

## Sonuç sunumu

Her sonuç; kullanılan denklem, ara değerler, geçerlilik sınırı ve mühendislik yorumuyla
birlikte verilir. Bir hesap eklerken geçerlilik aralığı uyarısını da ekle
(`validityWarnings` deseni) ve `.status` çipiyle güvenli / sınıra yakın / yetersiz durumunu
göster. Sonuçlar yaklaşık mühendislik tahminidir — bu uyarı footer'da sabit durur, araç
sayfalarında da tekrarlanır.
