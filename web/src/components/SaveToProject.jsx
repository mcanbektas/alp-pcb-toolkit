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
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../hooks/useLang'
import useProjectSaver from '../hooks/useProjectSaver'
import useLangCapture from '../hooks/useLangCapture'
import ProjectPicker from './ProjectPicker'
import { LANGS } from '../lib/i18n'
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
  const { isAuthenticated } = useAuth()

  const boundId = saved?.calculationId ?? null
  const linkNote = linkNoteFor(saved?.status, st)

  // Ağ ve liste durumu hook'ta; liste yalnızca giriş yapılmış ve BAĞSIZ ekranda
  // çekilir (bağlıyken hedef bellidir).
  const { projects, loadingList, listError, busy, create, update } = useProjectSaver({
    enabled: isAuthenticated && !boundId,
  })

  const capture = useLangCapture()
  const sectionRef = useRef(section)

  // Tek alanın iki çıktısı: seçili proje kimliği ya da (seçim yokken) alanda
  // yazılı yeni ad. İkisi aynı anda dolu olmaz — `onSelect(null)` seçimi
  // boşaltır, bir projeyi seçmek alanı o projenin adıyla doldurur.
  const [projectId, setProjectId] = useState('')
  const [query, setQuery] = useState('')
  const [feedback, setFeedback] = useState(null) // { level: 'ok' | 'warn', text }

  // Liste çekilemediyse geri bildirimi göster — dile bağlı metin bileşende.
  const listNote = listError ? { level: 'warn', text: st.loadError } : null

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

  // Bölüm HER DİLDE saklanır. Kayıt bir kez yazılır ama proje raporu yıllar
  // sonra istenebilir ve o an arayüz dili başka olabilir; tek dilde saklamak,
  // raporun kaydın diline donması demekti (64 eski kayıt hâlâ öyle).
  //
  // Diller `capture` ile sırayla gezilir: dil kısa süreliğine çevrilir, ekranın
  // o dildeki bölümü ve canlı SVG'si okunur, dil geri alınır — kullanıcı
  // hiçbirini görmez (bkz. useLangCapture). Alternatifi 29 araç ekranında
  // bölümü iki kez kurmak ve şemayı ikinci kez gizli çizmekti.
  //
  // Bedeli kayıt boyutu: iki SVG kümesi, hesap başına ~12 KB yerine ~25 KB.
  sectionRef.current = section

  function capturedByLang() {
    if (!sectionRef.current) return null

    const byLang = {}
    for (const code of LANGS) {
      byLang[code] = capture(code, () => {
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
    return byLang
  }

  // Kayıt gövdesi tek yerde kurulur: yeni kayıt ile güncelleme aynı alanları
  // yazmalı, yoksa güncellenen satır zamanla ilk kaydından ayrışır.
  function calculationBody() {
    const captured = capturedByLang()
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

    // Seçili proje varsa hedef odur; yoksa alanda yazılı ad YENİ projedir.
    // İkisi de boşsa gidilecek yer yok.
    const trimmedName = projectId ? '' : query.trim()
    if (!trimmedName && !projectId) {
      setFeedback({ level: 'warn', text: st.needTarget })
      return
    }

    const res = await create({
      projectId,
      newName: trimmedName,
      body: { toolKey, ...calculationBody() },
    })

    if (!res.ok) {
      setFeedback({ level: 'warn', text: st.genericError })
      return
    }

    setFeedback({ level: 'ok', text: st.savedNote })
    // Alan hedefin adıyla kalır: kaydettikten sonra nereye gittiği görünsün.
    setQuery(res.projectName ?? query)
    setProjectId(res.projectId)
    // Ekran artık bu kayda bağlı: ikinci "Kaydet" kopya satır açmaz.
    saved?.bind({
      calculationId: res.calculationId,
      projectId: res.projectId,
      projectName: res.projectName,
    })
  }

  async function handleUpdate() {
    setFeedback(null)
    const res = await update({ id: boundId, body: calculationBody() })
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

          <div className="report-actions stretch">
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
          {listNote && <p className="field-hint danger">{listNote.text}</p>}

          {loadingList ? (
            <p className="empty-note">{st.loadingProjects}</p>
          ) : (
            <ProjectPicker
              projects={projects}
              query={query}
              onQueryChange={setQuery}
              selectedId={projectId}
              onSelect={(project) => setProjectId(project?.id ?? '')}
              disabled={busy}
              text={{
                label: st.pickerLabel,
                placeholder: st.pickerPlaceholder,
                createOption: st.pickerCreate,
                noMatch: st.pickerNoMatch,
              }}
            />
          )}

          {feedback && (
            <p className={feedback.level === 'ok' ? 'field-hint' : 'field-hint danger'}>{feedback.text}</p>
          )}

          <div className="report-actions stretch">
            <button type="button" className="row-add" disabled={busy || !r?.ok} onClick={handleCreate}>
              {busy ? st.saving : st.saveLabel}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
