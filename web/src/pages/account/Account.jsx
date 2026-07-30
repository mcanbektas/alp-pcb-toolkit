// Hesap ayarları — raporlarda görünen ad/firma ve kaydedilmiş bakır kalınlıkları
// (Faz 7 + Faz 5'ten devreden profil uçları).
//
// E-posta salt okunur: kayıt adresi kalıcıdır (kimlik doğrulaması ve parola
// sıfırlama ona bağlı) ve `PATCH /api/me` böyle bir alan taşımaz. Alan yine
// gösterilir — kullanıcı hangi hesapta olduğunu görmeli.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { useNotice } from '../../hooks/useNotice'
import useSavedThickness from '../../hooks/useSavedThickness'
import { getText } from './text'

export default function Account() {
  const { lang } = useLang()
  const at = getText(lang).account
  const { isLoading, isAuthenticated, user, api, refreshUser } = useAuth()
  const { showNotice } = useNotice()
  const saved = useSavedThickness()

  const [displayName, setDisplayName] = useState('')
  const [company, setCompany] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileError, setProfileError] = useState(null)

  const [recordError, setRecordError] = useState(null)

  // Alanlar kullanıcı yüklendiğinde BİR KEZ doldurulur; sonraki tazelemeler
  // (`refreshUser`) kullanıcının yazdığını ezmemeli.
  const filled = useRef(false)
  useEffect(() => {
    if (filled.current || !user) return
    filled.current = true
    setDisplayName(user.displayName ?? '')
    setCompany(user.company ?? '')
  }, [user])

  async function onSaveProfile(e) {
    e.preventDefault()
    setProfileError(null)
    setProfileBusy(true)
    // `company` boş dize olarak GÖNDERİLİR: sunucuda bu "alanı temizle"
    // demektir. Atlanan alan "değişmedi" anlamına geldiği için temizleme
    // başka türlü ifade edilemezdi.
    const res = await api.patch('/api/me', { displayName, company })
    setProfileBusy(false)

    if (!res.ok) {
      setProfileError(at.errorText(res))
      return
    }
    await refreshUser()
    showNotice(at.profileSaved)
  }

  async function onRemoveRecord(rec) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(at.confirmRecordRemove(rec.name))) return

    setRecordError(null)
    const res = await saved.remove(rec.id)
    if (res.error) {
      setRecordError(at.errorText({ error: res.cause ?? res.error, detail: res }))
      return
    }
    showNotice(at.recordRemoved)
  }

  if (isLoading) return null

  if (!isAuthenticated) {
    return (
      <>
        <div className="tool-header">
          <h1>{at.title}</h1>
        </div>
        <div className="panel">
          <p className="empty-note">
            {at.loginRequired} <Link to="/giris">{at.loginLink}</Link>
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="tool-header">
        <h1>{at.title}</h1>
        <p>{at.intro}</p>
      </div>

      <section className="panel">
        <h2>{at.profileHeading}</h2>

        <form onSubmit={onSaveProfile}>
          <label className="field">
            <span className="field-label">{at.emailLabel}</span>
            <span className="field-row">
              <input type="email" value={user?.email ?? ''} readOnly />
            </span>
            <span className="field-hint">{at.emailHint}</span>
          </label>

          <label className="field">
            <span className="field-label">{at.displayNameLabel}</span>
            <span className="field-row">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </span>
            <span className="field-hint">{at.displayNameHint}</span>
          </label>

          <label className="field">
            <span className="field-label">{at.companyLabel}</span>
            <span className="field-row">
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </span>
            <span className="field-hint">{at.companyHint}</span>
          </label>

          {profileError && <p className="field-hint danger">{profileError}</p>}

          <div className="report-actions">
            <button type="submit" className="row-add" disabled={profileBusy}>
              {profileBusy ? at.saving : at.saveLabel}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>{at.recordsHeading}</h2>
        <p className="field-hint">{at.recordsIntro}</p>

        {recordError && <p className="field-hint danger">{recordError}</p>}

        {saved.loading && <p className="empty-note">{at.recordsLoading}</p>}

        {!saved.loading && saved.records.length === 0 && (
          <p className="empty-note">{at.recordsEmpty}</p>
        )}

        {saved.records.length > 0 && (
          <div className="tool-list">
            {saved.records.map((rec) => (
              <div key={rec.id} className="tool-row">
                <span className="name">
                  {rec.name}
                  <span className="sub"> — {at.recordSummary(rec)}</span>
                </span>
                <span className="report-actions">
                  <button
                    type="button"
                    className="row-add"
                    onClick={() => onRemoveRecord(rec)}
                    aria-label={at.recordRemoveAria(rec.name)}
                  >
                    {at.recordRemove}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
