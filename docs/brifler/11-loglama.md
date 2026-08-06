# Brif 11 — Loglama yapısı: denetim izi + panel + kalıcılık

Durum: **yapı çıkarıldı (2026-08-06), uygulama başlamadı.** Bu brif sunucu
BEKLEMEZ — F1–F4'ün tamamı yerelde yazılır ve doğrulanır; sunucu gününe (Brif
06) yalnız "compose'u kaldır, çalıştığını gör" kalır.

Zemin: `docs/loglama-karari.md` (Serilog, yalnız stdout — o karar DEĞİŞMİYOR,
bu brif üstüne katman ekliyor). Uygulama fazlar hâlinde ayrı oturumlarda
koşulur; her fazın başında bu brif + ilgili karar dosyası okunur.

---

## 0. Bugün ne var (ölçüldü, 2026-08-06)

- Serilog iki aşamalı (bootstrap + DI), dev'de metin, üretimde
  `CompactJsonFormatter` tek satır JSON, **yalnız stdout** (`Program.cs:23`,
  `:32-48`).
- İstek özeti: `UseSerilogRequestLogging` — `ClientIp` + `UserId`
  zenginleştirmesi; sağlık uçları Verbose (yazılmaz), 5xx/istisna Error
  (`Program.cs:516-531`).
- 17 elle log çağrısı; içlerinde admin seed olayları ("yetki verildi/alındı",
  `AdminSeeder.cs`) ve dev e-posta göndericisi var.
- nginx: `sorgusuz` log_format — sorgu dizesi bilerek yazılmaz, token sızmaz
  (`deploy/nginx.conf:37`).
- Gizlilik metni beyanı: "sunucu günlükleri için sabit süre yok, hacme ulaşınca
  en eski silinir, birkaç günlük pencere" (`legalText.js:194`).
- Temizlik servisi deseni hazır ve iki kez uygulanmış:
  `RefreshTokenCleanupService`, `ReportSnapshotCleanupService` (6 saatte bir,
  1 dk açılış gecikmesi, scoped DbContext, `ExecuteDelete`).

## 1. Eksikler (bu brifin varlık sebebi)

| # | Eksik | Neden önemli |
|---|---|---|
| E1 | **Yönetici eylemi iz bırakmıyor.** `AdminEndpoints.DeleteUser` hesabı siliyor, hiçbir yere kim-kimi-ne zaman yazmıyor | Geri alınamaz işlem, kanıtsız. KVKK "silme talebini işledim" kanıtı da yok |
| E2 | **Kimlik olaylarının kalıcı izi yok** — parola sıfırlama, kilitlenme, e-posta doğrulama yalnız uçucu stdout'ta | Hesap devri şüphesinde geriye bakacak kayıt yok |
| E3 | **Docker log sınırı YOK.** Compose'da `logging:` bloğu yok → varsayılan `json-file` sürücüsü sınırsız büyür | Disk dolması API'yi de Postgres'i de düşürür. Ayrıca gizlilik metnindeki "birkaç günlük pencere" beyanı rotasyon VARSAYIYOR — yapılandırması yok, beyan bugün doğru değil |
| E4 | **nginx erişim günlüğü dosyaya yazıyor** (`/var/log/nginx/access.log`) — resmi imajda bu yol stdout'a symlink'tir ama bizim conf'un bunu koruduğu DOĞRULANMADI | Symlink değilse konteyner içinde sınırsız büyür ve `docker logs`ta görünmez |
| E5 | **Panel yok** — günlüğe bakmak SSH + `docker logs` istiyor | Kullanıcı isteği: hazır olsun |
| E6 | Korelasyon kimliği yok — nginx satırı ile API satırı eşleştirilemiyor | Hata avında iki günlük yan yana okunamıyor (opsiyonel, F4) |

## 2. Mimari karar — iki ayrı kavram, karıştırılmaz

**Operasyonel günlük** (ne oluyor): uçucu, hacimli, stdout. Bugünkü sistem.
Kalıcılığı Docker log driver verir, uygulama dosya yazmaz —
`loglama-karari.md` §3 aynen geçerli.

**Denetim izi / audit** (kim ne yaptı): az, kalıcı, sorgulanabilir →
**veritabanı tablosu.** Paneli olan, saklama süresi beyan edilen, KVKK'ya konu
olan kayıt budur. Stdout'tan GERİ TÜRETİLEMEZ (konteyner silinince gider);
bu yüzden ayrı tablo şart, "log dosyasını parse eden panel" yolu ELENDİ.

