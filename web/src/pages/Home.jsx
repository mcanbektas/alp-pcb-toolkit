import { Link } from 'react-router-dom'
import { CATEGORIES } from '../data/categories'
import { commonText } from '../data/uiText'
import { pick } from '../lib/i18n'
import { categoryPath } from '../lib/routes'
import { useLang } from '../hooks/useLang'

// Kahraman bölümünün metni de `pick()` ile çözülür: doğrudan `DICT[lang]`
// indekslemesi eksik çeviride `undefined` verirdi, `pick` Türkçeye düşer.
const HERO_TITLE = {
  tr: <>PCB tasarım kararlarını<br /><span className="accent">hesapla, gerekçelendir.</span></>,
  en: <>Calculate PCB design decisions<br /><span className="accent">and justify them.</span></>,
}

const HERO_SUB = {
  tr: 'Akım kapasitesinden empedansa, termal analizden DFM kontrollerine — her sonuç; '
    + 'kullanılan denklem, ara değerler, geçerlilik sınırı ve mühendislik yorumuyla birlikte sunulur.',
  en: 'From current capacity to impedance, thermal analysis to DFM checks — every result comes '
    + 'with the equation used, intermediate values, validity limits and engineering commentary.',
}

export default function Home() {
  const { lang } = useLang()
  const ui = commonText(lang)

  return (
    <>
      <section className="hero">
        <h1>{pick(HERO_TITLE, lang)}</h1>
        <p>{pick(HERO_SUB, lang)}</p>
      </section>

      <section className="card-grid">
        {CATEGORIES.map((c) => {
          const active = c.tools.filter((t) => t.path).length
          return (
            <Link key={c.slug} to={categoryPath(c, lang)} className="cat-card">
              <h2>{pick(c.title, lang)}</h2>
              <p className="desc">{pick(c.desc, lang)}</p>
              <div className="meta">
                <span className={`chip ${active > 0 ? 'on' : ''}`}>
                  {active > 0 ? ui.toolsActive(active) : ui.soon}
                </span>
                <span>{ui.toolCount(c.tools.length)}</span>
              </div>
            </Link>
          )
        })}
      </section>
    </>
  )
}
