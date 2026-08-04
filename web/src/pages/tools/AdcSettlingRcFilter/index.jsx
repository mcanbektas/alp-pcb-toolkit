import { useMemo, useRef, useState } from 'react'
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
import AdcSettlingSchematic from './schematic'
import {
  INITIAL_FORM, SWEEP_PARAMS, SWEEP_SETTLING,
  ACQ_DIRECT, ACQ_CYCLES,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const VOLT_UNITS = ['V', 'mV']
const CAP_UNITS = ['pF', 'nF', 'µF']
const TIME_UNITS = ['ns', 'µs', 'ms']
const FREQ_UNITS = ['Hz', 'kHz', 'MHz']
const RES_UNITS = ['Ω', 'kΩ', 'mΩ']

const axisEng = (v) => fmtEng(v, '', 3).replace(' ', '')

export default function AdcSettlingRcFilter() {
  const [sweepParam, setSweepParam] = useState(SWEEP_SETTLING)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  const saved = useSavedCalculation({
    toolKey: 'adc-settling-rc-filter', initialForm: INITIAL_FORM, patch,
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

  const chartSeries = !s ? [] : [{ key: sweepParam, name: text.sweepLabel[sweepParam], tone: toneClass(0), points: s.points }]

  return (
    <>
      <LangLink className="backlink" to="/kategori/komponent">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <AdcSettlingSchematic ref={schematicRef} r={r} text={text.schematic} />

          <NumberField
            label={text.fields.bits.label}
            value={f.bits} onChange={set('bits')}
            units={['bit']} unit="bit" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.vFullScale.label}
            value={f.vFullScale} onChange={set('vFullScale')}
            units={VOLT_UNITS} unit={f.vFullScaleu} onUnit={set('vFullScaleu')}
          />
          <NumberField
            label={text.fields.cs.label}
            value={f.cs} onChange={set('cs')}
            units={CAP_UNITS} unit={f.csu} onUnit={set('csu')}
          />

          <Segmented
            label={text.fields.acqMode.label}
            value={f.acqMode}
            onChange={set('acqMode')}
            options={[
              { value: ACQ_DIRECT, label: text.fields.acqDirect },
              { value: ACQ_CYCLES, label: text.fields.acqCycles },
            ]}
          />
          {f.acqMode === ACQ_DIRECT ? (
            <NumberField
              label={text.fields.tAcq.label}
              value={f.tAcq} onChange={set('tAcq')}
              units={TIME_UNITS} unit={f.tAcqu} onUnit={set('tAcqu')}
            />
          ) : (
            <>
              <NumberField
                label={text.fields.cycles.label}
                value={f.cycles} onChange={set('cycles')}
                units={['']} unit="" onUnit={() => {}}
              />
              <NumberField
                label={text.fields.clock.label}
                value={f.clock} onChange={set('clock')}
                units={FREQ_UNITS} unit={f.clocku} onUnit={set('clocku')}
              />
              <NumberField
                label={text.fields.acqFixed.label}
                value={f.acqFixed} onChange={set('acqFixed')}
                units={TIME_UNITS} unit={f.acqFixedu} onUnit={set('acqFixedu')}
                hint={text.fields.acqFixed.hint}
              />
            </>
          )}

          <NumberField
            label={text.fields.rSource.label}
            value={f.rSource} onChange={set('rSource')}
            units={RES_UNITS} unit={f.rSourceu} onUnit={set('rSourceu')}
          />
          <NumberField
            label={text.fields.rSeries.label}
            value={f.rSeries} onChange={set('rSeries')}
            units={RES_UNITS} unit={f.rSeriesu} onUnit={set('rSeriesu')}
          />
          <NumberField
            label={text.fields.rSwitch.label}
            value={f.rSwitch} onChange={set('rSwitch')}
            units={RES_UNITS} unit={f.rSwitchu} onUnit={set('rSwitchu')}
          />
          <NumberField
            label={text.fields.rDriver.label}
            value={f.rDriver} onChange={set('rDriver')}
            units={RES_UNITS} unit={f.rDriveru} onUnit={set('rDriveru')}
          />

          <NumberField
            label={text.fields.cFilter.label}
            value={f.cFilter} onChange={set('cFilter')}
            units={CAP_UNITS} unit={f.cFilteru} onUnit={set('cFilteru')}
          />
          <NumberField
            label={text.fields.rFilter.label}
            value={f.rFilter} onChange={set('rFilter')}
            units={RES_UNITS} unit={f.rFilteru} onUnit={set('rFilteru')}
            hint={text.fields.rFilter.hint}
          />
          <NumberField
            label={text.fields.noiseFreq.label}
            value={f.noiseFreq} onChange={set('noiseFreq')}
            units={FREQ_UNITS} unit={f.noiseFrequ} onUnit={set('noiseFrequ')}
            hint={text.fields.noiseFreq.hint}
          />

          <NumberField
            label={text.fields.vStep.label}
            value={f.vStep} onChange={set('vStep')}
            units={VOLT_UNITS} unit={f.vStepu} onUnit={set('vStepu')}
            hint={text.fields.vStep.hint}
          />
          <NumberField
            label={text.fields.tempC.label}
            value={f.tempC} onChange={set('tempC')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.bigResultLabel}</div>
                <div className="value">{fmtRes(r.maxEquivalentResistance)}</div>
                <div className="alt">
                  {text.altLabels.settles} {r.settles ? text.settleOk : text.settleFail}
                  &nbsp;·&nbsp; {text.altLabels.acq} {fmtEng(r.acquisitionTime, 's', 3)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.acquisitionTime}</td>
                    <td>{fmtEng(r.acquisitionTime, 's', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.rEq}</td>
                    <td>{fmtRes(r.rEq)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.cEq}</td>
                    <td>{fmtEng(r.cEq, 'F', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.tau}</td>
                    <td>{fmtEng(r.tau, 's', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.requiredSettlingTime}</td>
                    <td>{fmtEng(r.requiredSettlingTime, 's', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.settlingMargin}</td>
                    <td>{fmtEng(r.settlingMargin, 's', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.relativeError}</td>
                    <td>{fmt(r.relativeError, 6)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.allowedError}</td>
                    <td>{fmt(r.allowedError, 6)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.lsbVoltage}</td>
                    <td>{fmtVolt(r.lsbVoltage)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.voltageError}</td>
                    <td>{fmtVolt(r.voltageError)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.errorLsb}</td>
                    <td>{fmt(r.errorLsb, 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.maxEquivalentResistance}</td>
                    <td>{fmtRes(r.maxEquivalentResistance)}</td>
                  </tr>
                  {r.maxSourceResistance != null && (
                    <tr>
                      <td>{text.table.maxSourceResistance}</td>
                      <td>{fmtRes(r.maxSourceResistance)}</td>
                    </tr>
                  )}
                  {r.cutoffFrequency != null && (
                    <tr>
                      <td>{text.table.cutoffFrequency}</td>
                      <td>{fmtEng(r.cutoffFrequency, 'Hz', 4)}</td>
                    </tr>
                  )}
                  {r.filter && (
                    <tr>
                      <td>{text.table.filterAtten}</td>
                      <td>{fmt(r.filter.attenuationDb, 3)} dB</td>
                    </tr>
                  )}
                  {r.capacitorRatio != null && (
                    <tr>
                      <td>{text.table.capacitorRatio}</td>
                      <td>{fmt(r.capacitorRatio, 3)}×</td>
                    </tr>
                  )}
                  {r.droop != null && (
                    <tr>
                      <td>{text.table.droop}</td>
                      <td>{fmtVolt(r.droop)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>{text.table.thermalNoise}</td>
                    <td>{fmtVolt(r.thermalNoise)}</td>
                  </tr>
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
              <li>{text.detail.stepSource(f.vStep === '')}</li>
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
              xScale={sweepParam === SWEEP_SETTLING ? 'linear' : 'log'}
              yScale={sweepParam === SWEEP_SETTLING ? 'log' : 'linear'}
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
        toolKey="adc-settling-rc-filter"
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
