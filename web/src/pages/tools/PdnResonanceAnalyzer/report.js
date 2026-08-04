// PDN Rezonans ve Antirezonans Analizörü ekranının rapor bölümü.
// Saf: React, DOM, ağ bilmez. Ekranla AYNI `r`/`chartData`/`text` kaynağından
// aynı satırları üretir; ekranla rapor arasındaki kayma riski böylece en aza
// iner (REV2 §20: "Ekran ve rapor farklı hesap yapmaz").

import {
  fmt, fmtEng, fmtRes, fmtVolt, fmtPct,
} from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields } from './model'

// Kondansatör grubu satırlarının rapordaki sütun sırası — core + parasitikler
// her zaman, tolerans sütunları yalnız `hasTolerance` işaretliyken.
const GROUP_CORE_COLUMNS = ['label', 'Ceffective', 'count', 'ESR', 'eslComponent', 'Lmount', 'LviaEq']
const GROUP_TOLERANCE_COLUMNS = ['Cnominal', 'tolerancePct', 'kDcBias', 'kTemperature']
const GROUP_UNIT_KEYS = {
  Ceffective: 'Ceffectiveu', ESR: 'ESRu', eslComponent: 'eslComponentu', Lmount: 'Lmountu',
  LviaEq: 'LviaEqu', Cnominal: 'Cnominalu',
}

function groupColumnLabel(key, text) {
  return text.capCols[key] ?? text.fieldLabels[key] ?? key
}

// formFields yalnızca sayısal/birimli sistem, VRM, plane ve droop alanlarını
// kapsar; kondansatör grupları ayrı bir dizi olduğu için burada elle,
// `${rowLabel} ${i+1} — ${sütun}` biçiminde eklenir (readRows'un hata
// etiketleriyle aynı biçim, ReturnPathStitchingVia'daki kapalı seçenekli
// alanların formFields dışında elle eklenmesiyle aynı gerekçe).
function inputRows(f, text) {
  const rows = formFields(f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))

  const rowLabel = text.rowList.rowLabel
  f.capGroups.forEach((g, i) => {
    const columns = f.hasTolerance
      ? [...GROUP_CORE_COLUMNS, ...GROUP_TOLERANCE_COLUMNS]
      : GROUP_CORE_COLUMNS
    columns.forEach((key) => {
      if (g[key] === '' || g[key] == null) return
      const unitKey = GROUP_UNIT_KEYS[key]
      rows.push({
        label: `${rowLabel} ${i + 1} — ${groupColumnLabel(key, text)}`,
        value: g[key],
        unit: unitKey ? g[unitKey] : null,
      })
    })
  })

  return rows
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider — svg alanı burada bilinçli olarak null bırakılır.
// Örnekleme ekrandaki <ChartDataTable> ile aynı `sampleIndices` fonksiyonunu
// kullanır (son nokta her zaman dahil).
function chartSection(chartData, text) {
  if (!chartData) return null

  const columns = [text.chart.xLabel, text.chart.seriesTotal]
  const seriesForTable = [chartData.totalPoints]

  if (chartData.vrmPoints) {
    columns.push(text.chart.seriesVrm)
    seriesForTable.push(chartData.vrmPoints)
  }
  chartData.groupSeries.forEach((g) => {
    columns.push(text.chart.seriesGroup(g.label, g.index))
    seriesForTable.push(g.points)
  })
  if (chartData.planePoints) {
    columns.push(text.chart.seriesPlane)
    seriesForTable.push(chartData.planePoints)
  }

  const n = chartData.totalPoints.length
  const indices = sampleIndices(n, Math.max(1, Math.round(n / 25)))

  return {
    title: text.chart.caption,
    svg: null,
    table: {
      columns,
      rows: indices.map((i) => [
        fmtEng(chartData.totalPoints[i][0], 'Hz', 4),
        ...seriesForTable.map((points) => fmtRes(points[i][1], 4)),
      ]),
    },
  }
}

export function buildReportSection({
  f, r, chartData, text,
}) {
  if (!r.ok) return null

  const results = [
    { label: text.table.target, ...splitFormatted(fmtRes(r.target.Ztarget)), emphasis: true },
    { label: text.table.maxImpedance, ...splitFormatted(fmtRes(r.maxImpedance)) },
    { label: text.table.underTargetPct, value: text.pct(fmtPct(r.underTargetPct)), unit: null },
    { label: text.table.overBandsCount, value: String(r.overTargetBands.length), unit: null },
    { label: text.table.thresholdUsed, value: fmt(r.threshold, 3), unit: 'dB' },
  ]

  if (r.minLowFreqC != null && Number.isFinite(r.minLowFreqC)) {
    results.push({ label: text.table.minLowFreqC, ...splitFormatted(fmtEng(r.minLowFreqC, 'F', 4)) })
  }

  if (r.droop && !r.droop.error) {
    results.push(
      { label: text.table.droopTotal, ...splitFormatted(fmtVolt(r.droop.total)), emphasis: true },
      { label: text.table.droopC, ...splitFormatted(fmtVolt(r.droop.dVC)) },
      { label: text.table.droopESR, ...splitFormatted(fmtVolt(r.droop.dVESR)) },
      { label: text.table.droopESL, ...splitFormatted(fmtVolt(r.droop.dVESL)) },
    )
  }

  const sortedPeaksValleys = [...r.sweep.peaks, ...r.sweep.valleys].sort((a, b) => a.freq - b.freq)
  sortedPeaksValleys.forEach((c, i) => {
    const kindLabel = c.kind === 'peak' ? text.peakTable.kindPeak : text.peakTable.kindValley
    results.push({
      label: `${kindLabel} ${i + 1}`,
      value: `${fmtEng(c.freq, 'Hz', 4)}, ${fmtRes(c.magnitude)}`
        + `${c.ratioToTarget != null ? `, ${fmt(c.ratioToTarget, 3)}×` : ''}, ${fmt(c.prominence, 3)} dB`,
      unit: null,
    })
  })

  r.groupSrf.forEach((g) => {
    results.push({
      label: `${text.srfTable.heading} — ${g.label || text.srfTable.defaultLabel(g.index)}`,
      value: Number.isFinite(g.srf) ? fmtEng(g.srf, 'Hz', 4) : text.srfTable.unresolved,
      unit: null,
    })
  })

  if (r.hasTolerance && r.toleranceSweep && !r.toleranceSweep.error) {
    results.push(
      { label: text.table.toleranceMinLabel, ...splitFormatted(fmtRes(r.toleranceSweep.min.maxImpedance)) },
      { label: text.table.toleranceNominalLabel, ...splitFormatted(fmtRes(r.toleranceSweep.nominal.maxImpedance)) },
      { label: text.table.toleranceMaxLabel, ...splitFormatted(fmtRes(r.toleranceSweep.max.maxImpedance)) },
    )
  }

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(chartData, text),
  }
}
