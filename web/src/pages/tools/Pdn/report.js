// PDN hedef empedansı ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// Bu ekranda ayrı bir Analiz/Sentez `mode` durumu YOK — dallanma (kaynak,
// eğri/düzlem/loop açık mı) formun kendi alanlarındadır (`f.source`,
// `f.curve`, `f.plane`, `f.loop`). `mode` alanı bu yüzden diğer mod'suz
// ekranlardaki (CriticalLength, Crosstalk, LengthConverter) gibi sabit
// `null` döner.

import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import { formFields, capColumnsA, capColumnsB, ON } from './model'

// Girdi paneli — düz alanlar `formFields`'tan, kapasitör bankası satırları
// (RowList) ayrı eklenir: satır dizisi `formFields`'ta yoktur, ekrandaki gibi
// satır adı + sütun etiketiyle ("Kapasitör 2 — ESR") tek tek listelenir.
//
// Ekranda (index.jsx) RowList vrmR/vrmL'den hemen sonra, düzlem alanlarından
// (area/d/epsR) ve loop alanlarından (eslComp/Lmount/Lvia/Lspread) önce
// çizilir. `key` yalnızca bu bölme noktasını bulmak için tutulur, dönen
// satırlarda görünmez.
function inputRows(f, text) {
  const fieldRows = formFields(f, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))

  const strip = ({ key, ...row }) => row

  if (f.curve !== ON) return fieldRows.map(strip)

  const cols = [...capColumnsA(text.capCols), ...capColumnsB(text.capCols)]
  const rowRows = f.caps.flatMap((row, i) => cols.map((c) => ({
    label: `${text.rowList.rowLabel} ${i + 1} — ${c.label}`,
    value: row[c.key],
    unit: c.unitKey ? row[c.unitKey] : null,
  })))

  const splitAt = fieldRows.findIndex((row) => row.key === 'area' || row.key === 'eslComp')
  const before = splitAt === -1 ? fieldRows : fieldRows.slice(0, splitAt)
  const after = splitAt === -1 ? [] : fieldRows.slice(splitAt)

  return [...before.map(strip), ...rowRows, ...after.map(strip)]
}

// Hedef empedans + ΔV/ΔI bölümü — her zaman var, çünkü r.ok tek başına bu
// bölümün varlığını garanti eder.
function targetResults(r, text) {
  return [
    { label: text.bigResultLabel, ...splitFormatted(fmtRes(r.Ztarget, 4)), emphasis: true },
    { label: text.table.Ztarget, ...splitFormatted(fmtRes(r.Ztarget, 5)) },
    { label: text.table.deltaV, ...splitFormatted(fmtVolt(r.deltaV)) },
    {
      label: text.table.deltaVSource,
      value: r.fromTolerance ? text.table.deltaVFromTol : text.table.deltaVDirect,
    },
    { label: text.table.deltaI, ...splitFormatted(fmtEng(r.deltaI, 'A', 5)) },
    {
      label: text.table.Vrail,
      ...(r.Vrail != null ? splitFormatted(fmtVolt(r.Vrail)) : { value: '—', unit: null }),
    },
    {
      label: text.table.tolerance,
      value: r.tolerancePct != null ? text.pct(fmt(r.tolerancePct, 4)) : '—',
    },
    { label: text.table.profile, value: r.flatTarget ? text.table.profileNone : '—' },
  ]
}

// Düzlem kapasitesi bölümü — yalnızca f.curve === ON && f.plane === ON iken var.
function planeResults(r, text) {
  if (!r.plane) return []
  const p = r.plane
  return [
    { label: text.table.planeC, ...splitFormatted(fmtEng(p.C, 'F', 5)) },
    { label: text.table.planeArea, value: fmt(p.area * 1e4, 4), unit: 'cm²' },
    { label: text.table.planeD, ...splitFormatted(fmtEng(p.d, 'm', 4)) },
    { label: text.table.planeEps, value: fmt(p.epsR, 4) },
    { label: text.table.fringing, value: p.fringingIncluded ? text.yes : text.no },
  ]
}

