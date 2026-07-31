# Brif 06 — Sunucu günü (SUNUCU ALINDIĞINDA)

**Model/effort:** Sonnet 5, medium. Çoğu adım runbook takibi; asıl
kaynak `deploy/README.md` — bu brif onun üstüne eklenen delta.

## Sıra

1. **İlk kurulum:** deploy/README.md "Sunucu" bölümünü izle (compose
   prod, ilk sertifika sırası, .env doldurma). README'nin server bölümü
   hiç gerçek sunucuda koşmadı — plan gibi oku, sapmaları README'ye işle.
2. **SMTP:** sağlayıcı hesabı → `.env`'e `SMTP_HOST/PORT/USER/PASSWORD/
   FROM_ADDRESS` → api yeniden başlat → kayıt akışıyla GERÇEK doğrulama
   maili test et. SMTP'siz üretimde KİMSE giriş yapamaz (RequireConfirmedEmail)
   ve ConsoleEmailSender üretimde token'ları bastırıyor — yani SMTP
   olmadan yayın açılmaz.
3. **Alan adı bağımlıları:** `.env` `APP_DOMAIN`, `App__FrontendBaseUrl`
   (Production'da boşsa api AÇILMAZ — bilinçli fail-fast),
   `VITE_SITE_URL` (sitemap), robots.txt'ye Sitemap satırı (Brif 02
   notu), `WEB_PORT=80` (prod'da 8080 kalırsa ACME ve redirect ölür —
   README'deki tuzak).
4. **Yedek:** `backup.sh` cron'u + `BACKUP_REMOTE_TARGET` doldur; İLK
   GÜN bir restore provası yap (README'deki 3 adımlı prosedür).
5. **İzleme:** harici uptime servisi → `https://<domain>/api/health/ready`
   (30/dk IP limiti var — kontrol aralığını 1 dk+ seç). Cert yenileme
   cron'u (`nginx -s reload`) + certbot loguna alarm.
6. **CI dağıtım adımı:** deploy.yml'e sunucu adımı eklemek İSTEĞE bağlı
   (README'de gerekçesiyle yok); eklenirse SSH sırrı ancak o gün depoya
   girer.
7. **Auth'lu e2e** (Brif 05'in ertelenen yarısı): gerçek SMTP ile
   kayıt→doğrula→kaydet akışı artık test edilebilir — ayrı karar.

## Bitiş

deploy/README.md "Bilinen eksikler" bölümünü güncelle; README tablosunu
işaretle. Yapılandırma değişiklikleri commit'lenir, sırlar ASLA.
