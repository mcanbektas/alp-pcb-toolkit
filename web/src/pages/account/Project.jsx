// Proje detayı — ad/açıklama düzenleme, sıralı hesap listesi (silme +
// yukarı/aşağı taşıma) ve proje raporu indirme.
//
// GÜVENLİK: ham `reportJson` (içinde satır içi SVG dizesi taşır) bu ekrana
// hiç GELMEZ. Proje detayı yalnızca sunucunun türettiği düz önizleme
// satırlarını taşır; rapor üretiminde bölümleri de sunucu kendi kaydından
// toplar. Böylece SVG dizesinin JSX'e basılabileceği bir yol kalmıyor.

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import LangLink from '../../components/LangLink'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { useNotice } from '../../hooks/useNotice'
import ConfirmDialog from '../../components/ConfirmDialog'
import { commonText } from '../../data/uiText'
import {
  reportText, reportLabels, reportErrorText, reportDateStamp, REPORT_ERR_NOT_REPRODUCIBLE,
} from '../../data/reportText'
import Segmented from '../../components/Segmented'
import { LANGS } from '../../lib/i18n'
import { downloadBlob } from '../../lib/api'
import { pick } from '../../lib/i18n'
import { ENGINE_VERSION } from '../../lib/engineVersion'
import { CALC_PARAM, ENGINE_STALE, engineStatus } from '../../lib/savedCalculation'
import { toolPath } from '../../lib/routes'
import { findTool } from '../../data/categories'
import { getText } from './text'
import CalculationList from './CalculationList'

function toolDisplayName(toolKey, lang) {
  const tool = findTool(toolKey)
  // Tanımsız anahtar sessizce boş kalmaz, ham hâliyle görünür.
  return tool ? pick(tool.name, lang) : toolKey
}

// Liste sırası: güncelleme tarihine göre yeniden eskiye. Elle sıralama (eski
// yukarı/aşağı düğmeleri) kaldırıldı — satırda zaten tarih yazıyor ve 60
// hesaplı bir projede tek satırı taşımak düzinelerce tıklama demekti.
// Eşit tarihte kayıt sırası (`sortOrder`) ayırır, yoksa sıra render'dan
// render'a oynardı. Sunucunun kendi sırası `sortOrder`dır ve proje raporu
// hâlâ onu kullanır — belge kronolojik kalsın diye bilerek dokunulmadı.
function sortByDate(calculations) {
  return [...calculations].sort((a, b) => {
    const diff = new Date(b.updatedAt) - new Date(a.updatedAt)
    return diff !== 0 ? diff : b.sortOrder - a.sortOrder
  })
}

// Kaydı kendi araç ekranında açan yol. Anahtar `categories.js`'te yoksa
// (araç kaldırılmış ya da anahtar ayrışmış) `null` döner ve "Aç" gösterilmez —
// var olmayan bir yola götüren düğme koymaktansa hiç koymamak doğru.
//
// Yol geçerli dilde üretilir; sorgu parametresi (`hesap`) İKİ DİLDE DE aynı
// adı taşır — çevrilseydi bugüne kadar paylaşılmış her kayıt bağlantısı
// İngilizce ağaçta sessizce bağsız açılırdı (docs/en-url-karari.md §2).
function toolLinkFor(calc, lang) {
  const tool = findTool(calc.toolKey)
  if (!tool?.path) return null
  return `${toolPath(tool, lang)}?${CALC_PARAM}=${encodeURIComponent(calc.id)}`
}

