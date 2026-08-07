// Bilgi kartı — ekranın ortasında salt okunur içerik gösteren ortak sunum
// bileşeni. ConfirmDialog ile AYNI native <dialog> + showModal() deseni ve
// AYNI CSS sınıfları (confirm-dialog*): ikinci bir görsel dil doğmasın diye
// yeni sınıf tanımlanmadı (bkz. ConfirmDialog.jsx başındaki §6.4 gerekçesi —
// örtü, odak hapsi, Escape ve arka planın etkisizleşmesi tarayıcıdan gelir).
// Ayrım davranışsal: onaylanacak eylem yok, tek düğme kapatır; Escape ve
// örtüye tıklama da kapatır. `busy` kavramı yok — gösterilen şey salt okunur.
//
// Metin ÜRETMEZ: başlık, kapat etiketi ve içerik prop olarak gelir. Gösterdiği
// cümle çerçeve metni değil, çağıranın metnidir (ConfirmDialog/Toast ile aynı
// gerekçe) — bu yüzden `useLang()` istisnasına katılmaz.

import { useEffect, useId, useRef } from 'react'

export default function InfoDialog({ open, title, closeLabel, onClose, children }) {
  const dialogRef = useRef(null)
  const closeBtnRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) {
      // Zaten açıkken showModal() çağırmak InvalidStateError fırlatır.
      if (!el.open) el.showModal()
      // Tek eylem kapatmak — odak doğrudan ona gider. `autoFocus` <dialog>
      // içinde güvenilir değil, odak elle verilir (ConfirmDialog ile aynı).
      closeBtnRef.current?.focus()
    } else if (el.open) {
      el.close()
    }
  }, [open])

  // Escape. Kapatma kararı tek kaynakta (`open` prop'u) kalsın diye tarayıcıya
  // BIRAKILMAZ — yoksa dialog kapanır ama çağıranın state'i açık kalır
  // (ConfirmDialog'daki gerekçenin aynısı).
  function handleCancelEvent(e) {
    e.preventDefault()
    onClose?.()
  }

  // Tarayıcı yine de kapattıysa (ör. geri tuşu) durum senkron kalsın.
  function handleClose() {
    if (open) onClose?.()
  }

  // Örtüye tıklama. `<dialog>` elemanının kendisi kutunun DIŞIDIR — içerik bir
  // <div> içinde durduğu için hedefin dialog olması "dışına tıklandı" demektir.
  function handleClick(e) {
    if (e.target === dialogRef.current) onClose?.()
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={titleId}
      onCancel={handleCancelEvent}
      onClose={handleClose}
      onClick={handleClick}
    >
      <div className="confirm-dialog-body">
        <button
          type="button"
          className="confirm-dialog-close"
          ref={closeBtnRef}
          onClick={() => onClose?.()}
          aria-label={closeLabel}
        >
          ×
        </button>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </dialog>
  )
}
