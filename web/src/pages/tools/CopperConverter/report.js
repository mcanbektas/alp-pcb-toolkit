// Bakır kalınlığı dönüştürücü ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// Bu ekranın "mod" düğmesi yoktur (Analiz/Sentez gibi ayrı bir React state'i
// bulunmaz); dallanma `f.source` (bakır ağırlığı / kalınlık / ölçülen bitmiş)
// üzerinden yürür ve zaten `f`/`r` içinde taşınır — bu yüzden fonksiyon
// imzasında ayrı bir `mode` parametresi yoktur. Yine de dönen bölümün
// `mode` alanı, ResistorCode'daki `kind` deseniyle aynı gerekçeyle, hangi
// kaynak yolunun kullanıldığını okunur biçimde taşır.

import { fmt, fmtEng, fmtOhm, fmtPct } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { METHOD_NOMINAL, METHOD_DERIVED } from '../../../lib/copper'
import { sampleIndices } from '../../../components/LineChart'
import { SOURCE_WEIGHT, SOURCE_FINISHED, OZ_CUSTOM, OZ_ROWS } from './model'

// Sol paneldeki girdi alanlarını, ekranda göründükleri sırayla ve aynı
// koşullarla listeler (bkz. index.jsx "Sol: Girdiler").
function inputRows(f, text) {
  const rows = []

  if (f.source === SOURCE_WEIGHT) {
    const ozPickOpt = text.ozPickOptions.find((o) => o.value === f.ozPick)
    rows.push({ label: text.fields.ozPick.label, value: ozPickOpt ? ozPickOpt.label : f.ozPick })
    if (f.ozPick === OZ_CUSTOM) {
      rows.push({ label: text.fields.oz.label, value: f.oz, unit: 'oz/ft²' })
    }
    rows.push({ label: text.fields.method.label, value: text.methodLabel[f.method] })
  } else {
    if (f.source === SOURCE_FINISHED) {
      rows.push({ label: text.fields.finished.label, value: f.finished, unit: f.finishedu })
    }
    if (f.source !== SOURCE_FINISHED || f.layer === 'external') {
      rows.push({ label: text.fields.thickness.label, value: f.thickness, unit: f.thicknessu })
    }
  }

  rows.push({
    label: text.fields.layer.label,
    value: f.layer === 'external' ? text.fields.layer.external : text.fields.layer.internal,
  })

  if (f.source !== SOURCE_FINISHED) {
    rows.push({ label: text.fields.plating.label, value: f.plating, unit: 'µm' })
  }

  rows.push({ label: text.fields.W.label, value: f.W, unit: f.Wu })
  rows.push({ label: text.fields.etch.label, value: f.etch, unit: '%' })
  rows.push({ label: text.fields.T.label, value: f.T, unit: '°C' })

  if (f.tolStart !== '' && f.tolStart != null) {
    rows.push({ label: text.fields.tolStart.label, value: f.tolStart, unit: '± %' })
  }
  if (f.tolPlate !== '' && f.tolPlate != null) {
    rows.push({ label: text.fields.tolPlate.label, value: f.tolPlate, unit: '± %' })
  }
  if (f.tolEtch !== '' && f.tolEtch != null) {
    rows.push({ label: text.fields.tolEtch.label, value: f.tolEtch, unit: '± %' })
  }

  return rows
}

// "Kalınlık" tablosu: µm/mm/mil/inch/oz-nominal, her satır başlangıç · bitmiş.
function thicknessRows(r, text) {
  const pair = (a, b) => `${fmt(a, 4)} · ${fmt(b, 4)}`
  return [
    { label: text.thicknessTable.head, value: text.thicknessTable.headCols },
    { label: 'µm', value: pair(r.units.starting.um, r.units.finished.um) },
    { label: 'mm', value: pair(r.units.starting.mm, r.units.finished.mm) },
    { label: 'mil', value: pair(r.units.starting.mil, r.units.finished.mil) },
    { label: 'inch', value: pair(r.units.starting.inch, r.units.finished.inch) },
    {
      label: text.thicknessTable.ozNominal,
      value: pair(r.units.starting.ozNominal, r.units.finished.ozNominal),
    },
  ]
}

// "Nominal ve türetilmiş" — yalnızca kaynak bakır ağırlığıyken vardır.
function nominalRows(r, text) {
  if (r.nominal == null) return []
  const diffPct = ((r.nominal - r.derived) / r.derived) * 100
  return [
    { label: text.nominalTable.methodUsed, value: text.methodLabel[r.method] },
    { label: text.methodLabel[METHOD_NOMINAL], value: fmt(r.nominal * 1e6, 4), unit: 'µm' },
    { label: text.methodLabel[METHOD_DERIVED], value: fmt(r.derived * 1e6, 4), unit: 'µm' },
    { label: text.nominalTable.difference, value: fmt(diffPct, 3), unit: '%' },
    { label: text.nominalTable.starting, value: fmt(r.units.starting.um, 4), unit: 'µm' },
  ]
}

// "Geriye çözülen kaplama" — yalnızca ölçülen bitmiş kalınlık yolunda vardır.
function platingRows(r, text) {
  if (!r.platingSolved) return []
  const sub = r.layer === 'external' ? text.platingTable.subExternal : text.platingTable.subInternal
  return [
    { label: text.platingTable.plating, value: `${fmt(r.plating * 1e6, 4)} µm ${sub}` },
    { label: text.platingTable.finished, value: fmt(r.units.finished.um, 4), unit: 'µm' },
    { label: text.platingTable.starting, value: fmt(r.units.starting.um, 4), unit: 'µm' },
    { label: text.platingTable.share, value: fmt(r.platingShare * 100, 3), unit: '%' },
  ]
}

