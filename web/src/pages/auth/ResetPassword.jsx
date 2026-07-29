import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthField from '../../components/AuthField'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { authText, authErrorText } from '../../data/authText'

export default function ResetPassword() {
  const { lang } = useLang()
  const text = authText(lang)
  const { resetPassword } = useAuth()
  const [params] = useSearchParams()
  const email = params.get('email')
  const token = params.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  if (!email || !token) {
    return (
      <section className="panel auth-panel">
        <h2>{text.resetPassword.title}</h2>
        <p className="field-hint danger">{text.resetPassword.invalidLink}</p>
        <p className="auth-panel-foot">
          <Link to="/parola-unuttum">{text.forgotPassword.title}</Link>
        </p>
      </section>
    )
  }

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await resetPassword(email, token, newPassword)
    setBusy(false)
    if (res.ok) {
      setDone(true)
    } else {
      setError(authErrorText(res, lang))
    }
  }

  if (done) {
    return (
      <section className="panel auth-panel">
        <h2>{text.resetPassword.title}</h2>
        <p>{text.resetPassword.success}</p>
        <p className="auth-panel-foot">
          <Link to="/giris">{text.resetPassword.loginLink}</Link>
        </p>
      </section>
    )
  }

  return (
    <section className="panel auth-panel">
      <h2>{text.resetPassword.title}</h2>
      <form onSubmit={onSubmit}>
        <AuthField
          label={text.field.newPassword}
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          hint={text.field.passwordHint}
        />
        {error && <p className="field-hint danger">{error}</p>}
        <button type="submit" className="row-add" disabled={busy}>
          {busy ? text.resetPassword.submitting : text.resetPassword.submit}
        </button>
      </form>
    </section>
  )
}
