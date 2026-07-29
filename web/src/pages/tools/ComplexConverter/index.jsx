import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtOhm } from '../../../lib/num'
import ComplexSchematic from './schematic'
import {
  INITIAL_FORM, MODES, MODE_RECT,
  SWEEP_PARAMS, SWEEP_MAG, SWEEP_PHASE,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function ComplexConverter() {
  const { f, set } = useToolForm(INITIAL_FORM)
  const [sweep, setSweep] = useState(SWEEP_MAG)
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const s = useMemo(() => buildSweep(r, sweep), [r, sweep])
  const notes = useMemo(() => text.commentary(r), [r, text])
  const validity = useMemo(() => text.validityNotes(r), [r, text])

  const reportSection = useMemo(
    () => buildReportSection({ mode: f.mode, f, r, s, text }),
    [f, r, s, text],
  )
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: ui.statusOk }
    if (worst === 'warn') return { cls: 'warn', text: ui.statusWarn(count) }
    return { cls: 'danger', text: ui.statusDanger(count) }
  }, [r, notes, ui])

  const chartSeries = s
    ? [{ key: s.param, name: text.chart.series[s.param], tone: toneClass(0), points: s.points }]
    : []

  const formatY = sweep === SWEEP_PHASE ? (v) => `${fmt(v, 3)}°` : (v) => fmtOhm(v)

  return (
    <>
      {/* 1) BAŞLIK */}
      <Link className="backlink" to="/kategori/donusturucular">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      {/* 2) ÜÇ PANEL */}
      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <ComplexSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            value={f.mode}
            onChange={set('mode')}
            options={MODES.map((m) => ({ value: m, label: text.modeLabel[m] }))}
          />

          {f.mode === MODE_RECT ? (
            <>
              <NumberField
                label={text.fields.R.label}
                value={f.R} onChange={set('R')}
                units={['Ω', 'mΩ', 'kΩ', 'MΩ']} unit={f.Ru} onUnit={set('Ru')}
                hint={text.fields.R.hint}
              />
              <NumberField
                label={text.fields.X.label}
                value={f.X} onChange={set('X')}
                units={['Ω', 'mΩ', 'kΩ', 'MΩ']} unit={f.Xu} onUnit={set('Xu')}
                hint={text.fields.X.hint}
              />
            </>
          ) : (
            <>
              <NumberField
                label={text.fields.mag.label}
                value={f.mag} onChange={set('mag')}
                units={['Ω', 'mΩ', 'kΩ', 'MΩ']} unit={f.magu} onUnit={set('magu')}
                hint={text.fields.mag.hint}
              />
              <NumberField
                label={text.fields.phase.label}
                value={f.phase} onChange={set('phase')}
                units={['°', 'rad']} unit={f.phaseu} onUnit={set('phaseu')}
                hint={text.fields.phase.hint}
              />
            </>
          )}
        </section>

        {/* ---------- Orta: Sonuç ---------- */}
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
                <div className="label">{text.bigLabel[r.mode]}</div>
                <div className="value">
                  {r.mode === MODE_RECT
                    ? text.polarText(r.magnitude, r.phaseDeg)
                    : text.rectText(r.R, r.X)}
                </div>
                <div className="alt">
                  {r.mode === MODE_RECT
                    ? <>{fmt(r.phase, 5)} rad &nbsp;·&nbsp; {text.kindLabel[r.kind]}</>
                    : <>{text.polarText(r.magnitude, r.phaseDeg)} &nbsp;·&nbsp; {text.kindLabel[r.kind]}</>}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>{text.table.rect}</td>
                    <td>{text.table.rectSub}</td>
                  </tr>
                  <tr><td>{text.table.real}</td><td>{fmtOhm(r.R)}</td></tr>
                  <tr>
                    <td>{text.table.imag}</td>
                    <td>
                      {fmtOhm(r.X)} <span className="sub">({text.kindLabel[r.kind]})</span>
                    </td>
                  </tr>
                  <tr><td>{text.table.notation}</td><td>{text.rectText(r.R, r.X)}</td></tr>

                  <tr className="mini-head">
                    <td>{text.table.polar}</td>
                    <td>{text.table.polarSub}</td>
                  </tr>
                  <tr><td>{text.table.magnitude}</td><td>{fmtOhm(r.magnitude)}</td></tr>
                  <tr><td>{text.table.phaseDeg}</td><td>{fmt(r.phaseDeg, 5)}°</td></tr>
                  <tr><td>{text.table.phaseRad}</td><td>{fmt(r.phase, 5)} rad</td></tr>
                  <tr>
                    <td>{text.table.notation}</td>
                    <td>{text.polarText(r.magnitude, r.phaseDeg)}</td>
                  </tr>

                  <tr className="mini-head">
                    <td>{text.table.position}</td>
                    <td>{text.table.positionSub}</td>
                  </tr>
                  <tr><td>{text.table.quadrant}</td><td>{text.quadrantLabel[r.quadrant]}</td></tr>
                  {r.wrapped && (
                    <tr>
                      <td>{text.table.entered}</td>
                      <td>
                        {fmt(r.phaseEnteredDeg, 6)}°{' '}
                        <span className="sub">{text.table.enteredSub}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {r.check && (
                <>
                  <h2 className="section">{text.checkHeading}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr><td>R = |Z|·cos φ</td><td>{fmtOhm(r.check.R)}</td></tr>
                      <tr><td>X = |Z|·sin φ</td><td>{fmtOhm(r.check.X)}</td></tr>
                      <tr><td>|Z| = √(R² + X²)</td><td>{fmtOhm(r.check.magnitude)}</td></tr>
                      <tr><td>φ = atan2(X, R)</td><td>{fmt(r.check.phaseDeg, 5)}°</td></tr>
                    </tbody>
                  </table>
                </>
              )}

              <h2 className="section">{ui.commentary}</h2>
              <ul className="commentary">
                {notes.map((n) => (
                  <li key={n.text} className={n.level}>
                    <span className="mark" aria-hidden="true">{MARK[n.level]}</span>
                    <span>{n.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ---------- Sağ: Teknik detay ---------- */}
        <section className="panel panel-detail">
          <h2>{ui.technicalDetail}</h2>

          <pre className="formula">{text.formula}</pre>

          {r.ok && (
            <ul className="detail-list">
              <li>{text.detail.input(r)}</li>
              <li>{text.detail.atan2}</li>
              <li>{text.detail.hypot}</li>
              <li>{text.detail.threshold}</li>
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {r.ok && validity.map((w) => <li key={w} className="w">{w}</li>)}
            {text.rangeNotes.map((n) => <li key={n}>{n}</li>)}
            {text.sourceNotes.map((n) => <li key={n}>{n}</li>)}
            {text.validity.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      </div>

      {/* 3) ALT: Parametrik grafik */}
      <section className="panel panel-chart">
        <div className="chart-head">
          <h2>{ui.chart}</h2>
          <Segmented
            value={sweep}
            onChange={setSweep}
            options={SWEEP_PARAMS.map((p) => ({ value: p, label: text.chart.sweepLabel[p] }))}
          />
        </div>

        {s ? (
          <>
            <ChartLegend
              items={[
                { label: text.chart.series[s.param], tone: toneClass(0), kind: 'line' },
                ...s.refs.map((ref) => ({
                  label: text.chart.refLabel[ref.key](ref.y), tone: 'tone-muted', kind: 'line',
                })),
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="linear"
              xLabel={text.chart.x}
              yLabel={text.chart.axis[s.param]}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key, y: ref.y, label: text.chart.refLabel[ref.key](ref.y),
              }))}
              marker={s.marker ? { ...s.marker, label: text.chart.marker } : null}
              formatX={(v) => fmtOhm(v)}
              formatY={formatY}
              caption={text.chart.caption[s.param]}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={10}
              formatX={(v) => fmtOhm(v)}
              formatY={formatY}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="complex-conv"
        toolMode={f.mode}
        f={f}
        r={r}
        section={reportSection}
        schematicRef={schematicRef}
        chartRef={chartRef}
      />

      {/* 4) GERİ BAĞLANTI */}
    </>
  )
}
