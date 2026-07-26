// Araç ekranı form state'i.
//
// Bilinçli olarak ince: değerler string olarak tutulur, ayrıştırma ve
// doğrulama `lib/fields.js` içinde yapılır. Bu hook yalnızca React state'ini
// yönetir, hesap bilgisi taşımaz.

import { useCallback, useState } from 'react'

export default function useToolForm(initial) {
  const [f, setF] = useState(initial)

  // set('R1')(değer) — NumberField/SelectField onChange imzasına uyar
  const set = useCallback(
    (key) => (value) => setF((s) => (s[key] === value ? s : { ...s, [key]: value })),
    [],
  )

  const patch = useCallback((partial) => setF((s) => ({ ...s, ...partial })), [])
  const reset = useCallback(() => setF(initial), [initial])

  return { f, set, patch, reset }
}
