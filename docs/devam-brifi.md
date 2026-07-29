# Devam brifi

Proje: `/Users/canbektas/Projects/alp-pcb-toolkit` — ALP PCB Toolkit.
Plan/durum tek kaynak: `docs/uyelik-ve-rapor-plani.md` (§9 faz tablosu, §12/14/15/16/17
tamamlanan fazların durumu, §13 kalan noktalar). Mimari kurallar: `CLAUDE.md`.

## Şu anki durum

Dal: **`feat/uretim-dfm-araclari`** — `main`'in 7 commit önünde, hepsi commit'li,
working tree temiz. `main` üzerindeki son commit `d511487` (Faz 0–6'nın tamamı).

```
cd web && npm test   → 1762/1762 yeşil
cd web && npm run build → temiz
```

## Biten fazlar

**Faz 0–6** (`d511487`): repo `web/` + `api/` olarak bölündü; .NET backend (Identity+JWT,
EF Core, Projects/Calculations CRUD); frontend auth ekranları; PDF/Excel rapor üretimi;
25 aracın tamamına `report.js` + `report.test.js` + `SaveToProject` kablolaması.
Routing `HashRouter` → `BrowserRouter`'a geçti, `vite.config.js` `base: '/'`.

**PCB Üretim ve DFM kategorisi** (bu dalda, `290c54b`…`7315d2e`): kategorinin dört aracı
yazıldı, kategoride "yakında" kalan kayıt yok.

- Yeni motorlar (`web/src/lib/`, hepsi saf + testli): `dfmProfile`, `dfmCheck`,
  `dfmSummary`, `padstack`, `clearanceProfile`, `clearanceCreepage`, `bgaBreakout`,
  `stackup`, `stackupProfiles`, `thermalRelief`.
- Yeni ekranlar (`web/src/pages/tools/`): `ClearanceCreepagePadstack`, `BgaBreakout`,
  `StackupPlanner`, `ThermalRelief` — dördü de altı dosyalı desende (report.js dâhil).
- Yeni hook'lar: `useDfmProfiles`, `useClearanceProfiles`, `useSavedStackups`,
  `useClipboard`.
- Yeni bileşenler: `ProfilePanel`, `DfmChecks`, `DfmSummaryBox`; ortak sözlük
  `src/data/dfmText.js`.
- `uiText.js`'e dördüncü durum çipi (`statusUnknown`); dört tema dosyasına
  `.status.unknown`, `.commentary li.unknown`, `.result-table .sub-line`,
  `.row-list.cols-N`, `.formula.summary-box` kuralları.
- `units.js`'e `K_CU_HIGH = 400` (ekranda 385/400 seçilebilir, varsayılan konservatif 385).
- `RowList` sütunları `options` (satır içi seçici) ve `text` alabiliyor; `TextField`
  `autoCapitalize` opt-out aldı. İki varsayılan da değişmedi, mevcut ekranlar etkilenmedi.

Ayrıntı ve kural gerekçeleri: `CLAUDE.md` → "Üretim/DFM ekranlarının ortak yapısı".

## Kalan işler

### Faz 8 — dağıtım (kullanıcının istediği sıradaki iş)

Uygulama kendi sunucumuza taşınacak. Bilinmesi gerekenler:

- `BrowserRouter` + `base: '/'` kullanılıyor. Sunucu `/arac/...` gibi derin bağlantılara
  `index.html` döndürmezse sayfa yenilendiğinde 404 alınır. **İlk doğrulanacak şey budur.**
- `.github/workflows/deploy.yml` hâlâ eski GitHub Pages akışı; bu yapıyla uyumlu değil.
- `deploy/` klasöründe şu an yalnızca `README.md` var. `.gitignore` `deploy/.env` ve
  `deploy/*.env` dosyalarını dışarıda tutuyor — gizli değerler depoya girmemeli.
- `web/vite.config.js` geliştirme sunucusunda `/api` isteklerini `http://localhost:5289`
  adresine proxy'liyor; üretimde bu yol sunucu yapılandırmasından gelmeli.
- Backend `api/Alp.Api`; `appsettings.Development.json` gitignore'da, `.example` depoda.

### Diğer fazlar

- **Faz 3b** — fontlar sunucuya taşınacak (bu ortamda ağ erişimi yok, engellenmişti).
- **Faz 7** — `useSavedThickness` → hesaba taşıma.
- **Faz 9** — README güncelleme. `CLAUDE.md` bu oturumda güncellendi (backend'in varlığı,
  dağıtım hedefi, üretim/DFM bölümü, dosya/test sayıları); README'ye bakılmadı.

### Atanmamış, açık

- `PATCH /api/me`, logo yükleme, `/api/thickness-records/*` (§4.3'te listeli, hiçbir faza
  atanmadı).
- Üç pilot araçta (TraceWidth / ResistorCode / LengthConverter) Faz 6'da keşfedilen
  "grafik veri tablosunda son satır düşüyor" hatası — küçük, izole temizlik.
- Üretim/DFM ekranları **gerçek tarayıcıda gözle kontrol edilmedi** (sandbox'ta headless
  tarayıcı yok). Üretim derlemesi servis edilip yedi route'un 200 döndüğü ve dört ekranın
  sunucu tarafında hatasız render olduğu doğrulandı; görsel yerleşim denetim bekliyor —
  özellikle `StackupPlanner`'ın dokuz sütunlu katman tablosu ve mobil kırılım.

## Ortam kısıtı (önemli)

Bu sandbox'ta docker / Postgres / headless tarayıcı **yok**. OrbStack sembolik bağlantıları
var ama uygulama silinmiş (`~/.orbstack/bin` altındaki linkler kırık). Homebrew var,
psql/postgres kurulu değil. Backend'in bütün doğrulaması build + migration üretimi +
bağımsız smoke testiyle yapıldı; **gerçek bir veritabanına karşı hiç çalıştırılmadı.**

Kullanıcı Postgres için "Homebrew ile kalıcı kurulum" (`brew install postgresql@16`)
tercihini işaretlemişti; iş fiilen başlamadı. Konuya dönülürse doğrudan kurulumla
başlanabilir, tekrar sormaya gerek yok.

## Çalışma tercihleri

- Model **Opus**, effort **xhigh**, ultracode **kapalı** — kullanıcı bu oturumda böyle seçti.
- Kullanıcının kalıcı talimatı: workflow / deep-research yalnızca açıkça istenirse.
- Kararlar varsayılmıyor, soruluyor. Bu oturumda beş karar açıkça soruldu ve öyle uygulandı:
  k_Cu'nun seçilebilir olması, yeni araçların mevcut rapor altyapısına bağlanması,
  `padstack.js`'in `via.js`'i sarmalaması (kopyalamaması), hata kodu adlandırmasının proje
  desenini izlemesi, dördüncü (`unknown`) durum çipinin eklenmesi.
