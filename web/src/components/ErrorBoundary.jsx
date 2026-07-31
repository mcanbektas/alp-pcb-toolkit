// Rota içeriğini saran hata sınırı. 32 tembel (lazy) chunk'lı bir uygulamada
// tek bir chunk indirmesi düşerse (bayat dağıtım, kopan ağ) Suspense fallback
// sonsuza dek asılı kalıyor ve ana alan BOŞ kalıyordu — kurtarma yolu yoktu.
//
// Sınıf bileşeni zorunlu: getDerivedStateFromError'ın hook karşılığı yok.
// Dil hook'u sınıfta kullanılamadığı için metni dışarıdaki ince fonksiyon
// sarmalayıcı okur ve prop olarak geçirir — bileşenin kendisi `useLang()`
// istisna listesine katılır (çerçeve metni her kullanımda birebir aynı,
// bkz. CLAUDE.md bileşen istisnaları).
//
// "Yeniden dene" state sıfırlamaz, sayfayı TAM yeniler: chunk hatasının en
// yaygın nedeni bayat index.html'dir ve onu ancak tam yenileme tazeler.

import { Component } from 'react'
import { useLang } from '../hooks/useLang'
import { commonText } from '../data/uiText'

class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="panel">
          <p className="empty-note">{this.props.note}</p>
          <button type="button" className="row-add" onClick={() => window.location.reload()}>
            {this.props.retry}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ErrorBoundary({ children }) {
  const { lang } = useLang()
  const ui = commonText(lang)
  return (
    <Boundary note={ui.errorBoundaryNote} retry={ui.errorBoundaryRetry}>
      {children}
    </Boundary>
  )
}
