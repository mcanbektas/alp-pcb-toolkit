import { Link } from 'react-router-dom'
import { commonText } from '../data/uiText'

// Tarayıcı diliyle sayfa dili farklıysa çıkan kapatılabilir öneri şeridi.
// Kararlar: docs/brifler/15-dil-onerisi-seridi.md.
//
// `suggestion` `useLangSuggestion()`ın dönüşüdür ({ targetLang, targetPath,
// dismiss } ya da null). Otomatik yönlendirme DEĞİLDİR — gezinmeyi kullanıcı
// tıklayarak yapar (docs/en-url-karari.md §3).
//
// `to` burada zaten HEDEF dilde üretilmiştir (`translatePath` hook'ta
// çağrıldı), bu yüzden `LangLink` değil düz `Link` kullanılır — çevrilecek
// kanonik bir yol yok; LangSwitch'le aynı istisna sınıfı
// (pages/langLink.guard.test.js → ALLOWED).
//
// Metin HEDEF dilde okunur (`useLang()` değil): kullanıcı anlamadığı dildeki
// sayfada öneriyi kendi dilinde okumalı. Kök eleman da `lang={targetLang}`
// taşır — <html lang>'ın tersi yönde aynı gerekçe.
export default function LangSuggestionBanner({ suggestion }) {
  if (!suggestion) return null
  const { targetLang, targetPath, dismiss } = suggestion
  const ui = commonText(targetLang)

  return (
    <div className="lang-suggestion" lang={targetLang}>
      <div className="container lang-suggestion-inner">
        <p className="lang-suggestion-note">{ui.langSuggestNote}</p>
        <Link to={targetPath} className="lang-suggestion-go">{ui.langSuggestGo}</Link>
        <button
          type="button"
          className="lang-suggestion-dismiss"
          onClick={dismiss}
          aria-label={ui.langSuggestDismiss}
        >
          ×
        </button>
      </div>
    </div>
  )
}
