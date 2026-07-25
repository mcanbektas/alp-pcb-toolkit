import { Link } from 'react-router-dom'
import { CATEGORIES } from '../data/categories'

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>
          PCB tasarım kararlarını<br />
          <span className="accent">hesapla, gerekçelendir.</span>
        </h1>
        <p>
          Akım kapasitesinden empedansa, termal analizden DFM kontrollerine — her sonuç;
          kullanılan denklem, ara değerler, geçerlilik sınırı ve mühendislik yorumuyla birlikte sunulur.
        </p>
      </section>

      <section className="card-grid">
        {CATEGORIES.map((c) => {
          const active = c.tools.filter((t) => t.path).length
          return (
            <Link key={c.slug} to={`/kategori/${c.slug}`} className="cat-card">
              <h2>{c.title}</h2>
              <p className="desc">{c.desc}</p>
              <div className="meta">
                <span className={`chip ${active > 0 ? 'on' : ''}`}>
                  {active > 0 ? `${active} araç aktif` : 'yakında'}
                </span>
                <span>{c.tools.length} araç</span>
              </div>
            </Link>
          )
        })}
      </section>
    </>
  )
}
