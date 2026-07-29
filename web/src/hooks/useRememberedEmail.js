// "Beni kaydet" e-postasının somut depolama bağı — tarayıcı API'si yalnızca
// burada görünür, `lib/rememberedEmail.js` saf kalır (useLang ile aynı desen).

import { useCallback, useState } from 'react'
import { defaultStorage } from '../lib/storage'
import {
  readRememberedEmail, writeRememberedEmail, clearRememberedEmail,
} from '../lib/rememberedEmail'

export function useRememberedEmail(storage = defaultStorage) {
  // İlk okuma bir kez yapılır: giriş ekranı açıldığında alanın başlangıç
  // değeri budur, sonrasında alanı kullanıcı yönetir.
  const [initialEmail] = useState(() => readRememberedEmail(storage))

  const remember = useCallback((email) => {
    writeRememberedEmail(storage, email)
  }, [storage])

  const forget = useCallback(() => {
    clearRememberedEmail(storage)
  }, [storage])

  return { initialEmail, remember, forget }
}