// "Üretim için önerilen bakır ağırlığı".
function recommendedRows(r, text) {
  if (!r.recommended) return []
  const rec = r.recommended
  const statusLabel = rec.outOfRange
    ? text.recommendedTable.outOfRange
    : rec.exact
      ? text.recommendedTable.exact
      : text.recommendedTable.nearest
  return [
    { label: `${fmt(rec.oz, 3)} oz/ft²`, value: statusLabel },
    { label: text.recommendedTable.stepThickness, value: fmt(rec.um, 4), unit: 'µm' },
    { label: text.recommendedTable.finished, value: fmt(r.units.finished.um, 4), unit: 'µm' },
    { label: text.recommendedTable.difference, value: fmtPct(rec.deltaPct), unit: '%' },
  ]
}

// "Nominal bakır ağırlığı tablosu" — sabit referans tablosu, önerilen satır
// işaretlenir (ekranda olduğu gibi).
function ozTableRows(r, text) {
  return OZ_ROWS.map((row) => ({
    label: `${fmt(row.oz, 3)} oz/ft²${r.recommended && r.recommended.oz === row.oz ? text.ozTable.recommended : ''}`,
    value: fmt(row.um, 4),
    unit: 'µm',
  }))
}

// "Kesit ve direnç" — her zaman vardır.
function sectionRows(r, text) {
  return [
    { label: text.sectionTable.rectArea, value: fmt(r.rect.area * 1e6, 4), unit: 'mm²' },
    {
      label: text.sectionTable.trapArea,
      value: `${fmt(r.trap.area * 1e6, 4)} mm² (−${text.pct(fmt(r.trap.lossPct, 3))})`,
    },
    {
      label: text.sectionTable.widths,
      value: `${fmtEng(r.trap.Wtop, 'm', 4)} · ${fmtEng(r.trap.Wbottom, 'm', 4)}`,
    },
    { label: text.sectionTable.sheet(fmt(r.T, 3)), ...splitFormatted(`${fmtOhm(r.Rsheet)}/□`) },
    { label: text.sectionTable.sheetTrap, ...splitFormatted(`${fmtOhm(r.RsheetTrap)}/□`) },
  ]
}

// "Üretim toleransı — minimum · nominal · maksimum" — yalnızca en az bir
// tolerans alanı doldurulduğunda (r.tolerance != null) vardır; hatalıysa tek
// uyarı satırı, etkinse dört satırlık üçlü tablo döner.
function toleranceRows(r, text) {
  const tol = r.tolerance
  if (!tol) return []
  if (tol.error) {
    return [{ label: text.toleranceTable.caption, value: text.toleranceReason(tol.error) }]
  }
  if (!tol.active) return []

  const { pct } = text
  return [
    { label: text.toleranceTable.head, value: text.toleranceTable.headCols(tol.corners.length) },
    {
      label: text.toleranceTable.finished,
      value: `${fmt(tol.finished.min * 1e6, 4)} · ${fmt(tol.finished.nom * 1e6, 4)} · `
        + `${fmt(tol.finished.max * 1e6, 4)} (${pct(fmtPct(tol.finished.minPct))} / `
        + `${pct(fmtPct(tol.finished.maxPct))})`,
    },
    {
      label: text.toleranceTable.area,
      value: `${fmt(tol.area.min * 1e6, 4)} · ${fmt(tol.area.nom * 1e6, 4)} · `
        + `${fmt(tol.area.max * 1e6, 4)} (${pct(fmtPct(tol.area.minPct))} / `
        + `${pct(fmtPct(tol.area.maxPct))})`,
    },
    {
      label: text.toleranceTable.sheet,
      value: `${fmtOhm(tol.Rsheet.min)}/□ · ${fmtOhm(tol.Rsheet.nom)}/□ · ${fmtOhm(tol.Rsheet.max)}/□ `
        + `(${pct(fmtPct(tol.Rsheet.minPct))} / ${pct(fmtPct(tol.Rsheet.maxPct))})`,
    },
    {
      label: text.toleranceTable.applied,
      value: text.toleranceTable.appliedValue(
        fmt(tol.tol.starting * 100, 3),
        fmt(tol.tol.plating * 100, 3),
        fmt(tol.tol.etch * 100, 3),
      ),
    },
  ]
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır,
// ReportDialog indirme anında dolduracak (bkz. withCapturedSvg).
function chartSection(r, s, text) {
  if (!s) return null
  return {
    title: text.chart.caption,
    svg: null,
    table: {
      // Ekrandaki <ChartDataTable every={5} .../> ile aynı örnekleme kuralı
      // (sampleIndices): son nokta her zaman dahil. 60 noktalı taramada düz
      // `i % 5` filtresi son satırı (59) düşürüyordu.
      columns: [text.chart.x, text.chart.legend],
      rows: sampleIndices(s.rows.length, 5).map((i) => [fmt(s.rows[i].x, 3), `${fmtOhm(s.rows[i].y)}/□`]),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  return {
    toolName: text.title,
    mode: text.sourceLabel[r.source],
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results: [
      { label: text.bigLabel, value: fmt(r.units.finished.um, 4), unit: 'µm', emphasis: true },
      ...thicknessRows(r, text),
      ...nominalRows(r, text),
      ...platingRows(r, text),
      ...recommendedRows(r, text),
      ...ozTableRows(r, text),
      ...sectionRows(r, text),
      ...toleranceRows(r, text),
    ],
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.plating > 0 ? text.schematic.captionPlated : text.schematic.captionPlain,
    chart: chartSection(r, s, text),
  }
}
