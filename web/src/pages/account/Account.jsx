// Hesap ayarları — raporlarda görünen ad/firma ve parola değiştirme.
// (Kayıtlı bakır kalınlıkları buradan kaldırıldı: aynı liste ve silme, kayıtların
// üretildiği Bakır Kalınlığı Dönüştürücü ekranında zaten var — ikinci yönetim
// yüzeyi hiçbir şey kazandırmıyordu. Özellik ve senkron orada sürüyor.)
//
// E-posta salt okunur: kayıt adresi kalıcıdır (kimlik doğrulaması ve parola
// sıfırlama ona bağlı) ve `PATCH /api/me` böyle bir alan taşımaz. Alan yine
// gösterilir — kullanıcı hangi hesapta olduğunu görmeli.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LangLink from '../../components/LangLink'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { useNotice } from '../../hooks/useNotice'
import { commonText } from '../../data/uiText'
import { staticPath } from '../../lib/routes'
import AuthField from '../../components/AuthField'
// Parola politikası cümlesi ve Identity hata kodlarının çevirisi giriş/kayıt
// ekranlarıyla ORTAK: ikinci bir kopya yazılırsa aynı kural iki ekranda
// farklı cümleyle anlatılır ve biri güncellenip diğeri unutulur.
import { authText, authErrorText } from '../../data/authText'
import { getText } from './text'

export default function Account() {
  const { lang } = useLang()
  const at = getText(lang).account
  const aut = authText(lang)
  const ui = commonText(lang)
  const { isLoading, isAuthenticated, user, api, refreshUser, changePassword, logout } = useAuth()
  const { showNotice } = useNotice()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [company, setCompany] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileError, setProfileError] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState(null)

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [confirming, setConfirming] = useState(false)

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

  async function onChangePassword(e) {
    e.preventDefault()
    setPasswordError(null)

    // İki kopyanın eşitliği ve boşluk denetimi İSTEMCİDE yapılır: sunucuya
    // gitmeye değmeyecek iki hata bunlar ve ikisi de "auth" hız sınırından
    // bir hak yerdi. Parolanın kendisi (uzunluk, karakter sınıfları) yine
    // yalnızca sunucuda doğrulanır — kural tek yerde durur.
    if (!currentPassword || !newPassword || !newPassword2) {
      setPasswordError(at.passwordMissing)
      return
    }
    if (newPassword !== newPassword2) {
      setPasswordError(at.passwordMismatch)
      return
    }
    if (newPassword === currentPassword) {
      setPasswordError(at.passwordSame)
      return
    }

    setPasswordBusy(true)
    const res = await changePassword(currentPassword, newPassword)
    setPasswordBusy(false)

    if (!res.ok) {
      setPasswordError(authErrorText(res, lang))
      return
    }

    // Alanlar başarıdan sonra temizlenir — parola ekranda asılı kalmaz.
    setCurrentPassword('')
    setNewPassword('')
    setNewPassword2('')
    showNotice(at.passwordChanged)
  }

  // Form gönderimi hesabı SİLMEZ, yalnız onay kartını açar. Parola boşsa kart
  // hiç açılmaz: kullanıcı geri alınamaz bir kartı, sonu baştan belli bir hata
  // için görmemeli.
  function askDelete(e) {
    e.preventDefault()
    setDeleteError(null)
    if (!deletePassword) {
      setDeleteError(at.deletePasswordMissing)
      return
    }
    setConfirming(true)
  }

  function cancelDelete() {
    if (deleteBusy) return
    setConfirming(false)
  }

  async function confirmDelete() {
    setDeleteBusy(true)
    const res = await api.post('/api/me/delete', { currentPassword: deletePassword })
    setDeleteBusy(false)
    setConfirming(false)

    if (!res.ok) {
      setDeletePassword('')
      setDeleteError(at.errorText(res))
      return
    }

    // Hesap gitti ama tarayıcı hâlâ yenileme çerezini ve bellekteki erişim
    // anahtarını taşıyor. `logout()` ikisini de temizler — atlanırsa uygulama
    // bir sonraki açılışta silinmiş hesabın oturumunu kurmaya çalışır.
    // Bildirim gezinmeden ÖNCE kurulur (App.jsx → onLogout ile aynı sıra).
    await logout()
    showNotice(at.deleted)
    navigate(staticPath('home', lang))
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
            {at.loginRequired} <LangLink to="/giris">{at.loginLink}</LangLink>
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

          <div className="report-actions stretch">
            <button type="submit" className="row-add" disabled={profileBusy}>
              {profileBusy ? at.saving : at.saveLabel}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>{at.passwordHeading}</h2>
        <p className="field-hint">{at.passwordIntro}</p>

        <form onSubmit={onChangePassword}>
          {/* Giriş/kayıt ekranlarıyla AYNI alan bileşeni: parola görünürlük
              düğmesi ve alan yerleşimi orada zaten çözülmüş, burada ikinci bir
              kopya yazmak ikisini zamanla ayrıştırırdı.
              `autoComplete` değerleri parola yöneticileri için: alanlar aynı
              formda olduğu için ipucu verilmezse yeni parola mevcut parola
              olarak kaydediliyor. */}
          <AuthField
            label={at.currentPasswordLabel}
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />

          <AuthField
            label={at.newPasswordLabel}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
            hint={aut.field.passwordHint}
          />

          <AuthField
            label={at.newPasswordRepeatLabel}
            type="password"
            autoComplete="new-password"
            value={newPassword2}
            onChange={setNewPassword2}
          />

          {passwordError && <p className="field-hint danger">{passwordError}</p>}

          <div className="report-actions stretch">
            <button type="submit" className="row-add" disabled={passwordBusy}>
              {passwordBusy ? at.passwordSaving : at.passwordSaveLabel}
            </button>
          </div>
        </form>
      </section>

      {/* Hesap silme en altta ve kendi panelinde: geri alınamayan tek işlem,
          profil ve parola formlarının arasına karışmamalı. */}
      <section className="panel">
        <h2>{at.deleteHeading}</h2>
        <p className="field-hint">{at.deleteIntro}</p>

        <form onSubmit={askDelete}>
          <AuthField
            label={at.deletePasswordLabel}
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={setDeletePassword}
          />

          {deleteError && <p className="field-hint danger">{deleteError}</p>}

          <div className="report-actions stretch">
            <button type="submit" className="btn-danger" disabled={deleteBusy}>
              {deleteBusy ? at.deleting : at.deleteLabel}
            </button>
          </div>
        </form>
      </section>

      {/* Parola doğru olsa bile tek tıkla silinmez: onay kartı ayrı bir adımdır
          ve odağı iptal düğmesindedir (ConfirmDialog), yani Enter yanlışlıkla
          onaylamaz. */}
      <ConfirmDialog
        open={confirming}
        title={at.deleteTitle}
        message={at.deleteConfirm}
        confirmLabel={at.deleteLabel}
        cancelLabel={ui.cancel}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        busy={deleteBusy}
      />
    </>
  )
}
