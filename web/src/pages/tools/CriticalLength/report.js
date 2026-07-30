// Kritik hat uzunluğu ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

import { fmt, fmtEng } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { epsEffRows } from '../../../components/EpsEffFields'
import { sampleIndices } from '../../../components/LineChart'
import { formFields } from './model'

function inputRows(f, text) {
  const allFields = formFields(f, text.fieldLabels)
  const lengthField = allFields.find((field) => field.key === 'length')

  // Bu iki alanın ekrandaki etiketi text.fieldLabels'takinden farklıdır:
  // fieldLabels yalnızca compute()'un hata mesajlarında kullanılır (model.js),
  // ekranın gerçek alan etiketi text.fields.<key>.label'dadır (index.jsx).
  // divisor ayrıca ham bölen sayısı yerine SelectField'in açıklamalı metnini
  // taşır (text.divisorLabel). Rapor ekranın gösterdiği metni taşımalı —
  // ikisi burada süzülüp aşağıda düzeltilmiş haliyle ekleniyor.
  const generic = allFields
    .filter((field) => field.key !== 'divisor')
    .filter((field) => field.key !== 'length')
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))

  const rows = [...generic]

  if (lengthField && f.length !== '' && f.length != null) {
    rows.push({
      label: text.fields.length.label,
      value: f.length,
      unit: lengthField.unitKey ? f[lengthField.unitKey] : (lengthField.unit ?? null),
    })
  }

  rows.push(
    { label: text.fields.divisor.label, value: text.divisorLabel[f.divisor] ?? f.divisor },
  )

  return rows
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg).
// Sütun başlıkları ve satır seyreltmesi index.jsx'teki <ChartDataTable
// every={6}> ile aynı — orada seri adı da aynen `1/${ser.divisor}` biçimindedir.
// İndeks seçimi ChartDataTable (LineChart.jsx) ile birebir aynı: `every` adımda
// bir örnekle, ama son noktayı (eğrinin sağ ucu/asimptotu) hiçbir zaman atlama.
// Kural `sampleIndices` içinde tek kopya durur — ekran da rapor da onu çağırır.
function chartSection(s, text) {
  if (!s) return null

  const columns = [text.chart.x, ...s.series.map((ser) => `1/${ser.divisor}`)]
  const xs = s.series[0]?.points ?? []
  const rows = sampleIndices(xs.length, 6).map((i) => [
    fmtEng(xs[i][0], 's', 4),
    ...s.series.map((ser) => `${fmt(ser.points[i][1], 4)} mm`),
  ])

  return { title: text.chart.caption, svg: null, table: { columns, rows } }
}

// `lang`: epsEffRows bileşen ortak satırlarını üretmek için zorunludur —
// dört bileşen istisnasından biri olan EpsEffFields'in saf yardımcı
// fonksiyonu, dili doğrudan hook'tan değil parametre olarak alır (bkz.
// EpsEffFields.jsx). Burada geçilmezse satırlar sessizce Türkçeye düşer ve
// İngilizce raporda Türkçe satır çıkar.
export function buildReportSection({ f, r, s, text, lang }) {
  if (!r.ok) return null

  const results = [
    { label: text.bigLabel, ...splitFormatted(fmtEng(r.critical, 'm', 4)), emphasis: true },
    { label: text.table.criticalSelected, ...splitFormatted(fmtEng(r.critical, 'm', 5)) },
    ...r.byDivisor.map((b) => ({
      label: text.table.criticalWith(b.divisor),
      ...splitFormatted(fmtEng(b.critical, 'm', 5)),
    })),
    { label: text.table.tpd, value: fmt(r.tpdPsPerMm, 5), unit: 'ps/mm' },
    { label: text.table.riseTime, ...splitFormatted(fmtEng(r.tr, 's', 5)) },
    { label: text.table.fBW, ...splitFormatted(fmtEng(r.bw.fBW, 'Hz', 5)) },
    { label: text.table.k, value: fmt(r.bw.k, 3), unit: null },
    ...epsEffRows(r.eps, fmt, lang).map((row) => ({ label: row.label, value: row.value })),
  ]

  if (r.hasLength) {
    results.push(
      { label: text.table.length, ...splitFormatted(fmtEng(r.length, 'm', 5)) },
      { label: text.table.delay, ...splitFormatted(fmtEng(r.delay, 's', 5)) },
      { label: text.table.delayFraction, value: fmt(r.delayFraction, 5), unit: null },
      { label: text.table.ratio, value: fmt(r.ratio, 5), unit: null },
      {
        label: text.table.transmissionLine,
        value: r.transmissionLine ? text.table.transmissionLineYes : text.table.transmissionLineNo,
      },
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
    schematicCaption: r.hasLength
      ? (r.transmissionLine ? text.schematic.captionAbove : text.schematic.captionBelow)
      : text.schematic.captionThresholdOnly,
    chart: chartSection(s, text),
  }
}
