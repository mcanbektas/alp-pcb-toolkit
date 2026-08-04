import { useMemo, useRef } from 'react'
import LangLink from '../../../components/LangLink'
import NumberField from '../../../components/NumberField'
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
import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import BusSchematic from './schematic'
import { INITIAL_FORM, MODE_CAN, MODE_RS485, compute, buildSweep } from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const RES_UNITS = ['Ω', 'mΩ', 'kΩ']
const BITRATE_UNITS = ['bps', 'kbps', 'Mbps']
const LEN_UNITS = ['m']
const DELAY_UNITS = ['ns/m', 'ps/m', 'µs/m']
const TIME_UNITS = ['ns', 'µs']
const CAP_UNITS = ['nF', 'pF']
const VOLT_UNITS = ['V', 'mV']

const axisEng = (v) => fmtEng(v, '', 3).replace(' ', '')

export default function CanRs485PhysicalLayer() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  const saved = useSavedCalculation({
    toolKey: 'can-rs485-physical-layer', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const notes = useMemo(() => text.commentary(r), [r, text])
  const s = useMemo(() => buildSweep(r), [r])

  const reportSection = useMemo(() => buildReportSection({ f, r, s, text }), [f, r, s, text])
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [notes, ui])

  const isCan = f.mode === MODE_CAN
  const chartSeries = !s ? [] : [{ key: 'main', name: text.seriesMain, tone: toneClass(0), points: s.points }]

  return (
    <>
      <LangLink className="backlink" to="/kategori/sinyal-butunlugu">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <BusSchematic ref={schematicRef} r={r} mode={f.mode} text={text.schematic} />

          <Segmented
            label={text.modeLabel}
            value={f.mode}
            onChange={set('mode')}
            options={[
              { value: MODE_CAN, label: text.modeCan },
              { value: MODE_RS485, label: text.modeRs485 },
            ]}
          />

          <NumberField
            label={text.fields.term1.label}
            value={f.term1} onChange={set('term1')}
            units={RES_UNITS} unit={f.term1u} onUnit={set('term1u')}
          />
          <NumberField
            label={text.fields.term2.label}
            value={f.term2} onChange={set('term2')}
            units={RES_UNITS} unit={f.term2u} onUnit={set('term2u')}
          />

          {isCan ? (
            <>
              <NumberField
                label={text.fields.bitrate.label}
                value={f.bitrate} onChange={set('bitrate')}
                units={BITRATE_UNITS} unit={f.bitrateu} onUnit={set('bitrateu')}
              />
              <NumberField
                label={text.fields.samplePoint.label}
                value={f.samplePoint} onChange={set('samplePoint')}
                units={['']} unit="" onUnit={() => {}}
                hint={text.fields.samplePoint.hint}
              />
              <NumberField
                label={text.fields.busLength.label}
                value={f.busLength} onChange={set('busLength')}
                units={LEN_UNITS} unit={f.busLengthu} onUnit={set('busLengthu')}
              />
              <NumberField
                label={text.fields.delayPerMeter.label}
                value={f.delayPerMeter} onChange={set('delayPerMeter')}
                units={DELAY_UNITS} unit={f.delayPerMeteru} onUnit={set('delayPerMeteru')}
              />
              <NumberField
                label={text.fields.controllerDelay.label}
                value={f.controllerDelay} onChange={set('controllerDelay')}
                units={TIME_UNITS} unit={f.controllerDelayu} onUnit={set('controllerDelayu')}
              />
              <NumberField
                label={text.fields.txDelay.label}
                value={f.txDelay} onChange={set('txDelay')}
                units={TIME_UNITS} unit={f.txDelayu} onUnit={set('txDelayu')}
              />
              <NumberField
                label={text.fields.rxDelay.label}
                value={f.rxDelay} onChange={set('rxDelay')}
                units={TIME_UNITS} unit={f.rxDelayu} onUnit={set('rxDelayu')}
              />
              <NumberField
                label={text.fields.isolatorTxDelay.label}
                value={f.isolatorTxDelay} onChange={set('isolatorTxDelay')}
                units={TIME_UNITS} unit={f.isolatorTxDelayu} onUnit={set('isolatorTxDelayu')}
              />
              <NumberField
                label={text.fields.isolatorRxDelay.label}
                value={f.isolatorRxDelay} onChange={set('isolatorRxDelay')}
                units={TIME_UNITS} unit={f.isolatorRxDelayu} onUnit={set('isolatorRxDelayu')}
              />

              <label className="check-row">
                <input
                  type="checkbox" checked={f.hasSplit}
                  onChange={(e) => set('hasSplit')(e.target.checked)}
                />
                {text.fields.hasSplitCheck}
              </label>
              {f.hasSplit && (
                <>
                  <NumberField
                    label={text.fields.r1.label}
                    value={f.r1} onChange={set('r1')}
                    units={RES_UNITS} unit={f.r1u} onUnit={set('r1u')}
                  />
                  <NumberField
                    label={text.fields.r2.label}
                    value={f.r2} onChange={set('r2')}
                    units={RES_UNITS} unit={f.r2u} onUnit={set('r2u')}
                  />
                  <NumberField
                    label={text.fields.cSplit.label}
                    value={f.cSplit} onChange={set('cSplit')}
                    units={CAP_UNITS} unit={f.cSplitu} onUnit={set('cSplitu')}
                  />
                </>
              )}

              <label className="check-row">
                <input
                  type="checkbox" checked={f.hasStub}
                  onChange={(e) => set('hasStub')(e.target.checked)}
                />
                {text.fields.hasStubCheck}
              </label>
              {f.hasStub && (
                <>
                  <NumberField
                    label={text.fields.stubLength.label}
                    value={f.stubLength} onChange={set('stubLength')}
                    units={LEN_UNITS} unit={f.stubLengthu} onUnit={set('stubLengthu')}
                  />
                  <NumberField
                    label={text.fields.riseTime.label}
                    value={f.riseTime} onChange={set('riseTime')}
                    units={TIME_UNITS} unit={f.riseTimeu} onUnit={set('riseTimeu')}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <NumberField
                label={text.fields.vcc.label}
                value={f.vcc} onChange={set('vcc')}
                units={VOLT_UNITS} unit={f.vccu} onUnit={set('vccu')}
              />
              <NumberField
                label={text.fields.receiverEq.label}
                value={f.receiverEq} onChange={set('receiverEq')}
                units={RES_UNITS} unit={f.receiverEqu} onUnit={set('receiverEqu')}
                hint={text.fields.receiverEq.hint}
              />
              <NumberField
                label={text.fields.rPullUp.label}
                value={f.rPullUp} onChange={set('rPullUp')}
                units={RES_UNITS} unit={f.rPullUpu} onUnit={set('rPullUpu')}
              />
              <NumberField
                label={text.fields.rPullDown.label}
                value={f.rPullDown} onChange={set('rPullDown')}
                units={RES_UNITS} unit={f.rPullDownu} onUnit={set('rPullDownu')}
              />
              <NumberField
                label={text.fields.receiverThreshold.label}
                value={f.receiverThreshold} onChange={set('receiverThreshold')}
                units={VOLT_UNITS} unit={f.receiverThresholdu} onUnit={set('receiverThresholdu')}
              />
              <NumberField
                label={text.fields.unitLoad.label}
                value={f.unitLoad} onChange={set('unitLoad')}
                units={['']} unit="" onUnit={() => {}}
                hint={text.fields.unitLoad.hint}
              />

              <NumberField
                label={text.fields.rs485Bitrate.label}
                value={f.rs485Bitrate} onChange={set('rs485Bitrate')}
                units={BITRATE_UNITS} unit={f.rs485Bitrateu} onUnit={set('rs485Bitrateu')}
                hint={text.fields.rs485Bitrate.hint}
              />
              <NumberField
                label={text.fields.rs485BusLength.label}
                value={f.rs485BusLength} onChange={set('rs485BusLength')}
                units={LEN_UNITS} unit={f.rs485BusLengthu} onUnit={set('rs485BusLengthu')}
                hint={text.fields.rs485BusLength.hint}
              />
              <NumberField
                label={text.fields.rs485DelayPerMeter.label}
                value={f.rs485DelayPerMeter} onChange={set('rs485DelayPerMeter')}
                units={DELAY_UNITS} unit={f.rs485DelayPerMeteru} onUnit={set('rs485DelayPerMeteru')}
              />

              <label className="check-row">
                <input
                  type="checkbox" checked={f.hasTarget}
                  onChange={(e) => set('hasTarget')(e.target.checked)}
                />
                {text.fields.hasTargetCheck}
              </label>
              {f.hasTarget && (
                <NumberField
                  label={text.fields.targetIdle.label}
                  value={f.targetIdle} onChange={set('targetIdle')}
                  units={VOLT_UNITS} unit={f.targetIdleu} onUnit={set('targetIdleu')}
                />
              )}
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              {r.mode === MODE_CAN ? (
                <div className="big-result">
                  <div className="label">{text.bigResultLabelCan}</div>
                  <div className="value">{fmtEng(r.margin, 's', 3)}</div>
                  <div className="alt">
                    {r.maxLength != null ? `${text.table.maxLength} ${fmtEng(r.maxLength, 'm', 3)}` : '—'}
                  </div>
                </div>
              ) : (
                <div className="big-result">
                  <div className="label">{text.bigResultLabelRs485}</div>
                  <div className="value">{fmtRes(r.differentialLoad)}</div>
                  <div className="alt">
                    {r.bias ? `${text.table.biasIdle} ${fmtVolt(r.bias.idleVoltage)}` : '—'}
                  </div>
                </div>
              )}

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  {r.mode === MODE_CAN ? (
                    <>
                      <tr><td>{text.table.bitTime}</td><td>{fmtEng(r.bitTime, 's', 4)}</td></tr>
                      <tr><td>{text.table.sampleTime}</td><td>{fmtEng(r.sampleTime, 's', 4)}</td></tr>
                      <tr><td>{text.table.cableDelay}</td><td>{fmtEng(r.cableDelay, 's', 4)}</td></tr>
                      <tr><td>{text.table.roundTrip}</td><td>{fmtEng(r.roundTrip, 's', 4)}</td></tr>
                      <tr><td>{text.table.fixedDelay}</td><td>{fmtEng(r.fixedDelay, 's', 4)}</td></tr>
                      <tr><td>{text.table.loopDelay}</td><td>{fmtEng(r.loopDelay, 's', 4)}</td></tr>
                      <tr><td>{text.table.margin}</td><td>{fmtEng(r.margin, 's', 4)}</td></tr>
                      <tr><td>{text.table.maxLength}</td><td>{r.maxLength != null ? fmtEng(r.maxLength, 'm', 4) : '—'}</td></tr>
                      <tr><td>{text.table.terminationEq}</td><td>{fmtRes(r.terminationEq)}</td></tr>
                      {r.split && (
                        <>
                          <tr><td>{text.table.splitTotal}</td><td>{fmtRes(r.split.total)}</td></tr>
                          <tr><td>{text.table.splitCm}</td><td>{fmtRes(r.split.commonMode)}</td></tr>
                          {r.split.cutoff != null && (
                            <tr><td>{text.table.splitCutoff}</td><td>{fmtEng(r.split.cutoff, 'Hz', 4)}</td></tr>
                          )}
                        </>
                      )}
                      {r.stub && (
                        <>
                          <tr><td>{text.table.stubRoundTrip}</td><td>{fmtEng(r.stub.roundTrip, 's', 4)}</td></tr>
                          {r.stub.ratio != null && (
                            <tr><td>{text.table.stubRatio}</td><td>{fmt(r.stub.ratio, 4)}×</td></tr>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <tr><td>{text.table.terminationEq}</td><td>{fmtRes(r.terminationEq)}</td></tr>
                      <tr><td>{text.table.differentialLoad}</td><td>{fmtRes(r.differentialLoad)}</td></tr>
                      {r.bias && (
                        <>
                          <tr><td>{text.table.biasCurrent}</td><td>{fmtEng(r.bias.current, 'A', 4)}</td></tr>
                          <tr><td>{text.table.biasIdle}</td><td>{fmtVolt(r.bias.idleVoltage)}</td></tr>
                          <tr><td>{text.table.biasMargin}</td><td>{fmtVolt(r.bias.thresholdMargin)}</td></tr>
                          <tr><td>{text.table.biasPowerUp}</td><td>{fmtEng(r.bias.powerPullUp, 'W', 4)}</td></tr>
                          <tr><td>{text.table.biasPowerDown}</td><td>{fmtEng(r.bias.powerPullDown, 'W', 4)}</td></tr>
                        </>
                      )}
                      {r.biasTarget && !r.biasTarget.error && (
                        <>
                          <tr><td>{text.table.targetIdeal}</td><td>{fmtRes(r.biasTarget.ideal)}</td></tr>
                          <tr><td>{text.table.targetStandard}</td><td>{fmtRes(r.biasTarget.standard)}</td></tr>
                          <tr><td>{text.table.targetAchieved}</td><td>{fmtVolt(r.biasTarget.achieved)}</td></tr>
                        </>
                      )}
                      {r.maxNodes != null && (
                        <tr><td>{text.table.maxNodes}</td><td>{fmt(r.maxNodes, 3)}</td></tr>
                      )}
                      {r.cableDelay != null && (
                        <tr><td>{text.table.rs485CableDelay}</td><td>{fmtEng(r.cableDelay, 's', 4)}</td></tr>
                      )}
                      {r.bitTime != null && (
                        <tr><td>{text.table.rs485BitTime}</td><td>{fmtEng(r.bitTime, 's', 4)}</td></tr>
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

          <pre className="formula">{text.formula(f.mode)}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity(f.mode).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* ---------- Alt: Parametrik grafik ---------- */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>{ui.chart}</h2>
        </div>

        {s ? (
          <>
            <ChartLegend
              items={chartSeries.map((series) => ({ label: series.name, tone: series.tone, kind: 'line' }))}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={isCan ? text.sweepAxisCan : text.sweepAxisRs485}
              yLabel={isCan ? text.sweepYLabelCan : text.sweepYLabelRs485}
              series={chartSeries}
              marker={s.marker ? { ...s.marker, label: text.operatingPoint } : null}
              formatX={axisEng}
              formatY={(v) => fmt(v, 3)}
              caption={isCan ? text.sweepCaptionCan : text.sweepCaptionRs485}
            />

            <ChartDataTable
              xLabel={isCan ? text.sweepAxisCan : text.sweepAxisRs485}
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
        toolKey="can-rs485-physical-layer"
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
