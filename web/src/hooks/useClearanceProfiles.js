// Clearance / creepage karar profilleri için React bağı.
//
// `useDfmProfiles` ile birebir aynı desen: saf depo `lib/clearanceProfile.js`
// portu parametre alır, somut tarayıcı depolaması yalnızca burada bağlanır.
//
// Profil yüklü değilken hesap yine çalışır; motor `profile: null` alır ve
// tablo tabanlı değerlendirmeyi hiç yapmaz.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { defaultStorage, nullStorage } from '../lib/storage'
import {
  createClearanceProfileStore, parseClearanceProfileJson, clearanceProfileToJson,
  CLEAR_ERR_NOT_FOUND,
} from '../lib/clearanceProfile'

const EMPTY_LIST = []

export default function useClearanceProfiles(storage = defaultStorage) {
  const store = useMemo(() => createClearanceProfileStore(storage), [storage])

  // Depo ilk render'da OKUNMAZ — gerekçe `useDfmProfiles`'taki uzun notta:
  // araç sayfaları prerender'lanıyor ve ilk render sunucudakiyle birebir
  // aynı olmak zorunda.
  const [profiles, setProfiles] = useState(EMPTY_LIST)
  const [activeId, setActiveId] = useState(null)
  const [available, setAvailable] = useState(true)

  const refresh = useCallback(() => {
    setProfiles(store.list())
    setActiveId(store.activeId())
  }, [store])

  useEffect(() => {
    refresh()
    setAvailable(storage !== nullStorage)
  }, [refresh, storage])

  const selectActive = useCallback((id) => {
    const res = store.setActive(id)
    if (!res.error) refresh()
    return res
  }, [store, refresh])

  const remove = useCallback((id) => {
    const res = store.remove(id)
    if (!res.error) refresh()
    return res
  }, [store, refresh])

  const importJson = useCallback((json) => {
    const parsed = parseClearanceProfileJson(json)
    if (parsed.error) return parsed
    const saved = store.save(parsed.profile)
    if (saved.error) return saved
    const activated = store.setActive(saved.profile.id)
    refresh()
    if (activated.error) return activated
    return saved
  }, [store, refresh])

  const exportJson = useCallback((id) => {
    const profile = store.get(id)
    if (!profile) return { error: CLEAR_ERR_NOT_FOUND, id }
    return clearanceProfileToJson(profile)
  }, [store])

  const active = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? null,
    [profiles, activeId],
  )

  return {
    profiles,
    active,
    activeId,
    hasProfile: active !== null,
    available,
    selectActive,
    remove,
    importJson,
    exportJson,
  }
}
