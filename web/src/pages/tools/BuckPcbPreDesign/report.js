// Buck dönüştürücü PCB ön tasarım aracı ekranının rapor bölümü. Saf: React,
// DOM, ağ bilmez. docs/uyelik-ve-rapor-plani.md §5.2 — mevcut index.jsx'e
// dokunmadan, aynı `r`/`s`/`text` kaynağından aynı satırları üretir.

import {
  fmt, fmtEng, fmtAmp, fmtPow, fmtVolt,
} from '../../../lib/num'
import { splitFormatted } from '../../../lib/reportPayload'
import { sampleIndices } from '../../../components/LineChart'
import {
  formFields, TOPOLOGY_SYNC, BUCK_MODE_DCM, SWEEP_VIN_DUTY,
} from './model'

const fmtH = (x, sig = 3) => fmtEng(x, 'H', sig)
const fmtF = (x, sig = 3) => fmtEng(x, 'F', sig)
const fmtCTemp = (x, sig = 3) => `${fmt(x, sig)} °C`

// `topology`/`gndJoin` formFields'ta yok — compute() onları doğrulamaz, motora
// hiç gitmez (gndJoin) ya da hangi alt-blok formFields'ının aktif olacağını
// belirler (topology) — ama ekranda görünen birer Segmented/SelectField'tır.
// VoltageDivider/report.js'teki `series` deseniyle aynı gerekçeyle elle eklenir.
function inputRows(f, text) {
  const extra = [
    {
      label: text.fields.topology.label,
      value: f.topology === TOPOLOGY_SYNC ? text.fields.topologySync : text.fields.topologyAsync,
    },
    { label: text.fields.gndJoin.label, value: text.gndJoinLabel(f.gndJoin) },
  ]

  return [
    ...extra,
    ...formFields(f, text.fieldLabels)
      .filter((field) => f[field.key] !== '' && f[field.key] != null)
      .map((field) => ({
        label: field.label,
        value: f[field.key],
        // powerViaCount'ta model.js sabit 'adet' taşır (COUNT tablosu, birim
        // seçici yok) — dil bilmez. index.jsx aynı alanı text.countUnit ile
        // çözüyor (NumberField), sonuçlar bloğundaki powerViaCount satırı da
        // (aşağıda) aynı kaynağı kullanıyor; burası da aynı desene uymalı,
        // yoksa İngilizce raporda da "adet" basılır.
        unit: field.unitKey
          ? f[field.unitKey]
          : (field.key === 'powerViaCount' ? text.countUnit : (field.unit ?? null)),
      })),
  ]
}

function chartSection(s, text) {
  if (!s) return null
  const hasApprox = s.param === SWEEP_VIN_DUTY && !!s.pointsApprox

  const columns = [
    text.sweepAxis[s.param],
    hasApprox ? text.seriesIdeal : text.sweepLabel[s.param],
  ]
  if (hasApprox) columns.push(text.seriesApprox)

  return {
    title: text.sweepCaption[s.param],
    svg: null,
    table: {
      columns,
      rows: sampleIndices(s.rows.length, 8).map((i) => {
        const row = s.rows[i]
        const cols = [fmt(row.x, 3), fmt(row.y, 3)]
        if (hasApprox) cols.push(Number.isFinite(row.yApprox) ? fmt(row.yApprox, 3) : '—')
        return cols
      }),
    },
  }
}

