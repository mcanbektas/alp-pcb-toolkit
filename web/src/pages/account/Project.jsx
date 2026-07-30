// Proje detayı — ad/açıklama düzenleme, sıralı hesap listesi (silme +
// yukarı/aşağı taşıma) ve proje raporu indirme.
//
// GÜVENLİK: ham `reportJson` (içinde satır içi SVG dizesi taşır) bu ekrana
// hiç GELMEZ. Proje detayı yalnızca sunucunun türettiği düz önizleme
// satırlarını taşır; rapor üretiminde bölümleri de sunucu kendi kaydından
// toplar. Böylece SVG dizesinin JSX'e basılabileceği bir yol kalmıyor.

import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { useNotice } from '../../hooks/useNotice'
import {
  reportText, reportErrorText, reportDateStamp, REPORT_ERR_NOT_REPRODUCIBLE,
} from '../../data/reportText'
import { downloadBlob } from '../../lib/api'
import { pick } from '../../lib/i18n'
import { ENGINE_VERSION } from '../../lib/engineVersion'
import { CALC_PARAM, ENGINE_STALE, engineStatus } from '../../lib/savedCalculation'
import { findTool } from '../../data/categories'
import { getText } from './text'
import CalculationList from './CalculationList'

function toolDisplayName(toolKey, lang) {
  const tool = findTool(toolKey)
  // Tanımsız anahtar sessizce boş kalmaz, ham hâliyle görünür.
  return tool ? pick(tool.name, lang) : toolKey
}

// Kaydı kendi araç ekranında açan yol. Anahtar `categories.js`'te yoksa
// (araç kaldırılmış ya da anahtar ayrışmış) `null` döner ve "Aç" gösterilmez —
// var olmayan bir yola götüren düğme koymaktansa hiç koymamak doğru.
function toolLinkFor(calc) {
  const tool = findTool(calc.toolKey)
  if (!tool?.path) return null
  return `${tool.path}?${CALC_PARAM}=${encodeURIComponent(calc.id)}`
}

export default function Project() {
  const { id } = useParams()
  const { lang } = useLang()
  const pt = getText(lang).project
  const rt = reportText(lang)
  const { isLoading, isAuthenticated, user, api } = useAuth()
  const { showNotice } = useNotice()

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

  // Satır türevleri artık ayrıştırma içermiyor: önizleme ve mod etiketi
  // sunucudan hazır geliyor (`calc.preview` / `calc.previewMode`), geriye
  // yalnızca araç adının diline göre seçilmesi ve bağlantı kurma kalıyor.
  // Eskiden burada her satır için `reportJson` iki kez `JSON.parse` ediliyordu
  // ve "Hazırlayan" alanına yazılan her harf bunu tekrarlıyordu; `useMemo` de
  // o yüzden vardı, artık gerekmiyor.
  const rows = calcs.map((calc) => ({
    calc,
    label: toolDisplayName(calc.toolKey, lang),
    preview: calc.preview ?? [],
    mode: calc.previewMode ?? null,
    stale: engineStatus(calc.engineVersion, ENGINE_VERSION) === ENGINE_STALE,
    openHref: toolLinkFor(calc),
  }))

  const [preparedBy, setPreparedBy] = useState(user?.displayName ?? '')
  const [reportBusy, setReportBusy] = useState(null) // null | 'pdf' | 'xlsx'
  const [reportError, setReportError] = useState(null)

  // `user` İLK RENDER'DA HENÜZ YOK: oturum sessiz yenilemeyle çözülüyor ve yanıt
  // sonradan geliyor. Başlangıç değeri o yüzden boş kalıyordu — proje sayfası
  // doğrudan açıldığında (ya da F5'lendiğinde) PDF'e basınca "Hazırlayan adı boş
  // olamaz" çıkıyordu; SPA içinde gezinerek gelindiğinde ad zaten yüklü olduğu
  // için sorun görünmüyordu. ReportDialog'daki düzeltmenin aynısı: ad geldiğinde
  // alan BİR KEZ doldurulur ve kullanıcının yazdığı değer ezilmez.
  const filledFromUser = useRef(false)
  useEffect(() => {
    if (filledFromUser.current || !user?.displayName) return
    filledFromUser.current = true
    setPreparedBy((current) => (current === '' ? user.displayName : current))
  }, [user?.displayName])

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

  // Rapor bölümleri artık istemciye hiç gelmiyor (proje detayı yalnızca
  // önizleme satırlarını taşır), bu yüzden yükü sunucu kuruyor: gövdede
  // belgenin künyesi gider, bölümleri sunucu kaydedilmiş hesaplardan toplar.
  // Firma adını da sunucu kendi kaydından okur.
  async function downloadReport(format) {
    setReportError(null)

    if (!preparedBy.trim()) {
      setReportError(rt.missingPreparedBy)
      return
    }

    setReportBusy(format)
    const path = `/api/projects/${encodeURIComponent(id)}/report/${format}`
    const fallback = format === 'pdf' ? 'rapor.pdf' : 'rapor.xlsx'
    const res = await api.postBlob(path, {
      title: rt.reportTitle,
      preparedBy: preparedBy.trim(),
      date: reportDateStamp(),
    }, fallback)
    setReportBusy(null)

    if (res.ok) {
      downloadBlob(res.blob, res.fileName)
      // ReportDialog ile aynı geri bildirim: proje raporu da ayrı bir indirme
      // yüzeyi, sessiz kalmamalı.
      showNotice(rt.downloaded(res.fileName))
    } else if (res.error === REPORT_ERR_NOT_REPRODUCIBLE) {
      // Projede kayıtlı rapor bölümü yok — bu genel bir hata değil, eksik olan
      // veri; kullanıcıya ne yapması gerektiğini söyleyen kendi metni var.
      setReportError(pt.noSections)
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

      <CalculationList
        rows={rows}
        count={calcs.length}
        pt={pt}
        calcStatus={calcStatus}
        onMove={move}
        onDelete={deleteCalc}
      />

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
