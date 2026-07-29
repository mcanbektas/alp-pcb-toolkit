// Proje detayı — ad/açıklama düzenleme, sıralı hesap listesi (silme +
// yukarı/aşağı taşıma) ve proje raporu indirme.
//
// GÜVENLİK: hiçbir hesabın ham `reportJson`'ı (içinde satır içi SVG dizesi
// taşır) `dangerouslySetInnerHTML` ile DOM'a geri yazılmaz — yalnızca
// sunucuya PDF/XLSX üretimi için gönderilir. Ekrandaki önizleme yalnızca
// düz veriden kurulur: araç adı, tarih ve `resultJson`'dan birkaç sayısal
// alan; SVG dizesi hiçbir zaman JSX'e basılmaz.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { reportText, reportErrorText, reportDateStamp } from '../../data/reportText'
import { buildReportPayload, REPORT_ERR_MISSING_PREPARED_BY } from '../../lib/reportPayload'
import { downloadBlob } from '../../lib/api'
import { fmt } from '../../lib/num'
import { pick } from '../../lib/i18n'
import { CATEGORIES } from '../../data/categories'
import { getText } from './text'

function toolDisplayName(toolKey, lang) {
  for (const cat of CATEGORIES) {
    const tool = cat.tools.find((t) => t.id === toolKey)
    if (tool) return pick(tool.name, lang)
  }
  return toolKey // tanımsız anahtar sessizce boş kalmaz, ham hâliyle görünür
}

// `resultJson`'dan yalnızca birkaç sayısal alanı düz metin olarak çıkarır —
// önizleme içindir, hiçbir SVG ya da biçimlendirilmiş cümle taşımaz.
function resultPreview(resultJson) {
  if (!resultJson) return []
  try {
    const parsed = JSON.parse(resultJson)
    if (!parsed || typeof parsed !== 'object') return []
    return Object.entries(parsed)
      .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
      .slice(0, 2)
      .map(([k, v]) => `${k} ${fmt(v, 4)}`)
  } catch {
    return []
  }
}

