import { Link, useParams } from 'react-router-dom'
import { findCategory } from '../data/categories'
import { commonText } from '../data/uiText'
import { pick } from '../lib/i18n'
import { useLang } from '../hooks/useLang'

export default function CategoryPage() {
  const { slug } = useParams()
  const cat = findCategory(slug)
  const { lang } = useLang()
  const ui = commonText(lang)

  if (!cat) {
    return (
      <>
        <Link className="backlink" to="/">{ui.backHome}</Link>
        <h1 className="page-title">{ui.categoryNotFound}</h1>
      </>
    )
  }

  return (
    <>
      <Link className="backlink" to="/">{ui.allCategories}</Link>
      <h1 className="page-title">{pick(cat.title, lang)}</h1>
      <p className="page-sub">{pick(cat.desc, lang)}</p>

      <div className="tool-list">
        {cat.tools.map((t) =>
          t.path ? (
            <Link key={t.id} to={t.path} className="tool-row active">
              <span className="name">{pick(t.name, lang)}</span>
              <span className="chip on">{ui.open}</span>
            </Link>
          ) : (
            <div key={t.id} className="tool-row soon">
              <span className="name">{pick(t.name, lang)}</span>
              <span className="chip">{ui.soon}</span>
            </div>
          )
        )}
      </div>
    </>
  )
}
