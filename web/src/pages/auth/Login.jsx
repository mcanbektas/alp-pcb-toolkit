import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthField from '../../components/AuthField'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { authText, authErrorText } from '../../data/authText'

export default function Login() {
  const { lang } = useLang()
  const text = authText(lang)
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await login(email, password)
    setBusy(false)
    if (res.ok) {
      navigate('/')
    } else {
      setError(authErrorText(res, lang))
    }
  }

  return (
    <section className="panel auth-panel">
      <h2>{text.login.title}</h2>
      <form onSubmit={onSubmit}>
        <AuthField
          label={text.field.email}
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <AuthField
          label={text.field.password}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        {/* Hangi alanın hatalı olduğu bilinçli olarak belirsiz — sunucu bunu
            söylemez (bkz. AuthEndpoints.cs → INVALID_CREDENTIALS), o yüzden
            hata tek bir alana değil forma bağlanır. */}
        {error && <p className="field-hint danger">{error}</p>}
        <button type="submit" className="row-add" disabled={busy}>
          {busy ? text.login.submitting : text.login.submit}
        </button>
      </form>
      <p className="auth-panel-foot">
        <Link to="/parola-unuttum">{text.login.forgotLink}</Link>
      </p>
      <p className="auth-panel-foot">
        {text.login.registerPrompt} <Link to="/kayit">{text.login.registerLink}</Link>
      </p>
    </section>
  )
}
