// Yönetim paneli — operasyonel log ekranı (docs/brifler/12-loglama-ekrani.md
// §4). Bellek içi halka tampondan okur; denetim iziyle (../audit) KARIŞMAZ —
// bu ekran kalıcı DEĞİLDİR, uygulama yeniden başlayınca sıfırlanır.
//
// Yetki kapısı, sitemap/prerender gerekçesi ve debounce'lu arama deseni
// Günlük ekranıyla (../audit/index.jsx) BİREBİR aynı — bkz. o dosyanın
// başındaki not, burada tekrar edilmiyor. Farklar: sayfalama YOK (tampon
// kayan pencere, toplam sayı taşımaz), elle "Yenile" düğmesi VAR (tampon
// zaman içinde değişir, kullanıcı F5'siz tazeleyebilmeli).

import { useCallback, useEffect, useRef, useState } from 'react'
import FacetList from '../../../components/FacetList'
import InfoDialog from '../../../components/InfoDialog'
import LangLink from '../../../components/LangLink'
import { useAuth } from '../../../hooks/useAuth'
import { useLang } from '../../../hooks/useLang'
import AdminTabs from '../AdminTabs'
import { getText } from './text'

export default function AdminLogs() {
  const { lang } = useLang()
  const t = getText(lang)
  const { isLoading, isAuthenticated, user, api } = useAuth()

  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('')

  const [rows, setRows] = useState([])
  const [capacity, setCapacity] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  // Ayrıntı kartında gösterilen satır. Kart kapalıyken null; yenileme/filtre
  // değişince liste tazelense de sorun yok — kart o anki satırın kopyasını tutar.
  const [detailRow, setDetailRow] = useState(null)

  const isAdmin = user?.isAdmin === true

  // Otomatik yenile ile elle "Yenile" aynı isteği paylaşır — bindirme kapısı
  // (`loadingRef`) ikisi için de geçerli: 5 sn'lik bir yanıt gecikirse ikinci
  // tık/tik isteği atlar, çakışan yanıtlar satırları rastgele sırayla ezmez.
  const loadingRef = useRef(false)

  const load = useCallback(async (opts = {}) => {
    if (loadingRef.current) return
    loadingRef.current = true
    // Sessiz (otomatik) tikte yükleniyor/hata durumu YAZILMAZ — aksi hâlde
    // dolu bir tampon bile 5 sn'de bir "Yükleniyor…"a yanıp söner.
    const silent = opts.silent === true
    if (!silent) {
      setBusy(true)
      setError(null)
    }
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (levelFilter) params.set('level', levelFilter)
    const qs = params.toString()
    const res = await api.get(`/api/admin/logs${qs ? `?${qs}` : ''}`)
    loadingRef.current = false
    if (!silent) setBusy(false)

    if (!res.ok) {
      // network dışı bir hata (403/5xx) otomatik yenilemeyi kapatır — aksi
      // hâlde yetki geri alınmış ya da sunucu çökmüş bir sekme sınırsız,
      // hız sınırsız bir uca 5 sn'de bir istek atmayı sürdürür.
      if (res.error !== 'network') setAutoRefresh(false)
      if (!silent) {
        // Günlük ekranındaki gerekçenin aynısı: `t` bağımlılığa alınmaz,
        // `getText(lang)` her render'da yeni nesne döner ve effect'i sonsuz
        // tetikler.
        setError(getText(lang).errorText(res))
        setRows([])
      }
      return
    }
    setRows(res.data?.items ?? [])
    setCapacity(res.data?.capacity ?? 0)
  }, [api, search, levelFilter, lang])

  useEffect(() => {
    if (!isAdmin) return
    load()
  }, [isAdmin, load])

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(query.trim())
    }, 350)
    return () => clearTimeout(id)
  }, [query])

  // F3 — otomatik yenile (brif §5). Sekme arka plandayken (`visibilitychange`)
  // zamanlayıcı tamamen durur, geri dönünce yeniden kurulur; kapalıyken
  // dinleyici de eklenmez.
  useEffect(() => {
    if (!autoRefresh || !isAdmin) return undefined

    let intervalId = null
    const stop = () => {
      if (intervalId !== null) clearInterval(intervalId)
      intervalId = null
    }
    const start = () => {
      if (intervalId !== null) return
      intervalId = setInterval(() => load({ silent: true }), 5000)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [autoRefresh, isAdmin, load])

  function onSearch(e) {
    e.preventDefault()
    setSearch(query.trim())
  }

  if (isLoading) return null

  if (!isAuthenticated) {
    return (
      <>
        <div className="tool-header">
          <h1>{t.title}</h1>
        </div>
        <div className="panel">
          <p className="empty-note">
            {t.loginRequired} <LangLink to="/giris">{t.loginLink}</LangLink>
          </p>
        </div>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <div className="tool-header">
          <h1>{t.title}</h1>
        </div>
        <div className="panel">
          <p className="empty-note">
            {t.forbidden} <LangLink to="/">{t.homeLink}</LangLink>
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="tool-header">
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
        <AdminTabs active="logs" />
      </div>

      <section className="panel">
        <div className="audit-layout">
          <aside className="audit-facets">
            <span className="field-label">{t.levelFilterLabel}</span>
            <FacetList
              groups={t.levelGroups}
              value={levelFilter}
              onChange={setLevelFilter}
              label={t.levelFilterLabel}
            />
          </aside>

          <div className="audit-main">
            <form onSubmit={onSearch}>
              <label className="field">
                <span className="field-label">{t.searchLabel}</span>
                <span className="field-row">
                  <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
                </span>
                <span className="field-hint center">{t.searchHint}</span>
              </label>
            </form>

            {error && <p className="field-hint danger">{error}</p>}

            {busy && rows.length === 0 && !error && <p className="empty-note">{t.loading}</p>}
            {!error && rows.length === 0 && !busy && <p className="empty-note">{t.empty}</p>}

            {rows.length > 0 && (
              /* Sarmal `.table-scroll`: Günlük/Kullanıcılar ekranlarındaki
                 aynı gerekçe — dar ekranda mesaj/kaynak hücreleri üst üste
                 binmesin, tablo yatay kaysın. */
              <div className="table-scroll">
                <table className="result-table">
                  <thead>
                    <tr className="mini-head">
                      <th scope="col">{t.columns.time}</th>
                      <th scope="col">{t.columns.level}</th>
                      <th scope="col">{t.columns.source}</th>
                      <th scope="col">{t.columns.message}</th>
                      <th scope="col" className="detail-cell">{t.columns.detail}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      // Satırın kalıcı bir kimliği yok (tampon kaydı, veritabanı
                      // satırı değil) — zaman+sıra birleşimi bu liste için yeter.
                      <tr key={`${row.occurredAt}-${i}`}>
                        <td>{t.formatDateSeconds(row.occurredAt)}</td>
                        <td>
                          <span className={`mark ${t.levelMarkClass(row.level)}`}>{row.level}</span>
                        </td>
                        <td>{t.sourceShort(row.sourceContext)}</td>
                        <td className="cell-wrap">{row.message}</td>
                        <td className="detail-cell">
                          <button
                            type="button"
                            className="row-add"
                            onClick={() => setDetailRow(row)}
                            aria-label={t.detailViewAria(row.message)}
                          >
                            {t.detailView}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="report-actions">
              <button type="button" className="btn-ghost" onClick={() => load()} disabled={busy}>
                {t.refresh}
              </button>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              {t.autoRefreshLabel}
            </label>

            {capacity > 0 && <p className="field-hint">{t.capacityNote(capacity)}</p>}
          </div>
        </div>
      </section>

      {/* Ayrıntı kartı — Günlük ekranındaki desenin aynısı: etiket-değer
          dizilimi `.result-table`ın ortak kalıbı. */}
      <InfoDialog
        open={detailRow !== null}
        title={t.detailTitle}
        closeLabel={t.detailClose}
        onClose={() => setDetailRow(null)}
        wide
      >
        {detailRow !== null && (
          <table className="result-table">
            <tbody>
              {t.recordRows(detailRow).map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </InfoDialog>
    </>
  )
}
