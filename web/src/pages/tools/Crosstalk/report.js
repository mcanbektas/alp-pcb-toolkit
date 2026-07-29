// Crosstalk kestirimi ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// Bu ekranda mod anahtarı (Analiz/Sentez gibi) yoktur — FEXT segmentli
// seçimi (`f.fextMode`) form alanının kendisidir, formFields() bunu zaten
// koşullu epsOdd/epsEven alanlarıyla `inputs` listesine yansıtır; ayrı bir
// `mode` parametresi eklemek TraceWidth/ResistorCode'daki gerçek mod
// ayrımını taklit eder ama burada karşılığı yoktur.
//
// `lang` ek parametredir: εeff kaynağı satırları `epsEffRows(eps, fmt, lang)`
// ile üretilir (bkz. components/EpsEffFields.jsx) ve bu fonksiyon dili
// zorunlu parametre olarak alır — varsayılanı yoktur.

import { fmt, fmtEng, fmtRes } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { epsEffRows } from '../../../components/EpsEffFields'
import { formFields } from './model'

function inputRows(f, text) {
  return formFields(f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

// FEXT bloğu: ekrandaki iki dallanmanın (hesaplandı / hesaplanmadı) aynısı.
function fextRows(r, text) {
  if (!r.fext.available) {
    return [
      { label: text.table.fextHead, value: text.table.fextNotComputed },
      { label: text.table.reason, value: text.table.reasonNoModal },
    ]
  }
  return [
    { label: text.table.fextHead, value: text.table.fextComputed },
    {
      label: text.table.modalEps,
      value: `${fmt(r.fext.epsEffOdd, 4)} · ${fmt(r.fext.epsEffEven, 4)}`,
    },
    { label: text.table.modalDelayDiff, ...splitFormatted(fmtEng(r.fext.modalDelayDiff, 's', 5)) },
    { label: text.table.Vfext, ...splitFormatted(fmtEng(r.fext.Vfext, 'V', 5)) },
    { label: text.table.fextPct, value: text.pct(fmt(r.fext.fextPct, 5)) },
    {
      label: text.table.homogeneous,
      value: r.fext.homogeneous ? text.table.homogeneousYes : text.no,
    },
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır.
// Sütun/satır biçimi ekrandaki ChartDataTable'ın formatX/formatY'siyle
// birebir aynı olmalı: x sabit 'mm' soneki taşır, y ise fmtEng ile dinamik
// SI önekiyle yazılır (ekranda da öyle). Seri adı da ekrandaki gibi literal
// 'V_NEXT'tir — text.chart.y değil (o yalnızca eksen başlığıdır).
function chartSection(r, s, text) {
  if (!s) return null
  // ChartDataTable (LineChart.jsx) ile birebir aynı örnekleme kuralı: her 6
  // noktada bir satır, artı son nokta (eğrinin doyum noktaya yakın kuyruğu)
  // dizinde yoksa zorla eklenir. Yalnızca modulo alınırsa son satır düşer.
  const indices = []
  for (let i = 0; i < s.rows.length; i += 6) indices.push(i)
  if (indices[indices.length - 1] !== s.rows.length - 1) indices.push(s.rows.length - 1)
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      columns: [text.chart.x, 'V_NEXT'],
      rows: indices.map((i) => {
        const row = s.rows[i]
        return [`${fmt(row.x, 4)} mm`, fmtEng(row.y, 'V', 4)]
      }),
    },
  }
}

export function buildReportSection({ f, r, s, text, lang }) {
  if (!r.ok) return null

  const results = [
    { label: text.bigLabel, ...splitFormatted(fmtEng(r.Vnext, 'V', 4)), emphasis: true },
    { label: text.table.Kb, value: fmt(r.Kb, 5) },
    { label: text.table.Vnext, ...splitFormatted(fmtEng(r.Vnext, 'V', 5)) },
    { label: text.table.nextPct, value: text.pct(fmt(r.nextPct, 5)) },
    { label: text.table.Lsat, ...splitFormatted(fmtEng(r.Lsat, 'm', 5)) },
    { label: text.table.saturated, value: r.saturated ? text.yes : text.no },
    { label: text.table.scale, value: fmt(r.scale, 5) },
    { label: text.table.nextDuration, ...splitFormatted(fmtEng(r.nextDuration, 's', 5)) },
    { label: text.table.coupledLength, ...splitFormatted(fmtEng(r.coupledLength, 'm', 5)) },
    { label: text.table.Vagg, ...splitFormatted(fmtEng(r.Vagg, 'V', 5)) },
    { label: text.table.riseTime, ...splitFormatted(fmtEng(r.tr, 's', 5)) },
    // Ekranda da çevrilmemiş, literal etiket (index.jsx satır 212).
    { label: 'Z_even · Z_odd', value: `${fmtRes(r.Zeven, 4)} · ${fmtRes(r.Zodd, 4)}` },
    { label: text.table.geomHead, value: r.geom.satisfied ? text.table.geomOk : text.table.geomFail },
    { label: text.table.swRatio, value: fmt(r.geom.ratio, 5) },
    { label: text.table.required, ...splitFormatted(fmtEng(r.geom.required, 'm', 5)) },
    {
      label: text.table.enteredSW,
      value: `${fmtEng(r.S, 'm', 4)} · ${fmtEng(r.W, 'm', 4)}`,
    },
    ...fextRows(r, text),
    { label: text.table.methodHead, value: r.method },
    { label: text.table.multiconductor, value: r.multiconductorModel ? text.yes : text.no },
    ...epsEffRows(r.eps, fmt, lang),
    { label: text.table.tpd, value: fmt(r.tpdPsPerMm, 5), unit: 'ps/mm' },
  ]

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(r, s, text),
  }
}
