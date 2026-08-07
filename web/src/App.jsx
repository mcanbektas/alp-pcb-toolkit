import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect, useRef } from 'react'
import Toast from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import LangLink from './components/LangLink'
import TraceMotif from './components/TraceMotif'
import { NoticeProvider, useNotice } from './hooks/useNotice'
import { LangProvider, useLang } from './hooks/useLang'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { commonText } from './data/uiText'
import { authText } from './data/authText'
import { LANGS, LANG_LABEL, pick } from './lib/i18n'
import {
  categoryFromPath, categoryPath, categoryRoutePattern, isLangPrefPath, langFromPath, legalFromPath,
  staticPath, toolFromPath, toolPath, translatePath,
} from './lib/routes'
import { readLangPref, writeLangPref } from './lib/langPref'
import logo from './assets/logo.png'
import { CATEGORIES } from './data/categories'
import { LEGAL_DOCS } from './data/legalPages'
import LegalPage from './pages/LegalPage'
import Home from './pages/Home'
import CategoryPage from './pages/CategoryPage'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import ConfirmEmail from './pages/auth/ConfirmEmail'
import UnlockAccount from './pages/auth/UnlockAccount'

// Araç ekranları tembel yüklenir: 25 ekranın hesap motoru, şeması ve metni tek
// pakette gelince ilk boyama gereksiz büyüyordu. Ana sayfa ve kategori sayfası
// eager kalır — ilk açılışta zaten onlar görünüyor.
const TraceWidth = lazy(() => import('./pages/tools/TraceWidth'))
const VoltageDivider = lazy(() => import('./pages/tools/VoltageDivider'))
const ResistorCode = lazy(() => import('./pages/tools/ResistorCode'))
const OhmLaw = lazy(() => import('./pages/tools/OhmLaw'))
const LedResistor = lazy(() => import('./pages/tools/LedResistor'))
const RlcResonance = lazy(() => import('./pages/tools/RlcResonance'))
const RcRl = lazy(() => import('./pages/tools/RcRl'))
const CrystalLoad = lazy(() => import('./pages/tools/CrystalLoad'))
const PowerPlane = lazy(() => import('./pages/tools/PowerPlane'))
const CopperConverter = lazy(() => import('./pages/tools/CopperConverter'))
const ViaProperties = lazy(() => import('./pages/tools/ViaProperties'))
const ThermalVia = lazy(() => import('./pages/tools/ThermalVia'))
const ReturnPathStitchingVia = lazy(() => import('./pages/tools/ReturnPathStitchingVia'))
const ViaStubBackdrill = lazy(() => import('./pages/tools/ViaStubBackdrill'))
const MosfetGateDriver = lazy(() => import('./pages/tools/MosfetGateDriver'))
const AdcSettlingRcFilter = lazy(() => import('./pages/tools/AdcSettlingRcFilter'))
const CanRs485PhysicalLayer = lazy(() => import('./pages/tools/CanRs485PhysicalLayer'))
const ShuntKelvin = lazy(() => import('./pages/tools/ShuntKelvin'))
const SingleEnded = lazy(() => import('./pages/tools/SingleEnded'))
const DiffPair = lazy(() => import('./pages/tools/DiffPair'))
const PropDelay = lazy(() => import('./pages/tools/PropDelay'))
const CriticalLength = lazy(() => import('./pages/tools/CriticalLength'))
const Skew = lazy(() => import('./pages/tools/Skew'))
const Crosstalk = lazy(() => import('./pages/tools/Crosstalk'))
const Termination = lazy(() => import('./pages/tools/Termination'))
const Pdn = lazy(() => import('./pages/tools/Pdn'))
const Decoupling = lazy(() => import('./pages/tools/Decoupling'))
const Junction = lazy(() => import('./pages/tools/Junction'))
const LengthConverter = lazy(() => import('./pages/tools/LengthConverter'))
const AwgConverter = lazy(() => import('./pages/tools/AwgConverter'))
const FrequencyConverter = lazy(() => import('./pages/tools/FrequencyConverter'))
const DecibelConverter = lazy(() => import('./pages/tools/DecibelConverter'))
const TemperatureConverter = lazy(() => import('./pages/tools/TemperatureConverter'))
const ComplexConverter = lazy(() => import('./pages/tools/ComplexConverter'))
const ClearanceCreepagePadstack = lazy(() => import('./pages/tools/ClearanceCreepagePadstack'))
const BgaBreakout = lazy(() => import('./pages/tools/BgaBreakout'))
const StackupPlanner = lazy(() => import('./pages/tools/StackupPlanner'))
const ThermalRelief = lazy(() => import('./pages/tools/ThermalRelief'))
const PdnResonanceAnalyzer = lazy(() => import('./pages/tools/PdnResonanceAnalyzer'))
const PlaneCavityResonance = lazy(() => import('./pages/tools/PlaneCavityResonance'))
const EmcFilterDesigner = lazy(() => import('./pages/tools/EmcFilterDesigner'))
const BuckPcbPreDesign = lazy(() => import('./pages/tools/BuckPcbPreDesign'))
const TvsEsdProtection = lazy(() => import('./pages/tools/TvsEsdProtection'))
const FlexPcbBendTrace = lazy(() => import('./pages/tools/FlexPcbBendTrace'))

