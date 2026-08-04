import { useMemo, useRef, useState } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import ToolHeader from '../../../components/ToolHeader'
import ResultPanel from '../../../components/ResultPanel'
import Commentary from '../../../components/Commentary'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtAmp, fmtPow, fmtVolt } from '../../../lib/num'
import BuckSchematic from './schematic'
import {
  INITIAL_FORM,
  SWEEP_PARAMS, SWEEP_VIN_DUTY, SWEEP_VIN_RIPPLE, SWEEP_L_PEAK, SWEEP_FSW_LOSS, SWEEP_IOUT_LOSS,
  TOPOLOGY_ASYNC, TOPOLOGY_SYNC,
  GND_JOIN_STAR, GND_JOIN_PLANE, GND_JOIN_SPLIT,
  BUCK_MODE_DCM,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const V_UNITS = ['V', 'mV']
const A_UNITS = ['A', 'mA']
const FREQ_UNITS = ['kHz', 'Hz', 'MHz']
const IND_UNITS = ['µH', 'nH', 'mH', 'H']
const RES_UNITS = ['Ω', 'mΩ', 'kΩ']
const CAP_UNITS = ['µF', 'nF', 'pF']
const CHARGE_UNITS = ['nC', 'pC', 'µC']
const TIME_UNITS = ['ns', 'ps', 'µs']
const THERMAL_UNITS = ['°C/W', 'K/W']
const LEN_UNITS = ['mm', 'µm', 'mil']
const AREA_UNITS = ['mm²', 'cm²', 'µm²']

const fmtH = (x, sig = 3) => fmtEng(x, 'H', sig)
const fmtF = (x, sig = 3) => fmtEng(x, 'F', sig)
const fmtCTemp = (x, sig = 3) => `${fmt(x, sig)} °C`
const axisEng = (v) => fmtEng(v, '', 3).replace(' ', '')

export default function BuckPcbPreDesign() {
  const [sweepParam, setSweepParam] = useState(SWEEP_VIN_DUTY)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  const saved = useSavedCalculation({
    toolKey: 'buck-pcb-pre-design', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const notes = useMemo(() => text.commentary(r), [r, text])
  const s = useMemo(() => buildSweep(r, sweepParam), [r, sweepParam])

  const reportSection = useMemo(() => buildReportSection({ f, r, s, text }), [f, r, s, text])
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const isSync = f.topology === TOPOLOGY_SYNC

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, ui])

  const chartSeries = !s ? [] : sweepParam === SWEEP_VIN_DUTY && s.pointsApprox
    ? [
      { key: 'ideal', name: text.seriesIdeal, tone: toneClass(0), points: s.points },
      { key: 'approx', name: text.seriesApprox, tone: toneClass(1), points: s.pointsApprox },
    ]
    : [{ key: sweepParam, name: text.sweepLabel[sweepParam], tone: toneClass(0), points: s.points }]

  const isLogX = sweepParam === SWEEP_L_PEAK || sweepParam === SWEEP_FSW_LOSS
  const isLogY = sweepParam === SWEEP_FSW_LOSS

  return (
    <>
      <LangLink className="backlink" to="/kategori/guc-termal">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <BuckSchematic ref={schematicRef} r={r} text={text.schematic} />

          <h2 className="section">{text.sectionInOut}</h2>
          <NumberField
            label={text.fields.vInMin.label}
            value={f.vInMin} onChange={set('vInMin')}
            units={V_UNITS} unit={f.vInMinu} onUnit={set('vInMinu')}
          />
          <NumberField
            label={text.fields.vInNom.label}
            value={f.vInNom} onChange={set('vInNom')}
            units={V_UNITS} unit={f.vInNomu} onUnit={set('vInNomu')}
          />
          <NumberField
            label={text.fields.vInMax.label}
            value={f.vInMax} onChange={set('vInMax')}
            units={V_UNITS} unit={f.vInMaxu} onUnit={set('vInMaxu')}
          />
          <NumberField
            label={text.fields.vOut.label}
            value={f.vOut} onChange={set('vOut')}
            units={V_UNITS} unit={f.vOutu} onUnit={set('vOutu')}
          />
          <NumberField
            label={text.fields.iOutNom.label}
            value={f.iOutNom} onChange={set('iOutNom')}
            units={A_UNITS} unit={f.iOutNomu} onUnit={set('iOutNomu')}
          />
          <NumberField
            label={text.fields.iOutMax.label}
            value={f.iOutMax} onChange={set('iOutMax')}
            units={A_UNITS} unit={f.iOutMaxu} onUnit={set('iOutMaxu')}
            hint={text.fields.iOutMax.hint}
          />
          <NumberField
            label={text.fields.fsw.label}
            value={f.fsw} onChange={set('fsw')}
            units={FREQ_UNITS} unit={f.fswu} onUnit={set('fswu')}
          />
          <NumberField
            label={text.fields.etaPct.label}
            value={f.etaPct} onChange={set('etaPct')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={text.fields.etaPct.hint}
          />

          <h2 className="section">{text.sectionRipple}</h2>
          <NumberField
            label={text.fields.lVal.label}
            value={f.lVal} onChange={set('lVal')}
            units={IND_UNITS} unit={f.lValu} onUnit={set('lValu')}
            hint={text.fields.lVal.hint}
          />
          <NumberField
            label={text.fields.ripplePct.label}
            value={f.ripplePct} onChange={set('ripplePct')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={text.fields.ripplePct.hint}
          />
          <NumberField
            label={text.fields.dcr.label}
            value={f.dcr} onChange={set('dcr')}
            units={RES_UNITS} unit={f.dcru} onUnit={set('dcru')}
          />
          <NumberField
            label={text.fields.iSat.label}
            value={f.iSat} onChange={set('iSat')}
            units={A_UNITS} unit={f.iSatu} onUnit={set('iSatu')}
            hint={text.fields.iSat.hint}
          />
          <NumberField
            label={text.fields.iRmsRating.label}
            value={f.iRmsRating} onChange={set('iRmsRating')}
            units={A_UNITS} unit={f.iRmsRatingu} onUnit={set('iRmsRatingu')}
            hint={text.fields.iRmsRating.hint}
          />

          <h2 className="section">{text.sectionCaps}</h2>
          <NumberField
            label={text.fields.cOut.label}
            value={f.cOut} onChange={set('cOut')}
            units={CAP_UNITS} unit={f.cOutu} onUnit={set('cOutu')}
            hint={text.fields.cOut.hint}
          />
          <NumberField
            label={text.fields.esrCOut.label}
            value={f.esrCOut} onChange={set('esrCOut')}
            units={RES_UNITS} unit={f.esrCOutu} onUnit={set('esrCOutu')}
          />
          <NumberField
            label={text.fields.deltaVTarget.label}
            value={f.deltaVTarget} onChange={set('deltaVTarget')}
            units={V_UNITS} unit={f.deltaVTargetu} onUnit={set('deltaVTargetu')}
            hint={text.fields.deltaVTarget.hint}
          />
          <NumberField
            label={text.fields.iCinRmsRating.label}
            value={f.iCinRmsRating} onChange={set('iCinRmsRating')}
            units={A_UNITS} unit={f.iCinRmsRatingu} onUnit={set('iCinRmsRatingu')}
            hint={text.fields.iCinRmsRating.hint}
          />

          <h2 className="section">{text.sectionSwitch}</h2>
          <Segmented
            label={text.fields.topology.label}
            value={f.topology}
            onChange={set('topology')}
            options={[
              { value: TOPOLOGY_ASYNC, label: text.fields.topologyAsync },
              { value: TOPOLOGY_SYNC, label: text.fields.topologySync },
            ]}
          />
          <NumberField
            label={text.fields.rdsOnHs.label}
            value={f.rdsOnHs} onChange={set('rdsOnHs')}
            units={RES_UNITS} unit={f.rdsOnHsu} onUnit={set('rdsOnHsu')}
          />
          {isSync ? (
            <>
              <NumberField
                label={text.fields.rdsOnLs.label}
                value={f.rdsOnLs} onChange={set('rdsOnLs')}
                units={RES_UNITS} unit={f.rdsOnLsu} onUnit={set('rdsOnLsu')}
              />
              <NumberField
                label={text.fields.vFBody.label}
                value={f.vFBody} onChange={set('vFBody')}
                units={V_UNITS} unit={f.vFBodyu} onUnit={set('vFBodyu')}
              />
              <NumberField
                label={text.fields.tDead.label}
                value={f.tDead} onChange={set('tDead')}
                units={TIME_UNITS} unit={f.tDeadu} onUnit={set('tDeadu')}
              />
            </>
          ) : (
            <>
              <NumberField
                label={text.fields.vF.label}
                value={f.vF} onChange={set('vF')}
                units={V_UNITS} unit={f.vFu} onUnit={set('vFu')}
              />
              <NumberField
                label={text.fields.qrr.label}
                value={f.qrr} onChange={set('qrr')}
                units={CHARGE_UNITS} unit={f.qrru} onUnit={set('qrru')}
              />
            </>
          )}

          <h2 className="section">{text.sectionGate}</h2>
          <NumberField
            label={text.fields.tr.label}
            value={f.tr} onChange={set('tr')}
            units={TIME_UNITS} unit={f.tru} onUnit={set('tru')}
          />
          <NumberField
            label={text.fields.tf.label}
            value={f.tf} onChange={set('tf')}
            units={TIME_UNITS} unit={f.tfu} onUnit={set('tfu')}
          />
          <NumberField
            label={text.fields.vg.label}
            value={f.vg} onChange={set('vg')}
            units={V_UNITS} unit={f.vgu} onUnit={set('vgu')}
          />
          <NumberField
            label={text.fields.qgHs.label}
            value={f.qgHs} onChange={set('qgHs')}
            units={CHARGE_UNITS} unit={f.qgHsu} onUnit={set('qgHsu')}
          />
          {isSync && (
            <NumberField
              label={text.fields.qgLs.label}
              value={f.qgLs} onChange={set('qgLs')}
              units={CHARGE_UNITS} unit={f.qgLsu} onUnit={set('qgLsu')}
            />
          )}

          <h2 className="section">{text.sectionThermal}</h2>
          <label className="check-row">
            <input
              type="checkbox" checked={f.hasThermal}
              onChange={(e) => set('hasThermal')(e.target.checked)}
            />
            {text.fields.hasThermalCheck}
          </label>
          {f.hasThermal && (
            <>
              <NumberField
                label={text.fields.thetaJaHs.label}
                value={f.thetaJaHs} onChange={set('thetaJaHs')}
                units={THERMAL_UNITS} unit={f.thetaJaHsu} onUnit={set('thetaJaHsu')}
              />
              {isSync && (
                <NumberField
                  label={text.fields.thetaJaLs.label}
                  value={f.thetaJaLs} onChange={set('thetaJaLs')}
                  units={THERMAL_UNITS} unit={f.thetaJaLsu} onUnit={set('thetaJaLsu')}
                />
              )}
              <NumberField
                label={text.fields.thetaJaInductor.label}
                value={f.thetaJaInductor} onChange={set('thetaJaInductor')}
                units={THERMAL_UNITS} unit={f.thetaJaInductoru} onUnit={set('thetaJaInductoru')}
              />
              <NumberField
                label={text.fields.tAmbient.label}
                value={f.tAmbient} onChange={set('tAmbient')}
                units={['°C']} unit="°C" onUnit={() => {}}
              />
              <NumberField
                label={text.fields.tjMax.label}
                value={f.tjMax} onChange={set('tjMax')}
                units={['°C']} unit="°C" onUnit={() => {}}
                hint={text.fields.tjMax.hint}
              />
            </>
          )}

          <h2 className="section">{text.sectionLayout}</h2>
          <SelectField
            label={text.fields.gndJoin.label}
            value={f.gndJoin}
            onChange={set('gndJoin')}
            options={[
              { value: GND_JOIN_STAR, label: text.fields.gndJoinStar },
              { value: GND_JOIN_PLANE, label: text.fields.gndJoinPlane },
              { value: GND_JOIN_SPLIT, label: text.fields.gndJoinSplit },
            ]}
          />
          <NumberField
            label={text.fields.hotLoopPerimeter.label}
            value={f.hotLoopPerimeter} onChange={set('hotLoopPerimeter')}
            units={LEN_UNITS} unit={f.hotLoopPerimeteru} onUnit={set('hotLoopPerimeteru')}
          />
          <NumberField
            label={text.fields.switchNodeArea.label}
            value={f.switchNodeArea} onChange={set('switchNodeArea')}
            units={AREA_UNITS} unit={f.switchNodeAreau} onUnit={set('switchNodeAreau')}
          />
          <NumberField
            label={text.fields.capToFetDistance.label}
            value={f.capToFetDistance} onChange={set('capToFetDistance')}
            units={LEN_UNITS} unit={f.capToFetDistanceu} onUnit={set('capToFetDistanceu')}
          />
          <NumberField
            label={text.fields.gateLoopLength.label}
            value={f.gateLoopLength} onChange={set('gateLoopLength')}
            units={LEN_UNITS} unit={f.gateLoopLengthu} onUnit={set('gateLoopLengthu')}
          />
          <NumberField
            label={text.fields.feedbackDistance.label}
            value={f.feedbackDistance} onChange={set('feedbackDistance')}
            units={LEN_UNITS} unit={f.feedbackDistanceu} onUnit={set('feedbackDistanceu')}
          />
          <NumberField
            label={text.fields.powerViaCount.label}
            value={f.powerViaCount} onChange={set('powerViaCount')}
            units={[text.countUnit]} unit={text.countUnit} onUnit={() => {}}
          />
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. VoltageDivider'daki aynı not. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.bigResultLabel}</div>
                <div className="value">{fmt(r.duty.ideal, 4)}</div>
                <div className="alt">
                  {text.altLabels.lUsed} {fmtH(r.inductor.chosen ?? r.inductor.required)}
                  &nbsp;·&nbsp; {text.altLabels.ripple} {fmtAmp(r.inductor.deltaIL, 3)}
                  &nbsp;·&nbsp; {text.altLabels.peak} {fmtAmp(r.inductor.peak, 3)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.dutyIdeal}</td>
                    <td>{fmt(r.duty.ideal, 4)}</td>
                  </tr>
                  {r.duty.approx != null && (
                    <tr>
                      <td>{text.table.dutyApprox}</td>
                      <td>{fmt(r.duty.approx, 4)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>{text.table.lRequired}</td>
                    <td>{fmtH(r.inductor.required)}</td>
                  </tr>
                  {r.inductor.chosen != null && (
                    <tr>
                      <td>{text.table.lChosen}</td>
                      <td>{fmtH(r.inductor.chosen)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>{text.table.deltaIL}</td>
                    <td>{fmtAmp(r.inductor.deltaIL, 3)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.rippleRatio}</td>
                    <td>{fmt(r.inductor.rippleRatio, 3)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.iLPeak}</td>
                    <td>{fmtAmp(r.inductor.peak, 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.iLMin}</td>
                    <td>{fmtAmp(r.inductor.min, 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.iLRms}</td>
                    <td>{fmtAmp(r.inductor.rms, 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.iOutBoundary}</td>
                    <td>{fmtAmp(r.inductor.boundaryCurrent, 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.mode}</td>
                    <td>{r.inductor.mode === BUCK_MODE_DCM ? text.modeLabel.dcm : text.modeLabel.ccm}</td>
                  </tr>
                  <tr>
                    <td>{text.table.inductorLoss}</td>
                    <td>{fmtPow(r.inductor.copperLoss, 3)}</td>
                  </tr>

                  {r.outputRipple && (
                    <>
                      <tr className="mini-head"><td colSpan={2}>{text.sectionCaps}</td></tr>
                      <tr>
                        <td>{text.table.deltaVC}</td>
                        <td>{fmtVolt(r.outputRipple.deltaVC)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.deltaVEsr}</td>
                        <td>{fmtVolt(r.outputRipple.deltaVEsr)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.deltaVTotal}</td>
                        <td>{fmtVolt(r.outputRipple.total)}</td>
                      </tr>
                    </>
                  )}
                  {r.outputCapacitance && (
                    <tr>
                      <td>{text.table.cOutMin}</td>
                      <td>{fmtF(r.outputCapacitance.min)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>{text.table.iCinRms}</td>
                    <td>{fmtAmp(r.inputCapacitor.rmsCurrent, 3)}</td>
                  </tr>

                  {(r.conduction.highSide || r.conduction.lowSide || r.switching || r.gate || r.diode || r.deadTime) && (
                    <tr className="mini-head"><td colSpan={2}>{text.sectionSwitch}</td></tr>
                  )}
                  {r.conduction.highSide && (
                    <tr>
                      <td>{text.table.hsCondLoss}</td>
                      <td>{fmtPow(r.conduction.highSide.loss, 3)}</td>
                    </tr>
                  )}
                  {r.conduction.lowSide && (
                    <tr>
                      <td>{text.table.lsCondLoss}</td>
                      <td>{fmtPow(r.conduction.lowSide.loss, 3)}</td>
                    </tr>
                  )}
                  {r.switching && (
                    <tr>
                      <td>{text.table.switchingLoss}</td>
                      <td>{fmtPow(r.switching.loss, 3)}</td>
                    </tr>
                  )}
                  {r.gate && (
                    <>
                      <tr>
                        <td>{text.table.gateHs}</td>
                        <td>{fmtPow(r.gate.hs, 3)}</td>
                      </tr>
                      {r.gate.ls != null && (
                        <tr>
                          <td>{text.table.gateLs}</td>
                          <td>{fmtPow(r.gate.ls, 3)}</td>
                        </tr>
                      )}
                      <tr>
                        <td>{text.table.gateTotal}</td>
                        <td>{fmtPow(r.gate.total, 3)}</td>
                      </tr>
                    </>
                  )}
                  {r.diode && (
                    <>
                      <tr>
                        <td>{text.table.diodeAvg}</td>
                        <td>{fmtAmp(r.diode.avgCurrent, 3)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.diodeCond}</td>
                        <td>{fmtPow(r.diode.conductionLoss, 3)}</td>
                      </tr>
                      {r.diode.reverseRecoveryLoss != null && (
                        <tr>
                          <td>{text.table.diodeRr}</td>
                          <td>{fmtPow(r.diode.reverseRecoveryLoss, 3)}</td>
                        </tr>
                      )}
                    </>
                  )}
                  {r.deadTime && (
                    <tr>
                      <td>{text.table.deadTimeLoss}</td>
                      <td>{fmtPow(r.deadTime.loss, 3)}</td>
                    </tr>
                  )}

                  {(r.thermal.highSide != null || r.thermal.lowSide != null || r.thermal.inductor != null) && (
                    <tr className="mini-head"><td colSpan={2}>{text.sectionThermal}</td></tr>
                  )}
                  {r.thermal.highSide != null && (
                    <tr>
                      <td>{text.table.tjHs}</td>
                      <td>{fmtCTemp(r.thermal.highSide)}</td>
                    </tr>
                  )}
                  {r.thermal.lowSide != null && (
                    <tr>
                      <td>{text.table.tjLs}</td>
                      <td>{fmtCTemp(r.thermal.lowSide)}</td>
                    </tr>
                  )}
                  {r.thermal.inductor != null && (
                    <tr>
                      <td>{text.table.tjInductor}</td>
                      <td>{fmtCTemp(r.thermal.inductor)}</td>
                    </tr>
                  )}

                  <tr className="mini-head">
                    <td>{text.table.totalLoss}</td>
                    <td>{fmtPow(r.totalLossApprox, 3)}</td>
                  </tr>

                  {Object.entries(r.layout).some(([k, v]) => k !== 'gndJoin' && v != null) && (
                    <>
                      <tr className="mini-head"><td colSpan={2}>{text.table.layoutHead}</td></tr>
                      {r.layout.hotLoopPerimeter != null && (
                        <tr><td>{text.table.hotLoopPerimeter}</td><td>{fmtEng(r.layout.hotLoopPerimeter, 'm', 3)}</td></tr>
                      )}
                      {r.layout.switchNodeArea != null && (
                        <tr><td>{text.table.switchNodeArea}</td><td>{fmtEng(r.layout.switchNodeArea, 'm²', 3)}</td></tr>
                      )}
                      {r.layout.capToFetDistance != null && (
                        <tr><td>{text.table.capToFetDistance}</td><td>{fmtEng(r.layout.capToFetDistance, 'm', 3)}</td></tr>
                      )}
                      {r.layout.gateLoopLength != null && (
                        <tr><td>{text.table.gateLoopLength}</td><td>{fmtEng(r.layout.gateLoopLength, 'm', 3)}</td></tr>
                      )}
                      {r.layout.feedbackDistance != null && (
                        <tr><td>{text.table.feedbackDistance}</td><td>{fmtEng(r.layout.feedbackDistance, 'm', 3)}</td></tr>
                      )}
                      {r.layout.powerViaCount != null && (
                        <tr><td>{text.table.powerViaCount}</td><td>{fmt(r.layout.powerViaCount, 3)}</td></tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>

              <Commentary items={notes} />
            </>
          )}
        </ResultPanel>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>{text.detail.approxDuty}</li>
              <li>{text.detail.noRounding}</li>
              <li>{text.detail.ratingsAreScreenSide}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* ---------- Alt: Parametrik grafik ---------- */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>{ui.chart}</h2>
          <Segmented
            label={text.sweepGroup}
            value={sweepParam}
            onChange={setSweepParam}
            options={SWEEP_PARAMS.map((p) => ({ value: p, label: text.sweepLabel[p] }))}
          />
        </div>

        {s ? (
          <>
            <ChartLegend
              items={chartSeries.map((series) => ({ label: series.name, tone: series.tone, kind: 'line' }))}
            />

            <LineChart
              ref={chartRef}
              xScale={isLogX ? 'log' : 'linear'}
              yScale={isLogY ? 'log' : 'linear'}
              xLabel={text.sweepAxis[sweepParam]}
              yLabel={text.sweepYLabel[sweepParam]}
              series={chartSeries}
              marker={s.marker ? { ...s.marker, label: text.operatingPoint } : null}
              formatX={axisEng}
              formatY={(v) => fmt(v, 3)}
              caption={text.sweepCaption[sweepParam]}
            />

            <ChartDataTable
              xLabel={text.sweepAxis[sweepParam]}
              series={chartSeries}
              every={8}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 4)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="buck-pcb-pre-design"
        f={f}
        r={r}
        section={reportSection}
        schematicRef={schematicRef}
        chartRef={chartRef}
        saved={saved}
      />
    </>
  )
}
