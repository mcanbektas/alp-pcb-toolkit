import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import NumberField from '../../../components/NumberField'
import Segmented from '../../../components/Segmented'
import EpsEffFields, { epsEffRows } from '../../../components/EpsEffFields'
import LineChart, { ChartLegend, ChartDataTable, toneClass } from '../../../components/LineChart'
import ReportDialog from '../../../components/ReportDialog'
import SaveToProject from '../../../components/SaveToProject'
import useToolForm from '../../../hooks/useToolForm'
import useSavedCalculation from '../../../hooks/useSavedCalculation'
import { useLang } from '../../../hooks/useLang'
import { commonText } from '../../../data/uiText'
import { fmt, fmtEng, fmtRes } from '../../../lib/num'
import CrosstalkSchematic from './schematic'
import {
  INITIAL_FORM, FEXT_OFF, FEXT_ON,
  DIM_UNITS, LEN_UNITS, TIME_UNITS, VOLT_UNITS,
  compute, buildSweep,
} from './model'
import { getText } from './text'
import { buildReportSection } from './report'

const MARK = { ok: '✓', warn: '!', danger: '×' }
const LEVEL_RANK = { ok: 0, warn: 1, danger: 2 }

export default function Crosstalk() {
  const { f, set, patch } = useToolForm(INITIAL_FORM)

  // Kaydedilmiş hesabı geri yükler (?hesap=<id>) ve ekranı o kayda bağlar;
  // SaveToProject bağlı kayda yeni satır açmak yerine üzerine yazar.
  const saved = useSavedCalculation({
    toolKey: 'crosstalk', initialForm: INITIAL_FORM, patch,
  })
  const { lang } = useLang()

  const text = useMemo(() => getText(lang), [lang])
  const ui = useMemo(() => commonText(lang), [lang])

  const r = useMemo(() => compute(f, text.fieldLabels), [f, text])
  const s = useMemo(() => buildSweep(r), [r])
  const notes = useMemo(() => text.commentary(r), [r, text])

  // Rapor bölümü SVG'siz kurulur; ReportDialog indirme anında canlı DOM'dan
  // (aşağıdaki ref'ler) şematik ve grafiği okuyup satır içine çevirir.
  const reportSection = useMemo(() => buildReportSection({ f, r, s, text, lang }), [f, r, s, text, lang])
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
    ? [{ key: 'vnext', name: 'V_NEXT', tone: toneClass(0), points: s.points }]
    : []

  return (
    <>
      <Link className="backlink" to="/kategori/sinyal-butunlugu">{text.backlink}</Link>

      <div className="tool-header">
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </div>

      <div className="tool-grid">
        {/* ---------- Sol: Girdiler ---------- */}
        <section className="panel">
          <h2>{ui.inputs}</h2>

          <CrosstalkSchematic ref={schematicRef} r={r} text={text.schematic} />

          <EpsEffFields f={f} set={set} />

          <NumberField
            label={text.fields.Zeven.label}
            value={f.Zeven} onChange={set('Zeven')}
            units={['Ω']} unit="Ω" onUnit={() => {}}
            hint={text.fields.Zeven.hint}
          />

          <NumberField
            label={text.fields.Zodd.label}
            value={f.Zodd} onChange={set('Zodd')}
            units={['Ω']} unit="Ω" onUnit={() => {}}
          />

          <NumberField
            label={text.fields.W.label}
            value={f.W} onChange={set('W')}
            units={DIM_UNITS} unit={f.Wu} onUnit={set('Wu')}
          />

          <NumberField
            label={text.fields.S.label}
            value={f.S} onChange={set('S')}
            units={DIM_UNITS} unit={f.Su} onUnit={set('Su')}
            hint={text.fields.S.hint}
          />

          <NumberField
            label={text.fields.len.label}
            value={f.len} onChange={set('len')}
            units={LEN_UNITS} unit={f.lenu} onUnit={set('lenu')}
            hint={text.fields.len.hint}
          />

          <NumberField
            label={text.fields.tr.label}
            value={f.tr} onChange={set('tr')}
            units={TIME_UNITS} unit={f.tru} onUnit={set('tru')}
          />

          <NumberField
            label={text.fields.Vagg.label}
            value={f.Vagg} onChange={set('Vagg')}
            units={VOLT_UNITS} unit={f.Vaggu} onUnit={set('Vaggu')}
          />

          <h2 className="section">{text.fextHeading}</h2>

          <Segmented
            value={f.fextMode}
            onChange={set('fextMode')}
            options={[
              { value: FEXT_OFF, label: text.fextOff },
              { value: FEXT_ON, label: text.fextOn },
            ]}
          />

          {f.fextMode === FEXT_ON ? (
            <>
              <NumberField
                label={text.fields.epsOdd.label}
                value={f.epsOdd} onChange={set('epsOdd')}
                units={['']} unit="" onUnit={() => {}}
                hint={text.fields.epsOdd.hint}
              />
              <NumberField
                label={text.fields.epsEven.label}
                value={f.epsEven} onChange={set('epsEven')}
                units={['']} unit="" onUnit={() => {}}
                hint={text.modalEpsHint}
              />
            </>
          ) : (
            <p className="empty-note">{text.modalEpsHint}</p>
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
                <div className="label">{text.bigLabel}</div>
                <div className="value">{fmtEng(r.Vnext, 'V', 4)}</div>
                <div className="alt">
                  {text.bigAltPct(fmt(r.nextPct, 4))} &nbsp;·&nbsp;{' '}
                  {r.fext.available
                    ? text.fextShort(fmtEng(r.fext.Vfext, 'V', 4), fmt(r.fext.fextPct, 3))
                    : text.fextMissingShort}
                </div>
              </div>

              {status && <span className={`status ${status.cls}`}>{status.text}</span>}

              <p className="method-note">{text.methodNote}</p>
              <p className="method-note">{text.sourceNote}</p>
              <p className="method-note">{text.threeWNote}</p>

              <table className="result-table">
                <tbody>
                  <tr>
                    <td>{text.table.Kb}</td>
                    <td>{fmt(r.Kb, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.Vnext}</td>
                    <td>{fmtEng(r.Vnext, 'V', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.nextPct}</td>
                    <td>{text.pct(fmt(r.nextPct, 5))}</td>
                  </tr>
                  <tr>
                    <td>{text.table.Lsat}</td>
                    <td>{fmtEng(r.Lsat, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.saturated}</td>
                    <td>{r.saturated ? text.yes : text.no}</td>
                  </tr>
                  <tr>
                    <td>{text.table.scale}</td>
                    <td>{fmt(r.scale, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.nextDuration}</td>
                    <td>{fmtEng(r.nextDuration, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.coupledLength}</td>
                    <td>{fmtEng(r.coupledLength, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.Vagg}</td>
                    <td>{fmtEng(r.Vagg, 'V', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.riseTime}</td>
                    <td>{fmtEng(r.tr, 's', 5)}</td>
                  </tr>
                  <tr>
                    <td>Z_even · Z_odd</td>
                    <td>{fmtRes(r.Zeven, 4)} · {fmtRes(r.Zodd, 4)}</td>
                  </tr>

                  <tr className="mini-head">
                    <td>{text.table.geomHead}</td>
                    <td>{r.geom.satisfied ? text.table.geomOk : text.table.geomFail}</td>
                  </tr>
                  <tr>
                    <td>{text.table.swRatio}</td>
                    <td>{fmt(r.geom.ratio, 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.required}</td>
                    <td>{fmtEng(r.geom.required, 'm', 5)}</td>
                  </tr>
                  <tr>
                    <td>{text.table.enteredSW}</td>
                    <td>{fmtEng(r.S, 'm', 4)} · {fmtEng(r.W, 'm', 4)}</td>
                  </tr>

                  {r.fext.available ? (
                    <>
                      <tr className="mini-head">
                        <td>{text.table.fextHead}</td>
                        <td>{text.table.fextComputed}</td>
                      </tr>
                      <tr>
                        <td>{text.table.modalEps}</td>
                        <td>{fmt(r.fext.epsEffOdd, 4)} · {fmt(r.fext.epsEffEven, 4)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.modalDelayDiff}</td>
                        <td>{fmtEng(r.fext.modalDelayDiff, 's', 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.Vfext}</td>
                        <td>{fmtEng(r.fext.Vfext, 'V', 5)}</td>
                      </tr>
                      <tr>
                        <td>{text.table.fextPct}</td>
                        <td>{text.pct(fmt(r.fext.fextPct, 5))}</td>
                      </tr>
                      <tr>
                        <td>{text.table.homogeneous}</td>
                        <td>{r.fext.homogeneous ? text.table.homogeneousYes : text.no}</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr className="mini-head">
                        <td>{text.table.fextHead}</td>
                        <td>{text.table.fextNotComputed}</td>
                      </tr>
                      <tr>
                        <td>{text.table.reason}</td>
                        <td>{text.table.reasonNoModal}</td>
                      </tr>
                    </>
                  )}

                  <tr className="mini-head">
                    <td>{text.table.methodHead}</td>
                    <td>{r.method}</td>
                  </tr>
                  <tr>
                    <td>{text.table.multiconductor}</td>
                    <td>{r.multiconductorModel ? text.yes : text.no}</td>
                  </tr>

                  {epsEffRows(r.eps, fmt, lang).map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>{text.table.tpd}</td>
                    <td>{fmt(r.tpdPsPerMm, 5)} ps/mm</td>
                  </tr>
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
              <li>{text.detail.method(r.method, r.multiconductorModel)}</li>
              <li>
                {text.detail.coupling(
                  fmt(r.Kb, 5),
                  fmtEng(r.Lsat, 'm', 4),
                  fmt(r.scale, 4),
                )}
              </li>
              <li>{text.detail.duration(fmtEng(r.nextDuration, 's', 4))}</li>
              <li>{text.detail.threeW}</li>
              <li>{text.detail.fext(r.fext)}</li>
              <li>{text.thresholdNote}</li>
              <li>{text.detail.noRounding}</li>
            </ul>
          )}

          <h2 className="section">{ui.validity}</h2>
          <ul className="detail-list">
            {text.validity.map((item, i) => (
              <li key={i}>
                {item.strong && <><strong>{item.strong}</strong>{' '}</>}
                {item.text}
              </li>
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
              items={[
                { label: 'V_NEXT', tone: toneClass(0), kind: 'line' },
                { label: text.chart.satLegend, tone: 'tone-muted', kind: 'line' },
              ]}
            />

            <LineChart
              ref={chartRef}
              xScale="log"
              xLabel={text.chart.x}
              yLabel={text.chart.y}
              series={chartSeries}
              refLines={s.refs.map((ref) => ({
                key: ref.key,
                y: ref.y,
                label: text.chart.satRef(s.LsatMm),
              }))}
              marker={{ ...s.marker, label: text.chart.operatingPoint }}
              formatX={(v) => fmt(v, 3)}
              formatY={(v) => fmt(v, 3)}
              caption={text.chart.caption}
            />

            <ChartDataTable
              xLabel={text.chart.x}
              series={chartSeries}
              every={6}
              formatX={(v) => `${fmt(v, 4)} mm`}
              formatY={(v) => fmtEng(v, 'V', 4)}
            />
          </>
        ) : (
          <p className="empty-note">{ui.chartNeedsInput}</p>
        )}
      </section>

      <ReportDialog section={reportSection} schematicRef={schematicRef} chartRef={chartRef} />
      <SaveToProject
        toolKey="crosstalk"
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
