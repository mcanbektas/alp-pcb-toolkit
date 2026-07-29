import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtRes, fmtAmp, fmtPow, fmtPct, fmtVolt } from '../../../lib/num'
import { dividerRatio } from '../../../lib/divider'
import { SERIES_NAMES, errorPct } from '../../../lib/eseries'
import DividerSchematic from './schematic'
import {
  INITIAL_FORM, MODE_ANALYSIS, MODE_SYNTHESIS, SWEEP_PARAMS,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const R_UNITS = ['Ω', 'kΩ', 'MΩ']
const V_UNITS = ['V', 'mV']

// Eksen tikleri dar; ön ek boşluksuz yazılır (1k, 10k, 1M)
const axisRes = (v) => fmtEng(v, '', 3).replace(' ', '')

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

function worstLevel(findings) {
  return findings.reduce((acc, fd) => (LEVEL_RANK[fd.level] > LEVEL_RANK[acc] ? fd.level : acc), 'ok')
}

export default function VoltageDivider() {
  const [mode, setMode] = useState(MODE_ANALYSIS)
  const [sweep, setSweep] = useState('RL')
  const [pickIndex, setPickIndex] = useState(0)
  const { f, set } = useToolForm(INITIAL_FORM)
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(
    () => compute(mode, f, pickIndex, text.fieldLabels),
    [mode, f, pickIndex, text],
  )
  const s = useMemo(() => buildSweep(r, sweep), [r, sweep])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(() => buildReportSection({ mode, f, r, s, text }), [mode, f, r, s, text])
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || r.findings.length === 0) return null
    const worst = worstLevel(r.findings)
    const count = r.findings.filter((fd) => fd.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: ui.statusOk }
    if (worst === 'warn') return { cls: 'warn', text: ui.statusWarn(count) }
    return { cls: 'danger', text: ui.statusDanger(count) }
  }, [r, ui])

  const chartSeries = s ? [{ key: 'vout', name: 'V_out', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <Link className="backlink" to="/kategori/komponent">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <DividerSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            value={mode}
            onChange={(v) => { setMode(v); setPickIndex(0) }}
            options={[
              { value: MODE_ANALYSIS, label: text.modeAnalysis },
              { value: MODE_SYNTHESIS, label: text.modeSynthesis },
            ]}
          />

          <NumberField
            label={text.fields.Vin.label}
            value={f.Vin} onChange={set('Vin')}
            units={V_UNITS} unit={f.Vinu} onUnit={set('Vinu')}
          />

          {mode === MODE_ANALYSIS ? (
            <>
              <NumberField
                label={text.fields.R1.label}
                value={f.R1} onChange={set('R1')}
                units={R_UNITS} unit={f.R1u} onUnit={set('R1u')}
              />
              <NumberField
                label={text.fields.R2.label}
                value={f.R2} onChange={set('R2')}
                units={R_UNITS} unit={f.R2u} onUnit={set('R2u')}
              />
            </>
          ) : (
            <>
              <NumberField
                label={text.fields.Vout.label}
                value={f.Vout} onChange={set('Vout')}
                units={V_UNITS} unit={f.Voutu} onUnit={set('Voutu')}
              />
              <SelectField
                label={text.fields.series.label}
                value={f.series} onChange={(v) => { set('series')(v); setPickIndex(0) }}
                options={SERIES_NAMES.map((x) => ({ value: x, label: x }))}
              />
              <NumberField
                label={text.fields.rMin.label}
                value={f.rMin} onChange={set('rMin')}
                units={R_UNITS} unit={f.rMinu} onUnit={set('rMinu')}
              />
              <NumberField
                label={text.fields.rMax.label}
                value={f.rMax} onChange={set('rMax')}
                units={R_UNITS} unit={f.rMaxu} onUnit={set('rMaxu')}
                hint={text.fields.rMax.hint}
              />
            </>
          )}

          <NumberField
            label={text.fields.RL.label}
            value={f.RL} onChange={set('RL')}
            units={R_UNITS} unit={f.RLu} onUnit={set('RLu')}
            hint={text.fields.RL.hint}
            placeholder={text.fields.RL.placeholder}
          />

          <NumberField
            label={text.fields.Prated.label}
            value={f.Prated} onChange={set('Prated')}
            units={['mW']} unit="mW" onUnit={() => {}}
            hint={text.fields.Prated.hint}
            placeholder={text.fields.Prated.placeholder}
          />

          <NumberField
            label={text.fields.accept.label}
            value={f.accept} onChange={set('accept')}
            units={['%']} unit="%" onUnit={() => {}}
            hint={text.fields.accept.hint}
          />

          <label className="check-row">
            <input type="checkbox" checked={f.tol} onChange={(e) => set('tol')(e.target.checked)} />
            {text.fields.tolCheck}
          </label>

          {f.tol && (
            <>
              <NumberField
                label={text.fields.tolR1.label}
                value={f.tolR1} onChange={set('tolR1')}
                units={['%']} unit="%" onUnit={() => {}}
              />
              <NumberField
                label={text.fields.tolR2.label}
                value={f.tolR2} onChange={set('tolR2')}
                units={['%']} unit="%" onUnit={() => {}}
              />
              <NumberField
                label={text.fields.tolVin.label}
                value={f.tolVin} onChange={set('tolVin')}
                units={['%']} unit="%" onUnit={() => {}}
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Ana sonuç ---------- */}
        <section className="panel">
          <h2>{ui.result}</h2>

          {!r.ok ? (
            r.ambiguous ? (
              <p className="empty-note warn">{ui.thousandsNote(r.ambiguous)}</p>
            ) : (
              <p className="empty-note">{text.reasonText(r.reason)}</p>
            )
          ) : (
            <>
              <div className="big-result">
                <div className="label">
                  {r.RL !== null ? text.bigResultLoaded(r.RL) : text.bigResultUnloaded}
                </div>
                <div className="value">{fmtVolt(r.Vout)}</div>
                <div className="alt">
                  R1 = {fmtRes(r.R1, 3)} &nbsp;·&nbsp; R2 = {fmtRes(r.R2, 3)}
                  {r.targetVout != null && (
                    <> &nbsp;·&nbsp; {text.targetWord} {fmtVolt(r.targetVout)} ({text.pct(fmtPct(errorPct(r.Vout, r.targetVout)))})</>
                  )}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  {r.tolerance && (
                    <tr className="mini-head">
                      <td>{text.table.tolWindow}</td>
                      <td>
                        {fmtVolt(r.tolerance.min)} · {fmtVolt(r.tolerance.nom)} · {fmtVolt(r.tolerance.max)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>{text.table.unloadedOut}</td>
                    <td>{fmtVolt(r.base.Vout)}</td>
                  </tr>
                  {r.RL !== null && (
                    <>
                      <tr>
                        <td>{text.table.r2ParRL}</td>
                        <td>{fmtRes(r.base.loaded.R2eff)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.loadCurrent}</td>
                        <td>{fmtAmp(r.base.loaded.IL)}</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td>{text.table.dividerCurrent}</td>
                    <td>{fmtAmp(r.RL !== null ? r.base.loaded.Idiv : r.base.Idiv)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.sourceImpedance}</td>
                    <td>{fmtRes(r.Zout)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.p1}</td>
                    <td>{fmtPow(r.base.P1)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.p2}</td>
                    <td>{fmtPow(r.base.P2)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.totalPower}</td>
                    <td>{fmtPow(r.Vin * (r.RL !== null ? r.base.loaded.Idiv : r.base.Idiv))}</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">{ui.commentary}</h2>
              <ul className="commentary">
                {r.findings.map((fd) => {
                  const line = text.findingText(fd)
                  if (!line) return null
                  return (
                    <li key={fd.code} className={fd.level}>
                      <span className="mark" aria-hidden="true">{MARK[fd.level]}</span>
                      <span>{line}</span>
                    </li>
                  )
                })}
              </ul>

              {r.pairs && (
                <>
                  <h2 className="section">{text.pairsHeading(f.series)}</h2>
                  <table className="pick-table">
                    <thead>
                      <tr>
                        <th>R1</th>
                        <th>R2</th>
                        <th>V_out</th>
                        <th>{text.pairsCols.deviation}</th>
                        <th>I</th>
                        <th>{text.pairsCols.pMax}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.pairs.map((p, i) => (
                        <tr
                          key={`${p.R1}-${p.R2}`}
                          className={`pick${i === r.pickIndex ? ' on' : ''}`}
                          onClick={() => setPickIndex(i)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPickIndex(i) }
                          }}
                          aria-selected={i === r.pickIndex}
                        >
                          <td>{fmtRes(p.R1, 3)}</td>
                          <td>{fmtRes(p.R2, 3)}</td>
                          <td>{fmtVolt(p.Vout)}</td>
                          <td>{text.pct(fmtPct(p.EV))}</td>
                          <td>{fmtAmp(p.Idiv, 3)}</td>
                          <td>
                            {fmtPow(Math.max(p.P1, p.P2), 3)}
                            {p.overPower && <span className="flag"> !</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="method-note">{text.pairsNote}</p>
                </>
              )}
            </>
          )}
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>
                {r.mode === MODE_SYNTHESIS ? text.detail.modeSynthesis : text.detail.modeAnalysis}
              </li>
              <li>
                {text.detail.ratio(
                  fmt(r.Vout / r.Vin, 4),
                  fmt(dividerRatio(r.Vin, r.Vout).ratio ?? NaN, 4),
                )}
              </li>
              <li>{text.detail.sum(fmtRes(r.R1 + r.R2))}</li>
              {r.RL !== null && (
                <li>{text.detail.loaded(fmtRes(r.base.loaded.R2eff))}</li>
              )}
              {r.tolerance && (
                <li>{text.detail.corners}</li>
              )}
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
            value={sweep}
            onChange={setSweep}
            options={SWEEP_PARAMS.map((p) => ({ value: p, label: text.sweepLabel[p] }))}
          />
        </div>

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: 'V_out', tone: toneClass(0), kind: 'line' },
                ...(s.bandPoints ? [{ label: text.toleranceBandLegend, tone: toneClass(0), faded: true }] : []),
                ...s.refs.map((ref) => ({ label: text.refLabel[ref.key](ref.y), tone: 'tone-muted', kind: 'line' })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={text.sweepAxis[s.param]}
              yLabel="V_out (V)"
              series={chartSeries}
              band={s.bandPoints ? { name: text.toleranceBand, tone: toneClass(0), points: s.bandPoints } : null}
              refLines={s.refs.map((ref) => ({ key: ref.key, y: ref.y, label: text.refLabel[ref.key](ref.y) }))}
              marker={s.marker ? { ...s.marker, label: text.operatingPoint } : null}
              formatX={axisRes}
              formatY={(v) => fmt(v, 3)}
              caption={text.sweepCaption[s.param]}
            />

            <ChartDataTable
              xLabel={text.sweepAxis[s.param]}
              series={chartSeries}
              every={5}
              formatX={(v) => fmtRes(v, 3)}
              formatY={(v) => fmtVolt(v)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="divider"
        toolMode={mode}
        f={f}
        r={r}
        section={reportSection}
        schematicRef={schematicRef}
        chartRef={chartRef}
      />
    </>
  )
}
