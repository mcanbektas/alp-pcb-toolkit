// LED, Ohm kanunu ve RLC ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// Dört hesap türü (ohm/led/rlc/combo) ve bunlardan yalnızca birinde
// (rlc) anlamlı olan analiz/sentez modu var — desen ResistorCode'daki
// kind + mode dallanmasının aynısı: rapor başlığındaki `mode` alanı kind'i
// (hangi hesap) taşır, analiz/sentez ayrımı sonuç satırlarına yansır
// (bkz. RLC'de yalnızca sentezde eklenen "en yakın E24 kapasite" satırı).

import {
  fmt, fmtEng, fmtRes, fmtAmp, fmtPow, fmtVolt, fmtPct,
} from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import {
  formFields, TOOL_OHM, TOOL_LED, TOOL_RLC, TOOL_COMBO,
  MODE_SYNTHESIS, COMBO_SERIES,
} from './model'

// TOOL_COMBO alanları (combo, values) `formFields()`'tan geçmez: doğrulaması
// `parseValueList` ile ayrı yapılır (bkz. model.js compute()). Bu yüzden
// girdi satırları burada elle kurulur, tıpkı ResistorCode'un KIND_SMD/KIND_CAP
// dallarında olduğu gibi.
function inputRows(tool, mode, f, text) {
  if (tool === TOOL_COMBO) {
    return [
      { label: text.fields.combo, value: text.comboLabel[f.combo] },
      { label: text.fields.values.label, value: f.values },
    ]
  }

  return formFields(tool, mode, f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      // `n` alanının birimi model.js'te dil bilmeyen 'adet' sabitiyle
      // (COUNT tablosunun anahtarı) tutulur; ekranda gösterilen birim
      // `text.fields.countUnit` ile dile göre değişir ("adet" / "pcs").
      // Bu satır olmasaydı İngilizce raporda da "adet" basılırdı.
      unit: field.key === 'n'
        ? text.fields.countUnit
        : (field.unitKey ? f[field.unitKey] : (field.unit ?? null)),
    }))
}

function ohmResults(r, text) {
  const rows = [
    { label: text.big.ohmLabel, ...splitFormatted(fmtPow(r.P, 4)), emphasis: true },
    { label: text.table.voltage, ...splitFormatted(fmtVolt(r.V)) },
    { label: text.table.current, ...splitFormatted(fmtAmp(r.I)) },
    { label: text.table.resistance, ...splitFormatted(fmtRes(r.R)) },
    { label: text.table.power, ...splitFormatted(fmtPow(r.P)) },
  ]
  if (r.inconsistency != null) {
    rows.push({ label: text.table.inconsistency, value: fmt(r.inconsistency * 100, 3), unit: '%' })
  }
  return rows
}

function ledResults(r, text) {
  const errPctE24 = (100 * (r.e24.I - r.targetI)) / r.targetI
  const errPctE96 = (100 * (r.e96.I - r.targetI)) / r.targetI
  return [
    { label: text.big.ledLabel, ...splitFormatted(fmtRes(r.R, 4)), emphasis: true },
    { label: text.table.totalLedVoltage, ...splitFormatted(fmtVolt(r.Vled)) },
    { label: text.table.headroom, ...splitFormatted(fmtVolt(r.headroom)) },
    { label: text.table.idealResistance, ...splitFormatted(fmtRes(r.R, 5)) },
    { label: text.table.resistorPower, ...splitFormatted(fmtPow(r.P, 4)) },
    {
      label: text.table.ratedPower,
      value: `${fmtPow(r.Prated, 4)} ${text.table.utilisation(text.pct(fmt(r.derating * 100, 3)))}`,
    },
    { label: text.table.standardHead, value: text.table.standardHeadSub },
    {
      label: 'E24',
      value: `${fmtRes(r.e24.value, 4)} · ${fmtAmp(r.e24.I, 3)} · ${text.pct(fmtPct(errPctE24))}`,
    },
    {
      label: 'E96',
      value: `${fmtRes(r.e96.value, 4)} · ${fmtAmp(r.e96.I, 3)} · ${text.pct(fmtPct(errPctE96))}`,
    },
  ]
}

