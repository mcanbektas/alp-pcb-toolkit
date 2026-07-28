import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import SelectField from '../../../components/SelectField'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import useToolForm from '../../../hooks/useToolForm'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng } from '../../../lib/num'
import LengthSchematic from './schematic'
import { INITIAL_FORM, UNITS, SIG_VALUES, compute, buildSweep } from './model'
import { getText } from './text'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function LengthConverter() {
  const { f, set } = useToolForm(INITIAL_FORM)
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: ui.statusOk }
    if (worst === 'warn') return { cls: 'warn', text: ui.statusWarn(count) }
    return { cls: 'danger', text: ui.statusDanger(count) }
  }, [r, notes, ui])

  const chartSeries = s ? [{ key: 'mil', name: 'mil', tone: toneClass(0), points: s.points }] : []

  return (
    <>
      <Link className="backlink" to="/kategori/donusturucular">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <LengthSchematic r={r} text={text.schematic} />

          <NumberField
            label={text.fields.L.label}
            value={f.L} onChange={set('L')}
            units={UNITS} unit={f.Lu} onUnit={set('Lu')}
            hint={text.fields.L.hint}
          />

          <SelectField
            label={text.fields.target.label}
            value={f.target} onChange={set('target')}
            options={UNITS.map((u) => ({ value: u, label: text.unitLabel[u] }))}
            hint={text.fields.target.hint}
          />

          <SelectField
            label={text.fields.sig.label}
            value={f.sig} onChange={set('sig')}
            options={SIG_VALUES.map((n) => ({ value: String(n), label: text.sigLabel(n) }))}
            hint={text.fields.sig.hint}
          />
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
                <div className="label">{text.bigLabel(text.unitRow[r.target])}</div>
                <div className="value">{fmt(r.targetValue, r.sig)} {r.target}</div>
                <div className="alt">
                  {fmt(r.all.mm, r.sig)} mm &nbsp;·&nbsp; {fmt(r.all.mil, r.sig)} mil
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head"><td>{text.table.headBoard}</td><td>{text.table.headBoardUnits}</td></tr>
                  <tr>
                    <td>{text.unitRow.mm}</td>
                    <td>
                      {fmt(r.all.mm, r.sig)} mm
                      {r.target === 'mm' && <span className="sub"> {text.table.targetTag}</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>{text.unitRow['µm']}</td>
                    <td>
                      {fmt(r.all.um, r.sig)} µm
                      {r.target === 'µm' && <span className="sub"> {text.table.targetTag}</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>{text.unitRow.mil}</td>
                    <td>
                      {fmt(r.all.mil, r.sig)} mil
                      {r.target === 'mil' && <span className="sub"> {text.table.targetTag}</span>}
                    </td>
                  </tr>

                  <tr className="mini-head"><td>{text.table.headOther}</td><td>{text.table.headOtherUnits}</td></tr>
                  <tr>
                    <td>{text.unitRow.inch}</td>
                    <td>
                      {fmt(r.all.inch, r.sig)} inch
                      {r.target === 'inch' && <span className="sub"> {text.table.targetTag}</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>{text.unitRow.cm}</td>
                    <td>
                      {fmt(r.all.cm, r.sig)} cm
                      {r.target === 'cm' && <span className="sub"> {text.table.targetTag}</span>}
                    </td>
                  </tr>
                  <tr>
                    <td>{text.unitRow.m}</td>
                    <td>
                      {fmt(r.all.m, r.sig)} m
                      {r.target === 'm' && <span className="sub"> {text.table.targetTag}</span>}
                    </td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">{text.commonSection}</h2>
              <table className="result-table">
                <tbody>
                  <tr className="mini-head"><td>{text.commonHead.mil}</td><td>{text.commonHead.mm}</td></tr>
                  {r.common.map((c, i) => (
                    <tr key={c.mil}>
                      <td>{c.mil} mil</td>
                      <td>
                        {fmt(c.mm, 4)} mm
                        {i === r.nearest && <span className="sub"> {text.nearestTag}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

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
              <li>{text.detail.si(fmtEng(r.L, 'm', r.sig))}</li>
              <li>{text.detail.exactRule(fmt(r.rounding.relPct * 1e4, 3))}</li>
              <li>
                {text.detail.thisLength(
                  fmt(r.rounding.exact, r.sig),
                  fmt(r.rounding.rounded, r.sig),
                  fmt(r.rounding.diff, 3),
                )}
              </li>
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.rangeNotes.map((n) => <li key={n}>{n}</li>)}
            {text.sourceNotes.map((n) => <li key={n}>{n}</li>)}
            {text.validityExtra.map((n) => <li key={n}>{n}</li>)}
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
            <ChartLegend items={[{ label: text.chart.legend, tone: toneClass(0), kind: 'line' }]} />

            <LineChart
              xScale="linear"
              xLabel={text.chart.x}
              yLabel={text.chart.y}
              series={chartSeries}
              marker={{ ...s.marker, label: text.chart.selected }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={5}
              formatX={(v) => `${fmt(v, 3)} mm`}
              formatY={(v) => `${fmt(v, 3)} mil`}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

    </>
  )
}