// Bağlı loop endüktansı bölümü — yalnızca f.loop === ON iken var. Ekranda her
// terim "değer (pay%)" biçiminde tek hücrede gösterildiği için burada da tek
// dize olarak birleştirilir (ResistorCode/Decoupling'deki aynı desen).
function loopResults(r, text) {
  if (!r.loop) return []
  const l = r.loop
  return [
    { label: text.table.loopTotal, ...splitFormatted(fmtEng(l.total, 'H', 5)) },
    {
      label: text.table.loopComponent,
      value: `${fmtEng(l.eslComponent, 'H', 4)} (${text.pct(fmt(l.shares.component * 100, 3))})`,
    },
    {
      label: text.table.loopMount,
      value: `${fmtEng(l.Lmount, 'H', 4)} (${text.pct(fmt(l.shares.mount * 100, 3))})`,
    },
    {
      label: text.table.loopVia,
      value: `${fmtEng(l.Lvia, 'H', 4)} (${text.pct(fmt(l.shares.via * 100, 3))})`,
    },
    {
      label: text.table.loopSpread,
      value: `${fmtEng(l.Lspread, 'H', 4)} (${text.pct(fmt(l.shares.spread * 100, 3))})`,
    },
    { label: text.table.loopDominant, value: text.loopTermLabel[r.dominant] },
  ]
}

// PDN eğrisi bölümü — yalnızca f.curve === ON iken var.
function curveResults(r, text) {
  if (!r.curve) return []
  const c = r.curve
  const sw = c.sweep

  let worstVal = sw.worst
    ? `${fmtRes(sw.worst.mag, 4)} @ ${fmtEng(sw.worst.f, 'Hz', 3)}`
    : '—'
  if (!c.fOpInSweep) worstVal += ` (${text.fopOutsideNote})`

  return [
    { label: text.table.fOp, ...splitFormatted(fmtEng(c.fOp, 'Hz', 5)) },
    { label: text.table.zAtFop, ...splitFormatted(fmtRes(c.z.mag, 5)) },
    { label: text.table.belowTarget, value: r.belowTarget ? text.yes : text.no },
    {
      label: text.table.capsOnly,
      ...(c.z.capsMag != null ? splitFormatted(fmtRes(c.z.capsMag, 5)) : { value: '—', unit: null }),
    },
    { label: text.table.inductiveAtFop, value: c.z.inductive ? text.yes : text.no },
    { label: text.table.worstPoint, value: worstVal },
    {
      label: text.table.exceedBands,
      value: `${fmt(sw.bands.length, 2)} (${fmt(sw.exceedCount, 3)} / ${fmt(sw.total, 3)} ${text.table.pointsWord})`,
    },
    { label: text.table.loopIncluded, value: c.z.mountingIncluded ? text.yes : text.no },
    { label: text.table.losslessPlane, value: c.z.losslessPlane ? text.yes : text.table.noPlane },
    { label: text.table.capCount, value: `${fmt(c.capCount, 4)} ${text.table.pcsWord}` },
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır.
// `s.rows` (= r.curve.sweep.rows) HAM (log dönüşümsüz) değer taşır; log10
// dönüşümü yalnızca `buildSweep`'in çizim için ürettiği `points`/`capPoints`
// alanındadır, bu yüzden burada Math.pow ile geri çevirmeye gerek yok.
// Örnekleme `sampleIndices` ile yapılır — index.jsx'teki
// <ChartDataTable every={8}> ile AYNI kuralı (her 8. nokta + son nokta her
// zaman dahil) paylaşır; iki yer ayrı ayrı `i % 8 === 0` yazsaydı SWEEP_STEPS
// değişince sessizce ayrışabilirdi.
function chartSection(s, text) {
  if (!s) return null
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      columns: s.hasCaps
        ? [text.chart.x, text.chart.seriesPdn, text.chart.seriesCaps]
        : [text.chart.x, text.chart.seriesPdn],
      rows: sampleIndices(s.rows.length, 8).map((i) => {
        const row = s.rows[i]
        return s.hasCaps
          ? [fmtEng(row.x, 'Hz', 3), fmtRes(row.y, 4), fmtRes(row.capsY, 4)]
          : [fmtEng(row.x, 'Hz', 3), fmtRes(row.y, 4)]
      }),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results: [
      ...targetResults(r, text),
      ...planeResults(r, text),
      ...loopResults(r, text),
      ...curveResults(r, text),
    ],
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: text.schematic.caption,
    chart: chartSection(s, text),
  }
}
