// Kaydedilmiş bir hesabı araç ekranına bağlayan somut katman.
//
// İki işi vardır ve ikisi de aynı "bağlı kayıt" kavramına dayanır:
//
//   1. URL'de `?hesap=<id>` varsa kaydı sunucudan çekip form state'ine geri
//      yükler (görme/açma yolu).
//   2. Ekranın hangi kayda bağlı olduğunu tutar; `SaveToProject` bunu görüp
//      yeni satır eklemek yerine ÜZERİNE yazar (kaydetme yolu). İlk kayıttan
//      sonra `bind()` çağrılır, ekran o kayda bağlanır ve aynı hesap ikinci
//      kez kaydedildiğinde kopya satır oluşmaz.
//
// Katman kuralı: doğrulama ve süzme saf katmanda (`lib/savedCalculation.js`),
// ağ ve URL erişimi burada. Bileşen ikisini de doğrudan çağırmaz.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from './useAuth'
import { ENGINE_VERSION } from '../lib/engineVersion'
import { CALC_PARAM, engineStatus, restoreForm } from '../lib/savedCalculation'

// Bağ durumu. `idle` bağ yok demektir — ekran normal boş hâliyle açılmıştır.
export const LINK_IDLE = 'idle'
export const LINK_LOADING = 'loading'
// `ready` yalnızca SUNUCUDAN geri yükleme için. Az önce kaydedip bağlanmak
// ayrı durumdur (`bound`): o yolda ekrana bir şey yüklenmedi, ekranda zaten
// duran hesap kaydedildi — "kayıtlı girdiler yüklendi" demek yanlış olurdu.
export const LINK_READY = 'ready'
export const LINK_BOUND = 'bound'
export const LINK_ANONYMOUS = 'anonymous'
export const LINK_NOT_FOUND = 'not-found'
export const LINK_MISMATCH = 'mismatch'
export const LINK_BROKEN = 'broken'
export const LINK_ERROR = 'error'

const EMPTY = []

/**
 * @param {object} opts
 * @param {string} opts.toolKey       ekranın kaydettiği araç anahtarı
 * @param {object} opts.initialForm   aracın `INITIAL_FORM`'u — süzme şeması
 * @param {(partial: object) => void} opts.patch  `useToolForm`'un patch'i
 * @param {(mode: string) => void} [opts.setMode] modu ayrı state'te tutan
 *   ekranlar için. Modu form alanında tutan ekranlar (`f.mode`, `f.tool`)
 *   bunu geçmez — mod zaten formla birlikte geri yüklenir.
 */
export default function useSavedCalculation({ toolKey, initialForm, patch, setMode }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isLoading, isAuthenticated, api } = useAuth()

  const urlId = searchParams.get(CALC_PARAM)

  const [status, setStatus] = useState(urlId ? LINK_LOADING : LINK_IDLE)
  const [link, setLink] = useState(null) // { calculationId, projectId, projectName, engine }
  const [dropped, setDropped] = useState(EMPTY)

  // Aynı kaydı iki kez yüklememek için. Kullanıcı formu düzenledikten sonra
  // bir yeniden render tetiklenirse geri yükleme TEKRARLANMAMALI — yoksa
  // yapılan düzenleme sessizce geri alınır.
  const handledIdRef = useRef(null)

  // Efektin bağımlılığına girmesinler diye ref'te tutulur: `patch` ve `setMode`
  // kimliği zaten kararlı, ama ekranların hepsinde öyle kalacağının güvencesi
  // yok ve kararsız bir prop burada sonsuz geri yükleme demek olurdu.
  const patchRef = useRef(patch)
  const setModeRef = useRef(setMode)
  const initialFormRef = useRef(initialForm)
  patchRef.current = patch
  setModeRef.current = setMode
  initialFormRef.current = initialForm

  useEffect(() => {
    if (!urlId) {
      handledIdRef.current = null
      setStatus(LINK_IDLE)
      setLink(null)
      setDropped(EMPTY)
      return undefined
    }

    if (handledIdRef.current === urlId) return undefined
    if (isLoading) return undefined // oturum durumu çözülmeden istek atılmaz

    if (!isAuthenticated) {
      handledIdRef.current = urlId
      setStatus(LINK_ANONYMOUS)
      return undefined
    }

    handledIdRef.current = urlId
    let cancelled = false
    setStatus(LINK_LOADING)

    ;(async () => {
      const res = await api.get(`/api/calculations/${encodeURIComponent(urlId)}`)
      if (cancelled) return

      if (!res.ok) {
        setStatus(res.error === 'CALCULATION_NOT_FOUND' ? LINK_NOT_FOUND : LINK_ERROR)
        return
      }

      const { calculation, projectId, projectName } = res.data

      // Başka bir aracın kaydı bu ekrana yüklenmez: alan adları çakışsa bile
      // anlamları farklıdır ve sessizce yanlış bir hesap kurulurdu.
      if (calculation.toolKey !== toolKey) {
        setStatus(LINK_MISMATCH)
        return
      }

      const restored = restoreForm(calculation.inputsJson, initialFormRef.current)
      if (!restored.ok) {
        setStatus(LINK_BROKEN)
        return
      }

      patchRef.current(restored.form)
      if (calculation.toolMode && setModeRef.current) setModeRef.current(calculation.toolMode)

      setDropped(restored.dropped.length > 0 ? restored.dropped : EMPTY)
      setLink({
        calculationId: calculation.id,
        projectId,
        projectName,
        engine: engineStatus(calculation.engineVersion, ENGINE_VERSION),
      })
      setStatus(LINK_READY)
    })()

    return () => { cancelled = true }
  }, [urlId, toolKey, isLoading, isAuthenticated, api])

  // Yeni kaydedilen hesabı ekrana bağlar. `handledIdRef` URL değişmeden ÖNCE
  // güncellenir: aksi halde efekt yeni kimliği görüp az önce kaydedilen formu
  // sunucudan geri çeker ve kullanıcının o an ekranda duran hâli tazelenirdi.
  const bind = useCallback((next) => {
    handledIdRef.current = next.calculationId
    setLink({
      calculationId: next.calculationId,
      projectId: next.projectId,
      projectName: next.projectName,
      engine: engineStatus(ENGINE_VERSION, ENGINE_VERSION),
    })
    setDropped(EMPTY)
    setStatus(LINK_BOUND)
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set(CALC_PARAM, next.calculationId)
      return params
    }, { replace: true })
  }, [setSearchParams])

  // Bağı koparır — "yeni kayıt olarak kaydet" bunu kullanır. Form olduğu gibi
  // kalır, yalnız hangi satırın üzerine yazılacağı bilgisi düşer.
  const unbind = useCallback(() => {
    handledIdRef.current = null
    setLink(null)
    setDropped(EMPTY)
    setStatus(LINK_IDLE)
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.delete(CALC_PARAM)
      return params
    }, { replace: true })
  }, [setSearchParams])

  return {
    status,
    calculationId: link?.calculationId ?? null,
    projectId: link?.projectId ?? null,
    projectName: link?.projectName ?? null,
    engine: link?.engine ?? null,
    dropped,
    bind,
    unbind,
  }
}
