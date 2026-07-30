// Sıcaklık dönüştürücü ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// Bu ekranda mod (mutlak/fark) `f.mode` üzerinden taşınır — DecibelConverter/
// PowerPlane'deki gibi index.jsx'te ayrı bir `mode` state'i yok. Bu yüzden
// imza `{ f, r, s, text }`dir; üst düzey `mode` alanı `r.mode`'dan okunur.

import { fmt } from '../../../lib/num'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, MODE_DELTA, SWEEP_K } from './model'

// Sıcaklık ekranın tamamında altı anlamlı basamakla gösterilir (bkz.
// index.jsx/text.js içindeki aynı `SIG` sabiti) — dört basamak 298.2 K gibi
// okunaksız kalıyordu.
const SIG = 6

// `T`/`amb` alanları model.js'te `unitKey` taşımaz: sıcaklık afin dönüşür,
// çarpan tablosu yok, birim dönüşümü convertTemperature.js içinde ayrıca
// yapılır. Bu yüzden diğer pilotlardaki genel `field.unitKey` okuması burada
// işe yaramaz; ekrandaki NumberField'la aynı eşleme elle yazılır (T → f.Tu,
// amb → f.ambu).
function inputRows(f, text) {
  return formFields(f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.key === 'amb' ? f.ambu : f.Tu,
    }))
}

// Büyük sonuç: ekranda girişin kendi ölçeği hariç ilk "diğer" ölçek öne
// çıkar (bkz. index.jsx `others`).
function otherScales(r) {
  return r.scales.filter((x) => x.unit !== r.unit)
}

// `.result-table`'daki üç ölçek satırı — ekranla aynı sırada (C, F, K).
function scaleRows(r, text) {
  return r.scales.map((x) => ({
    label: r.mode === MODE_DELTA ? text.deltaScaleLabel[x.unit] : text.scaleLabel[x.unit],
    value: fmt(x.value, SIG),
    unit: x.unit,
  }))
}

// "Ortam üstüne yükselme" bloğu — yalnızca fark modunda ve ortam girildiğinde.
function riseRows(r, text) {
  if (r.mode !== MODE_DELTA || !r.final) return []
  return [
    {
      label: text.rise.ambient,
      value: `${fmt(r.final.ambient.C, SIG)} · ${fmt(r.final.ambient.F, SIG)} · ${fmt(r.final.ambient.K, SIG)}`,
    },
    {
      label: text.rise.delta,
      value: `${fmt(r.delta.dC, SIG)} · ${fmt(r.delta.dF, SIG)} · ${fmt(r.delta.dK, SIG)} ${text.rise.deltaSub}`,
    },
    {
      label: text.rise.final,
      value: `${fmt(r.final.C, SIG)} · ${fmt(r.final.F, SIG)} · ${fmt(r.final.K, SIG)}`,
    },
  ]
}

// "Sık kullanılan referanslar" bloğu — yalnızca mutlak modda.
function refRows(r, text) {
  if (r.mode === MODE_DELTA) return []
  return r.refs.map((p) => ({
    label: text.refPointLabel[p.key],
    value: `${fmt(p.C, SIG)} · ${fmt(p.F, SIG)} · ${fmt(p.K, SIG)}`,
  }))
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır.
// Hücreler TraceWidth pilotundaki gibi çıplak sayı taşır, ekrandaki
// ChartDataTable'ın birim ekleyen formatY'siyle birebir değil — bu ayrım
// yalnızca grafik tablosuna özgüdür, '.big-result'/'.result-table' satırlarını
// etkilemez.
function chartSection(r, s, text) {
  if (!s) return null

  // index.jsx'teki `seriesName` ile birebir aynı kural — bu simgeler
  // (ΔT_K, T_F …) zaten dilsiz gösterim sembolüdür, çevrilmez.
  const seriesName = s.mode === MODE_DELTA
    ? (s.param === SWEEP_K ? 'ΔT_K' : 'ΔT_F')
    : (s.param === SWEEP_K ? 'T_K' : 'T_F')

  return {
    title: text.chart.caption(s.mode, s.param),
    svg: null,
    table: {
      // Örnekleme ekrandaki <ChartDataTable every={5} .../> ile aynı
      // `sampleIndices` kuralını paylaşır: son nokta her zaman dahil. Bugünkü
      // 61 noktalı taramada düz `i % 5` filtresi de son satırı veriyordu, ama
      // tarama adımı değişirse sessizce ayrışırdı — kural tek yerde durur.
      columns: [text.chart.x(s.mode), seriesName],
      rows: sampleIndices(s.rows.length, 5).map((i) => [fmt(s.rows[i].x, 5), fmt(s.rows[i].y, 5)]),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const others = otherScales(r)
  const marginRow = r.mode === MODE_DELTA
    ? []
    : [{ label: text.table.margin, value: `${fmt(r.temp.marginK, SIG)} K ${text.table.marginSub}` }]

  return {
    toolName: text.title,
    mode: text.modeLabel[r.mode],
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results: [
      { label: text.bigLabel[r.mode], value: fmt(others[0].value, SIG), unit: others[0].unit, emphasis: true },
      ...scaleRows(r, text),
      ...marginRow,
      ...riseRows(r, text),
      ...refRows(r, text),
    ],
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.mode === MODE_DELTA ? text.schematic.captionDelta : text.schematic.captionAbs,
    chart: chartSection(r, s, text),
  }
}
