# Brif 08 — Rapor anlık görüntüsü (ERTELENDİ — tasarım brifi)

**Model/effort:** Opus 5, medium (tasarım). BU BRİF SPEC DEĞİL.

## Bağlam

"Tekrar indir" bugün kayıttan YENİDEN üretir ve projenin GÜNCEL hâlini
yansıtır — bilinçli karar (ReportEndpoints üstündeki saklama notu +
docs/kod-incelemesi-2026-07-29.md: dosya saklayan her seçenek temizlik/
kota istiyordu; tek kullanıcı günde ~290 MB üretebiliyor). Mühendislik
belgesi için "o gün basılan revizyon" değerli — müşteri isteği gelmesi
en olası özellik bu.

## O gün karara bağlanacaklar

1. Ne saklanır: üretilen PDF/XLSX baytları mı (basit, ama kota+temizlik
   sorunu geri gelir) yoksa üretim anındaki ReportJson bölümlerinin
   kopyası mı (küçük, yeniden üretilebilir — önerilen yön)?
2. Kota: kullanıcı başına snapshot sayısı/boyutu; eskiyen temizliği
   (RefreshTokenCleanupService deseni hazır).
3. UI: rapor listesinde "o günkü hâli" / "güncel hâli" ayrımı — iki
   dilli metinler.
4. Migration + Reports tablosu ilişkisi (`Report.ProjectId SetNull`
   davranışıyla tutarlılık).

Karar yazılmadan kod yazılmaz — mevcut "saklamama" kararının gerekçesi
güçlü, onu deviren gerekçe de yazılı olmalı.