function rlcResults(r, text) {
  const bigLabel = r.mode === MODE_SYNTHESIS
    ? text.big.rlcSynthesisLabel
    : text.big.rlcAnalysisLabel(fmtEng(r.f, 'Hz', 4))
  const bigValue = r.mode === MODE_SYNTHESIS ? fmtEng(r.C, 'F', 4) : fmtRes(r.magnitude, 4)

  const rows = [
    { label: bigLabel, ...splitFormatted(bigValue), emphasis: true },
    { label: text.table.XL, ...splitFormatted(fmtRes(r.XL, 4)) },
    { label: text.table.XC, ...splitFormatted(fmtRes(r.XC, 4)) },
    { label: text.table.X, ...splitFormatted(fmtRes(r.X, 4)) },
    { label: text.table.magnitude, ...splitFormatted(fmtRes(r.magnitude, 4)) },
    { label: text.table.phase, value: fmt(r.phaseDeg, 4), unit: '°' },
    { label: text.table.f0, ...splitFormatted(fmtEng(r.f0, 'Hz', 5)) },
    { label: text.table.Q, value: fmt(r.Q, 4) },
    { label: text.table.BW, ...splitFormatted(fmtEng(r.BW, 'Hz', 4)) },
  ]
  if (r.mode === MODE_SYNTHESIS) {
    rows.push({
      label: text.table.nearestC,
      value: `${fmt(r.nearestC.value, 4)} pF (${text.pct(fmtPct(r.nearestC.errorPct))})`,
    })
  }
  return rows
}

function comboResults(r, text) {
  const shareLabel = r.combo === COMBO_SERIES ? text.table.shareSeries : text.table.shareParallel
  return [
    { label: text.big.comboLabel(r.combo), ...splitFormatted(fmtRes(r.equivalent, 4)), emphasis: true },
    { label: text.table.shareHead, value: shareLabel },
    ...r.values.map((x, i) => ({
      label: fmtRes(x, 4),
      value: fmt(r.shares[i] * 100, 3),
      unit: '%',
    })),
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg). Seri/paralel
// birleşimin taranacak sürekli bir parametresi yok, `s` o durumda hep null.
function chartSection(s, text) {
  if (!s) return null
  const meta = text.chart[s.kind]
  return {
    title: meta.caption,
    svg: null,
    table: {
      // Ekrandaki <ChartDataTable every={6} .../> ile aynı örnekleme kuralı
      // (sampleIndices): son nokta her zaman dahil. 70/90 noktalı taramalarda
      // düz `i % 6` filtresi son satırı düşürüyordu.
      columns: [meta.x, meta.y],
      rows: sampleIndices(s.rows.length, 6).map((i) => [fmtEng(s.rows[i].x, '', 4), fmt(s.rows[i].y, 4)]),
    },
  }
}

// schematic.jsx'teki CircuitSchematic ile birebir aynı türetme (bkz. orada
// `const caption = text.caption[tool] ?? (...)`) — ekrandaki <figcaption>
// yalnızca <svg>'in kardeşi olduğu için schematicRef üzerinden yakalanamaz,
// bu yüzden metni burada ayrıca hesaplayıp `schematicCaption` alanına koymak
// gerekir (bkz. ReportPayload.cs SchematicCaption).
function schematicCaption(r, text) {
  return text.schematic.caption[r.tool]
    ?? (r.combo === COMBO_SERIES ? text.schematic.captionSeries : text.schematic.captionParallel)
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  const results = r.tool === TOOL_OHM ? ohmResults(r, text)
    : r.tool === TOOL_LED ? ledResults(r, text)
      : r.tool === TOOL_RLC ? rlcResults(r, text)
        : comboResults(r, text)

  return {
    toolName: text.title,
    mode: text.toolLabel[r.tool],
    inputs: inputRows(r.tool, mode, f, text),
    formula: text.formula[r.tool].split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: schematicCaption(r, text),
    chart: chartSection(s, text),
  }
}
