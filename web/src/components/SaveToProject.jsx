// Projeye kaydet paneli — ReportDialog'un yanına oturur, modal değil
// (bkz. ReportDialog.jsx, docs/uyelik-ve-rapor-plani.md §6.4 kararı).
// Giriş yapmamış kullanıcıya yalnızca giriş bağlantısı gösterilir.
//
// ReportDialog ile aynı page-agnostic desen: bu bileşen hiçbir aracın
// `report.js`'ini içe aktarmaz. `section` prop'u ReportDialog'daki gibi
// çağıran ekranın kendi `buildReportSection()`'ından (SVG'siz) kurulup
// hazır geçirilir — bkz. CLAUDE.md'deki tek yönlü bağımlılık kuralı
// (`pages → components → hooks → lib`, asla tersine çevrilmez). Böylece
// her araç ekranının paketi yalnızca kendi `report.js`'ini çeker.
//
// Panelin iki hâli vardır ve ayrım `saved.calculationId`'dedir:
//
//   BAĞSIZ — ekran hiçbir kayda bağlı değil. Proje seçilir ya da açılır,
//     hesap YENİ satır olarak eklenir, ardından ekran o kayda bağlanır.
//   BAĞLI  — ekran kaydedilmiş bir hesaptan açılmış ya da az önce
//     kaydedilmiş. "Kaydet" artık yeni satır açmaz, mevcut satırın ÜZERİNE
//     yazar. Aynı hesabı iki kez kaydedince projede iki satır oluşması bu
//     yüzden bitti; kopya isteyen "Yeni kayıt olarak ekle" ile bağı bilerek
//     koparır.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'
import {
  LINK_ANONYMOUS, LINK_BROKEN, LINK_ERROR, LINK_LOADING, LINK_MISMATCH, LINK_NOT_FOUND, LINK_READY,
} from '../hooks/useSavedCalculation'
import { saveToProjectText } from '../data/saveToProjectText'
import { serializeSvgElement } from '../lib/svgInline'
import { REPORT_SCHEMA_VERSION } from '../lib/reportPayload'
import { ENGINE_VERSION } from '../lib/engineVersion'
import { ENGINE_STALE } from '../lib/savedCalculation'

// Bağ durumu → panelin üstündeki not. Kod → metin çevirisi tek yerde durur;
// `useSavedCalculation` cümle taşımaz, yalnızca kod döndürür.
function linkNoteFor(status, st) {
  switch (status) {
    case LINK_LOADING: return { level: 'info', text: st.linkLoading }
    case LINK_READY: return { level: 'info', text: st.linkRestored }
    // LINK_BOUND: ekran az önce kaydedilerek bağlandı, yüklenen bir şey yok —
    // geri bildirimi zaten "Hesap projeye kaydedildi." satırı veriyor.
    case LINK_ANONYMOUS: return { level: 'warn', text: st.linkAnonymous }
    case LINK_NOT_FOUND: return { level: 'warn', text: st.linkNotFound }
    case LINK_MISMATCH: return { level: 'warn', text: st.linkMismatch }
    case LINK_BROKEN: return { level: 'warn', text: st.linkBroken }
    case LINK_ERROR: return { level: 'warn', text: st.linkError }
    default: return null
  }
}

