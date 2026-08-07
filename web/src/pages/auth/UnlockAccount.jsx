import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import LangLink from '../../components/LangLink'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { authText } from '../../data/authText'

const STATUS_PENDING = 'pending'
const STATUS_OK = 'ok'
const STATUS_FAIL = 'fail'

export default function UnlockAccount() {
  const { lang } = useLang()
  const text = authText(lang)
  const { unlockAccount } = useAuth()
  const [params] = useSearchParams()
  const userId = params.get('userId')
  const token = params.get('token')

  const [status, setStatus] = useState(STATUS_PENDING)
  // Kilit açma isteği React'in geliştirme modundaki çift render'ında iki kez
  // tetiklenmesin diye — sunucu tarafında token tek kullanımlıktır (aynı
  // gerekçe: ConfirmEmail.jsx).
  const requested = useRef(false)

  useEffect(() => {
    if (!userId || !token || requested.current) return
    requested.current = true
    ;(async () => {
      const res = await unlockAccount(userId, token)
      setStatus(res.ok ? STATUS_OK : STATUS_FAIL)
    })()
  }, [userId, token, unlockAccount])

  if (!userId || !token) {
    return (
      <section className="panel auth-panel">
        <h1>{text.unlockAccount.title}</h1>
        <p className="field-hint danger">{text.unlockAccount.invalidLink}</p>
      </section>
    )
  }

  return (
    <section className="panel auth-panel">
      <h1>{text.unlockAccount.title}</h1>
      {status === STATUS_PENDING && <p>{text.unlockAccount.pending}</p>}
      {status === STATUS_OK && (
        <>
          <p>{text.unlockAccount.success}</p>
          <p className="auth-panel-foot">
            <LangLink to="/giris">{text.unlockAccount.loginLink}</LangLink>
          </p>
        </>
      )}
      {status === STATUS_FAIL && <p className="field-hint danger">{text.unlockAccount.failure}</p>}
    </section>
  )
}
