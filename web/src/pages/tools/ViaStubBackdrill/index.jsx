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
import ViaStubSchematic from './schematic'
import {
  INITIAL_FORM, SWEEP_PARAMS, SWEEP_STUB,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const LEN_UNITS = ['mm', 'µm', 'mil']
const TIME_UNITS = ['ns', 'ps', 'µs']
const FREQ_UNITS = ['Hz', 'kHz', 'MHz', 'GHz']

const axisEng = (v) => fmtEng(v, '', 3).replace(' ', '')

export default function ViaStubBackdrill() {
  const [sweepParam, setSweepParam] = useState(SWEEP_STUB)
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  const saved = useSavedCalculation({
    toolKey: 'via-stub-backdrill', initialForm: INITIAL_FORM, patch,
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
      <LangLink className="backlink" to="/kategori/via-padstack">{text.backlink}</LangLink>

      <ToolHeader title={text.title} intro={text.intro} />

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <ViaStubSchematic ref={schematicRef} r={r} text={text.schematic} />

          <NumberField
            label={text.fields.viaTotal.label}
            value={f.viaTotal} onChange={set('viaTotal')}
            units={LEN_UNITS} unit={f.viaTotalu} onUnit={set('viaTotalu')}
          />
          <NumberField
            label={text.fields.used.label}
            value={f.used} onChange={set('used')}
            units={LEN_UNITS} unit={f.usedu} onUnit={set('usedu')}
            hint={text.fields.used.hint}
          />
          <NumberField
            label={text.fields.epsR.label}
            value={f.epsR} onChange={set('epsR')}
            units={['']} unit="" onUnit={() => {}}
          />
          <NumberField
            label={text.fields.safety.label}
            value={f.safety} onChange={set('safety')}
            units={LEN_UNITS} unit={f.safetyu} onUnit={set('safetyu')}
            hint={text.fields.safety.hint}
          />

          <NumberField
            label={text.fields.tr.label}
            value={f.tr} onChange={set('tr')}
            units={TIME_UNITS} unit={f.tru} onUnit={set('tru')}
            hint={text.fields.tr.hint}
          />
          <NumberField
            label={text.fields.fMax.label}
            value={f.fMax} onChange={set('fMax')}
            units={FREQ_UNITS} unit={f.fMaxu} onUnit={set('fMaxu')}
            hint={text.fields.fMax.hint}
          />

          <label className="check-row">
            <input
              type="checkbox" checked={f.hasBackdrill}
              onChange={(e) => set('hasBackdrill')(e.target.checked)}
            />
            {text.fields.hasBackdrillCheck}
          </label>

          {f.hasBackdrill && (
            <>
              <NumberField
                label={text.fields.removed.label}
                value={f.removed} onChange={set('removed')}
                units={LEN_UNITS} unit={f.removedu} onUnit={set('removedu')}
              />
              <NumberField
                label={text.fields.depthTol.label}
                value={f.depthTol} onChange={set('depthTol')}
                units={LEN_UNITS} unit={f.depthTolu} onUnit={set('depthTolu')}
              />
              <NumberField
                label={text.fields.boardThickness.label}
                value={f.boardThickness} onChange={set('boardThickness')}
                units={LEN_UNITS} unit={f.boardThicknessu} onUnit={set('boardThicknessu')}
                hint={text.fields.boardThickness.hint}
              />
            </>
          )}

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
                label={text.fields.fTarget.label}
                value={f.fTarget} onChange={set('fTarget')}
                units={FREQ_UNITS} unit={f.fTargetu} onUnit={set('fTargetu')}
              />
              <NumberField
                label={text.fields.fabricationTol.label}
                value={f.fabricationTol} onChange={set('fabricationTol')}
                units={LEN_UNITS} unit={f.fabricationTolu} onUnit={set('fabricationTolu')}
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
                <div className="value">{fmtEng(r.resonance, 'Hz', 3)}</div>
                <div className="alt">
                  {text.altLabels.stub} {fmtEng(r.stub, 'm', 3)}
                  &nbsp;·&nbsp; {text.altLabels.roundTrip} {fmtEng(r.roundTrip, 's', 3)}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.stub}</td>
                    <td>{fmtEng(r.stub, 'm', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.velocity}</td>
                    <td>{fmtEng(r.velocity, 'm/s', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.resonance}</td>
                    <td>{fmtEng(r.resonance, 'Hz', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.roundTrip}</td>
                    <td>{fmtEng(r.roundTrip, 's', 4)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.harmonics}</td>
                    <td>{r.harmonics.map((h) => fmtEng(h, 'Hz', 3)).join(' · ')}</td>
                  </tr>
                  {r.kt != null && (
                    <tr>
                      <td>{text.table.kt}</td>
                      <td>{fmt(r.kt, 4)} — {text.ktClassLabel(r.ktClass)}</td>
                    </tr>
                  )}
                  {r.margin != null && (
                    <tr>
                      <td>{text.table.margin}</td>
                      <td>{fmt(r.margin, 4)}×</td>
                    </tr>
                  )}
                  {r.residual && (
                    <>
                      <tr className="mini-head"><td colSpan={2}>{text.schematic.residual}</td></tr>
                      <tr>
                        <td>{text.table.residualNominal}</td>
                        <td>{fmtEng(r.residual.nominal, 'm', 4)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.residualWorst}</td>
                        <td>{fmtEng(r.residual.worstCase, 'm', 4)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.residualBest}</td>
                        <td>{fmtEng(r.residual.bestCase, 'm', 4)}</td>
                      </tr>
                      {/* Stub tamamen kalktığında çeyrek dalga rezonansı yoktur;
                          motor bu durumda `null` döner (bkz. lib/viaStub.js). */}
                      <tr>
                        <td>{text.table.resonanceNominal}</td>
                        <td>
                          {r.residual.resonanceNominal != null
                            ? fmtEng(r.residual.resonanceNominal, 'Hz', 4)
                            : '—'}
                        </td>
                      </tr>
                      <tr>
                        <td>{text.table.resonanceWorst}</td>
                        <td>
                          {r.residual.resonanceWorstCase != null
                            ? fmtEng(r.residual.resonanceWorstCase, 'Hz', 4)
                            : '—'}
                        </td>
                      </tr>
                      <tr>
                        <td>{text.table.resonanceGain}</td>
                        <td>
                          {r.residual.resonanceGain != null
                            ? `${fmt(r.residual.resonanceGain, 4)}×`
                            : '—'}
                        </td>
                      </tr>
                    </>
                  )}
                  {r.backdrillTarget && (
                    <>
                      <tr className="mini-head"><td colSpan={2}>{text.fields.hasTargetCheck}</td></tr>
                      <tr>
                        <td>{text.table.targetAllowed}</td>
                        <td>{fmtEng(r.backdrillTarget.allowed, 'm', 4)}</td>
                      </tr>
                      {!r.backdrillTarget.error && (
                        <>
                          <tr>
                            <td>{text.table.targetNominal}</td>
                            <td>{fmtEng(r.backdrillTarget.nominalTarget, 'm', 4)}</td>
                          </tr>
                          <tr>
                            <td>{text.table.targetRemoval}</td>
                            <td>{fmtEng(r.backdrillTarget.requiredRemoval, 'm', 4)}</td>
                          </tr>
                        </>
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
              <li>{text.detail.harmonicNote}</li>
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
              xScale={sweepParam === SWEEP_STUB ? 'log' : 'linear'}
              yScale="log"
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
        toolKey="via-stub-backdrill"
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