// Araç `id`'sinden ekrana eşleme. Rota YOLLARI burada YAZILMAZ — onlar
// `data/categories.js`ten türer (`toolPath`) ve iki dilde de kendiliğinden
// üretilir. Yol da elle yazılsaydı iki dille birlikte 58 satır olurdu ve
// ikinci kopya ilk gün ayrışırdı.
//
// Katalogda aktif olup burada karşılığı olmayan bir araç ROTASIZ kalır —
// build hatası vermez, kullanıcı 404 görür. `pages/tools/toolKeys.test.js`
// bu eşlemenin katalogla tam örtüştüğünü denetler.
const TOOL_SCREENS = {
  'trace-width': TraceWidth,
  'power-plane': PowerPlane,
  'cu-converter': CopperConverter,
  'via-props': ViaProperties,
  'thermal-via': ThermalVia,
  'return-path-stitching-via': ReturnPathStitchingVia,
  'via-stub-backdrill': ViaStubBackdrill,
  'mosfet-gate-driver': MosfetGateDriver,
  'adc-settling-rc-filter': AdcSettlingRcFilter,
  'can-rs485-physical-layer': CanRs485PhysicalLayer,
  'shunt-kelvin': ShuntKelvin,
  'single-ended': SingleEnded,
  'diff-pair': DiffPair,
  'prop-delay': PropDelay,
  'critical-length': CriticalLength,
  skew: Skew,
  crosstalk: Crosstalk,
  termination: Termination,
  pdn: Pdn,
  decoupling: Decoupling,
  junction: Junction,
  'resistor-code': ResistorCode,
  divider: VoltageDivider,
  'ohm-law': OhmLaw,
  'led-resistor': LedResistor,
  'rlc-resonance': RlcResonance,
  'rc-rl': RcRl,
  'crystal-load': CrystalLoad,
  'length-conv': LengthConverter,
  'awg-conv': AwgConverter,
  'freq-conv': FrequencyConverter,
  'db-conv': DecibelConverter,
  'temp-conv': TemperatureConverter,
  'complex-conv': ComplexConverter,
  'clearance-creepage-padstack': ClearanceCreepagePadstack,
  'bga-breakout': BgaBreakout,
  'stackup-planner': StackupPlanner,
  'thermal-relief': ThermalRelief,
  'pdn-resonance-analyzer': PdnResonanceAnalyzer,
  'plane-cavity-resonance': PlaneCavityResonance,
  'emc-filter-designer': EmcFilterDesigner,
  'buck-pcb-pre-design': BuckPcbPreDesign,
  'tvs-esd-protection': TvsEsdProtection,
  'flex-pcb-bend-trace': FlexPcbBendTrace,
}

// Hesap sayfaları (Projelerim listesi + proje detayı) da tembel yüklenir —
// araç ekranlarıyla aynı gerekçe: ilk boyamada yalnızca girişte gereken kod.
const Projects = lazy(() => import('./pages/account/Projects'))
const Project = lazy(() => import('./pages/account/Project'))
const Reports = lazy(() => import('./pages/account/Reports'))
const Account = lazy(() => import('./pages/account/Account'))
// Yönetim paneli. Tembel yükleme burada ayrıca değerli: paketi yalnız yönetici
// çeker, sıradan kullanıcı hiç indirmez.
const AdminPanel = lazy(() => import('./pages/admin'))
const AdminAuditLog = lazy(() => import('./pages/admin/audit'))

