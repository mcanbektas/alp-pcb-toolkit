// Kayıtlı kalınlıklar için React bağı (spec §4.3).
//
// Katman kuralı: `lib/thicknessRecords.js` saftır ve depolama portunu parametre
// olarak alır; tarayıcı API'sini tanıyan somut port yalnızca burada bağlanır.
// Ekran ne `localStorage`'ı ne de `JSON.parse`'ı görür — yalnızca bu hook'un
// döndürdüğü listeyi ve iki eylemi kullanır.
//
// Port dışarıdan da verilebilir (varsayılan `defaultStorage`), böylece hook
// bellek içi depoyla da çalışır.
//
// Hata durumu burada tutulmaz: `save`/`remove` depo sözleşmesinin sonucunu
// ({ record } | { ok: true } | { error, message }) olduğu gibi döndürür, kodu
// Türkçeleştirmek ekranın `text.js` dosyasının işidir.

import { useCallback, useMemo, useState } from 'react'
import { defaultStorage, nullStorage } from '../lib/storage'
import { createThicknessStore } from '../lib/thicknessRecords'

export default function useSavedThickness(storage = defaultStorage) {
  const store = useMemo(() => createThicknessStore(storage), [storage])

  // İlk okuma bir kez yapılır. Depolamaya erişilemiyorsa `browserStorage()`
  // zaten `nullStorage`'a düşer, bozuk kayıtta liste boş döner; ikisinde de
  // istisna dışarı sızmaz ve ekran çalışmaya devam eder.
  const [records, setRecords] = useState(() => store.list())

  // Depolama hiç yoksa (gizli sekme, kapalı site verisi) `browserStorage()`
  // doğrudan `nullStorage`'ı döndürür; ekran bunu baştan söyleyebilsin diye
  // dışarı verilir.
  const available = storage !== nullStorage

  const save = useCallback((record) => {
    const res = store.save(record)
    if (!res.error) setRecords(store.list())
    return res
  }, [store])

  const remove = useCallback((id) => {
    const res = store.remove(id)
    if (!res.error) setRecords(store.list())
    return res
  }, [store])

  return { records, available, save, remove }
}
