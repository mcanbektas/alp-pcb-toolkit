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
import CriticalLength from './pages/tools/CriticalLength'
import Skew from './pages/tools/Skew'
import Crosstalk from './pages/tools/Crosstalk'
import Termination from './pages/tools/Termination'
import Pdn from './pages/tools/Pdn'
import Decoupling from './pages/tools/Decoupling'
import Junction from './pages/tools/Junction'
import LengthConverter from './pages/tools/LengthConverter'
import AwgConverter from './pages/tools/AwgConverter'
import FrequencyConverter from './pages/tools/FrequencyConverter'
import DecibelConverter from './pages/tools/DecibelConverter'
import TemperatureConverter from './pages/tools/TemperatureConverter'
import ComplexConverter from './pages/tools/ComplexConverter'

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
      </Layout>
    </HashRouter>
  )
}
