// Mod seçici (Analiz/Sentez vb.). ROL DÜZELTMESİ: eskiden `tablist`/`tab`
// ilan ediyordu ama ne `tabpanel` ne `aria-controls` ne de ok tuşu modeli
// vardı — rolün vaat ettiği klavye deseni yerine getirilmiyordu (23 ekranda).
// Bunlar sekme değil, birbirini dışlayan mod seçenekleri: doğru rol
// `radiogroup`/`radio`. Klavye modeli de rolün gerektirdiği gibi: grup TEK
// durakla gezilir (yalnızca seçili düğme sekme sırasında), ok tuşları seçimi
// taşır ve odağı birlikte götürür.
import { useRef } from 'react'

export default function Segmented({ options, value, onChange, label }) {
  const refs = useRef([])

  // Değer listede yoksa (geçici durum) ilk düğme durak olur — yoksa grup
  // klavyeden büsbütün erişilmez kalırdı.
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value))

  function onKeyDown(e, index) {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1
      : 0
    if (dir === 0) return
    e.preventDefault()
    const next = (index + dir + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={i === selectedIndex ? 0 : -1}
          ref={(el) => { refs.current[i] = el }}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
