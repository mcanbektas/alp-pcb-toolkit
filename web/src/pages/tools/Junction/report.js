// Jonksiyon sıcaklığı ve soğutucu ekranının rapor bölümü. Saf: React, DOM,
// ağ bilmez. docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e
// dokunmadan, aynı `r`/`s`/`text` kaynağından aynı satırları üretir; ekranla
// rapor arasındaki kayma riski (plan §8 R6) böylece en aza iner.
//
// Üç mod (junction, heatsink, surface) ve isteğe bağlı bakır termal ağı —
// ekrandaki `index.jsx` dallanmasının aynısı, aynı `r` alanlarından okunur.

import { fmt, fmtWatt } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import {
  formFields, MODE_JUNCTION, MODE_HEATSINK, MODE_SURFACE,
} from './model'

function inputRows(mode, f, text) {
  return formFields(mode, f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      // index.jsx'teki aynı dallanma (satır 158-161): yüzey modunda T_J,max
      // isteğe bağlı olduğu için ekranda "— opsiyonel" ekli etiket gösterilir.
      label: (mode === MODE_SURFACE && field.key === 'TjMax')
        ? text.fields.TjMax.labelOptional
        : field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

// `.big-result` — aynı dallanma index.jsx'teki label/value JSX'iyle birebir.
function bigResult(r, text) {
  if (r.mode === MODE_HEATSINK && !r.hasSink) {
    return { label: text.bigLabel.sinkNeeded, value: fmt(r.thetaSAmax, 4), unit: '°C/W', emphasis: true }
  }
  const label = r.mode === MODE_SURFACE ? text.bigLabel.surface : text.bigLabel.junction
  return { label, value: fmt(r.Tj, 4), unit: '°C', emphasis: true }
}

// `.result-table` moda özgü satırlar — index.jsx'teki üç dalın aynısı.
function modeResults(r, text) {
  if (r.mode === MODE_JUNCTION) {
    return [
      { label: text.table.Tj, value: fmt(r.Tj, 5), unit: '°C' },
      { label: text.table.rise, value: fmt(r.rise, 5), unit: '°C' },
      { label: text.table.TjMax, value: fmt(r.TjMax, 5), unit: '°C' },
      { label: text.table.margin, value: fmt(r.margin, 5), unit: '°C' },
      { label: text.table.Pmax, ...splitFormatted(fmtWatt(r.Pmax)) },
      { label: text.table.utilisation, value: text.pct(fmt(r.utilisation * 100, 4)) },
    ]
  }

  if (r.mode === MODE_HEATSINK) {
    const rows = [
      { label: text.table.budget, value: fmt(r.budget, 5), unit: '°C/W' },
      { label: text.table.thetaSAmax, value: fmt(r.thetaSAmax, 5), unit: '°C/W' },
      { label: text.table.thetaJC, value: fmt(r.thetaJC, 5), unit: '°C/W' },
      { label: text.table.thetaCS, value: fmt(r.thetaCS, 5), unit: '°C/W' },
    ]
    if (r.hasSink) {
      rows.push(
        { label: text.table.thetaTotal, value: fmt(r.thetaTotal, 5), unit: '°C/W' },
        { label: text.table.Tj, value: fmt(r.Tj, 5), unit: '°C' },
        { label: text.table.margin, value: fmt(r.margin, 5), unit: '°C' },
        { label: text.table.shareHead, value: text.table.shareCols },
        {
          label: text.table.shareRow,
          value: `${text.pct(fmt(r.shares.jc * 100, 3))} · ${text.pct(fmt(r.shares.cs * 100, 3))} · `
            + `${text.pct(fmt(r.shares.sa * 100, 3))}`,
        },
      )
    }
    return rows
  }

  // MODE_SURFACE
  return [
    { label: text.table.TjEstimate, value: fmt(r.Tj, 5), unit: '°C' },
    { label: text.table.metricUsed, value: text.metricShort[r.metric] },
    { label: text.table.metricValue, value: fmt(r.psi, 5), unit: '°C/W' },
    { label: text.table.psiRise, value: fmt(r.rise, 5), unit: '°C' },
    { label: text.table.Tsurface, value: fmt(r.Tsurface, 5), unit: '°C' },
  ]
}

// §8.6 bakır termal ağı — moddan bağımsız, `r.copperOn && r.copper` iken eklenir.
function copperResults(r, text) {
  if (!(r.copperOn && r.copper)) return []
  const c = r.copper
  return [
    { label: text.table.copperHead, value: text.table.copperHeadNote },
    { label: text.table.copperStrip, value: fmt(c.strip.Rth, 5), unit: '°C/W' },
    { label: text.table.copperDielectric, value: fmt(c.dielectric.Rth, 5), unit: '°C/W' },
    { label: text.table.copperEq, value: fmt(c.eq.Rth, 5), unit: '°C/W' },
    {
      label: text.table.copperShares,
      value: `${text.pct(fmt(c.eq.shares[0] * 100, 3))} · ${text.pct(fmt(c.eq.shares[1] * 100, 3))}`,
    },
    { label: text.table.copperRise, value: fmt(c.rise.deltaT, 5), unit: '°C' },
  ]
}

// `.formula` bloğu — moda göre seçilen blok, bakır açıksa ikinci blok eklenir
// (schematic.jsx'teki gibi tek eksen üzerinde ard arda, index.jsx'te iki ayrı
// <pre> olarak dizilir).
function formulaLines(r, text) {
  const lines = text.formula[r.mode].split('\n').map((line) => line.trim()).filter(Boolean)
  if (r.copperOn) {
    lines.push(...text.copperFormula.split('\n').map((line) => line.trim()).filter(Boolean))
  }
  return lines
}

// schematic.jsx'teki caption seçimiyle birebir aynı dallanma.
function schematicCaption(mode, text) {
  if (mode === MODE_HEATSINK) return text.schematic.captionHeatsink
  if (mode === MODE_SURFACE) return text.schematic.captionSurface
  return text.schematic.captionJunction
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır.
function chartSection(r, s, text) {
  if (!s) return null
  const chartMeta = text.chart[r.mode]
  // index.jsx'teki chartX ile birebir aynı: heatsink modunda °C/W, diğerlerinde W.
  const chartX = (v) => (r.mode === MODE_HEATSINK ? `${fmt(v, 3)} °C/W` : `${fmt(v, 3)} W`)
  return {
    title: chartMeta.caption,
    svg: null,
    table: {
      columns: [chartMeta.x, text.chart.seriesTj],
      rows: s.rows.filter((_, i) => i % 6 === 0).map((row) => [chartX(row.x), `${fmt(row.y, 4)} °C`]),
    },
  }
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  return {
    toolName: text.title,
    mode: text.modeLabel[mode],
    inputs: inputRows(mode, f, text),
    formula: formulaLines(r, text),
    results: [bigResult(r, text), ...modeResults(r, text), ...copperResults(r, text)],
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: schematicCaption(r.mode, text),
    chart: chartSection(r, s, text),
  }
}
