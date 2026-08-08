# Brif 15 — Dil önerisi şeridi (tarayıcı diline göre)

## Amaç

Tarayıcı dili sayfanın dilinden farklı olan ziyaretçiye, sayfanın öteki
dildeki karşılığına giden **kapatılabilir bir öneri şeridi** göstermek.
Örnek: İngilizce tarayıcıyla `/arac/gerilim-bolucu` açan kullanıcı üstte
"This page is available in English → /en/tool/voltage-divider" görür.

## Verilmiş kararlar — yeniden tartışılmaz

1. **Sinyal `navigator.languages`tır, IP/coğrafya DEĞİL.** GeoIP elendi:
   Googlebot ABD IP'sinden tarar ve kanonik TR indekslemesini bozar; yurtdışı
   Türk'e yanlış dil basar; MaxMind + nginx modülü = yeni altyapı. Tarayıcı
   dili kullanıcının kendi beyanıdır, konum tahmini değil.
2. **Otomatik yönlendirme YOK, yalnız öneri.** URL tek gerçek kaynak
   (`docs/en-url-karari.md` §3); TR adres açan TR içerik görür. Gezinmeyi
   kullanıcı tıklayarak yapar. `LangPrefRedirect`'in indekslenmeyen sayfalara
   yaptığı otomatik yönlendirme bu kuralın MEVCUT ve tek istisnasıdır — bu
   brif ona dokunmaz.
3. **İki yönlü ve simetrik:** TR sayfada EN-tarayıcıya İngilizce öneri, EN
   sayfada TR-tarayıcıya Türkçe öneri. Tek kod yolu.
4. **Şerit metni HEDEF dilde yazılır** ve şerit elemanı `lang={hedefDil}`
   taşır (CLAUDE.md'deki `<html lang>` / endonim gerekçesiyle aynı: kullanıcı
   anlamadığı dildeki sayfada öneriyi kendi dilinde okumalı).
5. **Yalnız kanonik (indekslenebilir) sayfalarda görünür.**
   `isLangPrefPath(pathname)` true olan sayfalarda GÖSTERİLMEZ — oralar
   `LangPrefRedirect`'in bölgesi; iki mekanizma aynı sayfada yarışmaz.
6. **Bir kez kapatma yeter:** kapatma da tıklayıp gitme de kalıcı olarak
   kaydedilir; şerit bir daha hiç çıkmaz. Süreli/sayaçlı gösterim yok.
7. **Hydration güvenliği:** `navigator` ve depo **mount'tan sonra** okunur;
   ilk render'da şerit YOK (hem prerender hem ilk client render şeritsiz —
   birebir aynı ağaç). Profil hook'larındaki kuralın aynısı
   (CLAUDE.md → prerender bölümü, `docs/prerender-karari.md` §8).

## Mimari — katman ayrımı (mevcut desenin kopyası)

DFM profil deseni izlenir: saf mantık `lib/`, somut bağ `hooks/`, sunum
`components/`.

### 1. `src/lib/langSuggestion.js` — saf, testli

- `SUGGESTION_KEY` (öneri: `'alp-lang-suggestion'`) ve karar fonksiyonu:

  ```js
  // browserLangs: navigator.languages dizisi (ör. ['en-US','en'])
  // urlLang: langFromPath(pathname) — sayfanın dili
  // dismissed: depodan okunan kapatma kaydı (boolean)
  // dönüş: önerilecek dil kodu ('tr'|'en') ya da null
  export function suggestLang({ browserLangs, urlLang, dismissed })
  ```

- Kurallar: `dismissed` true ise null. `browserLangs` boş/tanımsızsa null.
  İlk elemanın ana etiketi alınır (`'en-US'` → `'en'`); `isLang()` ile
  tanınmıyorsa null (ör. `'de'` — Almanca tarayıcıya öneri YAPILMAZ, iki
  dilimizden birini beyan edene yapılır). Sonuç `urlLang`'a eşitse null.
- Depo okuma/yazma yardımcıları portu **parametre** alır (`storage.js`
  sözleşmesi: `read`/`write`; hata yükü dilsiz). `langPref.js`'in doğrudan
  `window.localStorage` kullanması ESKİ istisnadır, kopyalanmaz — port
  kullanılır.
- React, DOM, `navigator` bilmez.

### 2. `src/hooks/useLangSuggestion.js` — somut bağ

- `useState(null)` + `useEffect`: mount'ta `navigator.languages` ve
  `browserStorage()` okunur, `suggestLang` çağrılır, durum yazılır.
- `useLocation()` ile `pathname` izlenir; `isLangPrefPath(pathname)` true ise
  null döner (5. karar).
- Dönüş: `null` ya da `{ targetLang, targetPath, dismiss }`.
  `targetPath = translatePath(pathname + search + hash, targetLang)` —
  `?hesap=` bağı ve `#` korunur (LangSwitch ile aynı, `App.jsx:205`).
  `dismiss()` depoya kapatma kaydını yazar ve durumu null'a çeker.
- Tarayıcı API'si YALNIZ bu hook'ta. CLAUDE.md'deki "tarayıcı API'si yalnızca
  şu hook'larda görünür" listesine bu hook eklenir.

