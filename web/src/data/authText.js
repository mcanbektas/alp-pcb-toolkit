// Giriş/kayıt ekranlarının iki dilli metni — src/pages/tools/*/text.js ile
// aynı desen: tek dış yüz `authText(lang)`, hata kodundan cümleyi kuran
// ayrı bir yardımcı (`authErrorText`). Sunucudan gelen kod dilsizdir; cümleyi
// burada kuruyoruz, `src/lib/api.js` asla formatlanmış metin taşımaz.

import { pick } from '../lib/i18n'
import { API_ERR_NETWORK, API_ERR_PARSE } from '../lib/api'

function identityCodeText(code, lang) {
  const MAP = {
    DuplicateUserName: {
      tr: 'Bu e-posta adresiyle zaten bir hesap var.',
      en: 'An account with this email already exists.',
    },
    DuplicateEmail: {
      tr: 'Bu e-posta adresiyle zaten bir hesap var.',
      en: 'An account with this email already exists.',
    },
    InvalidEmail: { tr: 'E-posta adresi geçersiz.', en: 'The email address is invalid.' },
    PasswordTooShort: {
      tr: 'Parola en az 10 karakter olmalı.',
      en: 'Password must be at least 10 characters.',
    },
    PasswordRequiresDigit: {
      tr: 'Parola en az bir rakam içermeli.',
      en: 'Password must contain at least one digit.',
    },
    PasswordRequiresLower: {
      tr: 'Parola en az bir küçük harf içermeli.',
      en: 'Password must contain at least one lowercase letter.',
    },
    PasswordRequiresUpper: {
      tr: 'Parola en az bir büyük harf içermeli.',
      en: 'Password must contain at least one uppercase letter.',
    },
    PasswordRequiresNonAlphanumeric: {
      tr: 'Parola en az bir özel karakter içermeli.',
      en: 'Password must contain at least one special character.',
    },
    PasswordRequiresUniqueChars: {
      tr: 'Parola yeterince farklı karakter içermeli.',
      en: 'Password must contain enough unique characters.',
    },
    InvalidToken: {
      tr: 'Bağlantının süresi dolmuş veya geçersiz.',
      en: 'The link has expired or is invalid.',
    },
  }
  return pick(MAP[code] ?? {
    tr: 'Girilen bilgiler kabul edilmedi.',
    en: 'The information entered was not accepted.',
  }, lang)
}

// Sunucu yanıtından (bkz. src/lib/api.js) ekranda gösterilecek tek cümleyi
// kurar. `res.ok` ise `null` döner — çağıran taraf o zaman hiçbir şey basmaz.
export function authErrorText(res, lang) {
  if (!res || res.ok) return null

  if (res.error === API_ERR_NETWORK) {
    return pick({
      tr: 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.',
      en: 'Could not reach the server. Check your connection.',
    }, lang)
  }
  if (res.error === API_ERR_PARSE) {
    return pick({
      tr: 'Sunucudan beklenmeyen bir yanıt geldi.',
      en: 'The server returned an unexpected response.',
    }, lang)
  }

  switch (res.error) {
    case 'MISSING_FIELDS':
      return pick({ tr: 'Lütfen tüm alanları doldurun.', en: 'Please fill in all fields.' }, lang)
    case 'INVALID_CREDENTIALS':
      return pick({ tr: 'E-posta veya parola hatalı.', en: 'Incorrect email or password.' }, lang)
    case 'LOCKED_OUT':
      return pick({
        tr: 'Çok sayıda başarısız denemeden sonra hesap kısa süreliğine kilitlendi.',
        en: 'Too many failed attempts — the account is temporarily locked.',
      }, lang)
    case 'EMAIL_NOT_CONFIRMED':
      return pick({
        tr: 'Giriş yapmadan önce e-posta adresini doğrulayın.',
        en: 'Confirm your email address before signing in.',
      }, lang)
    case 'INVALID_TOKEN':
      return pick({
        tr: 'Bağlantının süresi dolmuş veya geçersiz.',
        en: 'The link has expired or is invalid.',
      }, lang)
    case 'IDENTITY_ERROR': {
      const codes = res.detail?.codes ?? []
      if (codes.length === 0) {
        return pick({
          tr: 'Girilen bilgiler kabul edilmedi.',
          en: 'The information entered was not accepted.',
        }, lang)
      }
      return [...new Set(codes.map((c) => identityCodeText(c, lang)))].join(' ')
    }
    default:
      return pick({
        tr: 'Bir şeyler ters gitti. Lütfen tekrar deneyin.',
        en: 'Something went wrong. Please try again.',
      }, lang)
  }
}

