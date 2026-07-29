import { useEffect } from 'react'

// Ekranın ortasında duran kısa süreli bildirim kartı — "Çıkış yapıldı" gibi,
// kullanıcıyı durdurmayan geri bildirim.
//
// MODAL DEĞİLDİR (CLAUDE.md §11: modal kullanılmaz). Ortada durur ama arkayı
// karartmaz, odağı hapsetmez ve tıklamayı yutmaz: dış alan `pointer-events:
// none` taşır, yalnızca kartın kendisi tıklanabilir. Arkadaki sayfa okunmaya
// ve kullanılmaya devam eder.
//
// Metni PROP olarak alır, `useLang()`'e bakmaz: gösterdiği cümle çerçeve metni
// değil, çağıran ekranın metnidir. Çerçeve metinleri (kapatma etiketi, süre
// notu) da prop olarak gelir — çağıran onları `commonText(lang)`'ten alır.
//
// Canlı bölge (`role="status"`) mesaj yokken de basılır. Ekran okuyucular,
// sonradan DOM'a EKLENEN bir canlı bölgenin ilk içeriğini çoğu zaman
// duyurmaz — bölge önce var olmalı, mesaj sonra içine girmeli.
export default function Toast({
  message, onDismiss, closeLabel, autoCloseNote, timeoutMs = 3000,
}) {
  useEffect(() => {
    if (!message || !onDismiss) return undefined
    const id = setTimeout(onDismiss, timeoutMs)
    return () => clearTimeout(id)
  }, [message, onDismiss, timeoutMs])

  // Esc ile de kapanır: kart odakta olmasa bile kullanıcı klavyeden kurtulabilsin.
  useEffect(() => {
    if (!message || !onDismiss) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onDismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [message, onDismiss])

  return (
    <div className="toast-area" role="status" aria-live="polite">
      {message && (
        <div className="toast">
          <button
            type="button"
            className="toast-close"
            onClick={onDismiss}
            aria-label={closeLabel}
          >
            ×
          </button>
          <p className="toast-message">
            <span className="toast-mark" aria-hidden="true">✓</span>
            {message}
          </p>
          {/* Süre notu ekran okuyucuya tekrar okutulmaz: mesajla birlikte
              duyurulması gereken bilgi mesajın kendisi, bu satır görsel bir
              beklenti açıklaması. */}
          <p className="toast-note" aria-hidden="true">{autoCloseNote}</p>
        </div>
      )}
    </div>
  )
}
