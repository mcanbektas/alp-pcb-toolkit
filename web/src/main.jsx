import React from 'react'
import ReactDOM from 'react-dom/client'
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
