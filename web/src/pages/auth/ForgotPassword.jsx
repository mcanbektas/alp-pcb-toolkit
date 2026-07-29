import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthField from '../../components/AuthField'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { authText, authErrorText } from '../../data/authText'

export default function ForgotPassword() {
  const { lang } = useLang()
  const text = authText(lang)
  const { forgotPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await forgotPassword(email)
    setBusy(false)
    // Sunucu hesap var/yok ayrımı yapmadan hep 200 döner (numaralandırma
    // saldırısına kapalı) — o yüzden başarı ekranı ağ/parse hatası dışında
    // her zaman gösterilir.
    if (res.ok) {
      setDone(true)
    } else {
      setError(authErrorText(res, lang))
    }
  }

  if (done) {
    return (
      <section className="panel auth-panel">
        <h2>{text.forgotPassword.title}</h2>
        <p>{text.forgotPassword.success}</p>
        <p className="auth-panel-foot">
          <Link to="/giris">{text.forgotPassword.backToLogin}</Link>
        </p>
      </section>
    )
  }

  return (
    <section className="panel auth-panel">
      <h2>{text.forgotPassword.title}</h2>
      <p>{text.forgotPassword.intro}</p>
      <form onSubmit={onSubmit}>
        <AuthField
          label={text.field.email}
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        {error && <p className="field-hint danger">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? text.forgotPassword.submitting : text.forgotPassword.submit}
        </button>
      </form>
      <p className="auth-panel-foot">
        <Link to="/giris">{text.forgotPassword.backToLogin}</Link>
      </p>
    </section>
  )
}
