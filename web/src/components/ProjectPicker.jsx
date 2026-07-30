// Proje seçici — tek alanda "var olanı bul" ve "yenisini adlandır".
//
// Öncesinde iki alan vardı: mevcut projeler için bir `<select>`, altında yeni
// proje adı için bir metin kutusu; birine dokunmak diğerini temizliyordu. İkisi
// aynı kararı soruyordu ve karar tek: hesap HANGİ projeye gidecek. Alan da tek
// olmalı.
//
// Yazılan metin listeyi süzer. Tam eşleşme yoksa listenin başına "yeni proje
// oluştur" satırı gelir — yani yeni proje açmak ayrı bir kutu değil, aramanın
// doğal sonucu.
//
// Neden `<datalist>` değil: açılan listenin görünümünü tarayıcı çizer, dört
// temanın hiçbiriyle uyuşmaz ve "yeni oluştur" satırı gösterilemez.
//
// State: yalnızca AÇIK/KAPALI ve klavyeyle gezinen satır. Seçimin kendisi
// (`selectedId`, `query`) çağırandan gelir — bileşen veri tutmaz.
//
// Kullanıcı metni yoktur, hepsi `text` prop'undan gelir: bu bileşen tek bir
// panelde kullanılıyor, `useLang()`'i doğrudan okuyan istisnalara katılmaz.
import { useEffect, useId, useRef, useState } from 'react'

export default function ProjectPicker({
  projects, query, onQueryChange, selectedId, onSelect, text, disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const listId = useId()

  const trimmed = query.trim()
  const needle = trimmed.toLocaleLowerCase()
  const matches = needle
    ? projects.filter((p) => p.name.toLocaleLowerCase().includes(needle))
    : projects

  // "Yeni oluştur" satırı yalnızca yazılmış bir ad varken ve o ad var olan bir
  // projeyle BİREBİR aynı değilken görünür — aksi hâlde kullanıcıya aynı adla
  // ikinci bir proje açma yolu gösterilirdi.
  const exact = projects.some((p) => p.name.toLocaleLowerCase() === needle)
  const showCreate = trimmed !== '' && !exact

  // Satırların düz listesi: klavye gezinmesi ve tıklama aynı sırayı görmeli.
  const rows = [
    ...(showCreate ? [{ kind: 'create' }] : []),
    ...matches.map((p) => ({ kind: 'project', project: p })),
  ]

  useEffect(() => {
    if (!open) return undefined
    // Dışarı tıklama kapatır. `mousedown` kullanılır, `click` değil: satıra
    // basılıp fare dışarıda bırakıldığında liste kapanmadan seçim kaçardı.
    function onDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Süzme sonucu değiştiğinde etkin satır listenin dışında kalabilir.
  useEffect(() => { setActive(0) }, [query])

  function choose(row) {
    if (row.kind === 'create') {
      // Ad zaten alanda yazılı; seçimi boşaltmak "bu ad yeni bir proje"
      // demektir (çağıran taraf `selectedId` boşken yeni proje açar).
      onSelect(null)
    } else {
      onSelect(row.project)
      onQueryChange(row.project.name)
    }
    setOpen(false)
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      if (rows.length === 0) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + rows.length) % rows.length)
      return
    }
    if (e.key === 'Enter' && open && rows[active]) {
      // Formu göndermez: liste açıkken Enter satır seçmektir.
      e.preventDefault()
      choose(rows[active])
    }
  }

  return (
    <label className="field combo" ref={rootRef}>
      <span className="field-label">{text.label}</span>
      <span className="field-row">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={text.placeholder}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            onQueryChange(e.target.value)
            // Yazmak önceki seçimi geçersiz kılar: alanda görünen ad artık
            // seçili projenin adı olmayabilir.
            if (selectedId) onSelect(null)
            setOpen(true)
          }}
        />
      </span>

      {open && (
        <ul className="combo-list" id={listId} role="listbox">
          {rows.length === 0 ? (
            <li className="combo-empty">{text.noMatch}</li>
          ) : rows.map((row, i) => {
            const isCreate = row.kind === 'create'
            const key = isCreate ? 'create' : row.project.id
            const label = isCreate ? text.createOption(trimmed) : row.project.name
            const chosen = !isCreate && row.project.id === selectedId
            return (
              <li key={key}>
                {/* Satır düğmedir: <li> tıklaması klavyeye ve ekran
                    okuyucuya aynı şeyi vermez. */}
                <button
                  type="button"
                  role="option"
                  aria-selected={chosen}
                  className={`combo-option${i === active ? ' on' : ''}${isCreate ? ' create' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(row)}
                >
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </label>
  )
}
