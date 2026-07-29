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
import { commonText } from '../../data/uiText'
import { reportDateStamp } from '../../data/reportText'
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

  async function handleDelete(e, project) {
    e.preventDefault()
    e.stopPropagation()
    // Bu repoda modal yok; yıkıcı eylemler için var olan tek desen budur.
    if (!window.confirm(pt.confirmDelete(project.name))) return

    setDeleteError(null)
    const res = await api.del(`/api/projects/${project.id}`)
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== project.id))
    } else {
      setDeleteError({ id: project.id, text: pt.genericError })
    }
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

        <label className="field">
          <span className="field-label">{pt.descLabel}</span>
          <span className="field-row">
            <input
              type="text"
              value={description}
              placeholder={pt.descPlaceholder}
              onChange={(e) => setDescription(e.target.value)}
            />
          </span>
        </label>

        {createStatus && <p className="field-hint danger">{createStatus.text}</p>}

        <button type="button" className="row-add" disabled={creating} onClick={handleCreate}>
          {creating ? pt.creating : pt.createLabel}
        </button>
      </section>

      {loading ? (
        <p className="empty-note">{pt.loading}</p>
      ) : loadError ? (
        <p className="empty-note warn">{pt.loadError}</p>
      ) : projects.length === 0 ? (
        <p className="empty-note">{pt.empty}</p>
      ) : (
        <section className="card-grid">
          {projects.map((p) => (
            // Home.jsx/CategoryPage.jsx'teki .cat-card deseni: <Link> yalnızca
            // sunum içeriği taşır, hiçbir interaktif eleman içermez (HTML5
            // içerik modeli <a> içinde interaktif içeriğe izin vermez). Silme
            // düğmesi bu yüzden Link'in dışında, kendisiyle kardeş konumdadır.
            <div key={p.id}>
              <Link to={`/proje/${p.id}`} className="cat-card">
                <h2>{p.name}</h2>
                <p className="desc">{p.description || pt.noDescription}</p>
                <div className="meta">
                  <span className="chip on">{pt.calcCount(p.calculationCount)}</span>
                  <span>{pt.updatedLabel(reportDateStamp(new Date(p.updatedAt)))}</span>
                </div>
              </Link>
              <button
                type="button"
                className="row-add"
                onClick={(e) => handleDelete(e, p)}
                aria-label={pt.deleteAria(p.name)}
              >
                {pt.deleteLabel}
              </button>
              {deleteError?.id === p.id && <p className="field-hint danger">{deleteError.text}</p>}
            </div>
          ))}
        </section>
      )}
    </>
  )
}
