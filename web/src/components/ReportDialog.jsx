// Rapor indirme paneli — sonuç panelinin altında açılır, modal değil
// (docs/uyelik-ve-rapor-plani.md §6.4 kararı). Giriş yapmamış kullanıcıya
// yalnızca giriş bağlantısı gösterilir; hesap araçlarının kendisi girişsiz
// çalışmaya devam eder (§6.5).

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'
import { reportText, reportErrorText, reportDateStamp } from '../data/reportText'
import { buildReportPayload } from '../lib/reportPayload'
import { serializeSvgElement } from '../lib/svgInline'
import { downloadBlob } from '../lib/api'

// `section`: report.js → buildReportSection() çıktısı (SVG'siz).
// `schematicRef`/`chartRef`: ekrandaki <Schematic>/<LineChart>'a geçirilen
// ref'ler — indirme anında canlı SVG buradan okunur, önceden değil.
export default function ReportDialog({ section, schematicRef, chartRef }) {
  const { lang } = useLang()
  const text = reportText(lang)
  const { isAuthenticated, user, api } = useAuth()

  const [preparedBy, setPreparedBy] = useState(user?.displayName ?? '')
  const [busy, setBusy] = useState(null) // null | 'pdf' | 'xlsx'
  const [error, setError] = useState(null)

  if (!section) return null

  if (!isAuthenticated) {
    return (
      <div className="panel">
        <h2 className="section">{text.heading}</h2>
        <p className="empty-note">
          {text.loginRequired} <Link to="/giris">{text.loginLink}</Link>
        </p>
      </div>
    )
  }

  function withCapturedSvg() {
    return {
      ...section,
      schematicSvg: schematicRef?.current ? serializeSvgElement(schematicRef.current) : null,
      chart: section.chart
        ? { ...section.chart, svg: chartRef?.current ? serializeSvgElement(chartRef.current) : null }
        : null,
    }
  }

  async function download(format) {
    setError(null)

    const built = buildReportPayload({
      title: text.reportTitle,
      preparedBy,
      company: user?.company,
      date: reportDateStamp(),
      sections: [withCapturedSvg()],
    })
    if (!built.ok) {
      setError(text.missingPreparedBy)
      return
    }

    setBusy(format)
    const path = format === 'pdf' ? '/api/reports/pdf' : '/api/reports/xlsx'
    const fallback = format === 'pdf' ? 'rapor.pdf' : 'rapor.xlsx'
    const res = await api.postBlob(path, built.payload, fallback)
    setBusy(null)

    if (res.ok) {
      downloadBlob(res.blob, res.fileName)
    } else {
      setError(reportErrorText(res, lang))
    }
  }

  return (
    <div className="panel">
      <h2 className="section">{text.heading}</h2>

      <label className="field">
        <span className="field-label">{text.preparedByLabel}</span>
        <span className="field-row">
          <input type="text" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
        </span>
      </label>

      {error && <p className="field-hint danger">{error}</p>}

      <div className="report-actions">
        <button type="button" className="row-add" disabled={busy !== null} onClick={() => download('pdf')}>
          {busy === 'pdf' ? text.working : text.pdfButton}
        </button>
        <button type="button" className="row-add" disabled={busy !== null} onClick={() => download('xlsx')}>
          {busy === 'xlsx' ? text.working : text.xlsxButton}
        </button>
      </div>
    </div>
  )
}
