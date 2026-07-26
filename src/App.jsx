import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import CategoryPage from './pages/CategoryPage'
import TraceWidth from './pages/tools/TraceWidth'
import VoltageDivider from './pages/tools/VoltageDivider'
import ResistorCode from './pages/tools/ResistorCode'
import LedOhmRlc from './pages/tools/LedOhmRlc'
import TimingCrystal from './pages/tools/TimingCrystal'
import PowerPlane from './pages/tools/PowerPlane'
import CopperConverter from './pages/tools/CopperConverter'
import ViaProperties from './pages/tools/ViaProperties'
import ThermalVia from './pages/tools/ThermalVia'
import SingleEnded from './pages/tools/SingleEnded'
import DiffPair from './pages/tools/DiffPair'
import PropDelay from './pages/tools/PropDelay'

function Layout({ children }) {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="wordmark">ALP PCB Toolkit</Link>
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
        </Routes>
      </Layout>
    </HashRouter>
  )
}
