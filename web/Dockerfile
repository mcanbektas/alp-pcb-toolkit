# Derleme bağlamı depo köküdür: `docker build -f web/Dockerfile .`
# (nginx yapılandırması deploy/ altında durduğu için tek dizin bağlamı yetmez.)

# ---- derleme ----
FROM node:22-alpine AS build
WORKDIR /src

COPY web/package.json web/package-lock.json* ./
# Kilit dosyası varsa `npm ci` (birebir aynı sürümler), yoksa `npm install`.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY web/ ./
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
# Compose bunu deploy/.env'den geçirir; değeri değişince imaj yeniden
# derlenmelidir (`--build`), yeniden başlatmak yetmez.
ARG VITE_SITE_URL
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# ---- sunum ----
FROM nginx:1.27-alpine AS runtime

# İmaj tek başına da çalışsın diye TLS'siz yapılandırma gömülür; üretimde
# deploy/docker-compose.prod.yml bunun üstüne nginx.prod.conf'u bağlar.
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
