// EMC LC, Pi ve Ortak Mod Filtre Tasarım Aracı — rapor bölümü.
// Saf: React, DOM, ağ bilmez. Ekranla aynı `r`/`s`/`text` kaynağından aynı
// satırları üretir; ekranla rapor arasındaki kayma riski böylece en aza iner.
//
// Kararlar §3.3 "tek skor YOK" politikası raporda da geçerlidir: damping
// adayları burada da ağırlıklı bir skor ya da "önerilen" etiketi taşımadan,
// ekrandaki r.candidates dizisinin aynısından satır satır yazılır.

import { fmt, fmtEng, fmtRes, fmtWatt } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import {
  formFields, candidateFields, TOPOLOGY_PI, TOPOLOGY_CM,
  CHART_GAIN, CHART_ZOUT, CHART_COMPARE,
} from './model'

const fmtHz = (x) => fmtEng(x, 'Hz', 4)

function topologyValueLabel(topology, text) {
  if (topology === TOPOLOGY_PI) return text.fields.topologyPi
  if (topology === TOPOLOGY_CM) return text.fields.topologyCm
  return text.fields.topologyLc
}

// formFields yalnızca sayısal/birimli alanları kapsar; topology kapalı
// seçenekli düz bir dizedir ve damping adayları ayrı bir dizidir (Divider/
// ReturnPathStitchingVia'daki kapalı-seçenek alanlarıyla aynı gerekçeyle
// formFields dışında elle eklenir).
function inputRows(f, text) {
  const extra = [
    { label: text.fields.topology.label, value: topologyValueLabel(f.topology, text) },
  ]

  const fieldRows = formFields(f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))

  const candidateRows = f.candidates.flatMap((c, i) => (
    candidateFields(text.fieldLabels)
      .map((field) => ({
        label: `${text.candidates.candidateLabel(i + 1)} — ${field.label}`,
        value: c[field.key],
        unit: field.unitKey ? c[field.unitKey] : (field.unit ?? null),
      }))
      .filter((item) => item.value !== '' && item.value != null)
  ))

  return [...extra, ...fieldRows, ...candidateRows]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider — svg alanı burada bilinçli olarak null bırakılır.
// Örnekleme ekrandaki <ChartDataTable every={10}> ile birebir aynı
// `sampleIndices` fonksiyonunu kullanır (son nokta her zaman dahil).
function chartSection(s, text) {
  if (!s) return null
  const indices = sampleIndices(s.freqs.length, 10)
  const xLabel = text.chart.axisFreq
  const row = (i, ...cols) => [fmt(s.freqs[i], 3), ...cols]

  if (s.param === CHART_GAIN) {
    return {
      title: text.chart.caption[s.param],
      svg: null,
      table: {
        columns: [xLabel, text.chart.seriesGain, text.chart.seriesIl],
        rows: indices.map((i) => row(i, fmt(s.gainDb[i], 4), fmt(s.ilDb[i], 4))),
      },
    }
  }

  if (s.param === CHART_ZOUT) {
    return {
      title: text.chart.caption[s.param],
      svg: null,
      table: {
        columns: [xLabel, text.chart.seriesZout],
        rows: indices.map((i) => row(i, fmt(s.zOut[i], 4))),
      },
    }
  }

  if (s.param === CHART_COMPARE) {
    return {
      title: text.chart.caption[s.param],
      svg: null,
      table: {
        columns: [
          xLabel,
          ...s.rows.map((r, i) => (i === 0 ? text.chart.seriesUndamped : text.chart.seriesCandidate(i))),
        ],
        rows: indices.map((i) => row(i, ...s.rows.map((r) => fmt(r.gainDb[i], 4)))),
      },
    }
  }

  // CHART_TOLERANCE
  return {
    title: text.chart.caption[s.param],
    svg: null,
    table: {
      columns: [xLabel, text.chart.seriesNominal, text.chart.seriesWorstMin, text.chart.seriesWorstMax],
      rows: indices.map((i) => row(i, fmt(s.nominal[i], 4), fmt(s.worstMin[i], 4), fmt(s.worstMax[i], 4))),
    },
  }
}

export function buildReportSection({
  f, r, s = null, text,
}) {
  if (!r.ok) return null

  const results = [
    { label: text.table.idealPair[r.idealPairs[0].key], ...splitFormatted(fmtHz(r.idealPairs[0].f0)), emphasis: true },
  ]

  r.idealPairs.forEach((p) => {
    results.push({ label: `${text.table.idealPair[p.key]} — Z0`, ...splitFormatted(fmtRes(p.z0)) })
  })

  results.push(
    { label: text.table.zIn, ...splitFormatted(fmtRes(r.zIn.rInNeg)) },
    { label: text.table.pIn, ...splitFormatted(fmtWatt(r.zIn.pIn)) },
    { label: text.table.zOutNoise, ...splitFormatted(fmtRes(r.zOutAtNoise)) },
  )

  if (r.cm != null) results.push({ label: text.table.cmImpedance, ...splitFormatted(fmtRes(r.cm)) })
  if (r.dm != null) results.push({ label: text.table.dmImpedance, ...splitFormatted(fmtRes(r.dm)) })

  // Damping adayları — kararlar §3.3: skor/sıralama sütunu YOK, ekrandaki
  // aynı r.candidates dizisinden ham metrik + uygunluk satır satır yazılır.
  r.candidates.forEach((c, i) => {
    const name = i === 0 ? text.candidates.undamped : text.candidates.candidateLabel(i)
    results.push(
      { label: `${name} — G_peak,dB`, value: `${fmt(c.gPeakDb, 3)} dB` },
      { label: `${name} — A_target,dB`, value: `${fmt(c.aTargetDb, 3)} dB` },
      { label: `${name} — P_R_D`, ...splitFormatted(fmtWatt(c.pRD)) },
      { label: `${name} — K_Z`, value: fmt(c.kZ, 4) },
      {
        label: `${name} — ${text.candidates.col.f3db}`,
        value: c.f3dbActual != null ? fmtHz(c.f3dbActual) : '—',
      },
      {
        label: `${name} — ${text.candidates.col.inRegion}`,
        value: c.meetsAll ? text.candidates.yes : text.candidates.no,
      },
    )
  })

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption(r.topology),
    chart: chartSection(s, text),
  }
}
