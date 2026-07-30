// Giriş/kayıt ekranlarındaki e-posta/parola/ad alanı. `TextField`'dan ayrı:
// TextField SMD/kondansatör kodu gibi büyük harfe zorlanan kodlar için var
// (autoCapitalize="characters"), bu alan sıradan metin girişi içindir.
//
// `type="password"` verildiğinde alanın sağına bir görünürlük düğmesi eklenir.
// İki sapma bilinçlidir:
//
//   1. Bileşen state TUTAR. Kural (CLAUDE.md) sunum bileşenlerinin state
//      tutmamasıdır ve veri state'i için geçerliliğini koruyor; buradaki tek
//      state ise alanın kendi görünürlüğü — ekranın verisi değil. Yukarı
//      taşınsa aynı `useState` beş ekrana kopyalanırdı ve hiçbiri onu okumaz.
//   2. Düğmenin adını `useLang()`'den doğrudan okur. Gerekçe RowList/NumberField
//      ile aynı: "Parolayı göster/gizle" bileşenin KENDİ çerçeve metnidir, beş
//      ekranda birebir aynıdır ve prop olarak geçirmek aynı iki dilli sözlüğü
//      beş kez kopyalamak olurdu. Ekrana özgü olan (etiket, ipucu, hata) yine
//      prop olarak gelir.
//
// Düğme `<label>` içinde durur: tıklanınca odak zaten girdiye gider, bu da
// istenen davranış. `type="button"` zorunlu — varsayılan `submit` olsaydı göz
// simgesine basmak formu gönderirdi.
import { useState } from 'react'
import { useLang } from '../hooks/useLang'
import { commonText } from '../data/uiText'

export default function AuthField({
  label, type = 'text', value, onChange, autoComplete, hint, error,
}) {
  const { lang } = useLang()
  const ui = commonText(lang)
  const [revealed, setRevealed] = useState(false)

  const isPassword = type === 'password'
  const toggleLabel = revealed ? ui.passwordHide : ui.passwordShow

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-row">
        <input
          type={isPassword && revealed ? 'text' : type}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
        {isPassword && (
          <button
            type="button"
            className="pw-toggle"
            onClick={() => setRevealed((on) => !on)}
            aria-label={toggleLabel}
            aria-pressed={revealed}
            title={toggleLabel}
          >
            {/* Göz simgesi. Rengini taşımaz — `currentColor` ile .pw-toggle
                kuralından alır, böylece literal renk kuralı bozulmaz. Kapalı
                hâlde göz, açık hâlde üzeri çizili göz çizilir; durum yalnızca
                renge ya da tona bırakılmaz. */}
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path
                d="M1.7 10S4.9 4.6 10 4.6 18.3 10 18.3 10 15.1 15.4 10 15.4 1.7 10 1.7 10Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              {revealed && (
                <path
                  d="M3.5 16.5 16.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        )}
      </span>
      {error
        ? <span className="field-hint danger">{error}</span>
        : hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
