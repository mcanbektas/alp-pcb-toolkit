// Panoya kopyalama — tarayıcı API'sini tanıyan tek yer.
//
// Saf katman (`lib/dfmSummary.js`) metni üretir, buraya yalnızca hazır dize
// gelir. Pano erişimi güvenli bağlam ister ve kullanıcı izniyle reddedilebilir;
// bu yüzden sonuç bir durum kodu olarak döner, istisna dışarı sızmaz.
//
// Durum kodu dilsizdir; cümleyi ekranın metin dosyası kurar.

import { useCallback, useRef, useState } from 'react'

export const COPY_IDLE = 'idle'
export const COPY_DONE = 'done'
export const COPY_FAILED = 'failed'

// "Kopyalandı" geri bildiriminin ekranda kalma süresi (ms).
const RESET_MS = 2000

export default function useClipboard() {
  const [state, setState] = useState(COPY_IDLE)
  const timer = useRef(null)

  const flash = useCallback((next) => {
    setState(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setState(COPY_IDLE), RESET_MS)
  }, [])

  const copy = useCallback(async (text) => {
    if (typeof text !== 'string' || text === '') {
      flash(COPY_FAILED)
      return COPY_FAILED
    }
    try {
      // Güvenli olmayan bağlamda `navigator.clipboard` tanımsızdır.
      if (!navigator?.clipboard?.writeText) throw new Error('unavailable')
      await navigator.clipboard.writeText(text)
      flash(COPY_DONE)
      return COPY_DONE
    } catch {
      // Kullanıcı metni elle seçip kopyalayabilsin diye ekran <pre> bloğunu
      // her hâlükârda gösterir; burada yalnızca durum bildirilir.
      flash(COPY_FAILED)
      return COPY_FAILED
    }
  }, [flash])

  return { copy, state }
}
