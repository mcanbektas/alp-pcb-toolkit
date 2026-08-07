// Facet listesi — dikey, aile başlıklı, birbirini dışlayan filtre kontrolü
// (`Segmented`/eski `FilterChips` ile aynı `role="radiogroup"` deseni, ok
// tuşu seçimi taşır ve odağı birlikte götürür). Yalnız yönetici gördüğü için
// sığdırma derdi yok; `groups` dizisi baştan aileleştirilmiş gelir
// (`audit/text.js` → eventGroups).
//
// İlk grup genelde başlıksız tek satırlık "(hepsi)" seçeneğidir — `heading`
// alanı o zaman verilmez.
import { useRef } from 'react'

export default function FacetList({ groups, value, onChange, label }) {
  const refs = useRef({})
  const flat = groups.flatMap((g) => g.options)

  function onKeyDown(e, index) {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1
      : 0
    if (dir === 0) return
    e.preventDefault()
    const next = (index + dir + flat.length) % flat.length
    onChange(flat[next].value)
    refs.current[flat[next].value]?.focus()
  }

  const selectedIndex = Math.max(0, flat.findIndex((o) => o.value === value))

  return (
    <div className="facet-list" role="radiogroup" aria-label={label}>
      {groups.map((g) => (
        <div className="facet-group" key={g.key}>
          {g.heading && <div className="facet-heading">{g.heading}</div>}
          {g.options.map((o) => {
            const index = flat.findIndex((x) => x.value === o.value)
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={value === o.value}
                tabIndex={index === selectedIndex ? 0 : -1}
                ref={(el) => { refs.current[o.value] = el }}
                className={`facet-item${value === o.value ? ' on' : ''}`}
                onClick={() => onChange(o.value)}
                onKeyDown={(e) => onKeyDown(e, index)}
              >
                {o.dotClass && <span className={`dot ${o.dotClass}`} />}
                {o.label}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
