import { Link, useLocation } from 'react-router-dom'
import LangLink from '../components/LangLink'
import { commonText } from '../data/uiText'
import { pick } from '../lib/i18n'
import { categoryFromPath, toolPath } from '../lib/routes'
import { useLang } from '../hooks/useLang'

export default function CategoryPage() {
  // Kategori kaydı SLUG'la değil TAM YOLLA bulunur: `slug` parametresi dile
  // göre farklı sözlükten gelir (`empedans` ↔ `controlled-impedance`) ve ham
  // slug'la arama İngilizce ağaçta hiçbir kategoriyi bulamazdı.
  const { pathname } = useLocation()
  const cat = categoryFromPath(pathname)
  const { lang } = useLang()
  const ui = commonText(lang)

  if (!cat) {
    return (
      <>
        <LangLink className="backlink" to="/">{ui.backHome}</LangLink>
        <h1 className="page-title">{ui.categoryNotFound}</h1>
      </>
    )
  }

  return (
    <>
      <LangLink className="backlink" to="/">{ui.allCategories}</LangLink>
      <h1 className="page-title">{pick(cat.title, lang)}</h1>
      <p className="page-sub">{pick(cat.desc, lang)}</p>

      <div className="tool-list">
        {cat.tools.map((t) =>
          t.path ? (
            <Link key={t.id} to={toolPath(t, lang)} className="tool-row active">
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