Elenen ikinci seçenek: Seq/Loki gibi merkezi log servisi —
`loglama-karari.md` §3 gerekçesi hâlâ geçerli (dördüncü servis, erken).

## 3. F1 — Denetim izi çekirdeği (öneri: sonnet · high)

### Tablo: `AuditEvents` (yeni migration)

```
Id          bigint identity PK
OccurredAt  timestamptz     (indeks)
Event       text            kısa kod, aşağıdaki tablodan (indeks)
ActorUserId text?           işlemi yapan (null = sistem/anonim)
ActorEmail  text?           SNAPSHOT — kullanıcı sonradan silinse de iz okunur
TargetUserId text?          işlemden etkilenen
TargetEmail text?           SNAPSHOT — silinen hesabın kanıtı
Ip          text?
DetailJson  text?           yapısal ve DİLSİZ (hata yükü kuralıyla aynı ruh:
                            cümle değil alan taşır; cümleyi panel kurar)
```

FK YOK — bilinçli: kullanıcı silinince izi de cascade ile gitmesin. E-posta
snapshot'ları tam bu yüzden var.

### Olay seti v1 (dar tutulur, genişletmek ayrı karar)

| Kod | Actor | Target | Detail |
|---|---|---|---|
| `account.registered` | yeni kullanıcı | — | — |
| `account.email-confirmed` | kullanıcı | — | — |
| `auth.password-changed` | kullanıcı | — | — |
| `auth.password-reset` | kullanıcı | — | — |
| `auth.lockout` | — | kilitlenen | `{ "failedCount": n }` |
| `admin.user-deleted` | yönetici | silinen | `{ "projectCount": n, "reportCount": n }` |
| `admin.role-granted` | sistem (seed) | alan | — |
| `admin.role-revoked` | sistem (seed) | kaybeden | — |

**Yazılmayanlar (bilinçli):** her başarısız giriş denemesi (hacim + e-posta
numaralandırma izi — kilitlenme eşiği zaten olay üretiyor), rapor
üretimi/indirme (denetim değil kullanım), parola ve token değerinin kendisi
(hiçbir alanda, hiçbir biçimde).

### Yazıcı: `AuditLog` servisi (`Alp.Api/Auth/AuditLog.cs`)

- Tek yazım noktası; uçlar elle `db.AuditEvents.Add` yazmaz.
- Tabloya yazar VE `ILogger`a tek satır düşürür (operasyonel görünürlük;
  tablo kanoniktir).
- **Dayanıklılık sözleşmesi iki kademeli:**
  - `admin.user-deleted` → silme TRANSACTION'ININ İÇİNDE yazılır
    (`AccountDeletion.DeleteAsync`e parametre olarak girer). Silme olup izi
    kaybolamaz; iz yazılamıyorsa silme de olmaz.
  - Diğer olaylar → best-effort: audit yazımı patlarsa ana akış DÜŞMEZ, hata
    stdout'a düşer. Kayıt olmayı audit tablosundaki bir kilit engelleyemez.

### Testler (AdminEndpointsTests desenine ek dosya)

- Silme 204 döndüğünde `admin.user-deleted` satırı var; actor/target/snapshot
  e-postalar doğru.
- Silme transaction'ı geri sarılırsa audit satırı da YOK.
- Kilitlenme eşiğinde `auth.lockout` düşüyor.
- DetailJson'da cümle yok (yapısal alan denetimi).

## 4. F2 — Panel: Günlük sekmesi (öneri: sonnet · high)

### Uç: `GET /api/admin/audit`

- Parametreler: `event` (tam kod), `q` (actor/target e-postada arar — Türkçe
  katlama `AdminEndpoints.FoldTurkish` İLE AYNI yoldan), `from`/`to`
  (ISO tarih), `page`/`pageSize` (tavan 100, kullanıcı listesiyle aynı).
- `RequireAdmin` aynı desen; sıralama `OccurredAt DESC, Id DESC`.
- Yanıt: `AuditPage(items, total, page, pageSize)`; satırda ham `Event` kodu
  gider, cümleyi istemci sözlüğü kurar (iki dillilik sunucuya taşınmaz).

### Ekran

- Rota: `/yonetim/gunluk` · `/en/admin/audit` (`STATIC_ROUTES.adminAudit`;
  `indexablePages()` DIŞI — mevcut `admin` anahtarıyla aynı gerekçe).
- `/yonetim` üstüne iki sekme bağlantısı: Kullanıcılar | Günlük (LangLink;
  `aria-current` seçili sekmede).