export default function Project() {
  const { id } = useParams()
  const { lang } = useLang()
  const pt = getText(lang).project
  const rt = reportText(lang)
  const { isLoading, isAuthenticated, user, api } = useAuth()

  const [project, setProject] = useState(null)
  const [calcs, setCalcs] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [metaBusy, setMetaBusy] = useState(false)
  const [metaStatus, setMetaStatus] = useState(null)

  const [calcStatus, setCalcStatus] = useState(null)

  const [preparedBy, setPreparedBy] = useState(user?.displayName ?? '')
  const [reportBusy, setReportBusy] = useState(null) // null | 'pdf' | 'xlsx'
  const [reportError, setReportError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) return undefined
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await api.get(`/api/projects/${id}`)
      if (cancelled) return
      if (res.ok) {
        setProject(res.data)
        setName(res.data.name)
        setDescription(res.data.description ?? '')
        setCalcs([...res.data.calculations].sort((a, b) => a.sortOrder - b.sortOrder))
      } else if (res.error === 'PROJECT_NOT_FOUND') {
        setNotFound(true)
      } else {
        setLoadError(true)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id, isAuthenticated, api])

  async function saveMeta() {
    setMetaStatus(null)
    const trimmed = name.trim()
    if (!trimmed) {
      setMetaStatus({ level: 'warn', text: pt.missingName })
      return
    }

    setMetaBusy(true)
    const res = await api.patch(`/api/projects/${id}`, {
      name: trimmed,
      description: description.trim() || null,
    })
    setMetaBusy(false)

    if (res.ok) {
      setProject((p) => ({ ...p, ...res.data }))
      setMetaStatus({ level: 'ok', text: pt.savedNote })
    } else if (res.error === 'MISSING_FIELDS') {
      setMetaStatus({ level: 'warn', text: pt.missingName })
    } else {
      setMetaStatus({ level: 'warn', text: pt.genericError })
    }
  }

  async function deleteCalc(calc) {
    const label = toolDisplayName(calc.toolKey, lang)
    if (!window.confirm(pt.confirmDeleteCalc(label))) return

    const res = await api.del(`/api/calculations/${calc.id}`)
    if (res.ok) {
      setCalcs((prev) => prev.filter((c) => c.id !== calc.id))
    } else {
      setCalcStatus({ text: pt.genericError })
    }
  }

  async function move(calc, direction) {
    const idx = calcs.findIndex((c) => c.id === calc.id)
    const swapIdx = idx + direction
    if (idx === -1 || swapIdx < 0 || swapIdx >= calcs.length) return

    const previous = calcs
    const next = [...calcs]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    setCalcs(next)

    const res = await api.post(`/api/projects/${id}/calculations/reorder`, {
      orderedIds: next.map((c) => c.id),
    })
    if (!res.ok) {
      setCalcs(previous) // sunucu reddettiyse yerel sıralama geri alınır
      setCalcStatus({ text: pt.genericError })
    }
  }

  async function downloadReport(format) {
    setReportError(null)

    const sections = []
    for (const calc of calcs) {
      if (!calc.reportJson) continue
      try {
        sections.push(JSON.parse(calc.reportJson))
      } catch {
        // Bozuk/eski bir rapor bölümü sessizce atlanır — bir hesabın kaydı
        // diğerlerinin raporunu engellemez.
      }
    }
    if (sections.length === 0) {
      setReportError(pt.noSections)
      return
    }

    const built = buildReportPayload({
      title: rt.reportTitle,
      preparedBy,
      company: user?.company,
      date: reportDateStamp(),
      sections,
    })
    if (!built.ok) {
      setReportError(built.error === REPORT_ERR_MISSING_PREPARED_BY ? rt.missingPreparedBy : pt.noSections)
      return
    }

    setReportBusy(format)
    const path = `${format === 'pdf' ? '/api/reports/pdf' : '/api/reports/xlsx'}?projectId=${encodeURIComponent(id)}`
    const fallback = format === 'pdf' ? 'rapor.pdf' : 'rapor.xlsx'
    const res = await api.postBlob(path, built.payload, fallback)
    setReportBusy(null)

    if (res.ok) {
      downloadBlob(res.blob, res.fileName)
    } else {
      setReportError(reportErrorText(res, lang))
    }
  }

  if (isLoading) return null

  if (!isAuthenticated) {
    return (
      <>
        <Link className="backlink" to="/projelerim">{pt.backlink}</Link>
        <div className="panel">
          <p className="empty-note">
            {pt.loginRequired} <Link to="/giris">{pt.loginLink}</Link>
          </p>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <Link className="backlink" to="/projelerim">{pt.backlink}</Link>
        <p className="empty-note">{pt.loading}</p>
      </>
    )
  }

  if (notFound) {
    return (
      <>
        <Link className="backlink" to="/projelerim">{pt.backlink}</Link>
        <h1 className="page-title">{pt.notFound}</h1>
      </>
    )
  }

  if (loadError || !project) {
    return (
      <>
        <Link className="backlink" to="/projelerim">{pt.backlink}</Link>
        <p className="empty-note warn">{pt.loadError}</p>
      </>
    )
  }

  return (
    <>
      <Link className="backlink" to="/projelerim">{pt.backlink}</Link>
      <h1 className="page-title">{project.name}</h1>

      <section className="panel">
        <label className="field">
          <span className="field-label">{pt.nameLabel}</span>
          <span className="field-row">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </span>
        </label>

        <label className="field">
          <span className="field-label">{pt.descLabel}</span>
          <span className="field-row">
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </span>
        </label>

        {metaStatus && (
          <p className={metaStatus.level === 'ok' ? 'field-hint' : 'field-hint danger'}>{metaStatus.text}</p>
        )}

        <button type="button" className="row-add" disabled={metaBusy} onClick={saveMeta}>
          {metaBusy ? pt.saving : pt.saveLabel}
        </button>
      </section>

      <section className="panel">
        <h2>{pt.calcsHeading}</h2>

        {calcStatus && <p className="field-hint danger">{calcStatus.text}</p>}

        {calcs.length === 0 ? (
          <p className="empty-note">{pt.calcsEmpty}</p>
        ) : (
          <div className="tool-list">
            {calcs.map((calc, i) => {
              const label = toolDisplayName(calc.toolKey, lang)
              const preview = resultPreview(calc.resultJson)
              return (
                <div key={calc.id} className="tool-row">
                  <span className="name">
                    {label}
                    <span className="sub"> — {reportDateStamp(new Date(calc.updatedAt))}</span>
                    {preview.length > 0 && <span className="sub"> · {preview.join(' · ')}</span>}
                    {!calc.reportJson && <span className="chip"> {pt.noReportTag}</span>}
                  </span>
                  <span className="report-actions">
                    <button
                      type="button"
                      className="row-add"
                      disabled={i === 0}
                      onClick={() => move(calc, -1)}
                      aria-label={pt.moveUpAria(label)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="row-add"
                      disabled={i === calcs.length - 1}
                      onClick={() => move(calc, 1)}
                      aria-label={pt.moveDownAria(label)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="row-add"
                      onClick={() => deleteCalc(calc)}
                      aria-label={pt.deleteAria(label)}
                    >
                      {pt.deleteLabel}
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>{pt.reportHeading}</h2>

        <label className="field">
          <span className="field-label">{pt.preparedByLabel}</span>
          <span className="field-row">
            <input type="text" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
          </span>
        </label>

        {reportError && <p className="field-hint danger">{reportError}</p>}

        <div className="report-actions">
          <button
            type="button"
            className="row-add"
            disabled={reportBusy !== null}
            onClick={() => downloadReport('pdf')}
          >
            {reportBusy === 'pdf' ? pt.working : pt.pdfButton}
          </button>
          <button
            type="button"
            className="row-add"
            disabled={reportBusy !== null}
            onClick={() => downloadReport('xlsx')}
          >
            {reportBusy === 'xlsx' ? pt.working : pt.xlsxButton}
          </button>
        </div>
      </section>
    </>
  )
}
