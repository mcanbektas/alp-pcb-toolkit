export default function SelectField({ label, value, onChange, options, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="select-only" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
