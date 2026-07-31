import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import LangLink from '../../components/LangLink'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { authText } from '../../data/authText'

const STATUS_PENDING = 'pending'
const STATUS_OK = 'ok'
const STATUS_FAIL = 'fail'

export default function ConfirmEmail() {
  const { lang } = useLang()
  const text = authText(lang)
  const { confirmEmail } = useAuth()
  const [params] = useSearchParams()
  const userId = params.get('userId')
  const token = params.get('token')

  const [status, setStatus] = useState(STATUS_PENDING)
  // Bağlantı doğrulama isteği React'in geliştirme modundaki çift render'ında
  // iki kez tetiklenmesin diye — sunucu tarafında token tek kullanımlıktır.
  const requested = useRef(false)

  useEffect(() => {
    if (!userId || !token || requested.current) return
    requested.current = true
    ;(async () => {
      const res = await confirmEmail(userId, token)
      setStatus(res.ok ? STATUS_OK : STATUS_FAIL)
    })()
  }, [userId, token, confirmEmail])

  if (!userId || !token) {
    return (
      <section className="panel auth-panel">
        <h2>{text.confirmEmail.title}</h2>
        <p className="field-hint danger">{text.confirmEmail.invalidLink}</p>
      </section>
    )
  }

  return (
    <section className="panel auth-panel">
      <h2>{text.confirmEmail.title}</h2>
      {status === STATUS_PENDING && <p>{text.confirmEmail.pending}</p>}
      {status === STATUS_OK && (
        <>
          <p>{text.confirmEmail.success}</p>
          <p className="auth-panel-foot">
            <LangLink to="/giris">{text.confirmEmail.loginLink}</LangLink>
          </p>
        </>
      )}
      {status === STATUS_FAIL && <p className="field-hint danger">{text.confirmEmail.failure}</p>}
    </section>
  )
}
