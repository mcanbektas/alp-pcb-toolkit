// 8 ana kategori. path'i olan araçlar aktif, olmayanlar "yakında".
//
// title / desc / name iki dilli sözlüktür ({ tr, en }); ekran tarafı
// lib/i18n.js'teki pick() ile geçerli dilin karşılığını seçer.
//
// YOLLAR İKİ DİLLİDİR. Türkçe yol kanoniktir ve burada tam hâliyle durur
// (kategoride `slug`, araçta `path`); İngilizce yol `slugEn`den türetilir
// (`lib/routes.js` → categoryPath/toolPath):
//
//   /kategori/empedans        ↔  /en/category/controlled-impedance
//   /arac/gerilim-bolucu      ↔  /en/tool/voltage-divider
//
// `path` varken `slugEn` EKSİK OLAMAZ — eksikse o aracın İngilizce sayfası
// hiç üretilmez ve Türkçe sayfa var olmayan bir alternatife hreflang verir.
// `pages/tools/toolKeys.test.js` bunu denetler. Kararlar: docs/en-url-karari.md.

export const CATEGORIES = [
  {
    slug: 'akim-guc-bakir',
    slugEn: 'current-power-copper',
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
        slugEn: 'trace-width',
      },
      {
        id: 'power-plane',
        name: { tr: 'Güç Düzlemi ve Paralel Yol', en: 'Power Plane & Parallel Trace' },
        path: '/arac/guc-duzlemi',
        slugEn: 'power-plane',
      },
      {
        id: 'cu-converter',
        name: { tr: 'Bakır Kalınlığı Dönüştürücü', en: 'Copper Thickness Converter' },
        path: '/arac/bakir-donusturucu',
        slugEn: 'copper-thickness-converter',
      },
    ],
  },
  {
    slug: 'via-padstack',
    slugEn: 'via-padstack',
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
        slugEn: 'via-properties',
      },
      {
        id: 'thermal-via',
        name: { tr: 'Termal Via Dizisi', en: 'Thermal Via Array' },
        path: '/arac/termal-via',
        slugEn: 'thermal-via-array',
      },
    ],
  },
  {
    slug: 'empedans',
    slugEn: 'controlled-impedance',
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
        slugEn: 'single-ended-impedance',
      },
      {
        id: 'diff-pair',
        name: { tr: 'Diferansiyel Çift Empedansı', en: 'Differential Pair Impedance' },
        path: '/arac/diferansiyel-cift',
        slugEn: 'differential-pair-impedance',
      },
    ],
  },
  {
    slug: 'sinyal-butunlugu',
    slugEn: 'signal-integrity',
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
        slugEn: 'propagation-delay',
      },
      {
        id: 'critical-length',
        name: { tr: 'Kritik Hat Uzunluğu', en: 'Critical Trace Length' },
        path: '/arac/kritik-hat-uzunlugu',
        slugEn: 'critical-trace-length',
      },
      {
        id: 'skew',
        name: { tr: 'Diferansiyel Skew ve Uzunluk Eşleme', en: 'Differential Skew & Length Matching' },
        path: '/arac/skew',
        slugEn: 'differential-skew',
      },
      {
        id: 'crosstalk',
        name: { tr: 'Crosstalk Kestirimi', en: 'Crosstalk Estimator' },
        path: '/arac/crosstalk',
        slugEn: 'crosstalk-estimator',
      },
      {
        id: 'termination',
        name: { tr: 'Terminasyon Hesaplayıcı', en: 'Termination Calculator' },
        path: '/arac/terminasyon',
        slugEn: 'termination-calculator',
      },
    ],
  },
  {
    slug: 'guc-termal',
    slugEn: 'power-integrity-thermal',
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
        slugEn: 'pdn-target-impedance',
      },
      {
        id: 'decoupling',
        name: { tr: 'Decoupling Ağı', en: 'Decoupling Network' },
        path: '/arac/decoupling',
        slugEn: 'decoupling-network',
      },
      {
        id: 'junction',
        name: { tr: 'Jonksiyon Sıcaklığı ve Soğutucu', en: 'Junction Temperature & Heatsink' },
        path: '/arac/junction-sicakligi',
        slugEn: 'junction-temperature',
      },
    ],
  },
  {
    slug: 'komponent',
    slugEn: 'component-circuit',
    title: { tr: 'Komponent ve Devre Hesapları', en: 'Component and Circuit Calculators' },
    desc: {
      tr: 'Direnç renkleri, SMD kodları, bölücüler, LED, RLC ve kristal kondansatörleri',
      en: 'Resistor colours, SMD codes, dividers, LED, RLC and crystal load capacitors',
    },
    tools: [
      {
        id: 'resistor-code',
        name: { tr: 'Direnç Renk Kodu', en: 'Resistor Color Code' },
        path: '/arac/direnc-kodu',
        slugEn: 'resistor-color-code',
      },
      {
        id: 'divider',
        name: { tr: 'Gerilim Bölücü ve E Serisi Bulucu', en: 'Voltage Divider & E-Series Finder' },
        path: '/arac/gerilim-bolucu',
        slugEn: 'voltage-divider',
      },
      {
        id: 'ohm-law',
        name: { tr: 'Ohm Kanunu ve Seri/Paralel Direnç', en: 'Ohm’s Law and Series/Parallel Resistance' },
        path: '/arac/ohm-kanunu',
        slugEn: 'ohms-law',
      },
      {
        id: 'led-resistor',
        name: { tr: 'LED Seri Direnci', en: 'LED Series Resistor' },
        path: '/arac/led-direnci',
        slugEn: 'led-resistor',
      },
      {
        id: 'rlc-resonance',
        name: { tr: 'RLC Rezonans', en: 'RLC Resonance' },
        path: '/arac/rlc-rezonans',
        slugEn: 'rlc-resonance',
      },
      {
        id: 'rc-rl',
        name: { tr: 'RC/RL Zaman Sabiti', en: 'RC/RL Time Constant' },
        path: '/arac/rc-rl-zaman-sabiti',
        slugEn: 'rc-rl-time-constant',
      },
      {
        id: 'crystal-load',
        name: { tr: 'Kristal Yük Kapasitesi', en: 'Crystal Load Capacitance' },
        path: '/arac/kristal-yuk-kapasitansi',
        slugEn: 'crystal-load-capacitance',
      },
    ],
  },
  {
    slug: 'uretim-dfm',
    slugEn: 'manufacturing-dfm',
    title: { tr: 'PCB Üretim ve DFM', en: 'PCB Manufacturing and DFM' },
    desc: {
      tr: 'Clearance, creepage, BGA breakout, stack-up ve thermal relief',
      en: 'Clearance, creepage, BGA breakout, stack-up and thermal relief',
    },
    tools: [
      {
        id: 'clearance-creepage-padstack',
        name: { tr: 'Clearance, Creepage ve Padstack', en: 'Clearance, Creepage & Padstack' },
        path: '/arac/clearance-creepage-padstack',
        slugEn: 'clearance-creepage-padstack',
      },
      {
        id: 'bga-breakout',
        name: { tr: 'BGA Breakout', en: 'BGA Breakout' },
        path: '/arac/bga-breakout',
        slugEn: 'bga-breakout',
      },
      {
        id: 'stackup-planner',
        name: { tr: 'Stack-Up Planlayıcı', en: 'Stack-Up Planner' },
        path: '/arac/stack-up-planlayici',
        slugEn: 'stack-up-planner',
      },
      {
        id: 'thermal-relief',
        name: { tr: 'Thermal Relief', en: 'Thermal Relief' },
        path: '/arac/thermal-relief',
        slugEn: 'thermal-relief',
      },
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
    slugEn: 'converters',
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
        slugEn: 'length-converter',
      },
      {
        id: 'awg-conv',
        name: { tr: 'AWG Tel Çapı Dönüştürücü', en: 'AWG Wire Gauge Converter' },
        path: '/arac/awg-donusturucu',
        slugEn: 'awg-wire-gauge-converter',
      },
      {
        id: 'freq-conv',
        name: { tr: 'Frekans ve Periyot Dönüştürücü', en: 'Frequency & Period Converter' },
        path: '/arac/frekans-periyot',
        slugEn: 'frequency-period-converter',
      },
      {
        id: 'db-conv',
        name: { tr: 'Desibel, Kazanç ve dBm Dönüştürücü', en: 'Decibel, Gain & dBm Converter' },
        path: '/arac/db-kazanc',
        slugEn: 'decibel-gain-dbm-converter',
      },
      {
        id: 'temp-conv',
        name: { tr: 'Sıcaklık Dönüştürücü', en: 'Temperature Converter' },
        path: '/arac/sicaklik-donusturucu',
        slugEn: 'temperature-converter',
      },
      {
        id: 'complex-conv',
        name: { tr: 'Kompleks Sayı Dönüştürücü', en: 'Complex Number Converter' },
        path: '/arac/kompleks-sayi',
        slugEn: 'complex-number-converter',
      },
    ],
  },
]

export function findCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug)
}

// Bir aracın kaydı `toolKey` alanıyla saklanır ve o anahtar buradaki `id` ile
// AYNI olmak zorundadır: kaydedilmiş hesabın adını ve ekran yolunu bulmanın
// tek yolu bu eşleşmedir. Üç DFM aracında ikisi ayrışmıştı (`bga` ↔
// `bga-breakout`) ve proje listesinde araç adı yerine ham anahtar görünüyordu;
// `id` alanı kaydedilen anahtara hizalandı — kalıcı olan taraf odur.
export function findTool(toolKey) {
  for (const cat of CATEGORIES) {
    const tool = cat.tools.find((t) => t.id === toolKey)
    if (tool) return tool
  }
  return null
}
