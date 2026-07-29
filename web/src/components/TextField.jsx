// Serbest metin girişi — kod alanları için (SMD kodu, kondansatör kodu).
// Sayısal alanlar için NumberField kullanılır.
export default function TextField({ label, value, onChange, hint, placeholder }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-row">
        <input
          type="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck="false"
          value={value}
          placeholder={placeholder || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
