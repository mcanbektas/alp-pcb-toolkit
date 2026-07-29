// Serbest metin girişi — kod alanları için (SMD kodu, kondansatör kodu).
// Sayısal alanlar için NumberField kullanılır.
//
// `autoCapitalize` varsayılanı kod alanları içindir: mobil klavye harfleri
// büyütür. Kullanıcının kendi yazdığı bir ad (kayıt adı gibi) için çağıran
// 'none' geçer — varsayılan değişmez, mevcut iki ekran etkilenmez.
export default function TextField({
  label, value, onChange, hint, placeholder, autoCapitalize = 'characters',
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-row">
        <input
          type="text"
          autoCapitalize={autoCapitalize}
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
