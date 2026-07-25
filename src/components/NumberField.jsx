// Sayısal giriş alanı: opsiyonel birim seçici ve ipucu satırı ile.
// Değer string olarak tutulur; ayrıştırma hesap katmanında yapılır.
export default function NumberField({ label, value, onChange, units, unit, onUnit, hint, placeholder }) {
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
          <select value={unit} onChange={(e) => onUnit(e.target.value)} aria-label={`${label} birimi`}>
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
