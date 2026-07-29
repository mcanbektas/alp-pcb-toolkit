// Kaydedilmiş stack-up'lar için React bağı.
//
// `useSavedThickness` / `useDfmProfiles` ile aynı desen: saf depo
// `lib/stackupProfiles.js` portu parametre alır, somut tarayıcı depolaması
// yalnızca burada bağlanır. Ekran ne `localStorage`'ı ne `JSON.parse`'ı görür.
//
// Depolamaya erişilemiyorsa hesap ekranı çalışmaya devam eder: liste boş
// kalır, `available` false döner ve ekran bunu kullanıcıya söyler.
//
// Zaman damgası saf katmana dışarıdan verilir; onu üreten tek yer burasıdır.

import { useCallback, useMemo, useState } from 'react'
import { defaultStorage, nullStorage } from '../lib/storage'
import {
  createStackupStore, parseStackupJson, stackupToJson,
  STACKUP_SCHEMA, SCHEMA_VERSION, stackupId,
  SP_ERR_NOT_FOUND,
} from '../lib/stackupProfiles'

// Kayıt tarihi ISO gününe indirgenir: saat/dakika kayıt kimliğine girmez ve
// kullanıcıya gösterilen tek bilgi gündür.
function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function useSavedStackups(storage = defaultStorage) {
  const store = useMemo(() => createStackupStore(storage), [storage])

  const [stackups, setStackups] = useState(() => store.list())
  const available = storage !== nullStorage

  const refresh = useCallback(() => setStackups(store.list()), [store])

  const save = useCallback((name, layers) => {
    const id = stackupId(name)
    const existing = store.get(id)
    const stamp = today()
    const res = store.save({
      schema: STACKUP_SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      name,
      layers,
      metadata: {
        createdAt: existing?.metadata?.createdAt || stamp,
        updatedAt: stamp,
      },
    })
    if (!res.error) refresh()
    return res
  }, [store, refresh])

  const rename = useCallback((id, nextName) => {
    const res = store.rename(id, nextName, today())
    if (!res.error) refresh()
    return res
  }, [store, refresh])

  const remove = useCallback((id) => {
    const res = store.remove(id)
    if (!res.error) refresh()
    return res
  }, [store, refresh])

  const get = useCallback((id) => store.get(id), [store])

  const importJson = useCallback((json) => {
    const parsed = parseStackupJson(json)
    if (parsed.error) return parsed
    const res = store.save(parsed.stackup)
    if (!res.error) refresh()
    return res
  }, [store, refresh])

  const exportJson = useCallback((id) => {
    const found = store.get(id)
    if (!found) return { error: SP_ERR_NOT_FOUND, id }
    return stackupToJson(found)
  }, [store])

  return { stackups, available, save, rename, remove, get, importJson, exportJson }
}