export function authText(lang) {
  const t = (dict) => pick(dict, lang)

  return {
    header: {
      loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
      logout: t({ tr: 'Çıkış yap', en: 'Sign out' }),
      signedOut: t({ tr: 'Çıkış yapıldı.', en: 'Signed out.' }),
      projects: t({ tr: 'Projelerim', en: 'My projects' }),
      account: t({ tr: 'Hesabım', en: 'My account' }),
    },

    field: {
      email: t({ tr: 'E-posta', en: 'Email' }),
      password: t({ tr: 'Parola', en: 'Password' }),
      newPassword: t({ tr: 'Yeni parola', en: 'New password' }),
      displayName: t({ tr: 'Ad Soyad', en: 'Full name' }),
      passwordHint: t({
        tr: 'En az 10 karakter, büyük/küçük harf, rakam ve özel karakter içermeli.',
        en: 'At least 10 characters, with upper/lowercase letters, a digit and a special character.',
      }),
    },

    login: {
      title: t({ tr: 'Giriş yap', en: 'Sign in' }),
      submit: t({ tr: 'Giriş yap', en: 'Sign in' }),
      submitting: t({ tr: 'Giriş yapılıyor…', en: 'Signing in…' }),
      remember: t({ tr: 'Beni kaydet', en: 'Remember me' }),
      rememberHint: t({
        tr: 'Oturum açık kalır, e-postan hatırlanır — parola kaydedilmez.',
        en: 'Keeps you signed in and remembers your email — the password is not stored.',
      }),
      forgotLink: t({ tr: 'Parolamı unuttum', en: 'Forgot password' }),
      registerPrompt: t({ tr: 'Hesabın yok mu?', en: "Don't have an account?" }),
      registerLink: t({ tr: 'Kayıt ol', en: 'Register' }),
    },

    register: {
      title: t({ tr: 'Hesap oluştur', en: 'Create an account' }),
      submit: t({ tr: 'Kayıt ol', en: 'Register' }),
      submitting: t({ tr: 'Kayıt oluşturuluyor…', en: 'Creating account…' }),
      success: t({
        tr: 'Hesabın oluşturuldu. E-postana gönderdiğimiz bağlantıyla doğrulamanı bekliyoruz.',
        en: "Your account was created. Confirm it with the link we sent to your email.",
      }),
      loginPrompt: t({ tr: 'Zaten hesabın var mı?', en: 'Already have an account?' }),
      loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
    },

    forgotPassword: {
      title: t({ tr: 'Parolamı unuttum', en: 'Forgot password' }),
      intro: t({
        tr: 'E-posta adresini gir, sıfırlama bağlantısını gönderelim.',
        en: "Enter your email and we'll send you a reset link.",
      }),
      submit: t({ tr: 'Bağlantı gönder', en: 'Send link' }),
      submitting: t({ tr: 'Gönderiliyor…', en: 'Sending…' }),
      // Hesap var olsun ya da olmasın aynı metin gösterilir — numaralandırma
      // saldırısına bilgi sızdırmaz. Sunucu tarafındaki aynı karar için
      // api/Alp.Api/Auth/AuthEndpoints.cs → ForgotPassword'a bakın.
      success: t({
        tr: 'Bu adres kayıtlıysa sıfırlama bağlantısı gönderildi.',
        en: 'If that address is registered, a reset link has been sent.',
      }),
      backToLogin: t({ tr: 'Girişe dön', en: 'Back to sign in' }),
    },

    resetPassword: {
      title: t({ tr: 'Parola sıfırla', en: 'Reset password' }),
      submit: t({ tr: 'Parolayı değiştir', en: 'Change password' }),
      submitting: t({ tr: 'Değiştiriliyor…', en: 'Changing…' }),
      success: t({ tr: 'Parolan değişti. Şimdi giriş yapabilirsin.', en: 'Your password was changed. You can sign in now.' }),
      invalidLink: t({
        tr: 'Bu bağlantı eksik veya geçersiz. Sıfırlamayı yeniden başlatmayı dene.',
        en: 'This link is missing or invalid. Try requesting a new reset link.',
      }),
      loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
    },

    confirmEmail: {
      title: t({ tr: 'E-posta doğrulama', en: 'Email confirmation' }),
      pending: t({ tr: 'Doğrulanıyor…', en: 'Confirming…' }),
      success: t({ tr: 'E-posta adresin doğrulandı. Şimdi giriş yapabilirsin.', en: 'Your email is confirmed. You can sign in now.' }),
      failure: t({
        tr: 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.',
        en: 'The confirmation link is invalid or has expired.',
      }),
      invalidLink: t({
        tr: 'Bu bağlantı eksik. E-postandaki bağlantıyı tekrar aç.',
        en: 'This link is incomplete. Open the link from your email again.',
      }),
      loginLink: t({ tr: 'Giriş yap', en: 'Sign in' }),
    },
  }
}