export default function Project() {
  const { id } = useParams()
  const { lang } = useLang()
  const pt = getText(lang).project
  const ui = commonText(lang)
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

  // Silinmek üzere seçilen hesap ve isteğin sürüp sürmediği. Onay artık
  // `window.confirm` değil, ortak `ConfirmDialog` — bkz. Projects.jsx'teki
  // aynı desen ve docs/uyelik-ve-rapor-plani.md §6.4'teki İSTİSNA notu.
  const [pendingCalc, setPendingCalc] = useState(null)
  const [deletingCalc, setDeletingCalc] = useState(false)

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
    openHref: toolLinkFor(calc, lang),
  }))

  const [preparedBy, setPreparedBy] = useState(user?.displayName ?? '')
  // Firma da ad gibi profilden önerilir ve düzenlenebilir — ReportDialog'daki
  // aynı desen. Eskiden bu ekranda hiç görünmüyordu: firmayı sunucu kendi
  // kaydından okuyordu, yani kullanıcı belgede ne yazacağını göremiyordu.
  const [company, setCompany] = useState(user?.company ?? '')
  const [reportBusy, setReportBusy] = useState(null) // null | 'pdf' | 'xlsx'
  const [reportError, setReportError] = useState(null)
  // Belge dili — arayüz dilinden ayrı, başlangıcı arayüz dili.
  const [docLang, setDocLang] = useState(lang)

  // `user` İLK RENDER'DA HENÜZ YOK: oturum sessiz yenilemeyle çözülüyor ve yanıt
  // sonradan geliyor. Başlangıç değeri o yüzden boş kalıyordu — proje sayfası
  // doğrudan açıldığında (ya da F5'lendiğinde) PDF'e basınca "Hazırlayan adı boş
  // olamaz" çıkıyordu; SPA içinde gezinerek gelindiğinde ad zaten yüklü olduğu
  // için sorun görünmüyordu. ReportDialog'daki düzeltmenin aynısı: ad geldiğinde
  // alan BİR KEZ doldurulur ve kullanıcının yazdığı değer ezilmez.
  //
  // Firma kendi bayrağıyla doldurulur: profili boş olan kullanıcıda
  // `user.company` hiç gelmez ve ortak bayrak ad geldiğinde yanardı.
  const filledFromUser = useRef(false)
  useEffect(() => {
    if (filledFromUser.current || !user?.displayName) return
    filledFromUser.current = true
    setPreparedBy((current) => (current === '' ? user.displayName : current))
  }, [user?.displayName])

  const companyFilled = useRef(false)
  useEffect(() => {
    if (companyFilled.current || !user?.company) return
    companyFilled.current = true
    setCompany((current) => (current === '' ? user.company : current))
  }, [user?.company])

  useEffect(() => {
    if (!isAuthenticated) return undefined
    let cancelled = false
    ;(async () => {
      setLoading(true)
      // `lang`: liste önizlemesi kayıttaki dil haritasından seçilir (bkz.
      // sunucudaki StoredSection) — arayüz dilinde okunmazsa İngilizce
      // arayüzde Türkçe etiketler görünür.
      const res = await api.get(`/api/projects/${id}?lang=${lang}`)
      if (cancelled) return
      if (res.ok) {
        setProject(res.data)
        setName(res.data.name)
        setDescription(res.data.description ?? '')
        setCalcs(sortByDate(res.data.calculations))
      } else if (res.error === 'PROJECT_NOT_FOUND') {
        setNotFound(true)
      } else {
        setLoadError(true)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id, isAuthenticated, api, lang])

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

  async function confirmDeleteCalc() {
    const calc = pendingCalc
    if (!calc) return

    setDeletingCalc(true)
    const res = await api.del(`/api/calculations/${calc.id}`)
    setDeletingCalc(false)
    setPendingCalc(null)

    if (res.ok) {
      setCalcs((prev) => prev.filter((c) => c.id !== calc.id))
    } else {
      setCalcStatus({ text: pt.genericError })
    }
  }

  // Rapor bölümleri artık istemciye hiç gelmiyor (proje detayı yalnızca
  // önizleme satırlarını taşır), bu yüzden yükü sunucu kuruyor: gövdede
  // belgenin künyesi gider, bölümleri sunucu kaydedilmiş hesaplardan toplar.
  //
  // Firma da künyenin parçasıdır ve GÖVDEDE gider. Eskiden sunucu onu kendi
  // kaydından okuyordu; kullanıcı belgede ne yazacağını göremiyor, tek
  // seferlik başka bir firma adı da veremiyordu. Alan boş bırakılırsa sunucu
  // yine profildeki değere düşer.
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
      title: reportText(docLang).reportTitle,
      preparedBy: preparedBy.trim(),
      // Alan boşaltıldıysa BOŞ DİZE gider, `null` değil. Sunucuda ikisi ayrı
      // anlam taşır: boş dize "bu belgeye firma yazma", `null` (alan hiç
      // gönderilmemiş) "profildekini kullan". Boşaltmayı `null`a çevirseydik
      // firmayı kaldırmak isteyen kullanıcı sessizce profildekini alırdı.
      company: company.trim(),
      date: reportDateStamp(),
      // Bölümleri sunucu kendi kaydından toplar ama çerçeve metnini
      // toplayamaz: sunucuda kullanıcı metni yok. Belgenin başlıkları bu
      // yüzden künyeyle birlikte gider (bkz. reportText.js → reportLabels).
      labels: reportLabels(docLang),
      // Metin değil ANAHTAR: sunucu kayıttaki hangi dil dalını okuyacağını
      // bundan öğrenir.
      lang: docLang,
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
        <LangLink className="backlink" to="/projelerim">{pt.backlink}</LangLink>
        <div className="panel">
          <p className="empty-note">
            {pt.loginRequired} <LangLink to="/giris">{pt.loginLink}</LangLink>
          </p>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <LangLink className="backlink" to="/projelerim">{pt.backlink}</LangLink>
        <p className="empty-note">{pt.loading}</p>
      </>
    )
  }

  if (notFound) {
    return (
      <>
        <LangLink className="backlink" to="/projelerim">{pt.backlink}</LangLink>
        <h1 className="page-title">{pt.notFound}</h1>
      </>
    )
  }

  if (loadError || !project) {
    return (
      <>
        <LangLink className="backlink" to="/projelerim">{pt.backlink}</LangLink>
        <p className="empty-note warn">{pt.loadError}</p>
      </>
    )
  }

  return (
    <>
      <LangLink className="backlink" to="/projelerim">{pt.backlink}</LangLink>
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

        <div className="report-actions stretch">
          <button type="button" className="row-add" disabled={metaBusy} onClick={saveMeta}>
            {metaBusy ? pt.saving : pt.saveLabel}
          </button>
        </div>
      </section>

      <CalculationList
        rows={rows}
        pt={pt}
        calcStatus={calcStatus}
        onDelete={setPendingCalc}
      />

      <section className="panel">
        <h2>{pt.reportHeading}</h2>

        <label className="field">
          <span className="field-label">{pt.preparedByLabel}</span>
          <span className="field-row">
            <input type="text" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
          </span>
        </label>

        <label className="field">
          <span className="field-label">{pt.companyLabel}</span>
          <span className="field-row">
            <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} />
          </span>
          <span className="field-hint">{pt.companyHint}</span>
        </label>

        {/* Belge dili arayüz dilinden AYRI bir seçim — bkz. ReportDialog'daki
            aynı desen. Proje raporunda seçim şimdilik yalnızca çerçeveyi
            çevirir: bölümler kayıttan geliyor ve kaydedildikleri dile donmuş. */}
        <div className="field">
          <span className="field-label">{rt.docLangLabel}</span>
          <Segmented
            label={rt.docLangLabel}
            options={LANGS.map((code) => ({
              value: code,
              label: rt.docLangNames[code],
            }))}
            value={docLang}
            onChange={setDocLang}
          />
          <span className="field-hint center">{rt.docLangNote(rt.docLangNames[docLang])}</span>
        </div>

        {reportError && <p className="field-hint danger">{reportError}</p>}

        <div className="report-actions stretch">
          <button
            type="button"
            className="row-add"
            disabled={reportBusy !== null}
            onClick={() => downloadReport('pdf')}
          >
            {reportBusy === 'pdf' ? pt.working : rt.pdfButton(rt.docLangNames[docLang])}
          </button>
          <button
            type="button"
            className="row-add"
            disabled={reportBusy !== null}
            onClick={() => downloadReport('xlsx')}
          >
            {reportBusy === 'xlsx' ? pt.working : rt.xlsxButton(rt.docLangNames[docLang])}
          </button>
        </div>
      </section>

      {/* Liste kaç satır taşırsa taşısın kart BİR KEZ render edilir; hangi
          hesabın sorulduğu `pendingCalc` state'inde durur. */}
      <ConfirmDialog
        open={pendingCalc !== null}
        title={pt.deleteCalcTitle}
        message={pendingCalc ? pt.confirmDeleteCalc(toolDisplayName(pendingCalc.toolKey, lang)) : ''}
        confirmLabel={pt.deleteLabel}
        cancelLabel={ui.cancel}
        busy={deletingCalc}
        onConfirm={confirmDeleteCalc}
        onCancel={() => setPendingCalc(null)}
      />
    </>
  )
}
