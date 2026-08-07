// Yönetim paneli — kayıtlı hesapların listesi ve hesap silme.
//
// Yetki kapısı BURADA GÖRSELDİR, güvenlik değil: ekran `user.isAdmin`e bakıp
// içeriği çizmeyebilir, ama asıl karar sunucudadır (AdminEndpoints.RequireAdmin,
// rolü her istekte veritabanından okur). İstemcideki bayrak kapatılsa bile uçlar
// 403 döner.
//
// Sayfa prerender'a ve sitemap'e GİRMEZ: `indexablePages()` bunu döndürmüyor
// (lib/routes.js). Oturum isteyen bir sayfayı statik üretmek boş kabuk yazmak
// olurdu.

import { useCallback, useEffect, useState } from 'react'
import LangLink from '../../components/LangLink'
import AuthField from '../../components/AuthField'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { useLang } from '../../hooks/useLang'
import { useNotice } from '../../hooks/useNotice'
import { commonText } from '../../data/uiText'
import AdminTabs from './AdminTabs'
import { getText } from './text'

const PAGE_SIZE = 25

export default function AdminPanel() {
  const { lang } = useLang()
  const t = getText(lang)
  const ui = commonText(lang)
  const { isLoading, isAuthenticated, user, api } = useAuth()
  const { showNotice } = useNotice()

  // `query` kutunun ANLIK değeri, `search` ise gerçekten aranan değer.
  // Arama YAZDIKÇA çalışır (aşağıdaki debounce): ilk sürüm "Listele"
  // düğmesine bağlıydı ve kutuya yazmak tek başına hiçbir şey yapmıyordu —
  // kullanıcı bunu "arama çalışmıyor" olarak yaşadı. Debounce her tuşta değil
  // duraksayınca istek atar; uç yalnız yöneticiye açık, yük önemsiz.
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const [target, setTarget] = useState(null)
  const [password, setPassword] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Plan değişimi kendi hata/meşguliyet durumunu tutar. `planBusyId` yalnız
  // değişen SATIRI kilitler, bütün tabloyu değil. `planTarget` onay kartı
  // açıkken hangi satır+hangi yeni plan bekliyor bilgisini tutar — silmedeki
  // `target` deseninin küçük kopyası, parola alanı yok (bkz. text.js →
  // planConfirmTitle yorumu).
  const [planBusyId, setPlanBusyId] = useState(null)
  const [planError, setPlanError] = useState(null)
  const [planTarget, setPlanTarget] = useState(null)

  // Kilit açma da AYNI desen — kendi kopyası, plan durumuyla paylaşılmıyor:
  // ikisi aynı anda farklı satırlarda tetiklenebilir (plan değişimi bir
  // satırda meşgulken kilit açma başka satırda), tek bir `busyId` bunu
  // ayıramazdı.
  const [unlockBusyId, setUnlockBusyId] = useState(null)
  const [unlockError, setUnlockError] = useState(null)

  const isAdmin = user?.isAdmin === true

  const load = useCallback(async () => {
    setBusy(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (search) params.set('q', search)
    const res = await api.get(`/api/admin/users?${params}`)
    setBusy(false)

    if (!res.ok) {
      // Metin BURADA çözülür, `t` bağımlılığa alınmaz: `getText(lang)` her
      // render'da yeni bir nesne döndürür, bağımlılığa girseydi `load` da her
      // render'da yenilenir ve effect kendini sonsuz tetiklerdi (ölçüldü:
      // panel açıkken istek durmuyordu). `lang` bir dize, kimliği stabil.
      setError(getText(lang).errorText(res))
      setRows([])
      setTotal(0)
      return
    }
    setRows(res.data?.items ?? [])
    setTotal(res.data?.total ?? 0)
  }, [api, page, search, lang])

  useEffect(() => {
    // Yetkisiz kullanıcı için istek HİÇ atılmaz: 403'ü görüp hata kutusu
    // çizmek, sayfanın zaten söylediği şeyi ikinci kez söylemek olurdu.
    if (!isAdmin) return
    load()
  }, [isAdmin, load])

  // Yazma durunca (350 ms) arama kendiliğinden koşar. Değer değişmediyse
  // `setSearch` aynı değeri yazar, React render'ı atlar ve istek çıkmaz —
  // açılıştaki ilk tetikleme de bu yüzden zararsız.
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1)
      setSearch(query.trim())
    }, 350)
    return () => clearTimeout(id)
  }, [query])

  // Enter beklemeyi kısaltır: debounce'u beklemeden hemen arar.
  function onSearch(e) {
    e.preventDefault()
    setPage(1)
    setSearch(query.trim())
  }

  function askDelete(row) {
    setDeleteError(null)
    setPassword('')
    setTarget(row)
  }

  function cancelDelete() {
    if (deleteBusy) return
    setTarget(null)
  }

  async function confirmDelete() {
    if (!password) {
      setDeleteError(t.deletePasswordMissing)
      return
    }
    setDeleteBusy(true)
    const res = await api.post(`/api/admin/users/${encodeURIComponent(target.id)}/delete`, {
      currentPassword: password,
    })
    setDeleteBusy(false)

    if (!res.ok) {
      setPassword('')
      setDeleteError(t.errorText(res))
      return
    }

    const email = target.email
    setTarget(null)
    setPassword('')
    // Silinen satır listeden düşer ve sayfa yeniden çekilir: son satır
    // silindiyse sayfa boş kalırdı, `load()` toplamı da tazeler.
    showNotice(t.deleted(email))
    await load()
  }

  function askPlanChange(row, plan) {
    setPlanError(null)
    setPlanTarget({ row, plan })
  }

  function cancelPlanChange() {
    if (planBusyId !== null) return
    setPlanTarget(null)
  }

  // Silme akışındaki state güncelleme deseninin aynısı: local satırı elle
  // yamamak yerine `load()` ile yeniden çekiyoruz — tek kaynak liste
  // sorgusudur, aramadan/sayfadan bağımsız hep tutarlı kalır.
  async function confirmPlanChange() {
    const { row, plan } = planTarget
    setPlanBusyId(row.id)
    const res = await api.post(`/api/admin/users/${encodeURIComponent(row.id)}/plan`, { plan })
    setPlanBusyId(null)

    if (!res.ok) {
      setPlanTarget(null)
      setPlanError(t.errorText(res))
      return
    }

    setPlanTarget(null)
    showNotice(t.planChanged(row.email, plan))
    await load()
  }

  // Plan değiştirme akışıyla birebir aynı şekil: onay kartı yok (düşük
  // riskli, geri alınabilir — kilit tekrar oluşabilir), başarıda `load()`
  // ile liste yenilenir ki rozet gerçekten kaybolsun.
  async function unlockUser(row) {
    setUnlockError(null)
    setUnlockBusyId(row.id)
    const res = await api.post(`/api/admin/users/${encodeURIComponent(row.id)}/unlock`, undefined)
    setUnlockBusyId(null)

    if (!res.ok) {
      setUnlockError(t.errorText(res))
      return
    }

    showNotice(t.unlocked(row.email))
    await load()
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

  return (
    <>
      <div className="tool-header">
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
        <AdminTabs active="users" />
      </div>

      <section className="panel">
        {/* Düğmesiz form: arama yazdıkça koşuyor, Enter yalnız debounce'u
            kısaltıyor. Tek girdili formda Enter düğmesiz de gönderir
            (implicit submission); preventDefault gezinmeyi durdurur. */}
        <form onSubmit={onSearch}>
          <label className="field">
            <span className="field-label">{t.searchLabel}</span>
            <span className="field-row">
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
            </span>
            {/* `center`: ipucu tam genişlikteki arama kutusunun altında tek
                satır; sola yaslı hâli kutudan kopuk duruyordu (Segmented
                altındaki dil notuyla aynı gerekçe, sınıf oradan). */}
            <span className="field-hint center">{t.searchHint}</span>
          </label>
        </form>

        {error && <p className="field-hint danger">{error}</p>}
        {planError && <p className="field-hint danger">{planError}</p>}
        {unlockError && <p className="field-hint danger">{unlockError}</p>}

        {/* İlk yüklemede boş liste "Kayıt bulunamadı" DEĞİL "Yükleniyor…"
            der; sonraki aramalarda eski satırlar yanıt gelene dek yerinde
            kalır (satırlar yalnız başarıda değişiyor) — liste titremez. */}
        {busy && rows.length === 0 && !error && <p className="empty-note">{t.loading}</p>}
        {!error && rows.length === 0 && !busy && <p className="empty-note">{t.empty}</p>}

        {rows.length > 0 && (
          <table className="result-table">
            {/* Başlık satırı `mini-head`: bu depoda tablo başlığının ortak
                biçimi odur (mono, küçük, muted). `<th scope="col">` semantik
                için — ekran okuyucu her hücreyi sütununa bağlayabilsin. */}
            <thead>
              <tr className="mini-head">
                <th scope="col">{t.columns.status}</th>
                <th scope="col">{t.columns.account}</th>
                <th scope="col">{t.columns.usage}</th>
                <th scope="col">{t.columns.createdAt}</th>
                <th scope="col">{t.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {/* Durum İLK sütun: `.result-table td:first-child` bu depoda
                      muted çizer, yani ana bilgi oraya konmaz. Doğrulanmamış
                      hesap taranarak bulunabilsin diye de solda duruyor. */}
                  <td>
                    <span className={`mark ${row.emailConfirmed ? 'ok' : 'warning'}`}>
                      {row.emailConfirmed ? t.confirmedYes : t.confirmedNo}
                    </span>
                    {/* Kilit rozeti YALNIZ gerçekten kilitliyken basılır — sunucu
                        ham `lockoutEnd` verir (bkz. Contracts.cs → AdminUserRow),
                        "kilitli mi" burada `lockoutEnd > şu an` ile türetilir.
                        Kilitli değilse hiçbir şey basılmaz (confirmedNo'nun aksine
                        "değil" hâli yok) — `.mark.danger`, Login'deki 423 yanıtıyla
                        aynı ciddiyet sınıfı. `.mark` blok değil satır içi olduğu için
                        önündeki `{' '}` "Doğrulandı"ya bitişmesin diye — tek boşluk,
                        rozet basılmadığında görünmez kalır. */}
                    {row.lockoutEnd && new Date(row.lockoutEnd) > new Date() && (
                      <>
                        {' '}
                        <span className="mark danger" title={t.lockedUntil(row.lockoutEnd)}>
                          {t.lockedBadge}
                        </span>
                        {' '}
                        {/* Onay kartı YOK: düşük riskli, geri alınabilir (kilit
                            yeniden oluşabilir) — plan düğmeleriyle aynı gerekçe.
                            Yalnız kilitliyken basılır, badge'in kendisi gibi. */}
                        <button
                          type="button"
                          className="row-add"
                          disabled={unlockBusyId === row.id}
                          onClick={() => unlockUser(row)}
                          aria-label={t.unlockAria(row.email)}
                        >
                          {t.unlockLabel}
                        </button>
                      </>
                    )}
                    {/* Plan sınıfı yalnız BİLİNEN değerlere verilir: sunucudan
                        gelen ham dizeyi sınıf adına yapıştırmak, yarın yeni bir
                        plan değeri geldiğinde tanımsız sınıf üretirdi. Bilinmeyen
                        değer olağan soluk metinle kalır. */}
                    <span
                      className={`sub-line${row.plan === 'free' ? ' plan-free' : row.plan === 'pro' ? ' plan-pro' : ''}`}
                    >
                      {row.plan}
                    </span>
                    {/* Plan değiştirici: iki küçük `.row-add` düğmesi, yeni CSS
                        yok. Geçerli değere karşılık gelen düğme devre dışı —
                        yalnız ÖTEKİ tıklanabilir. Tık doğrudan değiştirmez,
                        alttaki onay kartını açar (bitişik iki düğmede yanlış
                        tıklama kolaydı — bkz. text.js → planConfirmTitle). */}
                    <span className="report-actions" role="group" aria-label={t.plan}>
                      <button
                        type="button"
                        className="row-add"
                        disabled={row.plan === 'free' || planBusyId === row.id}
                        onClick={() => askPlanChange(row, 'free')}
                        aria-label={t.planMakeFreeAria(row.email)}
                      >
                        {t.planMakeFree}
                      </button>
                      <button
                        type="button"
                        className="row-add"
                        disabled={row.plan === 'pro' || planBusyId === row.id}
                        onClick={() => askPlanChange(row, 'pro')}
                        aria-label={t.planMakeProAria(row.email)}
                      >
                        {t.planMakePro}
                      </button>
                    </span>
                  </td>
                  <td>
                    {row.email}
                    <span className="sub-line">{t.accountMeta(row.displayName, row.company)}</span>
                  </td>
                  <td>{t.usageText(row.projectCount, row.reportCount)}</td>
                  <td>{t.formatDate(row.createdAt)}</td>
                  <td>
                    {row.isAdmin ? (
                      // `chip on admin-badge` — `on` yalnız pill iskeletini
                      // (padding/radius) taşır, `admin-badge` dolgu/kenarlık/
                      // rengi NÖTRLER (arka plansız, `--text`): ikon + büyük
                      // harf zaten "yetki" anlamını taşıyor, ayrıca bir renk
                      // açmaya gerek yok — bu depodaki tek "yetki" rozeti.
                      <span className="chip on admin-badge" title={t.adminNotDeletable}>
                        <svg
                          className="icon"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                          focusable="false"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10 2l6.5 2.5v4.8c0 4.3-2.7 7.6-6.5 8.7-3.8-1.1-6.5-4.4-6.5-8.7V4.5L10 2Z" />
                        </svg>
                        {t.adminBadge}
                      </span>
                    ) : (
                      // Satır içi düğme `.row-add`: bu depoda liste satırındaki
                      // eylemler (proje/rapor listesindeki Aç ve Sil) hep bu
                      // sınıfı alır ve dar kalır. `destructive` eki dinlenirken
                      // sessizdir, üzerine gelince kırmızıya döner — kırmızı
                      // tabloyu kaplamaz ama düğme niyetini saklamaz. Asıl
                      // yıkıcı vurgu onay kartında.
                      <button
                        type="button"
                        className="row-add destructive"
                        onClick={() => askDelete(row)}
                        aria-label={t.deleteAria(row.email)}
                      >
                        {t.deleteLabel}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Durum metni düğmelerin ARASINDA değil ÜSTÜNDE: bu depoda düğmeler
            tanımı gereği tam genişliktir (.btn-ghost → width:100%), araya
            sıkışan metin iki düğmeyi de eziyordu. Üstte kendi satırında durur,
            düğmeler satırı eşit bölüşür. */}
        {/* Toplam her zaman görünür, sayfa düğmeleri YALNIZ birden çok sayfa
            varken: tek sayfalık listede iki ölü düğme çizmek gürültüydü. */}
        {total > 0 && <p className="field-hint">{t.pageStatus(from, to, total)}</p>}
        {lastPage > 1 && (
          <>
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
          </>
        )}
      </section>

      {/* Parola alanı onay kartının İÇİNDE: yıkıcı eylemi tek adımda hem
          kimlikle hem niyetle doğrular. Odak iptal düğmesindedir, yani Enter
          yanlışlıkla onaylamaz (ConfirmDialog). */}
      <ConfirmDialog
        open={target !== null}
        title={t.deleteTitle}
        message={target ? t.deleteConfirm(target.email) : ''}
        confirmLabel={t.deleteLabel}
        cancelLabel={ui.cancel}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        busy={deleteBusy}
      >
        <AuthField
          label={t.deletePasswordLabel}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          hint={t.deletePasswordHint}
        />
        {deleteError && <p className="field-hint danger">{deleteError}</p>}
        {deleteBusy && <p className="field-hint">{t.deleting}</p>}
      </ConfirmDialog>

      {/* Plan onayı: şifre alanı YOK (children boş) — kimlik değil niyet
          doğrulanıyor, silme kartından farklı risk sınıfı. */}
      <ConfirmDialog
        open={planTarget !== null}
        title={planTarget ? t.planConfirmTitle(planTarget.plan) : ''}
        message={planTarget ? t.planConfirmMessage(planTarget.row.email, planTarget.plan) : ''}
        confirmLabel={planTarget?.plan === 'free' ? t.planMakeFree : t.planMakePro}
        cancelLabel={ui.cancel}
        onConfirm={confirmPlanChange}
        onCancel={cancelPlanChange}
        busy={planTarget !== null && planBusyId === planTarget.row.id}
        danger={false}
      />
    </>
  )
}
