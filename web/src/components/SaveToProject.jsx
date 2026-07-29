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
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'
import { saveToProjectText } from '../data/saveToProjectText'
import { serializeSvgElement } from '../lib/svgInline'
import { REPORT_SCHEMA_VERSION } from '../lib/reportPayload'
import { ENGINE_VERSION } from '../lib/engineVersion'

// `section`: report.js → buildReportSection() çıktısı (SVG'siz), ekranın
// kendisi kurar ve geçirir (bkz. ReportDialog.jsx).
// `schematicRef`/`chartRef`: ekrandaki <Schematic>/<LineChart>'a geçirilen
// ref'ler — ReportDialog ile aynı ref'ler buraya da geçirilir, kaydetme
// anında canlı SVG buradan okunur.
export default function SaveToProject({
  toolKey, toolMode, f, r, section, schematicRef, chartRef,
}) {
  const { lang } = useLang()
  const st = saveToProjectText(lang)
  const { isAuthenticated, api } = useAuth()

  const [projects, setProjects] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [projectId, setProjectId] = useState('')
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // { level: 'ok' | 'warn', text }

  useEffect(() => {
    if (!isAuthenticated) return undefined
    let cancelled = false
    ;(async () => {
      setLoadingList(true)
      const res = await api.get('/api/projects')
      if (cancelled) return
      if (res.ok) {
        setProjects(res.data.projects)
      } else {
        setStatus({ level: 'warn', text: st.loadError })
      }
      setLoadingList(false)
    })()
    return () => { cancelled = true }
    // `st` her render'da yeni bir nesne — yalnızca giriş durumu/istemci
    // değiştiğinde yeniden çekilir, dil değişince değil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, api])

  if (!r?.ok) return null

  if (!isAuthenticated) {
    return (
      <div className="panel">
        <h2 className="section">{st.heading}</h2>
        <p className="empty-note">
          {st.loginRequired} <Link to="/giris">{st.loginLink}</Link>
        </p>
      </div>
    )
  }

  function withCapturedSvg(section) {
    if (!section) return null
    return {
      ...section,
      schematicSvg: schematicRef?.current ? serializeSvgElement(schematicRef.current) : null,
      chart: section.chart
        ? { ...section.chart, svg: chartRef?.current ? serializeSvgElement(chartRef.current) : null }
        : null,
    }
  }

  async function handleSave() {
    setStatus(null)

    const trimmedName = newName.trim()
    if (!trimmedName && !projectId) {
      setStatus({ level: 'warn', text: st.needTarget })
      return
    }

    setBusy(true)

    let targetId = projectId
    if (trimmedName) {
      const createRes = await api.post('/api/projects', { name: trimmedName })
      if (!createRes.ok) {
        setBusy(false)
        setStatus({ level: 'warn', text: st.genericError })
        return
      }
      targetId = createRes.data.id
    }

    const capturedSection = withCapturedSvg(section)

    const res = await api.post(`/api/projects/${targetId}/calculations`, {
      toolKey,
      toolMode: toolMode ?? null,
      inputsJson: JSON.stringify(f),
      resultJson: JSON.stringify(r),
      reportJson: capturedSection ? JSON.stringify(capturedSection) : null,
      engineVersion: ENGINE_VERSION,
      schemaVersion: REPORT_SCHEMA_VERSION,
    })
    setBusy(false)

    if (res.ok) {
      setStatus({ level: 'ok', text: st.savedNote })
      setNewName('')
      setProjects((prev) => (
        prev.some((p) => p.id === targetId) ? prev : [...prev, { id: targetId, name: trimmedName }]
      ))
      setProjectId(targetId)
    } else {
      setStatus({ level: 'warn', text: st.genericError })
    }
  }

  return (
    <div className="panel">
      <h2 className="section">{st.heading}</h2>

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

      {status && (
        <p className={status.level === 'ok' ? 'field-hint' : 'field-hint danger'}>{status.text}</p>
      )}

      <button type="button" className="row-add" disabled={busy} onClick={handleSave}>
        {busy ? st.saving : st.saveLabel}
      </button>
    </div>
  )
}
