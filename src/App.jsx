import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import logo from './assets/logo.png'
import Home from './pages/Home'
import CategoryPage from './pages/CategoryPage'

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

function Layout({ children }) {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="wordmark">
            <img src={logo} alt="ALP PCB Toolkit" />
          </Link>
          <span className="tagline">mühendislik karar destek araçları</span>
        </div>
        <svg className="trace-motif" viewBox="0 0 1200 26" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 13 H760 L784 5 H1080" fill="none" stroke="var(--accent-dim)" strokeWidth="2" />
          <circle cx="1092" cy="5" r="4.5" fill="var(--accent)" />
        </svg>
      </header>
      <main className="container">{children}</main>
      <footer className="site-footer">
        <div className="container">
          Sonuçlar yaklaşık mühendislik tahminleridir. Kritik tasarımlarda üretici verisi ve
          ölçümle doğrulayın.
        </div>
      </footer>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Suspense fallback={<p className="empty-note">Araç yükleniyor…</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/kategori/:slug" element={<CategoryPage />} />
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
          </Routes>
        </Suspense>
      </Layout>
    </HashRouter>
  )
}
