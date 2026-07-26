// Tekrarlanan satır girişi — paralel yollar, stack-up katmanları, kapasitör ağı.
//
// Satırlar form state'inde bir dizi olarak tutulur; her satır kendi alan
// değerlerini taşır. Bileşen yalnızca düzeni ve satır ekleme/silmeyi yönetir,
// ayrıştırma `lib/fields.js` içindeki `readRows` ile yapılır.

export default function RowList({
  label, rows, columns, onChange,
  min = 1, max = 12,
  addLabel = 'Satır ekle',
  rowLabel = 'Satır',
  hint,
}) {
  const setCell = (i, key) => (value) => {
    onChange(rows.map((row, j) => (j === i ? { ...row, [key]: value } : row)))
  }

  const add = () => {
    if (rows.length >= max) return
    // Yeni satır sonuncunun kopyasıdır — art arda benzer satır girmek yaygın
    onChange([...rows, { ...rows[rows.length - 1] }])
  }

  const remove = (i) => {
    if (rows.length <= min) return
    onChange(rows.filter((_, j) => j !== i))
  }

  return (
    <div className="row-list">
      <span className="field-label">{label}</span>

      <div className="row-list-head">
        <span className="idx" />
        {columns.map((c) => <span key={c.key}>{c.label}</span>)}
        <span className="act" />
      </div>

      {rows.map((row, i) => (
        <div className="row-list-item" key={i}>
          <span className="idx">{i + 1}</span>
          {columns.map((c) => (
            <span className="cell" key={c.key}>
              <input
                inputMode="decimal"
                aria-label={`${rowLabel} ${i + 1} — ${c.label}`}
                value={row[c.key] ?? ''}
                placeholder={c.placeholder ?? ''}
                onChange={(e) => setCell(i, c.key)(e.target.value)}
              />
              {c.units && (
                <select
                  aria-label={`${rowLabel} ${i + 1} — ${c.label} birimi`}
                  value={row[c.unitKey] ?? c.units[0]}
                  onChange={(e) => setCell(i, c.unitKey)(e.target.value)}
                >
                  {c.units.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              )}
            </span>
          ))}
          <button
            type="button"
            className="act"
            onClick={() => remove(i)}
            disabled={rows.length <= min}
            aria-label={`${rowLabel} ${i + 1} sil`}
          >
            ×
          </button>
        </div>
      ))}

      <button type="button" className="row-add" onClick={add} disabled={rows.length >= max}>
        + {addLabel}
      </button>

      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}