// Uygulama geneli metinler. Ekran metni gibi bunlar da `pick()` ile çözülür:
// doğrudan `DICT[lang]` indekslemesi eksik çeviride `undefined` verirdi, `pick`
// ise Türkçeye düşer — eksik çeviri boş kutu değil, okunabilir metin olur.
const FOOTER = {
  tr: 'Sonuçlar yaklaşık mühendislik tahminleridir. Kritik tasarımlarda üretici verisi ve '
    + 'ölçümle doğrulayın.',
  en: 'Results are approximate engineering estimates. Verify against manufacturer data and '
    + 'measurement for critical designs.',
}

// Footer sütun başlıkları. Kategori bağlantıları categories.js'ten gelir —
// elle liste tutulmaz, yeni kategori eklendiğinde footer kendiliğinden büyür.
const FOOTER_CATEGORIES = { tr: 'Kategoriler', en: 'Categories' }
const FOOTER_ACCOUNT = { tr: 'Hesap', en: 'Account' }
// Yönetim bağlantısının başlığı. Ekranın kendi sözlüğünden (pages/admin/text.js)
// AYRI durur: burası altbilgi çerçevesi, orası sayfanın içi.
const FOOTER_ADMIN = { tr: 'Yönetim', en: 'Administration' }
const FOOTER_CONTACT = { tr: 'İletişim', en: 'Contact us' }
const FOOTER_LEGAL = { tr: 'Yasal', en: 'Legal' }

// Slogan çevrilirken kapsamı daraltılmaz ya da genişletilmez: iki dil aynı
// alanı tarif eder. "Donanım mühendisliği" karşılığı "hardware engineering"dir;
// "electronics" ya da "PCB" yazmak kapsamı kaydırırdı.
const TAGLINE = {
  tr: 'donanım mühendisliği karar destek araçları',
  en: 'hardware engineering decision support tools',
}

// Marka adının kendisi çevrilmez; yalnızca bağlantının amacı iki dillidir.
const HOME_LINK = {
  tr: 'ALP PCB Toolkit — ana sayfa',
  en: 'ALP PCB Toolkit — home',
}

const LANG_SWITCH = {
  tr: 'Arayüz dili',
  en: 'Interface language',
}

// Dil geçişi DÜĞME DEĞİL BAĞLANTIDIR: her dilin kendi URL'i var ve geçiş
// artık gezinmedir. İki kazanç, ikisi de bilinçli:
//   - JS koşturmayan bot İngilizce sürümü buradan KEŞFEDER. `hreflang` bir
//     ipucudur; taranabilir bağlantı doğrudan yoldur.
//   - Semantik doğru. Seçili dilin bağlantısı o anki sayfanın kendisini
//     gösterdiği için `aria-current="page"` ile işaretlenir; `aria-pressed`
//     kalktı — o, düğme sözlüğüne aitti.
// Bkz. docs/en-url-karari.md §3.
function LangSwitch() {
  const { lang } = useLang()
  const { pathname, search, hash } = useLocation()
  return (
    // Bağlantı listesi `LANGS`'ten türetilir: dizi burada yeniden yazılırsa
    // `isLang()` ile sessizce ayrışır ve seçilemeyen bir dil kalırdı.
    <div className="lang-switch" role="group" aria-label={pick(LANG_SWITCH, lang)}>
      {LANGS.map((code) => (
        <Link
          key={code}
          // Karşılık gelen adres AYNI SAYFANIN öteki dilidir; sorgu ve `#`
          // korunur, yani `?hesap=<id>` bağı dil değiştirince kopmaz.
          to={translatePath(`${pathname}${search}${hash}`, code)}
          aria-current={lang === code ? 'page' : undefined}
          // Bağlantının kendi adı her zaman kendi dilinde yazılır: kullanıcı
          // anlamadığı bir dildeyken çıkışı bulabilsin. Aynı gerekçeyle
          // ipucu metni de dilin kendi adıdır (endonim), seçili dile göre
          // değişmez — bu yüzden `pick` değil, doğrudan kod ile okunur.
          lang={code}
          title={LANG_LABEL[code] ?? code}
        >
          {code.toUpperCase()}
        </Link>
      ))}
    </div>
  )
}

