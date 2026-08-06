// Onay kartı — yıkıcı bir eylemi (proje silme gibi) ekranın ortasında
// doğrulatan ortak sunum bileşeni. State tutmaz, hesap yapmaz, kendi kullanıcı
// metnini ÜRETMEZ: başlık, mesaj ve düğme yazıları prop olarak gelir. Bu yüzden
// `useLang()`'i doğrudan okuyan bileşenler istisnasına katılmaz — gösterdiği
// cümle çerçeve metni değil, çağıranın metnidir (Toast.jsx ile aynı gerekçe).
//
// Neden native <dialog> + showModal(): docs/uyelik-ve-rapor-plani.md §6.4
// modalı reddederken gerekçe olarak örtü katmanını, odak hapsini ve kaydırma
// kilidini elle kurma bedelini sayıyordu. `showModal()` bunların tamamını
// tarayıcıdan verir — `::backdrop` örtüsü, odağın kart içinde kalması, Escape
// ile kapanma ve arka planın etkisizleşmesi (inert). Elle kurulan hiçbir parça
// yok, o yüzden gerekçe düşer ve karar §6.4'te İSTİSNA olarak işaretlendi.

import { useEffect, useId, useRef } from 'react'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
  // Onaydan önce doldurulması gereken alan varsa (yönetim panelinde silmeyi
  // isteyenin parolası) buraya gelir. Verilmezse kart eskisi gibi yalnız
  // mesaj + iki düğmedir; odak yine İPTAL düğmesindedir, yani alan eklenmiş
  // olması Enter'ın yanlışlıkla onaylama riskini geri getirmez.
  children = null,
}) {
  const dialogRef = useRef(null)
  const cancelBtnRef = useRef(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) {
      // Zaten açıkken showModal() çağırmak InvalidStateError fırlatır.
      if (!el.open) el.showModal()
      // Odak İPTAL düğmesine gider: yıkıcı eylem varsayılan odağı almaz, yoksa
      // Enter'a basan kullanıcı silmeyi onaylamış olur. `autoFocus` <dialog>
      // içinde güvenilir değil, odak burada elle verilir.
      cancelBtnRef.current?.focus()
    } else if (el.open) {
      el.close()
    }
  }, [open])

  // Escape. Kapatma kararını tarayıcıya BIRAKMIYORUZ: açık/kapalı tek bir
  // kaynakta (`open` prop'u) durur, yoksa dialog kapanır ama çağıranın state'i
  // açık kalır. preventDefault() ile kapanma durdurulur, iptal yukarı bildirilir
  // ve kart `open` false olduğunda effect'ten kapanır.
  function handleCancelEvent(e) {
    e.preventDefault()
    if (busy) return // silme sürerken Escape kapatmaz
    onCancel?.()
  }

  // Tarayıcı yine de kapattıysa (ör. geri tuşu) durum senkron kalsın.
  // Kendi close() çağrımızda `open` zaten false olduğu için tekrar bildirilmez.
  function handleClose() {
    if (open) onCancel?.()
  }

  // Örtüye tıklama. `<dialog>` elemanının kendisi kutunun DIŞIDIR — içerik bir
  // <div> içinde durduğu için hedefin dialog olması "kutunun dışına tıklandı"
  // demektir.
  function handleClick(e) {
    if (busy) return
    if (e.target === dialogRef.current) onCancel?.()
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={handleCancelEvent}
      onClose={handleClose}
      onClick={handleClick}
    >
      <div className="confirm-dialog-body">
        <h2 id={titleId}>{title}</h2>
        <p id={messageId} className="confirm-dialog-message">{message}</p>
        {children}
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="btn-ghost"
            ref={cancelBtnRef}
            disabled={busy}
            onClick={() => onCancel?.()}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={busy}
            onClick={() => onConfirm?.()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
