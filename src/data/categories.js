// 8 ana kategori. path'i olan araçlar aktif, olmayanlar "yakında".
//
// title / desc / name iki dilli sözlüktür ({ tr, en }); ekran tarafı
// lib/i18n.js'teki pick() ile geçerli dilin karşılığını seçer.

export const CATEGORIES = [
  {
    slug: 'akim-guc-bakir',
    title: { tr: 'PCB Akım, Güç ve Bakır', en: 'PCB Current, Power and Copper' },
    desc: {
      tr: 'Yol genişliği, akım kapasitesi, direnç, gerilim düşümü, güç kaybı, bakır kalınlığı',
      en: 'Trace width, current capacity, resistance, voltage drop, power loss, copper thickness',
    },
    tools: [
      {
        id: 'trace-width',
        name: { tr: 'Yol Genişliği ve Akım Kapasitesi', en: 'Trace Width & Current Capacity' },
        path: '/arac/trace-width',
      },
      {
        id: 'power-plane',
        name: { tr: 'Güç Düzlemi ve Paralel Yol', en: 'Power Plane & Parallel Trace' },
        path: '/arac/guc-duzlemi',
      },
      {
        id: 'cu-converter',
        name: { tr: 'Bakır Kalınlığı Dönüştürücü', en: 'Copper Thickness Converter' },
        path: '/arac/bakir-donusturucu',
      },
    ],
  },
  {
    slug: 'via-padstack',
    title: { tr: 'Via ve Padstack', en: 'Via and Padstack' },
    desc: {
      tr: 'Via direnci, akım kapasitesi, via sayısı, endüktans, annular ring, aspect ratio',
      en: 'Via resistance, current capacity, via count, inductance, annular ring, aspect ratio',
    },
    tools: [
      {
        id: 'via-props',
        name: { tr: 'Via Özellikleri ve Akım Kapasitesi', en: 'Via Properties & Current Capacity' },
        path: '/arac/via-ozellikleri',
      },
      {
        id: 'thermal-via',
        name: { tr: 'Termal Via Dizisi', en: 'Thermal Via Array' },
        path: '/arac/termal-via',
      },
    ],
  },
  {
    slug: 'empedans',
    title: { tr: 'Kontrollü Empedans', en: 'Controlled Impedance' },
    desc: {
      tr: 'Microstrip, stripline, coplanar waveguide ve diferansiyel çift',
      en: 'Microstrip, stripline, coplanar waveguide and differential pair',
    },
    tools: [
      {
        id: 'single-ended',
        name: { tr: 'Tek Uçlu Empedans', en: 'Single-Ended Impedance' },
        path: '/arac/tek-uclu-empedans',
      },
      {
        id: 'diff-pair',
        name: { tr: 'Diferansiyel Çift Empedansı', en: 'Differential Pair Impedance' },
        path: '/arac/diferansiyel-cift',
      },
    ],
  },
  {
    slug: 'sinyal-butunlugu',
    title: { tr: 'Sinyal Bütünlüğü', en: 'Signal Integrity' },
    desc: {
      tr: 'Yayılma gecikmesi, kritik hat uzunluğu, skew, crosstalk ve terminasyon',
      en: 'Propagation delay, critical trace length, skew, crosstalk and termination',
    },
    tools: [
      {
        id: 'prop-delay',
        name: { tr: 'Yayılma Gecikmesi ve Dalga Boyu', en: 'Propagation Delay & Wavelength' },
        path: '/arac/yayilma-gecikmesi',
      },
      {
        id: 'critical-length',
        name: { tr: 'Kritik Hat Uzunluğu', en: 'Critical Trace Length' },
        path: '/arac/kritik-hat-uzunlugu',
      },
      {
        id: 'skew',
        name: { tr: 'Diferansiyel Skew ve Uzunluk Eşleme', en: 'Differential Skew & Length Matching' },
        path: '/arac/skew',
      },
      {
        id: 'crosstalk',
        name: { tr: 'Crosstalk Kestirimi', en: 'Crosstalk Estimator' },
        path: '/arac/crosstalk',
      },
      {
        id: 'termination',
        name: { tr: 'Terminasyon Hesaplayıcı', en: 'Termination Calculator' },
        path: '/arac/terminasyon',
      },
    ],
  },
  {
    slug: 'guc-termal',
    title: { tr: 'Güç Bütünlüğü ve Termal', en: 'Power Integrity and Thermal' },
    desc: {
      tr: 'PDN hedef empedansı, decoupling, junction sıcaklığı, soğutucu ve termal via',
      en: 'PDN target impedance, decoupling, junction temperature, heatsink and thermal via',
    },
    tools: [
      {
        id: 'pdn',
        name: { tr: 'PDN Hedef Empedansı', en: 'PDN Target Impedance' },
        path: '/arac/pdn-hedef-empedans',
      },
      {
        id: 'decoupling',
        name: { tr: 'Decoupling Ağı', en: 'Decoupling Network' },
        path: '/arac/decoupling',
      },
      {
        id: 'junction',
        name: { tr: 'Jonksiyon Sıcaklığı ve Soğutucu', en: 'Junction Temperature & Heatsink' },
        path: '/arac/junction-sicakligi',
      },
    ],
  },
  {
    slug: 'komponent',
    title: { tr: 'Komponent ve Devre Hesapları', en: 'Component and Circuit Calculators' },
    desc: {
      tr: 'Direnç renkleri, SMD kodları, bölücüler, LED, RLC ve kristal kondansatörleri',
      en: 'Resistor colours, SMD codes, dividers, LED, RLC and crystal load capacitors',
    },
    tools: [
      {
        id: 'resistor-code',
        name: { tr: 'Direnç ve SMD Kod Çözücü', en: 'Resistor & SMD Code Decoder' },
        path: '/arac/direnc-kodu',
      },
      {
        id: 'divider',
        name: { tr: 'Gerilim Bölücü ve E Serisi Bulucu', en: 'Voltage Divider & E-Series Finder' },
        path: '/arac/gerilim-bolucu',
      },
      {
        id: 'led-ohm-rlc',
        name: { tr: 'LED, Ohm Kanunu ve RLC', en: 'LED, Ohm’s Law & RLC' },
        path: '/arac/led-ohm-rlc',
      },
      {
        id: 'rc-crystal',
        name: { tr: 'RC/RL Zaman Sabiti ve Kristal', en: 'RC/RL Time Constant & Crystal' },
        path: '/arac/rc-kristal',
      },
    ],
  },
  {
    slug: 'uretim-dfm',
    title: { tr: 'PCB Üretim ve DFM', en: 'PCB Manufacturing and DFM' },
    desc: {
      tr: 'Clearance, creepage, BGA breakout, stack-up ve thermal relief',
      en: 'Clearance, creepage, BGA breakout, stack-up and thermal relief',
    },
    tools: [
      { id: 'clearance', name: { tr: 'Clearance, Creepage ve Padstack', en: 'Clearance, Creepage & Padstack' } },
      { id: 'bga', name: { tr: 'BGA Breakout', en: 'BGA Breakout' } },
      { id: 'stackup', name: { tr: 'Stack-Up Planlayıcı', en: 'Stack-Up Planner' } },
      { id: 'thermal-relief', name: { tr: 'Thermal Relief', en: 'Thermal Relief' } },
    ],
  },
  {
    // Birim dönüştürücüler ayrı kategoridir: `docs/spec.md` §11'in tanımladığı
    // altı dönüşüm tanım gereği tam bağıntılardır — ampirik katsayı, eğri
    // uydurma ya da tablo içermezler. PCB üretim hesaplarıyla aynı kartta
    // durduklarında bu ayrım görünmüyordu.
    //
    // Bakır Kalınlığı Dönüştürücü buraya alınmadı: adı dönüştürücü olsa da
    // yalnızca oz ↔ µm çevirmez, kaplama payı ve aşındırma faktörü gibi üretim
    // parametrelerini hesaplar. Yeri "PCB Akım, Güç ve Bakır" kategorisidir.
    slug: 'donusturucular',
    title: { tr: 'Dönüştürücüler', en: 'Converters' },
    desc: {
      tr: 'Uzunluk, AWG tel çapı, frekans/periyot, desibel, sıcaklık ve kompleks sayı dönüşümleri',
      en: 'Length, AWG wire gauge, frequency/period, decibel, temperature and complex number conversions',
    },
    tools: [
      {
        id: 'length-conv',
        name: { tr: 'Uzunluk Dönüştürücü', en: 'Length Converter' },
        path: '/arac/uzunluk-donusturucu',
      },
      {
        id: 'awg-conv',
        name: { tr: 'AWG Tel Çapı Dönüştürücü', en: 'AWG Wire Gauge Converter' },
        path: '/arac/awg-donusturucu',
      },
      {
        id: 'freq-conv',
        name: { tr: 'Frekans ve Periyot Dönüştürücü', en: 'Frequency & Period Converter' },
        path: '/arac/frekans-periyot',
      },
      {
        id: 'db-conv',
        name: { tr: 'Desibel, Kazanç ve dBm Dönüştürücü', en: 'Decibel, Gain & dBm Converter' },
        path: '/arac/db-kazanc',
      },
      {
        id: 'temp-conv',
        name: { tr: 'Sıcaklık Dönüştürücü', en: 'Temperature Converter' },
        path: '/arac/sicaklik-donusturucu',
      },
      {
        id: 'complex-conv',
        name: { tr: 'Kompleks Sayı Dönüştürücü', en: 'Complex Number Converter' },
        path: '/arac/kompleks-sayi',
      },
    ],
  },
]

export function findCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug)
}
