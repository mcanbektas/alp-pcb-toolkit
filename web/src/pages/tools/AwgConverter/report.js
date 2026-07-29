// AWG dönüştürücü ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// Bu ekranın yön seçimi (`f.dir` / `r.dir`) TraceWidth/ResistorCode'daki ayrı
// `mode` state'i gibi değil, formun kendi alanı — bu yüzden fonksiyon imzasında
// ayrı bir `mode` parametresi yok. Dönen bölümün `mode` alanı yine de doldurulur
// (yön etiketiyle), diğer pilotlarla aynı sözleşmeyi korumak için.

import { fmt, fmtEng, fmtPct } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { DIR_DIAMETER } from './model'

// Girdi satırları — ekrandaki NumberField'lerin gösterdiği birimle birebir.
// `awg` alanının model.js'teki alan tanımında birim yok (numara birimsiz);
// ekranda sabit "AWG" son eki NumberField'in `unit` prop'undan gelir, bu
// yüzden burada elle eklenir. `tolD` alanı da aynı şekilde: model.js ayrıştırma
// için '%' kullanır ama ekranda gösterilen birim '± %'dir.
function inputRows(f, r, text) {
  const rows = []
  if (r.dir !== DIR_DIAMETER) {
    rows.push({ label: text.fieldLabels.awg, value: f.awg, unit: 'AWG' })
  } else {
    rows.push({ label: text.fieldLabels.d, value: f.d, unit: f.du })
  }
  if (f.tolD !== '' && f.tolD != null) {
    rows.push({ label: text.fieldLabels.tolD, value: f.tolD, unit: '± %' })
  }
  return rows
}

// Çekme toleransı bandı — yalnızca alan doldurulmuş ve hesaplanabilmişse.
// Girilen tolerans geçersizse (ör. %100 ve üzeri) ekran bir uyarı paragrafı
// gösterir; bu metin ayrıca notlara eklenir (bkz. buildReportSection).
function toleranceRows(tol, text) {
  if (!tol || tol.error || !tol.active) return []
  return [
    {
      label: text.tolTable.dMm,
      value: `${fmt(tol.dUnits.min.mm, 5)} · ${fmt(tol.dUnits.nom.mm, 5)} · ${fmt(tol.dUnits.max.mm, 5)} `
        + `(${text.pct(fmtPct(tol.d.minPct, 4))} / ${text.pct(fmtPct(tol.d.maxPct, 4))})`,
    },
    {
      label: text.tolTable.dMil,
      value: `${fmt(tol.dUnits.min.mil, 5)} · ${fmt(tol.dUnits.nom.mil, 5)} · ${fmt(tol.dUnits.max.mil, 5)}`,
    },
    {
      label: text.tolTable.aMm2,
      value: `${fmt(tol.aUnits.min.mm2, 5)} · ${fmt(tol.aUnits.nom.mm2, 5)} · ${fmt(tol.aUnits.max.mm2, 5)} `
        + `(${text.pct(fmtPct(tol.area.minPct, 4))} / ${text.pct(fmtPct(tol.area.maxPct, 4))})`,
    },
    {
      label: text.tolTable.aMil2,
      value: `${fmt(tol.aUnits.min.mil2, 6)} · ${fmt(tol.aUnits.nom.mil2, 6)} · ${fmt(tol.aUnits.max.mil2, 6)}`,
    },
    {
      label: text.tolTable.band,
      value: `${text.tolTable.bandRow(fmt(tol.d.spreadPct, 4), fmt(tol.area.spreadPct, 4))} ${text.tolTable.bandNote}`,
    },
  ]
}

// En yakın standart numara bölümü — dört satır, ekrandaki tabloyla birebir.
function nearestRows(r, text) {
  return [
    {
      label: text.nearest.d,
      value: `${fmt(r.nearest.dUnits.mm, 5)} mm (${fmt(r.nearest.dUnits.mil, 4)} mil)`,
    },
    {
      label: text.nearest.area,
      value: `${fmt(r.nearest.aUnits.mm2, 5)} mm² (${fmt(r.nearest.aUnits.mil2, 6)} mil²)`,
    },
    { label: text.nearest.dDelta, value: text.pct(fmtPct(r.dDeltaPct)) },
    { label: text.nearest.areaDelta, value: text.pct(fmtPct(r.areaDeltaPct)) },
  ]
}

// Komşu standart numaralar — ekrandaki satır listesiyle birebir (değişken uzunluk).
function neighborRows(r, text) {
  return r.neighbors.map((n) => ({
    label: `AWG ${text.awgLabel(n.awg)}${n.awg === r.awgNearest ? ` ${text.neighbors.nearestTag}` : ''}`,
    value: `${fmt(n.dUnits.mm, 4)} mm · ${fmt(n.aUnits.mm2, 4)} mm²`,
  }))
}

// Grafik verisi PDF'te SVG (ReportDialog canlı DOM'dan yakalar), Excel'de ham
// sütun olarak gider (§5.4) — svg alanı burada bilinçli olarak null bırakılır.
function chartSection(s, text) {
  if (!s) return null
  return {
    title: text.sweepCaption[s.param],
    svg: null,
    table: {
      columns: [text.sweepAxis[s.param], text.chartY],
      rows: s.rows
        .filter((_, i) => i % 5 === 0)
        .map((row) => [fmt(row.x, 4), `AWG ${text.awgLabel(row.y)}`]),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const big = r.dir === DIR_DIAMETER
    ? { label: text.bigFromDiameter, value: `AWG ${fmt(r.awgExact, 5)}`, unit: null, emphasis: true }
    : { label: text.bigFromAwg, value: fmt(r.dUnits.mm, 4), unit: 'mm', emphasis: true }

  const tol = r.tolerance

  const results = [
    big,
    { label: 'mm', value: fmt(r.dUnits.mm, 5) },
    { label: 'µm', value: fmt(r.dUnits.um, 5) },
    { label: 'mil', value: fmt(r.dUnits.mil, 5) },
    { label: 'inch', value: fmt(r.dUnits.inch, 5) },
    { label: 'SI', ...splitFormatted(fmtEng(r.d, 'm', 5)) },
    { label: 'mm²', value: fmt(r.aUnits.mm2, 5) },
    { label: 'mil²', value: fmt(r.aUnits.mil2, 6) },
    { label: 'µm²', value: fmt(r.aUnits.um2, 5) },
    { label: 'SI', ...splitFormatted(fmtEng(r.area, 'm²', 5)) },
    ...toleranceRows(tol, text),
    ...nearestRows(r, text),
    ...neighborRows(r, text),
  ]

  // Tolerans girildi ama geçersizse (ör. %100 ve üzeri) ekran bir uyarı
  // paragrafı gösterir; commentary() bu durumu kapsamaz, burada eklenir.
  const notes = tol && tol.error
    ? [...text.commentary(r), { level: 'warn', text: text.toleranceReason(tol.error) }]
    : text.commentary(r)

  return {
    toolName: text.title,
    mode: text.dirLabel[r.dir],
    inputs: inputRows(f, r, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes,
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    chart: chartSection(s, text),
  }
}
