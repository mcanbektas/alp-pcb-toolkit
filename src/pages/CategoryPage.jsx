import { Link, useParams } from 'react-router-dom'
import { findCategory } from '../data/categories'

export default function CategoryPage() {
  const { slug } = useParams()
  const cat = findCategory(slug)

  if (!cat) {
    return (
      <>
        <h1 className="page-title">Kategori bulunamadı</h1>
        <Link className="backlink" to="/">← Ana sayfaya dön</Link>
      </>
    )
  }

  return (
    <>
      <h1 className="page-title">{cat.title}</h1>
      <p className="page-sub">{cat.desc}</p>

      <div className="tool-list">
        {cat.tools.map((t) =>
          t.path ? (
            <Link key={t.id} to={t.path} className="tool-row active">
              <span className="name">{t.name}</span>
              <span className="chip on">aç →</span>
            </Link>
          ) : (
            <div key={t.id} className="tool-row soon">
              <span className="name">{t.name}</span>
              <span className="chip">yakında</span>
            </div>
          )
        )}
      </div>

      <Link className="backlink" to="/">← Tüm kategoriler</Link>
    </>
  )
}
