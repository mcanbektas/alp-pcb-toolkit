#!/usr/bin/env node
// Geliştirme yığını — TEK ADRES: http://localhost:3000
//
// Üç yüzey vardı ve hangisinin açık olduğunu hatırlamak iş çıkarıyordu:
// vite (3000), dotnet (5289) ve docker yığını (8080). İkisi aynı uygulamayı
// farklı biçimde servis ediyor. Günlük iş artık tek adrestir; docker yığını
// yalnız DERLENMİŞ çıktıyı doğrulamak için kaldırılır (`npm run stack:docker`)
// — prerender, nginx `try_files`, canonical/hreflang ve service worker ancak
// orada görünür.
//
// Bu betik iki süreci birlikte başlatır ve BİRLİKTE söndürür: biri ölürse
// öteki de kapanır, yoksa yarım yığın arkada kalır ve bir dahaki başlatma
// "port kullanımda" diye patlar (bugün olan tam buydu).
//
// Yeni bağımlılık eklenmedi (concurrently vb.): iki `spawn` ve bir çıkış
// kancası yetiyor.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoDir = path.resolve(webDir, '..')

// API ARTIK BU DEPODA DEĞİL: süit ayrıştırmasında alp-platform'a taşındı
// (ortak kimlik/veritabanı/rapor katmanı, bütün ürünler onu kullanır).
// Kardeş dizin varsayımı — başka yerdeyse ALP_PLATFORM_DIR ile geçilir:
//   ALP_PLATFORM_DIR=/yol/alp-platform npm run stack
const platformDir = process.env.ALP_PLATFORM_DIR
  ? path.resolve(process.env.ALP_PLATFORM_DIR)
  : path.resolve(repoDir, '..', 'alp-platform')
const apiDir = path.join(platformDir, 'api')

// API portu `vite.config.js`teki proxy hedefiyle AYNI olmak zorunda; ayrıştığı
// gün istekler sessizce 404 döner (uygulama açılır, giriş çalışmaz).
const API_PORT = 5289
const WEB_PORT = 3000

// Portu kim tutuyor bilinmiyor ama tutuluyorsa vite'ın `strictPort` hatası ya
// da dotnet'in yığın izi yerine tek cümle basılır.
function portBos(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, '127.0.0.1')
  })
}

const children = []
let kapaniyor = false

function hepsiniKapat(code) {
  if (kapaniyor) return
  kapaniyor = true
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  process.exitCode = code ?? 0
}

function baslat(ad, komut, argv, cwd) {
  const child = spawn(komut, argv, { cwd, stdio: 'inherit' })
  child.on('error', (err) => {
    console.error(`[${ad}] başlatılamadı: ${err.message}`)
    hepsiniKapat(1)
  })
  // Biri düşerse öteki de kapanır — yarım yığın bırakmamanın tek yolu.
  child.on('exit', (code, signal) => {
    if (kapaniyor) return
    console.error(`[${ad}] durdu (${signal ?? `çıkış ${code}`}) — yığın kapatılıyor.`)
    hepsiniKapat(code ?? 1)
  })
  children.push(child)
  return child
}

for (const sinyal of ['SIGINT', 'SIGTERM']) {
  process.on(sinyal, () => hepsiniKapat(0))
}

const dolu = []
for (const [ad, port] of [['API', API_PORT], ['web', WEB_PORT]]) {
  // eslint-disable-next-line no-await-in-loop
  if (!(await portBos(port))) dolu.push(`${ad} (${port})`)
}
if (dolu.length) {
  console.error(`dev-stack: şu portlar zaten kullanımda: ${dolu.join(', ')}.`)
  console.error('  Önceki yığın hâlâ açık olabilir. Kim tuttuğunu görmek için:')
  console.error(`    lsof -nP -iTCP:${API_PORT},${WEB_PORT} -sTCP:LISTEN`)
  process.exit(1)
}

console.log(`dev-stack: API :${API_PORT}, web :${WEB_PORT} → http://localhost:${WEB_PORT}`)
console.log('  (docker yığını 8080 ayrı ve gerekmiyor — bkz. npm run stack:docker)')

// Platform deposu bulunamazsa dotnet'in "proje bulunamadı" yığın izi yerine
// tek cümle basılır — sebep neredeyse her zaman aynı: depo klonlanmamış ya da
// kardeş dizinde değil.
if (!existsSync(apiDir)) {
  console.error(`dev-stack: platform deposu bulunamadı → ${apiDir}`)
  console.error('  API alp-platform deposundadır. Yan yana klonlayın:')
  console.error(`    git clone https://github.com/mcanbektas/alp-platform.git ${platformDir}`)
  console.error('  Başka bir yerdeyse: ALP_PLATFORM_DIR=/yol/alp-platform npm run stack')
  console.error('  Yalnız arayüzle çalışacaksanız API gerekmez: npm run dev')
  process.exit(1)
}

baslat(
  'API',
  'dotnet',
  ['run', '--project', 'Alp.Api/Alp.Api.csproj', '--urls', `http://localhost:${API_PORT}`],
  apiDir,
)
baslat('web', 'npx', ['vite'], webDir)
