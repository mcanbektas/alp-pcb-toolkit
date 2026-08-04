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
import { fmt, fmtEng, fmtVolt, fmtAmp, fmtPow, fmtRes } from '../../../lib/num'
import TvsEsdSchematic from './schematic'
import {
  INITIAL_FORM, SWEEP_PARAMS, SWEEP_RSOURCE, SWEEP_CLAMP_CURVE,
  SWEEP_OVERSHOOT, SWEEP_CAPACITANCE,
  RDYN_MODE_DIRECT, RDYN_MODE_DATASHEET, RDYN_MODES,
  TVS_WAVEFORM_CUSTOM, WAVEFORMS,
  DIDT_UNITS,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const VOLTAGE_UNITS = ['V', 'mV', 'kV']
const RESISTANCE_UNITS = ['Ω', 'mΩ', 'kΩ']
const CURRENT_UNITS = ['A', 'mA', 'kA']
const TIME_UNITS = ['µs', 'ns', 'ms', 's']
const INDUCTANCE_UNITS = ['nH', 'pH', 'µH', 'H']
const CAPACITANCE_UNITS = ['pF', 'nF', 'µF', 'F']

const axisEng = (v) => fmtEng(v, '', 3).replace(' ', '')
const fmtJoule = (x) => fmtEng(x, 'J', 3)
const fmtHertz = (x) => fmtEng(x, 'Hz', 4)

export default function TvsEsdProtection() {
  const [sweepParam, setSweepParam] = useState(SWEEP_RSOURCE)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'tvs-esd-protection', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const notes = useMemo(() => text.commentary(r), [r, text])
  const s = useMemo(() => buildSweep(r, sweepParam), [r, sweepParam])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(() => buildReportSection({ f, r, s, text }), [f, r, s, text])
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const levels = notes.map((n) => n.level)
    const worst = worstLevel(levels)
    return statusChip(worst, countAtLevel(levels, worst), ui)
  }, [notes, ui])

  const chartSeries = !s
    ? []
    : [{ key: sweepParam, name: text.sweepLabel[sweepParam], tone: toneClass(0), points: s.points }]

  return (
    <>
      <LangLink className="backlink" to="/kategori/komponent">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>
          <TvsEsdSchematic ref={schematicRef} r={r} text={text.schematic} />

          <NumberField
            label={text.fields.vSurge.label}
            value={f.vSurge} onChange={set('vSurge')}
            units={VOLTAGE_UNITS} unit={f.vSurgeu} onUnit={set('vSurgeu')}
            hint={text.fields.vSurge.hint}
          />
          <NumberField
            label={text.fields.rSource.label}
            value={f.rSource} onChange={set('rSource')}
            units={RESISTANCE_UNITS} unit={f.rSourceu} onUnit={set('rSourceu')}
          />
          <NumberField
            label={text.fields.rSeries.label}
            value={f.rSeries} onChange={set('rSeries')}
            units={RESISTANCE_UNITS} unit={f.rSeriesu} onUnit={set('rSeriesu')}
            hint={text.fields.rSeries.hint}
          />
          <NumberField
            label={text.fields.vBR.label}
            value={f.vBR} onChange={set('vBR')}
            units={VOLTAGE_UNITS} unit={f.vBRu} onUnit={set('vBRu')}
          />
          <NumberField
            label={text.fields.iT.label}
            value={f.iT} onChange={set('iT')}
            units={CURRENT_UNITS} unit={f.iTu} onUnit={set('iTu')}
            hint={text.fields.iT.hint}
          />

          <Segmented
            label={text.rDynModeGroup}
            value={f.rDynMode} onChange={set('rDynMode')}
            options={RDYN_MODES.map((m) => ({ value: m, label: text.rDynModeLabel[m] }))}
          />
          {f.rDynMode === RDYN_MODE_DIRECT && (
            <NumberField
              label={text.fields.rDyn.label}
              value={f.rDyn} onChange={set('rDyn')}
              units={RESISTANCE_UNITS} unit={f.rDynu} onUnit={set('rDynu')}
              hint={text.fields.rDyn.hint}
            />
          )}
          {f.rDynMode === RDYN_MODE_DATASHEET && (
            <>
              <NumberField
                label={text.fields.vCDatasheet.label}
                value={f.vCDatasheet} onChange={set('vCDatasheet')}
                units={VOLTAGE_UNITS} unit={f.vCDatasheetu} onUnit={set('vCDatasheetu')}
              />
              <NumberField
                label={text.fields.iPPDatasheet.label}
                value={f.iPPDatasheet} onChange={set('iPPDatasheet')}
                units={CURRENT_UNITS} unit={f.iPPDatasheetu} onUnit={set('iPPDatasheetu')}
              />
            </>
          )}

          <NumberField
            label={text.fields.vNormalMax.label}
            value={f.vNormalMax} onChange={set('vNormalMax')}
            units={VOLTAGE_UNITS} unit={f.vNormalMaxu} onUnit={set('vNormalMaxu')}
            hint={text.fields.vNormalMax.hint}
          />
          <NumberField
            label={text.fields.vRWM.label}
            value={f.vRWM} onChange={set('vRWM')}
            units={VOLTAGE_UNITS} unit={f.vRWMu} onUnit={set('vRWMu')}
          />
          <NumberField
            label={text.fields.vProtectedMax.label}
            value={f.vProtectedMax} onChange={set('vProtectedMax')}
            units={VOLTAGE_UNITS} unit={f.vProtectedMaxu} onUnit={set('vProtectedMaxu')}
            hint={text.fields.vProtectedMax.hint}
          />

          <label className="check-row">
            <input
              type="checkbox" checked={f.hasEnergy}
              onChange={(e) => set('hasEnergy')(e.target.checked)}
            />
            {text.fields.hasEnergyCheck}
          </label>
          {f.hasEnergy && (
            <>
              <NumberField
                label={text.fields.tp.label}
                value={f.tp} onChange={set('tp')}
                units={TIME_UNITS} unit={f.tpu} onUnit={set('tpu')}
              />
              <Segmented
                label={text.waveformGroup}
                value={f.waveform} onChange={set('waveform')}
                options={WAVEFORMS.map((w) => ({ value: w, label: text.waveformLabel[w] }))}
              />
              {f.waveform === TVS_WAVEFORM_CUSTOM && (
                <NumberField
                  label={text.fields.kw.label}
                  value={f.kw} onChange={set('kw')}
                  hint={text.fields.kw.hint}
                />
              )}
            </>
          )}

          <label className="check-row">
            <input
              type="checkbox" checked={f.hasOvershoot}
              onChange={(e) => set('hasOvershoot')(e.target.checked)}
            />
            {text.fields.hasOvershootCheck}
          </label>
          {f.hasOvershoot && (
            <>
              <NumberField
                label={text.fields.lPath.label}
                value={f.lPath} onChange={set('lPath')}
                units={INDUCTANCE_UNITS} unit={f.lPathu} onUnit={set('lPathu')}
              />
              <NumberField
                label={text.fields.didt.label}
                value={f.didt} onChange={set('didt')}
                units={DIDT_UNITS} unit={f.didtu} onUnit={set('didtu')}
              />
            </>
          )}

          <label className="check-row">
            <input
              type="checkbox" checked={f.hasCapacitance}
              onChange={(e) => set('hasCapacitance')(e.target.checked)}
            />
            {text.fields.hasCapacitanceCheck}
          </label>
          {f.hasCapacitance && (
            <NumberField
              label={text.fields.cTvs.label}
              value={f.cTvs} onChange={set('cTvs')}
              units={CAPACITANCE_UNITS} unit={f.cTvsu} onUnit={set('cTvsu')}
            />
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        {/* İç `r.ok &&` kapısı gerekli: children JSX'i ResultPanel çizmese de
            burada kurulur — bkz. VoltageDivider'daki aynı not. */}
        <ResultPanel r={r} reason={text.reasonText}>
          {r.ok && (
            <>
              <div className="big-result">
                <div className="label">{text.resultCurrentLabel}</div>
                <div className="value">{fmtAmp(r.solver.current)}</div>
                <div className="alt">{fmtPow(r.peakPower)}&nbsp;·&nbsp;{fmtVolt(r.vClamp)}</div>
              </div>
              {status && <span className={`status ${status.cls}`}>{status.text}</span>}
              <table className="result-table">
                <tbody>
                  <tr>
                    <th>{text.table.method}</th>
                    <td>{text.methodLabel[r.solver.method]}</td>
                  </tr>
                  {r.solver.method === 'bisection' && (
                    <tr>
                      <th>{text.table.iterations}</th>
                      <td>{r.solver.iterations} / {r.solver.expansions}</td>
                    </tr>
                  )}
                  <tr><th>{text.table.rDyn}</th><td>{fmtRes(r.rDyn)}</td></tr>
                  <tr><th>{text.table.vClamp}</th><td>{fmtVolt(r.vClamp)}</td></tr>
                  <tr><th>{text.table.peakPower}</th><td>{fmtPow(r.peakPower)}</td></tr>
                  {r.energy != null && (
                    <tr><th>{text.table.energy}</th><td>{fmtJoule(r.energy)}</td></tr>
                  )}
                  {r.overshoot && (
                    <>
                      <tr><th>{text.table.overshootVL}</th><td>{fmtVolt(r.overshoot.vL)}</td></tr>
                      <tr><th>{text.table.icPeak}</th><td>{fmtVolt(r.overshoot.icPeak)}</td></tr>
                    </>
                  )}
                  {r.capacitanceCutoffHz != null && (
                    <tr><th>{text.table.capCutoff}</th><td>{fmtHertz(r.capacitanceCutoffHz)}</td></tr>
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
              xScale={sweepParam === SWEEP_CLAMP_CURVE ? 'linear' : 'log'}
              yScale={sweepParam === SWEEP_OVERSHOOT || sweepParam === SWEEP_CAPACITANCE ? 'log' : 'linear'}
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
        toolKey="tvs-esd-protection"
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
