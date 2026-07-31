import { useState } from 'react'
import LangLink from '../../components/LangLink'
import AuthField from '../../components/AuthField'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { authText, authErrorText } from '../../data/authText'

export default function Register() {
  const { lang } = useLang()
  const text = authText(lang)
  const { register } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await register(email, password, displayName)
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
        <h1>{text.register.title}</h1>
        <p>{text.register.success}</p>
        <p className="auth-panel-foot">
          <LangLink to="/giris">{text.register.loginLink}</LangLink>
        </p>
      </section>
    )
  }

  return (
    <section className="panel auth-panel">
      <h1>{text.register.title}</h1>
      <form onSubmit={onSubmit}>
        <AuthField
          label={text.field.displayName}
          value={displayName}
          onChange={setDisplayName}
          autoComplete="name"
        />
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
          autoComplete="new-password"
          hint={text.field.passwordHint}
        />
        {error && <p className="field-hint danger">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? text.register.submitting : text.register.submit}
        </button>
      </form>
      <p className="auth-panel-foot">
        {text.register.loginPrompt} <LangLink to="/giris">{text.register.loginLink}</LangLink>
      </p>
    </section>
  )
}
