import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { LangProvider, useLang } from './hooks/useLang'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { commonText } from './data/uiText'
import { authText } from './data/authText'
import { LANGS, LANG_LABEL, pick } from './lib/i18n'
import logo from './assets/logo.png'
import Home from './pages/Home'
import CategoryPage from './pages/CategoryPage'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import ConfirmEmail from './pages/auth/ConfirmEmail'

// Araç ekranları tembel yüklenir: 25 ekranın hesap motoru, şeması ve metni tek
// pakette gelince ilk boyama gereksiz büyüyordu. Ana sayfa ve kategori sayfası
// eager kalır — ilk açılışta zaten onlar görünüyor.
const TraceWidth = lazy(() => import('./pages/tools/TraceWidth'))
const VoltageDivider = lazy(() => import('./pages/tools/VoltageDivider'))
const ResistorCode = lazy(() => import('./pages/tools/ResistorCode'))
const LedOhmRlc = lazy(() => import('./pages/tools/LedOhmRlc'))
const TimingCrystal = lazy(() => import('./pages/tools/TimingCrystal'))
const PowerPlane = lazy(() => import('./pages/tools/PowerPlane'))
const CopperConverter = lazy(() => import('./pages/tools/CopperConverter'))
const ViaProperties = lazy(() => import('./pages/tools/ViaProperties'))
const ThermalVia = lazy(() => import('./pages/tools/ThermalVia'))
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

// Hesap sayfaları (Projelerim listesi + proje detayı) da tembel yüklenir —
// araç ekranlarıyla aynı gerekçe: ilk boyamada yalnızca girişte gereken kod.
const Projects = lazy(() => import('./pages/account/Projects'))
const Project = lazy(() => import('./pages/account/Project'))

// Uygulama geneli metinler. Ekran metni gibi bunlar da `pick()` ile çözülür:
// doğrudan `DICT[lang]` indekslemesi eksik çeviride `undefined` verirdi, `pick`
// ise Türkçeye düşer — eksik çeviri boş kutu değil, okunabilir metin olur.
const FOOTER = {
  tr: 'Sonuçlar yaklaşık mühendislik tahminleridir. Kritik tasarımlarda üretici verisi ve '
    + 'ölçümle doğrulayın.',
  en: 'Results are approximate engineering estimates. Verify against manufacturer data and '
    + 'measurement for critical designs.',
}

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

function LangSwitch() {
  const { lang, setLang } = useLang()
  return (
    // Düğme listesi `LANGS`'ten türetilir: dizi burada yeniden yazılırsa
    // `isLang()` ile sessizce ayrışır ve seçilemeyen bir düğme kalırdı.
    <div className="lang-switch" role="group" aria-label={pick(LANG_SWITCH, lang)}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          // Düğmenin kendi adı her zaman kendi dilinde yazılır: kullanıcı
          // anlamadığı bir dildeyken çıkışı bulabilsin. Aynı gerekçeyle
          // ipucu metni de dilin kendi adıdır (endonim), seçili dile göre
          // değişmez — bu yüzden `pick` değil, doğrudan kod ile okunur.
          lang={code}
          title={LANG_LABEL[code] ?? code}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function LoadingNote() {
  const { lang } = useLang()
  return <p className="empty-note">{commonText(lang).loadingTool}</p>
}

// Başlıktaki hesap alanı — LangSwitch ile aynı düğme biçimini kullanır, yeni
// bir görsel desen eklemez. Oturum durumu ilk çözülene kadar (AUTH_LOADING)
// hiçbir şey basılmaz: "Giriş yap" gösterip hemen ada çevirmek göz kırpması
// yaratırdı.
function AccountArea() {
  const { lang } = useLang()
  const text = authText(lang)
  const { isLoading, isAuthenticated, user, logout } = useAuth()

  if (isLoading) return null

  if (isAuthenticated) {
    return (
      <div className="lang-switch" role="group">
        <Link to="/projelerim">{text.header.projects}</Link>
        <span className="header-user">{user.displayName}</span>
        <button type="button" onClick={logout}>{text.header.logout}</button>
      </div>
    )
  }

  return (
    <Link to="/giris" className="lang-switch" role="group">
      {text.header.loginLink}
    </Link>
  )
}

function Layout({ children }) {
  const { lang } = useLang()
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="wordmark" aria-label={pick(HOME_LINK, lang)}>
            <img src={logo} alt="ALP PCB Toolkit" />
          </Link>
          <span className="tagline">{pick(TAGLINE, lang)}</span>
          <AccountArea />
          <LangSwitch />
        </div>
        <svg className="trace-motif" viewBox="0 0 1200 26" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 13 H760 L784 5 H1080" fill="none" stroke="var(--accent-dim)" strokeWidth="2" />
          <circle cx="1092" cy="5" r="4.5" fill="var(--accent)" />
        </svg>
      </header>
      <main className="container">{children}</main>
      <footer className="site-footer">
        <div className="container">{pick(FOOTER, lang)}</div>
      </footer>
    </>
  )
}

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Suspense fallback={<LoadingNote />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/kategori/:slug" element={<CategoryPage />} />
                <Route path="/giris" element={<Login />} />
                <Route path="/kayit" element={<Register />} />
                <Route path="/parola-unuttum" element={<ForgotPassword />} />
                <Route path="/parola-sifirla" element={<ResetPassword />} />
                <Route path="/e-posta-dogrula" element={<ConfirmEmail />} />
                <Route path="/projelerim" element={<Projects />} />
                <Route path="/proje/:id" element={<Project />} />
                <Route path="/arac/trace-width" element={<TraceWidth />} />
                <Route path="/arac/gerilim-bolucu" element={<VoltageDivider />} />
                <Route path="/arac/direnc-kodu" element={<ResistorCode />} />
                <Route path="/arac/led-ohm-rlc" element={<LedOhmRlc />} />
                <Route path="/arac/rc-kristal" element={<TimingCrystal />} />
                <Route path="/arac/guc-duzlemi" element={<PowerPlane />} />
                <Route path="/arac/bakir-donusturucu" element={<CopperConverter />} />
                <Route path="/arac/via-ozellikleri" element={<ViaProperties />} />
                <Route path="/arac/termal-via" element={<ThermalVia />} />
                <Route path="/arac/tek-uclu-empedans" element={<SingleEnded />} />
                <Route path="/arac/diferansiyel-cift" element={<DiffPair />} />
                <Route path="/arac/yayilma-gecikmesi" element={<PropDelay />} />
                <Route path="/arac/kritik-hat-uzunlugu" element={<CriticalLength />} />
                <Route path="/arac/skew" element={<Skew />} />
                <Route path="/arac/crosstalk" element={<Crosstalk />} />
                <Route path="/arac/terminasyon" element={<Termination />} />
                <Route path="/arac/pdn-hedef-empedans" element={<Pdn />} />
                <Route path="/arac/decoupling" element={<Decoupling />} />
                <Route path="/arac/junction-sicakligi" element={<Junction />} />
                <Route path="/arac/uzunluk-donusturucu" element={<LengthConverter />} />
                <Route path="/arac/awg-donusturucu" element={<AwgConverter />} />
                <Route path="/arac/frekans-periyot" element={<FrequencyConverter />} />
                <Route path="/arac/db-kazanc" element={<DecibelConverter />} />
                <Route path="/arac/sicaklik-donusturucu" element={<TemperatureConverter />} />
                <Route path="/arac/kompleks-sayi" element={<ComplexConverter />} />
                <Route path="/arac/clearance-creepage-padstack" element={<ClearanceCreepagePadstack />} />
              </Routes>
            </Suspense>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </LangProvider>
  )
}
