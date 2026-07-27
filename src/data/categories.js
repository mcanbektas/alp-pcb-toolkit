// 7 ana kategori. path'i olan araçlar aktif, olmayanlar "yakında".

export const CATEGORIES = [
  {
    slug: 'akim-guc-bakir',
    title: 'PCB Akım, Güç ve Bakır',
    desc: 'Yol genişliği, akım kapasitesi, direnç, gerilim düşümü, güç kaybı, bakır kalınlığı',
    tools: [
      { id: 'trace-width', name: 'Trace Width & Current Capacity', path: '/arac/trace-width' },
      { id: 'power-plane', name: 'Power Plane & Parallel Trace', path: '/arac/guc-duzlemi' },
      { id: 'cu-converter', name: 'Copper Thickness Converter', path: '/arac/bakir-donusturucu' },
    ],
  },
  {
    slug: 'via-padstack',
    title: 'Via ve Padstack',
    desc: 'Via direnci, akım kapasitesi, via sayısı, endüktans, annular ring, aspect ratio',
    tools: [
      { id: 'via-props', name: 'Via Properties & Current Capacity', path: '/arac/via-ozellikleri' },
      { id: 'thermal-via', name: 'Thermal Via Array', path: '/arac/termal-via' },
    ],
  },
  {
    slug: 'empedans',
    title: 'Kontrollü Empedans',
    desc: 'Microstrip, stripline, coplanar waveguide ve diferansiyel çift',
    tools: [
      { id: 'single-ended', name: 'Single-Ended Impedance', path: '/arac/tek-uclu-empedans' },
      { id: 'diff-pair', name: 'Differential Pair Impedance', path: '/arac/diferansiyel-cift' },
    ],
  },
  {
    slug: 'sinyal-butunlugu',
    title: 'Sinyal Bütünlüğü',
    desc: 'Yayılma gecikmesi, kritik hat uzunluğu, skew, crosstalk ve terminasyon',
    tools: [
      { id: 'prop-delay', name: 'Propagation Delay & Wavelength', path: '/arac/yayilma-gecikmesi' },
      { id: 'critical-length', name: 'Critical Trace Length', path: '/arac/kritik-hat-uzunlugu' },
      { id: 'skew', name: 'Differential Skew & Length Matching', path: '/arac/skew' },
      { id: 'crosstalk', name: 'Crosstalk Estimator', path: '/arac/crosstalk' },
      { id: 'termination', name: 'Termination Calculator', path: '/arac/terminasyon' },
    ],
  },
  {
    slug: 'guc-termal',
    title: 'Güç Bütünlüğü ve Termal',
    desc: 'PDN hedef empedansı, decoupling, junction sıcaklığı, soğutucu ve termal via',
    tools: [
      { id: 'pdn', name: 'PDN Target Impedance', path: '/arac/pdn-hedef-empedans' },
      { id: 'decoupling', name: 'Decoupling Network', path: '/arac/decoupling' },
      { id: 'junction', name: 'Junction Temperature & Heatsink', path: '/arac/junction-sicakligi' },
    ],
  },
  {
    slug: 'komponent',
    title: 'Komponent ve Devre Hesapları',
    desc: 'Direnç renkleri, SMD kodları, bölücüler, LED, RLC ve kristal kondansatörleri',
    tools: [
      { id: 'resistor-code', name: 'Resistor & SMD Code Decoder', path: '/arac/direnc-kodu' },
      { id: 'divider', name: 'Voltage Divider & E-Series Finder', path: '/arac/gerilim-bolucu' },
      { id: 'led-ohm-rlc', name: 'LED, Ohm Kanunu & RLC', path: '/arac/led-ohm-rlc' },
      { id: 'rc-crystal', name: 'RC/RL Zaman Sabiti & Kristal', path: '/arac/rc-kristal' },
    ],
  },
  {
    slug: 'uretim-dfm',
    title: 'PCB Üretim, DFM ve Dönüşümler',
    desc: 'Clearance, creepage, BGA breakout, stack-up, thermal relief ve birim dönüşümleri',
    tools: [
      { id: 'clearance', name: 'Clearance, Creepage & Padstack' },
      { id: 'bga', name: 'BGA Breakout' },
      { id: 'stackup', name: 'Stack-Up Planner' },
      { id: 'thermal-relief', name: 'Thermal Relief' },
      { id: 'length-conv', name: 'Length Converter', path: '/arac/uzunluk-donusturucu' },
      { id: 'awg-conv', name: 'AWG Wire Gauge Converter', path: '/arac/awg-donusturucu' },
      { id: 'freq-conv', name: 'Frequency & Period Converter', path: '/arac/frekans-periyot' },
      { id: 'db-conv', name: 'Decibel, Gain & dBm Converter', path: '/arac/db-kazanc' },
      { id: 'temp-conv', name: 'Temperature Converter', path: '/arac/sicaklik-donusturucu' },
      { id: 'complex-conv', name: 'Complex Number Converter', path: '/arac/kompleks-sayi' },
    ],
  },
]

export function findCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug)
}
