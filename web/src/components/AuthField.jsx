// Giriş/kayıt ekranlarındaki e-posta/parola/ad alanı. `TextField`'dan ayrı:
// TextField SMD/kondansatör kodu gibi büyük harfe zorlanan kodlar için var
// (autoCapitalize="characters"), bu alan sıradan metin girişi içindir.
export default function AuthField({
  label, type = 'text', value, onChange, autoComplete, hint, error,
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-row">
        <input
          type={type}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      {error
        ? <span className="field-hint danger">{error}</span>
        : hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
