// Orta panel: "Sonuç" başlığı + geçersiz girdi kapısı + ekranın kendi sonuç
// içeriği. 28 ekranda birebir aynı kapı kopyalanıyordu; asıl kazanç ise
// erişilebilirlik: `aria-live` yalnızca burada tanımlanır ve sonuç her
// değişimde ekran okuyucuya duyurulur — eskiden 29 ekran sonucu sessizce
// yeniden hesaplıyordu, `aria-live` bütün uygulamada tek yerde (Toast) vardı.
//
// `useLang()` istisnası: başlık (`ui.result`) ve binlik ayırıcı uyarısı
// (`ui.thousandsNote`) her ekranda aynı çerçeve metnidir (bkz. CLAUDE.md).
// Ekrana özgü olan tek metin geçersizlik nedenidir ve `reason` prop'uyla
// (kod → cümle fonksiyonu) ekrandan gelir.
import { useLang } from '../hooks/useLang'
import { commonText } from '../data/uiText'

export default function ResultPanel({ r, reason, children }) {
  const { lang } = useLang()
  const ui = commonText(lang)
  return (
    // `polite`: duyuru mevcut okumayı kesmez; klavyeyle alan doldururken her
    // tuşta araya girmez, durakta güncel sonucu okur.
    <section className="panel" aria-live="polite">
      <h2>{ui.result}</h2>

      {!r.ok ? (
        r.ambiguous ? (
          <p className="empty-note warn">{ui.thousandsNote(r.ambiguous)}</p>
        ) : (
          <p className="empty-note">{reason(r.reason)}</p>
        )
      ) : (
        children
      )}
    </section>
  )
}