- Tablo `result-table + mini-head` deseni (kullanıcı listesiyle birebir aynı
  dil): Zaman · Olay · Yapan · Hedef · Ayrıntı. Olay hücresi `mark`
  renk sınıfı alır: `admin.*` danger, `auth.*` warn, `account.*` ok.
- Filtre çubuğu: olay türü `SelectField`, arama kutusu (debounce 350 ms —
  kullanıcı listesindeki desen), tarih aralığı v1'de YOK (sayfalama yeter;
  istenirse ayrı ek).
- Metin: `pages/admin/text.js` içine `audit` bölümü; olay kodu → iki dilli
  cümle sözlüğü + `text.test.js`e her kodun iki dilde karşılığı olduğunu
  denetleyen bekçi (yeni olay kodu eklenip sözlüğü unutulursa test düşer).

## 5. F3 — Saklama süresi (öneri: sonnet · medium)

- `App:AuditRetentionDays` (varsayılan **365**; `.env` → `AUDIT_RETENTION_DAYS`).
- `AuditCleanupService` — `RefreshTokenCleanupService` deseninin kopyası
  (6 saat periyot, 1 dk açılış gecikmesi, `ExecuteDelete`).
- **Gizlilik + KVKK metni güncellenir:** "işlem güvenliği kayıtları
  (denetim izi) en çok N gün saklanır" cümlesi eklenir, N yapılandırmayla
  AYNI kaynaktan anlatılır (metinde 365 yazıp yapılandırmada 90 olamaz —
  uyum F3'ün kabul ölçütü). `LEGAL_UPDATED` elle güncellenir.

## 6. F4 — Kalıcılık ve dağıtım hazırlığı (öneri: sonnet · medium)

Sunucu GEREKMEZ; hepsi şimdi yazılır, `npm run stack:docker` ile yerelde
doğrulanır.

- `deploy/docker-compose.yml` + `docker-compose.prod.yml`: HER servise
  `logging: { driver: local, options: { max-size: "20m", max-file: "5" } }`.
  `local` sürücüsü sıkıştırır ve `docker logs`la okunur; sınır E3'ü kapatır
  ve "birkaç günlük pencere" beyanını gerçeğe bağlar (~100 MB/servis tavan).
- nginx: `/var/log/nginx/access.log`un stdout symlink'i olduğu compose
  yığınında DOĞRULANIR (`docker exec ... ls -l`); değilse conf stdout'a
  (`/dev/stdout`) çevrilir. Kabul ölçütü: `docker compose logs nginx` erişim
  satırlarını gösteriyor.
- `deploy/README.md`e runbook bölümü: günlük okuma (`docker compose logs -f
  api`, `--since`, JSON'u `jq` ile süzme örneği), denetim izinin panelden
  okunduğu notu.
- **Opsiyonel (aynı fazda, küçük):** korelasyon — nginx `proxy_set_header
  X-Request-Id $request_id;`, API tarafında enrichment'a `RequestId` ekle,
  nginx log_format'ına `$request_id` yaz. E6'yı kapatır.

## 7. F5 — Canlı operasyonel kuyruk (YAPILMAZ, kayıt için)

Bellek içi halka tampon sink + `GET /api/admin/logs/tail`. Elendi çünkü:
denetim sorusu (kim ne yaptı) F1–F2 ile, operasyon sorusu (şu an ne oluyor)
`docker logs` ile cevaplı; panele ham operasyonel log akıtmak IP/kimlik
içeren satırları ikinci bir yüzeye taşır. Gerçek bir ihtiyaç doğarsa ayrı
brifle açılır.

## 8. Sıra ve bağımlılık

```
F1 (çekirdek) ──► F2 (panel) ──► F3 (saklama + yasal metin)
F4 (kalıcılık/dağıtım) — bağımsız, istenirse ilk koşulur
```

Toplam kabaca: F1 ~1 oturum, F2 ~1 oturum, F3+F4 birlikte ~1 oturum.
Her faz kendi commit'lerini atar; faz bitmeden sonrakine geçilmez.

## 9. Bu brifle DEĞİŞMEYEN şeyler

- Stdout-tek-hedef kararı (`loglama-karari.md` §3) — dosya sink'i, volume,
  uygulama içi rotasyon yine yok.
- Sorgu kırpma (nginx `sorgusuz`, API'de token'sız yol) — aynen kalır.
- `ConsoleEmailSender`in bağlantıyı loglaması dev kolaylığıdır; üretimde bu
  göndericiye düşmek zaten arızadır (karar §7.1) — bu brif ek iş açmaz.
