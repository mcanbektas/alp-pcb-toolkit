// Diferansiyel çift ekranının rapor bölümü. Saf: React, DOM, ağ bilmez.
// docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e dokunmadan, aynı
// `r`/`fs`/`text` kaynağından aynı satırları üretir; ekranla rapor arasındaki
// kayma riski (plan §8 R6) böylece en aza iner.
//
// F2: çiftin sayıları alan çözücüden gelir ve rapora da çözücüden girer.
// `fs` çözücünün BİTMİŞ ve hatasız sonucudur (yoksa null): rapor indirme
// anında çözüm hâlâ sürüyorsa çift satırları rapora girmez, kapalı form tek
// uçlu taban ve "hesaplanıyor" notu girer — sayı uydurulmaz.

import { fmt, fmtEng, fmtRes } from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { formFields, MODE_SYNTHESIS, STRUCT_MICROSTRIP, STRUCT_STRIPLINE } from './model'

// formFields() (model.js) etiketleri hata mesajı amaçlı genel `fieldLabels`
// sözlüğünden alır; index.jsx H için yapıya göre ayrı bir metin seçer. Rapor
// ekranla aynı satırı göstersin diye (plan §8 R6) burada aynı koşulla
// yeniden etiketlenir.
function labelFor(field, f, text) {
  if (field.key === 'H') {
    return f.structure === STRUCT_MICROSTRIP ? text.fields.HMicrostrip : text.fields.HStripline
  }
  return field.label
}

function inputRows(f, mode, text) {
  return formFields(f, mode, text.fieldLabels)
    .filter((field) => f[field.key] !== '' && f[field.key] != null)
    .map((field) => ({
      label: labelFor(field, f, text),
      value: f[field.key],
      unit: field.unitKey ? f[field.unitKey] : (field.unit ?? null),
    }))
}

export function buildReportSection({ mode, f, r, text, fs }) {
  if (!r.ok) return null

  // W sabit sentezde S çözücüden gelir (ekranla aynı kaynak)
  const sFinal = r.S ?? (fs ? fs.S : null)

  const big = r.mode === MODE_SYNTHESIS
    ? (r.solvedFor === 'S'
      ? {
        label: text.bigResultSpacing,
        ...(fs ? splitFormatted(fmtEng(fs.S, 'm', 4)) : { value: text.bigResultPending }),
        emphasis: true,
      }
      : { label: text.bigResultWidth, ...splitFormatted(fmtEng(r.W, 'm', 4)), emphasis: true })
    : {
      label: text.bigResultZdiff,
      ...(fs ? splitFormatted(fmtRes(fs.Zdiff, 4)) : { value: text.bigResultPending }),
      emphasis: true,
    }

  const results = [
    big,
    ...(fs
      ? [
        { label: text.table.zdiff, ...splitFormatted(fmtRes(fs.Zdiff, 5)) },
        { label: text.table.zodd, ...splitFormatted(fmtRes(fs.Zodd, 5)) },
        { label: text.table.zeven, ...splitFormatted(fmtRes(fs.Zeven, 5)) },
        { label: text.table.zcommon, ...splitFormatted(fmtRes(fs.Zcommon, 5)) },
        { label: text.table.epsEffOdd, value: fmt(fs.epsEffOdd, 5) },
        { label: text.table.epsEffEven, value: fmt(fs.epsEffEven, 5) },
        { label: text.table.tpdOdd, value: fmt(fs.tpdOdd * 1e9, 4), unit: 'ps/mm' },
        { label: text.table.tpdEven, value: fmt(fs.tpdEven * 1e9, 4), unit: 'ps/mm' },
        { label: text.solver.rowConv, value: text.pct(fmt(fs.convergence.coarsePct, 2)) },
      ]
      : []),
    { label: text.table.z0, ...splitFormatted(fmtRes(r.Z0, 5)) },
    { label: text.table.twiceZ0, ...splitFormatted(fmtRes(2 * r.Z0, 5)) },
    ...(sFinal != null ? [{ label: text.table.ratio, value: fmt(sFinal / r.H, 4) }] : []),
    {
      label: text.table.geometry,
      value: `${fmtEng(r.W, 'm', 4)} · ${sFinal != null ? fmtEng(sFinal, 'm', 4) : text.bigResultPending}`,
    },
    ...(fs ? [{ label: text.solver.rowMethod, value: fs.model }] : []),
  ]

  // Yorumlar ekranla aynı kaynaktan: commentary useFieldSolver durum zarfı
  // bekler; rapor anındaki durum fs'ten kurulur.
  const solverState = fs
    ? { status: 'done', result: fs }
    : { status: 'idle', result: null }

  return {
    toolName: text.title,
    mode: mode === MODE_SYNTHESIS ? text.modeSynthesis : text.modeAnalysis,
    inputs: inputRows(f, mode, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r, solverState),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.structure === STRUCT_STRIPLINE ? text.schematic.captionStripline : text.schematic.captionMicrostrip,
    chart: null, // F2: ampirik eğri söküldü; çözücü taraması F3 (karar dosyası)
  }
}
