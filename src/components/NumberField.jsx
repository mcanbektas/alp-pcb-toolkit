// Sayısal giriş alanı: opsiyonel birim seçici ve ipucu satırı ile.
// Değer string olarak tutulur; ayrıştırma hesap katmanında yapılır.
//
// `EpsEffFields`, `RowList` ve `LineChart` gibi istisna: birim seçicinin ekran
// okuyucu etiketi ("… birimi") her ekranda aynı olduğu için dili doğrudan
// `useLang()`'den okur. Görünen etiket ve ipucu yine prop olarak gelir.

import { useLang } from '../hooks/useLang'
import { commonText } from '../data/uiText'

export default function NumberField({ label, value, onChange, units, unit, onUnit, hint, placeholder }) {
  const { lang } = useLang()

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-row">
        <input
          inputMode="decimal"
          value={value}
          placeholder={placeholder || ''}
          onChange={(e) => onChange(e.target.value)}
        />
        {units && (
          <select
            value={unit}
            onChange={(e) => onUnit(e.target.value)}
            aria-label={commonText(lang).unitAria(label)}
          >
            {units.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        )}
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
