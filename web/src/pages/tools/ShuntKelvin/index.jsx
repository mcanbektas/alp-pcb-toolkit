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
import { fmt, fmtEng, fmtRes, fmtVolt, fmtAmp, fmtPow, fmtPct } from '../../../lib/num'
import ShuntKelvinSchematic from './schematic'
import {
  INITIAL_FORM, SWEEP_PARAMS, SWEEP_CURRENT,
  SHUNT_DIRECT, SHUNT_FROM_VSENSE,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const CURRENT_UNITS = ['A', 'mA']
const RES_UNITS = ['mΩ', 'Ω', 'µΩ']
const VOLT_UNITS = ['mV', 'V', 'µV']
const POWER_UNITS = ['W', 'mW']
const THERMAL_UNITS = ['°C/W']

const axisEng = (v) => fmtEng(v, '', 3).replace(' ', '')

export default function ShuntKelvin() {
  const [sweepParam, setSweepParam] = useState(SWEEP_CURRENT)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  const saved = useSavedCalculation({
    toolKey: 'shunt-kelvin', initialForm: INITIAL_FORM, patch,
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
  }, [notes, ui])

  const chartSeries = !s ? [] : [{ key: sweepParam, name: text.sweepLabel[sweepParam], tone: toneClass(0), points: s.points }]

  return (
    <>
      <LangLink className="backlink" to="/kategori/akim-guc-bakir">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <ShuntKelvinSchematic ref={schematicRef} r={r} text={text.schematic} />

          <NumberField
            label={text.fields.iMax.label}
            value={f.iMax} onChange={set('iMax')}
            units={CURRENT_UNITS} unit={f.iMaxu} onUnit={set('iMaxu')}
          />

          <Segmented
            label={text.fields.shuntMode.label}
            value={f.shuntMode}
            onChange={set('shuntMode')}
            options={[
              { value: SHUNT_FROM_VSENSE, label: text.fields.shuntFromVsense },
              { value: SHUNT_DIRECT, label: text.fields.shuntDirect },
            ]}
          />
          {f.shuntMode === SHUNT_DIRECT ? (
            <NumberField
              label={text.fields.shunt.label}
              value={f.shunt} onChange={set('shunt')}
              units={RES_UNITS} unit={f.shuntu} onUnit={set('shuntu')}
            />
          ) : (
            <NumberField
              label={text.fields.vSenseFs.label}
              value={f.vSenseFs} onChange={set('vSenseFs')}
              units={VOLT_UNITS} unit={f.vSenseFsu} onUnit={set('vSenseFsu')}
            />
          )}

          <NumberField
            label={text.fields.iRms.label}
            value={f.iRms} onChange={set('iRms')}
            units={CURRENT_UNITS} unit={f.iRmsu} onUnit={set('iRmsu')}
            hint={text.fields.iRms.hint}
          />
          <NumberField
            label={text.fields.iPeak.label}
            value={f.iPeak} onChange={set('iPeak')}
            units={CURRENT_UNITS} unit={f.iPeaku} onUnit={set('iPeaku')}
          />
          <NumberField
            label={text.fields.iNominal.label}
            value={f.iNominal} onChange={set('iNominal')}
            units={CURRENT_UNITS} unit={f.iNominalu} onUnit={set('iNominalu')}
            hint={text.fields.iNominal.hint}
          />

          <NumberField
            label={text.fields.tolerance.label}
            value={f.tolerance} onChange={set('tolerance')}
            units={['%']} unit="%" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.tcrPpm.label}
            value={f.tcrPpm} onChange={set('tcrPpm')}
            units={['ppm/°C']} unit="ppm/°C" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.referenceTemp.label}
            value={f.referenceTemp} onChange={set('referenceTemp')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.ambient.label}
            value={f.ambient} onChange={set('ambient')}
            units={['°C']} unit="°C" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.gain.label}
            value={f.gain} onChange={set('gain')}
            units={['']} unit="" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.gainTolerance.label}
            value={f.gainTolerance} onChange={set('gainTolerance')}
            units={['%']} unit="%" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.vos.label}
            value={f.vos} onChange={set('vos')}
            units={['µV', 'mV']} unit={f.vosu} onUnit={set('vosu')}
          />
          <NumberField
            label={text.fields.sharedResistance.label}
            value={f.sharedResistance} onChange={set('sharedResistance')}
            units={RES_UNITS} unit={f.sharedResistanceu} onUnit={set('sharedResistanceu')}
            hint={text.fields.sharedResistance.hint}
          />
          <label className="check-row">
            <input
              type="checkbox" checked={f.kelvin}
              onChange={(e) => set('kelvin')(e.target.checked)}
            />
            {text.fields.kelvinCheck}
          </label>

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
                label={text.fields.thermalResistance.label}
                value={f.thermalResistance} onChange={set('thermalResistance')}
                units={THERMAL_UNITS} unit={f.thermalResistanceu} onUnit={set('thermalResistanceu')}
              />
              <NumberField
                label={text.fields.ratedPower.label}
                value={f.ratedPower} onChange={set('ratedPower')}
                units={POWER_UNITS} unit={f.ratedPoweru} onUnit={set('ratedPoweru')}
              />
              <NumberField
                label={text.fields.derating.label}
                value={f.derating} onChange={set('derating')}
                units={['%']} unit="%" onUnit={() => {}}
                hint={text.fields.derating.hint}
              />
            </>
          )}

          <label className="check-row">
            <input
              type="checkbox" checked={f.hasAdc}
              onChange={(e) => set('hasAdc')(e.target.checked)}
            />
            {text.fields.hasAdcCheck}
          </label>
          {f.hasAdc && (
            <>
              <NumberField
                label={text.fields.vRef.label}
                value={f.vRef} onChange={set('vRef')}
                units={VOLT_UNITS} unit={f.vRefu} onUnit={set('vRefu')}
              />
              <NumberField
                label={text.fields.bits.label}
                value={f.bits} onChange={set('bits')}
                units={['bit']} unit="bit" onUnit={() => {}}
              />
              <NumberField
                label={text.fields.enob.label}
                value={f.enob} onChange={set('enob')}
                units={['bit']} unit="bit" onUnit={() => {}}
                hint={text.fields.enob.hint}
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
                <div className="value">{fmtRes(r.shunt)}</div>
                <div className="alt">
                  {text.altLabels.power} {fmtPow(r.power)}
                  {r.currentResolution != null && (
                    <>&nbsp;·&nbsp; {text.altLabels.resolution} {fmtAmp(r.currentResolution)}</>
                  )}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr><td>{text.table.senseVoltageFs}</td><td>{fmtVolt(r.senseVoltageFs)}</td></tr>
                  <tr><td>{text.table.power}</td><td>{fmtPow(r.power)}</td></tr>
                  {r.peakPower != null && (
                    <tr><td>{text.table.peakPower}</td><td>{fmtPow(r.peakPower)}</td></tr>
                  )}
                  {r.powerMargin != null && (
                    <tr><td>{text.table.powerMargin}</td><td>{fmt(r.powerMargin, 4)}×</td></tr>
                  )}
                  {r.temperatureRise != null && (
                    <>
                      <tr><td>{text.table.temperatureRise}</td><td>{fmt(r.temperatureRise, 3)} °C</td></tr>
                      <tr><td>{text.table.temperature}</td><td>{fmt(r.temperature, 3)} °C</td></tr>
                    </>
                  )}
                  <tr><td>{text.table.resistanceHot}</td><td>{fmtRes(r.resistanceHot)}</td></tr>
                  <tr><td>{text.table.tcrErrorRow}</td><td>{text.pct(fmtPct(r.tcrError * 100, 4))}</td></tr>
                  <tr><td>{text.table.amplifierOutputFs}</td><td>{fmtVolt(r.amplifierOutputFs)}</td></tr>
                  <tr><td>{text.table.offsetCurrentError}</td><td>{fmtAmp(r.offsetCurrentError)}</td></tr>
                  {r.currentResolution != null && (
                    <tr><td>{text.table.currentResolution}</td><td>{fmtAmp(r.currentResolution)}</td></tr>
                  )}
                  {r.currentResolutionEnob != null && (
                    <tr><td>{text.table.currentResolutionEnob}</td><td>{fmtAmp(r.currentResolutionEnob)}</td></tr>
                  )}
                  <tr><td>{text.table.sharedError}</td><td>{text.pct(fmt(r.sharedError * 100, 4))}</td></tr>
                  <tr><td>{text.table.offsetError}</td><td>{text.pct(fmt(r.offsetError * 100, 4))}</td></tr>
                  <tr className="mini-head"><td colSpan={2}>{text.table.worstCaseError} / {text.table.rssError}</td></tr>
                  <tr><td>{text.table.worstCaseError}</td><td>{text.pct(fmt(r.worstCaseError * 100, 4))}</td></tr>
                  <tr><td>{text.table.rssError}</td><td>{text.pct(fmt(r.rssError * 100, 4))}</td></tr>
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
              <li>{text.detail.errorComponentsNote}</li>
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
              xScale={sweepParam === SWEEP_CURRENT ? 'log' : 'linear'}
              yScale={sweepParam === SWEEP_CURRENT ? 'log' : 'linear'}
              xLabel={text.sweepAxis[sweepParam]}
              yLabel={text.sweepYLabel[sweepParam]}
              series={chartSeries}
              marker={s.marker ? { ...s.marker, label: text.operatingPoint } : null}
              formatX={axisEng}
              formatY={(v) => fmt(v, 4)}
              caption={text.sweepCaption[sweepParam]}
            />

            <ChartDataTable
              xLabel={text.sweepAxis[sweepParam]}
              series={chartSeries}
              every={8}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 5)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="shunt-kelvin"
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
