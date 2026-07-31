# Brif 07 — İngilizce URL'ler + hreflang (ERTELENDİ — tasarım brifi)

**Model/effort:** Opus 5, high (tasarım). Uygulama sonra Sonnet'e
bölünür. BU BRİF SPEC DEĞİL — o gün önce tasarım dokümanı yazılır.

## Neden riskli

Yollar bugün Türkçe (`/arac/gerilim-bolucu`) ve ÜÇ yerde kimlik gibi
kullanılıyor: categories.js `path`, kayıtlı hesap bağlantıları
(`/arac/<slug>?hesap=<id>` — paylaşılabilir, KIRILMAMALI) ve main.jsx
legacy `#/` yönlendirmesi. Yanlış tasarım = kalıcı kırık link + SEO
cezası.

## O gün karara bağlanacaklar

1. URL şeması: `/en/tool/<en-slug>` mi, `/en/arac/<tr-slug>` mi, yoksa
   dil öneksiz tek yol + `hreflang`siz mi (SEO'da zayıf)? Slug çevirisi
   categories.js'e `slugEn` alanı olarak girer (tek kaynak kuralı).
2. Yönlendirme matrisi: eski TR yolları 301 mi kalır mı; `?hesap=`
   parametresi her iki şemada da çalışmalı.
3. `<html lang>`, TitleSync, prerender (Brif 03) ve sitemap (Brif 02)
   dil boyutu kazanır — dördü birlikte güncellenir.
4. Dil seçimi ile URL dili çakışması: URL mi kazanır localStorage mı?
   (Öneri: URL kazanır, seçim URL'e yazılır.)

## Ön koşul

Brif 03 (prerender) bitmiş olmalı — hreflang ancak prerender'lı
sayfalarda anlamlı.
