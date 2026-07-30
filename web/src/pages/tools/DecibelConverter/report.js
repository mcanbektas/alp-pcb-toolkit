// dB, kazanç ve dBm dönüştürücü ekranının rapor bölümü. Saf.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// Bu ekranda "mode" (güç/gerilim oranı/dBm) ve "dir" (ileri/ters) iki ayrı
// eksendir, ikisi de `f`/`r` içinde taşınır — TraceWidth/ResistorCode'daki
// gibi index.jsx'te ayrı bir `mode` state'i yok. Bu yüzden imza `{ f, r, s,
// text }`dir; rapor bölümünün üst düzey `mode` alanı yalnızca birincil ekseni
// (güç/gerilim/dBm) taşır — ikincil eksen (yön) diğer pilotlardaki gibi hangi
// alanların/satırların göründüğü üzerinden dolaylı olarak okunur.

import { fmt, fmtEng, fmtOhm, fmtVolt } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, MODE_DBM } from './model'

function inputRows(f, text) {
  return formFields(f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

// dBm dalı — ekranın iki result-table'ının aynısı, aynı sig figürlerle.
function dbmResults(r, text) {
  return [
    { label: text.bigDbm.label, value: fmt(r.dBm, 4), unit: 'dBm', emphasis: true },
    { label: 'dBm', value: fmt(r.dBm, 5), unit: 'dBm' },
    { label: text.dbmTable.power, value: `${fmt(r.mW, 5)} mW (${fmtEng(r.W, 'W', 5)})` },
    { label: text.dbmTable.ratio, value: `${fmt(r.powerRatio, 5)}× ${text.dbmTable.ratioSub}` },
    { label: text.dbmTable.refZ, ...splitFormatted(fmtOhm(r.Z)) },
    { label: text.dbmTable.vrms, value: `${fmtVolt(r.Vrms)} ${text.dbmTable.vrmsSub}` },
  ]
}

// Güç/gerilim oranı dalı — ekranda mod (power/voltage) fark etmeksizin aynı
// tablo dizilir; giriş/çıkış satırları yalnızca değer varsa eklenir.
function gainResults(r, text) {
  const rows = [
    { label: text.bigGain.label, value: fmt(r.dB, 4), unit: 'dB', emphasis: true },
    { label: text.gainTable.powerRatio, value: `${fmt(r.powerRatio, 5)}× (10·log₁₀)` },
    { label: text.gainTable.voltageRatio, value: `${fmt(r.voltageRatio, 5)}× ${text.gainTable.voltageSub}` },
    { label: text.gainTable.gain, value: fmt(r.dB, 5), unit: 'dB' },
  ]
  if (r.P1 != null) rows.push({ label: text.gainTable.P1, ...splitFormatted(fmtEng(r.P1, 'W', 5)) })
  if (r.P2 != null) rows.push({ label: text.gainTable.P2, ...splitFormatted(fmtEng(r.P2, 'W', 5)) })
  if (r.V1 != null) rows.push({ label: text.gainTable.V1, ...splitFormatted(fmtVolt(r.V1)) })
  if (r.V2 != null) rows.push({ label: text.gainTable.V2, ...splitFormatted(fmtVolt(r.V2)) })
  return rows
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır.
// Hücreler TraceWidth pilotundaki gibi çıplak sayı taşır, ekrandaki
// ChartDataTable'ın birim ekleyen formatY'siyle birebir değil — bu ayrım
// yalnızca grafik tablosuna özgüdür, '.big-result'/'.result-table' satırlarını
// etkilemez.
function chartSection(s, text) {
  if (!s) return null
  const chart = text.chart[s.kind]
  // Örnekleme ekrandaki <ChartDataTable every={5} .../> ile aynı
  // `sampleIndices` kuralını paylaşır: son nokta her zaman dahil. 61 noktalı
  // taramada düz `i % 5` filtresi de son satırı veriyordu; tarama adımı
  // değişince ayrışmasın diye kural tek yerdedir.
  const rows = sampleIndices(s.rows.length, 5).map((i) => s.rows[i])

  if (s.kind === 'dbm') {
    return {
      title: chart.caption,
      svg: null,
      table: {
        columns: [chart.x, chart.series],
        rows: rows.map((row) => [fmt(row.x, 3), fmt(row.y, 3)]),
      },
    }
  }

  return {
    title: chart.caption,
    svg: null,
    table: {
      columns: [chart.x, chart.power, chart.voltage],
      rows: rows.map((row) => [fmt(row.x, 3), fmt(row.y, 3), fmt(row.y2, 3)]),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  return {
    toolName: text.title,
    mode: text.modeLabel[r.mode],
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results: r.mode === MODE_DBM ? dbmResults(r, text) : gainResults(r, text),
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.mode === MODE_DBM ? text.schematic.captionDbm : text.schematic.captionRatio,
    chart: chartSection(s, text),
  }
}
