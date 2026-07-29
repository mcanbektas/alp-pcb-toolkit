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
import { fmt, fmtEng, fmtPct } from '../../../lib/num'
import AwgSchematic from './schematic'
import {
  INITIAL_FORM, DIRECTIONS, DIR_DIAMETER, SWEEPS, SWEEP_D, DIAMETER_UNITS,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function AwgConverter() {
  const { f, set } = useToolForm(INITIAL_FORM)
  const [sweep, setSweep] = useState(SWEEP_D)
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])
  const { awgLabel } = text

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const s = useMemo(() => buildSweep(r, sweep), [r, sweep])
  // Tolerans bandı yalnızca alan doldurulduğunda vardır; boşken null kalır ve
  // sonuç paneli bugünkü hâliyle çizilir.
  const tol = r.ok ? r.tolerance : null
  const notes = useMemo(() => text.commentary(r), [r, text])
  const validity = useMemo(() => text.validityNotes(r), [r, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(() => buildReportSection({ f, r, s, text }), [f, r, s, text])
  const schematicRef = useRef(null)
  const chartRef = useRef(null)

  // Durum çipi — en kötü bulgu seviyesi
  const status = useMemo(() => {
    if (!r.ok || notes.length === 0) return null
    const worst = notes.reduce((acc, n) => (LEVEL_RANK[n.level] > LEVEL_RANK[acc] ? n.level : acc), 'ok')
    const count = notes.filter((n) => n.level === worst).length
    if (worst === 'ok') return { cls: 'ok', text: ui.statusOk }
    if (worst === 'warn') return { cls: 'warn', text: ui.statusWarn(count) }
    return { cls: 'danger', text: ui.statusDanger(count) }
  }, [r, notes, ui])

  const chartSeries = s ? [{ key: 'awg', name: 'AWG', tone: toneClass(0), points: s.points }] : []

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

          <AwgSchematic ref={schematicRef} r={r} text={text.schematic} />

          <Segmented
            value={f.dir}
            onChange={set('dir')}
            options={DIRECTIONS.map((x) => ({ value: x, label: text.dirLabel[x] }))}
          />

          {f.dir === DIR_DIAMETER ? (
            <NumberField
              label={text.fields.d.label}
              value={f.d} onChange={set('d')}
              units={DIAMETER_UNITS} unit={f.du} onUnit={set('du')}
              hint={text.fields.d.hint}
            />
          ) : (
            <NumberField
              label={text.fields.awg.label}
              value={f.awg} onChange={set('awg')}
              units={['AWG']} unit="AWG" onUnit={() => {}}
              hint={text.fields.awg.hint}
            />
          )}

          <h2 className="section">{text.toleranceFieldCaption}</h2>

          <NumberField
            label={text.fields.tolD.label}
            value={f.tolD} onChange={set('tolD')}
            units={['± %']} unit="± %" onUnit={() => {}}
            placeholder={text.fields.tolD.placeholder}
            hint={text.fields.tolD.hint}
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
                <div className="label">
                  {r.dir === DIR_DIAMETER ? text.bigFromDiameter : text.bigFromAwg}
                </div>
                <div className="value">
                  {r.dir === DIR_DIAMETER
                    ? `AWG ${fmt(r.awgExact, 5)}`
                    : `${fmt(r.dUnits.mm, 4)} mm`}
                </div>
                <div className="alt">
                  {r.dir === DIR_DIAMETER ? (
                    <>
                      {text.nearestStdPrefix} {awgLabel(r.awgNearest)} &nbsp;·&nbsp;
                      {' '}{fmt(r.nearest.dUnits.mm, 4)} mm &nbsp;·&nbsp;
                      {' '}{fmt(r.nearest.aUnits.mm2, 4)} mm²
                    </>
                  ) : (
                    <>
                      {fmt(r.dUnits.mil, 4)} mil &nbsp;·&nbsp; {fmt(r.dUnits.inch, 4)} inch
                      &nbsp;·&nbsp; {fmt(r.aUnits.mm2, 4)} mm²
                    </>
                  )}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>{text.table.diameterHead}</td>
                    <td>{r.standard ? `AWG ${awgLabel(r.awgExact)}` : `AWG ${fmt(r.awgExact, 5)}`}</td>
                  </tr>
                  <tr><td>mm</td><td>{fmt(r.dUnits.mm, 5)}</td></tr>
                  <tr><td>µm</td><td>{fmt(r.dUnits.um, 5)}</td></tr>
                  <tr><td>mil</td><td>{fmt(r.dUnits.mil, 5)}</td></tr>
                  <tr><td>inch</td><td>{fmt(r.dUnits.inch, 5)}</td></tr>
                  <tr>
                    <td>SI</td>
                    <td>{fmtEng(r.d, 'm', 5)}</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="section">{text.table.areaSection}</h2>
              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>A = π·d²/4</td>
                    <td>{text.table.areaHeadNote}</td>
                  </tr>
                  <tr><td>mm²</td><td>{fmt(r.aUnits.mm2, 5)}</td></tr>
                  <tr><td>mil²</td><td>{fmt(r.aUnits.mil2, 6)}</td></tr>
                  <tr><td>µm²</td><td>{fmt(r.aUnits.um2, 5)}</td></tr>
                  <tr><td>SI</td><td>{fmtEng(r.area, 'm²', 5)}</td></tr>
                </tbody>
              </table>

              {tol && tol.error && (
                <>
                  <h2 className="section">{text.toleranceCaption}</h2>
                  <p className="empty-note warn">{text.toleranceReason(tol.error)}</p>
                </>
              )}

              {tol && !tol.error && tol.active && (
                <>
                  <h2 className="section">{text.toleranceCaption}</h2>
                  <table className="result-table">
                    <tbody>
                      <tr className="mini-head">
                        <td>{text.tolTable.head(fmt(tol.tol * 100, 3))}</td>
                        <td>{text.tolTable.headNote}</td>
                      </tr>
                      <tr>
                        <td>{text.tolTable.dMm}</td>
                        <td>
                          {fmt(tol.dUnits.min.mm, 5)} · {fmt(tol.dUnits.nom.mm, 5)} ·{' '}
                          {fmt(tol.dUnits.max.mm, 5)}{' '}
                          <span className="sub">
                            ({text.pct(fmtPct(tol.d.minPct, 4))} / {text.pct(fmtPct(tol.d.maxPct, 4))})
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>{text.tolTable.dMil}</td>
                        <td>
                          {fmt(tol.dUnits.min.mil, 5)} · {fmt(tol.dUnits.nom.mil, 5)} ·{' '}
                          {fmt(tol.dUnits.max.mil, 5)}
                        </td>
                      </tr>
                      <tr>
                        <td>{text.tolTable.aMm2}</td>
                        <td>
                          {fmt(tol.aUnits.min.mm2, 5)} · {fmt(tol.aUnits.nom.mm2, 5)} ·{' '}
                          {fmt(tol.aUnits.max.mm2, 5)}{' '}
                          <span className="sub">
                            ({text.pct(fmtPct(tol.area.minPct, 4))} / {text.pct(fmtPct(tol.area.maxPct, 4))})
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>{text.tolTable.aMil2}</td>
                        <td>
                          {fmt(tol.aUnits.min.mil2, 6)} · {fmt(tol.aUnits.nom.mil2, 6)} ·{' '}
                          {fmt(tol.aUnits.max.mil2, 6)}
                        </td>
                      </tr>
                      <tr>
                        <td>{text.tolTable.band}</td>
                        <td>
                          {text.tolTable.bandRow(fmt(tol.d.spreadPct, 4), fmt(tol.area.spreadPct, 4))}{' '}
                          <span className="sub">{text.tolTable.bandNote}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              <h2 className="section">{text.nearestSection}</h2>
              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>AWG {awgLabel(r.awgNearest)}</td>
                    <td>{r.standard ? text.nearest.self : text.nearest.rounded}</td>
                  </tr>
                  <tr><td>{text.nearest.d}</td><td>{fmt(r.nearest.dUnits.mm, 5)} mm <span className="sub">({fmt(r.nearest.dUnits.mil, 4)} mil)</span></td></tr>
                  <tr><td>{text.nearest.area}</td><td>{fmt(r.nearest.aUnits.mm2, 5)} mm² <span className="sub">({fmt(r.nearest.aUnits.mil2, 6)} mil²)</span></td></tr>
                  <tr><td>{text.nearest.dDelta}</td><td>{text.pct(fmtPct(r.dDeltaPct))}</td></tr>
                  <tr><td>{text.nearest.areaDelta}</td><td>{text.pct(fmtPct(r.areaDeltaPct))}</td></tr>
                </tbody>
              </table>

              <h2 className="section">{text.neighborsSection}</h2>
              <table className="result-table">
                <tbody>
                  <tr className="mini-head">
                    <td>{text.neighbors.gauge}</td>
                    <td>{text.neighbors.cols}</td>
                  </tr>
                  {r.neighbors.map((n) => (
                    <tr key={n.awg}>
                      <td>
                        AWG {awgLabel(n.awg)}
                        {n.awg === r.awgNearest && <span className="sub"> {text.neighbors.nearestTag}</span>}
                      </td>
                      <td>{fmt(n.dUnits.mm, 4)} mm · {fmt(n.aUnits.mm2, 4)} mm²</td>
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
              <li>{text.detail.exponent(fmt(r.awgExact, 5), fmt(r.exponent, 5))}</li>
              <li>{text.detail.factor(fmt(r.exponent, 5), fmt(r.factor, 6))}</li>
              <li>
                {text.detail.diameter(fmt(r.factor, 6), fmt(r.dUnits.mm, 6))}
                {r.dir === DIR_DIAMETER && <> <span className="sub">{text.detail.diameterSolvedSub}</span></>}
              </li>
              <li>{text.detail.area(fmt(r.aUnits.mm2, 6), fmt(r.aUnits.mil2, 6))}</li>
              <li>{text.detail.ratio(fmt(Math.pow(92, 1 / 39), 6))}</li>
              {tol && !tol.error && tol.active && (
                <li>
                  {text.detail.tolerance(
                    fmt(tol.tol, 5),
                    fmt(tol.dUnits.min.mm, 6),
                    fmt(tol.dUnits.max.mm, 6),
                    fmt(tol.aUnits.min.mm2, 6),
                    fmt(tol.aUnits.max.mm2, 6),
                  )}
                </li>
              )}
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{text.scaleSourceSection}</h2>
          <ul className="detail-list">
            {text.scaleSource.map((line) => <li key={line}>{line}</li>)}
          </ul>

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {validity.map((w) => <li key={w} className="w">{w}</li>)}
            <li>{text.toleranceSquareNote}</li>
            <li>{text.approxNote}</li>
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
            options={SWEEPS.map((x) => ({ value: x, label: text.sweepLabel[x] }))}
          />
        </div>

        {s ? (
          <>
            <ChartLegend items={[{ label: text.chartLegend, tone: toneClass(0), kind: 'line' }]} />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={text.sweepAxis[sweep]}
              yLabel={text.chartY}
              series={chartSeries}
              marker={s.marker ? { ...s.marker, label: text.selected } : null}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={text.sweepCaption[sweep]}
            />

            <ChartDataTable
              xLabel={text.sweepAxis[sweep]}
              series={chartSeries}
              every={5}
              formatX={(v) => fmt(v, 4)}
              formatY={(v) => `AWG ${awgLabel(v)}`}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="awg-conv"
        f={f}
        r={r}
        section={reportSection}
        schematicRef={schematicRef}
        chartRef={chartRef}
      />
    </>
  )
}
