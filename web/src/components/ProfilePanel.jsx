// Profil paneli — üretici yetenek profili ve clearance/creepage karar profili
// için ortak arayüz. Dört üretim/DFM ekranı aynı paneli gösterir.
//
// Bileşen state tutmaz ve hesap yapmaz: profil listesi, aktif profil ve
// eylemler `useDfmProfiles` / `useClearanceProfiles` hook'undan prop olarak
// gelir. Somut depolama yalnızca o hook'larda görünür.
//
// Dili doğrudan `useLang()`'den okuyan bileşenler kümesine katılır
// (`EpsEffFields`, `RowList`, `LineChart`, `NumberField` ile aynı gerekçe):
// panelin kendi çerçeve metni — "İçe aktar", "Aktif profil", hata cümleleri —
// dört ekranda birebir aynıdır; prop olarak geçirmek aynı sözlüğü dört kez
// kopyalamak olurdu. Ekrana özgü hiçbir metin burada üretilmez.

import { useState } from 'react'
import { useLang } from '../hooks/useLang'
import { dfmText } from '../data/dfmText'

export const PROFILE_KIND_FAB = 'fab'
export const PROFILE_KIND_DECISION = 'decision'

export default function ProfilePanel({
  kind = PROFILE_KIND_FAB,
  profiles = [],
  active = null,
  activeId = null,
  available = true,
  onSelect,
  onImport,
  onRemove,
  onExport,
}) {
  const { lang } = useLang()
  const dfm = dfmText(lang)
  const labels = kind === PROFILE_KIND_DECISION ? dfm.decisionProfile : dfm.profile
  const errorText = kind === PROFILE_KIND_DECISION
    ? dfm.clearanceProfileErrorText
    : dfm.dfmProfileErrorText

  const [paste, setPaste] = useState('')
  const [notice, setNotice] = useState(null)
  const [exported, setExported] = useState(null)

  function runImport(json) {
    const res = onImport(json)
    if (res?.error) {
      setNotice({ level: 'danger', text: errorText(res) })
      return
    }
    setNotice({ level: 'ok', text: dfm.profile.imported })
    setPaste('')
  }

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => runImport(String(reader.result ?? ''))
    // Okuma başarısızsa ayrıştırma hatasıyla aynı yola düşer; tarayıcının
    // kendi istisna metni kullanıcıya gösterilmez.
    reader.onerror = () => setNotice({ level: 'danger', text: errorText({ error: 'parse' }) })
    reader.readAsText(file)
    // Aynı dosya art arda seçilebilsin diye giriş sıfırlanır.
    e.target.value = ''
  }

  function runExport() {
    const res = onExport(activeId)
    if (res?.error) {
      setNotice({ level: 'danger', text: errorText(res) })
      return
    }
    setExported(res.json)
  }

  return (
    <div>
      <h2 className="section">{labels.title}</h2>

      <label className="field">
        <span className="field-label">{dfm.profile.active}</span>
        <select
          className="select-only"
          value={activeId ?? ''}
          onChange={(e) => onSelect(e.target.value === '' ? null : e.target.value)}
        >
          <option value="">{labels.none}</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      {active && kind === PROFILE_KIND_DECISION && active.source && (
        <ul className="detail-list">
          {active.source.title !== '' && (
            <li>{dfm.decisionProfile.sourceTitle}: {active.source.title}</li>
          )}
          {active.source.revision !== '' && (
            <li>{dfm.decisionProfile.revision}: {active.source.revision}</li>
          )}
          {active.source.note !== '' && <li>{active.source.note}</li>}
        </ul>
      )}

      {!active && <p className="empty-note warn">{labels.none}</p>}

      <label className="field">
        <span className="field-label">{dfm.profile.importLabel}</span>
        <input type="file" accept="application/json,.json" onChange={onFile} />
      </label>

      <label className="field">
        <span className="field-label">{dfm.profile.importPaste}</span>
        <textarea
          className="select-only"
          rows={4}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
      </label>

      <div className="report-actions">
        <button type="button" className="row-add" onClick={() => runImport(paste)} disabled={paste.trim() === ''}>
          {dfm.profile.importButton}
        </button>
        <button type="button" className="row-add" onClick={runExport} disabled={!active}>
          {dfm.profile.exportButton}
        </button>
        <button type="button" className="row-add" onClick={() => onRemove(activeId)} disabled={!active}>
          {dfm.profile.removeButton}
        </button>
      </div>

      {notice && <p className={`empty-note ${notice.level === 'ok' ? '' : 'warn'}`}>{notice.text}</p>}

      {exported && (
        <label className="field">
          <span className="field-label">{dfm.profile.exportButton}</span>
          <textarea className="select-only" rows={6} value={exported} readOnly />
        </label>
      )}

      {!available && <p className="empty-note warn">{dfm.profile.storageUnavailable}</p>}

      <p className="field-hint">{labels.hint ?? dfm.profile.schemaHint}</p>
    </div>
  )
}
