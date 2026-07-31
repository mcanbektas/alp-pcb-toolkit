// Prerender giriş noktası — YALNIZCA derleme zamanında, Node'da koşar.
// Tarayıcıya hiç gönderilmez (`vite build --ssr` ile ayrı bir pakete girer,
// `dist/`e kopyalanmaz).
//
// Uygulama ağacı `src/App.jsx`ten gelir: yönlendirici DIŞARIDAN sarılır
// (`AppProviders` + `AppRoutes`), böylece rota listesi ve sağlayıcı sırası
// tarayıcıyla tek kaynaktan paylaşılır. İkinci bir rota tablosu tutulsaydı
// ekranların yarısı sessizce prerender kapsamı dışında kalabilirdi.

import { Writable } from 'node:stream'
import { renderToPipeableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { AppProviders, AppRoutes } from '../../src/App'

// `renderToString` DEĞİL: araç ekranları `lazy()` ile yükleniyor ve
// `renderToString` Suspense sınırında fallback basıp durur — 29 aracın
// hiçbirinin gövdesi çıktıya girmezdi. `renderToPipeableStream` `onAllReady`
// ile bütün lazy chunk'lar çözüldükten SONRA tetiklenir, yani tam gövde
// elde edilir. Karşılığı: akış bitene dek beklenir (SEO çıktısı için doğru
// olan da bu — kısmi HTML indekslenmez).
export function renderRoute(url) {
  return new Promise((resolve, reject) => {
    let didError = null
    const chunks = []
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk))
        callback()
      },
      final(callback) {
        callback()
        if (didError) reject(didError)
        else resolve(Buffer.concat(chunks).toString('utf8'))
      },
    })

    const stream = renderToPipeableStream(
      <AppProviders>
        <StaticRouter location={url}>
          <AppRoutes />
        </StaticRouter>
      </AppProviders>,
      {
        onAllReady() {
          stream.pipe(sink)
        },
        onError(error) {
          // Kabuk hatası `onShellError`a düşer; buradaki hata bir Suspense
          // sınırının içindedir. Sessizce yutulmaz: eksik gövdeyle üretilmiş
          // bir sayfa, hiç üretilmemiş sayfadan kötüdür (bot onu tam sanır).
          didError = error
        },
        onShellError(error) {
          reject(error)
        },
      },
    )
  })
}
