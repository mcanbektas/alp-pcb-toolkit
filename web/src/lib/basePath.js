// Süit önekinin TEK kaynağı.
//
// PCB süit edge'i altında `/pcb/` önekiyle yayınlanır. Bu önek üç yerde
// gerekir: varlık adresleri (vite `base`), tarayıcı yönlendiricisi
// (`BrowserRouter basename`) ve derleme zamanı prerender'ı (`StaticRouter`).
// Üçü ayrı ayrı yazılsaydı biri değişip diğerleri kalabilirdi ve sonuç sessiz
// olurdu: sayfa açılır, bağlantılar 404'e gider.
//
// `import.meta.env.BASE_URL` vite'ın `base` değeridir (`vite.config.js`),
// hem tarayıcı hem `--ssr` derlemesinde tanımlıdır. Yönlendirici sondaki
// eğik çizgiyi istemez; kökte yayınlanırsa (`base: '/'`) basename `/` olur.
export const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'
