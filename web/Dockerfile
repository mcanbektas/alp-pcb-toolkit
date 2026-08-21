# Derleme bağlamı depo köküdür: `docker build -f web/Dockerfile .`
# (Bağlam web/ yapılabilirdi; kökte bırakıldı ki platform deposundaki compose
# örtüsü `context: ../../alp-pcb-toolkit` ile aynı komutu kurabilsin.)

# ---- derleme ----
FROM node:22-alpine AS build
WORKDIR /src

COPY web/package.json web/package-lock.json* ./
# Kilit dosyası varsa `npm ci` (birebir aynı sürümler), yoksa `npm install`.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY web/ ./
# `authMailPaths.guard.test.js` sunucudaki yol tablosunu arar ve bulamazsa
# kendini atlar: sunucu artık alp-platform deposunda, imaj bağlamında yok.
# (Ayrıştırma öncesi o tek dosya bağlama kopyalanıyordu.) Bekçinin asıl
# çözümü Faz 3: auth mail yolları ürün başına yapılandırmaya taşınacak —
# Comm'un da kendi doğrulama sayfası olacak, tek sabit tablo zaten yetmeyecek.
# Hesap motorları testten geçmeden imaja girmez.
RUN npm test
# VITE_API_BASE_URL verilmez: useAuth.jsx boş tabanı aynı köken sayar, yani
# /api istekleri nginx'in kendisine gider. Ayrı alan adına taşınırsa burada
# --build-arg ile geçilir.
#
# VITE_SITE_URL ise DERLEME zamanında gerekir ve çalışma zamanında verilemez:
# sitemap.xml'in URL'leri ile 76 sayfanın <head>'indeki canonical/hreflang
# etiketleri bu adresten üretilip statik dosyalara YAZILIR. Verilmezse
# placeholder alan adı yazılır ve derleme uyarı basar (scripts/site-url.mjs).
# Compose bunu platform deposunun deploy/.env'inden geçirir (CI'da ise depo
# değişkeni SITE_URL'den); değeri değişince imaj yeniden derlenmelidir
# (`--build`), yeniden başlatmak yetmez.
ARG VITE_SITE_URL
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# ---- sunum ----
FROM nginx:1.30-alpine AS runtime

# İmaj tek başına da çalışsın diye TLS'siz yapılandırma gömülür; üretimde
# platform deposundaki docker-compose.prod.yml bunun üstüne nginx.prod.conf'u
# bağlar. Dosya ayrıştırmada deploy/'dan buraya taşındı: sunum yapılandırması
# imajın kendi işidir, imajı üreten depoda durur.
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