### 3. `src/components/LangSuggestionBanner.jsx` — sunum

- Prop olarak hook dönüşünü alır; `null` ise hiçbir şey çizmez.
- Metinler `commonText(targetLang)`'ten okunur — `useLang()` KULLANMAZ
  (şeridin dili sayfanın dili değil, hedef dil; istisna listesine girmesi
  gerekmez). `uiText.js`'e eklenecek anahtarlar (iki dilde):
  - `langSuggestNote` — "Bu sayfanın Türkçesi var." / "This page is
    available in English."
  - `langSuggestGo` — "Türkçeye geç" / "Switch to English"
  - `langSuggestDismiss` — kapatma düğmesinin erişilebilir adı
    ("Öneriyi kapat" / "Dismiss suggestion")
- Bağlantı: yol zaten hedef dilde üretildiği için düz `Link` kullanılır —
  `langLink.guard.test.js`'in izin listesine bu dosya eklenir ve gerekçe
  guard dosyasındaki nota işlenir (LangSwitch ile aynı sınıf: yolu kendisi
  doğru dilde üretiyor).
- Kök eleman `lang={targetLang}` taşır; kapatma `<button>` (bağlantı değil,
  gezinme yapmıyor). `role="status"` verilmez — sayfa açılış içeriğidir,
  canlı bölge değil.
- Stil: ekrana özel CSS YOK (CLAUDE.md kuralı). Mevcut ortak sınıflarla ince
  bir üst şerit; yeni renk gerekiyorsa dört tema dosyasına birden değişken
  eklenir. `Toast` modal-değil çizgisi burada da geçerli: şerit içeriğin
  önünü kapatmaz, akışta yerini alır.

### 4. Yerleştirme

`App.jsx` → `Layout` içinde, başlığın altında / ana içerik alanının üstünde.
Hook `Layout`'ta çağrılır, bileşene prop geçilir.

## Test

- `src/lib/langSuggestion.test.js` (vitest, saf): dismissed → null; boş
  liste → null; `de` → null; `en-US` + TR sayfa → `'en'`; `tr` + EN sayfa →
  `'tr'`; aynı dil → null; depo yardımcıları `memoryStorage` ile.
- Guard güncellemesi: `langLink.guard.test.js` izin listesi.
- Bileşen testi YAZILMAZ (CLAUDE.md: React bileşeni testi yok).
- Elle doğrulama (ekranı gerçekten aç): tarayıcı dili İngilizce yapılıp
  `localhost:3000/arac/gerilim-bolucu` açılır — şerit çıkmalı, konsolda
  hydration uyarısı OLMAMALI; kapat → yenile → çıkmamalı; `?hesap=` bağlı
  bir kayıtta tıklanınca bağ korunmalı; `/yonetim`de hiç çıkmamalı.

## Uygulandı ve doğrulandı (2026-08-08)

Yazılan dosyalar: `lib/langSuggestion.js` (+`.test.js`),
`hooks/useLangSuggestion.js`, `components/LangSuggestionBanner.jsx`.
Değişenler: `App.jsx` (Layout), `data/uiText.js`, dört tema dosyası,
`pages/langLink.guard.test.js` (izin listesi).

Birim testleri: 3133/3133 yeşil (8'i bu brifin).

**Tarayıcı doğrulaması gerçek nginx üzerinde yapıldı** (`npm run stack:docker`,
`localhost:8080`) — `vite preview` bu iş için kullanılamaz, gerekçesi
`docs/prerender-karari.md` §8.1'de. Dokuz kontrolün hepsi geçti:

| Senaryo | Beklenen | Sonuç |
|---|---|---|
| EN tarayıcı + TR araç sayfası | şerit var, İngilizce metin | geçti |
| TR tarayıcı + EN araç sayfası | şerit var, Türkçe metin | geçti |
| TR tarayıcı + TR sayfa | şerit yok | geçti |
| **Almanca** tarayıcı + TR sayfa | şerit yok | geçti |
| **Fransızca** tarayıcı + EN sayfa | şerit yok | geçti |
| EN tarayıcı + `/giris` | şerit yok (5. karar) | geçti |
| EN tarayıcı + ana sayfa | şerit var | geçti |
| Kapatma kalıcılığı | hemen/başka sayfa/yenileme sonrası gizli | geçti |
| `?hesap=42` bağı | `/en/tool/voltage-divider?hesap=42` | geçti |

Hydration yedi rotanın hepsinde temiz (React #418/#422/#425 yok).

## Kapsam dışı (bilerek)

- GeoIP / sunucu tarafı her şey (1. karar).
- Otomatik yönlendirme (2. karar).
- `LangSwitch`'e "elle dil değiştirdi, önerme" sinyali bağlamak — kapatma
  düğmesi aynı işi tek tıkla görüyor, LangSwitch'e dokunmaya değmez.
- `langPref.js`'i porta taşıma refaktörü — ayrı iş, bu brifi şişirmez.
- Üçüncü dil desteği — `LANGS` büyürse `suggestLang` zaten `isLang` ile
  ölçeklenir, bugün iş yok.
