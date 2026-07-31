import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
// Yazı tipleri temadan bağımsızdır (dört tema da aynı üç aileyi kullanır), bu
// yüzden tema anahtarından ayrı bir dosyada durur ve ondan ÖNCE yüklenir.
import './fonts.css'
import './theme.css'

// Eski HashRouter bağlantıları (#/arac/...) BrowserRouter'a geçişte kırılmasın
// diye — geçmişe yeni girdi eklemeden adres çubuğu React render'dan önce
// düzeltilir. docs/uyelik-ve-rapor-plani.md §8 risk R3.
if (window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', window.location.hash.slice(1) + window.location.search)
}

const container = document.getElementById('root')
const tree = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Araç ve kategori sayfaları derleme sonrası prerender'lanıyor
// (`scripts/build-prerender.mjs`), yani kök düğüm DOLU gelebilir. O zaman
// `hydrateRoot`: var olan DOM yeniden kullanılır, atılıp yeniden kurulmaz.
//
// İki durumda yine de `createRoot`:
//   - kök boşsa — prerender'lanmamış rota (giriş, hesap sayfaları) ya da
//     SPA geri düşüşüyle gelen boş kabuk;
//   - istekte sorgu dizesi varsa — prerender çıktısı sorgusuz üretildi ve
//     `?hesap=<id>` ile açılan araç ekranının ilk render'ı farklıdır
//     (`useSavedCalculation` yükleme durumunda başlar). O sayfa kullanıcıya
//     özeldir, prerender kazancı zaten aranmaz.
// Ayrıntı: docs/prerender-karari.md §2.
if (container.hasChildNodes() && !window.location.search) {
  hydrateRoot(container, tree)
} else {
  createRoot(container).render(tree)
}