// `section`: report.js → buildReportSection() çıktısı (SVG'siz), ekranın
// kendisi kurar ve geçirir (bkz. ReportDialog.jsx).
// `schematicRef`/`chartRef`: ekrandaki <Schematic>/<LineChart>'a geçirilen
// ref'ler — ReportDialog ile aynı ref'ler buraya da geçirilir, kaydetme
// anında canlı SVG buradan okunur.
// `saved`: `useSavedCalculation()` çıktısı. Verilmezse panel eskisi gibi
// yalnızca yeni kayıt açar — bağ kavramı devre dışı kalır.
export default function SaveToProject({
  toolKey, toolMode, f, r, section, schematicRef, chartRef, saved,
}) {
  const { lang } = useLang()
  const st = saveToProjectText(lang)
  const { isAuthenticated, api } = useAuth()

  const boundId = saved?.calculationId ?? null
  const linkNote = linkNoteFor(saved?.status, st)

  const [projects, setProjects] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [projectId, setProjectId] = useState('')
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null) // { level: 'ok' | 'warn', text }

  useEffect(() => {
    // Bağlıyken proje listesi gerekmiyor: hedef belli, üzerine yazılacak.
    if (!isAuthenticated || boundId) return undefined
    let cancelled = false
    ;(async () => {
      setLoadingList(true)
      const res = await api.get('/api/projects')
      if (cancelled) return
      if (res.ok) {
        setProjects(res.data.projects)
      } else {
        setFeedback({ level: 'warn', text: st.loadError })
      }
      setLoadingList(false)
    })()
    return () => { cancelled = true }
    // `st` her render'da yeni bir nesne — yalnızca giriş durumu/istemci/bağ
    // değiştiğinde yeniden çekilir, dil değişince değil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, api, boundId])

  // Sonuç geçersizken kaydedilecek bir şey yok; yalnızca bağ hakkında
  // söylenecek bir şey varsa panel yine de görünür — bozuk bir kayıt
  // bağlantısı sessiz kalmasın diye.
  if (!r?.ok && !linkNote) return null

  if (!isAuthenticated) {
    return (
      <div className="panel">
        <h2 className="section">{st.heading}</h2>
        {linkNote && <p className="field-hint danger">{linkNote.text}</p>}
        <p className="empty-note">
          {st.loginRequired} <Link to="/giris">{st.loginLink}</Link>
        </p>
      </div>
    )
  }

  function withCapturedSvg(current) {
    if (!current) return null
    return {
      ...current,
      schematicSvg: schematicRef?.current ? serializeSvgElement(schematicRef.current) : null,
      chart: current.chart
        ? { ...current.chart, svg: chartRef?.current ? serializeSvgElement(chartRef.current) : null }
        : null,
    }
  }

  // Kayıt gövdesi tek yerde kurulur: yeni kayıt ile güncelleme aynı alanları
  // yazmalı, yoksa güncellenen satır zamanla ilk kaydından ayrışır.
  function calculationBody() {
    const captured = withCapturedSvg(section)
    return {
      toolMode: toolMode ?? null,
      inputsJson: JSON.stringify(f),
      resultJson: JSON.stringify(r),
      // Bölüm kurulamadıysa alan GÖNDERİLMEZ: güncellemede atlanan alan
      // "değişmedi" demektir ve eski rapor bölümü olduğu gibi korunur.
      ...(captured ? { reportJson: JSON.stringify(captured) } : {}),
      engineVersion: ENGINE_VERSION,
      schemaVersion: REPORT_SCHEMA_VERSION,
    }
  }

  async function handleCreate() {
    setFeedback(null)

    const trimmedName = newName.trim()
    if (!trimmedName && !projectId) {
      setFeedback({ level: 'warn', text: st.needTarget })
      return
    }

    setBusy(true)

    let targetId = projectId
    let targetName = projects.find((p) => p.id === projectId)?.name ?? ''
    if (trimmedName) {
      const createRes = await api.post('/api/projects', { name: trimmedName })
      if (!createRes.ok) {
        setBusy(false)
        setFeedback({ level: 'warn', text: st.genericError })
        return
      }
      targetId = createRes.data.id
      targetName = createRes.data.name
    }

    const res = await api.post(`/api/projects/${targetId}/calculations`, {
      toolKey,
      ...calculationBody(),
    })
    setBusy(false)

    if (!res.ok) {
      setFeedback({ level: 'warn', text: st.genericError })
      return
    }

    setFeedback({ level: 'ok', text: st.savedNote })
    setNewName('')
    setProjects((prev) => (
      prev.some((p) => p.id === targetId) ? prev : [...prev, { id: targetId, name: targetName }]
    ))
    setProjectId(targetId)
    // Ekran artık bu kayda bağlı: ikinci "Kaydet" kopya satır açmaz.
    saved?.bind({ calculationId: res.data.id, projectId: targetId, projectName: targetName })
  }

  async function handleUpdate() {
    setFeedback(null)
    setBusy(true)
    const res = await api.patch(`/api/calculations/${boundId}`, calculationBody())
    setBusy(false)
    setFeedback(res.ok
      ? { level: 'ok', text: st.updatedNote }
      : { level: 'warn', text: st.genericError })
  }

  return (
    <div className="panel">
      <h2 className="section">{st.heading}</h2>

      {linkNote && (
        <p className={linkNote.level === 'warn' ? 'field-hint danger' : 'field-hint'}>{linkNote.text}</p>
      )}

      {saved?.dropped?.length > 0 && (
        <p className="field-hint danger">{st.droppedNote(saved.dropped)}</p>
      )}

      {boundId ? (
        <>
          <p className="empty-note">
            {st.boundNote(saved.projectName)}{' '}
            <Link to={`/proje/${saved.projectId}`}>{st.openProjectLink}</Link>
          </p>

          {saved.engine === ENGINE_STALE && <p className="field-hint danger">{st.staleNote}</p>}

          {feedback && (
            <p className={feedback.level === 'ok' ? 'field-hint' : 'field-hint danger'}>{feedback.text}</p>
          )}

          <div className="report-actions">
            <button type="button" className="row-add" disabled={busy || !r?.ok} onClick={handleUpdate}>
              {busy ? st.updating : st.updateLabel}
            </button>
            <button type="button" className="row-add" disabled={busy} onClick={() => saved.unbind()}>
              {st.detachLabel}
            </button>
          </div>
        </>
      ) : (
        <>
          {loadingList ? (
            <p className="empty-note">{st.loadingProjects}</p>
          ) : (
            <label className="field">
              <span className="field-label">{st.existingLabel}</span>
              <select
                className="select-only"
                value={projectId}
                onChange={(e) => { setProjectId(e.target.value); setNewName('') }}
              >
                <option value="">{st.existingPlaceholder}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}

          <label className="field">
            <span className="field-label">{st.newLabel}</span>
            <span className="field-row">
              <input
                type="text"
                value={newName}
                placeholder={st.newPlaceholder}
                onChange={(e) => { setNewName(e.target.value); setProjectId('') }}
              />
            </span>
          </label>

          {feedback && (
            <p className={feedback.level === 'ok' ? 'field-hint' : 'field-hint danger'}>{feedback.text}</p>
          )}

          <button type="button" className="row-add" disabled={busy || !r?.ok} onClick={handleCreate}>
            {busy ? st.saving : st.saveLabel}
          </button>
        </>
      )}
    </div>
  )
}
