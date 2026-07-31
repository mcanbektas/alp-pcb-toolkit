// Projelerim — proje listesi. Kart ızgarası Home.jsx'teki kategori kartlarıyla
// aynı işaretleme ve sınıfları kullanır (.card-grid / .cat-card). Giriş
// yapmamış kullanıcıya ReportDialog ile aynı desende yalnızca giriş
// bağlantısı gösterilir; bu ekranı saran ayrı bir "korumalı rota" bileşeni
// yok (Faz 3'te de kurulmadı, bkz. App.jsx'teki AccountArea) — denetim
// burada, sayfanın kendisinde yapılır.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import ConfirmDialog from '../../components/ConfirmDialog'
import { commonText } from '../../data/uiText'
import { reportDateTimeStamp } from '../../data/reportText'
import { getText } from './text'

export default function Projects() {
  const { lang } = useLang()
  const ui = commonText(lang)
  const pt = getText(lang).projects
  const { isLoading, isAuthenticated, api } = useAuth()

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createStatus, setCreateStatus] = useState(null)

  // Silme hatası kart başına tutulur (`{ id, text }`) — "Yeni proje" panelinin
  // üstteki createStatus'uyla karıştırılmaz, yoksa hata ilgisiz karttan uzakta
  // görünür (bkz. handleDelete).
  const [deleteError, setDeleteError] = useState(null)

  // Silinmek üzere seçilen proje. Onay kartı (ConfirmDialog) bu state'e bakar:
  // dolu olduğu sürece kart açıktır. `deleting` istek sürerken kartın iki
  // düğmesini de kilitler, yoksa aynı silme iki kez gönderilebilir.
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return undefined
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await api.get('/api/projects')
      if (cancelled) return
      if (res.ok) {
        setProjects(res.data.projects)
        setLoadError(false)
      } else {
        setLoadError(true)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [isAuthenticated, api])

  async function handleCreate() {
    setCreateStatus(null)
    const trimmed = name.trim()
    if (!trimmed) {
      setCreateStatus({ text: pt.missingName })
      return
    }

    setCreating(true)
    const res = await api.post('/api/projects', {
      name: trimmed,
      description: description.trim() || undefined,
    })
    setCreating(false)

    if (res.ok) {
      setProjects((prev) => [...prev, res.data])
      setName('')
      setDescription('')
    } else if (res.error === 'MISSING_FIELDS') {
      setCreateStatus({ text: pt.missingName })
    } else {
      setCreateStatus({ text: pt.genericError })
    }
  }

  // Çöp kutusu düğmesi yalnızca projeyi seçer, silmez. Düğme <Link>'in kardeşi
  // ve kartın üstünde durduğu için varsayılan davranış burada durdurulur —
  // yoksa tıklama karta gider ve proje detayı açılır.
  function askDelete(e, project) {
    e.preventDefault()
    e.stopPropagation()
    setDeleteError(null)
    setPendingDelete(project)
  }

  async function confirmDelete() {
    const project = pendingDelete
    if (!project) return

    setDeleting(true)
    const res = await api.del(`/api/projects/${project.id}`)
    setDeleting(false)
    // Onay kartı her iki durumda da kapanır; hata kartın içinde değil, ilgili
    // proje kartının altında gösterilir (aşağıdaki deleteError deseni).
    setPendingDelete(null)

    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== project.id))
    } else {
      setDeleteError({ id: project.id, text: pt.genericError })
    }
  }

  function cancelDelete() {
    if (deleting) return
    setPendingDelete(null)
  }

  if (isLoading) return null

  if (!isAuthenticated) {
    return (
      <>
        <Link className="backlink" to="/">{ui.backHome}</Link>
        <h1 className="page-title">{pt.title}</h1>
        <div className="panel">
          <p className="empty-note">
            {pt.loginRequired} <Link to="/giris">{pt.loginLink}</Link>
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <Link className="backlink" to="/">{ui.backHome}</Link>
      <h1 className="page-title">{pt.title}</h1>
      <p className="page-sub">{pt.intro}</p>

      <section className="panel">
        <h2>{pt.newHeading}</h2>

        <label className="field">
          <span className="field-label">{pt.nameLabel}</span>
          <span className="field-row">
            <input
              type="text"
              value={name}
              placeholder={pt.namePlaceholder}
              onChange={(e) => setName(e.target.value)}
            />
          </span>
        </label>

        {/* Açıklama serbest metindir ve tek satıra sığmayabilir: <textarea>
            üç satır yüksekliğinde açılır, kullanıcı gerekirse dikeyde büyütür.
            Sarmalayıcı desen (.field / .field-label / .field-row) aynı kalır —
            görünüm kararı tema dosyalarındaki `.field-row textarea` kuralında. */}
        <label className="field">
          <span className="field-label">{pt.descLabel}</span>
          <span className="field-row">
            <textarea
              rows={3}
              value={description}
              placeholder={pt.descPlaceholder}
              onChange={(e) => setDescription(e.target.value)}
            />
          </span>
        </label>

        {createStatus && <p className="field-hint danger">{createStatus.text}</p>}

        {/* Panelin tek ana eylemi. `.btn-primary` (dolu vurgu zemini) burada
            değil, giriş/kayıt ekranlarında kalır: bu panelde dolu yeşil düğme
            hemen üstündeki metin girdilerini bastırıyordu. `.btn-ghost` aynı
            yerleşimi taşır ama görünümü `.field-row` girdileriyle hizalıdır —
            saydam zemin, aynı kenarlık ve köşe, yalnızca yazı vurgu renginde.
            `.row-add` de burada kullanılmaz: o listeye satır ekleyen ikincil
            bir düğmedir ve gönder düğmesi olarak fazla sönük kalır. */}
        <button type="button" className="btn-ghost" disabled={creating} onClick={handleCreate}>
          {creating ? pt.creating : pt.createLabel}
        </button>
      </section>

      {loading ? (
        // Liste yerine geçen üç durum da panel içinde durur: çıplak paragraf
        // kart ızgarasının bıraktığı boşlukta sayfadan kopuk görünüyordu.
        <section className="panel"><p className="empty-note">{pt.loading}</p></section>
      ) : loadError ? (
        <section className="panel"><p className="empty-note warn">{pt.loadError}</p></section>
      ) : projects.length === 0 ? (
        <section className="panel"><p className="empty-note">{pt.empty}</p></section>
      ) : (
        <section className="card-grid">
          {projects.map((p) => (
            // Home.jsx/CategoryPage.jsx'teki .cat-card deseni: <Link> yalnızca
            // sunum içeriği taşır, hiçbir interaktif eleman içermez (HTML5
            // içerik modeli <a> içinde interaktif içeriğe izin vermez). Silme
            // düğmesi bu yüzden Link'in dışında, kendisiyle kardeş konumdadır.
            <div key={p.id} className="card-cell">
              <Link to={`/proje/${p.id}`} className="cat-card">
                <h2>{p.name}</h2>
                <p className="desc">{p.description || pt.noDescription}</p>
                <div className="meta">
                  <span className="chip on">{pt.calcCount(p.calculationCount)}</span>
                  <span>{pt.updatedLabel(reportDateTimeStamp(new Date(p.updatedAt)))}</span>
                </div>
              </Link>
              <button
                type="button"
                className="card-del"
                onClick={(e) => askDelete(e, p)}
                aria-label={pt.deleteAria(p.name)}
                title={pt.deleteAria(p.name)}
              >
                {/* Çöp kutusu simgesi. Rengini taşımaz — `currentColor` ile
                    .card-del kuralından alır, böylece literal renk kuralı
                    bozulmaz ve dört temada da doğru tonda çıkar. */}
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path
                    d="M2.5 4h11M6.5 4V2.6h3V4M4.1 4l.6 9.2a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L11.9 4M6.6 6.7v5M9.4 6.7v5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {deleteError?.id === p.id && <p className="field-hint danger">{deleteError.text}</p>}
            </div>
          ))}
        </section>
      )}

      {/* Onay kartı listenin sonunda BİR KEZ durur, kart başına değil: açık
          olan tek bir kart vardır ve hangi projeyi sorduğu `pendingDelete`
          state'inden gelir. */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={pt.deleteTitle}
        message={pendingDelete ? pt.confirmDelete(pendingDelete.name) : ''}
        confirmLabel={pt.deleteLabel}
        cancelLabel={ui.cancel}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        busy={deleting}
      />
    </>
  )
}