function LoadingNote() {
  const { lang } = useLang()
  return <p className="empty-note">{commonText(lang).loadingTool}</p>
}

const TITLE_SUFFIX = 'ALP PCB Toolkit'

// Sekme başlığı rota ve dille birlikte değişir. Tek sabit <title> ile 29
// hesap ekranının hepsi sekmede aynı adı taşıyordu — iki araç açan kullanıcı
// sekmeleri ayırt edemiyordu, tarayıcı geçmişi de tek satır görünüyordu.
// Adlar categories.js'ten okunur (tek kaynak) — ekran başına başlık kodu
// yazılmaz, yeni araç eklendiğinde burası kendiliğinden kapsar. Yolu iki
// dilde de tanır (`toolFromPath`/`categoryFromPath`).
//
// KATEGORİ sayfaları da başlık alır. Almıyorlardı ve bu bir kusurdu:
// prerender doğru başlığı yazıyor, tarayıcıda TitleSync onu jenerik
// "ALP PCB Toolkit"e GERİ ÇEVİRİYORDU — kullanıcının gördüğü başlık botun
// gördüğünden farklıydı. (docs/en-url-karari.md §5)
function TitleSync() {
  const { lang } = useLang()
  const location = useLocation()
  useEffect(() => {
    const tool = toolFromPath(location.pathname)
    const category = tool ? null : categoryFromPath(location.pathname)
    const legal = tool || category ? null : legalFromPath(location.pathname)
    const name = tool
      ? pick(tool.name, lang)
      : category
        ? pick(category.title, lang)
        : (legal && pick(legal.title, lang))
    document.title = name ? `${name} — ${TITLE_SUFFIX}` : TITLE_SUFFIX
  }, [location.pathname, lang])
  return null
}

// Dil tercihinin OTURUMLA İLGİLİ, indekslenmeyen sayfalara uygulanması
// (`/yonetim`, `/giris`, `/projelerim`, ...). Kapsam `isLangPrefPath` ile
// dardır: ana sayfa, kategori, araç ve yasal sayfalar dokunulmaz — onlarda TR
// adres hâlâ kanoniktir ve bot/kullanıcı aynı sayfayı görür
// (docs/en-url-karari.md §3, §10). Dil KAYNAĞI hâlâ URL'dir, bu yalnız "son
// seçilen dile dön" katmanıdır.
//
// Yönlendirme kararı yalnız bu SAYFA YÜKLEMESİNİN İLK COMMIT'İNDE verilir
// (`checkedRef`) — adres çubuğuna yazılan/yer iminden açılan/dıştan gelen bir
// bağlantı budur. Sonraki SPA-içi gezinmelerde (aynı sekme, aynı mount) bir
// DAHA kontrol edilmez, yalnız tercih güncel sayfaya göre TAZELENİR. Bu ayrım
// olmadan `LangSwitch`in kendisi kırılıyordu: kullanıcı `/yonetim`deyken (TR
// tercih yazılı) EN'e basınca `/en/admin`e gider, ama efekt bunu "tercihle
// uyuşmuyor" sanıp AZ ÖNCEKİ tıklamayı geri alıp `/yonetim`e döndürüyordu —
// kullanıcının o anki açık seçimi, eski tercih tarafından eziliyordu.
//
// `replace: true`: geri tuşu kullanıcıyı bir önceki dile değil, geldiği
// sayfaya götürsün — yönlendirme geçmişte ikinci bir durak açmamalı.
function LangPrefRedirect() {
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  const currentLang = langFromPath(pathname)
  const checkedRef = useRef(false)
  useEffect(() => {
    if (!checkedRef.current) {
      checkedRef.current = true
      if (isLangPrefPath(pathname)) {
        const pref = readLangPref()
        if (pref && pref !== currentLang) {
          navigate(translatePath(`${pathname}${search}${hash}`, pref), { replace: true })
          return
        }
      }
    }
    writeLangPref(currentLang)
  }, [pathname, search, hash, navigate, currentLang])
  return null
}