export function buildReportSection({ f, r, s, text }) {
  if (!r.ok) return null

  const results = [
    { label: text.table.dutyIdeal, value: fmt(r.duty.ideal, 4), emphasis: true },
  ]
  if (r.duty.approx != null) {
    results.push({ label: text.table.dutyApprox, value: fmt(r.duty.approx, 4) })
  }

  results.push(
    { label: text.table.lRequired, ...splitFormatted(fmtH(r.inductor.required)) },
  )
  if (r.inductor.chosen != null) {
    results.push({ label: text.table.lChosen, ...splitFormatted(fmtH(r.inductor.chosen)) })
  }
  results.push(
    { label: text.table.deltaIL, ...splitFormatted(fmtAmp(r.inductor.deltaIL, 3)) },
    { label: text.table.rippleRatio, value: fmt(r.inductor.rippleRatio, 3) },
    { label: text.table.iLPeak, ...splitFormatted(fmtAmp(r.inductor.peak, 4)) },
    { label: text.table.iLMin, ...splitFormatted(fmtAmp(r.inductor.min, 4)) },
    { label: text.table.iLRms, ...splitFormatted(fmtAmp(r.inductor.rms, 4)) },
    { label: text.table.iOutBoundary, ...splitFormatted(fmtAmp(r.inductor.boundaryCurrent, 4)) },
    { label: text.table.mode, value: r.inductor.mode === BUCK_MODE_DCM ? text.modeLabel.dcm : text.modeLabel.ccm },
    { label: text.table.inductorLoss, ...splitFormatted(fmtPow(r.inductor.copperLoss, 3)) },
  )

  if (r.outputRipple) {
    results.push(
      { label: text.table.deltaVC, ...splitFormatted(fmtVolt(r.outputRipple.deltaVC)) },
      { label: text.table.deltaVEsr, ...splitFormatted(fmtVolt(r.outputRipple.deltaVEsr)) },
      { label: text.table.deltaVTotal, ...splitFormatted(fmtVolt(r.outputRipple.total)) },
    )
  }
  if (r.outputCapacitance) {
    results.push({ label: text.table.cOutMin, ...splitFormatted(fmtF(r.outputCapacitance.min)) })
  }
  results.push({ label: text.table.iCinRms, ...splitFormatted(fmtAmp(r.inputCapacitor.rmsCurrent, 3)) })

  if (r.conduction.highSide) {
    results.push({ label: text.table.hsCondLoss, ...splitFormatted(fmtPow(r.conduction.highSide.loss, 3)) })
  }
  if (r.conduction.lowSide) {
    results.push({ label: text.table.lsCondLoss, ...splitFormatted(fmtPow(r.conduction.lowSide.loss, 3)) })
  }
  if (r.switching) {
    results.push({ label: text.table.switchingLoss, ...splitFormatted(fmtPow(r.switching.loss, 3)) })
  }
  if (r.gate) {
    results.push({ label: text.table.gateHs, ...splitFormatted(fmtPow(r.gate.hs, 3)) })
    if (r.gate.ls != null) {
      results.push({ label: text.table.gateLs, ...splitFormatted(fmtPow(r.gate.ls, 3)) })
    }
    results.push({ label: text.table.gateTotal, ...splitFormatted(fmtPow(r.gate.total, 3)) })
  }
  if (r.diode) {
    results.push(
      { label: text.table.diodeAvg, ...splitFormatted(fmtAmp(r.diode.avgCurrent, 3)) },
      { label: text.table.diodeCond, ...splitFormatted(fmtPow(r.diode.conductionLoss, 3)) },
    )
    if (r.diode.reverseRecoveryLoss != null) {
      results.push({ label: text.table.diodeRr, ...splitFormatted(fmtPow(r.diode.reverseRecoveryLoss, 3)) })
    }
  }
  if (r.deadTime) {
    results.push({ label: text.table.deadTimeLoss, ...splitFormatted(fmtPow(r.deadTime.loss, 3)) })
  }

  if (r.thermal.highSide != null) {
    results.push({ label: text.table.tjHs, ...splitFormatted(fmtCTemp(r.thermal.highSide)) })
  }
  if (r.thermal.lowSide != null) {
    results.push({ label: text.table.tjLs, ...splitFormatted(fmtCTemp(r.thermal.lowSide)) })
  }
  if (r.thermal.inductor != null) {
    results.push({ label: text.table.tjInductor, ...splitFormatted(fmtCTemp(r.thermal.inductor)) })
  }

  results.push({ label: text.table.totalLoss, ...splitFormatted(fmtPow(r.totalLossApprox, 3)) })

  if (r.layout.hotLoopPerimeter != null) {
    results.push({ label: text.table.hotLoopPerimeter, ...splitFormatted(fmtEng(r.layout.hotLoopPerimeter, 'm', 3)) })
  }
  if (r.layout.switchNodeArea != null) {
    results.push({ label: text.table.switchNodeArea, ...splitFormatted(fmtEng(r.layout.switchNodeArea, 'm²', 3)) })
  }
  if (r.layout.capToFetDistance != null) {
    results.push({ label: text.table.capToFetDistance, ...splitFormatted(fmtEng(r.layout.capToFetDistance, 'm', 3)) })
  }
  if (r.layout.gateLoopLength != null) {
    results.push({ label: text.table.gateLoopLength, ...splitFormatted(fmtEng(r.layout.gateLoopLength, 'm', 3)) })
  }
  if (r.layout.feedbackDistance != null) {
    results.push({ label: text.table.feedbackDistance, ...splitFormatted(fmtEng(r.layout.feedbackDistance, 'm', 3)) })
  }
  if (r.layout.powerViaCount != null) {
    results.push({ label: text.table.powerViaCount, value: fmt(r.layout.powerViaCount, 3), unit: text.countUnit })
  }

  return {
    toolName: text.title,
    mode: null,
    inputs: inputRows(f, text),
    formula: text.formula.split('\n').map((line) => line.trim()).filter(Boolean),
    results,
    notes: text.commentary(r),
    schematicSvg: null, // ReportDialog canlı DOM'dan yakalar
    schematicCaption: r.isSync ? text.schematic.captionSync : text.schematic.captionAsync,
    chart: chartSection(s, text),
  }
}
