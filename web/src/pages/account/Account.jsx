// Hesap ayarları — raporlarda görünen ad/firma/logo ve kaydedilmiş bakır
// kalınlıkları (Faz 7 + Faz 5'ten devreden profil uçları).
//
// Logo `<img src="/api/me/logo">` ile GÖSTERİLEMEZ: uç yetkilendirme ister ve
// img etiketi Authorization başlığı gönderemez. Bu yüzden görsel token'lı bir
// istekle blob olarak çekilip nesne adresine çevrilir; adres bileşen kalkarken
// serbest bırakılır.

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

  const [logoUrl, setLogoUrl] = useState(null)
  const [logoBusy, setLogoBusy] = useState(false)
  const [logoError, setLogoError] = useState(null)
  const fileRef = useRef(null)

  const [recordError, setRecordError] = useState(null)

  // Alanlar kullanıcı yüklendiğinde BİR KEZ doldurulur; sonraki tazelemeler
  // (logo yükleme de `refreshUser` çağırır) kullanıcının yazdığını ezmemeli.
  const filled = useRef(false)
  useEffect(() => {
    if (filled.current || !user) return
    filled.current = true
    setDisplayName(user.displayName ?? '')
    setCompany(user.company ?? '')
  }, [user])

  useEffect(() => {
    if (!user?.hasLogo) {
      setLogoUrl(null)
      return undefined
    }

    let objectUrl = null
    let cancelled = false

    ;(async () => {
      const res = await api.getBlob('/api/me/logo', 'logo')
      if (cancelled || !res.ok) return
      objectUrl = URL.createObjectURL(res.blob)
      setLogoUrl(objectUrl)
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [user?.hasLogo, api])

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

  async function onUploadLogo() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setLogoError(null)
    setLogoBusy(true)
    const form = new FormData()
    form.append('logo', file)
    const res = await api.postForm('/api/me/logo', form)
    setLogoBusy(false)

    if (!res.ok) {
      setLogoError(at.errorText(res))
      return
    }
    if (fileRef.current) fileRef.current.value = ''
    await refreshUser()
    showNotice(at.logoUploaded)
  }

  async function onRemoveLogo() {
    // eslint-disable-next-line no-alert
    if (!window.confirm(at.confirmLogoRemove)) return

    setLogoError(null)
    setLogoBusy(true)
    const res = await api.del('/api/me/logo')
    setLogoBusy(false)

    if (!res.ok) {
      setLogoError(at.errorText(res))
      return
    }
    await refreshUser()
    showNotice(at.logoRemoved)
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
        <h2>{at.logoHeading}</h2>
        <p className="field-hint">{at.logoHint}</p>

        {logoUrl
          ? <img className="logo-preview" src={logoUrl} alt={at.logoAlt} />
          : <p className="empty-note">{at.logoEmpty}</p>}

        {logoError && <p className="field-hint danger">{logoError}</p>}

        <label className="field">
          <span className="field-label">{at.logoPick}</span>
          <span className="field-row">
            <input type="file" accept="image/png,image/jpeg" ref={fileRef} />
          </span>
        </label>

        <div className="report-actions">
          <button type="button" className="row-add" disabled={logoBusy} onClick={onUploadLogo}>
            {logoBusy ? at.logoUploading : at.logoUpload}
          </button>
          {user?.hasLogo && (
            <button type="button" className="row-add" disabled={logoBusy} onClick={onRemoveLogo}>
              {at.logoRemove}
            </button>
          )}
        </div>
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
