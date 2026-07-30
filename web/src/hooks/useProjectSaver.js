// Projeye kaydetme — ağ ve liste durumu.
//
// `SaveToProject.jsx`'ten ayrıldı: bileşen hem proje listesini çekiyor, hem
// proje/hesap oluşturuyor, hem güncelliyor, hem de bütün sunum durumunu
// tutuyordu (SRP ihlali). Bu hook yalnızca sunucuyla konuşur ve liste/meşgul
// durumunu yönetir; ağ dışı hiçbir şey bilmez — geri bildirim METNİ (dile bağlı)
// ve form girdileri (`projectId`, `newName`) bileşende kalır.
//
// Katman: `hooks → lib`. Somut ağ erişimi `useAuth().api` üzerinden gelir;
// hook onu çağırır, cümle kurmaz, yalnızca `{ ok, ... }` döndürür.

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'

/**
 * @param {object} opts
 * @param {boolean} opts.enabled  liste yalnızca gerekince çekilir — ekran bir
 *   kayda BAĞLIYSA hedef bellidir, proje listesine hiç ihtiyaç yoktur.
 */
export default function useProjectSaver({ enabled }) {
  const { api } = useAuth()

  const [projects, setProjects] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    ;(async () => {
      setLoadingList(true)
      setListError(false)
      const res = await api.get('/api/projects')
      if (cancelled) return
      if (res.ok) setProjects(res.data.projects)
      else setListError(true)
      setLoadingList(false)
    })()
    return () => { cancelled = true }
  }, [enabled, api])

  // Yeni kayıt: gerekirse önce projeyi açar, sonra hesabı ekler. Başarıda
  // listeyi yerelde tazeler ve bağlanacak kimlikleri döndürür (bileşen bunu
  // `saved.bind`'e verir).
  const create = useCallback(async ({ projectId, newName, body }) => {
    setBusy(true)
    let targetId = projectId
    let targetName = projects.find((p) => p.id === projectId)?.name ?? ''

    if (newName) {
      const createRes = await api.post('/api/projects', { name: newName })
      if (!createRes.ok) { setBusy(false); return { ok: false } }
      targetId = createRes.data.id
      targetName = createRes.data.name
    }

    const res = await api.post(`/api/projects/${targetId}/calculations`, body)
    setBusy(false)
    if (!res.ok) return { ok: false }

    setProjects((prev) => (
      prev.some((p) => p.id === targetId) ? prev : [...prev, { id: targetId, name: targetName }]
    ))
    return { ok: true, calculationId: res.data.id, projectId: targetId, projectName: targetName }
  }, [api, projects])

  // Mevcut kaydın üzerine yazar (bağlı ekran). Kopya satır açmaz.
  const update = useCallback(async ({ id, body }) => {
    setBusy(true)
    const res = await api.patch(`/api/calculations/${id}`, body)
    setBusy(false)
    return { ok: res.ok }
  }, [api])

  return { projects, loadingList, listError, busy, create, update }
}