// Bilinmeyen yol. Route listesinde `path="*"` yoktu: kırık bir bağlantı
// başlıkla altbilgi arasında sessiz BOŞ bir ana alan bırakıyordu.
function NotFound() {
  const { lang } = useLang()
  const ui = commonText(lang)
  return (
    <div className="tool-header">
      <h1>{ui.notFoundTitle}</h1>
      <p>{ui.notFoundNote}</p>
      <LangLink className="backlink" to="/">{ui.backHome}</LangLink>
    </div>
  )
}

// Başlıktaki hesap alanı — LangSwitch ile aynı düğme biçimini kullanır, yeni
// bir görsel desen eklemez. Oturum durumu ilk çözülene kadar (AUTH_LOADING)
// hiçbir şey basılmaz: "Giriş yap" gösterip hemen ada çevirmek göz kırpması
// yaratırdı.
function AccountArea() {
  const { lang } = useLang()
  const text = authText(lang)
  const { isLoading, isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const { showNotice } = useNotice()

  // Çıkışta ana sayfaya dönülür. Yönlendirme olmadan kullanıcı, oturum
  // gerektiren bir sayfada (örn. /projelerim) kalır ve o sayfa boşalır ya da
  // giriş ekranına düşer — ikisi de "çıktım" geri bildirimi vermez.
  // Bildirim yönlendirmeden ÖNCE kurulur; sağlayıcı yönlendirmenin üstünde
  // durduğu için sayfa değişse de kart yaşar.
  // Ana sayfa hedefi de dile göredir: İngilizce ağaçtan çıkan kullanıcı
  // `/en`e döner, Türkçe sayfaya düşmez.
  async function onLogout() {
    await logout()
    showNotice(text.header.signedOut)
    navigate(staticPath('home', lang))
  }

  if (isLoading) return null

  if (isAuthenticated) {
    return (
      <div className="lang-switch" role="group">
        <LangLink to="/projelerim">{text.header.projects}</LangLink>
        <LangLink to="/raporlarim">{text.header.reports}</LangLink>
        <LangLink to="/hesabim">{text.header.account}</LangLink>
        <span className={`header-user${user.plan === 'pro' ? ' plan-pro' : ''}`}>
          {user.displayName}
        </span>
        <button type="button" onClick={onLogout}>{text.header.logout}</button>
      </div>
    )
  }

  // `role="group"` YOK: yukarıdaki oturumlu daldan kopyalanmıştı ve tek bir
  // bağlantının `link` rolünü eziyordu — ekran okuyucu bunu bağlantı olarak
  // değil adsız bir grup olarak duyuruyor, klavye kullanıcısı da nereye
  // gittiğini duymuyordu. Sınıf yalnızca görünüm içindir. (e2e/rapor-anonim)
  return (
    <LangLink to="/giris" className="lang-switch">
      {text.header.loginLink}
    </LangLink>
  )
}

// Kartın kendiliğinden kapanma süresi. Tek yerde durur: hem zamanlayıcıya hem
// kartın üstündeki "N saniye içinde…" notuna buradan gider, ikisi ayrışamaz.
const NOTICE_TIMEOUT_MS = 3000

function Layout({ children }) {
  const { lang } = useLang()
  const { notice, dismissNotice } = useNotice()
  // Yalnız altbilgideki yönetim bağlantısı için. Prerender'da ve ilk client
  // render'ında `user` null olur (oturum asenkron yüklenir), yani hydration
  // ayrışmaz — bağlantı sonradan belirir.
  const { user } = useAuth()

  return (
    <>
      <Toast
        message={notice}
        onDismiss={dismissNotice}
        closeLabel={commonText(lang).toastClose}
        autoCloseNote={commonText(lang).toastAutoClose(NOTICE_TIMEOUT_MS / 1000)}
        timeoutMs={NOTICE_TIMEOUT_MS}
      />
      <header className="site-header">
        <div className="container">
          <LangLink to="/" className="wordmark" aria-label={pick(HOME_LINK, lang)}>
            <img src={logo} alt="ALP PCB Toolkit" />
          </LangLink>
          <span className="tagline">{pick(TAGLINE, lang)}</span>
          <AccountArea />
          <LangSwitch />
        </div>
        {/* Rampanın yeri ölçülerek bulunur — sağdaki grubun genişliği dile ve
            oturum durumuna göre değişiyor. Bkz. components/TraceMotif.jsx. */}
        <TraceMotif />
      </header>
      <main className="container">{children}</main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <LangLink to="/" className="wordmark" aria-label={pick(HOME_LINK, lang)}>
                <img src={logo} alt="ALP PCB Toolkit" />
              </LangLink>
              <span className="tagline">{pick(TAGLINE, lang)}</span>
            </div>

            <nav className="footer-col">
              <h2>{pick(FOOTER_CATEGORIES, lang)}</h2>
              <ul>
                {CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    {/* Kanonik yol yerine doğrudan `categoryPath` — zaten
                        katalog kaydı elde, çeviriyi yeniden aramaya gerek yok. */}
                    <Link to={categoryPath(c, lang)}>{pick(c.title, lang)}</Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="footer-col">
              <h2>{pick(FOOTER_ACCOUNT, lang)}</h2>
              <ul>
                <li><LangLink to="/projelerim">{authText(lang).header.projects}</LangLink></li>
                <li><LangLink to="/raporlarim">{authText(lang).header.reports}</LangLink></li>
                <li><LangLink to="/hesabim">{authText(lang).header.account}</LangLink></li>
                {/* Yalnız yöneticiye çizilir. Prerender'da ve ilk client
                    render'ında `user` her zaman null olduğu için hydration
                    ayrışmaz — bağlantı oturum yüklendikten sonra belirir. */}
                {user?.isAdmin && (
                  <li><LangLink to="/yonetim">{pick(FOOTER_ADMIN, lang)}</LangLink></li>
                )}
              </ul>
            </nav>

            <nav className="footer-col">
              <h2>{pick(FOOTER_CONTACT, lang)}</h2>
              <ul>
                {/* Adresler çevrilmez — e-posta, iki dilli metin kuralının
                    dışındadır. Başlık ise iki dillidir. */}
                <li><a className="footer-mail" href="mailto:mahmutcr038@gmail.com">mahmutcr038@gmail.com</a></li>
                <li><a className="footer-mail" href="mailto:alperenisik1171@gmail.com">alperenisik1171@gmail.com</a></li>
              </ul>
            </nav>

            {/* Yasal sayfalar altbilgide durur: KVKK aydınlatma metninin
                kolayca bulunabilir olması gerekir ve altbilgi her sayfada. */}
            <nav className="footer-col">
              <h2>{pick(FOOTER_LEGAL, lang)}</h2>
              <ul>
                {LEGAL_DOCS.map((doc) => (
                  <li key={doc.key}>
                    <Link to={staticPath(doc.key, lang)}>{pick(doc.title, lang)}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Uyarı cümlesi footer'da SABİT durur (CLAUDE.md, "Sonuç sunumu") —
              yapı zenginleşti diye kalkmaz, alt satıra iner. */}
          <div className="footer-legal">
            <span>{pick(FOOTER, lang)}</span>
            <span className="footer-copy">© {new Date().getFullYear()} ALP PCB Toolkit</span>
          </div>
        </div>
      </footer>
    </>
  )
}

// Rota tablosu KATALOGDAN üretilir, hem de iki dilde. Statik sayfalar
// `lib/routes.js`teki sözlükten, araçlar `TOOL_SCREENS` × `categories.js`ten
// gelir; elle yazılan tek şey araç → ekran eşlemesidir.
//
// Sıra önemlidir: araç ve kategori yolları `:slug` kalıbından ÖNCE gelmez —
// React Router v6 en özgül eşleşmeyi kendisi seçer, ama kategori kalıbı ile
// araç yolları farklı segmentlerde olduğu için çakışma zaten yok.
function langRoutes(lang) {
  const routes = [
    <Route key={`${lang}:home`} path={staticPath('home', lang)} element={<Home />} />,
    <Route key={`${lang}:category`} path={categoryRoutePattern(lang)} element={<CategoryPage />} />,
    <Route key={`${lang}:login`} path={staticPath('login', lang)} element={<Login />} />,
    <Route key={`${lang}:register`} path={staticPath('register', lang)} element={<Register />} />,
    <Route
      key={`${lang}:forgotPassword`}
      path={staticPath('forgotPassword', lang)}
      element={<ForgotPassword />}
    />,
    <Route
      key={`${lang}:resetPassword`}
      path={staticPath('resetPassword', lang)}
      element={<ResetPassword />}
    />,
    <Route
      key={`${lang}:confirmEmail`}
      path={staticPath('confirmEmail', lang)}
      element={<ConfirmEmail />}
    />,
    <Route
      key={`${lang}:unlockAccount`}
      path={staticPath('unlockAccount', lang)}
      element={<UnlockAccount />}
    />,
    <Route key={`${lang}:projects`} path={staticPath('projects', lang)} element={<Projects />} />,
    <Route key={`${lang}:reports`} path={staticPath('reports', lang)} element={<Reports />} />,
    <Route key={`${lang}:account`} path={staticPath('account', lang)} element={<Account />} />,
    // Rota herkese kayıtlıdır, içerik değil: yetkisiz kullanıcı sayfayı açar ve
    // "yetkin yok" notunu görür. Rotayı hiç kurmamak bilinmeyen-yol ekranına
    // düşürürdü ve yöneticinin kendi adresi de 404 olurdu (rol henüz yüklenmemiş
    // olabilir). Asıl kapı sunucuda.
    <Route key={`${lang}:admin`} path={staticPath('admin', lang)} element={<AdminPanel />} />,
    <Route key={`${lang}:adminAudit`} path={staticPath('adminAudit', lang)} element={<AdminAuditLog />} />,
    <Route key={`${lang}:project`} path={staticPath('project', lang)} element={<Project />} />,
    // Yasal sayfalar tek bileşenden çizilir; rota kaydı listeden türer, elle
    // üç satır yazılmaz — yeni bir belge eklendiğinde rota kendiliğinden doğar.
    ...LEGAL_DOCS.map((doc) => (
      <Route
        key={`${lang}:${doc.key}`}
        path={staticPath(doc.key, lang)}
        element={<LegalPage docKey={doc.key} />}
      />
    )),
  ]

  for (const category of CATEGORIES) {
    for (const tool of category.tools) {
      const Screen = tool.path ? TOOL_SCREENS[tool.id] : null
      if (!Screen) continue
      routes.push(
        <Route key={`${lang}:${tool.id}`} path={toolPath(tool, lang)} element={<Screen />} />,
      )
    }
  }
  return routes
}

// Yönlendiricinin ÜSTÜNDEKİ sağlayıcılar. Ayrı durmalarının nedeni prerender:
// tarayıcıda `BrowserRouter`, derleme sonrası prerender'da `StaticRouter`
// kullanılır (`scripts/prerender/entry-server.jsx`), ama her iki durumda da
// sağlayıcı sırası aynı kalmalı — yoksa iki yol farklı ağaç kurar ve
// hydration eşleşmez.
//
// NoticeProvider yönlendiricinin ÜSTÜNDE: çıkışta önce bildirim kurulup sonra
// sayfa değiştiriliyor, sağlayıcı içeride olsaydı yönlendirme onu söker ve
// kart hiç görünmezdi.
//
// LangProvider ARTIK BURADA DEĞİL: dil URL'den okunuyor (`useLocation`), yani
// yönlendiricinin içinde olmak zorunda. Yeri `AppRoutes`ın en dışıdır ve iki
// giriş noktası da `AppRoutes`ı paylaştığı için sıra yine tek yerde tanımlı.
export function AppProviders({ children }) {
  return <NoticeProvider>{children}</NoticeProvider>
}

// Yönlendiricinin İÇİNDEKİ ağaç. Router'ı kendisi kurmaz: çağıran taraf
// (tarayıcı ya da prerender) hangi yönlendiriciyi saracağına karar verir.
export function AppRoutes() {
  return (
    <LangProvider>
      <TitleSync />
      <LangPrefRedirect />
      <AuthProvider>
        <Layout>
          {/* Hata sınırı Suspense'in DIŞINDA: chunk indirme hatası
              Suspense'i değil en yakın boundary'yi bulur — içeride
              olsaydı asılı fallback yine kurtarılamazdı. */}
          <ErrorBoundary>
            <Suspense fallback={<LoadingNote />}>
              <Routes>
                {LANGS.flatMap((lang) => langRoutes(lang))}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Layout>
      </AuthProvider>
    </LangProvider>
  )
}

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  )
}
