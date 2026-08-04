import { useMemo, useRef, useState } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
import ToolHeader from '../../../components/ToolHeader'
import ResultPanel from '../../../components/ResultPanel'
import Commentary from '../../../components/Commentary'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import Segmented from '../../../components/Segmented'
import useToolForm from '../../../hooks/useToolForm'
import { statusChip, worstLevel, countAtLevel } from '../../../lib/statusChip'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtRes } from '../../../lib/num'
import GateDriverSchematic from './schematic'
import {
  INITIAL_FORM, SWEEP_PARAMS, SWEEP_RESISTANCE, SWEEP_FSW,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const CHARGE_UNITS = ['nC', 'pC', 'µC']
const VOLT_UNITS = ['V', 'mV']
const FREQ_UNITS = ['Hz', 'kHz', 'MHz']
const RES_UNITS = ['Ω', 'mΩ', 'kΩ']
const CURRENT_UNITS = ['A', 'mA']
const TIME_UNITS = ['ns', 'ps', 'µs']
const CAP_UNITS = ['pF', 'nF']
const ENERGY_UNITS = ['nJ', 'µJ', 'mJ']

const axisEng = (v) => fmtEng(v, '', 3).replace(' ', '')

export default function MosfetGateDriver() {
  const [sweepParam, setSweepParam] = useState(SWEEP_RESISTANCE)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  const saved = useSavedCalculation({
    toolKey: 'mosfet-gate-driver', initialForm: INITIAL_FORM, patch,
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

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [r, notes, ui])

  const chartSeries = !s ? [] : sweepParam === SWEEP_RESISTANCE
    ? [
      { key: 'on', name: text.seriesOn, tone: toneClass(0), points: s.points },
      { key: 'off', name: text.seriesOff, tone: toneClass(1), points: s.pointsOff },
    ]
    : [{ key: sweepParam, name: text.sweepLabel[sweepParam], tone: toneClass(0), points: s.points }]

  return (
    <>
      <LangLink className="backlink" to="/kategori/komponent">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <GateDriverSchematic ref={schematicRef} r={r} text={text.schematic} />

          <NumberField
            label={text.fields.qg.label}
            value={f.qg} onChange={set('qg')}
            units={CHARGE_UNITS} unit={f.qgu} onUnit={set('qgu')}
          />
          <NumberField
            label={text.fields.qgd.label}
            value={f.qgd} onChange={set('qgd')}
            units={CHARGE_UNITS} unit={f.qgdu} onUnit={set('qgdu')}
          />
          <NumberField
            label={text.fields.vDrive.label}
            value={f.vDrive} onChange={set('vDrive')}
            units={VOLT_UNITS} unit={f.vDriveu} onUnit={set('vDriveu')}
          />
          <NumberField
            label={text.fields.vPlateau.label}
            value={f.vPlateau} onChange={set('vPlateau')}
            units={VOLT_UNITS} unit={f.vPlateauu} onUnit={set('vPlateauu')}
          />
          <NumberField
            label={text.fields.vOff.label}
            value={f.vOff} onChange={set('vOff')}
            units={VOLT_UNITS} unit={f.vOffu} onUnit={set('vOffu')}
            hint={text.fields.vOff.hint}
          />
          <NumberField
            label={text.fields.fsw.label}
            value={f.fsw} onChange={set('fsw')}
            units={FREQ_UNITS} unit={f.fswu} onUnit={set('fswu')}
          />
          <NumberField
            label={text.fields.count.label}
            value={f.count} onChange={set('count')}
            units={[text.countUnit]} unit={text.countUnit} onUnit={() => {}}
          />

          <h2 className="section">{text.table.onHead} / {text.table.offHead}</h2>
          <NumberField
            label={text.fields.rExtOn.label}
            value={f.rExtOn} onChange={set('rExtOn')}
            units={RES_UNITS} unit={f.rExtOnu} onUnit={set('rExtOnu')}
          />
          <NumberField
            label={text.fields.rExtOff.label}
            value={f.rExtOff} onChange={set('rExtOff')}
            units={RES_UNITS} unit={f.rExtOffu} onUnit={set('rExtOffu')}
          />
          <NumberField
            label={text.fields.rDriverSource.label}
            value={f.rDriverSource} onChange={set('rDriverSource')}
            units={RES_UNITS} unit={f.rDriverSourceu} onUnit={set('rDriverSourceu')}
          />
          <NumberField
            label={text.fields.rDriverSink.label}
            value={f.rDriverSink} onChange={set('rDriverSink')}
            units={RES_UNITS} unit={f.rDriverSinku} onUnit={set('rDriverSinku')}
          />
          <NumberField
            label={text.fields.rGateInternal.label}
            value={f.rGateInternal} onChange={set('rGateInternal')}
            units={RES_UNITS} unit={f.rGateInternalu} onUnit={set('rGateInternalu')}
          />
          <NumberField
            label={text.fields.rTrace.label}
            value={f.rTrace} onChange={set('rTrace')}
            units={RES_UNITS} unit={f.rTraceu} onUnit={set('rTraceu')}
          />
          <NumberField
            label={text.fields.driverPeakSource.label}
            value={f.driverPeakSource} onChange={set('driverPeakSource')}
            units={CURRENT_UNITS} unit={f.driverPeakSourceu} onUnit={set('driverPeakSourceu')}
            hint={text.fields.driverPeakSource.hint}
          />
          <NumberField
            label={text.fields.driverPeakSink.label}
            value={f.driverPeakSink} onChange={set('driverPeakSink')}
            units={CURRENT_UNITS} unit={f.driverPeakSinku} onUnit={set('driverPeakSinku')}
            hint={text.fields.driverPeakSink.hint}
          />

          <label className="check-row">
            <input
              type="checkbox" checked={f.hasTarget}
              onChange={(e) => set('hasTarget')(e.target.checked)}
            />
            {text.fields.hasTargetCheck}
          </label>
          {f.hasTarget && (
            <>
              <NumberField
                label={text.fields.targetOnTime.label}
                value={f.targetOnTime} onChange={set('targetOnTime')}
                units={TIME_UNITS} unit={f.targetOnTimeu} onUnit={set('targetOnTimeu')}
              />
              <NumberField
                label={text.fields.targetOffTime.label}
                value={f.targetOffTime} onChange={set('targetOffTime')}
                units={TIME_UNITS} unit={f.targetOffTimeu} onUnit={set('targetOffTimeu')}
              />
            </>
          )}

          <label className="check-row">
            <input
              type="checkbox" checked={f.hasLoss}
              onChange={(e) => set('hasLoss')(e.target.checked)}
            />
            {text.fields.hasLossCheck}
          </label>
          {f.hasLoss && (
            <>
              <NumberField
                label={text.fields.vds.label}
                value={f.vds} onChange={set('vds')}
                units={VOLT_UNITS} unit={f.vdsu} onUnit={set('vdsu')}
              />
              <NumberField
                label={text.fields.id.label}
                value={f.id} onChange={set('id')}
                units={CURRENT_UNITS} unit={f.idu} onUnit={set('idu')}
              />
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
                label={text.fields.coss.label}
                value={f.coss} onChange={set('coss')}
                units={CAP_UNITS} unit={f.cossu} onUnit={set('cossu')}
                hint={text.fields.coss.hint}
              />
              <NumberField
                label={text.fields.eoss.label}
                value={f.eoss} onChange={set('eoss')}
                units={ENERGY_UNITS} unit={f.eossu} onUnit={set('eossu')}
                hint={text.fields.eoss.hint}
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.bigResultLabel}</div>
                <div className="value">{fmtEng(r.on.current, 'A', 3)}</div>
                <div className="alt">
                  {text.altLabels.millerTime} {fmtEng(r.on.millerTime, 's', 3)}
                  &nbsp;·&nbsp; {text.altLabels.avgCurrent} {fmtEng(r.averageCurrent, 'A', 3)}
                  &nbsp;·&nbsp; {text.altLabels.gatePower} {fmtEng(r.gatePower, 'W', 3)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.averageCurrent}</td>
                    <td>{fmtEng(r.averageCurrent, 'A', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.gatePower}</td>
                    <td>{fmtEng(r.gatePower, 'W', 4)}</td>
                  </tr>

                  <tr className="mini-head"><td colSpan={2}>{text.table.onHead}</td></tr>
                  <tr>
                    <td>{text.table.rTotal}</td>
                    <td>{fmtRes(r.on.rTotal)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.current}</td>
                    <td>{fmtEng(r.on.current, 'A', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.millerTime}</td>
                    <td>{fmtEng(r.on.millerTime, 's', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.chargeTime}</td>
                    <td>{fmtEng(r.on.chargeTime, 's', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.resistorLoss}</td>
                    <td>{fmtEng(r.on.resistorLoss, 'W', 4)}</td>
                  </tr>
                  {r.on.driverLimited && (
                    <tr><td>{text.table.driverLimited}</td><td>—</td></tr>
                  )}

                  <tr className="mini-head"><td colSpan={2}>{text.table.offHead}</td></tr>
                  <tr>
                    <td>{text.table.rTotal}</td>
                    <td>{fmtRes(r.off.rTotal)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.current}</td>
                    <td>{fmtEng(r.off.current, 'A', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.millerTime}</td>
                    <td>{fmtEng(r.off.millerTime, 's', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.chargeTime}</td>
                    <td>{fmtEng(r.off.chargeTime, 's', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.resistorLoss}</td>
                    <td>{fmtEng(r.off.resistorLoss, 'W', 4)}</td>
                  </tr>
                  {r.off.driverLimited && (
                    <tr><td>{text.table.driverLimited}</td><td>—</td></tr>
                  )}

                  {r.targetOn && !r.targetOn.error && (
                    <tr>
                      <td>{text.table.targetExternal} ({text.table.onHead})</td>
                      <td>{fmtRes(r.targetOn.external)}</td>
                    </tr>
                  )}
                  {r.targetOff && !r.targetOff.error && (
                    <tr>
                      <td>{text.table.targetExternal} ({text.table.offHead})</td>
                      <td>{fmtRes(r.targetOff.external)}</td>
                    </tr>
                  )}
                  {r.switchingLoss != null && (
                    <tr>
                      <td>{text.table.switchingLoss}</td>
                      <td>{fmtEng(r.switchingLoss, 'W', 4)}</td>
                    </tr>
                  )}
                  {r.cossLoss != null && (
                    <tr>
                      <td>{text.table.cossLoss}</td>
                      <td>{fmtEng(r.cossLoss, 'W', 4)}</td>
                    </tr>
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
              <li>{text.detail.gateChargeMethod}</li>
              <li>{text.detail.noRounding}</li>
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
              xScale="log"
              yScale={sweepParam === SWEEP_FSW ? 'log' : 'linear'}
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
        toolKey="mosfet-gate-driver"
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
