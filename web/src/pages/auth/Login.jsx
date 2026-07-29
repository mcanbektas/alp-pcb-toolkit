import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthField from '../../components/AuthField'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { useRememberedEmail } from '../../hooks/useRememberedEmail'
import { authText, authErrorText } from '../../data/authText'

export default function Login() {
  const { lang } = useLang()
  const text = authText(lang)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { initialEmail, remember: rememberEmail, forget: forgetEmail } = useRememberedEmail()

  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  // Hatırlanmış bir adres varsa tik açık başlar: kullanıcı bir kez "beni
  // kaydet" dedikten sonra her girişte yeniden işaretlemek zorunda kalmaz.
  const [remember, setRemember] = useState(initialEmail !== '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await login(email, password, remember)
    setBusy(false)
    if (res.ok) {
      // Adres yalnızca giriş BAŞARILI olunca saklanır — yanlış yazılmış bir
      // adres bir dahaki sefere hazır beklemesin.
      if (remember) rememberEmail(email)
      else forgetEmail()
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
        {/* Ekrana özel CSS yazılmaz: `.check-row` ve `.auth-panel-row` dört
            temada da tanımlı, görünüm oradan gelir. Tik ile "parolamı unuttum"
            aynı satırda: ikisi de forma ait ikincil seçim. */}
        <div className="auth-panel-row">
          <label className="check-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            {text.login.remember}
          </label>
          <Link to="/parola-unuttum">{text.login.forgotLink}</Link>
        </div>
        <p className="field-hint">{text.login.rememberHint}</p>
        {/* Hangi alanın hatalı olduğu bilinçli olarak belirsiz — sunucu bunu
            söylemez (bkz. AuthEndpoints.cs → INVALID_CREDENTIALS), o yüzden
            hata tek bir alana değil forma bağlanır. */}
        {error && <p className="field-hint danger">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? text.login.submitting : text.login.submit}
        </button>
      </form>
      <p className="auth-panel-foot">
        {text.login.registerPrompt} <Link to="/kayit">{text.login.registerLink}</Link>
      </p>
    </section>
  )
}
