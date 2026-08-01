// Raporlarım — rapor kütüğü. `GET /api/reports` listeler, satırdaki düğme
// `POST /api/reports/{id}/download` ile belgeyi yeniden üretir.
//
// Listedeki ayrım ekranın var olma nedenidir: anlık görüntüsü olan rapor
// İNDİRİLDİĞİ GÜNÜN içeriğini basar, olmayan (göç öncesi ya da kotayla
// geriletilmiş) rapor projenin GÜNCEL hâlinden üretilir
// (docs/rapor-snapshot-karari.md §3). İki davranış aynı listede yaşadığı ve
// hangisinin geçerli olduğu belgeden anlaşılmadığı için etiket satırda durur.
//
// Giriş denetimi Projects.jsx ile aynı desende sayfanın kendisinde; korumalı
// rota sarmalayıcısı yok.

import { useEffect, useState } from 'react'
import LangLink from '../../components/LangLink'
import Segmented from '../../components/Segmented'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { LANGS } from '../../lib/i18n'
import { downloadBlob } from '../../lib/api'
import { useNotice } from '../../hooks/useNotice'
import { commonText } from '../../data/uiText'
import {
  reportText, reportLabels, reportErrorText, reportDateTimeStamp,
  REPORT_ERR_NOT_REPRODUCIBLE,
} from '../../data/reportText'
import { getText } from './text'

export default function Reports() {
  const { lang } = useLang()
  const ui = commonText(lang)
  const pt = getText(lang).reports
  const rt = reportText(lang)
  const { isLoading, isAuthenticated, api } = useAuth()
  const { showNotice } = useNotice()

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Belge dili arayüz dilinden AYRI bir seçimdir — ReportDialog ve proje
  // raporundaki desenin aynısı. Seçim yalnızca indirilen belgeyi etkiler.
  const [docLang, setDocLang] = useState(lang)

  // İndirme durumu ve hatası satır başına tutulur: hangi rapor sürüyorsa onun
  // düğmesi kilitlenir, hata da ilgili satırın altında görünür.
  const [busyId, setBusyId] = useState(null)
  const [rowError, setRowError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) return undefined
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await api.get('/api/reports')
      if (cancelled) return
      if (res.ok) {
        setReports(res.data)
        setLoadError(false)
      } else {
        setLoadError(true)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [isAuthenticated, api])

  // Biçim kayıttan gelir (ReportSummary.format) — kütük "o gün ne indirildi"
  // der, düğme de onu söyler. Sunucu enum'u sayı olarak serileştirir: 0 = Pdf.
  const isPdf = (r) => r.format === 0 || r.format === 'Pdf'

  async function download(report) {
    setRowError(null)
    setBusyId(report.id)

    const fallback = isPdf(report) ? 'rapor.pdf' : 'rapor.xlsx'
    const res = await api.postBlob(`/api/reports/${encodeURIComponent(report.id)}/download`, {
      // Çerçeve metni indirme anında, SEÇİLEN dilde gider — sunucu kullanıcı
      // metni tanımaz; bölümleri kendi kaydından (snapshot ya da proje) toplar.
      labels: reportLabels(docLang),
      lang: docLang,
    }, fallback)
    setBusyId(null)

    if (res.ok) {
      downloadBlob(res.blob, res.fileName)
      showNotice(rt.downloaded(res.fileName))
    } else if (res.error === REPORT_ERR_NOT_REPRODUCIBLE) {
      setRowError({ id: report.id, text: pt.notReproducible })
    } else {
      setRowError({ id: report.id, text: reportErrorText(res, lang) })
    }
  }

  if (isLoading) return null

  if (!isAuthenticated) {
    return (
      <>
        <LangLink className="backlink" to="/">{ui.backHome}</LangLink>
        <h1 className="page-title">{pt.title}</h1>
        <div className="panel">
          <p className="empty-note">
            {pt.loginRequired} <LangLink to="/giris">{pt.loginLink}</LangLink>
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <LangLink className="backlink" to="/">{ui.backHome}</LangLink>
      <h1 className="page-title">{pt.title}</h1>
      <p className="page-sub">{pt.intro}</p>

      {loading ? (
        <section className="panel"><p className="empty-note">{pt.loading}</p></section>
      ) : loadError ? (
        <section className="panel"><p className="empty-note warn">{pt.loadError}</p></section>
      ) : reports.length === 0 ? (
        <section className="panel"><p className="empty-note">{pt.empty}</p></section>
      ) : (
        <section className="panel">
          {/* Belge dili listenin üstünde BİR KEZ durur, satır başına değil:
              seçim bütün indirmelere uygulanır ve satırlar sade kalır. */}
          <div className="field">
            <span className="field-label">{rt.docLangLabel}</span>
            <Segmented
              label={rt.docLangLabel}
              options={LANGS.map((code) => ({ value: code, label: rt.docLangNames[code] }))}
              value={docLang}
              onChange={setDocLang}
            />
            <span className="field-hint center">{rt.docLangNote(rt.docLangNames[docLang])}</span>
          </div>

          <div className="tool-list">
            {reports.map((r) => (
              <div key={r.id} className="tool-row">
                <span className="name">
                  {r.title}
                  <span className="sub"> — <strong>{reportDateTimeStamp(new Date(r.generatedAt))}</strong></span>
                  <span className="sub">
                    {pt.preparedByLine(r.preparedBy)}
                    {' · '}{isPdf(r) ? 'PDF' : 'Excel'}
                    {' · '}{pt.sizeLine(Math.max(1, Math.round(r.fileSize / 1024)))}
                  </span>
                  {/* Ayrımın kendisi: donmuş içerik vurgulu çiptir, güncelden
                      üretim düz çip — ikisi de metinle söylenir, yalnız renkle
                      değil. */}
                  {r.hasSnapshot
                    ? <span className="chip on"> {pt.snapshotTag}</span>
                    : <span className="chip"> {pt.liveTag}</span>}
                </span>
                <span className="report-actions">
                  <button
                    type="button"
                    className="row-add"
                    disabled={busyId !== null}
                    onClick={() => download(r)}
                  >
                    {busyId === r.id ? pt.working : isPdf(r) ? pt.downloadPdf : pt.downloadXlsx}
                  </button>
                </span>
                {rowError?.id === r.id && <p className="field-hint danger">{rowError.text}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
