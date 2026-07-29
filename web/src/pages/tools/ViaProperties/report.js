// Via özellikleri ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`s`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.

import {
  fmt, fmtEng, fmtOhm, fmtAmp, fmtVolt, fmtPow, fmtRes,
} from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, MODE_SYNTHESIS } from './model'

// model.js'in `Nmin` alanı yalnızca SI dönüşüm tablosunun anahtarı olarak
// sabit 'adet' taşır (PLAIN = { '': 1, adet: 1 }) — bu, ekranda gösterilen
// birim değil, dahili bir sözcüktür ve hiç çevrilmez. Ekran bu yüzden birimi
// field.unit'ten değil `text.countUnit`'ten okur; rapor da aynı kaynaktan
// okumalı, yoksa İngilizce raporda çıplak 'adet' çıkar (ThermalVia/report.js
// ile aynı desen).
const UNIT_OVERRIDE = { Nmin: (text) => text.countUnit }

function inputRows(mode, f, text) {
  return formFields(mode, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: field.label,
      value: f[field.key],
      unit: field.unitKey
        ? f[field.unitKey]
        : (UNIT_OVERRIDE[field.key]?.(text) ?? field.unit ?? null),
    }))
}

// Ekranda dört ayrı `<Formula title=…>` bloğu var (geometri, paralel via,
// ring/aspect ratio, parazitikler) — TraceWidth/ResistorCode/LengthConverter'ın
// tek `text.formula` dizesinin aksine burada birden çok başlıklı blok
// birleştirilir. Her blok kendi başlık satırıyla açılır, TeknikDetay panelinde
// göründüğü sırayla (geometry → parallel → ring → parasitics).
function formulaLines(text) {
  const blocks = [
    text.formulas.geometry,
    text.formulas.parallel,
    text.formulas.ring,
    text.formulas.parasitics,
  ]
  return blocks.flatMap((block) => [
    block.title,
    ...block.body.split('\n').map((line) => line.trim()).filter(Boolean),
  ])
}

// Sentez modunda ekranda görünen "Paralel via" bölüm tablosu — yalnızca
// r.mode === MODE_SYNTHESIS iken index.jsx'te render edilir.
function parallelRows(r, text) {
  if (r.mode !== MODE_SYNTHESIS) return []
  return [
    { label: text.table.fromCurrent, value: r.Ncurrent, unit: text.pcsWord },
    { label: text.table.fromVoltage, value: r.Nvoltage, unit: text.pcsWord },
    { label: text.table.userMin, value: r.limits.Nmin, unit: text.pcsWord },
    { label: text.table.deciding, value: r.N, unit: text.pcsWord },
    { label: text.table.parallelR, ...splitFormatted(fmtOhm(r.Rparallel)) },
    {
      label: text.table.totalDropLoss,
      value: `${fmtVolt(r.VdropParallel)} · ${fmtPow(r.PlossParallel, 3)}`,
    },
    {
      label: text.table.perViaCurrent,
      value: `${fmtAmp(r.IperVia, 3)} · ${fmt(r.JperVia / 1e6, 3)} A/mm²`,
    },
  ]
}

// Süreksizlik empedansı/gecikmesi yalnızca r.disc doluyken tabloya girer
// (index.jsx'teki {r.disc && (…)} koşuluyla aynı).
function discRows(r, text) {
  if (!r.disc) return []
  return [
    { label: text.table.discZ, ...splitFormatted(fmtRes(r.disc.Z, 4)) },
    { label: text.table.discDelay, ...splitFormatted(fmtEng(r.disc.delay, 's', 4)) },
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır.
// Sütun/satır biçimi ekrandaki ChartDataTable çağrısıyla birebir aynı
// (formatX: fmt(v,2) + adet birimi, formatY: fmtVolt — index.jsx satır ~392-398).
// Örnekleme ekrandaki <ChartDataTable every={2}> ile birebir aynı `sampleIndices`
// saf fonksiyonunu kullanır — yalnızca adımı değil, "son nokta her zaman dahil"
// kuralını da paylaşır, yoksa sweep'in son noktası (asimptotun sağ ucu) rapordan
// sessizce düşer (ThermalVia/report.js ile aynı desen).
function chartSection(r, s, text) {
  if (!s) return null
  const indices = sampleIndices(s.rows.length, 2)
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      columns: [text.chart.x, text.chart.seriesDrop],
      rows: indices.map((i) => [`${fmt(s.rows[i].x, 2)} ${text.countUnit}`, fmtVolt(s.rows[i].y)]),
    },
  }
}

export function buildReportSection({ mode, f, r, s, text }) {
  if (!r.ok) return null

  const big = r.mode === MODE_SYNTHESIS
    ? { label: text.bigResult.synthesis, value: r.N, emphasis: true }
    : { label: text.bigResult.analysis, ...splitFormatted(fmtOhm(r.R)), emphasis: true }

  const results = [
    big,
    { label: text.table.Do, ...splitFormatted(fmtEng(r.Do, 'm', 4)) },
    { label: text.table.area, value: fmt(r.area * 1e6, 4), unit: 'mm²' },
    { label: text.table.resistanceAt(r.T), ...splitFormatted(fmtOhm(r.R)) },
    { label: text.table.vdrop, ...splitFormatted(fmtVolt(r.Vdrop)) },
    { label: text.table.ploss, ...splitFormatted(fmtPow(r.Ploss, 4)) },
    { label: text.table.density, value: fmt(r.J / 1e6, 4), unit: 'A/mm²' },
    ...parallelRows(r, text),
    { label: text.table.nominalRing, ...splitFormatted(fmtEng(r.ring.nominal, 'm', 4)) },
    // Worst-case ring ekranda kırılma durumunda " !" bayrağı taşır
    // (PowerPlane/report.js'teki util>1 bayrağıyla aynı desen); dinamik SI
    // öneki + sabit bayrak metni birlikte tek dizede taşınır, splitFormatted
    // kullanılmaz (bayrak "birim" değildir).
    {
      label: text.table.worstRing,
      value: `${fmtEng(r.ring.worst, 'm', 4)}${r.ring.breakout ? ' !' : ''}`,
    },
    { label: text.table.aspect, value: fmt(r.aspect.ratio, 4) },
    { label: text.table.L, ...splitFormatted(fmtEng(r.L, 'H', 4)) },
    { label: text.table.C, ...splitFormatted(fmtEng(r.C, 'F', 4)) },
    ...discRows(r, text),
  ]

  return {
    toolName: text.title,
    mode: mode === MODE_SYNTHESIS ? text.modeSynthesis : text.modeAnalysis,
    inputs: inputRows(mode, f, text),
    formula: formulaLines(text),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(r, s, text),
  }
}
