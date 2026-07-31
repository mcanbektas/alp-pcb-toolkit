// Rapor indirme paneli — sonuç panelinin altında açılır, modal değil
// (docs/uyelik-ve-rapor-plani.md §6.4 kararı). Giriş yapmamış kullanıcıya
// yalnızca giriş bağlantısı gösterilir; hesap araçlarının kendisi girişsiz
// çalışmaya devam eder (§6.5).

import { useEffect, useRef, useState } from 'react'
import LangLink from './LangLink'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'
import { useNotice } from '../hooks/useNotice'
import {
  reportText, reportLabels, reportErrorText, reportDateStamp,
} from '../data/reportText'
import Segmented from './Segmented'
import useLangCapture from '../hooks/useLangCapture'
import { LANGS } from '../lib/i18n'
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
  const { showNotice } = useNotice()

  const [preparedBy, setPreparedBy] = useState(user?.displayName ?? '')
  // Firma da ad gibi profilden önerilir ve düzenlenebilir. Boş bırakılabilir:
  // yükte `null`a düşer, belge yalnızca adı taşır.
  const [company, setCompany] = useState(user?.company ?? '')

  // Belge dili — arayüz dilinden AYRI tutulur. Başlangıç değeri arayüz dilidir
  // (olağan durum), ama kullanıcı değiştirince `useLang()` değişmez: Türkçe
  // çalışıp İngilizce rapor indirmek istenen bir şey, siteyi çevirmek değil.
  const [docLang, setDocLang] = useState(lang)

  const capture = useLangCapture()
  const sectionRef = useRef(section)

  // `user` ilk render'da HENÜZ YOK: oturum sessiz yenilemeyle çözülüyor ve
  // yanıt sonradan geliyor. Başlangıç değeri o yüzden boş kalıyordu —
  // doğrudan bir araç sayfası açıp (ya da F5'leyip) PDF'e basınca
  // "Hazırlayan adı boş olamaz" hatası çıkıyordu; SPA içinde gezinerek
  // gelindiğinde ad zaten yüklü olduğu için sorun görünmüyordu.
  //
  // Ad geldiğinde alan BİR KEZ doldurulur ve kullanıcının yazdığı değer
  // ezilmez: koşul hem tek seferlik bayrağa hem alanın hâlâ boş olmasına bakar.
  //
  // Firma aynı gerekçeyle aynı anda doldurulur. Kendi bayrağı VAR: profili
  // boş olan kullanıcıda `user.company` hiç gelmez ve ortak bir bayrak
  // kullanılsaydı ad geldiğinde bayrak yanar, firma sonradan tanımlansa bile
  // bir daha doldurulmazdı.
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
  const [busy, setBusy] = useState(null) // null | 'pdf' | 'xlsx'
  const [error, setError] = useState(null)

  if (!section) return null

  if (!isAuthenticated) {
    return (
      <div className="panel">
        <h2 className="section">{text.heading}</h2>
        <p className="empty-note">
          {text.loginRequired} <LangLink to="/giris">{text.loginLink}</LangLink>
        </p>
      </div>
    )
  }

  // Bölüm ve SVG'ler BELGE dilinde okunur. `section` prop'u ekranın o anki
  // dilinde kurulur, SVG'ler de canlı DOM'dan gelir; `capture` dili kısa
  // süreliğine çevirip ikisini birden hedef dilde alır (bkz. useLangCapture).
  // Prop'u ref üzerinden okumak ZORUNLU: dil çevrildiğinde ekran yeniden
  // render olur ve YENİ bir `section` geçirir, ama bu fonksiyonun kapanışı
  // eskisini tutar. Ref her render'da tazelendiği için güncel olanı verir.
  sectionRef.current = section

  function captureFor(docLanguage) {
    return capture(docLanguage, () => {
      const current = sectionRef.current
      return {
        ...current,
        schematicSvg: schematicRef?.current ? serializeSvgElement(schematicRef.current) : null,
        chart: current.chart
          ? { ...current.chart, svg: chartRef?.current ? serializeSvgElement(chartRef.current) : null }
          : null,
      }
    })
  }

  async function download(format) {
    setError(null)

    const built = buildReportPayload({
      title: reportText(docLang).reportTitle,
      preparedBy,
      // Profilden değil ALANDAN okunur: kullanıcı tek seferlik başka bir firma
      // yazdıysa belgeye o gitmeli. `buildReportPayload` boş dizeyi `null`a
      // çevirir.
      company,
      date: reportDateStamp(),
      // Belgenin çerçeve metni yükle birlikte gider — sunucu kendi sözlüğünü
      // taşımaz (bkz. reportText.js'teki reportLabels notu).
      labels: reportLabels(docLang),
      lang: docLang,
      sections: [captureFor(docLang)],
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
      // Dosya adı sunucudan (Content-Disposition) gelir; bildirime de o yazılır,
      // ekranın kendi tahmini değil — ikisi ayrışamaz.
      showNotice(text.downloaded(res.fileName))
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

      <label className="field">
        <span className="field-label">{text.companyLabel}</span>
        <span className="field-row">
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} />
        </span>
        <span className="field-hint">{text.companyHint}</span>
      </label>

      {/* Belge dili arayüz dilinden AYRI bir seçimdir: Türkçe çalışıp
          İngilizce rapor vermek olağan bir istek. `useLang()` bu yüzden
          değiştirilmez — seçim yalnızca yükü etkiler, siteyi çevirmez. */}
      <div className="field">
        <span className="field-label">{text.docLangLabel}</span>
        <Segmented
          options={LANGS.map((code) => ({
            value: code,
            label: text.docLangNames[code],
          }))}
          value={docLang}
          onChange={setDocLang}
        />
        <span className="field-hint center">{text.docLangNote(text.docLangNames[docLang])}</span>
      </div>

      {error && <p className="field-hint danger">{error}</p>}

      <div className="report-actions stretch">
        <button type="button" className="row-add" disabled={busy !== null} onClick={() => download('pdf')}>
          {busy === 'pdf' ? text.working : text.pdfButton(text.docLangNames[docLang])}
        </button>
        <button type="button" className="row-add" disabled={busy !== null} onClick={() => download('xlsx')}>
          {busy === 'xlsx' ? text.working : text.xlsxButton(text.docLangNames[docLang])}
        </button>
      </div>
    </div>
  )
}
