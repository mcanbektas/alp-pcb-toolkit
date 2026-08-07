// Yönetim paneli — denetim izi (audit log) günlüğü. Salt okunur: hiçbir satır
// düzenlenmez ya da silinmez, yalnızca listelenir ve süzülür.
//
// Yetki kapısı, sitemap/prerender gerekçesi ve debounce'lu arama deseni
// Kullanıcılar ekranıyla (../index.jsx) BİREBİR aynı — bkz. o dosyanın
// başındaki not, burada tekrar edilmiyor.

import { useCallback, useEffect, useState } from 'react'
import FacetList from '../../../components/FacetList'
import InfoDialog from '../../../components/InfoDialog'
import LangLink from '../../../components/LangLink'
import { useAuth } from '../../../hooks/useAuth'
import { useLang } from '../../../hooks/useLang'
import AdminTabs from '../AdminTabs'
import { getText } from './text'

const PAGE_SIZE = 25

export default function AdminAuditLog() {
  const { lang } = useLang()
  const t = getText(lang)
  const { isLoading, isAuthenticated, user, api } = useAuth()

  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // Ayrıntı kartında gösterilen satır. Kart kapalıyken null; sayfa/filtre
  // değişince liste yenilense de sorun yok — kart o anki satırın kopyasını tutar.
  const [detailRow, setDetailRow] = useState(null)

  const isAdmin = user?.isAdmin === true

  const load = useCallback(async () => {
    setBusy(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (search) params.set('q', search)
    if (eventFilter) params.set('event', eventFilter)
    const res = await api.get(`/api/admin/audit?${params}`)
    setBusy(false)

    if (!res.ok) {
      // Kullanıcılar ekranındaki gerekçenin aynısı: `t` bağımlılığa alınmaz,
      // `getText(lang)` her render'da yeni nesne döner ve effect'i sonsuz
      // tetikler.
      setError(getText(lang).errorText(res))
      setRows([])
      setTotal(0)
      return
    }
    setRows(res.data?.items ?? [])
    setTotal(res.data?.total ?? 0)
  }, [api, page, search, eventFilter, lang])

  useEffect(() => {
    if (!isAdmin) return
    load()
  }, [isAdmin, load])

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1)
      setSearch(query.trim())
    }, 350)
    return () => clearTimeout(id)
  }, [query])

  function onSearch(e) {
    e.preventDefault()
    setPage(1)
    setSearch(query.trim())
  }

  function onEventChange(value) {
    setPage(1)
    setEventFilter(value)
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

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Zaman hücresi normalde dakikada durur; ama bir dakikaya birden çok kayıt
  // düşmüşse (kilitlenme patlaması, toplu yönetim işi) dakika o satırları
  // ayırt edemez — yalnız çakışan satırlarda saniyeli biçime geçilir
  // (bkz. text.js → formatDate / formatDateSeconds).
  const minuteCounts = new Map()
  for (const row of rows) {
    const key = t.formatDate(row.occurredAt)
    minuteCounts.set(key, (minuteCounts.get(key) ?? 0) + 1)
  }

  return (
    <>
      <div className="tool-header">
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
        <AdminTabs active="audit" />
      </div>

      <section className="panel">
        <div className="audit-layout">
          <aside className="audit-facets">
            <span className="field-label">{t.eventFilterLabel}</span>
            <FacetList
              groups={t.eventGroups}
              value={eventFilter}
              onChange={onEventChange}
              label={t.eventFilterLabel}
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
              /* Sarmal `.table-scroll`: beş sütunlu tablo dar ekranda sıkışınca
                 e-posta hücreleri üst üste biniyordu — tablo doğal genişliğinde
                 kalır, taşan kısım yatay kayar (bkz. temalardaki kural). */
              <div className="table-scroll">
                <table className="result-table">
                  <thead>
                    <tr className="mini-head">
                      <th scope="col">{t.columns.time}</th>
                      <th scope="col">{t.columns.event}</th>
                      <th scope="col">{t.columns.actor}</th>
                      <th scope="col">{t.columns.target}</th>
                      <th scope="col" className="detail-cell">{t.columns.detail}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const minute = t.formatDate(row.occurredAt)
                      return (
                        <tr key={row.id}>
                          <td>{minuteCounts.get(minute) > 1 ? t.formatDateSeconds(row.occurredAt) : minute}</td>
                          <td>
                            <span className={`mark ${t.eventMarkClass(row.event)}`}>{t.eventText(row.event)}</span>
                          </td>
                          <td>{row.actorEmail ?? t.actorSystem}</td>
                          <td>{row.targetEmail ?? '—'}</td>
                          <td className="detail-cell">
                            {/* Düğme HER satırda çizilir: kart artık satırın yapısal
                                kaydını da taşıyor (zaman, olay kodu, yapan, hedef,
                                kayıt no) — DetailJson boş olsa da "Görüntüle"nin
                                gösterecek bir şeyi var. Satır içi düğme `.row-add`:
                                liste satırındaki eylemler bu depoda hep bu sınıfı
                                alır (Kullanıcılar → Sil). */}
                            <button
                              type="button"
                              className="row-add"
                              onClick={() => setDetailRow(row)}
                              aria-label={t.detailViewAria(t.eventText(row.event))}
                            >
                              {t.detailView}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {total > 0 && <p className="field-hint">{t.pageStatus(from, to, total)}</p>}
            {lastPage > 1 && (
              <div className="report-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={page <= 1 || busy}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t.pagePrev}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={page >= lastPage || busy}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t.pageNext}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Ayrıntı kartı — satırın yapısal kaydı (zaman/olay/yapan/hedef/kayıt
          no) + varsa sunucunun yazdığı DetailJson alanları, hepsi
          `text.js` → `recordRows`ten TEK listede gelir. Etiket–değer
          dizilimi `.result-table`ın kendi deseni: ilk sütun soluk etiket,
          ikincisi değer. */}
      <InfoDialog
        open={detailRow !== null}
        title={t.detailTitle}
        closeLabel={t.detailClose}
        onClose={() => setDetailRow(null)}
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
